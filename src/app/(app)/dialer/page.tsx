import { createServerSupabaseClient } from '@/lib/supabase-server'
import DialerClient from './DialerClient'

export default async function DialerPage({ searchParams }: { searchParams: { lead?: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Load lead queue — scored leads not yet contacted today, ordered by AI score desc
  const { data: queue } = await supabase
    .from('leads')
    .select('*')
    .eq('assigned_to', user!.id)
    .in('stage', ['new', 'contacted'])
    .order('lead_score', { ascending: false })
    .limit(25)

  // If a specific lead was passed via query param, put it first
  const leads = queue ?? []
  if (searchParams.lead) {
    const idx = leads.findIndex(l => l.id === searchParams.lead)
    if (idx > 0) {
      const [found] = leads.splice(idx, 1)
      leads.unshift(found)
    }
  }

  return <DialerClient profile={profile} queue={leads} />
}
