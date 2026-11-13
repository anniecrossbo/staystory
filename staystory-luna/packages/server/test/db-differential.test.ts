import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { reduce, seedState, type Action, type MBooking, type MCampaign, type MGapNight, type MTrip, type MarketState } from '@staystory/market';
import { closeDb, db } from '../src/db';
import { assembleState, dispatchAction } from '../src/queries';
import { seedDatabase } from '../src/seed-db';

/**
 * Differential test: the SQL persistence layer (dispatchAction + assembleState) must behave exactly like the shared
 * reducer, which is the source of truth for business rules. Every action is applied to both and the states compared.
 */

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'staystory-db-')); db(dir); seedDatabase(); });
afterEach(() => { closeDb(); rmSync(dir, { recursive: true, force: true }); });

// Only genuinely irrelevant differences are normalised. `toEqual` already treats an undefined property as absent
// (assembleState omits optional fields that were never set), and the reducer leaves the optional `visits` and
// `reelComments` arrays absent until first use while the database always reports them, so absent means [].
const norm = (s: MarketState): MarketState => ({ ...s, visits: s.visits ?? [], reelComments: s.reelComments ?? [] });
const dbState = () => norm(assembleState() as unknown as MarketState);

const T0 = '2026-11-14T10:00:00.000Z';
const at = (days: number, hours = 0) => new Date(new Date(T0).getTime() + days * 86_400_000 + hours * 3_600_000).toISOString();

const booking = (id: string, o: Partial<MBooking> = {}): MBooking => ({
  id, travelerId: 'meera', guestName: 'Meera I.', guestInitials: 'MI', tripId: 'anaya-udaipur', creatorId: 'anaya', hotelId: 'haveli-jheel',
  roomTypeId: 'lake-deluxe', roomName: 'Lake-view Deluxe', stayId: 'jheel', datesLabel: 'Jan 10 – 12', nights: 2, guests: 2,
  roomValue: 8400, experiencesValue: 5600, creatorSaving: 600, total: 14000, experienceIds: ['boat'], source: 'link', status: 'upcoming', createdAt: at(0, 1), ...o,
});
const gap = (id: string, o: Partial<MGapNight> = {}): MGapNight => ({
  id, hotelId: 'haveli-jheel', roomTypeId: 'lake-deluxe', datesLabel: 'Dec 5 – 7', rooms: 3, booked: 0, rate: 3400, campaignRate: 4200, audience: ['saved'], sentTo: 100,
  createdAt: at(0, 2), endsAt: at(2, 2), status: 'live', tripIds: ['anaya-udaipur'], ...o,
});
const campaign: MCampaign = {
  id: 'spring-ghats', hotelId: 'haveli-jheel', name: 'Spring on the ghats', roomTypeId: 'std', windowLabel: 'Mar 1 to Apr 30', nights: 2, perks: ['Breakfast'], rackPrice: 9000, creatorPrice: 7800,
  commissionPct: 14, bookingTarget: 20, invites: { riya: 'invited', desi: 'invited' }, agreedPct: {}, counters: {}, status: 'live', createdAt: at(0),
  meta: { hotelName: 'Haveli Jheel', city: 'Udaipur', when: 'Mar to Apr' },
};
const newTrip: MTrip = {
  id: 'riya-pushkar', creatorId: 'riya', slug: 'pushkar', title: 'Pushkar in a weekend', place: 'Pushkar', days: 2, img: 'pushkar', itinerary: [{ n: 1, title: 'Arrive', stops: [{ id: 's1', name: 'Ghats', kind: 'Tip', bookable: false }] }],
  stays: [{ id: 'push-stay', hotelId: 'push-hotel', roomTypeId: 'std', name: 'Pushkar stay', tier: 'mid', desc: 'Camp', nightly: 3000, img: 'pushkar', commissionPct: 12 }], pickStayId: 'push-stay', experiences: [],
  creatorSaving: 400, saves: 0, travelersBooked: 0, tags: ['Heritage'], status: 'live', reelUrl: 'instagram.com/reel/p', dmKeyword: 'camel', publishedAt: at(0, 3),
  shopTitle: 'Camels and ghats', stayLine: 'Pushkar stay · sunset ride', savedStatus: { text: '3 rooms left', tone: 'warning' },
};
const seedTrip = (id: string) => seedState().trips.find((t) => t.id === id)!;

