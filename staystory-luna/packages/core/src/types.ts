export type Rupees = number; // whole rupees

export interface RoomType { id: string; name: string; count: number; sleeps: number; rackRate: Rupees; meal: string }
export interface Hotel {
  id: string; name: string; city: string; rooms: RoomType[];
  defaultCommissionPct: number; floorRate: Rupees; payoutAccount?: string;
}
export interface Campaign {
  id: string; hotelId: string; name: string; roomTypeId: string;
  window: { from: string; to: string }; nights: number; perks: string[];
  creatorPrice: Rupees; commissionPct: number; invitedCreatorIds: string[];
  status: 'draft' | 'live' | 'ended';
}
export interface Creator { id: string; handle: string; name: string; followers: number; niche: string; payoutUpi?: string; shopSlug: string }
export interface Experience { id: string; name: string; day: number; time: string; price: Rupees; partner: string }
export interface TripStay { hotelId: string; roomTypeId: string; nights: number; nightlyRate: Rupees; label: 'creator_pick' | 'budget' | 'luxury' }
export interface Trip {
  id: string; creatorId: string; slug: string; title: string; city: string; days: number;
  stays: TripStay[]; experiences: Experience[]; reelUrl: string; saves: number;
  creatorSaving: Rupees;
}
export interface Traveler { id: string; name: string; whatsapp: string; savedTripIds: string[]; savedShopIds: string[]; prefs?: Record<string, unknown> }
export interface Attribution { travelerId: string; creatorId: string; tripId: string; openedAt: string; expiresAt: string }
export type BookingStatus = 'held' | 'upcoming' | 'in_house' | 'completed' | 'cancelled';
export interface Booking {
  id: string; travelerId: string; tripId: string; creatorId: string; hotelId: string; roomTypeId: string;
  dates: { checkIn: string; checkOut: string }; guests: number;
  roomValue: Rupees; experiencesValue: Rupees; total: Rupees;
  source: 'link' | 'gap_night'; status: BookingStatus;
}
export interface GapNight {
  id: string; hotelId: string; roomTypeId: string; dates: { from: string; to: string };
  rooms: number; rate: Rupees; audience: string[]; sentTo: number; booked: number;
}
export type LedgerStatus = 'pending_stay' | 'available' | 'paid' | 'cancelled';
export interface LedgerEntry { bookingId: string; amount: Rupees; status: LedgerStatus }
export interface Settlement { period: string; stays: number; gross: Rupees; commission: Rupees; net: Rupees }
