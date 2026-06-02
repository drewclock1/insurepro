import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import crypto from 'crypto'

const APP_SECRET = process.env.META_APP_SECRET!

// ── GET: Facebook webhook verification (one-time setup) ──────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe') {
    return new NextResponse('Invalid mode', { status: 400 })
  }

  // Verify against any agency's verify token
  const supabase = createServiceRoleClient()
  const { data: config } = await supabase
    .from('meta_configs')
    .select('id')
    .eq('verify_token', token)
    .single()

  if (!config) {
    return new NextResponse('Verification failed', { status: 403 })
  }

  // Echo challenge back to Facebook
  return new NextResponse(challenge, { status: 200 })
}

// ── POST: Receive lead events from Facebook ───────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify request signature from Facebook
  const signature = req.headers.get('x-hub-signature-256')
  if (APP_SECRET && signature) {
    const expectedSig = 'sha256=' + crypto
      .createHmac('sha256', APP_SECRET)
      .update(body)
      .digest('hex')
    if (signature !== expectedSig) {
      console.error('Invalid Meta webhook signature')
      return new NextResponse('Invalid signature', { status: 401 })
    }
  }

  const payload = JSON.parse(body)
  const supabase = createServiceRoleClient()

  // Facebook can send multiple entries in one request
  for (const entry of payload.entry ?? []) {
    const pageId = entry.id

    // Find agency config for this page
    const { data: config } = await supabase
      .from('meta_configs')
      .select('*, agencies(id)')
      .eq('page_id', pageId)
      .eq('active', true)
      .single()

    if (!config) {
      console.warn(`No Meta config found for page ${pageId}`)
      continue
    }

    // Process lead gen changes
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue

      const { leadgen_id, form_id, ad_id, adgroup_id, campaign_id, page_id } = change.value

      // Fetch full lead data from Facebook Graph API
      let leadData: Record<string, string> = {}
      let campaignName = ''
      let adsetName = ''
      let adName = ''

      try {
        const leadRes = await fetch(
          `https://graph.facebook.com/v19.0/${leadgen_id}?access_token=${config.access_token}`
        )
        const leadJson = await leadRes.json()

        // Parse field_data array into key-value pairs
        for (const field of leadJson.field_data ?? []) {
          leadData[field.name] = field.values?.[0] ?? ''
        }

        // Fetch campaign/adset names for context
        const [campRes, adsetRes] = await Promise.all([
          campaign_id ? fetch(`https://graph.facebook.com/v19.0/${campaign_id}?fields=name&access_token=${config.access_token}`) : null,
          adgroup_id ? fetch(`https://graph.facebook.com/v19.0/${adgroup_id}?fields=name&access_token=${config.access_token}`) : null,
        ])
        if (campRes?.ok) { const d = await campRes.json(); campaignName = d.name ?? '' }
        if (adsetRes?.ok) { const d = await adsetRes.json(); adsetName = d.name ?? '' }

      } catch (err) {
        console.error('Failed to fetch lead data from Facebook:', err)
        continue
      }

      // Map Facebook field names to our schema
      // Facebook forms can use any field name — we handle common patterns
      const firstName = leadData['first_name'] ?? leadData['name']?.split(' ')[0] ?? ''
      const lastName  = leadData['last_name']  ?? leadData['name']?.split(' ').slice(1).join(' ') ?? ''
      const phone     = leadData['phone_number'] ?? leadData['phone'] ?? leadData['mobile'] ?? ''
      const email     = leadData['email'] ?? leadData['email_address'] ?? ''
      const state     = leadData['state'] ?? leadData['province'] ?? ''
      const zip       = leadData['zip_code'] ?? leadData['postal_code'] ?? ''
      const dob       = leadData['date_of_birth'] ?? ''

      // Skip duplicates
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('meta_lead_id', leadgen_id)

      if ((count ?? 0) > 0) {
        console.log(`Lead ${leadgen_id} already exists — skipping`)
        continue
      }

      // ── Route the lead ──────────────────────────────────────────────
      const assignedRep = await routeLead({
        agencyId: config.agency_id,
        formId: form_id,
        campaignId: campaign_id,
        adsetId: adgroup_id,
        pageId: page_id,
        source: 'facebook',
        supabase,
      })

      // ── Create the lead ─────────────────────────────────────────────
      const { data: lead, error: leadError } = await supabase.from('leads').insert({
        agency_id:          config.agency_id,
        assigned_to:        assignedRep?.repId ?? null,
        first_name:         firstName,
        last_name:          lastName,
        phone,
        email,
        state,
        zip,
        date_of_birth:      dob || null,
        source:             'facebook',
        product_interest:   'Life Insurance',   // default — override per form/campaign
        stage:              'new',
        lead_score:         0,

        // Meta tracking fields
        meta_lead_id:       leadgen_id,
        meta_form_id:       form_id,
        meta_campaign_id:   campaign_id,
        meta_campaign_name: campaignName,
        meta_adset_id:      adgroup_id,
        meta_adset_name:    adsetName,
        meta_ad_id:         ad_id,
        meta_page_id:       page_id,
        raw_meta_payload:   change.value,
      }).select().single()

      if (leadError || !lead) {
        console.error('Failed to create lead:', leadError)
        continue
      }

      console.log(`✅ Meta lead created: ${lead.id} — ${firstName} ${lastName} from campaign "${campaignName}"`)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL!

      // ── Fire parallel: AI score + sequence + Meta CAPI lead event ──
      await Promise.allSettled([
        // AI score
        fetch(`${appUrl}/api/leads/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id }),
        }),

        // Trigger the routing rule's sequence (or default new_lead sequence)
        fetch(`${appUrl}/api/automations/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
          body: JSON.stringify({
            trigger: 'new_lead',
            leadId: lead.id,
            agencyId: config.agency_id,
            metadata: { sequenceId: assignedRep?.sequenceId },
          }),
        }),

        // Send "Lead" event back to Meta CAPI
        config.pixel_id && config.capi_access_token
          ? sendMetaEvent({
              pixelId: config.pixel_id,
              accessToken: config.capi_access_token,
              agencyId: config.agency_id,
              leadId: lead.id,
              eventName: 'Lead',
              email,
              phone,
              supabase,
            })
          : Promise.resolve(),
      ])

      // Update routing stats
      if (assignedRep?.ruleId) {
        await supabase.from('routing_rules')
          .update({ leads_routed: (assignedRep?.ruleId ? 1 : 0), last_routed_at: new Date().toISOString() })
          .eq('id', assignedRep.ruleId)
      }
    }
  }

  // Always respond 200 quickly — Facebook retries if you don't
  return NextResponse.json({ ok: true })
}


