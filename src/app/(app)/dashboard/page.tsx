import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'
import { format, subDays } from 'date-fns'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [
    { data: profile },
    { data: todayActivity },
    { data: weeklyActivity },
    { data: upcomingAppts },
    { data: pipelineStats },
    { data: textStats },
    { data: teamLeaderboard },
  ] = await Promise.all([
    supabase.from('profiles').select('*, agencies(name)').eq('id', user!.id).single(),

    supabase.from('daily_activities').select('*').eq('rep_id', user!.id).eq('date', today).single(),

    supabase.from('daily_activities').select('*').eq('rep_id', user!.id)
      .gte('date', format(subDays(new Date(), 6), 'yyyy-MM-dd'))
      .order('date', { ascending: true }),

    supabase.from('appointments').select('*, leads(first_name,last_name,product_interest)')
      .eq('rep_id', user!.id).eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at').limit(5),

    supabase.from('leads').select('stage').eq('assigned_to', user!.id),

    supabase.from('texts').select('id,direction,status')
      .eq('rep_id', user!.id).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),

    supabase.from('daily_activities').select('*, profiles(full_name)')
      .eq('date', today).order('closes', { ascending: false }).limit(5),
  ])

  return (
    <DashboardClient
      profile={profile}
      todayActivity={todayActivity}
      weeklyActivity={weeklyActivity ?? []}
      upcomingAppts={upcomingAppts ?? []}
      pipelineStats={pipelineStats ?? []}
      textStats={textStats ?? []}
      teamLeaderboard={teamLeaderboard ?? []}
    />
  )
}
