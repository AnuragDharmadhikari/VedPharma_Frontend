import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { FileText, Search, X, IndianRupee, ChevronRight, Calendar, User } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetAllInvoicesQuery } from './invoicesApi'
import type { InvoiceDto } from '@/types/billing'

// ── Status config ─────────────────────────────────────────────
const statusConfig = {
  DRAFT: { label: 'Draft', color: 'var(--vp-text-muted)', bg: 'var(--vp-bg-hover)' },
  ISSUED: { label: 'Issued', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    color: 'var(--vp-amber)',
    bg: 'var(--vp-amber-light)',
  },
  PAID: { label: 'Paid', color: 'var(--vp-purple)', bg: 'var(--vp-purple-light)' },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig]
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

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID'
  >('ALL')

  const { data, isLoading } = useGetAllInvoicesQuery()

  const filtered = useMemo(() => {
    const invoices = data?.data ?? []
    return invoices
      .filter((inv) => {
        const matchesSearch =
          inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          inv.chemistFirmName.toLowerCase().includes(search.toLowerCase()) ||
          inv.repName.toLowerCase().includes(search.toLowerCase()) ||
          (inv.stockistFirmName?.toLowerCase().includes(search.toLowerCase()) ?? false)
        const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
  }, [data, search, statusFilter])

  // KPI counts
  const invoices = data?.data ?? []
  const total = invoices.length
  const issued = invoices.filter((i) => i.status === 'ISSUED').length
  const partiallyPaid = invoices.filter((i) => i.status === 'PARTIALLY_PAID').length
  const paid = invoices.filter((i) => i.status === 'PAID').length
  const grandTotal = invoices.reduce((sum, i) => sum + Number(i.grandTotal), 0)

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
        >
          Invoices
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
          GST invoices generated from confirmed orders
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total',
            value: total,
            color: 'var(--vp-teal)',
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: 'Issued',
            value: issued,
            color: 'var(--vp-teal)',
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: 'Partially Paid',
            value: partiallyPaid,
            color: 'var(--vp-amber)',
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: 'Paid',
            value: paid,
            color: 'var(--vp-purple)',
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: 'Total Revenue',
            value: `₹${grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
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
            placeholder="Search by invoice number, chemist, or rep..."
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
          {(['ALL', 'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID'] as const).map((s) => {
            const labels = {
              ALL: 'All',
              DRAFT: 'Draft',
              ISSUED: 'Issued',
              PARTIALLY_PAID: 'Partial',
              PAID: 'Paid',
            }
            const colors = {
              ALL: 'var(--vp-teal)',
              DRAFT: 'var(--vp-text-muted)',
              ISSUED: 'var(--vp-teal)',
              PARTIALLY_PAID: 'var(--vp-amber)',
              PAID: 'var(--vp-purple)',
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

      {/* Results count */}
      {(search || statusFilter !== 'ALL') && (
        <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
          Showing <strong style={{ color: 'var(--vp-text-primary)' }}>{filtered.length}</strong>{' '}
          result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── Invoices List ── */}
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
              <FileText className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
              {search || statusFilter !== 'ALL'
                ? 'No invoices match your filters'
                : 'No invoices yet'}
            </p>
            <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Generate invoices from confirmed orders'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
            {filtered.map((invoice: InvoiceDto) => (
              <div
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
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
                      statusConfig[invoice.status as keyof typeof statusConfig]?.bg ??
                      'var(--vp-bg-hover)',
                    color:
                      statusConfig[invoice.status as keyof typeof statusConfig]?.color ??
                      'var(--vp-text-muted)',
                  }}
                >
                  <FileText className="w-5 h-5" />
                </div>

                {/* Invoice info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {invoice.invoiceNumber}
                    </p>
                    <StatusBadge status={invoice.status} />
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          invoice.taxType === 'CGST_SGST'
                            ? 'var(--vp-teal-light)'
                            : 'var(--vp-purple-light)',
                        color:
                          invoice.taxType === 'CGST_SGST' ? 'var(--vp-teal)' : 'var(--vp-purple)',
                      }}
                    >
                      {invoice.taxType === 'CGST_SGST' ? 'CGST+SGST' : 'IGST'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      {invoice.chemistFirmName}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <User className="w-3 h-3" /> {invoice.repName}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(invoice.invoiceDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="flex items-center gap-0.5 justify-end">
                    <IndianRupee
                      className="w-3.5 h-3.5"
                      style={{ color: 'var(--vp-text-primary)' }}
                    />
                    <p className="text-sm font-bold" style={{ color: 'var(--vp-text-primary)' }}>
                      {Number(invoice.grandTotal).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                    Grand Total
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
