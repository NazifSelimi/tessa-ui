import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Alert, Button, Empty, Skeleton, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, LockOutlined } from '@ant-design/icons';
import ProductCard from '@/components/ProductCard';
import { useAuth } from '@/hooks/useAuth';
import { useGetProductCollectionsQuery, useGetProductsQuery } from '@/features/products/api';
import { formatPrice } from '@/shared/utils/formatPrice';
import {
  buildStorefrontCollectionDirectory,
  getRoutineRoleCopy,
  isStorefrontCollectionSlug,
  type StorefrontCollectionDirectoryItem,
} from '@/shared/config/storefrontCollections';
import type { Product } from '@/types';

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
  return typeof product.brand === 'object' ? product.brand?.name ?? 'Brand pending' : product.brand ?? 'Brand pending';
}

function productCategory(product: Product): string {
  return typeof product.category === 'object' ? product.category?.name ?? 'Category pending' : product.category ?? 'Category pending';
}

function productCompatibleSystems(product: Product): string[] {
  return product.catalogGuidance?.professionalGuidance?.compatibleSystems
    ?? product.catalogGuidance?.compatibleWith
    ?? [];
}

function productGuidanceNotes(product: Product): string[] {
  return product.catalogGuidance?.professionalGuidance?.notes ?? [];
}

