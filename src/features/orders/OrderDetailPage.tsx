import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Truck,
  FileText,
  Loader2,
  Edit2,
  User,
  Calendar,
  Hash,
  IndianRupee,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGetOrderByIdQuery, useUpdateOrderStatusMutation } from './ordersApi'
import { useGenerateInvoiceMutation, useGetAllInvoicesQuery } from '@/features/invoices/invoicesApi'
import type { OrderItemDto } from '@/types/order'

// ── Status config ─────────────────────────────────────────────
const statusConfig = {
  PENDING: {
    label: 'Pending',
    color: 'var(--vp-amber)',
    bg: 'var(--vp-amber-light)',
    next: 'CONFIRMED' as const,
    nextLabel: 'Confirm Order',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'var(--vp-teal)',
    bg: 'var(--vp-teal-light)',
    next: 'DISPATCHED' as const,
    nextLabel: 'Mark Dispatched',
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: 'var(--vp-purple)',
    bg: 'var(--vp-purple-light)',
    next: null,
    nextLabel: null,
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig]
  if (!config) return null
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOwnerOrManager } = useAuth()

  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false)

  const { data: orderData, isLoading, isError } = useGetOrderByIdQuery(id ?? '', { skip: !id })

  const [updateOrderStatus, { isLoading: updatingStatus }] = useUpdateOrderStatusMutation()
  const [generateInvoice, { isLoading: generatingInvoice }] = useGenerateInvoiceMutation()

  // Check if invoice already exists for this order
  // We fetch all invoices and match by orderId
  // This controls whether Generate Invoice or "Invoice Generated" badge shows
  const { data: invoicesData } = useGetAllInvoicesQuery(undefined, {
    skip: !isOwnerOrManager,
  })

  const order = orderData?.data

  // Check after order is loaded so we can match by order.id
  const hasInvoice =
    invoicesData?.data?.some((inv) => inv.orderId === order?.id?.toString()) ?? false

  // ── Status update handler ─────────────────────────────────
  const onStatusUpdate = async () => {
    if (!id || !order) return
    const nextStatus = statusConfig[order.status as keyof typeof statusConfig]?.next
    if (!nextStatus) return
    try {
      await updateOrderStatus({ id, status: nextStatus }).unwrap()
      toast.success(`Order ${nextStatus.toLowerCase()} successfully`)
      setShowStatusConfirm(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update order status')
    }
  }

  // ── Generate invoice handler ───────────────────────────────
  const onGenerateInvoice = async () => {
    if (!id) return
    try {
      await generateInvoice(id).unwrap()
      toast.success('Invoice generated successfully')
      setShowInvoiceConfirm(false)
      navigate('/invoices')
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to generate invoice')
    }
  }

  // ── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-64 w-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────
  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <ShoppingCart className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          Order not found
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
          This order may have been removed or the link is invalid.
        </p>
        <button onClick={() => navigate('/orders')} className="btn-primary">
          Back to Orders
        </button>
      </div>
    )
  }

  const statusCfg = statusConfig[order.status as keyof typeof statusConfig]
  const isPending = order.status === 'PENDING'
  const isConfirmed = order.status === 'CONFIRMED'

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
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
                {order.chemistFirmName}
              </h1>
              <StatusBadge status={order.status} />
              {order.fulfillmentType === 'VIA_STOCKIST' ? (
                <span
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--vp-purple)' }}
                >
                  <Truck className="w-3 h-3" /> Via Stockist
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--vp-teal)' }}
                >
                  <Package className="w-3 h-3" /> Direct
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {order.repName} • {format(parseISO(order.orderDate), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit — only for PENDING orders */}
          {isPending && (
            <button
              onClick={() => navigate(`/orders/${id}/edit`)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit Items
            </button>
          )}

          {/* Generate Invoice — CONFIRMED + no invoice yet */}
          {isOwnerOrManager && isConfirmed && !hasInvoice && (
            <button
              onClick={() => setShowInvoiceConfirm(true)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all"
              style={{
                background: 'var(--vp-purple-light)',
                color: 'var(--vp-purple)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <FileText className="w-4 h-4" /> Generate Invoice
            </button>
          )}

          {/* Invoice Generated badge — CONFIRMED + invoice exists */}
          {isOwnerOrManager && isConfirmed && hasInvoice && (
            <span
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold"
              style={{
                background: 'var(--vp-teal-light)',
                color: 'var(--vp-teal)',
                border: '1px solid rgba(0,196,154,0.2)',
              }}
            >
              <FileText className="w-4 h-4" /> Invoice Generated
            </span>
          )}

          {/* Advance status — blocked on CONFIRMED until invoice exists */}
          {isOwnerOrManager && statusCfg.next && (
            <button
              onClick={() => {
                if (isConfirmed && !hasInvoice) {
                  toast.error('Generate an invoice before dispatching this order')
                  return
                }
                setShowStatusConfirm(true)
              }}
              className="btn-primary flex items-center gap-2 text-sm"
              style={{ opacity: isConfirmed && !hasInvoice ? 0.5 : 1 }}
            >
              <CheckCircle2 className="w-4 h-4" /> {statusCfg.nextLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left — Order Items ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: statusCfg.bg }}
              >
                <ShoppingCart className="w-5 h-5" style={{ color: statusCfg.color }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Order Items
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {order.orderItems.map((item: OrderItemDto) => (
                <div
                  key={item.id.toString()}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--vp-text-primary)' }}
                      >
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          <Hash className="w-3 h-3" /> HSN: {item.hsnCode}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          Qty: {item.quantity}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          Unit: ₹{Number(item.unitPrice).toFixed(2)}
                        </span>
                        {Number(item.discountPct) > 0 && (
                          <span className="text-xs" style={{ color: 'var(--vp-rose)' }}>
                            -{Number(item.discountPct).toFixed(0)}% disc
                          </span>
                        )}
                        {Number(item.schemeDiscountPct) > 0 && (
                          <span className="text-xs" style={{ color: 'var(--vp-teal)' }}>
                            -{Number(item.schemeDiscountPct).toFixed(0)}% scheme
                          </span>
                        )}
                        {item.freeQuantity > 0 && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                          >
                            +{item.freeQuantity} free
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-0.5 justify-end">
                        <IndianRupee
                          className="w-3.5 h-3.5"
                          style={{ color: 'var(--vp-text-primary)' }}
                        />
                        <p
                          className="text-sm font-bold"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          {Number(item.lineTotal).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div
              className="flex items-center justify-between mt-4 pt-4"
              style={{ borderTop: '1px solid var(--vp-border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-secondary)' }}>
                Order Total
              </p>
              <div className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" style={{ color: 'var(--vp-text-primary)' }} />
                <p
                  className="text-xl font-bold"
                  style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {Number(order.totalAmount).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Timestamps */}
            <div
              className="flex items-center gap-4 mt-4 pt-4 text-xs"
              style={{ borderTop: '1px solid var(--vp-border)', color: 'var(--vp-text-muted)' }}
            >
              <span>Created: {format(parseISO(order.createdAt), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>Updated: {format(parseISO(order.updatedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* ── Right — Order Info ── */}
        <div className="space-y-4">
          <div className="vp-card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--vp-text-primary)' }}>
              Order Information
            </h2>

            <div className="space-y-3">
              {/* Chemist */}
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'var(--vp-bg-surface-alt)',
                  border: '1px solid var(--vp-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Chemist
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  {order.chemistFirmName}
                </p>
                {order.chemistGstin && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                    GSTIN: {order.chemistGstin}
                  </p>
                )}
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  {order.chemistState}
                </p>
              </div>

              {/* Stockist — only for VIA_STOCKIST */}
              {order.fulfillmentType === 'VIA_STOCKIST' && order.stockistFirmName && (
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                    Stockist
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                    {order.stockistFirmName}
                  </p>
                  {order.stockistGstin && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                      GSTIN: {order.stockistGstin}
                    </p>
                  )}
                </div>
              )}

              {/* Rep */}
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'var(--vp-bg-surface-alt)',
                  border: '1px solid var(--vp-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Sales Rep
                </p>
                <p
                  className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: 'var(--vp-text-primary)' }}
                >
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--vp-teal)' }} />
                  {order.repName}
                </p>
              </div>

              {/* Order Date */}
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'var(--vp-bg-surface-alt)',
                  border: '1px solid var(--vp-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Order Date
                </p>
                <p
                  className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: 'var(--vp-text-primary)' }}
                >
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--vp-teal)' }} />
                  {format(parseISO(order.orderDate), 'MMMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Order Progress stepper — 4 steps */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--vp-border)' }}>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--vp-text-muted)' }}
              >
                Order Progress
              </p>

              {/* Define 4 steps including Invoice as a virtual step */}
              {(() => {
                const steps = [
                  {
                    label: 'Pending',
                    color: 'var(--vp-amber)',
                    completed: true, // always completed — order exists
                  },
                  {
                    label: 'Confirmed',
                    color: 'var(--vp-teal)',
                    completed: order.status === 'CONFIRMED' || order.status === 'DISPATCHED',
                  },
                  {
                    label: 'Invoiced',
                    color: 'var(--vp-purple)',
                    completed: hasInvoice,
                  },
                  {
                    label: 'Dispatched',
                    color: 'var(--vp-purple)',
                    completed: order.status === 'DISPATCHED',
                  },
                ]

                return (
                  <div className="flex items-center">
                    {steps.map((step, i) => (
                      <div key={step.label} className="flex items-center flex-1">
                        {/* Step circle + label */}
                        <div className="flex flex-col items-center">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: step.completed ? step.color : 'var(--vp-bg-hover)',
                              color: step.completed ? '#FFFFFF' : 'var(--vp-text-muted)',
                            }}
                          >
                            {i + 1}
                          </div>
                          <p
                            className="text-xs mt-1 text-center whitespace-nowrap"
                            style={{ color: step.completed ? step.color : 'var(--vp-text-muted)' }}
                          >
                            {step.label}
                          </p>
                        </div>

                        {/* Connector line between steps */}
                        {i < steps.length - 1 && (
                          <div
                            className="h-0.5 flex-1 mx-1 mb-4"
                            style={{
                              background: steps[i + 1].completed ? step.color : 'var(--vp-border)',
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Contextual message below stepper */}
              {order.status === 'PENDING' && (
                <div
                  className="mt-3 p-2 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--vp-amber-light)', color: 'var(--vp-amber)' }}
                >
                  ⏳ Awaiting confirmation by manager.
                </div>
              )}
              {isConfirmed && !hasInvoice && (
                <div
                  className="mt-3 p-2 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--vp-amber-light)', color: 'var(--vp-amber)' }}
                >
                  ⚠️ Generate an invoice before dispatching.
                </div>
              )}
              {isConfirmed && hasInvoice && (
                <div
                  className="mt-3 p-2 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                >
                  ✓ Invoice generated. Ready to dispatch.
                </div>
              )}
              {order.status === 'DISPATCHED' && (
                <div
                  className="mt-3 p-2 rounded-lg text-xs font-medium"
                  style={{ background: 'var(--vp-purple-light)', color: 'var(--vp-purple)' }}
                >
                  🚚 Order has been dispatched successfully.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Update Confirmation ── */}
      <Dialog open={showStatusConfirm} onOpenChange={() => setShowStatusConfirm(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>
              {statusCfg.nextLabel}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to mark this order as{' '}
            <strong
              style={{ color: statusConfig[statusCfg.next as keyof typeof statusConfig]?.color }}
            >
              {statusCfg.next}
            </strong>
            ?
            {isConfirmed && hasInvoice && (
              <span
                className="block mt-2 p-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
              >
                ✓ Invoice has been generated for this order.
              </span>
            )}{' '}
            This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowStatusConfirm(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onStatusUpdate}
              disabled={updatingStatus}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {updatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
              {updatingStatus ? 'Updating...' : statusCfg.nextLabel}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Generate Invoice Confirmation ── */}
      <Dialog open={showInvoiceConfirm} onOpenChange={() => setShowInvoiceConfirm(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Generate Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            This will generate a GST invoice for{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{order.chemistFirmName}</strong>.
            GST (CGST + SGST or IGST) will be calculated automatically based on seller and buyer
            states.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowInvoiceConfirm(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onGenerateInvoice}
              disabled={generatingInvoice}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--vp-purple)', color: '#FFFFFF' }}
            >
              {generatingInvoice && <Loader2 className="w-4 h-4 animate-spin" />}
              {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
