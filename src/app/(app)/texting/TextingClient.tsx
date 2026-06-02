'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Phone, ChevronRight, Search, Zap } from 'lucide-react'
import { cn, formatPhone, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props {
  profile: any
  conversations: any[]
  needsReply: number
  initialLeadId: string | null
}

export default function TextingClient({ profile, conversations, needsReply, initialLeadId }: Props) {
  const supabase = createClient()
  const [selectedId, setSelectedId] = useState<string | null>(initialLeadId)
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [aiMode, setAiMode] = useState(true)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedLead = conversations.find(c => c.id === selectedId)

  // Load messages when lead changes
  useEffect(() => {
    if (!selectedId) return
    loadMessages(selectedId)

    // Real-time subscription for new inbound messages
    const channel = supabase
      .channel(`texts:${selectedId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'texts',
        filter: `lead_id=eq.${selectedId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        scrollToBottom()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedId])

  useEffect(() => { scrollToBottom() }, [messages])

  async function loadMessages(leadId: string) {
    const { data } = await supabase
      .from('texts')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
    setMessages(data ?? [])
  }

  function scrollToBottom() {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function sendMessage() {
    if (!draft.trim() || !selectedId || sending) return
    setSending(true)
    const body = draft.trim()
    setDraft('')

    // Optimistic update
    const optimistic = {
      id: 'opt-' + Date.now(),
      direction: 'outbound',
      body,
      is_ai_generated: false,
      status: 'sending',
      sent_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const res = await fetch('/api/texts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: selectedId, message: body }),
    })

    if (!res.ok) {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setDraft(body)
    }
    setSending(false)
  }

  const filtered = conversations.filter(c =>
    `${c.first_name} ${c.last_name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  )

  const needsReplyLeads = filtered.filter(c =>
    c.texts?.some((t: any) => t.direction === 'inbound' && t.status === 'delivered')
  )
  const aiHandledLeads = filtered.filter(c =>
    !c.texts?.some((t: any) => t.direction === 'inbound' && t.status === 'delivered')
  )

  function getLastMessage(conv: any) {
    const msgs = conv.texts ?? []
    return msgs.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
  }

  return (
    <div className="flex gap-3 h-[calc(100vh-88px)]">
      {/* Conversation list */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <Search size={12} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="text-xs outline-none bg-transparent flex-1 text-gray-700 placeholder-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Needs reply */}
          {needsReplyLeads.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50">
                Needs Reply ({needsReplyLeads.length})
              </div>
              {needsReplyLeads.map(conv => {
                const last = getLastMessage(conv)
                return (
                  <button key={conv.id} onClick={() => setSelectedId(conv.id)}
                    className={cn('w-full text-left px-3 py-3 border-b border-gray-50 transition-colors hover:bg-gray-50',
                      selectedId === conv.id && 'bg-brand-50 border-brand-100')}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-gray-800 truncate">{conv.first_name} {conv.last_name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">{last ? format(new Date(last.sent_at), 'h:mm a') : ''}</span>
                        <span className="w-5 h-5 bg-brand-600 rounded-full text-white text-xs flex items-center justify-center font-bold">!</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{last?.body}</p>
                  </button>
                )
              })}
            </>
          )}

          {/* AI handling */}
          {aiHandledLeads.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50">
                AI Handling ({aiHandledLeads.length})
              </div>
              {aiHandledLeads.map(conv => {
                const last = getLastMessage(conv)
                return (
                  <button key={conv.id} onClick={() => setSelectedId(conv.id)}
                    className={cn('w-full text-left px-3 py-3 border-b border-gray-50 transition-colors hover:bg-gray-50',
                      selectedId === conv.id && 'bg-brand-50')}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-gray-800 truncate">{conv.first_name} {conv.last_name}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">{last ? format(new Date(last.sent_at), 'h:mm a') : ''}</span>
                        <span className="text-xs bg-violet-100 text-violet-600 font-bold px-1 rounded">AI</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 truncate italic">{last?.body}</p>
                  </button>
                )
              })}
            </>
          )}

          {filtered.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400">No conversations yet</p>
              <Link href="/clients" className="text-xs text-brand-600 font-medium mt-1 block">
                Go to Clients to start texting →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedLead ? (
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                {getInitials(`${selectedLead.first_name} ${selectedLead.last_name}`)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedLead.first_name} {selectedLead.last_name}</p>
                <p className="text-xs text-gray-400">{formatPhone(selectedLead.phone ?? '')} · {selectedLead.product_interest} · Score {selectedLead.lead_score}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dialer?lead=${selectedLead.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                <Phone size={12} />Call
              </Link>
              <Link href={`/clients/${selectedLead.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
                Profile <ChevronRight size={10} />
              </Link>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.map((msg, i) => {
              const isOut = msg.direction === 'outbound'
              const showDate = i === 0 ||
                new Date(msg.sent_at).toDateString() !== new Date(messages[i - 1]?.sent_at).toDateString()
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center my-3">
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {format(new Date(msg.sent_at), 'EEEE, MMM d')}
                      </span>
                    </div>
                  )}
                  <div className={cn('flex flex-col', isOut ? 'items-end' : 'items-start')}>
                    {isOut && msg.is_ai_generated && (
                      <span className="text-xs font-semibold text-violet-500 mb-1 flex items-center gap-1">
                        <Bot size={10} />AI Bot
                      </span>
                    )}
                    <div className={cn(
                      'max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                      isOut
                        ? msg.is_ai_generated
                          ? 'bg-violet-600 text-white rounded-br-md'
                          : 'bg-brand-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    )}>
                      {msg.body}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      {format(new Date(msg.sent_at), 'h:mm a')}
                      {isOut && (
                        <span className={cn(
                          msg.status === 'delivered' ? 'text-blue-400' :
                          msg.status === 'sent' ? 'text-gray-400' :
                          msg.status === 'sending' ? 'text-gray-300' : 'text-red-400'
                        )}>
                          {msg.status === 'sending' ? '○' : '✓✓'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex items-end gap-2 flex-shrink-0">
            <button
              onClick={() => setAiMode(!aiMode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border flex-shrink-0',
                aiMode
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : 'bg-gray-100 text-gray-600 border-transparent'
              )}>
              {aiMode ? <Bot size={12} /> : <User size={12} />}
              {aiMode ? 'AI: ON' : 'Manual'}
            </button>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={aiMode ? 'AI is handling this conversation...' : 'Type a message...'}
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none max-h-24 font-sans"
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || sending}
              className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40 transition-all flex-shrink-0">
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-600 font-semibold">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1">or go to Clients to start a new one</p>
          </div>
        </div>
      )}

      {/* Right panel — lead context */}
      {selectedLead && (
        <div className="w-60 flex-shrink-0 flex flex-col gap-3">
          {/* Lead info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Lead Profile</p>
            <div className="space-y-2">
              {[
                { label: 'Stage', val: selectedLead.stage },
                { label: 'Score', val: selectedLead.lead_score, bold: true, color: selectedLead.lead_score >= 80 ? 'text-emerald-600' : 'text-amber-600' },
                { label: 'Product', val: selectedLead.product_interest ?? '—' },
                { label: 'Phone', val: formatPhone(selectedLead.phone ?? '') },
              ].map(({ label, val, bold, color }) => (
                <div key={label} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">{label}</span>
                  <span className={cn('font-medium capitalize', bold && 'font-bold', color)}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick AI actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
              <Zap size={10} />Quick Actions
            </p>
            <div className="space-y-2">
              {[
                { label: '📅 Send appt reminder', msg: `Hey ${selectedLead.first_name}! Just a reminder about our call today. Looking forward to chatting!` },
                { label: '💰 Send quote follow-up', msg: `Hi ${selectedLead.first_name}, did you get a chance to review the options I sent? Happy to answer any questions!` },
                { label: '🔥 Re-engagement text', msg: `Hey ${selectedLead.first_name}! Wanted to check in — are you still looking into coverage options?` },
              ].map(({ label, msg }) => (
                <button key={label} onClick={() => setDraft(msg)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Convo Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: messages.filter(m => m.direction === 'outbound').length, label: 'Sent' },
                { val: messages.filter(m => m.direction === 'inbound').length, label: 'Replies' },
                { val: messages.filter(m => m.is_ai_generated).length, label: 'By AI' },
                { val: messages.length > 0 ? Math.round((messages.filter(m => m.direction === 'inbound').length / messages.filter(m => m.direction === 'outbound').length) * 100) + '%' : '—', label: 'Reply %' },
              ].map(({ val, label }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-base font-extrabold text-gray-800">{val}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
