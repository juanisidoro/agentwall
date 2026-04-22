import type { WsEvent } from '../types/events'
import { useStore } from '../store/useStore'

let socket: WebSocket | null = null
let attempt = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let manualClose = false

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws`
}

function backoffMs(): number {
  const base = Math.min(1000 * Math.pow(2, attempt), 30000)
  return base + Math.random() * 1000
}

function scheduleReconnect(): void {
  if (manualClose) return
  const delay = backoffMs()
  attempt += 1
  reconnectTimer = setTimeout(() => {
    connect()
  }, delay)
}

export function connect(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  manualClose = false
  useStore.getState().setWsStatus('connecting')

  const url = getWsUrl()
  socket = new WebSocket(url)

  socket.onopen = () => {
    attempt = 0
    useStore.getState().setWsStatus('connected')
  }

  socket.onmessage = (event: MessageEvent<string>) => {
    let parsed: WsEvent
    try {
      parsed = JSON.parse(event.data) as WsEvent
    } catch {
      return
    }

    const store = useStore.getState()

    if (parsed.type === 'request') {
      store.addRequest(parsed)
    } else if (parsed.type === 'alert') {
      store.addAlert(parsed)
    }
    // ping events are silently ignored
  }

  socket.onclose = () => {
    useStore.getState().setWsStatus('disconnected')
    socket = null
    scheduleReconnect()
  }

  socket.onerror = () => {
    // onerror always followed by onclose, which handles reconnect
    socket?.close()
  }
}

export function disconnect(): void {
  manualClose = true
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) {
    socket.close()
    socket = null
  }
  useStore.getState().setWsStatus('disconnected')
}
