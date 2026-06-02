import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Generate a Twilio Access Token for the browser dialer (Twilio Client JS)
export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!
  const apiKeySid = process.env.TWILIO_API_KEY_SID!
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!

  const AccessToken = twilio.jwt.AccessToken
  const VoiceGrant = AccessToken.VoiceGrant

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  })

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: user.id,
    ttl: 3600,
  })
  token.addGrant(voiceGrant)

  return NextResponse.json({ token: token.toJwt(), identity: user.id })
}
