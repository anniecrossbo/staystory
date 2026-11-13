import { gapNightSaving, quoteTrip, type TripQuote } from '@staystory/core';
import type { MBooking, MGapNight, MStay, MTrip, MarketState } from './types';

/** Pure traveler-side helpers: trip pricing for any trip, date options, gap eligibility and saved-trip status. */

export const GUESTS = 2;
export const tripNights = (t: MTrip) => Math.max(1, t.days - 1);
export const pickStay = (t: MTrip): MStay => t.stays.find((s) => s.id === t.pickStayId) ?? t.stays[0]!;
/** The creator's pick first, then the rest in their saved order. */
export const orderedStays = (t: MTrip): MStay[] => { const p = pickStay(t); return [p, ...t.stays.filter((s) => s !== p)]; };
export const TIER_LABEL: Record<MStay['tier'], string> = { creator_pick: "Creator's pick", budget: 'Budget', mid: 'Mid-range', luxury: 'Luxury' };

const CODES: Record<string, string> = { Udaipur: 'UDR', Jaipur: 'JAI', Goa: 'GOA', Rishikesh: 'RSK', Coorg: 'CRG', Gokarna: 'GKN', Jodhpur: 'JDH' };
export const tripCode = (place: string) => CODES[place] ?? (place.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'TRP');
/** `SS-UDR-48230`: place code plus the marketplace booking sequence. */
export const bookingNumber = (place: string, seq: number) => `SS-${tripCode(place)}-${seq}`;

const STARTS = [{ m: 'Dec', d: 19, next: 'Jan' }, { m: 'Jan', d: 9, next: 'Feb' }, { m: 'Jan', d: 23, next: 'Feb' }];
/** The weekends offered for a stay of `nights`: `Dec 19 – 21`, `Jan 9 – 11`, `Jan 23 – 25`. */
export function dateOptions(nights: number): string[] {
  return STARTS.map(({ m, d, next }) => { const e = d + nights; return e > 31 ? `${m} ${d} – ${next} ${e - 31}` : `${m} ${d} – ${e}`; });
}
const norm = (s: string) => s.toLowerCase().replace(/\s+to\s+/g, '–').replace(/[\s–-]+/g, '');
export const sameDates = (a: string, b: string) => norm(a) === norm(b);
/** Date options for a trip, with an active Gap Night's dates added when they are not already offered. */
export function tripDateOptions(t: MTrip, gap?: MGapNight): string[] {
  const o = dateOptions(tripNights(t));
  return gap && !o.some((x) => sameDates(x, gap.datesLabel)) ? [gap.datesLabel, ...o] : o;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** First night of a label like `Dec 19 – 21`, as the next such date after `now` (local midnight). */
export function startDate(label: string, now = new Date()): Date | undefined {
  const m = /^([A-Za-z]{3})\w*\s+(\d{1,2})/.exec(label.trim());
  const mi = m ? MONTHS.indexOf(m[1]!.toLowerCase()) : -1;
  if (!m || mi < 0) return undefined;
  let d = new Date(now.getFullYear(), mi, Number(m[2]));
  if (d.getTime() < now.getTime() - 86_400_000) d = new Date(now.getFullYear() + 1, mi, Number(m[2]));
  return d;
}
export const daysUntil = (label: string, now = new Date()) => { const d = startDate(label, now); return d ? Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86_400_000)) : 0; };
/** Free cancellation ends a week before check-in: `Dec 12`. */
export function freeCancelUntil(label: string, now = new Date()): string {
  const d = startDate(label, now); if (!d) return 'check-in';
  const e = new Date(d.getTime() - 7 * 86_400_000);
  return `${MONTHS[e.getMonth()]!.replace(/^./, (c) => c.toUpperCase())} ${e.getDate()}`;
}

export interface Selection { stayId: string; expIds: string[]; dateLabel: string }
export const defaultSelection = (t: MTrip, dateLabel = dateOptions(tripNights(t))[0]!): Selection => ({ stayId: pickStay(t).id, expIds: t.experiences.map((e) => e.id), dateLabel });

/** A live Gap Night for this trip that the traveler may use: they saved it, alerts are on and rooms are left. */
export function gapForTrip(s: MarketState, travelerId: string, tripId: string): MGapNight | undefined {
  const t = s.travelers[travelerId];
  if (!t || !t.prefs.gapAlerts || !t.savedTripIds.includes(tripId)) return undefined;
  return s.gapNights.find((g) => g.status === 'live' && g.booked < g.rooms && g.tripIds.includes(tripId));
}
/** The Gap Night rate only applies to the hotel and room it covers, on its dates. */
export const gapApplies = (gap: MGapNight | undefined, trip: MTrip, stay: MStay, dateLabel: string): gap is MGapNight =>
  !!gap && gap.tripIds.includes(trip.id) && stay.hotelId === gap.hotelId && stay.roomTypeId === gap.roomTypeId && sameDates(gap.datesLabel, dateLabel);

