import { useEffect, useState, useCallback } from 'react'
import { Plus, Puzzle } from 'lucide-react'
import * as api from '../api/client'
import type { IPlugin } from '../types/plugin'
import PluginCard from '../components/plugins/PluginCard'
import PluginInstall from '../components/plugins/PluginInstall'
import PluginConfigForm from '../components/plugins/PluginConfigForm'
import { cn } from '../lib/cn'

export default function Plugins() {
  const [pluginList, setPluginList] = useState<IPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [showInstall, setShowInstall] = useState(false)
  const [configPlugin, setConfigPlugin] = useState<IPlugin | null>(null)

  const loadPlugins = useCallback(async () => {
    const result = await api.plugins()
    if (result.ok) setPluginList(result.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadPlugins()
  }, [loadPlugins])

  async function handleToggle(plugin: IPlugin) {
    await api.togglePlugin(plugin.id)
    void loadPlugins()
  }

  async function handleDelete(plugin: IPlugin) {
    await api.deletePlugin(plugin.id)
    if (configPlugin?.id === plugin.id) setConfigPlugin(null)
    void loadPlugins()
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main */}
      <div
        className={cn(
          'flex-1 overflow-y-auto p-4 transition-all duration-200',
          configPlugin ? 'md:mr-[380px]' : '',
        )}
      >
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[#4a4a56]">
            {loading ? '…' : `${pluginList.length} plugin${pluginList.length !== 1 ? 's' : ''} installed`}
          </p>
          <button
            onClick={() => setShowInstall(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-pass/10 border border-pass/30 text-pass text-xs font-medium hover:bg-pass/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Install Plugin
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-2 h-2 rounded-full bg-[#4a4a56] pulse-dot" />
          </div>
        ) : pluginList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Puzzle className="w-10 h-10 text-[#4a4a56]" strokeWidth={1} />
            <p className="text-sm text-[#4a4a56]">No plugins installed.</p>
            <button
              onClick={() => setShowInstall(true)}
              className="text-xs text-pass hover:underline"
            >
              Install your first plugin
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pluginList.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                onToggle={() => void handleToggle(plugin)}
                onDelete={() => void handleDelete(plugin)}
                onConfigure={() => setConfigPlugin(plugin)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Config panel — desktop */}
      {configPlugin && (
        <>
          <div className="hidden md:block absolute right-0 top-[52px] bottom-0 w-[380px]">
            <PluginConfigForm plugin={configPlugin} onClose={() => setConfigPlugin(null)} />
          </div>

          {/* Mobile overlay */}
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="flex-1 bg-black/60" onClick={() => setConfigPlugin(null)} />
            <div className="w-full max-w-sm h-full">
              <PluginConfigForm plugin={configPlugin} onClose={() => setConfigPlugin(null)} />
            </div>
          </div>
        </>
      )}

      {/* Install modal */}
      {showInstall && (
        <PluginInstall
          onClose={() => setShowInstall(false)}
          onInstalled={() => void loadPlugins()}
        />
      )}
    </div>
  )
}
