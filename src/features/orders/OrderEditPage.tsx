import { useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ShoppingCart,
  Package,
  IndianRupee,
  Info,
  Tag,
  Gift,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetOrderByIdQuery, useUpdateOrderMutation } from './ordersApi'
import { useGetAllProductsQuery } from '@/features/products/productsApi'
import {
  useGetSchemesByChemistQuery,
  useGetSchemesByStockistQuery,
} from '@/features/schemes/schemesApi'
import type { SchemeDto } from '@/types/scheme'

// ── Zod schema ────────────────────────────────────────────────
const orderItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.number().min(1, 'Minimum quantity is 1'),
  discountPct: z.number().min(0).max(100).optional(),
})

const orderEditSchema = z.object({
  orderItems: z.array(orderItemSchema).min(1, 'Add at least one product'),
})

type OrderEditForm = z.infer<typeof orderEditSchema>

// ── SchemeBadge ───────────────────────────────────────────────
function SchemeBadge({ scheme }: { scheme: SchemeDto }) {
  const isQtyFree = scheme.schemeType === 'QUANTITY_FREE'
  return (
    <div
      className="flex items-start gap-2 p-2.5 rounded-lg"
      style={{
        background: isQtyFree ? 'var(--vp-teal-light)' : 'var(--vp-purple-light)',
        border: `1px solid ${isQtyFree ? 'rgba(0,196,154,0.2)' : 'rgba(124,58,237,0.2)'}`,
      }}
    >
      <div className="shrink-0 mt-0.5">
        {isQtyFree ? (
          <Gift className="w-3.5 h-3.5" style={{ color: 'var(--vp-teal)' }} />
        ) : (
          <Tag className="w-3.5 h-3.5" style={{ color: 'var(--vp-purple)' }} />
        )}
      </div>
      <div>
        <p
          className="text-xs font-semibold"
          style={{ color: isQtyFree ? 'var(--vp-teal)' : 'var(--vp-purple)' }}
        >
          {scheme.productName}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-secondary)' }}>
          {isQtyFree
            ? `Buy ${scheme.minQuantity}+ → get ${scheme.freeQuantity} free`
            : `Buy ${scheme.minQuantity}+ → ${scheme.discountPct}% extra discount`}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
          Valid until {format(parseISO(scheme.validTo), 'MMM d, yyyy')}
        </p>
      </div>
    </div>
  )
}

// ── OrderItemRow ──────────────────────────────────────────────
interface OrderItemRowProps {
  index: number
  onRemove: () => void
  register: ReturnType<typeof useForm<OrderEditForm>>['register']
  setValue: ReturnType<typeof useForm<OrderEditForm>>['setValue']
  control: ReturnType<typeof useForm<OrderEditForm>>['control']
  schemes: SchemeDto[]
}

