import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';

const loginMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock('@/features/auth/social', () => ({
  startSocialAuth: vi.fn(),
}));

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string) => ({
      'auth.signIn': 'Sign in',
      'auth.password': 'Password',
      'auth.enterPassword': 'Please enter your password',
      'auth.welcomeBack': 'Welcome back',
    }[key] ?? key),
    i18n: { language: 'en', changeLanguage: vi.fn(), t: (key: string) => key },
  }),
}));

function renderLogin(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/stylist/quick-order" element={<div>Quick order</div>} />
        <Route path="/stylist/workspace" element={<div>Workspace</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Login flow', () => {
  beforeEach(() => {
    loginMock.mockReset();
    loginMock.mockResolvedValue({ id: 'user-1' });
  });

  it('accepts either an email address or phone number as the account identifier', () => {
    renderLogin();

    expect(screen.getByLabelText('Email or phone number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Phone number or you@example.com')).toBeInTheDocument();
  });

  it('shows the current required-field messages', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Enter your email or phone number.')).toBeInTheDocument();
    expect(await screen.findByText('Please enter your password')).toBeInTheDocument();
  });

  it('returns to the continue route after login', async () => {
    renderLogin(['/login?continue=%2Fstylist%2Fquick-order']);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email or phone number'), '078286003');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('078286003', 'password123'));
    expect(await screen.findByText('Quick order')).toBeInTheDocument();
  });
});
