import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getStoredUser, getToken } from './lib/api'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { DevicesPage } from './pages/DevicesPage'
import { DeviceDetailPage } from './pages/DeviceDetailPage'
import { AlertsPage } from './pages/AlertsPage'
import { ControlPage } from './pages/ControlPage'
import { LoginPage } from './pages/LoginPage'
import type { User } from './types'

function ProtectedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  const location = useLocation()
  const [authed, setAuthed] = useState<boolean>(Boolean(getToken()))
  const [, setUser] = useState<User | null>(getStoredUser())

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthed(false)
      setUser(null)
    }
    window.addEventListener('smartroom:unauthorized', onUnauthorized)
    return () => window.removeEventListener('smartroom:unauthorized', onUnauthorized)
  }, [])

  const isLogin = location.pathname.startsWith('/login')
  if (!authed && !isLogin) return <Navigate to="/login" replace />
  if (authed && isLogin) return <Navigate to="/dashboard" replace />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={setAuthed} onUser={setUser} />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/control" element={<ControlPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
