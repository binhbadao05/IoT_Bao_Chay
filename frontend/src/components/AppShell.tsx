import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
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
import { clearSession, getStoredUser } from '../lib/api'

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/devices', label: 'Devices', icon: Cpu },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/control', label: 'Control', icon: SlidersHorizontal },
]

export function AppShell({ children }: { children: ReactNode }) {
  const user = getStoredUser()

  return (
    <div className="min-h-screen text-pink-950">
      <div className="soft-grid pointer-events-none fixed inset-0 opacity-60" />
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
                  'hover:bg-pink-100/70 hover:text-pink-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400/50',
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-900/10 px-3 py-2 text-xs text-pink-700 transition hover:bg-pink-100/70 hover:text-pink-950"
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
            <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.8)]" />
            <span className="text-pink-800">Live environmental telemetry</span>
          </div>
          <div className="text-xs text-pink-600">IoT demo · Flask API</div>
        </header>

        <main className="relative mx-auto w-full max-w-[1500px] px-4 py-5 md:px-8 md:py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
