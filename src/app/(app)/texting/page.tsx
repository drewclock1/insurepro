import { createServerSupabaseClient } from '@/lib/supabase-server'
import TextingClient from './TextingClient'

export default async function TextingPage({ searchParams }: { searchParams: { lead?: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Get all conversations (leads with at least one text)
  const { data: conversations } = await supabase
    .from('leads')
    .select(`
      id, first_name, last_name, phone, stage, lead_score, product_interest,
      texts(id, body, direction, is_ai_generated, status, sent_at)
    `)
    .eq('assigned_to', user!.id)
    .not('texts', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(50)

  // Count how many need rep reply
  const needsReply = conversations?.filter(c =>
    c.texts?.some((t: any) => t.direction === 'inbound' && t.status === 'delivered')
  ).length ?? 0

  // Pre-select a lead if passed via query param
  const initialLeadId = searchParams.lead ?? conversations?.[0]?.id ?? null

  return (
    <TextingClient
      profile={profile}
      conversations={conversations ?? []}
      needsReply={needsReply}
      initialLeadId={initialLeadId}
    />
  )
}
