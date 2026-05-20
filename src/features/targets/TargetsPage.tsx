// src/features/targets/TargetsPage.tsx
import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Target, Plus, Edit2, Loader2, User, CheckCircle2, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetTargetsByRepQuery,
  useCreateTargetMutation,
  useUpdateTargetMutation,
} from './targetsApi'
import { useGetUsersByRoleQuery } from '@/features/users/usersApi'
import type { CallTargetDto } from '@/types/target'

// ── Month names helper ─────────────────────────────────────────────────────────
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// ── Create schema ──────────────────────────────────────────────────────────────
const createTargetSchema = z.object({
  repId: z.string().min(1, 'Please select a rep'),
  month: z.number({ error: 'Month is required' }).min(1).max(12),
  year: z.number({ error: 'Year is required' }).min(2020).max(2100),
  targetVisits: z.number({ error: 'Target visits is required' }).min(1, 'Minimum 1 visit'),
})

type CreateTargetForm = z.infer<typeof createTargetSchema>

// ── Edit schema ────────────────────────────────────────────────────────────────
const editTargetSchema = z.object({
  targetVisits: z.number({ error: 'Target visits is required' }).min(1, 'Minimum 1'),
  actualVisits: z.number({ error: 'Actual visits is required' }).min(0, 'Cannot be negative'),
})

type EditTargetForm = z.infer<typeof editTargetSchema>

