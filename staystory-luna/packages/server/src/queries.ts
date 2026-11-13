import { ATTRIBUTION_DAYS, creatorCommission, matchesKeyword, TDS_PCT, withdrawal } from '@staystory/core';
import { seedState } from '@staystory/market';
import { db } from './db';
import { resetDatabase } from './seed-db';

const j = JSON.stringify;
const p = (v: unknown) => typeof v === 'string' ? JSON.parse(v) : v;

/**
 * Row order. The reducer prepends new campaigns, trips, bookings, gap nights, ledger entries, withdrawals and
 * reel comments, and appends reviews, attributions and visits, while seed rows keep their listed order.
 * Tables are therefore read in rowid order and a "prepend" inserts at min(rowid) - 1 (seed rows take 1..n in
 * listed order). That reproduces the reducer's order exactly and is independent of created_at values.
 */
export const prependId = (table: string): number => (db().prepare(`SELECT coalesce(min(rowid), 1) - 1 AS r FROM ${table}`).get() as { r: number }).r;

/** JSON object for the `extra` columns: undefined keys are dropped and an empty object is stored as NULL. */
export const extraJson = (o: Record<string, unknown>): string | null => {
  const clean = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
};
export const readExtra = (v: unknown): Record<string, unknown> => (typeof v === 'string' && v ? JSON.parse(v) : {});

/** The marketplace's own hotel is the first one seeded (later rows are placeholders for other hotels' campaigns). */
export const primaryHotelId = (): string | undefined => (db().prepare('SELECT id FROM hotels ORDER BY rowid LIMIT 1').get() as { id: string } | undefined)?.id;

// ── Hotels ──────────────────────────────────────────────────────────

