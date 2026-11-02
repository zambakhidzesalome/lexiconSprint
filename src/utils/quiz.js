import { MCQ, MATCH, TIME_LIMITS } from '../data/questions.js';

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildQuestions() {
  const choices = MCQ.map((question, index) => ({
    id: `question-${index}`,
    type: question.k === 'g' ? 'gap' : 'meaning',
    prompt: question.q,
    options: shuffle(question.o.map((text, id) => ({ id, text }))),
  }));
  const matches = MATCH.map((set, index) => ({
    id: `match-${index}`,
    type: 'match',
    prompt: set.title,
    terms: shuffle(set.pairs.map(([text], id) => ({ id, text }))),
    definitions: shuffle(set.pairs.map(([, text], id) => ({ id, text }))),
  }));
  return shuffle([...choices, ...matches]);
}

export function timeLimit(question) {
  return TIME_LIMITS[question.type] * 1000;
}

export function award(fractionRemaining) {
  return Math.round(600 + 400 * Math.max(0, Math.min(1, fractionRemaining)));
}

export function scoreQuestion(question, answer, fractionRemaining) {
  if (question.type !== 'match') {
    const correct = answer === 0 && fractionRemaining > 0 ? 1 : 0;
    return { correct, points: correct ? award(fractionRemaining) : 0 };
  }
  // Each matching set is worth one question's points, shared over four pairs.
  const assigned = answer && typeof answer === 'object' ? answer : {};
  const used = new Set();
  let correct = 0;
  for (const definition of question.definitions) {
    const term = assigned[definition.id];
    if (term === definition.id && !used.has(term)) correct++;
    if (term !== undefined) used.add(term);
  }
  return { correct, points: Math.round((award(fractionRemaining) * correct) / 4) };
}

export function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