const SCENARIO: Action[] = [
  { type: 'hotel/update', patch: { name: 'Haveli Jheel Palace', commissionPct: 12, floorRate: 3500, syncMode: 'manual' } },
  { type: 'hotel/update', patch: { profile: { region: 'Rajasthan', totalRooms: 20, policies: { payOnComplete: true, exclusiveRates: false, gapNight: true } }, rooms: [{ id: 'std', name: 'Standard', count: 4, sleeps: 2, rackRate: 5000, meal: 'Breakfast' }, { id: 'lake-deluxe', name: 'Lake-view Deluxe', count: 6, sleeps: 3, rackRate: 9600, meal: 'Breakfast' }] } },
  { type: 'campaign/create', campaign },
  { type: 'campaign/invite', campaignId: 'spring-ghats', creatorId: 'anaya' },
  { type: 'campaign/invite', campaignId: 'spring-ghats', creatorId: 'anaya' },
  { type: 'offer/respond', campaignId: 'spring-ghats', creatorId: 'riya', response: 'countered', counter: { pct: 18, message: 'Our audience converts well', extras: ['Free upgrade'] } },
  { type: 'offer/resolveCounter', campaignId: 'spring-ghats', creatorId: 'riya', accept: true },
  { type: 'offer/respond', campaignId: 'spring-ghats', creatorId: 'desi', response: 'countered', counter: { pct: 20, message: 'Budget audience', extras: [] } },
  { type: 'offer/resolveCounter', campaignId: 'spring-ghats', creatorId: 'desi', accept: false },
  { type: 'offer/resolveCounter', campaignId: 'spring-ghats', creatorId: 'desi', accept: true },
  { type: 'offer/respond', campaignId: 'winter-pichola', creatorId: 'anaya', response: 'accepted' },
  { type: 'offer/respond', campaignId: 'misty-coorg', creatorId: 'anaya', response: 'declined' },
  { type: 'campaign/invite', campaignId: 'misty-coorg', creatorId: 'anaya' },
  { type: 'trip/publish', trip: newTrip },
  { type: 'trip/publish', trip: (({ shopTitle, stayLine, savedStatus, ...t }) => ({ ...t, title: 'Pushkar, edited', saves: 5, tags: ['Heritage', 'Culture'], dmKeyword: 'camel' }))(newTrip) },
  { type: 'trip/publish', trip: { ...seedTrip('anaya-coorg'), title: 'Coorg republished', creatorSaving: 123 } },
  { type: 'trip/status', tripId: 'riya-jaipur', status: 'paused' },
  { type: 'trip/status', tripId: 'riya-jaipur', status: 'live' },
  { type: 'traveler/patch', id: 'meera', patch: { signedIn: true, name: 'Meera Iyer-Rao', prefs: { styles: ['Heritage'], budget: 'high', gapAlerts: false, priceAlerts: false } } },
  { type: 'traveler/save', id: 'meera', tripId: 'anaya-udaipur', on: true },
  { type: 'traveler/save', id: 'meera', tripId: 'anaya-udaipur', on: true },
  { type: 'traveler/save', id: 'meera', tripId: 'anaya-coorg', on: true },
  { type: 'traveler/save', id: 'meera', tripId: 'anaya-coorg', on: false },
  { type: 'traveler/follow', id: 'meera', creatorId: 'anaya' },
  { type: 'traveler/follow', id: 'meera', creatorId: 'riya' },
  { type: 'traveler/follow', id: 'meera', creatorId: 'anaya' },
  { type: 'traveler/saveShop', id: 'meera', creatorId: 'anaya' },
  { type: 'traveler/openLink', travelerId: 'meera', creatorId: 'anaya', tripId: 'anaya-udaipur', now: at(0) },
  { type: 'traveler/openLink', travelerId: 'meera', creatorId: 'anaya', tripId: 'anaya-coorg', now: at(10) },
  { type: 'traveler/openLink', travelerId: 'meera', creatorId: 'riya', tripId: 'riya-jaipur', now: at(11) },
  { type: 'traveler/openLink', travelerId: 'meera', creatorId: 'anaya', tripId: 'anaya-udaipur', now: at(80) },
  { type: 'reel/comment', id: 'rc1', tripId: 'anaya-udaipur', travelerId: 'meera', name: 'Meera', text: 'so pretty!', at: at(1) },
  { type: 'reel/comment', id: 'rc2', tripId: 'anaya-udaipur', travelerId: 'meera', name: 'Meera', text: 'Link please', at: at(1, 1) },
  { type: 'reel/comment', id: 'rc3', tripId: 'anaya-udaipur', travelerId: 'meera', name: 'Meera', text: 'link again', at: at(1, 2) },
  { type: 'reel/comment', id: 'rc4', tripId: 'riya-pushkar', travelerId: 'arjun', name: 'Arjun', text: `camel ${'x'.repeat(400)}`, at: at(1, 3) },
  { type: 'trip/status', tripId: 'kabir-goa', status: 'paused' },
  { type: 'reel/comment', id: 'rc5', tripId: 'kabir-goa', travelerId: 'meera', name: 'Meera', text: 'link', at: at(1, 4) },
  { type: 'reel/comment', id: 'rc6', tripId: 'nope', travelerId: 'meera', name: 'Meera', text: 'link', at: at(1, 5) },
  { type: 'trip/visit', tripId: 'anaya-udaipur', sessionId: 's1', at: at(2) },
  { type: 'trip/visit', tripId: 'anaya-udaipur', sessionId: 's1', at: at(2, 1) },
  { type: 'trip/visit', tripId: 'anaya-udaipur', sessionId: 's2', at: at(2, 2), byCreatorId: 'anaya' },
  { type: 'trip/visit', tripId: 'anaya-udaipur', sessionId: 's3', at: at(2, 3), byCreatorId: 'riya' },
  { type: 'trip/visit', tripId: 'kabir-goa', sessionId: 's4', at: at(2, 4) },
  { type: 'trip/visit', tripId: 'nope', sessionId: 's5', at: at(2, 5) },
  { type: 'booking/create', booking: booking('SS-T-1') },
  { type: 'dev/ensureGap', now: at(3) },
  { type: 'dev/ensureGap', now: at(3, 1) },
  { type: 'gap/release', gap: gap('gap-x') },
  { type: 'booking/create', booking: booking('SS-T-2', { source: 'gap_night', gapNightId: 'gap-x', datesLabel: 'Dec 5 – 7', roomValue: 6800, total: 13000, createdAt: at(3, 2) }) },
  { type: 'booking/create', booking: booking('SS-T-3', { travelerId: 'anaya', creatorId: 'anaya', guestName: 'Anaya R.', guestInitials: 'AR', createdAt: at(3, 3) }) },
  { type: 'booking/status', id: 'SS-T-1', status: 'in_house' },
  { type: 'booking/status', id: 'SS-T-1', status: 'in_house' },
  { type: 'booking/status', id: 'SS-T-1', status: 'completed' },
  { type: 'booking/status', id: 'SS-T-1', status: 'completed' },
  { type: 'booking/status', id: 'SS-UDR-48190', status: 'completed' },
  { type: 'booking/status', id: 'SS-UDR-48165', status: 'completed' },
  { type: 'booking/dates', id: 'SS-T-2', datesLabel: 'Dec 6 – 9', delta: 2000 },
  { type: 'booking/dates', id: 'SS-T-1', datesLabel: 'Jan 11 – 13', delta: 500 },
  { type: 'booking/dates', id: 'SS-T-3', datesLabel: 'Jan 1 – 2', delta: 100 },
  { type: 'review/add', review: { bookingId: 'SS-T-1', tripId: 'anaya-udaipur', hotelId: 'haveli-jheel', rating: 5, matchesReel: 'spot', tip: 'Go early', createdAt: at(5) } },
  { type: 'review/add', review: { bookingId: 'SS-UDR-48171', tripId: 'anaya-udaipur', hotelId: 'haveli-jheel', rating: 4, matchesReel: 'mostly', tip: '', createdAt: at(5, 1) } },
  { type: 'review/add', review: { bookingId: 'SS-T-1', tripId: 'anaya-udaipur', hotelId: 'haveli-jheel', rating: 3, matchesReel: 'no', tip: 'Changed my mind', createdAt: at(5, 2) } },
  { type: 'creator/withdraw', creatorId: 'anaya', upi: 'anaya@upi', id: 'w-ignored', now: at(6) },
  { type: 'creator/withdraw', creatorId: 'anaya', upi: 'anaya@upi', id: 'w-ignored-2', now: at(6, 1) },
  { type: 'booking/cancel', id: 'SS-T-2' },
  { type: 'booking/cancel', id: 'SS-T-2' },
  { type: 'booking/cancel', id: 'SS-UDR-48213' },
  { type: 'booking/cancel', id: 'SS-T-1' },
  { type: 'booking/cancel', id: 'missing' },
  { type: 'dev/ensureGap', now: at(7) },
  { type: 'dev/reset' },
  { type: 'booking/create', booking: booking('SS-T-9', { createdAt: at(8) }) },
];

