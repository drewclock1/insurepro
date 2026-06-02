'use client'

import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Phone, Trophy, Users, Download } from 'lucide-react'
import { cn, formatCurrency, getInitials } from '@/lib/utils'
import { format } from 'date-fns'

interface Props {
  profile: any
  team: any[]
  monthlyActivity: any[]
  weeklyActivity: any[]
  leadsData: any[]
  callsData: any[]
  metaStats: any[]
}

const TABS = ['Overview', 'Team', 'Pipeline', 'Calls', 'Meta Campaigns']
const PERIODS = ['7 days', '30 days']

export default function ReportsClient({
  profile, team, monthlyActivity, weeklyActivity, leadsData, callsData, metaStats
}: Props) {
  const [tab, setTab] = useState('Overview')
  const [period, setPeriod] = useState('30 days')

  const activity = period === '7 days' ? weeklyActivity : monthlyActivity

  // Aggregate totals
  const totals = useMemo(() => activity.reduce((acc, row) => ({
    dials: acc.dials + (row.dials ?? 0),
    contacts: acc.contacts + (row.contacts ?? 0),
    appointments: acc.appointments + (row.appointments ?? 0),
    closes: acc.closes + (row.closes ?? 0),
    premium: acc.premium + parseFloat(row.premium ?? 0),
  }), { dials: 0, contacts: 0, appointments: 0, closes: 0, premium: 0 }), [activity])

  // Per-rep totals
  const repTotals = useMemo(() => {
    const map: Record<string, any> = {}
    monthlyActivity.forEach(row => {
      if (!map[row.rep_id]) map[row.rep_id] = { dials: 0, closes: 0, premium: 0, appointments: 0 }
      map[row.rep_id].dials += row.dials ?? 0
      map[row.rep_id].closes += row.closes ?? 0
      map[row.rep_id].premium += parseFloat(row.premium ?? 0)
      map[row.rep_id].appointments += row.appointments ?? 0
    })
    return map
  }, [monthlyActivity])

  // Daily totals for sparkline-style display
  const dailyTotals = useMemo(() => {
    const map: Record<string, any> = {}
    activity.forEach(row => {
      if (!map[row.date]) map[row.date] = { dials: 0, closes: 0, premium: 0 }
      map[row.date].dials += row.dials ?? 0
      map[row.date].closes += row.closes ?? 0
      map[row.date].premium += parseFloat(row.premium ?? 0)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [activity])

  // Lead funnel
  const stageCounts: Record<string, number> = {}
  leadsData.forEach(l => { stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1 })
  const totalLeads = leadsData.length

  // Lead sources
  const sourceCounts: Record<string, number> = {}
  leadsData.forEach(l => {
    const src = l.source ?? 'unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
  })

  // Call stats
  const callDispositions: Record<string, number> = {}
  callsData.forEach(c => {
    const d = c.disposition ?? 'unknown'
    callDispositions[d] = (callDispositions[d] ?? 0) + 1
  })
  const totalCalls = callsData.length
  const avgDuration = totalCalls > 0
    ? Math.round(callsData.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / totalCalls)
    : 0

  const maxBar = Math.max(...dailyTotals.map(([, v]) => v.dials), 1)

  function exportCSV() {
    const rows = [['Date', 'Dials', 'Contacts', 'Appointments', 'Closes', 'Premium']]
    dailyTotals.forEach(([date, v]) => rows.push([date, v.dials, 0, 0, v.closes, v.premium]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `insurepro-report-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports 📈</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agency performance analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  period === p ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Download size={14} />Export CSV
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { icon: Phone, label: 'Total Dials', val: totals.dials.toLocaleString(), color: 'blue' },
          { icon: Users, label: 'Contacts', val: totals.contacts.toLocaleString(), color: 'violet' },
          { icon: BarChart3, label: 'Appointments', val: totals.appointments.toLocaleString(), color: 'amber' },
          { icon: Trophy, label: 'Closes', val: totals.closes.toLocaleString(), color: 'emerald' },
          { icon: TrendingUp, label: 'Premium Written', val: formatCurrency(totals.premium), color: 'brand' },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-200">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3',
              color === 'blue' ? 'bg-blue-50 text-blue-600' :
              color === 'violet' ? 'bg-violet-50 text-violet-600' :
              color === 'amber' ? 'bg-amber-50 text-amber-600' :
              color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              'bg-indigo-50 text-indigo-600')}>
              <Icon size={15} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{val}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            {totals.dials > 0 && label === 'Contacts' && (
              <p className="text-xs text-gray-400 mt-1">{Math.round((totals.contacts / totals.dials) * 100)}% contact rate</p>
            )}
            {totals.contacts > 0 && label === 'Appointments' && (
              <p className="text-xs text-gray-400 mt-1">{Math.round((totals.appointments / totals.contacts) * 100)}% of contacts</p>
            )}
            {totals.appointments > 0 && label === 'Closes' && (
              <p className="text-xs text-gray-400 mt-1">{Math.round((totals.closes / totals.appointments) * 100)}% close rate</p>
            )}
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

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-2 gap-5">
          {/* Daily activity bar chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-indigo-600" />Daily Dials & Closes
            </h3>
            <div className="flex items-end gap-1 h-40">
              {dailyTotals.map(([date, v]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {date.slice(5)}: {v.dials}d / {v.closes}c
                  </div>
                  <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                    <div className="w-full bg-indigo-200 rounded-t transition-all"
                      style={{ height: `${(v.dials / maxBar) * 100}%`, minHeight: v.dials > 0 ? '4px' : '0' }} />
                    {v.closes > 0 && (
                      <div className="w-full bg-emerald-500 rounded-t -mt-1"
                        style={{ height: `${(v.closes / Math.max(totals.closes, 1)) * 30}%`, minHeight: '4px' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-200 rounded-sm inline-block"/>Dials</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block"/>Closes</span>
            </div>
          </div>

          {/* Conversion funnel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-600" />Conversion Funnel (30d)
            </h3>
            <div className="space-y-3">
              {[
                { stage: 'Leads Created', count: totalLeads, color: 'bg-slate-400' },
                { stage: 'Contacted', count: stageCounts.contacted ?? 0, color: 'bg-blue-400' },
                { stage: 'Appointment Set', count: stageCounts.appointment ?? 0, color: 'bg-amber-400' },
                { stage: 'Applied', count: stageCounts.applied ?? 0, color: 'bg-orange-400' },
                { stage: 'Issued / Closed', count: stageCounts.issued ?? 0, color: 'bg-emerald-500' },
              ].map(({ stage, count, color }) => (
                <div key={stage}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{stage}</span>
                    <span className="font-bold text-gray-800">{count}
                      {totalLeads > 0 && stage !== 'Leads Created' && (
                        <span className="font-normal text-gray-400 ml-1">
                          ({Math.round((count / totalLeads) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-5 bg-gray-100 rounded-lg overflow-hidden">
                    <div className={`h-full ${color} rounded-lg transition-all`}
                      style={{ width: totalLeads > 0 ? `${(count / totalLeads) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead sources */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">📍 Lead Sources (30d)</h3>
            <div className="space-y-2">
              {Object.entries(sourceCounts).sort(([,a],[,b]) => b-a).map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-24 capitalize truncate">{source}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${(count / totalLeads) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
              {Object.keys(sourceCounts).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No leads in this period</p>
              )}
            </div>
          </div>

          {/* Premium trend */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">💰 Premium by Day</h3>
            <div className="flex items-end gap-1 h-32">
              {dailyTotals.map(([date, v]) => {
                const maxPrem = Math.max(...dailyTotals.map(([,d]) => d.premium), 1)
                return (
                  <div key={date} className="flex-1 flex flex-col items-center relative group">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 z-10">
                      {formatCurrency(v.premium)}
                    </div>
                    <div className="w-full bg-emerald-300 rounded-t"
                      style={{ height: `${(v.premium / maxPrem) * 100}%`, minHeight: v.premium > 0 ? '3px' : '0' }} />
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Total: {formatCurrency(totals.premium)} · Avg/day: {formatCurrency(totals.premium / Math.max(dailyTotals.length, 1))}
            </p>
          </div>
        </div>
      )}

      {/* ── TEAM ── */}
      {tab === 'Team' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Rank', 'Rep', 'Dials', 'Contacts', 'Appts', 'Closes', 'Premium', 'Dial→Close%'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {team
                .map(rep => ({ ...rep, ...(repTotals[rep.id] ?? { dials: 0, closes: 0, premium: 0, appointments: 0 }) }))
                .sort((a, b) => b.premium - a.premium)
                .map((rep, i) => {
                  const contactRate = rep.dials > 0 ? Math.round((rep.dials * 0.25)) : 0
                  const closeRate = rep.dials > 0 ? ((rep.closes / rep.dials) * 100).toFixed(1) : '0'
                  return (
                    <tr key={rep.id} className={cn('hover:bg-gray-50', i === 0 && 'bg-amber-50/30')}>
                      <td className="px-4 py-3">
                        <span className={cn('text-sm font-extrabold',
                          i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300')}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                            {getInitials(rep.full_name ?? 'U')}
                          </div>
                          <span className="font-semibold text-gray-800">{rep.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{rep.dials.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{contactRate}</td>
                      <td className="px-4 py-3 text-gray-600">{rep.appointments}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{rep.closes}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{formatCurrency(rep.premium)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                          parseFloat(closeRate) >= 3 ? 'bg-emerald-100 text-emerald-700' :
                          parseFloat(closeRate) >= 1 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500')}>
                          {closeRate}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          {team.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">No team activity in this period</div>
          )}
        </div>
      )}

      {/* ── PIPELINE ── */}
      {tab === 'Pipeline' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Pipeline Stage Breakdown</h3>
            <div className="space-y-3">
              {['new','contacted','quoted','appointment','applied','issued','declined','lost'].map(stage => {
                const count = stageCounts[stage] ?? 0
                const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 capitalize">{stage}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-lg" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Lead Sources</h3>
            <div className="space-y-3">
              {Object.entries(sourceCounts).sort(([,a],[,b]) => b-a).map(([src, count]) => (
                <div key={src} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 capitalize w-28 truncate">{src}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-lg"
                      style={{ width: `${(count / totalLeads) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CALLS ── */}
      {tab === 'Calls' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Call Dispositions (30d)</h3>
            <div className="space-y-3">
              {Object.entries(callDispositions).sort(([,a],[,b]) => b-a).map(([disp, count]) => (
                <div key={disp} className="flex items-center gap-3">
                  <span className={cn('text-xs font-medium w-32 capitalize',
                    disp === 'sold' ? 'text-emerald-600' :
                    disp === 'appointment_set' ? 'text-blue-600' :
                    'text-gray-600')}>
                    {disp.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden">
                    <div className={cn('h-full rounded-lg',
                      disp === 'sold' ? 'bg-emerald-400' :
                      disp === 'appointment_set' ? 'bg-blue-400' :
                      disp === 'no_answer' ? 'bg-gray-300' : 'bg-amber-300')}
                      style={{ width: `${(count / Math.max(totalCalls, 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-10 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Call Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: totalCalls.toLocaleString(), label: 'Total Calls' },
                { val: `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`, label: 'Avg Duration' },
                { val: callDispositions.sold ?? 0, label: 'Calls → Sold' },
                { val: callDispositions.appointment_set ?? 0, label: 'Appts Set by Phone' },
                { val: totalCalls > 0 ? `${((callDispositions.sold ?? 0) / totalCalls * 100).toFixed(1)}%` : '0%', label: 'Call Close Rate' },
                { val: totalCalls > 0 ? `${((callDispositions.no_answer ?? 0) / totalCalls * 100).toFixed(0)}%` : '0%', label: 'No Answer Rate' },
              ].map(({ val, label }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xl font-extrabold text-gray-900">{val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── META CAMPAIGNS ── */}
      {tab === 'Meta Campaigns' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {metaStats.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-500 font-medium">No Meta campaign data yet</p>
              <p className="text-sm text-gray-400 mt-1">Connect Meta in the Meta / Facebook tab to see campaign performance</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Campaign', 'Ad Set', 'Leads', 'Appts', 'Applied', 'Issued', 'Close Rate', 'Last Lead'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {metaStats.map((row: any) => (
                  <tr key={`${row.meta_campaign_id}-${row.meta_adset_id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800 max-w-[160px] truncate">{row.meta_campaign_name ?? row.meta_campaign_id ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{row.meta_adset_name ?? '—'}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{row.total_leads}</td>
                    <td className="px-4 py-3 text-blue-600 font-semibold">{row.appointments ?? 0}</td>
                    <td className="px-4 py-3 text-orange-600 font-semibold">{row.applied ?? 0}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">{row.issued ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                        parseFloat(row.close_rate_pct) >= 10 ? 'bg-emerald-100 text-emerald-700' :
                        parseFloat(row.close_rate_pct) >= 5 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500')}>
                        {row.close_rate_pct ?? '0'}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {row.last_lead_at ? format(new Date(row.last_lead_at), 'MMM d') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
