import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { NavLink, useLocation } from 'react-router-dom'
import { AmbientBackground } from './ui'
import {
  AlertTriangle,
  Gauge,
  Landmark,
  LayoutDashboard,
  LogOut,
  SlidersHorizontal,
  Cpu,
} from 'lucide-react'
import { clsx } from 'clsx'
import { api, clearSession, getStoredUser } from '../lib/api'

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/devices', label: 'Devices', icon: Cpu },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/control', label: 'Control', icon: SlidersHorizontal },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const user = getStoredUser()
  const devices = useQuery({ queryKey: ['devices'], queryFn: api.devices, refetchInterval: 10000 })
  const onlineCount = devices.data?.items.filter((device) => device.connection_state === 'ONLINE').length ?? 0
  const statusLabel = devices.isLoading ? 'Checking devices' : devices.isError ? 'Device status unavailable' : onlineCount > 0 ? `${onlineCount} device${onlineCount === 1 ? '' : 's'} online` : 'No devices online'
  const statusActive = devices.data?.items.some((device) => device.connection_state === 'ONLINE')

  return (
    <div className="min-h-screen text-pink-950">
      <AmbientBackground />
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-pink-900/10 bg-white/70 px-4 py-5 backdrop-blur-xl md:flex md:flex-col">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-pink-300/30 bg-pink-200/50 text-pink-600 shadow-[0_0_36px_rgba(236,72,153,0.18)]">
            <Landmark size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-pink-950">SmartRoom</div>
            <div className="text-xs text-pink-700">Monitor Console</div>
          </div>
        </div>

        <nav className="mt-10 flex flex-col gap-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition',
                  'hover:bg-pink-100/70 hover:text-pink-950 active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400/50',
                  isActive
                    ? 'bg-pink-200/50 text-pink-700 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.12)]'
                    : 'text-pink-700',
                )
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-pink-900/10 bg-pink-100/40 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-200 text-xs font-semibold text-pink-950">
              {user?.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm text-pink-900">{user?.username}</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-pink-600">
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              clearSession()
              window.location.assign('/login')
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-900/10 px-3 py-2 text-xs text-pink-700 transition hover:bg-pink-100/70 hover:text-pink-950 active:scale-[0.985]"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="relative md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-pink-900/10 bg-white/60 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <Gauge className="text-pink-500" size={18} />
            <span className="text-sm font-semibold">SmartRoom</span>
          </div>
          <div className="hidden items-center gap-2 text-sm md:flex">
            <span className={`h-2 w-2 rounded-full ${statusActive ? 'bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.75)]' : 'bg-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.75)]'}`} />
            <span className="text-pink-800">{statusLabel}</span>
          </div>
          <div className="text-xs text-pink-600">IoT demo · Flask API</div>
        </header>

        <main className="relative mx-auto w-full max-w-[1500px] px-4 pb-32 pt-5 md:px-8 md:pb-7 md:py-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 gap-1 rounded-[24px] border border-pink-200/40 bg-white/80 p-1.5 shadow-[0_16px_45px_rgba(190,71,136,.16)] backdrop-blur-xl md:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-[20px] text-[10px] transition',
                  isActive ? 'bg-pink-200/50 text-pink-700' : 'text-pink-600 hover:bg-pink-100/60 hover:text-pink-900 active:scale-[0.985]',
                )
              }
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
