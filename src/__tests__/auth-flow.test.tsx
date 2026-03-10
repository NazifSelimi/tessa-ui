/**
 * Auth Flow Tests
 * 
 * Tests for authentication flows:
 * - Login
 * - Registration
 * - Logout
 * - Token persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import LoginPage from '@/pages/auth/LoginPage';
import authReducer from '@/features/auth/slice';
import { authApi } from '@/features/auth/api';

// Mock successful login response
vi.mock('@/features/auth/api', () => ({
  authApi: {
    endpoints: {
      login: {
        initiate: vi.fn(() => ({
          unwrap: vi.fn().mockResolvedValue({
            user: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
            },
            accessToken: 'fake-access-token',
            refreshToken: 'fake-refresh-token',
          }),
        })),
      },
    },
    reducerPath: 'authApi',
    reducer: () => ({}),
    middleware: () => (next: any) => (action: any) => next(action),
  },
  useLoginMutation: vi.fn(() => [
    vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        accessToken: 'fake-access-token',
      },
    }),
    { isLoading: false, error: null },
  ]),
}));

describe('Authentication Flow', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
        [authApi.reducerPath]: authApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(authApi.middleware),
    });
  });

  const renderLogin = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </Provider>
    );
  };

  it('should display login form', () => {
    renderLogin();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    renderLogin();
    const user = userEvent.setup();

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    renderLogin();
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should successfully login with valid credentials', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const state = store.getState();
      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user.email).toBe('test@example.com');
    });
  });

  it('should persist token to Redux store', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const state = store.getState();
      expect(state.auth.token).toBeTruthy();
    });
  });

  it('should show error message on failed login', async () => {
    // Mock failed login
    const { useLoginMutation } = await import('@/features/auth/api');
    vi.mocked(useLoginMutation).mockReturnValue([
      vi.fn().mockRejectedValue({
        data: { message: 'Invalid credentials' },
      }),
      { isLoading: false, error: { data: { message: 'Invalid credentials' } } },
    ] as any);

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
