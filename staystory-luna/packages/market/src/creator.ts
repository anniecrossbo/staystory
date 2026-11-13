import { creatorCommission, formatINR, quoteTrip, CREATOR_COMMISSION_PCT } from '@staystory/core';
import { SEED_BOOKINGS, SEED_TRIPS } from './seed';
import { bookingCreatorShare, creatorOffers } from './selectors';
import type { InviteStatus, LedgerStatus, MBooking, MCampaign, MExperience, MLedger, MStay, MStop, MTrip, MarketState } from './types';

/* ---------- Offers ---------- */

export type OfferTab = 'new' | 'active' | 'past';
export const offerTab = (status: InviteStatus): OfferTab => (status === 'invited' ? 'new' : status === 'declined' ? 'past' : 'active');
/** The booking value the onboarding screen uses as its worked example. */
export const ILLUSTRATIVE_BOOKING = 20_000;
export const CONTENT_STAY_PERK = 'Content stay after 5 bookings';

export interface OfferView {
  campaign: MCampaign; status: InviteStatus; counter?: { pct: number; message: string; extras: string[] }; tab: OfferTab;
  hotelName: string; listTitle: string; city: string; when: string; img: string; headline: string; perk: string; why: string; roomName: string;
  followerPrice: number; commissionPct: number; creatorSharePct: number; estimate20: number;
  /** Commission the hotel and creator have agreed (campaign rate or accepted counter). */
  agreedPct?: number;
}

const titleCase = (id: string) => id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const joinList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function offerView(s: MarketState, c: MCampaign, status: InviteStatus, counter?: OfferView['counter'], creatorId = 'anaya'): OfferView {
  const own = c.hotelId === s.hotel.id;
  const hotelName = c.meta?.hotelName ?? (own ? s.hotel.name : titleCase(c.hotelId));
  const city = c.meta?.city ?? (own ? s.hotel.city : '');
  const roomName = c.meta?.roomName ?? s.hotel.rooms.find((r) => r.id === c.roomTypeId)?.name ?? 'room';
  return {
    campaign: c, status, counter, tab: offerTab(status), hotelName, city, roomName,
    listTitle: c.meta?.listTitle ?? hotelName, when: c.meta?.when ?? c.windowLabel,
    img: c.meta?.img ?? (city ? city.toLowerCase() : 'haveli'),
    headline: c.meta?.headline ?? `${c.name}: ${c.nights} nights in a ${roomName.toLowerCase()} with ${joinList(c.perks.map((p) => p.toLowerCase()))} at a price only your followers get.`,
    perk: c.meta?.perk ?? CONTENT_STAY_PERK,
    why: c.meta?.why ?? 'Your followers save trips for weeks before booking, which suits a stay like this.',
    followerPrice: c.creatorPrice, commissionPct: c.commissionPct, creatorSharePct: CREATOR_COMMISSION_PCT,
    estimate20: 20 * creatorCommission(ILLUSTRATIVE_BOOKING), agreedPct: c.agreedPct[creatorId],
  };
}

export const creatorOfferViews = (s: MarketState, creatorId: string): OfferView[] =>
  creatorOffers(s, creatorId).map((o) => offerView(s, o.campaign, o.status, o.counter, creatorId));

/* ---------- Ledger ---------- */

export type LedgerFilter = 'All' | 'Available' | 'Pending stay' | 'Paid';
export const LEDGER_LABEL: Record<LedgerStatus, string> = { pending_stay: 'Pending stay', available: 'Available', paid: 'Paid', cancelled: 'Cancelled', processing: 'Processing' };
export const LEDGER_TONE: Record<LedgerStatus, 'warning' | 'success' | 'neutral' | 'danger' | 'info'> = { pending_stay: 'warning', available: 'success', paid: 'neutral', cancelled: 'danger', processing: 'info' };

export function initialsOf(label: string): string {
  const who = label.includes(' · ') ? label.split(' · ').slice(1).join(' ') : label;
  const w = who.replace(/[.,]/g, '').split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w.map((x) => x[0]).join('') : (w[0] ?? '?').slice(0, 2)).slice(0, 2).toUpperCase();
}

export interface LedgerRow { id: string; ini: string; title: string; meta: string; amt: string; status: string; raw: LedgerStatus; tone: (typeof LEDGER_TONE)[LedgerStatus]; bookingId?: string }

