// src/features/inventory/BatchDetailPage.tsx
import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Package,
  Calendar,
  Hash,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetBatchByIdQuery,
  useGetMovementsByBatchQuery,
  useAdjustStockMutation,
  useWriteOffBatchMutation,
} from './inventoryApi'
import type { StockMovementDto, MovementType } from '@/types/inventory'

// ── Zod schema for Adjust Stock form ──────────────────────────────────────────
// quantity can be positive (stock in) or negative (stock out)
// No min/max — backend validates that result won't go below zero
const adjustSchema = z.object({
  quantity: z.number({ error: 'Quantity is required' }).refine((n) => n !== 0, {
    message: 'Quantity cannot be zero',
  }),
  reason: z.string().min(1, 'Reason is required — it becomes the audit trail note'),
})

type AdjustForm = z.infer<typeof adjustSchema>

// ── Movement type display config ───────────────────────────────────────────────
// Each MovementType gets a colour, icon, and label for the audit trail table
function getMovementStyle(type: MovementType): {
  label: string
  color: string
  bg: string
  icon: React.ReactNode
} {
  switch (type) {
    case 'INWARD':
      return {
        label: 'Stock In',
        color: 'var(--vp-teal)',
        bg: 'var(--vp-teal-light)',
        icon: <TrendingUp className="w-3.5 h-3.5" />,
      }
    case 'SALE':
      return {
        label: 'Sale',
        color: 'var(--vp-purple)',
        bg: 'var(--vp-purple-light)',
        icon: <TrendingDown className="w-3.5 h-3.5" />,
      }
    case 'SAMPLE':
      return {
        label: 'Sample',
        color: 'var(--vp-text-secondary)',
        bg: 'var(--vp-bg-surface-alt)',
        icon: <Package className="w-3.5 h-3.5" />,
      }
    case 'RETURN':
      return {
        label: 'Return',
        color: 'var(--vp-teal)',
        bg: 'var(--vp-teal-light)',
        icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
      }
    case 'ADJUSTMENT':
      return {
        label: 'Adjustment',
        color: 'var(--vp-amber)',
        bg: 'var(--vp-amber-light)',
        icon: <Edit2 className="w-3.5 h-3.5" />,
      }
    case 'EXPIRY_WRITEOFF':
      return {
        label: 'Write-off',
        color: 'var(--vp-rose)',
        bg: 'var(--vp-rose-light)',
        icon: <Trash2 className="w-3.5 h-3.5" />,
      }
  }
}

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOwner } = useAuth()

  const [showAdjust, setShowAdjust] = useState(false)
  const [showWriteOff, setShowWriteOff] = useState(false)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: batchData, isLoading, isError } = useGetBatchByIdQuery(id ?? '')
  const { data: movementsData, isLoading: movementsLoading } = useGetMovementsByBatchQuery(
    id ?? '',
    { skip: !id }
  )

  const batch = batchData?.data
  const movements = useMemo(() => movementsData?.data ?? [], [movementsData])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const [adjustStock, { isLoading: adjusting }] = useAdjustStockMutation()
  const [writeOffBatch, { isLoading: writingOff }] = useWriteOffBatchMutation()

  // ── Adjust Stock form ──────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
  })

  const onAdjust = async (formData: AdjustForm) => {
    if (!id) return
    try {
      await adjustStock({
        batchId: id,
        body: { quantity: formData.quantity, reason: formData.reason },
      }).unwrap()
      toast.success('Stock adjusted successfully')
      reset()
      setShowAdjust(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to adjust stock')
    }
  }

  // ── Write Off handler — no form, just confirmation ─────────────────────────
  const onWriteOff = async () => {
    if (!id) return
    try {
      await writeOffBatch(id).unwrap()
      toast.success('Batch written off successfully')
      setShowWriteOff(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to write off batch')
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 skeleton-shimmer" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-64 skeleton-shimmer" />
          </div>
        </div>
      </div>
    )
  }

  // ── Error / not found ──────────────────────────────────────────────────────
  if (isError || !batch) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package className="w-12 h-12 mb-4" style={{ color: 'var(--vp-text-muted)' }} />
        <p className="text-lg font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
          Batch not found
        </p>
        <button onClick={() => navigate('/inventory')} className="btn-secondary mt-4 text-sm">
          Back to Inventory
        </button>
      </div>
    )
  }

  // ── Stock fill percentage for the visual bar ───────────────────────────────
  const fillPct =
    batch.initialQuantity > 0
      ? Math.round((batch.currentQuantity / batch.initialQuantity) * 100)
      : 0

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/inventory')}
          className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--vp-text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
            >
              {batch.batchNumber}
            </h1>
            {batch.isExpired && <span className="badge-crimson">Expired</span>}
            {batch.isNearExpiry && !batch.isExpired && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--vp-amber-light)', color: 'var(--vp-amber)' }}
              >
                Near Expiry
              </span>
            )}
            {!batch.isExpired && !batch.isNearExpiry && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
              >
                Active
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {batch.productName}
          </p>
        </div>

        {/* OWNER-only action buttons */}
        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdjust(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" />
              Adjust Stock
            </button>
            {/* Write-off only available if batch is expired AND has stock remaining */}
            {batch.isExpired && batch.currentQuantity > 0 && (
              <button
                onClick={() => setShowWriteOff(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: 'var(--vp-rose)', color: '#FFFFFF' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.opacity = '0.9')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.opacity = '1')
                }
              >
                <Trash2 className="w-4 h-4" />
                Write Off
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main content — 2 column on large screens ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left — Batch Info Card ─────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="vp-card p-6 space-y-5">

            {/* Product icon + name */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--vp-purple-light)' }}
              >
                <Package className="w-6 h-6" style={{ color: 'var(--vp-purple)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  {batch.productName}
                </p>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  HSN: {batch.hsnCode}
                </p>
              </div>
            </div>

            {/* Stock level visual bar */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--vp-text-secondary)' }}>
                  Stock Level
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: batch.isExpired
                      ? 'var(--vp-rose)'
                      : batch.isNearExpiry
                        ? 'var(--vp-amber)'
                        : 'var(--vp-teal)',
                  }}
                >
                  {batch.currentQuantity}
                  <span
                    className="text-sm font-normal ml-1"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    units
                  </span>
                </p>
              </div>
              {/* Progress bar */}
              <div
                className="w-full h-2.5 rounded-full overflow-hidden"
                style={{ background: 'var(--vp-bg-surface-alt)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fillPct}%`,
                    background: batch.isExpired
                      ? 'var(--vp-rose)'
                      : batch.isNearExpiry
                        ? 'var(--vp-amber)'
                        : 'var(--vp-teal)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  0
                </p>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  {fillPct}% remaining
                </p>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  {batch.initialQuantity}
                </p>
              </div>
            </div>

            {/* Info grid */}
            <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--vp-border)' }}>
              {[
                {
                  icon: <Hash className="w-4 h-4" />,
                  label: 'Batch Number',
                  value: batch.batchNumber,
                },
                {
                  icon: <Calendar className="w-4 h-4" />,
                  label: 'Mfg Date',
                  value: format(parseISO(batch.mfgDate), 'MMM d, yyyy'),
                },
                {
                  icon: batch.isExpired ? (
                    <XCircle className="w-4 h-4" style={{ color: 'var(--vp-rose)' }} />
                  ) : (
                    <AlertTriangle className="w-4 h-4" style={{ color: 'var(--vp-amber)' }} />
                  ),
                  label: 'Expiry Date',
                  value: format(parseISO(batch.expiryDate), 'MMM d, yyyy'),
                  valueColor: batch.isExpired
                    ? 'var(--vp-rose)'
                    : batch.isNearExpiry
                      ? 'var(--vp-amber)'
                      : 'var(--vp-text-primary)',
                },
                {
                  icon: <Package className="w-4 h-4" />,
                  label: 'Initial Quantity',
                  value: `${batch.initialQuantity} units`,
                },
                {
                  icon: <CheckCircle className="w-4 h-4" />,
                  label: 'Units Consumed',
                  value: `${batch.initialQuantity - batch.currentQuantity} units`,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--vp-bg-surface-alt)', color: 'var(--vp-text-muted)' }}
                  >
                    {row.icon}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      {row.label}
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: row.valueColor ?? 'var(--vp-text-primary)' }}
                    >
                      {row.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timestamps */}
            <div
              className="flex items-center gap-4 pt-3 text-xs"
              style={{ borderTop: '1px solid var(--vp-border)', color: 'var(--vp-text-muted)' }}
            >
              <span>Added: {format(parseISO(batch.createdAt), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>Updated: {format(parseISO(batch.updatedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* ── Right — Stock Movement History ─────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-purple-light)' }}
              >
                <ArrowLeftRight className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Stock Movement History
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  Full audit trail — newest first
                </p>
              </div>
            </div>

            {movementsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 skeleton-shimmer" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ArrowLeftRight
                  className="w-8 h-8 mb-2"
                  style={{ color: 'var(--vp-text-muted)' }}
                />
                <p className="text-sm font-medium" style={{ color: 'var(--vp-text-secondary)' }}>
                  No movements recorded yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {movements.map((movement) => (
                  <MovementRow key={movement.id} movement={movement} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Adjust Stock Modal ───────────────────────────────────────────────── */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Adjust Stock</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
            Current stock:{' '}
            <span className="font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              {batch.currentQuantity} units
            </span>
          </p>
          <form onSubmit={handleSubmit(onAdjust)} className="space-y-4 mt-2">

            {/* Quantity — positive or negative */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Adjustment Quantity *
              </label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                placeholder="Use negative to remove stock, e.g. -10"
                className="input-dark w-full"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
                Positive = add stock · Negative = remove stock
              </p>
              {errors.quantity && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Reason — mandatory audit note */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Reason *
              </label>
              <input
                {...register('reason')}
                type="text"
                placeholder="e.g. Physical count correction"
                className="input-dark w-full"
              />
              {errors.reason && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {errors.reason.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { reset(); setShowAdjust(false) }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {adjusting && <Loader2 className="w-4 h-4 animate-spin" />}
                {adjusting ? 'Adjusting...' : 'Apply Adjustment'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Write Off Confirmation Dialog ────────────────────────────────────── */}
      <Dialog open={showWriteOff} onOpenChange={setShowWriteOff}>
        <DialogContent
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>
              Write Off Expired Batch
            </DialogTitle>
          </DialogHeader>
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--vp-rose-light)', border: '1px solid rgba(244,63,94,0.2)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--vp-rose)' }}>
              This will permanently zero out {batch.currentQuantity} units from batch{' '}
              {batch.batchNumber}.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
              An EXPIRY_WRITEOFF movement will be logged to the audit trail. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowWriteOff(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={onWriteOff}
              disabled={writingOff}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'var(--vp-rose)', color: '#FFFFFF' }}
            >
              {writingOff && <Loader2 className="w-4 h-4 animate-spin" />}
              {writingOff ? 'Writing off...' : 'Confirm Write Off'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ── MovementRow — one row in the audit trail table ────────────────────────────
// Extracted as a local component to keep the main JSX clean
function MovementRow({ movement }: { movement: StockMovementDto }) {
  const style = getMovementStyle(movement.movementType)

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
    >
      {/* Movement type badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
        style={{ background: style.bg, color: style.color }}
      >
        {style.icon}
        {style.label}
      </div>

      {/* Notes / reference */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--vp-text-primary)' }}>
          {movement.notes ?? `${style.label} — ${movement.referenceType ?? 'MANUAL'}`}
        </p>
        {movement.referenceId && (
          <p className="text-xs truncate" style={{ color: 'var(--vp-text-muted)' }}>
            Ref: {movement.referenceId}
          </p>
        )}
      </div>

      {/* Quantity — positive green, negative red */}
      <p
        className="text-sm font-bold shrink-0"
        style={{
          color: movement.quantity > 0 ? 'var(--vp-teal)' : 'var(--vp-rose)',
        }}
      >
        {movement.quantity > 0 ? '+' : ''}
        {movement.quantity}
      </p>

      {/* Timestamp */}
      <p className="text-xs shrink-0" style={{ color: 'var(--vp-text-muted)' }}>
        {format(parseISO(movement.createdAt), 'MMM d, yyyy')}
      </p>
    </div>
  )
}