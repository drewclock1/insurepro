'use client'

import { useState } from 'react'
import { Plus, Zap, ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Edit2, Trash2, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TRIGGER_OPTIONS = [
  { key: 'new_lead', label: '🆕 New Lead Created', desc: 'Fires when any lead is added to CRM' },
  { key: 'no_contact_72h', label: '⏰ No Contact in 72 Hours', desc: 'Lead not contacted in 3 days' },
  { key: 'appointment_scheduled', label: '📅 Appointment Scheduled', desc: 'After rep sets an appointment' },
  { key: 'appointment_reminder_24h', label: '🔔 24h Before Appointment', desc: 'Day-before reminder' },
  { key: 'appointment_reminder_1h', label: '⏱ 1h Before Appointment', desc: 'Last-minute reminder' },
  { key: 'lead_stage_changed', label: '🔄 Stage Changed to Issued', desc: 'Policy issued / deal closed' },
  { key: 'new_recruit', label: '🎯 New Recruit Added', desc: 'Fires when recruiting prospect created' },
]

interface Props {
  profile: any
  sequences: any[]
  seqCounts: Record<string, number>
  recentMetaEvents: any[]
}

export default function AutomationsClient({ profile, sequences: initialSeqs, seqCounts, recentMetaEvents }: Props) {
  const supabase = createClient()
  const [sequences, setSequences] = useState(initialSeqs)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [editingStep, setEditingStep] = useState<any>(null)
  const [newSeq, setNewSeq] = useState({ name: '', trigger: 'new_lead', description: '' })

  const activeCount = sequences.filter(s => s.active).length
  const totalTextsToday = Object.values(seqCounts).reduce((a, b) => a + b, 0)

  async function toggleSequence(id: string, active: boolean) {
    await supabase.from('text_sequences').update({ active }).eq('id', id)
    setSequences(prev => prev.map(s => s.id === id ? { ...s, active } : s))
    toast.success(active ? 'Sequence activated' : 'Sequence paused')
  }

  async function deleteSequence(id: string) {
    if (!confirm('Delete this sequence and all its steps?')) return
    await supabase.from('text_sequences').delete().eq('id', id)
    setSequences(prev => prev.filter(s => s.id !== id))
    toast.success('Deleted')
  }

  async function createSequence() {
    if (!newSeq.name || !newSeq.trigger) { toast.error('Name and trigger required'); return }
    const { data, error } = await supabase.from('text_sequences').insert({
      name: newSeq.name,
      description: newSeq.description,
      trigger: newSeq.trigger,
      agency_id: profile.agency_id,
      active: false,
    }).select('*, text_sequence_steps(*)').single()
    if (error) { toast.error('Failed to create'); return }
    setSequences(prev => [...prev, data])
    setShowNew(false)
    setNewSeq({ name: '', trigger: 'new_lead', description: '' })
    toast.success('Sequence created! Add steps to activate it.')
    setExpanded(data.id)
  }

  async function saveStep(seqId: string, step: any) {
    if (!step.id) {
      // New step
      const { data, error } = await supabase.from('text_sequence_steps').insert({
        sequence_id: seqId,
        step_number: step.step_number,
        delay_minutes: step.delay_minutes,
        message_template: step.message_template,
        ai_personalize: step.ai_personalize ?? true,
      }).select().single()
      if (error) { toast.error('Failed'); return }
      setSequences(prev => prev.map(s => s.id === seqId
        ? { ...s, text_sequence_steps: [...(s.text_sequence_steps ?? []), data] }
        : s))
    } else {
      await supabase.from('text_sequence_steps').update({
        message_template: step.message_template,
        delay_minutes: step.delay_minutes,
        ai_personalize: step.ai_personalize,
      }).eq('id', step.id)
      setSequences(prev => prev.map(s => ({
        ...s,
        text_sequence_steps: s.text_sequence_steps?.map((st: any) => st.id === step.id ? { ...st, ...step } : st),
      })))
    }
    setEditingStep(null)
    toast.success('Step saved')
  }

  async function deleteStep(seqId: string, stepId: string) {
    await supabase.from('text_sequence_steps').delete().eq('id', stepId)
    setSequences(prev => prev.map(s => s.id === seqId
      ? { ...s, text_sequence_steps: s.text_sequence_steps?.filter((st: any) => st.id !== stepId) }
      : s))
    toast.success('Step removed')
  }

  function formatDelay(mins: number) {
    if (mins === 0) return 'Immediately'
    if (mins < 60) return `${mins} min later`
    if (mins < 1440) return `${Math.round(mins / 60)}h later`
    return `Day ${Math.round(mins / 1440)} (${Math.round(mins / 60)}h)`
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap size={22} className="text-indigo-600" />Automations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} active sequences · {totalTextsToday} texts sent today
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
          <Plus size={14} />New Sequence
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { val: sequences.length, label: 'Total Sequences' },
          { val: activeCount, label: 'Active', color: 'text-emerald-600' },
          { val: totalTextsToday, label: 'Texts Today' },
          { val: recentMetaEvents.filter(e => e.sent).length, label: 'Meta Events (7d)' },
        ].map(({ val, label, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={cn('text-2xl font-extrabold', color ?? 'text-gray-900')}>{val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* New sequence form */}
      {showNew && (
        <div className="bg-white rounded-2xl border-2 border-indigo-300 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">New Sequence</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Name *</label>
              <input value={newSeq.name} onChange={e => setNewSeq(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. New Life Insurance Lead"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Trigger *</label>
              <select value={newSeq.trigger} onChange={e => setNewSeq(p => ({ ...p, trigger: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                {TRIGGER_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Description (optional)</label>
              <input value={newSeq.description} onChange={e => setNewSeq(p => ({ ...p, description: e.target.value }))}
                placeholder="What does this sequence do?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={createSequence}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
              Create Sequence
            </button>
          </div>
        </div>
      )}

      {/* Sequences list */}
      <div className="space-y-3">
        {sequences.map(seq => {
          const steps = seq.text_sequence_steps?.sort((a: any, b: any) => a.step_number - b.step_number) ?? []
          const isExpanded = expanded === seq.id
          const trigger = TRIGGER_OPTIONS.find(t => t.key === seq.trigger)

          return (
            <div key={seq.id} className={cn('bg-white rounded-2xl border transition-all',
              seq.active ? 'border-gray-200' : 'border-gray-100 opacity-75')}>
              {/* Sequence header */}
              <div className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : seq.id)}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
                  seq.active ? 'bg-indigo-100' : 'bg-gray-100')}>
                  {trigger?.label.split(' ')[0] ?? '⚡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800">{seq.name}</p>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                      seq.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                      {seq.active ? '● Active' : '○ Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {steps.length} steps · {trigger?.desc ?? seq.trigger}
                    {seqCounts[seq.id] ? ` · ${seqCounts[seq.id]} sent today` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleSequence(seq.id, !seq.active)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg">
                    {seq.active
                      ? <ToggleRight size={22} className="text-indigo-600" />
                      : <ToggleLeft size={22} className="text-gray-400" />}
                  </button>
                  <button onClick={() => deleteSequence(seq.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
                {isExpanded ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
              </div>

              {/* Steps */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  {steps.map((step: any, i: number) => (
                    <div key={step.id}>
                      {/* Connector line */}
                      {i > 0 && <div className="w-0.5 h-4 bg-gray-200 ml-4 mb-3" />}

                      {editingStep?.id === step.id ? (
                        /* Edit mode */
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Delay</label>
                              <select value={editingStep.delay_minutes}
                                onChange={e => setEditingStep((p: any) => ({ ...p, delay_minutes: parseInt(e.target.value) }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none">
                                {[[0,'Immediately'],[30,'30 min'],[60,'1 hour'],[120,'2 hours'],[480,'8 hours'],[1440,'1 day'],[2880,'2 days'],[4320,'3 days'],[10080,'7 days'],[14400,'10 days']].map(([v,l]) => (
                                  <option key={v} value={v}>{l}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-end gap-2">
                              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                                <input type="checkbox" checked={editingStep.ai_personalize ?? true}
                                  onChange={e => setEditingStep((p: any) => ({ ...p, ai_personalize: e.target.checked }))}
                                  className="rounded" />
                                AI personalize
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">
                              Message Template
                              <span className="font-normal text-gray-400 ml-1">— use {'{{first_name}}'}, {'{{agent_name}}'}</span>
                            </label>
                            <textarea value={editingStep.message_template}
                              onChange={e => setEditingStep((p: any) => ({ ...p, message_template: e.target.value }))}
                              rows={3}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans" />
                            <p className="text-xs text-gray-400 mt-1">{editingStep.message_template?.length ?? 0}/160 chars</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveStep(seq.id, editingStep)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
                              <Save size={11} />Save
                            </button>
                            <button onClick={() => setEditingStep(null)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                              <X size={11} />Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-indigo-600">{formatDelay(step.delay_minutes)}</span>
                              {step.ai_personalize && (
                                <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-semibold">AI</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{step.message_template}</p>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingStep({ ...step })}
                              className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => deleteStep(seq.id, step.id)}
                              className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-100">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add step button */}
                  <button
                    onClick={() => setEditingStep({
                      id: null,
                      sequence_id: seq.id,
                      step_number: steps.length + 1,
                      delay_minutes: steps.length === 0 ? 0 : 1440,
                      message_template: `Hi {{first_name}}, this is {{agent_name}}! `,
                      ai_personalize: true,
                    })}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 font-medium hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
                    <Plus size={14} />Add Step
                  </button>

                  {!seq.active && steps.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                      ⚠️ Sequence is paused. Toggle it on above to activate.
                    </div>
                  )}
                  {seq.active && steps.length === 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      ⚠️ Add at least one step before this sequence can send messages.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {sequences.length === 0 && !showNew && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <Zap size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-500">No sequences yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Create your first sequence to start automating lead follow-up</p>
            <button onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
              <Plus size={14} />Create First Sequence
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
