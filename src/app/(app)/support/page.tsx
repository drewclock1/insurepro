'use client'

import { useState } from 'react'
import { Phone, MessageSquare, BookOpen, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  { q: 'How do I connect Facebook Lead Ads?', a: 'Go to Meta / Facebook in the sidebar. Enter your Page ID and Page Access Token. Copy the Webhook URL shown, then set it in developers.facebook.com → Webhooks → Subscribe to "leadgen" on your page. Leads flow in within seconds of form submission.' },
  { q: 'How do I assign a Twilio number to a rep?', a: 'Go to Admin → select the rep → enter their Twilio DID in "Assigned Twilio Number". All texts and calls for that rep use that number, and inbound replies route back automatically.' },
  { q: 'Why is my dialer showing Connection Error?', a: 'Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, and TWILIO_TWIML_APP_SID are all set in your .env. Also verify your TwiML App Voice URL is /api/calls/twiml.' },
  { q: 'How does the AI texting bot work?', a: 'When a lead arrives, the bot sends the first sequence text immediately. GPT-4 responds to replies as your agent. If a reply contains high-intent keywords (yes, interested, call me, price), the bot flags it and notifies you to take over. Toggle AI per conversation in the Texting page.' },
  { q: 'How do I sync Google Sheets?', a: 'Settings → Google Sheets. Add your Spreadsheet ID, sheet name, and direction. Share the sheet with the service account email in your .env. Syncs run every 15 min automatically.' },
  { q: 'How do routing rules work?', a: 'Meta / Facebook → Lead Routing. Create a rule with a strategy and optional match criteria (campaign ID, form ID). Rules checked by priority — first match assigns the lead. No match = lead lands unassigned.' },
  { q: 'What do Meta CAPI events do?', a: 'When reps log appointment_set, applied, or sold on a Meta lead, those events fire back to Facebook as Schedule, SubmitApplication, or Purchase. Meta learns what a real close looks like and optimizes your ads for buyers, not just form fills. CPL drops over time.' },
]

export default function SupportPage() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support & Tools 🛠</h1>
        <p className="text-sm text-gray-500 mt-0.5">Get help, find answers, and access setup guides</p>
      </div>

      <div className="bg-gray-900 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-300 mb-3">Required Environment Variables</h2>
        <div className="space-y-1 font-mono text-xs">
          {[
            ['NEXT_PUBLIC_SUPABASE_URL','Supabase → Settings → API'],
            ['NEXT_PUBLIC_SUPABASE_ANON_KEY','Supabase → Settings → API'],
            ['SUPABASE_SERVICE_ROLE_KEY','Supabase → Settings → API (secret)'],
            ['OPENAI_API_KEY','platform.openai.com'],
            ['TWILIO_ACCOUNT_SID','console.twilio.com'],
            ['TWILIO_AUTH_TOKEN','console.twilio.com'],
            ['TWILIO_PHONE_NUMBER','+15551234567 format'],
            ['TWILIO_TWIML_APP_SID','Voice TwiML App SID'],
            ['TWILIO_API_KEY_SID','Twilio → Account → API Keys'],
            ['TWILIO_API_KEY_SECRET','Twilio → Account → API Keys'],
            ['NEXT_PUBLIC_APP_URL','Your Vercel URL'],
            ['CRON_SECRET','Any random 32-char string'],
            ['META_APP_SECRET','Meta App → Settings → Basic'],
          ].map(([key, hint]) => (
            <div key={key} className="flex gap-3">
              <span className="text-emerald-400 w-56 flex-shrink-0">{key}</span>
              <span className="text-gray-500"># {hint}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">FAQ</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50">
                <span className="text-sm font-semibold text-gray-800 pr-4">{faq.q}</span>
                {open === i ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
              </button>
              {open === i && <div className="px-5 pb-4"><p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
