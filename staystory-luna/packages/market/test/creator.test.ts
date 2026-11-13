import { describe, expect, it } from 'vitest';
import { MarketStore, acceptedOffers, availableShare, creatorBalances, creatorInsights, creatorNotifications, creatorOfferViews, daysTitle, initialsOf, latestPendingBooking, ledgerRows, makeCreatorTrip, slugify, builderFromPrice, tripStats, type MBooking } from '../src';

const store = () => new MarketStore(false);
const now = '2026-11-13T10:00:00.000Z';
const booking = (over: Partial<MBooking> = {}): MBooking => ({
  id: 'SS-UDR-60001', travelerId: 'meera', guestName: 'Isha R.', guestInitials: 'IR', tripId: 'anaya-udaipur', creatorId: 'anaya', hotelId: 'haveli-jheel',
  roomTypeId: 'lake-deluxe', roomName: 'Lake-view Deluxe', stayId: 'jheel', datesLabel: 'Jan 9 – 11', nights: 2, guests: 2,
  roomValue: 8400, experiencesValue: 6200, creatorSaving: 600, total: 14000, experienceIds: ['boat', 'walk'], source: 'link', status: 'upcoming', createdAt: now, ...over,
});

describe('creator offers', () => {
  it('builds a generic view for every invited campaign, including Misty Estate', () => {
    const v = creatorOfferViews(store().get(), 'anaya');
    expect(v.map((o) => o.campaign.id)).toEqual(['winter-pichola', 'misty-coorg']);
    expect(v[0]!.followerPrice).toBe(8400);
    expect(v[0]!.estimate20).toBe(32000);
    expect(v[1]!.commissionPct).toBe(12);
    expect(v[1]!.listTitle).toBe('Misty Estate Coorg');
  });
  it('groups statuses into tabs', () => {
    const s = store();
    s.dispatch({ type: 'offer/respond', campaignId: 'misty-coorg', creatorId: 'anaya', response: 'declined' });
    s.dispatch({ type: 'offer/respond', campaignId: 'winter-pichola', creatorId: 'anaya', response: 'countered', counter: { pct: 17, message: 'x', extras: [] } });
    expect(creatorOfferViews(s.get(), 'anaya').map((o) => o.tab)).toEqual(['active', 'past']);
  });
  it('only accepted campaigns carry an agreed commission into the builder', () => {
    const s = store();
    expect(Object.keys(acceptedOffers(s.get(), 'anaya'))).toHaveLength(0);
    s.dispatch({ type: 'offer/respond', campaignId: 'winter-pichola', creatorId: 'anaya', response: 'accepted' });
    expect(acceptedOffers(s.get(), 'anaya')['haveli-jheel']!.pct).toBe(15);
  });
});

describe('earnings', () => {
  it('summarises the seeded ledger and withdraws net of TDS', () => {
    const s = store();
    expect(creatorBalances(s.get(), 'anaya').available).toBe(21760);
    expect(availableShare(creatorBalances(s.get(), 'anaya'))).toBe(64);
    s.dispatch({ type: 'creator/withdraw', creatorId: 'anaya', upi: 'anaya@okaxis', id: 'w1', now });
    expect(s.get().withdrawals[0]!.net).toBe(19584);
    expect(ledgerRows(s.get(), 'anaya', 'Paid')[0]!.status).toBe('Processing');
    expect(ledgerRows(s.get(), 'anaya', 'Available')).toHaveLength(0);
  });
  it('labels rows and signs available amounts', () => {
    const r = ledgerRows(store().get(), 'anaya');
    expect(r[0]).toMatchObject({ ini: 'MI', status: 'Pending stay', amt: '₹1,040' });
    expect(r.find((x) => x.id === 'l2')).toMatchObject({ amt: '+₹1,168', status: 'Available' });
    expect(initialsOf('Udaipur · Rohan S.')).toBe('RS');
  });
  it('shows the banner only while a booking waits for check-out', () => {
    const s = store();
    expect(latestPendingBooking(s.get(), 'anaya')).toMatchObject({ guest: 'Meera I.', amount: 1040, dates: 'Dec 19 to 21', hotelName: 'Haveli Jheel' });
    s.dispatch({ type: 'booking/status', id: 'SS-UDR-48213', status: 'completed' });
    expect(latestPendingBooking(s.get(), 'anaya')).toBeUndefined();
    s.dispatch({ type: 'booking/create', booking: booking() });
    expect(latestPendingBooking(s.get(), 'anaya')!.guest).toBe('Isha R.');
  });
});

