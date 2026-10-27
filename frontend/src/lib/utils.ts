export function formatTime(iso?: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

export function relativeTime(iso?: string | null) {
  if (!iso) return 'Never'
  const delta = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(delta / 1000))
  if (sec < 15) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hour = Math.floor(min / 60)
  return `${hour}h ago`
}

export function clampNumber(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

export type StatusTone = 'online' | 'warning' | 'critical' | 'offline' | 'pending' | 'stale' | 'muted'

export function connectionTone(connectionState: string): StatusTone {
  if (connectionState === 'ONLINE') return 'online'
  if (connectionState === 'OFFLINE') return 'offline'
  return 'muted'
}

export function commandTone(commandState: string): StatusTone {
  if (commandState === 'ACKNOWLEDGED') return 'online'
  if (commandState === 'FAILED' || commandState === 'TIMEOUT') return 'critical'
  if (commandState === 'PENDING') return 'pending'
  return 'muted'
}

export function liveTone(connectionState: string | undefined, lastSeenAt?: string | null): StatusTone {
  if (connectionState === 'OFFLINE') return 'offline'
  if (connectionState !== 'ONLINE') return 'muted'
  if (!lastSeenAt) return 'warning'
  const age = Date.now() - new Date(lastSeenAt).getTime()
  if (age <= 20000) return 'online'
  if (age <= 60000) return 'warning'
  return 'stale'
}

export function isSimulatedDevice(device: { id: string; firmware_version?: string }) {
  return device.id.startsWith('sim-') || Boolean(device.firmware_version?.includes('sim'))
}
