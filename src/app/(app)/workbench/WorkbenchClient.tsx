'use client'

import { useState, useCallback, useRef } from 'react'
import { Phone, Users, Calendar, Presentation, FileText, Trophy, TrendingUp, Flame, Clock, CheckCircle2, Minus } from 'lucide-react'
import { cn, formatCurrency, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useRealtimeActivity } from '@/hooks/useRealtimeActivity'
import Link from 'next/link'

const ACTIVITY_BUTTONS = [
  { key: 'dials',         label: 'Dials',     icon: Phone,        color: 'blue',    goalKey: 'daily_dial_goal' },
  { key: 'contacts',      label: 'Contacts',  icon: Users,        color: 'violet',  goalKey: null },
  { key: 'appointments',  label: 'Appts',     icon: Calendar,     color: 'amber',   goalKey: null },
  { key: 'presentations', label: 'Presents',  icon: Presentation, color: 'orange',  goalKey: null },
  { key: 'applications',  label: 'Apps',      icon: FileText,     color: 'green',   goalKey: null },
  { key: 'closes',        label: 'Closes',    icon: Trophy,       color: 'emerald', goalKey: 'daily_close_goal' },
]

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; progress: string; hover: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    progress: 'bg-blue-500',    hover: 'hover:bg-blue-100' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200',  progress: 'bg-violet-500',  hover: 'hover:bg-violet-100' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   progress: 'bg-amber-500',   hover: 'hover:bg-amber-100' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200',  progress: 'bg-orange-500',  hover: 'hover:bg-orange-100' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   ring: 'ring-green-200',   progress: 'bg-green-500',   hover: 'hover:bg-green-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', progress: 'bg-emerald-500', hover: 'hover:bg-emerald-100' },
}

interface Props {
  profile: any
  todayActivity: any
  recentCalls: any[]
  leaderboard: any[]
}

