import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

// TwiML endpoint — Twilio calls this to get instructions for the call
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const to = body.get('To') as string
  const from = body.get('From') as string

  const twiml = new twilio.twiml.VoiceResponse()

  if (to) {
    // Outbound call from browser to lead phone number
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      record: 'record-from-answer',
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/recording`,
    })
    // Clean phone number
    const cleaned = to.replace(/\D/g, '')
    dial.number(cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`)
  } else {
    twiml.say('No destination specified.')
  }

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  })
}