function HeroPackshot({ product, fallback }: { product?: Product; fallback: string }) {
  if (!product?.image) {
    return (
      <div className="collection-packshot collection-packshot--placeholder">
        <span>{fallback}</span>
      </div>
    );
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
  const location = useLocation();
  const { isAuthenticated, isAdmin, isStylist } = useAuth();
  const { data: collectionsData = [] } = useGetProductCollectionsQuery();
  const directory = useMemo(
    () => buildStorefrontCollectionDirectory(collectionsData),
    [collectionsData],
  );
  const collection = resolveCollection(slug, directory);
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

  const products = productsData?.data ?? [];
  const consumerProducts = useMemo(
    () => products.filter((product) => !product.catalogGuidance?.professionalOnly),
    [products],
  );
  const technicalProducts = useMemo(
    () => products.filter((product) => product.catalogGuidance?.professionalOnly),
    [products],
  );
  const groupedProducts = useMemo(
    () => groupProductsByRole(consumerProducts, collection?.routineRoles ?? []),
    [collection?.routineRoles, consumerProducts],
  );
  const heroProducts = consumerProducts.slice(0, 3);
  const pairingProducts = technicalProducts.filter((product) => {
    return productCompatibleSystems(product).length > 0 || productGuidanceNotes(product).length > 0;
  });
  const pairingCtaHref = isAuthenticated
    ? '/stylist/request'
    : `/login?continue=${encodeURIComponent(location.pathname)}`;

  if (!collection) {
    return (
      <div className="collection-page">
        <div className="collection-shell">
          <Empty
            description="This collection route is not part of the approved storefront set."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Link to="/shop">
              <Button type="primary">Back to shop</Button>
            </Link>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-page">
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
              <ArrowLeftOutlined /> Back to shop
            </Link>
            <span className={`collection-badge collection-badge--${collection.launchState}`}>
              {collection.launchState === 'live' ? collection.heroEyebrow : 'Verified inventory still being prepared'}
            </span>
            <Title level={1} className="collection-hero__title">
              {collection.heroTitle}
            </Title>
            <Paragraph className="collection-hero__body">
              {collection.heroBody}
            </Paragraph>

            <div className="collection-hero__stats">
              <div className="collection-stat">
                <span className="collection-stat__label">Collection</span>
                <strong>{collection.title}</strong>
              </div>
              <div className="collection-stat">
                <span className="collection-stat__label">Live products</span>
                <strong>{typeof collection.productCount === 'number' ? collection.productCount : 'Pending'}</strong>
              </div>
              <div className="collection-stat">
                <span className="collection-stat__label">Routine roles</span>
                <strong>{collection.routineRoles.length}</strong>
              </div>
            </div>

            <div className="collection-hero__actions">
              <Link to="/hair-survey">
                <Button type="primary" size="large">
                  Find my routine
                </Button>
              </Link>
              <Link to="/shop">
                <Button size="large">
                  Browse full shop <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          </div>

          <div className="collection-hero__visual">
            <div className="collection-placeholder">
              <span className="collection-placeholder__eyebrow">Temporary slot</span>
              <h2>{collection.placeholderTitle}</h2>
              <p>{collection.placeholderBody}</p>
            </div>

            <div className="collection-packshot-grid">
              <HeroPackshot product={heroProducts[0]} fallback="Existing product media appears here once the catalogue responds." />
              <HeroPackshot product={heroProducts[1]} fallback="Approved campaign art stays out until it is cleared for use." />
              <HeroPackshot product={heroProducts[2]} fallback="Technical visuals stay separated from the hero until verified." />
            </div>
          </div>
        </section>

        {collection.slug === 'blonde-and-tone' && (
          <Alert
            className="collection-callout"
            type="info"
            showIcon
            message="Blonde and Tone is the first complete storefront collection."
            description="Home-safe blonde maintenance stays visible for everyone. Technical ratios, substitutions, and verified salon pairings remain gated to stylist-safe guidance."
          />
        )}

        {error && (
          <Alert
            className="collection-callout"
            type="warning"
            showIcon
            message="We couldn't refresh this collection from the catalogue right now."
            description="The page structure is live and linked to the collection contract. Product cards will appear automatically when the API is reachable."
          />
        )}

        <section className="collection-section">
          <div className="collection-section__head">
            <span className="collection-section__eyebrow">Routine roles</span>
            <Title level={2}>Shop the collection by what each product does.</Title>
            <Paragraph>
              We keep the first decision result-led. Internal catalogue classes stay in the data, but the collection page starts with the role the product plays in the routine.
            </Paragraph>
          </div>

          {isLoading ? (
            <div className="collection-loading-grid">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton.Button key={index} active block style={{ height: 220 }} />
              ))}
            </div>
          ) : groupedProducts.grouped.length > 0 ? (
            groupedProducts.grouped.map((group, index) => {
              const roleCopy = getRoutineRoleCopy(group.role, collection.slug);

              return (
                <div key={group.role} className="routine-group">
                  <div className="routine-group__summary">
                    <span className="routine-group__count">0{index + 1}</span>
                    <div>
                      <h3>{roleCopy.label}</h3>
                      <p>{roleCopy.intro}</p>
                      <small>{roleCopy.microcopy}</small>
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
          ) : (
            <div className="collection-empty-state">
              <h3>This collection page is wired up and waiting for live products.</h3>
              <p>
                As soon as the collection API returns mapped products, they will be grouped into these routine roles automatically.
              </p>
            </div>
          )}

          {groupedProducts.remaining.length > 0 && (
            <div className="routine-group routine-group--remaining">
              <div className="routine-group__summary">
                <span className="routine-group__count">+</span>
                <div>
                  <h3>More in this collection</h3>
                  <p>Products that are live but not yet mapped to a customer-facing routine role still stay visible here.</p>
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

        <section className="collection-section">
          <div className="collection-section__head">
            <span className="collection-section__eyebrow">Safe pairing</span>
            <Title level={2}>Verified technical pairings stay explicit and limited.</Title>
            <Paragraph>
              We only show pairings that the catalogue already marks as compatible. Developer ratios, timing, and substitutions remain intentionally out of view until the current manufacturer sheet is verified.
            </Paragraph>
          </div>

          {!isStylist && !isAdmin ? (
            <div className="pairing-gate">
              <div className="pairing-gate__icon">
                <LockOutlined />
              </div>
              <div className="pairing-gate__copy">
                <h3>Stylist-safe technical guidance unlocks after sign-in or approval.</h3>
                <p>
                  Customers can shop the maintenance routine here. Verified salon pairings stay behind a professional gate so we do not imply unsafe substitutions on the public storefront.
                </p>
              </div>
              <Link to={pairingCtaHref}>
                <Button type="primary">
                  {isAuthenticated ? 'Apply for stylist access' : 'Sign in for stylist guidance'}
                </Button>
              </Link>
            </div>
          ) : pairingProducts.length > 0 ? (
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
                        Technical product
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
                    <Text strong>Pair only with</Text>
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
                </article>
              ))}
            </div>
          ) : (
            <div className="collection-empty-state">
              <h3>No verified technical pairings are visible in this session yet.</h3>
              <p>
                As technical products are confirmed for this collection, they will appear here with the exact compatible systems already provided by the API.
              </p>
            </div>
          )}
        </section>

        <section className="collection-section collection-section--footer">
          <div className="collection-footer-card">
            <div>
              <span className="collection-section__eyebrow">Categories behind this collection</span>
              <Title level={3}>Keep the result path visible. Keep the technical detail underneath it.</Title>
            </div>
            <div className="collection-footer-card__tags">
              {collection.supportedCategoryNames.map((category) => (
                <Tag key={category}>{category}</Tag>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
