import { matchesKeyword } from '@staystory/core';
import { reelComments } from './selectors';
import { tripStats, countLabel, conversionLabel, type TripStats } from './creator';
import type { MTrip, MarketState } from './types';

/**
 * One Instagram reel. The reel catalog is static; everything else is derived from the marketplace store.
 *
 * MOCK: views, likes, comments, shares, saves, keywordComments and dmsSent below are mock Instagram figures
 * standing in for the creator's connected Instagram account (there is no real connection in this build).
 * The Udaipur numbers match the traveler's Instagram mock. The rest follow the same ratios: comments about 1%
 * of views, keyword comments about 28% of comments, DMs about 97% of keyword comments, likes about 7% of views.
 * Reels with no trip have no keyword comments or DMs, because nothing answers them.
 */
export interface MReelPost {
  id: string; creatorId: string; place: string; img: string;
  views: number; likes: number; comments: number; shares: number; saves: number;
  postedLabel: string; url: string; tripId?: string;
  /** Seeded baseline of comments that matched the trip keyword. Real comments from the store are added on top. */
  keywordComments: number;
  /** Seeded baseline of keyword comments answered with a DM. */
  dmsSent: number;
}

const reel = (id: string, place: string, views: number, likes: number, comments: number, shares: number, saves: number, postedLabel: string, tripId: string | undefined, keywordComments: number, dmsSent: number): MReelPost =>
  ({ id, creatorId: 'anaya', place, img: id, views, likes, comments, shares, saves, postedLabel, url: `instagram.com/reel/${id}`, tripId, keywordComments, dmsSent });

export const SEED_REELS: MReelPost[] = [
  reel('udaipur', 'Udaipur', 1_200_000, 84_200, 12_400, 9_100, 21_000, 'Oct 20', 'anaya-udaipur', 3_420, 3_310),
  reel('coorg', 'Coorg', 640_000, 44_800, 6_400, 4_300, 9_800, 'Sep 12', 'anaya-coorg', 1_790, 1_736),
  reel('jodhpur', 'Jodhpur', 310_000, 21_700, 3_100, 2_000, 4_600, 'Aug 28', 'anaya-jodhpur', 868, 842),
  reel('pushkar', 'Pushkar', 220_000, 15_400, 2_200, 1_400, 3_100, 'Aug 9', undefined, 0, 0),
  reel('hampi', 'Hampi', 180_000, 12_600, 1_800, 1_200, 2_600, 'Jul 21', undefined, 0, 0),
  reel('gokarna', 'Gokarna', 96_000, 6_700, 960, 600, 1_400, 'Jun 30', undefined, 0, 0),
];

/** 1.2M, 640K, 96K, 950. */
export function compactCount(n: number): string {
  const f = (v: number, unit: string) => `${(Math.round(v * 10) / 10).toString()}${unit}`;
  return n >= 1_000_000 ? f(n / 1_000_000, 'M') : n >= 1_000 ? f(n / 1_000, 'K') : String(n);
}

export interface ReelFunnelRow { label: string; value: number; w: number }
export interface ReelInsights {
  reel: MReelPost; trip?: MTrip; stats?: TripStats;
  views: number; likes: number; comments: number; shares: number; saves: number;
  keywordComments: number; dms: number; visits: number; tripSaves: number; booked: number; commission: number;
  funnel: ReelFunnelRow[]; openRate: string;
}

/** A reel's trip: the one it names, else a trip this creator published for the same place. */
function tripOf(s: MarketState, r: MReelPost): MTrip | undefined {
  return s.trips.find((t) => t.id === r.tripId) ?? s.trips.find((t) => t.creatorId === r.creatorId && t.place.toLowerCase() === r.place.toLowerCase());
}

export function reelInsights(s: MarketState, reelId: string): ReelInsights | undefined {
  const r = SEED_REELS.find((x) => x.id === reelId);
  if (!r) return undefined;
  const trip = tripOf(s, r);
  const stats = trip ? tripStats(s, trip.id) : undefined;
  let keywordComments = 0; let dms = 0; let visits = 0; let tripSaves = 0; let booked = 0; let commission = 0;
  if (trip && stats) {
    const real = reelComments(s, trip.id);
    // A comment counts as a keyword comment if it matches now or it was already answered with a DM (so turning auto-DM off keeps history).
    keywordComments = r.keywordComments + real.filter((c) => c.dmSent || matchesKeyword(c.text, trip.dmKeyword)).length;
    dms = r.dmsSent + real.filter((c) => c.dmSent).length;
    visits = stats.visits; tripSaves = stats.saves; booked = stats.booked;
    commission = stats.byStay.reduce((n, x) => n + x.earn, 0);
  }
  const w = (v: number) => (r.views ? Math.max(v ? 2 : 0, Math.round(100 * Math.sqrt(v / r.views))) : 0);
  const funnel: ReelFunnelRow[] = [
    { label: 'Views', value: r.views, w: r.views ? 100 : 0 }, { label: 'Commented your keyword', value: keywordComments, w: w(keywordComments) },
    { label: 'Got your DM', value: dms, w: w(dms) }, { label: 'Opened the trip', value: visits, w: w(visits) },
    { label: 'Saved the trip', value: tripSaves, w: w(tripSaves) }, { label: 'Booked', value: booked, w: w(booked) },
  ];
  return { reel: r, trip, stats, views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, saves: r.saves, keywordComments, dms, visits, tripSaves, booked, commission, funnel, openRate: conversionLabel(visits, r.views) };
}

export interface ReelRow { id: string; reel: MReelPost; place: string; img: string; views: number; dms: number; bookings: number; commission: number; hasTrip: boolean; tripId?: string; topEarner: boolean; noTrip: boolean }

/** Reels sorted by commission earned, then views. The top row is flagged when it has earned anything. */
export function reelRows(s: MarketState, creatorId: string): ReelRow[] {
  const rows = SEED_REELS.filter((r) => r.creatorId === creatorId).map((r) => {
    const i = reelInsights(s, r.id)!;
    return { id: r.id, reel: r, place: r.place, img: r.img, views: i.views, dms: i.dms, bookings: i.booked, commission: i.commission, hasTrip: !!i.trip, tripId: i.trip?.id, topEarner: false, noTrip: !i.trip };
  });
  rows.sort((a, b) => b.commission - a.commission || b.views - a.views);
  if (rows[0] && rows[0].commission > 0) rows[0].topEarner = true;
  return rows;
}

const plural = (n: number, one: string, many: string) => `${countLabel(n)} ${n === 1 ? one : many}`;
/** "1.2M views · 3,310 DMs · 28 bookings"; a reel with no trip only has views. */
export const reelCaption = (r: ReelRow) => [`${compactCount(r.views)} views`, ...(r.hasTrip ? [plural(r.dms, 'DM', 'DMs'), plural(r.bookings, 'booking', 'bookings')] : [])].join(' · ');
