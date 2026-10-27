import { useState, type PointerEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react'
import {
  Activity,
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  RadioTower,
  SlidersHorizontal,
  UserRound,
  Wifi,
} from 'lucide-react'
import { api, setSession } from '../lib/api'
import { AmbientBackground, StaggerContainer, StaggerItem } from '../components/ui'
import type { User } from '../types'
import { clsx } from 'clsx'

const defaultPassword = import.meta.env.PROD ? '' : 'Admin@123'

const features = [
  {
    icon: Activity,
    title: 'Giám sát môi trường',
    body: 'Nhiệt độ và độ ẩm được cập nhật theo thời gian thực.',
  },
  {
    icon: BellRing,
    title: 'Cảnh báo vượt ngưỡng',
    body: 'Phát hiện bất thường và hiển thị trạng thái an toàn rõ ràng.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Điều khiển từ xa',
    body: 'Gửi lệnh thiết bị qua MQTT và theo dõi phản hồi ACK.',
  },
]

export function LoginPage({
  onLogin,
  onUser,
}: {
  onLogin: (value: boolean) => void
  onUser: (user: User) => void
}) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState(defaultPassword)
  const [show, setShow] = useState(false)
  const [success, setSuccess] = useState(false)

  const login = useMutation({
    mutationFn: () => api.login(username, password),
    onSuccess: (data) => {
      setSession(data.access_token, data.user)
      onUser(data.user)
      setSuccess(true)
      window.setTimeout(() => onLogin(true), 420)
    },
  })

  const disabled = login.isPending || success

  return (
    <div className="relative min-h-[100svh] w-full overflow-x-clip">
      <AmbientBackground variant="login" />
      <div className="relative z-10 flex min-h-[100svh] w-full flex-col lg:grid lg:grid-cols-[55fr_45fr]">
        <LoginShowcase className="order-2 lg:order-1" />
        <AuthPanel
          className="order-1 lg:order-2"
          username={username}
          password={password}
          show={show}
          success={success}
          disabled={disabled}
          isPending={login.isPending}
          isError={login.isError}
          failureCount={login.failureCount}
          onUsername={setUsername}
          onPassword={setPassword}
          onShow={() => setShow((value) => !value)}
          onSubmit={() => login.mutate()}
        />
      </div>
    </div>
  )
}

function LoginShowcase({ className }: { className?: string }) {
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, { stiffness: 46, damping: 20 })
  const smoothY = useSpring(pointerY, { stiffness: 46, damping: 20 })
  const orbLeftX = useTransform(smoothX, (value) => value * -24)
  const orbRightX = useTransform(smoothX, (value) => value * 20)
  const previewY = useTransform(smoothY, (value) => value * -10)

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2)
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2)
  }

  return (
    <motion.section
      onPointerMove={handlePointerMove}
      className={clsx(
        'relative isolate flex min-h-[34rem] items-center overflow-x-clip px-5 py-8 sm:px-8 lg:min-h-[100svh] lg:border-r lg:border-pink-200/40 lg:px-12 lg:py-10 2xl:px-16 2xl:py-14',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(255,255,255,.80),rgba(255,241,246,.64))]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_22%,rgba(249,168,212,.36),transparent_23rem),radial-gradient(circle_at_84%_12%,rgba(252,231,243,.72),transparent_26rem),radial-gradient(circle_at_46%_80%,rgba(236,72,153,.14),transparent_24rem)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(236,72,153,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(236,72,153,.07)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,.9),transparent_94%)]" />

      <motion.div
        aria-hidden
        style={{ x: orbLeftX }}
        className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-pink-200/60 blur-3xl"
      />
      <motion.div
        aria-hidden
        style={{ x: orbRightX, y: previewY }}
        className="pointer-events-none absolute right-[-8rem] top-28 h-96 w-96 rounded-full bg-rose-100/50 blur-3xl"
      />

      <StaggerContainer className="relative z-10 w-full max-w-[680px]">
        <StaggerItem>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pink-300/40 bg-white/80 text-pink-600 shadow-[0_0_36px_rgba(236,72,153,0.16)] backdrop-blur-xl">
              <RadioTower size={21} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-pink-950">SmartRoom Monitor</h2>
              <div className="text-xs uppercase tracking-[0.32em] text-pink-600">Premium IoT Console</div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="mt-7 max-w-2xl">
            <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.07] tracking-[-0.045em] text-pink-950 sm:text-5xl xl:text-[3.25rem]">
              Không gian học tập được giám sát thông minh.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-pink-700 sm:text-base xl:text-[17px]">
              Hệ thống IoT giám sát nhiệt độ, độ ẩm và cảnh báo môi trường bất thường theo thời gian thực.
            </p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <StaggerContainer className="mt-6 grid gap-3 md:grid-cols-3">
            {features.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="h-full rounded-[24px] border border-white/70 bg-white/60 p-4 shadow-[0_18px_50px_rgba(190,71,136,.10)] backdrop-blur-xl">
                  <feature.icon size={18} className="text-pink-600" />
                  <div className="mt-3 text-base font-semibold text-pink-950">{feature.title}</div>
                  <p className="mt-2 text-sm leading-6 text-pink-700">{feature.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </StaggerItem>

        <StaggerItem>
          <SystemPreview style={{ y: previewY }} />
        </StaggerItem>
      </StaggerContainer>
    </motion.section>
  )
}

