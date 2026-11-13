import type { Env, HotelDetail, HotelSearchRequest, HotelSearchResponse, HotelSearchResult } from './types';

const BASE = 'https://api.liteapi.travel/v3.0';
const TIMEOUT_MS = 12000;

async function call(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  if (!env.LITEAPI_KEY) throw new Error('LITEAPI_KEY is not set');
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal, headers: { 'X-API-Key': env.LITEAPI_KEY, Accept: 'application/json', 'Content-Type': 'application/json' } });
  } finally { clearTimeout(timer); }
}

interface Listed { id: string; name: string; address: string; stars: number; latitude: number; longitude: number; main_photo?: string; thumbnail?: string }

/** Live hotels with rates. LiteAPI's sandbox may return few results; failures return an empty list with a note, never throw. */
export async function searchHotels(req: HotelSearchRequest, env: Env): Promise<HotelSearchResponse> {
  const currency = req.currency ?? 'INR';
  try {
    const list = await call(env, `/data/hotels?${new URLSearchParams({ cityName: req.cityName, countryCode: req.countryCode, limit: '10' })}`);
    if (!list.ok) throw new Error(`LiteAPI data ${list.status}: ${(await list.text().catch(() => '')).slice(0, 200)}`);
    const listing = ((await list.json()) as { data?: Listed[] }).data ?? [];
    if (!listing.length) return { hotels: [], source: 'liteapi', note: 'No hotels found' };

    const rates = new Map<string, { amount: number; currency: string; boardName: string }>();
    try {
      const res = await call(env, '/hotels/rates', { method: 'POST', body: JSON.stringify({ hotelIds: listing.map((h) => h.id), checkin: req.checkIn, checkout: req.checkOut, occupancies: [{ adults: req.adults }], currency, guestNationality: 'IN' }) });
      if (res.ok) for (const h of ((await res.json()) as { data?: any[] }).data ?? []) {
        const r = h.roomTypes?.[0]?.rates?.[0]; const total = r?.retailRate?.total?.[0];
        if (total) rates.set(h.hotelId, { amount: Number(total.amount) || 0, currency: total.currency || currency, boardName: r.boardName || 'Room only' });
      }
    } catch { /* rates are optional: still show the listing */ }

    const nights = Math.max(1, Math.round((new Date(req.checkOut).getTime() - new Date(req.checkIn).getTime()) / 86_400_000));
    const hotels: HotelSearchResult[] = listing.map((h) => {
      const r = rates.get(h.id);
      // LiteAPI returns the total for the stay; the UI shows a nightly rate.
      return { id: h.id, name: h.name, address: h.address, starRating: h.stars, latitude: h.latitude, longitude: h.longitude, mainPhoto: h.main_photo || h.thumbnail || '', ratePerNight: r ? Math.round(r.amount / nights) : 0, currency: r?.currency ?? currency, boardType: r?.boardName ?? 'Room only' };
    });
    return { hotels, source: 'liteapi' };
  } catch (err) {
    return { hotels: [], source: 'fallback', note: err instanceof Error ? err.message : 'Hotel search failed' };
  }
}

export async function getHotelDetails(hotelId: string, env: Env): Promise<HotelDetail | null> {
  try {
    const res = await call(env, `/data/hotel?hotelId=${encodeURIComponent(hotelId)}`);
    if (!res.ok) return null;
    return ((await res.json()) as { data?: HotelDetail }).data ?? null;
  } catch { return null; }
}
