import { createServerSupabaseClient } from '@/lib/supabase-server'
import ReportsClient from './ReportsClient'
import { format, subDays } from 'date-fns'
import { redirect } from 'next/navigation'

export default async function ReportsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  if (!['manager', 'admin', 'agency_owner'].includes(profile?.role ?? '')) redirect('/workbench')

  const thirtyDaysAgo = format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const [
    { data: monthlyActivity },
    { data: weeklyActivity },
    { data: team },
    { data: leadsData },
    { data: callsData },
    { data: metaStats },
  ] = await Promise.all([
    supabase.from('daily_activities')
      .select('date, rep_id, dials, contacts, appointments, closes, premium')
      .eq('agency_id', profile!.agency_id)
      .gte('date', thirtyDaysAgo)
      .order('date'),

    supabase.from('daily_activities')
      .select('date, dials, contacts, appointments, closes, premium')
      .eq('agency_id', profile!.agency_id)
      .gte('date', sevenDaysAgo)
      .order('date'),

    supabase.from('profiles')
      .select('id, full_name')
      .eq('agency_id', profile!.agency_id)
      .eq('active', true),

    supabase.from('leads')
      .select('stage, source, created_at, meta_campaign_name')
      .eq('agency_id', profile!.agency_id)
      .gte('created_at', thirtyDaysAgo + 'T00:00:00'),

    supabase.from('calls')
      .select('disposition, duration_seconds, rep_id, started_at')
      .eq('agency_id', profile!.agency_id)
      .gte('started_at', thirtyDaysAgo + 'T00:00:00'),

    supabase.from('campaign_performance')
      .select('*')
      .eq('agency_id', profile!.agency_id)
      .order('total_leads', { ascending: false })
      .limit(10),
  ])

  return (
    <ReportsClient
      profile={profile}
      team={team ?? []}
      monthlyActivity={monthlyActivity ?? []}
      weeklyActivity={weeklyActivity ?? []}
      leadsData={leadsData ?? []}
      callsData={callsData ?? []}
      metaStats={metaStats ?? []}
    />
  )
}