// ── ROUTING ENGINE ────────────────────────────────────────────────────
interface RouteLeadParams {
  agencyId: string
  formId?: string
  campaignId?: string
  adsetId?: string
  pageId?: string
  source?: string
  supabase: any
}

interface RouteResult {
  repId: string | null
  ruleId: string | null
  sequenceId: string | null
}

async function routeLead(params: RouteLeadParams): Promise<RouteResult> {
  const { agencyId, formId, campaignId, adsetId, pageId, source, supabase } = params

  // Find matching rules in priority order
  const { data: rules } = await supabase
    .from('routing_rules')
    .select('*, routing_state(*)')
    .eq('agency_id', agencyId)
    .eq('active', true)
    .order('priority', { ascending: false })

  for (const rule of rules ?? []) {
    // Check if this rule matches
    if (rule.meta_form_id     && rule.meta_form_id     !== formId)     continue
    if (rule.meta_campaign_id && rule.meta_campaign_id !== campaignId) continue
    if (rule.meta_adset_id    && rule.meta_adset_id    !== adsetId)    continue
    if (rule.page_id          && rule.page_id          !== pageId)     continue
    if (rule.source           && rule.source           !== source)      continue

    // Rule matched — apply routing strategy
    let repId: string | null = null

    if (rule.strategy === 'direct') {
      repId = rule.direct_rep_id

    } else if (rule.strategy === 'round_robin') {
      const pool: string[] = rule.rep_ids ?? []
      if (pool.length === 0) continue
      const state = rule.routing_state?.[0]
      const nextIdx = (state?.next_rep_index ?? 0) % pool.length
      repId = pool[nextIdx]
      // Advance pointer
      await supabase.from('routing_state').upsert({
        rule_id: rule.id,
        next_rep_index: (nextIdx + 1) % pool.length,
        updated_at: new Date().toISOString(),
      })

    } else if (rule.strategy === 'least_loaded') {
      // Find rep in pool with fewest leads today
      const today = new Date().toISOString().split('T')[0]
      const pool: string[] = rule.rep_ids ?? []
      const { data: todayCounts } = await supabase
        .from('leads')
        .select('assigned_to')
        .in('assigned_to', pool)
        .gte('created_at', today)
      const countMap: Record<string, number> = {}
      pool.forEach(id => { countMap[id] = 0 })
      todayCounts?.forEach((r: any) => { countMap[r.assigned_to] = (countMap[r.assigned_to] ?? 0) + 1 })
      repId = Object.entries(countMap).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null

    } else if (rule.strategy === 'cap_based') {
      const pool: string[] = rule.rep_ids ?? []
      const cap = rule.daily_cap ?? 50
      const today = new Date().toISOString().split('T')[0]
      for (const id of pool) {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', id)
          .gte('created_at', today)
        if ((count ?? 0) < cap) { repId = id; break }
      }
    }

    return {
      repId,
      ruleId: rule.id,
      sequenceId: rule.auto_sequence_id ?? null,
    }
  }

  // No rule matched — return null (lead sits unassigned)
  return { repId: null, ruleId: null, sequenceId: null }
}


// ── META CONVERSIONS API ──────────────────────────────────────────────
interface MetaEventParams {
  pixelId: string
  accessToken: string
  agencyId: string
  leadId: string
  eventName: string
  email?: string
  phone?: string
  value?: number
  supabase: any
}

export async function sendMetaEvent(params: MetaEventParams) {
  const { pixelId, accessToken, agencyId, leadId, eventName, email, phone, value, supabase } = params
  const eventId = `${leadId}-${eventName}-${Date.now()}`

  // Hash PII for Meta (they require SHA256)
  const hashEmail = email ? crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex') : null
  const hashPhone = phone ? crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex') : null

  const event: any = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'crm',
    user_data: {
      ...(hashEmail && { em: [hashEmail] }),
      ...(hashPhone && { ph: [hashPhone] }),
    },
  }

  if (value) {
    event.custom_data = { value, currency: 'USD' }
  }

  // Log the event to DB first
  await supabase.from('meta_events').insert({
    agency_id: agencyId,
    lead_id: leadId,
    event_name: eventName,
    event_id: eventId,
    pixel_id: pixelId,
    value: value ?? null,
    sent: false,
  })

  // Send to Meta
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event] }),
    }
  )

  const metaResponse = await res.json()

  // Update log
  await supabase.from('meta_events')
    .update({ sent: true, meta_response: metaResponse })
    .eq('event_id', eventId)

  if (!res.ok) {
    console.error('Meta CAPI error:', metaResponse)
  }

  return metaResponse
}
