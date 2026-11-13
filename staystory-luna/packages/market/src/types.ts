import type { Rupees } from '@staystory/core';

export type InviteStatus = 'invited' | 'accepted' | 'countered' | 'declined';

export interface MCreator {
  id: string; handle: string; name: string; ini: string; followers: string; niche: string; bio: string;
  tripsCount: string; travelers: string; hue: 'moss' | 'sky' | 'plum' | 'ochre' | 'violet' | 'clay'; cover: string;
  score?: string; conv?: string; bookingsPerMonth?: string; ncr?: string; why?: string; top?: boolean; meta?: string;
}

/** Optional property details captured by the hotel onboarding flow. Additive: other apps can ignore it. */
export interface HotelProfile {
  region?: string; category?: string; description?: string; totalRooms?: number;
  /** Asset paths or small data URLs. */
  photos?: string[];
  legalName?: string; gstin?: string; pan?: string; billingEmail?: string; accountNumber?: string; ifsc?: string;
  policies?: { payOnComplete: boolean; exclusiveRates: boolean; gapNight: boolean };
}

export interface MHotel {
  id: string; name: string; city: string; commissionPct: number; floorRate: Rupees;
  profile?: HotelProfile;
  rooms: { id: string; name: string; count: number; sleeps: number; rackRate: Rupees; meal: string }[];
  /** `draft` until the onboarding flow is submitted. */
  status: 'draft' | 'submitted';
  syncMode: 'api' | 'manual';
}

export interface MCampaign {
  id: string; hotelId: string; name: string; roomTypeId: string; windowLabel: string; nights: number; perks: string[];
  rackPrice: Rupees; creatorPrice: Rupees; commissionPct: number; bookingTarget: number;
  invites: Record<string, InviteStatus>;
  /** Commission % agreed with each creator (the campaign rate, or an accepted counter). */
  agreedPct: Record<string, number>;
  /** Present while an invite is `countered`. */
  counters: Record<string, { pct: number; message: string; extras: string[] }>;
  status: 'live' | 'paused' | 'ended';
  createdAt: string;
  /** Optional presentation details for the creator inbox. Derived from the hotel when absent. */
  meta?: { listTitle?: string; hotelName?: string; city?: string; when?: string; img?: string; headline?: string; perk?: string; why?: string; roomName?: string };
}

export interface MExperience { id: string; name: string; day: number; time: string; pricePerPerson: Rupees; img: string }
export interface MStay { id: string; hotelId: string; roomTypeId: string; name: string; tier: 'creator_pick' | 'budget' | 'mid' | 'luxury'; desc: string; nightly: Rupees; img: string; commissionPct: number; campaignId?: string; lat?: number; lng?: number }
export interface MStop { id: string; name: string; kind: string; bookable: boolean; pricePerPerson?: Rupees; time?: string; img?: string; lat?: number; lng?: number }
export interface MTrip {
  id: string; creatorId: string; slug: string; title: string; place: string; days: number; img: string;
  itinerary: { n: number; title: string; stops: MStop[] }[];
  stays: MStay[]; pickStayId: string; experiences: MExperience[];
  creatorSaving: Rupees; saves: number; travelersBooked: number; tags: string[];
  status: 'live' | 'paused'; reelUrl: string; dmKeyword: string; publishedAt: string;
}

export type BookingStatus = 'upcoming' | 'in_house' | 'completed' | 'cancelled';
export interface MBooking {
  id: string; travelerId: string; guestName: string; guestInitials: string; tripId: string; creatorId: string; hotelId: string;
  roomTypeId: string; roomName: string; stayId: string; datesLabel: string; nights: number; guests: number;
  roomValue: Rupees; experiencesValue: Rupees; creatorSaving: Rupees; total: Rupees; experienceIds: string[];
  source: 'link' | 'gap_night'; status: BookingStatus; createdAt: string; gapNightId?: string;
}

export interface MGapNight {
  id: string; hotelId: string; roomTypeId: string; datesLabel: string; rooms: number; booked: number; rate: Rupees; campaignRate: Rupees;
  audience: string[]; sentTo: number; createdAt: string; endsAt: string; status: 'live' | 'ended';
  /** Trips whose savers were alerted. */
  tripIds: string[];
}

export type LedgerStatus = 'pending_stay' | 'available' | 'paid' | 'cancelled' | 'processing';
export interface MLedger { id: string; creatorId: string; bookingId?: string; label: string; meta: string; amount: Rupees; status: LedgerStatus; createdAt: string }
export interface MWithdrawal { id: string; creatorId: string; gross: Rupees; tds: Rupees; net: Rupees; upi: string; createdAt: string }

export interface MTraveler { id: string; name: string; whatsapp: string; signedIn: boolean; savedTripIds: string[]; savedShopIds: string[]; followingIds: string[]; prefs: { styles: string[]; budget: 'low' | 'mid' | 'high'; gapAlerts: boolean; /** Price-drop and low-rooms alerts; on unless false. */ priceAlerts?: boolean } }
export interface MAttribution { travelerId: string; creatorId: string; tripId: string; openedAt: string; expiresAt: string }
export interface MReview { bookingId: string; tripId: string; hotelId: string; rating: number; matchesReel: 'spot' | 'mostly' | 'no'; tip: string; createdAt: string }
export interface MSettlement { id: string; hotelId: string; period: string; stays: number; gross: Rupees; commission: Rupees; net: Rupees }

export interface MarketState {
  v: 2;
  hotel: MHotel;
  creators: Record<string, MCreator>;
  campaigns: MCampaign[];
  trips: MTrip[];
  bookings: MBooking[];
  gapNights: MGapNight[];
  ledger: MLedger[];
  withdrawals: MWithdrawal[];
  travelers: Record<string, MTraveler>;
  attributions: MAttribution[];
  reviews: MReview[];
  settlements: MSettlement[];
  /** Counters for ids. */
  seq: { booking: number; trip: number; campaign: number; gap: number; ledger: number; withdrawal: number };
}
