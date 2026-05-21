// src/features/audit/auditApi.ts
import { baseApi } from '@/app/baseApi'
import type { ApiResponse } from '@/types/api'
import type { AuditLogDto } from '@/types/audit'

export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all audit logs — Owner only
    // GET /api/v1/audit
    // Returns all system events newest first
    getAuditLogs: builder.query<ApiResponse<AuditLogDto[]>, void>({
      query: () => ({
        url: '/audit',
        method: 'GET',
      }),
    }),
  }),
})

export const { useGetAuditLogsQuery } = auditApi
