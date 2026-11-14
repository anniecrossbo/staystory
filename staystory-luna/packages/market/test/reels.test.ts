import { describe, expect, it } from 'vitest';
import { MarketStore, SEED_REELS, compactCount, reelCaption, reelInsights, reelRows, type MBooking } from '../src';

const store = () => new MarketStore(false);
const now = '2026-11-13T10:00:00.000Z';
const booking = (over: Partial<MBooking> = {}): MBooking => ({
  id: 'SS-UDR-70001', travelerId: 'meera', guestName: 'Isha R.', guestInitials: 'IR', tripId: 'anaya-udaipur', creatorId: 'anaya', hotelId: 'haveli-jheel',
  roomTypeId: 'lake-deluxe', roomName: 'Lake-view Deluxe', stayId: 'jheel', datesLabel: 'Jan 9 – 11', nights: 2, guests: 2,
  roomValue: 8400, experiencesValue: 6200, creatorSaving: 600, total: 14000, experienceIds: ['boat', 'walk'], source: 'link', status: 'upcoming', createdAt: now, ...over,
});
let n = 0;
const comment = (s: MarketStore, text: string, travelerId = 'meera', tripId = 'anaya-udaipur') => s.dispatch({ type: 'reel/comment', id: `rc${n++}`, tripId, travelerId, name: 'Meera K.', text, at: now });
const ud = (s: MarketStore) => reelInsights(s.get(), 'udaipur')!;
const row = (s: MarketStore, id: string) => ud(s) && reelRows(s.get(), 'anaya').find((r) => r.id === id)!;

describe('reel catalog', () => {
  it('has the six reels from the creator grid in order of reach', () => {
    expect(SEED_REELS.map((r) => r.id)).toEqual(['udaipur', 'coorg', 'jodhpur', 'pushkar', 'hampi', 'gokarna']);
    expect(SEED_REELS.map((r) => compactCount(r.views))).toEqual(['1.2M', '640K', '310K', '220K', '180K', '96K']);
    expect(SEED_REELS.filter((r) => !r.tripId).map((r) => r.id)).toEqual(['pushkar', 'hampi', 'gokarna']);
  });
  it('returns nothing for an unknown reel', () => expect(reelInsights(store().get(), 'nope')).toBeUndefined());
});

