import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  Pill,
  FlaskConical,
  Tag,
  IndianRupee,
  Edit2,
  UserX,
  UserCheck,
  Loader2,
  Package,
  AlertTriangle,
  CheckCircle2,
  Hash,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetProductByIdQuery,
  useUpdateProductMutation,
  useDeactivateProductMutation,
} from './productsApi'
import { useGetBatchesByProductQuery } from '@/features/inventory/inventoryApi'
import type { UpdateProductRequest } from '@/types/product'

// ── GST config ────────────────────────────────────────────────
const gstConfig = {
  GST_5: { label: '5% GST', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
  GST_12: { label: '12% GST', color: 'var(--vp-amber)', bg: 'var(--vp-amber-light)' },
  GST_18: { label: '18% GST', color: 'var(--vp-rose)', bg: 'var(--vp-rose-light)' },
}

function GstBadge({ rate }: { rate: string }) {
  const config = gstConfig[rate as keyof typeof gstConfig]
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

// ── Zod schema for edit product ───────────────────────────────
const editProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  molecule: z.string().min(1, 'Molecule is required'),
  category: z.string().min(1, 'Category is required'),
  hsnCode: z.string().min(1, 'HSN code is required'),
  gstRate: z.enum(['GST_5', 'GST_12', 'GST_18']),
  mrp: z.number().min(0.01, 'MRP must be greater than 0'),
  dealerPrice: z.number().min(0.01, 'Dealer price must be greater than 0'),
  isActive: z.boolean().optional(),
})

type EditProductForm = z.infer<typeof editProductSchema>

// ── EditProductModal ──────────────────────────────────────────
interface EditProductModalProps {
  open: boolean
  onClose: () => void
  productId: string
  defaultValues: EditProductForm
}

