import { baseApi } from '@/app/baseApi'
import type { ApiResponse } from '@/types/api'
import type { UserDto, UpdateUserRequest, ChangePasswordRequest } from '@/types/user'

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // All users — Owner/Manager only
    // GET /api/v1/users
    getAllUsers: builder.query<ApiResponse<UserDto[]>, void>({
      query: () => ({ url: '/users', method: 'GET' }),
      providesTags: ['User'],
    }),

    // Current logged-in user — all roles
    // GET /api/v1/users/me
    getMe: builder.query<ApiResponse<UserDto>, void>({
      query: () => ({ url: '/users/me', method: 'GET' }),
      providesTags: ['User'],
    }),

    // Single user by ID — Owner/Manager only
    // GET /api/v1/users/{id}
    getUserById: builder.query<ApiResponse<UserDto>, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'GET' }),
      providesTags: ['User'],
    }),

    // Users by role — Owner/Manager only
    // GET /api/v1/users/role/{role}
    getUsersByRole: builder.query<ApiResponse<UserDto[]>, string>({
      query: (role) => ({ url: `/users/role/${role}`, method: 'GET' }),
      providesTags: ['User'],
    }),

    // Update user — Owner/Manager only
    // PUT /api/v1/users/{id}
    updateUser: builder.mutation<ApiResponse<UserDto>, { id: string; body: UpdateUserRequest }>({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: ['User'],
    }),

    // Change password — all roles (own password only)
    // PATCH /api/v1/users/{id}/change-password
    changePassword: builder.mutation<
      ApiResponse<void>,
      { id: string; body: ChangePasswordRequest }
    >({
      query: ({ id, body }) => ({
        url: `/users/${id}/change-password`,
        method: 'PATCH',
        data: body,
      }),
    }),

    // Deactivate user — Owner only
    // PATCH /api/v1/users/{id}/deactivate
    deactivateUser: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/users/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),

    // Reactivate user — Owner only
    // PATCH /api/v1/users/{id}/reactivate
    reactivateUser: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/users/${id}/reactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useGetAllUsersQuery,
  useGetMeQuery,
  useGetUserByIdQuery,
  useGetUsersByRoleQuery,
  useUpdateUserMutation,
  useChangePasswordMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation, 
} = usersApi
