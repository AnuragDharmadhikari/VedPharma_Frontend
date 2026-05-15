import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ShoppingCart,
  Package,
  Truck,
  IndianRupee,
} from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import { useCreateOrderMutation } from './ordersApi'
import { useGetAllProductsQuery } from '@/features/products/productsApi'
import { useGetAllChemistsQuery, useGetChemistsByRepQuery } from '@/features/chemists/chemistsApi'
import { useGetAllStockistsQuery } from '@/features/stockists/stockistsApi'

// ── Zod schema ────────────────────────────────────────────────
const orderItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.number().min(1, 'Minimum quantity is 1'),
  discountPct: z.number().min(0).max(100).optional(),
})

const orderNewSchema = z
  .object({
    chemistId: z.string().min(1, 'Please select a chemist'),
    fulfillmentType: z.enum(['DIRECT', 'VIA_STOCKIST']),
    stockistId: z.string().optional(),
    orderDate: z.string().min(1, 'Order date is required'),
    orderItems: z.array(orderItemSchema).min(1, 'Add at least one product'),
  })
  .refine(
    // If VIA_STOCKIST selected, stockistId must be provided
    (data) => {
      if (data.fulfillmentType === 'VIA_STOCKIST') {
        return !!data.stockistId && data.stockistId.length > 0
      }
      return true
    },
    { message: 'Please select a stockist', path: ['stockistId'] }
  )

type OrderNewForm = z.infer<typeof orderNewSchema>

// ── OrderItemRow ──────────────────────────────────────────────
interface OrderItemRowProps {
  index: number
  onRemove: () => void
  register: ReturnType<typeof useForm<OrderNewForm>>['register']
  setValue: ReturnType<typeof useForm<OrderNewForm>>['setValue']
  watchItem: { productId: string; quantity: number; discountPct?: number }
}

