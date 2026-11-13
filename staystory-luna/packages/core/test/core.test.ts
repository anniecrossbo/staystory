import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_DAYS, applyLink, availableBalance, bookingSplit, cancelBooking, confirmStay, createAttribution,
  creatorCommission, creditFor, creditLine, formatINR, gapNightSaving, holdExpiresAt, hotelCommission, isActive,
  pendingBalance, percentOff, quoteTrip, refundAmount, settle, trip, validateGapRate, withdrawAll, withdrawal,
} from '../src';

describe('formatINR', () => {
  it('uses en-IN grouping', () => {
    expect(formatINR(104000)).toBe('₹1,04,000');
    expect(formatINR(14000)).toBe('₹14,000');
    expect(formatINR(950)).toBe('₹950');
    expect(formatINR(-600)).toBe('−₹600');
  });
});

describe('trip pricing (specs/shared.md)', () => {
  it('Udaipur trip: ₹8,400 stay + ₹6,200 experiences − ₹600 = ₹14,000 for 2', () => {
    const q = quoteTrip({ stays: trip.stays, experiences: trip.experiences, creatorSaving: trip.creatorSaving });
    expect(q).toEqual({ roomValue: 8400, experiencesValue: 6200, creatorSaving: 600, total: 14000 });
  });
  it('campaign: ₹9,600 rack, ₹8,400 creator price = ₹4,200 a night, 13% off', () => {
    expect(8400 / 2).toBe(4200);
    expect(percentOff(9600, 8400)).toBe(13);
  });
});

describe('Gap Night booking SS-UDR-48213', () => {
  const room = 3400 * 2;
  const quote = quoteTrip({ stays: [{ nightlyRate: 3400, nights: 2 }], experiences: trip.experiences });
  it('room ₹6,800 + experiences ₹6,200 = ₹13,000', () => {
    expect(quote.roomValue).toBe(room);
    expect(quote.total).toBe(13000);
  });
  it('saving is ₹1,600 against the campaign rate', () => {
    expect(gapNightSaving(4200, 3400, 2)).toBe(1600);
  });
  it('hotel commission ₹1,020 (15% of ₹6,800); creator ₹1,040 (8% of ₹13,000)', () => {
    expect(hotelCommission(room, 15)).toBe(1020);
    expect(creatorCommission(13000)).toBe(1040);
    expect(bookingSplit(13000, room, 15)).toEqual({ hotelCommission: 1020, creator: 1040, hotelNet: 5780 });
  });
  it('refund on cancel is ₹13,000, not ₹14,000', () => {
    expect(refundAmount(quote.total)).toBe(13000);
  });
  it('commission is waived on cancellations', () => {
    expect(hotelCommission(room, 15, true)).toBe(0);
    expect(creatorCommission(13000, 8, true)).toBe(0);
  });
});

describe('Gap Night rate rules', () => {
  it('must be at or above floor and not above rack', () => {
    expect(validateGapRate(3400, 3000, 4800)).toBeNull();
    expect(validateGapRate(3000, 3000, 4800)).toBeNull();
    expect(validateGapRate(2900, 3000, 4800)).not.toBeNull();
    expect(validateGapRate(5000, 3000, 4800)).not.toBeNull();
  });
});

describe('checkout hold', () => {
  it('holds for 30 minutes', () => {
    const t = new Date('2026-11-13T10:00:00Z');
    expect(holdExpiresAt(t).toISOString()).toBe('2026-11-13T10:30:00.000Z');
  });
});

describe('attribution (60-day credit)', () => {
  const opened = new Date('2026-11-13T06:00:00Z');
  const a = createAttribution({ travelerId: 'meera', creatorId: 'anaya', tripId: 'anaya-udaipur', openedAt: opened });
  it('expires 60 days after opening', () => {
    expect(ATTRIBUTION_DAYS).toBe(60);
    expect(a.expiresAt).toBe('2027-01-12T06:00:00.000Z');
    expect(isActive(a, new Date('2027-01-11T00:00:00Z'))).toBe(true);
    expect(isActive(a, new Date('2027-01-12T06:00:00Z'))).toBe(false);
  });
  it('a newer link from a different creator replaces it', () => {
    const b = createAttribution({ travelerId: 'meera', creatorId: 'ravi', tripId: 'x', openedAt: new Date('2026-11-20T06:00:00Z') });
    expect(applyLink(a, b, new Date('2026-11-20T06:00:00Z')).creatorId).toBe('ravi');
  });
  it('the same creator reopening does not extend the window', () => {
    const again = createAttribution({ travelerId: 'meera', creatorId: 'anaya', tripId: 'anaya-udaipur', openedAt: new Date('2026-12-20T06:00:00Z') });
    expect(applyLink(a, again, new Date('2026-12-20T06:00:00Z'))).toBe(a);
  });
  it('an expired credit is replaced, and gives no credit', () => {
    const late = new Date('2027-02-01T00:00:00Z');
    expect(creditFor(a, late)).toBeUndefined();
    expect(creditFor(a, new Date('2026-12-01T00:00:00Z'))).toBe('anaya');
  });
  it('credit line matches the design copy', () => {
    expect(creditLine('anaya.explores', opened)).toBe('Credit: @anaya.explores · link opened Nov 13 · valid 60 days');
  });
});

