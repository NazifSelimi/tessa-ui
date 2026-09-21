import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer, loadEnv } from 'vite';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const siteUrl = 'https://tessa.mk';
const urlLocales = ['mk', 'sq', 'en'];
const appLocaleByUrl = { mk: 'mk', sq: 'shq', en: 'en' };
const defaultLocale = 'mk';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const escapeXml = escapeHtml;

function absoluteUrl(value) {
  return new URL(value, `${siteUrl}/`).toString();
}

function localizedPath(routePath, locale) {
  return `/${locale}${routePath === '/' || routePath === '' ? '' : routePath}`;
}

function headMarkup({ title, description, routePath, locale, image, type = 'website', schemas = [] }) {
  const canonical = absoluteUrl(localizedPath(routePath, locale));
  const fullTitle = title.includes('Tessa Hair Care') ? title : `${title} | Tessa Hair Care`;
  const alternates = urlLocales.map((alternateLocale) => (
    `<link rel="alternate" hreflang="${alternateLocale}" href="${absoluteUrl(localizedPath(routePath, alternateLocale))}" />`
  ));
  alternates.push(`<link rel="alternate" hreflang="x-default" href="${absoluteUrl(localizedPath(routePath, defaultLocale))}" />`);

  return [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<link rel="canonical" href="${canonical}" />`,
    ...alternates,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    '<meta property="og:site_name" content="Tessa Hair Care" />',
    `<meta property="og:locale" content="${locale === 'mk' ? 'mk_MK' : locale === 'sq' ? 'sq_MK' : 'en_GB'}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    ...(image ? [
      `<meta property="og:image" content="${escapeHtml(absoluteUrl(image))}" />`,
      `<meta name="twitter:image" content="${escapeHtml(absoluteUrl(image))}" />`,
    ] : []),
    ...schemas.map((schema) => `<script type="application/ld+json" data-tessa-schema>${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`),
  ].join('\n    ');
}

function injectPage(template, page) {
  let html = template
    .replace(/<html lang="[^"]*">/, `<html lang="${page.locale}">`)
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta name="description"[^>]*>/i, '')
    .replace(/\s*<meta name="robots"[^>]*>/i, '')
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<link rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<link rel="alternate"[^>]*>/gi, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/i, '');

  html = html.replace('</head>', `    ${headMarkup(page)}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${page.body}</div>`);
  return html;
}

function navigation(locale, labels) {
  return `<header style="padding:24px;max-width:1100px;margin:auto">
    <a href="${localizedPath('', locale)}"><strong>Tessa Hair Care</strong></a>
    <nav aria-label="Main navigation" style="display:flex;gap:18px;flex-wrap:wrap;margin-top:16px">
      <a href="${localizedPath('/shop', locale)}">${escapeHtml(labels.nav.shop)}</a>
      <a href="${localizedPath('/quiz', locale)}">${escapeHtml(labels.nav.hairQuiz)}</a>
      <a href="${localizedPath('/for-professionals', locale)}">${escapeHtml(labels.nav.forProfessionals)}</a>
      <a href="${localizedPath('/delivery', locale)}">${escapeHtml(labels.footer.delivery)}</a>
      <a href="${localizedPath('/returns', locale)}">${escapeHtml(labels.footer.returns)}</a>
      <a href="${localizedPath('/contact', locale)}">${escapeHtml(labels.footer.contact)}</a>
    </nav>
  </header>`;
}

function contactFooter(locale, labels) {
  return `<footer style="padding:32px 24px;max-width:1100px;margin:auto;border-top:1px solid #ddd">
    <p><strong>${escapeHtml(labels.footer.contactUs)}</strong></p>
    <p><a href="tel:+38978286003">078 286 003</a> · <a href="tel:+38942333003">042 333 003</a> · <a href="mailto:tessa@tessa.mk">tessa@tessa.mk</a></p>
    <nav aria-label="Legal">
      <a href="${localizedPath('/privacy', locale)}">${escapeHtml(labels.footer.privacyPolicy)}</a> ·
      <a href="${localizedPath('/terms', locale)}">${escapeHtml(labels.footer.termsOfService)}</a> ·
      <a href="${localizedPath('/returns', locale)}">${escapeHtml(labels.footer.returns)}</a>
    </nav>
  </footer>`;
}

function shell(locale, labels, main) {
  return `${navigation(locale, labels)}<main style="padding:24px;max-width:1100px;margin:auto">${main}</main>${contactFooter(locale, labels)}`;
}

