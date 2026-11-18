import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { logout } from '@/features/auth/slice';
import { buildRecommendationPayload, loadHairProfile, saveHairProfile } from '@/shared/utils/hairProfile';
import { logoutCleanupMiddleware } from '@/store/logoutCleanupMiddleware';

const KEY = 'tessa-hair-profile';

describe('hair profile storage', () => {
  beforeEach(() => {
    // The test runtime's own localStorage is not usable, so use a plain in-memory one.
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => { data.set(k, String(v)); },
      removeItem: (k: string) => { data.delete(k); },
      clear: () => data.clear(),
    });
  });

  it('stores only answers, steps and budget', () => {
    saveHairProfile({ pattern: ['curly'] }, ['shampoo'], 'mid');
    const raw = JSON.parse(localStorage.getItem(KEY) as string);
    expect(Object.keys(raw).sort()).toEqual(['answers', 'budget', 'savedAt', 'steps']);
    expect(loadHairProfile()).toMatchObject({ answers: { pattern: ['curly'] }, steps: ['shampoo'], budget: 'mid' });
  });

  it('drops product data from an old save and migrates the survey', () => {
    localStorage.setItem(KEY, JSON.stringify({
      recommendations: { products: [{ id: 1, price: 500 }] },
      survey: { steps: ['shampoo'], budget_range: 'low' },
      answers: { pattern: ['wavy'] },
      savedAt: 'x',
    }));
    expect(loadHairProfile()).toMatchObject({ steps: ['shampoo'], budget: 'low' });
    expect(localStorage.getItem(KEY)).not.toContain('recommendations');
  });

  it('ignores an old save that has no answers', () => {
    localStorage.setItem(KEY, JSON.stringify({ recommendations: { products: [] } }));
    expect(loadHairProfile()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('builds the request without a budget when none is chosen', () => {
    expect(buildRecommendationPayload({}, ['shampoo'], null)).toEqual({ hair_type_ids: [], concerns: [], steps: ['shampoo'] });
  });

  it('is cleared on logout', () => {
    saveHairProfile({ pattern: ['curly'] }, [], null);
    const store = configureStore({ reducer: { auth: authReducer }, middleware: (g) => g().concat(logoutCleanupMiddleware) });
    store.dispatch(logout());
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
