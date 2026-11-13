import { formatINR, pctOf } from '@staystory/core';
import { bookingCommission, seedState, type MBooking, type MCampaign, type MCreator, type MarketState, type MSettlement } from '@staystory/market';

/* ---------- Gap Night demand ---------- */
/** Mock pool of travelers who looked at the dates. Each audience filter narrows it; the defaults give the 312 in the design. */
export const DEMAND_POOL = 1155;
export const AUDIENCE = [
  { key: 'saved', label: 'Saved Anaya’s Udaipur trip', factor: 0.6 },
  { key: 'free', label: 'Looked at Dec 19 to 21', factor: 0.5 },
  { key: 'budget', label: 'Budget ₹3k to ₹4k a night', factor: 0.9 },
  { key: 'near', label: 'Flying from Mumbai or Delhi', factor: 0.55 },
] as const;
export type AudienceKey = (typeof AUDIENCE)[number]['key'];
export type AudienceState = Record<AudienceKey, boolean>;
export const DEFAULT_AUDIENCE: AudienceState = { saved: true, free: true, budget: true, near: false };
/** Travelers who match the chosen filters. With no filter chosen nobody is targeted, so the count is 0. */
export const matchCount = (on: AudienceState): number => {
  const keys = AUDIENCE.filter((a) => on[a.key]);
  if (!keys.length) return 0;
  return Math.round(keys.reduce((n, a) => n * a.factor, DEMAND_POOL));
};
export const audienceKeys = (on: AudienceState): string[] => AUDIENCE.filter((a) => on[a.key]).map((a) => a.key);

/** Unsold rooms per room type for the Gap Night dates (mock inventory from the channel manager). */
export const UNSOLD_BASE: Record<string, number> = { 'lake-deluxe': 4, courtyard: 1 };
export const GAP_DATES = 'Dec 19 – 21';
export const unsoldRooms = (s: MarketState, roomTypeId: string): number => {
  const released = s.gapNights.filter((g) => g.hotelId === s.hotel.id && g.status === 'live' && g.roomTypeId === roomTypeId).reduce((n, g) => n + g.rooms, 0);
  return Math.max(0, (UNSOLD_BASE[roomTypeId] ?? 0) - released);
};
export const liveGap = (s: MarketState) => s.gapNights.find((g) => g.hotelId === s.hotel.id && g.status === 'live');
/** "Dec 19 – 21" reads "Dec 19 to 21" in sentences. */
export const toWords = (label: string) => label.replace(' – ', ' to ');

/* ---------- Date helpers ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Dec 19 – 21" becomes "Sat 19 to Mon 21 Dec". Unknown shapes are returned unchanged. Stays are in 2026. */
export function longDates(label: string, year = 2026): string {
  const m = /^([A-Za-z]{3}) (\d{1,2}) – (?:([A-Za-z]{3}) )?(\d{1,2})$/.exec(label.trim());
  if (!m) return label;
  const m1 = MONTHS.indexOf(m[1]!);
  const m2 = m[3] ? MONTHS.indexOf(m[3]) : m1;
  if (m1 < 0 || m2 < 0) return label;
  const d1 = Number(m[2]); const d2 = Number(m[4]);
  const w1 = DAYS[new Date(year, m1, d1).getDay()]!; const w2 = DAYS[new Date(year, m2, d2).getDay()]!;
  return m1 === m2 ? `${w1} ${d1} to ${w2} ${d2} ${MONTHS[m1]}` : `${w1} ${d1} ${MONTHS[m1]} to ${w2} ${d2} ${MONTHS[m2]}`;
}

