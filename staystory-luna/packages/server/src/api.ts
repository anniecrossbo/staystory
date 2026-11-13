import { coordsFor } from './catalog';
import { extract, isUsable } from './extract';
import { getHotelDetails, searchHotels } from './liteapi';
import { staticMapUrl } from './maps';
import type { Env, MapMarker } from './types';

export interface ApiResponse { status: number; headers: Record<string, string>; body: string | Uint8Array }
const json = (status: number, data: unknown): ApiResponse => ({ status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(data) });
const bad = (msg: string) => json(400, { error: msg });

const parseMarkers = (s: string | null): MapMarker[] =>
  (s ?? '').split('|').filter(Boolean).slice(0, 20).map((p) => { const [lat, lng, label] = p.split(','); return { lat: Number(lat), lng: Number(lng), label }; }).filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));

/**
 * The HTTP surface the front ends call. Framework free so it can sit behind Vite, Node or an edge function.
 *   GET  /api/status   which integrations are configured
 *   POST /api/extract  { caption, reelUrl? } -> ExtractionResult (+ usable flag)
 *   GET  /api/hotels   ?cityName&countryCode&checkIn&checkOut&adults
 *   GET  /api/hotel    ?hotelId
 *   GET  /api/map      ?lat&lng&zoom&w&h&markers=lat,lng,label|...   -> image, or 204 when no key
 */
export async function handleApi(method: string, url: URL, body: unknown, env: Env): Promise<ApiResponse | null> {
  const path = url.pathname;
  const q = url.searchParams;
  if (path === '/api/status' && method === 'GET') return json(200, { ai: env.ANTHROPIC_API_KEY ? 'anthropic' : env.OPENAI_API_KEY ? 'openai' : null, hotels: !!env.LITEAPI_KEY, maps: !!env.GOOGLE_MAPS_KEY });

  if (path === '/api/extract' && method === 'POST') {
    const b = (body ?? {}) as { caption?: unknown; reelUrl?: unknown };
    if (typeof b.caption !== 'string' || b.caption.trim().length < 8) return bad('Paste the reel caption (at least a sentence).');
    if (b.caption.length > 4000) return bad('That caption is too long.');
    const result = await extract(b.caption, typeof b.reelUrl === 'string' ? b.reelUrl.slice(0, 300) : '', env);
    const coords = Object.fromEntries(result.extraction.places.flatMap((pl) => { const c = coordsFor(pl, result.extraction.destination); return c ? [[pl, c]] : []; }));
    return json(200, { ...result, usable: isUsable(result.extraction), coords });
  }

  if (path === '/api/hotels' && method === 'GET') {
    const cityName = q.get('cityName'); const checkIn = q.get('checkIn'); const checkOut = q.get('checkOut');
    if (!cityName || !checkIn || !checkOut || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return bad('cityName, checkIn and checkOut (YYYY-MM-DD) are required.');
    return json(200, await searchHotels({ cityName, countryCode: q.get('countryCode') || 'IN', checkIn, checkOut, adults: Math.min(8, Math.max(1, Number(q.get('adults')) || 2)), currency: q.get('currency') || 'INR' }, env));
  }

  if (path === '/api/hotel' && method === 'GET') {
    const id = q.get('hotelId');
    if (!id) return bad('hotelId is required.');
    const d = await getHotelDetails(id, env);
    return d ? json(200, d) : json(404, { error: 'Hotel not found' });
  }

  if (path === '/api/map' && method === 'GET') {
    const markers = parseMarkers(q.get('markers'));
    const lat = Number(q.get('lat')); const lng = Number(q.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return bad('lat and lng are required.');
    const target = staticMapUrl({ center: { lat, lng }, zoom: Math.min(18, Math.max(3, Number(q.get('zoom')) || 13)), width: Math.min(640, Number(q.get('w')) || 360), height: Math.min(640, Number(q.get('h')) || 200), markers }, env);
    if (!target) return { status: 204, headers: {}, body: '' };
    const res = await fetch(target).catch(() => null);
    if (!res || !res.ok) return json(502, { error: 'Map unavailable' });
    return { status: 200, headers: { 'Content-Type': res.headers.get('content-type') ?? 'image/png', 'Cache-Control': 'public, max-age=86400' }, body: new Uint8Array(await res.arrayBuffer()) };
  }
  return null;
}
