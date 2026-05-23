import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setCredentials } from '@/features/auth/authSlice'
import { axiosInstance } from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type { UserDto } from '@/types/user'

// Runs once on app startup — checks if a valid JWT cookie exists
// by calling /users/me. If the cookie is valid, backend returns user data
// and we populate the Redux auth state. If not, user stays unauthenticated.
// This handles page refresh without requiring re-login.
export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch()

  useEffect(() => {
    const rehydrate = async () => {
      try {
        const response = await axiosInstance.get<ApiResponse<UserDto>>('/users/me')
        const user = response.data.data
        dispatch(
          setCredentials({
            user: {
              id: user.id,
              username: user.email,
              fullName: user.fullName,
              email: user.email,
              role: user.role,
            },
          })
        )
      } catch {
        // Cookie doesn't exist or is expired — user stays unauthenticated
        // ProtectedRoute will redirect to login when they try to access protected pages
      }
    }

    rehydrate()
  }, [dispatch])

  return <>{children}</>
}