/* ---------- Validation (onboarding) ---------- */
export const isIfsc = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
export const isGstin = (v: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v);
export const isPan = (v: string) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v);
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const isAccount = (v: string) => /^\d{9,18}$/.test(v.replace(/\s/g, ''));
export interface PayoutFields { legalName: string; gstin: string; pan: string; billingEmail: string; accountNumber: string; ifsc: string }
/** Error per invalid field. `strict` also flags empty fields (after the user tried to continue). */
export function payoutErrors(f: PayoutFields, strict: boolean): Partial<Record<keyof PayoutFields, string>> {
  const e: Partial<Record<keyof PayoutFields, string>> = {};
  const has = (v: string) => v.trim().length > 0;
  if (!has(f.legalName) && strict) e.legalName = 'Enter the registered name';
  if (has(f.gstin) ? !isGstin(f.gstin) : strict) e.gstin = 'Enter a valid 15-character GSTIN';
  else if (has(f.gstin) && has(f.pan) && isPan(f.pan) && f.gstin.slice(2, 12) !== f.pan) e.gstin = 'GSTIN does not match the PAN';
  if (has(f.pan) ? !isPan(f.pan) : strict) e.pan = 'Enter a valid 10-character PAN';
  if (has(f.billingEmail) ? !isEmail(f.billingEmail) : strict) e.billingEmail = 'Enter a valid email address';
  if (has(f.accountNumber) ? !isAccount(f.accountNumber) : strict) e.accountNumber = 'Enter a 9 to 18 digit account number';
  if (has(f.ifsc) ? !isIfsc(f.ifsc) : strict) e.ifsc = 'Enter the full 11-character IFSC';
  return e;
}

/* ---------- Date range scaling for the overview ---------- */
export type Range = '7' | '30' | '90';
export const RANGES: { value: Range; label: string; days: string }[] = [
  { value: '7', label: 'Week', days: 'last 7 days' }, { value: '30', label: 'Month', days: 'last 30 days' }, { value: '90', label: 'Quarter', days: 'last 90 days' },
];
/** Deterministic scale of the 30-day mock figures. */
const FACTOR: Record<Range, { vol: number; cpa: number }> = { '7': { vol: 0.24, cpa: 1.04 }, '30': { vol: 1, cpa: 1 }, '90': { vol: 2.9, cpa: 0.97 } };
export const scaleVol = (n: number, r: Range) => Math.round(n * FACTOR[r].vol);
export const scaleCpa = (n: number, r: Range) => Math.round((n * FACTOR[r].cpa) / 10) * 10;
export const fmtLakh = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : formatINR(n));
export const asset = (name: string) => `/assets/${name}.jpg`;
export const fmtCount = (n: number) => n.toLocaleString('en-IN');

