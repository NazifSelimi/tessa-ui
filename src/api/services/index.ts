/**
 * API Services Index
 * 
 * Re-exports all service modules for easy importing.
 * Usage: import { login, getProducts } from '@/api/services';
 */

// Auth service
export {
  login,
  register,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification,
} from './auth.service';

// Products service
export {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getRelatedProducts,
  searchProducts,
  getCategories,
  getBrands,
  type ProductFilters,
} from './products.service';

// Orders service
export {
  getOrders,
  getUserOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  validateCoupon,
  calculateShipping,
  estimateDeliveryDate,
  type CreateOrderData,
  type OrderFilters,
} from './orders.service';

// Admin service
export {
  // Dashboard
  getDashboardStats,
  
  // Products
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  
  // Orders
  getAdminOrders,
  updateOrderStatus,
  updatePaymentStatus,
  
  // Users
  getAdminUsers,
  updateUserRole,
  
  // Stylist Requests
  getStylistRequests,
  approveStylistRequest,
  rejectStylistRequest,
  
  // Coupons
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  
  // Distributors
  getDistributorCodes,
  generateStylistCode,
  
  // Categories & Brands
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from './admin.service';
