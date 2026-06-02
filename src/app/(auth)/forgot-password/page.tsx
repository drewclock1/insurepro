'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-base">IP</span>
          </div>
          <p className="text-white font-bold text-lg">InsurePro</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 mb-5">We sent a reset link to <strong>{email}</strong></p>
              <Link href="/sign-in" className="text-sm text-brand-600 font-semibold hover:underline">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Reset password</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@agency.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-brand-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-xs text-gray-500 mt-4">
                <Link href="/sign-in" className="text-brand-600 font-semibold hover:underline">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
