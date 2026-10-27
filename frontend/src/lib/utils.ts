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
