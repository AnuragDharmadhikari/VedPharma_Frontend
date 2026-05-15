import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ShoppingCart,
  Plus,
  Search,
  X,
  ChevronRight,
  Package,
  Truck,
  User,
  Calendar,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGetAllOrdersQuery, useGetOrdersByRepQuery } from './ordersApi'
import type { OrderDto } from '@/types/order'

// ── Status config ─────────────────────────────────────────────
const statusConfig = {
  PENDING: {
    label: 'Pending',
    color: 'var(--vp-amber)',
    bg: 'var(--vp-amber-light)',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'var(--vp-teal)',
    bg: 'var(--vp-teal-light)',
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: 'var(--vp-purple)',
    bg: 'var(--vp-purple-light)',
  },
}

// ── Fulfillment config ────────────────────────────────────────
const fulfillmentConfig = {
  DIRECT: {
    label: 'Direct',
    color: 'var(--vp-teal)',
    icon: <Package className="w-3 h-3" />,
  },
  VIA_STOCKIST: {
    label: 'Via Stockist',
    color: 'var(--vp-purple)',
    icon: <Truck className="w-3 h-3" />,
  },
}

// ── StatusBadge ───────────────────────────────────────────────
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

// ── FulfillmentBadge ──────────────────────────────────────────
function FulfillmentBadge({ type }: { type: string }) {
  const config = fulfillmentConfig[type as keyof typeof fulfillmentConfig]
  if (!config) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: config.color }}
    >
      {config.icon} {config.label}
    </span>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function OrdersPage() {
  const navigate = useNavigate()
  const { user, isOwnerOrManager, isOwner, isRep } = useAuth()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'DISPATCHED'>(
    'ALL'
  )

  // Owner/Manager see all orders, REP sees own orders only
  const { data: allOrdersData, isLoading: allLoading } = useGetAllOrdersQuery(undefined, {
    skip: !isOwnerOrManager,
  })

  const { data: repOrdersData, isLoading: repLoading } = useGetOrdersByRepQuery(user?.id ?? '', {
    skip: isOwnerOrManager || !user?.id,
  })

  const isLoading = allLoading || repLoading

  // ── Filter logic ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const orders = isOwnerOrManager ? (allOrdersData?.data ?? []) : (repOrdersData?.data ?? [])

    return orders
      .filter((o) => {
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
        const matchesSearch =
          o.chemistFirmName.toLowerCase().includes(search.toLowerCase()) ||
          o.repName.toLowerCase().includes(search.toLowerCase()) ||
          (o.stockistFirmName?.toLowerCase().includes(search.toLowerCase()) ?? false)
        return matchesStatus && matchesSearch
      })
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
  }, [allOrdersData, repOrdersData, isOwnerOrManager, search, statusFilter])

  // KPI counts
  const orders = isOwnerOrManager ? (allOrdersData?.data ?? []) : (repOrdersData?.data ?? [])
  const total = orders.length
  const pending = orders.filter((o) => o.status === 'PENDING').length
  const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length
  const dispatched = orders.filter((o) => o.status === 'DISPATCHED').length

  // Only OWNER and REP can create orders — not MANAGER
  const canCreate = isOwner || isRep

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Orders
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {isOwnerOrManager ? 'All orders across your team' : 'Your orders'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/orders/new')}
            className="btn-primary flex items-center gap-2 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Orders',
            value: total,
            color: 'var(--vp-teal)',
            icon: <ShoppingCart className="w-5 h-5" />,
          },
          {
            label: 'Pending',
            value: pending,
            color: 'var(--vp-amber)',
            icon: <ShoppingCart className="w-5 h-5" />,
          },
          {
            label: 'Confirmed',
            value: confirmed,
            color: 'var(--vp-teal)',
            icon: <Package className="w-5 h-5" />,
          },
          {
            label: 'Dispatched',
            value: dispatched,
            color: 'var(--vp-purple)',
            icon: <Truck className="w-5 h-5" />,
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
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--vp-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by chemist, rep, or stockist..."
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

        {/* Status filter pills */}
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'CONFIRMED', 'DISPATCHED'] as const).map((s) => {
            const labels = {
              ALL: 'All',
              PENDING: 'Pending',
              CONFIRMED: 'Confirmed',
              DISPATCHED: 'Dispatched',
            }
            const colors = {
              ALL: 'var(--vp-teal)',
              PENDING: 'var(--vp-amber)',
              CONFIRMED: 'var(--vp-teal)',
              DISPATCHED: 'var(--vp-purple)',
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

      {/* ── Orders List ── */}
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
              <ShoppingCart className="w-8 h-8" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
              {search || statusFilter !== 'ALL' ? 'No orders match your filters' : 'No orders yet'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--vp-text-muted)' }}>
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Create your first order to get started'}
            </p>
            {!search && statusFilter === 'ALL' && canCreate && (
              <button onClick={() => navigate('/orders/new')} className="btn-primary text-sm">
                Create First Order
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--vp-border)' }}>
            {filtered.map((order: OrderDto) => (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
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
                      statusConfig[order.status as keyof typeof statusConfig]?.bg ??
                      'var(--vp-bg-hover)',
                    color:
                      statusConfig[order.status as keyof typeof statusConfig]?.color ??
                      'var(--vp-text-muted)',
                  }}
                >
                  <ShoppingCart className="w-5 h-5" />
                </div>

                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {order.chemistFirmName}
                    </p>
                    <StatusBadge status={order.status} />
                    <FulfillmentBadge type={order.fulfillmentType} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(order.orderDate), 'MMM d, yyyy')}
                    </span>
                    {isOwnerOrManager && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        <User className="w-3 h-3" />
                        {order.repName}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-bold" style={{ color: 'var(--vp-text-primary)' }}>
                    ₹{Number(order.totalAmount).toFixed(2)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                    Total
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
