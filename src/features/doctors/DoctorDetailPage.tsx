import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Stethoscope,
  MapPin,
  Phone,
  Mail,
  Building2,
  Edit2,
  UserX,
  UserCheck,
  Loader2,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Brain,
  ChevronRight,
  Pill,
  Globe,
  Languages,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetDoctorByIdQuery,
  useUpdateDoctorMutation,
  useDeactivateDoctorMutation,
  useGetVisitsByDoctorQuery,
} from './doctorsApi'
import { useGetDoctorEngagementQuery } from '@/features/ai/aiApi'
import type { UpdateDoctorRequest } from '@/types/doctor'
import type { VisitDto } from '@/types/visit'
import { useGetAllTerritoriesQuery } from '@/features/territories/territoriesApi'

// ── Tier config — same as DoctorsPage for consistency ────────
const tierConfig = {
  A: { label: 'Tier A', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
  B: { label: 'Tier B', color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
  C: { label: 'Tier C', color: 'var(--vp-amber)', bg: 'var(--vp-amber-light)' },
}

// ── Zod schema for the edit form ──────────────────────────────
// Mirrors UpdateDoctorRequest exactly — required fields match @NotBlank on backend
const editDoctorSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  hospitalName: z.string().optional(),
  tier: z.enum(['A', 'B', 'C'], { message: 'Tier is required' }),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  territoryId: z.string().optional(),
})

type EditDoctorForm = z.infer<typeof editDoctorSchema>

