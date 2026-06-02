'use client'

import { useState } from 'react'
import { UserPlus, Phone, MessageSquare, TrendingUp, Trophy, Search, Plus, BarChart3 } from 'lucide-react'
import { cn, formatPhone, formatCurrency, getInitials, recruitStageColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const STAGES = [
  { key: 'prospect',     label: 'Prospect',     emoji: '👤' },
  { key: 'contacted',    label: 'Contacted',    emoji: '📞' },
  { key: 'interviewing', label: 'Interviewing', emoji: '🎥' },
  { key: 'contracting',  label: 'Contracting',  emoji: '📋' },
  { key: 'licensed',     label: 'Licensed',     emoji: '🏅' },
  { key: 'producing',    label: 'Producing ✓',  emoji: '🚀' },
]

interface Props {
  profile: any
  recruits: any[]
  stageCounts: Record<string, number>
  agentProfiles: any[]
  agentTotals: Record<string, any>
  agentToday: Record<string, any>
}

type TabType = 'pipeline' | 'production'

export default function RecruitingClient({
  profile, recruits: initialRecruits, stageCounts,
  agentProfiles, agentTotals, agentToday,
}: Props) {
  const supabase = createClient()
  const [recruits, setRecruits] = useState(initialRecruits)
  const [tab, setTab] = useState<TabType>('pipeline')
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedRecruit, setSelectedRecruit] = useState<any>(null)
  const [newRecruit, setNewRecruit] = useState({
    first_name: '', last_name: '', phone: '', email: '', source: '', current_career: ''
  })

  const filtered = recruits.filter(r =>
    `${r.first_name} ${r.last_name} ${r.phone} ${r.email}`.toLowerCase().includes(search.toLowerCase())
  )

  async function moveStage(recruitId: string, newStage: string) {
    setRecruits(prev => prev.map(r => r.id === recruitId ? { ...r, stage: newStage } : r))
    const { error } = await supabase.from('recruits').update({ stage: newStage }).eq('id', recruitId)
    if (error) toast.error('Failed to update stage')
    else toast.success(`Moved to ${newStage}`)
  }

  async function addRecruit() {
    if (!newRecruit.first_name) return
    const { data, error } = await supabase.from('recruits').insert({
      ...newRecruit,
      agency_id: profile.agency_id,
      recruited_by: profile.id,
      stage: 'prospect',
    }).select().single()
    if (error) { toast.error('Failed to add'); return }
    setRecruits(prev => [data, ...prev])
    setShowAdd(false)
    setNewRecruit({ first_name: '', last_name: '', phone: '', email: '', source: '', current_career: '' })
    toast.success('Recruit added!')
  }

  // For production tab — merge agent profiles with their recruit record and stats
  const agentRows = agentProfiles.map((agent: any) => {
    const recruit = recruits.find(r => r.email === agent.email)
    const totals  = agentTotals[agent.id]  ?? { dials: 0, closes: 0, premium: 0, appointments: 0 }
    const today   = agentToday[agent.id]   ?? { dials: 0, closes: 0, premium: 0 }
    const closeRate = totals.dials > 0 ? ((totals.closes / totals.dials) * 100).toFixed(1) : '0'
    return { ...agent, recruit, totals, today, closeRate }
  }).sort((a: any, b: any) => b.totals.premium - a.totals.premium)

  const totalTeamPremium = agentRows.reduce((s: number, a: any) => s + a.totals.premium, 0)
  const totalTeamCloses  = agentRows.reduce((s: number, a: any) => s + a.totals.closes, 0)
  const totalTeamDials   = agentRows.reduce((s: number, a: any) => s + a.totals.dials, 0)

  return (
    <div className="max-w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruiting 🎯</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {recruits.length} candidates · {agentProfiles.length} active in platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setTab('pipeline')}
              className={cn('px-4 py-2 rounded-md text-sm font-medium transition-all',
                tab === 'pipeline' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700')}>
              Pipeline
            </button>
            <button onClick={() => setTab('production')}
              className={cn('px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                tab === 'production' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700')}>
              <BarChart3 size={13} />My Agents
              {agentProfiles.length > 0 && (
                <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full',
                  tab === 'production' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500')}>
                  {agentProfiles.length}
                </span>
              )}
            </button>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
            <UserPlus size={14} />Add Candidate
          </button>
        </div>
      </div>

      {/* Stage stats strip (always visible) */}
      <div className="grid grid-cols-6 gap-2">
        {STAGES.map(({ key, label, emoji }) => (
          <div key={key} className="bg-white rounded-xl p-3 border border-gray-200 text-center">
            <div className="text-lg">{emoji}</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stageCounts[key] ?? 0}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── PIPELINE TAB ── */}
      {tab === 'pipeline' && (
        <>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates..." className="text-sm outline-none flex-1 text-gray-700 placeholder-gray-400" />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {STAGES.map(({ key, label }) => (
              <div key={key} className="flex-shrink-0 w-64"
                onDragOver={e => e.preventDefault()}
                onDrop={() => dragging && moveStage(dragging, key)}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', recruitStageColor(key))}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-400">{filtered.filter(r => r.stage === key).length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {filtered.filter(r => r.stage === key).map(recruit => {
                    // Check if this recruit has a platform account with production
                    const agentProfile = agentProfiles.find((a: any) => a.email === recruit.email)
                    const agentStats   = agentProfile ? agentTotals[agentProfile.id] : null

                    return (
                      <div key={recruit.id}
                        draggable
                        onDragStart={() => setDragging(recruit.id)}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => setSelectedRecruit(selectedRecruit?.id === recruit.id ? null : recruit)}
                        className={cn(
                          'bg-white rounded-xl p-3 border cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
                          selectedRecruit?.id === recruit.id ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200',
                          dragging === recruit.id && 'opacity-50 rotate-1',
                          key === 'producing' && 'border-emerald-200'
                        )}>
                        <div className="flex items-start justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{recruit.first_name} {recruit.last_name}</p>
                            <p className="text-xs text-gray-400">{recruit.current_career || recruit.source || '—'}</p>
                          </div>
                          {key === 'producing' && <span className="text-base">🚀</span>}
                          {agentProfile && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded">In CRM</span>}
                        </div>

                        {/* If in platform, show today's stats inline */}
                        {agentStats && (
                          <div className="flex gap-2 mt-2 bg-indigo-50 rounded-lg px-2 py-1.5">
                            <span className="text-xs text-indigo-700">{agentStats.dials}d</span>
                            <span className="text-xs text-indigo-400">·</span>
                            <span className="text-xs text-emerald-600 font-semibold">{agentStats.closes}c</span>
                            <span className="text-xs text-indigo-400">·</span>
                            <span className="text-xs text-indigo-700">{formatCurrency(agentStats.premium)}</span>
                            <span className="text-xs text-gray-400 ml-auto">30d</span>
                          </div>
                        )}

                        <div className="flex gap-1 mt-2.5 pt-2 border-t border-gray-100">
                          <button onClick={e => { e.stopPropagation() }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                            <Phone size={10} />Call
                          </button>
                          <button onClick={e => { e.stopPropagation() }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100">
                            <MessageSquare size={10} />Text
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {filtered.filter(r => r.stage === key).length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-5 text-center">
                      <p className="text-xs text-gray-400">Drop here</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MY AGENTS PRODUCTION TAB ── */}
      {tab === 'production' && (
        <div className="space-y-4">
          {/* Team totals */}
          {agentRows.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Team Premium (30d)', val: formatCurrency(totalTeamPremium), color: 'text-emerald-600' },
                { label: 'Team Closes (30d)',  val: totalTeamCloses,                  color: 'text-emerald-600' },
                { label: 'Team Dials (30d)',   val: totalTeamDials.toLocaleString(),   color: '' },
                { label: 'Active Agents',      val: agentRows.length,                  color: '' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <p className={cn('text-2xl font-extrabold', color || 'text-gray-900')}>{val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {agentRows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <BarChart3 size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-500">No agents in the platform yet</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                When recruited agents sign up with the same email you entered in their recruit profile, their production stats will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Rank', 'Agent', 'Today Dials', 'Today Closes', '30d Premium', '30d Closes', 'Close %', 'Stage'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {agentRows.map((agent: any, i: number) => {
                    const recruitRecord = recruits.find(r => r.email === agent.email)
                    return (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={cn('text-sm font-extrabold',
                            i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : 'text-gray-300')}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                              {getInitials(agent.full_name ?? 'U')}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{agent.full_name}</p>
                              <p className="text-xs text-gray-400">{agent.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{agent.today.dials ?? 0}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{agent.today.closes ?? 0}</td>
                        <td className="px-4 py-3 font-bold text-gray-800">{formatCurrency(agent.totals.premium)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{agent.totals.closes}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                            parseFloat(agent.closeRate) >= 3 ? 'bg-emerald-100 text-emerald-700' :
                            parseFloat(agent.closeRate) >= 1 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500')}>
                            {agent.closeRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {recruitRecord ? (
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', recruitStageColor(recruitRecord.stage))}>
                              {recruitRecord.stage}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Recruit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Candidate</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">First Name *</label>
                  <input value={newRecruit.first_name} onChange={e => setNewRecruit(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Last Name</label>
                  <input value={newRecruit.last_name} onChange={e => setNewRecruit(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
                <input value={newRecruit.phone} onChange={e => setNewRecruit(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email <span className="text-gray-400 font-normal">(links to their CRM account)</span></label>
                <input value={newRecruit.email} onChange={e => setNewRecruit(p => ({ ...p, email: e.target.value }))}
                  placeholder="agent@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Source</label>
                  <select value={newRecruit.source} onChange={e => setNewRecruit(p => ({ ...p, source: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select...</option>
                    <option>Facebook Ad</option><option>Indeed</option><option>LinkedIn</option>
                    <option>Referral</option><option>Cold Outreach</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Current Career</label>
                  <input value={newRecruit.current_career} onChange={e => setNewRecruit(p => ({ ...p, current_career: e.target.value }))}
                    placeholder="e.g. Sales, Finance"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                💡 When this person signs up using the same email above, their dials, closes, and premium will automatically appear in your "My Agents" tab.
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={addRecruit}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
