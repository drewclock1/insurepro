import { createServerSupabaseClient } from '@/lib/supabase-server'
import RecruitingClient from './RecruitingClient'
import { format, subDays } from 'date-fns'

export default async function RecruitingPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const thirtyDaysAgo = format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const today = format(new Date(), 'yyyy-MM-dd')

  // Recruits pipeline
  const { data: recruits } = await supabase
    .from('recruits')
    .select('*')
    .eq('recruited_by', user!.id)
    .order('updated_at', { ascending: false })

  // Find agents in the platform that match recruit emails
  const recruitEmails = (recruits ?? []).map((r: any) => r.email).filter(Boolean)

  const { data: agentProfiles } = recruitEmails.length > 0
    ? await supabase.from('profiles')
        .select('id, full_name, email, role, daily_dial_goal, daily_close_goal')
        .in('email', recruitEmails)
        .eq('active', true)
    : { data: [] }

  const agentIds = (agentProfiles ?? []).map((p: any) => p.id)

  const [{ data: agentActivity }, { data: agentTodayActivity }] = await Promise.all([
    agentIds.length > 0
      ? supabase.from('daily_activities')
          .select('rep_id, dials, contacts, appointments, closes, premium')
          .in('rep_id', agentIds)
          .gte('date', thirtyDaysAgo)
      : Promise.resolve({ data: [] }),
    agentIds.length > 0
      ? supabase.from('daily_activities')
          .select('rep_id, dials, contacts, closes, premium')
          .in('rep_id', agentIds)
          .eq('date', today)
      : Promise.resolve({ data: [] }),
  ])

  // Roll up 30-day totals per agent
  const agentTotals: Record<string, any> = {}
  ;(agentActivity ?? []).forEach((row: any) => {
    if (!agentTotals[row.rep_id]) agentTotals[row.rep_id] = { dials: 0, closes: 0, premium: 0, appointments: 0 }
    agentTotals[row.rep_id].dials        += row.dials        ?? 0
    agentTotals[row.rep_id].closes       += row.closes       ?? 0
    agentTotals[row.rep_id].premium      += parseFloat(row.premium ?? 0)
    agentTotals[row.rep_id].appointments += row.appointments ?? 0
  })

  const agentToday: Record<string, any> = {}
  ;(agentTodayActivity ?? []).forEach((row: any) => { agentToday[row.rep_id] = row })

  const stageCounts = (recruits ?? []).reduce((acc: any, r: any) => {
    acc[r.stage] = (acc[r.stage] ?? 0) + 1; return acc
  }, {})

  return (
    <RecruitingClient
      profile={profile}
      recruits={recruits ?? []}
      stageCounts={stageCounts}
      agentProfiles={agentProfiles ?? []}
      agentTotals={agentTotals}
      agentToday={agentToday}
    />
  )
}
