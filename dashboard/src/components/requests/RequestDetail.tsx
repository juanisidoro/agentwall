import { X } from 'lucide-react'
import type { RequestEvent } from '../../types/events'
import { ActionBadge, ProviderBadge } from './RequestBadge'
import { cn } from '../../lib/cn'

interface Props {
  request: RequestEvent
  onClose: () => void
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString()
}

function shortId(id: string): string {
  return id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-8)}` : id
}

interface MetaRowProps {
  label: string
  value: string | number | null
  mono?: boolean
}

function MetaRow({ label, value, mono = false }: MetaRowProps) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/[0.04]">
      <span className="text-xs text-[#4a4a56] uppercase tracking-wider font-medium">{label}</span>
      <span className={cn('text-xs text-[#e4e4e9] text-right', mono && 'font-mono')}>
        {value !== null && value !== undefined ? String(value) : '—'}
      </span>
    </div>
  )
}

export default function RequestDetail({ request, onClose }: Props) {
  return (
    <div className="panel-animate flex flex-col h-full bg-surface border-l border-white/[0.07] overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
          <span className="font-mono text-xs text-[#4a4a56]">Request ID</span>
          <span className="font-mono text-[11px] text-[#e4e4e9] truncate">{shortId(request.request_id)}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-[#4a4a56] hover:text-[#e4e4e9] hover:bg-white/[0.06] transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 flex flex-col gap-5">
        {/* Block reason banner */}
        {request.is_blocked && request.block_reason && (
          <div className="bg-block/10 border border-block/20 rounded-md px-3 py-2.5">
            <p className="text-xs font-medium text-block mb-0.5 uppercase tracking-wider">Blocked</p>
            <p className="text-xs text-[#e4e4e9]">{request.block_reason}</p>
          </div>
        )}

        {/* Metadata */}
        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-[#4a4a56] font-semibold mb-2">
            Metadata
          </h3>
          <div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
              <span className="text-xs text-[#4a4a56] uppercase tracking-wider font-medium">Provider</span>
              <ProviderBadge provider={request.provider} size="sm" />
            </div>
            <MetaRow label="Model" value={request.model} mono />
            <MetaRow label="Timestamp" value={formatTimestamp(request.timestamp)} />
            <MetaRow label="Latency" value={request.latency_ms > 0 ? `${request.latency_ms} ms` : null} mono />
            <MetaRow label="Est. Tokens" value={request.estimated_tokens > 0 ? request.estimated_tokens.toLocaleString() : null} mono />
            <MetaRow label="Input Tokens" value={request.input_tokens !== null ? request.input_tokens.toLocaleString() : null} mono />
            <MetaRow label="Output Tokens" value={request.output_tokens !== null ? request.output_tokens.toLocaleString() : null} mono />
          </div>
        </section>

        {/* Plugin pipeline */}
        {request.plugin_results.length > 0 && (
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-[#4a4a56] font-semibold mb-2">
              Plugin Pipeline
            </h3>
            <div className="flex flex-col gap-2">
              {request.plugin_results.map((result) => (
                <div
                  key={result.plugin_id}
                  className="bg-bg rounded-md px-3 py-2 border border-white/[0.07]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-[#8b8b98]">{result.plugin_id}</span>
                    <ActionBadge action={result.action} size="xs" />
                  </div>
                  {result.reason && (
                    <p className="text-xs text-[#4a4a56] leading-relaxed">{result.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {request.plugin_results.length === 0 && (
          <p className="text-xs text-[#4a4a56] italic">No plugin results recorded.</p>
        )}
      </div>
    </div>
  )
}
