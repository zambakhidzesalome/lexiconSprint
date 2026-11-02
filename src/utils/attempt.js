import { buildQuestions, scoreQuestion, timeLimit } from './quiz.js';
import { createResultCode } from './codes.js';

export function interruptAttempt(student, reason, now = Date.now()) {
  if (!student || !['playing', 'countdown'].includes(student.status)) return student;
  return {
    ...student,
    status: 'interrupted',
    attempt: student.attempt + 1,
    flags: [
      ...student.flags,
      { q: student.status === 'playing' ? student.questionIndex + 1 : 0, reason, at: now },
    ],
    questions: [],
  };
}

export function startAttempt(student, now = Date.now()) {
  return {
    ...student,
    status: 'playing',
    questions: buildQuestions(),
    questionIndex: 0,
    points: 0,
    correct: 0,
    startedAt: now,
    questionStartedAt: now,
  };
}

export function submitAnswer(student, index, answer, now = Date.now()) {
  // The question index is a lock: double clicks and old timer callbacks do nothing.
  if (student?.status !== 'playing' || student.questionIndex !== index) return student;
  const question = student.questions[index];
  const fraction = Math.max(0, 1 - (now - student.questionStartedAt) / timeLimit(question));
  const score = scoreQuestion(question, answer, fraction);
  const next = {
    ...student,
    points: student.points + score.points,
    correct: student.correct + score.correct,
  };
  if (index + 1 < student.questions.length) {
    return { ...next, questionIndex: index + 1, questionStartedAt: now };
  }
  const result = {
    v: 1,
    n: student.name,
    g: student.group,
    c: student.code,
    s: next.points,
    k: next.correct,
    t: Math.round((now - student.startedAt) / 1000),
    a: student.attempt,
    f: student.flags.slice(0, 12).map((flag) => `${flag.q}${flag.reason === 'reload' ? 'r' : ''}`),
    fc: student.flags.length,
    ts: now,
  };
  return { ...next, status: 'done', result, resultCode: createResultCode(result), questions: [] };
}
