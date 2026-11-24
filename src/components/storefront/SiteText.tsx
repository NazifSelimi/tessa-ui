import { useEffect, useMemo } from 'react';
import { type ContentBlock, useGetPublishedContentBlocksQuery } from '@/features/admin/api';

/**
 * Site-wide text edits made by admins right on the page.
 * Each edit is a published content block on the "site-text" page:
 * body = the original text, items[0].body = the text shown instead.
 */
export const SITE_TEXT_PAGE = 'site-text';
export const SITE_TEXT_SKIP = 'nl-site-text-skip';

const SKIP_SELECTOR = `.${SITE_TEXT_SKIP}, script, style, noscript, textarea, input, select, [contenteditable="true"], .ant-message, .ant-notification`;

export const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

export function siteTextKey(original: string) {
  let hash = 5381;
  for (let i = 0; i < original.length; i += 1) hash = ((hash * 33) ^ original.charCodeAt(i)) >>> 0;
  return `text.${hash.toString(36)}.${original.length}`;
}

export const siteTextOriginal = (block: ContentBlock) => normalizeText(block.body ?? '');
export const siteTextReplacement = (block: ContentBlock) => block.items[0]?.body ?? '';

/** Text nodes we changed, with the text React originally put there. */
const applied = new Map<Text, { original: string; replacement: string; raw: string }>();

/** The original (un-edited) text of a text node, for the admin editor. */
export function originalTextOf(node: Text) {
  return applied.get(node)?.original ?? normalizeText(node.nodeValue ?? '');
}

function applyTo(node: Text, overrides: Map<string, string>) {
  const current = node.nodeValue ?? '';
  const record = applied.get(node);
  if (record && current === record.replacement) {
    const wanted = overrides.get(record.original);
    if (wanted === undefined) { node.nodeValue = record.raw; applied.delete(node); return; }
    if (wanted === normalizeText(record.replacement)) return;
    applied.delete(node);
    node.nodeValue = record.raw;
    return applyTo(node, overrides);
  }
  if (record) applied.delete(node);
  const original = normalizeText(current);
  if (!original) return;
  const replacement = overrides.get(original);
  if (replacement === undefined || replacement === original) return;
  if (node.parentElement?.closest(SKIP_SELECTOR)) return;
  const lead = current.match(/^\s*/)?.[0] ?? '';
  const tail = current.match(/\s*$/)?.[0] ?? '';
  const next = `${lead}${replacement}${tail}`;
  applied.set(node, { original, replacement: next, raw: current });
  node.nodeValue = next;
}

function applyWithin(root: Node, overrides: Map<string, string>) {
  if (root.nodeType === Node.TEXT_NODE) { applyTo(root as Text, overrides); return; }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) applyTo(node as Text, overrides);
}

function restoreAll() {
  applied.forEach((record, node) => { if (node.nodeValue === record.replacement) node.nodeValue = record.raw; });
  applied.clear();
}

/** Shows admin text edits to everyone on storefront pages. Renders nothing. */
export default function SiteTextOverrides() {
  const { data: blocks = [] } = useGetPublishedContentBlocksQuery(SITE_TEXT_PAGE);
  const overrides = useMemo(() => new Map(blocks
    .filter((block) => block.page === SITE_TEXT_PAGE && siteTextOriginal(block))
    .map((block) => [siteTextOriginal(block), normalizeText(siteTextReplacement(block))])), [blocks]);

  useEffect(() => {
    if (!overrides.size && !applied.size) return;
    applied.forEach((_, node) => { if (!node.isConnected) applied.delete(node); else applyTo(node, overrides); });
    applyWithin(document.body, overrides);
    if (!overrides.size) return;
    let pending: Node[] = [];
    let frame = 0;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') pending.push(mutation.target);
        else mutation.addedNodes.forEach((node) => pending.push(node));
      });
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        const batch = pending;
        pending = [];
        batch.forEach((node) => { if (node.isConnected) applyWithin(node, overrides); });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [overrides]);

  useEffect(() => restoreAll, []);

  return null;
}
