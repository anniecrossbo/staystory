/** Contract: hotel search & availability via LiteAPI. */

export interface HotelSearchRequest {
  cityName: string;
  countryCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  currency?: string;
}

export interface HotelSearchResult {
  id: string;
  name: string;
  address: string;
  starRating: number;
  latitude: number;
  longitude: number;
  mainPhoto: string;
  ratePerNight: number;
  currency: string;
  boardType: string;
}

export interface HotelSearchResponse {
  hotels: HotelSearchResult[];
  source: "liteapi" | "fallback";
  note?: string;
}

export interface HotelDetailRequest {
  hotelId: string;
}

export interface HotelDetailResponse {
  id: string;
  name: string;
  address: string;
  description: string;
  starRating: number;
  latitude: number;
  longitude: number;
  photos: string[];
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
}
