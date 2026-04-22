import { useState } from 'react'
import { Trash2, Settings } from 'lucide-react'
import type { IPlugin } from '../../types/plugin'
import { cn } from '../../lib/cn'

interface Props {
  plugin: IPlugin
  onToggle: () => void
  onDelete: () => void
  onConfigure: () => void
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer',
        checked ? 'bg-pass/80' : 'bg-white/[0.12]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export default function PluginCard({ plugin, onToggle, onDelete, onConfigure }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-surface border border-white/[0.07] rounded-lg p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-sm text-[#e4e4e9] truncate">{plugin.name}</h3>
            <span className="font-mono text-[10px] text-[#4a4a56] flex-shrink-0">
              v{plugin.version}
            </span>
          </div>
          {plugin.manifest.author && (
            <p className="text-xs text-[#4a4a56]">by {plugin.manifest.author}</p>
          )}
        </div>
        <ToggleSwitch checked={plugin.active} onChange={onToggle} />
      </div>

      {/* Description */}
      {plugin.manifest.description && (
        <p className="text-xs text-[#8b8b98] leading-relaxed line-clamp-2">
          {plugin.manifest.description}
        </p>
      )}

      {/* Hooks */}
      {plugin.manifest.hooks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plugin.manifest.hooks.map((hook) => (
            <span
              key={hook}
              className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-[#4a4a56] border border-white/[0.07]"
            >
              {hook}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.07]">
        <button
          onClick={onConfigure}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-[#8b8b98] hover:text-[#e4e4e9] hover:bg-white/[0.06] transition-colors border border-white/[0.07]"
        >
          <Settings className="w-3 h-3" />
          Configure
        </button>

        <div className="flex-1" />

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b8b98]">Remove?</span>
            <button
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
              className="px-2.5 py-1 rounded text-xs text-block border border-block/20 hover:bg-block/10 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 rounded text-xs text-[#8b8b98] hover:text-[#e4e4e9] border border-white/[0.07] hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-[#4a4a56] hover:text-block hover:bg-block/10 hover:border-block/20 transition-colors border border-transparent"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}