function OrderItemRow({
  index,
  onRemove,
  register,
  setValue,
  control,
  schemes,
}: OrderItemRowProps) {
  const { data: productsData } = useGetAllProductsQuery()
  const products = productsData?.data ?? []

  const productId = useWatch({ control, name: `orderItems.${index}.productId` })
  const quantity = useWatch({ control, name: `orderItems.${index}.quantity` })
  const discountPct = useWatch({ control, name: `orderItems.${index}.discountPct` })

  const selectedProduct = products.find((p) => p.id === productId)

  const applicableScheme = useMemo(() => {
    if (!selectedProduct || !quantity) return null
    return (
      schemes.find(
        (s) => s.productId === selectedProduct.id && Number(quantity) >= s.minQuantity
      ) ?? null
    )
  }, [selectedProduct, quantity, schemes])

  const calculation = useMemo(() => {
    if (!selectedProduct || !quantity) {
      return { unitPrice: 0, lineTotal: 0, schemeDiscountPct: 0, freeQuantity: 0 }
    }
    const unitPrice = Number(selectedProduct.dealerPrice)
    const qty = Number(quantity) || 0
    const disc = Number(discountPct) || 0
    let schemeDiscountPct = 0
    let freeQuantity = 0
    if (applicableScheme) {
      if (applicableScheme.schemeType === 'PERCENTAGE_DISCOUNT') {
        schemeDiscountPct = Number(applicableScheme.discountPct) || 0
      } else if (applicableScheme.schemeType === 'QUANTITY_FREE') {
        freeQuantity = applicableScheme.freeQuantity ?? 0
      }
    }
    const totalDisc = disc + schemeDiscountPct
    const lineTotal = unitPrice * qty * (1 - totalDisc / 100)
    return { unitPrice, lineTotal, schemeDiscountPct, freeQuantity }
  }, [selectedProduct, quantity, discountPct, applicableScheme])

  return (
    <div
      className="p-4 rounded-xl space-y-3"
      style={{ background: 'var(--vp-bg-surface-alt)', border: '1px solid var(--vp-border)' }}
    >
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
          onChange={(e) => setValue(`orderItems.${index}.productId`, e.target.value)}
        >
          <option value="">Select a product</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ₹{Number(p.dealerPrice).toFixed(2)} dealer price
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
            Manual Discount %
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
      </div>

      {/* Calculation breakdown */}
      {selectedProduct && Number(quantity) > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--vp-border)' }}
        >
          <div
            className="px-3 py-2 flex items-center gap-1.5"
            style={{ background: 'var(--vp-bg-hover)' }}
          >
            <Info className="w-3.5 h-3.5" style={{ color: 'var(--vp-text-muted)' }} />
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--vp-text-muted)' }}
            >
              Calculation Breakdown
            </p>
          </div>
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--vp-text-muted)' }}>Unit Price (dealer)</span>
              <span style={{ color: 'var(--vp-text-secondary)' }}>
                ₹{calculation.unitPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--vp-text-muted)' }}>Quantity</span>
              <span style={{ color: 'var(--vp-text-secondary)' }}>× {Number(quantity)}</span>
            </div>
            <div
              className="flex items-center justify-between text-xs pt-1.5"
              style={{ borderTop: '1px dashed var(--vp-border)' }}
            >
              <span style={{ color: 'var(--vp-text-muted)' }}>Subtotal</span>
              <span style={{ color: 'var(--vp-text-secondary)' }}>
                ₹{(calculation.unitPrice * Number(quantity)).toFixed(2)}
              </span>
            </div>
            {Number(discountPct) > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--vp-rose)' }}>
                  Manual Discount ({Number(discountPct)}%)
                </span>
                <span style={{ color: 'var(--vp-rose)' }}>
                  −₹
                  {((calculation.unitPrice * Number(quantity) * Number(discountPct)) / 100).toFixed(
                    2
                  )}
                </span>
              </div>
            )}
            {applicableScheme?.schemeType === 'PERCENTAGE_DISCOUNT' && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--vp-purple)' }}>
                  Scheme Discount ({Number(applicableScheme.discountPct)}%) 🎯
                </span>
                <span style={{ color: 'var(--vp-purple)' }}>
                  −₹
                  {(
                    (calculation.unitPrice * Number(quantity) * calculation.schemeDiscountPct) /
                    100
                  ).toFixed(2)}
                </span>
              </div>
            )}
            {applicableScheme?.schemeType === 'QUANTITY_FREE' && (
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--vp-teal)' }}>Free Units (scheme) 🎁</span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                >
                  +{calculation.freeQuantity} free
                </span>
              </div>
            )}
            {(() => {
              const potential = schemes.find((s) => s.productId === selectedProduct.id)
              if (potential && !applicableScheme && Number(quantity) < potential.minQuantity) {
                return (
                  <div
                    className="flex items-center gap-1.5 text-xs p-2 rounded-lg mt-1"
                    style={{ background: 'var(--vp-amber-light)', color: 'var(--vp-amber)' }}
                  >
                    <Info className="w-3 h-3 shrink-0" />
                    Order {potential.minQuantity - Number(quantity)} more to unlock scheme
                  </div>
                )
              }
              return null
            })()}
            <div
              className="flex items-center justify-between pt-1.5 mt-1"
              style={{ borderTop: '1px solid var(--vp-border)' }}
            >
              <span className="text-xs font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Line Total
              </span>
              <div className="flex items-center gap-0.5">
                <IndianRupee className="w-3 h-3" style={{ color: 'var(--vp-text-primary)' }} />
                <span
                  className="text-sm font-bold"
                  style={{ color: 'var(--vp-text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {calculation.lineTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function OrderEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [updateOrder, { isLoading }] = useUpdateOrderMutation()

  const { data: orderData, isLoading: orderLoading } = useGetOrderByIdQuery(id ?? '', { skip: !id })
  const order = orderData?.data

  const { data: productsData } = useGetAllProductsQuery()
  const products = useMemo(() => productsData?.data ?? [], [productsData])

  // Fetch schemes for the order's buyer
  const { data: chemistSchemesData } = useGetSchemesByChemistQuery(
    order?.chemistId?.toString() ?? '',
    { skip: !order || order.fulfillmentType === 'VIA_STOCKIST' }
  )
  const { data: stockistSchemesData } = useGetSchemesByStockistQuery(
    order?.stockistId?.toString() ?? '',
    { skip: !order || order.fulfillmentType === 'DIRECT' || !order.stockistId }
  )
  const activeSchemes: SchemeDto[] = useMemo(() => {
    if (order?.fulfillmentType === 'VIA_STOCKIST') return stockistSchemesData?.data ?? []
    return chemistSchemesData?.data ?? []
  }, [order, chemistSchemesData, stockistSchemesData])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OrderEditForm>({
    resolver: zodResolver(orderEditSchema),
    // Pre-populate with existing order items
    // We need to find the productId from the product name since OrderItemDto has productId
    defaultValues: {
      orderItems:
        order?.orderItems.map((item) => ({
          productId: item.productId.toString(),
          quantity: item.quantity,
          discountPct: Number(item.discountPct) || 0,
        })) ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'orderItems' })

  // Reset form with order data once it loads
  useEffect(() => {
    if (order) {
      reset({
        orderItems: order.orderItems.map((item) => ({
          productId: item.productId.toString(),
          quantity: item.quantity,
          discountPct: Number(item.discountPct) || 0,
        })),
      })
    }
  }, [order, reset])

  const watchedItems = useWatch({ control, name: 'orderItems' })

  const orderTotal = useMemo(() => {
    return (watchedItems ?? []).reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product || !item.quantity) return sum
      const unitPrice = Number(product.dealerPrice)
      const qty = Number(item.quantity) || 0
      const disc = Number(item.discountPct) || 0
      // No scheme discount on edit — schemes don't re-apply on update
      return sum + unitPrice * qty * (1 - disc / 100)
    }, 0)
  }, [watchedItems, products])

  const onSubmit = async (data: OrderEditForm) => {
    if (!id) return
    try {
      await updateOrder({
        id,
        body: {
          orderItems: data.orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            // Send discountPct only if non-zero — backend defaults to 0 if absent
            // Do NOT cast — just pass the number directly, Axios serializes it correctly
            ...(item.discountPct && item.discountPct > 0 ? { discountPct: item.discountPct } : {}),
          })),
        },
      }).unwrap()
      toast.success('Order updated successfully')
      navigate(`/orders/${id}`)
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Failed to update order')
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (orderLoading) {
    return (
      <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <Skeleton className="h-64 w-full skeleton-shimmer" />
      </div>
    )
  }

  // ── Not found / not pending ───────────────────────────────
  if (!order || order.status !== 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--vp-rose-light)' }}
        >
          <ShoppingCart className="w-8 h-8" style={{ color: 'var(--vp-rose)' }} />
        </div>
        <p className="text-lg font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
          {!order ? 'Order not found' : 'Order cannot be edited'}
        </p>
        <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
          {!order ? 'Invalid link.' : 'Only PENDING orders can be edited.'}
        </p>
        <button onClick={() => navigate('/orders')} className="btn-primary">
          Back to Orders
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/orders/${id}`)}
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
            Edit Order
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {order.chemistFirmName} • {format(parseISO(order.orderDate), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* ── Order Info (read-only) ── */}
      <div
        className="p-4 rounded-xl flex items-center gap-3"
        style={{ background: 'var(--vp-amber-light)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--vp-amber)' }} />
        <p className="text-sm" style={{ color: 'var(--vp-amber)' }}>
          You can only edit order items. Chemist, fulfillment type, and date cannot be changed.
        </p>
      </div>

      {/* ── Active Schemes ── */}
      {activeSchemes.length > 0 && (
        <div className="vp-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--vp-amber-light)' }}
            >
              <Tag className="w-5 h-5" style={{ color: 'var(--vp-amber)' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
                Active Schemes
              </h2>
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                Auto-apply when minimum quantity is met
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeSchemes.map((scheme) => (
              <SchemeBadge key={scheme.id} scheme={scheme} />
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Order Items ── */}
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
                  Add, remove, or update quantities
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

          <div className="space-y-4">
            {fields.map((field, index) => (
              <OrderItemRow
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
                register={register}
                setValue={setValue}
                control={control}
                schemes={[]}
              />
            ))}
          </div>

          {/* Scheme warning */}
          <div
            className="mt-4 p-3 rounded-xl flex items-start gap-2"
            style={{
              background: 'var(--vp-amber-light)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--vp-amber)' }} />
            <div className="text-xs" style={{ color: 'var(--vp-amber)' }}>
              <strong>Note:</strong> Saving changes removes all scheme discounts and free units.
              Scheme pricing only applies on new orders.{' '}
              <button
                type="button"
                onClick={() => navigate('/orders/new')}
                className="underline font-semibold"
                style={{ color: 'var(--vp-amber)' }}
              >
                Create a new order instead →
              </button>
            </div>
          </div>

          {/* Total */}
          {fields.length > 0 && (
            <div
              className="flex items-center justify-between mt-5 pt-4"
              style={{ borderTop: '1px solid var(--vp-border)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-secondary)' }}>
                Estimated Order Total
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
            onClick={() => navigate(`/orders/${id}`)}
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
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
