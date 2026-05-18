import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CreditCard,
  Building2,
  IndianRupee,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useCreatePaymentMutation } from './paymentsApi'
import { useGetOutstandingInvoicesQuery } from '@/features/invoices/invoicesApi'
import { useGetAllChemistsQuery } from '@/features/chemists/chemistsApi'
import { useGetAllStockistsQuery } from '@/features/stockists/stockistsApi'
import type { OutstandingInvoiceDto } from '@/types/billing'

// ── Zod schema ────────────────────────────────────────────────
const paymentSchema = z
  .object({
    payerType: z.enum(['CHEMIST', 'STOCKIST']),
    chemistId: z.string().optional(),
    stockistId: z.string().optional(),
    paymentDate: z.string().min(1, 'Payment date is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    paymentMode: z.enum(['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI']),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.payerType === 'CHEMIST') return !!data.chemistId
      if (data.payerType === 'STOCKIST') return !!data.stockistId
      return false
    },
    { message: 'Please select a payer', path: ['chemistId'] }
  )

type PaymentForm = z.infer<typeof paymentSchema>

// ── Allocation state type ─────────────────────────────────────
interface AllocationEntry {
  invoiceId: string
  invoiceNumber: string
  grandTotal: number
  remainingAmount: number
  allocatedAmount: number
}

export default function PaymentNewPage() {
  const navigate = useNavigate()
  const [createPayment, { isLoading }] = useCreatePaymentMutation()
  const [allocations, setAllocations] = useState<AllocationEntry[]>([])

  const { data: outstandingData } = useGetOutstandingInvoicesQuery()
  const { data: chemistsData } = useGetAllChemistsQuery()
  const { data: stockistsData } = useGetAllStockistsQuery()

  const chemists = useMemo(() => chemistsData?.data ?? [], [chemistsData])
  const stockists = useMemo(() => stockistsData?.data ?? [], [stockistsData])
  const allInvoices = useMemo(() => outstandingData?.data ?? [], [outstandingData])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payerType: 'CHEMIST',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMode: 'CASH',
      amount: 0,
    },
  })

  const watchPayerType = watch('payerType')

  const watchChemistId = watch('chemistId')

  const watchStockistId = watch('stockistId')

  const watchAmount = watch('amount')

  const watchPaymentMode = watch('paymentMode')

  // Outstanding invoices for selected payer
  const outstandingInvoices = useMemo(() => {
    if (!allInvoices.length) return []
    return allInvoices.filter((inv) => {
      if (watchPayerType === 'CHEMIST' && watchChemistId) {
        return inv.chemistId === watchChemistId
      }
      if (watchPayerType === 'STOCKIST' && watchStockistId) {
        return inv.stockistId === watchStockistId
      }
      return false
    })
  }, [allInvoices, watchPayerType, watchChemistId, watchStockistId])

  // Total outstanding for selected payer — sum of all invoice outstanding amounts
  const totalOutstanding = useMemo(
    () => outstandingInvoices.reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0),
    [outstandingInvoices]
  )

  const handlePayerChange = () => {
    setAllocations([])
    setValue('chemistId', '')
    setValue('stockistId', '')
  }

  const addAllocation = (inv: OutstandingInvoiceDto) => {
    if (allocations.find((a) => a.invoiceId === inv.invoiceId)) return
    setAllocations((prev) => [
      ...prev,
      {
        invoiceId: inv.invoiceId,
        invoiceNumber: inv.invoiceNumber,
        grandTotal: Number(inv.grandTotal),
        remainingAmount: Number(inv.outstandingAmount),
        allocatedAmount: Number(inv.outstandingAmount),
      },
    ])
  }

  const updateAllocation = (invoiceId: string, amount: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.invoiceId === invoiceId ? { ...a, allocatedAmount: amount } : a))
    )
  }

  const removeAllocation = (invoiceId: string) => {
    setAllocations((prev) => prev.filter((a) => a.invoiceId !== invoiceId))
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0)
  const allocationValid = Math.abs(totalAllocated - Number(watchAmount)) < 0.01
  const hasAllocations = allocations.length > 0
  // Block submit if any invoice is over-allocated
  const hasOverAllocation = allocations.some(
    (a) => Number(a.allocatedAmount) > Number(a.remainingAmount)
  )
  const canSubmit = allocationValid && hasAllocations && !hasOverAllocation

  const onSubmit = async (data: PaymentForm) => {
    if (!hasAllocations) {
      toast.error('Add at least one invoice allocation')
      return
    }
    if (!allocationValid) {
      toast.error(
        `Allocated total (₹${totalAllocated.toFixed(2)}) must equal payment amount (₹${Number(data.amount).toFixed(2)})`
      )
      return
    }
    const overAllocated = allocations.find(
      (a) => Number(a.allocatedAmount) > Number(a.remainingAmount)
    )
    if (overAllocated) {
      toast.error(
        `Allocation for ${overAllocated.invoiceNumber} (₹${Number(overAllocated.allocatedAmount).toFixed(2)}) exceeds outstanding balance (₹${Number(overAllocated.remainingAmount).toFixed(2)})`
      )
      return
    }

    try {
      await createPayment({
        chemistId: data.payerType === 'CHEMIST' ? data.chemistId : undefined,
        stockistId: data.payerType === 'STOCKIST' ? data.stockistId : undefined,
        paymentDate: data.paymentDate,
        amount: data.amount,
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber || undefined,
        notes: data.notes || undefined,
        allocations: allocations.map((a) => ({
          invoiceId: a.invoiceId,
          allocatedAmount: a.allocatedAmount,
        })),
      }).unwrap()
      toast.success('Payment recorded successfully')
      navigate('/payments')
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to record payment')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
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
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Record Payment
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            Record a payment received from a chemist or stockist
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Payer Card ── */}
        <div className="vp-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--vp-teal-light)' }}
            >
              <Building2 className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              Payer Details
            </h2>
          </div>

          <div className="space-y-4">
            {/* Payer type toggle */}
            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Payer Type *
              </label>
              <div className="flex gap-3">
                {(['CHEMIST', 'STOCKIST'] as const).map((type) => {
                  const isSelected = watchPayerType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setValue('payerType', type)
                        handlePayerChange()
                      }}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{
                        background: isSelected ? 'var(--vp-teal)' : 'var(--vp-bg-surface)',
                        color: isSelected ? '#FFFFFF' : 'var(--vp-text-secondary)',
                        border: `1px solid ${isSelected ? 'var(--vp-teal)' : 'var(--vp-border)'}`,
                      }}
                    >
                      {type === 'CHEMIST' ? 'Chemist' : 'Stockist'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Payer selector */}
            {watchPayerType === 'CHEMIST' ? (
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Chemist *
                </label>
                <select
                  {...register('chemistId')}
                  className="input-dark"
                  style={{ background: 'var(--vp-bg-surface)' }}
                  onChange={(e) => {
                    setValue('chemistId', e.target.value)
                    setAllocations([])
                  }}
                >
                  <option value="">Select a chemist</option>
                  {chemists.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firmName} — {c.city}, {c.state}
                    </option>
                  ))}
                </select>
                {errors.chemistId && (
                  <p className="text-xs mt-1 text-rose-500">{errors.chemistId.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Stockist *
                </label>
                <select
                  {...register('stockistId')}
                  className="input-dark"
                  style={{ background: 'var(--vp-bg-surface)' }}
                  onChange={(e) => {
                    setValue('stockistId', e.target.value)
                    setAllocations([])
                  }}
                >
                  <option value="">Select a stockist</option>
                  {stockists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firmName} — {s.city}, {s.state}
                    </option>
                  ))}
                </select>
                {errors.stockistId && (
                  <p className="text-xs mt-1 text-rose-500">{errors.stockistId.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Payment Details Card ── */}
        <div className="vp-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--vp-purple-light)' }}
            >
              <CreditCard className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              Payment Details
            </h2>
          </div>

          <div className="space-y-4">
            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Amount (₹) *
                </label>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-dark"
                  placeholder="0.00"
                  style={{
                    border:
                      totalOutstanding > 0 && Number(watchAmount) > totalOutstanding
                        ? '1px solid var(--vp-amber)'
                        : undefined,
                  }}
                />
                {errors.amount && (
                  <p className="text-xs mt-1 text-rose-500">{errors.amount.message}</p>
                )}
                {/* Show total outstanding hint */}
                {totalOutstanding > 0 && (
                  <p
                    className="text-xs mt-1"
                    style={{
                      color:
                        Number(watchAmount) > totalOutstanding
                          ? 'var(--vp-amber)'
                          : 'var(--vp-text-muted)',
                    }}
                  >
                    {Number(watchAmount) > totalOutstanding
                      ? `⚠️ Exceeds total outstanding (₹${totalOutstanding.toFixed(2)})`
                      : `Total outstanding for this payer: ₹${totalOutstanding.toFixed(2)}`}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Payment Date *
                </label>
                <input {...register('paymentDate')} type="date" className="input-dark" />
                {errors.paymentDate && (
                  <p className="text-xs mt-1 text-rose-500">{errors.paymentDate.message}</p>
                )}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Payment Mode *
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI'] as const).map((mode) => {
                  const isSelected = watchPaymentMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setValue('paymentMode', mode)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: isSelected ? 'var(--vp-teal)' : 'var(--vp-bg-surface)',
                        color: isSelected ? '#FFFFFF' : 'var(--vp-text-secondary)',
                        border: `1px solid ${isSelected ? 'var(--vp-teal)' : 'var(--vp-border)'}`,
                      }}
                    >
                      {mode}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Reference + Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Reference Number
                </label>
                <input
                  {...register('referenceNumber')}
                  className="input-dark"
                  placeholder="UPI ref / cheque no."
                />
              </div>
              <div>
                <label
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Notes
                </label>
                <input {...register('notes')} className="input-dark" placeholder="Optional notes" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Invoice Allocations Card ── */}
        <div className="vp-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--vp-amber-light)' }}
            >
              <FileText className="w-5 h-5" style={{ color: 'var(--vp-amber)' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Invoice Allocations
              </h2>
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                Total allocated must equal payment amount exactly
              </p>
            </div>
          </div>

          {/* Allocation rule explanation */}
          <div
            className="p-3 rounded-xl mb-4"
            style={{
              background: 'var(--vp-amber-light)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--vp-amber)' }}>
              ⚠️ The sum of all allocated amounts must equal the total payment amount (₹
              {Number(watchAmount).toFixed(2)}). Select invoices below and enter how much to
              allocate to each.
            </p>
          </div>

          {/* Outstanding invoices for selected payer */}
          {(watchChemistId || watchStockistId) && outstandingInvoices.length > 0 && (
            <div className="mb-4">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--vp-text-muted)' }}
              >
                Outstanding Invoices — click to add
              </p>
              <div className="space-y-2">
                {outstandingInvoices.map((inv) => {
                  const already = allocations.find((a) => a.invoiceId === inv.invoiceId)
                  return (
                    <button
                      key={inv.invoiceId}
                      type="button"
                      onClick={() => !already && addAllocation(inv)}
                      className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all"
                      style={{
                        background: already ? 'var(--vp-teal-light)' : 'var(--vp-bg-surface-alt)',
                        border: `1px solid ${already ? 'rgba(0,196,154,0.3)' : 'var(--vp-border)'}`,
                        opacity: already ? 0.7 : 1,
                        cursor: already ? 'default' : 'pointer',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText
                          className="w-4 h-4"
                          style={{ color: already ? 'var(--vp-teal)' : 'var(--vp-text-muted)' }}
                        />
                        <div>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: 'var(--vp-text-primary)' }}
                          >
                            {inv.invoiceNumber}
                          </span>
                          <span
                            className="ml-2 text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                inv.status === 'PARTIALLY_PAID'
                                  ? 'var(--vp-amber-light)'
                                  : 'var(--vp-teal-light)',
                              color:
                                inv.status === 'PARTIALLY_PAID'
                                  ? 'var(--vp-amber)'
                                  : 'var(--vp-teal)',
                            }}
                          >
                            {inv.status === 'PARTIALLY_PAID' ? 'Partial' : 'Issued'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          ₹{Number(inv.outstandingAmount).toFixed(2)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          outstanding
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* No outstanding invoices */}
          {(watchChemistId || watchStockistId) && outstandingInvoices.length === 0 && (
            <div
              className="p-4 rounded-xl text-center mb-4"
              style={{
                background: 'var(--vp-bg-surface-alt)',
                border: '1px solid var(--vp-border)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
                No outstanding invoices found for this payer
              </p>
            </div>
          )}

          {/* No payer selected yet */}
          {!watchChemistId && !watchStockistId && (
            <div
              className="p-4 rounded-xl text-center mb-4"
              style={{
                background: 'var(--vp-bg-surface-alt)',
                border: '1px solid var(--vp-border)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
                Select a chemist or stockist above to see their outstanding invoices
              </p>
            </div>
          )}

          {/* Selected allocations */}
          {allocations.length > 0 && (
            <div className="space-y-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--vp-text-muted)' }}
              >
                Allocation Amounts
              </p>
              {allocations.map((alloc) => (
                <div
                  key={alloc.invoiceId}
                  className="p-3 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {alloc.invoiceNumber}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeAllocation(alloc.invoiceId)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: 'var(--vp-rose)', background: 'var(--vp-rose-light)' }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label
                        className="block text-xs mb-1"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        Allocate Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={alloc.remainingAmount}
                        value={alloc.allocatedAmount || ''}
                        onChange={(e) => updateAllocation(alloc.invoiceId, Number(e.target.value))}
                        className="input-dark text-sm"
                        placeholder="0.00"
                        style={{
                          border:
                            Number(alloc.allocatedAmount) > alloc.remainingAmount
                              ? '1px solid var(--vp-rose)'
                              : undefined,
                        }}
                      />
                      {Number(alloc.allocatedAmount) > alloc.remainingAmount && (
                        <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                          Exceeds outstanding balance of ₹{alloc.remainingAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                        Outstanding
                      </p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--vp-rose)' }}>
                        ₹{alloc.remainingAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Allocation summary */}
              <div
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: canSubmit ? 'var(--vp-teal-light)' : 'var(--vp-rose-light)',
                  border: `1px solid ${canSubmit ? 'rgba(0,196,154,0.3)' : 'rgba(244,63,94,0.3)'}`,
                }}
              >
                <div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: canSubmit ? 'var(--vp-teal)' : 'var(--vp-rose)' }}
                  >
                    {canSubmit
                      ? '✓ Allocation valid — ready to submit'
                      : hasOverAllocation
                        ? '⚠️ One or more allocations exceed outstanding balance'
                        : '⚠️ Allocation does not match payment amount'}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: canSubmit ? 'var(--vp-teal)' : 'var(--vp-rose)' }}
                  >
                    Allocated: ₹{totalAllocated.toFixed(2)} / Payment: ₹
                    {Number(watchAmount).toFixed(2)}
                  </p>
                </div>
                {canSubmit ? (
                  <IndianRupee className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
                ) : (
                  <AlertCircle className="w-5 h-5" style={{ color: 'var(--vp-rose)' }} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/payments')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            style={{ opacity: !canSubmit ? 0.5 : 1 }}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}
