import { useEffect, useState } from 'react'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema } from '@rjsf/utils'
import { X } from 'lucide-react'
import type { IPlugin } from '../../types/plugin'
import * as api from '../../api/client'

interface Props {
  plugin: IPlugin
  onClose: () => void
}

export default function PluginConfigForm({ plugin, onClose }: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getPluginConfig(plugin.id).then((result) => {
      if (result.ok) setFormData(result.data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [plugin.id])

  async function handleSubmit(data: { formData?: Record<string, unknown> }) {
    if (!data.formData) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    const result = await api.setPluginConfig(plugin.id, data.formData)
    setSaving(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const schema = plugin.manifest.config_schema as RJSFSchema

  return (
    <div className="panel-animate flex flex-col h-full bg-surface border-l border-white/[0.07] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
        <div className="min-w-0 pr-2">
          <p className="text-xs text-[#4a4a56] mb-0.5">Configuration</p>
          <h3 className="font-semibold text-sm text-[#e4e4e9] truncate">{plugin.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-[#4a4a56] hover:text-[#e4e4e9] hover:bg-white/[0.06] transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 flex-1">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-2 h-2 rounded-full bg-[#4a4a56] pulse-dot" />
          </div>
        )}

        {!loading && Object.keys(schema).length === 0 && (
          <p className="text-xs text-[#4a4a56] italic">This plugin has no configurable options.</p>
        )}

        {!loading && Object.keys(schema).length > 0 && (
          <>
            <Form
              schema={schema}
              validator={validator}
              formData={formData}
              onChange={(e) => setFormData(e.formData as Record<string, unknown>)}
              onSubmit={(data) => void handleSubmit(data as { formData?: Record<string, unknown> })}
              uiSchema={{
                'ui:submitButtonOptions': {
                  submitText: saving ? 'Saving…' : 'Save Configuration',
                  norender: false,
                },
              }}
            />

            {error && (
              <div className="mt-3 bg-block/10 border border-block/20 rounded-md px-3 py-2">
                <p className="text-xs text-block">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-3 bg-pass/10 border border-pass/20 rounded-md px-3 py-2">
                <p className="text-xs text-pass">Configuration saved.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
