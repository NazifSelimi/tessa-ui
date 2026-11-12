import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Empty, Skeleton, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import ProductCard from '@/components/ProductCard';
import { AdminProductShortcuts } from '@/components/storefront/AdminShortcuts';
import { useAuth } from '@/hooks/useAuth';
import { useGetCategoriesQuery, useGetProductCollectionsQuery, useGetProductsQuery } from '@/features/products/api';
import { formatPrice } from '@/shared/utils/formatPrice';
import {
  buildStorefrontCollectionDirectory,
  localizeCollection,
  localizeRoutineRoleCopy,
  isStorefrontCollectionSlug,
  type StorefrontCollectionDirectoryItem,
} from '@/shared/config/storefrontCollections';
import type { Product } from '@/types';
import Seo from '@/shared/components/Seo';
import { site } from '@/shared/config/site';

const { Title, Paragraph, Text } = Typography;
const MAX_COLLECTION_PRODUCTS = 120;

interface RoutineGroup {
  role: string;
  products: Product[];
}

function groupProductsByRole(products: Product[], roles: string[]): { grouped: RoutineGroup[]; remaining: Product[] } {
  const assigned = new Set<string>();
  const grouped = roles
    .map((role) => {
      const matching = products.filter((product) => {
        const isMatch = product.catalogGuidance?.consumerRoutineRole === role;
        if (isMatch) {
          assigned.add(String(product.id));
        }
        return isMatch;
      });

      return { role, products: matching };
    })
    .filter((group) => group.products.length > 0);

  const remaining = products.filter((product) => !assigned.has(String(product.id)));

  return { grouped, remaining };
}

function productBrand(product: Product): string {
  return typeof product.brand === 'object' ? product.brand?.name ?? '' : product.brand ?? '';
}

function productCategory(product: Product): string {
  return typeof product.category === 'object' ? product.category?.name ?? '' : product.category ?? '';
}

function productCompatibleSystems(product: Product): string[] {
  return product.catalogGuidance?.professionalGuidance?.compatibleSystems
    ?? product.catalogGuidance?.compatibleWith
    ?? [];
}

function productGuidanceNotes(product: Product): string[] {
  return product.catalogGuidance?.professionalGuidance?.notes ?? [];
}

function HeroPackshot({ product }: { product?: Product }) {
  if (!product?.image) {
    return null;
  }

  return (
    <div className="collection-packshot">
      <img src={product.image} alt={product.name} loading="lazy" />
    </div>
  );
}

function resolveCollection(
  slug: string | undefined,
  directory: StorefrontCollectionDirectoryItem[],
): StorefrontCollectionDirectoryItem | undefined {
  if (!slug || !isStorefrontCollectionSlug(slug)) {
    return undefined;
  }

  return directory.find((item) => item.slug === slug);
}

