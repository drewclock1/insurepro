'use client'

import { useState } from 'react'
import { Users, Phone, Trophy, TrendingUp, Settings, ToggleLeft, ToggleRight, Save, UserMinus, UserCheck } from 'lucide-react'
import { cn, formatCurrency, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Props {
  profile: any
  team: any[]
  todayStats: any[]
  monthByRep: Record<string, { dials: number; closes: number; premium: number }>
  recentCalls: any[]
  sequences: any[]
}

const TABS = ['Team Overview', 'Rep Management', 'Sequences', 'Recent Calls']

export default function AdminClient({ profile, team, todayStats, monthByRep, recentCalls, sequences: initialSeqs }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState('Team Overview')
  const [selectedRep, setSelectedRep] = useState<any>(null)
  const [editingRep, setEditingRep] = useState<any>(null)
  const [sequences, setSequences] = useState(initialSeqs)

  // Merge today stats onto team
  const teamWithStats = team.map(rep => {
    const today = todayStats.find(s => s.rep_id === rep.id) ?? {}
    const month = monthByRep[rep.id] ?? { dials: 0, closes: 0, premium: 0 }
    return { ...rep, today, month }
  }).sort((a, b) => (b.month.premium ?? 0) - (a.month.premium ?? 0))

  const totalTeamPremium = Object.values(monthByRep).reduce((s, r) => s + r.premium, 0)
  const totalTeamCloses = Object.values(monthByRep).reduce((s, r) => s + r.closes, 0)
  const totalTeamDials = Object.values(monthByRep).reduce((s, r) => s + r.dials, 0)

  async function saveRepChanges() {
    if (!editingRep) return
    const { error } = await supabase.from('profiles').update({
      full_name: editingRep.full_name,
      role: editingRep.role,
      twilio_number: editingRep.twilio_number,
      daily_dial_goal: parseInt(editingRep.daily_dial_goal) || 100,
      daily_close_goal: parseInt(editingRep.daily_close_goal) || 3,
      active: editingRep.active,
    }).eq('id', editingRep.id)
    if (error) { toast.error('Failed to save'); return }
    toast.success(`${editingRep.full_name} updated!`)
    setEditingRep(null)
  }

  async function toggleRepActive(repId: string, active: boolean) {
    await supabase.from('profiles').update({ active }).eq('id', repId)
    toast.success(active ? 'Rep reactivated' : 'Rep deactivated')
  }

  async function toggleSequence(seqId: string, active: boolean) {
    await supabase.from('text_sequences').update({ active }).eq('id', seqId)
    setSequences(prev => prev.map(s => s.id === seqId ? { ...s, active } : s))
    toast.success(active ? 'Sequence activated' : 'Sequence paused')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Panel 👔</h1>
          <p className="text-sm text-gray-500 mt-0.5">{team.length} reps · {team.filter(r => r.active).length} active</p>
        </div>
      </div>

      {/* Agency KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: TrendingUp, label: 'Month Premium', val: formatCurrency(totalTeamPremium), color: 'brand' },
          { icon: Trophy, label: 'Month Closes', val: totalTeamCloses, color: 'emerald' },
          { icon: Phone, label: 'Month Dials', val: totalTeamDials.toLocaleString(), color: 'blue' },
          { icon: Users, label: 'Active Reps', val: team.filter(r => r.active !== false).length, color: 'violet' },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-200">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3',
              color === 'brand' ? 'bg-brand-50 text-brand-600' :
              color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600')}>
              <Icon size={15} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{val}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              tab === t ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* Team Overview */}
      {tab === 'Team Overview' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Rep', 'Dials Today', 'Closes Today', 'Month Premium', 'Month Closes', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teamWithStats.map((rep, i) => (
                <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700')}>
                        {getInitials(rep.full_name ?? 'U')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{rep.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{rep.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{rep.today.dials ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={cn('font-bold', rep.today.closes > 0 ? 'text-emerald-600' : 'text-gray-400')}>
                      {rep.today.closes ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{formatCurrency(rep.month.premium)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{rep.month.closes}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                      rep.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                      {rep.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedRep(rep); setEditingRep({ ...rep }); setTab('Rep Management') }}
                      className="text-xs text-brand-600 font-semibold hover:text-brand-700">
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rep Management */}
      {tab === 'Rep Management' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Rep list */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-700">Team ({team.length})</p>
            </div>
            <div className="divide-y divide-gray-50">
              {teamWithStats.map(rep => (
                <button key={rep.id}
                  onClick={() => { setSelectedRep(rep); setEditingRep({ ...rep }) }}
                  className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                    selectedRep?.id === rep.id && 'bg-brand-50')}>
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                    {getInitials(rep.full_name ?? 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{rep.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{rep.role}</p>
                  </div>
                  {rep.active === false && <span className="text-xs text-gray-400">Off</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Edit rep */}
          {editingRep ? (
            <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Edit: {editingRep.full_name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRepActive(editingRep.id, editingRep.active === false)}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                      editingRep.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}>
                    {editingRep.active !== false ? <><UserMinus size={12} /> Deactivate</> : <><UserCheck size={12} /> Reactivate</>}
                  </button>
                  <button onClick={saveRepChanges}
                    className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700">
                    <Save size={12} /> Save
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Full Name</label>
                  <input value={editingRep.full_name ?? ''}
                    onChange={e => setEditingRep((p: any) => ({ ...p, full_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Role</label>
                  <select value={editingRep.role ?? 'rep'}
                    onChange={e => setEditingRep((p: any) => ({ ...p, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="rep">Rep</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="agency_owner">Agency Owner</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                    Assigned Twilio Number
                    <span className="text-gray-400 font-normal ml-1">(their DID for calls + texts)</span>
                  </label>
                  <input value={editingRep.twilio_number ?? ''}
                    onChange={e => setEditingRep((p: any) => ({ ...p, twilio_number: e.target.value }))}
                    placeholder="+15551234567"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Manager (reports to)</label>
                  <select value={editingRep.manager_id ?? ''}
                    onChange={e => setEditingRep((p: any) => ({ ...p, manager_id: e.target.value || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">No manager</option>
                    {team.filter(r => ['manager','admin','agency_owner'].includes(r.role) && r.id !== editingRep.id)
                      .map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Daily Dial Goal</label>
                  <input type="number" value={editingRep.daily_dial_goal ?? 100}
                    onChange={e => setEditingRep((p: any) => ({ ...p, daily_dial_goal: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Daily Close Goal</label>
                  <input type="number" value={editingRep.daily_close_goal ?? 3}
                    onChange={e => setEditingRep((p: any) => ({ ...p, daily_close_goal: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              {/* This month stats */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">This Month's Performance</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: monthByRep[editingRep.id]?.dials ?? 0, label: 'Dials' },
                    { val: monthByRep[editingRep.id]?.closes ?? 0, label: 'Closes' },
                    { val: formatCurrency(monthByRep[editingRep.id]?.premium ?? 0), label: 'Premium' },
                  ].map(({ val, label }) => (
                    <div key={label} className="bg-white rounded-lg p-3 text-center border border-gray-200">
                      <p className="text-xl font-extrabold text-gray-900">{val}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="col-span-2 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
              <p className="text-gray-400 text-sm">← Select a rep to manage</p>
            </div>
          )}
        </div>
      )}

      {/* Sequences */}
      {tab === 'Sequences' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">Text Sequences ({sequences.length})</p>
            <p className="text-xs text-gray-400">{sequences.filter(s => s.active).length} active</p>
          </div>
          <div className="divide-y divide-gray-50">
            {sequences.map(seq => (
              <div key={seq.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{seq.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {seq.text_sequence_steps?.length ?? 0} steps · Trigger: <span className="font-medium capitalize">{seq.trigger?.replace(/_/g, ' ')}</span>
                  </p>
                  {seq.description && <p className="text-xs text-gray-400 mt-0.5">{seq.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full',
                    seq.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {seq.active ? '● Active' : '○ Paused'}
                  </span>
                  <button onClick={() => toggleSequence(seq.id, !seq.active)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                    {seq.active ? <ToggleRight size={20} className="text-brand-600" /> : <ToggleLeft size={20} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Calls */}
      {tab === 'Recent Calls' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Rep', 'Lead', 'Duration', 'Disposition', 'AI Summary', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentCalls.map((call: any) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{call.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{call.leads?.first_name} {call.leads?.last_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {call.duration_seconds ? `${Math.round(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize',
                      call.disposition === 'sold' ? 'bg-emerald-100 text-emerald-700' :
                      call.disposition === 'appointment_set' ? 'bg-blue-100 text-blue-700' :
                      call.disposition === 'no_answer' ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-100 text-amber-700')}>
                      {call.disposition?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {call.ai_summary ?? <span className="text-gray-300">Generating...</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {call.started_at ? new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
              {recentCalls.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No calls yet today</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
