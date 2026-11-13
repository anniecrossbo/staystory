import { formatINR } from '@staystory/core';
import type { MExperience, MStay, MStop } from './types';

/** Structural copies of the server contracts, so the market package does not depend on the server. */
export interface ExtractionLike { destination: string | null; days: number | null; places: string[]; budgetPerPerson: number | null; namedStay: string | null; style: string[]; title: string | null }
export interface HotelLike { id: string; name: string; address: string; starRating: number; ratePerNight: number }
export interface PlannedDay { n: number; title: string; stops: (MStop & { dur?: string })[] }

export const MAX_TRIP_DAYS = 7;
export const MAX_STOPS_PER_DAY = 4;
export const clampDays = (n: number | null | undefined, fallback = 3) => Math.min(MAX_TRIP_DAYS, Math.max(1, Math.round(n && n > 0 ? n : fallback)));
export const lengthLabel = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}, ${Math.max(0, n - 1)} ${n === 2 ? 'night' : 'nights'}`;

/** Spread places over days round robin, in the order given. A day holds at most four stops; anything beyond that is left out. */
export function distributePlaces<T>(places: T[], days: number, perDay = MAX_STOPS_PER_DAY): T[][] {
  const n = clampDays(days);
  const out: T[][] = Array.from({ length: n }, () => []);
  places.forEach((p, i) => { const day = out[i % n]!; if (day.length < perDay) day.push(p); });
  return out;
}

/** Which trip experience a place name stands for. Keyword based: boat, cooking, or a guided palace walk. */
const EXPERIENCE_KEYS: { place: string[]; experience: string }[] = [
  { place: ['boat'], experience: 'boat' },
  { place: ['cooking', 'cook class'], experience: 'cooking' },
  { place: ['palace guided', 'guided palace', 'palace walk', 'palace tour'], experience: 'guided walk' },
];
export function matchExperience(place: string, experiences: MExperience[]): MExperience | undefined {
  const p = place.toLowerCase();
  const key = EXPERIENCE_KEYS.find((k) => k.place.some((w) => p.includes(w)));
  return key ? experiences.find((e) => e.name.toLowerCase().includes(key.experience)) : undefined;
}

const dayTitle = (i: number, n: number) => (n === 1 ? 'One day, the highlights' : i === 0 ? 'Arrive and settle in' : i === n - 1 ? 'A slow last morning' : 'Out and about');

/** Seed an itinerary from a reading. Stops are Tips unless a place matches a trip experience, which makes it bookable at that price. */
export function planItinerary(e: Pick<ExtractionLike, 'places' | 'days'>, coords: Record<string, { lat: number; lng: number }>, experiences: MExperience[], idPrefix = 'x'): PlannedDay[] {
  const n = clampDays(e.days);
  const used = new Set<string>();
  return distributePlaces(e.places, n).map((names, di) => ({
    n: di + 1, title: dayTitle(di, n),
    stops: names.map((name, si): MStop & { dur?: string } => {
      const c = coords[name];
      const exp = matchExperience(name, experiences);
      const base: MStop & { dur?: string } = { id: `${idPrefix}-${di + 1}-${si + 1}`, name, kind: 'Tip', bookable: false, ...(c ? { lat: c.lat, lng: c.lng } : {}) };
      if (!exp || used.has(exp.id)) return base;
      used.add(exp.id);
      const [time, dur] = exp.time.split(' · ');
      return { ...base, kind: 'Experience', bookable: true, pricePerPerson: exp.pricePerPerson, time, dur, img: exp.img };
    }),
  }));
}

const AUDIENCE = /couple|friend|solo|famil|group|kids|honeymoon/i;
/** The five rows the "detected" screen shows. Missing facts say so instead of guessing. */
export function extractionDetails(e: ExtractionLike, region?: string): { Destination: string; Length: string; Budget: string; Vibe: string; 'Best for': string } {
  const style = e.style.filter(Boolean);
  const vibe = style.filter((s) => !AUDIENCE.test(s)); const who = style.filter((s) => AUDIENCE.test(s));
  return {
    Destination: e.destination ? `${e.destination}${region ? `, ${region}` : ''}` : 'Not mentioned',
    Length: lengthLabel(clampDays(e.days)),
    Budget: e.budgetPerPerson ? `Under ${formatINR(e.budgetPerPerson)} per person` : 'Not mentioned',
    Vibe: vibe.length ? vibe.join(', ') : 'Not mentioned',
    'Best for': who.length ? who.join(', ') : 'Not mentioned',
  };
}

/** A live hotel as a plain partner stay: no commission, creator tier "mid". Null when the hotel has no real rate. */
export function stayFromHotel(h: HotelLike, fallbackImg: string): MStay | null {
  if (!(h.ratePerNight > 0)) return null;
  return {
    id: `liteapi-${h.id}`, hotelId: `liteapi-${h.id}`, roomTypeId: 'std', name: h.name, tier: 'mid',
    desc: `${h.starRating ? `${h.starRating}-star · ` : ''}${h.address}`.trim().replace(/ ·\s*$/, ''), nightly: Math.round(h.ratePerNight), img: fallbackImg, commissionPct: 0,
  };
}

/* ---------- Named stay matching ---------- */

const STAY_STOP = new Set(['the', 'a', 'an', 'by', 'in', 'of', 'near', 'at', 'on', 'with', 'and', 'for', 'to']);
/** Words that describe a kind of place rather than name one. A caption that only uses these names no stay. */
const STAY_GENERIC = new Set(['hotel', 'hotels', 'resort', 'resorts', 'stay', 'stays', 'homestay', 'hostel', 'villa', 'inn', 'lodge', 'haveli', 'palace', 'heritage', 'boutique', 'beach', 'hill', 'hills', 'mountain', 'river', 'lake', 'fort', 'camp', 'farm', 'farmstay', 'cottage', 'estate', 'view', 'place', 'property', 'room', 'rooms']);

const stayTokens = (name: string, city = '') => {
  const cityWords = new Set(city.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STAY_STOP.has(w) && !cityWords.has(w));
};
/** Lowercase, no punctuation, no "the", no city name. */
export const normaliseStayName = (name: string, city = ''): string => stayTokens(name, city).join(' ');
const coreOf = (name: string, city = ''): string => stayTokens(name, city).filter((w) => !STAY_GENERIC.has(w)).join(' ');

export type NamedStayMatch = { status: 'none' } | { status: 'matched'; id: string } | { status: 'unmatched'; name: string };

/**
 * Match the stay a caption names against the stays the creator can offer. 'none' when nothing usable is named
 * (empty, under 4 characters, or only generic words like "a haveli by the lake"); 'unmatched' means the caption
 * names a stay we cannot book, so the creator must choose one.
 */
export function matchNamedStay(named: string | null | undefined, city: string, stays: { id: string; name: string }[]): NamedStayMatch {
  const raw = (named ?? '').trim();
  const n = normaliseStayName(raw, city); const core = coreOf(raw, city);
  if (n.length < 4 || !core) return { status: 'none' };
  for (const st of stays) {
    const sn = normaliseStayName(st.name, city); const sc = coreOf(st.name, city);
    if (sn.length < 4) continue;
    if (n.includes(sn) || sn.includes(n) || (sc.length >= 4 && (core === sc || core.includes(sc) || sc.includes(core)))) return { status: 'matched', id: st.id };
  }
  return { status: 'unmatched', name: raw };
}
