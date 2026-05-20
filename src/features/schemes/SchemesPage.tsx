// src/features/schemes/SchemesPage.tsx
import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Tag, Gift, Plus, Edit2, Loader2, Calendar, Package, Building2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetSchemesByChemistQuery,
  useGetSchemesByStockistQuery,
  useCreateSchemeMutation,
  useUpdateSchemeMutation,
} from './schemesApi'
import { useGetAllChemistsQuery } from '@/features/chemists/chemistsApi'
import { useGetAllStockistsQuery } from '@/features/stockists/stockistsApi'
import { useGetAllProductsQuery } from '@/features/products/productsApi'
import type { SchemeDto } from '@/types/scheme'

// ── Create schema — conditional validation based on schemeType ─────────────────
const createSchemeSchema = z
  .object({
    buyerType: z.enum(['CHEMIST', 'STOCKIST']),
    chemistId: z.string().optional(),
    stockistId: z.string().optional(),
    productId: z.string().min(1, 'Product is required'),
    schemeType: z.enum(['QUANTITY_FREE', 'PERCENTAGE_DISCOUNT']),
    minQuantity: z.number({ error: 'Min quantity is required' }).min(1, 'Minimum 1 unit'),
    freeQuantity: z.number().min(1).optional(),
    discountPct: z.number().min(0.01).max(100).optional(),
    validFrom: z.string().min(1, 'Valid from date is required'),
    validTo: z.string().min(1, 'Valid to date is required'),
  })
  .refine(
    (data) => {
      if (data.buyerType === 'CHEMIST') return !!data.chemistId
      return !!data.stockistId
    },
    { message: 'Please select a buyer', path: ['chemistId'] }
  )
  .refine(
    (data) => {
      if (data.schemeType === 'QUANTITY_FREE') return !!data.freeQuantity
      return true
    },
    { message: 'Free quantity is required for this scheme type', path: ['freeQuantity'] }
  )
  .refine(
    (data) => {
      if (data.schemeType === 'PERCENTAGE_DISCOUNT') return !!data.discountPct
      return true
    },
    { message: 'Discount percentage is required for this scheme type', path: ['discountPct'] }
  )

type CreateSchemeForm = z.infer<typeof createSchemeSchema>

// ── Edit schema — only updatable fields ───────────────────────────────────────
const editSchemeSchema = z.object({
  minQuantity: z.number({ error: 'Min quantity is required' }).min(1, 'Minimum 1'),
  freeQuantity: z.number().min(1).optional(),
  discountPct: z.number().min(0.01).max(100).optional(),
  validTo: z.string().min(1, 'Valid to date is required'),
  isActive: z.boolean(),
})

type EditSchemeForm = z.infer<typeof editSchemeSchema>

// ── Buyer type toggle ─────────────────────────────────────────────────────────
type BuyerType = 'CHEMIST' | 'STOCKIST'

