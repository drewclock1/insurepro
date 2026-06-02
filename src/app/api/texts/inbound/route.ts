import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

// Twilio calls this when a lead texts back
// Must respond quickly (< 15s) — defer heavy work async
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const from    = body.get('From') as string
  const to      = body.get('To')   as string
  const msgBody = body.get('Body') as string
  const msgSid  = body.get('MessageSid') as string

  // Always reply 200 to Twilio immediately to avoid retry storms
  const emptyTwiML = '<?xml version="1.0"?><Response/>'

  // Process async
  processInbound({ from, to, msgBody, msgSid }).catch(console.error)

  return new NextResponse(emptyTwiML, { headers: { 'Content-Type': 'text/xml' } })
}

async function processInbound({ from, to, msgBody, msgSid }: {
  from: string; to: string; msgBody: string; msgSid: string
}) {
  const supabase = createServiceRoleClient()

  // Normalize phone — try multiple formats
  const cleaned = from.replace(/\D/g, '')
  const { data: lead } = await supabase
    .from('leads')
    .select('*, profiles!leads_assigned_to_fkey(id, full_name, agency_id, twilio_number)')
    .or(`phone.eq.${from},phone.eq.+${cleaned},phone.eq.${cleaned.slice(-10)}`)
    .maybeSingle()

  if (!lead) {
    console.warn('Inbound SMS from unknown number:', from)
    return
  }

  const profile = lead.profiles as any

  // Log inbound message
  await supabase.from('texts').insert({
    agency_id: profile?.agency_id,
    rep_id: profile?.id,
    lead_id: lead.id,
    twilio_message_sid: msgSid,
    direction: 'inbound',
    from_number: from,
    to_number: to,
    body: msgBody,
    status: 'delivered',
    is_ai_generated: false,
    sent_at: new Date().toISOString(),
  })

  // Opt-out handling
  const optOut = ['stop', 'unsubscribe', 'quit', 'cancel', 'optout'].some(k => msgBody.toLowerCase().trim() === k)
  if (optOut) {
    await supabase.from('leads').update({ tags: ['opted_out'] }).eq('id', lead.id)
    return
  }

  // High-intent detection — flag for rep takeover (don't auto-reply)
  const hotKeywords = ['yes', 'interested', 'call me', 'when can', 'how much', 'price', 'cost', 'schedule', 'available', 'appointment', 'quote']
  const isHot = hotKeywords.some(k => msgBody.toLowerCase().includes(k))

  if (isHot) {
    // Mark this conversation as needing rep attention — real-time subscription will notify rep
    await supabase.from('texts').insert({
      agency_id: profile?.agency_id,
      rep_id: profile?.id,
      lead_id: lead.id,
      direction: 'inbound',
      body: `🔥 HOT REPLY FLAGGED: "${msgBody}" — take over this conversation`,
      status: 'delivered',
      is_ai_generated: false,
      sent_at: new Date().toISOString(),
    })
    // Don't auto-reply — let rep handle it
    return
  }

  // Auto-reply with GPT-4 if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    console.log('[DEV] OpenAI not configured — skipping AI reply')
    return
  }

  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Get recent conversation history
    const { data: history } = await supabase
      .from('texts')
      .select('direction, body')
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: true })
      .limit(10)

    const messages: any[] = [
      {
        role: 'system',
        content: `You are ${profile?.full_name ?? 'Alex'}, a friendly life insurance agent.
Goal: qualify the lead and set a 15-minute call.
Rules:
- Keep it SHORT (1-3 sentences max)
- Sound like a real human — warm, casual, never robotic
- Never mention AI or scripts
- If they ask price/cost: "It depends on your situation — can I call you for 10 min to go over options?"
- If they want info: ask one qualifying question instead of dumping info
- Lead: ${lead.first_name}, interested in ${lead.product_interest ?? 'life insurance'}`,
      },
      ...(history ?? []).slice(-6).map(m => ({
        role: m.direction === 'outbound' ? 'assistant' : 'user',
        content: m.body,
      })),
      { role: 'user', content: msgBody },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // faster + cheaper for texting
      messages,
      max_tokens: 100,
      temperature: 0.85,
    })

    const aiReply = completion.choices[0]?.message?.content?.trim()
    if (!aiReply) return

    // Send via Twilio
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const toNumber = lead.phone.startsWith('+') ? lead.phone : `+1${lead.phone.replace(/\D/g, '')}`

    const sent = await client.messages.create({ body: aiReply, from: to, to: toNumber })

    await supabase.from('texts').insert({
      agency_id: profile?.agency_id,
      rep_id: profile?.id,
      lead_id: lead.id,
      twilio_message_sid: sent.sid,
      direction: 'outbound',
      from_number: to,
      to_number: lead.phone,
      body: aiReply,
      status: 'sent',
      is_ai_generated: true,
      sent_at: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('AI reply failed:', err.message)
  }
}
