import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Eye, EyeOff, Lock, RadioTower, UserRound } from 'lucide-react'
import { api, setSession } from '../lib/api'
import type { User } from '../types'

export function LoginPage({
  onLogin,
  onUser,
}: {
  onLogin: (value: boolean) => void
  onUser: (user: User) => void
}) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin@123')
  const [show, setShow] = useState(false)

  const login = useMutation({
    mutationFn: () => api.login(username, password),
    onSuccess: (data) => {
      setSession(data.access_token, data.user)
      onUser(data.user)
      onLogin(true)
    },
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="soft-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-pink-300/30 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="glass relative w-full max-w-md rounded-[34px] p-7"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-300/30 bg-pink-200/50 text-pink-600">
          <RadioTower size={22} />
        </div>
        <div className="mt-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-pink-950">SmartRoom Monitor</h1>
          <p className="mt-2 text-sm text-pink-700">
            Environmental intelligence for classroom comfort and safety.
          </p>
        </div>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            login.mutate()
          }}
        >
          <label className="text-sm text-pink-800">
            Username
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-pink-900/10 bg-pink-100/50 px-4 py-3">
              <UserRound size={17} className="text-pink-600" />
              <input
                autoComplete="username"
                className="w-full bg-transparent text-pink-950 outline-none placeholder:text-pink-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
          </label>

          <div className="text-sm text-pink-800">
            <label htmlFor="password">Password</label>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-pink-900/10 bg-pink-100/50 px-4 py-3">
              <Lock size={17} className="text-pink-600" />
              <input
                id="password"
                autoComplete="current-password"
                className="w-full bg-transparent text-pink-950 outline-none placeholder:text-pink-500"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow((v) => !v)}
                className="text-pink-600 hover:text-pink-900"
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {login.isError && (
            <div className="rounded-2xl border border-rose-300/30 bg-rose-100/70 px-4 py-3 text-sm text-rose-800">
              Sign in failed. Check the API, username and password.
            </div>
          )}

          <button
            disabled={login.isPending}
            className="mt-2 rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(236,72,153,0.24)] transition hover:bg-pink-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
