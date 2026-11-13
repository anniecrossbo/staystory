import "server-only";
import { getStore } from "./store";
import { addDays, parseDay } from "./format";
import type { Booking, Campaign, Creator, GapRelease, Hotel, Traveler, Trip } from "./types";

/** Booking refs are sequential, so they order bookings by when they were made. */
export const bookingSeq = (b: Booking) => Number(b.id.split("-").pop());
export const newestFirst = (a: Booking, b: Booking) => bookingSeq(b) - bookingSeq(a);

export const getHotel = (id: string) => getStore().hotels.find((h) => h.id === id);
export const getCreator = (id: string | null | undefined) => getStore().creators.find((c) => c.id === id);
export const getCreatorByHandle = (handle: string) => getStore().creators.find((c) => c.handle === handle);
export const getTrip = (id: string) => getStore().trips.find((t) => t.id === id);
export const getCity = (id: string) => getStore().cities.find((c) => c.id === id);

export function getTripByHandleSlug(handle: string, slug: string): Trip | undefined {
  const c = getCreatorByHandle(handle);
  if (!c) return undefined;
  return getStore().trips.find((t) => t.creatorId === c.id && t.slug === slug);
}

export function tripVisits(tripId: string): number {
  const s = getStore();
  const trip = getTrip(tripId);
  return (trip?.baselineVisits ?? 0) + s.visits.filter((v) => v.tripId === tripId).length;
}

/** Bookings that count for creators and hotels: attributed, not self-booked. */
export const countsForCreator = (b: Booking) => !!b.creatorId && !b.selfBooking;

export type RateSource = "public" | "campaign" | "gap";

export function liveCampaignFor(hotelId: string, creatorId: string | null, checkIn?: string): Campaign | undefined {
  if (!creatorId) return undefined;
  return getStore().campaigns.find(
    (c) =>
      c.status === "live" &&
      c.hotelId === hotelId &&
      c.invitedCreatorIds.includes(creatorId) &&
      (!checkIn || (checkIn >= c.validFrom && checkIn <= c.validTo)),
  );
}

export function resolveRate(hotel: Hotel, creatorId: string | null, checkIn: string | undefined, gap?: GapRelease): { rate: number; source: RateSource; campaign?: Campaign } {
  if (gap && gap.hotelId === hotel.id) return { rate: gap.rate, source: "gap" };
  const campaign = liveCampaignFor(hotel.id, creatorId, checkIn);
  if (campaign) return { rate: campaign.creatorPrice, source: "campaign", campaign };
  return { rate: hotel.rate, source: "public" };
}

const WEEKDAY_LOAD = [0.6, 0.45, 0.35, 0.3, 0.5, 0.85, 0.92]; // Sun..Sat share of rooms booked elsewhere

export function occupancy(hotel: Hotel, night: string): { booked: number; free: number } {
  const base = Math.round(hotel.totalRooms * WEEKDAY_LOAD[parseDay(night).getUTCDay()]);
  const ours = getStore()
    .bookings.filter((b) => b.hotelId === hotel.id && b.status !== "cancelled" && b.checkIn <= night && b.checkOut > night)
    .reduce((s, b) => s + b.rooms, 0);
  const booked = Math.min(hotel.totalRooms, base + ours);
  return { booked, free: hotel.totalRooms - booked };
}

export function friendsFree(traveler: Traveler, nights: string[]) {
  const first = nights[0];
  const last = nights[nights.length - 1];
  return traveler.friends.filter((f) => !f.busy.some((r) => r.from <= last && r.to >= first));
}

export interface GapAlert {
  release: GapRelease;
  hotel: Hotel;
  trip: Trip;
  creator: Creator;
  checkIn: string;
  checkOut: string;
  freeFriends: Traveler["friends"];
  perPerson: number;
}

export function gapAlerts(): GapAlert[] {
  const s = getStore();
  const alerts: GapAlert[] = [];
  for (const r of s.gapReleases) {
    if (r.roomsLeft <= 0) continue;
    const hotel = getHotel(r.hotelId)!;
    const saved = s.traveler.savedTripIds.map(getTrip).filter((t): t is Trip => !!t && t.cityId === hotel.cityId);
    const trip = saved.find((t) => [t.recommendedHotelId, t.budgetHotelId, t.premiumHotelId].includes(hotel.id)) ?? saved[0];
    if (!trip) continue;
    const creator = getCreator(trip.creatorId)!;
    const checkIn = r.nights[0];
    const checkOut = addDays(r.nights[r.nights.length - 1], 1);
    // Two people share a room.
    const perPerson = Math.round((r.rate * r.nights.length) / 2);
    alerts.push({ release: r, hotel, trip, creator, checkIn, checkOut, freeFriends: friendsFree(s.traveler, r.nights), perPerson });
  }
  return alerts;
}

