import { useQuery } from '@tanstack/react-query'
import { TimerReset } from 'lucide-react'
import { api } from '../lib/api'
import { LoadingBlock, ErrorBlock, PageHeader } from '../components/ui'
import { LedControl } from '../components/LedControl'
import { ThresholdForm } from '../components/ThresholdForm'

export function ControlPage() {
  const devices = useQuery({ queryKey: ['devices'], queryFn: api.devices, refetchInterval: 6000 })
  const device = devices.data?.items[0]

  return (
    <>
      <PageHeader
        title="Control center"
        subtitle="Issue device commands and update safety thresholds. Success means the device acknowledges the command, not only that the API accepted it."
        action={<TimerReset className="text-pink-500" />}
      />

      {devices.isLoading ? <LoadingBlock label="Loading device controls" /> : null}
      {devices.isError ? <ErrorBlock message="Devices could not be loaded." /> : null}

      {device ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <LedControl deviceId={device.id} />
          <ThresholdForm deviceId={device.id} />
        </div>
      ) : null}
    </>
  )
}
