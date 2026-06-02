import { createServerSupabaseClient } from '@/lib/supabase-server'
import MetaClient from './MetaClient'
import { redirect } from 'next/navigation'

export default async function MetaPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  if (!['manager', 'admin', 'agency_owner'].includes(profile?.role)) redirect('/workbench')

  const [
    { data: metaConfig },
    { data: routingRules },
    { data: team },
    { data: campaignStats },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from('meta_configs').select('*').eq('agency_id', profile.agency_id).single(),
    supabase.from('routing_rules').select('*').eq('agency_id', profile.agency_id).order('priority', { ascending: false }),
    supabase.from('profiles').select('id,full_name,role').eq('agency_id', profile.agency_id).eq('active', true).neq('role', 'agency_owner'),
    supabase.from('campaign_performance').select('*').eq('agency_id', profile.agency_id).order('total_leads', { ascending: false }).limit(20),
    supabase.from('meta_events').select('*').eq('agency_id', profile.agency_id).order('created_at', { ascending: false }).limit(30),
  ])

  return (
    <MetaClient
      profile={profile}
      metaConfig={metaConfig}
      routingRules={routingRules ?? []}
      team={team ?? []}
      campaignStats={campaignStats ?? []}
      recentEvents={recentEvents ?? []}
    />
  )
}
