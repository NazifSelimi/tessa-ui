import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { App, InputNumber } from 'antd';
import { Check, Images, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeleteProductMutation, useUpdateProductMutation } from '@/features/admin/api';
import { useGetProductByIdQuery } from '@/features/products/api';
import type { Product } from '@/types';

// Customers never load the editor; it is fetched the first time an admin opens it.
const ProductEditorModal = lazy(() => import('@/features/admin/ProductEditorModal'));

interface AdminProductControlsProps {
  /** Lists may hold a slim copy; the editor always loads the full product. */
  product: Pick<Product, 'id' | 'name'> & Partial<Product>;
  /** "card" is a compact icon row; "page" shows labelled buttons. */
  variant?: 'card' | 'page';
  onDeleted?: () => void;
}

/** Edit, photos and delete for one product. Load it through AdminShortcuts so customers never download it. */
export function AdminProductControls({ product, variant = 'card', onDeleted }: AdminProductControlsProps) {
  const { modal, message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [deleteProduct] = useDeleteProductMutation();
  const { data: fullProduct } = useGetProductByIdQuery(String(product.id), { skip: !editing });

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
      <Link to={`/admin/studio?product=${product.id}`} aria-label={`Make a social post for ${product.name}`} title="Make a post"><Megaphone size={15} />{labelled && 'Make post'}</Link>
      <button type="button" className="nl-admin-controls__danger" onClick={confirmDelete} aria-label={`Delete ${product.name}`} title="Delete"><Trash2 size={15} />{labelled && 'Delete'}</button>
      {labelled && product.price !== undefined && <QuickFields product={product as Product} />}
    </div>
    {editing && fullProduct && <Suspense fallback={null}>
      <ProductEditorModal open product={fullProduct} onClose={() => setEditing(false)} />
    </Suspense>}
  </>;
}

/** Price and stock, saved in place without opening the full editor. */
function QuickFields({ product }: { product: Product }) {
  const { message } = App.useApp();
  const [updateProduct, { isLoading }] = useUpdateProductMutation();
  const [price, setPrice] = useState<number | null>(Number(product.price ?? 0));
  const [quantity, setQuantity] = useState<number | null>(product.quantity ?? 0);
  const changed = price !== Number(product.price ?? 0) || quantity !== (product.quantity ?? 0);

  const save = async () => {
    const data = new FormData();
    if (price !== Number(product.price ?? 0)) data.append('price', String(price ?? 0));
    if (quantity !== (product.quantity ?? 0)) data.append('quantity', String(quantity ?? 0));
    try {
      await updateProduct({ id: String(product.id), data }).unwrap();
      message.success('Saved');
    } catch (error: any) {
      message.error(error?.data?.message || 'Failed to save');
    }
  };

  return <div className="nl-admin-quick">
    <label>Price<InputNumber size="small" min={0} value={price} onChange={setPrice} onPressEnter={() => changed && save()} suffix="MKD" /></label>
    <label>Stock<InputNumber size="small" min={0} value={quantity} onChange={setQuantity} onPressEnter={() => changed && save()} /></label>
    <button type="button" disabled={!changed || isLoading} onClick={save}><Check size={15} />Save</button>
  </div>;
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
