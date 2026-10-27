import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Cpu, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { connectionTone, isSimulatedDevice, relativeTime } from '../lib/utils'
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  SpotlightCard,
  StaggerContainer,
  StaggerItem,
  StatusBadge,
} from '../components/ui'

export function DevicesPage() {
  const query = useQuery({ queryKey: ['devices'], queryFn: api.devices, refetchInterval: 6000 })
  const [search, setSearch] = useState('')
  const devices = query.data?.items ?? []
  const filtered = devices.filter((d) => `${d.id} ${d.name}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <PageHeader
        title="Devices"
        subtitle="Provisioned ESP32 nodes and simulated test devices."
        action={
          <div className="flex w-full items-center gap-3 rounded-2xl border border-pink-900/10 bg-pink-100/50 px-4 py-3 md:max-w-sm">
            <Search size={17} className="text-pink-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search devices"
              className="w-full bg-transparent text-pink-950 outline-none placeholder:text-pink-500"
            />
          </div>
        }
      />

      {query.isLoading ? <LoadingBlock label="Loading devices" /> : null}
      {query.isError ? <ErrorBlock message="Devices could not be loaded from the API." /> : null}
      {!query.isLoading && !query.isError && filtered.length === 0 ? (
        <EmptyBlock title="No matching devices" body="Adjust the search or create a device through the API." />
      ) : null}

      <StaggerContainer className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((device) => (
          <StaggerItem key={device.id} className="h-full">
            <Link to={`/devices/${device.id}`} className="group block h-full">
              <SpotlightCard className="glass h-full rounded-[28px] p-5 shadow-[0_18px_60px_rgba(190,60,120,0.12)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-pink-900/10 bg-pink-100/50 text-pink-800">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-pink-950">{device.name}</div>
                      <div className="text-xs text-pink-600">{device.id}</div>
                    </div>
                  </div>
                  <ChevronRight className="text-pink-500 transition group-hover:translate-x-0.5 group-hover:text-pink-700" size={17} />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-pink-900/10 bg-pink-100/50 p-3">
                    <div className="text-xs text-pink-600">Lifecycle</div>
                    <div className="mt-1 text-sm text-pink-900">{device.lifecycle_state}</div>
                  </div>
                  <div className="rounded-2xl border border-pink-900/10 bg-pink-100/50 p-3">
                    <div className="text-xs text-pink-600">Last seen</div>
                    <div className="mt-1 text-sm text-pink-900">{relativeTime(device.last_seen_at)}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={connectionTone(device.connection_state)} live={device.connection_state === 'ONLINE'}>
                      {device.connection_state}
                    </StatusBadge>
                    {isSimulatedDevice(device) ? (
                      <span className="rounded-full border border-pink-200/50 bg-pink-100/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-pink-700">
                        Sim
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-pink-500">firmware {device.firmware_version}</div>
                </div>
              </SpotlightCard>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </>
  )
}
