import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Send, CheckCircle2, TriangleAlert, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import type { Command } from '../types'
import { Card, ErrorBlock, StatusBadge } from './ui'
import { commandTone } from '../lib/utils'

const terminalStates = new Set(['ACKNOWLEDGED', 'FAILED', 'TIMEOUT'])

export function LedControl({ deviceId }: { deviceId: string }) {
  const queryClient = useQueryClient()
  const [activeCommand, setActiveCommand] = useState<Command | null>(null)
  const commands = useQuery({
    queryKey: ['commands', deviceId],
    queryFn: () => api.deviceCommands(deviceId),
    refetchInterval: 4000,
  })

  const commandId = activeCommand?.id
  const createdCommand = useQuery({
    queryKey: ['command', deviceId, commandId],
    queryFn: () => api.command(commandId!),
    enabled: Boolean(commandId),
    refetchInterval: (query) => {
      const state = query.state.data?.state
      return state && terminalStates.has(state) ? false : 1000
    },
  })

  const command = createdCommand.data ?? activeCommand

  const mutation = useMutation({
    mutationFn: (action: 'ON' | 'OFF') => api.createCommand(deviceId, action),
    onSuccess: (created) => setActiveCommand(created),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['commands', deviceId] })
    },
  })

  const pending = command?.state === 'PENDING'
  const failed = command?.state === 'FAILED' || command?.state === 'TIMEOUT'
  const acknowledged = command?.state === 'ACKNOWLEDGED'

  return (
    <Card>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-pink-900">
            <Lightbulb size={16} className="text-amber-600" />
            LED control
          </div>
          <p className="mt-1 text-xs leading-5 text-pink-600">
            Command sent through the Flask API, delivered over MQTT and confirmed by the device ACK.
          </p>
        </div>
        {command ? (
          <StatusBadge tone={commandTone(command.state)}>{command.state}</StatusBadge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('ON')}
          className="rounded-2xl border border-pink-900/10 bg-pink-100/50 px-3 py-4 text-sm font-medium text-pink-950 transition hover:border-amber-200/30 hover:bg-amber-200/10 disabled:opacity-60"
        >
          {mutation.isPending && command?.payload.action === 'ON' ? 'Sending…' : 'Turn LED on'}
        </button>
        <button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('OFF')}
          className="rounded-2xl border border-pink-900/10 bg-pink-100/50 px-3 py-4 text-sm font-medium text-pink-950 transition hover:border-pink-200/40 hover:bg-pink-100/80 disabled:opacity-60"
        >
          {mutation.isPending && command?.payload.action === 'OFF' ? 'Sending…' : 'Turn LED off'}
        </button>
      </div>

      {mutation.isError ? <ErrorBlock message="LED command could not be created." /> : null}

      {pending ? (
        <Feedback kind="pending" title="Waiting for device ACK" body="The command was accepted by the API and is being delivered over MQTT." icon={Send} />
      ) : null}
      {acknowledged ? (
        <Feedback kind="success" title="Device acknowledged" body={`The LED command ${String(command?.payload.action ?? '')} was acknowledged.`} icon={CheckCircle2} />
      ) : null}
      {failed ? (
        <Feedback kind="error" title="Command did not complete" body="The command is not confirmed by the device. Check MQTT, simulator state and device lifecycle." icon={command?.state === 'TIMEOUT' ? XCircle : TriangleAlert} />
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        {(commands.data?.items ?? []).slice(0, 5).map((cmd) => (
          <div key={cmd.id} className="flex items-center justify-between gap-3 rounded-2xl border border-pink-900/10 bg-pink-100/40 px-3 py-2 text-xs">
            <span className="truncate text-pink-700">{String(cmd.payload.action ?? cmd.command_type)}</span>
            <StatusBadge tone={commandTone(cmd.state)}>{cmd.state}</StatusBadge>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Feedback({ kind, title, body, icon: Icon }: { kind: 'pending' | 'success' | 'error'; title: string; body: string; icon: typeof Send }) {
  const className = kind === 'success'
    ? 'border-emerald-200/50 bg-emerald-100/40 text-emerald-900'
    : kind === 'pending'
      ? 'border-amber-200/50 bg-amber-100/40 text-amber-900'
      : 'border-rose-300/40 bg-rose-100/40 text-rose-900'

  return (
    <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-3 ${className}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Command</div>
        <div className="mt-1 text-xs font-semibold">{title}</div>
        <div className="mt-1 text-xs leading-5 opacity-80">{body}</div>
      </div>
    </div>
  )
}

