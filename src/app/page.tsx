import Link from 'next/link'

const FEATURES = [
  { icon: '📞', title: 'Power Dialer', desc: 'Click-to-call with auto-logging, AI call summaries, and disposition tracking. Stop wasting time on manual entry.' },
  { icon: '🤖', title: 'AI Texting Bot', desc: 'GPT-4 texts every lead the moment they come in. Sounds like a real human, 24/7. Hands off to rep when intent detected.' },
  { icon: '📊', title: 'Sales CRM', desc: 'Kanban pipeline built for insurance. Drag leads through stages, see scores, and call or text from the card.' },
  { icon: '🎯', title: 'Recruiting Pipeline', desc: 'Separate CRM for agent candidates. Track from Prospect to Licensed to Producing with automated outreach.' },
  { icon: '⚡', title: 'Automations', desc: 'Set-it-and-forget-it workflows. New lead auto-texts. No contact in 3 days re-engages. Appointment tomorrow gets a reminder.' },
  { icon: '📋', title: 'Google Sheets Sync', desc: 'Your existing sheet becomes a live 2-way sync. Import leads, export updates. No workflow disruption.' },
  { icon: '🏆', title: 'Workbench + Leaderboard', desc: 'Reps tap to log Dials, Contacts, Closes. Real-time leaderboard keeps the team fired up.' },
  { icon: '📈', title: 'Manager Analytics', desc: 'Every call, text, and close across your whole team in one view. Assign numbers, set goals, see who is producing.' },
]

const STATS = [
  { val: '18h', label: 'saved per rep / day by AI automation' },
  { val: '41%', label: 'fewer no-shows with automated reminders' },
  { val: '14.5%', label: 'average text reply rate (industry avg: 6%)' },
  { val: '10x', label: 'faster lead follow-up vs manual outreach' },
]

const HOW_IT_WORKS = [
  { step: '1', title: 'Lead comes in from any source', desc: 'Facebook ad, Google form, Google Sheet import, manual entry. Lead lands in your CRM instantly.' },
  { step: '2', title: 'AI scores and texts immediately', desc: 'GPT-4 scores the lead 0-100 and fires the first text within seconds. Sounds completely human. No bot templates.' },
  { step: '3', title: 'Rep dials while AI handles texting', desc: 'Your rep opens the Power Dialer — leads are sorted by score, auto-logged on disposition. AI keeps texting anyone not reached yet.' },
  { step: '4', title: 'Hot replies escalate to the rep', desc: 'When a lead replies with intent, AI flags it instantly. Rep takes over the conversation with full context.' },
  { step: '5', title: 'Manager sees everything in real-time', desc: 'Every dial, text, close, and conversation across the team. Assign Twilio numbers, set goals, toggle sequences on/off.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-extrabold text-sm">IP</div>
            <span className="font-bold text-white">InsurePro</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#stats" className="hover:text-white transition-colors">Results</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <a href="#demo"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors">
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-300 mb-6">
            🚀 Built specifically for insurance sales teams
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            The sales platform your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400"> insurance team</span>
            <br />actually wants to use
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Power dialer, AI texting bot, CRM, recruiting pipeline, and full automation — built from the ground up for insurance agents. Not another generic CRM you'll abandon in 30 days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#demo"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl text-base transition-all hover:scale-105">
              Book a Free Demo →
            </a>
            <Link href="/sign-up"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors border border-white/20">
              Start Free Trial
            </Link>
          </div>
        </div>

        {/* Hero visual — app preview hint */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="grid grid-cols-6 gap-3">
              {[
                { label: 'Dials', val: '72', color: 'indigo' },
                { label: 'Contacts', val: '18', color: 'violet' },
                { label: 'Appts', val: '4', color: 'amber' },
                { label: 'Presents', val: '3', color: 'orange' },
                { label: 'Apps', val: '2', color: 'green' },
                { label: 'Closes', val: '1', color: 'emerald' },
              ].map(({ label, val, color }) => (
                <div key={label} className={`bg-${color}-950/50 border border-${color}-900/50 rounded-xl p-3 text-center`}
                  style={{ background: 'rgba(30,30,50,0.8)', borderColor: 'rgba(99,102,241,0.2)' }}>
                  <p className="text-2xl font-extrabold text-white">{val}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-6 border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ val, label }) => (
            <div key={val} className="text-center">
              <p className="text-4xl font-extrabold text-indigo-400">{val}</p>
              <p className="text-sm text-gray-400 mt-2">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Everything your team needs, nothing they don't</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Every feature was built specifically for how insurance agencies actually operate. Not adapted from a generic tool.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-indigo-800 transition-colors">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">How it works</h2>
            <p className="text-gray-400 text-lg">From lead in to close — completely automated where it should be, human where it matters.</p>
          </div>
          <div className="space-y-6">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1.5">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Demo */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-indigo-900 to-violet-900 rounded-3xl p-10 text-center border border-indigo-700">
          <h2 className="text-3xl font-extrabold mb-4">Ready to see it in action?</h2>
          <p className="text-indigo-200 mb-8 text-lg">Book a 30-minute demo and we'll walk through the platform with your actual use case. No slides, no fluff.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
            <input
              type="email"
              placeholder="your@agency.com"
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300 outline-none focus:ring-2 focus:ring-white/30 text-sm"
            />
            <button type="submit"
              className="bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm whitespace-nowrap">
              Book Demo →
            </button>
          </form>
          <p className="text-indigo-300 text-sm">Or <Link href="/sign-up" className="underline hover:text-white">start a free trial</Link> — no credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-extrabold text-xs">IP</div>
            <span className="font-bold text-white">InsurePro</span>
            <span className="text-gray-500 text-sm">· Built for insurance sales teams</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Sign Up</Link>
            <a href="mailto:hello@insurepro.app" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
