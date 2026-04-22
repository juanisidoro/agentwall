import { cn } from '../../lib/cn'
import { useStore } from '../../store/useStore'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const wsStatus = useStore((s) => s.wsStatus)

  const dotClass = cn(
    'w-1.5 h-1.5 rounded-full flex-shrink-0',
    wsStatus === 'connected' && 'bg-pass pulse-dot',
    wsStatus === 'connecting' && 'bg-alrt pulse-dot',
    wsStatus === 'disconnected' && 'bg-block',
  )

  const labelText = wsStatus === 'connected' ? 'live' : wsStatus === 'connecting' ? 'connecting' : 'offline'
  const labelColor =
    wsStatus === 'connected'
      ? 'text-pass'
      : wsStatus === 'connecting'
        ? 'text-alrt'
        : 'text-[#4a4a56]'

  return (
    <header className="h-[52px] flex items-center px-6 border-b border-white/[0.07] bg-surface flex-shrink-0">
      <h1 className="text-sm font-semibold text-[#e4e4e9] flex-1 pl-8 md:pl-0">{title}</h1>
      <div className="flex items-center gap-2">
        <div className={dotClass} />
        <span className={cn('text-xs font-mono', labelColor)}>{labelText}</span>
      </div>
    </header>
  )
}
