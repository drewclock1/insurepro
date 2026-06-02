import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import twilio from 'twilio'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type TriggerEvent =
  | 'new_lead'
  | 'no_contact_72h'
  | 'appointment_scheduled'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_1h'
  | 'lead_stage_changed'
  | 'new_recruit'

interface TriggerPayload {
  trigger: TriggerEvent
  leadId?: string
  recruitId?: string
  agencyId: string
  metadata?: Record<string, any>
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: TriggerPayload = await req.json()
  const supabase = createServiceRoleClient()
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  // Find active sequences that match this trigger
  const { data: sequences } = await supabase
    .from('text_sequences')
    .select('*, text_sequence_steps(*)')
    .eq('agency_id', payload.agencyId)
    .eq('trigger', payload.trigger)
    .eq('active', true)

  if (!sequences?.length) return NextResponse.json({ triggered: 0 })

  let triggered = 0

  for (const seq of sequences) {
    const steps = (seq.text_sequence_steps ?? []).sort((a: any, b: any) => a.step_number - b.step_number)
    const step1 = steps[0]
    if (!step1) continue

    // Get lead/recruit data
    let entity: any = null
    let phone: string | null = null
    let repProfile: any = null

    if (payload.leadId) {
      const { data } = await supabase
        .from('leads')
        .select('*, profiles!leads_assigned_to_fkey(id,full_name,twilio_number,agency_id)')
        .eq('id', payload.leadId)
        .single()
      entity = data
      phone = data?.phone
      repProfile = data?.profiles
    } else if (payload.recruitId) {
      const { data } = await supabase
        .from('recruits')
        .select('*, profiles!recruits_recruited_by_fkey(id,full_name,twilio_number,agency_id)')
        .eq('id', payload.recruitId)
        .single()
      entity = data
      phone = data?.phone
      repProfile = data?.profiles
    }

    if (!phone || !entity) continue

    // Check this entity isn't already enrolled
    const existingField = payload.leadId ? 'lead_id' : 'recruit_id'
    const { count } = await supabase
      .from('texts')
      .select('id', { count: 'exact', head: true })
      .eq('sequence_id', seq.id)
      .eq(existingField, payload.leadId ?? payload.recruitId)

    if ((count ?? 0) > 0) continue  // Already enrolled

    // Personalize step 1 message
    let messageBody = step1.message_template
      .replace(/\{\{first_name\}\}/g, entity.first_name ?? 'there')
      .replace(/\{\{agent_name\}\}/g, repProfile?.full_name ?? 'Alex')
      .replace(/\{\{product\}\}/g, entity.product_interest ?? 'insurance')

    if (step1.ai_personalize) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{
            role: 'system',
            content: 'Rewrite this SMS to sound natural, warm, and human. Keep under 160 chars. Same intent.',
          }, {
            role: 'user',
            content: `Person: ${entity.first_name}, ${entity.product_interest ?? 'insurance lead'}. Message: ${messageBody}`,
          }],
          max_tokens: 100,
        })
        messageBody = completion.choices[0]?.message?.content?.trim() ?? messageBody
      } catch { /* use template */ }
    }

    const fromNum = repProfile?.twilio_number ?? process.env.TWILIO_PHONE_NUMBER!
    const toNum = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`

    try {
      const msg = await twilioClient.messages.create({
        body: messageBody,
        from: fromNum,
        to: toNum,
      })

      await supabase.from('texts').insert({
        agency_id: payload.agencyId,
        rep_id: repProfile?.id,
        lead_id: payload.leadId ?? null,
        twilio_message_sid: msg.sid,
        direction: 'outbound',
        from_number: fromNum,
        to_number: phone,
        body: messageBody,
        status: 'sent',
        is_ai_generated: step1.ai_personalize,
        sequence_id: seq.id,
        sequence_step: 1,
        sent_at: new Date().toISOString(),
      })
      triggered++
    } catch (err) {
      console.error('Failed to send sequence text:', err)
    }
  }

  return NextResponse.json({ triggered, trigger: payload.trigger })
}
