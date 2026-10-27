import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Cpu, Gauge, Radio, RefreshCcw, Thermometer } from 'lucide-react'
import { api } from '../lib/api'
import type { StatusTone } from '../lib/utils'
import { clampNumber, formatTime, isSimulatedDevice, liveTone, relativeTime } from '../lib/utils'
import { Card, EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, StatusBadge } from '../components/ui'
import { LedControl } from '../components/LedControl'

export function DeviceDetailPage() {
  const { deviceId = '' } = useParams()
  const device = useQuery({ queryKey: ['device', deviceId], queryFn: () => api.device(deviceId), refetchInterval: 6000 })
  const latest = useQuery({
    queryKey: ['latest', deviceId],
    queryFn: () => api.latestTelemetry(deviceId),
    refetchInterval: 5000,
  })
  const history = useQuery({
    queryKey: ['telemetry', deviceId],
    queryFn: () => api.telemetry(deviceId, 80),
    refetchInterval: 10000,
  })

  if (device.isLoading) return <LoadingBlock label="Loading device" />
  if (device.isError) return <ErrorBlock message="Device detail could not be loaded." />

  const current = latest.data?.item
  const deviceTone = liveTone(device.data?.connection_state, current?.received_at ?? device.data?.last_seen_at)
  const isSimulated = device.data ? isSimulatedDevice(device.data) : false
  const historyData = [...(history.data?.items ?? [])].reverse().map((item) => ({
    time: new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperature_c: item.temperature_c,
    humidity_percent: item.humidity_percent,
  }))

  return (
    <>
      <PageHeader
        title={device.data?.name || deviceId}
        subtitle={`Device ${deviceId} · firmware ${device.data?.firmware_version} · ${isSimulated ? 'Simulator' : 'Physical/API'}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge tone={deviceTone} live={deviceTone === 'online'}>
              {device.data?.connection_state ?? 'UNKNOWN'}
            </StatusBadge>
            <div className="flex items-center gap-2 text-sm text-pink-700">
              <RefreshCcw size={15} />
              Auto-refresh on
            </div>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-pink-900">Live trace</div>
            <div className="text-xs text-pink-600">Last {relativeTime(current?.received_at)}</div>
          </div>
          {history.isLoading ? <LoadingBlock /> : null}
          {history.isError ? <ErrorBlock message="History failed to load." /> : null}
          {history.data?.items?.length ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="detailTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(190, 60, 120, 0.10)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#b06c8a', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{ fill: '#b06c8a', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ background: 'rgba(255, 250, 252, 0.96)', border: '1px solid rgba(236, 72, 153, 0.22)', borderRadius: 18, color: '#4c1d3b' }} />
                  <Area type="monotone" dataKey="temperature_c" stroke="#ec4899" strokeWidth={2} fill="url(#detailTemp)" name="Temperature °C" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {!history.isLoading && !history.isError && !history.data?.items?.length ? (
            <EmptyBlock title="No history" body="Start data collection and telemetry will appear here." />
          ) : null}
        </Card>

        <div className="space-y-4 lg:col-span-4">
          <LedControl deviceId={deviceId} />
          <DeviceFacts deviceId={deviceId} />
        </div>
      </div>
    </>
  )
}

function DeviceFacts({ deviceId }: { deviceId: string }) {
  const status = useQuery({ queryKey: ['status', deviceId], queryFn: () => api.deviceStatus(deviceId), refetchInterval: 6000 })
  const latest = useQuery({ queryKey: ['latest', deviceId], queryFn: () => api.latestTelemetry(deviceId), refetchInterval: 5000 })
  const item = latest.data?.item
  const data = status.data

  if (status.isError) return <ErrorBlock message="Device status failed to load." />
  if (status.isLoading) return <LoadingBlock label="Loading status" />

  return (
    <Card>
      <div className="mb-5 text-sm font-medium text-pink-900">Current state</div>
      <div className="grid grid-cols-2 gap-3">
        <Metric icon={Thermometer} label="Temp" value={item ? `${clampNumber(item.temperature_c)}°C` : '—'} />
        <Metric icon={Gauge} label="Humidity" value={item ? `${clampNumber(item.humidity_percent)}%` : '—'} />
        <Metric icon={Radio} label="Connection" value={data?.connection_state ?? '—'} tone={liveTone(data?.connection_state, item?.received_at ?? data?.last_seen_at)} live={data?.connection_state === 'ONLINE'} />
        <Metric icon={Cpu} label="Lifecycle" value={data?.lifecycle_state ?? '—'} />
      </div>
      <div className="mt-5 rounded-2xl border border-pink-900/10 bg-pink-100/40 p-3 text-xs text-pink-600">
        Last seen {formatTime(data?.last_seen_at)}
      </div>
    </Card>
  )
}

function Metric({ icon: Icon, label, value, tone, live = false }: { icon: typeof Activity; label: string; value: string; tone?: StatusTone; live?: boolean }) {
  return (
    <div className="rounded-2xl border border-pink-900/10 bg-pink-100/40 p-3">
      <div className="flex items-center gap-2 text-xs text-pink-600">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2">
        {tone ? <StatusBadge tone={tone} live={live}>{value}</StatusBadge> : <span className="text-sm font-medium text-pink-950">{value}</span>}
      </div>
    </div>
  )
}







