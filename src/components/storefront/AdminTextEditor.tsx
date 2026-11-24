import { useEffect, useState } from 'react';
import { Button, Input, Modal, Space, Typography, message } from 'antd';
import { Type } from 'lucide-react';
import {
  useCreateContentBlockMutation,
  useDeleteContentBlockMutation,
  useGetPublishedContentBlocksQuery,
  useUpdateContentBlockMutation,
} from '@/features/admin/api';
import { extractErrorMessage } from '@/shared/utils/error';
import { SITE_TEXT_PAGE, SITE_TEXT_SKIP, normalizeText, originalTextOf, siteTextKey, siteTextOriginal, siteTextReplacement } from './SiteText';

const { Text } = Typography;
const EDIT_CLASS = 'nl-text-edit-mode';
const HOVER_CLASS = 'nl-text-edit-hover';
const IGNORE = `.${SITE_TEXT_SKIP}, .ant-modal-root, .ant-drawer, .ant-popover, .ant-dropdown, .ant-message, .ant-notification, .ant-select-dropdown, .nl-admin-dock`;

function directText(element: Element): Text | null {
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && normalizeText(child.nodeValue ?? '')) return child as Text;
  }
  return null;
}

/** The text node under the pointer, or the first text directly inside the clicked element. */
function textAt(event: MouseEvent): Text | null {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest(IGNORE)) return null;
  const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null };
  const node = doc.caretPositionFromPoint?.(event.clientX, event.clientY)?.offsetNode
    ?? document.caretRangeFromPoint?.(event.clientX, event.clientY)?.startContainer;
  if (node?.nodeType === Node.TEXT_NODE && normalizeText(node.nodeValue ?? '') && target.contains(node)) return node as Text;
  let element: Element | null = target;
  while (element && element !== document.body) {
    const text = directText(element);
    if (text) return text;
    element = element.parentElement;
  }
  return null;
}

/** "Edit text" switch in the admin dock: click any text on a storefront page to change it for everyone. */
export default function AdminTextEditor() {
  const [active, setActive] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const { data: blocks = [] } = useGetPublishedContentBlocksQuery(SITE_TEXT_PAGE);
  const [createBlock, { isLoading: creating }] = useCreateContentBlockMutation();
  const [updateBlock, { isLoading: updating }] = useUpdateContentBlockMutation();
  const [deleteBlock, { isLoading: deleting }] = useDeleteContentBlockMutation();
  const existing = original === null ? undefined : blocks.find((block) => block.page === SITE_TEXT_PAGE && siteTextOriginal(block) === original);

  useEffect(() => {
    if (!active) return;
    document.body.classList.add(EDIT_CLASS);
    let hovered: Element | null = null;
    const clearHover = () => { hovered?.classList.remove(HOVER_CLASS); hovered = null; };
    const onOver = (event: MouseEvent) => {
      const text = event.target instanceof Element && !event.target.closest(IGNORE) ? textAt(event) : null;
      const element = text?.parentElement ?? null;
      if (element === hovered) return;
      clearHover();
      if (element) { element.classList.add(HOVER_CLASS); hovered = element; }
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || event.target.closest(IGNORE)) return;
      event.preventDefault();
      event.stopPropagation();
      const text = textAt(event);
      if (!text) return;
      const source = originalTextOf(text);
      setOriginal(source);
      setValue(normalizeText(text.nodeValue ?? '') || source);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('.ant-modal-wrap')) setActive(false); };
    document.addEventListener('mouseover', onOver, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKey);
    return () => {
      clearHover();
      document.body.classList.remove(EDIT_CLASS);
      document.removeEventListener('mouseover', onOver, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  const close = () => { setOriginal(null); setValue(''); };

  const save = async () => {
    if (original === null) return;
    const replacement = normalizeText(value);
    if (!replacement) { message.warning('Text cannot be empty. Use "Back to original" instead.'); return; }
    try {
      if (replacement === original) {
        if (existing) await deleteBlock(existing.id).unwrap();
      } else {
        const payload = {
          key: siteTextKey(original),
          page: SITE_TEXT_PAGE,
          section: 'global',
          kind: 'rich_text' as const,
          title: original.slice(0, 120),
          body: original,
          items: [{ body: replacement }],
          is_published: true,
          sort_order: 0,
        };
        if (existing) await updateBlock({ id: existing.id, data: payload }).unwrap();
        else await createBlock(payload).unwrap();
      }
      message.success('Text saved. Everyone now sees the new text.');
      close();
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  const reset = async () => {
    if (!existing) return;
    try {
      await deleteBlock(existing.id).unwrap();
      message.success('Back to the original text.');
      close();
    } catch (error) {
      message.error(extractErrorMessage(error));
    }
  };

  return <>
    <button type="button" className="nl-admin-dock__toggle nl-admin-dock__text" aria-pressed={active} onClick={() => setActive((on) => !on)} title="Click any text on the page to change it">
      <Type size={17} /><span className="nl-admin-dock__label">{active ? 'Done editing' : 'Edit text'}</span>
    </button>
    <Modal
      open={original !== null}
      title="Edit text"
      onCancel={close}
      wrapClassName={SITE_TEXT_SKIP}
      destroyOnClose
      footer={<Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        {existing ? <Button danger onClick={reset} loading={deleting}>Back to original</Button> : <span />}
        <Space><Button onClick={close}>Cancel</Button><Button type="primary" onClick={save} loading={creating || updating || deleting}>Save</Button></Space>
      </Space>}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Original text</Text>
      <div style={{ padding: '8px 10px', background: '#f7f0f2', borderRadius: 8, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{original}</div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>Show instead</Text>
      <Input.TextArea autoFocus autoSize={{ minRows: 2, maxRows: 10 }} maxLength={2000} value={value} onChange={(event) => setValue(event.target.value)} />
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>This changes the same text everywhere it appears on the shop, in this language.</Text>
    </Modal>
  </>;
}