export default function TargetsPage() {
  const { user, isOwnerOrManager } = useAuth()

  // ── Rep selection — REPs see their own, Owner/Manager pick from dropdown ───
  // If REP, selectedRepId is always their own ID
  const [selectedRepId, setSelectedRepId] = useState(isOwnerOrManager ? '' : (user?.id ?? ''))

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<CallTargetDto | null>(null)

  // ── Reference data — REPs list for selector ────────────────────────────────
  const { data: repsData } = useGetUsersByRoleQuery('REP', { skip: !isOwnerOrManager })
  const reps = useMemo(() => repsData?.data ?? [], [repsData])

  // ── Targets query — fires when a rep is selected ───────────────────────────
  const { data: targetsData, isLoading } = useGetTargetsByRepQuery(selectedRepId, {
    skip: !selectedRepId,
  })
  const targets = useMemo(() => targetsData?.data ?? [], [targetsData])

  // ── Selected rep name for display ──────────────────────────────────────────
  const selectedRepName = useMemo(() => {
    if (!selectedRepId) return ''
    if (!isOwnerOrManager) return user?.fullName ?? ''
    return reps.find((r) => r.id === selectedRepId)?.fullName ?? ''
  }, [selectedRepId, isOwnerOrManager, user, reps])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const [createTarget, { isLoading: creating }] = useCreateTargetMutation()
  const [updateTarget, { isLoading: updating }] = useUpdateTargetMutation()

  // ── Create form ────────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateTargetForm>({
    resolver: zodResolver(createTargetSchema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
    },
  })

  const onCreateSubmit = async (formData: CreateTargetForm) => {
    if (!user?.id) return
    try {
      await createTarget({
        repId: formData.repId,
        assignedById: user.id, // current logged-in user is the assigner
        month: formData.month,
        year: formData.year,
        targetVisits: formData.targetVisits,
      }).unwrap()
      toast.success('Target created successfully')
      resetCreate()
      setShowCreate(false)
      // If the target was for the currently viewed rep, it auto-refetches
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to create target')
    }
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditTargetForm>({
    resolver: zodResolver(editTargetSchema),
  })

  const openEdit = (target: CallTargetDto) => {
    setEditTarget(target)
    resetEdit({
      targetVisits: target.targetVisits,
      actualVisits: target.actualVisits,
    })
  }

  const onEditSubmit = async (formData: EditTargetForm) => {
    if (!editTarget) return
    try {
      await updateTarget({
        id: editTarget.id,
        body: {
          targetVisits: formData.targetVisits,
          actualVisits: formData.actualVisits,
        },
      }).unwrap()
      toast.success('Target updated successfully')
      setEditTarget(null)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update target')
    }
  }

  // ── Achievement color helper ───────────────────────────────────────────────
  function achievementColor(pct: number) {
    if (pct >= 100) return 'var(--vp-teal)'
    if (pct >= 70) return 'var(--vp-amber)'
    return 'var(--vp-rose)'
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Call Targets
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            Monthly visit targets and achievement tracking
          </p>
        </div>
        {isOwnerOrManager && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Assign Target
          </button>
        )}
      </div>

      {/* ── Rep selector — Owner/Manager only ───────────────────────────────── */}
      {isOwnerOrManager && (
        <div className="vp-card p-5">
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: 'var(--vp-text-secondary)' }}
          >
            Select Rep
          </label>
          <div className="relative">
            <User
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--vp-text-muted)' }}
            />
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="input-dark w-full"
              style={{ paddingLeft: '2.5rem' }}
            >
              <option value="">Select a sales rep to view targets...</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Target results ───────────────────────────────────────────────────── */}
      {!selectedRepId ? (
        <div className="vp-card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--vp-teal-light)' }}
            >
              <Target className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              Select a rep above
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--vp-text-muted)' }}>
              Choose a sales rep to view their monthly targets
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 skeleton-shimmer" />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <div className="vp-card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--vp-bg-surface-alt)' }}
            >
              <Target className="w-8 h-8" style={{ color: 'var(--vp-text-muted)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              No targets assigned for {selectedRepName}
            </p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--vp-text-muted)' }}>
              Assign monthly visit targets to track performance
            </p>
            {isOwnerOrManager && (
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
                Assign First Target
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Result header */}
          <p className="text-xs font-semibold px-1" style={{ color: 'var(--vp-text-muted)' }}>
            {targets.length} target{targets.length !== 1 ? 's' : ''} for{' '}
            <span style={{ color: 'var(--vp-text-primary)' }}>{selectedRepName}</span>
          </p>

          {targets.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              isOwnerOrManager={isOwnerOrManager}
              achievementColor={achievementColor}
              onEdit={() => openEdit(target)}
            />
          ))}
        </div>
      )}

      {/* ── Create Target Modal ──────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Assign Target</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4 mt-2">
            {/* Rep selector */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Sales Rep *
              </label>
              <select {...registerCreate('repId')} className="input-dark w-full">
                <option value="">Select rep</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName}
                  </option>
                ))}
              </select>
              {createErrors.repId && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {createErrors.repId.message}
                </p>
              )}
            </div>

            {/* Month + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Month *
                </label>
                <select
                  {...registerCreate('month', { valueAsNumber: true })}
                  className="input-dark w-full"
                >
                  {MONTHS.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                {createErrors.month && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {createErrors.month.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Year *
                </label>
                <select
                  {...registerCreate('year', { valueAsNumber: true })}
                  className="input-dark w-full"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {createErrors.year && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {createErrors.year.message}
                  </p>
                )}
              </div>
            </div>

            {/* Target Visits */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Target Visits *
              </label>
              <input
                {...registerCreate('targetVisits', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="e.g. 20"
                className="input-dark w-full"
              />
              {createErrors.targetVisits && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {createErrors.targetVisits.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetCreate()
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
                {creating ? 'Assigning...' : 'Assign Target'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Target Modal ────────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Edit Target</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div
              className="px-3 py-2 rounded-lg text-xs mb-2"
              style={{ background: 'var(--vp-bg-surface-alt)', color: 'var(--vp-text-muted)' }}
            >
              {MONTHS[editTarget.month - 1]} {editTarget.year} · {editTarget.repName}
            </div>
          )}
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Target Visits *
              </label>
              <input
                {...registerEdit('targetVisits', { valueAsNumber: true })}
                type="number"
                min={1}
                className="input-dark w-full"
              />
              {editErrors.targetVisits && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {editErrors.targetVisits.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Actual Visits *
              </label>
              <input
                {...registerEdit('actualVisits', { valueAsNumber: true })}
                type="number"
                min={0}
                className="input-dark w-full"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
                Normally auto-incremented by completed visits — correct only if needed
              </p>
              {editErrors.actualVisits && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {editErrors.actualVisits.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
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
    </div>
  )
}

// ── TargetCard ─────────────────────────────────────────────────────────────────
interface TargetCardProps {
  target: CallTargetDto
  isOwnerOrManager: boolean
  achievementColor: (pct: number) => string
  onEdit: () => void
}

function TargetCard({ target, isOwnerOrManager, achievementColor, onEdit }: TargetCardProps) {
  const pct = Math.min(target.achievementPct, 100)
  const color = achievementColor(target.achievementPct)
  const isComplete = target.achievementPct >= 100

  return (
    <div className="vp-card p-5">
      <div className="flex items-start justify-between gap-3">
        {/* Left — month + rep info */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: isComplete ? 'var(--vp-teal-light)' : 'var(--vp-bg-surface-alt)' }}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
            ) : (
              <Target className="w-5 h-5" style={{ color: 'var(--vp-text-muted)' }} />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              {MONTHS[target.month - 1]} {target.year}
            </p>
            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
              Assigned by {target.assignedByName}
            </p>
          </div>
        </div>

        {/* Right — stats + edit */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color, fontFamily: 'var(--font-display)' }}>
              {target.actualVisits}
              <span className="text-sm font-normal" style={{ color: 'var(--vp-text-muted)' }}>
                /{target.targetVisits}
              </span>
            </p>
            <p className="text-xs font-semibold" style={{ color }}>
              {target.achievementPct.toFixed(1)}%
            </p>
          </div>
          {isOwnerOrManager && (
            <button
              onClick={onEdit}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--vp-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--vp-bg-surface-alt)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
            <TrendingUp className="w-3 h-3 inline mr-0.5" />
            {target.actualVisits} visits completed
          </p>
          <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
            {Math.max(0, target.targetVisits - target.actualVisits)} remaining
          </p>
        </div>
      </div>
    </div>
  )
}
