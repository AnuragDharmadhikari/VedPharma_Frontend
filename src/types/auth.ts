export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  role: 'OWNER' | 'MANAGER' | 'REP'
  phone?: string
}

// Backend now returns user info directly — token is set as httpOnly cookie
// No longer contains accessToken, tokenType, expiresIn
export interface AuthResponse {
  email: string
  role: string
  fullName: string
}