import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check } from 'lucide-react'
import { api } from '../lib/api'
import { relativeTime } from '../lib/utils'
import {
  Card,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  StaggerContainer,
  StaggerItem,
  StatusBadge,
} from '../components/ui'

export function AlertsPage() {
  const queryClient = useQueryClient()
  const [state, setState] = useState('')
  const alerts = useQuery({ queryKey: ['alerts', state], queryFn: () => api.alerts(undefined, state), refetchInterval: 6000 })
  const acknowledge = useMutation({
    mutationFn: (id: string) => api.acknowledgeAlert(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const items = alerts.data?.items ?? []

  return (
    <>
      <PageHeader
        title="Alerts center"
        subtitle="Active environmental and connectivity events, with acknowledgement controlled by operator roles."
        action={
          <div className="flex rounded-2xl border border-pink-900/10 bg-pink-100/50 p-1">
            {['', 'ACTIVE', 'ACKNOWLEDGED'].map((value) => (
              <button
                key={value}
                onClick={() => setState(value)}
                className={`rounded-xl px-3 py-2 text-xs transition active:scale-[0.98] ${
                  state === value ? 'bg-pink-200/60 text-pink-700' : 'text-pink-600 hover:text-pink-900'
                }`}
              >
                {value || 'All'}
              </button>
            ))}
          </div>
        }
      />

      {alerts.isLoading ? <LoadingBlock label="Loading alerts" /> : null}
      {alerts.isError ? <ErrorBlock message="Alerts could not be loaded." /> : null}
      {!alerts.isLoading && !alerts.isError && items.length === 0 ? (
        <EmptyBlock title="No alerts in this view" body="Environmental readings are within configured thresholds." />
      ) : null}

      <StaggerContainer className="grid gap-4 lg:grid-cols-2">
        {items.map((alert) => (
          <StaggerItem key={alert.id}>
            <Card>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div className="flex gap-3">
                  <div className={`rounded-2xl p-3 ${alert.severity === 'CRITICAL' ? 'bg-rose-100/70 text-rose-800' : 'bg-amber-200/60 text-amber-800'}`}>
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-pink-950">
                      {alert.alert_type.replaceAll('_', ' ')}
                      <StatusBadge tone={alert.severity === 'CRITICAL' ? 'critical' : 'warning'}>{alert.severity}</StatusBadge>
                    </div>
                    <div className="mt-2 max-w-xl text-sm leading-6 text-pink-700">{alert.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-pink-600 md:justify-end">
                  <StatusBadge tone={alert.state === 'ACTIVE' ? 'pending' : 'online'}>{alert.state}</StatusBadge>
                  <span>{relativeTime(alert.last_seen_at)}</span>
                </div>
              </div>

              {alert.state === 'ACTIVE' ? (
                <button
                  onClick={() => acknowledge.mutate(alert.id)}
                  disabled={acknowledge.isPending}
                  className="mt-4 flex items-center gap-2 rounded-2xl border border-pink-900/10 px-3 py-2 text-xs text-pink-800 transition hover:border-rose-300/30 hover:bg-rose-100/60 active:scale-[0.99] disabled:opacity-60"
                >
                  <Check size={14} />
                  Acknowledge
                </button>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700">
                  <Check size={14} />
                  Acknowledged
                </div>
              )}
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </>
  )
}