export function ledgerRows(s: MarketState, creatorId: string, filter: LedgerFilter = 'All'): LedgerRow[] {
  const rows = s.ledger.filter((l) => l.creatorId === creatorId).map((l: MLedger): LedgerRow => ({
    id: l.id, ini: initialsOf(l.label), title: l.label, meta: l.meta, raw: l.status, status: LEDGER_LABEL[l.status], tone: LEDGER_TONE[l.status], bookingId: l.bookingId,
    amt: (l.status === 'available' ? '+' : '') + formatINR(l.amount),
  }));
  if (filter === 'All') return rows;
  return rows.filter((r) => (filter === 'Paid' ? r.raw === 'paid' || r.raw === 'processing' : r.status === filter));
}

/** Share of everything not yet cancelled that can already be withdrawn. */
export function availableShare(b: { available: number; pending: number }): number {
  const t = b.available + b.pending;
  return t ? Math.round((b.available / t) * 100) : 0;
}

/** The newest booking still waiting for check-out, for the earnings banner. */
export function latestPendingBooking(s: MarketState, creatorId: string): { booking: MBooking; amount: number; hotelName: string; guest: string; dates: string } | undefined {
  for (const l of s.ledger) {
    if (l.creatorId !== creatorId || l.status !== 'pending_stay' || !l.bookingId) continue;
    const booking = s.bookings.find((b) => b.id === l.bookingId);
    if (!booking || booking.status === 'cancelled' || booking.status === 'completed') continue;
    const trip = s.trips.find((t) => t.id === booking.tripId);
    const hotelName = trip?.stays.find((x) => x.id === booking.stayId)?.name ?? (booking.hotelId === s.hotel.id ? s.hotel.name : titleCase(booking.hotelId));
    return { booking, amount: l.amount, hotelName, guest: booking.guestName, dates: booking.datesLabel.replace(' – ', ' to ') };
  }
  return undefined;
}

/* ---------- Insights and trip performance ---------- */

export type RangeKey = '7' | '30' | '90';
/** Analytics baselines: the marketplace store has no visit events, so seeded trips start from these. */
export const RANGES: Record<RangeKey, { commission: number; delta: string; sub: string; visits: number; saves: number; bookings: number; labels: string[]; values: number[] }> = {
  '7': { commission: 14720, delta: '18% vs last week', sub: 'Last 7 days · from ₹1.84L booked', visits: 3120, saves: 488, bookings: 11, labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], values: [1200, 1800, 1500, 2400, 2100, 2900, 2800] },
  '30': { commission: 69920, delta: '24% vs last month', sub: 'Last 30 days · from ₹8.74L booked', visits: 12480, saves: 1932, bookings: 46, labels: ['W1', 'W2', 'W3', 'W4'], values: [12400, 15800, 18600, 23100] },
  '90': { commission: 241600, delta: '31% vs last quarter', sub: 'Last 90 days · from ₹30.2L booked', visits: 41900, saves: 6210, bookings: 151, labels: ['Sep', 'Oct', 'Nov'], values: [58200, 83500, 99900] },
};
const TRIP_BASE: Record<string, { visits: number; byStay: Record<string, { n: number; earn: number }> }> = {
  'anaya-udaipur': { visits: 7820, byStay: { jheel: { n: 17, earn: 23800 }, pichola: { n: 8, earn: 6240 }, aravalli: { n: 3, earn: 9410 } } },
  'anaya-coorg': { visits: 3410, byStay: { 'coorg-misty': { n: 12, earn: 12500 } } },
  'anaya-jodhpur': { visits: 1250, byStay: { 'anaya-jodhpur-stay': { n: 6, earn: 5200 } } },
};
const SEED_BOOKING_IDS = new Set(SEED_BOOKINGS.map((b) => b.id));
const SEED_SAVES = Object.fromEntries(SEED_TRIPS.map((t) => [t.id, t.saves]));
const liveBookings = (s: MarketState, creatorId: string) => s.bookings.filter((b) => b.creatorId === creatorId && !SEED_BOOKING_IDS.has(b.id) && b.status !== 'cancelled');

export const countLabel = (n: number) => new Intl.NumberFormat('en-IN').format(n);
export const conversionLabel = (bookings: number, visits: number) => (visits ? `${((bookings / visits) * 100).toFixed(2)}%` : '0.00%');

export function creatorInsights(s: MarketState, creatorId: string, range: RangeKey) {
  const base = RANGES[range];
  const mine = liveBookings(s, creatorId);
  const extraCommission = mine.reduce((t, b) => t + bookingCreatorShare(b), 0);
  const trips = s.trips.filter((t) => t.creatorId === creatorId);
  const extraSaves = trips.reduce((t, x) => t + (x.saves - (SEED_SAVES[x.id] ?? 0)), 0);
  const extraVisits = s.attributions.filter((a) => a.creatorId === creatorId).length;
  const values = base.values.map((v, i) => (i === base.values.length - 1 ? v + extraCommission : v));
  const visits = base.visits + extraVisits;
  const saves = Math.max(0, base.saves + extraSaves);
  const bookings = base.bookings + mine.length;
  return { commission: base.commission + extraCommission, delta: base.delta, sub: base.sub, visits, saves, bookings, conv: conversionLabel(bookings, visits), labels: base.labels, values };
}

