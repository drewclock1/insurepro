import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServiceRoleClient } from '@/lib/supabase-server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Score a single lead — called on lead creation or by cron for batch scoring
export async function POST(req: NextRequest) {
  const { leadId } = await req.json()
  const supabase = createServiceRoleClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{
      role: 'system',
      content: `You are an insurance lead scoring expert. Score leads 0-100 based on their likelihood to purchase.

Scoring factors:
- Product interest specificity (life > health > auto = higher urgency)
- Source quality (referral=90+, facebook=60-80, google=70-85, cold=40-60)
- Recency (same-day = +20, this week = +10)
- Geographic factors (some states have higher close rates)
- Income signals if available

Return ONLY a JSON object: { "score": <number 0-100>, "reason": "<10 words max>" }`
    }, {
      role: 'user',
      content: JSON.stringify({
        first_name: lead.first_name,
        product_interest: lead.product_interest,
        source: lead.source,
        state: lead.state,
        annual_income: lead.annual_income,
        created_at: lead.created_at,
        stage: lead.stage,
      })
    }],
    max_tokens: 80,
    response_format: { type: 'json_object' },
  })

  let score = 50
  let reason = 'Default score'

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    score = Math.min(100, Math.max(0, Math.round(parsed.score)))
    reason = parsed.reason ?? reason
  } catch { /* use defaults */ }

  await supabase.from('leads')
    .update({ lead_score: score })
    .eq('id', leadId)

  return NextResponse.json({ score, reason })
}

// GET — batch score all unscored leads for an agency
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agencyId = searchParams.get('agency_id')
  if (!agencyId) return NextResponse.json({ error: 'agency_id required' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: unscoredLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('lead_score', 0)
    .limit(50)

  let scored = 0
  for (const lead of unscoredLeads ?? []) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/leads/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      })
      scored++
    } catch { /* continue */ }
  }

  return NextResponse.json({ scored })
}
