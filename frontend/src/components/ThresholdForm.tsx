import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sliders } from 'lucide-react'
import { api } from '../lib/api'
import { Card, ErrorBlock, LoadingBlock } from './ui'

type Thresholds = {
  temp_high_c?: number
  temp_low_c?: number
  humidity_high?: number
  humidity_low?: number
}

export function ThresholdForm({ deviceId }: { deviceId: string }) {
  const queryClient = useQueryClient()
  const device = useQuery({ queryKey: ['device', deviceId], queryFn: () => api.device(deviceId) })

  if (device.isLoading) return <LoadingBlock label="Loading device settings" />
  if (device.isError || !device.data?.thresholds) {
    return <ErrorBlock message="Device thresholds could not be loaded." />
  }

  return (
    <ThresholdEditor
      key={`${deviceId}:${JSON.stringify(device.data.thresholds)}`}
      deviceId={deviceId}
      initial={device.data.thresholds}
      queryClient={queryClient}
    />
  )
}

function ThresholdEditor({
  deviceId,
  initial,
  queryClient,
}: {
  deviceId: string
  initial: Thresholds
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const [values, setValues] = useState<Thresholds>(initial)

  const save = useMutation({
    mutationFn: () => api.updateConfig(deviceId, values),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['device', deviceId] }),
  })

  return (
    <Card>
      <div className="mb-5 flex items-center gap-2 text-sm font-medium text-pink-900">
        <Sliders size={16} className="text-pink-600" />
        Safety thresholds
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([
          ['temp_high_c', 'Temp high °C'],
          ['temp_low_c', 'Temp low °C'],
          ['humidity_high', 'Humidity high %'],
          ['humidity_low', 'Humidity low %'],
        ] as const).map(([key, label]) => (
          <label key={key} className="text-xs text-pink-600">
            {label}
            <input
              type="number"
              step="0.1"
              value={values[key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="field-focus mt-2 w-full rounded-2xl border border-pink-900/10 bg-pink-100/50 px-3 py-3 text-sm text-pink-950 outline-none focus:border-pink-400/40"
            />
          </label>
        ))}
      </div>

      {save.isError ? <ErrorBlock message="Threshold update failed. Check your role and input values." /> : null}
      {save.isSuccess ? (
        <div className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-200/40 px-3 py-2 text-xs text-rose-700">
          Thresholds updated on the server.
        </div>
      ) : null}

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save thresholds'}
      </button>
    </Card>
  )
}
