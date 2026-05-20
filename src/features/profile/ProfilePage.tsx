// src/features/profile/ProfilePage.tsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Lock,
  Sun,
  Moon,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/shared/hooks/useAuth'
import { useTheme } from '@/shared/hooks/useTheme'
import {
  useGetMeQuery,
  useUpdateUserMutation,
  useChangePasswordMutation,
} from '@/features/users/usersApi'

// ── Edit Profile schema ────────────────────────────────────────────────────────
const editProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
})

type EditProfileForm = z.infer<typeof editProfileSchema>

// ── Change Password schema ─────────────────────────────────────────────────────
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

// ── Role display config ────────────────────────────────────────────────────────
const roleConfig = {
  OWNER: { label: 'Owner', color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
  MANAGER: { label: 'Manager', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
  REP: { label: 'Sales Rep', color: 'var(--vp-amber)', bg: 'var(--vp-amber-light)' },
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: meData, isLoading } = useGetMeQuery()
  const me = meData?.data

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const [updateUser, { isLoading: saving }] = useUpdateUserMutation()
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation()

  // ── Password visibility toggles ───────────────────────────────────────────────
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // ── Edit Profile form ─────────────────────────────────────────────────────────
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
  })

  // Pre-populate when server data arrives
  useEffect(() => {
    if (me) {
      resetProfile({
        fullName: me.fullName,
        phone: me.phone ?? '',
      })
    }
  }, [me, resetProfile])

  const onSaveProfile = async (formData: EditProfileForm) => {
    if (!authUser?.id) return
    try {
      await updateUser({
        id: authUser.id,
        body: {
          fullName: formData.fullName,
          phone: formData.phone || undefined,
        },
      }).unwrap()
      toast.success('Profile updated successfully')
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update profile')
    }
  }

  // ── Change Password form ──────────────────────────────────────────────────────
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onChangePassword = async (formData: ChangePasswordForm) => {
    if (!authUser?.id) return
    try {
      await changePassword({
        id: authUser.id,
        body: {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        },
      }).unwrap()
      toast.success('Password changed successfully')
      resetPassword()
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to change password')
    }
  }

  const roleInfo = me?.role ? roleConfig[me.role as keyof typeof roleConfig] : null

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
        >
          Profile
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
          Manage your account settings and preferences
        </p>
      </div>

      {/* ── 2-column grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT COLUMN — identity + appearance ─────────────────────────── */}
        <div className="space-y-6">
          {/* Account Overview */}
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-teal-light)' }}
              >
                <User className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Account Overview
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 skeleton-shimmer" />
                <Skeleton className="h-8 w-48 skeleton-shimmer" />
              </div>
            ) : me ? (
              <div className="flex items-center gap-4">
                {/* Avatar initials */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold"
                  style={{
                    background: roleInfo?.bg ?? 'var(--vp-bg-surface-alt)',
                    color: roleInfo?.color ?? 'var(--vp-text-primary)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {me.fullName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-base font-bold"
                      style={{
                        color: 'var(--vp-text-primary)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {me.fullName}
                    </p>
                    {roleInfo && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: roleInfo.bg, color: roleInfo.color }}
                      >
                        {roleInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {me.email}
                    </span>
                    {me.phone && (
                      <span
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {me.phone}
                      </span>
                    )}
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {format(parseISO(me.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Appearance */}
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-amber-light)' }}
              >
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5" style={{ color: 'var(--vp-amber)' }} />
                ) : (
                  <Sun className="w-5 h-5" style={{ color: 'var(--vp-amber)' }} />
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Appearance
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  Choose your preferred colour scheme
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border"
                style={{
                  background: theme === 'light' ? 'var(--vp-teal-light)' : 'transparent',
                  color: theme === 'light' ? 'var(--vp-teal)' : 'var(--vp-text-muted)',
                  borderColor: theme === 'light' ? 'var(--vp-teal)' : 'var(--vp-border)',
                }}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => theme === 'light' && toggleTheme()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border"
                style={{
                  background: theme === 'dark' ? 'var(--vp-purple-light)' : 'transparent',
                  color: theme === 'dark' ? 'var(--vp-purple)' : 'var(--vp-text-muted)',
                  borderColor: theme === 'dark' ? 'var(--vp-purple)' : 'var(--vp-border)',
                }}
              >
                <Moon className="w-4 h-4" />
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — editable forms ───────────────────────────────── */}
        <div className="space-y-6">
          {/* Edit Profile */}
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-purple-light)' }}
              >
                <Shield className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Edit Profile
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  Name and phone only — email and role cannot be changed
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Full Name *
                </label>
                <input
                  {...registerProfile('fullName')}
                  type="text"
                  className="input-dark w-full"
                  placeholder="Your full name"
                />
                {profileErrors.fullName && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {profileErrors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Phone
                </label>
                <input
                  {...registerProfile('phone')}
                  type="text"
                  className="input-dark w-full"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Email (read-only)
                </label>
                <input
                  type="text"
                  value={me?.email ?? ''}
                  disabled
                  className="input-dark w-full"
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-rose-light)' }}
              >
                <Lock className="w-5 h-5" style={{ color: 'var(--vp-rose)' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Change Password
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  You must provide your current password to set a new one
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
              {/* Current Password */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    {...registerPassword('currentPassword')}
                    type={showCurrent ? 'text' : 'password'}
                    className="input-dark w-full pr-10"
                    placeholder="Your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  New Password *
                </label>
                <div className="relative">
                  <input
                    {...registerPassword('newPassword')}
                    type={showNew ? 'text' : 'password'}
                    className="input-dark w-full pr-10"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    {...registerPassword('confirmPassword')}
                    type={showConfirm ? 'text' : 'password'}
                    className="input-dark w-full pr-10"
                    placeholder="Repeat your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: 'var(--vp-rose)', color: '#FFFFFF' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
