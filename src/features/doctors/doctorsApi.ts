import { baseApi } from '@/app/baseApi'
import type { ApiResponse } from '@/types/api'
import type { DoctorDto, CreateDoctorRequest, UpdateDoctorRequest } from '@/types/doctor'
import type { VisitDto } from '@/types/visit'

export const doctorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // All active doctors — all roles
    getAllDoctors: builder.query<ApiResponse<DoctorDto[]>, void>({
      query: () => ({ url: '/doctors', method: 'GET' }),
      providesTags: ['Doctor'],
    }),

    // Single doctor by ID — all roles
    getDoctorById: builder.query<ApiResponse<DoctorDto>, string>({
      query: (id) => ({ url: `/doctors/${id}`, method: 'GET' }),
      providesTags: ['Doctor'],
    }),

    // Doctors by territory — all roles
    getDoctorsByTerritory: builder.query<ApiResponse<DoctorDto[]>, string>({
      query: (territoryId) => ({
        url: `/doctors/territory/${territoryId}`,
        method: 'GET',
      }),
      providesTags: ['Doctor'],
    }),

    // Doctors by specialty — all roles
    getDoctorsBySpecialty: builder.query<ApiResponse<DoctorDto[]>, string>({
      query: (specialty) => ({
        url: `/doctors/specialty/${specialty}`,
        method: 'GET',
      }),
      providesTags: ['Doctor'],
    }),

    // Create doctor — all roles
    createDoctor: builder.mutation<ApiResponse<DoctorDto>, CreateDoctorRequest>({
      query: (body) => ({
        url: '/doctors',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Doctor'],
    }),

    // Update doctor — all roles
    updateDoctor: builder.mutation<
      ApiResponse<DoctorDto>,
      { id: string; body: UpdateDoctorRequest }
    >({
      query: ({ id, body }) => ({
        url: `/doctors/${id}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: ['Doctor'],
    }),

    // Deactivate doctor — Owner/Manager only
    deactivateDoctor: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/doctors/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Doctor'],
    }),

    // ── Visits by doctor — all roles ──────────────────────────────
    // GET /api/v1/visits/doctor/{doctorId}
    // Returns the full visit history for a specific doctor
    // Used by DoctorDetailPage to show the visit timeline
    getVisitsByDoctor: builder.query<ApiResponse<VisitDto[]>, string>({
      query: (doctorId) => ({
        url: `/visits/doctor/${doctorId}`,
        method: 'GET',
      }),
      // 'Visit' tag — when a visit is created/updated, this list auto-refetches
      providesTags: ['Visit'],
    }),

    // All doctors including inactive — Owner/Manager only
    // GET /api/v1/doctors/all
    getAllDoctorsIncludingInactive: builder.query<ApiResponse<DoctorDto[]>, void>({
      query: () => ({ url: '/doctors/all', method: 'GET' }),
      providesTags: ['Doctor'],
    }),
  }),
})

export const {
  useGetAllDoctorsQuery,
  useGetDoctorByIdQuery,
  useGetDoctorsByTerritoryQuery,
  useGetDoctorsBySpecialtyQuery,
  useCreateDoctorMutation,
  useUpdateDoctorMutation,
  useDeactivateDoctorMutation,
  useGetVisitsByDoctorQuery,
  useGetAllDoctorsIncludingInactiveQuery,
} = doctorsApi
