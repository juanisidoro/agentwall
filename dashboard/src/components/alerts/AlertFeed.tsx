import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import * as api from '../../api/client'
import type { IAlert } from '../../types/plugin'
import { cn } from '../../lib/cn'

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString()
}

interface AlertRowProps {
  alert: IAlert
  onAcknowledge: (id: string) => void
  acknowledging: boolean
}

function AlertRow({ alert, onAcknowledge, acknowledging }: AlertRowProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-white/[0.07] rounded-lg px-4 py-3 flex flex-col gap-2 transition-opacity',
        alert.acknowledged && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-alrt/10 text-alrt border border-alrt/20">
            {alert.plugin_id}
          </span>
          <span className="text-xs text-[#4a4a56] font-mono">{formatTimestamp(alert.timestamp)}</span>
        </div>
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.alert_id)}
            disabled={acknowledging}
            className={cn(
              'flex-shrink-0 text-xs px-2.5 py-1 rounded border transition-colors',
              acknowledging
                ? 'text-[#4a4a56] border-white/[0.07] cursor-not-allowed'
                : 'text-[#8b8b98] border-white/[0.07] hover:text-[#e4e4e9] hover:bg-white/[0.06]',
            )}
          >
            Acknowledge
          </button>
        )}
        {alert.acknowledged && (
          <span className="flex-shrink-0 text-xs text-[#4a4a56] font-mono">ack'd</span>
        )}
      </div>
      <p className="text-sm text-[#e4e4e9] leading-relaxed">{alert.message}</p>
      {Object.keys(alert.payload).length > 0 && (
        <details className="group">
          <summary className="text-xs text-[#4a4a56] cursor-pointer hover:text-[#8b8b98] transition-colors">
            Payload
          </summary>
          <pre className="mt-1.5 font-mono text-[10px] text-[#8b8b98] bg-bg border border-white/[0.07] rounded p-2 overflow-x-auto">
            {JSON.stringify(alert.payload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

export default function AlertFeed() {
  const [alertList, setAlertList] = useState<IAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())

  const loadAlerts = useCallback(async () => {
    const result = await api.alerts(showAcknowledged ? { acknowledged: true } : undefined)
    if (result.ok) setAlertList(result.data)
    setLoading(false)
  }, [showAcknowledged])

  useEffect(() => {
    setLoading(true)
    void loadAlerts()
  }, [loadAlerts])

  async function handleAcknowledge(alertId: string) {
    setAcknowledging((prev) => new Set(prev).add(alertId))
    await api.acknowledgeAlert(alertId)
    setAcknowledging((prev) => {
      const next = new Set(prev)
      next.delete(alertId)
      return next
    })
    setAlertList((prev) =>
      prev.map((a) =>
        a.alert_id === alertId ? { ...a, acknowledged: true } : a,
      ),
    )
  }

  const displayList = showAcknowledged
    ? alertList
    : alertList.filter((a) => !a.acknowledged)

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto px-4 py-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(e) => setShowAcknowledged(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#a78bfa]"
          />
          <span className="text-xs text-[#8b8b98]">Show acknowledged</span>
        </label>
        <span className="text-xs text-[#4a4a56] ml-auto">
          {displayList.length} alert{displayList.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-2 h-2 rounded-full bg-[#4a4a56] pulse-dot" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Bell className="w-10 h-10 text-[#4a4a56]" strokeWidth={1} />
          <p className="text-sm text-[#4a4a56]">No alerts.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayList.map((alert) => (
            <AlertRow
              key={alert.alert_id}
              alert={alert}
              onAcknowledge={(id) => void handleAcknowledge(id)}
              acknowledging={acknowledging.has(alert.alert_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