describe('creator ledger and payouts', () => {
  const ledger = [
    { bookingId: 'SS-UDR-48213', amount: 1040, status: 'pending_stay' as const },
    { bookingId: 'SS-OLD-1', amount: 2000, status: 'available' as const },
  ];
  it('pending becomes available only when the hotel confirms the stay', () => {
    expect(availableBalance(ledger)).toBe(2000);
    expect(pendingBalance(ledger)).toBe(1040);
    const after = confirmStay(ledger, 'SS-UDR-48213');
    expect(availableBalance(after)).toBe(3040);
    expect(pendingBalance(after)).toBe(0);
  });
  it('cancelling cancels the pending entry and leaves paid ones alone', () => {
    expect(cancelBooking(ledger, 'SS-UDR-48213')[0]?.status).toBe('cancelled');
    expect(cancelBooking([{ bookingId: 'a', amount: 1, status: 'paid' }], 'a')[0]?.status).toBe('paid');
  });
  it('withdrawals deduct 10% TDS and mark entries paid', () => {
    expect(withdrawal(3040)).toEqual({ gross: 3040, tds: 304, net: 2736 });
    const w = withdrawAll(confirmStay(ledger, 'SS-UDR-48213'));
    expect(w.summary.net).toBe(2736);
    expect(w.entries.every((e) => e.status === 'paid')).toBe(true);
  });
});

describe('hotel settlement', () => {
  it('sums completed stays and skips cancellations', () => {
    const s = settle('Week of Dec 22', [
      { roomValue: 6800, commission: 1020 },
      { roomValue: 8400, commission: 1260 },
      { roomValue: 9600, commission: 0, cancelled: true },
    ]);
    expect(s).toEqual({ period: 'Week of Dec 22', stays: 2, gross: 15200, commission: 2280, net: 12920 });
  });
});

import { splitCommission } from '../src';
describe('commission split on a ₹20,000 booking (onboarding example)', () => {
  it('15%: ₹3,000 commission, creator ₹1,600, StayStory ₹1,400, hotel receives ₹17,000', () => {
    expect(splitCommission(20000, 15)).toEqual({ commission: 3000, creator: 1600, staystory: 1400, hotelReceives: 17000 });
  });
  it('at 8% the creator takes the whole commission', () => {
    expect(splitCommission(20000, 8)).toMatchObject({ commission: 1600, creator: 1600, staystory: 0 });
  });
});

import { validateCampaign, validateGap } from '../src';
describe('campaign and Gap Night validation (rules from the prototype)', () => {
  const ok = { name: 'Winter on Lake Pichola', creatorPrice: 8400, rackPrice: 9600, commissionPct: 15, invitedCount: 1 };
  it('accepts the sample campaign', () => expect(validateCampaign(ok)).toBeNull());
  it('rejects each broken field with a reason', () => {
    expect(validateCampaign({ ...ok, name: ' ' })).toMatch(/name/);
    expect(validateCampaign({ ...ok, creatorPrice: 0 })).toMatch(/creator price/);
    expect(validateCampaign({ ...ok, creatorPrice: 9600 })).toMatch(/below your public rate/);
    expect(validateCampaign({ ...ok, commissionPct: 4 })).toMatch(/between 5% and 30%/);
    expect(validateCampaign({ ...ok, commissionPct: 31 })).toMatch(/between 5% and 30%/);
    expect(validateCampaign({ ...ok, invitedCount: 0 })).toMatch(/at least one creator/);
  });
  const gap = { rooms: 4, unsold: 4, rate: 3400, floor: 3000, publicRate: 4800 };
  it('accepts the sample Gap Night', () => expect(validateGap(gap)).toBeNull());
  it('rejects rooms, floor and public rate violations', () => {
    expect(validateGap({ ...gap, rooms: 0 })).toMatch(/at least one room/);
    expect(validateGap({ ...gap, rooms: 5 })).toMatch(/Only 4 rooms are unsold/);
    expect(validateGap({ ...gap, rate: 2900 })).toMatch(/below your floor/);
    expect(validateGap({ ...gap, rate: 4800 })).toMatch(/below your public rate/);
  });
});
