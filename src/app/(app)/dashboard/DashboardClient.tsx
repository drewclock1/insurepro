'use client'

import { useEffect, useRef } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Phone, MessageSquare, Calendar, Trophy, TrendingUp, Zap, Users, AlertCircle } from 'lucide-react'
import { cn, formatCurrency, getInitials } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  profile: any
  todayActivity: any
  weeklyActivity: any[]
  upcomingAppts: any[]
  pipelineStats: any[]
  textStats: any[]
  teamLeaderboard: any[]
}

const STAGE_ORDER = ['new','contacted','quoted','appointment','applied','issued']

export default function DashboardClient({
  profile, todayActivity, weeklyActivity,
  upcomingAppts, pipelineStats, textStats, teamLeaderboard
}: Props) {
  const chartRef = useRef<HTMLCanvasElement>(null)

  const activity = todayActivity ?? { dials:0,contacts:0,appointments:0,closes:0,premium:0 }
  const dialGoal = profile?.daily_dial_goal ?? 100
  const closeGoal = profile?.daily_close_goal ?? 3
  const dialPct = Math.min(100, Math.round((activity.dials / dialGoal) * 100))
  const monthlyGoal = 30000
  const monthPct = Math.min(100, Math.round((activity.premium ?? 0) / monthlyGoal * 100))

  // Pipeline value by stage
  const pipelineByStage = STAGE_ORDER.map(stage => ({
    stage,
    count: pipelineStats.filter(l => l.stage === stage).length,
  }))
  const maxCount = Math.max(...pipelineByStage.map(s => s.count), 1)

  // Text stats
  const textsSentToday = textStats.filter(t => t.direction === 'outbound').length
  const repliesReceivedToday = textStats.filter(t => t.direction === 'inbound').length
  const needsReply = textStats.filter(t => t.direction === 'inbound' && t.status === 'pending').length

  // Week chart
  useEffect(() => {
    if (!chartRef.current || !weeklyActivity.length) return
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    const dials = weeklyActivity.map(a => a.dials ?? 0)
    const closes = weeklyActivity.map(a => a.closes ?? 0)
    // Simple canvas chart
    const W = chartRef.current.width, H = chartRef.current.height
    const max = Math.max(...dials, 1)
    ctx.clearRect(0,0,W,H)
    const padL=30, padB=20, padT=10, padR=10
    const chartW = W-padL-padR, chartH = H-padB-padT
    const barW = (chartW / dials.length) * 0.6
    const gap = chartW / dials.length

    dials.forEach((v, i) => {
      const h = (v/max) * chartH
      const x = padL + i*gap + gap*0.2
      const y = padT + chartH - h
      ctx.fillStyle = '#c7d2fe'
      ctx.roundRect?.(x, y, barW, h, 4)
      ctx.fill()
      if (closes[i]) {
        const ch = (closes[i] / Math.max(...closes,1)) * chartH * 0.6
        ctx.fillStyle = '#10b981'
        ctx.roundRect?.(x + barW*0.3, padT+chartH-ch, barW*0.4, ch, 2)
        ctx.fill()
      }
      ctx.fillStyle = '#9ca3af'
      ctx.font = '9px Inter'
      ctx.textAlign = 'center'
      ctx.fillText(days[i] ?? '', padL + i*gap + gap/2, H-4)
    })
  }, [weeklyActivity])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Hero greeting */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-purple-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-brand-200 text-xs font-semibold uppercase tracking-wider">{greeting}</p>
            <h1 className="text-2xl font-extrabold mt-1">{firstName} 👋</h1>
            <p className="text-brand-200 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d')} · Let's make it count</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: 'Dial Goal', val: `${dialPct}%`, color: 'white' },
              { label: 'Premium Today', val: formatCurrency(activity.premium ?? 0), color: '#fde68a' },
              { label: 'Month Goal', val: `${monthPct}%`, color: '#6ee7b7' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[90px]">
                <p className="text-xl font-extrabold" style={{ color }}>{val}</p>
                <p className="text-xs text-white/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert if there are urgent texts */}
      {needsReply > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {needsReply} lead{needsReply > 1 ? 's' : ''} replied to your AI texts and need{needsReply === 1 ? 's' : ''} your attention
          </p>
          <Link href="/texting" className="ml-auto text-xs font-semibold text-amber-700 bg-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-300 transition-colors">
            View Convos →
          </Link>
        </div>
      )}

      {/* 5 KPI cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { icon: Phone, label: 'Dials', val: activity.dials ?? 0, sub: `${dialPct}% of goal`, color: 'blue', pct: dialPct },
          { icon: Users, label: 'Contacts', val: activity.contacts ?? 0, sub: `${activity.dials ? Math.round((activity.contacts/activity.dials)*100) : 0}% rate`, color: 'violet', pct: null },
          { icon: Calendar, label: 'Appointments', val: activity.appointments ?? 0, sub: `${upcomingAppts.length} upcoming`, color: 'amber', pct: null },
          { icon: Trophy, label: 'Closes', val: activity.closes ?? 0, sub: `${Math.round((activity.closes/closeGoal)*100)}% of goal`, color: 'emerald', pct: Math.round((activity.closes/closeGoal)*100) },
          { icon: Zap, label: 'AI Appts', val: 8, sub: `${textsSentToday} texts sent`, color: 'purple', pct: null },
        ].map(({ icon: Icon, label, val, sub, color, pct }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('p-2 rounded-lg',
                color === 'blue' ? 'bg-blue-50 text-blue-600' :
                color === 'violet' ? 'bg-violet-50 text-violet-600' :
                color === 'amber' ? 'bg-amber-50 text-amber-600' :
                color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                'bg-purple-50 text-purple-600'
              )}>
                <Icon size={14} />
              </div>
              {pct !== null && (
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                  pct >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
                  {pct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{val}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
            {pct !== null && (
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all',
                  color === 'blue' ? 'bg-blue-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-brand-500'
                )} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Week chart */}
        <div className="col-span-1 bg-white rounded-2xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp size={14} className="text-brand-600" />This Week
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-200 inline-block"/>Dials</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/>Closes</span>
            </div>
          </div>
          <canvas ref={chartRef} width={280} height={120} />
          {weeklyActivity.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No activity data yet</p>
          )}
        </div>

        {/* Today's schedule */}
        <div className="col-span-1 bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-brand-600" />Today's Schedule
          </h3>
          <div className="space-y-2">
            {upcomingAppts.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No appointments today</p>
                <Link href="/clients" className="text-xs text-brand-600 font-medium mt-1 block">
                  Set one from your pipeline →
                </Link>
              </div>
            )}
            {upcomingAppts.map((appt: any) => {
              const time = format(new Date(appt.scheduled_at), 'h:mm a')
              const minsUntil = Math.round((new Date(appt.scheduled_at).getTime() - Date.now()) / 60000)
              const isNear = minsUntil <= 60 && minsUntil > 0
              return (
                <div key={appt.id} className={cn(
                  'flex gap-3 p-3 rounded-xl border',
                  isNear ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-transparent'
                )}>
                  <div className="text-right w-12 flex-shrink-0">
                    <p className={cn('text-xs font-bold', isNear ? 'text-amber-600' : 'text-gray-500')}>{time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {appt.leads?.first_name} {appt.leads?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{appt.leads?.product_interest ?? 'Insurance'}</p>
                  </div>
                  {isNear && <span className="text-xs font-semibold text-amber-600 flex-shrink-0">In {minsUntil}m</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Pipeline funnel */}
        <div className="col-span-1 bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-600" />Pipeline Funnel
          </h3>
          <div className="space-y-2">
            {pipelineByStage.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-500 capitalize flex-shrink-0">{stage}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
                  <div className="h-full bg-brand-500/80 rounded-md transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🚀 Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '📞 Start Dialing', href: '/dialer', color: 'bg-brand-600 text-white hover:bg-brand-700' },
              { label: `💬 Texts (${needsReply})`, href: '/texting', color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
              { label: '＋ Add Lead', href: '/clients', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
              { label: '🎯 Add Recruit', href: '/recruiting', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
            ].map(({ label, href, color }) => (
              <Link key={href} href={href}
                className={cn('flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-colors text-center', color)}>
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">AI Bot Running</span>
            </div>
            <p className="text-xs text-emerald-600">{textsSentToday} texts sent · {repliesReceivedToday} replies · 8 appts booked</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" />Team Today
          </h3>
          <div className="space-y-1">
            {teamLeaderboard.map((entry: any, i: number) => (
              <div key={entry.rep_id} className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-xl',
                entry.rep_id === profile?.id ? 'bg-brand-50' : i === 0 ? 'bg-amber-50' : ''
              )}>
                <span className={cn('text-xs font-extrabold w-4',
                  i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : 'text-gray-300')}>
                  {i+1}
                </span>
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                  {getInitials(entry.profiles?.full_name ?? 'U')}
                </div>
                <span className="flex-1 text-xs font-medium text-gray-700 truncate">
                  {entry.profiles?.full_name}{entry.rep_id === profile?.id ? ' (you)' : ''}
                </span>
                <span className="text-xs text-gray-400">{entry.dials ?? 0}d</span>
                <span className="text-xs font-bold text-emerald-600">{entry.closes ?? 0}c</span>
              </div>
            ))}
            {teamLeaderboard.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No data yet today</p>}
          </div>
        </div>

        {/* AI summary */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Zap size={14} className="text-purple-600" />AI Activity
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: textsSentToday, label: 'Texts Sent', color: 'violet' },
              { val: repliesReceivedToday, label: 'Replies', color: 'green' },
              { val: 8, label: 'Appts Booked', color: 'blue' },
              { val: needsReply, label: 'Need Reply', color: 'amber' },
            ].map(({ val, label, color }) => (
              <div key={label} className={cn('rounded-xl p-3 text-center',
                color === 'violet' ? 'bg-violet-50' :
                color === 'green' ? 'bg-emerald-50' :
                color === 'blue' ? 'bg-blue-50' : 'bg-amber-50'
              )}>
                <p className={cn('text-lg font-extrabold',
                  color === 'violet' ? 'text-violet-700' :
                  color === 'green' ? 'text-emerald-700' :
                  color === 'blue' ? 'text-blue-700' : 'text-amber-700')}>
                  {val}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
