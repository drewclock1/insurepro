'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, CheckCircle, ChevronRight } from 'lucide-react'

const STEPS = ['Your Info', 'Agency', 'Goals', 'Done!']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    agency_name: '',
    agency_slug: '',
    role: 'rep',
    daily_dial_goal: 100,
    daily_close_goal: 3,
  })

  function updateForm(key: string, val: any) {
    setForm(p => ({ ...p, [key]: val }))
    if (key === 'agency_name') {
      setForm(p => ({ ...p, agency_slug: val.toLowerCase().replace(/[^a-z0-9]/g, '-') }))
    }
  }

  async function handleFinish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/sign-in'); return }

    // Create agency
    const { data: agency, error: agencyError } = await supabase.from('agencies').insert({
      name: form.agency_name,
      slug: form.agency_slug,
    }).select().single()

    if (agencyError) {
      // Slug conflict — append random
      const { data: agency2 } = await supabase.from('agencies').insert({
        name: form.agency_name,
        slug: form.agency_slug + '-' + Math.random().toString(36).slice(2, 6),
      }).select().single()
      if (!agency2) { setLoading(false); return }
    }

    const agencyId = agency?.id

    // Create profile
    await supabase.from('profiles').upsert({
      id: user.id,
      agency_id: agencyId,
      full_name: form.full_name,
      email: user.email,
      phone: form.phone,
      role: form.role as any,
      daily_dial_goal: form.daily_dial_goal,
      daily_close_goal: form.daily_close_goal,
      onboarded: true,
    })

    router.push('/workbench')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-base">IP</span>
          </div>
          <span className="text-white font-bold text-xl">InsurePro</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i < step ? 'bg-emerald-500 text-white' :
                i === step ? 'bg-brand-600 text-white' :
                'bg-gray-700 text-gray-400'
              }`}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? 'bg-emerald-500' : 'bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-2xl">
          {/* Step 0 — Your Info */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome! Let's get you set up.</h2>
              <p className="text-sm text-gray-500 mb-6">Tell us about yourself</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Full Name</label>
                  <input value={form.full_name} onChange={e => updateForm('full_name', e.target.value)}
                    placeholder="John Davis"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Phone Number</label>
                  <input value={form.phone} onChange={e => updateForm('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Your Role</label>
                  <select value={form.role} onChange={e => updateForm('role', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="agency_owner">Agency Owner</option>
                    <option value="manager">Manager</option>
                    <option value="rep">Sales Rep</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Agency */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Name your agency</h2>
              <p className="text-sm text-gray-500 mb-6">This is how your team will be branded inside the platform</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Agency Name</label>
                  <input value={form.agency_name} onChange={e => updateForm('agency_name', e.target.value)}
                    placeholder="Davis Insurance Group"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">URL Slug</label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
                    <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-300">insurepro.app/</span>
                    <input value={form.agency_slug} onChange={e => updateForm('agency_slug', e.target.value)}
                      className="flex-1 px-3 py-2.5 text-sm outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Goals */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Set your daily goals</h2>
              <p className="text-sm text-gray-500 mb-6">These power the Workbench progress bars</p>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-600">Daily Dial Goal</label>
                    <span className="text-xs font-bold text-brand-600">{form.daily_dial_goal} dials</span>
                  </div>
                  <input type="range" min={20} max={300} step={10} value={form.daily_dial_goal}
                    onChange={e => updateForm('daily_dial_goal', parseInt(e.target.value))}
                    className="w-full accent-brand-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>20</span><span>300</span></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-600">Daily Close Goal</label>
                    <span className="text-xs font-bold text-emerald-600">{form.daily_close_goal} closes</span>
                  </div>
                  <input type="range" min={1} max={15} step={1} value={form.daily_close_goal}
                    onChange={e => updateForm('daily_close_goal', parseInt(e.target.value))}
                    className="w-full accent-emerald-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>15</span></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                  At {form.daily_dial_goal} dials/day, you'll typically reach ~{Math.round(form.daily_dial_goal * 0.25)} people
                  and set ~{Math.round(form.daily_dial_goal * 0.05)} appointments.
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You're all set, {form.full_name.split(' ')[0]}!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your platform is ready. AI texting is active, your dialer is configured,
                and 5 automated sequences are loaded and ready to go.
              </p>
              <div className="space-y-2 text-left mb-6">
                {[
                  '✅ Account created',
                  '✅ Agency configured',
                  '✅ 5 AI text sequences loaded',
                  '✅ Daily goals set',
                  '⚡ AI bot is standing by',
                ].map(item => (
                  <div key={item} className="text-sm text-gray-700 flex items-center gap-2">{item}</div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && step < 3 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                Back
              </button>
            )}
            {step < 3 && (
              <button onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 0 && !form.full_name) ||
                  (step === 1 && !form.agency_name)
                }
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 transition-colors">
                Continue <ChevronRight size={14} />
              </button>
            )}
            {step === 3 && (
              <button onClick={handleFinish} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Setting up...' : 'Enter the Platform 🚀'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
