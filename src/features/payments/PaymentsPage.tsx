import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  IndianRupee,
  Search,
  X,
  CreditCard,
  Calendar,
  Building2,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGetAllPaymentsQuery } from './paymentsApi'
import type { PaymentDto } from '@/types/payment'

// ── Payment mode config ───────────────────────────────────────
const modeConfig = {
  CASH: { label: 'Cash', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
  CHEQUE: { label: 'Cheque', color: 'var(--vp-amber)', bg: 'var(--vp-amber-light)' },
  NEFT: { label: 'NEFT', color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
  RTGS: { label: 'RTGS', color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
  UPI: { label: 'UPI', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
}

function ModeBadge({ mode }: { mode: string }) {
  const config = modeConfig[mode as keyof typeof modeConfig]
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

export default function PaymentsPage() {
  const navigate = useNavigate()
  const { isOwner } = useAuth()

  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'ALL' | 'CASH' | 'CHEQUE' | 'NEFT' | 'RTGS' | 'UPI'>(
    'ALL'
  )

  const { data, isLoading } = useGetAllPaymentsQuery()

  const filtered = useMemo(() => {
    const payments = data?.data ?? []
    return payments
      .filter((p) => {
        const matchesSearch =
          p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
          (p.chemistFirmName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (p.stockistFirmName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (p.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
        const matchesMode = modeFilter === 'ALL' || p.paymentMode === modeFilter
        return matchesSearch && matchesMode
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  }, [data, search, modeFilter])

  const payments = data?.data ?? []
  const total = payments.length
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const cashCount = payments.filter((p) => p.paymentMode === 'CASH').length
  const upiCount = payments.filter((p) => p.paymentMode === 'UPI').length

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Payments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            Payments received from chemists and stockists
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => navigate('/payments/new')}
            className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Payments',
            value: total,
            color: 'var(--vp-teal)',
            icon: <CreditCard className="w-5 h-5" />,
          },
          {
            label: 'Cash',
            value: cashCount,
            color: 'var(--vp-teal)',
            icon: <IndianRupee className="w-5 h-5" />,
          },
          {
            label: 'UPI',
            value: upiCount,
            color: 'var(--vp-purple)',
            icon: <CreditCard className="w-5 h-5" />,
          },
          {
            label: 'Total Collected',
            value: `₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            color: 'var(--vp-teal)',
            icon: <IndianRupee className="w-5 h-5" />,
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
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--vp-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by payment number, chemist, stockist or reference..."
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

        <div className="flex gap-2">
          {(['ALL', 'CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI'] as const).map((mode) => {
            const labels = {
              ALL: 'All',
              CASH: 'Cash',
              CHEQUE: 'Cheque',
              NEFT: 'NEFT',
              RTGS: 'RTGS',
              UPI: 'UPI',
            }
            const colors = {
              ALL: 'var(--vp-teal)',
              CASH: 'var(--vp-teal)',
              CHEQUE: 'var(--vp-amber)',
              NEFT: 'var(--vp-purple)',
              RTGS: 'var(--vp-purple)',
              UPI: 'var(--vp-teal)',
            }
            const isActive = modeFilter === mode
            return (
              <button
                key={mode}
                onClick={() => setModeFilter(mode)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: isActive ? colors[mode] : 'var(--vp-bg-surface)',
                  color: isActive ? '#FFFFFF' : 'var(--vp-text-secondary)',
                  border: `1px solid ${isActive ? colors[mode] : 'var(--vp-border)'}`,
                  boxShadow: isActive ? 'var(--vp-shadow-sm)' : 'none',
                }}
              >
                {labels[mode]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      {(search || modeFilter !== 'ALL') && (
        <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
          Showing <strong style={{ color: 'var(--vp-text-primary)' }}>{filtered.length}</strong>{' '}
          result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── Payments List ── */}
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
              <CreditCard className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
              {search || modeFilter !== 'ALL'
                ? 'No payments match your filters'
                : 'No payments yet'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
              {search || modeFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Record your first payment to get started'}
            </p>
            {!search && modeFilter === 'ALL' && isOwner && (
              <button onClick={() => navigate('/payments/new')} className="btn-primary text-sm">
                Record Payment
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
            {filtered.map((payment: PaymentDto) => (
              <div
                key={payment.id}
                onClick={() => navigate(`/payments/${payment.id}`)}
                className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      modeConfig[payment.paymentMode as keyof typeof modeConfig]?.bg ??
                      'var(--vp-bg-hover)',
                    color:
                      modeConfig[payment.paymentMode as keyof typeof modeConfig]?.color ??
                      'var(--vp-text-muted)',
                  }}
                >
                  <CreditCard className="w-5 h-5" />
                </div>

                {/* Payment info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {payment.paymentNumber}
                    </p>
                    <ModeBadge mode={payment.paymentMode} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Building2 className="w-3 h-3" />
                      {payment.chemistFirmName ?? payment.stockistFirmName}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(payment.paymentDate), 'MMM d, yyyy')}
                    </span>
                    {payment.referenceNumber && (
                      <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                        Ref: {payment.referenceNumber}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      {payment.allocations.length} invoice
                      {payment.allocations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-0.5 justify-end">
                    <IndianRupee
                      className="w-3.5 h-3.5"
                      style={{ color: 'var(--vp-text-primary)' }}
                    />
                    <p className="text-sm font-bold" style={{ color: 'var(--vp-text-primary)' }}>
                      {Number(payment.amount).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                    Amount
                  </p>
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
    </div>
  )
}
