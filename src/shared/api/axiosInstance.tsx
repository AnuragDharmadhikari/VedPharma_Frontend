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

// ── 2. Refresh token state ───────────────────────────────────
// isRefreshing — prevents multiple simultaneous refresh calls
// failedQueue — holds requests that failed while refresh was in progress
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

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

// ── 3. Response interceptor — auto refresh on 401 ───────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const url = originalRequest?.url ?? ''
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(() => axiosInstance(originalRequest))
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      await axiosInstance.post('/auth/refresh')
      processQueue(null)
      return axiosInstance(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      const currentPath = window.location.pathname
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
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
