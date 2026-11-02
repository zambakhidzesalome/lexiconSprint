import { describe, it, expect } from 'vitest';
import {
  createClassCode,
  decodeClassCode,
  validateClassCode,
  createResultCode,
  decodeResultCode,
  importResultCodes,
  resultsAsTable,
  EPOCH,
} from '../src/utils/codes.js';

const now = Date.UTC(2026, 9, 28, 10, 2);
const session = decodeClassCode(createClassCode(3, 2, now));
const record = {
  v: 1,
  n: 'სალომე ზამბახიძე',
  g: 3,
  c: session.code,
  s: 32000,
  k: 48,
  t: 850,
  a: 2,
  f: ['7r'],
  fc: 1,
  ts: now,
};

describe('portable class codes', () => {
  it('matches a fixture calculated with the original index.html helpers', () => {
    expect(createClassCode(3, 2, now)).toBe('4NHS-34CA');
    const raw =
      'VQ1-eyJ2IjoxLCJuIjoiVGVzdCBTdHVkZW50IiwiZyI6MywiYyI6IjROSFMzNENBIiwicyI6MzIwMDAsImsiOjQ4LCJ0Ijo4NTAsImEiOjIsImYiOlsiN3IiXSwiZmMiOjEsInRzIjoxNzkzMTgxNzIwMDAwfQ.JPD6ZM';
    expect(decodeResultCode(raw)).toEqual({ ...record, n: 'Test Student' });
    expect(createResultCode({ ...record, n: 'Test Student' })).toBe(raw);
  });
  it('contains the group, duration and five-minute start bucket', () => {
    expect(session).toEqual({
      code: session.code,
      group: 3,
      start: Date.UTC(2026, 9, 28, 10),
      end: Date.UTC(2026, 9, 28, 11),
    });
    expect(validateClassCode(createClassCode(3, 2, now).toLowerCase(), now)).toEqual(session);
  });
  it('validates all supported group and duration values without storage', () => {
    for (let group = 1; group <= 32; group++) {
      for (const duration of [1, 2, 4, 6, 32]) {
        const decoded = decodeClassCode(createClassCode(group, duration, now));
        expect(decoded.group).toBe(group);
        expect(decoded.end - decoded.start).toBe(duration * 1800000);
      }
    }
  });
  it('rejects malformed codes and dates outside the encoding range', () => {
    for (const code of [
      '',
      'ABCD',
      'OOOO-1111',
      'ABCD-EFGH',
      `${session.code}extra`,
      `!${session.code}`,
    ])
      expect(() => decodeClassCode(code)).toThrow();
    expect(() => createClassCode(0, 1, now)).toThrow();
    expect(() => createClassCode(1, 0, now)).toThrow();
    expect(() => createClassCode(1, 1, EPOCH - 1)).toThrow();
  });
  it('preserves the five-minute early allowance and expiry boundary', () => {
    expect(() => validateClassCode(session.code, session.start - 300001)).toThrow(/not started/);
    expect(validateClassCode(session.code, session.start - 300000)).toEqual(session);
    expect(validateClassCode(session.code, session.end)).toEqual(session);
    expect(() => validateClassCode(session.code, session.end + 1)).toThrow(/expired/);
  });
});

describe('portable result codes', () => {
  it('round trips Unicode names, flags and scores', () => {
    expect(decodeResultCode(createResultCode(record))).toEqual(record);
  });
  it('rejects a modified checksum, incomplete payload and excessive input', () => {
    const raw = createResultCode(record);
    expect(() => decodeResultCode(raw.slice(0, -1) + (raw.endsWith('2') ? '3' : '2'))).toThrow(
      /checksum/,
    );
    expect(() => decodeResultCode('VQ1-broken')).toThrow(/malformed/);
    expect(() => decodeResultCode('VQ1-' + 'x'.repeat(8000))).toThrow(/long/);
  });
  it('rejects wrong schema, scores, counts, names and sessions', () => {
    for (const change of [
      { v: 2 },
      { n: '' },
      { n: 'bad\tname' },
      { s: -1 },
      { s: 42001 },
      { k: 61 },
      { k: 1.5 },
      { t: NaN },
      { g: 7 },
      { a: 4 },
      { f: ['99r'] },
      { f: [] },
      { f: [{}] },
      { fc: -1 },
      { c: 'invalid' },
    ]) {
      expect(() => createResultCode({ ...record, ...change })).toThrow();
    }
  });
  it('extracts messages, reports malformed codes, and prevents repeated imports', () => {
    const raw = createResultCode(record);
    const first = importResultCodes(`Salome: ${raw}.\nThanks!\n${raw}\nVQ1-broken\nUnrelated text`);
    expect(first.added).toBe(1);
    expect(first.duplicates).toBe(1);
    expect(first.errors).toHaveLength(1);
    expect(importResultCodes(raw, first.items).duplicates).toBe(1);
    expect(importResultCodes('Just a chat message').found).toBe(0);
  });
  it('deduplicates equivalent JSON with reordered fields and extra fields', () => {
    const first = createResultCode(record);
    const second = createResultCode({ extra: true, ts: record.ts, ...record });
    expect(importResultCodes(`${first}\n${second}`).added).toBe(1);
  });
  it('protects spreadsheet cells beginning with formula markers', () => {
    const text = resultsAsTable([{ rec: { ...record, n: '=Bad Name' } }]);
    expect(text).toContain("\t'=Bad Name\t");
    expect(text).toContain('Interruptions\tAttempt');
  });
});
