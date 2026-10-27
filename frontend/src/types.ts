export type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER'

export type User = {
  id: string
  username: string
  role: Role
  is_active: boolean
  created_at: string
}

export type Device = {
  id: string
  name: string
  firmware_version: string
  lifecycle_state: string
  connection_state: 'UNKNOWN' | 'ONLINE' | 'OFFLINE'
  last_seen_at: string | null
  telemetry_interval_seconds: number
  heartbeat_interval_seconds: number
  created_at: string
  updated_at: string
  thresholds: {
    temp_high_c: number
    temp_low_c: number
    humidity_high: number
    humidity_low: number
  } | null
}

export type Telemetry = {
  id: number
  device_id: string
  message_id: string
  temperature_c: number
  humidity_percent: number
  received_at: string
  source: string
}

export type Alert = {
  id: string
  device_id: string
  alert_type: string
  severity: 'WARNING' | 'CRITICAL'
  message: string
  state: 'ACTIVE' | 'ACKNOWLEDGED'
  first_seen_at: string
  last_seen_at: string
  ack_by_user_id: string | null
  ack_at: string | null
}

export type Command = {
  id: string
  device_id: string
  command_type: string
  payload: Record<string, unknown>
  state: 'PENDING' | 'ACKNOWLEDGED' | 'FAILED' | 'TIMEOUT'
  requested_by: string | null
  error_code: string | null
  created_at: string
  sent_at: string | null
  acknowledged_at: string | null
  ack_payload: Record<string, unknown> | null
}
