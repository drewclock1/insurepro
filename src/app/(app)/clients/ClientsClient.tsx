'use client'

import { useState } from 'react'
import { Phone, MessageSquare, Mail, Star, Plus, Filter, Search, ArrowUpDown } from 'lucide-react'
import { cn, formatPhone, leadStageColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'

const STAGES = [
  { key: 'new',         label: 'New Leads',   color: 'slate' },
  { key: 'contacted',   label: 'Contacted',   color: 'blue' },
  { key: 'quoted',      label: 'Quoted',      color: 'violet' },
  { key: 'appointment', label: 'Appointment', color: 'amber' },
  { key: 'applied',     label: 'Applied',     color: 'orange' },
  { key: 'issued',      label: 'Issued ✓',    color: 'emerald' },
]

interface Props { leads: any[]; profile: any }

type ViewMode = 'kanban' | 'list'

export default function ClientsClient({ leads: initialLeads, profile }: Props) {
  const supabase = createClient()
  const [leads, setLeads] = useState(initialLeads)
  const [view, setView] = useState<ViewMode>('kanban')
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)

  const filtered = leads.filter(l =>
    `${l.first_name} ${l.last_name} ${l.phone} ${l.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const byStage = (stage: string) => filtered.filter(l => l.stage === stage)

  async function moveToStage(leadId: string, newStage: string) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l))
    const { error } = await supabase.from('leads').update({ stage: newStage }).eq('id', leadId)
    if (error) toast.error('Failed to update stage')
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50'
    if (score >= 60) return 'text-amber-600 bg-amber-50'
    return 'text-gray-500 bg-gray-50'
  }

  return (
    <div className="max-w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} leads in your pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['kanban', 'list'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all',
                  view === v ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
                {v}
              </button>
            ))}
          </div>
          <Link href="/clients/import"
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            ⬆ Import CSV
          </Link>
          <button className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus size={14} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={14} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..." className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400" />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Filter size={14} />Filters
        </button>
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <ArrowUpDown size={14} />Sort
        </button>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {STAGES.map(({ key, label }) => {
            const stageLeads = byStage(key)
            return (
              <div key={key} className="flex-shrink-0 w-72"
                onDragOver={e => e.preventDefault()}
                onDrop={() => dragging && moveToStage(dragging, key)}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', leadStageColor(key))}>
                      {label}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{stageLeads.length}</span>
                  </div>
                  <button className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-600">
                    <Plus size={12} />
                  </button>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[100px]">
                  {stageLeads.map(lead => (
                    <div key={lead.id}
                      draggable
                      onDragStart={() => setDragging(lead.id)}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        'bg-white rounded-xl p-3.5 border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
                        dragging === lead.id && 'opacity-50 rotate-1'
                      )}>
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-xs text-gray-400">{formatPhone(lead.phone ?? '')}</p>
                        </div>
                        {lead.lead_score > 0 && (
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', getScoreColor(lead.lead_score))}>
                            {lead.lead_score}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {lead.product_interest && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {lead.product_interest}
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-gray-100">
                        <Link href={`/dialer?lead=${lead.id}`}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-medium">
                          <Phone size={11} />Dial
                        </Link>
                        <Link href={`/texting?lead=${lead.id}`}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors text-xs font-medium">
                          <MessageSquare size={11} />Text
                        </Link>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                          <Mail size={11} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center">
                      <p className="text-xs text-gray-400">Drop leads here</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Phone', 'Stage', 'Score', 'Product', 'Last Contact', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-gray-400">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatPhone(lead.phone ?? '')}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', leadStageColor(lead.stage))}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', getScoreColor(lead.lead_score ?? 0))}>
                      {lead.lead_score ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{lead.product_interest ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {lead.last_contacted ? new Date(lead.last_contacted).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/dialer?lead=${lead.id}`}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                        <Phone size={12} />
                      </Link>
                      <Link href={`/texting?lead=${lead.id}`}
                        className="p-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors">
                        <MessageSquare size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
