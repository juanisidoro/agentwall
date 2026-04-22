import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Shield, LayoutDashboard, Puzzle, ScrollText, Bell, Menu, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/useStore'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/plugins', label: 'Plugins', icon: Puzzle, exact: false },
  { to: '/logs', label: 'Logs', icon: ScrollText, exact: false },
  { to: '/alerts', label: 'Alerts', icon: Bell, exact: false },
]

function WsStatusIndicator() {
  const wsStatus = useStore((s) => s.wsStatus)

  const dotClass = cn(
    'w-2 h-2 rounded-full flex-shrink-0',
    wsStatus === 'connected' && 'bg-pass pulse-dot',
    wsStatus === 'connecting' && 'bg-alrt pulse-dot',
    wsStatus === 'disconnected' && 'bg-block',
  )

  const label =
    wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting' : 'Offline'

  const labelColor =
    wsStatus === 'connected'
      ? 'text-pass'
      : wsStatus === 'connecting'
        ? 'text-alrt'
        : 'text-block'

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.07]">
      <div className={dotClass} />
      <span className={cn('text-xs font-mono', labelColor)}>{label}</span>
    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-white/[0.07]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] border-b border-white/[0.07] flex-shrink-0">
        <Shield className="w-5 h-5 text-pass" strokeWidth={1.5} />
        <span className="font-semibold text-sm tracking-wide text-[#e4e4e9]">AgentWall</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors',
                isActive
                  ? 'bg-elevated text-[#e4e4e9] font-medium'
                  : 'text-[#8b8b98] hover:text-[#e4e4e9] hover:bg-white/[0.04]',
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* WS Status */}
      <WsStatusIndicator />
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3.5 left-4 z-50 p-1.5 rounded-md text-[#8b8b98] hover:text-[#e4e4e9] hover:bg-white/[0.06] transition-colors"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-30 fade-animate"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'md:hidden fixed left-0 top-0 bottom-0 w-[220px] z-40 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 w-[220px] z-20">
        {sidebarContent}
      </div>

      {/* Invisible spacer to know current location — avoids re-render issues */}
      <span className="hidden">{location.pathname}</span>
    </>
  )
}
