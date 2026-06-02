import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import OpenAI from 'openai'
import twilio from 'twilio'

// Called by a cron job (Vercel cron or Supabase pg_cron) to process pending sequence steps
export async function POST(req: NextRequest) {
  // Verify internal secret
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  // Get all active sequences
  const { data: sequences } = await supabase
    .from('text_sequences')
    .select('*, text_sequence_steps(*)')
    .eq('active', true)

  if (!sequences) return NextResponse.json({ processed: 0 })

  let processed = 0

  for (const seq of sequences) {
    const steps = seq.text_sequence_steps?.sort((a: any, b: any) => a.step_number - b.step_number) ?? []

    // Find leads enrolled in this sequence — get last text sent for this sequence
    const { data: enrolledLeads } = await supabase
      .from('texts')
      .select('lead_id, sequence_step, sent_at')
      .eq('sequence_id', seq.id)
      .eq('direction', 'outbound')
      .order('sent_at', { ascending: false })

    // Group by lead, get their latest step
    const leadLastStep = enrolledLeads?.reduce((acc: any, t) => {
      if (!acc[t.lead_id] || acc[t.lead_id].step < t.sequence_step) {
        acc[t.lead_id] = { step: t.sequence_step, sent_at: t.sent_at }
      }
      return acc
    }, {}) ?? {}

    // Find leads that match the trigger and haven't started the sequence
    const { data: newLeads } = await supabase
      .from('leads')
      .select('*, profiles(id,full_name,agency_id,twilio_number)')
      .eq('stage', 'new')
      .not('id', 'in', `(${Object.keys(leadLastStep).join(',') || "''"})`)

    // Process each lead's next step
    for (const [leadId, lastStep] of Object.entries(leadLastStep)) {
      const ls = lastStep as any
      const nextStepNum = ls.step + 1
      const nextStep = steps.find((s: any) => s.step_number === nextStepNum)
      if (!nextStep) continue

      const minutesSinceLast = (Date.now() - new Date(ls.sent_at).getTime()) / 60000
      if (minutesSinceLast < nextStep.delay_minutes) continue

      // Check if lead opted out or replied with high intent
      const { data: lead } = await supabase.from('leads').select('*, profiles(full_name,twilio_number,agency_id)').eq('id', leadId).single()
      if (!lead?.phone) continue
      if (lead.tags?.includes('opted_out')) continue

      let messageBody = nextStep.message_template
        .replace(/\{\{first_name\}\}/g, lead.first_name)
        .replace(/\{\{agent_name\}\}/g, lead.profiles?.full_name ?? 'Alex')

      // AI personalization
      if (nextStep.ai_personalize) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{
              role: 'system',
              content: 'Rewrite this text message to sound more natural and personalized. Keep the same intent but make it sound human. Under 160 chars.',
            }, {
              role: 'user',
              content: `Lead: ${lead.first_name}, interested in ${lead.product_interest ?? 'insurance'}. Template: ${messageBody}`,
            }],
            max_tokens: 100,
          })
          messageBody = completion.choices[0]?.message?.content?.trim() ?? messageBody
        } catch { /* use template as fallback */ }
      }

      // Send
      const fromNum = lead.profiles?.twilio_number ?? process.env.TWILIO_PHONE_NUMBER!
      const sentMsg = await twilioClient.messages.create({
        body: messageBody,
        from: fromNum,
        to: lead.phone.startsWith('+') ? lead.phone : `+1${lead.phone.replace(/\D/g,'')}`,
      })

      await supabase.from('texts').insert({
        agency_id: lead.profiles?.agency_id,
        rep_id: lead.profiles?.id,
        lead_id: leadId,
        twilio_message_sid: sentMsg.sid,
        direction: 'outbound',
        from_number: fromNum,
        to_number: lead.phone,
        body: messageBody,
        status: 'sent',
        is_ai_generated: nextStep.ai_personalize,
        sequence_id: seq.id,
        sequence_step: nextStepNum,
        sent_at: new Date().toISOString(),
      })
      processed++
    }

    // Enroll new leads in step 1
    for (const lead of newLeads ?? []) {
      const step1 = steps.find((s: any) => s.step_number === 1)
      if (!step1 || !lead.phone) continue

      let messageBody = step1.message_template
        .replace(/\{\{first_name\}\}/g, lead.first_name)
        .replace(/\{\{agent_name\}\}/g, lead.profiles?.full_name ?? 'Alex')

      const fromNum = lead.profiles?.twilio_number ?? process.env.TWILIO_PHONE_NUMBER!
      const sentMsg = await twilioClient.messages.create({
        body: messageBody,
        from: fromNum,
        to: lead.phone.startsWith('+') ? lead.phone : `+1${lead.phone.replace(/\D/g,'')}`,
      })

      await supabase.from('texts').insert({
        agency_id: lead.profiles?.agency_id,
        rep_id: lead.profiles?.id,
        lead_id: lead.id,
        twilio_message_sid: sentMsg.sid,
        direction: 'outbound',
        from_number: fromNum,
        to_number: lead.phone,
        body: messageBody,
        status: 'sent',
        is_ai_generated: step1.ai_personalize,
        sequence_id: seq.id,
        sequence_step: 1,
        sent_at: new Date().toISOString(),
      })
      processed++
    }
  }

  return NextResponse.json({ processed, timestamp: new Date().toISOString() })
}
