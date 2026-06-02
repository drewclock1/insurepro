# InsurePro — Deployment Guide

## What you're deploying
A full-stack SaaS: Next.js 14 + Supabase + Twilio + OpenAI + Google Sheets.
Estimated setup time: **45–90 minutes** following these steps.

---

## Step 1 — Supabase (Database + Auth)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `insurepro-prod`, choose a region close to your users
3. Copy your **Project URL** and **anon key** from Settings → API
4. Copy your **service_role key** (keep this secret)
5. Run migrations:
   - In Supabase Dashboard → SQL Editor → paste and run `supabase/migrations/001_schema.sql`
   - Then paste and run `supabase/migrations/002_seed_sequences.sql`
6. Enable Auth → Email provider is on by default ✓
7. Set Auth → Site URL to your Vercel URL (fill in after step 3)

---

## Step 2 — Twilio (Dialer + SMS)

### Account setup
1. Go to [twilio.com](https://twilio.com) → Create account
2. From the Console, copy:
   - **Account SID** → `TWILIO_ACCOUNT_SID`
   - **Auth Token** → `TWILIO_AUTH_TOKEN`

### Phone number
3. Buy a phone number → US → Voice + SMS capable
4. Copy the number → `TWILIO_PHONE_NUMBER`

### TwiML App (for browser dialer)
5. Console → Voice → TwiML Apps → Create new
6. Set Voice Request URL to: `https://[YOUR_VERCEL_URL]/api/calls/twiml`
7. Copy App SID → `TWILIO_TWIML_APP_SID`

### API Keys (for browser SDK)
8. Console → Account → API Keys → Create new Standard key
9. Copy Key SID → `TWILIO_API_KEY_SID`
10. Copy Key Secret → `TWILIO_API_KEY_SECRET` (shown ONCE — save it)

### Inbound SMS webhook
11. Phone Numbers → Manage → Your number → Messaging → Webhook:
    `https://[YOUR_VERCEL_URL]/api/texts/inbound`

---

## Step 3 — OpenAI

1. Go to [platform.openai.com](https://platform.openai.com) → API Keys → Create new
2. Copy key → `OPENAI_API_KEY`
3. Make sure you have GPT-4 Turbo access (requires adding billing)

---

## Step 4 — Google Sheets (optional but recommended)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. New project → Enable **Google Sheets API**
3. IAM → Service Accounts → Create service account
4. Create JSON key → download it
5. Copy from the JSON:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`
6. **Important:** Share any Google Sheet you want to sync with the service account email

---

## Step 5 — Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add all environment variables (copy from `.env.example`, fill in values):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_TWIML_APP_SID=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
NEXT_PUBLIC_APP_URL=https://[YOUR_VERCEL_URL]
CRON_SECRET=[generate a random 32-char string]
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

4. Deploy → Vercel auto-detects Next.js, runs `npm run build`

### After deploy
5. Copy your Vercel URL → paste into Supabase Auth Site URL
6. Copy Vercel URL → paste into Twilio webhooks (steps 6 and 11 above)
7. Vercel crons in `vercel.json` auto-activate — verify in Vercel Dashboard → Cron Jobs

---

## Step 6 — First login

1. Go to `https://[YOUR_URL]/sign-up`
2. Create your account → you'll be redirected to `/onboarding`
3. Complete onboarding — this creates your agency and loads all default sequences
4. You'll land on the Workbench ready to dial

---

## Assigning Twilio Numbers to Reps

Each rep needs their own DID (phone number) so inbound texts route to the right person.

```sql
-- Run in Supabase SQL Editor
UPDATE profiles
SET twilio_number = '+15551234567'
WHERE email = 'rep@agency.com';
```

Or in Settings → Agency, once you build the admin panel.

---

## Architecture at a glance

```
Browser (Twilio Client JS)
  ↓ WebSocket
Twilio Cloud
  ↓ POST /api/calls/twiml   (places outbound call)
  ↓ POST /api/calls/recording  (AI transcription + summary)

Lead texts back
  ↓ POST /api/texts/inbound   (AI GPT-4 reply OR flag for rep)

Vercel Cron (every hour)
  ↓ /api/cron/hourly
    → /api/automations/trigger  (appointment reminders, re-engagement)
    → /api/texts/sequence       (advance drip sequences)

Vercel Cron (every 15 min)
  ↓ /api/sheets/sync            (2-way Google Sheets sync)
```

---

## Scaling notes

- **Database:** Supabase free tier handles ~10 reps easily. Upgrade to Pro ($25/mo) at 50+ reps.
- **Twilio SMS:** ~$0.0075/message. 1,000 texts/day = ~$7.50/day.
- **OpenAI:** GPT-4 Turbo is ~$0.01/1k tokens. 1,000 AI replies/day ≈ $5-10/day.
- **Vercel:** Free tier has 100GB bandwidth + cron jobs. Pro ($20/mo) for production.

**Total infra cost at 10 reps running 100 dials/day:** ~$15–30/day

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in your .env.local values
npm run dev
# App runs at http://localhost:3000
```

For Twilio webhooks locally, use ngrok:
```bash
ngrok http 3000
# Copy the https URL → paste into Twilio webhooks temporarily
```
