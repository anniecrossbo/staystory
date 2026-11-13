import { describe, expect, it } from 'vitest';
import { MarketStore, dmSentTo, tripDmCount, reelComments, tripVisitCount, bookingCommission, creatorBalances, creatorOffers, gapAlertFor, hotelBookings, attributionFor, seedState, type MBooking, type MCampaign, type MTrip } from '../src';

const now = '2026-11-13T10:00:00.000Z';
const store = () => new MarketStore(false);
const booking = (over: Partial<MBooking> = {}): MBooking => ({
  id: 'SS-UDR-48230', travelerId: 'meera', guestName: 'Meera I.', guestInitials: 'MI', tripId: 'anaya-udaipur', creatorId: 'anaya', hotelId: 'haveli-jheel',
  roomTypeId: 'lake-deluxe', roomName: 'Lake-view Deluxe', stayId: 'jheel', datesLabel: 'Jan 9 – 11', nights: 2, guests: 2,
  roomValue: 8400, experiencesValue: 6200, creatorSaving: 600, total: 14000, experienceIds: ['boat'], source: 'link', status: 'upcoming', createdAt: now, ...over,
});

describe('marketplace journey', () => {
  it('hotel campaign reaches the creator, who accepts; the hotel sees it', () => {
    const s = store();
    const c: MCampaign = { ...s.get().campaigns[0]!, id: 'c2', name: 'Spring on the lake', invites: { anaya: 'invited' } };
    s.dispatch({ type: 'campaign/create', campaign: c });
    expect(creatorOffers(s.get(), 'anaya').map((o) => o.campaign.id)).toContain('c2');
    expect(creatorOffers(s.get(), 'couples')).toHaveLength(0);
    s.dispatch({ type: 'offer/respond', campaignId: 'c2', creatorId: 'anaya', response: 'accepted' });
    expect(s.get().campaigns[0]!.invites.anaya).toBe('accepted');
    expect(s.get().campaigns[0]!.agreedPct.anaya).toBe(15);
  });

  it('a counter waits for the hotel; accepting it fixes the agreed commission', () => {
    const s = store();
    s.dispatch({ type: 'offer/respond', campaignId: 'winter-pichola', creatorId: 'anaya', response: 'countered', counter: { pct: 17, message: 'Through January?', extras: [] } });
    expect(s.get().campaigns[0]!.invites.anaya).toBe('countered');
    s.dispatch({ type: 'offer/resolveCounter', campaignId: 'winter-pichola', creatorId: 'anaya', accept: true });
    expect(s.get().campaigns[0]!.invites.anaya).toBe('accepted');
    expect(s.get().campaigns[0]!.agreedPct.anaya).toBe(17);
    s.dispatch({ type: 'booking/create', booking: booking() });
    expect(bookingCommission(s.get(), s.get().bookings[0]!)).toBe(1428); // 17% of ₹8,400
  });

  it('a published trip appears for travelers and a booking reaches hotel and creator ledger', () => {
    const s = store();
    const trip: MTrip = { ...s.get().trips[0]!, id: 'anaya-udaipur-2', slug: 'udaipur-2' };
    s.dispatch({ type: 'trip/publish', trip });
    expect(s.get().trips.some((t) => t.slug === 'udaipur-2')).toBe(true);
    s.dispatch({ type: 'booking/create', booking: booking() });
    expect(hotelBookings(s.get())[0]!.id).toBe('SS-UDR-48230');
    const l = s.get().ledger[0]!;
    expect(l).toMatchObject({ bookingId: 'SS-UDR-48230', amount: 1120, status: 'pending_stay' }); // 8% of ₹14,000
  });

  it('check-in then confirm stay releases commission; withdrawal deducts 10% TDS', () => {
    const s = store();
    s.dispatch({ type: 'booking/create', booking: booking() });
    const before = creatorBalances(s.get(), 'anaya');
    s.dispatch({ type: 'booking/status', id: 'SS-UDR-48230', status: 'in_house' });
    s.dispatch({ type: 'booking/status', id: 'SS-UDR-48230', status: 'completed' });
    const after = creatorBalances(s.get(), 'anaya');
    expect(after.available - before.available).toBe(1120);
    expect(after.pending - before.pending).toBe(-1120);
    s.dispatch({ type: 'creator/withdraw', creatorId: 'anaya', upi: 'anaya@okaxis', id: 'w1', now });
    const w = s.get().withdrawals[0]!;
    expect(w.gross).toBe(after.available);
    expect(w.tds).toBe(Math.round(w.gross * 0.1));
    expect(creatorBalances(s.get(), 'anaya').available).toBe(0);
  });

  it('seed matches the design: ₹21,760 available, ₹12,480 pending, Meera ₹1,040', () => {
    const b = creatorBalances(seedState(), 'anaya');
    expect(b.available).toBe(21760);
    expect(b.pending).toBe(12480);
    expect(seedState().ledger[0]!.amount).toBe(1040);
  });

  it('cancelling waives hotel commission and cancels the creator entry', () => {
    const s = store();
    s.dispatch({ type: 'booking/create', booking: booking() });
    s.dispatch({ type: 'booking/cancel', id: 'SS-UDR-48230' });
    expect(bookingCommission(s.get(), s.get().bookings[0]!)).toBe(0);
    expect(s.get().ledger[0]!).toMatchObject({ status: 'cancelled', amount: 0 });
  });

  it('a Gap Night alerts only travelers who saved a covered trip, and bookings use up rooms', () => {
    const s = store();
    s.dispatch({ type: 'dev/ensureGap', now });
    expect(gapAlertFor(s.get(), 'meera')).toBeUndefined(); // has not saved the trip
    s.dispatch({ type: 'traveler/save', id: 'meera', tripId: 'anaya-udaipur', on: true });
    const g = gapAlertFor(s.get(), 'meera')!;
    expect(g.rate).toBe(3400);
    s.dispatch({ type: 'booking/create', booking: booking({ source: 'gap_night', gapNightId: g.id, roomValue: 6800, total: 13000, creatorSaving: 0 }) });
    expect(s.get().gapNights[0]!.booked).toBe(1);
    expect(s.get().ledger[0]!.amount).toBe(1040);
  });

  it('attribution: a newer link from another creator replaces the credit; the same creator does not extend it', () => {
    const s = store();
    const open = (creatorId: string, at: string) => s.dispatch({ type: 'traveler/openLink', travelerId: 'meera', creatorId, tripId: 't', now: at });
    open('anaya', now); open('anaya', '2026-12-01T00:00:00.000Z');
    expect(attributionFor(s.get(), 'meera', new Date(now))!.openedAt).toBe(now);
    open('riya', '2026-12-02T00:00:00.000Z');
    expect(attributionFor(s.get(), 'meera', new Date('2026-12-03T00:00:00.000Z'))!.creatorId).toBe('riya');
    expect(attributionFor(s.get(), 'meera', new Date('2027-03-01T00:00:00.000Z'))).toBeUndefined();
  });

  it('a declined creator can be invited again', () => {
    const s = store();
    s.dispatch({ type: 'offer/respond', campaignId: 'winter-pichola', creatorId: 'anaya', response: 'declined' });
    s.dispatch({ type: 'campaign/invite', campaignId: 'winter-pichola', creatorId: 'anaya' });
    expect(s.get().campaigns[0]!.invites.anaya).toBe('invited');
  });

  it('counts a visit once per session per trip, and not for the creator themself', () => {
    const s = store();
    const visit = (sessionId: string, byCreatorId?: string) => s.dispatch({ type: 'trip/visit', tripId: 'anaya-udaipur', sessionId, at: now, byCreatorId });
    visit('s1'); visit('s1'); visit('s2'); visit('s3', 'anaya');
    expect(tripVisitCount(s.get(), 'anaya-udaipur')).toBe(2);
    s.dispatch({ type: 'trip/status', tripId: 'anaya-udaipur', status: 'paused' });
    visit('s4');
    expect(tripVisitCount(s.get(), 'anaya-udaipur')).toBe(2);
  });

  it('a creator booking through their own link earns nothing', () => {
    const s = store();
    const before = s.get().ledger.length;
    s.dispatch({ type: 'booking/create', booking: booking({ id: 'SS-UDR-48231', travelerId: 'anaya', creatorId: 'anaya' }) });
    expect(s.get().bookings[0]!.selfBooking).toBe(true);
    expect(s.get().ledger).toHaveLength(before);
  });

  it('a comment with the trip keyword sends one DM; other comments and repeats do not', () => {
    const s = store();
    const say = (id: string, text: string) => s.dispatch({ type: 'reel/comment', id, tripId: 'anaya-udaipur', travelerId: 'meera', name: 'meera.iyer', text, at: now });
    say('c1', 'how much for 3 days with flights?');
    expect(dmSentTo(s.get(), 'anaya-udaipur', 'meera')).toBe(false);
    say('c2', 'link pls');
    expect(dmSentTo(s.get(), 'anaya-udaipur', 'meera')).toBe(true);
    say('c3', 'link pls again');
    expect(reelComments(s.get(), 'anaya-udaipur').filter((c) => c.dmSent)).toHaveLength(1);
    expect(reelComments(s.get(), 'anaya-udaipur')).toHaveLength(3);
    expect(tripDmCount(s.get(), 'anaya-udaipur')).toBe(1);
    expect(tripDmCount(s.get(), 'anaya-coorg')).toBe(0);
    s.dispatch({ type: 'reel/comment', id: 'c4', tripId: 'anaya-udaipur', travelerId: 'other', name: 'x', text: 'link', at: now });
    expect(tripDmCount(s.get(), 'anaya-udaipur')).toBe(2);
  });

  it('no DM for a paused trip', () => {
    const s = store();
    s.dispatch({ type: 'trip/status', tripId: 'anaya-udaipur', status: 'paused' });
    s.dispatch({ type: 'reel/comment', id: 'c1', tripId: 'anaya-udaipur', travelerId: 'meera', name: 'meera.iyer', text: 'link pls', at: now });
    expect(dmSentTo(s.get(), 'anaya-udaipur', 'meera')).toBe(false);
  });
});
