/**
 * Hair quiz questions.
 *
 * Every answer option maps to hair types (hair_types ids) and/or needs
 * (hair_concerns ids). The ids are fixed by the API migration
 * 2026_11_16_120000_extend_hair_quiz_taxonomy — keep them in sync.
 * Labels live in i18n under quiz.o.<option key> and quiz.q.<question id>.
 */

export type RoutineStep = 'shampoo' | 'condition' | 'leave_in' | 'scalp' | 'style';

export const ROUTINE_STEPS: RoutineStep[] = ['shampoo', 'condition', 'leave_in', 'scalp', 'style'];

/** hair_concerns ids */
export const NEED = {
  dryness: 1,
  frizz: 2,
  breakage: 3,
  hairLoss: 4,
  oiliness: 5,
  dandruff: 6,
  colorProtection: 7,
  volume: 8,
  brassyYellow: 9,
  brassyOrange: 10,
  brassyRed: 11,
  curlDefinition: 12,
  shine: 13,
  heatProtection: 14,
  bondRepair: 15,
  colorRefresh: 16,
  hold: 17,
  texture: 18,
} as const;

/** i18n key (quiz.need.<key>) for each need id, used to explain results. */
export const NEED_KEYS: Record<number, string> = Object.fromEntries(
  Object.entries(NEED).map(([key, id]) => [id, key]),
);

/** hair_types ids */
export const HAIR_TYPE = { straight: 1, wavy: 2, curly: 3, coily: 4, fine: 5, thick: 6, normal: 7 } as const;

export const HAIR_TYPE_KEYS: Record<number, string> = Object.fromEntries(
  Object.entries(HAIR_TYPE).map(([key, id]) => [id, key]),
);

export interface QuizOption {
  key: string;
  emoji: string;
  typeIds?: number[];
  needIds?: number[];
  /** "None of these": choosing it clears the others, and the other way round. */
  exclusive?: boolean;
}

export interface QuizQuestion {
  id: 'pattern' | 'thickness' | 'colour' | 'lengths' | 'scalp' | 'styling';
  multi: boolean;
  /** Needs at least one answer before Next. */
  required?: boolean;
  options: QuizOption[];
}

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 'pattern',
    multi: true,
    required: true,
    options: [
      { key: 'straight', emoji: '➖', typeIds: [HAIR_TYPE.straight] },
      { key: 'wavy', emoji: '〰️', typeIds: [HAIR_TYPE.wavy] },
      { key: 'curly', emoji: '➰', typeIds: [HAIR_TYPE.curly] },
      { key: 'coily', emoji: '🌀', typeIds: [HAIR_TYPE.coily] },
    ],
  },
  {
    id: 'thickness',
    multi: false,
    options: [
      { key: 'fine', emoji: '🪶', typeIds: [HAIR_TYPE.fine] },
      { key: 'normal', emoji: '🙂', typeIds: [HAIR_TYPE.normal] },
      { key: 'thick', emoji: '🦁', typeIds: [HAIR_TYPE.thick] },
    ],
  },
  {
    id: 'colour',
    multi: true,
    options: [
      { key: 'natural', emoji: '🌿', exclusive: true },
      { key: 'coloured', emoji: '🎨', needIds: [NEED.colorProtection] },
      { key: 'bleached', emoji: '⚗️', needIds: [NEED.bondRepair, NEED.colorProtection] },
      { key: 'yellowTones', emoji: '💛', needIds: [NEED.brassyYellow] },
      { key: 'orangeTones', emoji: '🧡', needIds: [NEED.brassyOrange] },
      { key: 'redTones', emoji: '❤️', needIds: [NEED.brassyRed] },
      { key: 'refreshColour', emoji: '🌈', needIds: [NEED.colorRefresh] },
    ],
  },
  {
    id: 'lengths',
    multi: true,
    options: [
      { key: 'dryness', emoji: '🏜️', needIds: [NEED.dryness] },
      { key: 'frizz', emoji: '⚡', needIds: [NEED.frizz] },
      { key: 'breakage', emoji: '✂️', needIds: [NEED.breakage] },
      { key: 'dull', emoji: '✨', needIds: [NEED.shine] },
      { key: 'lengthsFine', emoji: '👍', exclusive: true },
    ],
  },
  {
    id: 'scalp',
    multi: true,
    options: [
      { key: 'oily', emoji: '💧', needIds: [NEED.oiliness] },
      { key: 'dandruff', emoji: '❄️', needIds: [NEED.dandruff] },
      { key: 'hairLoss', emoji: '🍂', needIds: [NEED.hairLoss] },
      { key: 'scalpFine', emoji: '👍', exclusive: true },
    ],
  },
  {
    id: 'styling',
    multi: true,
    options: [
      { key: 'heat', emoji: '🔥', needIds: [NEED.heatProtection] },
      { key: 'volume', emoji: '🎈', needIds: [NEED.volume] },
      { key: 'curls', emoji: '➰', needIds: [NEED.curlDefinition] },
      { key: 'hold', emoji: '🧷', needIds: [NEED.hold] },
      { key: 'texture', emoji: '🪮', needIds: [NEED.texture] },
      { key: 'noStyling', emoji: '🌬️', exclusive: true },
    ],
  },
];

export const BUDGETS = [
  { value: '0-800', key: 'budgetLow', emoji: '💰' },
  { value: '0-1500', key: 'budgetMid', emoji: '💳' },
] as const;

/** Chosen option keys per question. */
export type QuizAnswers = Partial<Record<QuizQuestion['id'], string[]>>;

/** Toggle an option, honouring single choice and "none of these" options. */
export function toggleOption(question: QuizQuestion, current: string[], key: string): string[] {
  const option = question.options.find((o) => o.key === key);
  if (!option) return current;
  if (!question.multi) return current.includes(key) ? [] : [key];
  if (current.includes(key)) return current.filter((k) => k !== key);
  if (option.exclusive) return [key];
  const exclusive = new Set(question.options.filter((o) => o.exclusive).map((o) => o.key));
  return [...current.filter((k) => !exclusive.has(k)), key];
}

function chosenOptions(answers: QuizAnswers): QuizOption[] {
  return QUESTIONS.flatMap((q) => q.options.filter((o) => answers[q.id]?.includes(o.key)));
}

export function answerTypeIds(answers: QuizAnswers): number[] {
  return [...new Set(chosenOptions(answers).flatMap((o) => o.typeIds ?? []))];
}

export function answerNeedIds(answers: QuizAnswers): number[] {
  return [...new Set(chosenOptions(answers).flatMap((o) => o.needIds ?? []))];
}

/** Same rule as the API: wash + care + leave-in, plus scalp / styling when asked about. */
export function suggestedSteps(answers: QuizAnswers): RoutineStep[] {
  const needs = new Set(answerNeedIds(answers));
  const steps: RoutineStep[] = ['shampoo', 'condition', 'leave_in'];
  if ([NEED.oiliness, NEED.dandruff, NEED.hairLoss].some((id) => needs.has(id))) steps.push('scalp');
  if ([NEED.volume, NEED.curlDefinition, NEED.hold, NEED.texture].some((id) => needs.has(id))) steps.push('style');
  return steps;
}
