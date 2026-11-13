import { hotelCommission, creatorCommission } from '@staystory/core';
import type { MBooking, MGapNight, MarketState } from './types';

export const hotelBookings = (s: MarketState) => s.bookings.filter((b) => b.hotelId === s.hotel.id);
/** Offers a creator has received, newest first. */
export const creatorOffers = (s: MarketState, creatorId: string) => s.campaigns.filter((c) => c.invites[creatorId]).map((c) => ({ campaign: c, status: c.invites[creatorId]!, counter: c.counters[creatorId] }));
export const hotelCommissionPct = (s: MarketState, b: MBooking) => {
  const c = s.campaigns.find((x) => x.hotelId === b.hotelId && x.roomTypeId === b.roomTypeId && x.agreedPct[b.creatorId]);
  return c?.agreedPct[b.creatorId] ?? s.hotel.commissionPct;
};
export const bookingCommission = (s: MarketState, b: MBooking) => hotelCommission(b.roomValue, hotelCommissionPct(s, b), b.status === 'cancelled');
export const bookingCreatorShare = (b: MBooking) => (b.status === 'cancelled' ? 0 : creatorCommission(b.total));

export function creatorBalances(s: MarketState, creatorId: string) {
  const mine = s.ledger.filter((l) => l.creatorId === creatorId);
  const sum = (st: string) => mine.filter((l) => l.status === st).reduce((t, l) => t + l.amount, 0);
  return { available: sum('available'), pending: sum('pending_stay'), paid: sum('paid') };
}

/** A live Gap Night the traveler should be alerted about: it covers a trip they saved and rooms are left. */
export function gapAlertFor(s: MarketState, travelerId: string): MGapNight | undefined {
  const t = s.travelers[travelerId];
  if (!t || !t.prefs.gapAlerts) return undefined;
  return s.gapNights.find((g) => g.status === 'live' && g.booked < g.rooms && g.tripIds.some((id) => t.savedTripIds.includes(id)));
}
export const attributionFor = (s: MarketState, travelerId: string, now = new Date()) => {
  const a = s.attributions.find((x) => x.travelerId === travelerId);
  return a && new Date(a.expiresAt) > now ? a : undefined;
};
export const liveTrips = (s: MarketState) => s.trips.filter((t) => t.status === 'live');
export const tripByCreatorSlug = (s: MarketState, creator: string, slug: string) => s.trips.find((t) => t.creatorId === creator && t.slug === slug);
export const campaignForStay = (s: MarketState, hotelId: string) => s.campaigns.find((c) => c.hotelId === hotelId && c.status === 'live');

/** Real, de-duplicated visits to a trip (the seeded baselines are separate). */
export const tripVisitCount = (s: MarketState, tripId: string) => (s.visits ?? []).filter((v) => v.tripId === tripId).length;

/** Comments on a trip's reel, newest first, and whether the follower has been DMed the trip. */
export const reelComments = (s: MarketState, tripId: string) => (s.reelComments ?? []).filter((c) => c.tripId === tripId);
export const dmSentTo = (s: MarketState, tripId: string, travelerId: string) => (s.reelComments ?? []).some((c) => c.tripId === tripId && c.travelerId === travelerId && c.dmSent);

/** Comments that got the follower the trip in their DMs. */
export const tripDmCount = (s: MarketState, tripId: string) => (s.reelComments ?? []).filter((c) => c.tripId === tripId && c.dmSent).length;