export function creatorStats(creatorId: string) {
  const s = getStore();
  const trips = s.trips.filter((t) => t.creatorId === creatorId && t.status === "published");
  const bookings = s.bookings.filter((b) => b.creatorId === creatorId && countsForCreator(b));
  const live = bookings.filter((b) => b.status !== "cancelled");
  const visits = trips.reduce((sum, t) => sum + tripVisits(t.id), 0);
  const saves = trips.reduce((sum, t) => sum + t.baselineSaves, 0);
  const pending = live.filter((b) => b.status === "pending").reduce((sum, b) => sum + b.creatorShare, 0);
  const confirmed = live.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.creatorShare, 0);
  const value = live.reduce((sum, b) => sum + b.value, 0);
  const perTrip = trips.map((t) => ({
    trip: t,
    visits: tripVisits(t.id),
    bookings: live.filter((b) => b.tripId === t.id).length,
  }));
  const bands = [
    { label: "Under ₹5,000", test: (pp: number) => pp < 5000 },
    { label: "₹5,000–10,000", test: (pp: number) => pp >= 5000 && pp <= 10000 },
    { label: "Over ₹10,000", test: (pp: number) => pp > 10000 },
  ].map((band) => ({ label: band.label, count: live.filter((b) => band.test(b.value / b.travelers)).length }));
  return {
    visits,
    saves,
    bookings: live.length,
    conversion: visits ? live.length / visits : 0,
    avgValue: live.length ? value / live.length : 0,
    pending,
    confirmed,
    recent: [...bookings].sort(newestFirst),
    perTrip: perTrip.sort((a, b) => b.bookings - a.bookings),
    bands,
  };
}

export function hotelStats(hotelId: string) {
  const s = getStore();
  const all = s.bookings.filter((b) => b.hotelId === hotelId && countsForCreator(b));
  const live = all.filter((b) => b.status !== "cancelled");
  const value = live.reduce((sum, b) => sum + b.value, 0);
  const commission = live.reduce((sum, b) => sum + b.hotelCommission, 0);
  const guests = live.reduce((sum, b) => sum + b.travelers, 0);
  const creatorIds = [...new Set(all.map((b) => b.creatorId!))];
  const byCreator = creatorIds
    .map((cid) => {
      const views = s.trips
        .filter((t) => t.creatorId === cid && [t.recommendedHotelId, t.budgetHotelId, t.premiumHotelId].includes(hotelId))
        .reduce((sum, t) => sum + tripVisits(t.id), 0);
      const cb = live.filter((b) => b.creatorId === cid);
      return { creator: getCreator(cid)!, views, bookings: cb.length, value: cb.reduce((sum, b) => sum + b.value, 0), conversion: views ? cb.length / views : 0 };
    })
    .sort((a, b) => b.value - a.value);
  const newest = [...all].sort(newestFirst)[0];
  return {
    bookings: live.length,
    value,
    commission,
    guests,
    costPerGuest: guests ? commission / guests : 0,
    cancellationRate: all.length ? (all.length - live.length) / all.length : 0,
    byCreator,
    newest,
    unacknowledged: all.filter((b) => !b.hotelAcknowledged && b.status !== "cancelled"),
  };
}

export function matchedCreators(campaign: Campaign) {
  const s = getStore();
  return s.creators
    .map((c) => {
      const withHotel = s.bookings.filter((b) => b.creatorId === c.id && b.hotelId === campaign.hotelId && b.status !== "cancelled" && !b.selfBooking);
      const views = s.trips
        .filter((t) => t.creatorId === c.id && [t.recommendedHotelId, t.budgetHotelId, t.premiumHotelId].includes(campaign.hotelId))
        .reduce((sum, t) => sum + tripVisits(t.id), 0);
      const city = getCity(getHotel(campaign.hotelId)!.cityId)!;
      const postsCity = s.trips.some((t) => t.creatorId === c.id && t.cityId === city.id);
      const fit = c.tags.filter((tag) => campaign.audience.includes(tag));
      const reasons = [...(postsCity ? [`Posts ${city.name}`] : []), ...fit, `Audience in ${c.audience}`];
      return {
        creator: c,
        bookings: withHotel.length,
        conversion: views ? withHotel.length / views : null,
        reasons,
        score: withHotel.length * 3 + fit.length + (postsCity ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score);
}
