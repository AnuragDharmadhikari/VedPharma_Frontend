import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Hash,
  User,
  Edit2,
  UserX,
  UserCheck,
  Loader2,
  IndianRupee,
  RotateCcw,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetStockistByIdQuery,
  useUpdateStockistMutation,
  useDeactivateStockistMutation,
} from './stockistsApi'
import { useGetUsersByRoleQuery } from '@/features/users/usersApi'
import { useGetPaymentsByStockistQuery } from '@/features/payments/paymentsApi'
import {
  useGetReturnsByStockistQuery,
  useGetCreditNotesByStockistQuery,
} from '@/features/returns/returnsApi'

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

const editStockistSchema = z.object({
  assignedRepId: z.string().min(1, 'Please assign a sales rep'),
  firmName: z.string().min(1, 'Firm name is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  gstin: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format').optional().or(z.literal('')),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
})

type EditStockistForm = z.infer<typeof editStockistSchema>

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function StockistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOwnerOrManager } = useAuth()

  const [showEdit, setShowEdit] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [showReactivate, setShowReactivate] = useState(false)

  const {
    data: stockistData,
    isLoading,
    isError,
  } = useGetStockistByIdQuery(id ?? '', { skip: !id })
  const { data: repsData } = useGetUsersByRoleQuery('REP')
  const [updateStockist, { isLoading: updating }] = useUpdateStockistMutation()
  const [deactivateStockist, { isLoading: deactivating }] = useDeactivateStockistMutation()

  // ── Partner history queries ────────────────────────────────
  const { data: paymentsData, isLoading: paymentsLoading } = useGetPaymentsByStockistQuery(
    id ?? '',
    { skip: !id }
  )
  const { data: returnsData, isLoading: returnsLoading } = useGetReturnsByStockistQuery(id ?? '', {
    skip: !id,
  })
  const { data: creditNotesData, isLoading: creditNotesLoading } = useGetCreditNotesByStockistQuery(
    id ?? '',
    { skip: !id }
  )

  const stockist = stockistData?.data
  const reps = repsData?.data ?? []
  const payments = paymentsData?.data ?? []
  const returns = returnsData?.data ?? []
  const creditNotes = creditNotesData?.data ?? []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditStockistForm>({
    resolver: zodResolver(editStockistSchema),
  })

  const onEditSubmit = async (data: EditStockistForm) => {
    if (!id) return
    try {
      await updateStockist({
        id,
        body: {
          assignedRepId: data.assignedRepId,
          firmName: data.firmName,
          ownerName: data.ownerName,
          gstin: data.gstin || undefined,
          state: data.state,
          city: data.city,
          address: data.address || undefined,
          phone: data.phone,
          email: data.email || undefined,
          isActive: stockist?.isActive,
        },
      }).unwrap()
      toast.success('Stockist updated successfully')
      reset()
      setShowEdit(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update stockist')
    }
  }

  const onDeactivate = async () => {
    if (!id) return
    try {
      await deactivateStockist(id).unwrap()
      toast.success('Stockist deactivated successfully')
      setShowDeactivate(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to deactivate stockist')
    }
  }

  const onReactivate = async () => {
    if (!id || !stockist) return
    try {
      await updateStockist({
        id,
        body: {
          assignedRepId: stockist.assignedRepId,
          firmName: stockist.firmName,
          ownerName: stockist.ownerName,
          gstin: stockist.gstin || undefined,
          state: stockist.state,
          city: stockist.city,
          address: stockist.address || undefined,
          phone: stockist.phone,
          email: stockist.email ?? '',
          isActive: true,
        },
      }).unwrap()
      toast.success('Stockist reactivated successfully')
      setShowReactivate(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to reactivate stockist')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <Skeleton className="h-64 w-full skeleton-shimmer" />
      </div>
    )
  }

  if (isError || !stockist) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <Building2 className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          Stockist not found
        </p>
        <button onClick={() => navigate('/stockists')} className="btn-primary mt-4">
          Back to Stockists
        </button>
      </div>
    )
  }

  const infoItems = [
    { icon: <Building2 className="w-4 h-4" />, label: 'Firm Name', value: stockist.firmName },
    { icon: <User className="w-4 h-4" />, label: 'Owner Name', value: stockist.ownerName },
    { icon: <MapPin className="w-4 h-4" />, label: 'City', value: stockist.city },
    { icon: <MapPin className="w-4 h-4" />, label: 'State', value: stockist.state },
    { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: stockist.phone },
    { icon: <Phone className="w-4 h-4" />, label: 'Email', value: stockist.email ?? 'Not provided' },
    { icon: <Hash className="w-4 h-4" />, label: 'GSTIN', value: stockist.gstin ?? 'Not provided' },
    { icon: <User className="w-4 h-4" />, label: 'Assigned Rep', value: stockist.assignedRepName },
    {
      icon: <MapPin className="w-4 h-4" />,
      label: 'Address',
      value: stockist.address ?? 'Not provided',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/stockists')}
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
                {stockist.firmName}
              </h1>
              {stockist.isActive ? (
                <span className="badge-teal">Active</span>
              ) : (
                <span className="badge-crimson">Inactive</span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {stockist.city}, {stockist.state} • Rep: {stockist.assignedRepName}
            </p>
          </div>
        </div>

        {isOwnerOrManager && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                reset({
                  assignedRepId: stockist.assignedRepId,
                  firmName: stockist.firmName,
                  ownerName: stockist.ownerName,
                  gstin: stockist.gstin ?? '',
                  state: stockist.state,
                  city: stockist.city,
                  address: stockist.address ?? '',
                  phone: stockist.phone,
                  email: stockist.email ?? '',
                })
                setShowEdit(true)
              }}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            {stockist.isActive ? (
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
            ) : (
              <button
                onClick={() => setShowReactivate(true)}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold"
                style={{
                  background: 'var(--vp-teal-light)',
                  color: 'var(--vp-teal)',
                  border: '1px solid rgba(0,196,154,0.2)',
                }}
              >
                <UserCheck className="w-4 h-4" /> Reactivate
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Info Card ── */}
      <div className="vp-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--vp-teal-light)' }}
          >
            <Building2 className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
            Stockist Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {infoItems.map((item) => (
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
                style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
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

        <div
          className="flex items-center gap-4 mt-4 pt-4 text-xs"
          style={{ borderTop: '1px solid var(--vp-border)', color: 'var(--vp-text-muted)' }}
        >
          <span>
            Created: {format(parseISO(stockist.createdAt as unknown as string), 'MMM d, yyyy')}
          </span>
          <span>•</span>
          <span>
            Updated: {format(parseISO(stockist.updatedAt as unknown as string), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* ── Three panels grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Payment History ── */}
        <div className="vp-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--vp-teal-light)' }}
            >
              <IndianRupee className="w-4 h-4" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Payment History
              </h3>
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
              </p>
            </div>
          </div>

          {paymentsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 skeleton-shimmer" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <IndianRupee className="w-8 h-8 mb-2" style={{ color: 'var(--vp-text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                No payments recorded yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="p-3 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--vp-text-primary)' }}
                      >
                        {payment.paymentNumber}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                        {format(parseISO(payment.paymentDate), 'MMM d, yyyy')} •{' '}
                        {payment.paymentMode}
                      </p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--vp-teal)' }}>
                      {fmt(Number(payment.amount))}
                    </p>
                  </div>
                </div>
              ))}
              {payments.length > 5 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--vp-text-muted)' }}>
                  +{payments.length - 5} more — view in Payments
                </p>
              )}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--vp-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: 'var(--vp-text-muted)' }}>
                    Total Collected
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--vp-teal)' }}>
                    {fmt(payments.reduce((s, p) => s + Number(p.amount), 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Return History ── */}
        <div className="vp-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--vp-amber-light)' }}
            >
              <RotateCcw className="w-4 h-4" style={{ color: 'var(--vp-amber)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Return History
              </h3>
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                {returns.length} return{returns.length !== 1 ? 's' : ''} logged
              </p>
            </div>
          </div>

          {returnsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 skeleton-shimmer" />
              ))}
            </div>
          ) : returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <RotateCcw className="w-8 h-8 mb-2" style={{ color: 'var(--vp-text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                No returns logged yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {returns.slice(0, 5).map((ret) => {
                const statusColor =
                  ret.status === 'PROCESSED'
                    ? 'var(--vp-teal)'
                    : ret.status === 'REJECTED'
                      ? 'var(--vp-rose)'
                      : 'var(--vp-amber)'
                const statusBg =
                  ret.status === 'PROCESSED'
                    ? 'var(--vp-teal-light)'
                    : ret.status === 'REJECTED'
                      ? 'var(--vp-rose-light)'
                      : 'var(--vp-amber-light)'
                return (
                  <div
                    key={ret.id}
                    className="p-3 rounded-xl"
                    style={{
                      background: 'var(--vp-bg-surface-alt)',
                      border: '1px solid var(--vp-border)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--vp-text-primary)' }}
                      >
                        {ret.returnNumber}
                      </p>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: statusBg, color: statusColor }}
                      >
                        {ret.status}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      {format(parseISO(ret.returnDate), 'MMM d, yyyy')} • {ret.returnItems.length}{' '}
                      item{ret.returnItems.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )
              })}
              {returns.length > 5 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--vp-text-muted)' }}>
                  +{returns.length - 5} more — view in Returns
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Open Credit Notes ── */}
        <div className="vp-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--vp-purple-light)' }}
            >
              <FileText className="w-4 h-4" style={{ color: 'var(--vp-purple)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Open Credit Notes
              </h3>
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                {creditNotes.length} credit note{creditNotes.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>

          {creditNotesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 skeleton-shimmer" />
              ))}
            </div>
          ) : creditNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-8 h-8 mb-2" style={{ color: 'var(--vp-teal)' }} />
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                No open credit notes
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {creditNotes.map((cn) => (
                <div
                  key={cn.id}
                  className="p-3 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {cn.creditNoteNumber}
                    </p>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--vp-purple-light)', color: 'var(--vp-purple)' }}
                    >
                      {cn.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      Ref: {cn.returnNumber}
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--vp-purple)' }}>
                      {fmt(Number(cn.amount))}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--vp-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: 'var(--vp-text-muted)' }}>
                    Total Available
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--vp-purple)' }}>
                    {fmt(creditNotes.reduce((s, cn) => s + Number(cn.amount), 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Dialog open={showEdit} onOpenChange={() => setShowEdit(false)}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Edit Stockist</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 mt-2">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Assigned Sales Rep *
              </label>
              <select
                {...register('assignedRepId')}
                className="input-dark"
                style={{ background: 'var(--vp-bg-surface)' }}
              >
                <option value="">Select a sales rep</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName}
                  </option>
                ))}
              </select>
              {errors.assignedRepId && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {errors.assignedRepId.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Firm Name *
                </label>
                <input {...register('firmName')} className="input-dark" />
                {errors.firmName && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.firmName.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Owner Name *
                </label>
                <input {...register('ownerName')} className="input-dark" />
                {errors.ownerName && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.ownerName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                GSTIN
              </label>
              <input {...register('gstin')} className="input-dark" placeholder="27AABCS1429B1ZB" />
              {errors.gstin && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {errors.gstin.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  City *
                </label>
                <input {...register('city')} className="input-dark" />
                {errors.city && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.city.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  State *
                </label>
                <input {...register('state')} className="input-dark" />
                {errors.state && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.state.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Phone *
                </label>
                <input {...register('phone')} className="input-dark" />
                {errors.phone && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.phone.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Email (for invoice notifications)
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="optional"
                  className="input-dark"
                />
                {errors.email && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Address
                </label>
                <input {...register('address')} className="input-dark" />
              </div>
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

      {/* ── Deactivate Confirmation ── */}
      <Dialog open={showDeactivate} onOpenChange={() => setShowDeactivate(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>
              Deactivate Stockist
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{stockist.firmName}</strong>? They
            will no longer appear in active stockist lists or be selectable for orders.
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

      {/* ── Reactivate Confirmation ── */}
      <Dialog open={showReactivate} onOpenChange={() => setShowReactivate(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>
              Reactivate Stockist
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to reactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{stockist.firmName}</strong>? They
            will appear in active stockist lists again.
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
