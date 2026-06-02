import { createServerSupabaseClient } from '@/lib/supabase-server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: agency }, { data: sheetSyncs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('agencies').select('*').eq('id',
      (await supabase.from('profiles').select('agency_id').eq('id', user!.id).single()).data?.agency_id
    ).single(),
    supabase.from('sheet_syncs').select('*').limit(5),
  ])

  return <SettingsClient profile={profile} agency={agency} sheetSyncs={sheetSyncs ?? []} />
}
