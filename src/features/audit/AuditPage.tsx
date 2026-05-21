// src/features/audit/AuditPage.tsx
import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Shield, Search, CheckCircle2, XCircle, Filter } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetAuditLogsQuery } from '@/features/audit/auditApi'
import type { AuditLogDto } from '@/types/audit'

const ACTION_GROUPS = [
  'ALL',
  'RETURN_PROCESSED',
  'RETURN_REJECTED',
  'CREDIT_NOTE_APPLIED',
  'INVOICE_GENERATED',
  'PAYMENT_RECORDED',
  'ORDER_DISPATCHED',
]

export default function AuditPage() {
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')

  const { data, isLoading } = useGetAuditLogsQuery()
  const logs: AuditLogDto[] = useMemo(() => data?.data ?? [], [data])

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        (log.entityType?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchesResult = resultFilter === 'ALL' || log.result === resultFilter
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
      return matchesSearch && matchesResult && matchesAction
    })
  }, [logs, search, resultFilter, actionFilter])

  const successCount = logs.filter((l) => l.result === 'SUCCESS').length
  const failureCount = logs.filter((l) => l.result === 'FAILURE').length

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--vp-purple-light)' }}
        >
          <Shield className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            Audit Log
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            Complete record of all system actions — Owner access only
          </p>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Events',
            value: logs.length,
            color: 'var(--vp-purple)',
            bg: 'var(--vp-purple-light)',
            icon: <Shield className="w-5 h-5" />,
          },
          {
            label: 'Successful',
            value: successCount,
            color: 'var(--vp-teal)',
            bg: 'var(--vp-teal-light)',
            icon: <CheckCircle2 className="w-5 h-5" />,
          },
          {
            label: 'Failed',
            value: failureCount,
            color: 'var(--vp-rose)',
            bg: 'var(--vp-rose-light)',
            icon: <XCircle className="w-5 h-5" />,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="vp-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: kpi.bg }}
              >
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--vp-text-muted)' }}>
                  {kpi.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-6 w-10 skeleton-shimmer mt-1" />
                ) : (
                  <p
                    className="text-xl font-bold"
                    style={{ color: kpi.color, fontFamily: 'var(--font-display)' }}
                  >
                    {kpi.value}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="vp-card p-4 space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--vp-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by user email, action, or entity type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--vp-text-muted)' }}
          >
            <Filter className="w-3.5 h-3.5" /> Result:
          </span>
          {(['ALL', 'SUCCESS', 'FAILURE'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setResultFilter(r)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background:
                  resultFilter === r
                    ? r === 'FAILURE'
                      ? 'var(--vp-rose-light)'
                      : 'var(--vp-teal-light)'
                    : 'transparent',
                color:
                  resultFilter === r
                    ? r === 'FAILURE'
                      ? 'var(--vp-rose)'
                      : 'var(--vp-teal)'
                    : 'var(--vp-text-muted)',
                border:
                  resultFilter === r
                    ? r === 'FAILURE'
                      ? '1px solid rgba(244,63,94,0.3)'
                      : '1px solid rgba(0,196,154,0.3)'
                    : '1px solid var(--vp-border)',
              }}
            >
              {r === 'ALL' ? 'All Results' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--vp-text-muted)' }}
          >
            <Filter className="w-3.5 h-3.5" /> Action:
          </span>
          {ACTION_GROUPS.map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: actionFilter === a ? 'var(--vp-purple-light)' : 'transparent',
                color: actionFilter === a ? 'var(--vp-purple)' : 'var(--vp-text-muted)',
                border:
                  actionFilter === a
                    ? '1px solid rgba(139,92,246,0.3)'
                    : '1px solid var(--vp-border)',
              }}
            >
              {a === 'ALL' ? 'All Actions' : a.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Log Table ────────────────────────────────────────────────────────── */}
      <div className="vp-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 skeleton-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-10 h-10 mb-3" style={{ color: 'var(--vp-text-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              {search || resultFilter !== 'ALL' || actionFilter !== 'ALL'
                ? 'No logs match your filters'
                : 'No audit events yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--vp-border)',
                    background: 'var(--vp-bg-surface-alt)',
                  }}
                >
                  {['Result', 'Action', 'Entity', 'User', 'Timestamp', 'Error'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--vp-border)' }}>
                    <td className="px-4 py-3">
                      {log.result === 'SUCCESS' ? (
                        <span
                          className="flex items-center gap-1 text-xs font-semibold"
                          style={{ color: 'var(--vp-teal)' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          SUCCESS
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-xs font-semibold"
                          style={{ color: 'var(--vp-rose)' }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          FAILURE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p
                        className="text-xs font-semibold whitespace-nowrap"
                        style={{ color: 'var(--vp-text-primary)' }}
                      >
                        {log.action}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {log.entityType ? (
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--vp-text-secondary)' }}
                          >
                            {log.entityType}
                          </p>
                          {log.entityId && (
                            <p
                              className="text-xs font-mono"
                              style={{ color: 'var(--vp-text-muted)' }}
                            >
                              {log.entityId.toString().slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          —
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: 'var(--vp-text-secondary)' }}>
                        {log.userEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                        {format(parseISO(log.createdAt), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                        {format(parseISO(log.createdAt), 'HH:mm:ss')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {log.errorMessage ? (
                        <p
                          className="text-xs max-w-xs truncate"
                          style={{ color: 'var(--vp-rose)' }}
                          title={log.errorMessage}
                        >
                          {log.errorMessage}
                        </p>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                          —
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--vp-border)' }}>
            <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
              Showing {filtered.length} of {logs.length} events
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
