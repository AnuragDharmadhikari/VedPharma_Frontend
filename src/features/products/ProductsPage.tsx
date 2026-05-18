import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Pill,
  Search,
  Plus,
  Loader2,
  IndianRupee,
  FlaskConical,
  ChevronRight,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetAllProductsQuery,
  useGetAllProductsIncludingInactiveQuery,
  useCreateProductMutation,
} from './productsApi'
import type { ProductDto } from '@/types/product'

// ── GST rate config ───────────────────────────────────────────
const gstConfig = {
  GST_5: { label: '5% GST', color: 'var(--vp-teal)', bg: 'var(--vp-teal-light)' },
  GST_12: { label: '12% GST', color: 'var(--vp-amber)', bg: 'var(--vp-amber-light)' },
  GST_18: { label: '18% GST', color: 'var(--vp-rose)', bg: 'var(--vp-rose-light)' },
}

// ── GstBadge ──────────────────────────────────────────────────
function GstBadge({ rate }: { rate: string }) {
  const config = gstConfig[rate as keyof typeof gstConfig]
  if (!config) return null
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}

// ── Zod schema ────────────────────────────────────────────────
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  molecule: z.string().min(1, 'Molecule is required'),
  category: z.string().min(1, 'Category is required'),
  hsnCode: z.string().min(1, 'HSN code is required'),
  gstRate: z.enum(['GST_5', 'GST_12', 'GST_18']),
  mrp: z.number().min(0.01, 'MRP must be greater than 0'),
  dealerPrice: z.number().min(0.01, 'Dealer price must be greater than 0'),
})

type CreateProductForm = z.infer<typeof createProductSchema>

// ── CreateProductModal ────────────────────────────────────────
interface CreateProductModalProps {
  open: boolean
  onClose: () => void
}

