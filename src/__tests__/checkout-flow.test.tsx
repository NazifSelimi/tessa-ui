import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '@/pages/CheckoutPage';

const clearCartMock = vi.fn();
const createOrderMock = vi.fn();

let cartItems: any[] = [];

vi.mock('@/hooks/useCart', () => ({
  useCart: () => ({
    items: cartItems,
    bundleIds: ['bundle-5-plus-1'],
    subtotal: 1200,
    clearCart: clearCartMock,
    getItemTotal: (item: { quantity: number }) => item.quantity * 200,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1', firstName: 'Jane', lastName: 'Stylist', email: 'jane@tessa.mk',
      phone: '078 286 003', address: '1 Test Street', city: 'Skopje', postcode: '1000',
    },
    token: 'token', isAuthenticated: true, isProfessional: true,
  }),
}));

vi.mock('@/hooks/useDiscounts', () => ({
  useDiscounts: () => ({
    appliedCode: null, applyCode: vi.fn(), removeCode: vi.fn(), discountAmount: 0,
    discountPercent: 0, error: null, isValidating: false, clearError: vi.fn(),
  }),
}));

vi.mock('@/features/orders/api', () => ({
  useCreateOrderMutation: () => [createOrderMock],
}));

vi.mock('@/features/products/api', () => ({
  useGetBundlesQuery: () => ({ data: [] }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'cart.yourCartIsEmpty': 'Your cart is empty',
      'checkout.emptyCartCheckout': 'Add some products before checking out.',
      'checkout.firstName': 'First name',
      'checkout.lastName': 'Last name',
      'checkout.email': 'Email',
      'checkout.phone': 'Phone',
      'checkout.continueToReview': 'Continue to review',
      'checkout.placeOrder': 'Place Order',
      'checkout.orderSuccess': 'Order Placed Successfully!',
    }[key] ?? key),
  }),
}));

function renderCheckout() {
  return render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
}

describe('Checkout flow', () => {
  beforeEach(() => {
    clearCartMock.mockReset();
    createOrderMock.mockReset();
    createOrderMock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ id: 'order-123' }) });
    cartItems = [];
  });

  it('blocks checkout when the cart is empty', () => {
    renderCheckout();

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Add some products before checking out.')).toBeInTheDocument();
  });

  it('autofills the shipping form from the signed-in profile', async () => {
    cartItems = [{
      productId: '1', quantity: 2,
      product: { id: '1', name: 'Shampoo', image: null, price: 200 },
    }];
    renderCheckout();

    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Jane'));
    expect(screen.getByLabelText('Last name')).toHaveValue('Stylist');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@tessa.mk');
    expect(screen.getByLabelText('Phone')).toHaveValue('078 286 003');
  });

  it('submits the frozen cart items and applied bundle IDs', async () => {
    cartItems = [{
      productId: '1', quantity: 2,
      product: { id: '1', name: 'Shampoo', image: null, price: 200 },
    }];
    renderCheckout();
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Jane'));
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    await user.click(await screen.findByRole('button', { name: /Place Order/ }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ product_id: 1, qty: 2 }],
      bundle_ids: ['bundle-5-plus-1'],
      payment_method: 'cod',
    })));
    expect(clearCartMock).toHaveBeenCalledOnce();
    expect(await screen.findByText('Order Placed Successfully!')).toBeInTheDocument();
  });
});
