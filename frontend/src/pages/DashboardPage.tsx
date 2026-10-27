import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Droplets,
  Radio,
  Thermometer,
  WifiOff,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../lib/api'
import { formatTime, isSimulatedDevice, liveTone, relativeTime, type StatusTone } from '../lib/utils'
import {
  AnimatedNumber,
  Card,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  StaggerContainer,
  StaggerItem,
  StatusBadge,
} from '../components/ui'

export function DashboardPage() {
  const [deviceId, setDeviceId] = useState('')
  const devices = useQuery({ queryKey: ['devices'], queryFn: api.devices, refetchInterval: 6000 })
  const selectedDevice = deviceId
    ? devices.data?.items.find((device) => device.id === deviceId)
    : devices.data?.items[0]

  const alerts = useQuery({ queryKey: ['alerts'], queryFn: () => api.alerts() })
  const activeDeviceId = selectedDevice?.id

  const latest = useQuery({
    queryKey: ['latest', activeDeviceId],
    queryFn: () => api.latestTelemetry(activeDeviceId!),
    enabled: Boolean(activeDeviceId),
    refetchInterval: 5000,
  })

  const history = useQuery({
    queryKey: ['telemetry', activeDeviceId],
    queryFn: () => api.telemetry(activeDeviceId!, 80),
    enabled: Boolean(activeDeviceId),
    refetchInterval: 10000,
  })

  const current = latest.data?.item
  const onlineCount = devices.data?.items.filter((d) => d.connection_state === 'ONLINE').length ?? 0
  const criticalCount = alerts.data?.items.filter((a) => a.state === 'ACTIVE' && a.severity === 'CRITICAL').length ?? 0
  const historyData = [...(history.data?.items ?? [])].reverse().map((item) => ({
    time: new Date(item.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperature_c: item.temperature_c,
    humidity_percent: item.humidity_percent,
  }))

  const freshnessTone = liveTone(selectedDevice?.connection_state, current?.received_at ?? selectedDevice?.last_seen_at)
  const isSimulated = selectedDevice ? isSimulatedDevice(selectedDevice) : false

  return (
    <>
      <PageHeader
        title="Environmental overview"
        subtitle="A live, calm surface for the room’s conditions, device state and alerts."
        action={
          selectedDevice ? (
            <div className="flex flex-col items-start gap-2 md:items-end">
              {isSimulated ? (
                <span className="rounded-full border border-pink-200/50 bg-pink-100/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-700">
                  Simulator data
                </span>
              ) : null}
              <Link to={`/devices/${selectedDevice.id}`} className="group flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700">
                Open device detail
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <DeviceSelector
          devices={devices.data?.items ?? []}
          value={selectedDevice?.id ?? ''}
          onChange={setDeviceId}
        />

        <DashboardHero
          temperature={current?.temperature_c}
          humidity={current?.humidity_percent}
          online={onlineCount}
          critical={criticalCount}
          lastSeen={current?.received_at ?? selectedDevice?.last_seen_at}
          statusTone={freshnessTone}
        />

        <section className="lg:col-span-8 space-y-4">
          <Card className="overflow-hidden">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-pink-900">Telemetry history</div>
                <div className="mt-1 text-xs text-pink-600">
                  {selectedDevice ? `Device: ${selectedDevice.name}` : 'No device selected'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-pink-600">Updated {relativeTime(current?.received_at)}</div>
                {isSimulated ? (
                  <div className="mt-1 rounded-full bg-pink-100/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-pink-700">
                    Simulated feed
                  </div>
                ) : null}
              </div>
            </div>
            {devices.isLoading ? <LoadingBlock label="Loading devices" /> : null}
            {devices.isError ? <ErrorBlock message="Devices could not be loaded from the Flask API." /> : null}
            {history.isLoading ? <LoadingBlock /> : null}
            {history.isError ? <ErrorBlock message="Telemetry history could not be loaded from the Flask API." /> : null}
            {history.data?.items?.length ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData}>
                    <defs>
                      <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="humFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f9a8d4" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="#f9a8d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(190, 60, 120, 0.10)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#b06c8a', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} />
                    <YAxis tick={{ fill: '#b06c8a', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(255, 250, 252, 0.96)',
                        border: '1px solid rgba(236, 72, 153, 0.22)',
                        borderRadius: 18,
                        color: '#4c1d3b',
                      }}
                    />
                    <Area animationDuration={800} type="monotone" dataKey="temperature_c" stroke="#ec4899" strokeWidth={2} fill="url(#tempFill)" name="Temperature °C" />
                    <Area animationDuration={800} type="monotone" dataKey="humidity_percent" stroke="#f9a8d4" strokeWidth={2} fill="url(#humFill)" name="Humidity %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            {selectedDevice && history.data?.items?.length === 0 && !history.isLoading && !history.isError ? (
              <EmptyBlock title="No telemetry yet" body="Start the simulator or ESP32 device. Data will appear here after MQTT ingestion." />
            ) : null}
            {!selectedDevice && !devices.isLoading && !devices.isError ? (
              <EmptyBlock title="No device available" body="Create or connect a device through the API and simulator, then return to this dashboard." />
            ) : null}
          </Card>
        </section>

        <section className="space-y-4 lg:col-span-4">
          <RecentAlerts />
        </section>
      </div>
    </>
  )
}

function DeviceSelector({ devices, value, onChange }: { devices: { id: string; name: string; connection_state: string }[]; value: string; onChange: (value: string) => void }) {
  if (!devices.length) {
    return <div className="lg:col-span-12" />
  }

  if (devices.length === 1) {
    return <div className="lg:col-span-12" />
  }

  return (
    <div className="lg:col-span-12">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-focus w-full rounded-2xl border border-pink-900/10 bg-white/70 px-4 py-3 text-sm text-pink-950 outline-none md:max-w-sm"
      >
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name} · {device.connection_state}
          </option>
        ))}
      </select>
    </div>
  )
}