/* ---------- Overview figures: history plus what the live store adds ---------- */
/** The 30-day history before the six sample bookings, from the design. */
export const BASE = { bookings: 184, value: 3_680_000, cancelled: 8, cpa: 1520, commissionMonth: 85110, waived: 9600 };
export const CREATOR_BASE: Record<string, { visits: number; bookings: number; value: number; cpa: number }> = {
  anaya: { visits: 12100, bookings: 51, value: 1_020_000, cpa: 1180 },
  riya: { visits: 9840, bookings: 45, value: 940_000, cpa: 1460 },
  food: { visits: 10300, bookings: 30, value: 610_000, cpa: 1690 },
  mia: { visits: 4500, bookings: 15, value: 290_000, cpa: 1540 },
  desi: { visits: 8600, bookings: 18, value: 260_000, cpa: 2050 },
};
let seedBookings: Map<string, MBooking> | undefined;
const seedOf = (id: string) => (seedBookings ??= new Map(seedState().bookings.map((b) => [b.id, b]))).get(id);
const live = (b: MBooking) => b.status !== 'cancelled';
/** Sum of `f` over the hotel's bookings, minus what the seed contained, so the history stays the design's number. */
function delta(s: MarketState, f: (b: MBooking, seeded: boolean) => number): number {
  const now = s.bookings.filter((b) => b.hotelId === s.hotel.id).reduce((n, b) => n + f(b, false), 0);
  const was = seedState().bookings.filter((b) => b.hotelId === s.hotel.id).reduce((n, b) => n + f(b, true), 0);
  return now - was;
}
export function overviewFigures(s: MarketState, r: Range = '30') {
  const bookings = scaleVol(BASE.bookings, r) + delta(s, (b) => (live(b) ? 1 : 0));
  const value = scaleVol(BASE.value, r) + delta(s, (b) => (live(b) ? b.roomValue + b.experiencesValue : 0));
  const cancelled = scaleVol(BASE.cancelled, r) + delta(s, (b) => (live(b) ? 0 : 1));
  return { bookings, value, cancelPct: bookings ? (cancelled / bookings) * 100 : 0, cpa: scaleCpa(BASE.cpa, r) };
}
export function creatorRows(s: MarketState, r: Range = '30') {
  return Object.entries(CREATOR_BASE).map(([id, base]) => {
    const mine = (f: (b: MBooking) => number) => delta(s, (b) => (b.creatorId === id ? f(b) : 0));
    const bookings = scaleVol(base.bookings, r) + mine((b) => (live(b) ? 1 : 0));
    const value = scaleVol(base.value, r) + mine((b) => (live(b) ? b.roomValue + b.experiencesValue : 0));
    const visits = scaleVol(base.visits, r);
    return { id, handle: s.creators[id]?.handle ?? id, short: SHORT_LABEL[id] ?? s.creators[id]?.name.split(' ')[0] ?? id, visits, bookings, conv: visits ? (bookings / visits) * 100 : 0, value, cpa: scaleCpa(base.cpa, r) };
  });
}
export const SHORT_LABEL: Record<string, string> = { food: 'Food' };
export function payoutFigures(s: MarketState, r: Range = '30') {
  const commission = scaleVol(BASE.commissionMonth, r) + delta(s, (b) => (live(b) ? bookingCommission(s, b) : 0));
  const waived = scaleVol(BASE.waived, r) + delta(s, (b) => (live(b) ? 0 : pctOf(b.roomValue, s.hotel.commissionPct)));
  const next = 482300 + delta(s, (b) => (b.status === 'completed' ? b.roomValue - bookingCommission(s, b) : 0));
  return { commission, waived, next };
}
/** Statements for the quarter view: the four in the store plus eight earlier weeks (deterministic mock). */
export function statementsFor(s: MarketState, r: Range): MSettlement[] {
  const mine = s.settlements.filter((x) => x.hotelId === s.hotel.id);
  if (r === '7') return mine.slice(0, 1);
  if (r === '30') return mine;
  const older = ['Oct 5 – 11', 'Sep 28 – Oct 4', 'Sep 21 – 27', 'Sep 14 – 20', 'Sep 7 – 13', 'Aug 31 – Sep 6', 'Aug 24 – 30', 'Aug 17 – 23'].map((period, i) => {
    const stays = 14 + ((i * 5) % 9); const gross = stays * 19_000 + i * 3_100; const commission = pctOf(gross, 15);
    return { id: `old${i}`, hotelId: s.hotel.id, period, stays, gross, commission, net: gross - commission };
  });
  return [...mine, ...older];
}

/** Bookings that came through a campaign's stay, plus the campaign's earlier history (design: 38 of 60 for the sample campaign). */
export function campaignProgress(s: MarketState, c: MCampaign) {
  const fromStore = s.bookings.filter((b) => {
    if (b.hotelId !== c.hotelId || !live(b) || b.createdAt < c.createdAt && c.id !== 'winter-pichola') return false;
    const stay = s.trips.find((t) => t.id === b.tripId)?.stays.find((x) => x.id === b.stayId);
    return stay?.campaignId === c.id;
  }).length;
  const history = c.id === 'winter-pichola' ? 33 : 0;
  const done = history + fromStore;
  return { done, target: c.bookingTarget, pct: Math.min(100, Math.round((done / Math.max(1, c.bookingTarget)) * 100)) };
}
export const paceLabel = (done: number, pct: number) => (done === 0 ? 'just launched' : pct >= 40 ? 'on pace' : 'behind pace');

/* ---------- Creators ---------- */
export const PRONOUN: Record<string, string> = { anaya: 'Her', riya: 'Her', mia: 'Her', kabir: 'His', hari: 'His' };
export const SHORT_NICHE: Record<string, string> = { 'Weekend escapes': 'Weekends', 'Food and culture': 'Food', 'Solo travel': 'Solo' };
/** Creators the console can recommend (those with a match score), as the design lists them. */
export const matchedCreators = (s: MarketState): MCreator[] => Object.values(s.creators).filter((c) => c.score);
export const scoreNum = (c: MCreator, key: 'score' | 'campaignScore' = 'score') => parseInt(c[key] ?? '0', 10);
/** Creators shown in the campaign builder, ranked by their campaign match. */
export const campaignPool = (s: MarketState): MCreator[] => Object.values(s.creators).filter((c) => c.campaignScore).sort((a, b) => scoreNum(b, 'campaignScore') - scoreNum(a, 'campaignScore'));
export const liveCampaigns = (s: MarketState) => s.campaigns.filter((c) => c.hotelId === s.hotel.id && c.status === 'live');

