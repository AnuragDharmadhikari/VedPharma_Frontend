import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  LayoutDashboard,
  Users,
  UserRound,
  MapPin,
  Pill,
  Warehouse,
  ClipboardList,
  ShoppingCart,
  FileText,
  CreditCard,
  RotateCcw,
  Tag,
  Target,
  BarChart3,
  Brain,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Menu,
  X,
  Building2,
  Stethoscope,
  FlaskConical,
  Sun,
  Moon,
} from 'lucide-react'
import { logout } from '@/features/auth/authSlice'
import { useLogoutMutation } from '@/features/auth/authApi'
import { useAuth } from '@/shared/hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useLayout } from '@/shared/components/LayoutContext'
import { useTheme } from '@/shared/hooks/useTheme'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles?: Array<'OWNER' | 'MANAGER' | 'REP'>
}

const navSections = [
  {
    title: 'Core',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    ] as NavItem[],
  },
  {
    title: 'Field Operations',
    items: [
      { label: 'Doctors', path: '/doctors', icon: <Stethoscope className="w-4 h-4" /> },
      { label: 'Chemists', path: '/chemists', icon: <FlaskConical className="w-4 h-4" /> },
      { label: 'Visits', path: '/visits', icon: <ClipboardList className="w-4 h-4" /> },
      { label: 'Orders', path: '/orders', icon: <ShoppingCart className="w-4 h-4" /> },
      { label: 'Products', path: '/products', icon: <Pill className="w-4 h-4" /> },
      { label: 'Inventory', path: '/inventory', icon: <Warehouse className="w-4 h-4" /> },
    ] as NavItem[],
  },
  {
    title: 'Business',
    items: [
      {
        label: 'Stockists',
        path: '/stockists',
        icon: <Building2 className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Invoices',
        path: '/invoices',
        icon: <FileText className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Payments',
        path: '/payments',
        icon: <CreditCard className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Returns',
        path: '/returns',
        icon: <RotateCcw className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Schemes',
        path: '/schemes',
        icon: <Tag className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Territories',
        path: '/territories',
        icon: <MapPin className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Targets',
        path: '/targets',
        icon: <Target className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Analytics',
        path: '/analytics',
        icon: <BarChart3 className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'AI Intelligence',
        path: '/ai',
        icon: <Brain className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
    ] as NavItem[],
  },
  {
    title: 'Admin',
    items: [
      {
        label: 'Users',
        path: '/users',
        icon: <Users className="w-4 h-4" />,
        roles: ['OWNER', 'MANAGER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
      {
        label: 'Audit Log',
        path: '/audit',
        icon: <Shield className="w-4 h-4" />,
        roles: ['OWNER'] as Array<'OWNER' | 'MANAGER' | 'REP'>,
      },
    ] as NavItem[],
  },
]

interface SidebarContentProps {
  collapsed: boolean
  role: string | undefined
  onNavClick: () => void
}

function SidebarContent({ collapsed, role, onNavClick }: SidebarContentProps) {
  const isItemVisible = (item: NavItem) => {
    if (!item.roles) return true
    return item.roles.includes(role as 'OWNER' | 'MANAGER' | 'REP')
  }

  return (
    <>
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-14 shrink-0"
        style={{ borderBottom: '1px solid var(--vp-border)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 animate-pulse-ring"
          style={{ background: 'var(--vp-grad-teal)' }}
        >
          <Pill className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p
              className="text-sm font-bold leading-none"
              style={{ color: 'var(--vp-text-primary)' }}
            >
              VedPharm
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--vp-text-muted)' }}>
              CRM Platform
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 min-h-0">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(isItemVisible)
          if (visibleItems.length === 0) return null
          return (
            <div key={section.title}>
              {!collapsed && (
                <p
                  className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--vp-text-disabled)' }}
                >
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Profile */}
      <div className="px-2 py-2 shrink-0" style={{ borderTop: '1px solid var(--vp-border)' }}>
        <NavLink
          to="/profile"
          onClick={onNavClick}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
          }
          title={collapsed ? 'Profile' : undefined}
        >
          <UserRound className="w-4 h-4 shrink-0 nav-icon" />
          {!collapsed && <span className="truncate">Profile</span>}
        </NavLink>
      </div>
    </>
  )
}

export default function MainLayout() {
  const { user, role } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { collapsed, setCollapsed } = useLayout()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const [logoutApi] = useLogoutMutation()

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap()
    } catch {
      // Even if backend call fails, clear local state
    }
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: 'var(--vp-bg-base)' }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 h-full transition-all duration-300"
        style={{
          width: collapsed ? '64px' : '240px',
          background: 'var(--vp-bg-surface)',
          borderRight: '1px solid var(--vp-border)',
          boxShadow: 'var(--vp-shadow-sm)',
        }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <SidebarContent collapsed={collapsed} role={role} onNavClick={() => {}} />
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 w-full shrink-0 transition-colors"
          style={{
            borderTop: '1px solid var(--vp-border)',
            color: 'var(--vp-text-muted)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--vp-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Collapse</span>
            </div>
          )}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: '240px',
          background: 'var(--vp-bg-surface)',
          borderRight: '1px solid var(--vp-border)',
          boxShadow: 'var(--vp-shadow-lg)',
        }}
      >
        <SidebarContent collapsed={false} role={role} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-4 sm:px-6 h-14 shrink-0"
          style={{
            background: 'var(--vp-bg-surface)',
            borderBottom: '1px solid var(--vp-border)',
            boxShadow: 'var(--vp-shadow-sm)',
          }}
        >
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--vp-text-muted)' }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--vp-grad-teal)' }}
            >
              <Pill className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--vp-text-primary)' }}>
              VedPharm
            </span>
          </div>

          {/* Desktop spacer */}
          <div className="hidden md:flex flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all"
              style={{
                background: 'var(--vp-bg-hover)',
                color: 'var(--vp-text-secondary)',
                border: '1px solid var(--vp-border)',
              }}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Role badge */}
            <span className="hidden sm:inline-flex badge-teal text-xs">{role}</span>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-xl p-1.5 transition-colors outline-none"
                  style={{ background: 'var(--vp-bg-hover)' }}
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback
                      className="text-xs font-bold"
                      style={{
                        background: 'var(--vp-grad-teal)',
                        color: '#FFFFFF',
                      }}
                    >
                      {user?.fullName ? getInitials(user.fullName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left pr-1">
                    <p
                      className="text-xs font-semibold leading-none"
                      style={{ color: 'var(--vp-text-primary)' }}
                    >
                      {user?.fullName}
                    </p>
                    <p
                      className="text-xs mt-0.5 leading-none"
                      style={{ color: 'var(--vp-text-muted)' }}
                    >
                      {user?.email}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-48"
                style={{
                  background: 'var(--vp-bg-surface)',
                  border: '1px solid var(--vp-border)',
                  boxShadow: 'var(--vp-shadow-lg)',
                }}
              >
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer gap-2"
                  style={{ color: 'var(--vp-text-secondary)' }}
                >
                  <Settings className="w-4 h-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator style={{ background: 'var(--vp-border)' }} />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer gap-2"
                  style={{ color: 'var(--vp-rose)' }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          style={{ background: 'var(--vp-bg-base)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
