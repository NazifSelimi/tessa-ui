/**
 * Cart Slice — features/cart/slice.ts
 *
 * Manages shopping cart state including:
 * - Cart items with product/size references
 * - Quantity management
 * - Cart drawer visibility
 *
 * Cart is persisted to localStorage via redux-persist.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, Product } from '@/types';

interface CartState {
  items: CartItem[];
  bundleIds: string[];
  isDrawerOpen: boolean;
  isLoading: boolean;
}

const initialState: CartState = {
  items: [],
  bundleIds: [],
  isDrawerOpen: false,
  isLoading: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (
      state,
      action: PayloadAction<{
        product: Product;
        quantity?: number;
        unitPrice: number;
        retailPrice: number;
        rolePrice: number;
      }>
    ) => {
      const { product, quantity = 1, unitPrice, retailPrice, rolePrice } = action.payload;
      const existingIndex = state.items.findIndex(
        (item) => item.productId === product.id
      );

      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
        // Back-fill frozen prices for legacy persisted items
        if (state.items[existingIndex].unitPrice == null) {
          state.items[existingIndex].unitPrice = unitPrice;
          state.items[existingIndex].retailPrice = retailPrice;
          state.items[existingIndex].rolePrice = rolePrice;
        }
      } else {
        state.items.push({
          productId: product.id,
          quantity,
          product,
          unitPrice,
          retailPrice,
          rolePrice,
        });
      }
    },

    removeItem: (
      state,
      action: PayloadAction<{ productId: string | number }>
    ) => {
      const { productId } = action.payload;
      state.items = state.items.filter(
        (item) => item.productId !== productId
      );
    },

    /** Fill in the salon price of a cart line (added as a guest, who never receives salon prices). */
    setRolePrice: (state, action: PayloadAction<{ productId: string | number; rolePrice: number; stylistPrice: number }>) => {
      for (const item of state.items) {
        if (String(item.productId) === String(action.payload.productId)) {
          item.rolePrice = action.payload.rolePrice;
          item.product = { ...item.product, stylistPrice: action.payload.stylistPrice };
        }
      }
    },
    updateQuantity: (
      state,
      action: PayloadAction<{
        productId: string | number;
        quantity: number;
      }>
    ) => {
      const { productId, quantity } = action.payload;

      if (quantity <= 0) {
        state.items = state.items.filter(
          (item) => item.productId !== productId
        );
        return;
      }

      const item = state.items.find(
        (item) => item.productId === productId
      );

      if (item) {
        const maxStock = typeof item.product.quantity === 'number'
          ? item.product.quantity
          : quantity;
        item.quantity = Math.min(quantity, maxStock);
      }
    },

    clearCart: (state) => {
      state.items = [];
      state.bundleIds = [];
    },

    applyBundle: (state, action: PayloadAction<{ bundleId: string }>) => {
      if (!state.bundleIds.includes(action.payload.bundleId)) {
        state.bundleIds.push(action.payload.bundleId);
      }
    },

    setItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
    },

    /** Another tab changed the cart: take its items and bundles as they are. */
    syncFromOtherTab: (state, action: PayloadAction<{ items: CartItem[]; bundleIds: string[] }>) => {
      state.items = action.payload.items;
      state.bundleIds = action.payload.bundleIds;
    },

    openDrawer: (state) => {
      state.isDrawerOpen = true;
    },

    closeDrawer: (state) => {
      state.isDrawerOpen = false;
    },

    toggleDrawer: (state) => {
      state.isDrawerOpen = !state.isDrawerOpen;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },

  // A cart kept after signing out must not keep salon prices on the device for the
  // next visitor. Matched by type to avoid importing the auth slice (import cycle).
  // useSalonPriceRefresh fills them in again when a business account signs in.
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type === 'auth/logout',
      (state) => {
        for (const item of state.items) {
          const retail = Number(item.retailPrice ?? item.product.price);
          item.unitPrice = Number.isFinite(retail) ? retail : item.unitPrice;
          item.rolePrice = undefined;
          const { stylistPrice: _drop, ...product } = item.product;
          item.product = product;
        }
      },
    );
  },
});

// Export actions
export const {
  addItem,
  removeItem,
  updateQuantity,
  setRolePrice,
  clearCart,
  applyBundle,
  setItems,
  syncFromOtherTab,
  openDrawer,
  closeDrawer,
  toggleDrawer,
  setLoading,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartBundleIds = (state: { cart: CartState }) => state.cart.bundleIds;
export const selectCartDrawerOpen = (state: { cart: CartState }) => state.cart.isDrawerOpen;
export const selectCartLoading = (state: { cart: CartState }) => state.cart.isLoading;

export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectIsInCart = (
  state: { cart: CartState },
  productId: string
) => state.cart.items.some(
  (item) => item.productId === productId
);

export default cartSlice.reducer;
