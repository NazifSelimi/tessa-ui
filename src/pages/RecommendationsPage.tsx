/**
 * Hair quiz results (/recommendations).
 *
 *   1. Your routine — the best product for each step the person asked for,
 *      in the order they are used, with why it fits and how to use it, and
 *      one button that puts the whole routine in the cart.
 *   2. More matches — the other ranked products, filterable by step.
 *   3. Sets — static bundles that contain matching products.
 *
 * Data comes from the quiz page (router state) or, after a refresh, from the
 * saved quiz answers, which are sent to the API again.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Typography, Button, Card, Row, Col, Tag, Space, Empty, List, Segmented, Spin, message } from 'antd';
import { ShoppingCartOutlined, EditOutlined, GiftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';
import ProductCard from '@/components/ProductCard';
import type { Product, RecommendationResult, RecommendedBundle, RecommendedProduct, RecommendationPayload, BundleProduct } from '@/types';
import { formatPrice } from '@/shared/utils/formatPrice';
import { buildRecommendationPayload, loadHairProfile } from '@/shared/utils/hairProfile';
import { useGetRecommendationsMutation } from '@/features/recommendations/api';
import { HAIR_TYPE_KEYS, NEED, NEED_KEYS, QUESTIONS, type QuizAnswers } from '@/features/quiz/quizConfig';

const { Title, Text, Paragraph } = Typography;

const TONER_NEEDS: number[] = [NEED.brassyYellow, NEED.brassyOrange, NEED.brassyRed];

/** Which result filter a product step belongs to. */
const STEP_GROUP: Record<string, string> = {
  shampoo: 'shampoo', conditioner: 'condition', mask: 'condition', leave_in: 'leave_in', scalp: 'scalp', style: 'style',
};

function toProduct(product: RecommendedProduct): Product {
  return { ...product, description: product.description ?? '' };
}

/** Colour lines and colour masks: the person picks the shade first. */
function needsShade(product: RecommendedProduct): boolean {
  return Boolean(product.familyId) || (product.shadeOptions?.length ?? 0) > 1;
}

function ResultProduct({ product }: { product: RecommendedProduct }) {
  const { t } = useTranslation();
  const shades = product.shadeOptions ?? [];
  return (
    <>
      <ProductCard product={toProduct(product)} showQuickAdd={!needsShade(product)} />
      {shades.length > 1 ? (
        <div className="quiz-shades">
          <Text type="secondary" className="quiz-routine__tip">{t('quiz.results.pickShade')}</Text>
          <div className="quiz-shades__list">
            {shades.map((shade) => <Link key={shade.id} to={`/product/${shade.id}`} className="quiz-shades__item">{shade.name}</Link>)}
          </div>
        </div>
      ) : product.familyId ? <Link to={`/product/${product.id}`} className="nl-add-button nl-choose-shade quiz-routine__shade">{t('product.chooseShade')}</Link> : null}
      <WhyItFits product={product} />
    </>
  );
}

function priceOf(product: RecommendedProduct): number {
  return product.sale?.price ?? product.price;
}

/** "Fights frizz · For curly hair" chips. */
function WhyItFits({ product }: { product: RecommendedProduct }) {
  const { t } = useTranslation();
  const needs = product.matchedNeedIds ?? [];
  const types = product.matchedTypeIds ?? [];
  if (!needs.length && !types.length) return <div className="quiz-why"><span className="quiz-why__chip quiz-why__chip--plain">{t('quiz.results.suitsYou')}</span></div>;

  return (
    <div className="quiz-why" aria-label={t('quiz.results.whyItFits')}>
      {needs.map((id) => NEED_KEYS[id] && <span key={`n${id}`} className="quiz-why__chip">{t(`quiz.need.${NEED_KEYS[id]}`)}</span>)}
      {types.map((id) => HAIR_TYPE_KEYS[id] && <span key={`t${id}`} className="quiz-why__chip quiz-why__chip--type">{t('quiz.results.forType', { type: t(`quiz.o.${HAIR_TYPE_KEYS[id]}.label`).toLowerCase() })}</span>)}
    </div>
  );
}

function RoutineStepCard({ index, step, product, companion }: { index: number; step: string; product: RecommendedProduct; companion?: RecommendedProduct | null }) {
  const { t } = useTranslation();
  const isToner = (product.matchedNeedIds ?? []).some((id) => TONER_NEEDS.includes(id));
  const tip = isToner ? t('quiz.tip.toner') : t(`quiz.tip.${step}`);

  return (
    <li className="quiz-routine__step">
      <div className="quiz-routine__head">
        <span className="quiz-routine__number" aria-hidden="true">{index + 1}</span>
        <div>
          <Text strong className="quiz-routine__label">{t(`quiz.step.${step}`)}</Text>
          <div><Text type="secondary" className="quiz-routine__tip">{tip}</Text></div>
        </div>
      </div>
      <div className="quiz-routine__product">
        <ResultProduct product={product} />
      </div>
      {companion && (
        <div className="quiz-routine__product quiz-routine__companion">
          <Text strong className="quiz-routine__tip">{t('quiz.results.companion')}</Text>
          <ResultProduct product={companion} />
        </div>
      )}
    </li>
  );
}

