import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import OnboardingGuard from '@/components/auth/OnboardingGuard'

import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import OnboardingPage from '@/pages/OnboardingPage'
import DashboardPage from '@/pages/DashboardPage'
import ProfilePage from '@/pages/ProfilePage'
import PersonalityPage from '@/pages/PersonalityPage'
import MissionsPage from '@/pages/MissionsPage'
import AchievementsPage from '@/pages/AchievementsPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import MentorPage from '@/pages/MentorPage'
import SocialFeedPage from '@/pages/SocialFeedPage'
import GuildsPage from '@/pages/GuildsPage'
import EntertainmentPage from '@/pages/EntertainmentPage'
import FutureSelfPage from '@/pages/FutureSelfPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SettingsPage from '@/pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Onboarding — auth required but skips the onboarding check */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Protected + Onboarding-gated */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <DashboardPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <ProfilePage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/personality"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <PersonalityPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentor"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <MentorPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <SocialFeedPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guilds"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <GuildsPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/entertainment"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <EntertainmentPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/future-self"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <FutureSelfPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <AnalyticsPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />

          {/* Placeholder routes */}
          <Route
            path="/missions"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <MissionsPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <AchievementsPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <LeaderboardPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <SettingsPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1a2230',
            color: '#f1f5f9',
            border: '1px solid rgba(99,130,255,0.2)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0d1117' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0d1117' } },
        }}
      />
    </QueryClientProvider>
  )
}
