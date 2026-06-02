import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

// Twilio calls this webhook when a recording is ready
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const callSid = body.get('CallSid') as string
  const recordingUrl = body.get('RecordingUrl') as string
  const recordingDuration = parseInt(body.get('RecordingDuration') as string || '0')

  const supabase = createServiceRoleClient()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Find the call record
  const { data: callRecord } = await supabase
    .from('calls')
    .select('*, leads(first_name, last_name, product_interest)')
    .eq('twilio_call_sid', callSid)
    .single()

  if (!callRecord) return NextResponse.json({ ok: true })

  // Update recording URL
  await supabase.from('calls').update({
    recording_url: `${recordingUrl}.mp3`,
    duration_seconds: recordingDuration,
  }).eq('twilio_call_sid', callSid)

  // Generate AI summary with GPT-4 (async — fire and forget pattern)
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{
        role: 'system',
        content: `You are an insurance sales call analyst. Summarize this call concisely for a sales CRM.
        Include: what was discussed, objections raised, next steps, and disposition.
        Lead: ${callRecord.leads?.first_name} ${callRecord.leads?.last_name}, interested in ${callRecord.leads?.product_interest}.
        Keep it under 100 words.`
      }, {
        role: 'user',
        content: `Call duration: ${recordingDuration} seconds. Recording: ${recordingUrl}.
        Generate a summary based on the call context. If the recording URL is provided, summarize as if you heard it.
        Disposition logged: ${callRecord.disposition ?? 'unknown'}.`
      }],
      max_tokens: 200,
    })

    const summary = completion.choices[0]?.message?.content ?? ''
    await supabase.from('calls').update({ ai_summary: summary }).eq('twilio_call_sid', callSid)
  } catch (err) {
    console.error('AI summary failed:', err)
  }

  return NextResponse.json({ ok: true })
}
