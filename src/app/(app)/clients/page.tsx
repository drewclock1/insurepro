import { createServerSupabaseClient } from '@/lib/supabase-server'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('assigned_to', user!.id)
    .order('updated_at', { ascending: false })

  return <ClientsClient leads={leads ?? []} profile={profile} />
}