export function getHotel(id: string) {
  const d = db();
  const row = d.prepare('SELECT * FROM hotels WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const rooms = d.prepare('SELECT * FROM room_types WHERE hotel_id = ?').all(row.id as string) as Record<string, unknown>[];
  return { ...row, profile: p(row.profile), rooms: rooms.map((r) => ({ id: r.id, name: r.name, count: r.count, sleeps: r.sleeps, rackRate: r.rack_rate, meal: r.meal })) };
}

// ── Creators ────────────────────────────────────────────────────────

export function listCreators() {
  return db().prepare('SELECT * FROM creators ORDER BY top DESC, name').all() as Record<string, unknown>[];
}

export function getCreator(id: string) {
  return db().prepare('SELECT * FROM creators WHERE id = ?').get(id) as Record<string, unknown> | undefined;
}

// ── Campaigns ───────────────────────────────────────────────────────

export function listCampaigns(hotelId?: string) {
  const d = db();
  const camps = (hotelId
    ? d.prepare('SELECT * FROM campaigns WHERE hotel_id = ? ORDER BY rowid').all(hotelId)
    : d.prepare('SELECT * FROM campaigns ORDER BY rowid').all()) as Record<string, unknown>[];
  return camps.map((c) => {
    const invites = d.prepare('SELECT * FROM campaign_invites WHERE campaign_id = ?').all(c.id as string) as Record<string, unknown>[];
    return {
      ...c, perks: p(c.perks), meta: p(c.meta),
      invites: Object.fromEntries(invites.map((i) => [i.creator_id, i.status])),
      agreedPct: Object.fromEntries(invites.filter((i) => i.agreed_pct != null).map((i) => [i.creator_id, i.agreed_pct])),
      counters: Object.fromEntries(invites.filter((i) => i.counter).map((i) => [i.creator_id, p(i.counter)])),
    };
  });
}

export function createCampaign(c: { id: string; hotelId: string; name: string; roomTypeId: string; windowLabel: string; nights: number; perks: string[]; rackPrice: number; creatorPrice: number; commissionPct: number; bookingTarget: number; status?: string; createdAt?: string; meta?: unknown; invites?: Record<string, string>; agreedPct?: Record<string, number>; counters?: Record<string, unknown> }) {
  const d = db();
  d.prepare(`INSERT INTO campaigns (rowid, id, hotel_id, name, room_type_id, window_label, nights, perks, rack_price, creator_price, commission_pct, booking_target, status, created_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    prependId('campaigns'), c.id, c.hotelId, c.name, c.roomTypeId, c.windowLabel, c.nights, j(c.perks ?? []), c.rackPrice, c.creatorPrice, c.commissionPct, c.bookingTarget, c.status ?? 'live', c.createdAt ?? new Date().toISOString(), c.meta ? j(c.meta) : null,
  );
  const ins = d.prepare('INSERT OR REPLACE INTO campaign_invites (campaign_id, creator_id, status, agreed_pct, counter) VALUES (?, ?, ?, ?, ?)');
  for (const [creatorId, status] of Object.entries(c.invites ?? {})) ins.run(c.id, creatorId, status, c.agreedPct?.[creatorId] ?? null, c.counters?.[creatorId] ? j(c.counters[creatorId]) : null);
}

export function inviteCreator(campaignId: string, creatorId: string) {
  db().prepare('INSERT OR IGNORE INTO campaign_invites (campaign_id, creator_id, status) VALUES (?, ?, ?)').run(campaignId, creatorId, 'invited');
}

export function respondToInvite(campaignId: string, creatorId: string, status: string, agreedPct?: number, counter?: unknown) {
  db().prepare('UPDATE campaign_invites SET status = ?, agreed_pct = ?, counter = ? WHERE campaign_id = ? AND creator_id = ?').run(
    status, agreedPct ?? null, counter ? j(counter) : null, campaignId, creatorId,
  );
}

// ── Trips ───────────────────────────────────────────────────────────

export function listTrips(creatorId?: string) {
  const rows = (creatorId
    ? db().prepare('SELECT * FROM trips WHERE creator_id = ? ORDER BY rowid').all(creatorId)
    : db().prepare('SELECT * FROM trips ORDER BY saves DESC').all()) as Record<string, unknown>[];
  return rows.map(tripFromRow);
}

export function getTrip(id: string) {
  const row = db().prepare('SELECT * FROM trips WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? tripFromRow(row) : null;
}

const TRIP_EXTRA_KEYS = ['shopTitle', 'stayLine', 'savedStatus'] as const;

/** Insert a trip (prepended) or replace every column of an existing one. Like the reducer's `{ ...t, ...a.trip }`, optional extras the new trip does not mention are kept. Returns true when the trip is new. */
export function upsertTrip(t: { id: string; creatorId: string; slug: string; title: string; place: string; days: number; img: string; itinerary: unknown; stays: unknown; pickStayId: string; experiences: unknown; creatorSaving: number; saves: number; travelersBooked: number; tags: string[]; status: string; reelUrl: string; dmKeyword: string; publishedAt: string; shopTitle?: string; stayLine?: string; savedStatus?: unknown }): boolean {
  const d = db();
  const old = d.prepare('SELECT extra FROM trips WHERE id = ?').get(t.id) as { extra: string | null } | undefined;
  const merged = readExtra(old?.extra);
  for (const k of TRIP_EXTRA_KEYS) if (k in t) merged[k] = (t as Record<string, unknown>)[k];
  const vals = [t.creatorId, t.slug, t.title, t.place, t.days, t.img, j(t.itinerary), j(t.stays), t.pickStayId, j(t.experiences), t.creatorSaving, t.saves, t.travelersBooked, j(t.tags), t.status, t.reelUrl, t.dmKeyword, t.publishedAt, extraJson(merged)];
  if (old) {
    d.prepare('UPDATE trips SET creator_id=?, slug=?, title=?, place=?, days=?, img=?, itinerary=?, stays=?, pick_stay_id=?, experiences=?, creator_saving=?, saves=?, travelers_booked=?, tags=?, status=?, reel_url=?, dm_keyword=?, published_at=?, extra=? WHERE id = ?').run(...vals, t.id);
  } else {
    d.prepare('INSERT INTO trips (rowid, id, creator_id, slug, title, place, days, img, itinerary, stays, pick_stay_id, experiences, creator_saving, saves, travelers_booked, tags, status, reel_url, dm_keyword, published_at, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(prependId('trips'), t.id, ...vals);
  }
  return !old;
}

function tripFromRow(r: Record<string, unknown>) {
  return { ...r, itinerary: p(r.itinerary), stays: p(r.stays), experiences: p(r.experiences), tags: p(r.tags), ...readExtra(r.extra) };
}

// ── Bookings ────────────────────────────────────────────────────────

export function listBookings(filters?: { hotelId?: string; creatorId?: string; status?: string }) {
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params: unknown[] = [];
  if (filters?.hotelId) { sql += ' AND hotel_id = ?'; params.push(filters.hotelId); }
  if (filters?.creatorId) { sql += ' AND creator_id = ?'; params.push(filters.creatorId); }
  if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
  sql += ' ORDER BY rowid';
  return (db().prepare(sql).all(...params) as Record<string, unknown>[]).map(bookingFromRow);
}

export function getBooking(id: string) {
  const row = db().prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? bookingFromRow(row) : null;
}

export function createBooking(b: { id: string; travelerId: string; guestName: string; guestInitials: string; tripId: string; creatorId: string; hotelId: string; roomTypeId: string; roomName: string; stayId: string; datesLabel: string; nights: number; guests: number; roomValue: number; experiencesValue: number; creatorSaving: number; total: number; experienceIds: string[]; source: string; status?: string; gapNightId?: string; createdAt?: string; selfBooking?: boolean }) {
  db().prepare(`INSERT INTO bookings (rowid, id, traveler_id, guest_name, guest_initials, trip_id, creator_id, hotel_id, room_type_id, room_name, stay_id, dates_label, nights, guests, room_value, experiences_value, creator_saving, total, experience_ids, source, status, created_at, gap_night_id, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    prependId('bookings'), b.id, b.travelerId, b.guestName, b.guestInitials, b.tripId, b.creatorId, b.hotelId, b.roomTypeId, b.roomName, b.stayId, b.datesLabel, b.nights, b.guests, b.roomValue, b.experiencesValue, b.creatorSaving, b.total, j(b.experienceIds), b.source, b.status ?? 'upcoming', b.createdAt ?? new Date().toISOString(), b.gapNightId ?? null, extraJson({ selfBooking: b.selfBooking }),
  );
}

export function updateBookingStatus(id: string, status: string) {
  db().prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
}

function bookingFromRow(r: Record<string, unknown>) {
  return { ...r, experienceIds: p(r.experience_ids), ...readExtra(r.extra) };
}

// ── Ledger ──────────────────────────────────────────────────────────

export function listLedger(creatorId: string, status?: string) {
  let sql = 'SELECT * FROM ledger WHERE creator_id = ?';
  const params: unknown[] = [creatorId];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY rowid';
  return db().prepare(sql).all(...params) as Record<string, unknown>[];
}

export function addLedgerEntry(l: { id: string; creatorId: string; bookingId?: string; label: string; meta: string; amount: number; status: string; createdAt?: string; summary?: boolean; ini?: string }) {
  db().prepare('INSERT INTO ledger (rowid, id, creator_id, booking_id, label, meta, amount, status, created_at, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    prependId('ledger'), l.id, l.creatorId, l.bookingId ?? null, l.label, l.meta, l.amount, l.status, l.createdAt ?? new Date().toISOString(), extraJson({ summary: l.summary, ini: l.ini }),
  );
}

export function updateLedgerStatus(id: string, status: string) {
  db().prepare('UPDATE ledger SET status = ? WHERE id = ?').run(status, id);
}

// ── Withdrawals ─────────────────────────────────────────────────────

export function createWithdrawal(w: { id: string; creatorId: string; gross: number; tds: number; net: number; upi: string; createdAt?: string }) {
  db().prepare('INSERT INTO withdrawals (rowid, id, creator_id, gross, tds, net, upi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    prependId('withdrawals'), w.id, w.creatorId, w.gross, w.tds, w.net, w.upi, w.createdAt ?? new Date().toISOString(),
  );
}

export function listWithdrawals(creatorId: string) {
  return db().prepare('SELECT * FROM withdrawals WHERE creator_id = ? ORDER BY rowid').all(creatorId) as Record<string, unknown>[];
}

// ── Travelers ───────────────────────────────────────────────────────

export function getTraveler(id: string) {
  const row = db().prepare('SELECT * FROM travelers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? { ...row, signedIn: !!row.signed_in, savedTripIds: p(row.saved_trip_ids), savedShopIds: p(row.saved_shop_ids), followingIds: p(row.following_ids), prefs: p(row.prefs) } : null;
}

export function upsertTraveler(t: { id: string; name: string; whatsapp: string; signedIn?: boolean; savedTripIds?: string[]; savedShopIds?: string[]; followingIds?: string[]; prefs?: unknown }) {
  db().prepare(`INSERT INTO travelers (id, name, whatsapp, signed_in, saved_trip_ids, saved_shop_ids, following_ids, prefs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, whatsapp=excluded.whatsapp, signed_in=excluded.signed_in, saved_trip_ids=excluded.saved_trip_ids, saved_shop_ids=excluded.saved_shop_ids, following_ids=excluded.following_ids, prefs=excluded.prefs`).run(
    t.id, t.name, t.whatsapp, t.signedIn ? 1 : 0, j(t.savedTripIds ?? []), j(t.savedShopIds ?? []), j(t.followingIds ?? []), j(t.prefs ?? {}),
  );
}

// ── Attributions ────────────────────────────────────────────────────

/** The reducer's `traveler/openLink`: one credit per traveler. An active credit from the same creator keeps its original window; a different creator replaces it; an expired one is replaced. */
export function openLink(a: { travelerId: string; creatorId: string; tripId: string; now: string }) {
  const d = db();
  const cur = d.prepare('SELECT * FROM attributions WHERE traveler_id = ? ORDER BY rowid LIMIT 1').get(a.travelerId) as { creator_id: string; expires_at: string } | undefined;
  const active = !!cur && new Date(cur.expires_at).getTime() > new Date(a.now).getTime();
  if (active && cur!.creator_id === a.creatorId) return;
  const expires = new Date(new Date(a.now).getTime() + ATTRIBUTION_DAYS * 86_400_000).toISOString();
  d.prepare('DELETE FROM attributions WHERE traveler_id = ?').run(a.travelerId);
  d.prepare('INSERT INTO attributions (traveler_id, creator_id, trip_id, opened_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(a.travelerId, a.creatorId, a.tripId, a.now, expires);
}

export function recordAttribution(a: { travelerId: string; creatorId: string; tripId: string }) {
  openLink({ ...a, now: new Date().toISOString() });
}

export function getAttribution(travelerId: string) {
  return db().prepare("SELECT * FROM attributions WHERE traveler_id = ? AND expires_at > ? ORDER BY rowid LIMIT 1").get(travelerId, new Date().toISOString()) as Record<string, unknown> | undefined;
}

// ── Settlements ─────────────────────────────────────────────────────

export function listSettlements(hotelId: string) {
  return db().prepare('SELECT * FROM settlements WHERE hotel_id = ? ORDER BY rowid').all(hotelId) as Record<string, unknown>[];
}

// ── Sequences ───────────────────────────────────────────────────────

export function nextSeq(name: string): number {
  const d = db();
  d.prepare('INSERT INTO sequences (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1').run(name);
  return (d.prepare('SELECT value FROM sequences WHERE name = ?').get(name) as { value: number }).value;
}

/** Returns the current value and advances it, as the reducer reads `s.seq.x` for an id and then adds one. */
export function takeSeq(name: string): number {
  const d = db();
  const row = d.prepare('SELECT value FROM sequences WHERE name = ?').get(name) as { value: number } | undefined;
  const cur = row?.value ?? (seedState().seq as Record<string, number>)[name] ?? 0;
  d.prepare('INSERT INTO sequences (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value').run(name, cur + 1);
  return cur;
}

// ── Stats ───────────────────────────────────────────────────────────

export function hotelStats(hotelId: string) {
  const d = db();
  const bookings = d.prepare('SELECT count(*) as n FROM bookings WHERE hotel_id = ?').get(hotelId) as { n: number };
  const revenue = d.prepare('SELECT coalesce(sum(total), 0) as n FROM bookings WHERE hotel_id = ? AND status IN (\'completed\', \'in_house\', \'upcoming\')').get(hotelId) as { n: number };
  const creators = d.prepare('SELECT count(DISTINCT creator_id) as n FROM bookings WHERE hotel_id = ?').get(hotelId) as { n: number };
  return { totalBookings: bookings.n, totalRevenue: revenue.n, activeCreators: creators.n };
}

export function creatorStats(creatorId: string) {
  const d = db();
  const bookings = d.prepare('SELECT count(*) as n FROM bookings WHERE creator_id = ?').get(creatorId) as { n: number };
  const available = d.prepare("SELECT coalesce(sum(amount), 0) as n FROM ledger WHERE creator_id = ? AND status = 'available'").get(creatorId) as { n: number };
  const pending = d.prepare("SELECT coalesce(sum(amount), 0) as n FROM ledger WHERE creator_id = ? AND status = 'pending_stay'").get(creatorId) as { n: number };
  const paid = d.prepare("SELECT coalesce(sum(amount), 0) as n FROM ledger WHERE creator_id = ? AND status = 'paid'").get(creatorId) as { n: number };
  return { totalBookings: bookings.n, available: available.n, pending: pending.n, paid: paid.n };
}

// ── Full state assembly (hydrates the MarketState shape from all tables) ──

const nn = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

/** Every table is read in rowid order, which is the reducer's array order (see `prependId`). */
export function assembleState(): Record<string, unknown> {
  const d = db();
  const all = (table: string) => d.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all() as Record<string, unknown>[];

  const hotelId = primaryHotelId();
  const hotelRow = hotelId ? (d.prepare('SELECT * FROM hotels WHERE id = ?').get(hotelId) as Record<string, unknown>) : undefined;
  if (!hotelRow) return { v: 2, hotel: { id: '', name: '', city: '', commissionPct: 15, floorRate: 3000, status: 'draft', syncMode: 'manual', rooms: [] }, creators: {}, campaigns: [], trips: [], bookings: [], gapNights: [], ledger: [], withdrawals: [], travelers: {}, attributions: [], reviews: [], settlements: [], visits: [], reelComments: [], seq: {} };

  const roomRows = d.prepare('SELECT * FROM room_types WHERE hotel_id = ? ORDER BY rowid').all(hotelRow.id as string) as Record<string, unknown>[];
  const hotel = {
    id: hotelRow.id, name: hotelRow.name, city: hotelRow.city,
    commissionPct: hotelRow.commission_pct, floorRate: hotelRow.floor_rate,
    status: hotelRow.status, syncMode: hotelRow.sync_mode,
    profile: hotelRow.profile ? JSON.parse(hotelRow.profile as string) : undefined,
    rooms: roomRows.map((r) => ({ id: r.id, name: r.name, count: r.count, sleeps: r.sleeps, rackRate: r.rack_rate, meal: r.meal })),
  };

  const creators: Record<string, unknown> = {};
  for (const c of all('creators')) {
    creators[c.id as string] = {
      id: c.id, handle: c.handle, name: c.name, ini: c.ini, followers: c.followers,
      niche: c.niche, bio: c.bio, tripsCount: nn(c.trips_count), travelers: nn(c.travelers),
      hue: c.hue, cover: nn(c.cover), score: nn(c.score), conv: nn(c.conv),
      bookingsPerMonth: nn(c.bookings_per_month), ncr: nn(c.ncr), why: nn(c.why),
      top: c.top ? true : undefined, meta: nn(c.meta), ...readExtra(c.extra),
    };
  }

  const campaigns = all('campaigns').map((c) => {
    const inviteRows = d.prepare('SELECT * FROM campaign_invites WHERE campaign_id = ?').all(c.id as string) as Record<string, unknown>[];
    return {
      id: c.id, hotelId: c.hotel_id, name: c.name, roomTypeId: c.room_type_id,
      windowLabel: c.window_label, nights: c.nights, perks: JSON.parse(c.perks as string),
      rackPrice: c.rack_price, creatorPrice: c.creator_price, commissionPct: c.commission_pct,
      bookingTarget: c.booking_target, status: c.status, createdAt: c.created_at,
      meta: c.meta ? JSON.parse(c.meta as string) : undefined,
      invites: Object.fromEntries(inviteRows.map((i) => [i.creator_id, i.status])),
      agreedPct: Object.fromEntries(inviteRows.filter((i) => i.agreed_pct != null).map((i) => [i.creator_id, i.agreed_pct])),
      counters: Object.fromEntries(inviteRows.filter((i) => i.counter).map((i) => [i.creator_id, JSON.parse(i.counter as string)])),
    };
  });

  const trips = all('trips').map((t) => ({
    id: t.id, creatorId: t.creator_id, slug: t.slug, title: t.title, place: t.place, days: t.days, img: t.img,
    itinerary: JSON.parse(t.itinerary as string), stays: JSON.parse(t.stays as string),
    pickStayId: t.pick_stay_id, experiences: JSON.parse(t.experiences as string),
    creatorSaving: t.creator_saving, saves: t.saves, travelersBooked: t.travelers_booked,
    tags: JSON.parse(t.tags as string), status: t.status, reelUrl: t.reel_url,
    dmKeyword: t.dm_keyword, publishedAt: t.published_at, ...readExtra(t.extra),
  }));

  const bookings = all('bookings').map((b) => ({
    id: b.id, travelerId: b.traveler_id, guestName: b.guest_name, guestInitials: b.guest_initials,
    tripId: b.trip_id, creatorId: b.creator_id, hotelId: b.hotel_id, roomTypeId: b.room_type_id,
    roomName: b.room_name, stayId: b.stay_id, datesLabel: b.dates_label, nights: b.nights,
    guests: b.guests, roomValue: b.room_value, experiencesValue: b.experiences_value,
    creatorSaving: b.creator_saving, total: b.total,
    experienceIds: JSON.parse(b.experience_ids as string), source: b.source, status: b.status,
    createdAt: b.created_at, gapNightId: nn(b.gap_night_id), ...readExtra(b.extra),
  }));

  const gapNights = all('gap_nights').map((g) => ({
    id: g.id, hotelId: g.hotel_id, roomTypeId: g.room_type_id, datesLabel: g.dates_label,
    rooms: g.rooms, booked: g.booked, rate: g.rate, campaignRate: g.campaign_rate,
    audience: JSON.parse(g.audience as string), sentTo: g.sent_to,
    createdAt: g.created_at, endsAt: g.ends_at, status: g.status,
    tripIds: JSON.parse(g.trip_ids as string),
  }));

  const ledger = all('ledger').map((l) => ({
    id: l.id, creatorId: l.creator_id, bookingId: nn(l.booking_id),
    label: l.label, meta: l.meta, amount: l.amount, status: l.status, createdAt: l.created_at, ...readExtra(l.extra),
  }));

  const withdrawals = all('withdrawals').map((w) => ({
    id: w.id, creatorId: w.creator_id, gross: w.gross, tds: w.tds, net: w.net, upi: w.upi, createdAt: w.created_at,
  }));

  const travelers: Record<string, unknown> = {};
  for (const t of all('travelers')) {
    travelers[t.id as string] = {
      id: t.id, name: t.name, whatsapp: t.whatsapp, signedIn: !!t.signed_in,
      savedTripIds: JSON.parse(t.saved_trip_ids as string),
      savedShopIds: JSON.parse(t.saved_shop_ids as string),
      followingIds: JSON.parse(t.following_ids as string),
      prefs: JSON.parse(t.prefs as string),
    };
  }

  const attributions = all('attributions').map((a) => ({
    travelerId: a.traveler_id, creatorId: a.creator_id, tripId: a.trip_id,
    openedAt: a.opened_at, expiresAt: a.expires_at,
  }));

  const reviews = all('reviews').map((r) => ({
    bookingId: r.booking_id, tripId: r.trip_id, hotelId: r.hotel_id,
    rating: r.rating, matchesReel: r.matches_reel, tip: r.tip, createdAt: r.created_at,
  }));

  const settlements = all('settlements').map((s) => ({
    id: s.id, hotelId: s.hotel_id, period: s.period, stays: s.stays,
    gross: s.gross, commission: s.commission, net: s.net,
  }));

  const visits = all('visits').map((v) => ({ tripId: v.trip_id, creatorId: v.creator_id, sessionId: v.session_id, at: v.at }));
  const reelComments = all('reel_comments').map((c) => ({ id: c.id, tripId: c.trip_id, travelerId: c.traveler_id, name: c.name, text: c.text, at: c.at, dmSent: !!c.dm_sent }));

  const seq: Record<string, number> = {};
  for (const s of all('sequences')) seq[s.name as string] = s.value as number;

  return { v: 2, hotel, creators, campaigns, trips, bookings, gapNights, ledger, withdrawals, travelers, attributions, reviews, settlements, visits, reelComments, seq };
}

// ── Dispatch handler (persists reducer actions to the DB) ────────────
// Each case mirrors the same case in packages/market/src/reducer.ts, which is the source of truth for the rules.
// The differential test (test/db-differential.test.ts) replays actions through both and compares the results.

const HOTEL_COLUMNS: Record<string, string> = { name: 'name', city: 'city', commissionPct: 'commission_pct', floorRate: 'floor_rate', status: 'status', syncMode: 'sync_mode', profile: 'profile' };

type Row = Record<string, unknown>;
const GAP_INSERT = 'INSERT INTO gap_nights (rowid, id, hotel_id, room_type_id, dates_label, rooms, booked, rate, campaign_rate, audience, sent_to, created_at, ends_at, status, trip_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

export function dispatchAction(action: Record<string, unknown>): void {
  if (action.type === 'dev/reset') { resetDatabase(); return; }
  db().transaction(() => apply(action))();
}

function apply(action: Record<string, unknown>): void {
  const d = db();
  switch (action.type as string) {
    case 'hotel/update': {
      const patch = action.patch as Record<string, unknown>;
      const hotelId = primaryHotelId();
      if (!hotelId) break;
      const fields: string[] = []; const values: unknown[] = [];
      for (const [k, v] of Object.entries(patch)) { if (HOTEL_COLUMNS[k]) { fields.push(`${HOTEL_COLUMNS[k]} = ?`); values.push(k === 'profile' ? (v === undefined || v === null ? null : j(v)) : v); } }
      if (fields.length) { values.push(hotelId); d.prepare(`UPDATE hotels SET ${fields.join(', ')} WHERE id = ?`).run(...values); }
      if (Array.isArray(patch.rooms)) {
        d.prepare('DELETE FROM room_types WHERE hotel_id = ?').run(hotelId);
        const ins = d.prepare('INSERT INTO room_types (id, hotel_id, name, count, sleeps, rack_rate, meal) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const r of patch.rooms as Row[]) ins.run(r.id, hotelId, r.name, r.count, r.sleeps, r.rackRate, r.meal);
      }
      break;
    }

    case 'campaign/create': { createCampaign(action.campaign as Parameters<typeof createCampaign>[0]); takeSeq('campaign'); break; }
    case 'campaign/invite': {
      const { campaignId, creatorId } = action as { campaignId: string; creatorId: string };
      if (!d.prepare('SELECT 1 FROM campaigns WHERE id = ?').get(campaignId)) break;
      const inv = d.prepare('SELECT status FROM campaign_invites WHERE campaign_id = ? AND creator_id = ?').get(campaignId, creatorId) as { status: string } | undefined;
      if (!inv) inviteCreator(campaignId, creatorId);
      else if (inv.status === 'declined') d.prepare("UPDATE campaign_invites SET status = 'invited' WHERE campaign_id = ? AND creator_id = ?").run(campaignId, creatorId);
      break;
    }
    case 'offer/respond': {
      const { campaignId, creatorId, response, counter } = action as { campaignId: string; creatorId: string; response: string; counter?: unknown };
      const camp = d.prepare('SELECT commission_pct FROM campaigns WHERE id = ?').get(campaignId) as { commission_pct: number } | undefined;
      if (!camp) break;
      const cur = d.prepare('SELECT agreed_pct, counter FROM campaign_invites WHERE campaign_id = ? AND creator_id = ?').get(campaignId, creatorId) as { agreed_pct: number | null; counter: string | null } | undefined;
      // Only an acceptance sets the agreed rate and only a counter sets the counter; other responses leave both as they were.
      const agreed = response === 'accepted' ? camp.commission_pct : cur?.agreed_pct ?? null;
      const ctr = response === 'countered' && counter ? j(counter) : cur?.counter ?? null;
      d.prepare('INSERT INTO campaign_invites (campaign_id, creator_id, status, agreed_pct, counter) VALUES (?, ?, ?, ?, ?) ON CONFLICT(campaign_id, creator_id) DO UPDATE SET status = excluded.status, agreed_pct = excluded.agreed_pct, counter = excluded.counter').run(campaignId, creatorId, response, agreed, ctr);
      break;
    }
    case 'offer/resolveCounter': {
      const { campaignId, creatorId, accept } = action as { campaignId: string; creatorId: string; accept: boolean };
      const camp = d.prepare('SELECT commission_pct FROM campaigns WHERE id = ?').get(campaignId) as { commission_pct: number } | undefined;
      const inv = d.prepare('SELECT status, counter FROM campaign_invites WHERE campaign_id = ? AND creator_id = ?').get(campaignId, creatorId) as { status: string; counter: string | null } | undefined;
      if (!camp || inv?.status !== 'countered') break;
      if (accept) {
        const pct = inv.counter ? (JSON.parse(inv.counter) as { pct?: number }).pct : undefined;
        d.prepare("UPDATE campaign_invites SET status = 'accepted', agreed_pct = ?, counter = NULL WHERE campaign_id = ? AND creator_id = ?").run(pct ?? camp.commission_pct, campaignId, creatorId);
      } else {
        d.prepare("UPDATE campaign_invites SET status = 'declined', counter = NULL WHERE campaign_id = ? AND creator_id = ?").run(campaignId, creatorId);
      }
      break;
    }

    case 'trip/publish': { if (upsertTrip(action.trip as Parameters<typeof upsertTrip>[0])) takeSeq('trip'); break; }
    case 'trip/status': { d.prepare('UPDATE trips SET status = ? WHERE id = ?').run(action.status, action.tripId); break; }

    case 'traveler/patch': {
      const t = getTraveler(action.id as string) as Row | null;
      if (!t) break;
      const patch = action.patch as Row;
      // The reducer spreads the patch over the traveler, so a key present in the patch wins even when its value is falsy.
      const pick = (k: string, cur: unknown) => (k in patch ? patch[k] : cur);
      upsertTraveler({ id: action.id as string, name: pick('name', t.name) as string, whatsapp: pick('whatsapp', t.whatsapp) as string, signedIn: pick('signedIn', t.signedIn) as boolean, savedTripIds: pick('savedTripIds', t.savedTripIds) as string[], savedShopIds: pick('savedShopIds', t.savedShopIds) as string[], followingIds: pick('followingIds', t.followingIds) as string[], prefs: pick('prefs', t.prefs) });
      break;
    }
    case 'traveler/save': {
      const t = getTraveler(action.id as string);
      if (!t) break;
      const ids = (t.savedTripIds ?? []) as string[];
      const tripId = action.tripId as string;
      const on = action.on as boolean;
      const was = ids.includes(tripId);
      d.prepare('UPDATE travelers SET saved_trip_ids = ? WHERE id = ?').run(j(on ? [...new Set([...ids, tripId])] : ids.filter((x) => x !== tripId)), action.id);
      if (was !== on) d.prepare('UPDATE trips SET saves = saves + ? WHERE id = ?').run(on ? 1 : -1, tripId);
      break;
    }
    case 'traveler/follow': {
      const t = getTraveler(action.id as string);
      if (!t) break;
      const ids = (t.followingIds ?? []) as string[];
      const cid = action.creatorId as string;
      d.prepare('UPDATE travelers SET following_ids = ? WHERE id = ?').run(j(ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]), action.id);
      break;
    }
    case 'traveler/saveShop': {
      const t = getTraveler(action.id as string);
      if (!t) break;
      const ids = (t.savedShopIds ?? []) as string[];
      const cid = action.creatorId as string;
      d.prepare('UPDATE travelers SET saved_shop_ids = ? WHERE id = ?').run(j(ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]), action.id);
      break;
    }
    case 'traveler/openLink': { openLink(action as Parameters<typeof openLink>[0]); break; }

    case 'reel/comment': {
      const a = action as { id: string; tripId: string; travelerId: string; name: string; text: string; at: string };
      const trip = d.prepare('SELECT status, dm_keyword FROM trips WHERE id = ?').get(a.tripId) as { status: string; dm_keyword: string } | undefined;
      const already = !!d.prepare('SELECT 1 FROM reel_comments WHERE trip_id = ? AND traveler_id = ? AND dm_sent = 1').get(a.tripId, a.travelerId);
      const dmSent = !!trip && trip.status === 'live' && !already && matchesKeyword(a.text, trip.dm_keyword);
      d.prepare('INSERT INTO reel_comments (rowid, id, trip_id, traveler_id, name, text, at, dm_sent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(prependId('reel_comments'), a.id, a.tripId, a.travelerId, a.name, a.text.slice(0, 300), a.at, dmSent ? 1 : 0);
      break;
    }
    case 'trip/visit': {
      const a = action as { tripId: string; sessionId: string; at: string; byCreatorId?: string };
      const trip = d.prepare('SELECT status, creator_id FROM trips WHERE id = ?').get(a.tripId) as { status: string; creator_id: string } | undefined;
      if (!trip || trip.status !== 'live' || a.byCreatorId === trip.creator_id) break;
      d.prepare('INSERT OR IGNORE INTO visits (trip_id, creator_id, session_id, at) VALUES (?, ?, ?, ?)').run(a.tripId, trip.creator_id, a.sessionId, a.at);
      break;
    }

    case 'booking/create': {
      const b = action.booking as Parameters<typeof createBooking>[0];
      const self = b.travelerId === b.creatorId;
      createBooking(self ? { ...b, selfBooking: true } : b);
      const trip = d.prepare('SELECT place FROM trips WHERE id = ?').get(b.tripId) as { place: string } | undefined;
      const ledgerSeq = takeSeq('ledger');
      // A creator booking through their own link earns nothing: no ledger entry (the id is still consumed, as in the reducer).
      if (!self) addLedgerEntry({ id: `l${ledgerSeq}`, creatorId: b.creatorId, bookingId: b.id, label: `${trip?.place ?? 'Trip'} · ${b.guestName}`, meta: `${b.roomName} · stays ${b.datesLabel}${b.source === 'gap_night' ? ' · via Gap Night' : ''}`, amount: creatorCommission(b.total), status: 'pending_stay', createdAt: b.createdAt });
      if (b.gapNightId) d.prepare('UPDATE gap_nights SET booked = booked + 1 WHERE id = ?').run(b.gapNightId);
      d.prepare('UPDATE trips SET travelers_booked = travelers_booked + 1 WHERE id = ?').run(b.tripId);
      takeSeq('booking');
      break;
    }
    case 'booking/status': {
      const { id, status } = action as { id: string; status: string };
      if (status === 'in_house') { d.prepare("UPDATE bookings SET status = 'in_house' WHERE id = ? AND status = 'upcoming'").run(id); break; }
      // Check-out: only for a stay that is upcoming or in house; the creator's first ledger entry for it becomes available.
      const ok = d.prepare("UPDATE bookings SET status = 'completed' WHERE id = ? AND status IN ('in_house', 'upcoming')").run(id).changes > 0;
      if (!ok) break;
      const first = d.prepare('SELECT rowid AS r, status FROM ledger WHERE booking_id = ? ORDER BY rowid LIMIT 1').get(id) as { r: number; status: string } | undefined;
      if (first?.status === 'pending_stay') d.prepare("UPDATE ledger SET status = 'available' WHERE rowid = ?").run(first.r);
      break;
    }
    case 'booking/cancel': {
      const id = action.id as string;
      const bk = d.prepare('SELECT gap_night_id FROM bookings WHERE id = ?').get(id) as { gap_night_id: string | null } | undefined;
      d.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
      const first = d.prepare('SELECT rowid AS r, status FROM ledger WHERE booking_id = ? ORDER BY rowid LIMIT 1').get(id) as { r: number; status: string } | undefined;
      if (first && first.status !== 'paid') d.prepare("UPDATE ledger SET status = 'cancelled', amount = 0 WHERE rowid = ?").run(first.r);
      if (bk?.gap_night_id) d.prepare('UPDATE gap_nights SET booked = max(0, booked - 1) WHERE id = ?').run(bk.gap_night_id);
      break;
    }
    case 'booking/dates': {
      const { id, datesLabel, delta } = action as { id: string; datesLabel: string; delta: number };
      const bk = d.prepare('SELECT total FROM bookings WHERE id = ?').get(id) as { total: number } | undefined;
      d.prepare('UPDATE bookings SET dates_label = ?, total = total + ?, room_value = room_value + ? WHERE id = ?').run(datesLabel, delta, delta, id);
      if (!bk) break;
      const amount = creatorCommission(bk.total + delta);
      for (const l of d.prepare("SELECT rowid AS r, meta FROM ledger WHERE booking_id = ? AND status = 'pending_stay'").all(id) as { r: number; meta: string }[]) {
        d.prepare('UPDATE ledger SET amount = ?, meta = ? WHERE rowid = ?').run(amount, l.meta.replace(/stays [^·]+/, `stays ${datesLabel} `).trim(), l.r);
      }
      break;
    }
    case 'review/add': {
      const r = action.review as Row;
      // The reducer drops any earlier review of the booking and appends the new one.
      d.prepare('DELETE FROM reviews WHERE booking_id = ?').run(r.bookingId);
      d.prepare('INSERT INTO reviews (booking_id, trip_id, hotel_id, rating, matches_reel, tip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(r.bookingId, r.tripId, r.hotelId, r.rating, r.matchesReel, r.tip, r.createdAt);
      break;
    }
    case 'gap/release': {
      const g = action.gap as Row;
      d.prepare(GAP_INSERT).run(prependId('gap_nights'), g.id, g.hotelId, g.roomTypeId, g.datesLabel, g.rooms, g.booked ?? 0, g.rate, g.campaignRate, j(g.audience), g.sentTo, g.createdAt, g.endsAt, g.status, j(g.tripIds));
      takeSeq('gap');
      break;
    }
    case 'creator/withdraw': {
      const { creatorId, upi, now } = action as { creatorId: string; upi: string; now: string };
      const gross = (d.prepare("SELECT coalesce(sum(amount), 0) AS n FROM ledger WHERE creator_id = ? AND status = 'available'").get(creatorId) as { n: number }).n;
      if (!gross) break;
      const w = withdrawal(gross);
      d.prepare("UPDATE ledger SET status = 'paid' WHERE creator_id = ? AND status = 'available'").run(creatorId);
      addLedgerEntry({ id: `l${takeSeq('ledger')}`, creatorId, label: 'December withdrawal', meta: `Requested today · ${TDS_PCT}% TDS deducted`, amount: w.net, status: 'processing', createdAt: now });
      // The withdrawal id comes from the sequence, as in the reducer (the action's own id is not used).
      createWithdrawal({ id: `w${takeSeq('withdrawal')}`, creatorId, gross: w.gross, tds: w.tds, net: w.net, upi, createdAt: now });
      break;
    }
    case 'dev/ensureGap': {
      const now = action.now as string;
      if ((d.prepare("SELECT count(*) AS n FROM gap_nights WHERE status = 'live'").get() as { n: number }).n > 0) break;
      const hotelId = primaryHotelId();
      if (!hotelId) break;
      d.prepare(GAP_INSERT).run(prependId('gap_nights'), `gap${takeSeq('gap')}`, hotelId, 'lake-deluxe', 'Dec 19 – 21', 4, 0, 3400, 4200, '["saved","free","budget"]', 312, now, new Date(new Date(now).getTime() + 48 * 3_600_000).toISOString(), 'live', '["anaya-udaipur"]');
      break;
    }
  }
}
