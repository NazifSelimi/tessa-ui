/**
 * Stylist referral links: tessa.mk/?ref=ANA10 remembers the code in this
 * browser so checkout can apply it. Storage can be blocked (private mode),
 * so every access is guarded and a missing value just means "no code".
 */
const KEY = 'tessa.referralCode';
const CODE = /^[A-Z0-9-]{4,20}$/;

export function captureReferralCode(search: string): void {
  const code = new URLSearchParams(search).get('ref')?.trim().toUpperCase();
  if (!code || !CODE.test(code)) return;
  try { localStorage.setItem(KEY, code); } catch { /* storage unavailable */ }
}

export function storedReferralCode(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function forgetReferralCode(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export function referralLink(code: string): string {
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}
