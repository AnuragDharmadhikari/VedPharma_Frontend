import { useState } from 'react'
import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  FileText,
  IndianRupee,
  User,
  Calendar,
  Building2,
  Truck,
  Hash,
  ChevronRight,
  CreditCard,
  Download,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetInvoiceByIdQuery, useLazyDownloadInvoicePdfQuery } from './invoicesApi'
import { useGetAllPaymentsQuery } from '@/features/payments/paymentsApi'
import type { InvoiceLineItemDto } from '@/types/billing'

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

const modeColors: Record<string, string> = {
  CASH: 'var(--vp-teal)',
  CHEQUE: 'var(--vp-amber)',
  NEFT: 'var(--vp-purple)',
  RTGS: 'var(--vp-purple)',
  UPI: 'var(--vp-teal)',
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

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: invoiceData, isLoading, isError } = useGetInvoiceByIdQuery(id ?? '', { skip: !id })
  const { data: paymentsData } = useGetAllPaymentsQuery()
  const [downloadPdf] = useLazyDownloadInvoicePdfQuery()
  const [isDownloading, setIsDownloading] = useState(false)

  const invoice = invoiceData?.data

  // Filter payments that have an allocation for this invoice
  const invoicePayments = useMemo(() => {
    if (!paymentsData?.data || !invoice) return []
    return paymentsData.data.filter((payment) =>
      payment.allocations.some((alloc) => alloc.invoiceId === invoice.id)
    )
  }, [paymentsData, invoice])

  // Total amount paid against this invoice
  const totalPaid = useMemo(() => {
    return invoicePayments.reduce((sum, payment) => {
      const alloc = payment.allocations.find((a) => a.invoiceId === invoice?.id)
      return sum + Number(alloc?.allocatedAmount ?? 0)
    }, 0)
  }, [invoicePayments, invoice])

  // ── Download PDF handler ──────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!invoice) return
    setIsDownloading(true)
    try {
      const result = await downloadPdf(invoice.id).unwrap()
      const url = window.URL.createObjectURL(new Blob([result]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${invoice.invoiceNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Invoice PDF downloaded')
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <Skeleton className="h-96 w-full skeleton-shimmer" />
      </div>
    )
  }

  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <FileText className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          Invoice not found
        </p>
        <button onClick={() => navigate('/invoices')} className="btn-primary mt-4">
          Back to Invoices
        </button>
      </div>
    )
  }

  const statusCfg = statusConfig[invoice.status as keyof typeof statusConfig]
  const isCgstSgst = invoice.taxType === 'CGST_SGST'

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
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
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: isCgstSgst ? 'var(--vp-teal-light)' : 'var(--vp-purple-light)',
                  color: isCgstSgst ? 'var(--vp-teal)' : 'var(--vp-purple)',
                }}
              >
                {isCgstSgst ? 'CGST + SGST' : 'IGST'}
              </span>
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {invoice.chemistFirmName} • {format(parseISO(invoice.invoiceDate), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all"
            style={{
              background: 'var(--vp-teal-light)',
              color: 'var(--vp-teal)',
              border: '1px solid rgba(0,196,154,0.2)',
            }}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button
            onClick={() => navigate(`/orders/${invoice.orderId}`)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ChevronRight className="w-4 h-4" /> View Order
          </button>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left — Line Items ── */}
        <div className="lg:col-span-2">
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: statusCfg.bg }}
              >
                <FileText className="w-5 h-5" style={{ color: statusCfg.color }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Line Items
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  {invoice.lineItems.length} item{invoice.lineItems.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Table header */}
            <div
              className="grid text-xs font-semibold uppercase tracking-wider pb-2 mb-2"
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                borderBottom: '1px solid var(--vp-border)',
                color: 'var(--vp-text-muted)',
              }}
            >
              <span>Product</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Discount</span>
              <span className="text-right">{isCgstSgst ? 'CGST+SGST' : 'IGST'}</span>
              <span className="text-right">Line Total</span>
            </div>

            {/* Line items */}
            <div className="space-y-1">
              {invoice.lineItems.map((item: InvoiceLineItemDto) => (
                <div
                  key={item.id}
                  className="grid items-center py-2"
                  style={{
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                    borderBottom: '1px solid var(--vp-border)',
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {item.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        <Hash className="w-3 h-3" /> {item.hsnCode}
                      </span>
                      {item.freeQuantity > 0 && (
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                        >
                          +{item.freeQuantity} free
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-right" style={{ color: 'var(--vp-text-secondary)' }}>
                    {item.quantity}
                  </p>
                  <p className="text-sm text-right" style={{ color: 'var(--vp-text-secondary)' }}>
                    ₹{Number(item.unitPrice).toFixed(2)}
                  </p>
                  <p className="text-sm text-right" style={{ color: 'var(--vp-rose)' }}>
                    {Number(item.discountPct) > 0
                      ? `-${Number(item.discountPct).toFixed(0)}%`
                      : '—'}
                  </p>
                  <div className="text-right">
                    {isCgstSgst ? (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          C: ₹{Number(item.cgstAmt).toFixed(2)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          S: ₹{Number(item.sgstAmt).toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                        ₹{Number(item.igstAmt).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <p
                    className="text-sm font-bold text-right"
                    style={{ color: 'var(--vp-text-primary)' }}
                  >
                    ₹{Number(item.lineTotal).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* GST Summary */}
            <div
              className="mt-4 pt-4 space-y-2"
              style={{ borderTop: '1px solid var(--vp-border)' }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--vp-text-muted)' }}>Subtotal</span>
                <span style={{ color: 'var(--vp-text-secondary)' }}>
                  ₹{Number(invoice.subtotal).toFixed(2)}
                </span>
              </div>
              {Number(invoice.totalDiscount) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--vp-rose)' }}>Total Discount</span>
                  <span style={{ color: 'var(--vp-rose)' }}>
                    −₹{Number(invoice.totalDiscount).toFixed(2)}
                  </span>
                </div>
              )}
              {isCgstSgst ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--vp-text-muted)' }}>CGST</span>
                    <span style={{ color: 'var(--vp-text-secondary)' }}>
                      ₹{Number(invoice.totalCgst).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--vp-text-muted)' }}>SGST</span>
                    <span style={{ color: 'var(--vp-text-secondary)' }}>
                      ₹{Number(invoice.totalSgst).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--vp-text-muted)' }}>IGST</span>
                  <span style={{ color: 'var(--vp-text-secondary)' }}>
                    ₹{Number(invoice.totalIgst).toFixed(2)}
                  </span>
                </div>
              )}
              <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid var(--vp-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Grand Total
                </span>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4" style={{ color: 'var(--vp-text-primary)' }} />
                  <span
                    className="text-xl font-bold"
                    style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    {Number(invoice.grandTotal).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right — Invoice Info ── */}
        <div>
          <div className="vp-card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--vp-text-primary)' }}>
              Invoice Information
            </h2>

            <div className="space-y-3">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'var(--vp-bg-surface-alt)',
                  border: '1px solid var(--vp-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Invoice Date
                </p>
                <p
                  className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: 'var(--vp-text-primary)' }}
                >
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--vp-teal)' }} />
                  {format(parseISO(invoice.invoiceDate), 'MMMM d, yyyy')}
                </p>
              </div>

              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'var(--vp-bg-surface-alt)',
                  border: '1px solid var(--vp-border)',
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Billed To
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  {invoice.billedTo === 'STOCKIST'
                    ? invoice.stockistFirmName
                    : invoice.chemistFirmName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                  {invoice.billedTo === 'STOCKIST' ? invoice.stockistState : invoice.chemistState}
                </p>
              </div>

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
                <p
                  className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: 'var(--vp-text-primary)' }}
                >
                  <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--vp-teal)' }} />
                  {invoice.chemistFirmName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                  {invoice.chemistState}
                </p>
              </div>

              {invoice.stockistFirmName && (
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
                  <p
                    className="text-sm font-semibold flex items-center gap-2"
                    style={{ color: 'var(--vp-text-primary)' }}
                  >
                    <Truck className="w-3.5 h-3.5" style={{ color: 'var(--vp-purple)' }} />
                    {invoice.stockistFirmName}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                    {invoice.stockistState}
                  </p>
                </div>
              )}

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
                  {invoice.repName}
                </p>
              </div>

              {/* Tax type explanation */}
              <div
                className="p-3 rounded-xl"
                style={{
                  background: isCgstSgst ? 'var(--vp-teal-light)' : 'var(--vp-purple-light)',
                  border: `1px solid ${isCgstSgst ? 'rgba(0,196,154,0.2)' : 'rgba(124,58,237,0.2)'}`,
                }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: isCgstSgst ? 'var(--vp-teal)' : 'var(--vp-purple)' }}
                >
                  {isCgstSgst ? '🏠 Intra-State (CGST + SGST)' : '🚚 Inter-State (IGST)'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--vp-text-secondary)' }}>
                  {isCgstSgst
                    ? 'Seller and buyer are in the same state. Tax is split equally between CGST and SGST.'
                    : 'Seller and buyer are in different states. Full tax rate applies as IGST.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment History — full width below the grid ── */}
        {invoicePayments.length > 0 && (
          <div className="lg:col-span-3">
            <div className="vp-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--vp-teal-light)' }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                    Payment History
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                    {invoicePayments.length} payment{invoicePayments.length !== 1 ? 's' : ''}{' '}
                    recorded against this invoice
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {invoicePayments.map((payment) => {
                  const alloc = payment.allocations.find((a) => a.invoiceId === invoice.id)
                  if (!alloc) return null
                  const modeColor = modeColors[payment.paymentMode] ?? 'var(--vp-teal)'
                  return (
                    <div
                      key={payment.id}
                      onClick={() => navigate(`/payments/${payment.id}`)}
                      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors"
                      style={{
                        background: 'var(--vp-bg-surface-alt)',
                        border: '1px solid var(--vp-border)',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--vp-bg-hover)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'var(--vp-bg-surface-alt)')
                      }
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: `${modeColor}15`, color: modeColor }}
                      >
                        {payment.paymentMode}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="text-sm font-semibold"
                            style={{ color: 'var(--vp-text-primary)' }}
                          >
                            {payment.paymentNumber}
                          </p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: `${modeColor}15`, color: modeColor }}
                          >
                            {payment.paymentMode}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                            {format(parseISO(payment.paymentDate), 'MMM d, yyyy')}
                          </span>
                          {payment.referenceNumber && (
                            <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              Ref: {payment.referenceNumber}
                            </span>
                          )}
                          {payment.notes && (
                            <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              {payment.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-0.5 justify-end">
                          <IndianRupee
                            className="w-3.5 h-3.5"
                            style={{ color: 'var(--vp-teal)' }}
                          />
                          <p className="text-sm font-bold" style={{ color: 'var(--vp-teal)' }}>
                            {Number(alloc.allocatedAmount).toFixed(2)}
                          </p>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                          Remaining after: ₹{Number(alloc.remainingAmount).toFixed(2)}
                        </p>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--vp-text-muted)' }}
                      />
                    </div>
                  )
                })}
              </div>

              <div
                className="flex items-center justify-between mt-4 pt-4"
                style={{ borderTop: '1px solid var(--vp-border)' }}
              >
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--vp-text-secondary)' }}
                  >
                    Total Paid Against This Invoice
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                    Grand Total: ₹{Number(invoice.grandTotal).toFixed(2)} — Remaining: ₹
                    {Math.max(0, Number(invoice.grandTotal) - totalPaid).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4" style={{ color: 'var(--vp-teal)' }} />
                  <p
                    className="text-xl font-bold"
                    style={{ color: 'var(--vp-teal)', fontFamily: 'var(--font-display)' }}
                  >
                    {totalPaid.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
