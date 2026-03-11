/**
 * Type Definitions for Tessa Shop
 * 
 * Centralized type definitions that match the expected API responses.
 * These types should be kept in sync with the backend models.
 */

// ==================== USER & AUTH ====================

export type UserRole = 'guest' | 'user' | 'stylist' | 'distributor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  emailVerifiedAt?: string;
  address?: string;
  city?: string;
  postcode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// ==================== PRODUCTS ====================

export interface Product {
  id: string | number;
  name: string;
  brand: string | { id: string; name: string } | null;
  brandId?: string | number;
  category: string | { id: string; name: string } | null;
  categoryId?: string | number;
  description: string;
  images?: string[];
  image?: string | null;
  price?: string | number;
  compareAtPrice?: string | number | null;
  stylistPrice?: string | number;
  inStock?: boolean;
  quantity?: number;
  featured?: boolean;
  tags?: string[];
  sale?: any;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  productCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  productCount?: number;
}

// ==================== CART ====================

export interface CartItem {
  productId: string | number;
  quantity: number;
  product: Product;
  /** Frozen unit price at time of add (role-aware). Immutable after set. */
  unitPrice?: number;
  /** Retail price snapshot at time of add */
  retailPrice?: number;
  /** Professional/stylist price snapshot at time of add */
  rolePrice?: number;
}

// ==================== ORDERS ====================

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface OrderItem {
  productId: string | number;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  image?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'shipped' 
  | 'cancelled';

export type PaymentMethod = 'cod' | 'online' | 'bank_transfer';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax?: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  customMessage?: string;
  internalNotes?: string;
  couponCode?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  statusHistory?: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

// ==================== STYLIST REQUESTS ====================

export type StylistRequestStatus = 'pending' | 'approved';

export interface StylistRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  saloonName?: string;
  saloonAddress?: string;
  saloonCity?: string;
  saloonPhone?: string;
  message?: string;
  isApproved?: boolean;
  status: StylistRequestStatus;
  createdAt: string;
  updatedAt?: string;
}

// ==================== DISTRIBUTOR ====================

export interface StylistCode {
  id: string;
  code: string;
  distributorId: string;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface DistributorStats {
  totalCodes: number;
  usedCodes: number;
  activeCodes: number;
  totalStylists: number;
  monthlySignups: number;
}

// ==================== COUPONS ====================

export type CouponType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'inactive' | 'expired' | 'scheduled';

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  // Deprecated/optional fields for backwards compatibility
  usagePerUser?: number;
  audience?: UserRole[];
  excludedProducts?: string[];
  excludedCategories?: string[];
  validFrom?: string;
  validUntil?: string;
  status?: CouponStatus;
  eligibleRoles?: UserRole[];
  perUserLimit?: number;
}

// ==================== NOTIFICATIONS ====================

export type NotificationType = 
  | 'order_placed' 
  | 'order_shipped' 
  | 'order_delivered'
  | 'stylist_approved'
  | 'stylist_rejected'
  | 'promotion'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// ==================== REVIEWS ====================

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  verified: boolean;
  helpful: number;
  images?: string[];
  createdAt: string;
}

// ==================== SETTINGS ====================

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states?: string[];
  flatRate: number;
  freeShippingThreshold: number;
}

export interface StoreSettings {
  currency: string;
  currencySymbol: string;
  taxRate: number;
  shippingZones: ShippingZone[];
  orderPrefix: string;
  lowStockThreshold: number;
}

// ==================== API RESPONSES ====================

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface PaginatedResponse<T> {
  success?: boolean;
  data: T[];
  meta: PaginationMeta;
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

// ==================== FORM TYPES ====================

export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
}

export interface CheckoutFormData {
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  customMessage?: string;
  couponCode?: string;
  sameAsBilling?: boolean;
}

export interface StylistApplicationFormData {
  name: string;
  email: string;
  salonName: string;
  salonAddress: string;
  salonCity: string;
  salonPhone: string;
  about?: string;
}

// ==================== DASHBOARD STATS ====================

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  pendingStylistRequests: number;
  lowStockProducts: number;
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
  topProducts: { product: Product; sales: number }[];
}

// ==================== RECOMMENDATION PAYLOAD ====================

export interface RecommendationPayload {
  hair_type_id: number;
  concerns: number[];
  budget_range?: string; // "min-max"
}

// ==================== RECOMMENDATION RESPONSE ====================

export interface RecommendedProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stylistPrice: number;
  quantity: number;
  inStock: boolean;
  brandId: string;
  brand: { id: string; name: string } | null;
  categoryId: string;
  category: { id: string; name: string } | null;
  image: string | null;
  recommendationScore: number;
  sale: { price: number; startDate: string; endDate: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BundleProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

export interface StaticBundle {
  id: string;
  name: string;
  description: string;
  isDynamic: false;
  discountPercentage: number | null;
  products: BundleProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface DynamicBundle {
  id: null;
  name: string;
  description: string;
  isDynamic: true;
  discountPercentage: null;
  products: BundleProduct[];
  totalPrice: number;
}

export type RecommendedBundle = StaticBundle | DynamicBundle;

export interface RecommendationResult {
  products: RecommendedProduct[];
  bundles: RecommendedBundle[];
}

// ==================== QUICK ORDER ====================

export interface QuickOrderItem {
  id: string;
  name: string;
  price: number;
  stylistPrice: number;
  stock: number;
  thumbnail: string | null;
}

export interface QuickOrderQueryParams {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface QuickOrderResponse {
  success: true;
  data: QuickOrderItem[];
  meta: PaginationMeta;
}
