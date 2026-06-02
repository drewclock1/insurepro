'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, ClipboardPaste, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type ImportStep = 'upload' | 'preview' | 'done'
type ImportMethod = 'csv' | 'paste' | null

interface ParsedLead {
  first_name: string
  last_name: string
  phone: string
  email: string
  product_interest: string
  state: string
  source: string
  notes: string
  _valid: boolean
  _error?: string
}

// Header aliases — maps common column names to our field names
const HEADER_MAP: Record<string, string> = {
  'first name': 'first_name', 'firstname': 'first_name', 'first': 'first_name',
  'last name': 'last_name', 'lastname': 'last_name', 'last': 'last_name',
  'phone': 'phone', 'phone number': 'phone', 'cell': 'phone', 'mobile': 'phone',
  'email': 'email', 'email address': 'email',
  'product': 'product_interest', 'product interest': 'product_interest', 'type': 'product_interest',
  'state': 'state', 'st': 'state',
  'source': 'source', 'lead source': 'source',
  'notes': 'notes', 'note': 'notes', 'comments': 'notes',
}

function parseCSV(text: string): ParsedLead[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
  const fieldMap = headers.map(h => HEADER_MAP[h] ?? h)

  return lines.slice(1).map(line => {
    // Handle quoted CSV fields
    const values: string[] = []
    let current = '', inQuote = false
    for (const char of line) {
      if (char === '"') { inQuote = !inQuote; continue }
      if (char === ',' && !inQuote) { values.push(current.trim()); current = ''; continue }
      current += char
    }
    values.push(current.trim())

    const lead: any = {}
    fieldMap.forEach((field, i) => { if (values[i] !== undefined) lead[field] = values[i] })

    // Validate
    const hasName = lead.first_name || lead.last_name
    const hasContact = lead.phone || lead.email
    const valid = !!(hasName && hasContact)

    return {
      first_name: lead.first_name ?? '',
      last_name: lead.last_name ?? '',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      product_interest: lead.product_interest ?? '',
      state: lead.state ?? '',
      source: lead.source ?? '',
      notes: lead.notes ?? '',
      _valid: valid,
      _error: !valid ? (!hasName ? 'Missing name' : 'Missing phone/email') : undefined,
    }
  })
}

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [method, setMethod] = useState<ImportMethod>(null)
  const [pasteText, setPasteText] = useState('')
  const [leads, setLeads] = useState<ParsedLead[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [assignTo, setAssignTo] = useState('me')
  const [defaultSource, setDefaultSource] = useState('Import')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      setLeads(parsed)
      setSelected(new Set(parsed.map((_, i) => i).filter(i => parsed[i]._valid)))
      setStep('preview')
    }
    reader.readAsText(file)
  }

  function handlePaste() {
    if (!pasteText.trim()) return
    const parsed = parseCSV(pasteText)
    setLeads(parsed)
    setSelected(new Set(parsed.map((_, i) => i).filter(i => parsed[i]._valid)))
    setStep('preview')
  }

  function toggleSelect(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  async function doImport() {
    if (!selected.size) return
    setImporting(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user!.id).single()

    const toImport = Array.from(selected).map(i => ({
      ...leads[i],
      agency_id: profile?.agency_id,
      assigned_to: user!.id,
      stage: 'new',
      lead_score: 0,
      source: leads[i].source || defaultSource,
      _valid: undefined,
      _error: undefined,
    }))

    // Insert in batches of 50
    let count = 0
    for (let i = 0; i < toImport.length; i += 50) {
      const batch = toImport.slice(i, i + 50).map(({ _valid, _error, ...l }) => l)
      const { error } = await supabase.from('leads').insert(batch)
      if (!error) count += batch.length
    }

    // Trigger AI scoring for all imported leads
    fetch('/api/leads/score?batch=true', { method: 'GET' }).catch(() => {})

    setImported(count)
    setImporting(false)
    setStep('done')
    toast.success(`Imported ${count} leads!`)
  }

  const validCount = leads.filter(l => l._valid).length
  const invalidCount = leads.length - validCount

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">CSV upload or paste directly — AI will score every lead automatically</p>
        </div>
      </div>

      {/* Step 1 — Choose method */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* CSV Upload */}
            <button onClick={() => { setMethod('csv'); fileRef.current?.click() }}
              className={cn('bg-white border-2 rounded-2xl p-8 text-center hover:border-brand-400 transition-all',
                method === 'csv' ? 'border-brand-500 bg-brand-50' : 'border-dashed border-gray-300')}>
              <Upload size={28} className="mx-auto text-gray-400 mb-3" />
              <p className="font-bold text-gray-800 mb-1">Upload CSV File</p>
              <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Columns auto-mapped from headers</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </button>

            {/* Paste */}
            <button onClick={() => setMethod('paste')}
              className={cn('bg-white border-2 rounded-2xl p-8 text-center hover:border-brand-400 transition-all',
                method === 'paste' ? 'border-brand-500 bg-brand-50' : 'border-dashed border-gray-300')}>
              <ClipboardPaste size={28} className="mx-auto text-gray-400 mb-3" />
              <p className="font-bold text-gray-800 mb-1">Paste from Google Sheet</p>
              <p className="text-sm text-gray-500">Copy cells → paste here</p>
              <p className="text-xs text-gray-400 mt-2">Tab-separated rows supported</p>
            </button>
          </div>

          {method === 'paste' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Paste your data (with header row)</p>
              <p className="text-xs text-gray-400">First row should be headers: First Name, Last Name, Phone, Email, Product, State, Source</p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="First Name,Last Name,Phone,Email,Product&#10;John,Smith,(555) 123-4567,john@example.com,Life Insurance&#10;..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-500 resize-none h-40"
              />
              <button onClick={handlePaste} disabled={!pasteText.trim()}
                className="px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-40 transition-colors">
                Parse Data →
              </button>
            </div>
          )}

          {/* Column format guide */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Expected columns (any order, flexible headers)</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                ['First Name / firstname', 'Required'],
                ['Last Name / lastname', 'Required'],
                ['Phone / cell / mobile', 'Required if no email'],
                ['Email', 'Required if no phone'],
                ['Product / product interest', 'Optional'],
                ['State / st', 'Optional'],
                ['Source / lead source', 'Optional'],
                ['Notes / comments', 'Optional'],
              ].map(([col, req]) => (
                <div key={col} className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <p className="text-xs font-mono text-gray-700">{col.split('/')[0].trim()}</p>
                  <p className={cn('text-xs mt-0.5', req === 'Required' ? 'text-amber-600' : 'text-gray-400')}>{req}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-5">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">{validCount} valid leads</span>
            </div>
            {invalidCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" />
                <span className="text-sm text-gray-500">{invalidCount} skipped (missing required fields)</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mr-2">Default Source</label>
                <input value={defaultSource} onChange={e => setDefaultSource(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-brand-500 w-28" />
              </div>
              <button
                onClick={() => setSelected(new Set(leads.map((_, i) => i).filter(i => leads[i]._valid)))}
                className="text-xs text-brand-600 font-semibold hover:text-brand-700">
                Select All Valid
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 w-8"></th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wide">State</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead, i) => (
                  <tr key={i} className={cn(
                    'transition-colors',
                    !lead._valid ? 'bg-amber-50/50 opacity-60' :
                    selected.has(i) ? 'bg-brand-50' : 'hover:bg-gray-50'
                  )}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selected.has(i)} disabled={!lead._valid}
                        onChange={() => toggleSelect(i)} className="rounded" />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{lead.first_name} {lead.last_name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{lead.phone}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[120px] truncate">{lead.email}</td>
                    <td className="px-4 py-2.5 text-gray-600">{lead.product_interest}</td>
                    <td className="px-4 py-2.5 text-gray-600">{lead.state}</td>
                    <td className="px-4 py-2.5">
                      {!lead._valid && (
                        <span className="text-amber-600 font-medium">{lead._error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => { setStep('upload'); setLeads([]); setMethod(null) }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft size={14} />Back
            </button>
            <button onClick={doImport} disabled={!selected.size || importing}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 disabled:opacity-40 transition-colors">
              {importing && <Loader2 size={14} className="animate-spin" />}
              {importing ? 'Importing...' : `Import ${selected.size} Leads →`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 'done' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import complete!</h2>
          <p className="text-gray-500 mb-2">{imported} leads imported and added to your pipeline.</p>
          <p className="text-sm text-gray-400 mb-8">AI is scoring them in the background. Text sequences will start automatically.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/clients"
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
              View in CRM →
            </Link>
            <button onClick={() => { setStep('upload'); setLeads([]); setMethod(null); setImported(0) }}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