export type DecisionKind = 'unsold' | 'accepted' | 'countered' | 'declined';
export interface Decision { key: string; kind: DecisionKind; campaignId?: string; creatorId?: string }
/** Everything on "Needs your decision", derived from the store. `dismissed` hides items for the session. */
export function decisions(s: MarketState, dismissed: string[]): Decision[] {
  const out: Decision[] = [];
  if (unsoldRooms(s, 'lake-deluxe') > 0) out.push({ key: 'unsold', kind: 'unsold' });
  for (const c of liveCampaigns(s)) {
    for (const [creatorId, st] of Object.entries(c.invites)) {
      if (st === 'invited') continue;
      out.push({ key: `${c.id}:${creatorId}:${st}`, kind: st, campaignId: c.id, creatorId });
    }
  }
  const order: Record<DecisionKind, number> = { countered: 0, unsold: 1, accepted: 2, declined: 3 };
  return out.filter((d) => !dismissed.includes(d.key)).sort((a, b) => order[a.kind] - order[b.kind]);
}

/* ---------- GST invoice download ---------- */
export function invoiceHtml(s: MarketState, st: MSettlement, no: number): string {
  const gst = pctOf(st.commission, 18);
  const row = (a: string, b: string) => `<tr><td>${a}</td><td style="text-align:right">${b}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>GST invoice SS-INV-${no}</title>
<style>body{font:14px/1.5 Inter,Arial,sans-serif;max-width:640px;margin:40px auto;color:#14212b}h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:8px 0;border-bottom:1px solid #e1e6ea}.m{color:#5b6770}</style></head><body>
<h1>Tax invoice SS-INV-${no}</h1><div class="m">StayStory Technologies · commission for ${st.period}</div>
<p><b>Billed to</b><br>${s.hotel.name}, ${s.hotel.city}<br>GSTIN ${s.hotel.profile?.gstin ?? 'not provided'}</p>
<table>${row('Stays completed', String(st.stays))}${row('Room value (gross)', formatINR(st.gross))}${row(`Acquisition commission at ${s.hotel.commissionPct}%`, formatINR(st.commission))}${row('GST at 18% on commission', formatINR(gst))}${row('<b>Commission and GST payable</b>', `<b>${formatINR(st.commission + gst)}</b>`)}${row('Net settled to your bank', formatINR(st.net))}</table>
<p class="m">Settled every Monday. Commission is charged only on completed stays and waived on cancellations.</p></body></html>`;
}
export function downloadText(name: string, text: string, type = 'text/html') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Stay lifecycle copy ---------- */
export const STATUS_LABEL = { upcoming: 'Upcoming', in_house: 'In house', completed: 'Completed', cancelled: 'Cancelled' } as const;
export const STATUS_TONE = { upcoming: 'info', in_house: 'warning', completed: 'success', cancelled: 'danger' } as const;
export const commissionLabel = (s: MarketState, b: MBooking) => (b.status === 'cancelled' ? 'Waived' : formatINR(bookingCommission(s, b)));

/** Bookings created in the last N days, or whose stay has not ended before that window began. Stays are in 2026. */
export function inRange(b: MBooking, r: Range, now = new Date()): boolean {
  const from = now.getTime() - Number(r) * 86_400_000;
  if (new Date(b.createdAt).getTime() >= from) return true;
  const m = /^([A-Za-z]{3}) (\d{1,2}) – (?:([A-Za-z]{3}) )?(\d{1,2})$/.exec(b.datesLabel.trim());
  if (!m) return true;
  const m1 = MONTHS.indexOf(m[1]!); const m2 = m[3] ? MONTHS.indexOf(m[3]) : m1;
  if (m1 < 0 || m2 < 0) return true;
  const end = new Date(2026 + (m2 < m1 ? 1 : 0), m2, Number(m[4]), 23, 59).getTime();
  return end >= from;
}
