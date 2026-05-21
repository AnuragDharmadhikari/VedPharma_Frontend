// src/features/analytics/AnalyticsPage.tsx
import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  IndianRupee,
  AlertCircle,
  Users,
  Package,
  Boxes,
  FileText,
  Target,
  Award,
  Zap,
  RotateCcw,
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetRevenueSummaryQuery,
  useGetGstLiabilityQuery,
  useGetOutstandingInvoicesQuery,
  useGetOpenCreditNoteTotalQuery,
  useGetTopStockistsQuery,
  useGetTopChemistsQuery,
  useGetRepPerformanceQuery,
  useGetProductVelocityQuery,
  useGetInventoryValueQuery,
  useGetNearExpiryValueQuery,
  useGetTargetAchievementQuery,
  useGetReturnsSummaryQuery,
  useGetAiUsageSummaryQuery,
} from './analyticsApi'

type Tab =
  | 'overview'
  | 'revenue'
  | 'receivables'
  | 'performers'
  | 'team'
  | 'products'
  | 'inventory'
  | 'returns'
  | 'ai'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

const PIE_COLORS = [
  'var(--vp-teal)',
  'var(--vp-purple)',
  'var(--vp-amber)',
  'var(--vp-rose)',
  '#60a5fa',
  '#34d399',
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="p-3 rounded-xl text-xs shadow-lg"
      style={{ background: 'var(--vp-bg-surface)', border: '1px solid var(--vp-border)' }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--vp-text-primary)' }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value > 1000 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  color,
  bg,
  loading,
  sub,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  bg: string
  loading: boolean
  sub?: string
}) {
  return (
    <div className="vp-card p-5">
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--vp-text-muted)' }}
        >
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24 skeleton-shimmer" />
      ) : (
        <>
          <p className="text-2xl font-bold" style={{ color, fontFamily: 'var(--font-display)' }}>
            {value}
          </p>
          {sub && (
            <p className="text-xs mt-1" style={{ color: 'var(--vp-text-muted)' }}>
              {sub}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 mb-2" style={{ color: 'var(--vp-text-muted)' }}>
        {icon}
      </div>
      <p className="text-sm" style={{ color: 'var(--vp-text-muted)' }}>
        {message}
      </p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { isOwner } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [expandedOutstanding, setExpandedOutstanding] = useState(false)

  const { data: revenueData, isLoading: revenueLoading } = useGetRevenueSummaryQuery()
  const { data: gstData, isLoading: gstLoading } = useGetGstLiabilityQuery(undefined, {
    skip: !isOwner,
  })
  const { data: outstandingData, isLoading: outstandingLoading } = useGetOutstandingInvoicesQuery()
  const { data: creditNoteData, isLoading: cnLoading } = useGetOpenCreditNoteTotalQuery()
  const { data: topStockistsData, isLoading: stockistsLoading } = useGetTopStockistsQuery()
  const { data: topChemistsData, isLoading: chemistsLoading } = useGetTopChemistsQuery()
  const { data: repPerfData, isLoading: repLoading } = useGetRepPerformanceQuery()
  const { data: productVelData, isLoading: productLoading } = useGetProductVelocityQuery()
  const { data: inventoryValData, isLoading: invLoading } = useGetInventoryValueQuery()
  const { data: nearExpiryData, isLoading: nearExpiryLoading } = useGetNearExpiryValueQuery()
  const { data: targetData, isLoading: targetLoading } = useGetTargetAchievementQuery()
  const { data: returnsData, isLoading: returnsLoading } = useGetReturnsSummaryQuery()
  const { data: aiUsageData, isLoading: aiLoading } = useGetAiUsageSummaryQuery(undefined as never)

  const revenue = useMemo(() => revenueData?.data ?? [], [revenueData])
  const gst = useMemo(() => gstData?.data ?? [], [gstData])
  const outstanding = useMemo(() => outstandingData?.data ?? [], [outstandingData])
  const creditNote = creditNoteData?.data
  const topStockists = useMemo(() => topStockistsData?.data ?? [], [topStockistsData])
  const topChemists = useMemo(() => topChemistsData?.data ?? [], [topChemistsData])
  const repPerf = useMemo(() => repPerfData?.data ?? [], [repPerfData])
  const productVel = useMemo(() => productVelData?.data ?? [], [productVelData])
  const inventoryVal = useMemo(() => inventoryValData?.data ?? [], [inventoryValData])
  const nearExpiry = useMemo(() => nearExpiryData?.data ?? [], [nearExpiryData])
  const targets = useMemo(() => targetData?.data ?? [], [targetData])
  const returns = useMemo(() => returnsData?.data ?? [], [returnsData])
  const aiUsage = aiUsageData?.data

  const totalRevenue = revenue.reduce((s, r) => s + Number(r.totalRevenue), 0)
  const totalInvoices = revenue.reduce((s, r) => s + Number(r.invoiceCount), 0)
  const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0
  const totalOutstanding = outstanding.reduce((s, o) => s + Number(o.outstandingAmount), 0)
  const totalGrandTotal = outstanding.reduce((s, o) => s + Number(o.grandTotal), 0)
  const totalInvValue = inventoryVal.reduce((s, i) => s + Number(i.totalInventoryValue), 0)
  const totalNearExpiryValue = nearExpiry.reduce((s, n) => s + Number(n.valueAtRisk), 0)
  const totalReturnValue = returns.reduce((s, r) => s + Number(r.totalReturnValue), 0)
  const totalReturnCount = returns.reduce((s, r) => s + Number(r.totalReturnCount), 0)
  const latestMonthRevenue =
    revenue.length > 0 ? Number(revenue[revenue.length - 1].totalRevenue) : 0
  const prevMonthRevenue = revenue.length > 1 ? Number(revenue[revenue.length - 2].totalRevenue) : 0
  const revenueGrowth =
    prevMonthRevenue > 0
      ? (((latestMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100).toFixed(1)
      : null

  const collectionRate =
    totalGrandTotal > 0 ? ((totalGrandTotal - totalOutstanding) / totalGrandTotal) * 100 : 100
  const avgTargetAch =
    targets.length > 0
      ? targets.reduce((s, t) => s + Number(t.achievementPct ?? 0), 0) / targets.length
      : 100
  const nearExpiryRisk =
    totalInvValue > 0 ? Math.max(0, 100 - (totalNearExpiryValue / totalInvValue) * 500) : 100
  const healthScore = Math.round(collectionRate * 0.4 + avgTargetAch * 0.35 + nearExpiryRisk * 0.25)
  const healthColor =
    healthScore >= 80 ? 'var(--vp-teal)' : healthScore >= 60 ? 'var(--vp-amber)' : 'var(--vp-rose)'
  const healthLabel =
    healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention'

  const tabs: { key: Tab; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { key: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { key: 'revenue', label: 'Revenue & GST', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'receivables', label: 'Receivables', icon: <AlertCircle className="w-4 h-4" /> },
    { key: 'performers', label: 'Performers', icon: <Award className="w-4 h-4" /> },
    { key: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
    { key: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { key: 'inventory', label: 'Inventory', icon: <Boxes className="w-4 h-4" /> },
    { key: 'returns', label: 'Returns', icon: <RotateCcw className="w-4 h-4" /> },
    { key: 'ai', label: 'AI Usage', icon: <Brain className="w-4 h-4" />, ownerOnly: true },
  ]
  const visibleTabs = tabs.filter((t) => !t.ownerOnly || isOwner)

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
        >
          Analytics
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
          Complete business intelligence — revenue, team, inventory, returns, and AI spend
        </p>
      </div>

      {/* ── Top KPI Strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          loading={revenueLoading}
          value={fmt(totalRevenue)}
          sub={
            revenueGrowth
              ? `${Number(revenueGrowth) >= 0 ? '+' : ''}${revenueGrowth}% vs last month`
              : undefined
          }
          icon={<IndianRupee className="w-5 h-5" />}
          color="var(--vp-teal)"
          bg="var(--vp-teal-light)"
        />
        <KpiCard
          label="Total Outstanding"
          loading={outstandingLoading}
          value={fmt(totalOutstanding)}
          sub={`${outstanding.length} invoices unpaid`}
          icon={<AlertCircle className="w-5 h-5" />}
          color="var(--vp-amber)"
          bg="var(--vp-amber-light)"
        />
        <KpiCard
          label="Inventory Value"
          loading={invLoading}
          value={fmt(totalInvValue)}
          sub={`${inventoryVal.length} products in stock`}
          icon={<Boxes className="w-5 h-5" />}
          color="var(--vp-purple)"
          bg="var(--vp-purple-light)"
        />
        <KpiCard
          label="Open Credits"
          loading={cnLoading}
          value={creditNote ? fmt(Number(creditNote.totalOpenValue)) : '—'}
          sub={creditNote ? `${creditNote.openCount} credit notes open` : undefined}
          icon={<FileText className="w-5 h-5" />}
          color="var(--vp-rose)"
          bg="var(--vp-rose-light)"
        />
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div className="vp-card overflow-hidden">
        <div className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--vp-border)' }}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap shrink-0"
              style={{
                color: activeTab === tab.key ? 'var(--vp-teal)' : 'var(--vp-text-muted)',
                borderBottom:
                  activeTab === tab.key ? '2px solid var(--vp-teal)' : '2px solid transparent',
                background: 'transparent',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-8">
            {/* Business Health Score */}
            <div
              className="p-5 rounded-xl"
              style={{ background: 'var(--vp-bg-surface-alt)', border: `2px solid ${healthColor}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    Business Health Score
                  </p>
                  <p
                    className="text-4xl font-bold"
                    style={{ color: healthColor, fontFamily: 'var(--font-display)' }}
                  >
                    {healthScore}
                    <span className="text-lg">/100</span>
                  </p>
                  <p className="text-sm font-semibold mt-1" style={{ color: healthColor }}>
                    {healthLabel}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      Collection Rate (40%)
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: collectionRate >= 80 ? 'var(--vp-teal)' : 'var(--vp-amber)' }}
                    >
                      {collectionRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      Avg Target Achievement (35%)
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: avgTargetAch >= 80 ? 'var(--vp-teal)' : 'var(--vp-amber)' }}
                    >
                      {avgTargetAch.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      Inventory Health (25%)
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: nearExpiryRisk >= 80 ? 'var(--vp-teal)' : 'var(--vp-amber)' }}
                    >
                      {nearExpiryRisk.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              <div
                className="w-full h-3 rounded-full mt-4"
                style={{ background: 'var(--vp-bg-hover)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${healthScore}%`, background: healthColor }}
                />
              </div>
            </div>

            {/* Revenue vs Returns trend */}
            <div>
              <SectionHeader
                icon={<TrendingUp className="w-5 h-5" />}
                title="Revenue vs Returns Trend"
                subtitle="Net effective revenue after accounting for returns"
                iconBg="var(--vp-teal-light)"
                iconColor="var(--vp-teal)"
              />
              {revenueLoading ? (
                <Skeleton className="h-48 skeleton-shimmer" />
              ) : revenue.length === 0 ? (
                <EmptyState icon={<TrendingUp />} message="No revenue data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={revenue.map((r) => {
                      const matchingReturn = returns.find((ret) => ret.month === r.month)
                      return {
                        month: r.month,
                        revenue: Number(r.totalRevenue),
                        returnValue: matchingReturn ? Number(matchingReturn.totalReturnValue) : 0,
                        netRevenue:
                          Number(r.totalRevenue) -
                          (matchingReturn ? Number(matchingReturn.totalReturnValue) : 0),
                      }
                    })}
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vp-border)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Gross Revenue"
                      stroke="var(--vp-teal)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--vp-teal)', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="returnValue"
                      name="Returns"
                      stroke="var(--vp-rose)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'var(--vp-rose)', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="netRevenue"
                      name="Net Revenue"
                      stroke="var(--vp-purple)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--vp-purple)', r: 3 }}
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 3-column quick stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <SectionHeader
                  icon={<Package className="w-5 h-5" />}
                  title="Top Products"
                  subtitle="By units sold"
                  iconBg="var(--vp-purple-light)"
                  iconColor="var(--vp-purple)"
                />
                {productLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 skeleton-shimmer" />
                    ))}
                  </div>
                ) : (
                  productVel.slice(0, 3).map((p, i) => (
                    <div key={p.productId.toString()} className="flex items-center gap-2 mb-3">
                      <span
                        className="text-xs font-bold w-4"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          {p.productName}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          {p.totalUnitsSold} units sold
                        </p>
                      </div>
                      <p className="text-xs font-bold" style={{ color: 'var(--vp-purple)' }}>
                        {fmt(Number(p.totalRevenue))}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div>
                <SectionHeader
                  icon={<Users className="w-5 h-5" />}
                  title="Top Reps"
                  subtitle="By revenue generated"
                  iconBg="var(--vp-amber-light)"
                  iconColor="var(--vp-amber)"
                />
                {repLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 skeleton-shimmer" />
                    ))}
                  </div>
                ) : (
                  [...repPerf]
                    .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
                    .slice(0, 3)
                    .map((rep, i) => (
                      <div key={rep.repId.toString()} className="flex items-center gap-2 mb-3">
                        <span
                          className="text-xs font-bold w-4"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs font-semibold truncate"
                            style={{ color: 'var(--vp-text-primary)' }}
                          >
                            {rep.repName}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                            {rep.completedVisits} visits · {rep.totalOrders} orders
                          </p>
                        </div>
                        <p className="text-xs font-bold" style={{ color: 'var(--vp-amber)' }}>
                          {fmt(Number(rep.totalRevenue))}
                        </p>
                      </div>
                    ))
                )}
              </div>
              <div>
                <SectionHeader
                  icon={<Zap className="w-5 h-5" />}
                  title="Live Alerts"
                  subtitle="Items needing attention right now"
                  iconBg="var(--vp-rose-light)"
                  iconColor="var(--vp-rose)"
                />
                <div className="space-y-2">
                  {[
                    {
                      icon: <AlertCircle className="w-4 h-4" />,
                      label: `${outstanding.length} unpaid invoices`,
                      value: fmt(totalOutstanding),
                      color: 'var(--vp-amber)',
                    },
                    {
                      icon: <Clock className="w-4 h-4" />,
                      label: `${outstanding.filter((o) => Number(o.daysSinceIssued) > 30).length} invoices overdue >30d`,
                      value: fmt(
                        outstanding
                          .filter((o) => Number(o.daysSinceIssued) > 30)
                          .reduce((s, o) => s + Number(o.outstandingAmount), 0)
                      ),
                      color: 'var(--vp-rose)',
                    },
                    {
                      icon: <Zap className="w-4 h-4" />,
                      label: `${nearExpiry.filter((n) => Number(n.daysUntilExpiry) <= 30).length} batches expiring in 30d`,
                      value: fmt(
                        nearExpiry
                          .filter((n) => Number(n.daysUntilExpiry) <= 30)
                          .reduce((s, n) => s + Number(n.valueAtRisk), 0)
                      ),
                      color: 'var(--vp-rose)',
                    },
                    {
                      icon: <FileText className="w-4 h-4" />,
                      label: `${creditNote?.openCount ?? 0} open credit notes`,
                      value: fmt(Number(creditNote?.totalOpenValue ?? 0)),
                      color: 'var(--vp-purple)',
                    },
                  ].map((alert) => (
                    <div
                      key={alert.label}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{
                        background: 'var(--vp-bg-surface-alt)',
                        border: '1px solid var(--vp-border)',
                      }}
                    >
                      <span style={{ color: alert.color }}>{alert.icon}</span>
                      <p className="text-xs flex-1" style={{ color: 'var(--vp-text-secondary)' }}>
                        {alert.label}
                      </p>
                      <p className="text-xs font-bold shrink-0" style={{ color: alert.color }}>
                        {alert.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* REVENUE & GST TAB                                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'revenue' && (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Revenue',
                  value: fmt(totalRevenue),
                  color: 'var(--vp-teal)',
                  bg: 'var(--vp-teal-light)',
                },
                {
                  label: 'Total Invoices',
                  value: totalInvoices.toString(),
                  color: 'var(--vp-purple)',
                  bg: 'var(--vp-purple-light)',
                },
                {
                  label: 'Avg Invoice Value',
                  value: fmt(avgInvoiceValue),
                  color: 'var(--vp-amber)',
                  bg: 'var(--vp-amber-light)',
                },
                {
                  label: 'Latest Month',
                  value: fmt(latestMonthRevenue),
                  color: 'var(--vp-teal)',
                  bg: 'var(--vp-teal-light)',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                    {kpi.label}
                  </p>
                  {revenueLoading ? (
                    <Skeleton className="h-6 w-20 skeleton-shimmer" />
                  ) : (
                    <p
                      className="text-lg font-bold"
                      style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}
                    >
                      {kpi.value}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div>
              <SectionHeader
                icon={<TrendingUp className="w-5 h-5" />}
                title="Monthly Revenue"
                subtitle="Revenue and invoice count by month"
                iconBg="var(--vp-teal-light)"
                iconColor="var(--vp-teal)"
              />
              {revenueLoading ? (
                <Skeleton className="h-56 skeleton-shimmer" />
              ) : revenue.length === 0 ? (
                <EmptyState icon={<TrendingUp />} message="No revenue data" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenue} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vp-border)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="totalRevenue"
                      name="Revenue"
                      fill="var(--vp-teal)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {revenue.length > 0 && (
              <div>
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{ color: 'var(--vp-text-primary)' }}
                >
                  Month-by-Month Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                        {['Month', 'Revenue', 'Invoices', 'Avg Invoice'].map((h) => (
                          <th
                            key={h}
                            className="text-left pb-2 pr-6 text-xs font-semibold"
                            style={{ color: 'var(--vp-text-muted)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {revenue.map((row) => (
                        <tr key={row.month} style={{ borderBottom: '1px solid var(--vp-border)' }}>
                          <td
                            className="py-2 pr-6 font-medium"
                            style={{ color: 'var(--vp-text-primary)' }}
                          >
                            {row.month}
                          </td>
                          <td className="py-2 pr-6 font-bold" style={{ color: 'var(--vp-teal)' }}>
                            {fmt(Number(row.totalRevenue))}
                          </td>
                          <td className="py-2 pr-6" style={{ color: 'var(--vp-text-secondary)' }}>
                            {row.invoiceCount}
                          </td>
                          <td className="py-2" style={{ color: 'var(--vp-text-secondary)' }}>
                            {fmt(Number(row.averageInvoiceValue))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isOwner && (
              <div>
                <SectionHeader
                  icon={<FileText className="w-5 h-5" />}
                  title="GST Liability Breakdown"
                  subtitle="CGST + SGST (intra-state) and IGST (inter-state) by month"
                  iconBg="var(--vp-rose-light)"
                  iconColor="var(--vp-rose)"
                />
                {gstLoading ? (
                  <Skeleton className="h-40 skeleton-shimmer" />
                ) : gst.length === 0 ? (
                  <EmptyState icon={<FileText />} message="No GST data yet" />
                ) : (
                  <>
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                            {['Month', 'CGST', 'SGST', 'IGST', 'Total Tax'].map((h) => (
                              <th
                                key={h}
                                className="text-left pb-2 pr-6 text-xs font-semibold"
                                style={{ color: 'var(--vp-text-muted)' }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {gst.map((row) => (
                            <tr
                              key={row.month}
                              style={{ borderBottom: '1px solid var(--vp-border)' }}
                            >
                              <td
                                className="py-2 pr-6 font-medium"
                                style={{ color: 'var(--vp-text-primary)' }}
                              >
                                {row.month}
                              </td>
                              <td
                                className="py-2 pr-6"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {fmt(Number(row.totalCgst))}
                              </td>
                              <td
                                className="py-2 pr-6"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {fmt(Number(row.totalSgst))}
                              </td>
                              <td
                                className="py-2 pr-6"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {fmt(Number(row.totalIgst))}
                              </td>
                              <td className="py-2 font-bold" style={{ color: 'var(--vp-rose)' }}>
                                {fmt(Number(row.totalTaxLiability))}
                              </td>
                            </tr>
                          ))}
                          <tr
                            style={{
                              borderTop: '2px solid var(--vp-border)',
                              background: 'var(--vp-bg-surface-alt)',
                            }}
                          >
                            <td
                              className="py-2 pr-6 font-bold"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              TOTAL
                            </td>
                            <td
                              className="py-2 pr-6 font-bold"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              {fmt(gst.reduce((s, r) => s + Number(r.totalCgst), 0))}
                            </td>
                            <td
                              className="py-2 pr-6 font-bold"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              {fmt(gst.reduce((s, r) => s + Number(r.totalSgst), 0))}
                            </td>
                            <td
                              className="py-2 pr-6 font-bold"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              {fmt(gst.reduce((s, r) => s + Number(r.totalIgst), 0))}
                            </td>
                            <td className="py-2 font-bold" style={{ color: 'var(--vp-rose)' }}>
                              {fmt(gst.reduce((s, r) => s + Number(r.totalTaxLiability), 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gst} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--vp-border)" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="totalCgst"
                          name="CGST"
                          fill="var(--vp-teal)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="totalSgst"
                          name="SGST"
                          fill="var(--vp-purple)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="totalIgst"
                          name="IGST"
                          fill="var(--vp-amber)"
                          radius={[4, 4, 0, 0]}
                        />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* RECEIVABLES TAB                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'receivables' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Outstanding',
                  value: fmt(totalOutstanding),
                  color: 'var(--vp-amber)',
                  loading: outstandingLoading,
                },
                {
                  label: 'Invoices Unpaid',
                  value: outstanding.length.toString(),
                  color: 'var(--vp-rose)',
                  loading: outstandingLoading,
                },
                {
                  label: 'Open Credit Notes',
                  value: creditNote ? fmt(Number(creditNote.totalOpenValue)) : '—',
                  color: 'var(--vp-purple)',
                  loading: cnLoading,
                },
                {
                  label: 'Collection Rate',
                  value:
                    totalGrandTotal > 0
                      ? `${(((totalGrandTotal - totalOutstanding) / totalGrandTotal) * 100).toFixed(1)}%`
                      : '—',
                  color: 'var(--vp-teal)',
                  loading: outstandingLoading,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                    {kpi.label}
                  </p>
                  {kpi.loading ? (
                    <Skeleton className="h-6 w-20 skeleton-shimmer" />
                  ) : (
                    <p
                      className="text-lg font-bold"
                      style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}
                    >
                      {kpi.value}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {creditNote && (
              <div
                className="p-5 rounded-xl"
                style={{
                  background: 'var(--vp-bg-surface-alt)',
                  border: '1px solid var(--vp-border)',
                }}
              >
                <SectionHeader
                  icon={<FileText className="w-5 h-5" />}
                  title="Open Credit Notes Breakdown"
                  subtitle="Split between chemists and stockists"
                  iconBg="var(--vp-purple-light)"
                  iconColor="var(--vp-purple)"
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Total Open Value',
                      value: fmt(Number(creditNote.totalOpenValue)),
                      color: 'var(--vp-purple)',
                    },
                    {
                      label: 'Open Count',
                      value: creditNote.openCount.toString(),
                      color: 'var(--vp-purple)',
                    },
                    {
                      label: 'Stockist Credits',
                      value: fmt(Number(creditNote.stockistOpenValue)),
                      color: 'var(--vp-teal)',
                    },
                    {
                      label: 'Chemist Credits',
                      value: fmt(Number(creditNote.chemistOpenValue)),
                      color: 'var(--vp-amber)',
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <p
                        className="text-xs font-medium mb-0.5"
                        style={{ color: 'var(--vp-text-muted)' }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="text-base font-bold"
                        style={{ color: item.color, fontFamily: 'var(--font-display)' }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <SectionHeader
                icon={<AlertCircle className="w-5 h-5" />}
                title="Outstanding Invoices"
                subtitle="All unpaid and partially paid invoices with collection progress"
                iconBg="var(--vp-amber-light)"
                iconColor="var(--vp-amber)"
              />
              {outstandingLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 skeleton-shimmer" />
                  ))}
                </div>
              ) : outstanding.length === 0 ? (
                <EmptyState icon={<CheckCircle2 />} message="All invoices are fully collected" />
              ) : (
                <>
                  <div className="space-y-2">
                    {(expandedOutstanding ? outstanding : outstanding.slice(0, 8)).map((inv) => {
                      const pctCollected =
                        Number(inv.grandTotal) > 0
                          ? ((Number(inv.grandTotal) - Number(inv.outstandingAmount)) /
                              Number(inv.grandTotal)) *
                            100
                          : 0
                      const isOverdue = Number(inv.daysSinceIssued) > 30
                      return (
                        <div
                          key={inv.invoiceId.toString()}
                          className="p-4 rounded-xl"
                          style={{
                            background: 'var(--vp-bg-surface-alt)',
                            border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.3)' : 'var(--vp-border)'}`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p
                                  className="text-sm font-semibold"
                                  style={{ color: 'var(--vp-text-primary)' }}
                                >
                                  {inv.invoiceNumber}
                                </p>
                                {isOverdue && (
                                  <span
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{
                                      background: 'var(--vp-rose-light)',
                                      color: 'var(--vp-rose)',
                                    }}
                                  >
                                    {inv.daysSinceIssued}d overdue
                                  </span>
                                )}
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    background: 'var(--vp-bg-hover)',
                                    color: 'var(--vp-text-muted)',
                                  }}
                                >
                                  {inv.status}
                                </span>
                              </div>
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: 'var(--vp-text-muted)' }}
                              >
                                {inv.billedToName}
                                {Number(inv.totalCreditApplied) > 0 &&
                                  ` · ₹${Number(inv.totalCreditApplied).toFixed(0)} credited`}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold" style={{ color: 'var(--vp-amber)' }}>
                                {fmt(Number(inv.outstandingAmount))}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                                of {fmt(Number(inv.grandTotal))}
                              </p>
                            </div>
                          </div>
                          <div
                            className="w-full h-1.5 rounded-full"
                            style={{ background: 'var(--vp-bg-hover)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pctCollected}%`, background: 'var(--vp-teal)' }}
                            />
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                            {pctCollected.toFixed(0)}% collected
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  {outstanding.length > 8 && (
                    <button
                      onClick={() => setExpandedOutstanding(!expandedOutstanding)}
                      className="flex items-center gap-1 mt-3 text-xs font-semibold"
                      style={{ color: 'var(--vp-teal)' }}
                    >
                      {expandedOutstanding ? (
                        <>
                          <ChevronUp className="w-4 h-4" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" /> Show all {outstanding.length} invoices
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PERFORMERS TAB                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'performers' && (
          <div className="p-6 space-y-8">
            {/* Concentration + insight cards */}
            {(topStockists.length > 0 || topChemists.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {topStockists.length > 0 &&
                  (() => {
                    const totalS = topStockists.reduce((s, x) => s + Number(x.totalRevenue), 0)
                    const top3Rev = topStockists
                      .slice(0, 3)
                      .reduce((s, x) => s + Number(x.totalRevenue), 0)
                    const concPct = totalS > 0 ? ((top3Rev / totalS) * 100).toFixed(0) : '0'
                    const avgInv =
                      totalS /
                      Math.max(
                        topStockists.reduce((s, x) => s + Number(x.invoiceCount), 0),
                        1
                      )
                    return (
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: 'var(--vp-bg-surface-alt)',
                          border: '1px solid var(--vp-border)',
                        }}
                      >
                        <p
                          className="text-xs font-semibold mb-3"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          STOCKIST INSIGHTS
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              Total Partners
                            </p>
                            <p
                              className="text-lg font-bold"
                              style={{ color: 'var(--vp-teal)', fontFamily: 'var(--font-display)' }}
                            >
                              {topStockists.length}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              Top 3 Concentration
                            </p>
                            <p
                              className="text-lg font-bold"
                              style={{
                                color: Number(concPct) > 70 ? 'var(--vp-rose)' : 'var(--vp-amber)',
                                fontFamily: 'var(--font-display)',
                              }}
                            >
                              {concPct}%
                            </p>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              {Number(concPct) > 70 ? '⚠ High risk' : 'Healthy spread'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              Avg Invoice Value
                            </p>
                            <p
                              className="text-lg font-bold"
                              style={{
                                color: 'var(--vp-purple)',
                                fontFamily: 'var(--font-display)',
                              }}
                            >
                              {fmt(avgInv)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                {topChemists.length > 0 &&
                  (() => {
                    const totalC = topChemists.reduce((s, x) => s + Number(x.totalRevenue), 0)
                    const top3Rev = topChemists
                      .slice(0, 3)
                      .reduce((s, x) => s + Number(x.totalRevenue), 0)
                    const concPct = totalC > 0 ? ((top3Rev / totalC) * 100).toFixed(0) : '0'
                    const avgInv =
                      totalC /
                      Math.max(
                        topChemists.reduce((s, x) => s + Number(x.invoiceCount), 0),
                        1
                      )
                    return (
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: 'var(--vp-bg-surface-alt)',
                          border: '1px solid var(--vp-border)',
                        }}
                      >
                        <p
                          className="text-xs font-semibold mb-3"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          CHEMIST INSIGHTS
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              Total Partners
                            </p>
                            <p
                              className="text-lg font-bold"
                              style={{
                                color: 'var(--vp-purple)',
                                fontFamily: 'var(--font-display)',
                              }}
                            >
                              {topChemists.length}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              Top 3 Concentration
                            </p>
                            <p
                              className="text-lg font-bold"
                              style={{
                                color: Number(concPct) > 70 ? 'var(--vp-rose)' : 'var(--vp-amber)',
                                fontFamily: 'var(--font-display)',
                              }}
                            >
                              {concPct}%
                            </p>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              {Number(concPct) > 70 ? '⚠ High risk' : 'Healthy spread'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              Avg Invoice Value
                            </p>
                            <p
                              className="text-lg font-bold"
                              style={{
                                color: 'var(--vp-amber)',
                                fontFamily: 'var(--font-display)',
                              }}
                            >
                              {fmt(avgInv)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
              </div>
            )}

            {/* Stockist horizontal bar chart */}
            <div>
              <SectionHeader
                icon={<Award className="w-5 h-5" />}
                title="Stockist Revenue Ranking"
                subtitle="All stockists ranked by revenue — focus on the top performers"
                iconBg="var(--vp-teal-light)"
                iconColor="var(--vp-teal)"
              />
              {stockistsLoading ? (
                <Skeleton className="h-64 skeleton-shimmer" />
              ) : topStockists.length === 0 ? (
                <EmptyState icon={<Award />} message="No stockist data yet" />
              ) : (
                <>
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(topStockists.length * 44, 200)}
                  >
                    <BarChart
                      data={topStockists.map((s) => ({
                        name: s.name,
                        revenue: Number(s.totalRevenue),
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 80, left: 120, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--vp-border)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: 'var(--vp-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--vp-text-primary)' }}
                        axisLine={false}
                        tickLine={false}
                        width={115}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="var(--vp-teal)"
                        radius={[0, 6, 6, 0]}
                        label={{
                          position: 'right',
                          fontSize: 10,
                          fill: 'var(--vp-teal)',
                          formatter: (v) => fmt(Number(v ?? 0)),
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* State breakdown */}
                  {(() => {
                    const byState: Record<string, number> = {}
                    topStockists.forEach((s) => {
                      byState[s.state] = (byState[s.state] ?? 0) + Number(s.totalRevenue)
                    })
                    const stateData = Object.entries(byState)
                      .sort((a, b) => b[1] - a[1])
                      .map(([state, revenue]) => ({ state, revenue }))
                    return stateData.length > 1 ? (
                      <div className="mt-6">
                        <p
                          className="text-xs font-semibold mb-3"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          REVENUE BY STATE — STOCKISTS
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          {stateData.map((s, i) => (
                            <div
                              key={s.state}
                              className="p-3 rounded-xl"
                              style={{
                                background: 'var(--vp-bg-surface-alt)',
                                border: '1px solid var(--vp-border)',
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p
                                  className="text-xs font-semibold truncate"
                                  style={{ color: 'var(--vp-text-primary)' }}
                                >
                                  {s.state}
                                </p>
                                {i === 0 && (
                                  <span className="text-xs" style={{ color: 'var(--vp-amber)' }}>
                                    ★
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-bold" style={{ color: 'var(--vp-teal)' }}>
                                {fmt(s.revenue)}
                              </p>
                              <div
                                className="w-full h-1 rounded-full mt-1.5"
                                style={{ background: 'var(--vp-bg-hover)' }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(s.revenue / stateData[0].revenue) * 100}%`,
                                    background: 'var(--vp-teal)',
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}
                </>
              )}
            </div>

            {/* Chemist horizontal bar chart */}
            <div>
              <SectionHeader
                icon={<Award className="w-5 h-5" />}
                title="Chemist Revenue Ranking"
                subtitle="All chemists ranked by revenue — identify your highest-value retail partners"
                iconBg="var(--vp-purple-light)"
                iconColor="var(--vp-purple)"
              />
              {chemistsLoading ? (
                <Skeleton className="h-64 skeleton-shimmer" />
              ) : topChemists.length === 0 ? (
                <EmptyState icon={<Award />} message="No chemist data yet" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(topChemists.length * 44, 200)}>
                    <BarChart
                      data={topChemists.map((c) => ({
                        name: c.name,
                        revenue: Number(c.totalRevenue),
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 80, left: 120, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--vp-border)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: 'var(--vp-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--vp-text-primary)' }}
                        axisLine={false}
                        tickLine={false}
                        width={115}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill="var(--vp-purple)"
                        radius={[0, 6, 6, 0]}
                        label={{
                          position: 'right',
                          fontSize: 10,
                          fill: 'var(--vp-purple)',
                          formatter: (v) => fmt(Number(v ?? 0)),
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  {(() => {
                    const byState: Record<string, number> = {}
                    topChemists.forEach((c) => {
                      byState[c.state] = (byState[c.state] ?? 0) + Number(c.totalRevenue)
                    })
                    const stateData = Object.entries(byState)
                      .sort((a, b) => b[1] - a[1])
                      .map(([state, revenue]) => ({ state, revenue }))
                    return stateData.length > 1 ? (
                      <div className="mt-6">
                        <p
                          className="text-xs font-semibold mb-3"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          REVENUE BY STATE — CHEMISTS
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                          {stateData.map((s, i) => (
                            <div
                              key={s.state}
                              className="p-3 rounded-xl"
                              style={{
                                background: 'var(--vp-bg-surface-alt)',
                                border: '1px solid var(--vp-border)',
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p
                                  className="text-xs font-semibold truncate"
                                  style={{ color: 'var(--vp-text-primary)' }}
                                >
                                  {s.state}
                                </p>
                                {i === 0 && (
                                  <span className="text-xs" style={{ color: 'var(--vp-amber)' }}>
                                    ★
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-sm font-bold"
                                style={{ color: 'var(--vp-purple)' }}
                              >
                                {fmt(s.revenue)}
                              </p>
                              <div
                                className="w-full h-1 rounded-full mt-1.5"
                                style={{ background: 'var(--vp-bg-hover)' }}
                              >
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(s.revenue / stateData[0].revenue) * 100}%`,
                                    background: 'var(--vp-purple)',
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}
                </>
              )}
            </div>

            {/* Channel split — stockist vs chemist pie */}
            {topStockists.length > 0 &&
              topChemists.length > 0 &&
              (() => {
                const totalS = topStockists.reduce((s, x) => s + Number(x.totalRevenue), 0)
                const totalC = topChemists.reduce((s, x) => s + Number(x.totalRevenue), 0)
                const grand = totalS + totalC
                const stockistPct = grand > 0 ? ((totalS / grand) * 100).toFixed(1) : '0'
                const chemistPct = grand > 0 ? ((totalC / grand) * 100).toFixed(1) : '0'
                return (
                  <div>
                    <SectionHeader
                      icon={<Activity className="w-5 h-5" />}
                      title="Channel Split — Stockist vs Chemist"
                      subtitle="Which distribution channel drives more revenue for your business"
                      iconBg="var(--vp-amber-light)"
                      iconColor="var(--vp-amber)"
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {[
                          {
                            label: 'Stockist Channel',
                            value: totalS,
                            pct: stockistPct,
                            color: 'var(--vp-teal)',
                            count: topStockists.length,
                          },
                          {
                            label: 'Chemist Channel',
                            value: totalC,
                            pct: chemistPct,
                            color: 'var(--vp-purple)',
                            count: topChemists.length,
                          },
                        ].map((ch) => (
                          <div
                            key={ch.label}
                            className="p-4 rounded-xl"
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
                                {ch.label}
                              </p>
                              <p className="text-sm font-bold" style={{ color: ch.color }}>
                                {fmt(ch.value)}
                              </p>
                            </div>
                            <div
                              className="w-full h-3 rounded-full"
                              style={{ background: 'var(--vp-bg-hover)' }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${ch.pct}%`, background: ch.color }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                                {ch.count} partners
                              </p>
                              <p className="text-xs font-bold" style={{ color: ch.color }}>
                                {ch.pct}% of revenue
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: 'Stockists',
                                  value: totalS,
                                  fill: 'var(--vp-teal)',
                                },
                                {
                                  name: 'Chemists',
                                  value: totalC,
                                  fill: 'var(--vp-purple)',
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              innerRadius={50}
                              dataKey="value"
                              nameKey="name"
                            />

                            <Tooltip formatter={(v) => [fmt(Number(v ?? 0))]} />

                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )
              })()}

            {/* Partner value analysis — avg revenue per invoice */}
            <div>
              <SectionHeader
                icon={<FileText className="w-5 h-5" />}
                title="Partner Value Analysis"
                subtitle="Avg revenue per invoice — higher means premium buyers worth nurturing"
                iconBg="var(--vp-rose-light)"
                iconColor="var(--vp-rose)"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p
                    className="text-xs font-semibold mb-3"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    STOCKISTS — AVG INVOICE VALUE
                  </p>
                  <div className="space-y-2">
                    {[...topStockists]
                      .map((s) => ({
                        ...s,
                        avgInv: Number(s.totalRevenue) / Math.max(Number(s.invoiceCount), 1),
                      }))
                      .sort((a, b) => b.avgInv - a.avgInv)
                      .slice(0, 5)
                      .map((s, i) => (
                        <div key={s.id.toString()} className="flex items-center gap-3">
                          <span
                            className="text-xs font-bold w-4"
                            style={{ color: 'var(--vp-text-muted)' }}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              {s.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              {s.invoiceCount} invoices
                            </p>
                          </div>
                          <p
                            className="text-xs font-bold shrink-0"
                            style={{ color: 'var(--vp-teal)' }}
                          >
                            {fmt(s.avgInv)}/inv
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <p
                    className="text-xs font-semibold mb-3"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    CHEMISTS — AVG INVOICE VALUE
                  </p>
                  <div className="space-y-2">
                    {[...topChemists]
                      .map((c) => ({
                        ...c,
                        avgInv: Number(c.totalRevenue) / Math.max(Number(c.invoiceCount), 1),
                      }))
                      .sort((a, b) => b.avgInv - a.avgInv)
                      .slice(0, 5)
                      .map((c, i) => (
                        <div key={c.id.toString()} className="flex items-center gap-3">
                          <span
                            className="text-xs font-bold w-4"
                            style={{ color: 'var(--vp-text-muted)' }}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              {c.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              {c.invoiceCount} invoices
                            </p>
                          </div>
                          <p
                            className="text-xs font-bold shrink-0"
                            style={{ color: 'var(--vp-purple)' }}
                          >
                            {fmt(c.avgInv)}/inv
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TEAM TAB                                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'team' && (
          <div className="p-6 space-y-8">
            {repPerf.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Team Revenue',
                    value: fmt(repPerf.reduce((s, r) => s + Number(r.totalRevenue), 0)),
                    color: 'var(--vp-teal)',
                  },
                  {
                    label: 'Total Visits',
                    value: repPerf.reduce((s, r) => s + Number(r.totalVisits), 0).toString(),
                    color: 'var(--vp-purple)',
                  },
                  {
                    label: 'Completion Rate',
                    value: (() => {
                      const tv = repPerf.reduce((s, r) => s + Number(r.totalVisits), 0)
                      const tc = repPerf.reduce((s, r) => s + Number(r.completedVisits), 0)
                      return tv > 0 ? `${((tc / tv) * 100).toFixed(0)}%` : '—'
                    })(),
                    color: 'var(--vp-amber)',
                  },
                  {
                    label: 'Total Orders',
                    value: repPerf.reduce((s, r) => s + Number(r.totalOrders), 0).toString(),
                    color: 'var(--vp-rose)',
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="p-4 rounded-xl"
                    style={{
                      background: 'var(--vp-bg-surface-alt)',
                      border: '1px solid var(--vp-border)',
                    }}
                  >
                    <p
                      className="text-xs font-medium mb-1"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      {kpi.label}
                    </p>
                    {repLoading ? (
                      <Skeleton className="h-6 w-20 skeleton-shimmer" />
                    ) : (
                      <p
                        className="text-lg font-bold"
                        style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}
                      >
                        {kpi.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Revenue per visit chart */}
            <div>
              <SectionHeader
                icon={<Activity className="w-5 h-5" />}
                title="Rep Efficiency — Revenue per Completed Visit"
                subtitle="How well each rep converts visits into revenue"
                iconBg="var(--vp-teal-light)"
                iconColor="var(--vp-teal)"
              />
              {repLoading ? (
                <Skeleton className="h-48 skeleton-shimmer" />
              ) : repPerf.length === 0 ? (
                <EmptyState icon={<Users />} message="No rep data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={repPerf.map((rep) => ({
                      name: rep.repName,
                      revenuePerVisit:
                        rep.completedVisits > 0
                          ? Math.round(Number(rep.totalRevenue) / Number(rep.completedVisits))
                          : 0,
                    }))}
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vp-border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="revenuePerVisit"
                      name="Revenue per Visit"
                      fill="var(--vp-teal)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Full rep performance table */}
            <div>
              <SectionHeader
                icon={<Users className="w-5 h-5" />}
                title="Full Rep Performance Table"
                subtitle="Every metric per rep — completion rate, revenue per visit, target achievement"
                iconBg="var(--vp-amber-light)"
                iconColor="var(--vp-amber)"
              />
              {repLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 skeleton-shimmer" />
                  ))}
                </div>
              ) : repPerf.length === 0 ? (
                <EmptyState icon={<Users />} message="No rep performance data yet" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                        {[
                          'Rep',
                          'Total Visits',
                          'Completed',
                          'Completion %',
                          'Orders',
                          'Revenue',
                          'Rev/Visit',
                          'Target %',
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left pb-2 pr-4 text-xs font-semibold whitespace-nowrap"
                            style={{ color: 'var(--vp-text-muted)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {repPerf.map((rep) => {
                        const completionRate =
                          Number(rep.totalVisits) > 0
                            ? (
                                (Number(rep.completedVisits) / Number(rep.totalVisits)) *
                                100
                              ).toFixed(0)
                            : '0'
                        const revPerVisit =
                          Number(rep.completedVisits) > 0
                            ? Number(rep.totalRevenue) / Number(rep.completedVisits)
                            : 0
                        const achNum = Number(rep.achievementPct ?? 0)
                        const achColor =
                          achNum >= 100
                            ? 'var(--vp-teal)'
                            : achNum >= 70
                              ? 'var(--vp-amber)'
                              : 'var(--vp-rose)'
                        return (
                          <tr
                            key={rep.repId.toString()}
                            style={{ borderBottom: '1px solid var(--vp-border)' }}
                          >
                            <td
                              className="py-2.5 pr-4 font-semibold whitespace-nowrap"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              {rep.repName}
                            </td>
                            <td
                              className="py-2.5 pr-4"
                              style={{ color: 'var(--vp-text-secondary)' }}
                            >
                              {rep.totalVisits}
                            </td>
                            <td
                              className="py-2.5 pr-4"
                              style={{ color: 'var(--vp-text-secondary)' }}
                            >
                              {rep.completedVisits}
                            </td>
                            <td
                              className="py-2.5 pr-4 font-bold"
                              style={{
                                color:
                                  Number(completionRate) >= 80
                                    ? 'var(--vp-teal)'
                                    : 'var(--vp-amber)',
                              }}
                            >
                              {completionRate}%
                            </td>
                            <td
                              className="py-2.5 pr-4"
                              style={{ color: 'var(--vp-text-secondary)' }}
                            >
                              {rep.totalOrders}
                            </td>
                            <td
                              className="py-2.5 pr-4 font-bold"
                              style={{ color: 'var(--vp-teal)' }}
                            >
                              {fmt(Number(rep.totalRevenue))}
                            </td>
                            <td
                              className="py-2.5 pr-4"
                              style={{ color: 'var(--vp-text-secondary)' }}
                            >
                              {fmt(revPerVisit)}
                            </td>
                            <td className="py-2.5 font-bold" style={{ color: achColor }}>
                              {rep.achievementPct !== null ? `${achNum.toFixed(0)}%` : 'N/A'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Target achievement */}
            <div>
              <SectionHeader
                icon={<Target className="w-5 h-5" />}
                title="Target Achievement — Current Month"
                subtitle="Actual vs target visits with remaining and status"
                iconBg="var(--vp-teal-light)"
                iconColor="var(--vp-teal)"
              />
              {targetLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 skeleton-shimmer" />
                  ))}
                </div>
              ) : targets.length === 0 ? (
                <EmptyState icon={<Target />} message="No targets set for this month" />
              ) : (
                <div className="space-y-3">
                  {targets.map((t) => {
                    const achNum = Number(t.achievementPct ?? 0)
                    const pct = Math.min(achNum, 100)
                    const color = t.targetMet
                      ? 'var(--vp-teal)'
                      : achNum >= 70
                        ? 'var(--vp-amber)'
                        : 'var(--vp-rose)'
                    return (
                      <div
                        key={t.repId.toString()}
                        className="p-4 rounded-xl"
                        style={{
                          background: 'var(--vp-bg-surface-alt)',
                          border: '1px solid var(--vp-border)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: 'var(--vp-text-primary)' }}
                            >
                              {t.repName}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                              {t.month}/{t.year}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color }}>
                              {t.actualVisits} / {t.targetVisits}
                            </p>
                            <p className="text-xs font-semibold" style={{ color }}>
                              {achNum.toFixed(1)}% —{' '}
                              {t.targetMet ? '✓ Met' : `${t.remainingVisits} remaining`}
                            </p>
                          </div>
                        </div>
                        <div
                          className="w-full h-2.5 rounded-full"
                          style={{ background: 'var(--vp-bg-hover)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PRODUCTS TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div className="p-6 space-y-8">
            {productVel.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Units Sold',
                    value: productVel
                      .reduce((s, p) => s + Number(p.totalUnitsSold), 0)
                      .toLocaleString('en-IN'),
                    color: 'var(--vp-teal)',
                  },
                  {
                    label: 'Free Units Given',
                    value: productVel
                      .reduce((s, p) => s + Number(p.totalFreeUnits), 0)
                      .toLocaleString('en-IN'),
                    color: 'var(--vp-amber)',
                  },
                  {
                    label: 'Products Tracked',
                    value: productVel.length.toString(),
                    color: 'var(--vp-purple)',
                  },
                  {
                    label: 'Free Unit Rate',
                    value: (() => {
                      const ts = productVel.reduce((s, p) => s + Number(p.totalUnitsSold), 0)
                      const tf = productVel.reduce((s, p) => s + Number(p.totalFreeUnits), 0)
                      return ts > 0 ? `${((tf / ts) * 100).toFixed(1)}%` : '0%'
                    })(),
                    color: 'var(--vp-rose)',
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="p-4 rounded-xl"
                    style={{
                      background: 'var(--vp-bg-surface-alt)',
                      border: '1px solid var(--vp-border)',
                    }}
                  >
                    <p
                      className="text-xs font-medium mb-1"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      {kpi.label}
                    </p>
                    {productLoading ? (
                      <Skeleton className="h-6 w-20 skeleton-shimmer" />
                    ) : (
                      <p
                        className="text-lg font-bold"
                        style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}
                      >
                        {kpi.value}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div>
              <SectionHeader
                icon={<Package className="w-5 h-5" />}
                title="Units Sold vs Free Units"
                subtitle="Top 10 products — sold units vs scheme free units given"
                iconBg="var(--vp-purple-light)"
                iconColor="var(--vp-purple)"
              />
              {productLoading ? (
                <Skeleton className="h-56 skeleton-shimmer" />
              ) : productVel.length === 0 ? (
                <EmptyState icon={<Package />} message="No product data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={productVel.slice(0, 10)}
                    margin={{ top: 4, right: 8, left: 8, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vp-border)" />
                    <XAxis
                      dataKey="productName"
                      tick={{ fontSize: 10, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      angle={-30}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="totalUnitsSold"
                      name="Units Sold"
                      fill="var(--vp-purple)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="totalFreeUnits"
                      name="Free Units"
                      fill="var(--vp-amber)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue per unit */}
            <div>
              <SectionHeader
                icon={<TrendingUp className="w-5 h-5" />}
                title="Revenue Per Unit"
                subtitle="Which products generate most revenue per unit — profitability indicator"
                iconBg="var(--vp-teal-light)"
                iconColor="var(--vp-teal)"
              />
              {productLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 skeleton-shimmer" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[...productVel]
                    .map((p) => ({
                      ...p,
                      revPerUnit:
                        Number(p.totalUnitsSold) > 0
                          ? Number(p.totalRevenue) / Number(p.totalUnitsSold)
                          : 0,
                    }))
                    .sort((a, b) => b.revPerUnit - a.revPerUnit)
                    .map((p, i) => {
                      const max = [...productVel]
                        .map((x) => Number(x.totalRevenue) / Math.max(Number(x.totalUnitsSold), 1))
                        .reduce((a, b) => Math.max(a, b), 0)
                      const barPct = max > 0 ? (p.revPerUnit / max) * 100 : 0
                      return (
                        <div
                          key={p.productId.toString()}
                          className="p-3 rounded-xl"
                          style={{
                            background: 'var(--vp-bg-surface-alt)',
                            border: '1px solid var(--vp-border)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-bold w-4"
                                style={{ color: 'var(--vp-text-muted)' }}
                              >
                                {i + 1}
                              </span>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: 'var(--vp-text-primary)' }}
                              >
                                {p.productName}
                              </p>
                            </div>
                            <p className="text-sm font-bold" style={{ color: 'var(--vp-teal)' }}>
                              {fmt(p.revPerUnit)}/unit
                            </p>
                          </div>
                          <div
                            className="w-full h-1.5 rounded-full"
                            style={{ background: 'var(--vp-bg-hover)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${barPct}%`, background: 'var(--vp-teal)' }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Free units scheme cost */}
            {productVel.filter((p) => Number(p.totalFreeUnits) > 0).length > 0 && (
              <div>
                <SectionHeader
                  icon={<Zap className="w-5 h-5" />}
                  title="Scheme Cost Analysis — Free Units"
                  subtitle="Products with high free unit rates — schemes giving away the most stock"
                  iconBg="var(--vp-amber-light)"
                  iconColor="var(--vp-amber)"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                        {[
                          'Product',
                          'Sold',
                          'Free Given',
                          'Free Rate',
                          'Total Deducted',
                          'Revenue',
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left pb-2 pr-4 text-xs font-semibold"
                            style={{ color: 'var(--vp-text-muted)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...productVel]
                        .filter((p) => Number(p.totalFreeUnits) > 0)
                        .sort((a, b) => {
                          const rA =
                            Number(a.totalUnitsSold) > 0
                              ? Number(a.totalFreeUnits) / Number(a.totalUnitsSold)
                              : 0
                          const rB =
                            Number(b.totalUnitsSold) > 0
                              ? Number(b.totalFreeUnits) / Number(b.totalUnitsSold)
                              : 0
                          return rB - rA
                        })
                        .map((p) => {
                          const freeRate =
                            Number(p.totalUnitsSold) > 0
                              ? (
                                  (Number(p.totalFreeUnits) / Number(p.totalUnitsSold)) *
                                  100
                                ).toFixed(1)
                              : '0'
                          const isHigh = Number(freeRate) > 20
                          return (
                            <tr
                              key={p.productId.toString()}
                              style={{ borderBottom: '1px solid var(--vp-border)' }}
                            >
                              <td
                                className="py-2 pr-4 font-semibold"
                                style={{ color: 'var(--vp-text-primary)' }}
                              >
                                {p.productName}
                              </td>
                              <td
                                className="py-2 pr-4"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {p.totalUnitsSold}
                              </td>
                              <td className="py-2 pr-4" style={{ color: 'var(--vp-amber)' }}>
                                {p.totalFreeUnits}
                              </td>
                              <td
                                className="py-2 pr-4 font-bold"
                                style={{ color: isHigh ? 'var(--vp-rose)' : 'var(--vp-amber)' }}
                              >
                                {freeRate}% {isHigh && '⚠'}
                              </td>
                              <td
                                className="py-2 pr-4"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {p.totalUnitsDeducted}
                              </td>
                              <td className="py-2 font-bold" style={{ color: 'var(--vp-teal)' }}>
                                {fmt(Number(p.totalRevenue))}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Full product table */}
            <div>
              <SectionHeader
                icon={<FileText className="w-5 h-5" />}
                title="Complete Product Table"
                subtitle="All products with every metric"
                iconBg="var(--vp-rose-light)"
                iconColor="var(--vp-rose)"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                      {[
                        '#',
                        'Product',
                        'Molecule',
                        'HSN',
                        'Units Sold',
                        'Free',
                        'Total Deducted',
                        'Revenue',
                        'Rev/Unit',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left pb-2 pr-3 text-xs font-semibold whitespace-nowrap"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productVel.map((p, i) => (
                      <tr
                        key={p.productId.toString()}
                        style={{ borderBottom: '1px solid var(--vp-border)' }}
                      >
                        <td
                          className="py-2 pr-3 text-xs font-bold"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          {i + 1}
                        </td>
                        <td
                          className="py-2 pr-3 font-semibold whitespace-nowrap"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          {p.productName}
                        </td>
                        <td
                          className="py-2 pr-3 whitespace-nowrap"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          {p.molecule}
                        </td>
                        <td className="py-2 pr-3" style={{ color: 'var(--vp-text-muted)' }}>
                          {p.hsnCode}
                        </td>
                        <td className="py-2 pr-3 font-bold" style={{ color: 'var(--vp-purple)' }}>
                          {p.totalUnitsSold}
                        </td>
                        <td className="py-2 pr-3" style={{ color: 'var(--vp-amber)' }}>
                          {p.totalFreeUnits}
                        </td>
                        <td className="py-2 pr-3" style={{ color: 'var(--vp-text-secondary)' }}>
                          {p.totalUnitsDeducted}
                        </td>
                        <td className="py-2 pr-3 font-bold" style={{ color: 'var(--vp-teal)' }}>
                          {fmt(Number(p.totalRevenue))}
                        </td>
                        <td
                          className="py-2 font-bold"
                          style={{ color: 'var(--vp-text-secondary)' }}
                        >
                          {Number(p.totalUnitsSold) > 0
                            ? fmt(Number(p.totalRevenue) / Number(p.totalUnitsSold))
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* INVENTORY TAB                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'inventory' && (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: 'Total Inventory Value',
                  value: fmt(totalInvValue),
                  color: 'var(--vp-teal)',
                  loading: invLoading,
                },
                {
                  label: 'Near-Expiry Value at Risk',
                  value: fmt(totalNearExpiryValue),
                  color: 'var(--vp-amber)',
                  loading: nearExpiryLoading,
                },
                {
                  label: 'Near-Expiry Batches',
                  value: nearExpiry.length.toString(),
                  color: 'var(--vp-rose)',
                  loading: nearExpiryLoading,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                    {kpi.label}
                  </p>
                  {kpi.loading ? (
                    <Skeleton className="h-6 w-20 skeleton-shimmer" />
                  ) : (
                    <p
                      className="text-lg font-bold"
                      style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}
                    >
                      {kpi.value}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div>
              <SectionHeader
                icon={<Boxes className="w-5 h-5" />}
                title="Stock Value by Product"
                subtitle="Current units × dealer price — full inventory valuation"
                iconBg="var(--vp-teal-light)"
                iconColor="var(--vp-teal)"
              />
              {invLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 skeleton-shimmer" />
                  ))}
                </div>
              ) : inventoryVal.length === 0 ? (
                <EmptyState icon={<Boxes />} message="No inventory data" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                        {['Product', 'HSN', 'Dealer Price', 'Units in Stock', 'Total Value'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left pb-2 pr-4 text-xs font-semibold"
                              style={{ color: 'var(--vp-text-muted)' }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryVal.map((item) => (
                        <tr
                          key={item.productId.toString()}
                          style={{ borderBottom: '1px solid var(--vp-border)' }}
                        >
                          <td
                            className="py-2 pr-4 font-semibold"
                            style={{ color: 'var(--vp-text-primary)' }}
                          >
                            {item.productName}
                          </td>
                          <td className="py-2 pr-4" style={{ color: 'var(--vp-text-muted)' }}>
                            {item.hsnCode}
                          </td>
                          <td className="py-2 pr-4" style={{ color: 'var(--vp-text-secondary)' }}>
                            {fmtFull(Number(item.dealerPrice))}
                          </td>
                          <td className="py-2 pr-4 font-bold" style={{ color: 'var(--vp-purple)' }}>
                            {item.totalCurrentUnits}
                          </td>
                          <td className="py-2 font-bold" style={{ color: 'var(--vp-teal)' }}>
                            {fmt(Number(item.totalInventoryValue))}
                          </td>
                        </tr>
                      ))}
                      <tr
                        style={{
                          borderTop: '2px solid var(--vp-border)',
                          background: 'var(--vp-bg-surface-alt)',
                        }}
                      >
                        <td
                          colSpan={4}
                          className="py-2 pr-4 font-bold"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          TOTAL
                        </td>
                        <td className="py-2 font-bold" style={{ color: 'var(--vp-teal)' }}>
                          {fmt(totalInvValue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <SectionHeader
                icon={<Zap className="w-5 h-5" />}
                title="Near-Expiry Batches"
                subtitle="All batches expiring within 90 days — sorted by urgency"
                iconBg="var(--vp-amber-light)"
                iconColor="var(--vp-amber)"
              />
              {nearExpiryLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 skeleton-shimmer" />
                  ))}
                </div>
              ) : nearExpiry.length === 0 ? (
                <EmptyState icon={<Zap />} message="No near-expiry batches — all clear" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                        {[
                          'Product',
                          'Batch',
                          'Expiry Date',
                          'Days Left',
                          'Units',
                          'Dealer Price',
                          'Value at Risk',
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left pb-2 pr-4 text-xs font-semibold"
                            style={{ color: 'var(--vp-text-muted)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...nearExpiry]
                        .sort((a, b) => Number(a.daysUntilExpiry) - Number(b.daysUntilExpiry))
                        .map((item) => {
                          const urgent = Number(item.daysUntilExpiry) <= 30
                          return (
                            <tr
                              key={item.batchId.toString()}
                              style={{
                                borderBottom: '1px solid var(--vp-border)',
                                background: urgent ? 'rgba(245,158,11,0.05)' : 'transparent',
                              }}
                            >
                              <td
                                className="py-2 pr-4 font-semibold"
                                style={{ color: 'var(--vp-text-primary)' }}
                              >
                                {item.productName}
                              </td>
                              <td className="py-2 pr-4" style={{ color: 'var(--vp-text-muted)' }}>
                                {item.batchNumber}
                              </td>
                              <td
                                className="py-2 pr-4"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {item.expiryDate.toString()}
                              </td>
                              <td
                                className="py-2 pr-4 font-bold"
                                style={{ color: urgent ? 'var(--vp-rose)' : 'var(--vp-amber)' }}
                              >
                                {item.daysUntilExpiry}d
                              </td>
                              <td
                                className="py-2 pr-4"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {item.currentQuantity}
                              </td>
                              <td
                                className="py-2 pr-4"
                                style={{ color: 'var(--vp-text-secondary)' }}
                              >
                                {fmtFull(Number(item.dealerPrice))}
                              </td>
                              <td className="py-2 font-bold" style={{ color: 'var(--vp-amber)' }}>
                                {fmt(Number(item.valueAtRisk))}
                              </td>
                            </tr>
                          )
                        })}
                      <tr
                        style={{
                          borderTop: '2px solid var(--vp-border)',
                          background: 'var(--vp-bg-surface-alt)',
                        }}
                      >
                        <td
                          colSpan={6}
                          className="py-2 pr-4 font-bold"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          TOTAL AT RISK
                        </td>
                        <td className="py-2 font-bold" style={{ color: 'var(--vp-amber)' }}>
                          {fmt(totalNearExpiryValue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* RETURNS TAB                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'returns' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Return Value',
                  value: fmt(totalReturnValue),
                  color: 'var(--vp-rose)',
                  loading: returnsLoading,
                },
                {
                  label: 'Total Return Count',
                  value: totalReturnCount.toString(),
                  color: 'var(--vp-amber)',
                  loading: returnsLoading,
                },
                {
                  label: 'Chemist Returns',
                  value: fmt(returns.reduce((s, r) => s + Number(r.chemistReturnValue), 0)),
                  color: 'var(--vp-purple)',
                  loading: returnsLoading,
                },
                {
                  label: 'Stockist Returns',
                  value: fmt(returns.reduce((s, r) => s + Number(r.stockistReturnValue), 0)),
                  color: 'var(--vp-teal)',
                  loading: returnsLoading,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'var(--vp-bg-surface-alt)',
                    border: '1px solid var(--vp-border)',
                  }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                    {kpi.label}
                  </p>
                  {kpi.loading ? (
                    <Skeleton className="h-6 w-20 skeleton-shimmer" />
                  ) : (
                    <p
                      className="text-lg font-bold"
                      style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}
                    >
                      {kpi.value}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div>
              <SectionHeader
                icon={<RotateCcw className="w-5 h-5" />}
                title="Returns by Month"
                subtitle="Total return value split by chemist and stockist channel"
                iconBg="var(--vp-rose-light)"
                iconColor="var(--vp-rose)"
              />
              {returnsLoading ? (
                <Skeleton className="h-48 skeleton-shimmer" />
              ) : returns.length === 0 ? (
                <EmptyState icon={<RotateCcw />} message="No returns data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={returns} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vp-border)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--vp-text-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="chemistReturnValue"
                      name="Chemist Returns"
                      fill="var(--vp-purple)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="stockistReturnValue"
                      name="Stockist Returns"
                      fill="var(--vp-teal)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {returns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--vp-border)' }}>
                      {[
                        'Month',
                        'Total',
                        'Processed',
                        'Rejected',
                        'Total Value',
                        'Chemist',
                        'Stockist',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left pb-2 pr-4 text-xs font-semibold"
                          style={{ color: 'var(--vp-text-muted)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((row) => (
                      <tr key={row.month} style={{ borderBottom: '1px solid var(--vp-border)' }}>
                        <td
                          className="py-2 pr-4 font-medium"
                          style={{ color: 'var(--vp-text-primary)' }}
                        >
                          {row.month}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--vp-text-secondary)' }}>
                          {row.totalReturnCount}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--vp-teal)' }}>
                          {row.processedReturnCount}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--vp-rose)' }}>
                          {row.rejectedReturnCount}
                        </td>
                        <td className="py-2 pr-4 font-bold" style={{ color: 'var(--vp-rose)' }}>
                          {fmt(Number(row.totalReturnValue))}
                        </td>
                        <td className="py-2 pr-4" style={{ color: 'var(--vp-purple)' }}>
                          {fmt(Number(row.chemistReturnValue))}
                        </td>
                        <td className="py-2" style={{ color: 'var(--vp-teal)' }}>
                          {fmt(Number(row.stockistReturnValue))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* AI USAGE TAB — OWNER ONLY                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ai' && isOwner && (
          <div className="p-6 space-y-6">
            <SectionHeader
              icon={<Brain className="w-5 h-5" />}
              title="AI Usage & Cost Tracking"
              subtitle="OpenAI GPT-4o-mini spend and feature breakdown — OWNER only"
              iconBg="var(--vp-purple-light)"
              iconColor="var(--vp-purple)"
            />
            {aiLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 skeleton-shimmer" />
                ))}
              </div>
            ) : !aiUsage ? (
              <EmptyState icon={<Brain />} message="No AI usage recorded yet" />
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div
                    className="p-5 rounded-xl"
                    style={{
                      background: 'var(--vp-purple-light)',
                      border: '1px solid rgba(139,92,246,0.2)',
                    }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--vp-purple)' }}>
                      Total AI Spend (All Time)
                    </p>
                    <p
                      className="text-3xl font-bold"
                      style={{ color: 'var(--vp-purple)', fontFamily: 'var(--font-display)' }}
                    >
                      ${Number(aiUsage.totalCostUsd).toFixed(4)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--vp-purple)' }}>
                      {aiUsage.currency} · ~₹{(Number(aiUsage.totalCostUsd) * 83).toFixed(2)} INR
                    </p>
                  </div>
                  <div
                    className="p-5 rounded-xl"
                    style={{
                      background: 'var(--vp-teal-light)',
                      border: '1px solid rgba(0,196,154,0.2)',
                    }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--vp-teal)' }}>
                      Total AI Calls
                    </p>
                    <p
                      className="text-3xl font-bold"
                      style={{ color: 'var(--vp-teal)', fontFamily: 'var(--font-display)' }}
                    >
                      {Object.values(aiUsage.featureCallCounts).reduce((s, v) => s + Number(v), 0)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--vp-teal)' }}>
                      Across all 7 features
                    </p>
                  </div>
                  <div
                    className="p-5 rounded-xl"
                    style={{
                      background: 'var(--vp-amber-light)',
                      border: '1px solid rgba(245,158,11,0.2)',
                    }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--vp-amber)' }}>
                      Avg Cost per Call
                    </p>
                    <p
                      className="text-3xl font-bold"
                      style={{ color: 'var(--vp-amber)', fontFamily: 'var(--font-display)' }}
                    >
                      $
                      {(
                        Number(aiUsage.totalCostUsd) /
                        Math.max(
                          Object.values(aiUsage.featureCallCounts).reduce(
                            (s, v) => s + Number(v),
                            0
                          ),
                          1
                        )
                      ).toFixed(5)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--vp-amber)' }}>
                      GPT-4o-mini pricing
                    </p>
                  </div>
                </div>

                <div>
                  <h3
                    className="text-sm font-semibold mb-4"
                    style={{ color: 'var(--vp-text-primary)' }}
                  >
                    Feature Usage Breakdown
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {Object.entries(aiUsage.featureCallCounts).map(([feature, count]) => {
                        const total = Object.values(aiUsage.featureCallCounts).reduce(
                          (s, v) => s + Number(v),
                          0
                        )
                        const pct = total > 0 ? (Number(count) / total) * 100 : 0
                        const label = feature
                          .replace(/_/g, ' ')
                          .toLowerCase()
                          .replace(/\b\w/g, (c) => c.toUpperCase())
                        return (
                          <div
                            key={feature}
                            className="p-3 rounded-xl"
                            style={{
                              background: 'var(--vp-bg-surface-alt)',
                              border: '1px solid var(--vp-border)',
                            }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <p
                                className="text-xs font-semibold"
                                style={{ color: 'var(--vp-text-primary)' }}
                              >
                                {label}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                                  {pct.toFixed(1)}%
                                </p>
                                <p
                                  className="text-xs font-bold"
                                  style={{ color: 'var(--vp-purple)' }}
                                >
                                  {count} calls
                                </p>
                              </div>
                            </div>
                            <div
                              className="w-full h-1.5 rounded-full"
                              style={{ background: 'var(--vp-bg-hover)' }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: 'var(--vp-purple)' }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={Object.entries(aiUsage.featureCallCounts).map(
                              ([name, value]) => ({
                                name: name.replace(/_/g, ' '),
                                value: Number(value),
                              })
                            )}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            dataKey="value"
                            nameKey="name"
                          >
                            {Object.entries(aiUsage.featureCallCounts).map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} calls`]} />
                          <Legend formatter={(value) => value.replace(/_/g, ' ')} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
