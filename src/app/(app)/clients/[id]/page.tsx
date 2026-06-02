import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import LeadDetailClient from './LeadDetailClient'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  const [{ data: lead }, { data: calls }, { data: texts }, { data: appointments }] = await Promise.all([
    supabase.from('leads').select('*, profiles(full_name)').eq('id', params.id).single(),
    supabase.from('calls').select('*').eq('lead_id', params.id).order('created_at', { ascending: false }),
    supabase.from('texts').select('*').eq('lead_id', params.id).order('sent_at', { ascending: false }),
    supabase.from('appointments').select('*').eq('lead_id', params.id).order('scheduled_at', { ascending: false }),
  ])

  if (!lead) notFound()

  // Merge into a single timeline sorted by date
  const timeline = [
    ...(calls ?? []).map((c: any) => ({ ...c, _type: 'call', _date: c.started_at ?? c.created_at })),
    ...(texts ?? []).map((t: any) => ({ ...t, _type: 'text', _date: t.sent_at ?? t.created_at })),
    ...(appointments ?? []).map((a: any) => ({ ...a, _type: 'appointment', _date: a.created_at })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  return <LeadDetailClient lead={lead} timeline={timeline} />
}
