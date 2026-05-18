import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  UserX,
  Loader2,
  Key,
  Shield,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useChangePasswordMutation,
} from './usersApi'

// ── Role config ───────────────────────────────────────────────
const roleConfig = {
  OWNER: { label: 'Owner', color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
  MANAGER: { label: 'Manager', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
  REP: { label: 'Sales Rep', color: 'var(--vp-amber)', bg: 'var(--vp-amber-light)' },
}

// ── Edit User Schema ──────────────────────────────────────────
const editUserSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
})
type EditUserForm = z.infer<typeof editUserSchema>

// ── Change Password Schema ────────────────────────────────────
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

// ── Main Page ─────────────────────────────────────────────────
export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser, isOwner } = useAuth()

  const [showEdit, setShowEdit] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)

  const { data: userData, isLoading, isError } = useGetUserByIdQuery(id ?? '', { skip: !id })
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation()
  const [deactivateUser, { isLoading: deactivating }] = useDeactivateUserMutation()
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation()

  const user = userData?.data
  const isCurrentUser = user?.id === currentUser?.id
  const canEdit = isOwner || isCurrentUser
  const canDeactivate = isOwner && !isCurrentUser

  // ── Edit form ─────────────────────────────────────────────
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
    },
  })

  const onEditSubmit = async (data: EditUserForm) => {
    if (!id) return
    try {
      await updateUser({ id, body: { fullName: data.fullName, phone: data.phone } }).unwrap()
      toast.success('Profile updated successfully')
      setShowEdit(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update profile')
    }
  }

  // ── Change password form ──────────────────────────────────
  const {
    register: registerPwd,
    handleSubmit: handlePwdSubmit,
    reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onPasswordSubmit = async (data: ChangePasswordForm) => {
    if (!id) return
    try {
      await changePassword({
        id,
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
      }).unwrap()
      toast.success('Password changed successfully')
      resetPwd()
      setShowChangePassword(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to change password')
    }
  }

  // ── Deactivate ────────────────────────────────────────────
  const onDeactivate = async () => {
    if (!id) return
    try {
      await deactivateUser(id).unwrap()
      toast.success('User deactivated successfully')
      navigate('/users')
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to deactivate user')
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <Skeleton className="h-64 w-full skeleton-shimmer" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <User className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          User not found
        </p>
        <button onClick={() => navigate('/users')} className="btn-primary mt-4">
          Back to Team
        </button>
      </div>
    )
  }

  const roleCfg = roleConfig[user.role as keyof typeof roleConfig]

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/users')}
            className="p-2 rounded-xl transition-colors"
            style={{
              background: 'var(--vp-bg-surface)',
              border: '1px solid var(--vp-border)',
              color: 'var(--vp-text-muted)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--vp-text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--vp-text-muted)')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
              >
                {user.fullName}
              </h1>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: roleCfg?.bg, color: roleCfg?.color }}
              >
                {roleCfg?.label}
              </span>
              {isCurrentUser && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                >
                  You
                </span>
              )}
              {!user.isActive && <span className="badge-crimson">Inactive</span>}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canEdit && user.isActive && (
            <button
              onClick={() => {
                resetEdit({ fullName: user.fullName, phone: user.phone ?? '' })
                setShowEdit(true)
              }}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
          {(isOwner || isCurrentUser) && user.isActive && (
            <button
              onClick={() => setShowChangePassword(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Key className="w-4 h-4" /> Change Password
            </button>
          )}
          {canDeactivate && user.isActive && (
            <button
              onClick={() => setShowDeactivate(true)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold"
              style={{
                background: 'var(--vp-rose-light)',
                color: 'var(--vp-rose)',
                border: '1px solid rgba(244,63,94,0.2)',
              }}
            >
              <UserX className="w-4 h-4" /> Deactivate
            </button>
          )}
        </div>
      </div>

      {/* ── User Info Card ── */}
      <div className="vp-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: roleCfg?.bg }}
          >
            <Shield className="w-5 h-5" style={{ color: roleCfg?.color }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
            Profile Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: <User className="w-4 h-4" />, label: 'Full Name', value: user.fullName },
            { icon: <Mail className="w-4 h-4" />, label: 'Email', value: user.email },
            {
              icon: <Shield className="w-4 h-4" />,
              label: 'Role',
              value: roleCfg?.label ?? user.role,
            },
            {
              icon: <Phone className="w-4 h-4" />,
              label: 'Phone',
              value: user.phone ?? 'Not provided',
            },
            {
              icon: <Calendar className="w-4 h-4" />,
              label: 'Joined',
              value: format(parseISO(user.createdAt), 'MMMM d, yyyy'),
            },
            {
              icon: <Calendar className="w-4 h-4" />,
              label: 'Last Updated',
              value: format(parseISO(user.updatedAt), 'MMMM d, yyyy'),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{
                background: 'var(--vp-bg-surface-alt)',
                border: '1px solid var(--vp-border)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: roleCfg?.bg, color: roleCfg?.color }}
              >
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                  {item.label}
                </p>
                <p
                  className="text-sm font-semibold mt-0.5"
                  style={{ color: 'var(--vp-text-primary)' }}
                >
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Dialog open={showEdit} onOpenChange={() => setShowEdit(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4 mt-2">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Full Name *
              </label>
              <input {...registerEdit('fullName')} className="input-dark" />
              {editErrors.fullName && (
                <p className="text-xs mt-1 text-rose-500">{editErrors.fullName.message}</p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Phone
              </label>
              <input {...registerEdit('phone')} className="input-dark" placeholder="9876543210" />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Modal ── */}
      <Dialog
        open={showChangePassword}
        onOpenChange={() => {
          resetPwd()
          setShowChangePassword(false)
        }}
      >
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Change Password</DialogTitle>
          </DialogHeader>
          {!isCurrentUser && isOwner && (
            <div
              className="p-3 rounded-xl text-xs mt-2"
              style={{ background: 'var(--vp-amber-light)', color: 'var(--vp-amber)' }}
            >
              ⚠️ You need the user's current password to change it. The system requires verification
              of the existing password for security.
            </div>
          )}
          <form onSubmit={handlePwdSubmit(onPasswordSubmit)} className="space-y-4 mt-2">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Current Password *
              </label>
              <input {...registerPwd('currentPassword')} type="password" className="input-dark" />
              {pwdErrors.currentPassword && (
                <p className="text-xs mt-1 text-rose-500">{pwdErrors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                New Password *
              </label>
              <input {...registerPwd('newPassword')} type="password" className="input-dark" />
              {pwdErrors.newPassword && (
                <p className="text-xs mt-1 text-rose-500">{pwdErrors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Confirm New Password *
              </label>
              <input {...registerPwd('confirmPassword')} type="password" className="input-dark" />
              {pwdErrors.confirmPassword && (
                <p className="text-xs mt-1 text-rose-500">{pwdErrors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetPwd()
                  setShowChangePassword(false)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changingPassword}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirmation ── */}
      <Dialog open={showDeactivate} onOpenChange={() => setShowDeactivate(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Deactivate User</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{user.fullName}</strong>? They will
            lose access to VedPharm immediately. This cannot be undone from the UI.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowDeactivate(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onDeactivate}
              disabled={deactivating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--vp-rose)', color: '#FFFFFF' }}
            >
              {deactivating && <Loader2 className="w-4 h-4 animate-spin" />}
              {deactivating ? 'Deactivating...' : 'Deactivate'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
