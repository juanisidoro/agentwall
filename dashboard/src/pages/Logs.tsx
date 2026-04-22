import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react'
import * as api from '../api/client'
import type { RequestLog } from '../types/plugin'
import type { RequestEvent } from '../types/events'
import { ActionBadge, ProviderBadge } from '../components/requests/RequestBadge'
import RequestDetail from '../components/requests/RequestDetail'
import { cn } from '../lib/cn'

const PROVIDERS = ['all', 'anthropic', 'openai', 'unknown'] as const
type ProviderFilter = (typeof PROVIDERS)[number]

const PAGE_SIZE = 25

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString()
}

function logToEvent(log: RequestLog): RequestEvent {
  return {
    type: 'request',
    request_id: log.request_id,
    provider: log.provider,
    model: log.model,
    estimated_tokens: log.estimated_tokens,
    is_blocked: log.is_blocked,
    block_reason: log.block_reason,
    plugin_results: log.plugin_results,
    latency_ms: log.latency_ms,
    input_tokens: log.input_tokens,
    output_tokens: log.output_tokens,
    timestamp: log.timestamp,
  }
}

export default function Logs() {
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState<ProviderFilter>('all')
  const [blockedOnly, setBlockedOnly] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const params: api.LogsParams = {
      page,
      limit: PAGE_SIZE,
    }
    if (provider !== 'all') params.provider = provider
    if (blockedOnly) params.blocked = true
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const result = await api.logs(params)
    if (result.ok) {
      setLogs(result.data)
      setTotalPages(result.data.length < PAGE_SIZE ? page : page + 1)
    }
    setLoading(false)
  }, [page, provider, blockedOnly, startDate, endDate])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [provider, blockedOnly, startDate, endDate])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main */}
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden',
          selectedLog ? 'md:mr-[380px]' : '',
        )}
      >
        {/* Filter bar */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.07] flex flex-wrap items-center gap-3">
          {/* Provider */}
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderFilter)}
            className="bg-bg border border-white/[0.07] rounded px-2.5 py-1.5 text-xs text-[#e4e4e9] font-mono outline-none focus:border-white/20 appearance-none pr-6"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238b8b98' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
          >
            <option value="all">All providers</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="unknown">Unknown</option>
          </select>

          {/* Blocked only */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={blockedOnly}
              onChange={(e) => setBlockedOnly(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#f03e5e]"
            />
            <span className="text-xs text-[#8b8b98]">Blocked only</span>
          </label>

          {/* Date range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-bg border border-white/[0.07] rounded px-2.5 py-1.5 text-xs text-[#8b8b98] font-mono outline-none focus:border-white/20"
          />
          <span className="text-xs text-[#4a4a56]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-bg border border-white/[0.07] rounded px-2.5 py-1.5 text-xs text-[#8b8b98] font-mono outline-none focus:border-white/20"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 h-8 px-4 border-b border-white/[0.07] sticky top-0 bg-bg z-10">
            {(['Timestamp', 'Provider', 'Model', 'Tokens', 'Latency', 'Result', 'ID'] as const).map((col) => (
              <span
                key={col}
                className={cn(
                  'font-mono text-[10px] text-[#4a4a56] uppercase tracking-wider',
                  col === 'Timestamp' && 'w-36 flex-shrink-0',
                  col === 'Provider' && 'w-20 flex-shrink-0',
                  col === 'Model' && 'flex-1 min-w-0',
                  col === 'Tokens' && 'w-16 text-right flex-shrink-0',
                  col === 'Latency' && 'w-16 text-right flex-shrink-0',
                  col === 'Result' && 'w-32 flex-shrink-0',
                  col === 'ID' && 'w-24 flex-shrink-0',
                )}
              >
                {col}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-2 h-2 rounded-full bg-[#4a4a56] pulse-dot" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <ScrollText className="w-10 h-10 text-[#4a4a56]" strokeWidth={1} />
              <p className="text-sm text-[#4a4a56]">No logs found.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.request_id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedLog(selectedLog?.request_id === log.request_id ? null : log)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedLog(selectedLog?.request_id === log.request_id ? null : log)}
                className={cn(
                  'flex items-center gap-3 h-10 px-4 cursor-pointer transition-colors border-b border-white/[0.04]',
                  selectedLog?.request_id === log.request_id
                    ? 'bg-elevated'
                    : 'hover:bg-white/[0.02]',
                )}
              >
                <span className="font-mono text-[11px] text-[#8b8b98] w-36 flex-shrink-0 tabular-nums">
                  {formatTimestamp(log.timestamp)}
                </span>
                <div className="w-20 flex-shrink-0">
                  <ProviderBadge provider={log.provider} size="xs" />
                </div>
                <span className="font-mono text-[11px] text-[#8b8b98] flex-1 min-w-0 truncate">
                  {log.model ?? '—'}
                </span>
                <span className="font-mono text-[11px] text-[#4a4a56] w-16 text-right flex-shrink-0 tabular-nums">
                  {log.estimated_tokens > 0 ? log.estimated_tokens.toLocaleString() : '—'}
                </span>
                <span className="font-mono text-[11px] text-[#4a4a56] w-16 text-right flex-shrink-0 tabular-nums">
                  {log.latency_ms > 0 ? `${log.latency_ms}ms` : '—'}
                </span>
                <div className="w-32 flex-shrink-0 flex items-center gap-1 overflow-hidden">
                  {log.plugin_results.slice(0, 2).map((r) => (
                    <ActionBadge key={r.plugin_id} action={r.action} size="xs" />
                  ))}
                  {log.is_blocked && !log.plugin_results.some((r) => r.action === 'block') && (
                    <ActionBadge action="block" size="xs" />
                  )}
                </div>
                <span className="font-mono text-[10px] text-[#4a4a56] w-24 flex-shrink-0 truncate">
                  {log.request_id.slice(0, 8)}…
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex-shrink-0 flex items-center justify-center gap-4 py-3 border-t border-white/[0.07]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-[#8b8b98] disabled:text-[#4a4a56] hover:text-[#e4e4e9] hover:bg-white/[0.06] disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="font-mono text-xs text-[#4a4a56] tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-[#8b8b98] disabled:text-[#4a4a56] hover:text-[#e4e4e9] hover:bg-white/[0.06] disabled:hover:bg-transparent transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedLog && (
        <>
          <div className="hidden md:block absolute right-0 top-[52px] bottom-0 w-[380px]">
            <RequestDetail request={logToEvent(selectedLog)} onClose={() => setSelectedLog(null)} />
          </div>
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="flex-1 bg-black/60" onClick={() => setSelectedLog(null)} />
            <div className="w-full max-w-sm h-full">
              <RequestDetail request={logToEvent(selectedLog)} onClose={() => setSelectedLog(null)} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
