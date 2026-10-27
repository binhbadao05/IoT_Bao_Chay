import { useEffect, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { AlertTriangle, WifiOff } from 'lucide-react'
import { clsx } from 'clsx'
import type { StatusTone } from '../lib/utils'

const toneClassNames: Record<StatusTone, string> = {
  online: 'bg-emerald-100 text-emerald-800 border-emerald-200/70 shadow-[0_0_18px_rgba(74,222,128,.16)]',
  warning: 'bg-amber-100 text-amber-800 border-amber-200/70',
  critical: 'bg-rose-100 text-rose-800 border-rose-200/70',
  offline: 'bg-pink-100/70 text-pink-700 border-pink-200/60',
  pending: 'bg-amber-100 text-amber-800 border-amber-200/70',
  stale: 'bg-pink-200/50 text-pink-800 border-pink-300/40',
  muted: 'bg-pink-100/50 text-pink-700 border-pink-200/40',
}

export function StatusBadge({ tone, live = false, children }: { tone: StatusTone; live?: boolean; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em]', toneClassNames[tone], live && 'status-pulse')}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function StaggerContainer({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.07, delayChildren: 0.04 },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.985 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: 'spring', stiffness: 180, damping: 24 },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

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
    <div className={clsx('card-hover glass rounded-[28px] p-5 shadow-[0_18px_60px_rgba(190,60,120,0.12)]', className)}>
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

export function AmbientBackground({ variant = 'app' }: { variant?: 'app' | 'login' }) {
  const mouseX = useMotionValue(-600)
  const mouseY = useMotionValue(-600)
  const glowX = useSpring(mouseX, { stiffness: 60, damping: 24 })
  const glowY = useSpring(mouseY, { stiffness: 60, damping: 24 })

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    mouseX.set(event.clientX)
    mouseY.set(event.clientY)
  }

  return (
    <div
      onPointerMove={handlePointerMove}
      className="fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="ambient-aurora aurora-slow" />
      <div className="ambient-aurora-secondary aurora-reverse" />
      <div className="soft-grid absolute inset-0 opacity-70" />
      <div className="ambient-orb orb-float h-[24rem] w-[24rem] -left-24 top-16 bg-pink-200/50" />
      <div className="ambient-orb orb-float h-[28rem] w-[28rem] right-[-6rem] top-8 bg-rose-100/50" style={{ animationDelay: '-5s' }} />
      <div className="ambient-orb orb-float h-[18rem] w-[18rem] left-1/3 bottom-[-5rem] bg-fuchsia-100/40" style={{ animationDelay: '-8s' }} />
      {variant === 'login' ? (
        <>
          <span className="ambient-particle particle-1" style={{ animation: 'particle-rise 14s ease-in-out infinite' }} />
          <span className="ambient-particle particle-2" style={{ animation: 'particle-rise 18s ease-in-out infinite' }} />
          <span className="ambient-particle particle-3" style={{ animation: 'particle-rise 16s ease-in-out infinite' }} />
          <span className="ambient-particle particle-4" style={{ animation: 'particle-rise 20s ease-in-out infinite' }} />
          <span className="ambient-particle particle-5" style={{ animation: 'particle-rise 15s ease-in-out infinite' }} />
        </>
      ) : null}
      <motion.div className="cursor-glow hidden md:block" style={{ x: glowX, y: glowY }} />
    </div>
  )
}

export function AnimatedNumber({ value, className = '', digits = 0 }: { value: number; className?: string; digits?: number }) {
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, { stiffness: 90, damping: 18 })
  const rounded = useTransform(spring, (latest) => Number(Math.max(0, latest).toFixed(digits)))

  useEffect(() => {
    motionValue.set(value)
  }, [motionValue, value])

  return (
    <motion.span className={className}>{rounded}</motion.span>
  )
}

export function SpotlightCard({ className, children }: { className?: string; children: ReactNode }) {
  const [position, setPosition] = useState({ x: 50, y: 50 })

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
    const py = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
    setPosition({ x: px, y: py })
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      whileHover={{ y: -2 }}
      className={clsx('group group/spot relative overflow-hidden', className)}
      style={
        {
          '--spot-x': `${position.x}%`,
          '--spot-y': `${position.y}%`,
        } as CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: 'radial-gradient(220px circle at var(--spot-x) var(--spot-y), rgba(236,72,153,0.18), transparent 65%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
