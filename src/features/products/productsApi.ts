import { baseApi } from '@/app/baseApi'
import type { ApiResponse } from '@/types/api'
import type { ProductDto, CreateProductRequest, UpdateProductRequest } from '@/types/product'

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // All active products — all roles
    // GET /api/v1/products
    getAllProducts: builder.query<ApiResponse<ProductDto[]>, void>({
      query: () => ({ url: '/products', method: 'GET' }),
      providesTags: ['Product'],
    }),

    // Single product by ID — all roles
    // GET /api/v1/products/{id}
    getProductById: builder.query<ApiResponse<ProductDto>, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'GET' }),
      providesTags: ['Product'],
    }),

    // Products by category — all roles
    // GET /api/v1/products/category/{category}
    getProductsByCategory: builder.query<ApiResponse<ProductDto[]>, string>({
      query: (category) => ({
        url: `/products/category/${category}`,
        method: 'GET',
      }),
      providesTags: ['Product'],
    }),

    // Create product — Owner/Manager only
    // POST /api/v1/products
    createProduct: builder.mutation<ApiResponse<ProductDto>, CreateProductRequest>({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Product'],
    }),

    // Update product — Owner/Manager only
    // PUT /api/v1/products/{id}
    updateProduct: builder.mutation<
      ApiResponse<ProductDto>,
      { id: string; body: UpdateProductRequest }
    >({
      query: ({ id, body }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        data: body,
      }),
      invalidatesTags: ['Product'],
    }),

    // Deactivate product — Owner/Manager only
    // PATCH /api/v1/products/{id}/deactivate
    deactivateProduct: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/products/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Product'],
    }),

    // All products including inactive — Owner/Manager only
    // GET /api/v1/products/all
    getAllProductsIncludingInactive: builder.query<ApiResponse<ProductDto[]>, void>({
      query: () => ({ url: '/products/all', method: 'GET' }),
      providesTags: ['Product'],
    }),
  }),
})

export const {
  useGetAllProductsQuery,
  useGetProductByIdQuery,
  useGetProductsByCategoryQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeactivateProductMutation,
  useGetAllProductsIncludingInactiveQuery,
} = productsApi
