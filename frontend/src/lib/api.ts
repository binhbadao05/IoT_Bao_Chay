import type { Alert, Command, Device, Telemetry, User } from '../types'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const TOKEN_KEY = 'smartroom_token'
const USER_KEY = 'smartroom_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

type ApiErrorBody = {
  error?: string
  message?: string
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || body.error || 'API request failed')
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
      window.dispatchEvent(new Event('smartroom:unauthorized'))
    }
    throw new ApiError(response.status, data)
  }

  return data as T
}

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const value = search.toString()
  return value ? `?${value}` : ''
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<User>('/auth/me'),
  devices: () => request<{ items: Device[] }>('/devices'),
  device: (id: string) => request<Device>(`/devices/${id}`),
  deviceStatus: (id: string) =>
    request<{
      device_id: string
      lifecycle_state: string
      connection_state: string
      last_seen_at: string | null
    }>(`/devices/${id}/status`),
  latestTelemetry: (id: string) =>
    request<{ item: Telemetry | null }>(`/devices/${id}/telemetry/latest`),
  telemetry: (id: string, limit = 80) =>
    request<{
      items: Telemetry[]
      pagination: { limit: number; offset: number; total: number }
    }>(`/devices/${id}/telemetry${queryString({ limit })}`),
  alerts: (deviceId?: string, state?: string) =>
    request<{ items: Alert[] }>(
      `/alerts${queryString({ device_id: deviceId, state })}`,
    ),
  acknowledgeAlert: (id: string) =>
    request<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  createCommand: (deviceId: string, action: 'ON' | 'OFF') =>
    request<Command>(`/devices/${deviceId}/commands`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  command: (id: string) => request<Command>(`/commands/${id}`),
  deviceCommands: (id: string) =>
    request<{ items: Command[] }>(`/devices/${id}/commands`),
  updateConfig: (id: string, thresholds: Record<string, number | undefined>) =>
    request<Device>(`/devices/${id}/config`, {
      method: 'POST',
      body: JSON.stringify(thresholds),
    }),
}
