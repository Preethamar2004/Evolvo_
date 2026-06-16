import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { onboardingApi } from '@/services/apiServices'

/**
 * OnboardingGuard — for authenticated users who haven't completed onboarding,
 * redirect them to /onboarding before they can access app pages.
 *
 * Uses the local user.onboarding_complete flag as the fast-path check.
 * Falls back to an API call if the flag is missing.
 */
export default function OnboardingGuard({ children }) {
  const user = useAuthStore((s) => s.user)
  const [checking, setChecking] = useState(false)
  const [isComplete, setIsComplete] = useState(null)

  useEffect(() => {
    // If the user object has the flag, use it directly
    if (user?.onboarding_complete !== undefined) {
      setIsComplete(user.onboarding_complete)
      return
    }

    // Otherwise check via API
    setChecking(true)
    onboardingApi.getStatus()
      .then(({ data }) => setIsComplete(data.onboarding_complete))
      .catch(() => setIsComplete(true)) // On error, don't block the user
      .finally(() => setChecking(false))
  }, [user])

  if (checking || isComplete === null) {
    // Show minimal loader while checking
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-surface-950)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (!isComplete) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
