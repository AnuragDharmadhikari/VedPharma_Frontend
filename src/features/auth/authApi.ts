import { baseApi } from '@/app/baseApi'
import { setCredentials } from './authSlice'
import type { LoginRequest, AuthResponse, RegisterRequest } from '@/types/auth'
import type { ApiResponse } from '@/types/api'
import type { UserDto } from '@/types/user'

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Login ─────────────────────────────────────────────────
    login: builder.mutation<ApiResponse<AuthResponse>, LoginRequest>({
      queryFn: async (credentials, { dispatch }, _extra, baseQuery) => {
        // Step 1 — Call login endpoint
        const result = await baseQuery({
          url: '/auth/login',
          method: 'POST',
          data: credentials,
        })

        if (result.error) return { error: result.error }

        const response = result.data as ApiResponse<AuthResponse>
        const token = response.data.accessToken

        // Step 2 — Fetch current user profile using the new token
        // We need the user's role, fullName, email for the Redux store
        // But the login response only gives us the token
        // So we immediately call /users/me with the fresh token
        const userResult = await baseQuery({
          url: '/users/me',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (userResult.error) return { error: userResult.error }

        const userResponse = userResult.data as ApiResponse<UserDto>

        // Step 3 — Store credentials in Redux + localStorage
        dispatch(
          setCredentials({
            token,
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

    // Register new employee — Owner only
    // POST /api/v1/auth/register
    // Requires OWNER JWT — creates a new user and returns their token
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

export const { useLoginMutation, useRegisterMutation } = authApi
