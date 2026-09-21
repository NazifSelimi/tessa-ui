import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { URL_LOCALES, localizedPath, urlLocaleFromApp } from '@/i18n/routing';
import { site } from '@/shared/config/site';

type StructuredData = Record<string, unknown> | Array<Record<string, unknown>>;

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: 'website' | 'product';
  noIndex?: boolean;
  structuredData?: StructuredData;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
}

function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, `${site.url}/`).toString();
}

export default function Seo({
  title,
  description,
  path,
  image,
  type = 'website',
  noIndex = false,
  structuredData,
}: SeoProps) {
  const location = useLocation();
  const { i18n } = useTranslation();
  const logicalPath = path ?? location.pathname;
  const currentLocale = urlLocaleFromApp(i18n.resolvedLanguage ?? i18n.language);
  const canonical = absoluteUrl(localizedPath(logicalPath, currentLocale));
  const fullTitle = title.includes(site.name) ? title : `${title} | ${site.name}`;
  const schema = useMemo(
    () => structuredData ? (Array.isArray(structuredData) ? structuredData : [structuredData]) : [],
    [structuredData],
  );

  useEffect(() => {
    document.title = fullTitle;
    document.documentElement.lang = currentLocale === 'sq' ? 'sq' : currentLocale;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: site.name });
    upsertMeta('meta[property="og:locale"]', {
      property: 'og:locale',
      content: currentLocale === 'mk' ? 'mk_MK' : currentLocale === 'sq' ? 'sq_MK' : 'en_GB',
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });

    if (image) {
      const absoluteImage = absoluteUrl(image);
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteImage });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteImage });
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
    }

    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonical });
    document.head.querySelectorAll('link[data-tessa-hreflang]').forEach((node) => node.remove());
    URL_LOCALES.forEach((locale) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = locale;
      link.href = absoluteUrl(localizedPath(logicalPath, locale));
      link.dataset.tessaHreflang = 'true';
      document.head.appendChild(link);
    });
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.hreflang = 'x-default';
    defaultLink.href = absoluteUrl(localizedPath(logicalPath, 'mk'));
    defaultLink.dataset.tessaHreflang = 'true';
    document.head.appendChild(defaultLink);

    document.head.querySelectorAll('script[data-tessa-schema]').forEach((node) => node.remove());
    schema.forEach((value) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.tessaSchema = 'true';
      script.textContent = JSON.stringify(value).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    });
  }, [canonical, currentLocale, description, fullTitle, image, logicalPath, noIndex, schema, type]);

  return null;
}
