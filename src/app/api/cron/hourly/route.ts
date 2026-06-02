import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

// Vercel Cron: runs every hour
// Handles: appointment reminders, no-contact triggers, sequence advancement
export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.CRON_SECRET}`,
  }

  const results: Record<string, number> = {}

  // 1 — Appointment reminders (24h before)
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const in23h = new Date(Date.now() + 23 * 60 * 60 * 1000)
  const { data: appts24h } = await supabase
    .from('appointments')
    .select('*, leads(id,agency_id)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', in23h.toISOString())
    .lte('scheduled_at', in24h.toISOString())

  for (const appt of appts24h ?? []) {
    await fetch(`${appUrl}/api/automations/trigger`, {
      method: 'POST', headers,
      body: JSON.stringify({
        trigger: 'appointment_reminder_24h',
        leadId: appt.lead_id,
        agencyId: appt.leads?.agency_id,
      }),
    })
  }
  results.appt_reminders_24h = appts24h?.length ?? 0

  // 2 — Appointment reminders (1h before)
  const in1h = new Date(Date.now() + 60 * 60 * 1000)
  const in45m = new Date(Date.now() + 45 * 60 * 1000)
  const { data: appts1h } = await supabase
    .from('appointments')
    .select('*, leads(id,agency_id)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', in45m.toISOString())
    .lte('scheduled_at', in1h.toISOString())

  for (const appt of appts1h ?? []) {
    await fetch(`${appUrl}/api/automations/trigger`, {
      method: 'POST', headers,
      body: JSON.stringify({
        trigger: 'appointment_reminder_1h',
        leadId: appt.lead_id,
        agencyId: appt.leads?.agency_id,
      }),
    })
  }
  results.appt_reminders_1h = appts1h?.length ?? 0

  // 3 — No-contact re-engagement (72h without any activity)
  const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const { data: staleLeads } = await supabase
    .from('leads')
    .select('id,agency_id')
    .in('stage', ['new', 'contacted'])
    .lt('last_contacted', threeDaysAgo)
    .is('next_followup', null)
    .limit(100)

  for (const lead of staleLeads ?? []) {
    await fetch(`${appUrl}/api/automations/trigger`, {
      method: 'POST', headers,
      body: JSON.stringify({
        trigger: 'no_contact_72h',
        leadId: lead.id,
        agencyId: lead.agency_id,
      }),
    })
  }
  results.no_contact_reengaged = staleLeads?.length ?? 0

  // 4 — Advance text sequences
  const seqRes = await fetch(`${appUrl}/api/texts/sequence`, {
    method: 'POST', headers,
  })
  const seqData = await seqRes.json()
  results.sequence_steps_sent = seqData.processed ?? 0

  // 5 — Batch AI score any new unscored leads (last 2hrs)
  const { data: agencies } = await supabase.from('agencies').select('id')
  for (const agency of agencies ?? []) {
    await fetch(`${appUrl}/api/leads/score?agency_id=${agency.id}`)
  }

  return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() })
}