function BundleCard({ bundle }: { bundle: RecommendedBundle }) {
  const { addItem } = useCart();
  const { t } = useTranslation();
  const totalPrice = bundle.isDynamic ? bundle.totalPrice : bundle.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const discountedPrice = !bundle.isDynamic && bundle.discountPercentage != null ? totalPrice * (1 - bundle.discountPercentage / 100) : null;

  const handleAddBundle = () => {
    bundle.products.forEach((bp: BundleProduct) => {
      addItem({ id: bp.id, name: bp.name, brand: null, category: null, description: '', price: bp.price, stylistPrice: bp.stylistPrice ?? bp.price, image: bp.image, inStock: true, quantity: bp.quantity }, bp.quantity);
    });
    message.success(t('recommendations.bundleAdded', { name: bundle.name, count: bundle.products.length }));
  };

  return (
    <Card style={{ height: '100%' }} styles={{ body: { padding: 24, display: 'flex', flexDirection: 'column', height: '100%' } }}>
      <div style={{ flex: 1 }}>
        <Space align="center" style={{ marginBottom: 8 }}>
          <GiftOutlined style={{ fontSize: 20, color: 'var(--color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>{bundle.name}</Title>
        </Space>
        {bundle.description && <Paragraph type="secondary">{bundle.description}</Paragraph>}
        <List size="small" dataSource={bundle.products} style={{ marginBottom: 16 }} renderItem={(p: BundleProduct) => (
          <List.Item style={{ padding: '6px 0' }}><Text>{p.name}</Text><Text type="secondary" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{formatPrice(p.price)}</Text></List.Item>
        )} />
        {discountedPrice != null && discountedPrice < totalPrice ? (
          <Space size={12} align="baseline" style={{ marginBottom: 16 }}>
            <Text delete type="secondary">{formatPrice(totalPrice)}</Text>
            <Text strong style={{ fontSize: 20, color: 'var(--color-primary)' }}>{formatPrice(discountedPrice)}</Text>
            {!bundle.isDynamic && bundle.discountPercentage ? <Tag color="red">{t('recommendations.save', { percent: bundle.discountPercentage })}</Tag> : null}
          </Space>
        ) : <Text strong style={{ fontSize: 20, display: 'block', marginBottom: 16 }}>{formatPrice(totalPrice)}</Text>}
      </div>
      <Button type="primary" block size="large" icon={<ShoppingCartOutlined />} onClick={handleAddBundle}>{t('recommendations.addBundleToCart')}</Button>
    </Card>
  );
}

export default function RecommendationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [filter, setFilter] = useState('all');

  const state = location.state as { recommendations: RecommendationResult; survey: RecommendationPayload } | undefined;

  /* Fresh results come with the navigation; after a refresh the saved answers
     (never products or prices) are sent again, so the prices are current. */
  const stored = useMemo(() => loadHairProfile(), []);
  const [refetch, { data: refetched, isLoading: refetching, isUninitialized }] = useGetRecommendationsMutation();
  const needsRefetch = !state?.recommendations && Boolean(stored);
  useEffect(() => {
    if (needsRefetch && stored) {
      void refetch(buildRecommendationPayload(stored.answers, stored.steps, stored.budget)).catch(() => undefined);
    }
  }, [needsRefetch, stored, refetch]);

  const recommendations = state?.recommendations ?? refetched;
  const data = useMemo((): { recommendations: RecommendationResult; answers?: QuizAnswers } | undefined => (
    recommendations ? { recommendations, answers: stored?.answers } : undefined
  ), [recommendations, stored]);

  if (needsRefetch && !recommendations && (refetching || isUninitialized)) {
    return <div style={{ textAlign: 'center', margin: '120px 0' }}><Spin size="large" /></div>;
  }

  if (!data?.recommendations) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 16px' }}>
        <Empty description={t('recommendations.noRecommendationsYet')} />
        <Button type="primary" size="large" onClick={() => navigate('/quiz')} style={{ marginTop: 24 }}>{t('recommendations.takeHairSurvey')}</Button>
      </div>
    );
  }

  const { products, bundles } = data.recommendations;
  const routine = data.recommendations.routine ?? [];
  const askedSteps = data.recommendations.steps ?? [];
  const routineIds = new Set(routine.flatMap((entry) => [entry.product.id, entry.companion?.id]));
  const missingSteps = askedSteps.filter((step) => !routine.some((entry) => entry.step === step));
  const more = products.filter((p) => !routineIds.has(p.id));
  const moreGroups = [...new Set(more.map((p) => STEP_GROUP[p.quizStep ?? ''] ?? 'other'))];
  const shownMore = filter === 'all' ? more : more.filter((p) => (STEP_GROUP[p.quizStep ?? ''] ?? 'other') === filter);

  // Colour lines need a shade choice first, so they are not added in one click.
  const addable = routine
    .flatMap((entry) => [entry.product, entry.companion])
    .filter((product): product is RecommendedProduct => Boolean(product && product.inStock && !needsShade(product)));
  const routineTotal = addable.reduce((sum, product) => sum + priceOf(product), 0);
  const addRoutine = () => {
    addable.forEach((product) => addItem(toProduct(product), 1));
    message.success(t('quiz.results.routineAdded', { count: addable.length }));
  };

  const answerChips = data.answers ? QUESTIONS.flatMap((q) => (data.answers?.[q.id] ?? []).map((key) => `quiz.o.${key}.label`)) : [];

  return (
    <div className="quiz-results">
      <header className="quiz-results__header">
        <span className="nl-eyebrow">{t('quiz.results.eyebrow')}</span>
        <Title level={1} style={{ marginTop: 6 }}>{t('quiz.results.title')}</Title>
        <Paragraph type="secondary" style={{ maxWidth: 620 }}>{t('quiz.results.subtitle')}</Paragraph>
        {answerChips.length > 0 && <div className="hair-quiz__answers quiz-results__answers">{answerChips.map((key) => <span key={key}>{t(key)}</span>)}</div>}
        <Button icon={<EditOutlined />} onClick={() => navigate('/quiz')}>{t('quiz.results.editAnswers')}</Button>
      </header>

      {routine.length > 0 && (
        <section className="quiz-routine" aria-labelledby="quiz-routine-title">
          <div className="quiz-routine__bar">
            <Title level={2} id="quiz-routine-title" style={{ margin: 0 }}>{t('quiz.results.routineTitle')}</Title>
            {addable.length > 0 && (
              <Button type="primary" size="large" icon={<ShoppingCartOutlined />} onClick={addRoutine}>
                {t('quiz.results.addRoutine', { count: addable.length, total: formatPrice(routineTotal) })}
              </Button>
            )}
          </div>
          <ol className="quiz-routine__list">
            {routine.map((entry, index) => <RoutineStepCard key={entry.step} index={index} step={entry.step} product={entry.product} companion={entry.companion} />)}
          </ol>
          {missingSteps.length > 0 && (
            <Paragraph type="secondary" className="quiz-routine__missing">
              {t('quiz.results.missingSteps', { steps: missingSteps.map((s) => t(`quiz.step.${s}`)).join(', ') })}
            </Paragraph>
          )}
        </section>
      )}

      {more.length > 0 && (
        <section className="quiz-more" aria-labelledby="quiz-more-title">
          <div className="quiz-routine__bar">
            <Title level={2} id="quiz-more-title" style={{ margin: 0 }}>{routine.length ? t('quiz.results.moreTitle') : t('recommendations.recommendedProducts')}</Title>
            {moreGroups.length > 1 && (
              <Segmented
                value={filter}
                onChange={(value) => setFilter(String(value))}
                options={[{ value: 'all', label: t('quiz.results.all') }, ...moreGroups.map((g) => ({ value: g, label: t(`quiz.step.${g}`) }))]}
              />
            )}
          </div>
          <div className="nl-product-grid">
            {shownMore.map((product) => (
              <div key={product.id} className="quiz-more__item"><ResultProduct product={product} /></div>
            ))}
          </div>
        </section>
      )}

      {!routine.length && !more.length && (
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <Empty description={t('recommendations.noMatchingProducts')} />
          <Button type="primary" size="large" onClick={() => navigate('/quiz')} style={{ marginTop: 24 }}>{t('recommendations.retakeSurvey')}</Button>
        </div>
      )}

      {bundles.length > 0 && (
        <section className="quiz-more">
          <Title level={2}>{t('recommendations.recommendedBundles')}</Title>
          <Row gutter={[24, 24]}>
            {bundles.map((bundle, idx) => <Col key={bundle.id ?? `bundle-${idx}`} xs={24} sm={12} lg={8}><BundleCard bundle={bundle} /></Col>)}
          </Row>
        </section>
      )}
    </div>
  );
}
