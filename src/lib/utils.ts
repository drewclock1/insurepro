import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) return `(${match[1]}) ${match[2]}-${match[3]}`
  return phone
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0
  }).format(amount)
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function activityColor(type: string) {
  const map: Record<string, string> = {
    dial: 'bg-blue-100 text-blue-700',
    contact: 'bg-violet-100 text-violet-700',
    appointment: 'bg-amber-100 text-amber-700',
    presentation: 'bg-orange-100 text-orange-700',
    application: 'bg-green-100 text-green-700',
    close: 'bg-emerald-100 text-emerald-700',
  }
  return map[type] ?? 'bg-gray-100 text-gray-700'
}

export function leadStageColor(stage: string) {
  const map: Record<string, string> = {
    new:         'bg-slate-100 text-slate-700',
    contacted:   'bg-blue-100 text-blue-700',
    quoted:      'bg-violet-100 text-violet-700',
    appointment: 'bg-amber-100 text-amber-700',
    applied:     'bg-orange-100 text-orange-700',
    issued:      'bg-emerald-100 text-emerald-700',
    declined:    'bg-red-100 text-red-700',
    lost:        'bg-gray-100 text-gray-500',
  }
  return map[stage] ?? 'bg-gray-100 text-gray-700'
}

export function recruitStageColor(stage: string) {
  const map: Record<string, string> = {
    prospect:    'bg-slate-100 text-slate-700',
    contacted:   'bg-blue-100 text-blue-700',
    interviewing:'bg-violet-100 text-violet-700',
    contracting: 'bg-amber-100 text-amber-700',
    licensed:    'bg-orange-100 text-orange-700',
    producing:   'bg-emerald-100 text-emerald-700',
    inactive:    'bg-gray-100 text-gray-500',
  }
  return map[stage] ?? 'bg-gray-100 text-gray-700'
}