function OrderItemRow({ index, onRemove, register, setValue, watchItem }: OrderItemRowProps) {
  const { data: productsData } = useGetAllProductsQuery()
  const products = productsData?.data ?? []

  // Find selected product to show unit price preview
  const selectedProduct = products.find((p) => p.id === watchItem?.productId)

  // Calculate line total preview client-side
  // This matches backend logic: lineTotal = unitPrice * qty * (1 - discountPct/100)
  const lineTotal = useMemo(() => {
    if (!selectedProduct || !watchItem?.quantity) return 0
    const unitPrice = Number(selectedProduct.dealerPrice)
    const qty = Number(watchItem.quantity) || 0
    const disc = Number(watchItem.discountPct) || 0
    return unitPrice * qty * (1 - disc / 100)
  }, [selectedProduct, watchItem])

  return (
    <div
      className="p-4 rounded-xl space-y-3"
      style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
    >
      {/* Row header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
          Item {index + 1}
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--vp-rose)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-rose-light)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Product selector */}
      <div>
        <label
          className="block text-xs font-semibold mb-1"
          style={{ color: 'var(--vp-text-secondary)' }}
        >
          Product *
        </label>
        <select
          {...register(`orderItems.${index}.productId`)}
          className="input-dark text-sm"
          style={{ background: 'var(--vp-bg-surface)' }}
          onChange={(e) => {
            setValue(`orderItems.${index}.productId`, e.target.value)
          }}
        >
          <option value="">Select a product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ₹{Number(p.dealerPrice).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity + Discount + Line Total */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: 'var(--vp-text-secondary)' }}
          >
            Quantity *
          </label>
          <input
            {...register(`orderItems.${index}.quantity`, { valueAsNumber: true })}
            type="number"
            min={1}
            placeholder="1"
            className="input-dark text-sm"
          />
        </div>
        <div>
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: 'var(--vp-text-secondary)' }}
          >
            Discount %
          </label>
          <input
            {...register(`orderItems.${index}.discountPct`, { valueAsNumber: true })}
            type="number"
            min={0}
            max={100}
            placeholder="0"
            className="input-dark text-sm"
          />
        </div>
        <div>
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: 'var(--vp-text-secondary)' }}
          >
            Line Total
          </label>
          <div
            className="input-dark text-sm flex items-center gap-1"
            style={{ background: 'var(--vp-bg-hover)' }}
          >
            <IndianRupee className="w-3 h-3 shrink-0" style={{ color: 'var(--vp-text-muted)' }} />
            <span style={{ color: 'var(--vp-text-primary)' }}>{lineTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
// ── Main Page ─────────────────────────────────────────────────
export default function OrderNewPage() {
  const navigate = useNavigate()
  const { user, isOwnerOrManager } = useAuth()
  const [createOrder, { isLoading }] = useCreateOrderMutation()

  // Fetch chemists — Owner/Manager see all, REP sees own
  const { data: allChemistsData } = useGetAllChemistsQuery(undefined, {
    skip: !isOwnerOrManager,
  })
  const { data: repChemistsData } = useGetChemistsByRepQuery(user?.id ?? '', {
    skip: isOwnerOrManager || !user?.id,
  })
  const chemists = isOwnerOrManager ? (allChemistsData?.data ?? []) : (repChemistsData?.data ?? [])

  // Stockists — only needed for VIA_STOCKIST
  const { data: stockistsData } = useGetAllStockistsQuery()
  const stockists = stockistsData?.data ?? []

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderNewForm>({
    resolver: zodResolver(orderNewSchema),
    defaultValues: {
      fulfillmentType: 'DIRECT',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      orderItems: [{ productId: '', quantity: 1, discountPct: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'orderItems',
  })

  const watchedItems = watch('orderItems')
  const watchFulfillment = watch('fulfillmentType')

  // Calculate order total preview
  const { data: productsData } = useGetAllProductsQuery()
  const products = productsData?.data ?? []

  const orderTotal = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product) return sum
      const unitPrice = Number(product.dealerPrice)
      const qty = Number(item.quantity) || 0
      const disc = Number(item.discountPct) || 0
      return sum + unitPrice * qty * (1 - disc / 100)
    }, 0)
  }, [watchedItems, products])

  const onSubmit = async (data: OrderNewForm) => {
    try {
      await createOrder({
        repId: user?.id ?? '',
        chemistId: data.chemistId,
        stockistId: data.fulfillmentType === 'VIA_STOCKIST' ? data.stockistId : undefined,
        fulfillmentType: data.fulfillmentType,
        orderDate: data.orderDate,
        orderItems: data.orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountPct: item.discountPct
            ? (String(
                item.discountPct
              ) as unknown as import('@/types/order').OrderItemRequest['discountPct'])
            : undefined,
        })),
      }).unwrap()
      toast.success('Order created successfully')
      navigate('/orders')
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to create order')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
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
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            New Order
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            Create a new sales order for a chemist
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Order Info Card ── */}
        <div className="vp-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--vp-teal-light)' }}
            >
              <ShoppingCart className="w-5 h-5" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              Order Details
            </h2>
          </div>

          <div className="space-y-4">
            {/* Chemist selector */}
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

            {/* Fulfillment Type toggle */}
            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Fulfillment Type *
              </label>
              <div className="flex gap-3">
                {(['DIRECT', 'VIA_STOCKIST'] as const).map((type) => {
                  const isSelected = watchFulfillment === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setValue('fulfillmentType', type)
                        if (type === 'DIRECT') setValue('stockistId', '')
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{
                        background: isSelected
                          ? type === 'DIRECT'
                            ? 'var(--vp-teal)'
                            : 'var(--vp-purple)'
                          : 'var(--vp-bg-surface)',
                        color: isSelected ? '#FFFFFF' : 'var(--vp-text-secondary)',
                        border: `1px solid ${
                          isSelected
                            ? type === 'DIRECT'
                              ? 'var(--vp-teal)'
                              : 'var(--vp-purple)'
                            : 'var(--vp-border)'
                        }`,
                      }}
                    >
                      {type === 'DIRECT' ? (
                        <>
                          <Package className="w-4 h-4" /> Direct
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4" /> Via Stockist
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Stockist selector — only when VIA_STOCKIST */}
            {watchFulfillment === 'VIA_STOCKIST' && (
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

            {/* Order Date */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--vp-text-secondary)' }}
              >
                Order Date *
              </label>
              <input {...register('orderDate')} type="date" className="input-dark" />
              {errors.orderDate && (
                <p className="text-xs mt-1 text-rose-500">{errors.orderDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Order Items Card ── */}
        <div className="vp-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--vp-purple-light)' }}
              >
                <Package className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                  Order Items
                </h2>
                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                  At least one item required
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => append({ productId: '', quantity: 1, discountPct: 0 })}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {errors.orderItems?.root && (
            <p className="text-xs mb-3 text-rose-500">{errors.orderItems.root.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <OrderItemRow
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
                register={register}
                setValue={setValue}
                watchItem={watchedItems[index]}
              />
            ))}
          </div>

          {/* Order Total Preview */}
          {fields.length > 0 && (
            <div
              className="flex items-center justify-between mt-4 pt-4"
              style={{ borderTop: '1px solid var(--vp-border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-secondary)' }}>
                Estimated Total
              </p>
              <div className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" style={{ color: 'var(--vp-text-primary)' }} />
                <p
                  className="text-xl font-bold"
                  style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {orderTotal.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Creating order...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
