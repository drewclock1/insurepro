'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Options {
  agencyId: string
  repId: string
  onActivityUpdate?: (activity: any) => void
  onNewLead?: (lead: any) => void
  onHotReply?: (text: any, lead: any) => void
  onTeamClose?: (activity: any, profile: any) => void
}

export function useRealtimeActivity({
  agencyId, repId,
  onActivityUpdate, onNewLead, onHotReply, onTeamClose,
}: Options) {
  const supabase = createClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA' +
      'EAAQARAAEAIlYAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABQAAAAUA')
  }, [])

  function playAlert() {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }

  function showBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    }
  }

  useEffect(() => {
    if (!agencyId) return

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // ── Channel 1: My daily activity updates ──────────────────────────
    const activityChannel = supabase
      .channel(`activity:${repId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_activities',
        filter: `rep_id=eq.${repId}`,
      }, (payload) => {
        onActivityUpdate?.(payload.new)
      })
      .subscribe()

    // ── Channel 2: New leads assigned to me ───────────────────────────
    const leadChannel = supabase
      .channel(`leads:${repId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter: `assigned_to=eq.${repId}`,
      }, (payload) => {
        const lead = payload.new as any
        playAlert()
        const source = lead.meta_campaign_name ? `📘 ${lead.meta_campaign_name}` : lead.source ?? 'New lead'
        toast.success(
          `🔥 New lead: ${lead.first_name} ${lead.last_name ?? ''} — ${source}`,
          { duration: 6000, style: { background: '#4f46e5', color: '#fff', fontWeight: '600' } }
        )
        showBrowserNotification(
          `New Lead: ${lead.first_name} ${lead.last_name ?? ''}`,
          `${lead.product_interest ?? 'Insurance'} · AI texting now`
        )
        onNewLead?.(lead)
      })
      .subscribe()

    // ── Channel 3: Hot replies (inbound texts needing rep attention) ───
    const textChannel = supabase
      .channel(`texts:hot:${repId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'texts',
        filter: `rep_id=eq.${repId}`,
      }, async (payload) => {
        const text = payload.new as any
        if (text.direction !== 'inbound') return

        // Fetch lead name
        const { data: lead } = await supabase
          .from('leads')
          .select('first_name, last_name, lead_score')
          .eq('id', text.lead_id)
          .single()

        // High-intent keywords
        const hotKeywords = ['yes', 'interested', 'call me', 'when', 'price', 'how much', 'schedule', 'available']
        const isHot = hotKeywords.some(k => text.body?.toLowerCase().includes(k))

        if (isHot) {
          playAlert()
          playAlert() // double beep for hot
          toast(
            () => (
              `🚨 HOT REPLY from ${lead?.first_name ?? 'Lead'}: "${text.body?.slice(0, 60)}"`
            ),
            {
              duration: 10000,
              style: { background: '#dc2626', color: '#fff', fontWeight: '700', fontSize: '13px' },
              icon: '🔥',
            }
          )
          showBrowserNotification(
            `🔥 Hot Reply — ${lead?.first_name ?? 'Lead'}`,
            text.body?.slice(0, 100) ?? 'Replied to your text'
          )
          onHotReply?.(text, lead)
        }
      })
      .subscribe()

    // ── Channel 4: Team closes (for leaderboard energy) ──────────────
    const closeChannel = supabase
      .channel(`closes:${agencyId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'daily_activities',
        filter: `agency_id=eq.${agencyId}`,
      }, async (payload) => {
        const prev = payload.old as any
        const next = payload.new as any
        // Another rep just closed a deal
        if (next.closes > (prev.closes ?? 0) && next.rep_id !== repId) {
          const { data: repProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', next.rep_id)
            .single()

          toast(`🏆 ${repProfile?.full_name ?? 'A rep'} just closed a deal!`, {
            duration: 4000,
            style: { background: '#059669', color: '#fff', fontWeight: '600' },
          })
          onTeamClose?.(next, repProfile)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(activityChannel)
      supabase.removeChannel(leadChannel)
      supabase.removeChannel(textChannel)
      supabase.removeChannel(closeChannel)
    }
  }, [agencyId, repId])
}