function AuthPanel({
  className,
  username,
  password,
  show,
  success,
  disabled,
  isPending,
  isError,
  failureCount,
  onUsername,
  onPassword,
  onShow,
  onSubmit,
}: {
  className?: string
  username: string
  password: string
  show: boolean
  success: boolean
  disabled: boolean
  isPending: boolean
  isError: boolean
  failureCount: number
  onUsername: (value: string) => void
  onPassword: (value: string) => void
  onShow: () => void
  onSubmit: () => void
}) {
  return (
    <section className={clsx('relative flex min-h-[100svh] items-center justify-center bg-white/68 px-4 py-8 backdrop-blur-2xl lg:border-l lg:border-pink-200/40 lg:px-10 lg:py-12 2xl:px-14', className)}>
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.975 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 22 }}
        className="glass relative w-full max-w-[440px] rounded-[34px] p-6 shadow-[0_38px_120px_rgba(190,71,136,0.18)] sm:p-8 xl:p-10"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[34px] bg-[radial-gradient(260px_circle_at_50%_0%,rgba(236,72,153,0.12),transparent_66%)]" />
        <StaggerContainer className="relative">
          <StaggerItem>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pink-300/40 bg-pink-50/80 text-pink-600 shadow-[0_0_30px_rgba(236,72,153,0.14)]">
                <RadioTower size={21} />
              </div>
              <div>
                <div className="text-[15px] font-semibold uppercase tracking-[0.22em] text-pink-600">SmartRoom</div>
                <div className="text-xs text-pink-700">Monitor Console</div>
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="mt-7">
              <h2 className="text-3xl font-semibold tracking-tight text-pink-950">Chào mừng trở lại</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-pink-700">
                Đăng nhập để mở console giám sát môi trường thời gian thực.
              </p>
            </div>
          </StaggerItem>

          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!disabled) onSubmit()
            }}
          >
            <StaggerItem>
              <label className="block text-sm font-semibold text-pink-950">
                Username
                <div className="field-focus mt-2 flex items-center gap-3 rounded-2xl border border-pink-900/10 bg-pink-50/70 px-4 py-3.5">
                  <UserRound size={18} className="text-pink-600" />
                  <input
                    autoComplete="username"
                    className="w-full bg-transparent text-sm text-pink-950 outline-none placeholder:text-pink-400"
                    value={username}
                    onChange={(event) => onUsername(event.target.value)}
                    placeholder="admin"
                  />
                </div>
              </label>
            </StaggerItem>

            <StaggerItem>
              <div className="text-sm font-semibold text-pink-950">
                <label htmlFor="password">Password</label>
                <div className="field-focus mt-2 flex items-center gap-3 rounded-2xl border border-pink-900/10 bg-pink-50/70 px-4 py-3.5">
                  <Lock size={18} className="text-pink-600" />
                  <input
                    id="password"
                    autoComplete="current-password"
                    className="w-full bg-transparent text-sm text-pink-950 outline-none placeholder:text-pink-400"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => onPassword(event.target.value)}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={onShow}
                    className="text-pink-600 transition hover:scale-105 hover:text-pink-900"
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </StaggerItem>

            <AnimatePresence mode="wait">
              {isError ? (
                <motion.div
                  key={failureCount}
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: [0, -8, 8, -4, 4, 0] }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.36 }}
                  className="rounded-2xl border border-rose-300/30 bg-rose-100/70 px-4 py-3 text-sm text-rose-800"
                >
                  Sign in failed. Check the API, username and password.
                </motion.div>
              ) : null}
            </AnimatePresence>

            <StaggerItem>
              <motion.button
                whileHover={!disabled ? { y: -1 } : undefined}
                whileTap={!disabled ? { scale: 0.975 } : undefined}
                disabled={disabled}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(236,72,153,0.28)] transition hover:shadow-[0_0_42px_rgba(236,72,153,0.38)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {success ? (
                    <motion.span key="success" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <CheckCircle2 size={17} />
                      Signed in
                    </motion.span>
                  ) : isPending ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <LoaderCircle size={17} className="animate-spin" />
                      Signing in…
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Sign in
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </StaggerItem>
          </form>
        </StaggerContainer>
      </motion.div>
    </section>
  )
}

