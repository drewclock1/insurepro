import { createServerSupabaseClient } from '@/lib/supabase-server'
import WorkbenchClient from './WorkbenchClient'
import { format } from 'date-fns'

export default async function WorkbenchPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: profile }, { data: todayActivity }, { data: recentCalls }, { data: leaderboard }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).single(),

      supabase.from('daily_activities')
        .select('*').eq('rep_id', user!.id).eq('date', today).single(),

      supabase.from('calls')
        .select('*, leads(first_name, last_name)')
        .eq('rep_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10),

      supabase.from('daily_activities')
        .select('*, profiles(full_name, avatar_url)')
        .eq('date', today)
        .order('closes', { ascending: false })
        .limit(10),
    ])

  return (
    <WorkbenchClient
      profile={profile}
      todayActivity={todayActivity}
      recentCalls={recentCalls ?? []}
      leaderboard={leaderboard ?? []}
    />
  )
}
