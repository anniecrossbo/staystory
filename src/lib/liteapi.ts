import "server-only";
import type { HotelSearchResult } from "@/contracts/hotel-search";

const BASE = "https://api.liteapi.travel/v3.0";
const TIMEOUT_MS = 12000;

function apiHeaders(): Record<string, string> {
  const key = process.env.LITEAPI_KEY;
  if (!key) throw new Error("LITEAPI_KEY is not set");
  return { "X-API-Key": key, Accept: "application/json", "Content-Type": "application/json" };
}

// PROTO: LiteAPI sandbox may return limited results; production needs real key
export async function searchHotels(opts: {
  cityName: string;
  countryCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  currency?: string;
}): Promise<{ hotels: HotelSearchResult[]; source: "liteapi" | "fallback"; note?: string }> {
  const currency = opts.currency ?? "INR";
  try {
    const listing = await fetchHotelList(opts.cityName, opts.countryCode, 10);
    if (listing.length === 0) return { hotels: [], source: "liteapi", note: "No hotels found" };

    const rates = await fetchRates(
      listing.map((h) => h.id),
      opts.checkIn,
      opts.checkOut,
      opts.adults,
      currency,
    );

    const hotels: HotelSearchResult[] = listing.map((h) => {
      const rate = rates.get(h.id);
      return {
        id: h.id,
        name: h.name,
        address: h.address,
        starRating: h.stars,
        latitude: h.latitude,
        longitude: h.longitude,
        mainPhoto: h.main_photo || h.thumbnail || "",
        ratePerNight: rate?.amount ?? 0,
        currency: rate?.currency ?? currency,
        boardType: rate?.boardName ?? "Room only",
      };
    });

    return { hotels, source: "liteapi" };
  } catch (err) {
    const note = err instanceof Error ? err.message : "Hotel search failed";
    return { hotels: [], source: "fallback", note };
  }
}

async function fetchHotelList(cityName: string, countryCode: string, limit: number): Promise<LiteAPIHotelData[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  const params = new URLSearchParams({ cityName, countryCode, limit: String(limit) });
  const res = await fetch(`${BASE}/data/hotels?${params}`, {
    headers: apiHeaders(),
    signal: ctrl.signal,
  });
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LiteAPI data ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { data?: LiteAPIHotelData[] };
  return json.data ?? [];
}

async function fetchRates(
  hotelIds: string[],
  checkIn: string,
  checkOut: string,
  adults: number,
  currency: string,
): Promise<Map<string, { amount: number; currency: string; boardName: string }>> {
  const result = new Map<string, { amount: number; currency: string; boardName: string }>();
  if (hotelIds.length === 0) return result;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    const res = await fetch(`${BASE}/hotels/rates`, {
      method: "POST",
      headers: apiHeaders(),
      signal: ctrl.signal,
      body: JSON.stringify({
        hotelIds,
        checkin: checkIn,
        checkout: checkOut,
        occupancies: [{ adults }],
        currency,
        guestNationality: "IN",
      }),
    });
    clearTimeout(timer);

    if (!res.ok) return result;

    const json = (await res.json()) as { data?: LiteAPIRateResult[] };
    for (const hotel of json.data ?? []) {
      const firstRate = hotel.roomTypes?.[0]?.rates?.[0];
      if (!firstRate) continue;
      const total = firstRate.retailRate?.total?.[0];
      if (!total) continue;
      result.set(hotel.hotelId, {
        amount: Number(total.amount) || 0,
        currency: total.currency || currency,
        boardName: firstRate.boardName || "Room only",
      });
    }
  } catch {
    // PROTO: rates are optional; we still show hotel listings without them
  }

  return result;
}

export async function getHotelDetails(hotelId: string): Promise<LiteAPIHotelDetail | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${BASE}/data/hotel?hotelId=${encodeURIComponent(hotelId)}`, {
      headers: apiHeaders(),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: LiteAPIHotelDetail };
    return json.data ?? null;
  } catch {
    return null;
  }
}

// PROTO: partial types covering what we use from LiteAPI responses
interface LiteAPIHotelData {
  id: string;
  name: string;
  address: string;
  stars: number;
  latitude: number;
  longitude: number;
  main_photo?: string;
  thumbnail?: string;
}

interface LiteAPIRateResult {
  hotelId: string;
  roomTypes?: {
    rates?: {
      boardName?: string;
      retailRate?: { total?: { amount: number; currency: string }[] };
    }[];
  }[];
}

interface LiteAPIHotelDetail {
  id: string;
  name: string;
  address: string;
  description: string;
  starRating: number;
  latitude: number;
  longitude: number;
  images: string[];
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
}