function EditProductModal({ open, onClose, productId, defaultValues }: EditProductModalProps) {
  const [updateProduct, { isLoading }] = useUpdateProductMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditProductForm>({
    resolver: zodResolver(editProductSchema),
    defaultValues,
  })

  const onSubmit = async (data: EditProductForm) => {
    try {
      const body: UpdateProductRequest = {
        name: data.name,
        molecule: data.molecule,
        category: data.category,
        hsnCode: data.hsnCode,
        gstRate: data.gstRate,
        mrp: data.mrp,
        dealerPrice: data.dealerPrice,
      }
      await updateProduct({ id: productId, body }).unwrap()
      toast.success('Product updated successfully')
      onClose()
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update product')
    }
  }

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Product Name *
            </label>
            <input {...register('name')} className="input-dark" />
            {errors.name && <p className="text-xs mt-1 text-rose-500">{errors.name.message}</p>}
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Molecule / Composition *
            </label>
            <input {...register('molecule')} className="input-dark" />
            {errors.molecule && (
              <p className="text-xs mt-1 text-rose-500">{errors.molecule.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Category *
              </label>
              <input {...register('category')} className="input-dark" />
              {errors.category && (
                <p className="text-xs mt-1 text-rose-500">{errors.category.message}</p>
              )}
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                HSN Code *
              </label>
              <input {...register('hsnCode')} className="input-dark" />
              {errors.hsnCode && (
                <p className="text-xs mt-1 text-rose-500">{errors.hsnCode.message}</p>
              )}
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              GST Rate *
            </label>
            <select
              {...register('gstRate')}
              className="input-dark"
              style={{ background: 'var(--vp-bg-surface)' }}
            >
              <option value="GST_5">5% GST — Basic medicines</option>
              <option value="GST_12">12% GST — Most pharma products</option>
              <option value="GST_18">18% GST — Medical devices</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                MRP (₹) *
              </label>
              <input
                {...register('mrp', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className="input-dark"
              />
              {errors.mrp && <p className="text-xs mt-1 text-rose-500">{errors.mrp.message}</p>}
            </div>
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Dealer Price (₹) *
              </label>
              <input
                {...register('dealerPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className="input-dark"
              />
              {errors.dealerPrice && (
                <p className="text-xs mt-1 text-rose-500">{errors.dealerPrice.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
// ── Main Page ─────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isOwnerOrManager } = useAuth()

  const [showEdit, setShowEdit] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [showReactivate, setShowReactivate] = useState(false)

  const {
    data: productData,
    isLoading: productLoading,
    isError,
  } = useGetProductByIdQuery(id ?? '', { skip: !id })

  const { data: batchesData, isLoading: batchesLoading } = useGetBatchesByProductQuery(id ?? '', {
    skip: !id,
  })

  const [deactivateProduct, { isLoading: deactivating }] = useDeactivateProductMutation()
  const [updateProduct] = useUpdateProductMutation()

  const product = productData?.data
  const batches = batchesData?.data ?? []

  // ── Deactivate handler ────────────────────────────────────
  const onDeactivate = async () => {
    if (!id) return
    try {
      await deactivateProduct(id).unwrap()
      toast.success('Product deactivated successfully')
      setShowDeactivate(false)
      navigate('/products')
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to deactivate product')
    }
  }

  // ── Reactivate handler ────────────────────────────────────
  const onReactivate = async () => {
    if (!id || !product) return
    try {
      await updateProduct({
        id,
        body: {
          name: product.name,
          molecule: product.molecule,
          category: product.category,
          hsnCode: product.hsnCode,
          gstRate: product.gstRate,
          mrp: Number(product.mrp),
          dealerPrice: Number(product.dealerPrice),
          isActive: true,
        },
      }).unwrap()
      toast.success('Product reactivated successfully')
      setShowReactivate(false)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to reactivate product')
    }
  }

  // ── Loading state ─────────────────────────────────────────
  if (productLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full skeleton-shimmer" />
          </div>
          <Skeleton className="h-64 w-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────
  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <Pill className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          Product not found
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
          This product may have been removed or the link is invalid.
        </p>
        <button onClick={() => navigate('/products')} className="btn-primary">
          Back to Products
        </button>
      </div>
    )
  }

  const editDefaultValues: EditProductForm = {
    name: product.name,
    molecule: product.molecule,
    category: product.category,
    hsnCode: product.hsnCode,
    gstRate: product.gstRate,
    mrp: Number(product.mrp),
    dealerPrice: Number(product.dealerPrice),
  }

  const gstCfg = gstConfig[product.gstRate as keyof typeof gstConfig]

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
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
                {product.name}
              </h1>
              <GstBadge rate={product.gstRate} />
              {product.isActive ? (
                <span className="badge-teal">Active</span>
              ) : (
                <span className="badge-crimson">Inactive</span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              {product.molecule} • {product.category}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isOwnerOrManager && (
            <button
              onClick={() => setShowEdit(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
          {isOwnerOrManager &&
            (product.isActive ? (
              <button
                onClick={() => setShowDeactivate(true)}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all"
                style={{
                  background: 'var(--vp-rose-light)',
                  color: 'var(--vp-rose)',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <UserX className="w-4 h-4" /> Deactivate
              </button>
            ) : (
              <button
                onClick={() => setShowReactivate(true)}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all"
                style={{
                  background: 'var(--vp-teal-light)',
                  color: 'var(--vp-teal)',
                  border: '1px solid rgba(0,196,154,0.2)',
                }}
              >
                <UserCheck className="w-4 h-4" /> Reactivate
              </button>
            ))}
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left — Product Info ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: gstCfg?.bg ?? 'var(--vp-teal-light)' }}
              >
                <Pill className="w-5 h-5" style={{ color: gstCfg?.color ?? 'var(--vp-teal)' }} />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Product Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <FlaskConical className="w-4 h-4" />,
                  label: 'Molecule',
                  value: product.molecule,
                },
                { icon: <Tag className="w-4 h-4" />, label: 'Category', value: product.category },
                { icon: <Hash className="w-4 h-4" />, label: 'HSN Code', value: product.hsnCode },
                {
                  icon: <Tag className="w-4 h-4" />,
                  label: 'GST Rate',
                  value: `${product.gstRateValue}%`,
                },
              ].map((item) => (
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
                    style={{ background: 'var(--vp-teal-dim)', color: 'var(--vp-teal)' }}
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

            {/* Pricing row */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { label: 'MRP', value: Number(product.mrp), note: 'Retail price' },
                { label: 'Dealer Price', value: Number(product.dealerPrice), note: 'Trade price' },
              ].map((price) => (
                <div
                  key={price.label}
                  className="p-4 rounded-xl text-center"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    {price.label}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <IndianRupee className="w-4 h-4" style={{ color: 'var(--vp-text-primary)' }} />
                    <p
                      className="text-2xl font-bold"
                      style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
                    >
                      {price.value.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
                    {price.note}
                  </p>
                </div>
              ))}
            </div>

            {/* Timestamps */}
            <div
              className="flex items-center gap-4 mt-4 pt-4 text-xs"
              style={{ borderTop: '1px solid var(--vp-border)', color: 'var(--vp-text-muted)' }}
            >
              <span>Created: {format(parseISO(product.createdAt), 'MMM d, yyyy')}</span>
              <span>•</span>
              <span>Updated: {format(parseISO(product.updatedAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* ── Right — Batch Inventory ── */}
        <div>
          <div className="vp-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-purple-light)' }}
              >
                <Package className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Batch Inventory
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  {batches.length} batch{batches.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>

            {batchesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 skeleton-shimmer" />
                ))}
              </div>
            ) : batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="w-8 h-8 mb-2" style={{ color: 'var(--vp-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--vp-text-secondary)' }}>
                  No batches added yet
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Add stock via Inventory page
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-3 rounded-xl"
                    style={{
                      background: batch.isNearExpiry
                        ? 'var(--vp-amber-light)'
                        : batch.isExpired
                          ? 'var(--vp-rose-light)'
                          : 'var(--vp-bg-surface-alt)',
                      border: `1px solid ${
                        batch.isNearExpiry
                          ? 'rgba(245,158,11,0.3)'
                          : batch.isExpired
                            ? 'rgba(244,63,94,0.3)'
                            : 'var(--vp-border)'
                      }`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--vp-text-primary)' }}
                      >
                        {batch.batchNumber}
                      </p>
                      {batch.isExpired ? (
                        <span className="badge-crimson">Expired</span>
                      ) : batch.isNearExpiry ? (
                        <span className="badge-amber flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Near Expiry
                        </span>
                      ) : (
                        <span className="badge-teal flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Good
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center justify-between text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <span>Exp: {format(parseISO(batch.expiryDate), 'MMM yyyy')}</span>
                      <span className="font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                        {batch.currentQuantity} units
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {product && (
        <EditProductModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          productId={id!}
          defaultValues={editDefaultValues}
        />
      )}

      {/* ── Deactivate Confirmation ── */}
      <Dialog open={showDeactivate} onOpenChange={() => setShowDeactivate(false)}>
        <DialogContent
          className="max-w-sm"
          style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>
              Deactivate Product
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to deactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{product.name}</strong>? It will no
            longer appear in active product lists or be selectable for visits and orders.
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
              Reactivate Product
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--vp-text-secondary)' }}>
            Are you sure you want to reactivate{' '}
            <strong style={{ color: 'var(--vp-text-primary)' }}>{product?.name}</strong>? It will
            appear in active product lists and be selectable for visits and orders.
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
