import { Navigate, Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { useSelector } from 'react-redux'
import {
  selectIsAuthenticated,
  selectCurrentUserRole,
  selectIsInitializing,
} from '@/features/auth/authSlice'

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--color-bg-base)' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-brand-teal)', borderTopColor: 'transparent' }}
        />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Loading...
        </p>
      </div>
    </div>
  )
}

export function SuspenseWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}

export function PublicRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInitializing = useSelector(selectIsInitializing)
  if (isInitializing) return <PageLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function ProtectedRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInitializing = useSelector(selectIsInitializing)
  if (isInitializing) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

export function OwnerRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInitializing = useSelector(selectIsInitializing)
  const role = useSelector(selectCurrentUserRole)
  if (isInitializing) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'OWNER') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function ManagerRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInitializing = useSelector(selectIsInitializing)
  const role = useSelector(selectCurrentUserRole)
  if (isInitializing) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'OWNER' && role !== 'MANAGER') return <Navigate to="/dashboard" replace />
  return <Outlet />
}