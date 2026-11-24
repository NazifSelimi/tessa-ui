import { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { App } from 'antd';
import { EyeOff, Megaphone, Pencil, Star } from 'lucide-react';
import { lazyWithReload } from '@/shared/utils/chunkReload';
import { useUpdateBundleMutation } from '@/features/admin/api';
import type { StoreBundle } from '@/types';

// Customers never load the editor; it is fetched the first time an admin opens it.
const BundleEditorDrawer = lazyWithReload(() => import('@/features/admin/BundleEditorDrawer'));

/** Edit, picture / post, feature and hide for one offer card in the shop. Load it through AdminBundleShortcuts. */
export function AdminBundleControls({ bundle }: { bundle: StoreBundle }) {
  const { modal, message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [updateBundle] = useUpdateBundleMutation();

  const save = async (data: { is_active?: boolean; is_featured?: boolean }, done: string) => {
    try {
      await updateBundle({ id: bundle.id, data }).unwrap();
      message.success(done);
    } catch (error: any) {
      message.error(error?.data?.message || 'Failed to save');
    }
  };

  const confirmHide = () => modal.confirm({
    title: 'Hide offer',
    content: `Make "${bundle.name}" a draft? It leaves the shop; switch it back on in Admin → Offers.`,
    okText: 'Hide',
    onOk: () => save({ is_active: false }, 'Offer hidden'),
  });

  return <>
    <div className="nl-admin-controls nl-admin-controls--card" role="group" aria-label={`Admin: ${bundle.name}`}>
      <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${bundle.name}`} title="Edit offer"><Pencil size={15} /></button>
      <Link to={`/admin/studio?bundle=${bundle.id}`} aria-label={`Picture or post for ${bundle.name}`} title="Picture / make a post"><Megaphone size={15} /></Link>
      <button type="button" onClick={() => save({ is_featured: !bundle.isFeatured }, bundle.isFeatured ? 'No longer featured' : 'Featured first')}
        aria-pressed={bundle.isFeatured} aria-label={`${bundle.isFeatured ? 'Stop featuring' : 'Feature'} ${bundle.name}`} title={bundle.isFeatured ? 'Stop featuring' : 'Feature first'}>
        <Star size={15} fill={bundle.isFeatured ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className="nl-admin-controls__danger" onClick={confirmHide} aria-label={`Hide ${bundle.name}`} title="Hide (make draft)"><EyeOff size={15} /></button>
    </div>
    {editing && <Suspense fallback={null}>
      <BundleEditorDrawer open bundle={bundle} onClose={() => setEditing(false)} />
    </Suspense>}
  </>;
}
