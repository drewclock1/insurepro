'use client'

import { useState } from 'react'
import { Save, Plus, Trash2, CheckCircle, AlertCircle, ExternalLink, Zap, BarChart3, Settings, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TABS = ['Connection', 'Lead Routing', 'Campaign Stats', 'Event Log']
const STRATEGIES = [
  { key: 'round_robin', label: 'Round Robin', desc: 'Rotate evenly through rep pool' },
  { key: 'direct', label: 'Direct Assign', desc: 'Always assign to one specific rep' },
  { key: 'least_loaded', label: 'Least Loaded', desc: 'Assign to rep with fewest leads today' },
  { key: 'cap_based', label: 'Cap-Based', desc: 'Fill each rep to daily cap, then next rep' },
]

interface Props {
  profile: any
  metaConfig: any
  routingRules: any[]
  team: any[]
  campaignStats: any[]
  recentEvents: any[]
}

export default function MetaClient({ profile, metaConfig: initialConfig, routingRules: initialRules, team, campaignStats, recentEvents }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState('Connection')
  const [config, setConfig] = useState(initialConfig ?? {})
  const [rules, setRules] = useState(initialRules)
  const [saving, setSaving] = useState(false)
  const [showNewRule, setShowNewRule] = useState(false)
  const [newRule, setNewRule] = useState<any>({
    name: '',
    strategy: 'round_robin',
    meta_campaign_id: '',
    meta_form_id: '',
    rep_ids: [],
    direct_rep_id: '',
    daily_cap: 50,
    priority: 0,
  })

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? '[YOUR_URL]'}/api/meta/webhook`
  const connected = !!(config.page_id && config.access_token)

  async function saveConfig() {
    setSaving(true)
    const { data, error } = await supabase.from('meta_configs').upsert({
      ...config,
      agency_id: profile.agency_id,
    }, { onConflict: 'agency_id' }).select().single()

    setSaving(false)
    if (error) { toast.error('Failed to save: ' + error.message); return }
    setConfig(data)
    toast.success('Meta config saved!')
  }

  async function addRule() {
    if (!newRule.name) { toast.error('Rule needs a name'); return }
    const { data, error } = await supabase.from('routing_rules').insert({
      ...newRule,
      agency_id: profile.agency_id,
      rep_ids: newRule.rep_ids.length ? newRule.rep_ids : null,
      direct_rep_id: newRule.direct_rep_id || null,
      meta_campaign_id: newRule.meta_campaign_id || null,
      meta_form_id: newRule.meta_form_id || null,
    }).select().single()

    if (error) { toast.error('Failed: ' + error.message); return }
    setRules(prev => [data, ...prev])
    setShowNewRule(false)
    setNewRule({ name: '', strategy: 'round_robin', meta_campaign_id: '', meta_form_id: '', rep_ids: [], direct_rep_id: '', daily_cap: 50, priority: 0 })
    toast.success('Routing rule created!')
  }

  async function toggleRule(id: string, active: boolean) {
    await supabase.from('routing_rules').update({ active }).eq('id', id)
    setRules(prev => prev.map(r => r.id === id ? { ...r, active } : r))
  }

  async function deleteRule(id: string) {
    await supabase.from('routing_rules').delete().eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
    toast.success('Rule deleted')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-blue-600">f</span> Meta Integration
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Facebook Lead Ads → instant CRM + AI text + rep assignment</p>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold',
          connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
          {connected ? <><CheckCircle size={14} />Connected</> : <><AlertCircle size={14} />Not Connected</>}
        </div>
      </div>

      {/* How it works banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-blue-800 mb-3">How it works</p>
        <div className="flex items-center gap-2 text-xs text-blue-700 flex-wrap">
          {[
            '👤 Lead fills Facebook form',
            '→ Webhook fires instantly (< 1 sec)',
            '→ Lead created in CRM',
            '→ AI scores 0-100',
            '→ Routing rule assigns rep',
            '→ AI text fires immediately',
            '→ "Lead" event sent back to Meta CAPI',
            '→ Rep gets notification',
            '→ Disposition fires "Schedule/Purchase" event → Meta optimizes',
          ].map((step, i) => (
            <span key={i} className={cn('px-2 py-1 rounded-lg', step.startsWith('→') ? 'text-blue-500' : 'bg-blue-100 font-semibold')}>{step}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              tab === t ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* ── CONNECTION TAB ── */}
      {tab === 'Connection' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-700">Facebook App Credentials</h2>

            {[
              { label: 'Facebook Page ID', field: 'page_id', placeholder: '123456789', help: 'From your Facebook Page → About' },
              { label: 'Page Access Token', field: 'access_token', placeholder: 'EAABwzLixnjYBO...', help: 'Long-lived token from Facebook Developer Console', type: 'password' },
              { label: 'App ID', field: 'app_id', placeholder: '987654321', help: 'From developers.facebook.com → Your App' },
            ].map(({ label, field, placeholder, help, type }) => (
              <div key={field}>
                <label className="text-xs font-bold text-gray-500 mb-1 block">{label}</label>
                <input
                  type={type ?? 'text'}
                  value={config[field] ?? ''}
                  onChange={e => setConfig((p: any) => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-0.5">{help}</p>
              </div>
            ))}

            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 mb-3">Meta Pixel (Conversions API)</h3>
              {[
                { label: 'Pixel ID', field: 'pixel_id', placeholder: '1234567890' },
                { label: 'CAPI Access Token', field: 'capi_access_token', placeholder: 'EAABwzLixnjYBO...', type: 'password' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field} className="mb-3">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">{label}</label>
                  <input
                    type={type ?? 'text'}
                    value={config[field] ?? ''}
                    onChange={e => setConfig((p: any) => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                </div>
              ))}
            </div>

            <button onClick={saveConfig} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 disabled:opacity-50 w-full justify-center">
              <Save size={14} />{saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {/* Webhook setup guide */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-sm font-bold text-gray-700">Webhook Setup (do this once in Meta)</h2>

            <div className="space-y-4">
              {[
                { step: '1', title: 'Open Meta Developer Console', action: 'developers.facebook.com/apps', href: 'https://developers.facebook.com' },
                { step: '2', title: 'Go to your App → Webhooks', action: null },
                { step: '3', title: 'Subscribe to Page → leadgen', action: null },
              ].map(({ step, title, action, href }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{step}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    {action && href && (
                      <a href={href} target="_blank" rel="noreferrer"
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1 mt-0.5">
                        {action} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Callback URL (paste into Meta)</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <code className="text-xs text-gray-700 flex-1 truncate">{webhookUrl}</code>
                  <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}
                    className="text-xs text-brand-600 font-bold hover:text-brand-700 flex-shrink-0">Copy</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Verify Token (paste into Meta)</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                  <code className="text-xs text-gray-700 flex-1 truncate font-mono">{config.verify_token ?? 'Save config first to generate'}</code>
                  {config.verify_token && (
                    <button onClick={() => { navigator.clipboard.writeText(config.verify_token); toast.success('Copied!') }}
                      className="text-xs text-brand-600 font-bold hover:text-brand-700 flex-shrink-0">Copy</button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-bold">⚠️ Important: Field Name Mapping</p>
              <p>Make sure your Facebook Lead Form field names match these exactly (or close to it):</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 font-mono">
                {[['first_name','First Name'],['last_name','Last Name'],['phone_number','Phone'],['email','Email'],['state','State'],['zip_code','ZIP Code']].map(([key, label]) => (
                  <div key={key} className="flex gap-1"><span className="text-amber-900">{key}</span><span className="text-amber-600">→ {label}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEAD ROUTING TAB ── */}
      {tab === 'Lead Routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700">Routing Rules</p>
              <p className="text-xs text-gray-400 mt-0.5">Rules are checked in priority order. First match wins. If no rule matches, lead is unassigned.</p>
            </div>
            <button onClick={() => setShowNewRule(true)}
              className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700">
              <Plus size={13} />Add Rule
            </button>
          </div>

          {/* New rule form */}
          {showNewRule && (
            <div className="bg-white rounded-2xl border-2 border-brand-300 p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-800">New Routing Rule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Rule Name *</label>
                  <input value={newRule.name} onChange={e => setNewRule((p: any) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Life Insurance Campaign — Team A"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Priority (higher = checked first)</label>
                  <input type="number" value={newRule.priority}
                    onChange={e => setNewRule((p: any) => ({ ...p, priority: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Match Criteria <span className="text-gray-400 font-normal">(leave blank = match any)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Campaign ID</label>
                    <input value={newRule.meta_campaign_id}
                      onChange={e => setNewRule((p: any) => ({ ...p, meta_campaign_id: e.target.value }))}
                      placeholder="120207..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Form ID</label>
                    <input value={newRule.meta_form_id}
                      onChange={e => setNewRule((p: any) => ({ ...p, meta_form_id: e.target.value }))}
                      placeholder="987654..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Routing Strategy</p>
                <div className="grid grid-cols-2 gap-2">
                  {STRATEGIES.map(s => (
                    <button key={s.key} onClick={() => setNewRule((p: any) => ({ ...p, strategy: s.key }))}
                      className={cn('text-left px-3 py-2.5 rounded-xl border transition-colors',
                        newRule.strategy === s.key ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                      <p className={cn('text-xs font-bold', newRule.strategy === s.key ? 'text-brand-700' : 'text-gray-700')}>{s.label}</p>
                      <p className="text-xs text-gray-400">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rep selection */}
              {newRule.strategy !== 'direct' ? (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block">Rep Pool (select all reps who should receive these leads)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {team.map(rep => (
                      <button key={rep.id}
                        onClick={() => setNewRule((p: any) => ({
                          ...p,
                          rep_ids: p.rep_ids.includes(rep.id)
                            ? p.rep_ids.filter((id: string) => id !== rep.id)
                            : [...p.rep_ids, rep.id]
                        }))}
                        className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors',
                          newRule.rep_ids.includes(rep.id) ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                        <span className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                          {rep.full_name?.[0]}
                        </span>
                        <span className="truncate">{rep.full_name}</span>
                      </button>
                    ))}
                  </div>
                  {newRule.strategy === 'cap_based' && (
                    <div className="mt-3">
                      <label className="text-xs text-gray-500 mb-1 block">Daily cap per rep</label>
                      <input type="number" value={newRule.daily_cap}
                        onChange={e => setNewRule((p: any) => ({ ...p, daily_cap: parseInt(e.target.value) }))}
                        className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-2 block">Assign directly to</label>
                  <select value={newRule.direct_rep_id}
                    onChange={e => setNewRule((p: any) => ({ ...p, direct_rep_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select rep...</option>
                    {team.map(rep => <option key={rep.id} value={rep.id}>{rep.full_name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowNewRule(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={addRule}
                  className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">
                  Create Rule
                </button>
              </div>
            </div>
          )}

          {/* Rules list */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {rules.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">No routing rules yet</p>
                <p className="text-xs text-gray-300 mt-1">Without rules, all Meta leads land unassigned</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {rules.map((rule, i) => (
                  <div key={rule.id} className={cn('flex items-center gap-4 px-5 py-4', !rule.active && 'opacity-50')}>
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{rule.name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                          {rule.strategy.replace(/_/g, ' ')}
                        </span>
                        {rule.meta_campaign_id && (
                          <span className="text-xs text-blue-600 font-mono">Campaign: {rule.meta_campaign_id.slice(0, 12)}...</span>
                        )}
                        {rule.meta_form_id && (
                          <span className="text-xs text-violet-600 font-mono">Form: {rule.meta_form_id.slice(0, 12)}...</span>
                        )}
                        {rule.rep_ids?.length > 0 && (
                          <span className="text-xs text-gray-500">{rule.rep_ids.length} reps in pool</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800">{rule.leads_routed ?? 0}</p>
                      <p className="text-xs text-gray-400">leads routed</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleRule(rule.id, !rule.active)}
                        className={cn('text-xs font-semibold px-2.5 py-1 rounded-full transition-colors',
                          rule.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                        {rule.active ? 'Active' : 'Paused'}
                      </button>
                      <button onClick={() => deleteRule(rule.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CAMPAIGN STATS TAB ── */}
      {tab === 'Campaign Stats' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">Campaign Performance</p>
            <p className="text-xs text-gray-400 mt-0.5">All leads that came through Meta, broken down by campaign</p>
          </div>
          {campaignStats.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No Meta leads yet — connect Meta and start running ads</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Campaign', 'Ad Set', 'Leads', 'Appts', 'Applied', 'Issued', 'Close %', 'First Lead'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaignStats.map((row: any) => (
                  <tr key={`${row.meta_campaign_id}-${row.meta_adset_id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 truncate max-w-[160px]">{row.meta_campaign_name ?? row.meta_campaign_id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">
                      {row.meta_adset_name ?? row.meta_adset_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">{row.total_leads}</td>
                    <td className="px-4 py-3 text-blue-600 font-semibold">{row.appointments}</td>
                    <td className="px-4 py-3 text-orange-600 font-semibold">{row.applied}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">{row.issued}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                        parseFloat(row.close_rate_pct) >= 10 ? 'bg-emerald-100 text-emerald-700' :
                        parseFloat(row.close_rate_pct) >= 5 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600')}>
                        {row.close_rate_pct ?? '0'}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {row.first_lead_at ? format(new Date(row.first_lead_at), 'MMM d') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── EVENT LOG TAB ── */}
      {tab === 'Event Log' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">Meta CAPI Event Log</p>
            <p className="text-xs text-gray-400 mt-0.5">Every conversion event sent back to Facebook</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Event', 'Status', 'Value', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentEvents.map((evt: any) => (
                <tr key={evt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                      evt.event_name === 'Purchase' ? 'bg-emerald-100 text-emerald-700' :
                      evt.event_name === 'Schedule' ? 'bg-blue-100 text-blue-700' :
                      evt.event_name === 'Lead' ? 'bg-violet-100 text-violet-700' :
                      'bg-gray-100 text-gray-600')}>
                      {evt.event_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold',
                      evt.sent ? 'text-emerald-600' : 'text-amber-600')}>
                      {evt.sent ? '✓ Sent' : '⏳ Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {evt.value ? `$${evt.value}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {evt.created_at ? format(new Date(evt.created_at), 'MMM d, h:mm a') : '—'}
                  </td>
                </tr>
              ))}
              {recentEvents.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No events sent yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
