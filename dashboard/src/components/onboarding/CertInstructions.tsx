import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '../../lib/cn'

interface CopyButtonProps {
  text: string
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard not available
    }
  }

  return (
    <button
      onClick={() => void handleCopy()}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors flex-shrink-0',
        copied
          ? 'text-pass bg-pass/10 border border-pass/20'
          : 'text-[#8b8b98] hover:text-[#e4e4e9] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07]',
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

interface CodeLineProps {
  code: string
}

function CodeLine({ code }: CodeLineProps) {
  return (
    <div className="flex items-center justify-between gap-3 bg-bg border border-white/[0.07] rounded px-3 py-2 mt-1.5">
      <code className="font-mono text-[11px] text-[#e4e4e9] flex-1 min-w-0 truncate">{code}</code>
      <CopyButton text={code} />
    </div>
  )
}

type TabId = 'claude' | 'python' | 'generic'

const TABS: { id: TabId; label: string }[] = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'python', label: 'Python Agent' },
  { id: 'generic', label: 'Generic' },
]

export default function CertInstructions() {
  const [activeTab, setActiveTab] = useState<TabId>('claude')

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.07] pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-t transition-colors',
              activeTab === tab.id
                ? 'text-[#e4e4e9] border-b-2 border-pass'
                : 'text-[#8b8b98] hover:text-[#e4e4e9]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-[#8b8b98]">
          First, download the CA certificate:
        </p>
        <CodeLine code="curl -o agentwall-ca.pem http://localhost:9090/api/cert" />

        {activeTab === 'claude' && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-xs text-[#8b8b98]">Set these environment variables before running Claude Code:</p>
            <CodeLine code="HTTPS_PROXY=http://localhost:8080" />
            <CodeLine code="NODE_EXTRA_CA_CERTS=/path/to/agentwall-ca.pem" />
          </div>
        )}

        {activeTab === 'python' && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-xs text-[#8b8b98]">Set these environment variables in your Python agent:</p>
            <CodeLine code="HTTPS_PROXY=http://localhost:8080" />
            <CodeLine code="REQUESTS_CA_BUNDLE=/path/to/agentwall-ca.pem" />
          </div>
        )}

        {activeTab === 'generic' && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-xs text-[#8b8b98]">Set these environment variables for any HTTP client:</p>
            <CodeLine code="HTTPS_PROXY=http://localhost:8080" />
            <CodeLine code="SSL_CERT_FILE=/path/to/agentwall-ca.pem" />
            <CodeLine code="NODE_EXTRA_CA_CERTS=/path/to/agentwall-ca.pem" />
            <CodeLine code="REQUESTS_CA_BUNDLE=/path/to/agentwall-ca.pem" />
          </div>
        )}
      </div>
    </div>
  )
}
