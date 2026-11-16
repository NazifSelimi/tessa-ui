/**
 * Hair quiz (/quiz, /hair-survey).
 *
 * Six questions about the hair (pattern, thickness, colour, lengths, scalp,
 * styling; most allow several answers), then the routine steps the person
 * wants and an optional budget. Answers map to hair types and needs in
 * features/quiz/quizConfig.ts; POST /v1/recommendations ranks the products
 * and builds the routine, shown on /recommendations.
 *
 * The last answers are kept in localStorage, so "Edit answers" on the results
 * page (and a returning visitor) starts from them.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Progress, Alert, Spin } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, ExperimentOutlined, UndoOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useGetRecommendationsMutation } from '@/features/recommendations/api';
import { loadHairProfile, saveHairProfile } from '@/shared/utils/hairProfile';
import {
  BUDGETS,
  QUESTIONS,
  ROUTINE_STEPS,
  answerNeedIds,
  answerTypeIds,
  suggestedSteps,
  toggleOption,
  type QuizAnswers,
  type RoutineStep,
} from '@/features/quiz/quizConfig';
import type { RecommendationPayload } from '@/types';
import Seo from '@/shared/components/Seo';

const { Title, Text, Paragraph } = Typography;

const STEP_EMOJI: Record<RoutineStep, string> = { shampoo: '🧴', condition: '💆', leave_in: '💦', scalp: '🌱', style: '💨' };

/** Questions + the final "routine & budget" page. */
const TOTAL_PAGES = QUESTIONS.length + 1;

interface OptionCardProps {
  selected: boolean;
  multi: boolean;
  emoji: string;
  title: string;
  description: string;
  onClick: () => void;
}

