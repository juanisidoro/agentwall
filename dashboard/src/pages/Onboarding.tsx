import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/client'
import OnboardingWizard from '../components/onboarding/OnboardingWizard'
import { Shield } from 'lucide-react'

export default function Onboarding() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    api.settings().then((result) => {
      if (result.ok && result.data.onboarding_complete === 'true') {
        navigate('/')
      } else {
        setChecked(true)
      }
    }).catch(() => {
      setChecked(true)
    })
  }, [navigate])

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-full">
        <Shield className="w-6 h-6 text-[#4a4a56] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full overflow-y-auto py-12">
      <OnboardingWizard />
    </div>
  )
}
