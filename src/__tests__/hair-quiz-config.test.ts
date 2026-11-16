import { describe, expect, it } from 'vitest';
import { NEED, QUESTIONS, answerNeedIds, answerTypeIds, suggestedSteps, toggleOption } from '@/features/quiz/quizConfig';

const q = (id: string) => QUESTIONS.find((question) => question.id === id)!;

describe('hair quiz answers', () => {
  it('allows several answers and clears "none of these" when another is picked', () => {
    let scalp = toggleOption(q('scalp'), [], 'scalpFine');
    expect(scalp).toEqual(['scalpFine']);
    scalp = toggleOption(q('scalp'), scalp, 'oily');
    scalp = toggleOption(q('scalp'), scalp, 'dandruff');
    expect(scalp).toEqual(['oily', 'dandruff']);
    expect(toggleOption(q('scalp'), scalp, 'scalpFine')).toEqual(['scalpFine']);
    expect(toggleOption(q('scalp'), scalp, 'oily')).toEqual(['dandruff']);
  });

  it('keeps single-choice questions to one answer', () => {
    const thickness = toggleOption(q('thickness'), ['fine'], 'thick');
    expect(thickness).toEqual(['thick']);
    expect(toggleOption(q('thickness'), thickness, 'thick')).toEqual([]);
  });

  it('turns answers into hair types, needs and routine steps', () => {
    const answers = { pattern: ['wavy', 'curly'], thickness: ['fine'], colour: ['bleached', 'yellowTones'], scalp: ['hairLoss'], styling: ['curls'] };
    expect(answerTypeIds(answers)).toEqual([2, 3, 5]);
    expect(answerNeedIds(answers)).toEqual([NEED.bondRepair, NEED.colorProtection, NEED.brassyYellow, NEED.hairLoss, NEED.curlDefinition]);
    expect(suggestedSteps(answers)).toEqual(['shampoo', 'condition', 'leave_in', 'scalp', 'style']);
    expect(suggestedSteps({ pattern: ['straight'] })).toEqual(['shampoo', 'condition', 'leave_in']);
  });
});
