import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeature } from '@/shared/hooks/useFeature';
import type { FeatureKey } from '@/features/admin/platformApi';

/** Renders a page only while its feature is switched on (Admin → Features); otherwise sends people elsewhere. */
export default function FeatureGate({ feature, children, fallback = '/shop' }: { feature: FeatureKey; children: ReactNode; fallback?: string }) {
  return useFeature(feature) ? <>{children}</> : <Navigate to={fallback} replace />;
}
