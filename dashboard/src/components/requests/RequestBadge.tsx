import { cn } from '../../lib/cn'
import type { PluginAction, Provider } from '../../types/plugin'

type Size = 'sm' | 'xs'

interface ActionBadgeProps {
  action: PluginAction
  size?: Size
}

const ACTION_STYLES: Record<PluginAction, { bg: string; text: string; border: string }> = {
  pass: {
    bg: 'bg-pass/10',
    text: 'text-pass',
    border: 'border-pass/20',
  },
  block: {
    bg: 'bg-block/10',
    text: 'text-block',
    border: 'border-block/20',
  },
  mutate: {
    bg: 'bg-mutate/10',
    text: 'text-mutate',
    border: 'border-mutate/20',
  },
  alert: {
    bg: 'bg-alrt/10',
    text: 'text-alrt',
    border: 'border-alrt/20',
  },
}

export function ActionBadge({ action, size = 'sm' }: ActionBadgeProps) {
  const styles = ACTION_STYLES[action]
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium uppercase tracking-wider border rounded',
        styles.bg,
        styles.text,
        styles.border,
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[9px] px-1 py-px',
      )}
    >
      {action}
    </span>
  )
}

interface ProviderBadgeProps {
  provider: Provider
  size?: Size
}

const PROVIDER_STYLES: Record<Provider, string> = {
  anthropic: 'text-anthropic',
  openai: 'text-openai',
  unknown: 'text-[#6b7280]',
}

export function ProviderBadge({ provider, size = 'sm' }: ProviderBadgeProps) {
  const label = provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Unknown'
  return (
    <span
      className={cn(
        'font-mono font-medium',
        PROVIDER_STYLES[provider],
        size === 'sm' ? 'text-[11px]' : 'text-[10px]',
      )}
    >
      {label}
    </span>
  )
}
