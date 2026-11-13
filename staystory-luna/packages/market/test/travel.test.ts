import { describe, expect, it } from 'vitest';
import { MarketStore, buildBooking, changeOptions, dateOptions, daysUntil, defaultSelection, freeCancelUntil, gapApplies, gapForTrip, guestShortName, orderedStays, quoteSelection, savedStatus, seedState, shortINR, tripCardPrice, tripDateOptions, tripFromPriceFor, bookingNumber } from '../src';

const now = '2026-11-13T10:00:00.000Z';
const state = () => seedState();
const udaipur = () => state().trips.find((t) => t.id === 'anaya-udaipur')!;

describe('trip pricing for any trip', () => {
  it('Udaipur matches the spec: ₹14,000 normal, ₹13,000 with the Gap Night', () => {
    const s = new MarketStore(false);
    const t = udaipur();
    const sel = defaultSelection(t);
    const normal = quoteSelection(t, sel);
    expect(normal).toMatchObject({ roomValue: 8400, experiencesValue: 6200, creatorSaving: 600, total: 14000, gap: false });
    s.dispatch({ type: 'dev/ensureGap', now });
    s.dispatch({ type: 'traveler/save', id: 'meera', tripId: t.id, on: true });
    const gap = gapForTrip(s.get(), 'meera', t.id)!;
    const g = quoteSelection(t, sel, gap);
    expect(g).toMatchObject({ roomValue: 6800, experiencesValue: 6200, creatorSaving: 0, total: 13000, gap: true, gapSaving: 1600 });
  });
  it('the Gap rate applies only to the covered hotel, room and dates', () => {
    const s = new MarketStore(false);
    const t = udaipur();
    s.dispatch({ type: 'dev/ensureGap', now });
    const gap = s.get().gapNights[0]!;
    const [jheel, pichola] = [t.stays[0]!, t.stays[1]!];
    expect(gapApplies(gap, t, jheel, 'Dec 19 – 21')).toBe(true);
    expect(gapApplies(gap, t, jheel, 'Jan 9 – 11')).toBe(false);
    expect(gapApplies(gap, t, pichola, 'Dec 19 – 21')).toBe(false);
    expect(gapApplies(gap, { ...t, id: 'other' }, jheel, 'Dec 19 – 21')).toBe(false);
    expect(gapApplies({ ...gap, datesLabel: 'Dec 19 to 21' }, t, jheel, 'Dec 19 – 21')).toBe(true);
  });
  it('a gap needs a save, alerts on and rooms left', () => {
    const s = new MarketStore(false);
    s.dispatch({ type: 'dev/ensureGap', now });
    expect(gapForTrip(s.get(), 'meera', 'anaya-udaipur')).toBeUndefined();
    s.dispatch({ type: 'traveler/save', id: 'meera', tripId: 'anaya-udaipur', on: true });
    expect(gapForTrip(s.get(), 'meera', 'anaya-udaipur')).toBeDefined();
    s.dispatch({ type: 'traveler/patch', id: 'meera', patch: { prefs: { ...s.get().travelers.meera!.prefs, gapAlerts: false } } });
    expect(gapForTrip(s.get(), 'meera', 'anaya-udaipur')).toBeUndefined();
  });
  it('seeded non-Udaipur trips quote and book like any other', () => {
    const st = state();
    const prices = Object.fromEntries(st.trips.map((t) => [t.id, tripCardPrice(t)]));
    expect(prices).toMatchObject({ 'anaya-udaipur': 14000, 'riya-jaipur': 9800, 'kabir-goa': 18200, 'hari-rishikesh': 8400, 'anaya-coorg': 12900, 'kabir-gokarna': 9200, 'anaya-jodhpur': 8900 });
    const t = st.trips.find((x) => x.id === 'riya-jaipur')!;
    const b = buildBooking({ state: st, travelerId: 'meera', guestName: 'Meera Iyer', trip: t, sel: defaultSelection(t), now });
    expect(b).toMatchObject({ id: 'SS-JAI-48230', creatorId: 'riya', hotelId: 'riya-jaipur-hotel', nights: 1, total: 9800, roomValue: 3200, source: 'link', guestName: 'Meera I.', guestInitials: 'MI' });
    expect(b.roomValue + b.experiencesValue - b.creatorSaving).toBe(b.total);
  });
  it('the Udaipur booking number uses the sequence and a Gap booking carries the gap', () => {
    const s = new MarketStore(false);
    const t = udaipur();
    s.dispatch({ type: 'dev/ensureGap', now });
    s.dispatch({ type: 'traveler/save', id: 'meera', tripId: t.id, on: true });
    const gap = gapForTrip(s.get(), 'meera', t.id)!;
    const b = buildBooking({ state: s.get(), travelerId: 'meera', guestName: 'Meera Iyer', trip: t, sel: defaultSelection(t, 'Dec 19 – 21'), gap, creatorId: 'anaya', now });
    expect(b).toMatchObject({ id: 'SS-UDR-48230', source: 'gap_night', gapNightId: gap.id, roomName: 'Lake-view Deluxe', total: 13000, creatorSaving: 0 });
    s.dispatch({ type: 'booking/create', booking: b });
    expect(s.get().seq.booking).toBe(48231);
    expect(bookingNumber('Udaipur', s.get().seq.booking)).toBe('SS-UDR-48231');
  });
  it('card, from and short prices', () => {
    expect(tripCardPrice(udaipur())).toBe(14000);
    expect(tripFromPriceFor(udaipur())).toBe(10800);
    expect(shortINR(10800)).toBe('₹10.8k');
    expect(shortINR(9000)).toBe('₹9k');
  });
  it('lists the creator pick first', () => {
    const t = { ...udaipur(), pickStayId: 'aravalli' };
    expect(orderedStays(t).map((x) => x.id)).toEqual(['aravalli', 'jheel', 'pichola']);
  });
});