export interface SelectionQuote extends TripQuote { stay: MStay; nights: number; nightly: number; gap: boolean; gapSaving: number; experienceCount: number }
export function quoteSelection(trip: MTrip, sel: Selection, gap?: MGapNight): SelectionQuote {
  const stay = trip.stays.find((s) => s.id === sel.stayId) ?? pickStay(trip);
  const nights = tripNights(trip);
  const g = gapApplies(gap, trip, stay, sel.dateLabel);
  const nightly = g ? gap!.rate : stay.nightly;
  const exps = trip.experiences.filter((e) => sel.expIds.includes(e.id)).map((e) => ({ price: e.pricePerPerson }));
  const q = quoteTrip({ stays: [{ nightlyRate: nightly, nights }], experiences: exps, creatorSaving: g ? 0 : trip.creatorSaving, guests: GUESTS });
  return { ...q, stay, nights, nightly, gap: g, gapSaving: g ? gapNightSaving(gap!.campaignRate, gap!.rate, nights) : 0, experienceCount: exps.length };
}
/** The price on a trip card: the creator's pick with every experience, less the creator saving (Udaipur: ₹14,000). */
export const tripCardPrice = (t: MTrip) => quoteSelection(t, defaultSelection(t)).total;
/** The "From, for 2" figure: the cheapest stay with every experience, before the creator saving (Udaipur: ₹10,800). */
export function tripFromPriceFor(t: MTrip) {
  const cheapest = t.stays.reduce((m, s) => (s.nightly < m.nightly ? s : m), t.stays[0]!);
  return quoteTrip({ stays: [{ nightlyRate: cheapest.nightly, nights: tripNights(t) }], experiences: t.experiences.map((e) => ({ price: e.pricePerPerson })), guests: GUESTS }).total;
}
/** `₹10.8k` */
export const shortINR = (n: number) => `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;

const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || 'MI';
/** `Meera Iyer` -> `Meera I.` */
export function guestShortName(full: string) {
  const [first = 'Guest', ...rest] = full.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

export function buildBooking(a: { state: MarketState; travelerId: string; guestName: string; trip: MTrip; sel: Selection; gap?: MGapNight; creatorId?: string; now: string }): MBooking {
  const q = quoteSelection(a.trip, a.sel, a.gap);
  const hotel = a.state.hotel;
  const room = q.stay.hotelId === hotel.id ? hotel.rooms.find((r) => r.id === q.stay.roomTypeId)?.name : undefined;
  const short = guestShortName(a.guestName);
  return {
    id: bookingNumber(a.trip.place, a.state.seq.booking), travelerId: a.travelerId, guestName: short, guestInitials: initials(short),
    tripId: a.trip.id, creatorId: a.creatorId ?? a.trip.creatorId, hotelId: q.stay.hotelId, roomTypeId: q.stay.roomTypeId, roomName: room ?? 'Standard room', stayId: q.stay.id,
    datesLabel: a.sel.dateLabel, nights: q.nights, guests: GUESTS, roomValue: q.roomValue, experiencesValue: q.experiencesValue, creatorSaving: q.creatorSaving, total: q.total,
    experienceIds: a.trip.experiences.filter((e) => a.sel.expIds.includes(e.id)).map((e) => e.id),
    source: q.gap ? 'gap_night' : 'link', status: 'upcoming', createdAt: a.now, ...(q.gap ? { gapNightId: a.gap!.id } : {}),
  };
}

export interface SavedStatus { label: string; tone: 'success' | 'warning' | 'info'; meta: string; gap?: MGapNight }
/** Live status of a saved trip: a Gap Night alert shows the saving (or rooms left when few remain), otherwise Saved. */
export function savedStatus(s: MarketState, travelerId: string, trip: MTrip): SavedStatus {
  const handle = s.creators[trip.creatorId]?.handle ?? '';
  const gap = gapForTrip(s, travelerId, trip.id);
  if (gap) {
    const stay = trip.stays.find((x) => x.hotelId === gap.hotelId && x.roomTypeId === gap.roomTypeId) ?? pickStay(trip);
    const q = quoteSelection(trip, { ...defaultSelection(trip, gap.datesLabel), stayId: stay.id }, gap);
    const left = gap.rooms - gap.booked;
    return { gap, label: left <= 2 ? `${left} room${left === 1 ? '' : 's'} left` : `${shortSaving(q.gapSaving)} cheaper`, tone: left <= 2 ? 'warning' : 'success', meta: `${handle} · now ₹${q.total.toLocaleString('en-IN')} on ${gap.datesLabel.replace(' – ', ' to ')}` };
  }
  return { label: 'Saved', tone: 'info', meta: `${handle} · from ₹${tripCardPrice(trip).toLocaleString('en-IN')}` };
}
const shortSaving = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const ADJ_PER_NIGHT = [0, -400, 200];
export interface ChangeOption { label: string; sub: string; delta: number; current: boolean; tone: 'neutral' | 'success' | 'warning' }
/** Other weekends for the same stay, with the price difference against the current dates. */
export function changeOptions(b: Pick<MBooking, 'datesLabel' | 'nights' | 'experienceIds'>): ChangeOption[] {
  const opts = dateOptions(b.nights);
  const cur = opts.findIndex((o) => sameDates(o, b.datesLabel));
  const curAdj = (ADJ_PER_NIGHT[cur] ?? 0) * b.nights;
  const list = cur < 0 ? [b.datesLabel, ...opts] : opts;
  return list.map((label, i) => {
    const idx = cur < 0 ? i - 1 : i;
    const current = cur < 0 ? i === 0 : i === cur;
    const delta = current ? 0 : (ADJ_PER_NIGHT[idx] ?? 0) * b.nights - curAdj;
    const soldOut = !current && idx === 2 && b.experienceIds.includes('boat');
    return { label, current, delta, tone: current ? 'neutral' : delta < 0 ? 'success' : delta > 0 ? 'warning' : 'neutral', sub: current ? 'Current dates' : soldOut ? 'Boat ride sold out' : 'Everything available' };
  });
}
