import type { Stats, IPlugin, RequestLog, IAlert } from '../types/plugin'

export interface ApiError {
  status: number
  message: string
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError }

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<Result<T>> {
  try {
    const res = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })
    if (!res.ok) {
      let message = res.statusText
      try {
        const body = await res.json() as { detail?: string; message?: string }
        message = body.detail ?? body.message ?? message
      } catch {
        // ignore parse errors
      }
      return { ok: false, error: { status: res.status, message } }
    }
    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: { status: 0, message } }
  }
}

export interface HealthResponse {
  status: string
  proxy_running: boolean
}

export function health(): Promise<Result<HealthResponse>> {
  return request<HealthResponse>('/api/health')
}

export function stats(): Promise<Result<Stats>> {
  return request<Stats>('/api/stats')
}

export interface LogsParams {
  provider?: string
  blocked?: boolean
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

export function logs(params?: LogsParams): Promise<Result<RequestLog[]>> {
  const query = new URLSearchParams()
  if (params?.provider) query.set('provider', params.provider)
  if (params?.blocked !== undefined) query.set('blocked', String(params.blocked))
  if (params?.start_date) query.set('start_date', params.start_date)
  if (params?.end_date) query.set('end_date', params.end_date)
  if (params?.page !== undefined) query.set('page', String(params.page))
  if (params?.limit !== undefined) query.set('limit', String(params.limit))
  const qs = query.toString()
  return request<RequestLog[]>(`/api/logs${qs ? `?${qs}` : ''}`)
}

export function log(id: string): Promise<Result<RequestLog>> {
  return request<RequestLog>(`/api/logs/${id}`)
}

export interface AlertsParams {
  acknowledged?: boolean
  page?: number
  limit?: number
}

export function alerts(params?: AlertsParams): Promise<Result<IAlert[]>> {
  const query = new URLSearchParams()
  if (params?.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged))
  if (params?.page !== undefined) query.set('page', String(params.page))
  if (params?.limit !== undefined) query.set('limit', String(params.limit))
  const qs = query.toString()
  return request<IAlert[]>(`/api/alerts${qs ? `?${qs}` : ''}`)
}

export function acknowledgeAlert(id: string): Promise<Result<{ ok: boolean }>> {
  return request<{ ok: boolean }>(`/api/alerts/${id}/acknowledge`, { method: 'POST' })
}

export function plugins(): Promise<Result<IPlugin[]>> {
  return request<IPlugin[]>('/api/plugins')
}

export function togglePlugin(id: string): Promise<Result<IPlugin>> {
  return request<IPlugin>(`/api/plugins/${id}/toggle`, { method: 'PUT' })
}

export function deletePlugin(id: string): Promise<Result<{ ok: boolean }>> {
  return request<{ ok: boolean }>(`/api/plugins/${id}`, { method: 'DELETE' })
}

export function getPluginConfig(id: string): Promise<Result<Record<string, unknown>>> {
  return request<Record<string, unknown>>(`/api/plugins/${id}/config`)
}

export function setPluginConfig(
  id: string,
  config: Record<string, unknown>,
): Promise<Result<Record<string, unknown>>> {
  return request<Record<string, unknown>>(`/api/plugins/${id}/config`, {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

export interface InstallPluginData {
  pip_package?: string
  code?: string
  plugin_id?: string
}

export function installPlugin(data: InstallPluginData): Promise<Result<IPlugin>> {
  return request<IPlugin>('/api/plugins/install', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function cert(): Promise<Response> {
  return fetch('/api/cert')
}

export interface Settings {
  onboarding_complete?: string
  agent_id?: string
  [key: string]: string | undefined
}

export function settings(): Promise<Result<Settings>> {
  return request<Settings>('/api/settings')
}

export function updateSettings(newSettings: Settings): Promise<Result<Settings>> {
  return request<Settings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings: newSettings }),
  })
}