// ── TierBadge — reused from DoctorsPage pattern ───────────────
function TierBadge({ tier }: { tier: 'A' | 'B' | 'C' }) {
  const config = tierConfig[tier]
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}30` }}
    >
      {config.label}
    </span>
  )
}

// ── VisitStatusBadge — same pattern as DashboardPage ─────────
function VisitStatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED')
    return (
      <span className="badge-teal flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    )
  if (status === 'PLANNED')
    return (
      <span className="badge-amber flex items-center gap-1">
        <Clock className="w-3 h-3" /> Planned
      </span>
    )
  return (
    <span className="badge-crimson flex items-center gap-1">
      <XCircle className="w-3 h-3" /> Missed
    </span>
  )
}

// ── Engagement score colour logic ─────────────────────────────
// Score is 0–100. We map ranges to our brand colours.
function getScoreColor(score: number): string {
  if (score >= 70) return 'var(--vp-teal)'
  if (score >= 40) return 'var(--vp-amber)'
  return 'var(--vp-rose)'
}

// ── EditDoctorModal ───────────────────────────────────────────
// A self-contained modal that receives the current doctor data,
// pre-populates the form, and calls updateDoctor on submit.
// Keeping it as a separate component keeps the main page clean.
interface EditDoctorModalProps {
  open: boolean
  onClose: () => void
  doctorId: string
  defaultValues: EditDoctorForm
}

function EditDoctorModal({ open, onClose, doctorId, defaultValues }: EditDoctorModalProps) {
  const [updateDoctor, { isLoading }] = useUpdateDoctorMutation()
  const { data: territoriesData } = useGetAllTerritoriesQuery()
  const territories = territoriesData?.data ?? []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditDoctorForm>({
    resolver: zodResolver(editDoctorSchema),
    // defaultValues pre-populates every field with the current doctor data
    // so the user sees existing values, not empty inputs
    defaultValues,
  })

  const onSubmit = async (data: EditDoctorForm) => {
    try {
      // Build the UpdateDoctorRequest — strip empty strings to undefined
      // so the backend receives clean optional fields
      const body: UpdateDoctorRequest = {
        fullName: data.fullName,
        specialty: data.specialty,
        hospitalName: data.hospitalName || undefined,
        tier: data.tier,
        phone: data.phone || undefined,
        email: data.email || undefined,
        city: data.city,
        state: data.state,
        territoryId: data.territoryId || undefined,
      }
      await updateDoctor({ id: doctorId, body }).unwrap()
      toast.success('Doctor updated successfully')
      onClose()
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update doctor')
    }
  }

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Edit Doctor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Full Name */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Full Name *
            </label>
            <input {...register('fullName')} className="input-dark" placeholder="Dr. Priya Patel" />
            {errors.fullName && (
              <p className="text-xs mt-1 text-rose-500">{errors.fullName.message}</p>
            )}
          </div>

          {/* Specialty */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Specialty *
            </label>
            <input {...register('specialty')} className="input-dark" placeholder="Cardiologist" />
            {errors.specialty && (
              <p className="text-xs mt-1 text-rose-500">{errors.specialty.message}</p>
            )}
          </div>

          {/* Hospital */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Hospital Name
            </label>
            <input
              {...register('hospitalName')}
              className="input-dark"
              placeholder="City General Hospital"
            />
          </div>

          {/* Tier */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Tier *
            </label>
            <select
              {...register('tier')}
              className="input-dark"
              style={{ background: 'var(--vp-bg-surface)' }}
            >
              <option value="A">Tier A — High value</option>
              <option value="B">Tier B — Medium value</option>
              <option value="C">Tier C — Low value</option>
            </select>
            {errors.tier && <p className="text-xs mt-1 text-rose-500">{errors.tier.message}</p>}
          </div>

          {/* City + State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                City *
              </label>
              <input {...register('city')} className="input-dark" placeholder="Mumbai" />
              {errors.city && <p className="text-xs mt-1 text-rose-500">{errors.city.message}</p>}
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                State *
              </label>
              <input {...register('state')} className="input-dark" placeholder="Maharashtra" />
              {errors.state && <p className="text-xs mt-1 text-rose-500">{errors.state.message}</p>}
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Phone
              </label>
              <input {...register('phone')} className="input-dark" placeholder="9876543210" />
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Email
              </label>
              <input
                {...register('email')}
                className="input-dark"
                placeholder="dr@hospital.com"
                type="email"
              />
              {errors.email && <p className="text-xs mt-1 text-rose-500">{errors.email.message}</p>}
            </div>
          </div>
          {/* Territory */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Territory
            </label>
            <select
              {...register('territoryId')}
              className="input-dark"
              style={{ background: 'var(--vp-bg-surface)' }}
            >
              <option value="">No territory assigned</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.state}
                </option>
              ))}
            </select>
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOwnerOrManager } = useAuth()

  // UI state
  const [showEdit, setShowEdit] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [showReactivate, setShowReactivate] = useState(false)
  // Controls the AI panel language — 'en' shows analysis/recommendations,
  // 'mr' shows analysisMr/recommendationsMr from the same DTO
  const [aiLang, setAiLang] = useState<'en' | 'mr'>('en')

  // ── Data fetching ─────────────────────────────────────────
  // All three queries fire in parallel as soon as the page mounts.
  // RTK Query deduplicates and caches them automatically.
  const {
    data: doctorData,
    isLoading: doctorLoading,
    isError: doctorError,
  } = useGetDoctorByIdQuery(id ?? '', { skip: !id })

  const { data: visitsData, isLoading: visitsLoading } = useGetVisitsByDoctorQuery(id ?? '', {
    skip: !id,
  })

  const { data: engagementData, isLoading: engagementLoading } = useGetDoctorEngagementQuery(
    id ?? '',
    { skip: !id }
  )

  const [updateDoctorInline] = useUpdateDoctorMutation()
  const [deactivateDoctor, { isLoading: deactivating }] = useDeactivateDoctorMutation()

  const doctor = doctorData?.data
  const visits = visitsData?.data ?? []
  const engagement = engagementData?.data

  // Sort visits newest first
  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  )

  // ── Deactivate handler ────────────────────────────────────
  const onDeactivate = async () => {
    if (!id) return
    try {
      await deactivateDoctor(id).unwrap()
      toast.success('Doctor deactivated successfully')
      setShowDeactivate(false)
      // Navigate back to doctors list — the doctor is now inactive
      navigate('/doctors')
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to deactivate doctor')
    }
  }

  const onReactivate = async () => {
    if (!id || !doctor) return
    try {
      await updateDoctorInline({
        id: id!,
        body: { ...editDefaultValues, isActive: true },
      })
      toast.success('Doctor reactivated successfully')
      setShowReactivate(false)
    } catch {
      toast.error('Failed to reactivate doctor')
    }
  }

  // ── Loading state ─────────────────────────────────────────
  if (doctorLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full skeleton-shimmer" />
            <Skeleton className="h-64 w-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-96 w-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // ── Error / not found state ───────────────────────────────
  if (doctorError || !doctor) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <Stethoscope className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          Doctor not found
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
          This doctor may have been removed or the link is invalid.
        </p>
        <button onClick={() => navigate('/doctors')} className="btn-primary">
          Back to Doctors
        </button>
      </div>
    )
  }

  // Build defaultValues for the edit form from the current doctor data.
  // This runs only when doctor is defined — safe after the loading checks above.
  const editDefaultValues: EditDoctorForm = {
    fullName: doctor.fullName,
    specialty: doctor.specialty,
    hospitalName: doctor.hospitalName ?? '',
    tier: doctor.tier,
    phone: doctor.phone ?? '',
    email: doctor.email ?? '',
    city: doctor.city,
    state: doctor.state,
    territoryId: doctor.territoryId ?? '',
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Back button + doctor name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctors')}
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
                {doctor.fullName}
              </h1>
              <TierBadge tier={doctor.tier} />
              {/* Active / Inactive status badge */}
              {doctor.isActive ? (
                <span className="badge-teal">Active</span>
              ) : (
                <span className="badge-crimson">Inactive</span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {doctor.specialty}
              {doctor.hospitalName && ` • ${doctor.hospitalName}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          {/* Deactivate/Reactivate only for Owner and Manager */}
          {isOwnerOrManager &&
            (doctor.isActive ? (
              <button
                onClick={() => setShowDeactivate(true)}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all"
                style={{
                  background: 'var(--vp-rose-light)',
                  color: 'var(--vp-rose)',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <UserX className="w-4 h-4" /> Deactivate
              </button>
            ) : (
              // Reactivation: calls updateDoctor with isActive: true
              // There is no separate /reactivate endpoint on the backend
              <button
                onClick={() => setShowReactivate(true)}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all"
                style={{
                  background: 'var(--vp-teal-light)',
                  color: 'var(--vp-teal)',
                  border: '1px solid rgba(0,196,154,0.2)',
                }}
              >
                <UserCheck className="w-4 h-4" /> Reactivate
              </button>
            ))}
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Doctor Info Card */}
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-teal-light)' }}
              >
                <Stethoscope className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Doctor Information
              </h2>
            </div>

            {/* Info grid — 2 columns on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <Stethoscope className="w-4 h-4" />,
                  label: 'Specialty',
                  value: doctor.specialty,
                },
                {
                  icon: <Building2 className="w-4 h-4" />,
                  label: 'Hospital',
                  value: doctor.hospitalName ?? '—',
                },
                { icon: <MapPin className="w-4 h-4" />, label: 'City', value: doctor.city },
                { icon: <MapPin className="w-4 h-4" />, label: 'State', value: doctor.state },
                { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: doctor.phone ?? '—' },
                { icon: <Mail className="w-4 h-4" />, label: 'Email', value: doctor.email ?? '—' },
                {
                  icon: <MapPin className="w-4 h-4" />,
                  label: 'Territory',
                  value: doctor.territoryName ?? '—',
                },
                {
                  icon: <Pill className="w-4 h-4" />,
                  label: 'Tier',
                  value: tierConfig[doctor.tier].label,
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
                    style={{ background: 'var(--vp-teal-dim)', color: 'var(--vp-teal)' }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                      {item.label}
                    </p>
                    <p
                      className="text-sm font-semibold mt-0.5 break-all"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timestamps */}
            <div
              className="flex items-center gap-4 mt-4 pt-4 text-xs"
              style={{ borderTop: '1px solid var(--vp-border)', color: 'var(--vp-text-muted)' }}
            >
              <span>Created: {format(parseISO(doctor.createdAt), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>Updated: {format(parseISO(doctor.updatedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {/* ── Visit History ── */}
          <div className="vp-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--vp-purple-light)' }}
                >
                  <ClipboardList className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                    Visit History
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                    {visits.length} total visits
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/visits/new')}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                + Log Visit
              </button>
            </div>

            {visitsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 skeleton-shimmer" />
                ))}
              </div>
            ) : sortedVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--vp-purple-light)' }}
                >
                  <ClipboardList className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--vp-text-secondary)' }}>
                  No visits recorded yet
                </p>
                <button
                  onClick={() => navigate('/visits/new')}
                  className="mt-2 text-xs font-semibold"
                  style={{ color: 'var(--vp-teal)' }}
                >
                  Log the first visit →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedVisits.map((visit: VisitDto) => (
                  <div
                    key={visit.id}
                    onClick={() => navigate(`/visits/${visit.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: 'var(--vp-bg-surface-alt)',
                      border: '1px solid var(--vp-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--vp-teal-dim)'
                      e.currentTarget.style.borderColor = 'var(--vp-teal)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--vp-bg-surface-alt)'
                      e.currentTarget.style.borderColor = 'var(--vp-border)'
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--vp-purple-light)' }}
                      >
                        <ClipboardList className="w-4 h-4" style={{ color: 'var(--vp-purple)' }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          {format(parseISO(visit.visitDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--vp-text-muted)' }}>
                          {visit.repName}
                          {visit.visitProducts.length > 0 &&
                            ` • ${visit.visitProducts.length} product(s)`}
                          {visit.notes &&
                            ` • ${visit.notes.slice(0, 40)}${visit.notes.length > 40 ? '…' : ''}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <VisitStatusBadge status={visit.status} />
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--vp-text-muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column (1/3 width) — AI Engagement Panel ── */}
        <div className="space-y-4">
          <div className="vp-card p-6">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--vp-purple-dim)' }}
                >
                  <Brain className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                    AI Engagement
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                    Cached 24h
                  </p>
                </div>
              </div>

              {/* EN / MR language toggle */}
              <div
                className="flex rounded-lg overflow-hidden text-xs font-semibold"
                style={{ border: '1px solid var(--vp-border)' }}
              >
                <button
                  onClick={() => setAiLang('en')}
                  className="px-3 py-1.5 flex items-center gap-1 transition-colors"
                  style={{
                    background: aiLang === 'en' ? 'var(--vp-teal)' : 'transparent',
                    color: aiLang === 'en' ? '#FFFFFF' : 'var(--vp-text-muted)',
                  }}
                >
                  <Globe className="w-3 h-3" /> EN
                </button>
                <button
                  onClick={() => setAiLang('mr')}
                  className="px-3 py-1.5 flex items-center gap-1 transition-colors"
                  style={{
                    background: aiLang === 'mr' ? 'var(--vp-purple)' : 'transparent',
                    color: aiLang === 'mr' ? '#FFFFFF' : 'var(--vp-text-muted)',
                  }}
                >
                  <Languages className="w-3 h-3" /> MR
                </button>
              </div>
            </div>

            {engagementLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full skeleton-shimmer" />
                <Skeleton className="h-20 w-full skeleton-shimmer" />
                <Skeleton className="h-20 w-full skeleton-shimmer" />
              </div>
            ) : engagement ? (
              <div className="space-y-4">
                {/* Score gauge */}
                <div
                  className="p-4 rounded-xl text-center"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    Engagement Score
                  </p>
                  {/* Score number — coloured by range */}
                  <p
                    className="text-4xl font-bold mb-1"
                    style={{
                      color: getScoreColor(engagement.engagementScore),
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {engagement.engagementScore}
                    <span className="text-lg font-normal" style={{ color: 'var(--vp-text-muted)' }}>
                      /100
                    </span>
                  </p>
                  {/* Score bar */}
                  <div
                    className="h-2 rounded-full overflow-hidden mt-2"
                    style={{ background: 'var(--vp-bg-hover)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${engagement.engagementScore}%`,
                        background: getScoreColor(engagement.engagementScore),
                      }}
                    />
                  </div>
                  {/* Level label — HIGH / MEDIUM / LOW from backend */}
                  <p
                    className="text-xs font-semibold mt-2"
                    style={{ color: getScoreColor(engagement.engagementScore) }}
                  >
                    {engagement.engagementLevel}
                  </p>
                </div>

                {/* Analysis section */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    Analysis
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--vp-text-secondary)' }}
                  >
                    {/* Bilingual toggle — English or Marathi text from the same DTO */}
                    {aiLang === 'en' ? engagement.analysis : engagement.analysisMr}
                  </p>
                </div>

                {/* Recommendations section */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    Recommendations
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--vp-text-secondary)' }}
                  >
                    {aiLang === 'en' ? engagement.recommendations : engagement.recommendationsMr}
                  </p>
                </div>
              </div>
            ) : (
              // AI endpoint failed or returned nothing
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Brain className="w-8 h-8 mb-2" style={{ color: 'var(--vp-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--vp-text-secondary)' }}>
                  AI analysis unavailable
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Requires at least one completed visit
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {doctor && (
        <EditDoctorModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          doctorId={id!}
          defaultValues={editDefaultValues}
        />
      )}

      {/* ── Deactivate Confirmation Modal ── */}
      <Dialog open={showDeactivate} onOpenChange={() => setShowDeactivate(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Deactivate Doctor</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{doctor.fullName}</strong>? They
            will no longer appear in active doctor lists.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowDeactivate(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onDeactivate}
              disabled={deactivating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--vp-rose)', color: '#FFFFFF' }}
            >
              {deactivating && <Loader2 className="w-4 h-4 animate-spin" />}
              {deactivating ? 'Deactivating...' : 'Deactivate'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Reactivate Confirmation Modal ── */}
      <Dialog open={showReactivate} onOpenChange={() => setShowReactivate(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Reactivate Doctor</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to reactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{doctor?.fullName}</strong>? They
            will appear in active doctor lists again.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowReactivate(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onReactivate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--vp-teal)', color: '#FFFFFF' }}
            >
              <UserCheck className="w-4 h-4" /> Reactivate
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
