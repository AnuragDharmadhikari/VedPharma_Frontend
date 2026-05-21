// src/features/ai/AiPage.tsx
import { useState, useMemo } from 'react'
import {
  Brain,
  Stethoscope,
  ClipboardList,
  Building2,
  MapPin,
  ShoppingCart,
  FileText,
  Loader2,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Languages,
} from 'lucide-react'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  useGetDoctorEngagementQuery,
  useGetVisitBriefingQuery,
  useGetStockistPaymentRiskQuery,
  useGetChemistPaymentRiskQuery,
  useGetTerritoryNarrativeQuery,
  useGetOrderRecommendationQuery,
  useGetPaymentFollowUpQuery,
} from './aiApi'
import { useGetAllDoctorsQuery, useGetVisitsByDoctorQuery } from '@/features/doctors/doctorsApi'
import { useGetAllStockistsQuery } from '@/features/stockists/stockistsApi'
import { useGetAllChemistsQuery } from '@/features/chemists/chemistsApi'
import { useGetAllTerritoriesQuery } from '@/features/territories/territoriesApi'
import { useGetOutstandingInvoicesQuery } from '@/features/analytics/analyticsApi'

// ── Feature card ───────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  subtitle,
  badge,
  iconBg,
  iconColor,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
  iconBg: string
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <div className="vp-card p-6">
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--vp-text-primary)' }}>
              {title}
            </h2>
            {badge && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: iconBg, color: iconColor }}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Risk badge ─────────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: string }) {
  const config = {
    LOW: {
      color: 'var(--vp-teal)',
      bg: 'var(--vp-teal-light)',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    MEDIUM: {
      color: 'var(--vp-amber)',
      bg: 'var(--vp-amber-light)',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    HIGH: {
      color: 'var(--vp-rose)',
      bg: 'var(--vp-rose-light)',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  }[level] ?? { color: 'var(--vp-text-muted)', bg: 'var(--vp-bg-surface-alt)', icon: null }
  return (
    <span
      className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl"
      style={{ background: config.bg, color: config.color }}
    >
      {config.icon}
      {level}
    </span>
  )
}

// ── AI Result box ──────────────────────────────────────────────────────────────
function AiResultBox({
  children,
  color = 'var(--vp-teal)',
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <div
      className="p-4 rounded-xl mt-4 space-y-2"
      style={{ background: 'var(--vp-bg-surface-alt)', borderLeft: `3px solid ${color}` }}
    >
      {children}
    </div>
  )
}

// ── Label ──────────────────────────────────────────────────────────────────────
function Label({ text }: { text: string }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-wider mb-1 mt-2"
      style={{ color: 'var(--vp-text-muted)' }}
    >
      {text}
    </p>
  )
}

// ── AI text ────────────────────────────────────────────────────────────────────
function AiText({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--vp-text-primary)' }}>
      {text}
    </p>
  )
}

// ── Language toggle ────────────────────────────────────────────────────────────
function LangToggle({
  lang,
  setLang,
  activeColor,
}: {
  lang: 'en' | 'mr'
  setLang: (l: 'en' | 'mr') => void
  activeColor: string
}) {
  return (
    <div className="flex gap-2 mt-3">
      {(['en', 'mr'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
          style={{
            background: lang === l ? `var(--vp-${activeColor}-light)` : 'transparent',
            color: lang === l ? `var(--vp-${activeColor})` : 'var(--vp-text-muted)',
            border:
              lang === l ? `1px solid var(--vp-${activeColor})` : '1px solid var(--vp-border)',
          }}
        >
          <Languages className="w-3.5 h-3.5" />
          {l === 'en' ? 'English' : 'मराठी'}
        </button>
      ))}
    </div>
  )
}

export default function AiPage() {
  const { isOwner, isOwnerOrManager } = useAuth()

  // ── Selector state ─────────────────────────────────────────────────────────
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [visitDoctorId, setVisitDoctorId] = useState('')
  const [selectedVisitId, setSelectedVisitId] = useState('')
  const [selectedStockistId, setSelectedStockistId] = useState('')
  const [selectedChemistId, setSelectedChemistId] = useState('')
  const [selectedTerritoryId, setSelectedTerritoryId] = useState('')
  const [orderChemistId, setOrderChemistId] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')

  // ── Language state per feature ─────────────────────────────────────────────
  const [engageLang, setEngageLang] = useState<'en' | 'mr'>('en')
  const [briefingLang, setBriefingLang] = useState<'en' | 'mr'>('en')
  const [territoryLang, setTerritoryLang] = useState<'en' | 'mr'>('en')

  // ── Reference data ─────────────────────────────────────────────────────────
  const { data: doctorsData } = useGetAllDoctorsQuery()
  const { data: visitsData } = useGetVisitsByDoctorQuery(visitDoctorId, { skip: !visitDoctorId })
  const { data: stockistsData } = useGetAllStockistsQuery()
  const { data: chemistsData } = useGetAllChemistsQuery()
  const { data: territoriesData } = useGetAllTerritoriesQuery()
  const { data: outstandingData } = useGetOutstandingInvoicesQuery()

  const doctors = useMemo(() => doctorsData?.data?.filter((d) => d.isActive) ?? [], [doctorsData])
  const visits = useMemo(() => visitsData?.data ?? [], [visitsData])
  const stockists = useMemo(
    () => stockistsData?.data?.filter((s) => s.isActive) ?? [],
    [stockistsData]
  )
  const chemists = useMemo(
    () => chemistsData?.data?.filter((c) => c.isActive) ?? [],
    [chemistsData]
  )
  const territories = useMemo(
    () => territoriesData?.data?.filter((t) => t.isActive) ?? [],
    [territoriesData]
  )
  const outstanding = useMemo(() => outstandingData?.data ?? [], [outstandingData])

  // ── AI queries ─────────────────────────────────────────────────────────────
  const {
    data: engagementData,
    isLoading: engagementLoading,
    isFetching: engagementFetching,
  } = useGetDoctorEngagementQuery(selectedDoctorId, { skip: !selectedDoctorId })

  const {
    data: briefingData,
    isLoading: briefingLoading,
    isFetching: briefingFetching,
  } = useGetVisitBriefingQuery(selectedVisitId, { skip: !selectedVisitId })

  const {
    data: stockistRiskData,
    isLoading: stockistRiskLoading,
    isFetching: stockistRiskFetching,
  } = useGetStockistPaymentRiskQuery(selectedStockistId, { skip: !selectedStockistId || !isOwner })

  const {
    data: chemistRiskData,
    isLoading: chemistRiskLoading,
    isFetching: chemistRiskFetching,
  } = useGetChemistPaymentRiskQuery(selectedChemistId, { skip: !selectedChemistId || !isOwner })

  const {
    data: narrativeData,
    isLoading: narrativeLoading,
    isFetching: narrativeFetching,
  } = useGetTerritoryNarrativeQuery(selectedTerritoryId, {
    skip: !selectedTerritoryId || !isOwnerOrManager,
  })

  const {
    data: recommendData,
    isLoading: recommendLoading,
    isFetching: recommendFetching,
  } = useGetOrderRecommendationQuery(orderChemistId, { skip: !orderChemistId })

  const {
    data: followUpData,
    isLoading: followUpLoading,
    isFetching: followUpFetching,
  } = useGetPaymentFollowUpQuery(selectedInvoiceId, { skip: !selectedInvoiceId || !isOwner })

  const engagement = engagementData?.data
  const briefing = briefingData?.data
  const stockistRisk = stockistRiskData?.data
  const chemistRisk = chemistRiskData?.data
  const narrative = narrativeData?.data
  const recommend = recommendData?.data
  const followUp = followUpData?.data

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--vp-purple-light)' }}
          >
            <Brain className="w-5 h-5" style={{ color: 'var(--vp-purple)' }} />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
          >
            AI Intelligence
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--vp-text-muted)' }}>
          GPT-4o-mini powered insights — bilingual English and Marathi across 7 features
        </p>
      </div>

      {/* ── Feature grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 1. Doctor Engagement ───────────────────────────────────────── */}
        <FeatureCard
          icon={<Stethoscope className="w-5 h-5" />}
          title="Doctor Engagement Score"
          subtitle="0–100 engagement score with bilingual analysis and recommendations"
          iconBg="var(--vp-teal-light)"
          iconColor="var(--vp-teal)"
          badge="All Roles"
        >
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="input-dark w-full"
          >
            <option value="">Select a doctor...</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.specialty}
              </option>
            ))}
          </select>

          {selectedDoctorId && (
            <LangToggle lang={engageLang} setLang={setEngageLang} activeColor="teal" />
          )}

          {engagementLoading || engagementFetching ? (
            <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--vp-teal)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Analysing engagement patterns...</p>
            </div>
          ) : engagement ? (
            <AiResultBox color="var(--vp-teal)">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label text="Engagement Score" />
                  <p
                    className="text-3xl font-bold"
                    style={{ color: 'var(--vp-teal)', fontFamily: 'var(--font-display)' }}
                  >
                    {engagement.engagementScore}
                    <span className="text-base font-normal">/100</span>
                  </p>
                </div>
                <span
                  className="text-sm font-bold px-3 py-1.5 rounded-xl"
                  style={{ background: 'var(--vp-teal-light)', color: 'var(--vp-teal)' }}
                >
                  {engagement.engagementLevel}
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full mb-2"
                style={{ background: 'var(--vp-bg-hover)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${engagement.engagementScore}%`, background: 'var(--vp-teal)' }}
                />
              </div>
              <Label text="Analysis" />
              <AiText text={engageLang === 'en' ? engagement.analysis : engagement.analysisMr} />
              <Label text="Recommendations" />
              <AiText
                text={
                  engageLang === 'en' ? engagement.recommendations : engagement.recommendationsMr
                }
              />
            </AiResultBox>
          ) : !selectedDoctorId ? (
            <p className="text-xs mt-3" style={{ color: 'var(--vp-text-muted)' }}>
              Select a doctor to load their engagement analysis.
            </p>
          ) : null}
        </FeatureCard>

        {/* ── 2. Visit Briefing ──────────────────────────────────────────── */}
        <FeatureCard
          icon={<ClipboardList className="w-5 h-5" />}
          title="Pre-Visit Briefing"
          subtitle="AI-generated pre-visit intelligence — product focus, talking points, strategy"
          iconBg="var(--vp-purple-light)"
          iconColor="var(--vp-purple)"
          badge="All Roles"
        >
          <select
            value={visitDoctorId}
            onChange={(e) => {
              setVisitDoctorId(e.target.value)
              setSelectedVisitId('')
            }}
            className="input-dark w-full mb-2"
          >
            <option value="">Select doctor first...</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.specialty}
              </option>
            ))}
          </select>

          {visitDoctorId && (
            <select
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Then select a visit...</option>
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.visitDate} — {v.status}
                </option>
              ))}
            </select>
          )}

          {selectedVisitId && (
            <LangToggle lang={briefingLang} setLang={setBriefingLang} activeColor="purple" />
          )}

          {briefingLoading || briefingFetching ? (
            <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--vp-purple)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Generating visit intelligence...</p>
            </div>
          ) : briefing ? (
            <AiResultBox color="var(--vp-purple)">
              <Label text="Last Visit Summary" />
              <AiText
                text={
                  briefingLang === 'en' ? briefing.lastVisitSummary : briefing.lastVisitSummaryMr
                }
              />
              <Label text="Product Focus" />
              <AiText
                text={briefingLang === 'en' ? briefing.productFocus : briefing.productFocusMr}
              />
              <Label text="Talking Points" />
              <AiText
                text={briefingLang === 'en' ? briefing.talkingPoints : briefing.talkingPointsMr}
              />
              <Label text="Active Schemes" />
              <AiText
                text={briefingLang === 'en' ? briefing.activeSchemes : briefing.activeSchemesMr}
              />
              <Label text="Visit Strategy" />
              <AiText
                text={briefingLang === 'en' ? briefing.visitStrategy : briefing.visitStrategyMr}
              />
            </AiResultBox>
          ) : !selectedVisitId ? (
            <p className="text-xs mt-3" style={{ color: 'var(--vp-text-muted)' }}>
              Select a doctor and visit to generate briefing.
            </p>
          ) : null}
        </FeatureCard>

        {/* ── 3. Stockist Payment Risk — OWNER only ──────────────────────── */}
        {isOwner && (
          <FeatureCard
            icon={<Building2 className="w-5 h-5" />}
            title="Stockist Payment Risk"
            subtitle="AI payment risk assessment LOW / MEDIUM / HIGH with bilingual reasoning"
            iconBg="var(--vp-amber-light)"
            iconColor="var(--vp-amber)"
            badge="Owner Only"
          >
            <select
              value={selectedStockistId}
              onChange={(e) => setSelectedStockistId(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Select a stockist...</option>
              {stockists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firmName} — {s.city}
                </option>
              ))}
            </select>

            {stockistRiskLoading || stockistRiskFetching ? (
              <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--vp-amber)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Assessing payment risk...</p>
              </div>
            ) : stockistRisk ? (
              <AiResultBox color="var(--vp-amber)">
                <div className="flex items-center justify-between mb-2">
                  <Label text="Risk Level" />
                  <RiskBadge level={stockistRisk.riskLevel} />
                </div>
                <div
                  className="w-full h-2 rounded-full mb-2"
                  style={{ background: 'var(--vp-bg-hover)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${stockistRisk.riskScore}%`,
                      background:
                        stockistRisk.riskLevel === 'HIGH'
                          ? 'var(--vp-rose)'
                          : stockistRisk.riskLevel === 'MEDIUM'
                            ? 'var(--vp-amber)'
                            : 'var(--vp-teal)',
                    }}
                  />
                </div>
                <p className="text-xs mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Outstanding: ₹{Number(stockistRisk.totalOutstanding).toFixed(0)} · Avg payment:{' '}
                  {stockistRisk.averagePaymentDays} days
                </p>
                <Label text="Risk Analysis" />
                <AiText text={stockistRisk.riskAnalysis} />
                <Label text="मराठी विश्लेषण" />
                <AiText text={stockistRisk.riskAnalysisMr} />
                <Label text="Recommended Action" />
                <AiText text={stockistRisk.recommendedAction} />
              </AiResultBox>
            ) : (
              <p className="text-xs mt-3" style={{ color: 'var(--vp-text-muted)' }}>
                Select a stockist to assess their payment risk.
              </p>
            )}
          </FeatureCard>
        )}

        {/* ── 4. Chemist Payment Risk — OWNER only ───────────────────────── */}
        {isOwner && (
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Chemist Payment Risk"
            subtitle="AI payment risk assessment LOW / MEDIUM / HIGH with bilingual reasoning"
            iconBg="var(--vp-rose-light)"
            iconColor="var(--vp-rose)"
            badge="Owner Only"
          >
            <select
              value={selectedChemistId}
              onChange={(e) => setSelectedChemistId(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Select a chemist...</option>
              {chemists.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firmName} — {c.city}
                </option>
              ))}
            </select>

            {chemistRiskLoading || chemistRiskFetching ? (
              <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--vp-rose)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Assessing payment risk...</p>
              </div>
            ) : chemistRisk ? (
              <AiResultBox color="var(--vp-rose)">
                <div className="flex items-center justify-between mb-2">
                  <Label text="Risk Level" />
                  <RiskBadge level={chemistRisk.riskLevel} />
                </div>
                <div
                  className="w-full h-2 rounded-full mb-2"
                  style={{ background: 'var(--vp-bg-hover)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${chemistRisk.riskScore}%`,
                      background:
                        chemistRisk.riskLevel === 'HIGH'
                          ? 'var(--vp-rose)'
                          : chemistRisk.riskLevel === 'MEDIUM'
                            ? 'var(--vp-amber)'
                            : 'var(--vp-teal)',
                    }}
                  />
                </div>
                <p className="text-xs mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                  Outstanding: ₹{Number(chemistRisk.totalOutstanding).toFixed(0)} · Avg payment:{' '}
                  {chemistRisk.averagePaymentDays} days
                </p>
                <Label text="Risk Analysis" />
                <AiText text={chemistRisk.riskAnalysis} />
                <Label text="मराठी विश्लेषण" />
                <AiText text={chemistRisk.riskAnalysisMr} />
                <Label text="Recommended Action" />
                <AiText text={chemistRisk.recommendedAction} />
              </AiResultBox>
            ) : (
              <p className="text-xs mt-3" style={{ color: 'var(--vp-text-muted)' }}>
                Select a chemist to assess their payment risk.
              </p>
            )}
          </FeatureCard>
        )}

        {/* ── 5. Territory Narrative — OWNER/MANAGER ─────────────────────── */}
        {isOwnerOrManager && (
          <FeatureCard
            icon={<MapPin className="w-5 h-5" />}
            title="Territory Executive Narrative"
            subtitle="AI narrative with strengths, concerns, and recommendations — bilingual"
            iconBg="var(--vp-teal-light)"
            iconColor="var(--vp-teal)"
            badge="Owner + Manager"
          >
            <select
              value={selectedTerritoryId}
              onChange={(e) => setSelectedTerritoryId(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Select a territory...</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.state}
                </option>
              ))}
            </select>

            {selectedTerritoryId && (
              <LangToggle lang={territoryLang} setLang={setTerritoryLang} activeColor="teal" />
            )}

            {narrativeLoading || narrativeFetching ? (
              <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--vp-teal)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Generating territory narrative...</p>
              </div>
            ) : narrative ? (
              <AiResultBox color="var(--vp-teal)">
                <p className="text-xs mb-2" style={{ color: 'var(--vp-text-muted)' }}>
                  {narrative.territoryName} · {narrative.period}
                </p>
                <Label text="Narrative" />
                <AiText
                  text={territoryLang === 'en' ? narrative.narrative : narrative.narrativeMr}
                />
                <Label text="Strengths" />
                <AiText
                  text={territoryLang === 'en' ? narrative.strengths : narrative.strengthsMr}
                />
                <Label text="Concerns" />
                <AiText text={territoryLang === 'en' ? narrative.concerns : narrative.concernsMr} />
                <Label text="Recommendations" />
                <AiText
                  text={
                    territoryLang === 'en' ? narrative.recommendations : narrative.recommendationsMr
                  }
                />
              </AiResultBox>
            ) : (
              <p className="text-xs mt-3" style={{ color: 'var(--vp-text-muted)' }}>
                Select a territory to generate its executive narrative.
              </p>
            )}
          </FeatureCard>
        )}

        {/* ── 6. Order Recommendation ────────────────────────────────────── */}
        <FeatureCard
          icon={<ShoppingCart className="w-5 h-5" />}
          title="Smart Order Recommendation"
          subtitle="AI recommends products and quantities based on chemist purchase history"
          iconBg="var(--vp-purple-light)"
          iconColor="var(--vp-purple)"
          badge="Owner + Rep"
        >
          <select
            value={orderChemistId}
            onChange={(e) => setOrderChemistId(e.target.value)}
            className="input-dark w-full"
          >
            <option value="">Select a chemist...</option>
            {chemists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firmName} — {c.city}
              </option>
            ))}
          </select>

          {recommendLoading || recommendFetching ? (
            <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--vp-purple)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Generating order recommendations...</p>
            </div>
          ) : recommend ? (
            <AiResultBox color="var(--vp-purple)">
              <p className="text-xs mb-1" style={{ color: 'var(--vp-text-muted)' }}>
                {recommend.chemistName}
              </p>
              <Label text="Recommended Products" />
              <AiText text={recommend.recommendedProducts} />
              <Label text="मराठी शिफारस" />
              <AiText text={recommend.recommendedProductsMr} />
              <Label text="Reasoning" />
              <AiText text={recommend.reasoning} />
              {recommend.applicableSchemes && (
                <>
                  <Label text="Applicable Schemes" />
                  <AiText text={recommend.applicableSchemes} />
                </>
              )}
              {recommend.estimatedOrderValue && (
                <>
                  <Label text="Estimated Order Value" />
                  <p className="text-sm font-bold" style={{ color: 'var(--vp-teal)' }}>
                    {recommend.estimatedOrderValue}
                  </p>
                </>
              )}
            </AiResultBox>
          ) : (
            <p className="text-xs mt-3" style={{ color: 'var(--vp-text-muted)' }}>
              Select a chemist to get product recommendations.
            </p>
          )}
        </FeatureCard>

        {/* ── 7. Payment Follow-Up — OWNER only ──────────────────────────── */}
        {isOwner && (
          <FeatureCard
            icon={<FileText className="w-5 h-5" />}
            title="Payment Follow-Up Message"
            subtitle="AI generates GENTLE / FIRM / URGENT bilingual follow-up for overdue invoices"
            iconBg="var(--vp-amber-light)"
            iconColor="var(--vp-amber)"
            badge="Owner Only"
          >
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">Select outstanding invoice...</option>
              {outstanding.map((inv) => (
                <option key={inv.invoiceId.toString()} value={inv.invoiceId.toString()}>
                  {inv.invoiceNumber} — {inv.billedToName} — ₹
                  {Number(inv.outstandingAmount).toFixed(0)} due
                </option>
              ))}
            </select>

            {followUpLoading || followUpFetching ? (
              <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--vp-amber)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Crafting follow-up message...</p>
              </div>
            ) : followUp ? (
              <AiResultBox color="var(--vp-amber)">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                      {followUp.invoiceNumber} · {followUp.daysOverdue} days overdue
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        followUp.messageTone === 'URGENT'
                          ? 'var(--vp-rose-light)'
                          : followUp.messageTone === 'FIRM'
                            ? 'var(--vp-amber-light)'
                            : 'var(--vp-teal-light)',
                      color:
                        followUp.messageTone === 'URGENT'
                          ? 'var(--vp-rose)'
                          : followUp.messageTone === 'FIRM'
                            ? 'var(--vp-amber)'
                            : 'var(--vp-teal)',
                    }}
                  >
                    {followUp.messageTone}
                  </span>
                </div>
                <Label text="English Message" />
                <div
                  className="p-3 rounded-lg text-sm leading-relaxed"
                  style={{
                    background: 'var(--vp-bg-surface)',
                    border: '1px solid var(--vp-border)',
                    color: 'var(--vp-text-primary)',
                  }}
                >
                  {followUp.followUpMessage}
                </div>
                {followUp.followUpMessageMr && (
                  <>
                    <Label text="मराठी संदेश" />
                    <div
                      className="p-3 rounded-lg text-sm leading-relaxed"
                      style={{
                        background: 'var(--vp-bg-surface)',
                        border: '1px solid var(--vp-border)',
                        color: 'var(--vp-text-primary)',
                      }}
                    >
                      {followUp.followUpMessageMr}
                    </div>
                  </>
                )}
              </AiResultBox>
            ) : (
              <p className="text-xs mt-3" style={{ color: 'var(--vp-text-muted)' }}>
                Select an outstanding invoice to generate a follow-up message.
              </p>
            )}
          </FeatureCard>
        )}
      </div>
    </div>
  )
}
