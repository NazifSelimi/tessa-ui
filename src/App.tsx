import { Suspense, useEffect } from 'react';
import { lazyWithReload } from '@/shared/utils/chunkReload';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import { useDispatch } from 'react-redux';
import './i18n';
import './App.css';
import { useAppSelector } from '@/app/hooks';
import { useGetCurrentUserQuery } from '@/features/auth/api';
import { baseApi, API_TAGS } from '@/api/baseApi';
import i18n, { isSupportedLocale, type Locale } from '@/i18n';
import { urlLocaleFromPathname } from '@/i18n/routing';

// Eagerly loaded components (no antd dependency)
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './shared/components/ProtectedRoute';

// Lazy loaded layouts & providers (defers antd + component imports until route matches)
const AntdProvider = lazyWithReload(() => import('./components/AntdProvider'));
const MainLayout = lazyWithReload(() => import('./components/MainLayout'));
const AdminLayout = lazyWithReload(() => import('./components/AdminLayout'));

// Lazy loaded pages (code splitting for better performance)
const HomePage = lazyWithReload(() => import('./pages/HomePage'));
const ShopPage = lazyWithReload(() => import('./pages/ShopPage'));
const ForProfessionalsPage = lazyWithReload(() => import('./pages/ForProfessionalsPage'));
const CollectionPage = lazyWithReload(() => import('./pages/CollectionPage'));
const LegalPage = lazyWithReload(() => import('./pages/LegalPage'));
const ProductPage = lazyWithReload(() => import('./pages/ProductPage'));
const CartPage = lazyWithReload(() => import('./pages/CartPage'));
const CheckoutPage = lazyWithReload(() => import('./pages/CheckoutPage'));
const LoginPage = lazyWithReload(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazyWithReload(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazyWithReload(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithReload(() => import('./pages/auth/ResetPasswordPage'));
const SocialAuthCallbackPage = lazyWithReload(() => import('./pages/auth/SocialAuthCallbackPage'));
const CompleteProfilePage = lazyWithReload(() => import('./pages/auth/CompleteProfilePage'));
const ActivateStylistInvitationPage = lazyWithReload(() => import('./pages/auth/ActivateStylistInvitationPage'));
const AccountPage = lazyWithReload(() => import('./pages/account/AccountPage'));
const OrdersPage = lazyWithReload(() => import('./pages/account/OrdersPage'));
const OrderDetailPage = lazyWithReload(() => import('./pages/account/OrderDetailPage'));
const AdminDashboardPage = lazyWithReload(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazyWithReload(() => import('./pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazyWithReload(() => import('./pages/admin/AdminOrdersPage'));
const AdminUsersPage = lazyWithReload(() => import('./pages/admin/AdminUsersPage'));
const AdminCouponsPage = lazyWithReload(() => import('./pages/admin/AdminCouponsPage'));
const AdminDistributorsPage = lazyWithReload(() => import('./pages/admin/AdminDistributorsPage'));
const AdminStylistRequestsPage = lazyWithReload(() => import('./pages/admin/AdminStylistRequestsPage'));
const AdminStylistInvitationsPage = lazyWithReload(() => import('./pages/admin/AdminStylistInvitationsPage'));
const AdminBundlesPage = lazyWithReload(() => import('./pages/admin/AdminBundlesPage'));
const AdminContentBlocksPage = lazyWithReload(() => import('./pages/admin/AdminContentBlocksPage'));
const AdminCatalogImagesPage = lazyWithReload(() => import('./pages/admin/ProductImagesWorkspace'));
const AdminCatalogueReviewPage = lazyWithReload(() => import('./pages/admin/AdminCatalogueReviewPage'));
const AdminHairQuizPage = lazyWithReload(() => import('./pages/admin/AdminHairQuizPage'));
const AdminPostStudioPage = lazyWithReload(() => import('./pages/admin/AdminPostStudioPage'));
import FeatureGate from '@/shared/components/FeatureGate';
const AdminEmailsPage = lazyWithReload(() => import('./pages/admin/AdminEmailsPage'));
const AdminFeaturesPage = lazyWithReload(() => import('./pages/admin/AdminFeaturesPage'));
const AdminBusinessPage = lazyWithReload(() => import('./pages/admin/AdminBusinessPage'));
const StylistWorkspacePage = lazyWithReload(() => import('./pages/stylist/StylistWorkspacePage'));
const DistributorPortalPage = lazyWithReload(() => import('./pages/distributor/DistributorPortalPage'));
const DistributorProductsPage = lazyWithReload(() => import('./pages/distributor/DistributorProductsPage'));
const DistributorCodesPage = lazyWithReload(() => import('./pages/distributor/DistributorCodesPage'));
const StylistRequestPage = lazyWithReload(() => import('./pages/stylist/StylistRequestPage'));
const HairSurveyPage = lazyWithReload(() => import('./pages/HairSurveyPage'));
const RecommendationsPage = lazyWithReload(() => import('./pages/RecommendationsPage'));
const StylistQuickOrderPage = lazyWithReload(() => import('./pages/stylist/StylistQuickOrderPage'));
const StylistReferralPage = lazyWithReload(() => import('./pages/stylist/StylistReferralPage'));
const AdminReferralsPage = lazyWithReload(() => import('./pages/admin/AdminReferralsPage'));
const AdminCustomersPage = lazyWithReload(() => import('./pages/admin/AdminCustomersPage'));
const AdminMessagesPage = lazyWithReload(() => import('./pages/admin/AdminMessagesPage'));
// Design Lab — isolated /design-lab route for evaluating Shop/ordering concepts
const DesignLabPage = lazyWithReload(() => import('./pages/design-lab/DesignLabPage'));
const NotFoundPage = lazyWithReload(() => import('./pages/NotFoundPage'));

const localePrefix = typeof window !== 'undefined'
  ? urlLocaleFromPathname(window.location.pathname)
  : null;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function LegacyProductRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/product/${id}` : '/shop'} replace />;
}

function AuthBootstrap() {
  const dispatch = useDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const preferredLocale = useAppSelector((state) => state.auth.user?.preferredLocale);
  const currentRole = useAppSelector((state) => state.auth.user?.role ?? 'guest');

  useGetCurrentUserQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!preferredLocale || !isSupportedLocale(preferredLocale)) return;
    if (i18n.language === preferredLocale) return;

    void i18n.changeLanguage(preferredLocale as Locale);
  }, [preferredLocale]);

  useEffect(() => {
    dispatch(baseApi.util.invalidateTags([
      { type: API_TAGS.Products, id: 'LIST' },
      { type: API_TAGS.Products, id: 'FEATURED' },
      API_TAGS.Product,
    ]));
  }, [dispatch, token, currentRole]);

  return null;
}

function App() {
  return (
    <>
      <ErrorBoundary>
        <Provider store={store}>
          <PersistGate loading={<LoadingScreen />} persistor={persistor}>
            <Router
              basename={localePrefix ? `/${localePrefix}` : undefined}
            >
              <AuthBootstrap />
              <ScrollToTop />
              <Suspense fallback={<LoadingScreen />}>
              <AntdProvider>
                <Routes>
              {/* Main shop routes (all wrapped in MainLayout for nav + footer) */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/collections/:slug" element={<CollectionPage />} />
                <Route path="/for-professionals" element={<ForProfessionalsPage />} />
                <Route path="/privacy" element={<LegalPage />} />
                <Route path="/terms" element={<LegalPage />} />
                <Route path="/returns" element={<LegalPage />} />
                <Route path="/delivery" element={<LegalPage />} />
                <Route path="/contact" element={<LegalPage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/product/show-product/:id" element={<LegacyProductRedirect />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/hair-survey" element={<FeatureGate feature="hair_quiz"><HairSurveyPage /></FeatureGate>} />
                {/* /quiz is the canonical, shareable alias for the hair survey */}
                <Route path="/quiz" element={<FeatureGate feature="hair_quiz"><HairSurveyPage /></FeatureGate>} />
                <Route path="/recommendations" element={<FeatureGate feature="hair_quiz"><RecommendationsPage /></FeatureGate>} />

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

              <Route path="/stylist/workspace" element={<ProtectedRoute requiredRole={['stylist', 'admin']}><StylistWorkspacePage /></ProtectedRoute>} />
              <Route path="/stylist/referral" element={<FeatureGate feature="referrals" fallback="/stylist/workspace"><ProtectedRoute requiredRole="stylist"><StylistReferralPage /></ProtectedRoute></FeatureGate>} />

                {/* Stylist quick-order – stylist role required */}
                <Route path="/stylist/quick-order" element={
                  <FeatureGate feature="quick_order">
                    <ProtectedRoute requiredRole={['stylist', 'admin']}>
                      <StylistQuickOrderPage />
                    </ProtectedRoute>
                  </FeatureGate>
                } />
              </Route>

              {/* Design Lab (standalone, no nav/footer) — design exploration only */}
              <Route path="/design-lab" element={<DesignLabPage />} />

              {/* Auth routes (standalone, no nav/footer) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/social/callback" element={<SocialAuthCallbackPage />} />
              <Route path="/complete-profile" element={
                <ProtectedRoute allowIncompleteProfile>
                  <CompleteProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/stylist/activate/:token" element={<ActivateStylistInvitationPage />} />


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
                <Route path="/admin/customers" element={<AdminCustomersPage />} />
                <Route path="/admin/coupons" element={<AdminCouponsPage />} />
                <Route path="/admin/referrals" element={<FeatureGate feature="referrals" fallback="/admin/features"><AdminReferralsPage /></FeatureGate>} />
                <Route path="/admin/distributors" element={<FeatureGate feature="distributors" fallback="/admin/features"><AdminDistributorsPage /></FeatureGate>} />
                <Route path="/admin/stylist-requests" element={<AdminStylistRequestsPage />} />
                <Route path="/admin/stylist-invitations" element={<FeatureGate feature="stylist_invitations" fallback="/admin/features"><AdminStylistInvitationsPage /></FeatureGate>} />
                <Route path="/admin/bundles" element={<FeatureGate feature="bundles" fallback="/admin/features"><AdminBundlesPage /></FeatureGate>} />
                <Route path="/admin/content-blocks" element={<FeatureGate feature="content_blocks" fallback="/admin/features"><AdminContentBlocksPage /></FeatureGate>} />
                <Route path="/admin/catalog-images" element={<FeatureGate feature="image_review" fallback="/admin/features"><AdminCatalogImagesPage /></FeatureGate>} />
                <Route path="/admin/catalogue-review" element={<FeatureGate feature="supplier_list" fallback="/admin/features"><AdminCatalogueReviewPage /></FeatureGate>} />
                <Route path="/admin/hair-quiz" element={<FeatureGate feature="hair_quiz" fallback="/admin/features"><AdminHairQuizPage /></FeatureGate>} />
                <Route path="/admin/studio" element={<FeatureGate feature="post_studio" fallback="/admin/features"><AdminPostStudioPage /></FeatureGate>} />
                <Route path="/admin/emails" element={<AdminEmailsPage />} />
                <Route path="/admin/messages" element={<FeatureGate feature="messaging" fallback="/admin/features"><AdminMessagesPage /></FeatureGate>} />
                <Route path="/admin/features" element={<AdminFeaturesPage />} />
                <Route path="/admin/business" element={<AdminBusinessPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />}  />
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