function OptionCard({ selected, multi, emoji, title, description, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hair-quiz__option ${selected ? 'hair-quiz__option--selected' : ''}`}
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
    >
      <span className="hair-quiz__option-icon" aria-hidden="true">{emoji}</span>
      <span className="hair-quiz__option-copy">
        <span className="hair-quiz__option-title">{title}</span>
        <span className="hair-quiz__option-description">{description}</span>
      </span>
      <span className={`hair-quiz__tick ${multi ? 'hair-quiz__tick--box' : ''}`} aria-hidden="true">
        {selected && <CheckOutlined />}
      </span>
    </button>
  );
}

export default function HairSurveyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [getRecommendations, { isLoading, error }] = useGetRecommendationsMutation();

  const saved = useMemo(() => loadHairProfile(), []);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(() => saved?.answers ?? {});
  const [steps, setSteps] = useState<RoutineStep[] | null>(() => (saved?.answers ? (saved.survey.steps as RoutineStep[] | undefined) ?? null : null));
  const [budget, setBudget] = useState<string | null>(() => (saved?.answers ? saved.survey.budget_range ?? null : null));

  const panelRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // A new question starts at the top of the panel (on phones the Next button
  // sits far below the question title).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const panel = panelRef.current;
    if (panel && panel.getBoundingClientRect().top < 0) {
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [page]);

  const question = QUESTIONS[page];
  const onRoutinePage = page === QUESTIONS.length;
  // Until the person changes them, the steps follow their answers.
  const chosenSteps = steps ?? suggestedSteps(answers);

  const canGoNext = !question?.required || (answers[question.id]?.length ?? 0) > 0;

  const choose = (key: string) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: toggleOption(question, prev[question.id] ?? [], key) }));
  };

  const toggleStep = (step: RoutineStep) => {
    setSteps(chosenSteps.includes(step) ? chosenSteps.filter((s) => s !== step) : ROUTINE_STEPS.filter((s) => s === step || chosenSteps.includes(s)));
  };

  const restart = () => {
    setAnswers({});
    setSteps(null);
    setBudget(null);
    setPage(0);
  };

  const handleSubmit = async () => {
    const payload: RecommendationPayload = {
      hair_type_ids: answerTypeIds(answers),
      concerns: answerNeedIds(answers),
      steps: chosenSteps,
      ...(budget ? { budget_range: budget } : {}),
    };

    try {
      const result = await getRecommendations(payload).unwrap();
      saveHairProfile(result, payload, answers);
      navigate('/recommendations', { state: { recommendations: result, survey: payload } });
    } catch {
      // shown through RTK Query `error`
    }
  };

  const chips = QUESTIONS.flatMap((q) => (answers[q.id] ?? []).map((key) => ({ q: q.id, key })));
  const apiError = error as { data?: { message?: string } } | undefined;

  return (
    <main className="hair-quiz">
      <Seo title={t('seo.quizTitle')} description={t('seo.quizDescription')} path="/quiz" />
      <header className="hair-quiz__header">
        <div className="hair-quiz__mark"><ExperimentOutlined /></div>
        <Title level={1} style={{ fontSize: 30 }}>{t('survey.hairCareSurvey')}</Title>
        <Paragraph>{t('quiz.intro')}</Paragraph>
      </header>

      <section className="hair-quiz__panel" ref={panelRef}>
        <div className="hair-quiz__progress">
          <Text>{t('survey.stepOf', { step: page + 1, total: TOTAL_PAGES })}</Text>
          <Progress percent={Math.round(((page + 1) / TOTAL_PAGES) * 100)} showInfo={false} strokeColor="var(--color-primary)" />
        </div>

        {apiError && (
          <Alert type="error" showIcon closable message={t('survey.somethingWentWrong')} description={apiError.data?.message || t('survey.pleaseTryAgain')} />
        )}

        <Spin spinning={isLoading} tip={t('survey.gettingRecommendations')}>
          <div className="hair-quiz__question">
            {question && (
              <>
                <Title level={3}>{t(`quiz.q.${question.id}.title`)}</Title>
                <Paragraph type="secondary">
                  {t(`quiz.q.${question.id}.hint`)}{' '}
                  <span className="hair-quiz__mode">{question.multi ? t('quiz.chooseAll') : t('quiz.chooseOne')}</span>
                </Paragraph>
                <div
                  className={`hair-quiz__options ${question.options.length > 4 ? 'hair-quiz__options--stacked' : ''}`}
                  role={question.multi ? 'group' : 'radiogroup'}
                  aria-label={t(`quiz.q.${question.id}.title`)}
                >
                  {question.options.map((option) => (
                    <OptionCard
                      key={option.key}
                      multi={question.multi}
                      selected={answers[question.id]?.includes(option.key) ?? false}
                      emoji={option.emoji}
                      title={t(`quiz.o.${option.key}.label`)}
                      description={t(`quiz.o.${option.key}.desc`)}
                      onClick={() => choose(option.key)}
                    />
                  ))}
                </div>
              </>
            )}

            {onRoutinePage && (
              <>
                <Title level={3}>{t('quiz.q.routine.title')}</Title>
                <Paragraph type="secondary">
                  {t('quiz.q.routine.hint')} <span className="hair-quiz__mode">{t('quiz.chooseAll')}</span>
                </Paragraph>
                <div className="hair-quiz__options hair-quiz__options--stacked" role="group" aria-label={t('quiz.q.routine.title')}>
                  {ROUTINE_STEPS.map((step) => (
                    <OptionCard
                      key={step}
                      multi
                      selected={chosenSteps.includes(step)}
                      emoji={STEP_EMOJI[step]}
                      title={t(`quiz.step.${step}`)}
                      description={t(`quiz.stepDesc.${step}`)}
                      onClick={() => toggleStep(step)}
                    />
                  ))}
                </div>

                <Title level={4} style={{ marginTop: 28 }}>{t('quiz.q.budget.title')}</Title>
                <div className="hair-quiz__options hair-quiz__options--budget" role="radiogroup" aria-label={t('quiz.q.budget.title')}>
                  {[{ value: null, key: 'budgetAny', emoji: '✨' }, ...BUDGETS].map((option) => (
                    <OptionCard
                      key={option.key}
                      multi={false}
                      selected={budget === option.value}
                      emoji={option.emoji}
                      title={t(`quiz.o.${option.key}.label`)}
                      description={t(`quiz.o.${option.key}.desc`)}
                      onClick={() => setBudget(option.value)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </Spin>

        {chips.length > 0 && (
          <div className="hair-quiz__answers" aria-label={t('quiz.yourAnswers')}>
            {chips.map(({ q, key }) => <span key={`${q}-${key}`}>{t(`quiz.o.${key}.label`)}</span>)}
            <button type="button" className="hair-quiz__restart" onClick={restart}><UndoOutlined /> {t('quiz.startOver')}</button>
          </div>
        )}

        <div className="hair-quiz__actions">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setPage((p) => p - 1)} disabled={page === 0 || isLoading} size="large">
            {t('common.back')}
          </Button>

          {!onRoutinePage ? (
            <Button type="primary" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext || isLoading} size="large">
              {question && !question.required && !(answers[question.id]?.length) ? t('quiz.skip') : t('common.next')}
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleSubmit}
              disabled={answerTypeIds(answers).length === 0 || chosenSteps.length === 0 || isLoading}
              loading={isLoading}
              size="large"
            >
              {t('quiz.showRoutine')}
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
