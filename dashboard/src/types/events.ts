export interface PluginResultItem {
  plugin_id: string
  action: 'pass' | 'block' | 'mutate' | 'alert'
  reason: string | null
}

export interface RequestEvent {
  type: 'request'
  request_id: string
  provider: 'anthropic' | 'openai' | 'unknown'
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

export interface AlertEvent {
  type: 'alert'
  alert_id: string
  plugin_id: string
  request_id: string
  message: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface PingEvent {
  type: 'ping'
}

export type WsEvent = RequestEvent | AlertEvent | PingEvent
