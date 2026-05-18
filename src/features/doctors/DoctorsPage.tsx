import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetAllDoctorsQuery,
  useGetAllDoctorsIncludingInactiveQuery,
  useCreateDoctorMutation,
  useDeactivateDoctorMutation,
} from './doctorsApi'
import type { DoctorDto } from '@/types/doctor'
import type { CreateDoctorRequest } from '@/types/doctor'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Stethoscope,
  MapPin,
  Phone,
  Mail,
  Building2,
  ChevronRight,
  UserX,
  X,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ── Tier config ───────────────────────────────────────────────
const tierConfig = {
  A: {
    label: 'Tier A',
    color: 'var(--vp-teal)',
    bg: 'var(--vp-teal-light)',
    dark: 'rgba(0,196,154,0.15)',
  },
  B: {
    label: 'Tier B',
    color: 'var(--vp-purple)',
    bg: 'var(--vp-purple-light)',
    dark: 'rgba(124,58,237,0.15)',
  },
  C: {
    label: 'Tier C',
    color: 'var(--vp-amber)',
    bg: 'var(--vp-amber-light)',
    dark: 'rgba(245,158,11,0.15)',
  },
}

// ── Zod schema for create doctor ──────────────────────────────
const createDoctorSchema = z.object({
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

type CreateDoctorForm = z.infer<typeof createDoctorSchema>

// ── Tier Badge ────────────────────────────────────────────────
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

// ── Doctor Card ───────────────────────────────────────────────
interface DoctorCardProps {
  doctor: DoctorDto
  onView: () => void
  onDeactivate: () => void
  canDeactivate: boolean
}

function DoctorCard({ doctor, onView, onDeactivate, canDeactivate }: DoctorCardProps) {
  return (
    <div className="vp-card p-5 cursor-pointer group" onClick={onView}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--vp-teal-light)' }}
          >
            <Stethoscope className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
          </div>
          <div>
            <p
              className="font-semibold text-sm leading-tight"
              style={{ color: 'var(--vp-text-primary)' }}
            >
              {doctor.fullName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {doctor.specialty}
            </p>
          </div>
        </div>
        <TierBadge tier={doctor.tier as 'A' | 'B' | 'C'} />
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-4">
        {doctor.hospitalName && (
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--vp-text-muted)' }} />
            <p className="text-xs truncate" style={{ color: 'var(--vp-text-secondary)' }}>
              {doctor.hospitalName}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--vp-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--vp-text-secondary)' }}>
            {doctor.city}, {doctor.state}
          </p>
        </div>
        {doctor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--vp-text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--vp-text-secondary)' }}>
              {doctor.phone}
            </p>
          </div>
        )}
        {doctor.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--vp-text-muted)' }} />
            <p className="text-xs truncate" style={{ color: 'var(--vp-text-secondary)' }}>
              {doctor.email}
            </p>
          </div>
        )}
        {doctor.territoryName && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--vp-purple)' }} />
            <p className="text-xs" style={{ color: 'var(--vp-purple)' }}>
              {doctor.territoryName}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--vp-border)' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView()
          }}
          className="flex items-center gap-1 text-xs font-semibold transition-colors"
          style={{ color: 'var(--vp-teal)' }}
        >
          View details <ChevronRight className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-2">
          {/* Show inactive badge */}
          {!doctor.isActive && (
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{ background: 'var(--vp-rose-light)', color: 'var(--vp-rose)' }}
            >
              Inactive
            </span>
          )}
          {canDeactivate && doctor.isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeactivate()
              }}
              className="flex items-center gap-1 text-xs font-medium transition-colors px-2.5 py-1.5 rounded-lg"
              style={{
                color: 'var(--vp-rose)',
                background: 'var(--vp-rose-light)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <UserX className="w-3 h-3" /> Deactivate
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function DoctorsPage() {
  const navigate = useNavigate()
  const { isOwnerOrManager } = useAuth()

  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<DoctorDto | null>(null)

  const { data: activeData, isLoading: activeLoading } = useGetAllDoctorsQuery()

  const { data: allData, isLoading: allLoading } = useGetAllDoctorsIncludingInactiveQuery(
    undefined,
    {
      skip: !isOwnerOrManager || !showInactive,
    }
  )

  const isLoading = activeLoading || allLoading

  const data = isOwnerOrManager && showInactive ? allData : activeData
  const [createDoctor, { isLoading: creating }] = useCreateDoctorMutation()
  const [deactivateDoctor, { isLoading: deactivating }] = useDeactivateDoctorMutation()

  // ── Filter logic ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const doctors = data?.data ?? []
    return doctors.filter((d) => {
      const matchesSearch =
        d.fullName.toLowerCase().includes(search.toLowerCase()) ||
        d.specialty.toLowerCase().includes(search.toLowerCase()) ||
        d.city.toLowerCase().includes(search.toLowerCase()) ||
        (d.hospitalName?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchesTier = tierFilter === 'ALL' || d.tier === tierFilter
      return matchesSearch && matchesTier
    })
  }, [data, search, tierFilter])

  // ── Create form ───────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDoctorForm>({
    resolver: zodResolver(createDoctorSchema),
  })

  const onCreateSubmit = async (formData: CreateDoctorForm) => {
    try {
      const request: CreateDoctorRequest = {
        fullName: formData.fullName,
        specialty: formData.specialty,
        hospitalName: formData.hospitalName || undefined,
        tier: formData.tier,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        city: formData.city,
        state: formData.state,
        territoryId: formData.territoryId || undefined,
      }
      await createDoctor(request).unwrap()
      toast.success('Doctor created successfully')
      reset()
      setShowCreate(false)
    } catch {
      toast.error('Failed to create doctor')
    }
  }

  const onDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await deactivateDoctor(deactivateTarget.id).unwrap()
      toast.success(`${deactivateTarget.fullName} deactivated`)
      setDeactivateTarget(null)
    } catch {
      toast.error('Failed to deactivate doctor')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Doctors
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {isOwnerOrManager && showInactive
              ? `${data?.data?.length ?? 0} total doctors (including inactive)`
              : `${data?.data?.length ?? 0} active doctors`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwnerOrManager && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="btn-secondary flex items-center gap-2 text-sm"
              style={{
                background: showInactive ? 'var(--vp-amber-light)' : undefined,
                color: showInactive ? 'var(--vp-amber)' : undefined,
                border: showInactive ? '1px solid rgba(245,158,11,0.3)' : undefined,
              }}
            >
              {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Doctor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--vp-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name, specialty, hospital or city..."
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

        {/* Tier filter */}
        <div className="flex gap-2">
          {(['ALL', 'A', 'B', 'C'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background:
                  tierFilter === tier
                    ? tier === 'ALL'
                      ? 'var(--vp-teal)'
                      : tierConfig[tier].color
                    : 'var(--vp-bg-surface)',
                color: tierFilter === tier ? '#FFFFFF' : 'var(--vp-text-secondary)',
                border: `1px solid ${
                  tierFilter === tier
                    ? tier === 'ALL'
                      ? 'var(--vp-teal)'
                      : tierConfig[tier].color
                    : 'var(--vp-border)'
                }`,
                boxShadow: tierFilter === tier ? 'var(--vp-shadow-sm)' : 'none',
              }}
            >
              {tier === 'ALL' ? 'All Tiers' : `Tier ${tier}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {search || tierFilter !== 'ALL' ? (
        <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
          Showing <strong style={{ color: 'var(--vp-text-primary)' }}>{filtered.length}</strong>{' '}
          result{filtered.length !== 1 ? 's' : ''}
        </p>
      ) : null}

      {/* Doctor grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-52 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center vp-card">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--vp-teal-light)' }}
          >
            <Stethoscope className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
          </div>
          <p className="font-semibold text-base mb-1" style={{ color: 'var(--vp-text-primary)' }}>
            {search || tierFilter !== 'ALL' ? 'No doctors found' : 'No doctors yet'}
          </p>
          <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
            {search || tierFilter !== 'ALL'
              ? 'Try adjusting your search or filters'
              : 'Add your first doctor to get started'}
          </p>
          {!search && tierFilter === 'ALL' && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-sm">
              Add Doctor
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onView={() => navigate(`/doctors/${doctor.id}`)}
              onDeactivate={() => setDeactivateTarget(doctor)}
              canDeactivate={isOwnerOrManager}
            />
          ))}
        </div>
      )}

      {/* ── Create Doctor Modal ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{
            background: 'var(--vp-bg-surface)',
            border: '1px solid var(--vp-border)',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Add New Doctor</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4 mt-2">
            {/* Full name */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Full Name *
              </label>
              <input
                {...register('fullName')}
                className="input-dark"
                placeholder="Dr. Priya Patel"
              />
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
                <option value="">Select tier</option>
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
                {errors.state && (
                  <p className="text-xs mt-1 text-rose-500">{errors.state.message}</p>
                )}
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
                {errors.email && (
                  <p className="text-xs mt-1 text-rose-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  reset()
                  setShowCreate(false)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {creating ? 'Creating...' : 'Create Doctor'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirmation ── */}
      <Dialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <DialogContent
          className="max-w-sm"
          style={{
            background: 'var(--vp-bg-surface)',
            border: '1px solid var(--vp-border)',
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Deactivate Doctor</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>
              {deactivateTarget?.fullName}
            </strong>
            ? They will no longer appear in active doctor lists.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setDeactivateTarget(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onDeactivate}
              disabled={deactivating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: 'var(--vp-rose)',
                color: '#FFFFFF',
              }}
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
