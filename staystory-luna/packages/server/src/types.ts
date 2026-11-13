/** Contracts for the server-side services. Ported from the CrossBo prototype (anniecrossbo/staystory, main). */

export interface Extraction {
  destination: string | null;
  days: number | null;
  places: string[];
  budgetPerPerson: number | null;
  namedStay: string | null;
  style: string[];
  title: string | null;
}
export type ExtractionSource = 'ai' | 'cache' | 'rules';
export interface ExtractionResult { extraction: Extraction; source: ExtractionSource; provider?: 'anthropic' | 'openai'; note?: string }

export interface HotelSearchRequest { cityName: string; countryCode: string; checkIn: string; checkOut: string; adults: number; currency?: string }
export interface HotelSearchResult {
  id: string; name: string; address: string; starRating: number; latitude: number; longitude: number;
  mainPhoto: string; ratePerNight: number; currency: string; boardType: string;
}
export interface HotelSearchResponse { hotels: HotelSearchResult[]; source: 'liteapi' | 'fallback'; note?: string }
export interface HotelDetail {
  id: string; name: string; address: string; description: string; starRating: number; latitude: number; longitude: number;
  images: string[]; amenities: string[]; checkInTime: string; checkOutTime: string;
}

export interface MapMarker { lat: number; lng: number; label?: string }
export type Env = Record<string, string | undefined>;