describe('dates', () => {
  it('weekend options follow the number of nights', () => {
    expect(dateOptions(2)).toEqual(['Dec 19 – 21', 'Jan 9 – 11', 'Jan 23 – 25']);
    expect(dateOptions(3)[0]).toBe('Dec 19 – 22');
    expect(dateOptions(14)[0]).toBe('Dec 19 – Jan 2');
  });
  it('adds a gap on other dates to the options', () => {
    const s = new MarketStore(false);
    s.dispatch({ type: 'dev/ensureGap', now });
    const gap = { ...s.get().gapNights[0]!, datesLabel: 'Dec 26 – 28' };
    expect(tripDateOptions(udaipur(), gap)[0]).toBe('Dec 26 – 28');
    expect(tripDateOptions(udaipur(), s.get().gapNights[0])).toHaveLength(3);
  });
  it('countdown and free cancellation (a week before check-in)', () => {
    const n = new Date(2026, 10, 13, 10);
    expect(daysUntil('Dec 19 – 21', n)).toBe(36);
    expect(freeCancelUntil('Dec 19 – 21', n)).toBe('Dec 12');
    expect(daysUntil('Jan 9 – 11', n)).toBe(57);
  });
  it('change options: Jan 9 is ₹800 less and Jan 23 ₹400 more than Dec 19, and back again', () => {
    const o = changeOptions({ datesLabel: 'Dec 19 – 21', nights: 2, experienceIds: ['boat'] });
    expect(o.map((x) => x.delta)).toEqual([0, -800, 400]);
    expect(o[2]!.sub).toBe('Boat ride sold out');
    const back = changeOptions({ datesLabel: 'Jan 9 – 11', nights: 2, experienceIds: [] });
    expect(back.map((x) => x.delta)).toEqual([800, 0, 1200]);
    expect(back[1]!.current).toBe(true);
  });
  it('shortens guest names', () => {
    expect(guestShortName('Meera Iyer')).toBe('Meera I.');
    expect(guestShortName('Meera')).toBe('Meera');
  });
});

describe('saved status', () => {
  it('shows Saved normally and the Gap saving when a live Gap Night covers the trip', () => {
    const s = new MarketStore(false);
    s.dispatch({ type: 'traveler/save', id: 'meera', tripId: 'anaya-udaipur', on: true });
    const t = s.get().trips.find((x) => x.id === 'anaya-udaipur')!;
    expect(savedStatus(s.get(), 'meera', t)).toMatchObject({ label: 'Saved', tone: 'info', meta: '@anaya.explores · from ₹14,000' });
    s.dispatch({ type: 'dev/ensureGap', now });
    expect(savedStatus(s.get(), 'meera', t)).toMatchObject({ label: '₹1,600 cheaper', tone: 'success', meta: '@anaya.explores · now ₹13,000 on Dec 19 to 21' });
    const g = s.get().gapNights[0]!;
    s.dispatch({ type: 'booking/create', booking: buildBooking({ state: s.get(), travelerId: 'meera', guestName: 'Meera Iyer', trip: t, sel: defaultSelection(t, 'Dec 19 – 21'), gap: g, now }) });
    s.dispatch({ type: 'booking/create', booking: { ...s.get().bookings[0]!, id: 'x1' } });
    s.dispatch({ type: 'booking/create', booking: { ...s.get().bookings[0]!, id: 'x2' } });
    expect(savedStatus(s.get(), 'meera', t)).toMatchObject({ label: '1 room left', tone: 'warning' }); // 3 of 4 rooms booked
    s.dispatch({ type: 'booking/create', booking: { ...s.get().bookings[0]!, id: 'x3' } });
    expect(savedStatus(s.get(), 'meera', t).label).toBe('Saved'); // sold out
  });
});
