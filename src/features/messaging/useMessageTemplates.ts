/**
 * The admin's message templates: saved on the server (Setting) and, if the
 * server can't be reached, in this browser so editing still works.
 */

import { useCallback, useMemo } from 'react';
import { useGetMessageTemplatesQuery, useSaveMessageTemplatesMutation } from './api';
import { changedTemplates, mergeTemplates, type MessageTemplateDef } from './templates';

const LOCAL_KEY = 'tessa.admin.messageTemplates';

interface LocalCopy { templates: MessageTemplateDef[]; shop?: string; link?: string }

function localCopy(): LocalCopy | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LocalCopy) : null;
  } catch {
    return null;
  }
}

export function useMessageTemplates() {
  const { data, isLoading, isError } = useGetMessageTemplatesQuery();
  const [saveRemote, { isLoading: isSaving }] = useSaveMessageTemplatesMutation();
  const local = isError ? localCopy() : null;

  const templates = useMemo(() => mergeTemplates(data?.templates ?? local?.templates), [data, local]);
  const shop = data?.shop || local?.shop || 'Tessa';
  const link = data?.link || local?.link || (typeof window !== 'undefined' ? window.location.origin : '');

  /** Returns where it was saved: 'server' or 'browser'. */
  const save = useCallback(async (all: MessageTemplateDef[], extra: { shop?: string; link?: string } = {}) => {
    const body = { templates: changedTemplates(all), ...extra };
    try {
      await saveRemote(body).unwrap();
      return 'server' as const;
    } catch {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(body)); } catch { /* nothing more we can do */ }
      return 'browser' as const;
    }
  }, [saveRemote]);

  const find = useCallback((key: string) => templates.find((t) => t.key === key), [templates]);

  return { templates, shop, link, isLoading, savedOnServer: !isError, save, find, isSaving };
}