describe('insights and trip performance', () => {
  it('starts from the design baselines and grows with real bookings', () => {
    const s = store();
    const a = creatorInsights(s.get(), 'anaya', '30');
    expect(a).toMatchObject({ commission: 69920, bookings: 46, visits: 12480, conv: '0.37%' });
    s.dispatch({ type: 'booking/create', booking: booking() });
    const b = creatorInsights(s.get(), 'anaya', '30');
    expect(b.bookings).toBe(47);
    expect(b.commission).toBe(69920 + 1120);
  });
  it('derives the trip funnel and where followers booked', () => {
    const s = store();
    const t = tripStats(s.get(), 'anaya-udaipur')!;
    expect(t.funnel.map((f) => f.value)).toEqual([7820, 1240, 96, 28]);
    expect(t.byStay.map((x) => x.n)).toEqual([17, 8, 3]);
    s.dispatch({ type: 'booking/create', booking: booking() });
    expect(tripStats(s.get(), 'anaya-udaipur')!.byStay[0]!.n).toBe(18);
    expect(tripStats(s.get(), 'nope')).toBeUndefined();
  });
  it('a new trip starts at zero and counts opened links', () => {
    const s = store();
    const trip = makeCreatorTrip(s.get(), { creatorId: 'anaya', slug: 'pushkar', title: 'Pushkar', place: 'Pushkar', img: 'pushkar', days: [{ n: 1, title: 'Day', stops: [] }], stays: s.get().trips[0]!.stays, pickStayId: 'jheel', dmKeyword: '', reelUrl: '', now });
    s.dispatch({ type: 'trip/publish', trip });
    expect(tripStats(s.get(), trip.id)!.visits).toBe(0);
    s.dispatch({ type: 'traveler/openLink', travelerId: 'meera', creatorId: 'anaya', tripId: trip.id, now });
    expect(tripStats(s.get(), trip.id)!.visits).toBe(1);
  });
});

describe('trip builder', () => {
  it('prices "from" as the cheapest stay for 2 nights plus experiences for 2', () => {
    expect(builderFromPrice([{ nightly: 4200 }, { nightly: 2300 }, { nightly: 9800 }], [{ pricePerPerson: 900 }, { pricePerPerson: 700 }, { pricePerPerson: 1500 }])).toBe(10800);
    expect(builderFromPrice([], [])).toBe(0);
  });
  it('cleans the link field and words the title', () => {
    expect(slugify('staystory.in/anaya/Udaipur Trip!')).toBe('udaipurtrip');
    expect(daysTitle(3, 'Udaipur')).toBe('Three days in Udaipur');
  });
  it('publishes with bookable stops as experiences and keeps stats when republishing', () => {
    const s = store();
    s.dispatch({ type: 'offer/respond', campaignId: 'winter-pichola', creatorId: 'anaya', response: 'accepted' });
    const prev = s.get().trips.find((t) => t.id === 'anaya-udaipur')!;
    const trip = makeCreatorTrip(s.get(), {
      creatorId: 'anaya', slug: 'udaipur', title: 'Udaipur, edited', place: 'Udaipur', img: 'udaipur', stays: prev.stays, pickStayId: 'jheel', dmKeyword: 'lake', reelUrl: 'instagram.com/reel/x', now, previous: prev,
      days: [{ n: 1, title: 'A', stops: [{ id: 'checkin', name: 'Check in', kind: 'Stay', bookable: true }, { id: 'boat', name: 'Boat', kind: 'Experience', bookable: true, pricePerPerson: 900, time: '17:30', dur: '1 h' }, { id: 'tip', name: 'Tip', kind: 'Garden', bookable: false }] }],
    });
    expect(trip.experiences).toEqual([{ id: 'boat', name: 'Boat', day: 1, time: '17:30 · 1 h', pricePerPerson: 900, img: 'udaipur' }]);
    expect(trip.creatorSaving).toBe(600);
    expect(trip.saves).toBe(prev.saves);
    s.dispatch({ type: 'trip/publish', trip });
    expect(s.get().trips.filter((t) => t.id === 'anaya-udaipur')).toHaveLength(1);
    expect(s.get().trips.find((t) => t.id === 'anaya-udaipur')!.dmKeyword).toBe('lake');
  });
});

describe('notifications', () => {
  it('lists real store events and follows a counter to its answer', () => {
    const s = store();
    expect(creatorNotifications(s.get(), 'anaya').map((n) => n.id)).toEqual(expect.arrayContaining(['offer:winter-pichola', 'offer:misty-coorg', 'booking:l1']));
    s.dispatch({ type: 'offer/respond', campaignId: 'winter-pichola', creatorId: 'anaya', response: 'countered', counter: { pct: 17, message: 'x', extras: [] } });
    expect(creatorNotifications(s.get(), 'anaya', ['winter-pichola']).some((n) => n.id === 'counter:winter-pichola:waiting')).toBe(true);
    s.dispatch({ type: 'offer/resolveCounter', campaignId: 'winter-pichola', creatorId: 'anaya', accept: true });
    expect(creatorNotifications(s.get(), 'anaya', ['winter-pichola']).find((n) => n.id === 'counter:winter-pichola:accepted')!.body).toContain('17%');
    s.dispatch({ type: 'creator/withdraw', creatorId: 'anaya', upi: 'anaya@okaxis', id: 'w1', now });
    expect(creatorNotifications(s.get(), 'anaya').some((n) => n.id.startsWith('withdraw:'))).toBe(true);
  });
});
