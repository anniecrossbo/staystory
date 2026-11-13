"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore, newId, nextBookingId, resetStore } from "@/lib/store";
import { getCreator, getHotel, getTrip, occupancy, resolveRate } from "@/lib/queries";
import { getAttribution, getRole, type Role, ATTRIBUTION_WINDOW_DAYS } from "@/lib/session";
import { extract } from "@/lib/agent";
import { buildTrip } from "@/lib/builder";
import { computeSplit, priceTrip } from "@/lib/pricing";
import { addDays, nightsBetween } from "@/lib/format";
import { searchHotels } from "@/lib/liteapi";
import type { HotelSearchResult } from "@/contracts/hotel-search";
import type { Day, ExtractionSource } from "@/lib/types";

const refresh = () => revalidatePath("/", "layout");

export async function setRole(role: Role) {
  cookies().set("cb_role", role, { path: "/", sameSite: "lax" });
  refresh();
}

export async function resetDemo() {
  resetStore();
  cookies().delete("cb_attr");
  cookies().delete("cb_sid");
  refresh();
}

export type AgentResult =
  | { ok: true; tripId: string; source: ExtractionSource; note?: string }
  | { ok: false; reason: "no_destination" | "unknown_city" | "empty"; destination?: string | null };

export async function createTripFromReel(input: { reelUrl: string; caption: string; cityOverride?: string }): Promise<AgentResult> {
  const caption = input.caption.trim();
  if (!caption && !input.cityOverride) return { ok: false, reason: "empty" };
  const s = getStore();
  const { extraction, source, note } = await extract(caption, input.reelUrl.trim());
  if (input.cityOverride) extraction.destination = input.cityOverride;
  const res = buildTrip({
    extraction,
    creatorId: s.demoCreatorId,
    reelUrl: input.reelUrl.trim(),
    caption,
    source,
    id: newId("t"),
    existingSlugs: s.trips.filter((t) => t.creatorId === s.demoCreatorId).map((t) => t.slug),
  });
  if (!res.ok) return { ok: false, reason: res.reason, destination: res.destination };
  s.trips.push(res.trip);
  refresh();
  return { ok: true, tripId: res.trip.id, source, note };
}

export async function searchLiveHotels(input: {
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
}): Promise<{ hotels: HotelSearchResult[]; source: "liteapi" | "fallback"; note?: string }> {
  return searchHotels({
    cityName: input.cityName,
    countryCode: "IN",
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: input.adults,
    currency: "INR",
  });
}

export async function updateTrip(tripId: string, patch: { title: string; days: Day[]; recommendedHotelId: string }) {
  const trip = getTrip(tripId);
  if (!trip) throw new Error("Trip not found");
  const hotel = getHotel(patch.recommendedHotelId);
  if (!hotel || hotel.cityId !== trip.cityId) throw new Error("Pick a stay in this city");
  const s = getStore();
  trip.title = patch.title.trim() || trip.title;
  trip.days = patch.days.map((d) => ({ title: d.title, stops: d.stops.map((st) => ({ ...st })) }));
  if (trip.recommendedHotelId !== hotel.id) {
    trip.recommendedHotelId = hotel.id;
    trip.unmatchedStay = undefined;
    const others = s.hotels.filter((h) => h.cityId === trip.cityId && h.id !== hotel.id);
    trip.budgetHotelId = others.filter((h) => h.tier === "budget").sort((a, b) => a.rate - b.rate)[0]?.id;
    trip.premiumHotelId = others.filter((h) => h.tier === "premium").sort((a, b) => b.rate - a.rate)[0]?.id;
  }
  refresh();
}

export async function publishTrip(tripId: string, patch: { title: string; days: Day[]; recommendedHotelId: string }) {
  await updateTrip(tripId, patch);
  const trip = getTrip(tripId)!;
  trip.status = "published";
  refresh();
  redirect(`/creator/trips/${tripId}/share`);
}

