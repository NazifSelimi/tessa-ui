import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { Images, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteProductMutation } from '@/features/admin/api';
import type { Product } from '@/types';

// Customers never load the editor; it is fetched the first time an admin opens it.
const ProductEditorModal = lazy(() => import('@/features/admin/ProductEditorModal'));

interface AdminProductControlsProps {
  product: Product;
  /** "card" is a compact icon row; "page" shows labelled buttons. */
  variant?: 'card' | 'page';
  onDeleted?: () => void;
}

/** Edit, photos and delete for one product. Load it through AdminShortcuts so customers never download it. */
export function AdminProductControls({ product, variant = 'card', onDeleted }: AdminProductControlsProps) {
  const { modal, message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [deleteProduct] = useDeleteProductMutation();

  const confirmDelete = () => {
    modal.confirm({
      title: 'Delete product',
      content: `Delete "${product.name}"? This cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProduct(String(product.id)).unwrap();
          message.success('Product deleted');
          onDeleted?.();
        } catch (error: any) {
          message.error(error?.data?.message || 'Failed to delete product');
        }
      },
    });
  };

  const labelled = variant === 'page';

  return <>
    <div className={`nl-admin-controls nl-admin-controls--${variant}`} role="group" aria-label={`Admin: ${product.name}`}>
      {labelled && <span className="nl-admin-controls__tag">Admin</span>}
      <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${product.name}`} title="Edit"><Pencil size={15} />{labelled && 'Edit'}</button>
      <Link to={`/admin/catalog-images?product=${product.id}`} aria-label={`Photos of ${product.name}`} title="Photos"><Images size={15} />{labelled && 'Photos'}</Link>
      <button type="button" className="nl-admin-controls__danger" onClick={confirmDelete} aria-label={`Delete ${product.name}`} title="Delete"><Trash2 size={15} />{labelled && 'Delete'}</button>
    </div>
    {editing && <Suspense fallback={null}>
      <ProductEditorModal open product={product} onClose={() => setEditing(false)} />
    </Suspense>}
  </>;
}

/** "Add product" for admins on shop pages; opens the new product once it is saved. */
export function AdminAddProductButton() {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  return <>
    <button type="button" className="nl-button nl-button-dark nl-admin-add" onClick={() => setAdding(true)}><Plus size={17} />Add product</button>
    {adding && <Suspense fallback={null}>
      <ProductEditorModal
        open
        product={null}
        onClose={() => setAdding(false)}
        onSaved={(saved) => { if (saved?.id) navigate(`/product/${saved.id}`); }}
      />
    </Suspense>}
  </>;
}
