import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Pill, Eye, EyeOff, Loader2, Brain, BarChart3, ClipboardList, FileText } from 'lucide-react'
import { useLoginMutation } from './authApi'
import { useAuth } from '@/shared/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').pipe(z.email('Enter a valid email address')),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

const features = [
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: 'Visit Management',
    desc: 'Track doctor visits, samples, and feedback in one place',
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: 'AI Intelligence',
    desc: 'Bilingual insights in English and Marathi powered by GPT',
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: 'GST Billing',
    desc: 'Auto-calculate CGST, SGST, IGST with HSN code support',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Analytics',
    desc: 'Revenue, rep performance, and inventory at a glance',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const [login, { isLoading }] = useLoginMutation()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data).unwrap()
      toast.success('Welcome back!')
      const redirect = searchParams.get('redirect')
      navigate(redirect ?? '/dashboard', { replace: true })
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.error(error?.data?.message ?? 'Login failed. Check your credentials.')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--vp-bg-base)' }}>
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-[45%] relative overflow-hidden"
        style={{ background: 'var(--vp-grad-primary)' }}
      >
        {/* Decorative circles */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            transform: 'translate(-30%, 30%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            {/* White bg with teal icon — pops against purple gradient */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: '#FFFFFF',
                boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
              }}
            >
              <Pill className="w-7 h-7" style={{ color: 'var(--vp-teal)' }} />
            </div>
            <div>
              <p
                className="font-bold text-2xl leading-none text-white"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
              >
                VedPharm
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                <p className="text-white/70 text-xs font-semibold tracking-widest uppercase">
                  CRM Platform
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero + features */}
        <div className="relative z-10">
          <h1
            className="text-4xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Smarter Pharma Sales,
            <br />
            <span className="text-yellow-200">All in One Place.</span>
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-sm mb-8">
            A complete pharmaceutical CRM built for Indian sales teams — manage doctors, visits,
            orders, and billing with AI-powered insights.
          </p>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <span className="text-white">{f.icon}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty bottom — clean, no text */}
        <div />
      </div>

      {/* ── Right panel ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden"
        style={{ background: 'var(--vp-bg-base)' }}
      >
        {/* Subtle background orbs */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0,196,154,0.07) 0%, transparent 70%)',
            transform: 'translate(20%, -20%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
            transform: 'translate(-20%, 20%)',
          }}
        />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden animate-fade-up">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--vp-grad-teal)' }}
            >
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: 'var(--vp-text-primary)' }}>
                VedPharm
              </p>
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                CRM Platform
              </p>
            </div>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-8 sm:p-10 animate-fade-up"
            style={{
              background: 'var(--vp-bg-surface)',
              border: '1px solid var(--vp-border)',
              boxShadow: 'var(--vp-shadow-lg)',
            }}
          >
            {/* Card header */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--vp-grad-primary)' }}
              >
                <Pill className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2
                  className="text-2xl font-bold leading-tight"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--vp-text-primary)' }}
                >
                  Welcome back
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
                  Sign in to your VedPharm account
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Email address
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="input-dark"
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--vp-rose)' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className="input-dark pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                    style={{ color: 'var(--vp-text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--vp-rose)' }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full mt-2"
                style={{ opacity: isLoading ? 0.8 : 1 }}
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </span>
              </button>
            </form>

            <div
              className="mt-6 pt-5 text-center"
              style={{ borderTop: '1px solid var(--vp-border)' }}
            >
              <p className="text-xs" style={{ color: 'var(--vp-text-muted)' }}>
                Access is restricted to authorized personnel only.
                <br />
                Contact your administrator for account creation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
