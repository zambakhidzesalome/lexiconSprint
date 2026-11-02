import { describe, it, expect } from 'vitest';
import { MCQ, MATCH, TOTAL_SCREENS, TOTAL_ANSWERS } from '../src/data/questions.js';
import { shuffle, buildQuestions, award, scoreQuestion, timeLimit } from '../src/utils/quiz.js';
import { interruptAttempt, startAttempt, submitAnswer } from '../src/utils/attempt.js';
import { createClassCode, decodeClassCode, decodeResultCode } from '../src/utils/codes.js';

const now = Date.UTC(2026, 9, 28, 10);
const ready = {
  ...decodeClassCode(createClassCode(1, 2, now)),
  name: 'Test Student',
  status: 'ready',
  flags: [],
  attempt: 1,
};

describe('question bank and original scoring', () => {
  it('preserves all 42 screens and 60 answers', () => {
    expect(MCQ).toHaveLength(36);
    expect(MATCH).toHaveLength(6);
    expect(TOTAL_SCREENS).toBe(42);
    expect(TOTAL_ANSWERS).toBe(60);
    expect(buildQuestions()).toHaveLength(42);
  });
  it('shuffles copies and keeps the answer identity', () => {
    const source = [1, 2, 3, 4];
    expect(shuffle(source, () => 0)).toEqual([2, 3, 4, 1]);
    expect(source).toEqual([1, 2, 3, 4]);
    for (const question of buildQuestions().filter((question) => question.type !== 'match')) {
      const index = Number(question.id.split('-')[1]);
      expect(question.options.find((option) => option.id === 0).text).toBe(MCQ[index].o[0]);
      expect(question.options.map((option) => option.id).sort()).toEqual([0, 1, 2, 3]);
    }
  });
  it('uses the original time limits and 600–1000 point formula', () => {
    expect(['meaning', 'gap', 'match'].map((type) => timeLimit({ type }))).toEqual([
      25000, 30000, 75000,
    ]);
    expect([award(1), award(0.5), award(0), award(-1), award(2)]).toEqual([
      1000, 800, 600, 600, 1000,
    ]);
    expect(scoreQuestion({ type: 'gap' }, 0, 0.5)).toEqual({ correct: 1, points: 800 });
    expect(scoreQuestion({ type: 'meaning' }, 1, 0.5).points).toBe(0);
    expect(scoreQuestion({ type: 'meaning' }, null, 0).points).toBe(0);
    expect(scoreQuestion({ type: 'meaning' }, 0, 0).points).toBe(0);
  });
  it('gives matching partial credit at timeout and requires unique correct pairs', () => {
    const question = buildQuestions().find((question) => question.type === 'match');
    expect(scoreQuestion(question, { 0: 0, 1: 1, 2: 2, 3: 3 }, 1)).toEqual({
      correct: 4,
      points: 1000,
    });
    expect(scoreQuestion(question, { 0: 0, 1: 1 }, 0)).toEqual({ correct: 2, points: 300 });
    expect(scoreQuestion(question, { 0: 1, 1: 0, 2: 3, 3: 2 }, 0.5)).toEqual({
      correct: 0,
      points: 0,
    });
    expect(scoreQuestion(question, null, 0)).toEqual({ correct: 0, points: 0 });
  });
});

describe('attempt lifecycle', () => {
  it('records one interruption even when hidden, pagehide and reload all fire', () => {
    const playing = { ...startAttempt(ready, now), questionIndex: 6 };
    const hidden = interruptAttempt(playing, 'hidden', now + 1);
    expect(hidden.attempt).toBe(2);
    expect(hidden.flags).toEqual([{ q: 7, reason: 'hidden', at: now + 1 }]);
    expect(interruptAttempt(hidden, 'reload', now + 2)).toBe(hidden);
    expect(interruptAttempt(ready, 'hidden')).toBe(ready);
    const restart = startAttempt(hidden, now + 3);
    expect(restart.questionIndex).toBe(0);
    expect(restart.points).toBe(0);
    expect(restart.flags).toEqual(hidden.flags);
    expect(restart.questions).not.toBe(playing.questions);
  });
  it('records countdown interruptions as question zero', () => {
    const interrupted = interruptAttempt({ ...ready, status: 'countdown' }, 'reload', now);
    expect(interrupted.flags[0].q).toBe(0);
    expect(interrupted.attempt).toBe(2);
  });
  it('ignores stale submissions and finishes a full shuffled quiz', () => {
    let student = startAttempt(ready, now);
    const first = student.questions[0];
    const answer = first.type === 'match' ? { 0: 0, 1: 1, 2: 2, 3: 3 } : 0;
    student = submitAnswer(student, 0, answer, now);
    expect(submitAnswer(student, 0, answer, now)).toBe(student);
    for (let index = 1; index < TOTAL_SCREENS; index++) {
      const question = student.questions[index];
      student = submitAnswer(
        student,
        index,
        question.type === 'match' ? { 0: 0, 1: 1, 2: 2, 3: 3 } : 0,
        now,
      );
    }
    expect(student.status).toBe('done');
    expect(student.points).toBe(42000);
    expect(student.correct).toBe(60);
    expect(decodeResultCode(student.resultCode)).toEqual(student.result);
    expect(interruptAttempt(student, 'reload')).toBe(student);
  });
  it('allows an already started attempt to finish after session expiry', () => {
    const playing = startAttempt(ready, ready.end - 1);
    const last = { ...playing, questionIndex: 41 };
    expect(submitAnswer(last, 41, null, ready.end + 90000).status).toBe('done');
  });
});