export interface TripStats {
  visits: number; customized: number; checkout: number; booked: number; saves: number;
  funnel: { label: string; value: number; w: number }[];
  byStay: { stayId: string; name: string; img: string; n: number; earn: number; tier: MStay['tier'] }[];
}
export function tripStats(s: MarketState, tripId: string): TripStats | undefined {
  const t = s.trips.find((x) => x.id === tripId);
  if (!t) return undefined;
  const base = TRIP_BASE[t.id] ?? { visits: 0, byStay: {} };
  const visits = base.visits + s.attributions.filter((a) => a.tripId === t.id).length;
  const live = s.bookings.filter((b) => b.tripId === t.id && b.creatorId === t.creatorId && !SEED_BOOKING_IDS.has(b.id) && b.status !== 'cancelled');
  const byStay = t.stays.map((st) => {
    const b0 = base.byStay[st.id] ?? { n: 0, earn: 0 };
    const mine = live.filter((b) => b.stayId === st.id);
    return { stayId: st.id, name: st.name, img: st.img, tier: st.tier, n: b0.n + mine.length, earn: b0.earn + mine.reduce((x, b) => x + bookingCreatorShare(b), 0) };
  });
  const booked = byStay.reduce((n, x) => n + x.n, 0);
  const checkout = Math.max(booked, Math.round(visits * 0.01228));
  const customized = Math.max(checkout, Math.round(visits * 0.1586));
  const w = (v: number) => (visits ? Math.max(v ? 2 : 0, Math.round(100 * Math.sqrt(v / visits))) : 0);
  return {
    visits, customized, checkout, booked, saves: t.saves, byStay,
    funnel: [
      { label: 'Link visits', value: visits, w: visits ? 100 : 0 }, { label: 'Customized the trip', value: customized, w: w(customized) },
      { label: 'Reached checkout', value: checkout, w: w(checkout) }, { label: 'Booked', value: booked, w: w(booked) },
    ],
  };
}

export const stayTierLabel = (t: MStay['tier']) => ({ creator_pick: 'creator’s pick', budget: 'budget', mid: 'mid-range', luxury: 'luxury' }[t]);

/* ---------- Trip builder ---------- */

/** "From, for 2": cheapest included stay for the nights plus every bookable experience for the guests. */
export function builderFromPrice(stays: { nightly: number }[], experiences: { pricePerPerson: number }[], nights = 2, guests = 2): number {
  if (!stays.length) return 0;
  const cheapest = Math.min(...stays.map((x) => x.nightly));
  return quoteTrip({ stays: [{ nightlyRate: cheapest, nights }], experiences: experiences.map((e) => ({ price: e.pricePerPerson })), guests }).total;
}

export const slugify = (v: string) => v.toLowerCase().replace(/^(https?:\/\/)?staystory\.in\/[a-z0-9.-]+\/?/, '').replace(/[^a-z0-9-]/g, '').replace(/^-+/, '');
export const tripIdFor = (creatorId: string, slug: string) => `${creatorId}-${slug}`;

/** Hotels the creator has accepted a campaign with, by hotel id. */
export function acceptedOffers(s: MarketState, creatorId: string): Record<string, { campaign: MCampaign; pct: number }> {
  const out: Record<string, { campaign: MCampaign; pct: number }> = {};
  for (const c of s.campaigns) if (c.invites[creatorId] === 'accepted') out[c.hotelId] = { campaign: c, pct: c.agreedPct[creatorId] ?? c.commissionPct };
  return out;
}

export interface BuilderStop extends MStop { dur?: string }
export interface BuilderInput {
  creatorId: string; slug: string; title: string; place: string; img: string; days: { n: number; title: string; stops: BuilderStop[] }[];
  stays: MStay[]; pickStayId: string; dmKeyword: string; reelUrl: string; tags?: string[]; now: string; previous?: MTrip;
}
const DAY_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const daysTitle = (n: number, place: string) => `${DAY_WORDS[n] ?? n} ${n === 1 ? 'day' : 'days'} in ${place}`;

