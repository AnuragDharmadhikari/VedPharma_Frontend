import { baseApi } from '@/app/baseApi'
import { setCredentials } from './authSlice'
import type { LoginRequest, AuthResponse, RegisterRequest } from '@/types/auth'
import type { ApiResponse } from '@/types/api'
import type { UserDto } from '@/types/user'

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Login ─────────────────────────────────────────────────
    // Backend sets JWT as httpOnly cookie on success
    // Response body contains email, role, fullName — no token
    login: builder.mutation<ApiResponse<AuthResponse>, LoginRequest>({
      queryFn: async (credentials, { dispatch }, _extra, baseQuery) => {
        // Step 1 — Call login endpoint
        // Backend sets httpOnly cookie "vedpharm_jwt" automatically
        const result = await baseQuery({
          url: '/auth/login',
          method: 'POST',
          data: credentials,
        })

        if (result.error) return { error: result.error }

        const response = result.data as ApiResponse<AuthResponse>

        // Step 2 — Fetch current user profile to get the UUID
        // AuthResponse gives us email/role/fullName but not the UUID
        // We need UUID for the auth store so useAuth().user.id works
        const userResult = await baseQuery({
          url: '/users/me',
          method: 'GET',
        })

        if (userResult.error) return { error: userResult.error }

        const userResponse = userResult.data as ApiResponse<UserDto>

        // Step 3 — Store user info in Redux only — no localStorage
        // Token lives in the httpOnly cookie managed by the browser
        dispatch(
          setCredentials({
            user: {
              id: userResponse.data.id,
              username: userResponse.data.email,
              fullName: userResponse.data.fullName,
              email: userResponse.data.email,
              role: userResponse.data.role,
            },
          })
        )

        return { data: response }
      },
    }),

    // ── Logout ────────────────────────────────────────────────
    // Calls backend to clear the httpOnly cookie
    // Cannot clear httpOnly cookies from JavaScript — must go through server
    logout: builder.mutation<ApiResponse<void>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),

    // Register new employee — Owner only
    // POST /api/v1/auth/register
    register: builder.mutation<ApiResponse<AuthResponse>, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const { useLoginMutation, useLogoutMutation, useRegisterMutation } = authApi
