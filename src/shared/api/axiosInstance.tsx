import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { BaseQueryFn } from '@reduxjs/toolkit/query'

// ── 1. Axios instance ────────────────────────────────────────
export const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// ── 2. Request interceptor — attach JWT ──────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vedpharm_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── 3. Response interceptor — handle 401 ────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Skip redirect for login endpoint — wrong credentials should show
      // an error toast, not redirect to login (we're already on login)
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('vedpharm_token')
        localStorage.removeItem('vedpharm_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── 4. RTK Query compatible base query ───────────────────────
export const axiosBaseQuery: BaseQueryFn<AxiosRequestConfig, unknown, unknown> = async (config) => {
  try {
    const result = await axiosInstance(config)
    return { data: result.data }
  } catch (error) {
    const axiosError = error as AxiosError
    return {
      error: {
        status: axiosError.response?.status,
        data: axiosError.response?.data,
      },
    }
  }
}
