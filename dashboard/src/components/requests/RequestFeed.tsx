import { useRef, useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { RequestEvent, PluginResultItem } from '../../types/events'
import { ActionBadge, ProviderBadge } from './RequestBadge'
import type { PluginAction } from '../../types/plugin'
import { cn } from '../../lib/cn'

interface Props {
  onSelect: (req: RequestEvent) => void
  selectedId: string | null
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toTimeString().slice(0, 8)
}

function dominantAction(req: RequestEvent): PluginAction {
  if (req.is_blocked) return 'block'
  const priority: PluginAction[] = ['block', 'alert', 'mutate', 'pass']
  for (const p of priority) {
    if (req.plugin_results.some((r) => r.action === p)) return p
  }
  return 'pass'
}

function borderColor(action: PluginAction): string {
  switch (action) {
    case 'pass': return 'border-l-pass'
    case 'block': return 'border-l-block'
    case 'mutate': return 'border-l-mutate'
    case 'alert': return 'border-l-alrt'
  }
}

interface RowProps {
  req: RequestEvent
  selected: boolean
  onSelect: (req: RequestEvent) => void
  isNew: boolean
}

function RequestRow({ req, selected, onSelect, isNew }: RowProps) {
  const action = dominantAction(req)
  const model = req.model ? (req.model.length > 20 ? req.model.slice(0, 20) + '…' : req.model) : '—'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(req)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(req)}
      className={cn(
        'flex items-center gap-3 h-10 px-3 border-l-2 cursor-pointer transition-colors select-none',
        borderColor(action),
        selected ? 'bg-elevated' : 'hover:bg-white/[0.03]',
        isNew && 'row-animate',
      )}
    >
      {/* Timestamp */}
      <span className="font-mono text-[11px] text-[#4a4a56] w-16 flex-shrink-0 tabular-nums">
        {formatTime(req.timestamp)}
      </span>

      {/* Provider */}
      <div className="w-16 flex-shrink-0">
        <ProviderBadge provider={req.provider} size="xs" />
      </div>

      {/* Model */}
      <span className="font-mono text-[11px] text-[#8b8b98] flex-1 min-w-0 truncate">
        {model}
      </span>

      {/* Tokens */}
      <span className="font-mono text-[11px] text-[#4a4a56] w-14 text-right flex-shrink-0 tabular-nums">
        {req.estimated_tokens > 0 ? req.estimated_tokens.toLocaleString() : '—'}
      </span>

      {/* Plugin results */}
      <div className="flex items-center gap-1 w-32 flex-shrink-0 overflow-hidden">
        {req.plugin_results.slice(0, 3).map((r: PluginResultItem) => (
          <ActionBadge key={r.plugin_id} action={r.action} size="xs" />
        ))}
        {req.plugin_results.length > 3 && (
          <span className="text-[9px] text-[#4a4a56] font-mono">+{req.plugin_results.length - 3}</span>
        )}
      </div>

      {/* Latency */}
      <span className="font-mono text-[11px] text-[#4a4a56] w-14 text-right flex-shrink-0 tabular-nums">
        {req.latency_ms > 0 ? `${req.latency_ms}ms` : '—'}
      </span>
    </div>
  )
}

export default function RequestFeed({ onSelect, selectedId }: Props) {
  const requests = useStore((s) => s.requests)
  const prevIds = useRef<Set<string>>(new Set())
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const incoming = new Set(requests.map((r) => r.request_id))
    const fresh = new Set<string>()
    for (const id of incoming) {
      if (!prevIds.current.has(id)) fresh.add(id)
    }
    if (fresh.size > 0) {
      setNewIds(fresh)
      const timer = setTimeout(() => setNewIds(new Set()), 500)
      prevIds.current = incoming
      return () => clearTimeout(timer)
    }
    prevIds.current = incoming
  }, [requests])

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-2 h-2 rounded-full bg-[#4a4a56] pulse-dot" />
        <p className="text-sm text-[#4a4a56] font-mono">Waiting for requests…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto h-full">
      {/* Header row */}
      <div className="flex items-center gap-3 h-8 px-3 border-l-2 border-l-transparent border-b border-white/[0.07] flex-shrink-0">
        <span className="font-mono text-[10px] text-[#4a4a56] w-16 flex-shrink-0 uppercase tracking-wider">Time</span>
        <span className="font-mono text-[10px] text-[#4a4a56] w-16 flex-shrink-0 uppercase tracking-wider">Provider</span>
        <span className="font-mono text-[10px] text-[#4a4a56] flex-1 uppercase tracking-wider">Model</span>
        <span className="font-mono text-[10px] text-[#4a4a56] w-14 text-right flex-shrink-0 uppercase tracking-wider">Tokens</span>
        <span className="font-mono text-[10px] text-[#4a4a56] w-32 flex-shrink-0 uppercase tracking-wider">Result</span>
        <span className="font-mono text-[10px] text-[#4a4a56] w-14 text-right flex-shrink-0 uppercase tracking-wider">Latency</span>
      </div>

      {/* Rows */}
      {requests.map((req) => (
        <RequestRow
          key={req.request_id}
          req={req}
          selected={selectedId === req.request_id}
          onSelect={onSelect}
          isNew={newIds.has(req.request_id)}
        />
      ))}
    </div>
  )
}
