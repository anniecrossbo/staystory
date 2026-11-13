import type { Experience, Rupees, TripStay } from './types';
import { pctOf } from './money';

export const roomValue = (nightlyRate: Rupees, nights: number): Rupees => nightlyRate * nights;

export const stayValue = (stay: Pick<TripStay, 'nightlyRate' | 'nights'>): Rupees =>
  roomValue(stay.nightlyRate, stay.nights);

/** Experience prices are per person. */
export const experiencesValue = (experiences: Pick<Experience, 'price'>[], guests = 2): Rupees =>
  experiences.reduce((sum, e) => sum + e.price * guests, 0);

export interface TripQuote {
  roomValue: Rupees;
  experiencesValue: Rupees;
  creatorSaving: Rupees;
  total: Rupees;
}

/** Total for a trip: stay + experiences − creator-exclusive saving. */
export function quoteTrip(input: {
  stays: Pick<TripStay, 'nightlyRate' | 'nights'>[];
  experiences: Pick<Experience, 'price'>[];
  creatorSaving?: Rupees;
  guests?: number;
}): TripQuote {
  const rooms = input.stays.reduce((s, st) => s + stayValue(st), 0);
  const exp = experiencesValue(input.experiences, input.guests);
  const saving = input.creatorSaving ?? 0;
  return { roomValue: rooms, experiencesValue: exp, creatorSaving: saving, total: rooms + exp - saving };
}

/** A Gap Night rate must be at or above the hotel floor and below the public (rack) rate. */
export function validateGapRate(rate: Rupees, floorRate: Rupees, rackRate: Rupees): string | null {
  if (rate < floorRate) return `Rate is below your floor of ${floorRate}`;
  if (rate > rackRate) return 'Rate is above the public rate';
  return null;
}

/** Saving on a booking made at a Gap Night rate versus the campaign (creator) rate. */
export function gapNightSaving(campaignNightlyRate: Rupees, gapNightlyRate: Rupees, nights: number): Rupees {
  return (campaignNightlyRate - gapNightlyRate) * nights;
}

export const percentOff = (rack: Rupees, price: Rupees): number => Math.round(((rack - price) / rack) * 100);

/** Creator commission is about 8% of the trip value. */
export const CREATOR_COMMISSION_PCT = 8;
export const DEFAULT_HOTEL_COMMISSION_PCT = 15;
export const HOLD_MINUTES = 30;

/** Hotel commission: a percentage of the room value only. Waived (0) on cancellations. */
export function hotelCommission(roomValueAmount: Rupees, pct: number, cancelled = false): Rupees {
  return cancelled ? 0 : pctOf(roomValueAmount, pct);
}

/** Creator commission: a percentage of the whole trip value. 0 if cancelled. */
export function creatorCommission(total: Rupees, pct = CREATOR_COMMISSION_PCT, cancelled = false): Rupees {
  return cancelled ? 0 : pctOf(total, pct);
}

/** Refund amount on cancellation. Full refund of what was paid, so it follows the booking total. */
export const refundAmount = (bookingTotal: Rupees): Rupees => bookingTotal;

/** Split of a booking, used in onboarding worked examples. */
export function bookingSplit(total: Rupees, roomValueAmount: Rupees, hotelPct: number) {
  const hotelComm = hotelCommission(roomValueAmount, hotelPct);
  const creator = creatorCommission(total);
  return { hotelCommission: hotelComm, creator, hotelNet: roomValueAmount - hotelComm };
}

export const holdExpiresAt = (from: Date): Date => new Date(from.getTime() + HOLD_MINUTES * 60_000);

/**
 * Split of a hotel commission on a booking. The creator earns about 8% of the booking value out of it
 * (capped at the whole commission); StayStory keeps the rest.
 */
export function splitCommission(bookingValue: Rupees, hotelPct: number) {
  const commission = pctOf(bookingValue, hotelPct);
  const creator = Math.min(creatorCommission(bookingValue), commission);
  return { commission, creator, staystory: commission - creator, hotelReceives: bookingValue - commission };
}
