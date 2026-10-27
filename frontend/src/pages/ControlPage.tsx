import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TimerReset } from 'lucide-react'
import { api } from '../lib/api'
import { isSimulatedDevice } from '../lib/utils'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, StaggerContainer, StaggerItem } from '../components/ui'
import { LedControl } from '../components/LedControl'
import { ThresholdForm } from '../components/ThresholdForm'

export function ControlPage() {
  const [deviceId, setDeviceId] = useState('')
  const devices = useQuery({ queryKey: ['devices'], queryFn: api.devices, refetchInterval: 6000 })
  const device = deviceId
    ? devices.data?.items.find((item) => item.id === deviceId)
    : devices.data?.items[0]
  const isSimulated = device ? isSimulatedDevice(device) : false

  const controls = useMemo(() => {
    if (!device) return null
    return (
      <StaggerContainer className="grid gap-4 lg:grid-cols-2">
        <StaggerItem>
          <LedControl deviceId={device.id} />
        </StaggerItem>
        <StaggerItem>
          <ThresholdForm deviceId={device.id} />
        </StaggerItem>
      </StaggerContainer>
    )
  }, [device])

  return (
    <>
      <PageHeader
        title="Control center"
        subtitle="Issue device commands and update safety thresholds. Success means the device acknowledges the command, not only that the API accepted it."
        action={
          <div className="flex items-center gap-3">
            {isSimulated ? (
              <span className="rounded-full border border-pink-200/50 bg-pink-100/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-700">
                Simulator
              </span>
            ) : null}
            <TimerReset className="text-pink-500" />
          </div>
        }
      />

      {devices.isLoading ? <LoadingBlock label="Loading device controls" /> : null}
      {devices.isError ? <ErrorBlock message="Devices could not be loaded." /> : null}

      {!devices.isLoading && !devices.isError && (devices.data?.items ?? []).length > 1 ? (
        <select
          value={device?.id ?? ''}
          onChange={(e) => setDeviceId(e.target.value)}
          className="field-focus mb-4 w-full rounded-2xl border border-pink-900/10 bg-white/70 px-4 py-3 text-sm text-pink-950 outline-none md:max-w-sm"
        >
          {devices.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.connection_state}
            </option>
          ))}
        </select>
      ) : null}

      {!devices.isLoading && !devices.isError && !device ? (
        <EmptyBlock title="No device available" body="Create or connect a device through the API and simulator, then return to this control center." />
      ) : null}

      {controls}
    </>
  )
}
