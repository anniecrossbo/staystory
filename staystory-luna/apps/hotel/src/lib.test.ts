import { describe, expect, it } from 'vitest';
import { seedState, reduce } from '@staystory/market';
import {
  campaignProgress, decisions, isGstin, isIfsc, isPan, longDates, matchCount, overviewFigures, DEFAULT_AUDIENCE, payoutErrors,
  scaleVol, unsoldRooms, creatorRows, statementsFor, invoiceHtml,
} from './lib';

describe('Gap Night audience', () => {
  it('defaults give the 312 travelers in the design', () => expect(matchCount(DEFAULT_AUDIENCE)).toBe(312));
  it('narrows with each filter and is 0 with none', () => {
    expect(matchCount({ ...DEFAULT_AUDIENCE, near: true })).toBeLessThan(312);
    expect(matchCount({ saved: false, free: false, budget: false, near: false })).toBe(0);
  });
});

describe('validators', () => {
  it('IFSC needs 11 characters with a zero in the fifth', () => {
    expect(isIfsc('HDFC00012')).toBe(false);
    expect(isIfsc('HDFC0001234')).toBe(true);
  });
  it('GSTIN and PAN formats', () => {
    expect(isGstin('08ABCDE1234F1Z5')).toBe(true);
    expect(isGstin('08ABCDE1234F1')).toBe(false);
    expect(isPan('ABCDE1234F')).toBe(true);
    expect(isPan('ABCDE12345')).toBe(false);
  });
  it('payout errors: IFSC shows live, empty fields only when strict, GSTIN must contain the PAN', () => {
    const f = { legalName: 'X', gstin: '08ABCDE1234F1Z5', pan: 'ABCDE1234F', billingEmail: 'a@b.in', accountNumber: '', ifsc: 'HDFC00012' };
    expect(payoutErrors(f, false)).toEqual({ ifsc: 'Enter the full 11-character IFSC' });
    expect(Object.keys(payoutErrors(f, true)).sort()).toEqual(['accountNumber', 'ifsc']);
    expect(payoutErrors({ ...f, accountNumber: '123456789012', ifsc: 'HDFC0001234' }, true)).toEqual({});
    expect(payoutErrors({ ...f, pan: 'ZZZZZ9999Z', accountNumber: '123456789012', ifsc: 'HDFC0001234' }, true).gstin).toBe('GSTIN does not match the PAN');
  });
});

describe('dates', () => {
  it('expands a stay label', () => {
    expect(longDates('Dec 19 – 21')).toBe('Sat 19 to Mon 21 Dec');
    expect(longDates('Nov 30 – Dec 2')).toBe('Mon 30 Nov to Wed 2 Dec');
    expect(longDates('Tonight')).toBe('Tonight');
  });
});

describe('overview figures from the store', () => {
  it('seed shows the design numbers', () => {
    const s = seedState();
    const f = overviewFigures(s);
    expect(f.bookings).toBe(184);
    expect(f.cancelPct.toFixed(1)).toBe('4.3');
    expect(creatorRows(s).find((r) => r.id === 'anaya')!.bookings).toBe(51);
  });
  it('a new booking moves the counts and the campaign progress', () => {
    let s = seedState();
    const base = s.bookings[0]!;
    s = reduce(s, { type: 'booking/create', booking: { ...base, id: 'SS-UDR-99999', status: 'upcoming', createdAt: '2026-11-13T00:00:00.000Z' } });
    expect(overviewFigures(s).bookings).toBe(185);
    expect(creatorRows(s).find((r) => r.id === 'anaya')!.bookings).toBe(52);
    expect(campaignProgress(s, s.campaigns.find((c) => c.id === 'winter-pichola')!).done).toBe(39);
  });
  it('week figures scale down deterministically', () => expect(scaleVol(184, '7')).toBe(44));
  it('quarter statements add earlier weeks', () => expect(statementsFor(seedState(), '90').length).toBe(12));
});

describe('decisions', () => {
  it('unsold alert until a Gap Night is live', () => {
    let s = seedState();
    expect(decisions(s, []).map((d) => d.kind)).toEqual(['unsold']);
    expect(unsoldRooms(s, 'lake-deluxe')).toBe(4);
    s = reduce(s, { type: 'dev/ensureGap', now: '2026-11-13T00:00:00.000Z' });
    expect(unsoldRooms(s, 'lake-deluxe')).toBe(0);
    expect(decisions(s, [])).toEqual([]);
  });
  it('creator responses show up, counters first, and dismissed items hide', () => {
    let s = seedState();
    const id = 'winter-pichola';
    s = reduce(s, { type: 'offer/respond', campaignId: id, creatorId: 'anaya', response: 'accepted' });
    s = reduce(s, { type: 'offer/respond', campaignId: id, creatorId: 'riya', response: 'countered', counter: { pct: 18, message: 'Could we agree on this?', extras: [] } });
    const list = decisions(s, []);
    expect(list.map((d) => d.kind)).toEqual(['countered', 'unsold', 'accepted']);
    expect(decisions(s, ['unsold']).map((d) => d.kind)).toEqual(['countered', 'accepted']);
    s = reduce(s, { type: 'offer/resolveCounter', campaignId: id, creatorId: 'riya', accept: false });
    expect(decisions(s, []).map((d) => d.kind)).toContain('declined');
  });
});

describe('GST invoice', () => {
  it('names the period and adds 18% GST on the commission', () => {
    const s = seedState();
    const html = invoiceHtml(s, s.settlements[0]!, 4123);
    expect(html).toContain('Nov 2 – 8');
    expect(html).toContain('₹11,777');
  });
});
