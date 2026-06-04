/**
 * Hair profile persistence (localStorage).
 *
 * The quiz result was previously held only in React Router `location.state`,
 * so a refresh, back-button, or shared link lost everything. We mirror the
 * latest result to localStorage so the recommendations page can recover it and
 * returning visitors can pick up where they left off.
 *
 * This is the guest-tier store. A logged-in, server-backed hair profile is a
 * later phase; the shape here is intentionally forward-compatible with it.
 */

import type { RecommendationResult, RecommendationPayload } from '@/types';

const STORAGE_KEY = 'tessa-hair-profile';

export interface StoredHairProfile {
  recommendations: RecommendationResult;
  survey: RecommendationPayload;
  savedAt: string;
}

export function saveHairProfile(
  recommendations: RecommendationResult,
  survey: RecommendationPayload,
): void {
  try {
    const payload: StoredHairProfile = {
      recommendations,
      survey,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage full / unavailable — non-fatal, the in-memory flow still works */
  }
}

export function loadHairProfile(): StoredHairProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHairProfile;
    if (!parsed?.recommendations) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearHairProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
