import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import { format, subDays } from 'date-fns'

export default async function AdminPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Only managers/admins/owners
  if (!['manager', 'admin', 'agency_owner'].includes(profile?.role)) redirect('/workbench')

  const today = format(new Date(), 'yyyy-MM-dd')
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const [
    { data: team },
    { data: todayStats },
    { data: monthStats },
    { data: recentCalls },
    { data: sequences },
  ] = await Promise.all([
    // All reps in agency with their profiles
    supabase.from('profiles')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .order('full_name'),

    // Today's activity for all reps
    supabase.from('daily_activities')
      .select('*, profiles(full_name, avatar_url)')
      .eq('agency_id', profile.agency_id)
      .eq('date', today),

    // Month's activity summary
    supabase.from('daily_activities')
      .select('rep_id, dials, contacts, appointments, closes, premium')
      .eq('agency_id', profile.agency_id)
      .gte('date', thirtyDaysAgo),

    // Recent calls across agency
    supabase.from('calls')
      .select('*, leads(first_name, last_name), profiles(full_name)')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Active sequences
    supabase.from('text_sequences')
      .select('*, text_sequence_steps(id)')
      .eq('agency_id', profile.agency_id),
  ])

  // Roll up month stats per rep
  const monthByRep = (monthStats ?? []).reduce((acc: any, row) => {
    if (!acc[row.rep_id]) acc[row.rep_id] = { dials: 0, closes: 0, premium: 0 }
    acc[row.rep_id].dials += row.dials ?? 0
    acc[row.rep_id].closes += row.closes ?? 0
    acc[row.rep_id].premium += parseFloat(row.premium ?? 0)
    return acc
  }, {})

  return (
    <AdminClient
      profile={profile}
      team={team ?? []}
      todayStats={todayStats ?? []}
      monthByRep={monthByRep}
      recentCalls={recentCalls ?? []}
      sequences={sequences ?? []}
    />
  )
}
