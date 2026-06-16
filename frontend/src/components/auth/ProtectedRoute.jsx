import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

/**
 * ProtectedRoute — redirects unauthenticated users to /login,
 * preserving the intended destination for post-login redirect.
 */
export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
