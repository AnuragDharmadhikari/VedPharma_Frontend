import { baseApi } from '@/app/baseApi'
import type { ApiResponse } from '@/types/api'
import type { InvoiceDto, OutstandingInvoiceDto } from '@/types/billing'

export const invoicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // All invoices — Owner/Manager only
    // GET /api/v1/invoices
    getAllInvoices: builder.query<ApiResponse<InvoiceDto[]>, void>({
      query: () => ({ url: '/invoices', method: 'GET' }),
      providesTags: ['Invoice'],
    }),

    // Single invoice by ID — Owner/Manager only
    // GET /api/v1/invoices/{id}
    getInvoiceById: builder.query<ApiResponse<InvoiceDto>, string>({
      query: (id) => ({ url: `/invoices/${id}`, method: 'GET' }),
      providesTags: ['Invoice'],
    }),

    // Generate invoice from order — Owner/Manager only
    // POST /api/v1/invoices/generate/{orderId}
    // Backend auto-calculates GST based on seller/buyer state
    generateInvoice: builder.mutation<ApiResponse<InvoiceDto>, string>({
      query: (orderId) => ({
        url: `/invoices/generate/${orderId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Invoice', 'Order'],
    }),

    // Update invoice status — Owner/Manager only
    // PATCH /api/v1/invoices/{id}/status
    // Body: { status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' }
    // In invoicesApi.ts change updateInvoiceStatus to:
    updateInvoiceStatus: builder.mutation<ApiResponse<InvoiceDto>, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/invoices/${id}/status`,
        method: 'PATCH',
        params: { status }, // ← params not data — backend uses @RequestParam
      }),
      invalidatesTags: ['Invoice'],
    }),

    getOutstandingInvoices: builder.query<ApiResponse<OutstandingInvoiceDto[]>, void>({
  query: () => ({ url: '/invoices/outstanding', method: 'GET' }),
  providesTags: ['Invoice'],
}),
  }),
})

export const {
  useGetAllInvoicesQuery,
  useGetInvoiceByIdQuery,
  useGenerateInvoiceMutation,
  useUpdateInvoiceStatusMutation,
  useGetOutstandingInvoicesQuery,
} = invoicesApi
