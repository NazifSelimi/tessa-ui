/**
 * Hair Survey Page
 *
 * Multi-step survey that collects:
 *   Step 1 – Hair Type       → hair_type_id (number)
 *   Step 2 – Primary Concern → concerns[0]  (number)
 *   Step 3 – Secondary Concern (optional) → concerns[1] (number)
 *   Step 4 – Budget (optional) → budget_range "min-max" string
 *
 * On submit → POST /v1/recommendations via RTK Query mutation,
 * then navigates to /recommendations with the results in location state.
 *
 * Accessible to both authenticated users and guests.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Card, Space, Progress, Alert, Spin, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useGetRecommendationsMutation } from '@/features/recommendations/api';
import type { RecommendationPayload } from '@/types';

const { Title, Text, Paragraph } = Typography;

/* ------------------------------------------------------------------ */
/*  Option data  (ids must match backend hair_types / concerns tables) */
/* ------------------------------------------------------------------ */

interface SurveyOption {
  id: number;
  label: string;
  description: string;
  emoji: string;
}

const HAIR_TYPE_KEYS = [
  { id: 1, labelKey: 'survey.straight', descKey: 'survey.straightDesc', emoji: '➖' },
  { id: 2, labelKey: 'survey.wavy', descKey: 'survey.wavyDesc', emoji: '〰️' },
  { id: 3, labelKey: 'survey.curly', descKey: 'survey.curlyDesc', emoji: '🌀' },
  { id: 4, labelKey: 'survey.coily', descKey: 'survey.coilyDesc', emoji: '🔄' },
];

const CONCERN_KEYS = [
  { id: 1, labelKey: 'survey.dryness', descKey: 'survey.drynessDesc', emoji: '🏜️' },
  { id: 2, labelKey: 'survey.frizz', descKey: 'survey.frizzDesc', emoji: '⚡' },
  { id: 3, labelKey: 'survey.breakage', descKey: 'survey.breakageDesc', emoji: '💔' },
  { id: 4, labelKey: 'survey.thinning', descKey: 'survey.thinningDesc', emoji: '🍂' },
  { id: 5, labelKey: 'survey.oiliness', descKey: 'survey.oilinessDesc', emoji: '💧' },
  { id: 6, labelKey: 'survey.dandruff', descKey: 'survey.dandruffDesc', emoji: '❄️' },
  { id: 7, labelKey: 'survey.colorProtection', descKey: 'survey.colorProtectionDesc', emoji: '🎨' },
];

const BUDGET_KEYS = [
  { value: '0-300', labelKey: 'survey.budgetFriendly', descKey: 'survey.budgetFriendlyDesc', emoji: '💰' },
  { value: '300-600', labelKey: 'survey.midRange', descKey: 'survey.midRangeDesc', emoji: '💳' },
  { value: '600-10000', labelKey: 'survey.premium', descKey: 'survey.premiumDesc', emoji: '✨' },
];

