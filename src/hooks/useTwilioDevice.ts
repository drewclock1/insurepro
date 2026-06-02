'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

export type DeviceState = 'uninitialized' | 'registering' | 'ready' | 'busy' | 'error'
export type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended'

export interface TwilioDeviceHook {
  deviceState: DeviceState
  callState: CallState
  activeCall: any | null
  elapsed: number
  muted: boolean
  onHold: boolean
  startCall: (to: string, params?: Record<string, string>) => Promise<void>
  endCall: () => void
  toggleMute: () => void
  toggleHold: () => void
  sendDigit: (digit: string) => void
  error: string | null
}

export function useTwilioDevice(): TwilioDeviceHook {
  const [deviceState, setDeviceState] = useState<DeviceState>('uninitialized')
  const [callState, setCallState] = useState<CallState>('idle')
  const [activeCall, setActiveCall] = useState<any>(null)
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [onHold, setOnHold] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deviceRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    initDevice()
    return () => {
      clearInterval(timerRef.current)
      deviceRef.current?.destroy()
    }
  }, [])

  async function initDevice() {
    setDeviceState('registering')
    try {
      const res = await fetch('/api/calls/token')
      if (!res.ok) throw new Error('Could not get access token')
      const { token } = await res.json()

      // Dynamic import — Twilio SDK is browser-only
      const { Device } = await import('@twilio/voice-sdk')

      const device = new Device(token, {
        logLevel: process.env.NODE_ENV === 'development' ? 1 : 0,
        codecPreferences: ['opus', 'pcmu'] as any,
        allowIncomingWhileBusy: false,
      })

      device.on('registered', () => setDeviceState('ready'))
      device.on('unregistered', () => setDeviceState('uninitialized'))
      device.on('error', (err: any) => {
        setError(err.message)
        setDeviceState('error')
        setCallState('idle')
        toast.error(`Dialer: ${err.message}`)
      })
      device.on('tokenWillExpire', () => refreshToken(device))

      await device.register()
      deviceRef.current = device
    } catch (err: any) {
      setError(err.message)
      setDeviceState('error')
      toast.error('Dialer setup failed — check Twilio config')
    }
  }

  async function refreshToken(device: any) {
    const res = await fetch('/api/calls/token')
    const { token } = await res.json()
    device.updateToken(token)
  }

  const startCall = useCallback(async (to: string, params: Record<string, string> = {}) => {
    if (!deviceRef.current || deviceState !== 'ready') {
      toast.error('Dialer not ready')
      return
    }
    setCallState('connecting')
    setElapsed(0)
    setMuted(false)
    setOnHold(false)
    setError(null)

    try {
      const call = await deviceRef.current.connect({
        params: { To: to, ...params },
      })

      setActiveCall(call)
      setDeviceState('busy')

      call.on('ringing', () => setCallState('ringing'))

      call.on('accept', () => {
        setCallState('connected')
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
      })

      call.on('disconnect', () => {
        setCallState('ended')
        setDeviceState('ready')
        setMuted(false)
        setOnHold(false)
        clearInterval(timerRef.current)
      })

      call.on('cancel', () => {
        setCallState('idle')
        setDeviceState('ready')
        clearInterval(timerRef.current)
      })

      call.on('reject', () => {
        setCallState('ended')
        setDeviceState('ready')
        clearInterval(timerRef.current)
      })

      call.on('error', (err: any) => {
        setError(err.message)
        setCallState('ended')
        setDeviceState('ready')
        clearInterval(timerRef.current)
        toast.error(`Call error: ${err.message}`)
      })

    } catch (err: any) {
      setError(err.message)
      setCallState('idle')
      setDeviceState('ready')
      toast.error(`Failed to start call: ${err.message}`)
    }
  }, [deviceState])

  const endCall = useCallback(() => {
    activeCall?.disconnect()
    clearInterval(timerRef.current)
    setCallState('ended')
    setDeviceState('ready')
  }, [activeCall])

  const toggleMute = useCallback(() => {
    if (!activeCall) return
    const next = !muted
    activeCall.mute(next)
    setMuted(next)
  }, [activeCall, muted])

  const toggleHold = useCallback(() => {
    // Twilio doesn't have native hold — we mute + play hold music via TwiML
    // For now toggle local mute state as UI placeholder
    setOnHold(h => !h)
    toast('Hold feature coming soon — muting for now')
    toggleMute()
  }, [toggleMute])

  const sendDigit = useCallback((digit: string) => {
    activeCall?.sendDigits(digit)
  }, [activeCall])

  return {
    deviceState, callState, activeCall, elapsed,
    muted, onHold, error,
    startCall, endCall, toggleMute, toggleHold, sendDigit,
  }
}
