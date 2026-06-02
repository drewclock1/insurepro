import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendMetaEvent } from '../webhook/route'

// Map our internal events to Meta standard events
const EVENT_MAP: Record<string, string> = {
  'appointment_set':     'Schedule',       // Rep set an appointment
  'applied':             'SubmitApplication', // Policy application submitted
  'sold':                'Purchase',          // Policy issued / sold
  'presented':           'ViewContent',       // Presentation happened
  'quoted':              'CustomizeProduct',  // Quote given
}

// Called automatically when lead stage changes or call disposition is logged
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId, internalEvent, value } = await req.json()
  const metaEventName = EVENT_MAP[internalEvent]
  if (!metaEventName) return NextResponse.json({ skipped: true, reason: 'No Meta mapping for this event' })

  // Get lead + agency Meta config
  const { data: lead } = await supabase
    .from('leads')
    .select('*, profiles!leads_agency_id_fkey(id)')
    .eq('id', leadId)
    .single()

  if (!lead?.meta_campaign_id && !lead?.meta_lead_id) {
    return NextResponse.json({ skipped: true, reason: 'Lead not from Meta' })
  }

  const { data: config } = await supabase
    .from('meta_configs')
    .select('pixel_id, capi_access_token')
    .eq('agency_id', lead.agency_id)
    .eq('active', true)
    .single()

  if (!config?.pixel_id || !config?.capi_access_token) {
    return NextResponse.json({ skipped: true, reason: 'No Meta pixel configured' })
  }

  const serviceSupabase = (await import('@/lib/supabase-server')).createServiceRoleClient()

  const result = await sendMetaEvent({
    pixelId: config.pixel_id,
    accessToken: config.capi_access_token,
    agencyId: lead.agency_id,
    leadId: lead.id,
    eventName: metaEventName,
    email: lead.email,
    phone: lead.phone,
    value: internalEvent === 'sold' ? (value ?? lead.annual_income ? lead.annual_income * 0.04 : undefined) : undefined,
    supabase: serviceSupabase,
  })

  return NextResponse.json({ sent: true, event: metaEventName, result })
}
