import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Empty, Image, Input, Select, Space, Spin, Switch, Tag, Tooltip, Typography, message } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ProductPhotoEditor from '@/features/studio/ProductPhotoEditor';

/**
 * "Fix products": every product with something to fix, most important first,
 * with a fast way to add photos (drop, paste or web address). Photos are only
 * ever added through the same admin upload as Image Review; nothing is
 * replaced or deleted here.
 */
const API = import.meta.env.VITE_API_URL as string;
const DONE_KEY = 'tessa.productFixes.done';
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type Problem = { group: string; code: string; label: string; detail?: string | null };
type Row = {
  id: number; name: string; brand?: string | null; category?: string | null; size?: string | null; manufacturer_code?: string | null;
  price?: string | null; stylist_price?: string | null; quantity: number; visible: boolean; live: boolean; orders: number;
  image_count: number; thumbnail?: string | null; groups: string[]; problems: Problem[];
};
type Report = { total_products: number; products_with_problems: number; summary: { group: string; label: string; products: number }[]; products: Row[] };
type Asset = { id: number; url: string; alt: string; variant: string; review_status: string; is_primary: boolean };

const GROUP_COLORS: Record<string, string> = { photo: 'red', description: 'orange', category: 'gold', duplicate: 'purple', price: 'magenta', size: 'cyan', stock: 'blue', hidden: 'default' };

function readDone(): number[] {
  try { return JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); } catch { return []; }
}

