/**
 * useCart Hook
 * 
 * Bridge hook that provides the same API as the old CartContext
 * but uses Redux under the hood.
 */

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  openDrawer,
  closeDrawer,
  toggleDrawer,
  selectCartItems,
  selectCartDrawerOpen,
  selectCartItemCount,
} from '@/features/cart/slice';
import { selectIsProfessional } from '@/features/auth/slice';
import type { CartItem, Product } from '@/types';

/** Convert any price-like value to a safe finite number (≥ 0). */
function toSafePrice(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function useCart() {
  const dispatch = useAppDispatch();
  
  // Selectors
  const items = useAppSelector(selectCartItems);
  const isDrawerOpen = useAppSelector(selectCartDrawerOpen);
  const itemCount = useAppSelector(selectCartItemCount);
  const isProfessional = useAppSelector(selectIsProfessional);

  // Add item to cart with frozen price snapshot
  const handleAddItem = useCallback((product: Product, quantity = 1) => {
    const retailPrice = toSafePrice(product.price);
    const rolePrice = toSafePrice(product.stylistPrice);
    const unitPrice = isProfessional ? rolePrice : retailPrice;

    if (import.meta.env.DEV && unitPrice === 0 && retailPrice === 0) {
      console.warn('[useCart] Product added with 0 price:', product.id, product.name);
    }

    dispatch(addItem({ product, quantity, unitPrice, retailPrice, rolePrice }));
  }, [dispatch, isProfessional]);

  // Remove item from cart
  const handleRemoveItem = useCallback((productId: string | number) => {
    dispatch(removeItem({ productId }));
  }, [dispatch]);

  // Update item quantity
  const handleUpdateQuantity = useCallback((productId: string | number, quantity: number) => {
    dispatch(updateQuantity({ productId, quantity }));
  }, [dispatch]);

  // Clear entire cart
  const handleClearCart = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  // Drawer controls
  const handleOpenDrawer = useCallback(() => {
    dispatch(openDrawer());
  }, [dispatch]);

  const handleCloseDrawer = useCallback(() => {
    dispatch(closeDrawer());
  }, [dispatch]);

  const handleToggleDrawer = useCallback(() => {
    dispatch(toggleDrawer());
  }, [dispatch]);

  // Get price based on frozen cart-item price (immutable after add)
  const getItemPrice = useCallback((item: CartItem): number => {
    // Prefer frozen unit price set when item was added to cart
    if (item.unitPrice != null && Number.isFinite(item.unitPrice)) {
      return item.unitPrice;
    }
    // Fallback for legacy items persisted before frozen-price migration
    const price = isProfessional ? item.product.stylistPrice : item.product.price;
    return toSafePrice(price);
  }, [isProfessional]);

  // Get total for an item
  const getItemTotal = useCallback((item: CartItem): number => {
    return getItemPrice(item) * item.quantity;
  }, [getItemPrice]);

  // Calculate subtotal
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + getItemTotal(item), 0);
  }, [items, getItemTotal]);

  // Check if item is in cart
  const isInCart = useCallback((productId: string | number): boolean => {
    return items.some(
      item => item.productId === productId
    );
  }, [items]);

  // Get cart item
  const getCartItem = useCallback((productId: string | number): CartItem | undefined => {
    return items.find(
      item => item.productId === productId
    );
  }, [items]);

  return {
    // State
    items,
    isLoading: false, // Cart operations are synchronous with redux-persist
    isDrawerOpen,
    
    // Operations
    addItem: handleAddItem,
    removeItem: handleRemoveItem,
    updateQuantity: handleUpdateQuantity,
    clearCart: handleClearCart,
    
    // Drawer controls
    openDrawer: handleOpenDrawer,
    closeDrawer: handleCloseDrawer,
    toggleDrawer: handleToggleDrawer,
    
    // Calculations
    itemCount,
    subtotal,
    getItemPrice,
    getItemTotal,
    
    // Helpers
    isInCart,
    getCartItem,
  };
}

export default useCart;
