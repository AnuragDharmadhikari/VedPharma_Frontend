import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { BaseQueryFn } from '@reduxjs/toolkit/query'

// ── 1. Axios instance ────────────────────────────────────────
export const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  // withCredentials — tells browser to send cookies with every request
  // Without this, httpOnly cookies are NOT sent on cross-origin requests
  withCredentials: true,
})

// ── 2. Request interceptor — attach CSRF token ───────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('XSRF-TOKEN')
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── 3. Refresh token state ───────────────────────────────────
// isRefreshing — prevents multiple simultaneous refresh calls
// if two requests fail at the same time, only one refresh call is made
// failedQueue — holds all requests that failed while refresh was in progress
// once refresh succeeds, all queued requests are retried
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

// Process all queued requests after refresh attempt
// If refresh succeeded (error=null) → resolve all queued requests
// If refresh failed → reject all queued requests
const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(undefined)
    }
  })
  failedQueue = []
}

// ── 4. Response interceptor — auto refresh on 401 ───────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Only handle 401 errors
    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Don't retry for login or refresh endpoints
    // These failing means credentials are wrong — go to login
    const url = originalRequest?.url ?? ''
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    // If already retried this request — don't retry again
    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    // If a refresh is already in progress — queue this request
    // It will be retried once the in-progress refresh completes
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => axiosInstance(originalRequest))
        .catch((err) => Promise.reject(err))
    }

    // Mark this request as retried and start the refresh flow
    originalRequest._retry = true
    isRefreshing = true

    try {
      // Call the refresh endpoint
      // The refresh cookie is automatically sent by the browser
      // Spring returns new access + refresh cookies automatically
      await axiosInstance.post('/auth/refresh')

      // Refresh succeeded — process all queued requests
      processQueue(null)

      // Retry the original failed request
      return axiosInstance(originalRequest)

    } catch (refreshError) {
      // Refresh failed — process queue with error, redirect to login
      processQueue(refreshError)

      const currentPath = window.location.pathname
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`

      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// ── 5. Helper — read a cookie by name ───────────────────────
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

// ── 6. RTK Query compatible base query ───────────────────────
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