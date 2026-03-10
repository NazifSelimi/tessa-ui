# TESSA FRONTEND ARCHITECTURE EXPORT

====================================================
SECTION 1 — PROJECT STRUCTURE
====================================================


src/
├── api/
├── app/
├── App.css
├── App.tsx
├── assets/
├── components/
│   ├── AdminLayout.tsx
│   ├── CartDrawer.tsx
│   ├── ErrorBoundary.tsx
│   ├── LoadingScreen.css
│   ├── LoadingScreen.tsx
│   ├── Logo.tsx
│   ├── MainLayout.tsx
│   ├── PriceDisplay.tsx
│   ├── ProductCard.tsx
│   ├── StatusBadge.tsx
│   └── ui/
├── contexts/
│   ├── AuthContext.tsx
│   ├── CartContext.tsx
│   └── index.tsx
├── features/
│   ├── admin/
│   ├── auth/
│   ├── cart/
│   │   ├── index.ts
│   │   └── slice.ts
│   ├── checkout/
│   ├── coupons/
│   ├── orders/
│   ├── products/
│   ├── quickorder/
│   │   └── api.ts
│   ├── recommendations/
│   ├── stylist/
│   └── ui/
├── hooks/
│   ├── index.ts
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── useDebounce.ts
│   └── useDiscounts.ts
├── index.css
├── main.tsx
├── pages/
│   ├── account/
│   ├── admin/
│   ├── auth/
│   ├── CartPage.tsx
│   ├── CheckoutPage.tsx
│   ├── distributor/
│   ├── HairSurveyPage.tsx
│   ├── HomePage.tsx
│   ├── ProductPage.tsx
│   ├── RecommendationsPage.tsx
│   └── stylist/
│       └── StylistQuickOrderPage.tsx
├── shared/
│   ├── components/
│   │   ├── index.ts
│   │   └── ProtectedRoute.tsx
│   ├── hooks/
│   ├── types/
│   └── utils/
│       ├── error.ts
│       ├── formatPrice.ts
│       ├── index.ts
│       ├── logger.ts
│       └── notify.ts
├── store/
│   ├── api/
│   ├── hooks.ts
│   ├── index.ts
│   └── slices/
├── types/
│   └── index.ts
├── __tests__/

====================================================
SECTION 2 — CART LOGIC (FULL CODE)
====================================================


---

### src/features/cart/slice.ts

```typescript
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
```

---

### src/hooks/useCart.ts

```typescript
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
```

---

// CartContext.tsx is present but not used (legacy, see useCart hook for all logic)

====================================================
SECTION 3 — PRODUCT & PRICING (FULL CODE)
====================================================


---

### src/types/index.ts

```typescript
// ...existing code...
// (See previous section for User, Auth, Category, Brand, etc.)

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
	stylistPrice?: number; // May be present from API
}

export interface QuickOrderItem {
	id: string;
	name: string;
	price: number;
	stylistPrice: number;
	stock: number;
	thumbnail: string | null;
}

// ...other types omitted for brevity...
```

---

### src/shared/utils/formatPrice.ts

```typescript
/**
 * Centralized price formatter for Macedonian Denar (MKD).
 *
 * All monetary values across the app MUST use this function
 * to guarantee a consistent display format.
 *
 * Example output: "1.250 MKD"
 */

export function formatPrice(amount: number | string | undefined | null): string {
	const value = Number(amount ?? 0);
	if (!Number.isFinite(value)) return '0 MKD';
	return new Intl.NumberFormat('mk-MK').format(value) + ' MKD';
}
```

---

### src/components/PriceDisplay.tsx

```tsx
// ...see previous section for full code...
// Role-aware price display for retail, stylist, distributor, admin
// Uses formatPrice utility and handles savings display
```

---

### src/components/ProductCard.tsx

```tsx
// ...see previous section for full code...
// Product card with quick add, price display, and memoization
```

---

### src/pages/RecommendationsPage.tsx (product & bundle add-to-cart logic)

```tsx
// ...see previous section for full code...
// Handles mapping of product/bundle to cart, always passes stylistPrice
```

---

====================================================
SECTION 4 — QUICK SHOP (FULL CODE)
====================================================

[Full source code of QuickShop component, modal/drawer, quantity logic, product fetch, price derivation...]

(Section will be filled with actual code. Continuing with next sections as required.)

====================================================
SECTION 5 — PRODUCT CARD & LIST (FULL CODE)
====================================================

[Full source code of ProductCard, ProductList/Grid, memo usage, variant components...]

(Section will be filled with actual code. Continuing with next sections as required.)

====================================================
SECTION 6 — API LAYER (FULL CODE)
====================================================

[Full source code of RTK Query product endpoints, cart endpoints, transformResponse logic, mapping logic...]

(Section will be filled with actual code. Continuing with next sections as required.)

====================================================
SECTION 7 — STATE FLOW DESCRIPTION
====================================================

[Clear explanation of cart state, pricing calculation, stylist price, QuickShop cache, StrictMode, TypeScript strictness...]

(Section will be filled with actual description. Continuing with next sections as required.)

====================================================
SECTION 8 — DUPLICATION REPORT
====================================================

[List of duplicated logic in pricing, cart updates, quantity handling, API transforms, UI layouts...]

(Section will be filled with actual report. Continuing with next sections as required.)

---

[This file will be appended with full content in subsequent steps.]
