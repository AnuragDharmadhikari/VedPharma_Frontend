import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// ── 1. Types ─────────────────────────────────────────────────
export interface AuthUser {
  id: string
  username: string
  fullName: string
  email: string
  role: 'OWNER' | 'MANAGER' | 'REP'
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
}

// ── 2. Initial state ──────────────────────────────────────────
// No longer reading from localStorage — JWT is in httpOnly cookie
// User info is stored only in Redux memory (lost on page refresh)
// On refresh, the app will call /users/me to rehydrate user info
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
}

// ── 3. Slice ──────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Called after successful login — stores user info in Redux
    // Token is NOT stored here — it lives in the httpOnly cookie set by backend
    setCredentials: (state, action: PayloadAction<{ user: AuthUser }>) => {
      state.user = action.payload.user
      state.isAuthenticated = true
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

// ── 4. Exports ────────────────────────────────────────────────
export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

// ── 5. Selectors ──────────────────────────────────────────────
interface StateWithAuth {
  auth: AuthState
}

export const selectCurrentUser = (state: StateWithAuth) => state.auth.user
export const selectIsAuthenticated = (state: StateWithAuth) => state.auth.isAuthenticated
export const selectCurrentUserRole = (state: StateWithAuth) => state.auth.user?.role
