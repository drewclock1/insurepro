'use client'

import { useState } from 'react'
import { ArrowLeft, Phone, MessageSquare, Calendar, Edit2, Save, X, Bot } from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { cn, formatPhone, leadStageColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const STAGES = ['new','contacted','quoted','appointment','applied','issued','declined','lost']

interface Props { lead: any; timeline: any[] }

export default function LeadDetailClient({ lead: initialLead, timeline }: Props) {
  const supabase = createClient()
  const [lead, setLead] = useState(initialLead)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ ...initialLead })
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [activeTab, setActiveTab] = useState('timeline')

  async function saveLead() {
    const { error } = await supabase.from('leads').update({
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      phone: editForm.phone,
      email: editForm.email,
      stage: editForm.stage,
      product_interest: editForm.product_interest,
      state: editForm.state,
      city: editForm.city,
      annual_income: editForm.annual_income,
      notes: editForm.notes,
      next_followup: editForm.next_followup || null,
    }).eq('id', lead.id)

    if (error) { toast.error('Failed to save'); return }
    setLead({ ...lead, ...editForm })
    setEditing(false)
    toast.success('Lead updated!')
  }

  async function updateStage(stage: string) {
    await supabase.from('leads').update({ stage }).eq('id', lead.id)
    setLead({ ...lead, stage })
    toast.success(`Moved to ${stage}`)
  }

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    const existing = lead.notes ?? ''
    const timestamp = format(new Date(), 'MMM d, h:mm a')
    const updated = `[${timestamp}] ${newNote.trim()}\n\n${existing}`.trim()
    await supabase.from('leads').update({ notes: updated }).eq('id', lead.id)
    setLead({ ...lead, notes: updated })
    setNewNote('')
    setSavingNote(false)
    toast.success('Note added')
  }

  const timelineCalls = timeline.filter(t => t._type === 'call')
  const timelineTexts = timeline.filter(t => t._type === 'text')

  function TimelineItem({ item }: { item: any }) {
    if (item._type === 'call') {
      return (
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Phone size={13} className="text-blue-600" />
          </div>
          <div className="flex-1 pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-800">
                Call · {item.duration_seconds ? `${Math.round(item.duration_seconds / 60)}m ${item.duration_seconds % 60}s` : 'No answer'}
              </span>
              <span className="text-xs text-gray-400">
                {item._date ? formatDistanceToNow(new Date(item._date), { addSuffix: true }) : ''}
              </span>
            </div>
            {item.disposition && (
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize',
                item.disposition === 'sold' ? 'bg-emerald-100 text-emerald-700' :
                item.disposition === 'appointment_set' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600')}>
                {item.disposition.replace(/_/g, ' ')}
              </span>
            )}
            {item.ai_summary && (
              <div className="mt-2 bg-violet-50 rounded-lg px-3 py-2 border border-violet-100">
                <div className="flex items-center gap-1 text-xs font-bold text-violet-600 mb-1">
                  <Bot size={10} />AI Summary
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{item.ai_summary}</p>
              </div>
            )}
            {item.notes && <p className="mt-2 text-xs text-gray-500 italic">"{item.notes}"</p>}
          </div>
        </div>
      )
    }

    if (item._type === 'text') {
      const isOut = item.direction === 'outbound'
      return (
        <div className="flex gap-3">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
            item.is_ai_generated ? 'bg-violet-100' : isOut ? 'bg-brand-100' : 'bg-gray-100')}>
            <MessageSquare size={13} className={item.is_ai_generated ? 'text-violet-600' : isOut ? 'text-brand-600' : 'text-gray-500'} />
          </div>
          <div className="flex-1 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {isOut ? (item.is_ai_generated ? 'AI Text sent' : 'Text sent') : 'Lead replied'}
              </span>
              <span className="text-xs text-gray-400">
                {item._date ? formatDistanceToNow(new Date(item._date), { addSuffix: true }) : ''}
              </span>
            </div>
            <p className={cn('text-xs px-3 py-2 rounded-xl w-fit max-w-xs',
              item.is_ai_generated ? 'bg-violet-50 text-violet-800 border border-violet-100' :
              isOut ? 'bg-brand-50 text-brand-800' : 'bg-gray-100 text-gray-700')}>
              {item.body}
            </p>
          </div>
        </div>
      )
    }

    if (item._type === 'appointment') {
      return (
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Calendar size={13} className="text-amber-600" />
          </div>
          <div className="flex-1 pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-800">
                Appointment {item.status === 'completed' ? '✓' : item.status === 'no_show' ? '(No Show)' : 'scheduled'}
              </span>
              <span className="text-xs text-gray-400">
                {item._date ? formatDistanceToNow(new Date(item._date), { addSuffix: true }) : ''}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {item.scheduled_at ? format(new Date(item.scheduled_at), 'MMM d, h:mm a') : ''}
              {item.location ? ` · ${item.location}` : ''}
            </p>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Link href="/clients" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', leadStageColor(lead.stage))}>
              {lead.stage}
            </span>
            {lead.lead_score > 0 && (
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-md',
                lead.lead_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                lead.lead_score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>
                Score: {lead.lead_score}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatPhone(lead.phone ?? '')}
            {lead.email ? ` · ${lead.email}` : ''}
            {lead.product_interest ? ` · ${lead.product_interest}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dialer?lead=${lead.id}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Phone size={13} />Call
          </Link>
          <Link href={`/texting?lead=${lead.id}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors">
            <MessageSquare size={13} />Text
          </Link>
          <button onClick={() => setEditing(!editing)}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors',
              editing ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
            {editing ? <><X size={13} />Cancel</> : <><Edit2 size={13} />Edit</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left — lead info */}
        <div className="space-y-4">
          {/* Info card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">Lead Info</h2>
              {editing && (
                <button onClick={saveLead}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                  <Save size={12} />Save
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                {[
                  { label: 'First Name', field: 'first_name', type: 'text' },
                  { label: 'Last Name', field: 'last_name', type: 'text' },
                  { label: 'Phone', field: 'phone', type: 'tel' },
                  { label: 'Email', field: 'email', type: 'email' },
                  { label: 'City', field: 'city', type: 'text' },
                  { label: 'State', field: 'state', type: 'text' },
                  { label: 'Annual Income', field: 'annual_income', type: 'number' },
                  { label: 'Next Followup', field: 'next_followup', type: 'datetime-local' },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">{label}</label>
                    <input type={type} value={editForm[field] ?? ''}
                      onChange={e => setEditForm((p: any) => ({ ...p, [field]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Product</label>
                  <select value={editForm.product_interest ?? ''}
                    onChange={e => setEditForm((p: any) => ({ ...p, product_interest: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    <option>Life Insurance</option><option>Health Insurance</option>
                    <option>Final Expense</option><option>Mortgage Protection</option>
                    <option>Annuity</option><option>Medicare</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Phone', val: formatPhone(lead.phone ?? '') },
                  { label: 'Email', val: lead.email },
                  { label: 'Product', val: lead.product_interest },
                  { label: 'Source', val: lead.source },
                  { label: 'Location', val: [lead.city, lead.state].filter(Boolean).join(', ') },
                  { label: 'Income', val: lead.annual_income ? `$${lead.annual_income.toLocaleString()}/yr` : null },
                  { label: 'Assigned to', val: lead.profiles?.full_name },
                  { label: 'Added', val: lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : null },
                  { label: 'Last Contact', val: lead.last_contacted ? formatDistanceToNow(new Date(lead.last_contacted), { addSuffix: true }) : 'Never' },
                  { label: 'Next Followup', val: lead.next_followup ? format(new Date(lead.next_followup), 'MMM d, h:mm a') : null },
                ].filter(i => i.val).map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-700 text-right max-w-[140px] truncate">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage change */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Move Stage</h2>
            <div className="space-y-1">
              {STAGES.map(s => (
                <button key={s} onClick={() => updateStage(s)}
                  className={cn('w-full text-left px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors',
                    lead.stage === s
                      ? 'bg-brand-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600')}>
                  {lead.stage === s ? '▶ ' : ''}{s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right — timeline + notes */}
        <div className="col-span-2 space-y-4">
          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Add Note</h2>
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Log a note, objection, or follow-up context..."
                rows={2}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none font-sans"
              />
              <button onClick={addNote} disabled={!newNote.trim() || savingNote}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 transition-colors self-end">
                Save
              </button>
            </div>
            {lead.notes && (
              <div className="mt-3 bg-gray-50 rounded-xl p-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                {lead.notes}
              </div>
            )}
          </div>

          {/* Activity timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-4 mb-5">
              <h2 className="text-sm font-bold text-gray-700">Activity</h2>
              <div className="flex gap-1">
                {['timeline', 'calls', 'texts'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={cn('px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all',
                      activeTab === t ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100')}>
                    {t} {t === 'calls' ? `(${timelineCalls.length})` : t === 'texts' ? `(${timelineTexts.length})` : `(${timeline.length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-0 max-h-[480px] overflow-y-auto pr-1">
              {(activeTab === 'timeline' ? timeline : activeTab === 'calls' ? timelineCalls : timelineTexts)
                .map((item, i) => <TimelineItem key={`${item._type}-${item.id}-${i}`} item={item} />)}
              {timeline.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">No activity yet</p>
                  <p className="text-xs text-gray-300 mt-1">Call or text this lead to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
