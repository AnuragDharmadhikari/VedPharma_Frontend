import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Plus,
  Loader2,
  Stethoscope,
  Calendar,
  User,
  ChevronRight,
  X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGetAllVisitsQuery, useGetVisitsByRepQuery, useCreateVisitMutation } from './visitApi'
import { useGetAllDoctorsQuery } from '@/features/doctors/doctorsApi'
import type { VisitDto } from '@/types/visit'

// ── Status config ─────────────────────────────────────────────
const statusConfig = {
  COMPLETED: {
    label: 'Completed',
    color: 'var(--vp-teal)',
    bg: 'var(--vp-teal-light)',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  PLANNED: {
    label: 'Planned',
    color: 'var(--vp-amber)',
    bg: 'var(--vp-amber-light)',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  MISSED: {
    label: 'Missed',
    color: 'var(--vp-rose)',
    bg: 'var(--vp-rose-light)',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
}

// ── VisitStatusBadge ──────────────────────────────────────────
function VisitStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig]
  if (!config) return null
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

// ── Zod schema for create visit form ─────────────────────────
const createVisitSchema = z.object({
  // doctorId is required — the whole purpose of a visit is to see a doctor
  doctorId: z.string().min(1, 'Please select a doctor'),
  // visitDate is a LocalDate on the backend — we send "YYYY-MM-DD" string
  visitDate: z.string().min(1, 'Visit date is required'),
  // status defaults to PLANNED for a new visit — rep can update after
  status: z.enum(['PLANNED', 'COMPLETED', 'MISSED']),
  // notes is optional
  notes: z.string().optional(),
})

type CreateVisitForm = z.infer<typeof createVisitSchema>

// ── CreateVisitModal ──────────────────────────────────────────
interface CreateVisitModalProps {
  open: boolean
  onClose: () => void
  // repId comes from the logged-in user — not a form field
  repId: string
}

function CreateVisitModal({ open, onClose, repId }: CreateVisitModalProps) {
  const [createVisit, { isLoading }] = useCreateVisitMutation()

  // We need the doctors list to populate the doctor dropdown
  const { data: doctorsData, isLoading: doctorsLoading } = useGetAllDoctorsQuery()
  const doctors = doctorsData?.data ?? []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateVisitForm>({
    resolver: zodResolver(createVisitSchema),
    defaultValues: {
      // Default status is PLANNED — most visits are logged in advance
      status: 'PLANNED',
      // Default date is today in YYYY-MM-DD format
      // The date input expects this exact format
      visitDate: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const onSubmit = async (data: CreateVisitForm) => {
    try {
      await createVisit({
        // repId always comes from the logged-in user's session
        // never from a form field — this is correct pharma CRM logic
        repId,
        doctorId: data.doctorId,
        visitDate: data.visitDate,
        status: data.status,
        notes: data.notes || undefined,
        // products can be added later via the visit detail page
      }).unwrap()
      toast.success('Visit logged successfully')
      reset()
      onClose()
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to log visit')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md"
        style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Log a Visit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Doctor selector */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Doctor *
            </label>
            <select
              {...register('doctorId')}
              className="input-dark"
              style={{ background: 'var(--vp-bg-surface)' }}
              disabled={doctorsLoading}
            >
              <option value="">{doctorsLoading ? 'Loading doctors...' : 'Select a doctor'}</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.fullName} — {doc.specialty}
                </option>
              ))}
            </select>
            {errors.doctorId && (
              <p className="text-xs mt-1 text-rose-500">{errors.doctorId.message}</p>
            )}
          </div>

          {/* Visit Date */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Visit Date *
            </label>
            {/* type="date" gives us a native date picker
                The value is always YYYY-MM-DD which matches LocalDate on the backend */}
            <input {...register('visitDate')} type="date" className="input-dark" />
            {errors.visitDate && (
              <p className="text-xs mt-1 text-rose-500">{errors.visitDate.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Status *
            </label>
            <select
              {...register('status')}
              className="input-dark"
              style={{ background: 'var(--vp-bg-surface)' }}
            >
              <option value="PLANNED">Planned</option>
              <option value="COMPLETED">Completed</option>
              <option value="MISSED">Missed</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Notes
            </label>
            <textarea
              {...register('notes')}
              className="input-dark resize-none"
              rows={3}
              placeholder="Discussed new product launch, doctor showed interest..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Logging...' : 'Log Visit'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function VisitsPage() {
  const navigate = useNavigate()
  const { user, isOwnerOrManager } = useAuth()

  // UI state
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'COMPLETED' | 'MISSED'>(
    'ALL'
  )

  // ── Data fetching ─────────────────────────────────────────
  // Owner/Manager see ALL visits via /visits
  // REP sees only their own visits via /visits/rep/{repId}
  // The skip flag ensures only ONE of these queries fires
  const { data: allVisitsData, isLoading: allLoading } = useGetAllVisitsQuery(undefined, {
    skip: !isOwnerOrManager,
  })

  const { data: repVisitsData, isLoading: repLoading } = useGetVisitsByRepQuery(user?.id ?? '', {
    // Skip if Owner/Manager (they use getAllVisits)
    // Also skip if user.id is not yet available
    skip: isOwnerOrManager || !user?.id,
  })

  const isLoading = allLoading || repLoading

  // Wrapped in useMemo so the array reference is stable between renders.
  // Without this, rawVisits would be a NEW array on every render even if
  // the data didn't change, causing filteredVisits to re-run unnecessarily.
  const rawVisits = useMemo(
    () => (isOwnerOrManager ? (allVisitsData?.data ?? []) : (repVisitsData?.data ?? [])),
    [isOwnerOrManager, allVisitsData, repVisitsData]
  )

  // ── Client-side filtering ─────────────────────────────────
  // useMemo ensures we don't re-filter on every render —
  // only when the source data, search, or status filter changes
  const filteredVisits = useMemo(() => {
    let result = [...rawVisits]

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((v) => v.status === statusFilter)
    }

    // Search — matches doctor name or rep name (case-insensitive)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (v) =>
          v.doctorName.toLowerCase().includes(q) ||
          v.repName.toLowerCase().includes(q) ||
          v.doctorSpecialty.toLowerCase().includes(q)
      )
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())

    return result
  }, [rawVisits, search, statusFilter])

  // ── KPI counts ────────────────────────────────────────────
  const total = rawVisits.length
  const completed = rawVisits.filter((v) => v.status === 'COMPLETED').length
  const planned = rawVisits.filter((v) => v.status === 'PLANNED').length
  const missed = rawVisits.filter((v) => v.status === 'MISSED').length

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Visits
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {isOwnerOrManager ? 'All field visits across your team' : 'Your visit history'}
          </p>
        </div>
        <button
          onClick={() => navigate('/visits/new')}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Log Visit
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Visits',
            value: total,
            color: 'var(--vp-teal)',
            icon: <ClipboardList className="w-5 h-5" />,
          },
          {
            label: 'Completed',
            value: completed,
            color: 'var(--vp-teal)',
            icon: <CheckCircle2 className="w-5 h-5" />,
          },
          {
            label: 'Planned',
            value: planned,
            color: 'var(--vp-amber)',
            icon: <Clock className="w-5 h-5" />,
          },
          {
            label: 'Missed',
            value: missed,
            color: 'var(--vp-rose)',
            icon: <XCircle className="w-5 h-5" />,
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
            placeholder="Search by doctor, specialty, or rep..."
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

        {/* Status filter pills */}
        <div className="flex gap-2">
          {(['ALL', 'PLANNED', 'COMPLETED', 'MISSED'] as const).map((s) => {
            const labels = {
              ALL: 'All',
              PLANNED: 'Planned',
              COMPLETED: 'Completed',
              MISSED: 'Missed',
            }
            const colors = {
              ALL: 'var(--vp-teal)',
              PLANNED: 'var(--vp-amber)',
              COMPLETED: 'var(--vp-teal)',
              MISSED: 'var(--vp-rose)',
            }
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: isActive ? colors[s] : 'var(--vp-bg-surface)',
                  color: isActive ? '#FFFFFF' : 'var(--vp-text-secondary)',
                  border: `1px solid ${isActive ? colors[s] : 'var(--vp-border)'}`,
                  boxShadow: isActive ? 'var(--vp-shadow-sm)' : 'none',
                }}
              >
                {labels[s]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Visits List ── */}
      <div className="vp-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 skeleton-shimmer" />
            ))}
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--vp-teal-light)' }}
            >
              <ClipboardList className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
              {search || statusFilter !== 'ALL'
                ? 'No visits match your filters'
                : 'No visits recorded yet'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filter'
                : 'Start by logging your first doctor visit'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <button onClick={() => navigate('/visits/new')} className="btn-primary">
                Log First Visit
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
            {filteredVisits.map((visit: VisitDto) => (
              <div
                key={visit.id}
                onClick={() => navigate(`/visits/${visit.id}`)}
                className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Status icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      statusConfig[visit.status as keyof typeof statusConfig]?.bg ??
                      'var(--vp-bg-hover)',
                    color:
                      statusConfig[visit.status as keyof typeof statusConfig]?.color ??
                      'var(--vp-text-muted)',
                  }}
                >
                  <ClipboardList className="w-5 h-5" />
                </div>

                {/* Visit info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {visit.doctorName}
                    </p>
                    <VisitStatusBadge status={visit.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Stethoscope className="w-3 h-3" />
                      {visit.doctorSpecialty}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(visit.visitDate), 'MMM d, yyyy')}
                    </span>
                    {isOwnerOrManager && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        <User className="w-3 h-3" />
                        {visit.repName}
                      </span>
                    )}
                    {visit.visitProducts.length > 0 && (
                      <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                        {visit.visitProducts.length} product(s)
                      </span>
                    )}
                  </div>
                  {visit.notes && (
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--vp-text-muted)' }}>
                      {visit.notes}
                    </p>
                  )}
                </div>

                <ChevronRight
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--vp-text-muted)' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Visit Modal ── */}
      <CreateVisitModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        repId={user?.id ?? ''}
      />
    </div>
  )
}
