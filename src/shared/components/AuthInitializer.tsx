import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setCredentials, setInitialized } from '@/features/auth/authSlice'
import { axiosInstance } from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/types/api'
import type { UserDto } from '@/types/user'

// Runs once on app startup — rehydrates auth state from JWT cookie
// Flow:
//   1. Try /users/me with existing access token
//   2. If 401 → try /auth/refresh to get new access token
//   3. If refresh succeeds → retry /users/me
//   4. If refresh fails → user must log in again
export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch()

  useEffect(() => {
    const rehydrate = async () => {
      try {
        // Step 1 — try with existing access token
        const response = await axiosInstance.get<ApiResponse<UserDto>>('/users/me')
        dispatch(
          setCredentials({
            user: {
              id: response.data.data.id,
              username: response.data.data.email,
              fullName: response.data.data.fullName,
              email: response.data.data.email,
              role: response.data.data.role,
            },
          })
        )
      } catch {
        try {
          // Step 2 — access token expired, try refresh
          await axiosInstance.post('/auth/refresh')
          // Step 3 — refresh succeeded, retry /users/me
          const response = await axiosInstance.get<ApiResponse<UserDto>>('/users/me')
          dispatch(
            setCredentials({
              user: {
                id: response.data.data.id,
                username: response.data.data.email,
                fullName: response.data.data.fullName,
                email: response.data.data.email,
                role: response.data.data.role,
              },
            })
          )
        } catch {
          // Step 4 — both tokens invalid, user must login
          dispatch(setInitialized())
        }
      }
    }

    rehydrate()
  }, [dispatch])

  return <>{children}</>
}