function CreateProductModal({ open, onClose }: CreateProductModalProps) {
  const [createProduct, { isLoading }] = useCreateProductMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { gstRate: 'GST_12' },
  })

  const onSubmit = async (data: CreateProductForm) => {
    try {
      await createProduct(data).unwrap()
      toast.success('Product created successfully')
      reset()
      onClose()
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to create product')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--vp-text-primary)' }}>Add New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Product Name *
            </label>
            <input {...register('name')} className="input-dark" placeholder="Calpol 500mg" />
            {errors.name && <p className="text-xs mt-1 text-rose-500">{errors.name.message}</p>}
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: 'var(--vp-text-secondary)' }}
            >
              Molecule / Composition *
            </label>
            <input
              {...register('molecule')}
              className="input-dark"
              placeholder="Paracetamol 500mg"
            />
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
              <input {...register('category')} className="input-dark" placeholder="Analgesic" />
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
              <input {...register('hsnCode')} className="input-dark" placeholder="3004" />
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
                placeholder="100.00"
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
                placeholder="80.00"
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
              {isLoading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProductsPage() {
  const navigate = useNavigate()
  const { isOwnerOrManager } = useAuth()

  const [showCreate, setShowCreate] = useState(false)
const [search, setSearch] = useState('')
const [gstFilter, setGstFilter] = useState<'ALL' | 'GST_5' | 'GST_12' | 'GST_18'>('ALL')
const [showInactive, setShowInactive] = useState(false)

  const { data: activeData, isLoading: activeLoading } = useGetAllProductsQuery()

const { data: allData, isLoading: allLoading } = useGetAllProductsIncludingInactiveQuery(undefined, {
  skip: !isOwnerOrManager || !showInactive,
})

const isLoading = activeLoading || allLoading
const data = isOwnerOrManager && showInactive ? allData : activeData

  // ── Filter logic — same pattern as DoctorsPage ────────────
  const filtered = useMemo(() => {
    const products = data?.data ?? []
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.molecule.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase()) ||
          p.hsnCode.toLowerCase().includes(search.toLowerCase())
        const matchesGst = gstFilter === 'ALL' || p.gstRate === gstFilter
        return matchesSearch && matchesGst
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data, search, gstFilter])

  // KPI counts
  const products = data?.data ?? []
  const total = products.length
  const active = products.filter((p) => p.isActive).length
  const gst5 = products.filter((p) => p.gstRate === 'GST_5').length
  const gst12 = products.filter((p) => p.gstRate === 'GST_12').length
  const gst18 = products.filter((p) => p.gstRate === 'GST_18').length

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Products
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {total} products in catalogue
          </p>
        </div>
        <div className="flex items-center gap-2">
  {isOwnerOrManager && (
    <button
      onClick={() => setShowInactive(!showInactive)}
      className="btn-secondary flex items-center gap-2 text-sm"
      style={{
        background: showInactive ? 'var(--vp-amber-light)' : undefined,
        color: showInactive ? 'var(--vp-amber)' : undefined,
        border: showInactive ? '1px solid rgba(245,158,11,0.3)' : undefined,
      }}
    >
      {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      {showInactive ? 'Hide Inactive' : 'Show Inactive'}
    </button>
  )}
  {isOwnerOrManager && (
    <button
      onClick={() => setShowCreate(true)}
      className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto"
    >
      <Plus className="w-4 h-4" /> Add Product
    </button>
  )}
</div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Products',
            value: total,
            color: 'var(--vp-teal)',
            icon: <Pill className="w-5 h-5" />,
          },
          {
            label: 'Active',
            value: active,
            color: 'var(--vp-purple)',
            icon: <FlaskConical className="w-5 h-5" />,
          },
          {
            label: '5% GST',
            value: gst5,
            color: 'var(--vp-teal)',
            icon: <Pill className="w-5 h-5" />,
          },
          {
            label: '12% GST',
            value: gst12,
            color: 'var(--vp-amber)',
            icon: <Pill className="w-5 h-5" />,
          },
          {
            label: '18% GST',
            value: gst18,
            color: 'var(--vp-rose)',
            icon: <Pill className="w-5 h-5" />,
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

      {/* ── Filters — no vp-card wrapper, same as DoctorsPage ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--vp-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name, molecule, category, HSN..."
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

        {/* GST filter buttons — same pill pattern as DoctorsPage tier buttons */}
        <div className="flex gap-2">
          {(['ALL', 'GST_5', 'GST_12', 'GST_18'] as const).map((rate) => {
            const labels = { ALL: 'All GST', GST_5: '5%', GST_12: '12%', GST_18: '18%' }
            const colors = {
              ALL: 'var(--vp-teal)',
              GST_5: 'var(--vp-teal)',
              GST_12: 'var(--vp-amber)',
              GST_18: 'var(--vp-rose)',
            }
            const active = gstFilter === rate
            return (
              <button
                key={rate}
                onClick={() => setGstFilter(rate)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: active ? colors[rate] : 'var(--vp-bg-surface)',
                  color: active ? '#FFFFFF' : 'var(--vp-text-secondary)',
                  border: `1px solid ${active ? colors[rate] : 'var(--vp-border)'}`,
                  boxShadow: active ? 'var(--vp-shadow-sm)' : 'none',
                }}
              >
                {labels[rate]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      {(search || gstFilter !== 'ALL') && (
        <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
          Showing <strong style={{ color: 'var(--vp-text-primary)' }}>{filtered.length}</strong>{' '}
          result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── Products List ── */}
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
              <Pill className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
              {search || gstFilter !== 'ALL' ? 'No products match your filters' : 'No products yet'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
              {search || gstFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Add your first product to the catalogue'}
            </p>
            {!search && gstFilter === 'ALL' && isOwnerOrManager && (
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
            {filtered.map((product: ProductDto) => (
              <div
                key={product.id}
                onClick={() => navigate(`/products/${product.id}`)}
                className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--vp-teal-light)' }}
                >
                  <Pill className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {product.name}
                    </p>
                    <GstBadge rate={product.gstRate} />
                    {!product.isActive && <span className="badge-crimson">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <FlaskConical className="w-3 h-3" />
                      {product.molecule}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      {product.category}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      HSN: {product.hsnCode}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <div className="flex items-center gap-1 justify-end">
                    <IndianRupee className="w-3 h-3" style={{ color: 'var(--vp-text-primary)' }} />
                    <p className="text-sm font-bold" style={{ color: 'var(--vp-text-primary)' }}>
                      {Number(product.mrp).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                    MRP
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

      {/* ── Create Modal ── */}
      <CreateProductModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
