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

  // ── Database-backed CRUD endpoints ──────────────────────────────

  // Lazy-load the DB modules to avoid pulling @staystory/market into Vite's config bundle
  if (path.startsWith('/api/db/')) {
    const Q = await import('./queries');
    // A fresh database is empty: seed it (once per connection, idempotent) before serving any /api/db request.
    (await import('./seed-db')).seedDatabase();

    // GET /api/db/state — full MarketState assembled from all tables
    if (path === '/api/db/state' && method === 'GET') {
      return json(200, Q.assembleState());
    }

    // POST /api/db/dispatch — persist a reducer action to the DB
    if (path === '/api/db/dispatch' && method === 'POST') {
      const a = body as Record<string, unknown>;
      if (!a.type) return bad('action type is required.');
      try { Q.dispatchAction(a); return json(200, { ok: true }); }
      catch (e) { return json(500, { error: e instanceof Error ? e.message : 'Dispatch failed' }); }
    }

    // GET /api/db/bookings?hotelId=&creatorId=&status=
    if (path === '/api/db/bookings' && method === 'GET') {
      return json(200, Q.listBookings({ hotelId: q.get('hotelId') ?? undefined, creatorId: q.get('creatorId') ?? undefined, status: q.get('status') ?? undefined }));
    }

    // POST /api/db/bookings  { ...booking fields }
    if (path === '/api/db/bookings' && method === 'POST') {
      const b = body as Record<string, unknown>;
      if (!b.id || !b.tripId || !b.hotelId) return bad('id, tripId and hotelId are required.');
      Q.createBooking(b as Parameters<typeof Q.createBooking>[0]);
      return json(201, { id: b.id });
    }

    // GET /api/db/bookings/:id
    const bookingMatch = path.match(/^\/api\/db\/bookings\/([^/]+)$/);
    if (bookingMatch && method === 'GET') {
      const bk = Q.getBooking(bookingMatch[1]!);
      return bk ? json(200, bk) : json(404, { error: 'Booking not found' });
    }

    // PATCH /api/db/bookings/:id  { status }
    if (bookingMatch && method === 'PATCH') {
      const b = body as { status?: string };
      if (!b.status) return bad('status is required.');
      Q.updateBookingStatus(bookingMatch[1]!, b.status);
      return json(200, { ok: true });
    }

    // GET /api/db/trips?creatorId=
    if (path === '/api/db/trips' && method === 'GET') {
      return json(200, Q.listTrips(q.get('creatorId') ?? undefined));
    }

    // GET /api/db/trips/:id
    const tripMatch = path.match(/^\/api\/db\/trips\/([^/]+)$/);
    if (tripMatch && method === 'GET') {
      const t = Q.getTrip(tripMatch[1]!);
      return t ? json(200, t) : json(404, { error: 'Trip not found' });
    }

    // POST /api/db/trips  { ...trip fields }
    if (path === '/api/db/trips' && method === 'POST') {
      const t = body as Record<string, unknown>;
      if (!t.id || !t.creatorId) return bad('id and creatorId are required.');
      Q.upsertTrip(t as Parameters<typeof Q.upsertTrip>[0]);
      return json(201, { id: t.id });
    }

    // GET /api/db/campaigns?hotelId=
    if (path === '/api/db/campaigns' && method === 'GET') {
      return json(200, Q.listCampaigns(q.get('hotelId') ?? undefined));
    }

    // POST /api/db/campaigns  { ...campaign fields }
    if (path === '/api/db/campaigns' && method === 'POST') {
      const c = body as Record<string, unknown>;
      if (!c.id || !c.hotelId || !c.name) return bad('id, hotelId and name are required.');
      Q.createCampaign(c as Parameters<typeof Q.createCampaign>[0]);
      return json(201, { id: c.id });
    }

    // POST /api/db/campaigns/:id/invite  { creatorId }
    const inviteMatch = path.match(/^\/api\/db\/campaigns\/([^/]+)\/invite$/);
    if (inviteMatch && method === 'POST') {
      const b = body as { creatorId?: string };
      if (!b.creatorId) return bad('creatorId is required.');
      Q.inviteCreator(inviteMatch[1]!, b.creatorId);
      return json(201, { ok: true });
    }

    // POST /api/db/campaigns/:id/respond  { creatorId, status, agreedPct?, counter? }
    const respondMatch = path.match(/^\/api\/db\/campaigns\/([^/]+)\/respond$/);
    if (respondMatch && method === 'POST') {
      const b = body as { creatorId?: string; status?: string; agreedPct?: number; counter?: unknown };
      if (!b.creatorId || !b.status) return bad('creatorId and status are required.');
      Q.respondToInvite(respondMatch[1]!, b.creatorId, b.status, b.agreedPct, b.counter);
      return json(200, { ok: true });
    }

    // GET /api/db/creators
    if (path === '/api/db/creators' && method === 'GET') {
      return json(200, Q.listCreators());
    }

    // GET /api/db/creators/:id
    const creatorMatch = path.match(/^\/api\/db\/creators\/([^/]+)$/);
    if (creatorMatch && method === 'GET') {
      const c = Q.getCreator(creatorMatch[1]!);
      return c ? json(200, c) : json(404, { error: 'Creator not found' });
    }

    // GET /api/db/ledger?creatorId=&status=
    if (path === '/api/db/ledger' && method === 'GET') {
      const creatorId = q.get('creatorId');
      if (!creatorId) return bad('creatorId is required.');
      return json(200, Q.listLedger(creatorId, q.get('status') ?? undefined));
    }

    // POST /api/db/ledger  { ...entry fields }
    if (path === '/api/db/ledger' && method === 'POST') {
      const l = body as Record<string, unknown>;
      if (!l.id || !l.creatorId) return bad('id and creatorId are required.');
      Q.addLedgerEntry(l as Parameters<typeof Q.addLedgerEntry>[0]);
      return json(201, { id: l.id });
    }

    // POST /api/db/withdraw  { creatorId, gross, tds, net, upi }
    if (path === '/api/db/withdraw' && method === 'POST') {
      const w = body as Record<string, unknown>;
      if (!w.creatorId || !w.gross || !w.upi) return bad('creatorId, gross and upi are required.');
      const id = `w${Q.nextSeq('withdrawal')}`;
      Q.createWithdrawal({ id, ...w } as Parameters<typeof Q.createWithdrawal>[0]);
      return json(201, { id });
    }

    // GET /api/db/travelers/:id
    const travelerMatch = path.match(/^\/api\/db\/travelers\/([^/]+)$/);
    if (travelerMatch && method === 'GET') {
      const t = Q.getTraveler(travelerMatch[1]!);
      return t ? json(200, t) : json(404, { error: 'Traveler not found' });
    }

    // POST /api/db/travelers  { id, name, whatsapp, ... }
    if (path === '/api/db/travelers' && method === 'POST') {
      const t = body as Record<string, unknown>;
      if (!t.id || !t.name || !t.whatsapp) return bad('id, name and whatsapp are required.');
      Q.upsertTraveler(t as Parameters<typeof Q.upsertTraveler>[0]);
      return json(200, { id: t.id });
    }

    // POST /api/db/attribution  { travelerId, creatorId, tripId }
    if (path === '/api/db/attribution' && method === 'POST') {
      const a = body as { travelerId?: string; creatorId?: string; tripId?: string };
      if (!a.travelerId || !a.creatorId || !a.tripId) return bad('travelerId, creatorId and tripId are required.');
      Q.recordAttribution(a as Parameters<typeof Q.recordAttribution>[0]);
      return json(201, { ok: true });
    }

    // GET /api/db/attribution?travelerId=
    if (path === '/api/db/attribution' && method === 'GET') {
      const tid = q.get('travelerId');
      if (!tid) return bad('travelerId is required.');
      const a = Q.getAttribution(tid);
      return a ? json(200, a) : json(404, { error: 'No active attribution' });
    }

    // GET /api/db/settlements?hotelId=
    if (path === '/api/db/settlements' && method === 'GET') {
      const hid = q.get('hotelId');
      if (!hid) return bad('hotelId is required.');
      return json(200, Q.listSettlements(hid));
    }

    // GET /api/db/hotel?id=
    if (path === '/api/db/hotel' && method === 'GET') {
      const hid = q.get('id');
      if (!hid) return bad('id is required.');
      const h = Q.getHotel(hid);
      return h ? json(200, h) : json(404, { error: 'Hotel not found' });
    }

    // GET /api/db/stats/hotel?id=
    if (path === '/api/db/stats/hotel' && method === 'GET') {
      const hid = q.get('id');
      if (!hid) return bad('id is required.');
      return json(200, Q.hotelStats(hid));
    }

    // GET /api/db/stats/creator?id=
    if (path === '/api/db/stats/creator' && method === 'GET') {
      const cid = q.get('id');
      if (!cid) return bad('id is required.');
      return json(200, Q.creatorStats(cid));
    }
  }

  return null;
}
