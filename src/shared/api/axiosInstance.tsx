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
// With httpOnly cookie auth, we no longer attach Authorization header
// Instead we read the XSRF-TOKEN cookie and send it as X-XSRF-TOKEN header
// Spring Security validates this header to prevent CSRF attacks
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

// ── 3. Response interceptor — handle 401 ────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      if (!isLoginRequest) {
        const currentPath = window.location.pathname
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
      }
    }
    return Promise.reject(error)
  }
)

// ── 4. Helper — read a cookie by name ───────────────────────
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

// ── 5. RTK Query compatible base query ───────────────────────
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