function SystemPreview({ style }: { style: { y: MotionValue<number> } }) {
  return (
    <motion.div
      style={style}
      className="mt-6 rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-[0_26px_80px_rgba(190,71,136,.11)] backdrop-blur-xl"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-pink-950">Hệ sinh thái IoT · Minh họa</div>
          <div className="mt-1 text-xs text-pink-600">SmartRoom giám sát từ cảm biến tới bảng điều khiển.</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">
          <Wifi size={14} />
          ESP32 · MQTT · Flask
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <svg viewBox="0 0 520 132" className="h-auto w-full overflow-visible" role="img" aria-label="Sensor to MQTT to Monitor data flow">
          <defs>
            <linearGradient id="pinkLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path d="M64 66 C152 26 240 66 272 66 S396 102 462 66" fill="none" stroke="url(#pinkLine)" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 10" />
          <g>
            <circle cx="62" cy="66" r="23" fill="rgba(255,255,255,.88)" stroke="rgba(236,72,153,.34)" />
            <text x="62" y="70" textAnchor="middle" fill="#4c1d3b" fontSize="13" fontWeight="700">ESP</text>
          </g>
          <g>
            <rect x="238" y="46" width="68" height="40" rx="14" fill="rgba(255,255,255,.88)" stroke="rgba(236,72,153,.28)" />
            <text x="272" y="70" textAnchor="middle" fill="#ec4899" fontSize="13" fontWeight="700">MQTT</text>
          </g>
          <g>
            <rect x="430" y="40" width="78" height="54" rx="18" fill="rgba(255,255,255,.90)" stroke="rgba(236,72,153,.28)" />
            <circle cx="444" cy="52" r="4" fill="#4ade80" />
            <text x="472" y="57" fill="#4c1d3b" fontSize="13" fontWeight="700">APP</text>
            <text x="473" y="75" fill="#b06c8a" fontSize="10">Monitor</text>
          </g>
          <circle r="5" fill="#ec4899">
            <animateMotion dur="2.8s" repeatCount="indefinite" path="M64 66 C152 26 240 66 272 66" />
          </circle>
          <circle r="5" fill="#f9a8d4">
            <animateMotion dur="3.2s" repeatCount="indefinite" begin="0.8s" path="M272 66 C322 66 396 102 462 66" />
          </circle>
        </svg>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-pink-900/10 bg-pink-100/45 p-3">
            <div className="text-xs font-medium text-pink-600">Phòng học 101</div>
            <div className="mt-2 text-2xl font-semibold text-pink-950">24.6°C</div>
            <div className="text-xs text-pink-600">Nhiệt độ</div>
          </div>
          <div className="rounded-2xl border border-pink-900/10 bg-pink-100/45 p-3">
            <div className="text-xs font-medium text-pink-600">Độ ẩm</div>
            <div className="mt-2 text-2xl font-semibold text-pink-950">62%</div>
            <div className="text-xs text-pink-600">Online preview</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
