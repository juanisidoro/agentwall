import { create } from 'zustand'
import type { RequestEvent, AlertEvent } from '../types/events'
import type { Stats } from '../types/plugin'

interface StoreState {
  requests: RequestEvent[]
  stats: Stats | null
  alerts: AlertEvent[]
  wsStatus: 'connected' | 'disconnected' | 'connecting'

  addRequest: (req: RequestEvent) => void
  updateRequest: (req: RequestEvent) => void
  addAlert: (alert: AlertEvent) => void
  setStats: (stats: Stats) => void
  setWsStatus: (status: 'connected' | 'disconnected' | 'connecting') => void
  removeAlert: (alertId: string) => void
}

const MAX_REQUESTS = 200
const MAX_ALERTS = 100

export const useStore = create<StoreState>((set) => ({
  requests: [],
  stats: null,
  alerts: [],
  wsStatus: 'disconnected',

  addRequest: (req) =>
    set((state) => {
      const filtered = state.requests.filter((r) => r.request_id !== req.request_id)
      const updated = [req, ...filtered]
      return { requests: updated.slice(0, MAX_REQUESTS) }
    }),

  updateRequest: (req) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.request_id === req.request_id ? req : r,
      ),
    })),

  addAlert: (alert) =>
    set((state) => {
      const filtered = state.alerts.filter((a) => a.alert_id !== alert.alert_id)
      const updated = [alert, ...filtered]
      return { alerts: updated.slice(0, MAX_ALERTS) }
    }),

  setStats: (stats) => set({ stats }),

  setWsStatus: (wsStatus) => set({ wsStatus }),

  removeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.alert_id !== alertId),
    })),
}))