export function makeCreatorTrip(s: MarketState, i: BuilderInput): MTrip {
  const experiences: MExperience[] = i.days.flatMap((d) => d.stops.filter((p) => p.bookable && p.pricePerPerson && p.kind !== 'Stay').map((p) => ({
    id: p.id, name: p.name, day: d.n, time: p.dur ? `${p.time ?? ''} · ${p.dur}`.trim() : (p.time ?? ''), pricePerPerson: p.pricePerPerson!, img: p.img ?? i.img,
  })));
  const pick = i.stays.find((x) => x.id === i.pickStayId) ?? i.stays[0]!;
  const offer = pick.campaignId ? s.campaigns.find((c) => c.id === pick.campaignId && c.invites[i.creatorId] === 'accepted') : undefined;
  const creatorSaving = offer ? Math.round((offer.rackPrice - offer.creatorPrice) / offer.nights) : 0;
  return {
    id: tripIdFor(i.creatorId, i.slug), creatorId: i.creatorId, slug: i.slug, title: i.title, place: i.place, days: i.days.length, img: i.img,
    itinerary: i.days.map((d) => ({ n: d.n, title: d.title, stops: d.stops.map(({ dur: _d, ...p }) => p) })),
    stays: i.stays, pickStayId: pick.id, experiences, creatorSaving,
    saves: i.previous?.saves ?? 0, travelersBooked: i.previous?.travelersBooked ?? 0, tags: i.tags ?? i.previous?.tags ?? [], status: i.previous?.status ?? 'live',
    reelUrl: i.reelUrl, dmKeyword: i.dmKeyword.trim() || 'link', publishedAt: i.previous?.publishedAt ?? i.now,
  };
}

/* ---------- Notifications ---------- */

export interface CreatorNotification { id: string; icon: string; title: string; body: string; at: string }
export function creatorNotifications(s: MarketState, creatorId: string, countered: string[] = []): CreatorNotification[] {
  const out: CreatorNotification[] = [];
  for (const o of creatorOfferViews(s, creatorId)) {
    const v = o;
    if (o.status === 'invited') out.push({ id: `offer:${o.campaign.id}`, icon: 'handshake', title: `${v.hotelName} sent you an offer`, body: `${o.campaign.nights} nights at ${formatINR(o.followerPrice)} · ${o.commissionPct}% commission`, at: o.campaign.createdAt });
    if (countered.includes(o.campaign.id)) {
      if (o.status === 'accepted') out.push({ id: `counter:${o.campaign.id}:accepted`, icon: 'check_circle', title: `${v.hotelName} accepted your counter`, body: `Agreed commission is ${o.agreedPct ?? o.commissionPct}%. The stay is ready to add to a trip.`, at: o.campaign.createdAt });
      else if (o.status === 'declined') out.push({ id: `counter:${o.campaign.id}:declined`, icon: 'cancel', title: `${v.hotelName} declined your counter`, body: 'The offer has moved to Past.', at: o.campaign.createdAt });
      else if (o.status === 'countered') out.push({ id: `counter:${o.campaign.id}:waiting`, icon: 'schedule', title: `Counter sent to ${v.hotelName}`, body: `Asking ${o.counter?.pct ?? ''}%. Waiting for their reply.`, at: o.campaign.createdAt });
    }
  }
  for (const l of s.ledger) {
    if (l.creatorId !== creatorId || !l.bookingId) continue;
    const b = s.bookings.find((x) => x.id === l.bookingId);
    if (!b) continue;
    const place = s.trips.find((t) => t.id === b.tripId)?.place ?? 'trip';
    if (l.status === 'pending_stay') out.push({ id: `booking:${l.id}`, icon: 'celebration', title: `New booking from your ${place} trip`, body: `${b.guestName} booked ${b.datesLabel.replace(' – ', ' to ')}. ${formatINR(l.amount)} becomes available after check-out.`, at: l.createdAt });
    else if (l.status === 'available') out.push({ id: `available:${l.id}`, icon: 'account_balance_wallet', title: `${formatINR(l.amount)} is available to withdraw`, body: `${b.guestName} checked out. The hotel confirmed the stay.`, at: l.createdAt });
    else if (l.status === 'cancelled') out.push({ id: `cancelled:${l.id}`, icon: 'event_busy', title: `${b.guestName} cancelled a booking`, body: 'The commission for it is now ₹0.', at: l.createdAt });
  }
  for (const w of s.withdrawals) if (w.creatorId === creatorId) out.push({ id: `withdraw:${w.id}`, icon: 'account_balance', title: `${formatINR(w.net)} on its way`, body: `${formatINR(w.gross)} less ${formatINR(w.tds)} TDS to ${w.upi}.`, at: w.createdAt });
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
