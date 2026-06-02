import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { leadId, scheduledAt, durationMinutes = 60, location, notes, title } = body

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  const { data: lead } = await supabase.from('leads').select('first_name, last_name').eq('id', leadId).single()

  const { data: appt, error } = await supabase.from('appointments').insert({
    agency_id: profile?.agency_id,
    rep_id: user.id,
    lead_id: leadId,
    title: title ?? `${lead?.first_name} ${lead?.last_name} - Appointment`,
    scheduled_at: scheduledAt,
    duration_minutes: durationMinutes,
    location: location ?? 'Phone',
    notes,
    status: 'scheduled',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update lead stage to 'appointment'
  await supabase.from('leads').update({
    stage: 'appointment',
    next_followup: scheduledAt,
  }).eq('id', leadId)

  // Increment rep's appointment activity counter
  await supabase.rpc('increment_activity', {
    p_rep_id: user.id,
    p_agency_id: profile?.agency_id,
    p_field: 'appointments',
  })

  // Fire Meta CAPI event
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meta/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, internalEvent: 'appointment_set' }),
  }).catch(console.error)

  // Fire automation trigger for appointment reminders
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automations/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({
      trigger: 'appointment_scheduled',
      leadId,
      agencyId: profile?.agency_id,
    }),
  }).catch(console.error)

  return NextResponse.json({ appointment: appt })
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { appointmentId, status, notes } = await req.json()

  const { data, error } = await supabase.from('appointments')
    .update({ status, notes })
    .eq('id', appointmentId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointment: data })
}

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const leadId = searchParams.get('lead_id')

  let query = supabase.from('appointments')
    .select('*, leads(first_name, last_name, phone, product_interest)')
    .eq('rep_id', user.id)
    .order('scheduled_at')

  if (leadId) query = query.eq('lead_id', leadId)
  else query = query.gte('scheduled_at', new Date().toISOString())

  const { data } = await query.limit(20)
  return NextResponse.json({ appointments: data ?? [] })
}
