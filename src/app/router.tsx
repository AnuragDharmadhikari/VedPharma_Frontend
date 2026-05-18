/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy } from 'react'
import {
  SuspenseWrapper,
  PublicRoute,
  ProtectedRoute,
  OwnerRoute,
  ManagerRoute,
} from './routeGuards'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const DoctorsPage = lazy(() => import('@/features/doctors/DoctorsPage'))
const DoctorDetailPage = lazy(() => import('@/features/doctors/DoctorDetailPage'))
const VisitsPage = lazy(() => import('@/features/visits/VisitsPage'))
const VisitNewPage = lazy(() => import('@/features/visits/VisitNewPage'))
const VisitDetailPage = lazy(() => import('@/features/visits/VisitDetailPage'))
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'))
const OrderNewPage = lazy(() => import('@/features/orders/OrderNewPage'))
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'))
const StockistsPage = lazy(() => import('@/features/stockists/StockistsPage'))
const StockistDetailPage = lazy(() => import('@/features/stockists/StockistDetailPage'))
const ChemistsPage = lazy(() => import('@/features/chemists/ChemistsPage'))
const ChemistDetailPage = lazy(() => import('@/features/chemists/ChemistDetailPage'))
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'))
const ProductDetailPage = lazy(() => import('@/features/products/ProductDetailPage'))
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'))
const InvoicesPage = lazy(() => import('@/features/invoices/InvoicesPage'))
const InvoiceDetailPage = lazy(() => import('@/features/invoices/InvoiceDetailPage'))
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage'))
const PaymentNewPage = lazy(() => import('@/features/payments/PaymentNewPage'))
const ReturnsPage = lazy(() => import('@/features/returns/ReturnsPage'))
const TerritoriesPage = lazy(() => import('@/features/territories/TerritoriesPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const UserDetailPage = lazy(() => import('@/features/users/UserDetailPage'))
const TargetsPage = lazy(() => import('@/features/targets/TargetsPage'))
const SchemesPage = lazy(() => import('@/features/schemes/SchemesPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const AiPage = lazy(() => import('@/features/ai/AiPage'))
const AuditPage = lazy(() => import('@/features/audit/AuditPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const MainLayout = lazy(() => import('@/shared/components/MainLayout'))
const OrderEditPage = lazy(() => import('@/features/orders/OrderEditPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <PublicRoute />,
    children: [
      {
        element: <SuspenseWrapper />,
        children: [{ path: '/login', element: <LoginPage /> }],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <SuspenseWrapper />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/profile', element: <ProfilePage /> },
              { path: '/doctors', element: <DoctorsPage /> },
              { path: '/doctors/:id', element: <DoctorDetailPage /> },
              { path: '/chemists', element: <ChemistsPage /> },
              { path: '/chemists/:id', element: <ChemistDetailPage /> },
              { path: '/visits', element: <VisitsPage /> },
              { path: '/visits/new', element: <VisitNewPage /> },
              { path: '/visits/:id', element: <VisitDetailPage /> },
              { path: '/products', element: <ProductsPage /> },
              { path: '/products/:id', element: <ProductDetailPage /> },
              { path: '/inventory', element: <InventoryPage /> },
              { path: '/orders', element: <OrdersPage /> },
              { path: '/orders/new', element: <OrderNewPage /> },
              { path: '/orders/:id', element: <OrderDetailPage /> },
              { path: '/orders/:id/edit', element: <OrderEditPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <ManagerRoute />,
    children: [
      {
        element: <SuspenseWrapper />,
        children: [
          {
            element: <MainLayout />,
            children: [
              { path: '/stockists', element: <StockistsPage /> },
              { path: '/stockists/:id', element: <StockistDetailPage /> },
              { path: '/invoices', element: <InvoicesPage /> },
              { path: '/invoices/:id', element: <InvoiceDetailPage /> },
              { path: '/payments', element: <PaymentsPage /> },
              { path: '/payments/new', element: <PaymentNewPage /> },
              { path: '/returns', element: <ReturnsPage /> },
              { path: '/territories', element: <TerritoriesPage /> },
              { path: '/targets', element: <TargetsPage /> },
              { path: '/analytics', element: <AnalyticsPage /> },
              { path: '/ai', element: <AiPage /> },
              { path: '/schemes', element: <SchemesPage /> },
              { path: '/users', element: <UsersPage /> },
              { path: '/users/:id', element: <UserDetailPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <OwnerRoute />,
    children: [
      {
        element: <SuspenseWrapper />,
        children: [
          {
            element: <MainLayout />,
            children: [{ path: '/audit', element: <AuditPage /> }],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
