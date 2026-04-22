import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { connect } from './api/websocket'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './pages/Dashboard'
import Plugins from './pages/Plugins'
import Logs from './pages/Logs'
import Alerts from './pages/Alerts'
import Onboarding from './pages/Onboarding'
import * as api from './api/client'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/plugins': 'Plugins',
  '/logs': 'Logs',
  '/alerts': 'Alerts',
  '/onboarding': 'Setup',
}

function getTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? 'AgentWall'
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const isOnboarding = location.pathname === '/onboarding'
  const title = getTitle(location.pathname)

  useEffect(() => {
    if (isOnboarding) return
    api.settings().then((result) => {
      if (result.ok && result.data.onboarding_complete !== 'true') {
        navigate('/onboarding')
      }
    }).catch(() => {
      // If settings endpoint fails, don't block the user
    })
  }, [navigate, isOnboarding])

  if (isOnboarding) {
    return (
      <div className="h-full bg-bg overflow-y-auto">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden pl-0 md:pl-[220px]">
        <Header title={title} />
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/plugins" element={<Plugins />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    connect()
  }, [])

  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}
