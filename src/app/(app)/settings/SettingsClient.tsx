'use client'

import { useState } from 'react'
import { Save, Plus, Trash2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Props { profile: any; agency: any; sheetSyncs: any[] }

const TABS = ['Profile', 'Dialer', 'AI Texting', 'Google Sheets', 'Agency', 'Billing']

export default function SettingsClient({ profile: initialProfile, agency, sheetSyncs: initialSyncs }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState('Profile')
  const [profile, setProfile] = useState(initialProfile ?? {})
  const [syncs, setSyncs] = useState(initialSyncs)
  const [saving, setSaving] = useState(false)
  const [newSync, setNewSync] = useState({ spreadsheet_id: '', sheet_name: 'Leads', sync_direction: 'both' })

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone,
      daily_dial_goal: parseInt(profile.daily_dial_goal),
      daily_close_goal: parseInt(profile.daily_close_goal),
    }).eq('id', profile.id)
    setSaving(false)
    if (error) toast.error('Failed to save')
    else toast.success('Profile saved!')
  }

  async function addSheetSync() {
    if (!newSync.spreadsheet_id) return
    const { data, error } = await supabase.from('sheet_syncs').insert({
      ...newSync,
      agency_id: profile.agency_id,
      active: true,
    }).select().single()
    if (error) { toast.error('Failed to add sync'); return }
    setSyncs(prev => [...prev, data])
    setNewSync({ spreadsheet_id: '', sheet_name: 'Leads', sync_direction: 'both' })
    toast.success('Sheet sync added! First sync in <15 min.')
  }

  async function toggleSync(id: string, active: boolean) {
    await supabase.from('sheet_syncs').update({ active }).eq('id', id)
    setSyncs(prev => prev.map(s => s.id === id ? { ...s, active } : s))
  }

  async function deleteSync(id: string) {
    await supabase.from('sheet_syncs').delete().eq('id', id)
    setSyncs(prev => prev.filter(s => s.id !== id))
    toast.success('Sync removed')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings ⚙️</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your account, integrations, and platform</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === 'Profile' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Personal Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name</label>
              <input value={profile.full_name ?? ''} onChange={e => setProfile((p: any) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email</label>
              <input value={profile.email ?? ''} disabled
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone</label>
              <input value={profile.phone ?? ''} onChange={e => setProfile((p: any) => ({ ...p, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Role</label>
              <input value={profile.role ?? ''} disabled
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-400 capitalize" />
            </div>
          </div>

          <h2 className="text-sm font-bold text-gray-700 pt-2">Daily Goals</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Daily Dial Goal</label>
              <input type="number" value={profile.daily_dial_goal ?? 100}
                onChange={e => setProfile((p: any) => ({ ...p, daily_dial_goal: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Daily Close Goal</label>
              <input type="number" value={profile.daily_close_goal ?? 3}
                onChange={e => setProfile((p: any) => ({ ...p, daily_close_goal: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Save size={14} />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Dialer */}
      {tab === 'Dialer' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Twilio Dialer Setup</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Your assigned dialer number:</p>
            <p className="text-xl font-mono font-bold">{profile.twilio_number ?? 'Not assigned yet'}</p>
            <p className="text-xs text-blue-600 mt-2">Contact your admin to assign a Twilio number to your account.</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase">Webhook URLs (set in Twilio console)</h3>
            {[
              { label: 'TwiML App URL (Voice)', val: `${process.env.NEXT_PUBLIC_APP_URL ?? '[YOUR_URL]'}/api/calls/twiml` },
              { label: 'Inbound SMS Webhook', val: `${process.env.NEXT_PUBLIC_APP_URL ?? '[YOUR_URL]'}/api/texts/inbound` },
              { label: 'Recording Callback', val: `${process.env.NEXT_PUBLIC_APP_URL ?? '[YOUR_URL]'}/api/calls/recording` },
            ].map(({ label, val }) => (
              <div key={label}>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <code className="text-xs text-gray-700 flex-1 truncate">{val}</code>
                  <button onClick={() => { navigator.clipboard.writeText(val); toast.success('Copied!') }}
                    className="text-xs text-brand-600 font-semibold flex-shrink-0 hover:text-brand-700">Copy</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Texting */}
      {tab === 'AI Texting' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">AI Texting Bot Config</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800">Auto-reply to inbound texts</p>
                <p className="text-xs text-gray-500">AI responds to leads automatically until high intent is detected</p>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-sl" />
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800">AI personalization on sequences</p>
                <p className="text-xs text-gray-500">GPT-4 rewrites each message to sound unique per lead</p>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-sl" />
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-gray-800">High-intent takeover alerts</p>
                <p className="text-xs text-gray-500">Notify rep immediately when AI detects a hot reply</p>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-sl" />
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">High-intent keywords (comma separated)</label>
              <input defaultValue="yes, interested, call me, when, price, how much, appointment, schedule, available, quote"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets */}
      {tab === 'Google Sheets' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Google Sheets Sync</h2>
            <span className="text-xs text-gray-400">Syncs every 15 minutes</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Setup required</p>
            <p className="text-xs">Share your Google Sheet with the service account: <code className="font-mono">{process.env.NEXT_PUBLIC_SHEETS_EMAIL ?? 'check your .env'}</code></p>
          </div>

          {/* Existing syncs */}
          {syncs.map(sync => (
            <div key={sync.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  📊 {sync.sheet_name} — <span className="font-mono text-xs">{sync.spreadsheet_id.slice(0, 20)}...</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  Direction: {sync.sync_direction} · {sync.last_synced_at ? `Last sync: ${new Date(sync.last_synced_at).toLocaleTimeString()}` : 'Never synced'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {sync.active
                  ? <CheckCircle size={14} className="text-emerald-500" />
                  : <AlertCircle size={14} className="text-gray-400" />}
                <label className="toggle">
                  <input type="checkbox" checked={sync.active} onChange={e => toggleSync(sync.id, e.target.checked)} />
                  <span className="toggle-sl" />
                </label>
                <button onClick={() => deleteSync(sync.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Add new sync */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Add Google Sheet</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Spreadsheet ID</label>
                <input value={newSync.spreadsheet_id}
                  onChange={e => setNewSync(p => ({ ...p, spreadsheet_id: e.target.value }))}
                  placeholder="From the URL: /spreadsheets/d/[THIS_PART]/edit"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Sheet Name</label>
                <input value={newSync.sheet_name}
                  onChange={e => setNewSync(p => ({ ...p, sheet_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Direction</label>
                <select value={newSync.sync_direction}
                  onChange={e => setNewSync(p => ({ ...p, sync_direction: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="both">Both ways</option>
                  <option value="import">Import only (Sheet → CRM)</option>
                  <option value="export">Export only (CRM → Sheet)</option>
                </select>
              </div>
            </div>
            <button onClick={addSheetSync}
              className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors">
              <Plus size={13} />Add Sync
            </button>
          </div>

          {/* Column mapping reference */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Default Column Mapping</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              {[['A','First Name'],['B','Last Name'],['C','Phone'],['D','Email'],
                ['E','Product Interest'],['F','State'],['G','Source'],['H','Notes'],['I','Stage']].map(([col, field]) => (
                <div key={col} className="flex gap-2 text-gray-600">
                  <span className="font-mono font-bold text-gray-800 w-4">{col}</span>
                  <span>{field}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agency */}
      {tab === 'Agency' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Agency Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Agency Name</label>
              <input defaultValue={agency?.name ?? ''}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Agency Slug</label>
              <input defaultValue={agency?.slug ?? ''} disabled
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-400" />
            </div>
          </div>
          <div className="pt-2 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase">Invite Team Members</p>
            <div className="flex gap-2">
              <input placeholder="email@agency.com" type="email"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                <option>Rep</option><option>Manager</option><option>Admin</option>
              </select>
              <button className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700">
                Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing */}
      {tab === 'Billing' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Current Plan</h2>
            <span className="text-xs bg-brand-100 text-brand-700 font-bold px-3 py-1 rounded-full capitalize">
              {agency?.plan ?? 'starter'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'Starter', price: '$97/mo', features: ['5 reps', 'AI texting', 'Basic dialer', '1 Sheet sync'], current: agency?.plan === 'starter' },
              { name: 'Pro', price: '$297/mo', features: ['25 reps', 'Power dialer', 'Unlimited sequences', 'AI scoring', '10 Sheet syncs', 'Manager analytics'], current: agency?.plan === 'pro' },
              { name: 'Enterprise', price: '$797/mo', features: ['Unlimited reps', 'Custom AI training', 'White label', 'Dedicated support', 'API access'], current: agency?.plan === 'enterprise' },
            ].map(({ name, price, features, current }) => (
              <div key={name} className={cn('rounded-xl border-2 p-4',
                current ? 'border-brand-500 bg-brand-50' : 'border-gray-200')}>
                <p className="font-bold text-gray-900">{name}</p>
                <p className="text-xl font-extrabold text-gray-900 mt-1">{price}</p>
                <ul className="mt-3 space-y-1">
                  {features.map(f => (
                    <li key={f} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="text-emerald-500">✓</span>{f}
                    </li>
                  ))}
                </ul>
                {!current && (
                  <button className="mt-4 w-full py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700">
                    Upgrade
                  </button>
                )}
                {current && <div className="mt-4 text-center text-xs font-bold text-brand-600">Current Plan</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