function DashboardHero({
  temperature,
  humidity,
  online,
  critical,
  lastSeen,
  statusTone,
}: {
  temperature?: number
  humidity?: number
  online: number
  critical: number
  lastSeen?: string | null
  statusTone: StatusTone
}) {
  return (
    <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:col-span-12">
      <StaggerItem>
        <Card className="relative overflow-hidden h-full">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-pink-700">
                <Thermometer size={16} className="text-pink-600" />
                Temperature
              </div>
              <div className="mt-4 text-5xl font-semibold tracking-tight text-pink-950">
                {temperature === undefined ? '—' : <AnimatedNumber value={temperature} digits={1} />}°C
              </div>
            </div>
            <div className="rounded-3xl border border-pink-200/40 bg-pink-200/50 p-4 text-pink-700">
              <Thermometer size={24} />
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between text-xs text-pink-600">
            <span>Current reading</span>
            <StatusBadge tone={statusTone} live={statusTone === 'online'}>
              {statusTone === 'online' ? 'Live' : statusTone === 'stale' ? 'Stale' : statusTone === 'offline' ? 'Offline' : 'Checking'}
            </StatusBadge>
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card className="relative overflow-hidden h-full">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-rose-200/40 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-pink-700">
                <Droplets size={16} className="text-rose-600" />
                Humidity
              </div>
              <div className="mt-4 text-5xl font-semibold tracking-tight text-pink-950">
                {humidity === undefined ? '—' : <AnimatedNumber value={humidity} digits={1} />}%RH
              </div>
            </div>
            <div className="rounded-3xl border border-rose-300/30 bg-rose-200/40 p-4 text-rose-700">
              <Droplets size={24} />
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between text-xs text-pink-600">
            <span>Last telemetry</span>
            <span>{formatTime(lastSeen)}</span>
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card className="h-full">
          <div className="flex items-center gap-2 text-sm text-pink-700">
            <Radio size={16} className="text-rose-600" />
            Devices online
          </div>
          <AnimatedNumber value={online} className="mt-4 block text-5xl font-semibold tracking-tight text-pink-950" />
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card className="h-full">
          <div className="flex items-center gap-2 text-sm text-pink-700">
            <AlertTriangle size={16} className="text-rose-600" />
            Active critical alerts
          </div>
          <AnimatedNumber value={critical} className="mt-4 block text-5xl font-semibold tracking-tight text-pink-950" />
        </Card>
      </StaggerItem>
    </StaggerContainer>
  )
}

function RecentAlerts() {
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: () => api.alerts(), refetchInterval: 8000 })
  const items = alerts.data?.items.slice(0, 6) ?? []

  if (alerts.isLoading) return <LoadingBlock label="Loading alerts" />
  if (alerts.isError) return <ErrorBlock message="Alerts could not be loaded." />

  return (
    <Card>
      <div className="mb-5 flex items-center justify-between">
        <div className="text-sm font-medium text-pink-900">Recent alerts</div>
        <Link to="/alerts" className="text-xs text-pink-600 hover:text-pink-700">
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-pink-900/15 p-4 text-sm text-pink-600">
          <WifiOff size={17} />
          No alerts recorded
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((alert) => (
            <Link
              key={alert.id}
              to="/alerts"
              className="rounded-2xl border border-pink-900/10 bg-pink-100/40 p-4 transition hover:bg-pink-100/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-rose-300' : 'bg-amber-300'}`} />
                    <span className="text-sm font-medium text-pink-900">{alert.alert_type.replaceAll('_', ' ')}</span>
                  </div>
                  <div className="mt-2 text-xs leading-5 text-pink-600">{alert.message}</div>
                </div>
                <div className="text-right text-[11px] text-pink-500">
                  <div>{alert.state}</div>
                  <div>{relativeTime(alert.last_seen_at)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

