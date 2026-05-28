import React, { useState, useEffect } from 'react'
import { SignUp } from './components/onboarding/SignUp'
import { ProfileSetup } from './components/onboarding/ProfileSetup'
import { ServicesSetup } from './components/onboarding/ServicesSetup'
import { AvailabilitySetup } from './components/onboarding/AvailabilitySetup'
import { OnboardingComplete } from './components/onboarding/OnboardingComplete'

const STORAGE_KEY = 'aimarco_auth'

interface OnboardingData {
  email?: string
  password?: string
  fullName?: string
  displayName?: string
  businessType?: string
  phone?: string
  services?: any[]
  availability?: any[]
  token?: string
  professionalId?: string
  slug?: string
}

function loadPersistedData(): Partial<OnboardingData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(() => loadPersistedData())
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    if (onboardingData.token && onboardingData.professionalId) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: onboardingData.token,
          professionalId: onboardingData.professionalId,
          slug: onboardingData.slug,
          displayName: onboardingData.displayName,
        }),
      )
    }
  }, [onboardingData.token, onboardingData.professionalId, onboardingData.slug, onboardingData.displayName])

  const handleSignUpNext = (data: { email: string; password: string; token: string; professionalId: string }) => {
    setOnboardingData({ ...onboardingData, ...data })
    setCurrentStep(2)
  }

  const handleProfileNext = (data: { fullName: string; displayName: string; businessType: string; phone: string; slug: string }) => {
    setOnboardingData({ ...onboardingData, ...data })
    setCurrentStep(3)
  }

  const handleServicesNext = (services: any[]) => {
    setOnboardingData({ ...onboardingData, services })
    setCurrentStep(4)
  }

  const handleAvailabilityNext = (availability: any[]) => {
    setOnboardingData({ ...onboardingData, availability })
    setCurrentStep(5)
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
  }

  return (
    <div className="font-['Inter'] relative" style={{ minHeight: '100vh' }}>
      {globalError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between">
            <span>{globalError}</span>
            <button
              onClick={() => setGlobalError(null)}
              className="text-white hover:text-gray-200 ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {globalLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D2FF] mx-auto"></div>
            <p className="mt-4 text-[#2C2C2C] font-semibold">Processando...</p>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <SignUp
          onNext={handleSignUpNext}
          setGlobalLoading={setGlobalLoading}
          setGlobalError={setGlobalError}
        />
      )}
      {currentStep === 2 && (
        <ProfileSetup
          onNext={handleProfileNext}
          onBack={handleBack}
          professionalId={onboardingData.professionalId || ''}
          token={onboardingData.token || ''}
          setGlobalLoading={setGlobalLoading}
          setGlobalError={setGlobalError}
        />
      )}
      {currentStep === 3 && (
        <ServicesSetup
          onNext={handleServicesNext}
          onBack={handleBack}
          professionalId={onboardingData.professionalId || ''}
          token={onboardingData.token || ''}
          setGlobalLoading={setGlobalLoading}
          setGlobalError={setGlobalError}
        />
      )}
      {currentStep === 4 && (
        <AvailabilitySetup
          onNext={handleAvailabilityNext}
          onBack={handleBack}
          professionalId={onboardingData.professionalId || ''}
          token={onboardingData.token || ''}
          setGlobalLoading={setGlobalLoading}
          setGlobalError={setGlobalError}
        />
      )}
      {currentStep === 5 && (
        <OnboardingComplete displayName={onboardingData.displayName || 'Profissional'} />
      )}
    </div>
  )
}
