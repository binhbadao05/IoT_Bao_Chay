import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, WifiOff } from 'lucide-react'
import { clsx } from 'clsx'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-pink-950 md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-pink-700 md:text-base">{subtitle}</p>
      </div>
      {action}
    </motion.div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('glass rounded-[28px] p-5 shadow-[0_18px_60px_rgba(190,60,120,0.12)]', className)}>
      {children}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading telemetry' }: { label?: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center gap-3 rounded-3xl border border-pink-900/10 bg-white/70 p-6 text-sm text-pink-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-pink-500" />
      {label}
    </div>
  )
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border border-rose-300/30 bg-rose-100/60 p-6 text-center text-sm text-rose-800">
      <AlertTriangle className="text-rose-600" />
      <p className="max-w-xl text-balance">{message}</p>
    </div>
  )
}

export function EmptyBlock({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-3xl border border-dashed border-pink-900/15 bg-white/60 p-6 text-center">
      <WifiOff className="mb-3 text-pink-600" size={22} />
      <div className="font-medium text-pink-900">{title}</div>
      <p className="mt-1 max-w-md text-sm text-pink-600">{body}</p>
      {action}
    </div>
  )
}