export default function SchemesPage() {
  const { isOwner } = useAuth()

  // ── Buyer selection state ──────────────────────────────────────────────────
  const [buyerType, setBuyerType] = useState<BuyerType>('CHEMIST')
  const [selectedBuyerId, setSelectedBuyerId] = useState('')

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<SchemeDto | null>(null)

  // ── Reference data ─────────────────────────────────────────────────────────
  const { data: chemistsData } = useGetAllChemistsQuery()
  const { data: stockistsData } = useGetAllStockistsQuery()
  const { data: productsData } = useGetAllProductsQuery()

  const chemists = useMemo(() => chemistsData?.data ?? [], [chemistsData])
  const stockists = useMemo(() => stockistsData?.data ?? [], [stockistsData])
  const products = useMemo(() => productsData?.data ?? [], [productsData])

  // ── Scheme queries — only fire when a buyer is selected ───────────────────
  const { data: chemistSchemesData, isLoading: chemistLoading } = useGetSchemesByChemistQuery(
    selectedBuyerId,
    { skip: !selectedBuyerId || buyerType !== 'CHEMIST' }
  )
  const { data: stockistSchemesData, isLoading: stockistLoading } = useGetSchemesByStockistQuery(
    selectedBuyerId,
    { skip: !selectedBuyerId || buyerType !== 'STOCKIST' }
  )

  const schemes = useMemo(() => {
    if (!selectedBuyerId) return []
    if (buyerType === 'CHEMIST') return chemistSchemesData?.data ?? []
    return stockistSchemesData?.data ?? []
  }, [buyerType, selectedBuyerId, chemistSchemesData, stockistSchemesData])

  const isLoading = buyerType === 'CHEMIST' ? chemistLoading : stockistLoading

  // ── Mutations ──────────────────────────────────────────────────────────────
  const [createScheme, { isLoading: creating }] = useCreateSchemeMutation()
  const [updateScheme, { isLoading: updating }] = useUpdateSchemeMutation()

  // ── Create form ────────────────────────────────────────────────────────────
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    watch: watchCreate,
    formState: { errors: createErrors },
  } = useForm<CreateSchemeForm>({
    resolver: zodResolver(createSchemeSchema),
    defaultValues: { buyerType: 'CHEMIST', schemeType: 'QUANTITY_FREE' },
  })

  // Watch schemeType and buyerType to show/hide conditional fields
  const watchSchemeType = watchCreate('schemeType')
  const watchBuyerTypeForm = watchCreate('buyerType')

  const onCreateSubmit = async (formData: CreateSchemeForm) => {
    try {
      await createScheme({
        productId: formData.productId,
        chemistId: formData.buyerType === 'CHEMIST' ? formData.chemistId : undefined,
        stockistId: formData.buyerType === 'STOCKIST' ? formData.stockistId : undefined,
        schemeType: formData.schemeType,
        minQuantity: formData.minQuantity,
        freeQuantity: formData.schemeType === 'QUANTITY_FREE' ? formData.freeQuantity : undefined,
        discountPct:
          formData.schemeType === 'PERCENTAGE_DISCOUNT' ? formData.discountPct : undefined,
        validFrom: formData.validFrom,
        validTo: formData.validTo,
      }).unwrap()
      toast.success('Scheme created successfully')
      resetCreate()
      setShowCreate(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to create scheme')
    }
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditSchemeForm>({
    resolver: zodResolver(editSchemeSchema),
  })

  const openEdit = (scheme: SchemeDto) => {
    setEditTarget(scheme)
    resetEdit({
      minQuantity: scheme.minQuantity,
      freeQuantity: scheme.freeQuantity ?? undefined,
      discountPct: scheme.discountPct ? Number(scheme.discountPct) : undefined,
      validTo: scheme.validTo,
      isActive: scheme.isActive,
    })
  }

  const onEditSubmit = async (formData: EditSchemeForm) => {
    if (!editTarget) return
    try {
      await updateScheme({
        id: editTarget.id,
        body: {
          minQuantity: formData.minQuantity,
          freeQuantity:
            editTarget.schemeType === 'QUANTITY_FREE' ? formData.freeQuantity : undefined,
          discountPct:
            editTarget.schemeType === 'PERCENTAGE_DISCOUNT' ? formData.discountPct : undefined,
          validTo: formData.validTo,
          isActive: formData.isActive,
        },
      }).unwrap()
      toast.success('Scheme updated successfully')
      setEditTarget(null)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update scheme')
    }
  }

  // ── Selected buyer name for display ───────────────────────────────────────
  const selectedBuyerName = useMemo(() => {
    if (!selectedBuyerId) return ''
    if (buyerType === 'CHEMIST') {
      return chemists.find((c) => c.id === selectedBuyerId)?.firmName ?? ''
    }
    return stockists.find((s) => s.id === selectedBuyerId)?.firmName ?? ''
  }, [selectedBuyerId, buyerType, chemists, stockists])

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Schemes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            Promotional deals — auto-applied on qualifying orders
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Scheme
          </button>
        )}
      </div>

      {/* ── Buyer selector ───────────────────────────────────────────────────── */}
      <div className="vp-card p-5 space-y-4">
        {/* Buyer type toggle pills */}
        <div className="flex items-center gap-2">
          {(['CHEMIST', 'STOCKIST'] as BuyerType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setBuyerType(type)
                setSelectedBuyerId('') // Clear selection when switching buyer type
              }}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: buyerType === type ? 'var(--vp-teal-light)' : 'transparent',
                color: buyerType === type ? 'var(--vp-teal)' : 'var(--vp-text-muted)',
                border:
                  buyerType === type
                    ? '1px solid rgba(0,196,154,0.3)'
                    : '1px solid var(--vp-border)',
              }}
            >
              {type === 'CHEMIST' ? 'Chemist' : 'Stockist'}
            </button>
          ))}
        </div>

        {/* Buyer dropdown */}
        <div className="relative">
          <Building2
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--vp-text-muted)' }}
          />
          <select
            value={selectedBuyerId}
            onChange={(e) => setSelectedBuyerId(e.target.value)}
            className="input-dark w-full"
            style={{ paddingLeft: '2.5rem' }}
          >
            <option value="">
              Select a {buyerType === 'CHEMIST' ? 'chemist' : 'stockist'} to view schemes...
            </option>
            {buyerType === 'CHEMIST'
              ? chemists
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firmName} — {c.city}
                    </option>
                  ))
              : stockists
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firmName} — {s.city}
                    </option>
                  ))}
          </select>
        </div>
      </div>

      {/* ── Scheme results ───────────────────────────────────────────────────── */}
      {!selectedBuyerId ? (
        // Prompt state — no buyer selected yet
        <div className="vp-card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--vp-purple-light)' }}
            >
              <Tag className="w-8 h-8" style={{ color: 'var(--vp-purple)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              Select a buyer above
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--vp-text-muted)' }}>
              Choose a chemist or stockist to view their active schemes
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 skeleton-shimmer" />
          ))}
        </div>
      ) : schemes.length === 0 ? (
        // Empty state — buyer selected but no schemes
        <div className="vp-card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--vp-bg-surface-alt)' }}
            >
              <Tag className="w-8 h-8" style={{ color: 'var(--vp-text-muted)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              No active schemes for {selectedBuyerName}
            </p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--vp-text-muted)' }}>
              Active schemes auto-apply on qualifying orders
            </p>
            {isOwner && (
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
                Create First Scheme
              </button>
            )}
          </div>
        </div>
      ) : (
        // Scheme cards
        <div className="space-y-3">
          {/* Result header */}
          <p className="text-xs font-semibold px-1" style={{ color: 'var(--vp-text-muted)' }}>
            {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} for{' '}
            <span style={{ color: 'var(--vp-text-primary)' }}>{selectedBuyerName}</span>
          </p>

          {schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              isOwner={isOwner}
              onEdit={() => openEdit(scheme)}
            />
          ))}
        </div>
      )}

      {/* ── Create Scheme Modal ──────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Create Scheme</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4 mt-2">
            {/* Buyer Type */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Buyer Type *
              </label>
              <select {...registerCreate('buyerType')} className="input-dark w-full">
                <option value="CHEMIST">Chemist</option>
                <option value="STOCKIST">Stockist</option>
              </select>
            </div>

            {/* Buyer selector — conditional on buyerType */}
            {watchBuyerTypeForm === 'CHEMIST' ? (
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Chemist *
                </label>
                <select {...registerCreate('chemistId')} className="input-dark w-full">
                  <option value="">Select chemist</option>
                  {chemists
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firmName} — {c.city}
                      </option>
                    ))}
                </select>
                {createErrors.chemistId && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {createErrors.chemistId.message}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Stockist *
                </label>
                <select {...registerCreate('stockistId')} className="input-dark w-full">
                  <option value="">Select stockist</option>
                  {stockists
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firmName} — {s.city}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Product */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Product *
              </label>
              <select {...registerCreate('productId')} className="input-dark w-full">
                <option value="">Select product</option>
                {products
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.molecule}
                    </option>
                  ))}
              </select>
              {createErrors.productId && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {createErrors.productId.message}
                </p>
              )}
            </div>

            {/* Scheme Type */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Scheme Type *
              </label>
              <select {...registerCreate('schemeType')} className="input-dark w-full">
                <option value="QUANTITY_FREE">Quantity Free (Buy X Get Y Free)</option>
                <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
              </select>
            </div>

            {/* Min Quantity */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Min Quantity to Qualify *
              </label>
              <input
                {...registerCreate('minQuantity', { valueAsNumber: true })}
                type="number"
                min={1}
                placeholder="e.g. 10"
                className="input-dark w-full"
              />
              {createErrors.minQuantity && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {createErrors.minQuantity.message}
                </p>
              )}
            </div>

            {/* Conditional benefit field */}
            {watchSchemeType === 'QUANTITY_FREE' ? (
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Free Quantity *
                </label>
                <input
                  {...registerCreate('freeQuantity', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  placeholder="e.g. 2"
                  className="input-dark w-full"
                />
                {createErrors.freeQuantity && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {createErrors.freeQuantity.message}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Discount % *
                </label>
                <input
                  {...registerCreate('discountPct', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={100}
                  placeholder="e.g. 15.00"
                  className="input-dark w-full"
                />
                {createErrors.discountPct && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {createErrors.discountPct.message}
                  </p>
                )}
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Valid From *
                </label>
                <input {...registerCreate('validFrom')} type="date" className="input-dark w-full" />
                {createErrors.validFrom && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {createErrors.validFrom.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Valid To *
                </label>
                <input {...registerCreate('validTo')} type="date" className="input-dark w-full" />
                {createErrors.validTo && (
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                    {createErrors.validTo.message}
                  </p>
                )}
              </div>
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
                {creating ? 'Creating...' : 'Create Scheme'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Scheme Modal ────────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Edit Scheme</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div
              className="px-3 py-2 rounded-lg text-xs mb-2"
              style={{ background: 'var(--vp-bg-surface-alt)', color: 'var(--vp-text-muted)' }}
            >
              {editTarget.productName} ·{' '}
              {editTarget.schemeType === 'QUANTITY_FREE' ? 'Quantity Free' : 'Percentage Discount'}{' '}
              · Scheme type cannot be changed
            </div>
          )}
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            {/* Min Quantity */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Min Quantity *
              </label>
              <input
                {...registerEdit('minQuantity', { valueAsNumber: true })}
                type="number"
                min={1}
                className="input-dark w-full"
              />
              {editErrors.minQuantity && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {editErrors.minQuantity.message}
                </p>
              )}
            </div>

            {/* Benefit field — conditional on existing schemeType */}
            {editTarget?.schemeType === 'QUANTITY_FREE' ? (
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Free Quantity
                </label>
                <input
                  {...registerEdit('freeQuantity', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  className="input-dark w-full"
                />
              </div>
            ) : (
              <div>
                <label
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Discount %
                </label>
                <input
                  {...registerEdit('discountPct', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={100}
                  className="input-dark w-full"
                />
              </div>
            )}

            {/* Valid To */}
            <div>
              <label
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Valid To *
              </label>
              <input {...registerEdit('validTo')} type="date" className="input-dark w-full" />
              {editErrors.validTo && (
                <p className="text-xs mt-1" style={{ color: 'var(--vp-rose)' }}>
                  {editErrors.validTo.message}
                </p>
              )}
            </div>

            {/* Active toggle */}
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--vp-bg-surface-alt)' }}
            >
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Active
                </p>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  Inactive schemes won't auto-apply on new orders
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input {...registerEdit('isActive')} type="checkbox" className="sr-only peer" />
                <div
                  className="w-10 h-5 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-4 after:w-4 after:transition-all after:bg-white"
                  style={{
                    background: 'var(--vp-bg-hover)',
                  }}
                />
              </label>
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

// ── SchemeCard — individual scheme display ─────────────────────────────────────
interface SchemeCardProps {
  scheme: SchemeDto
  isOwner: boolean
  onEdit: () => void
}

function SchemeCard({ scheme, isOwner, onEdit }: SchemeCardProps) {
  const isQtyFree = scheme.schemeType === 'QUANTITY_FREE'

  return (
    <div className="vp-card p-5" style={{ opacity: scheme.isActive ? 1 : 0.6 }}>
      <div className="flex items-start justify-between gap-3">
        {/* Left — scheme info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Type icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isQtyFree ? 'var(--vp-teal-light)' : 'var(--vp-purple-light)',
            }}
          >
            {isQtyFree ? (
              <Gift className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
            ) : (
              <Tag className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Product + type badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                {scheme.productName}
              </p>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: isQtyFree ? 'var(--vp-teal-light)' : 'var(--vp-purple-light)',
                  color: isQtyFree ? 'var(--vp-teal)' : 'var(--vp-purple)',
                }}
              >
                {isQtyFree ? 'Qty Free' : 'Disc %'}
              </span>
              {!scheme.isActive && <span className="badge-crimson text-xs">Inactive</span>}
            </div>

            {/* Molecule */}
            <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {scheme.productMolecule}
            </p>

            {/* Scheme terms */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                style={{
                  background: 'var(--vp-bg-surface-alt)',
                  color: 'var(--vp-text-secondary)',
                }}
              >
                <Package className="w-3 h-3" />
                Min: {scheme.minQuantity} units
              </span>

              {isQtyFree ? (
                <span
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                  style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                >
                  <Gift className="w-3 h-3" />+{scheme.freeQuantity} free
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg"
                  style={{ background: 'var(--vp-purple-light)', color: 'var(--vp-purple)' }}
                >
                  <Tag className="w-3 h-3" />
                  {Number(scheme.discountPct).toFixed(0)}% off
                </span>
              )}

              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--vp-text-muted)' }}
              >
                <Calendar className="w-3 h-3" />
                {format(parseISO(scheme.validFrom), 'MMM d')} –{' '}
                {format(parseISO(scheme.validTo), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Right — edit button (OWNER only) */}
        {isOwner && (
          <button
            onClick={onEdit}
            className="p-2 rounded-lg transition-colors shrink-0"
            style={{ color: 'var(--vp-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
