import { useState } from 'react'
import { X, Package, Code } from 'lucide-react'
import * as api from '../../api/client'
import { cn } from '../../lib/cn'

interface Props {
  onClose: () => void
  onInstalled: () => void
}

type Tab = 'pypi' | 'code'

export default function PluginInstall({ onClose, onInstalled }: Props) {
  const [tab, setTab] = useState<Tab>('pypi')
  const [pipPackage, setPipPackage] = useState('')
  const [code, setCode] = useState('')
  const [pluginId, setPluginId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleInstall() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const data =
      tab === 'pypi'
        ? { pip_package: pipPackage.trim() }
        : { code: code.trim(), plugin_id: pluginId.trim() || undefined }

    const result = await api.installPlugin(data)
    setLoading(false)

    if (!result.ok) {
      setError(result.error.message)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      onInstalled()
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 fade-animate"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-surface border border-white/[0.07] rounded-xl shadow-2xl panel-animate">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h2 className="font-semibold text-sm text-[#e4e4e9]">Install Plugin</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#4a4a56] hover:text-[#e4e4e9] hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-white/[0.07] pb-px">
            {([
              { id: 'pypi' as Tab, label: 'From PyPI', icon: Package },
              { id: 'code' as Tab, label: 'Paste Code', icon: Code },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors',
                  tab === id
                    ? 'text-[#e4e4e9] border-b-2 border-pass'
                    : 'text-[#8b8b98] hover:text-[#e4e4e9]',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* PyPI tab */}
          {tab === 'pypi' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#4a4a56] mb-2 font-medium">
                  Package Name
                </label>
                <input
                  type="text"
                  value={pipPackage}
                  onChange={(e) => setPipPackage(e.target.value)}
                  placeholder="agentwall-plugin-example"
                  className="w-full bg-bg border border-white/[0.07] rounded-md px-3 py-2.5 text-sm font-mono text-[#e4e4e9] outline-none focus:border-white/20 transition-colors placeholder-[#4a4a56]"
                  onKeyDown={(e) => e.key === 'Enter' && !loading && void handleInstall()}
                />
              </div>
            </div>
          )}

          {/* Code tab */}
          {tab === 'code' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#4a4a56] mb-2 font-medium">
                  Plugin ID (optional)
                </label>
                <input
                  type="text"
                  value={pluginId}
                  onChange={(e) => setPluginId(e.target.value)}
                  placeholder="my-plugin"
                  className="w-full bg-bg border border-white/[0.07] rounded-md px-3 py-2.5 text-sm font-mono text-[#e4e4e9] outline-none focus:border-white/20 transition-colors placeholder-[#4a4a56]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#4a4a56] mb-2 font-medium">
                  Python Code
                </label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="# Paste your plugin code here..."
                  rows={10}
                  className="w-full bg-bg border border-white/[0.07] rounded-md px-3 py-2.5 text-sm font-mono text-[#e4e4e9] outline-none focus:border-white/20 transition-colors placeholder-[#4a4a56] resize-y"
                />
              </div>
            </div>
          )}

          {/* Error / success */}
          {error && (
            <div className="mt-3 bg-block/10 border border-block/20 rounded-md px-3 py-2">
              <p className="text-xs text-block">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-3 bg-pass/10 border border-pass/20 rounded-md px-3 py-2">
              <p className="text-xs text-pass">Plugin installed successfully!</p>
            </div>
          )}

          {/* Install button */}
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => void handleInstall()}
              disabled={loading || success || (tab === 'pypi' ? !pipPackage.trim() : !code.trim())}
              className={cn(
                'px-5 py-2 rounded-md text-sm font-medium transition-colors',
                loading || success || (tab === 'pypi' ? !pipPackage.trim() : !code.trim())
                  ? 'bg-white/[0.06] text-[#4a4a56] cursor-not-allowed'
                  : 'bg-pass/10 border border-pass/30 text-pass hover:bg-pass/20',
              )}
            >
              {loading ? 'Installing…' : success ? 'Installed!' : 'Install'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
