/**
 * Hair profile persistence (localStorage).
 *
 * Only the quiz answers are kept (no products or prices): they let "Edit answers"
 * and a refresh pick up where the person left off, and the recommendations are
 * fetched again from them so prices and stock are never stale. Cleared on logout.
 *
 * This is the guest-tier store. A logged-in, server-backed hair profile is a
 * later phase.
 */

import type { RecommendationPayload } from '@/types';
import {
  answerNeedIds,
  answerTypeIds,
  type QuizAnswers,
} from '@/features/quiz/quizConfig';

const STORAGE_KEY = 'tessa-hair-profile';

export interface StoredHairProfile {
  answers: QuizAnswers;
  steps: string[];
  budget: string | null;
  savedAt: string;
}

/** The request body for POST /v1/recommendations, built from the answers. */
export function buildRecommendationPayload(
  answers: QuizAnswers,
  steps: string[],
  budget: string | null,
): RecommendationPayload {
  return {
    hair_type_ids: answerTypeIds(answers),
    concerns: answerNeedIds(answers),
    steps,
    ...(budget ? { budget_range: budget } : {}),
  };
}

export function saveHairProfile(answers: QuizAnswers, steps: string[], budget: string | null): void {
  try {
    const payload: StoredHairProfile = { answers, steps, budget, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage full / unavailable — non-fatal, the in-memory flow still works */
  }
}

export function loadHairProfile(): StoredHairProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredHairProfile> & {
      recommendations?: unknown;
      survey?: { steps?: string[]; budget_range?: string };
    };
    if (!parsed?.answers) {
      // Older saves held full product objects and no answers: nothing to keep.
      if (parsed?.recommendations) clearHairProfile();
      return null;
    }
    const profile: StoredHairProfile = {
      answers: parsed.answers,
      steps: parsed.steps ?? parsed.survey?.steps ?? [],
      budget: parsed.budget ?? parsed.survey?.budget_range ?? null,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
    // Drop the product data an older save carried.
    if (parsed.recommendations) saveHairProfile(profile.answers, profile.steps, profile.budget);
    return profile;
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
