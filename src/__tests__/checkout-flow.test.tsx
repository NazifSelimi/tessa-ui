import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '@/pages/CheckoutPage';

const clearCartMock = vi.fn();
const createOrderMock = vi.fn();
let cartQuote: any;
let isProfessional = true;
const applyCodeMock = vi.fn();
let referralCode: string | null = null;

vi.mock('@/shared/utils/referral', () => ({
  storedReferralCode: () => referralCode,
  forgetReferralCode: () => { referralCode = null; },
}));

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
    token: 'token', isAuthenticated: true, isProfessional,
  }),
}));

vi.mock('@/hooks/useDiscounts', () => ({
  useDiscounts: () => ({
    appliedCode: null, applyCode: applyCodeMock, removeCode: vi.fn(), discountAmount: 0, getDiscountForSubtotal: () => 0,
    discountPercent: 0, error: null, isValidating: false, clearError: vi.fn(),
  }),
}));

vi.mock('@/features/orders/api', () => ({
  useCreateOrderMutation: () => [createOrderMock],
  useGetCartQuoteQuery: () => ({ currentData: cartQuote }),
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
    cartQuote = undefined;
    isProfessional = true;
    applyCodeMock.mockReset();
    applyCodeMock.mockResolvedValue(true);
    referralCode = null;
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

  it('shows the total the server will charge, including a limited discount', async () => {
    cartItems = [{
      productId: '1', quantity: 2,
      product: { id: '1', name: 'Shampoo', image: null, price: 200 },
    }];
    cartQuote = {
      subtotal: 1200, bundleDiscount: 100, couponDiscount: 0, discount: 100, discountLimited: true,
      appliedBundleIds: ['bundle-5-plus-1'], skippedBundles: [], couponCode: null, couponError: null,
      shipping: 150, amountToFreeShipping: 1800, total: 1250,
    };
    renderCheckout();

    expect(await screen.findByText('checkout.discountLimited')).toBeInTheDocument();
    expect(screen.getAllByText(/1[.,\s]?250/).length).toBeGreaterThan(0);
  });

  it('pays with store credit when the account has some', async () => {
    cartItems = [{
      productId: '1', quantity: 2,
      product: { id: '1', name: 'Shampoo', image: null, price: 200 },
    }];
    cartQuote = {
      subtotal: 1200, bundleDiscount: 0, couponDiscount: 0, discount: 0, discountLimited: false,
      appliedBundleIds: [], skippedBundles: [], couponCode: null, couponError: null, isReferralCode: false,
      shipping: 150, amountToFreeShipping: 1800, total: 1350,
      storeCreditAvailable: 300, storeCreditUsed: 300, totalToPay: 1050,
    };
    renderCheckout();
    const user = userEvent.setup();

    expect(await screen.findByText('referral.useCredit')).toBeInTheDocument();
    expect(screen.getAllByText(/1[.,\s]?050/).length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Jane'));
    await user.click(screen.getByRole('button', { name: 'Continue to review' }));
    await user.click(await screen.findByRole('button', { name: /Place Order/ }));

    await waitFor(() => expect(createOrderMock).toHaveBeenCalledWith(expect.objectContaining({ use_store_credit: true })));
  });

  it('applies a code from a stylist link for clients only', async () => {
    cartItems = [{
      productId: '1', quantity: 1,
      product: { id: '1', name: 'Shampoo', image: null, price: 200 },
    }];
    referralCode = 'ANA10';

    renderCheckout();
    await screen.findByText('Place Order', { exact: false }).catch(() => null);
    expect(applyCodeMock).not.toHaveBeenCalled();

    isProfessional = false;
    renderCheckout();
    await waitFor(() => expect(applyCodeMock).toHaveBeenCalledWith('ANA10', expect.any(Number)));
  });
});