export default function CollectionPage() {
  const { slug } = useParams();
  const { isAdmin, isStylist } = useAuth();
  const { data: collectionsData = [] } = useGetProductCollectionsQuery();
  const directory = useMemo(
    () => buildStorefrontCollectionDirectory(collectionsData),
    [collectionsData],
  );
  const { t } = useTranslation();
  const baseCollection = resolveCollection(slug, directory);
  const collection = useMemo(() => (baseCollection ? localizeCollection(baseCollection, t) : baseCollection), [baseCollection, t]);
  const { data: productsData, isLoading, error } = useGetProductsQuery(
    collection
      ? {
          collection: collection.slug,
          perPage: MAX_COLLECTION_PRODUCTS,
          sort: 'name_asc',
        }
      : undefined,
    {
      skip: !collection,
    },
  );

  // Collections with no mapped products yet fall back to their supported categories,
  // so shoppers never land on an empty page.
  const { data: categories = [] } = useGetCategoriesQuery(undefined, { skip: !collection });
  const fallbackCategoryIds = useMemo(() => {
    const wanted = new Set((collection?.supportedCategoryNames ?? []).map((name) => name.toLowerCase()));
    return categories
      .filter((category) => wanted.has(String(category.name).toLowerCase()))
      .map((category) => category.id)
      .join(',');
  }, [categories, collection?.supportedCategoryNames]);
  const collectionIsEmpty = !isLoading && !error && (productsData?.data?.length ?? 0) === 0;
  const { data: fallbackData, isLoading: fallbackLoading } = useGetProductsQuery(
    { category_ids: fallbackCategoryIds, perPage: MAX_COLLECTION_PRODUCTS, sort: 'name_asc' },
    { skip: !collection || !collectionIsEmpty || !fallbackCategoryIds },
  );

  const products = useMemo(
    () => ((productsData?.data?.length ?? 0) > 0 ? productsData?.data ?? [] : fallbackData?.data ?? []),
    [productsData, fallbackData],
  );
  const productsLoading = isLoading || (collectionIsEmpty && fallbackLoading);
  const consumerProducts = useMemo(
    () => products.filter((product) => !product.catalogGuidance?.professionalOnly),
    [products],
  );
  const technicalProducts = useMemo(
    () => products.filter((product) => product.catalogGuidance?.professionalOnly),
    [products],
  );
  // Salon accounts and admins also see professional-only products in the list.
  const isProfessional = isStylist || isAdmin;
  const visibleProducts = useMemo(
    () => (isProfessional ? products : consumerProducts),
    [isProfessional, products, consumerProducts],
  );
  const groupedProducts = useMemo(
    () => groupProductsByRole(visibleProducts, collection?.routineRoles ?? []),
    [collection?.routineRoles, visibleProducts],
  );
  const heroProducts = consumerProducts.slice(0, 3);
  const pairingProducts = technicalProducts.filter((product) => {
    return productCompatibleSystems(product).length > 0 || productGuidanceNotes(product).length > 0;
  });
  const showPairings = isProfessional && pairingProducts.length > 0;

  if (!collection) {
    return (
      <div className="collection-page">
        <Seo
          title={t('collectionPage.notFound')}
          description={t('collectionPage.notFoundText')}
          path={`/collections/${slug ?? ''}`}
          noIndex
        />
        <div className="collection-shell">
          <Empty
            description={t('collectionPage.notFoundText')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Link to="/shop">
              <Button type="primary">{t('collectionPage.backToShop')}</Button>
            </Link>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-page">
      <Seo
        title={collection.title}
        description={collection.description}
        path={`/collections/${collection.slug}`}
        image={heroProducts[0]?.image}
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: collection.title,
            description: collection.description,
            url: `${site.url}/collections/${collection.slug}`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: collection.title,
            itemListElement: consumerProducts.slice(0, 24).map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `${site.url}/product/${product.id}`,
              name: product.name,
            })),
          },
        ]}
      />
      <div className="collection-shell">
        <section
          className="collection-hero"
          style={{
            background: `${collection.palette.glow}, ${collection.palette.surface}`,
            borderColor: collection.palette.border,
          }}
        >
          <div className="collection-hero__copy">
            <Link to="/shop" className="collection-backlink">
              <ArrowLeftOutlined /> {t('collectionPage.backToShop')}
            </Link>
            <span className="collection-badge collection-badge--live">
              {collection.heroEyebrow}
            </span>
            <Title level={1} className="collection-hero__title">
              {collection.heroTitle}
            </Title>
            <Paragraph className="collection-hero__body">
              {collection.heroBody}
            </Paragraph>


            <div className="collection-hero__actions">
              <Link to="/hair-survey">
                <Button type="primary" size="large">
                  {t('collectionPage.findRoutine')}
                </Button>
              </Link>
              <Link to="/shop">
                <Button size="large">
                  {t('collectionPage.browseShop')} <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          </div>

          {heroProducts.some((product) => product.image) && (
            <div className="collection-hero__visual">
              <div className="collection-packshot-grid">
                {heroProducts.map((product) => (
                  <HeroPackshot key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </section>


        {error && (
          <Alert
            className="collection-callout"
            type="warning"
            showIcon
            message={t('collectionPage.loadError')}
            description={t('collectionPage.loadErrorText')}
          />
        )}

        <section className="collection-section">
          <div className="collection-section__head">
            <span className="collection-section__eyebrow">{t('collectionPage.shopTheCollection')}</span>
            <Title level={2}>{collection.title}</Title>
          </div>

          {productsLoading ? (
            <div className="collection-loading-grid">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton.Button key={index} active block style={{ height: 220 }} />
              ))}
            </div>
          ) : groupedProducts.grouped.length > 0 ? (
            groupedProducts.grouped.map((group, index) => {
              const roleCopy = localizeRoutineRoleCopy(group.role, collection.slug, t);

              return (
                <div key={group.role} className="routine-group">
                  <div className="routine-group__summary">
                    <span className="routine-group__count">0{index + 1}</span>
                    <div>
                      <h3>{roleCopy.label}</h3>
                      <p>{roleCopy.intro}</p>
                    </div>
                  </div>

                  <div className="routine-group__products">
                    {group.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : visibleProducts.length === 0 ? (
            <div className="collection-empty-state">
              <h3>
                {products.length > 0
                  ? t('collectionPage.salonOnly')
                  : t('collectionPage.comingSoon')}
              </h3>
              <p>
                {products.length > 0 && (
                  <>
                    <Link to="/for-professionals">{t('collectionPage.openBusiness')} <ArrowRightOutlined /></Link>
                    {' · '}
                  </>
                )}
                <Link to="/shop">{t('collectionPage.browseShop')} <ArrowRightOutlined /></Link>
              </p>
            </div>
          ) : null}

          {!productsLoading && groupedProducts.remaining.length > 0 && (
            <div className="routine-group routine-group--remaining">
              <div className="routine-group__summary">
                <span className="routine-group__count">{groupedProducts.grouped.length > 0 ? '+' : '01'}</span>
                <div>
                  <h3>{groupedProducts.grouped.length > 0 ? t('collectionPage.moreInCollection') : t('collectionPage.products')}</h3>
                </div>
              </div>
              <div className="routine-group__products">
                {groupedProducts.remaining.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </section>

        {showPairings && (
        <section className="collection-section">
          <div className="collection-section__head">
            <span className="collection-section__eyebrow">{t('collectionPage.safePairing')}</span>
            <Title level={2}>{t('collectionPage.verifiedPairings')}</Title>
            <Paragraph>
              Pairings the catalogue marks as compatible. Check the manufacturer sheet for ratios and timing.
            </Paragraph>
          </div>

            <div className="pairing-grid">
              {pairingProducts.map((product) => (
                <article key={product.id} className="pairing-card">
                  <div className="pairing-card__top">
                    {product.image ? (
                      <div className="pairing-card__thumb">
                        <img src={product.image} alt={product.name} loading="lazy" />
                      </div>
                    ) : (
                      <div className="pairing-card__thumb pairing-card__thumb--placeholder">
                        {t('collectionPage.technicalProduct')}
                      </div>
                    )}

                    <div className="pairing-card__copy">
                      <div className="pairing-card__meta">
                        <span>{productBrand(product)}</span>
                        <span>{productCategory(product)}</span>
                      </div>
                      <h3>{product.name}</h3>
                      <Text strong>{formatPrice(product.stylistPrice ?? product.price)}</Text>
                    </div>
                  </div>

                  <div className="pairing-card__group">
                    <Text strong>{t('collectionPage.pairOnlyWith')}</Text>
                    <div className="pairing-card__tags">
                      {productCompatibleSystems(product).map((system) => (
                        <Tag key={system}>{system}</Tag>
                      ))}
                    </div>
                  </div>

                  {productGuidanceNotes(product).length > 0 && (
                    <ul className="pairing-card__notes">
                      {productGuidanceNotes(product).map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  )}

                  <Link to={`/product/${product.id}`} className="pairing-card__link">
                    View technical product <ArrowRightOutlined />
                  </Link>
                  <AdminProductShortcuts product={product} />
                </article>
              ))}
            </div>
        </section>
        )}

      </div>
    </div>
  );
}
