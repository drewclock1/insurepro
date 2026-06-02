import { createServerSupabaseClient } from '@/lib/supabase-server'
import AutomationsClient from './AutomationsClient'

export default async function AutomationsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const [{ data: sequences }, { data: metaEvents }] = await Promise.all([
    supabase.from('text_sequences')
      .select('*, text_sequence_steps(id, step_number, delay_minutes, message_template, ai_personalize)')
      .eq('agency_id', profile!.agency_id)
      .order('created_at'),

    supabase.from('meta_events')
      .select('event_name, sent, created_at')
      .eq('agency_id', profile!.agency_id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Count texts sent per sequence today
  const today = new Date().toISOString().split('T')[0]
  const { data: todayTexts } = await supabase
    .from('texts')
    .select('sequence_id')
    .eq('agency_id', profile!.agency_id)
    .gte('sent_at', today + 'T00:00:00')
    .not('sequence_id', 'is', null)

  const seqCounts: Record<string, number> = {}
  todayTexts?.forEach((t: any) => {
    seqCounts[t.sequence_id] = (seqCounts[t.sequence_id] ?? 0) + 1
  })

  return (
    <AutomationsClient
      profile={profile}
      sequences={sequences ?? []}
      seqCounts={seqCounts}
      recentMetaEvents={metaEvents ?? []}
    />
  )
}
