export type PluginAction = 'pass' | 'block' | 'mutate' | 'alert'
export type Provider = 'anthropic' | 'openai' | 'unknown'

export interface PluginManifest {
  contract_version: string
  id: string
  name: string
  version: string
  runtime: string
  hooks: string[]
  config_schema: Record<string, unknown>
  description?: string
  author?: string
  on_error?: 'pass' | 'block'
}

export interface IPlugin {
  id: string
  name: string
  version: string
  active: boolean
  order: number
  manifest: PluginManifest
}

export interface PluginResultItem {
  plugin_id: string
  action: PluginAction
  reason: string | null
}

export interface RequestLog {
  request_id: string
  provider: Provider
  model: string | null
  estimated_tokens: number
  is_blocked: boolean
  block_reason: string | null
  plugin_results: PluginResultItem[]
  latency_ms: number
  input_tokens: number | null
  output_tokens: number | null
  timestamp: string
}

export interface IAlert {
  alert_id: string
  plugin_id: string
  request_id: string
  message: string
  payload: Record<string, unknown>
  acknowledged: boolean
  timestamp: string
}

export interface Stats {
  total_today: number
  blocked_today: number
  alerts_today: number
  avg_latency_ms: number
  by_provider: Record<string, number>
}