describe('SQL persistence mirrors the reducer', () => {
  it('assembleState() after seeding equals seedState()', () => {
    expect(dbState()).toEqual(norm(seedState()));
  });

  it('seeding is idempotent', () => {
    seedDatabase();
    expect(dbState()).toEqual(norm(seedState()));
  });

  it('covers every action type in the reducer with at least 25 actions', () => {
    expect(SCENARIO.length).toBeGreaterThanOrEqual(25);
    const types = new Set(SCENARIO.map((a) => a.type));
    const all = ['dev/reset', 'hotel/update', 'campaign/create', 'campaign/invite', 'offer/respond', 'offer/resolveCounter', 'trip/publish', 'trip/status', 'traveler/patch', 'traveler/save', 'traveler/follow', 'traveler/saveShop', 'traveler/openLink', 'reel/comment', 'trip/visit', 'booking/create', 'booking/status', 'booking/cancel', 'booking/dates', 'review/add', 'gap/release', 'creator/withdraw', 'dev/ensureGap'];
    for (const t of all) expect(types.has(t as Action['type']), t).toBe(true);
  });

  it('matches the reducer after every step of the scenario', () => {
    let state = seedState();
    SCENARIO.forEach((a, i) => {
      state = reduce(state, a);
      dispatchAction(a as unknown as Record<string, unknown>);
      expect(dbState(), `step ${i + 1}: ${a.type} ${JSON.stringify(a).slice(0, 120)}`).toEqual(norm(state));
    });
  });

  it('survives a close and reopen of the database file', () => {
    let state = seedState();
    for (const a of SCENARIO.slice(0, 60)) { state = reduce(state, a); dispatchAction(a as unknown as Record<string, unknown>); }
    closeDb(); db(dir);
    expect(dbState()).toEqual(norm(state));
  });

  it('pins the headline numbers: 8% creator commission, self-booking earns nothing, republished trips keep their extras', () => {
    const run = (a: Action) => dispatchAction(a as unknown as Record<string, unknown>);
    run({ type: 'booking/create', booking: booking('SS-N-1', { total: 14000 }) });
    run({ type: 'booking/create', booking: booking('SS-N-2', { travelerId: 'anaya' }) });
    const s = dbState();
    expect(s.ledger[0]).toMatchObject({ bookingId: 'SS-N-1', amount: 1120, status: 'pending_stay' });
    expect(s.ledger.some((l) => l.bookingId === 'SS-N-2')).toBe(false);
    expect(s.bookings[0]).toMatchObject({ id: 'SS-N-2', selfBooking: true });
    run({ type: 'trip/publish', trip: (({ shopTitle, stayLine, savedStatus, ...t }) => ({ ...t, title: 'Republished' }))(seedTrip('anaya-coorg')) });
    expect(dbState().trips.find((t) => t.id === 'anaya-coorg')).toMatchObject({ title: 'Republished', shopTitle: 'Coffee estates and misty mornings', stayLine: 'Misty Estate · plantation walk', savedStatus: { text: '2 rooms left', tone: 'warning' } });
  });
});
