import { Suspense, type ComponentProps } from 'react';
import { lazyWithReload } from '@/shared/utils/chunkReload';
import { useAuth } from '@/hooks/useAuth';

// Admin product tools are a separate chunk, fetched only once an admin is signed in.
const Controls = lazyWithReload(() => import('./AdminProductControls').then((m) => ({ default: m.AdminProductControls })));
const AddButton = lazyWithReload(() => import('./AdminProductControls').then((m) => ({ default: m.AdminAddProductButton })));

export function AdminProductShortcuts(props: ComponentProps<typeof Controls>) {
  const { isAdmin } = useAuth();
  return isAdmin ? <Suspense fallback={null}><Controls {...props} /></Suspense> : null;
}

export function AdminAddProductShortcut() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Suspense fallback={null}><AddButton /></Suspense> : null;
}
