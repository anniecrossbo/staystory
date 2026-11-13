export type Tier = "budget" | "mid" | "premium";

export interface City {
  id: string;
  name: string;
  knownPlaces: string[];
  lat?: number;
  lng?: number;
}

export interface Hotel {
  id: string;
  name: string;
  cityId: string;
  area: string;
  tier: Tier;
  rate: number; // per room per night, ₹
  commissionPct: number; // e.g. 0.15
  totalRooms: number;
  roomTypes: string[];
}

export interface Activity {
  id: string;
  cityId: string;
  name: string;
  kind: "activity" | "transfer";
  price: number; // ₹ per person, or per car for transfers
  keywords: string[];
}

export interface Creator {
  id: string;
  handle: string;
  name: string;
  initials: string;
  shareOfValue: number; // creator share of booking value, e.g. 0.08
  tags: string[];
  audience: string;
  isDemoUser?: boolean;
}

export interface Stop {
  id: string;
  label: string;
  kind: "free" | "activity" | "transfer";
  activityId?: string;
}

export interface Day {
  title: string;
  stops: Stop[];
}

export interface Extraction {
  destination: string | null;
  days: number | null;
  places: string[];
  budgetPerPerson: number | null;
  namedStay: string | null;
  style: string[];
  title: string | null;
}

export type ExtractionSource = "openai" | "claude" | "cache" | "rules";

export interface Trip {
  id: string;
  creatorId: string;
  slug: string;
  title: string;
  cityId: string;
  nights: number;
  days: Day[];
  recommendedHotelId: string;
  budgetHotelId?: string;
  premiumHotelId?: string;
  unmatchedStay?: string;
  style: string[];
  status: "draft" | "published";
  reelUrl: string;
  caption: string;
  source: ExtractionSource;
  baselineVisits: number;
  baselineSaves: number;
  createdAt: string;
}

export type BookingStatus = "pending" | "completed" | "cancelled";

export interface PriceLine {
  label: string;
  amount: number;
}

export interface Booking {
  id: string;
  tripId: string;
  hotelId: string;
  creatorId: string | null;
  selfBooking: boolean;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  rooms: number;
  travelers: number;
  roomRate: number;
  activityIds: string[];
  lines: PriceLine[];
  value: number;
  hotelCommission: number;
  creatorShare: number;
  crossboShare: number;
  status: BookingStatus;
  hotelAcknowledged: boolean;
  gapReleaseId?: string;
  campaignId?: string;
  guestName: string;
  createdAt: string;
}

export interface Visit {
  tripId: string;
  creatorId: string;
  sessionId: string;
  at: string;
}

export interface Campaign {
  id: string;
  hotelId: string;
  name: string;
  validFrom: string;
  validTo: string;
  perks: string[];
  creatorPrice: number;
  commissionPct: number;
  audience: string[];
  invitedCreatorIds: string[];
  status: "draft" | "live";
  createdAt: string;
}

export interface GapRelease {
  id: string;
  hotelId: string;
  roomType: string;
  nights: string[]; // YYYY-MM-DD of each night
  rooms: number;
  roomsLeft: number;
  rate: number;
  endsAt: string;
  audience: string[];
  createdAt: string;
}

export interface Friend {
  id: string;
  name: string;
  initials: string;
  busy: { from: string; to: string }[];
}

export interface Traveler {
  id: string;
  name: string;
  initials: string;
  savedTripIds: string[];
  friends: Friend[];
}

export interface Store {
  cities: City[];
  hotels: Hotel[];
  activities: Activity[];
  creators: Creator[];
  trips: Trip[];
  bookings: Booking[];
  visits: Visit[];
  campaigns: Campaign[];
  gapReleases: GapRelease[];
  traveler: Traveler;
  demoHotelId: string;
  demoCreatorId: string;
  seq: number;
}