const TOTAL_STEPS = 4;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HairSurveyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [getRecommendations, { isLoading, error }] = useGetRecommendationsMutation();

  // Survey state
  const [step, setStep] = useState(1);
  const [hairTypeId, setHairTypeId] = useState<number | null>(null);
  const [primaryConcernId, setPrimaryConcernId] = useState<number | null>(null);
  const [secondaryConcernId, setSecondaryConcernId] = useState<number | null>(null);
  const [budgetRange, setBudgetRange] = useState<string | null>(null);

  const HAIR_TYPE_OPTIONS: SurveyOption[] = useMemo(() =>
    HAIR_TYPE_KEYS.map(k => ({ id: k.id, label: t(k.labelKey), description: t(k.descKey), emoji: k.emoji })),
    [t],
  );
  const CONCERN_OPTIONS: SurveyOption[] = useMemo(() =>
    CONCERN_KEYS.map(k => ({ id: k.id, label: t(k.labelKey), description: t(k.descKey), emoji: k.emoji })),
    [t],
  );
  const BUDGET_OPTIONS = useMemo(() =>
    BUDGET_KEYS.map(k => ({ value: k.value, label: t(k.labelKey), description: t(k.descKey), emoji: k.emoji })),
    [t],
  );

  /* ----- navigation ----- */
  const canGoNext = (): boolean => {
    if (step === 1) return hairTypeId !== null;
    if (step === 2) return primaryConcernId !== null;
    // steps 3 & 4 are optional
    return true;
  };

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  /* ----- submit ----- */
  const handleSubmit = async () => {
    if (hairTypeId == null || primaryConcernId == null) return;

    const concerns = [primaryConcernId];
    if (secondaryConcernId != null) concerns.push(secondaryConcernId);

    const payload: RecommendationPayload = {
      hair_type_id: hairTypeId,
      concerns,
      ...(budgetRange ? { budget_range: budgetRange } : {}),
    };

    try {
      const result = await getRecommendations(payload).unwrap();
      navigate('/recommendations', { state: { recommendations: result, survey: payload } });
    } catch {
      // error state handled by RTK Query `error`
    }
  };

  /* ----- generic option card grid (number-based selection) ----- */
  function renderIdGrid(
    options: SurveyOption[],
    selectedId: number | null,
    onSelect: (id: number) => void,
    disabledId?: number | null,
  ) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
        marginTop: 24,
      }}>
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          const isDisabled = disabledId != null && disabledId === opt.id;
          return (
            <Card
              key={opt.id}
              hoverable={!isDisabled}
              onClick={() => !isDisabled && onSelect(opt.id)}
              style={{
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                borderColor: isSelected ? 'var(--color-primary, #1677ff)' : undefined,
                borderWidth: isSelected ? 2 : 1,
                opacity: isDisabled ? 0.45 : 1,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isSelected ? '0 0 0 2px rgba(22,119,255,0.15)' : undefined,
              }}
              styles={{ body: { padding: 20, textAlign: 'center' } }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{opt.emoji}</div>
              <Text strong style={{ fontSize: 16, display: 'block' }}>{opt.label}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{opt.description}</Text>
              {isSelected && (
                <Tag color="blue" style={{ marginTop: 8 }}>
                  <CheckOutlined /> {t('survey.selected')}
                </Tag>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  /* ----- budget option grid (string-based "min-max") ----- */
  function renderBudgetGrid() {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
        marginTop: 24,
      }}>
        {BUDGET_OPTIONS.map((opt) => {
          const isSelected = budgetRange === opt.value;
          return (
            <Card
              key={opt.value}
              hoverable
              onClick={() => setBudgetRange(opt.value)}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--color-primary, #1677ff)' : undefined,
                borderWidth: isSelected ? 2 : 1,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isSelected ? '0 0 0 2px rgba(22,119,255,0.15)' : undefined,
              }}
              styles={{ body: { padding: 20, textAlign: 'center' } }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{opt.emoji}</div>
              <Text strong style={{ fontSize: 16, display: 'block' }}>{opt.label}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{opt.description}</Text>
              {isSelected && (
                <Tag color="blue" style={{ marginTop: 8 }}>
                  <CheckOutlined /> {t('survey.selected')}
                </Tag>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  /* ----- label helpers ----- */
  const hairTypeLabel = HAIR_TYPE_OPTIONS.find((o) => o.id === hairTypeId)?.label ?? '';
  const primaryLabel = CONCERN_OPTIONS.find((o) => o.id === primaryConcernId)?.label ?? '';

  /* ----- step content ----- */
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Title level={3}>{t('survey.whatHairType')}</Title>
            <Paragraph type="secondary">
              {t('survey.hairTypeDescription')}
            </Paragraph>
            {renderIdGrid(HAIR_TYPE_OPTIONS, hairTypeId, setHairTypeId)}
          </>
        );

      case 2:
        return (
          <>
            <Title level={3}>{t('survey.primaryConcern')}</Title>
            <Paragraph type="secondary">
              {t('survey.primaryConcernDescription')}
            </Paragraph>
            {renderIdGrid(CONCERN_OPTIONS, primaryConcernId, setPrimaryConcernId)}
          </>
        );

      case 3:
        return (
          <>
            <Title level={3}>{t('survey.secondaryConcern')}</Title>
            <Paragraph type="secondary">
              {t('survey.secondaryConcernDescription')}
            </Paragraph>
            {renderIdGrid(CONCERN_OPTIONS, secondaryConcernId, setSecondaryConcernId, primaryConcernId)}
            {secondaryConcernId != null && (
              <Button
                type="link"
                onClick={() => setSecondaryConcernId(null)}
                style={{ marginTop: 12 }}
              >
                {t('survey.clearSelection')}
              </Button>
            )}
          </>
        );

      case 4:
        return (
          <>
            <Title level={3}>{t('survey.whatBudget')}</Title>
            <Paragraph type="secondary">
              {t('survey.budgetDescription')}
            </Paragraph>
            {renderBudgetGrid()}
            {budgetRange && (
              <Button
                type="link"
                onClick={() => setBudgetRange(null)}
                style={{ marginTop: 12 }}
              >
                {t('survey.clearSelection')}
              </Button>
            )}
          </>
        );

      default:
        return null;
    }
  };

  /* ----- error display ----- */
  const apiError = error as { data?: { message?: string } } | undefined;

  /* ----- render ----- */
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <ExperimentOutlined style={{ fontSize: 40, color: 'var(--color-primary, #1677ff)' }} />
        <Title level={2} style={{ marginTop: 8 }}>{t('survey.hairCareSurvey')}</Title>
        <Paragraph type="secondary">
          {t('survey.surveyIntro')}
        </Paragraph>
      </div>

      {/* Progress */}
      <Progress
        percent={Math.round((step / TOTAL_STEPS) * 100)}
        showInfo={false}
        strokeColor="var(--color-primary, #1677ff)"
        style={{ marginBottom: 32 }}
      />
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
        {t('survey.stepOf', { step, total: TOTAL_STEPS })}
      </Text>

      {/* Error */}
      {apiError && (
        <Alert
          type="error"
          showIcon
          closable
          message={t('survey.somethingWentWrong')}
          description={apiError.data?.message || t('survey.pleaseTryAgain')}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Step Content */}
      <Spin spinning={isLoading} tip={t('survey.gettingRecommendations')}>
        {renderStep()}
      </Spin>

      {/* Summary chips (show selections so far) */}
      {(hairTypeLabel || primaryLabel) && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          {hairTypeLabel && <Tag color="blue">{hairTypeLabel}</Tag>}
          {primaryLabel && <Tag color="geekblue">{primaryLabel}</Tag>}
          {secondaryConcernId != null && (
            <Tag color="cyan">
              {CONCERN_OPTIONS.find((o) => o.id === secondaryConcernId)?.label}
            </Tag>
          )}
          {budgetRange && (
            <Tag color="gold">
              {BUDGET_OPTIONS.find((o) => o.value === budgetRange)?.label}
            </Tag>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 40,
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={goBack}
          disabled={step === 1 || isLoading}
          size="large"
        >
          {t('common.back')}
        </Button>

        <Space>
          {step < TOTAL_STEPS ? (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={goNext}
              disabled={!canGoNext() || isLoading}
              size="large"
            >
              {t('common.next')}
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleSubmit}
              disabled={hairTypeId == null || primaryConcernId == null || isLoading}
              loading={isLoading}
              size="large"
            >
              {t('survey.getRecommendations')}
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
}
