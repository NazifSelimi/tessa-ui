import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import './App.css';

// Eagerly loaded components (no antd dependency)
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './shared/components/ProtectedRoute';

// Lazy loaded layouts & providers (defers antd + component imports until route matches)
const AntdProvider = lazy(() => import('./components/AntdProvider'));
const MainLayout = lazy(() => import('./components/MainLayout'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));

// Lazy loaded pages (code splitting for better performance)
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const OrdersPage = lazy(() => import('./pages/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminDistributorsPage = lazy(() => import('./pages/admin/AdminDistributorsPage'));
const AdminStylistRequestsPage = lazy(() => import('./pages/admin/AdminStylistRequestsPage'));
const DistributorPortalPage = lazy(() => import('./pages/distributor/DistributorPortalPage'));
const DistributorProductsPage = lazy(() => import('./pages/distributor/DistributorProductsPage'));
const DistributorCodesPage = lazy(() => import('./pages/distributor/DistributorCodesPage'));
const StylistRequestPage = lazy(() => import('./pages/stylist/StylistRequestPage'));
const HairSurveyPage = lazy(() => import('./pages/HairSurveyPage'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'));
const StylistQuickOrderPage = lazy(() => import('./pages/stylist/StylistQuickOrderPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <>
      <ErrorBoundary>
        <Provider store={store}>
          <PersistGate loading={<div style={{ padding: '20px' }}>Loading...</div>} persistor={persistor}>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ScrollToTop />
              <Suspense fallback={<LoadingScreen />}>
              <AntdProvider>
                <Routes>
              {/* Main shop routes (all wrapped in MainLayout for nav + footer) */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/hair-survey" element={<HairSurveyPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />

                {/* Account routes (auth required) */}
                <Route path="/account" element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                } />
                <Route path="/account/orders" element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                } />
                <Route path="/account/orders/:id" element={
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                } />

                {/* Distributor routes (distributor role required) */}
                <Route path="/distributor" element={
                  <ProtectedRoute requiredRole="distributor">
                    <DistributorPortalPage />
                  </ProtectedRoute>
                } />
                <Route path="/distributor/products" element={
                  <ProtectedRoute requiredRole="distributor">
                    <DistributorProductsPage />
                  </ProtectedRoute>
                } />
                <Route path="/distributor/codes" element={
                  <ProtectedRoute requiredRole="distributor">
                    <DistributorCodesPage />
                  </ProtectedRoute>
                } />

                {/* Stylist request – any logged-in user can apply */}
                <Route path="/stylist/request" element={
                  <ProtectedRoute>
                    <StylistRequestPage />
                  </ProtectedRoute>
                } />

                {/* Stylist quick-order – stylist role required */}
                <Route path="/stylist/quick-order" element={
                  <ProtectedRoute requiredRole="stylist">
                    <StylistQuickOrderPage />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Auth routes (standalone, no nav/footer) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Admin routes – layout + pages are lazy-loaded */}
              <Route element={
                <ProtectedRoute requiredRole="admin">
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminLayout />
                  </Suspense>
                </ProtectedRoute>
              }>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/products" element={<AdminProductsPage />} />
                <Route path="/admin/orders" element={<AdminOrdersPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/coupons" element={<AdminCouponsPage />} />
                <Route path="/admin/distributors" element={<AdminDistributorsPage />} />
                <Route path="/admin/stylist-requests" element={<AdminStylistRequestsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />}  />
            </Routes>
              </AntdProvider>
            </Suspense>
          </Router>
      </PersistGate>
    </Provider>
    </ErrorBoundary>
    </>
  );
}

export default App;
