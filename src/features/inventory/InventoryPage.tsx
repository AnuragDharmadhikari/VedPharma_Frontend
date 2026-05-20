// src/features/inventory/InventoryPage.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  Package,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  Calendar,
  Hash,
  TrendingDown,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetNearExpiryBatchesQuery,
  useGetExpiredBatchesQuery,
  useGetBatchesByProductQuery,
  useAddBatchMutation,
} from './inventoryApi'
import { useGetAllProductsQuery } from '@/features/products/productsApi'
import type { BatchDto } from '@/types/inventory'

// ── Zod schema for Add Batch form ─────────────────────────────────────────────
// expiryDate must be a future date — mirrors @Future constraint on backend
const addBatchSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  mfgDate: z.string().min(1, 'Manufacturing date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  quantity: z.number({ error: 'Quantity must be a number' }).min(1, 'Minimum 1 unit'),
})

type AddBatchForm = z.infer<typeof addBatchSchema>

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = 'near-expiry' | 'expired' | 'by-product'

export default function InventoryPage() {
  const navigate = useNavigate()
  const { isOwner } = useAuth()

  // Active tab state — defaults to the most urgent alert panel
  const [activeTab, setActiveTab] = useState<Tab>('near-expiry')
  const [showAddBatch, setShowAddBatch] = useState(false)

  // "By Product" tab state — user types a product name to search
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: nearExpiryData, isLoading: nearExpiryLoading } = useGetNearExpiryBatchesQuery()
  const { data: expiredData, isLoading: expiredLoading } = useGetExpiredBatchesQuery()

  // Products list for the "By Product" tab dropdown and the Add Batch form
  const { data: productsData } = useGetAllProductsQuery()

  // Only fires when user has selected a product in the "By Product" tab
  const { data: batchesByProductData, isLoading: byProductLoading } = useGetBatchesByProductQuery(
    selectedProductId,
    { skip: !selectedProductId }
  )

  // Stabilise arrays with useMemo — prevents unnecessary re-renders
  const nearExpiryBatches = useMemo(() => nearExpiryData?.data ?? [], [nearExpiryData])
  const expiredBatches = useMemo(() => expiredData?.data ?? [], [expiredData])
  const allProducts = useMemo(() => productsData?.data ?? [], [productsData])
  const batchesByProduct = useMemo(() => batchesByProductData?.data ?? [], [batchesByProductData])

  // Filter products list for the "By Product" tab search input
  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts.filter((p) => p.isActive)
    return allProducts
      .filter((p) => p.isActive)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.molecule.toLowerCase().includes(productSearch.toLowerCase())
      )
  }, [allProducts, productSearch])

  // ── Add Batch form ────────────────────────────────────────────────────────
  const [addBatch, { isLoading: adding }] = useAddBatchMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddBatchForm>({
    resolver: zodResolver(addBatchSchema),
  })

  const onAddBatch = async (formData: AddBatchForm) => {
    try {
      await addBatch({
        productId: formData.productId,
        batchNumber: formData.batchNumber,
        mfgDate: formData.mfgDate,
        expiryDate: formData.expiryDate,
        quantity: formData.quantity,
      }).unwrap()
      toast.success('Batch added successfully')
      reset()
      setShowAddBatch(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to add batch')
    }
  }

  // ── Tab config — drives tab bar rendering ─────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      key: 'near-expiry',
      label: 'Near Expiry',
      icon: <AlertTriangle className="w-4 h-4" />,
      count: nearExpiryBatches.length,
    },
    {
      key: 'expired',
      label: 'Expired Stock',
      icon: <XCircle className="w-4 h-4" />,
      count: expiredBatches.length,
    },
    {
      key: 'by-product',
      label: 'By Product',
      icon: <Search className="w-4 h-4" />,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Inventory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            Batch tracking, expiry alerts, and stock management
          </p>
        </div>
        {/* Add Batch — OWNER only, backend enforces this with @PreAuthorize */}
        {isOwner && (
          <button
            onClick={() => setShowAddBatch(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Batch
          </button>
        )}
      </div>

      {/* ── Summary KPI Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Near Expiry count */}
        <div className="vp-card p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--vp-amber-light)' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--vp-amber)' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                Near Expiry
              </p>
              {nearExpiryLoading ? (
                <Skeleton className="h-6 w-8 skeleton-shimmer mt-1" />
              ) : (
                <p
                  className="text-xl font-bold"
                  style={{ color: 'var(--vp-amber)', fontFamily: 'var(--font-display)' }}
                >
                  {nearExpiryBatches.length}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Expired with stock count */}
        <div className="vp-card p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--vp-rose-light)' }}
            >
              <XCircle className="w-5 h-5" style={{ color: 'var(--vp-rose)' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                Expired (with stock)
              </p>
              {expiredLoading ? (
                <Skeleton className="h-6 w-8 skeleton-shimmer mt-1" />
              ) : (
                <p
                  className="text-xl font-bold"
                  style={{ color: 'var(--vp-rose)', fontFamily: 'var(--font-display)' }}
                >
                  {expiredBatches.length}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Total units near expiry */}
        <div className="vp-card p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--vp-teal-light)' }}
            >
              <TrendingDown className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                Units at Risk
              </p>
              {nearExpiryLoading || expiredLoading ? (
                <Skeleton className="h-6 w-12 skeleton-shimmer mt-1" />
              ) : (
                <p
                  className="text-xl font-bold"
                  style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {/* Sum of currentQuantity across near-expiry + expired batches */}
                  {[...nearExpiryBatches, ...expiredBatches].reduce(
                    (sum, b) => sum + b.currentQuantity,
                    0
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div className="vp-card overflow-hidden">
        {/* Tab buttons */}
        <div className="flex border-b" style={{ borderColor: 'var(--vp-border)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative"
              style={{
                color: activeTab === tab.key ? 'var(--vp-teal)' : 'var(--vp-text-muted)',
                borderBottom:
                  activeTab === tab.key ? '2px solid var(--vp-teal)' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab.icon}
              {tab.label}
              {/* Badge showing count — only shown for alert tabs with data */}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background:
                      tab.key === 'expired' ? 'var(--vp-rose-light)' : 'var(--vp-amber-light)',
                    color: tab.key === 'expired' ? 'var(--vp-rose)' : 'var(--vp-amber)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Near Expiry ─────────────────────────────────────────────── */}
        {activeTab === 'near-expiry' && (
          <div>
            {nearExpiryLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 skeleton-shimmer" />
                ))}
              </div>
            ) : nearExpiryBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle
                  className="w-10 h-10 mb-3"
                  style={{ color: 'var(--vp-text-muted)' }}
                />
                <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  No batches near expiry
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
                  All batches expire more than 90 days from today
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
                {nearExpiryBatches.map((batch) => (
                  <BatchRow key={batch.id} batch={batch} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Expired Stock ───────────────────────────────────────────── */}
        {activeTab === 'expired' && (
          <div>
            {expiredLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 skeleton-shimmer" />
                ))}
              </div>
            ) : expiredBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <XCircle className="w-10 h-10 mb-3" style={{ color: 'var(--vp-text-muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  No expired stock to write off
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
                  All expired batches have already been cleared
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
                {expiredBatches.map((batch) => (
                  <BatchRow key={batch.id} batch={batch} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: By Product ──────────────────────────────────────────────── */}
        {activeTab === 'by-product' && (
          <div className="p-4 space-y-4">
            {/* Product search input */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--vp-text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search product by name or molecule..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value)
                  setSelectedProductId('') // Clear selection when searching
                }}
                className="input-dark w-full"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            {/* Product pills — click to load batches */}
            {!selectedProductId && (
              <div className="flex flex-wrap gap-2">
                {filteredProducts.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProductId(p.id)
                      setProductSearch(p.name)
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: 'var(--vp-bg-surface-alt)',
                      color: 'var(--vp-text-secondary)',
                      border: '1px solid var(--vp-border)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--vp-teal-light)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'var(--vp-bg-surface-alt)')
                    }
                  >
                    {p.name}
                  </button>
                ))}
                {filteredProducts.length === 0 && productSearch && (
                  <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
                    No products match "{productSearch}"
                  </p>
                )}
              </div>
            )}

            {/* Batch results for selected product */}
            {selectedProductId && (
              <div>
                {/* Selected product header + clear */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                    Batches for: <span style={{ color: 'var(--vp-teal)' }}>{productSearch}</span>
                  </p>
                  <button
                    onClick={() => {
                      setSelectedProductId('')
                      setProductSearch('')
                    }}
                    className="text-xs"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    Clear
                  </button>
                </div>

                {byProductLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 skeleton-shimmer" />
                    ))}
                  </div>
                ) : batchesByProduct.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="w-8 h-8 mb-2" style={{ color: 'var(--vp-text-muted)' }} />
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      No batches for this product
                    </p>
                    {isOwner && (
                      <button
                        onClick={() => setShowAddBatch(true)}
                        className="btn-primary text-xs mt-3"
                      >
                        Add First Batch
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="divide-y rounded-xl overflow-hidden"
                    style={{
                      borderColor: 'var(--vp-border)',
                      border: '1px solid var(--vp-border)',
                    }}
                  >
                    {batchesByProduct.map((batch) => (
                      <BatchRow key={batch.id} batch={batch} navigate={navigate} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Batch Modal ──────────────────────────────────────────────────── */}
      <Dialog open={showAddBatch} onOpenChange={setShowAddBatch}>
        <DialogContent
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Add New Batch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddBatch)} className="space-y-4 mt-2">
            {/* Product selector */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Product *
              </label>
              <select {...register('productId')} className="input-dark w-full">
                <option value="">Select a product</option>
                {allProducts
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.molecule}
                    </option>
                  ))}
              </select>
              {errors.productId && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {errors.productId.message}
                </p>
              )}
            </div>

            {/* Batch Number */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Batch Number *
              </label>
              <input
                {...register('batchNumber')}
                type="text"
                placeholder="e.g. BT-2025-001"
                className="input-dark w-full"
              />
              {errors.batchNumber && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {errors.batchNumber.message}
                </p>
              )}
            </div>

            {/* Mfg Date + Expiry Date side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Mfg Date *
                </label>
                <input {...register('mfgDate')} type="date" className="input-dark w-full" />
                {errors.mfgDate && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.mfgDate.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Expiry Date *
                </label>
                <input {...register('expiryDate')} type="date" className="input-dark w-full" />
                {errors.expiryDate && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {errors.expiryDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Quantity (units) *
              </label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="e.g. 500"
                className="input-dark w-full"
              />
              {errors.quantity && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Form actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  reset()
                  setShowAddBatch(false)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                {adding ? 'Adding...' : 'Add Batch'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── BatchRow — shared between all three tabs ───────────────────────────────────
// Extracted as a local component so the same row renders consistently
// across near-expiry, expired, and by-product tab results
interface BatchRowProps {
  batch: BatchDto
  navigate: ReturnType<typeof useNavigate>
}

function BatchRow({ batch, navigate }: BatchRowProps) {
  return (
    <div
      onClick={() => navigate(`/inventory/batches/${batch.id}`)}
      className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Status icon avatar */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: batch.isExpired
            ? 'var(--vp-rose-light)'
            : batch.isNearExpiry
              ? 'var(--vp-amber-light)'
              : 'var(--vp-teal-light)',
        }}
      >
        {batch.isExpired ? (
          <XCircle className="w-5 h-5" style={{ color: 'var(--vp-rose)' }} />
        ) : (
          <AlertTriangle className="w-5 h-5" style={{ color: 'var(--vp-amber)' }} />
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
            {batch.productName}
          </p>
          {batch.isExpired && <span className="badge-crimson text-xs">Expired</span>}
          {batch.isNearExpiry && !batch.isExpired && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--vp-amber-light)', color: 'var(--vp-amber)' }}
            >
              Near Expiry
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--vp-text-muted)' }}
          >
            <Hash className="w-3 h-3" /> {batch.batchNumber}
          </span>
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--vp-text-muted)' }}
          >
            <Calendar className="w-3 h-3" /> Exp:{' '}
            {format(parseISO(batch.expiryDate), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Stock level + chevron */}
      <div className="text-right shrink-0">
        <p
          className="text-sm font-bold"
          style={{ color: batch.isExpired ? 'var(--vp-rose)' : 'var(--vp-text-primary)' }}
        >
          {batch.currentQuantity} units
        </p>
        <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
          of {batch.initialQuantity} initial
        </p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--vp-text-muted)' }} />
    </div>
  )
}
