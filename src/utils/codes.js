import { MAX_POINTS, TOTAL_ANSWERS, TOTAL_SCREENS } from '../data/questions.js';

export const TEACHER_PIN = '4127';
export const EPOCH = Date.UTC(2026, 0, 1);
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
// Public compatibility salt, NOT a secret. Checksums only catch accidental edits.
const CHECKSUM_SALT = 'lexicon-sprint-7f3a-gv26';

function hash(text) {
  let first = 0xdeadbeef;
  let second = 0x41c6ce57;
  for (const character of text) {
    const code = character.charCodeAt(0);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first =
    Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second =
    Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
  return 4294967296 * (2097151 & second) + (first >>> 0);
}

function toBase32(number, width) {
  let encoded = '';
  for (let i = 0; i < width; i++) {
    encoded = ALPHABET[number % 32] + encoded;
    number = Math.floor(number / 32);
  }
  return encoded;
}

function fromBase32(text) {
  return [...text].reduce((number, letter) => number * 32 + ALPHABET.indexOf(letter), 0);
}

function checksum(text, width) {
  return toBase32(hash(CHECKSUM_SALT + text) % 32 ** width, width);
}

export function prettyCode(code) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function createClassCode(group, durationUnits, now = Date.now()) {
  if (
    !Number.isInteger(group) ||
    group < 1 ||
    group > 32 ||
    !Number.isInteger(durationUnits) ||
    durationUnits < 1 ||
    durationUnits > 32
  ) {
    throw new Error('Choose a valid group and duration.');
  }
  const start = Math.floor((now - EPOCH) / 300000);
  if (start < 0 || start >= 32 ** 4)
    throw new Error('The device date is outside the supported range.');
  const body = toBase32(start, 4) + ALPHABET[durationUnits - 1] + ALPHABET[group - 1];
  return prettyCode(body + checksum(body, 2));
}

export function decodeClassCode(input) {
  const code = String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
  if (code.length !== 8) throw new Error('Enter the 8-character class code, like ABCD-EFGH.');
  if (
    [...code].some((letter) => !ALPHABET.includes(letter)) ||
    checksum(code.slice(0, 6), 2) !== code.slice(6)
  ) {
    throw new Error('This class code is not valid. Check it with your teacher.');
  }
  const start = EPOCH + fromBase32(code.slice(0, 4)) * 300000;
  const duration = (ALPHABET.indexOf(code[4]) + 1) * 1800000;
  return { code, start, end: start + duration, group: ALPHABET.indexOf(code[5]) + 1 };
}

export function validateClassCode(input, now = Date.now()) {
  const session = decodeClassCode(input);
  // Preserve the reference's five-minute allowance for clocks that differ slightly.
  if (now < session.start - 300000) throw new Error('This session has not started yet.');
  if (now > session.end)
    throw new Error('This class code has expired. Ask your teacher for a new one.');
  return session;
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function createResultCode(record) {
  validateResult(record);
  const payload = encodeBase64(JSON.stringify(record));
  return `VQ1-${payload}.${checksum(payload, 6)}`;
}

function integerInRange(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

export function validateResult(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || record.v !== 1) {
    throw new Error('Unsupported result format.');
  }
  if (
    typeof record.n !== 'string' ||
    record.n.trim().length < 3 ||
    record.n.length > 40 ||
    /[\u0000-\u001f\u007f]/.test(record.n)
  ) {
    throw new Error('The result has an invalid student name.');
  }
  if (typeof record.c !== 'string') throw new Error('The result is missing its class code.');
  const session = decodeClassCode(record.c);
  if (
    session.group !== record.g ||
    !integerInRange(record.s, 0, MAX_POINTS) ||
    !integerInRange(record.k, 0, TOTAL_ANSWERS) ||
    !integerInRange(record.t, 0, 86400) ||
    !integerInRange(record.fc, 0, 10000) ||
    record.a !== record.fc + 1 ||
    !integerInRange(record.ts, EPOCH - 300000, Date.UTC(2100, 0, 1))
  ) {
    throw new Error('The result contains invalid score, session, time, or attempt information.');
  }
  if (
    !Array.isArray(record.f) ||
    record.f.length !== Math.min(record.fc, 12) ||
    record.f.some((flag) => {
      if (typeof flag !== 'number' && typeof flag !== 'string') return true;
      if (!/^\d{1,2}r?$/.test(String(flag))) return true;
      return Number.parseInt(flag, 10) > TOTAL_SCREENS;
    })
  )
    throw new Error('The interruption information is invalid.');
  // Return a fixed shape so extra properties or reordered JSON cannot bypass deduplication.
  return {
    v: 1,
    n: record.n,
    g: record.g,
    c: session.code,
    s: record.s,
    k: record.k,
    t: record.t,
    a: record.a,
    f: record.f.map(String),
    fc: record.fc,
    ts: record.ts,
  };
}

export function decodeResultCode(raw) {
  if (typeof raw !== 'string' || raw.length > 8000) throw new Error('Result code is too long.');
  const match = /^VQ1-([A-Za-z0-9_-]+)\.([A-Z0-9]{6})$/.exec(raw);
  if (!match) throw new Error('Incomplete or malformed result code.');
  if (checksum(match[1], 6) !== match[2])
    throw new Error('The result checksum does not match. Copy the full code again.');
  let record;
  try {
    record = JSON.parse(decodeBase64(match[1]));
  } catch {
    throw new Error('The result cannot be decoded. Copy the full code again.');
  }
  return validateResult(record);
}

export function importResultCodes(text, existing = []) {
  if (text.length > 200000)
    throw new Error('Paste fewer messages at once (under 200,000 characters).');
  const candidates = text.match(/VQ1-[A-Za-z0-9_.-]*/g) || [];
  const items = [...existing];
  const known = new Set(existing.map((item) => JSON.stringify(item.rec)));
  const errors = [];
  let added = 0;
  let duplicates = 0;
  candidates.forEach((candidate, index) => {
    // A period ending a chat sentence is not part of the code.
    const raw = candidate.replace(/\.+$/, '');
    try {
      const rec = decodeResultCode(raw);
      const identity = JSON.stringify(rec);
      if (known.has(identity)) {
        duplicates++;
        return;
      }
      known.add(identity);
      items.push({ raw, rec });
      added++;
    } catch (error) {
      errors.push(`Code ${index + 1}: ${error.message}`);
    }
  });
  return { items, added, duplicates, errors, found: candidates.length };
}

export function rankResults(items) {
  return [...items].sort((a, b) => b.rec.s - a.rec.s || a.rec.t - b.rec.t || a.rec.ts - b.rec.ts);
}

export function resultsAsTable(items) {
  const rows = rankResults(items).map(({ rec }, index) =>
    [
      index + 1,
      /^[=+@-]/.test(rec.n) ? `'${rec.n}` : rec.n,
      rec.s,
      `${rec.k}/${TOTAL_ANSWERS}`,
      rec.t,
      rec.fc,
      rec.a,
      rec.f.join(', '),
      prettyCode(rec.c),
    ].join('\t'),
  );
  return [
    'Rank\tName\tPoints\tCorrect\tSeconds\tInterruptions\tAttempt\tQuestions\tSession',
    ...rows,
  ].join('\n');
}
