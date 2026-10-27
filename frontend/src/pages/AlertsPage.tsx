import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Radio } from 'lucide-react'
import { api } from '../lib/api'
import { relativeTime } from '../lib/utils'
import { Card, EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui'

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
                className={`rounded-xl px-3 py-2 text-xs transition ${
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

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((alert) => (
          <Card key={alert.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className={`rounded-2xl p-3 ${alert.severity === 'CRITICAL' ? 'bg-rose-100/70 text-rose-800' : 'bg-amber-200/60 text-amber-800'}`}>
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-pink-950">
                    {alert.alert_type.replaceAll('_', ' ')}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${alert.severity === 'CRITICAL' ? 'bg-rose-200/70 text-rose-700' : 'bg-amber-200/70 text-amber-800'}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-2 max-w-xl text-sm leading-6 text-pink-700">{alert.message}</div>
                </div>
              </div>
              <div className="text-right text-xs text-pink-600">
                <div>{alert.state}</div>
                <div className="mt-1">{relativeTime(alert.last_seen_at)}</div>
              </div>
            </div>

            {alert.state === 'ACTIVE' ? (
              <button
                onClick={() => acknowledge.mutate(alert.id)}
                disabled={acknowledge.isPending}
                className="mt-4 flex items-center gap-2 rounded-2xl border border-pink-900/10 px-3 py-2 text-xs text-pink-800 transition hover:border-rose-300/30 hover:bg-rose-100/60 disabled:opacity-60"
              >
                <Check size={14} />
                Acknowledge
              </button>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-rose-600">
                <Radio size={14} />
                Acknowledged
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