/** Counts a visit once per browser session and makes this creator the last-click owner. */
export async function recordVisit(tripId: string) {
  const trip = getTrip(tripId);
  if (!trip || trip.status !== "published") return;
  const s = getStore();
  const jar = cookies();
  let sid = jar.get("cb_sid")?.value;
  if (!sid) {
    sid = newId("sid");
    jar.set("cb_sid", sid, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  const isSelf = getRole() === "creator" && trip.creatorId === s.demoCreatorId;
  if (isSelf) return;
  if (!s.visits.some((v) => v.tripId === tripId && v.sessionId === sid)) {
    s.visits.push({ tripId, creatorId: trip.creatorId, sessionId: sid, at: new Date().toISOString() });
  }
  jar.set("cb_attr", JSON.stringify({ creatorId: trip.creatorId, tripId, at: new Date().toISOString() }), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * ATTRIBUTION_WINDOW_DAYS,
  });
  refresh();
}

export async function toggleSave(tripId: string) {
  const s = getStore();
  const trip = getTrip(tripId);
  if (!trip) return;
  const saved = s.traveler.savedTripIds;
  if (saved.includes(tripId)) {
    s.traveler.savedTripIds = saved.filter((id) => id !== tripId);
    trip.baselineSaves = Math.max(0, trip.baselineSaves - 1);
  } else {
    saved.push(tripId);
    trip.baselineSaves += 1;
  }
  refresh();
}

export interface BookingInput {
  tripId: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  travelers: number;
  activityIds: string[];
  gapId?: string;
}

export async function createBooking(input: BookingInput): Promise<{ error: string } | void> {
  const s = getStore();
  const trip = getTrip(input.tripId);
  const hotel = getHotel(input.hotelId);
  if (!trip || !hotel || hotel.cityId !== trip.cityId) return { error: "That stay isn't available for this trip." };
  const travelers = Math.round(input.travelers);
  if (!(travelers >= 1 && travelers <= 12)) return { error: "Choose between 1 and 12 travelers." };

  let { checkIn, checkOut } = input;
  const gap = input.gapId ? s.gapReleases.find((g) => g.id === input.gapId) : undefined;
  if (gap) {
    checkIn = gap.nights[0];
    checkOut = addDays(gap.nights[gap.nights.length - 1], 1);
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (!checkIn || !checkOut || nights < 1) return { error: "Pick a check-out date after check-in." };

  const attribution = getAttribution();
  const creatorId = attribution?.creatorId ?? null;
  const creator = getCreator(creatorId);
  const selfBooking = getRole() === "creator" && creatorId === s.demoCreatorId;
  const { rate, campaign } = resolveRate(hotel, creatorId, checkIn, gap && gap.hotelId === hotel.id ? gap : undefined);
  const activities = s.activities.filter((a) => a.cityId === trip.cityId && input.activityIds.includes(a.id));
  const price = priceTrip({ roomRate: rate, nights, travelers, activities });
  if (gap && gap.hotelId === hotel.id && gap.roomsLeft < price.rooms) {
    return { error: `Only ${gap.roomsLeft} Gap Night ${gap.roomsLeft === 1 ? "room is" : "rooms are"} left. Lower the number of travelers.` };
  }
  const split = computeSplit(price.total, hotel.commissionPct, creator?.shareOfValue ?? 0, !!creator && !selfBooking);

  const id = nextBookingId(trip.cityId);
  s.bookings.push({
    id,
    tripId: trip.id,
    hotelId: hotel.id,
    creatorId,
    selfBooking,
    checkIn,
    checkOut,
    rooms: price.rooms,
    travelers,
    roomRate: rate,
    activityIds: activities.map((a) => a.id),
    lines: price.lines,
    value: price.total,
    hotelCommission: split.hotelCommission,
    creatorShare: split.creatorShare,
    crossboShare: split.crossboShare,
    status: "pending",
    hotelAcknowledged: false,
    gapReleaseId: gap?.id,
    campaignId: campaign?.id,
    guestName: `${s.traveler.name} K.`,
    createdAt: new Date().toISOString(),
  });
  if (gap && gap.hotelId === hotel.id) gap.roomsLeft -= price.rooms;
  refresh();
  redirect(`/bookings/${id}`);
}

function findBooking(id: string) {
  const b = getStore().bookings.find((x) => x.id === id);
  if (!b) throw new Error("Booking not found");
  return b;
}

export async function acknowledgeBooking(id: string) {
  findBooking(id).hotelAcknowledged = true;
  refresh();
}

export async function completeStay(id: string) {
  const b = findBooking(id);
  if (b.status === "pending") b.status = "completed";
  b.hotelAcknowledged = true;
  refresh();
}

export async function cancelBooking(id: string) {
  const b = findBooking(id);
  if (b.status !== "pending") return;
  b.status = "cancelled";
  b.hotelAcknowledged = true;
  const gap = b.gapReleaseId ? getStore().gapReleases.find((g) => g.id === b.gapReleaseId) : undefined;
  if (gap) gap.roomsLeft += b.rooms;
  refresh();
}

export interface CampaignInput {
  name: string;
  validFrom: string;
  validTo: string;
  perks: string[];
  creatorPrice: number;
  commissionPct: number;
  audience: string[];
}

export async function createCampaign(input: CampaignInput): Promise<{ error: string } | void> {
  const s = getStore();
  if (!input.name.trim()) return { error: "Give the campaign a name." };
  if (!input.validFrom || !input.validTo || input.validTo < input.validFrom) return { error: "Set an end date after the start date." };
  if (!(input.creatorPrice > 0)) return { error: "Set a creator price per night." };
  if (!(input.commissionPct >= 5 && input.commissionPct <= 30)) return { error: "Commission must be between 5% and 30%." };
  const id = newId("cmp");
  s.campaigns.push({
    id,
    hotelId: s.demoHotelId,
    name: input.name.trim(),
    validFrom: input.validFrom,
    validTo: input.validTo,
    perks: input.perks,
    creatorPrice: Math.round(input.creatorPrice),
    commissionPct: input.commissionPct / 100,
    audience: input.audience,
    invitedCreatorIds: [],
    status: "draft",
    createdAt: new Date().toISOString(),
  });
  refresh();
  redirect(`/hotel/campaigns/${id}`);
}

export async function launchCampaign(id: string, creatorIds: string[]) {
  const c = getStore().campaigns.find((x) => x.id === id);
  if (!c) throw new Error("Campaign not found");
  c.invitedCreatorIds = creatorIds;
  c.status = "live";
  refresh();
}

export interface GapInput {
  roomType: string;
  nights: string[];
  rooms: number;
  rate: number;
  endsAt: string;
  audience: string[];
}

export async function releaseGap(input: GapInput): Promise<{ error: string } | void> {
  const s = getStore();
  const hotel = getHotel(s.demoHotelId)!;
  const nights = [...input.nights].sort();
  if (!nights.length) return { error: "Pick at least one night." };
  for (let i = 1; i < nights.length; i++) {
    if (addDays(nights[i - 1], 1) !== nights[i]) return { error: "Pick nights in a row, so guests can book one stay." };
  }
  if (!(input.rooms >= 1)) return { error: "Release at least one room." };
  const minFree = Math.min(...nights.map((n) => occupancy(hotel, n).free));
  if (input.rooms > minFree) return { error: `Only ${minFree} rooms are free on every selected night.` };
  if (!(input.rate > 0 && input.rate < hotel.rate)) return { error: `Set a Gap Night rate below your public rate of ₹${hotel.rate}.` };
  const id = newId("gap");
  s.gapReleases.push({
    id,
    hotelId: hotel.id,
    roomType: input.roomType,
    nights,
    rooms: Math.round(input.rooms),
    roomsLeft: Math.round(input.rooms),
    rate: Math.round(input.rate),
    endsAt: input.endsAt,
    audience: input.audience,
    createdAt: new Date().toISOString(),
  });
  refresh();
  redirect(`/hotel/gap-night?released=${id}`);
}