export default function WorkbenchClient({ profile, todayActivity, recentCalls, leaderboard }: Props) {
  const supabase = createClient()

  // Activity state — initialized from DB, persisted on every change
  const [activity, setActivity] = useState<Record<string, number>>({
    dials:         todayActivity?.dials         ?? 0,
    contacts:      todayActivity?.contacts      ?? 0,
    appointments:  todayActivity?.appointments  ?? 0,
    presentations: todayActivity?.presentations ?? 0,
    applications:  todayActivity?.applications  ?? 0,
    closes:        todayActivity?.closes        ?? 0,
    premium:       todayActivity?.premium       ?? 0,
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [animating, setAnimating] = useState<string | null>(null)
  const [recentCallsList, setRecentCallsList] = useState(recentCalls)

  // Real-time: receive updates from dialer disposition, teammate activity
  useRealtimeActivity({
    agencyId: profile?.agency_id ?? '',
    repId: profile?.id ?? '',
    // When dialer logs a disposition, this fires and updates our state live
    onActivityUpdate: (updated: any) => {
      setActivity({
        dials:         updated.dials         ?? 0,
        contacts:      updated.contacts      ?? 0,
        appointments:  updated.appointments  ?? 0,
        presentations: updated.presentations ?? 0,
        applications:  updated.applications  ?? 0,
        closes:        updated.closes        ?? 0,
        premium:       parseFloat(updated.premium ?? 0),
      })
    },
    onNewLead: (lead: any) => {
      // Show a new lead arrival in the recent activity section
    },
  })

  // Core function: save a field delta to DB, update local state optimistically
  const saveField = useCallback(async (field: string, delta: number) => {
    setSaving(field)
    setAnimating(field)
    setTimeout(() => setAnimating(null), 300)

    // Optimistic update clamped at 0
    setActivity(prev => ({
      ...prev,
      [field]: Math.max(0, (prev[field] ?? 0) + delta),
    }))

    const { data, error } = await supabase.rpc('increment_activity', {
      p_rep_id:    profile.id,
      p_agency_id: profile.agency_id,
      p_field:     field,
      p_delta:     delta,
    })

    setSaving(null)

    if (error) {
      // Roll back optimistic update
      console.error('Activity save failed:', error)
      setActivity(prev => ({
        ...prev,
        [field]: Math.max(0, (prev[field] ?? 0) - delta),
      }))
      toast.error('Could not save — check your connection')
    } else if (data) {
      // Sync to confirmed DB value (prevents drift)
      setActivity({
        dials:         data.dials         ?? 0,
        contacts:      data.contacts      ?? 0,
        appointments:  data.appointments  ?? 0,
        presentations: data.presentations ?? 0,
        applications:  data.applications  ?? 0,
        closes:        data.closes        ?? 0,
        premium:       parseFloat(data.premium ?? 0),
      })
    }
  }, [profile.id, profile.agency_id, supabase])

  const dialGoal  = profile?.daily_dial_goal  ?? 100
  const closeGoal = profile?.daily_close_goal ?? 3

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workbench</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), 'EEEE, MMMM d')} · {profile?.full_name?.split(' ')[0]}, let's have a great day
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
          activity.dials >= dialGoal ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        )}>
          <Flame size={13} className={activity.dials >= dialGoal ? 'text-emerald-600' : 'text-gray-400'} />
          {Math.min(100, Math.round((activity.dials / dialGoal) * 100))}% to dial goal
        </div>
      </div>

      {/* Activity tap buttons */}
      <div className="grid grid-cols-6 gap-3">
        {ACTIVITY_BUTTONS.map(({ key, label, icon: Icon, color, goalKey }) => {
          const val = activity[key] ?? 0
          const goal = goalKey ? (profile?.[goalKey] ?? null) : null
          const pct  = goal ? Math.min(100, Math.round((val / goal) * 100)) : null
          const c    = COLOR_MAP[color]
          const isAnimating = animating === key
          const isSaving    = saving === key

          return (
            <div key={key} className={cn(
              'relative flex flex-col bg-white rounded-2xl border-2 transition-all duration-150 overflow-hidden',
              c.ring, isSaving ? 'border-current opacity-80' : 'border-transparent hover:shadow-md'
            )}>
              {/* Main tap area — full card clickable for +1 */}
              <button
                onClick={() => saveField(key, 1)}
                className={cn('flex flex-col items-center gap-2 p-4 w-full', c.hover, 'transition-colors')}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.bg, c.text)}>
                  <Icon size={18} />
                </div>
                <div className="text-center">
                  <p className={cn(
                    'text-2xl font-bold leading-none transition-transform duration-150',
                    c.text,
                    isAnimating && 'scale-125'
                  )}>
                    {val}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
                </div>

                {/* Goal progress bar */}
                {goal !== null && (
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                      <span>{pct}%</span>
                      <span>/{goal}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-300', c.progress)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>

              {/* Decrement button — small minus in bottom-right */}
              <button
                onClick={(e) => { e.stopPropagation(); if (val > 0) saveField(key, -1) }}
                disabled={val === 0}
                className={cn(
                  'absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors disabled:opacity-20 disabled:cursor-not-allowed'
                )}
                title={`Remove 1 ${label}`}
              >
                <Minus size={10} />
              </button>

              {/* +1 hint */}
              <span className="absolute top-2 right-2 text-xs font-bold text-gray-200 pointer-events-none">+1</span>
            </div>
          )
        })}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Mission */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="opacity-80" />
            <span className="text-sm font-semibold opacity-80">Monthly Mission</span>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(activity.premium)}</p>
          <p className="text-sm opacity-70 mt-1">of $30,000 target</p>
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, (activity.premium / 30000) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs opacity-60">
            <span>{formatCurrency(Math.max(0, 30000 - activity.premium))} remaining</span>
            <Link href="/dialer" className="underline hover:opacity-100">Start dialing →</Link>
          </div>
        </div>

        {/* Ratios */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-indigo-600" />Today's Ratios
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Dials → Contacts',    a: activity.dials,        b: activity.contacts },
              { label: 'Contacts → Appts',    a: activity.contacts,     b: activity.appointments },
              { label: 'Appts → Closes',      a: activity.appointments, b: activity.closes },
            ].map(({ label, a, b }) => {
              const pct = a > 0 ? Math.round((b / a) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-800">{a > 0 ? `${pct}%` : '—'}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-indigo-600" />Quick Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Dials',         val: activity.dials,          sub: `Goal: ${dialGoal}` },
              { label: 'Closes',        val: activity.closes,         sub: `Goal: ${closeGoal}` },
              { label: 'Premium',       val: `$${((activity.premium ?? 0)/1000).toFixed(1)}k`, sub: 'today' },
              { label: 'Presentations', val: activity.presentations,  sub: 'today' },
            ].map(({ label, val, sub }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xl font-bold text-gray-900">{val}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard + Recent Calls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Leaderboard */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" />Today's Leaderboard
          </h3>
          <div className="space-y-2">
            {leaderboard.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No activity logged yet today</p>
            )}
            {leaderboard.map((entry: any, i: number) => (
              <div key={entry.rep_id ?? i} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                i === 0 ? 'bg-amber-50' : 'hover:bg-gray-50'
              )}>
                <span className={cn('text-sm font-bold w-5 text-center',
                  i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : 'text-gray-300')}>
                  {i + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                  {getInitials(entry.profiles?.full_name ?? 'U')}
                </div>
                <span className={cn('flex-1 text-sm font-medium truncate',
                  entry.rep_id === profile?.id ? 'text-indigo-700 font-bold' : 'text-gray-700')}>
                  {entry.profiles?.full_name ?? 'Unknown'}
                  {entry.rep_id === profile?.id ? ' (you)' : ''}
                </span>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                  <span>{entry.dials ?? 0}d</span>
                  <span className="font-bold text-emerald-600">{entry.closes ?? 0}c</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Phone size={14} className="text-indigo-600" />Recent Calls
            </h3>
            <Link href="/dialer" className="text-xs text-indigo-600 font-semibold hover:text-indigo-700">
              Open Dialer →
            </Link>
          </div>
          <div className="space-y-2">
            {recentCallsList.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No calls yet today</p>
                <Link href="/dialer" className="text-xs text-indigo-600 font-semibold mt-1 block">
                  Start dialing →
                </Link>
              </div>
            )}
            {recentCallsList.map((call: any) => (
              <div key={call.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                  call.disposition === 'sold'             ? 'bg-emerald-500' :
                  call.disposition === 'appointment_set'  ? 'bg-blue-500' :
                  call.disposition === 'no_answer'        ? 'bg-gray-300' :
                  call.disposition === 'voicemail'        ? 'bg-gray-300' :
                  'bg-amber-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {call.leads?.first_name} {call.leads?.last_name}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {call.disposition?.replace(/_/g, ' ') ?? 'No disposition'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {call.ai_summary && (
                    <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium">AI ✓</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
