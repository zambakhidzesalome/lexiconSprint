import { decodeResultCode, decodeClassCode } from './codes.js';

export const STORAGE_KEYS = {
  student: 'lexsprint.react.student.v1',
  name: 'lexsprint.lastname',
  ledger: 'lexsprint.react.ledger.v1',
  theme: 'lexsprint.theme',
  session: 'lexsprint.react.session.v1',
};

export function readStored(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadLedger() {
  const items = readStored(STORAGE_KEYS.ledger, []);
  if (!Array.isArray(items)) return [];
  // Treat saved browser data as untrusted, just like pasted codes.
  const valid = [];
  const seen = new Set();
  for (const item of items) {
    try {
      const rec = decodeResultCode(item?.raw);
      const identity = JSON.stringify(rec);
      if (!seen.has(identity)) {
        valid.push({ raw: item.raw, rec });
        seen.add(identity);
      }
    } catch {
      /* Ignore corrupt saved entries while preserving the rest of the class. */
    }
  }
  return valid;
}

export function loadStudent() {
  const student = readStored(STORAGE_KEYS.student);
  if (
    !student ||
    typeof student.name !== 'string' ||
    student.name.length < 3 ||
    student.name.length > 40 ||
    !Array.isArray(student.flags) ||
    student.flags.length > 10000 ||
    student.flags.some(
      (flag) =>
        !flag ||
        !Number.isInteger(flag.q) ||
        flag.q < 0 ||
        flag.q > 42 ||
        !['hidden', 'reload'].includes(flag.reason),
    ) ||
    !Number.isInteger(student.attempt) ||
    student.attempt !== student.flags.length + 1 ||
    !['ready', 'countdown', 'playing', 'interrupted', 'done'].includes(student.status)
  )
    return null;
  try {
    const session = decodeClassCode(student.code);
    if (student.status === 'done') {
      const result = decodeResultCode(student.resultCode);
      return { ...student, ...session, result };
    }
    if (
      student.status === 'playing' &&
      (!Number.isInteger(student.questionIndex) ||
        student.questionIndex < 0 ||
        student.questionIndex > 41)
    )
      return null;
    return { ...student, ...session };
  } catch {
    return null;
  }
}