function productList(products, locale, limit = 30) {
  if (!products.length) return '';
  const appLocale = appLocaleByUrl[locale];
  return `<section><h2>${locale === 'mk' ? 'Производи' : locale === 'sq' ? 'Produktet' : 'Products'}</h2><ul>${products.slice(0, limit).map((product) => {
    const description = product.translations?.[appLocale] || product.description || '';
    return `<li><a href="${localizedPath(`/product/${product.id}`, locale)}">${escapeHtml(product.name)}</a>${description ? ` — ${escapeHtml(description.replace(/\s+/g, ' ').slice(0, 140))}` : ''}</li>`;
  }).join('')}</ul></section>`;
}

async function writeRoute(template, routePath, locale, page) {
  const outputPath = routePath === ''
    ? path.join(distDir, locale, 'index.html')
    : path.join(distDir, locale, routePath.replace(/^\//, ''), 'index.html');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, injectPage(template, { ...page, routePath, locale }), 'utf8');
}

async function writeUnprefixedRoute(template, routePath, page) {
  const outputPath = routePath === ''
    ? path.join(distDir, 'index.html')
    : path.join(distDir, routePath.replace(/^\//, ''), 'index.html');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, injectPage(template, { ...page, routePath, locale: defaultLocale }), 'utf8');
}

async function fetchProducts(apiBase) {
  if (!apiBase) return [];
  const absoluteApiBase = apiBase.startsWith('/') ? absoluteUrl(apiBase) : apiBase;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(`${absoluteApiBase.replace(/\/$/, '')}/v1/products?perPage=500&sort=name_asc`, {
      headers: { Accept: 'application/json', 'Accept-Language': 'mk' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.data) ? payload.data : [];
  } catch (error) {
    console.warn(`[seo] Product pre-render skipped: ${error.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const template = await readFile(path.join(distDir, 'index.html'), 'utf8');
const env = loadEnv(process.env.NODE_ENV || 'production', root, '');
const products = await fetchProducts(env.SEO_API_URL || env.VITE_API_URL);
const labelsByLocale = {};

for (const locale of urlLocales) {
  labelsByLocale[locale] = JSON.parse(await readFile(path.join(root, 'src/i18n/locales', `${appLocaleByUrl[locale]}.json`), 'utf8'));
}

const vite = await createServer({
  root,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
const { legalContent } = await vite.ssrLoadModule('/src/shared/content/legal.ts');
const { STOREFRONT_COLLECTION_DEFINITIONS } = await vite.ssrLoadModule('/src/shared/config/storefrontCollections.ts');
await vite.close();

function staticPages(locale) {
  const labels = labelsByLocale[locale];
  const pages = [
    {
      path: '',
      title: labels.seo.homeTitle,
      description: labels.seo.homeDescription,
      main: `<h1>${escapeHtml(`${labels.newLook.heroTitle} ${labels.newLook.heroAccent}`)}</h1><p>${escapeHtml(labels.newLook.heroCopy)}</p>${productList(products, locale, 12)}`,
      schemas: [
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'Tessa Hair Care', url: siteUrl, email: 'tessa@tessa.mk', telephone: '+38978286003' },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Tessa Hair Care', url: siteUrl },
      ],
    },
    {
      path: '/shop',
      title: labels.seo.shopTitle,
      description: labels.seo.shopDescription,
      main: `<h1>${escapeHtml(labels.seo.shopTitle)}</h1><p>${escapeHtml(labels.seo.shopDescription)}</p>${productList(products, locale, 100)}`,
    },
    {
      path: '/quiz',
      aliases: ['/hair-survey'],
      title: labels.seo.quizTitle,
      description: labels.seo.quizDescription,
      main: `<h1>${escapeHtml(labels.survey.hairCareSurvey)}</h1><p>${escapeHtml(labels.survey.surveyIntro)}</p><p><a href="${localizedPath('/quiz', locale)}">${escapeHtml(labels.homeLanding.takeQuiz)}</a></p>`,
    },
    {
      path: '/for-professionals',
      title: labels.seo.professionalsTitle,
      description: labels.seo.professionalsDescription,
      main: `<h1>${escapeHtml(labels.forPros.title)}</h1><p>${escapeHtml(labels.forPros.subtitle)}</p><ol><li>${escapeHtml(labels.forPros.step1)}</li><li>${escapeHtml(labels.forPros.step2)}</li><li>${escapeHtml(labels.forPros.step3)}</li></ol>`,
    },
  ];

  for (const [slug, collection] of Object.entries(STOREFRONT_COLLECTION_DEFINITIONS)) {
    pages.push({
      path: `/collections/${slug}`,
      title: collection.title,
      description: collection.description,
      main: `<h1>${escapeHtml(collection.heroTitle)}</h1><p>${escapeHtml(collection.heroBody)}</p>${productList(products.filter((product) => product.collections?.some((entry) => entry.slug === slug)), locale, 100)}`,
    });
  }

  for (const pageKey of ['privacy', 'terms', 'returns', 'delivery', 'contact']) {
    const document = legalContent[appLocaleByUrl[locale]][pageKey];
    pages.push({
      path: `/${pageKey}`,
      title: document.title,
      description: document.description,
      main: `<article><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(labels.legal.lastUpdated)}</p><p>${escapeHtml(document.intro)}</p>${document.sections.map((section) => `<section><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('')}</article>`,
      schemas: pageKey === 'contact' ? [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'Tessa Hair Care', url: siteUrl, email: 'tessa@tessa.mk', telephone: '+38978286003' }] : [],
    });
  }

  return pages;
}

for (const locale of urlLocales) {
  const labels = labelsByLocale[locale];
  for (const page of staticPages(locale)) {
    const pageData = { ...page, body: shell(locale, labels, page.main) };
    await writeRoute(template, page.path, locale, pageData);
    for (const alias of page.aliases || []) await writeRoute(template, alias, locale, { ...pageData, routePath: page.path });
    if (locale === defaultLocale) {
      await writeUnprefixedRoute(template, page.path, pageData);
      for (const alias of page.aliases || []) await writeUnprefixedRoute(template, alias, { ...pageData, routePath: page.path });
    }
  }
}

for (const product of products) {
  for (const locale of urlLocales) {
    const labels = labelsByLocale[locale];
    const appLocale = appLocaleByUrl[locale];
    const brand = typeof product.brand === 'object' ? product.brand?.name : product.brand;
    const category = typeof product.category === 'object' ? product.category?.name : product.category;
    const description = (product.translations?.[appLocale] || product.description || `${product.name} ${category || ''} ${brand || ''}`).replace(/\s+/g, ' ').trim();
    const image = product.image || product.images?.[0];
    const price = Number(product.sale?.price ?? product.price ?? 0).toFixed(2);
    const routePath = `/product/${product.id}`;
    const productUrl = absoluteUrl(localizedPath(routePath, locale));
    const body = shell(locale, labels, `<article><p><a href="${localizedPath('/shop', locale)}">${escapeHtml(labels.product.backToShop)}</a></p><h1>${escapeHtml(product.name)}</h1>${brand ? `<p><strong>${escapeHtml(brand)}</strong></p>` : ''}${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" width="480" height="480" />` : ''}<p>${escapeHtml(description)}</p><p><strong>${escapeHtml(price)} MKD</strong></p><p>${escapeHtml(product.inStock ? labels.product.inStock : labels.product.outOfStock)}</p></article>`);
    const schemas = [{
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      ...(image ? { image: [absoluteUrl(image)] } : {}),
      ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
      ...(category ? { category } : {}),
      sku: String(product.id),
      offers: {
        '@type': 'Offer', url: productUrl, priceCurrency: 'MKD', price,
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Tessa Hair Care' },
      },
    }];
    const page = { title: `${product.name}${brand ? ` – ${brand}` : ''}`, description: description.slice(0, 180), image, type: 'product', schemas, body };
    await writeRoute(template, routePath, locale, page);
    if (locale === defaultLocale) await writeUnprefixedRoute(template, routePath, page);
  }
}

const sitemapPaths = [...new Set([
  '', '/shop', '/for-professionals', '/quiz', '/privacy', '/terms', '/returns', '/delivery', '/contact',
  ...Object.keys(STOREFRONT_COLLECTION_DEFINITIONS).map((slug) => `/collections/${slug}`),
  ...products.map((product) => `/product/${product.id}`),
])];
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapPaths.flatMap((routePath) => urlLocales.map((locale) => `  <url>\n    <loc>${escapeXml(absoluteUrl(localizedPath(routePath, locale)))}</loc>\n    <lastmod>${today}</lastmod>\n${urlLocales.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate}" href="${escapeXml(absoluteUrl(localizedPath(routePath, alternate)))}" />`).join('\n')}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(localizedPath(routePath, defaultLocale)))}" />\n  </url>`)).join('\n')}\n</urlset>\n`;
await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');

console.log(`[seo] Generated localized static HTML for ${sitemapPaths.length} routes (${products.length} products).`);
