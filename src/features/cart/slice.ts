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
  isDrawerOpen: boolean;
  isLoading: boolean;
}

const initialState: CartState = {
  items: [],
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

      state.isDrawerOpen = true;
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
    },

    setItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
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
});

// Export actions
export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  setItems,
  openDrawer,
  closeDrawer,
  toggleDrawer,
  setLoading,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
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
