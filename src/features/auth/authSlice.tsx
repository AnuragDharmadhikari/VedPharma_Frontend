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
  isInitializing: boolean
}

// ── 2. Initial state ──────────────────────────────────────────
// isInitializing starts true — app must complete /users/me check
// before any route guard makes a redirect decision
// Without this, refresh causes instant redirect to /login before
// AuthInitializer has a chance to rehydrate the user from the JWT cookie
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true,
}

// ── 3. Slice ──────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: AuthUser }>) => {
      state.user = action.payload.user
      state.isAuthenticated = true
      state.isInitializing = false
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isInitializing = false
    },
    // Called when /users/me fails on startup — user not authenticated
    // Must still mark initialization as complete so route guards can redirect
    setInitialized: (state) => {
      state.isInitializing = false
    },
  },
})

// ── 4. Exports ────────────────────────────────────────────────
export const { setCredentials, logout, setInitialized } = authSlice.actions
export default authSlice.reducer

// ── 5. Selectors ──────────────────────────────────────────────
interface StateWithAuth {
  auth: AuthState
}

export const selectCurrentUser = (state: StateWithAuth) => state.auth.user
export const selectIsAuthenticated = (state: StateWithAuth) => state.auth.isAuthenticated
export const selectCurrentUserRole = (state: StateWithAuth) => state.auth.user?.role
export const selectIsInitializing = (state: StateWithAuth) => state.auth.isInitializing
