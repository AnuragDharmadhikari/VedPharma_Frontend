import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft, CreditCard, IndianRupee,
  Building2, Calendar, FileText,
  Hash, CheckCircle2, Clock,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetPaymentByIdQuery } from './paymentsApi'
import type { PaymentAllocationDto } from '@/types/payment'

// ── Payment mode config ───────────────────────────────────────
const modeConfig = {
  CASH:   { label: 'Cash',   color: 'var(--vp-teal)',   bg: 'var(--vp-teal-light)' },
  CHEQUE: { label: 'Cheque', color: 'var(--vp-amber)',  bg: 'var(--vp-amber-light)' },
  NEFT:   { label: 'NEFT',   color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
  RTGS:   { label: 'RTGS',   color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
  UPI:    { label: 'UPI',    color: 'var(--vp-teal)',   bg: 'var(--vp-teal-light)' },
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: paymentData, isLoading, isError } = useGetPaymentByIdQuery(id ?? '', { skip: !id })
  const payment = paymentData?.data
  const modeCfg = modeConfig[payment?.paymentMode as keyof typeof modeConfig]

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <Skeleton className="h-64 w-full skeleton-shimmer" />
      </div>
    )
  }

  if (isError || !payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <CreditCard className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          Payment not found
        </p>
        <button onClick={() => navigate('/payments')} className="btn-primary mt-4">
          Back to Payments
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/payments')}
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
              {payment.paymentNumber}
            </h1>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: modeCfg?.bg, color: modeCfg?.color }}
            >
              {modeCfg?.label}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {payment.chemistFirmName ?? payment.stockistFirmName} •{' '}
            {format(parseISO(payment.paymentDate), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* ── Payment Info Card ── */}
      <div className="vp-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: modeCfg?.bg }}
          >
            <CreditCard className="w-5 h-5" style={{ color: modeCfg?.color }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
            Payment Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Payer */}
          <div
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: modeCfg?.bg, color: modeCfg?.color }}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                {payment.chemistFirmName ? 'Chemist' : 'Stockist'}
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--vp-text-primary)' }}>
                {payment.chemistFirmName ?? payment.stockistFirmName}
              </p>
            </div>
          </div>

          {/* Payment Date */}
          <div
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                Payment Date
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--vp-text-primary)' }}>
                {format(parseISO(payment.paymentDate), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Payment Mode */}
          <div
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: modeCfg?.bg, color: modeCfg?.color }}
            >
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                Payment Mode
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--vp-text-primary)' }}>
                {modeCfg?.label}
              </p>
            </div>
          </div>

          {/* Reference Number */}
          {payment.referenceNumber && (
            <div
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--vp-amber-light)', color: 'var(--vp-amber)' }}
              >
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                  Reference Number
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--vp-text-primary)' }}>
                  {payment.referenceNumber}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {payment.notes && (
          <div
            className="mt-4 p-3 rounded-xl"
            style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
              Notes
            </p>
            <p className="text-sm" style={{ color: 'var(--vp-text-primary)' }}>
              {payment.notes}
            </p>
          </div>
        )}

        {/* Total Amount */}
        <div
          className="flex items-center justify-between mt-4 pt-4"
          style={{ borderTop: '1px solid var(--vp-border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-secondary)' }}>
            Total Payment Amount
          </p>
          <div className="flex items-center gap-1">
            <IndianRupee className="w-4 h-4" style={{ color: 'var(--vp-text-primary)' }} />
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {Number(payment.amount).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Invoice Allocations ── */}
      <div className="vp-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--vp-purple-light)' }}
          >
            <FileText className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              Invoice Allocations
            </h2>
            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
              {payment.allocations.length} invoice{payment.allocations.length !== 1 ? 's' : ''} covered by this payment
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {payment.allocations.map((alloc: PaymentAllocationDto) => {
            const isFullyPaid = Number(alloc.remainingAmount) === 0
            return (
              <div
                key={alloc.id}
                className="p-4 rounded-xl"
                style={{
                  background: isFullyPaid ? 'var(--vp-teal-light)' : 'var(--vp-bg-surface-alt)',
                  border: `1px solid ${isFullyPaid ? 'rgba(0,196,154,0.2)' : 'var(--vp-border)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: isFullyPaid ? 'var(--vp-teal)' : 'var(--vp-text-muted)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                      {alloc.invoiceNumber}
                    </p>
                  </div>
                  {isFullyPaid ? (
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--vp-teal)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--vp-amber)' }}>
                      <Clock className="w-3.5 h-3.5" /> Partially Paid
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>Invoice Total</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--vp-text-primary)' }}>
                      ₹{Number(alloc.invoiceGrandTotal).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>This Payment</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--vp-teal)' }}>
                      ₹{Number(alloc.allocatedAmount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>Remaining</p>
                    <p
                      className="text-sm font-semibold mt-0.5"
                      style={{ color: isFullyPaid ? 'var(--vp-teal)' : 'var(--vp-rose)' }}
                    >
                      ₹{Number(alloc.remainingAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div
          className="flex items-center justify-between mt-4 pt-4"
          style={{ borderTop: '1px solid var(--vp-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
            Total allocated across {payment.allocations.length} invoice{payment.allocations.length !== 1 ? 's' : ''}
          </p>
          <p className="text-sm font-bold" style={{ color: 'var(--vp-text-primary)' }}>
            ₹{payment.allocations
              .reduce((sum, a) => sum + Number(a.allocatedAmount), 0)
              .toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}