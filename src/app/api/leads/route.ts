import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST — create a lead and immediately trigger AI scoring + sequence enrollment
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()

  // Create lead
  const { data: lead, error } = await supabase.from('leads').insert({
    ...body,
    agency_id: profile?.agency_id,
    assigned_to: body.assigned_to ?? user.id,
    stage: 'new',
    lead_score: 0,
  }).select().single()

  if (error || !lead) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Fire-and-forget: AI score + enroll in sequence
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  Promise.all([
    fetch(`${appUrl}/api/leads/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    }),
    fetch(`${appUrl}/api/automations/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ trigger: 'new_lead', leadId: lead.id, agencyId: profile?.agency_id }),
    }),
  ]).catch(console.error)

  return NextResponse.json({ lead })
}