describe('reel insights', () => {
  it('starts from the Udaipur baselines', () => {
    const i = ud(store());
    expect([i.views, i.likes, i.comments, i.shares, i.saves]).toEqual([1_200_000, 84_200, 12_400, 9_100, 21_000]);
    expect([i.keywordComments, i.dms, i.visits, i.booked, i.commission]).toEqual([3420, 3310, 7820, 28, 39_450]);
    expect(i.trip?.id).toBe('anaya-udaipur');
    expect(i.funnel.map((f) => f.label)).toEqual(['Views', 'Commented your keyword', 'Got your DM', 'Opened the trip', 'Saved the trip', 'Booked']);
    expect(i.funnel.map((f) => f.value)).toEqual([1_200_000, 3420, 3310, 7820, 2184, 28]);
    expect(i.funnel[0]!.w).toBe(100);
    expect(i.funnel[3]!.w).toBe(Math.round(100 * Math.sqrt(7820 / 1_200_000)));
    expect(i.openRate).toBe('0.65%');
  });
  it('a keyword comment adds one keyword comment and one DM', () => {
    const s = store(); comment(s, 'link pls');
    const i = ud(s);
    expect([i.keywordComments, i.dms]).toEqual([3421, 3311]);
  });
  it('a comment without the keyword adds neither', () => {
    const s = store(); comment(s, 'so pretty');
    const i = ud(s);
    expect([i.keywordComments, i.dms]).toEqual([3420, 3310]);
  });
  it('a repeat keyword comment adds a keyword comment but no second DM', () => {
    const s = store(); comment(s, 'link pls'); comment(s, 'link please link');
    const i = ud(s);
    expect([i.keywordComments, i.dms]).toEqual([3422, 3311]);
  });
  it('a visit moves the funnel; a booking moves the funnel and commission', () => {
    const s = store();
    s.dispatch({ type: 'trip/visit', tripId: 'anaya-udaipur', sessionId: 'v1', at: now });
    expect(ud(s).visits).toBe(7821);
    s.dispatch({ type: 'booking/create', booking: booking() });
    const i = ud(s);
    expect([i.booked, i.commission]).toEqual([29, 39_450 + 1_120]);
    expect(i.funnel[5]!.value).toBe(29);
  });
  it('a self-booking and a cancelled booking add nothing', () => {
    const s = store();
    s.dispatch({ type: 'booking/create', booking: booking({ id: 'SS-UDR-70002', selfBooking: true }) });
    s.dispatch({ type: 'booking/create', booking: booking({ id: 'SS-UDR-70003', status: 'cancelled' }) });
    const i = ud(s);
    expect([i.booked, i.commission]).toEqual([28, 39_450]);
  });
  it('a paused trip keeps its numbers and does not send new DMs', () => {
    const s = store(); comment(s, 'link pls');
    s.dispatch({ type: 'trip/status', tripId: 'anaya-udaipur', status: 'paused' });
    expect([ud(s).keywordComments, ud(s).dms, ud(s).commission]).toEqual([3421, 3311, 39_450]);
    comment(s, 'link pls', 'riya');
    expect([ud(s).keywordComments, ud(s).dms]).toEqual([3422, 3311]);
  });
  it('turning the auto-DM off keeps the comments already answered', () => {
    const s = store(); comment(s, 'link pls');
    const t = s.get().trips.find((x) => x.id === 'anaya-udaipur')!;
    s.dispatch({ type: 'trip/publish', trip: { ...t, dmKeyword: '' } });
    expect([ud(s).keywordComments, ud(s).dms]).toEqual([3421, 3311]);
  });
  it('ignores comments on other trips', () => {
    const s = store(); comment(s, 'link pls', 'meera', 'anaya-coorg');
    expect(ud(s).dms).toBe(3310);
    expect(reelInsights(s.get(), 'coorg')!.dms).toBe(1737);
  });
  it('a reel with no trip has an empty funnel', () => {
    const i = reelInsights(store().get(), 'pushkar')!;
    expect(i.trip).toBeUndefined();
    expect(i.funnel.map((f) => f.value)).toEqual([220_000, 0, 0, 0, 0, 0]);
    expect(i.funnel.slice(1).every((f) => f.w === 0)).toBe(true);
    expect(i.commission).toBe(0);
  });
});

describe('reel rows', () => {
  it('sorts by commission then views and flags the top earner and reels with no trip', () => {
    const rows = reelRows(store().get(), 'anaya');
    expect(rows.map((r) => r.id)).toEqual(['udaipur', 'coorg', 'jodhpur', 'pushkar', 'hampi', 'gokarna']);
    expect(rows.map((r) => r.commission)).toEqual([39_450, 12_500, 5_200, 0, 0, 0]);
    expect(rows.filter((r) => r.topEarner).map((r) => r.id)).toEqual(['udaipur']);
    expect(rows.filter((r) => r.noTrip).map((r) => r.id)).toEqual(['pushkar', 'hampi', 'gokarna']);
  });
  it('re-ranks when another reel earns more', () => {
    const s = store();
    for (let k = 0; k < 40; k++) s.dispatch({ type: 'booking/create', booking: booking({ id: `SS-COO-${k}`, tripId: 'anaya-coorg', stayId: 'coorg-misty', hotelId: 'misty-estate', total: 14000 }) });
    const rows = reelRows(s.get(), 'anaya');
    expect(rows[0]!.id).toBe('coorg');
    expect(rows[0]!.topEarner).toBe(true);
    expect(rows.filter((r) => r.topEarner)).toHaveLength(1);
  });
  it('words the caption with singular and plural', () => {
    const s = store();
    expect(reelCaption(row(s, 'udaipur'))).toBe('1.2M views · 3,310 DMs · 28 bookings');
    expect(reelCaption(row(s, 'pushkar'))).toBe('220K views');
    expect(reelCaption({ ...row(s, 'udaipur'), dms: 1, bookings: 1 })).toBe('1.2M views · 1 DM · 1 booking');
  });
});
