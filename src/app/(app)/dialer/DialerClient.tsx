'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Mic, MicOff, PauseCircle, Hash, ClipboardList, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'
import { useTwilioDevice } from '@/hooks/useTwilioDevice'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const DISPOSITIONS = [
  { key: 'no_answer',       label: '📵 No Answer',       style: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  { key: 'voicemail',       label: '📨 Left Voicemail',  style: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  { key: 'appointment_set', label: '📅 Set Appointment', style: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { key: 'callback',        label: '⏰ Callback',         style: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { key: 'not_interested',  label: '👎 Not Interested',   style: 'bg-red-50 text-red-700 hover:bg-red-100' },
  { key: 'sold',            label: '🏆 SOLD!',            style: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold' },
]

interface Props { profile: any; queue: any[] }

export default function DialerClient({ profile, queue: initialQueue }: Props) {
  const supabase = createClient()
  const {
    deviceState, callState, elapsed,
    muted, onHold, error,
    startCall, endCall, toggleMute, toggleHold, sendDigit,
  } = useTwilioDevice()

  const [queue, setQueue] = useState(initialQueue)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [notes, setNotes] = useState('')
  const [currentCallId, setCurrentCallId] = useState<string | null>(null)
  const [showDialpad, setShowDialpad] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [autoAdvance, setAutoAdvance] = useState(true)

  const currentLead = queue[currentIdx]

  useEffect(() => {
    if (!currentLead) return
    const tips: Record<string, string> = {
      new: `🔥 Fresh lead — ${currentLead.first_name} just submitted. Open with "Hi, I'm following up on the request you just made online."`,
      contacted: `You've spoken with ${currentLead.first_name} before. Reference your last conversation to rebuild rapport quickly.`,
      appointment: `${currentLead.first_name} had a scheduled appointment. Confirm they're still interested and reschedule if needed.`,
    }
    setAiTip(tips[currentLead.stage] ?? `Score ${currentLead.lead_score ?? '—'} · ${currentLead.product_interest ?? 'Insurance'} lead from ${currentLead.source ?? 'unknown source'}.`)
  }, [currentIdx, currentLead])

  async function handleStartCall() {
    if (!currentLead?.phone) { toast.error('No phone number for this lead'); return }

    await startCall(currentLead.phone, {
      leadId: currentLead.id,
      repId: profile.id,
    })

    // Log to DB
    const { data: callRecord } = await supabase.from('calls').insert({
      rep_id: profile.id,
      agency_id: profile.agency_id,
      lead_id: currentLead.id,
      direction: 'outbound',
      from_number: profile.twilio_number,
      to_number: currentLead.phone,
      started_at: new Date().toISOString(),
    }).select().single()

    setCurrentCallId(callRecord?.id ?? null)

    // Mark lead as contacted
    await supabase.from('leads').update({ last_contacted: new Date().toISOString() }).eq('id', currentLead.id)
  }

  async function handleEndCall() {
    endCall()
    if (currentCallId) {
      await supabase.from('calls').update({
        ended_at: new Date().toISOString(),
        duration_seconds: elapsed,
        notes,
      }).eq('id', currentCallId)
    }
  }

  async function logDisposition(disposition: string) {
    if (!currentLead) return

    await fetch('/api/calls/disposition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: currentCallId,
        leadId: currentLead.id,
        disposition,
        notes,
      }),
    })

    toast.success(disposition === 'sold' ? '🏆 SOLD! Logging...' : `Logged: ${disposition.replace(/_/g, ' ')}`)
    setNotes('')
    setCurrentCallId(null)

    if (autoAdvance && currentIdx < queue.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 800)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const isConnected = callState === 'connected'
  const isActive = ['connecting', 'ringing', 'connected'].includes(callState)

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Power Dialer 📞</h1>
          <p className="text-sm text-gray-500 mt-0.5">{queue.length} leads queued · sorted by AI score</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Device status */}
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold',
            deviceState === 'ready' ? 'bg-emerald-100 text-emerald-700' :
            deviceState === 'registering' ? 'bg-amber-100 text-amber-700' :
            deviceState === 'error' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-500')}>
            {deviceState === 'ready' ? <Wifi size={11} /> :
             deviceState === 'registering' ? <Loader2 size={11} className="animate-spin" /> :
             <WifiOff size={11} />}
            {deviceState === 'ready' ? 'Dialer Ready' :
             deviceState === 'registering' ? 'Connecting...' :
             deviceState === 'error' ? 'Connection Error' : deviceState}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
            <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)}
              className="rounded" />
            Auto-advance
          </label>

          {!isActive ? (
            <button onClick={handleStartCall}
              disabled={deviceState !== 'ready' || !currentLead}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40">
              <Phone size={14} />
              {deviceState === 'registering' ? 'Initializing...' : 'Start Call'}
            </button>
          ) : (
            <button onClick={handleEndCall}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 animate-pulse transition-all">
              <PhoneOff size={14} />End Call
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Main dialer panel */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Call display */}
          <div className={cn('p-6 text-center transition-all duration-300',
            isConnected ? 'bg-gray-900' :
            callState === 'ringing' ? 'bg-indigo-900' :
            callState === 'connecting' ? 'bg-gray-800' :
            callState === 'ended' ? 'bg-gray-800' : 'bg-gray-900')}>

            {/* Status pill */}
            <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4',
              callState === 'idle' ? 'bg-gray-700 text-gray-300' :
              callState === 'connecting' ? 'bg-yellow-900/50 text-yellow-300' :
              callState === 'ringing' ? 'bg-indigo-900/50 text-indigo-300' :
              callState === 'connected' ? 'bg-emerald-900/50 text-emerald-300' :
              'bg-red-900/50 text-red-300')}>
              <span className={cn('w-1.5 h-1.5 rounded-full',
                callState === 'connected' ? 'bg-emerald-400 animate-pulse' :
                callState === 'ringing' ? 'bg-indigo-400 animate-bounce' :
                callState === 'connecting' ? 'bg-yellow-400 animate-spin' : 'bg-current')} />
              {callState === 'idle' ? 'Ready to dial' :
               callState === 'connecting' ? 'Connecting...' :
               callState === 'ringing' ? 'Ringing...' :
               callState === 'connected' ? 'Live call' : 'Call ended'}
            </div>

            {currentLead ? (
              <>
                <h2 className="text-2xl font-extrabold text-white">
                  {currentLead.first_name} {currentLead.last_name}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {formatPhone(currentLead.phone ?? '')}
                  {currentLead.product_interest ? ` · ${currentLead.product_interest}` : ''}
                  {currentLead.lead_score ? ` · Score ${currentLead.lead_score}` : ''}
                </p>
                {currentLead.state && (
                  <p className="text-gray-500 text-xs mt-0.5">{currentLead.city ? `${currentLead.city}, ` : ''}{currentLead.state}</p>
                )}
              </>
            ) : (
              <p className="text-gray-400">No leads in queue</p>
            )}

            {/* Timer */}
            <div className={cn('text-4xl font-mono font-extrabold mt-5 tracking-wider transition-colors',
              isConnected ? 'text-emerald-400' :
              callState === 'ringing' ? 'text-indigo-300' : 'text-gray-600')}>
              {formatTime(elapsed)}
            </div>

            {/* Dialpad */}
            {showDialpad && isConnected && (
              <div className="grid grid-cols-3 gap-2 mt-4 max-w-[160px] mx-auto">
                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(d => (
                  <button key={d} onClick={() => sendDigit(d)}
                    className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm font-bold transition-colors">
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live call controls */}
          {isActive && (
            <div className="flex justify-center gap-5 py-5 border-b border-gray-100">
              {[
                { icon: muted ? MicOff : Mic, label: muted ? 'Unmute' : 'Mute', action: toggleMute, active: muted, color: 'red' },
                { icon: PauseCircle, label: onHold ? 'Resume' : 'Hold', action: toggleHold, active: onHold, color: 'amber' },
                { icon: Hash, label: 'Dialpad', action: () => setShowDialpad(s => !s), active: showDialpad, color: 'blue' },
              ].map(({ icon: Icon, label, action, active, color }) => (
                <button key={label} onClick={action}
                  className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors min-w-[60px]',
                    active
                      ? color === 'red' ? 'bg-red-100 text-red-600' :
                        color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Disposition + notes */}
          {(callState === 'ended' || callState === 'idle') && currentLead && (
            <div className="p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">How did it go?</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {DISPOSITIONS.map(({ key, label, style }) => (
                  <button key={key} onClick={() => logDisposition(key)}
                    className={cn('py-2.5 px-2 rounded-xl text-xs font-medium transition-colors text-center', style)}>
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Call Notes</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What happened on this call? Notes are saved with the disposition."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none font-sans placeholder-gray-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-3">
          {/* AI coach */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center text-xs">🤖</div>
              <span className="text-xs font-bold text-violet-700">AI Call Coach</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{aiTip || 'Loading tip...'}</p>
          </div>

          {/* Session stats */}
          {callState !== 'idle' || elapsed > 0 ? (
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">This Session</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: currentIdx + 1, label: 'Calls Made' },
                  { val: formatTime(elapsed), label: 'Call Duration' },
                  { val: queue.length - currentIdx - 1, label: 'Remaining' },
                  { val: `${Math.round(((currentIdx + 1) / Math.max(queue.length, 1)) * 100)}%`, label: 'Progress' },
                ].map(({ val, label }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <p className="text-base font-extrabold text-gray-900">{val}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Lead queue */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <ClipboardList size={13} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Queue</span>
              <span className="ml-auto bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{queue.length}</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {queue.map((lead, i) => (
                <button key={lead.id}
                  onClick={() => { if (!isActive) setCurrentIdx(i) }}
                  disabled={isActive}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    i === currentIdx ? 'bg-brand-50' : 'hover:bg-gray-50',
                    isActive && i !== currentIdx && 'opacity-50 cursor-not-allowed'
                  )}>
                  <span className={cn('text-xs font-extrabold w-5 text-center flex-shrink-0',
                    i === currentIdx ? 'text-brand-600' :
                    i < currentIdx ? 'text-gray-300 line-through' : 'text-gray-400')}>
                    {i === currentIdx ? '▶' : i < currentIdx ? '✓' : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold truncate', i < currentIdx ? 'text-gray-400 line-through' : 'text-gray-800')}>
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{lead.product_interest ?? 'Insurance'}</p>
                  </div>
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0',
                    lead.lead_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                    lead.lead_score >= 60 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500')}>
                    {lead.lead_score ?? '—'}
                  </span>
                </button>
              ))}
              {queue.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-gray-400">
                  No leads queued. Add leads in Clients →
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
