import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton, Typography } from 'antd';
import { ArrowRightOutlined, CheckCircleFilled, PlayCircleOutlined, ScissorOutlined } from '@ant-design/icons';
import { useGetProductCollectionsQuery, useGetProductsQuery } from '@/features/products/api';
import CollectionDirectory from '@/components/storefront/CollectionDirectory';
import { buildStorefrontCollectionDirectory, getRoutineRoleCopy } from '@/shared/config/storefrontCollections';
import type { Product } from '@/types';

const { Title, Paragraph, Text } = Typography;

function PreviewPackshot({ product, fallback }: { product?: Product; fallback: string }) {
  if (!product?.image) {
    return (
      <div className="storefront-packshot storefront-packshot--placeholder">
        <span>{fallback}</span>
      </div>
    );
  }

  return (
    <div className="storefront-packshot">
      <img src={product.image} alt={product.name} loading="lazy" />
    </div>
  );
}

export default function HomePage() {
  const { data: collectionsData = [], isLoading: loadingCollections } = useGetProductCollectionsQuery();
  const directory = useMemo(
    () => buildStorefrontCollectionDirectory(collectionsData),
    [collectionsData],
  );
  const blondeCollection = directory.find((item) => item.slug === 'blonde-and-tone');
  const { data: blondeProductsData, isLoading: loadingBlondeProducts } = useGetProductsQuery({
    collection: 'blonde-and-tone',
    perPage: 24,
    sort: 'name_asc',
  });

  const blondeProducts = blondeProductsData?.data ?? [];
  const consumerProducts = blondeProducts.filter((product) => !product.catalogGuidance?.professionalOnly);
  const previewProducts = consumerProducts.slice(0, 3);
  const routinePreview = (blondeCollection?.routineRoles ?? [])
    .map((role) => ({
      role,
      copy: getRoutineRoleCopy(role, 'blonde-and-tone'),
      product: consumerProducts.find((product) => product.catalogGuidance?.consumerRoutineRole === role),
    }))
    .filter((item) => item.product);

  return (
    <div className="storefront-home">
      <section className="storefront-hero">
        <div className="storefront-hero__copy">
          <span className="storefront-hero__eyebrow">Release 2 storefront</span>
          <Title level={1} className="storefront-hero__title">
            Real hair results first. The routine that protects them second.
          </Title>
          <Paragraph className="storefront-hero__body">
            Tessa&apos;s mobile storefront now leads with outcomes, not internal product classes. Blonde and Tone is the first visible campaign: a result-led path that keeps home maintenance public and verified technical guidance gated for stylists.
          </Paragraph>

          <div className="storefront-hero__actions">
            <Link to="/collections/blonde-and-tone">
              <Button type="primary" size="large">
                Shop Blonde and Tone
              </Button>
            </Link>
            <Link to="/hair-survey">
              <Button size="large">
                Find my routine <ArrowRightOutlined />
              </Button>
            </Link>
          </div>

          <div className="storefront-hero__proof">
            <div className="storefront-proof-pill">
              <CheckCircleFilled />
              Result-led collection entry points
            </div>
            <div className="storefront-proof-pill">
              <CheckCircleFilled />
              Existing product media only
            </div>
            <div className="storefront-proof-pill">
              <CheckCircleFilled />
              Stylist-safe pairing stays explicit
            </div>
          </div>
        </div>

        <div className="storefront-hero__visual">
          <div className="storefront-hero-slot">
            <span className="storefront-hero-slot__eyebrow">Temporary hero slot</span>
            <h2>Approved Tessa blonde result image goes here.</h2>
            <p>
              This placeholder stays visible until the selected real-result image has confirmed client and artist permission.
            </p>
          </div>

          <div className="storefront-packshot-grid">
            <PreviewPackshot
              product={previewProducts[0]}
              fallback="Existing product media appears here when the catalogue responds."
            />
            <PreviewPackshot
              product={previewProducts[1]}
              fallback="Campaign art stays out until Tessa approves a reusable master."
            />
            <PreviewPackshot
              product={previewProducts[2]}
              fallback="Technical imagery remains separate from the public hero."
            />
          </div>
        </div>
      </section>

      <section className="storefront-section">
        <div className="storefront-section__head">
          <div>
            <span className="storefront-section__eyebrow">Shop by result</span>
            <Title level={2}>Six visible entry points for the new storefront.</Title>
          </div>
          <Text className="storefront-section__caption">
            Each path leads to a reusable collection page powered by the catalogue contract.
          </Text>
        </div>

        {loadingCollections ? (
          <div className="storefront-loading-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton.Button key={index} active block style={{ height: 180 }} />
            ))}
          </div>
        ) : (
          <CollectionDirectory items={directory} />
        )}
      </section>

      <section className="storefront-story">
        <div className="storefront-story__copy">
          <span className="storefront-section__eyebrow">Current brand story</span>
          <Title level={2}>Fanola Wonder No Yellow opens the new home with one focused campaign.</Title>
          <Paragraph>
            The first release stays intentionally narrow: cool blonde maintenance, public-safe routine roles, and a clear route into stylist-only pairing guidance when technical products are involved.
          </Paragraph>
          <Link to="/collections/blonde-and-tone" className="storefront-inline-link">
            View the full collection <ArrowRightOutlined />
          </Link>
        </div>

        <div className="storefront-story__routine">
          {loadingBlondeProducts ? (
            <div className="storefront-loading-grid storefront-loading-grid--compact">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton.Button key={index} active block style={{ height: 120 }} />
              ))}
            </div>
          ) : routinePreview.length > 0 ? (
            routinePreview.map((item) => (
              <article key={item.role} className="storefront-routine-card">
                <span className="storefront-routine-card__role">{item.copy.label}</span>
                <h3>{item.product?.name}</h3>
                <p>{item.copy.intro}</p>
              </article>
            ))
          ) : (
            <article className="storefront-routine-card storefront-routine-card--placeholder">
              <span className="storefront-routine-card__role">Live catalogue pending</span>
              <h3>Routine products will drop in here automatically.</h3>
              <p>The structure is ready even if the API or product mappings are temporarily unavailable.</p>
            </article>
          )}
        </div>
      </section>

      <section className="storefront-proof-grid">
        <article className="storefront-proof-card">
          <span className="storefront-section__eyebrow">Real proof</span>
          <h3>Approved blonde transformation slot</h3>
          <p>
            Keep real-result storytelling visible, but only with confirmed client and artist permission. Until then, the slot stays marked as temporary.
          </p>
        </article>

        <article className="storefront-proof-card">
          <span className="storefront-section__eyebrow">Education</span>
          <h3>Educator clip slot for technique support</h3>
          <p>
            Release 2 makes space for short protocol clips without forcing them into a generic campaign banner.
          </p>
          <div className="storefront-proof-card__action">
            <PlayCircleOutlined />
            Pending approved asset
          </div>
        </article>

        <article className="storefront-proof-card">
          <span className="storefront-section__eyebrow">Safety</span>
          <h3>Technical pairing becomes visible only where the catalogue already verifies it.</h3>
          <p>
            We show compatible systems. We do not guess ratios, timing, or substitutions on the public storefront.
          </p>
        </article>
      </section>

      <section className="storefront-builder">
        <div className="storefront-section__head">
          <div>
            <span className="storefront-section__eyebrow">Routine builder</span>
            <Title level={2}>Keep the quiz, but show the practical output.</Title>
          </div>
        </div>

        <div className="storefront-builder__grid">
          {[
            ['Shampoo', 'Cleanse and reset without overwhelming the first decision.'],
            ['Treatment', 'Make mask or repair support feel like the clear second step.'],
            ['Leave-in', 'Reserve leave-ins and fluids for the role they actually play.'],
            ['Finish', 'Protect the result with a final layer that feels easy to repeat.'],
          ].map(([title, body]) => (
            <article key={title} className="storefront-builder__card">
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <Link to="/quiz">
          <Button type="primary" size="large">
            Start the quiz <ArrowRightOutlined />
          </Button>
        </Link>
      </section>

      <section className="storefront-pro-card">
        <div className="storefront-pro-card__copy">
          <span className="storefront-section__eyebrow">For stylists and salons</span>
          <Title level={2}>Keep the professional supply desk working while the storefront grows around it.</Title>
          <Paragraph>
            Quick order, checkout, stylist invitations, and the admin tools stay intact. Release 2 adds a clearer public front door without taking speed away from the professional workspace.
          </Paragraph>
        </div>

        <Link to="/for-professionals" className="storefront-pro-card__cta">
          <div className="storefront-pro-card__icon">
            <ScissorOutlined />
          </div>
          <div>
            <strong>Open the professional path</strong>
            <span>Wholesale access, quick order, and verified pairing guidance.</span>
          </div>
          <ArrowRightOutlined />
        </Link>
      </section>

      <section className="storefront-trust-strip">
        <div className="storefront-trust-item">
          <strong>Authentic product sources</strong>
          <span>Only existing catalogue media or clearly marked temporary slots.</span>
        </div>
        <div className="storefront-trust-item">
          <strong>Cash on delivery and current checkout flow</strong>
          <span>The storefront refresh sits on top of the working commerce path.</span>
        </div>
        <div className="storefront-trust-item">
          <strong>Deliberate rollout</strong>
          <span>Blonde and Tone is live first; the remaining collections stay visible but clearly staged.</span>
        </div>
      </section>
    </div>
  );
}
