import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ChevronRight, ChevronLeft, Download } from 'lucide-react'
import { cn } from '../../lib/cn'
import * as api from '../../api/client'
import { useStore } from '../../store/useStore'
import CertInstructions from './CertInstructions'

type Step = 1 | 2 | 3 | 4 | 5

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={cn(
            'h-1 rounded-full transition-all duration-300',
            n === current
              ? 'w-6 bg-pass'
              : n < current
                ? 'w-4 bg-pass/40'
                : 'w-4 bg-white/[0.12]',
          )}
        />
      ))}
    </div>
  )
}

interface NavButtonsProps {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  hideBack?: boolean
}

function NavButtons({ onBack, onNext, nextLabel = 'Next', nextDisabled, hideBack }: NavButtonsProps) {
  return (
    <div className="flex justify-between items-center mt-8">
      <div>
        {!hideBack && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#8b8b98] hover:text-[#e4e4e9] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
      </div>
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className={cn(
            'flex items-center gap-1.5 px-5 py-2 rounded-md text-sm font-medium transition-colors',
            nextDisabled
              ? 'bg-white/[0.06] text-[#4a4a56] cursor-not-allowed'
              : 'bg-pass/10 border border-pass/30 text-pass hover:bg-pass/20',
          )}
        >
          {nextLabel}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// Step 1: Welcome
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-pass/10 border border-pass/20 flex items-center justify-center">
        <Shield className="w-8 h-8 text-pass" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-[#e4e4e9] mb-2">Welcome to AgentWall</h2>
        <p className="text-sm text-[#8b8b98] max-w-sm leading-relaxed">
          Secure your AI agent's traffic with transparent interception, real-time analysis,
          and configurable security plugins.
        </p>
      </div>
      <div className="flex flex-col gap-3 text-sm text-[#8b8b98] w-full max-w-sm text-left mt-2">
        {['Intercept HTTPS calls to Anthropic & OpenAI', 'Run security plugins on every request', 'Monitor, block, and alert in real time'].map((item) => (
          <div key={item} className="flex items-start gap-2">
            <span className="text-pass mt-0.5">✓</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <NavButtons onNext={onNext} nextLabel="Get Started" hideBack />
    </div>
  )
}

// Step 2: Agent ID
function StepAgentId({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [agentId, setAgentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    if (!agentId.trim()) { onNext(); return }
    setSaving(true)
    setError(null)
    const result = await api.updateSettings({ agent_id: agentId.trim() })
    setSaving(false)
    if (!result.ok) { setError(result.error.message); return }
    onNext()
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div>
        <h2 className="text-xl font-semibold text-[#e4e4e9] mb-1">Name your agent</h2>
        <p className="text-sm text-[#8b8b98]">
          Give this agent a unique identifier so you can track its traffic.
        </p>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-[#4a4a56] mb-2 font-medium">
          Agent ID
        </label>
        <input
          type="text"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          placeholder="my-coding-agent"
          className="w-full bg-bg border border-white/[0.07] rounded-md px-3 py-2.5 text-sm font-mono text-[#e4e4e9] outline-none focus:border-white/20 transition-colors placeholder-[#4a4a56]"
        />
        {error && <p className="mt-1.5 text-xs text-block">{error}</p>}
        <p className="mt-1.5 text-xs text-[#4a4a56]">You can skip this and set it later.</p>
      </div>
      <NavButtons onBack={onBack} onNext={() => void handleNext()} nextDisabled={saving} />
    </div>
  )
}

// Step 3: Certificate
function StepCert({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await api.cert()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'agentwall-ca.pem'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div>
        <h2 className="text-xl font-semibold text-[#e4e4e9] mb-1">Install the CA Certificate</h2>
        <p className="text-sm text-[#8b8b98]">
          AgentWall uses a local CA to decrypt HTTPS traffic. Install it in your agent's environment.
        </p>
      </div>
      <button
        onClick={() => void handleDownload()}
        disabled={downloading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-pass/10 border border-pass/20 text-pass text-sm font-medium hover:bg-pass/20 transition-colors w-fit"
      >
        <Download className="w-4 h-4" />
        {downloading ? 'Downloading…' : 'Download Certificate'}
      </button>
      <CertInstructions />
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  )
}

// Step 4: Waiting for first request
function StepWaiting({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const requests = useStore((s) => s.requests)
  const hasAutoAdvanced = useRef(false)

  useEffect(() => {
    if (requests.length > 0 && !hasAutoAdvanced.current) {
      hasAutoAdvanced.current = true
      onNext()
    }
  }, [requests, onNext])

  return (
    <div className="flex flex-col items-center text-center gap-6 w-full max-w-sm">
      <div>
        <h2 className="text-xl font-semibold text-[#e4e4e9] mb-1">Waiting for first request</h2>
        <p className="text-sm text-[#8b8b98]">
          Send any request from your agent through the proxy. AgentWall will automatically advance when it detects traffic.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute w-16 h-16 rounded-full border border-pass/20 animate-ping" />
          <div className="absolute w-12 h-12 rounded-full border border-pass/30 animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="w-3 h-3 rounded-full bg-pass pulse-dot" />
        </div>
        <p className="font-mono text-xs text-[#4a4a56]">Listening on :8080</p>
      </div>
      <NavButtons onBack={onBack} hideBack={false} />
    </div>
  )
}

// Step 5: Done
function StepDone() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  async function handleDone() {
    setSaving(true)
    await api.updateSettings({ onboarding_complete: 'true' })
    setSaving(false)
    navigate('/')
  }

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-full bg-pass/10 border border-pass/20 flex items-center justify-center">
        <span className="text-2xl">✓</span>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-[#e4e4e9] mb-2">You're all set!</h2>
        <p className="text-sm text-[#8b8b98] max-w-xs leading-relaxed">
          AgentWall intercepted your first request. Head to the dashboard to monitor traffic in real time.
        </p>
      </div>
      <button
        onClick={() => void handleDone()}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-pass/10 border border-pass/30 text-pass text-sm font-semibold hover:bg-pass/20 transition-colors mt-2"
      >
        {saving ? 'Saving…' : 'Go to Dashboard'}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1)

  function next() {
    setStep((s) => Math.min(s + 1, 5) as Step)
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1) as Step)
  }

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto px-6">
      <div className="mb-8">
        <StepIndicator current={step} total={5} />
      </div>

      {step === 1 && <StepWelcome onNext={next} />}
      {step === 2 && <StepAgentId onBack={back} onNext={next} />}
      {step === 3 && <StepCert onBack={back} onNext={next} />}
      {step === 4 && <StepWaiting onBack={back} onNext={next} />}
      {step === 5 && <StepDone />}
    </div>
  )
}
