import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import * as api from '../api/client'
import RequestFeed from '../components/requests/RequestFeed'
import RequestDetail from '../components/requests/RequestDetail'
import type { RequestEvent } from '../types/events'
import { cn } from '../lib/cn'

interface StatCardProps {
  label: string
  value: number | null
  format?: (v: number) => string
  highlight?: 'red' | 'amber'
}

function StatCard({ label, value, format, highlight }: StatCardProps) {
  const display =
    value === null
      ? '—'
      : format
        ? format(value)
        : value.toLocaleString()

  const valueColor =
    value !== null && value > 0
      ? highlight === 'red'
        ? 'text-block'
        : highlight === 'amber'
          ? 'text-alrt'
          : 'text-[#e4e4e9]'
      : 'text-[#e4e4e9]'

  return (
    <div className="bg-surface border border-white/[0.07] rounded-md px-4 py-3 flex flex-col gap-1">
      <span className={cn('font-mono text-2xl font-medium tabular-nums', valueColor)}>
        {display}
      </span>
      <span className="text-xs text-[#4a4a56] uppercase tracking-wider">{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const stats = useStore((s) => s.stats)
  const setStats = useStore((s) => s.setStats)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedReq, setSelectedReq] = useState<RequestEvent | null>(null)
  const requests = useStore((s) => s.requests)

  const loadStats = useCallback(async () => {
    const result = await api.stats()
    if (result.ok) setStats(result.data)
  }, [setStats])

  useEffect(() => {
    void loadStats()
    const interval = setInterval(() => void loadStats(), 30_000)
    return () => clearInterval(interval)
  }, [loadStats])

  // keep selectedReq in sync with store
  useEffect(() => {
    if (selectedId) {
      const found = requests.find((r) => r.request_id === selectedId)
      setSelectedReq(found ?? null)
    }
  }, [selectedId, requests])

  function handleSelect(req: RequestEvent) {
    if (selectedId === req.request_id) {
      setSelectedId(null)
      setSelectedReq(null)
    } else {
      setSelectedId(req.request_id)
      setSelectedReq(req)
    }
  }

  function handleClose() {
    setSelectedId(null)
    setSelectedReq(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.07]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Requests Today" value={stats?.total_today ?? null} />
          <StatCard
            label="Blocked"
            value={stats?.blocked_today ?? null}
            highlight="red"
          />
          <StatCard
            label="Alerts"
            value={stats?.alerts_today ?? null}
            highlight="amber"
          />
          <StatCard
            label="Avg Latency"
            value={stats?.avg_latency_ms ?? null}
            format={(v) => `${Math.round(v)} ms`}
          />
        </div>
      </div>

      {/* Feed + detail */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Feed */}
        <div
          className={cn(
            'flex-1 overflow-hidden transition-all duration-200',
            selectedReq ? 'md:mr-[380px]' : '',
          )}
        >
          <RequestFeed onSelect={handleSelect} selectedId={selectedId} />
        </div>

        {/* Detail panel — desktop: fixed to right side; mobile: full-screen overlay */}
        {selectedReq && (
          <>
            {/* Mobile overlay */}
            <div className="md:hidden fixed inset-0 z-30 flex">
              <div
                className="flex-1 bg-black/60"
                onClick={handleClose}
              />
              <div className="w-full max-w-sm h-full">
                <RequestDetail request={selectedReq} onClose={handleClose} />
              </div>
            </div>

            {/* Desktop panel */}
            <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[380px]">
              <RequestDetail request={selectedReq} onClose={handleClose} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
