/**
 * Checkout Flow Integration Tests
 * 
 * Tests the complete checkout flow:
 * - Adding items to cart
 * - Navigating to checkout
 * - Filling shipping information
 * - Submitting order
 * - Order confirmation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import CheckoutPage from '@/pages/CheckoutPage';
import cartReducer from '@/features/cart/slice';
import authReducer from '@/features/auth/slice';
import { ordersApi } from '@/features/orders/api';
import type { UserRole } from '@/types';

// Mock API responses
vi.mock('@/features/orders/api', () => ({
  ordersApi: {
    endpoints: {
      createOrder: {
        initiate: vi.fn(() => ({
          unwrap: vi.fn().mockResolvedValue({
            id: 'order-123',
            status: 'pending',
            total: 89.97,
          }),
        })),
      },
    },
    reducerPath: 'ordersApi',
    reducer: () => ({}),
    middleware: () => (next: any) => (action: any) => next(action),
  },
  useCreateOrderMutation: vi.fn(() => [
    vi.fn().mockResolvedValue({
      data: {
        id: 'order-123',
        status: 'pending',
        total: 89.97,
      },
    }),
    { isLoading: false, error: null },
  ]),
}));

describe('Checkout Flow', () => {
  let store: any;

  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        cart: cartReducer,
        auth: authReducer,
        [ordersApi.reducerPath]: ordersApi.reducer,
      },
      preloadedState: {
        cart: {
          items: [
            {
              productId: '1',
              quantity: 3,
              product: {
                id: '1',
                name: 'Fanola Shampoo',
                brand: 'Fanola',
                category: 'Shampoo',
                description: 'Test',
                price: 29.99,
                quantity: 100,
                inStock: true,
              },
            },
          ],
          isDrawerOpen: false,
          isLoading: false,
        },
        auth: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user' as UserRole,
            createdAt: new Date().toISOString(),
          },
          token: 'fake-token',

          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      },
    });
  });

  const renderCheckout = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <CheckoutPage />
        </BrowserRouter>
      </Provider>
    );
  };

  it('should display cart summary with correct totals', () => {
    renderCheckout();

    expect(screen.getByText(/Fanola Shampoo/i)).toBeInTheDocument();
    expect(screen.getByText(/Quantity: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/\$89\.97/i)).toBeInTheDocument(); // 3 * 29.99
  });

  it('should require shipping information before checkout', async () => {
    renderCheckout();
    const user = userEvent.setup();

    const submitButton = screen.getByRole('button', { name: /place order/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('should successfully submit order with valid data', async () => {
    renderCheckout();
    const user = userEvent.setup();

    // Fill shipping information
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/phone/i), '555-1234');
    await user.type(screen.getByLabelText(/address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'New York');
    await user.type(screen.getByLabelText(/state/i), 'NY');
    await user.type(screen.getByLabelText(/zip code/i), '10001');

    // Select payment method
    await user.click(screen.getByLabelText(/cash on delivery/i));

    // Submit
    const submitButton = screen.getByRole('button', { name: /place order/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/order placed successfully/i)).toBeInTheDocument();
    });
  });

  it('should clear cart after successful order', async () => {
    renderCheckout();
    const user = userEvent.setup();

    // Fill required fields
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/phone/i), '555-1234');
    await user.type(screen.getByLabelText(/address/i), '123 Main St');
    await user.type(screen.getByLabelText(/city/i), 'New York');
    await user.type(screen.getByLabelText(/state/i), 'NY');
    await user.type(screen.getByLabelText(/zip code/i), '10001');
    await user.click(screen.getByLabelText(/cash on delivery/i));

    const submitButton = screen.getByRole('button', { name: /place order/i });
    await user.click(submitButton);

    await waitFor(() => {
      const state = store.getState();
      expect(state.cart.items).toHaveLength(0);
    });
  });
});