export default function AdminProductFixesPage() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [group, setGroup] = useState(params.get('group') || 'all');
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [hideDone, setHideDone] = useState(true);
  const [done, setDone] = useState<number[]>(readDone);
  const [images, setImages] = useState<Asset[]>();
  const [imagesLoading, setImagesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  // A picture waiting for "Remove background / edit" or "Use as is".
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [editor, setEditor] = useState<{ file?: File; source?: string } | null>(null);
  const editing = !!pending || !!editor;
  const clearPending = useCallback(() => {
    setPending(old => { if (old) URL.revokeObjectURL(old.preview); return null; });
  }, []);
  const fileInput = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedId = Number(params.get('product')) || undefined;

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API}/v1/admin/${path}`, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
    if (response.status === 413) throw new Error('The server rejected this file size. Please use a smaller image.');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Request failed. Please retry.');
    return body;
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    request('products/problems', { signal: controller.signal })
      .then(setReport)
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, refresh]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (report?.products || []).filter(r =>
      (group === 'all' || r.groups.includes(group))
      && (!brand || r.brand === brand) && (!category || r.category === category)
      && (!hideDone || !done.includes(r.id) || r.id === selectedId)
      && (!q || `${r.id} ${r.name} ${r.brand} ${r.category} ${r.manufacturer_code}`.toLowerCase().includes(q)));
  }, [report, group, brand, category, hideDone, done, search, selectedId]);

  const counts = useMemo(() => {
    const base = (report?.products || []).filter(r => (!brand || r.brand === brand) && (!category || r.category === category) && (!hideDone || !done.includes(r.id)));
    const result: Record<string, number> = { all: base.length };
    base.forEach(r => r.groups.forEach(g => { result[g] = (result[g] || 0) + 1; }));
    return result;
  }, [report, brand, category, hideDone, done]);

  const selected = (report?.products || []).find(r => r.id === selectedId);
  const index = rows.findIndex(r => r.id === selectedId);

  const select = useCallback((id?: number) => {
    const next = new URLSearchParams(params);
    if (id) next.set('product', String(id)); else next.delete('product');
    setParams(next, { replace: true });
  }, [params, setParams]);

  // Open the first product when nothing is selected yet.
  useEffect(() => { if (!selectedId && rows.length) select(rows[0].id); }, [rows, selectedId, select]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedId]);

  const loadImages = useCallback((id: number, signal?: AbortSignal) => {
    setImagesLoading(true);
    return request(`products/${id}/images`, { signal })
      .then(body => setImages(body.images || []))
      .catch(e => { if (!signal?.aborted) message.error(e.message); })
      .finally(() => { if (!signal?.aborted) setImagesLoading(false); });
  }, [request]);

  useEffect(() => {
    clearPending(); setEditor(null);
    setImages(undefined);
    if (!selectedId) return;
    const controller = new AbortController();
    loadImages(selectedId, controller.signal);
    return () => controller.abort();
  }, [selectedId, loadImages, clearPending]);

  const move = useCallback((step: number) => {
    if (!rows.length) return;
    const from = index < 0 ? (step > 0 ? -1 : rows.length) : index;
    const target = rows[Math.min(rows.length - 1, Math.max(0, from + step))];
    if (target) select(target.id);
  }, [rows, index, select]);

  const markDone = useCallback(() => {
    if (!selectedId) return;
    const nextRow = rows[index + 1] ?? rows[index - 1];
    setDone(list => {
      const next = list.includes(selectedId) ? list : [...list, selectedId];
      try { localStorage.setItem(DONE_KEY, JSON.stringify(next)); } catch { /* storage may be blocked */ }
      return next;
    });
    select(nextRow && nextRow.id !== selectedId ? nextRow.id : undefined);
  }, [selectedId, rows, index, select]);

  const afterUpload = useCallback((body: { images?: Asset[] }) => {
    if (body.images) setImages(body.images);
    message.success('Photo added.');
    setRefresh(x => x + 1);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!selectedId || busy) return false;
    if (!TYPES.includes(file.type)) { message.error('Use a JPG, PNG or WebP image (iPhone HEIC photos: export as JPG first).'); return false; }
    if (file.size > 10 * 1024 * 1024) { message.error('The image is larger than 10 MB.'); return false; }
    const data = new FormData();
    data.append('image', file);
    data.append('alt', selected?.name || '');
    setBusy(true);
    try { afterUpload(await request(`products/${selectedId}/images`, { method: 'POST', body: data })); return true; }
    catch (e) { message.error((e as Error).message); return false; }
    finally { setBusy(false); }
  }, [selectedId, busy, selected, request, afterUpload]);

  /** Hold a new picture so it can be cleaned (remove background, crop) before it is added. */
  const stage = useCallback((file: File) => {
    if (!selectedId) return;
    if (!TYPES.includes(file.type)) { message.error('Use a JPG, PNG or WebP image (iPhone HEIC photos: export as JPG first).'); return; }
    setPending(old => { if (old) URL.revokeObjectURL(old.preview); return { file, preview: URL.createObjectURL(file) }; });
  }, [selectedId]);

  const uploadUrl = useCallback(async (address: string) => {
    const value = address.trim();
    if (!selectedId || busy || !value) return;
    if (!/^https?:\/\//i.test(value)) { message.error('Paste a web address that starts with http:// or https://'); return; }
    setBusy(true);
    try {
      // Downloaded by the server: websites usually block the browser from reading their pictures.
      const response = await fetch(`${API}/v1/admin/products/image-preview`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ url: value }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || 'The picture could not be downloaded.'); }
      const blob = await response.blob();
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      stage(new File([blob], `from-link.${ext}`, { type: blob.type || 'image/jpeg' }));
      setUrl('');
    }
    catch (e) { message.error((e as Error).message); }
    finally { setBusy(false); }
  }, [selectedId, busy, token, stage]);

  const makePrimary = async (asset: Asset) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const body = await request(`products/${selectedId}/images/${asset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ make_primary: true }) });
      setImages(body.images || []); message.success('Main photo changed. The old one stays in the gallery.'); setRefresh(x => x + 1);
    } catch (e) { message.error((e as Error).message); } finally { setBusy(false); }
  };

  // Paste an image or an image address anywhere on the page (Ctrl/Cmd+V).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (editor) return;
      const target = event.target as HTMLElement | null;
      const file = Array.from(event.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
      if (file) { event.preventDefault(); stage(file); return; }
      if (target?.closest?.('input, textarea, [contenteditable="true"]')) return;
      const text = event.clipboardData?.getData('text') || '';
      if (/^https?:\/\//i.test(text.trim())) { event.preventDefault(); void uploadUrl(text); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [stage, uploadUrl, editor]);

  // J/K or arrow keys move through the list; D (or Enter) = done, next.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || editing) return;
      if ((event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"], .ant-select')) return;
      const key = event.key.toLowerCase();
      if (key === 'j' || key === 'arrowdown' || key === 'arrowright') { event.preventDefault(); move(1); }
      else if (key === 'k' || key === 'arrowup' || key === 'arrowleft') { event.preventDefault(); move(-1); }
      else if (key === 'd' || key === 'enter') { event.preventDefault(); markDone(); }
      else if (key === 'u') { event.preventDefault(); fileInput.current?.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, markDone, editing]);

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault(); setDragging(false);
    const file = Array.from(event.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (file) { stage(file); return; }
    const link = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
    if (link) void uploadUrl(link.split('\n')[0]);
  };

  const brands = useMemo(() => [...new Set((report?.products || []).map(r => r.brand).filter(Boolean) as string[])].sort(), [report]);
  const categories = useMemo(() => [...new Set((report?.products || []).map(r => r.category).filter(Boolean) as string[])].sort(), [report]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>Fix products</Typography.Title>
        <Typography.Text type="secondary">
          {report ? `${report.products_with_problems} of ${report.total_products} products need attention. ` : ''}
          Most important first: products in stock and shown without a photo. Keys: J / K next / previous · D done · U upload · Ctrl/Cmd+V paste a photo or image address.
        </Typography.Text>
      </div>
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRefresh(x => x + 1)}>Retry</Button>} />}
      <Space wrap>
        <Button type={group === 'all' ? 'primary' : 'default'} onClick={() => setGroup('all')}>All <Badge count={counts.all || 0} overflowCount={9999} showZero style={{ marginLeft: 6 }} color="#999" /></Button>
        {report?.summary.map(s => (
          <Button key={s.group} type={group === s.group ? 'primary' : 'default'} onClick={() => setGroup(s.group)}>
            {s.label} <Badge count={counts[s.group] || 0} overflowCount={9999} showZero style={{ marginLeft: 6 }} color={counts[s.group] ? undefined : '#bbb'} />
          </Button>
        ))}
      </Space>
      <Space wrap>
        <Input.Search aria-label="Search products" placeholder="Name, ID or code" allowClear value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
        <Select aria-label="Brand" placeholder="All brands" allowClear value={brand} onChange={setBrand} options={brands.map(b => ({ value: b, label: b }))} style={{ width: 170 }} />
        <Select aria-label="Category" placeholder="All categories" allowClear value={category} onChange={setCategory} options={categories.map(c => ({ value: c, label: c }))} style={{ width: 190 }} />
        <Space size={6}><Switch size="small" checked={hideDone} onChange={setHideDone} /> Hide done ({done.length})</Space>
        {done.length > 0 && <Button size="small" onClick={() => { setDone([]); try { localStorage.removeItem(DONE_KEY); } catch { /* ignore */ } }}>Reset done</Button>}
        <Button size="small" onClick={() => setRefresh(x => x + 1)}>Refresh</Button>
      </Space>

      <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div ref={listRef} role="listbox" aria-label="Products to fix" style={{ flex: '1 1 300px', maxWidth: 420, height: 'calc(100vh - 290px)', minHeight: 360, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
          {loading ? <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div> : rows.length === 0 ? <Empty style={{ padding: 32 }} description="Nothing to fix here." /> : rows.map(r => (
            <div key={r.id} data-id={r.id} role="option" aria-selected={r.id === selectedId} tabIndex={-1} onClick={() => select(r.id)}
              style={{ display: 'flex', gap: 10, padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', background: r.id === selectedId ? '#e6f4ff' : undefined, opacity: done.includes(r.id) ? 0.5 : 1 }}>
              <div style={{ width: 44, height: 44, flex: 'none', borderRadius: 4, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {r.thumbnail ? <img src={r.thumbnail} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} loading="lazy" /> : <Typography.Text type="danger" style={{ fontSize: 10 }}>no photo</Typography.Text>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>#{r.id} · {r.brand || 'no brand'} · {r.quantity} in stock{r.live ? ' · shown' : ''}</Typography.Text>
                <div>{r.groups.map(g => <Tag key={g} color={GROUP_COLORS[g]} style={{ fontSize: 11, marginTop: 2 }}>{report?.summary.find(s => s.group === g)?.label || g}</Tag>)}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: '3 1 420px', minWidth: 0 }}>
          {!selected ? <Empty description={loading ? 'Loading…' : 'Choose a product on the left.'} /> : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <Typography.Title level={3} style={{ margin: 0 }}>{selected.name}</Typography.Title>
                  <Typography.Text type="secondary">
                    #{selected.id} · {selected.brand || 'no brand'} · {selected.category || 'no category'}{selected.size ? ` · ${selected.size}` : ''}{selected.manufacturer_code ? ` · code ${selected.manufacturer_code}` : ''}
                  </Typography.Text>
                  <div>
                    <Typography.Text>Shop {selected.price ?? '–'} · Salon {selected.stylist_price ?? '–'} · {selected.quantity} in stock · {selected.visible ? 'shown' : 'hidden'} · ordered {selected.orders}×</Typography.Text>
                  </div>
                </div>
                <Space wrap>
                  <Tooltip title="Previous (K)"><Button onClick={() => move(-1)} disabled={index <= 0}>‹ Prev</Button></Tooltip>
                  <Typography.Text type="secondary">{index + 1} / {rows.length}</Typography.Text>
                  <Tooltip title="Next (J)"><Button onClick={() => move(1)} disabled={index >= rows.length - 1}>Next ›</Button></Tooltip>
                  <Tooltip title="Done, go to next (D)"><Button type="primary" onClick={markDone}>Done / skip ›</Button></Tooltip>
                </Space>
              </div>

              <div>
                {selected.problems.map((p, i) => (
                  <div key={`${p.code}-${i}`} style={{ marginBottom: 4 }}>
                    <Tag color={GROUP_COLORS[p.group]}>{report?.summary.find(s => s.group === p.group)?.label}</Tag>
                    <Typography.Text strong>{p.label}</Typography.Text>{p.detail ? <Typography.Text type="secondary"> — {p.detail}</Typography.Text> : null}
                  </div>
                ))}
                <Space wrap style={{ marginTop: 6 }}>
                  <Link to={`/admin/products?search=${selected.id}`}>Edit product (name, category, price, texts)</Link>
                  <Link to={`/admin/catalog-images?product=${selected.id}`}>All photo tools</Link>
                </Space>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                style={{ border: `2px dashed ${dragging ? '#1677ff' : '#d9d9d9'}`, borderRadius: 8, padding: 16, background: dragging ? '#f0f7ff' : '#fafafa', textAlign: 'center' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Typography.Text strong>Add a photo: drop a file or an image from another tab here, or press Ctrl/Cmd+V — then remove the background or use it as is</Typography.Text>
                  <Space wrap style={{ justifyContent: 'center' }}>
                    <input ref={fileInput} type="file" accept={TYPES.join(',')} hidden onChange={e => { const f = e.target.files?.[0]; if (f) stage(f); e.target.value = ''; }} />
                    <Button type="primary" loading={busy} onClick={() => fileInput.current?.click()}>Choose file (U)</Button>
                    <Input aria-label="Image web address" placeholder="…or paste an image address (https://…)" value={url} onChange={e => setUrl(e.target.value)} onPressEnter={() => void uploadUrl(url)} style={{ width: 340 }} />
                    <Button onClick={() => void uploadUrl(url)} disabled={!url.trim()} loading={busy}>Add from address</Button>
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>JPG, PNG or WebP up to 10 MB. New photos are added to the gallery; existing photos are never replaced. Check the photo shows this exact product and size.</Typography.Text>
                </Space>
              </div>

              {pending && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', border: '1px solid #91caff', background: '#f0f7ff', borderRadius: 8, padding: 12 }}>
                  <img src={pending.preview} alt="New photo" style={{ width: 140, height: 140, objectFit: 'contain', background: '#fff', borderRadius: 4 }} />
                  <Space direction="vertical">
                    <Typography.Text strong>New photo — clean it first?</Typography.Text>
                    <Space wrap>
                      <Button type="primary" onClick={() => setEditor({ file: pending.file })}>Remove background / crop</Button>
                      <Button loading={busy} onClick={async () => { if (await uploadFile(pending.file)) clearPending(); }}>Use as is</Button>
                      <Button onClick={clearPending}>Cancel</Button>
                    </Space>
                  </Space>
                </div>
              )}

              {imagesLoading && !images ? <Spin /> : images && images.length === 0 ? <Empty description="No photos yet." /> : (
                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {images?.map(asset => (
                      <div key={asset.id} style={{ width: 180, border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
                        <Image src={asset.url} alt={asset.alt || selected.name} width={162} height={180} style={{ objectFit: 'contain' }} />
                        <div style={{ marginTop: 4 }}>
                          {asset.is_primary ? <Tag color="blue">Main photo</Tag> : <Tag>{asset.variant || 'photo'}</Tag>}
                          {asset.review_status === 'needs_review' && <Tag color="gold">needs review</Tag>}
                          {/catalog-placeholders\//.test(asset.url || '') && <Tag color="red">placeholder</Tag>}
                        </div>
                        <Space wrap size={4} style={{ marginTop: 4 }}>
                          {!asset.is_primary && asset.review_status !== 'rejected' && <Button size="small" disabled={busy} onClick={() => void makePrimary(asset)}>Make main photo</Button>}
                          <Tooltip title="Remove background, crop or center. Saves a new photo; this one stays."><Button size="small" disabled={busy} onClick={() => setEditor({ source: asset.url })}>Edit → new photo</Button></Tooltip>
                        </Space>
                      </div>
                    ))}
                  </div>
                </Image.PreviewGroup>
              )}
            </Space>
          )}
        </div>
      </div>
      <ProductPhotoEditor
        open={!!editor}
        file={editor?.file}
        source={editor?.source}
        title={selected ? `${selected.name} — saves a new photo` : undefined}
        busy={busy}
        onCancel={() => setEditor(null)}
        onSave={async (blob, ext) => {
          if (await uploadFile(new File([blob], `edited-product.${ext}`, { type: `image/${ext}` }))) { setEditor(null); clearPending(); }
        }}
      />
    </div>
  );
}
