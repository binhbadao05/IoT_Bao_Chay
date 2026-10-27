import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lightbulb } from 'lucide-react'
import { api } from '../lib/api'
import { Card, ErrorBlock } from './ui'

export function LedControl({ deviceId }: { deviceId: string }) {
  const queryClient = useQueryClient()
  const commands = useQuery({
    queryKey: ['commands', deviceId],
    queryFn: () => api.deviceCommands(deviceId),
    refetchInterval: 4000,
  })

  const mutation = useMutation({
    mutationFn: (action: 'ON' | 'OFF') => api.createCommand(deviceId, action),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['commands', deviceId] })
    },
  })

  const command = mutation.data
  const canOperate = mutation.isPending

  return (
    <Card>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-pink-900">
            <Lightbulb size={16} className="text-amber-600" />
            LED control
          </div>
          <p className="mt-1 text-xs leading-5 text-pink-600">
            Command sent through the Flask API, delivered over MQTT and confirmed by the device ACK.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={canOperate}
          onClick={() => mutation.mutate('ON')}
          className="rounded-2xl border border-pink-900/10 bg-pink-100/50 px-3 py-4 text-sm font-medium text-pink-950 transition hover:border-amber-200/30 hover:bg-amber-200/10 disabled:opacity-60"
        >
          Turn LED on
        </button>
        <button
          disabled={canOperate}
          onClick={() => mutation.mutate('OFF')}
          className="rounded-2xl border border-pink-900/10 bg-pink-100/50 px-3 py-4 text-sm font-medium text-pink-950 transition hover:border-pink-200/40 hover:bg-pink-100/80 disabled:opacity-60"
        >
          Turn LED off
        </button>
      </div>

      {mutation.isError ? <ErrorBlock message="LED command could not be created." /> : null}

      {command ? (
        <div className="mt-4 rounded-2xl border border-pink-900/10 bg-pink-100/40 p-3 text-xs text-pink-700">
          <div className="flex items-center justify-between">
            <span>Command</span>
            <span className={command.state === 'ACKNOWLEDGED' ? 'text-rose-600' : command.state === 'FAILED' || command.state === 'TIMEOUT' ? 'text-rose-600' : 'text-amber-700'}>
              {command.state}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        {(commands.data?.items ?? []).slice(0, 5).map((cmd) => (
          <div key={cmd.id} className="flex items-center justify-between rounded-2xl border border-pink-900/10 bg-pink-100/40 px-3 py-2 text-xs">
            <span className="truncate text-pink-700">{String(cmd.payload.action ?? cmd.command_type)}</span>
            <span className={cmd.state === 'ACKNOWLEDGED' ? 'text-rose-600' : 'text-amber-700'}>{cmd.state}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
