import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Users, Search, X, Shield, UserX, Loader2, Phone, Mail, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGetAllUsersQuery, useDeactivateUserMutation } from './usersApi'
import type { UserDto } from '@/types/user'
import { useNavigate } from 'react-router-dom'

// ── Role config ───────────────────────────────────────────────
const roleConfig = {
  OWNER: {
    label: 'Owner',
    color: 'var(--vp-purple)',
    bg: 'var(--vp-purple-light)',
  },
  MANAGER: {
    label: 'Manager',
    color: 'var(--vp-teal)',
    bg: 'var(--vp-teal-light)',
  },
  REP: {
    label: 'Sales Rep',
    color: 'var(--vp-amber)',
    bg: 'var(--vp-amber-light)',
  },
}

function RoleBadge({ role }: { role: string }) {
  const config = roleConfig[role as keyof typeof roleConfig]
  if (!config) return null
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser, isOwner } = useAuth()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'OWNER' | 'MANAGER' | 'REP'>('ALL')
  const [deactivateTarget, setDeactivateTarget] = useState<UserDto | null>(null)

  const { data, isLoading } = useGetAllUsersQuery()
  const [deactivateUser, { isLoading: deactivating }] = useDeactivateUserMutation()

  const filtered = useMemo(() => {
    const users = data?.data ?? []
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [data, search, roleFilter])

  // KPI counts
  const users = data?.data ?? []
  const total = users.length
  const active = users.filter((u) => u.isActive).length
  const managers = users.filter((u) => u.role === 'MANAGER').length
  const reps = users.filter((u) => u.role === 'REP').length

  const onDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await deactivateUser(deactivateTarget.id).unwrap()
      toast.success(`${deactivateTarget.fullName} deactivated`)
      setDeactivateTarget(null)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to deactivate user')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Team
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {active} active team members
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Members',
            value: total,
            color: 'var(--vp-teal)',
            icon: <Users className="w-5 h-5" />,
          },
          {
            label: 'Active',
            value: active,
            color: 'var(--vp-purple)',
            icon: <Users className="w-5 h-5" />,
          },
          {
            label: 'Managers',
            value: managers,
            color: 'var(--vp-teal)',
            icon: <Shield className="w-5 h-5" />,
          },
          {
            label: 'Sales Reps',
            value: reps,
            color: 'var(--vp-amber)',
            icon: <Users className="w-5 h-5" />,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="vp-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--vp-text-muted)' }}
              >
                {kpi.label}
              </p>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${kpi.color}15`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 skeleton-shimmer" />
            ) : (
              <p
                className="text-2xl font-bold"
                style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {kpi.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--vp-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark"
            style={{ paddingLeft: '2.5rem' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--vp-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role filter pills */}
        <div className="flex gap-2">
          {(['ALL', 'OWNER', 'MANAGER', 'REP'] as const).map((role) => {
            const labels = { ALL: 'All', OWNER: 'Owner', MANAGER: 'Manager', REP: 'Rep' }
            const colors = {
              ALL: 'var(--vp-teal)',
              OWNER: 'var(--vp-purple)',
              MANAGER: 'var(--vp-teal)',
              REP: 'var(--vp-amber)',
            }
            const isActive = roleFilter === role
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: isActive ? colors[role] : 'var(--vp-bg-surface)',
                  color: isActive ? '#FFFFFF' : 'var(--vp-text-secondary)',
                  border: `1px solid ${isActive ? colors[role] : 'var(--vp-border)'}`,
                  boxShadow: isActive ? 'var(--vp-shadow-sm)' : 'none',
                }}
              >
                {labels[role]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      {(search || roleFilter !== 'ALL') && (
        <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
          Showing <strong style={{ color: 'var(--vp-text-primary)' }}>{filtered.length}</strong>{' '}
          result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── Users List ── */}
      <div className="vp-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 skeleton-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--vp-teal-light)' }}
            >
              <Users className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
              No team members found
            </p>
            <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
            {filtered.map((user: UserDto) => {
              const isCurrentUser = user.id === currentUser?.id
              return (
                <div
                  key={user.id}
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{
                      background:
                        roleConfig[user.role as keyof typeof roleConfig]?.bg ??
                        'var(--vp-bg-hover)',
                      color:
                        roleConfig[user.role as keyof typeof roleConfig]?.color ??
                        'var(--vp-text-muted)',
                    }}
                  >
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--vp-text-primary)' }}
                      >
                        {user.fullName}
                      </p>
                      <RoleBadge role={user.role} />
                      {isCurrentUser && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                        >
                          You
                        </span>
                      )}
                      {!user.isActive && <span className="badge-crimson text-xs">Inactive</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        <Mail className="w-3 h-3" /> {user.email}
                      </span>
                      {user.phone && (
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          <Phone className="w-3 h-3" /> {user.phone}
                        </span>
                      )}
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        <Calendar className="w-3 h-3" />
                        Joined {format(parseISO(user.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Actions — Owner only, cannot deactivate self */}
                  {isOwner && !isCurrentUser && user.isActive && (
                    <button
                      onClick={() => setDeactivateTarget(user)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl shrink-0"
                      style={{ background: 'var(--vp-rose-light)', color: 'var(--vp-rose)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <UserX className="w-3.5 h-3.5" /> Deactivate
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Deactivate Confirmation ── */}
      <Dialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Deactivate User</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>
              {deactivateTarget?.fullName}
            </strong>
            ? They will lose access to VedPharm immediately. This cannot be undone from the UI.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setDeactivateTarget(null)} className="btn-secondary flex-1">
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
