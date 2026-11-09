/**
 * Which switchable features are on, for the shop and the admin. One small
 * request per page load, shared by every component, with no Redux needed.
 * Unknown / still loading = on, so nothing flickers away while it loads.
 */
import { useSyncExternalStore } from 'react';

export type FeaturePlan = 'basic' | 'pro' | 'premium';
export interface FeatureState { enabled: boolean; plan: FeaturePlan; included: boolean }
export type FeatureMap = Record<string, FeatureState>;

let states: FeatureMap | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Accepts the new {enabled, plan, included} shape and the older plain booleans. */
function normalize(data: Record<string, unknown>): FeatureMap {
  const result: FeatureMap = {};
  Object.entries(data ?? {}).forEach(([key, value]) => {
    result[key] = typeof value === 'boolean'
      ? { enabled: value, plan: 'basic', included: true }
      : { enabled: Boolean((value as FeatureState)?.enabled), plan: (value as FeatureState)?.plan ?? 'basic', included: (value as FeatureState)?.included !== false };
  });
  return result;
}

export function refreshFeatures(): Promise<void> {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
  loading = fetch(`${base.replace(/\/$/, '')}/v1/features`, { headers: { Accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => {
      if (body?.data) {
        states = normalize(body.data);
        emit();
      }
    })
    .catch(() => undefined);
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!states && !loading && typeof fetch !== 'undefined') void refreshFeatures();
  return () => listeners.delete(listener);
}

export function useFeatureStates(): FeatureMap | null {
  return useSyncExternalStore(subscribe, () => states, () => null);
}

/** True unless the feature is switched off or not in the shop's plan. */
export function useFeature(key: string): boolean {
  const state = useFeatureStates()?.[key];
  return !state || (state.enabled && state.included);
}
