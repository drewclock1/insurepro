import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId, message, sequenceId, sequenceStep, isAi = false } = await req.json()

  if (!leadId || !message?.trim()) {
    return NextResponse.json({ error: 'leadId and message required' }, { status: 400 })
  }

  // Get lead + rep profile
  const [{ data: lead }, { data: profile }] = await Promise.all([
    supabase.from('leads').select('phone, first_name, last_name').eq('id', leadId).single(),
    supabase.from('profiles').select('id, agency_id, twilio_number, full_name').eq('id', user.id).single(),
  ])

  if (!lead?.phone) {
    return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })
  }

  const fromNumber = profile?.twilio_number ?? process.env.TWILIO_PHONE_NUMBER
  if (!fromNumber) {
    return NextResponse.json({ error: 'No Twilio number configured. Assign one in Admin → Rep Management.' }, { status: 400 })
  }

  let twilioSid: string | null = null
  let sendError: string | null = null

  // Try to send via Twilio (only if creds are configured)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = await import('twilio')
      const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      const toNumber = lead.phone.startsWith('+') ? lead.phone : `+1${lead.phone.replace(/\D/g, '')}`
      const msg = await client.messages.create({ body: message, from: fromNumber, to: toNumber })
      twilioSid = msg.sid
    } catch (err: any) {
      sendError = err.message
      console.error('Twilio send error:', err.message)
    }
  } else {
    // Dev mode — no Twilio creds, still log the message
    console.log('[DEV] Would send SMS:', { from: fromNumber, to: lead.phone, body: message })
    twilioSid = `dev-${Date.now()}`
  }

  // Always log to DB regardless of Twilio status
  const { data: textRecord, error: dbError } = await supabase.from('texts').insert({
    agency_id: profile?.agency_id,
    rep_id: user.id,
    lead_id: leadId,
    twilio_message_sid: twilioSid,
    direction: 'outbound',
    from_number: fromNumber,
    to_number: lead.phone,
    body: message,
    status: sendError ? 'error' : 'sent',
    is_ai_generated: isAi,
    sequence_id: sequenceId ?? null,
    sequence_step: sequenceStep ?? null,
    sent_at: new Date().toISOString(),
  }).select().single()

  if (dbError) {
    return NextResponse.json({ error: 'DB error: ' + dbError.message }, { status: 500 })
  }

  // Update lead's last contacted timestamp
  await supabase.from('leads').update({ last_contacted: new Date().toISOString() }).eq('id', leadId)

  if (sendError) {
    return NextResponse.json({
      ok: false,
      logged: true,
      text: textRecord,
      error: sendError,
      note: 'Message logged but not delivered — check Twilio configuration',
    })
  }

  return NextResponse.json({ ok: true, text: textRecord })
}
