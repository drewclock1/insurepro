import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { callId, leadId, disposition, notes } = await req.json()

  // Update call disposition
  if (callId) {
    await supabase.from('calls').update({ disposition, notes }).eq('id', callId)
  }

  // Update lead last contacted
  await supabase.from('leads').update({
    last_contacted: new Date().toISOString(),
    ...(disposition === 'appointment_set' && { stage: 'appointment' }),
    ...(disposition === 'sold' && { stage: 'issued' }),
  }).eq('id', leadId)

  // Auto-increment activity counter
  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  await supabase.rpc('increment_activity', {
    p_rep_id: user.id,
    p_agency_id: profile?.agency_id,
    p_field: 'dials',
  })
  if (['appointment_set', 'sold'].includes(disposition)) {
    await supabase.rpc('increment_activity', {
      p_rep_id: user.id,
      p_agency_id: profile?.agency_id,
      p_field: disposition === 'sold' ? 'closes' : 'appointments',
    })
  }

  // Fire Meta CAPI event for key dispositions (appointment, sold)
  const metaTriggered = ['appointment_set', 'sold', 'applied']
  if (metaTriggered.includes(disposition)) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meta/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, internalEvent: disposition }),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
