import { db } from './db';

const j = JSON.stringify;
const p = (v: unknown) => typeof v === 'string' ? JSON.parse(v) : v;

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
    ? d.prepare('SELECT * FROM campaigns WHERE hotel_id = ? ORDER BY created_at DESC').all(hotelId)
    : d.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all()) as Record<string, unknown>[];
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

export function createCampaign(c: { id: string; hotelId: string; name: string; roomTypeId: string; windowLabel: string; nights: number; perks: string[]; rackPrice: number; creatorPrice: number; commissionPct: number; bookingTarget: number; status?: string; meta?: unknown }) {
  const d = db();
  d.prepare(`INSERT INTO campaigns (id, hotel_id, name, room_type_id, window_label, nights, perks, rack_price, creator_price, commission_pct, booking_target, status, created_at, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    c.id, c.hotelId, c.name, c.roomTypeId, c.windowLabel, c.nights, j(c.perks), c.rackPrice, c.creatorPrice, c.commissionPct, c.bookingTarget, c.status ?? 'live', new Date().toISOString(), c.meta ? j(c.meta) : null,
  );
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
    ? db().prepare('SELECT * FROM trips WHERE creator_id = ? ORDER BY published_at DESC').all(creatorId)
    : db().prepare('SELECT * FROM trips ORDER BY saves DESC').all()) as Record<string, unknown>[];
  return rows.map(tripFromRow);
}

export function getTrip(id: string) {
  const row = db().prepare('SELECT * FROM trips WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? tripFromRow(row) : null;
}

export function upsertTrip(t: { id: string; creatorId: string; slug: string; title: string; place: string; days: number; img: string; itinerary: unknown; stays: unknown; pickStayId: string; experiences: unknown; creatorSaving: number; saves: number; travelersBooked: number; tags: string[]; status: string; reelUrl: string; dmKeyword: string; publishedAt: string }) {
  db().prepare(`INSERT INTO trips (id, creator_id, slug, title, place, days, img, itinerary, stays, pick_stay_id, experiences, creator_saving, saves, travelers_booked, tags, status, reel_url, dm_keyword, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, itinerary=excluded.itinerary, stays=excluded.stays, pick_stay_id=excluded.pick_stay_id, experiences=excluded.experiences, creator_saving=excluded.creator_saving, saves=excluded.saves, travelers_booked=excluded.travelers_booked, tags=excluded.tags, status=excluded.status, dm_keyword=excluded.dm_keyword`).run(
    t.id, t.creatorId, t.slug, t.title, t.place, t.days, t.img, j(t.itinerary), j(t.stays), t.pickStayId, j(t.experiences), t.creatorSaving, t.saves, t.travelersBooked, j(t.tags), t.status, t.reelUrl, t.dmKeyword, t.publishedAt,
  );
}

function tripFromRow(r: Record<string, unknown>) {
  return { ...r, itinerary: p(r.itinerary), stays: p(r.stays), experiences: p(r.experiences), tags: p(r.tags) };
}

// ── Bookings ────────────────────────────────────────────────────────

export function listBookings(filters?: { hotelId?: string; creatorId?: string; status?: string }) {
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params: unknown[] = [];
  if (filters?.hotelId) { sql += ' AND hotel_id = ?'; params.push(filters.hotelId); }
  if (filters?.creatorId) { sql += ' AND creator_id = ?'; params.push(filters.creatorId); }
  if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
  sql += ' ORDER BY created_at DESC';
  return (db().prepare(sql).all(...params) as Record<string, unknown>[]).map(bookingFromRow);
}

export function getBooking(id: string) {
  const row = db().prepare('SELECT * FROM bookings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? bookingFromRow(row) : null;
}

export function createBooking(b: { id: string; travelerId: string; guestName: string; guestInitials: string; tripId: string; creatorId: string; hotelId: string; roomTypeId: string; roomName: string; stayId: string; datesLabel: string; nights: number; guests: number; roomValue: number; experiencesValue: number; creatorSaving: number; total: number; experienceIds: string[]; source: string; status?: string; gapNightId?: string }) {
  db().prepare(`INSERT INTO bookings (id, traveler_id, guest_name, guest_initials, trip_id, creator_id, hotel_id, room_type_id, room_name, stay_id, dates_label, nights, guests, room_value, experiences_value, creator_saving, total, experience_ids, source, status, created_at, gap_night_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    b.id, b.travelerId, b.guestName, b.guestInitials, b.tripId, b.creatorId, b.hotelId, b.roomTypeId, b.roomName, b.stayId, b.datesLabel, b.nights, b.guests, b.roomValue, b.experiencesValue, b.creatorSaving, b.total, j(b.experienceIds), b.source, b.status ?? 'upcoming', new Date().toISOString(), b.gapNightId ?? null,
  );
}

export function updateBookingStatus(id: string, status: string) {
  db().prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
}

function bookingFromRow(r: Record<string, unknown>) {
  return { ...r, experienceIds: p(r.experience_ids) };
}

// ── Ledger ──────────────────────────────────────────────────────────

export function listLedger(creatorId: string, status?: string) {
  let sql = 'SELECT * FROM ledger WHERE creator_id = ?';
  const params: unknown[] = [creatorId];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  return db().prepare(sql).all(...params) as Record<string, unknown>[];
}

export function addLedgerEntry(l: { id: string; creatorId: string; bookingId?: string; label: string; meta: string; amount: number; status: string }) {
  db().prepare('INSERT INTO ledger (id, creator_id, booking_id, label, meta, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    l.id, l.creatorId, l.bookingId ?? null, l.label, l.meta, l.amount, l.status, new Date().toISOString(),
  );
}

export function updateLedgerStatus(id: string, status: string) {
  db().prepare('UPDATE ledger SET status = ? WHERE id = ?').run(status, id);
}

// ── Withdrawals ─────────────────────────────────────────────────────

export function createWithdrawal(w: { id: string; creatorId: string; gross: number; tds: number; net: number; upi: string }) {
  db().prepare('INSERT INTO withdrawals (id, creator_id, gross, tds, net, upi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    w.id, w.creatorId, w.gross, w.tds, w.net, w.upi, new Date().toISOString(),
  );
}

export function listWithdrawals(creatorId: string) {
  return db().prepare('SELECT * FROM withdrawals WHERE creator_id = ? ORDER BY created_at DESC').all(creatorId) as Record<string, unknown>[];
}

// ── Travelers ───────────────────────────────────────────────────────

export function getTraveler(id: string) {
  const row = db().prepare('SELECT * FROM travelers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? { ...row, savedTripIds: p(row.saved_trip_ids), savedShopIds: p(row.saved_shop_ids), followingIds: p(row.following_ids), prefs: p(row.prefs) } : null;
}

export function upsertTraveler(t: { id: string; name: string; whatsapp: string; signedIn?: boolean; savedTripIds?: string[]; savedShopIds?: string[]; followingIds?: string[]; prefs?: unknown }) {
  db().prepare(`INSERT INTO travelers (id, name, whatsapp, signed_in, saved_trip_ids, saved_shop_ids, following_ids, prefs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, whatsapp=excluded.whatsapp, signed_in=excluded.signed_in, saved_trip_ids=excluded.saved_trip_ids, saved_shop_ids=excluded.saved_shop_ids, following_ids=excluded.following_ids, prefs=excluded.prefs`).run(
    t.id, t.name, t.whatsapp, t.signedIn ? 1 : 0, j(t.savedTripIds ?? []), j(t.savedShopIds ?? []), j(t.followingIds ?? []), j(t.prefs ?? {}),
  );
}

// ── Attributions ────────────────────────────────────────────────────

export function recordAttribution(a: { travelerId: string; creatorId: string; tripId: string }) {
  const now = new Date();
  const expires = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
  db().prepare(`INSERT INTO attributions (traveler_id, creator_id, trip_id, opened_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(traveler_id, creator_id, trip_id) DO UPDATE SET opened_at=excluded.opened_at, expires_at=excluded.expires_at`).run(
    a.travelerId, a.creatorId, a.tripId, now.toISOString(), expires.toISOString(),
  );
}

export function getAttribution(travelerId: string) {
  return db().prepare("SELECT * FROM attributions WHERE traveler_id = ? AND expires_at > datetime('now') ORDER BY opened_at DESC LIMIT 1").get(travelerId) as Record<string, unknown> | undefined;
}

// ── Settlements ─────────────────────────────────────────────────────

export function listSettlements(hotelId: string) {
  return db().prepare('SELECT * FROM settlements WHERE hotel_id = ? ORDER BY period DESC').all(hotelId) as Record<string, unknown>[];
}

// ── Sequences ───────────────────────────────────────────────────────

export function nextSeq(name: string): number {
  const d = db();
  d.prepare('INSERT INTO sequences (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1').run(name);
  return (d.prepare('SELECT value FROM sequences WHERE name = ?').get(name) as { value: number }).value;
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

export function assembleState(): Record<string, unknown> {
  const d = db();

  const hotelRow = d.prepare('SELECT h.* FROM hotels h WHERE EXISTS (SELECT 1 FROM room_types r WHERE r.hotel_id = h.id) LIMIT 1').get() as Record<string, unknown> | undefined;
  if (!hotelRow) return { v: 2, hotel: { id: '', name: '', city: '', commissionPct: 15, floorRate: 3000, status: 'draft', syncMode: 'manual', rooms: [] }, creators: {}, campaigns: [], trips: [], bookings: [], gapNights: [], ledger: [], withdrawals: [], travelers: {}, attributions: [], reviews: [], settlements: [], seq: {} };

  const roomRows = d.prepare('SELECT * FROM room_types WHERE hotel_id = ?').all(hotelRow.id as string) as Record<string, unknown>[];
  const hotel = {
    id: hotelRow.id, name: hotelRow.name, city: hotelRow.city,
    commissionPct: hotelRow.commission_pct, floorRate: hotelRow.floor_rate,
    status: hotelRow.status, syncMode: hotelRow.sync_mode,
    profile: hotelRow.profile ? JSON.parse(hotelRow.profile as string) : undefined,
    rooms: roomRows.map((r) => ({ id: r.id, name: r.name, count: r.count, sleeps: r.sleeps, rackRate: r.rack_rate, meal: r.meal })),
  };

  const creatorRows = d.prepare('SELECT * FROM creators ORDER BY top DESC, name').all() as Record<string, unknown>[];
  const creators: Record<string, unknown> = {};
  for (const c of creatorRows) {
    creators[c.id as string] = {
      id: c.id, handle: c.handle, name: c.name, ini: c.ini, followers: c.followers,
      niche: c.niche, bio: c.bio, tripsCount: c.trips_count, travelers: c.travelers,
      hue: c.hue, cover: c.cover, score: c.score, conv: c.conv,
      bookingsPerMonth: c.bookings_per_month, ncr: c.ncr, why: c.why,
      top: !!c.top, meta: c.meta,
    };
  }

  const campRows = d.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const campaigns = campRows.map((c) => {
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

  const tripRows = d.prepare('SELECT * FROM trips ORDER BY published_at DESC').all() as Record<string, unknown>[];
  const trips = tripRows.map((t) => ({
    id: t.id, creatorId: t.creator_id, slug: t.slug, title: t.title, place: t.place, days: t.days, img: t.img,
    itinerary: JSON.parse(t.itinerary as string), stays: JSON.parse(t.stays as string),
    pickStayId: t.pick_stay_id, experiences: JSON.parse(t.experiences as string),
    creatorSaving: t.creator_saving, saves: t.saves, travelersBooked: t.travelers_booked,
    tags: JSON.parse(t.tags as string), status: t.status, reelUrl: t.reel_url,
    dmKeyword: t.dm_keyword, publishedAt: t.published_at,
  }));

  const bookingRows = d.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const bookings = bookingRows.map((b) => ({
    id: b.id, travelerId: b.traveler_id, guestName: b.guest_name, guestInitials: b.guest_initials,
    tripId: b.trip_id, creatorId: b.creator_id, hotelId: b.hotel_id, roomTypeId: b.room_type_id,
    roomName: b.room_name, stayId: b.stay_id, datesLabel: b.dates_label, nights: b.nights,
    guests: b.guests, roomValue: b.room_value, experiencesValue: b.experiences_value,
    creatorSaving: b.creator_saving, total: b.total,
    experienceIds: JSON.parse(b.experience_ids as string), source: b.source, status: b.status,
    createdAt: b.created_at, gapNightId: b.gap_night_id ?? undefined,
  }));

  const gapRows = d.prepare('SELECT * FROM gap_nights ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const gapNights = gapRows.map((g) => ({
    id: g.id, hotelId: g.hotel_id, roomTypeId: g.room_type_id, datesLabel: g.dates_label,
    rooms: g.rooms, booked: g.booked, rate: g.rate, campaignRate: g.campaign_rate,
    audience: JSON.parse(g.audience as string), sentTo: g.sent_to,
    createdAt: g.created_at, endsAt: g.ends_at, status: g.status,
    tripIds: JSON.parse(g.trip_ids as string),
  }));

  const ledgerRows = d.prepare('SELECT * FROM ledger ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const ledger = ledgerRows.map((l) => ({
    id: l.id, creatorId: l.creator_id, bookingId: l.booking_id ?? undefined,
    label: l.label, meta: l.meta, amount: l.amount, status: l.status, createdAt: l.created_at,
  }));

  const withdrawalRows = d.prepare('SELECT * FROM withdrawals ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const withdrawals = withdrawalRows.map((w) => ({
    id: w.id, creatorId: w.creator_id, gross: w.gross, tds: w.tds, net: w.net, upi: w.upi, createdAt: w.created_at,
  }));

  const travelerRows = d.prepare('SELECT * FROM travelers').all() as Record<string, unknown>[];
  const travelers: Record<string, unknown> = {};
  for (const t of travelerRows) {
    travelers[t.id as string] = {
      id: t.id, name: t.name, whatsapp: t.whatsapp, signedIn: !!t.signed_in,
      savedTripIds: JSON.parse(t.saved_trip_ids as string),
      savedShopIds: JSON.parse(t.saved_shop_ids as string),
      followingIds: JSON.parse(t.following_ids as string),
      prefs: JSON.parse(t.prefs as string),
    };
  }

  const attrRows = d.prepare('SELECT * FROM attributions ORDER BY opened_at DESC').all() as Record<string, unknown>[];
  const attributions = attrRows.map((a) => ({
    travelerId: a.traveler_id, creatorId: a.creator_id, tripId: a.trip_id,
    openedAt: a.opened_at, expiresAt: a.expires_at,
  }));

  const reviewRows = d.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all() as Record<string, unknown>[];
  const reviews = reviewRows.map((r) => ({
    bookingId: r.booking_id, tripId: r.trip_id, hotelId: r.hotel_id,
    rating: r.rating, matchesReel: r.matches_reel, tip: r.tip, createdAt: r.created_at,
  }));

  const settlementRows = d.prepare('SELECT * FROM settlements ORDER BY period DESC').all() as Record<string, unknown>[];
  const settlements = settlementRows.map((s) => ({
    id: s.id, hotelId: s.hotel_id, period: s.period, stays: s.stays,
    gross: s.gross, commission: s.commission, net: s.net,
  }));

  const seqRows = d.prepare('SELECT * FROM sequences').all() as Record<string, unknown>[];
  const seq: Record<string, number> = {};
  for (const s of seqRows) seq[s.name as string] = s.value as number;

  return { v: 2, hotel, creators, campaigns, trips, bookings, gapNights, ledger, withdrawals, travelers, attributions, reviews, settlements, seq };
}

// ── Dispatch handler (persists reducer actions to the DB) ────────────

export function dispatchAction(action: Record<string, unknown>): void {
  const d = db();
  switch (action.type as string) {
    case 'hotel/update': {
      const patch = action.patch as Record<string, unknown>;
      const hotel = d.prepare('SELECT id FROM hotels LIMIT 1').get() as { id: string } | undefined;
      if (!hotel) break;
      const map: Record<string, string> = { name: 'name', city: 'city', commissionPct: 'commission_pct', floorRate: 'floor_rate', status: 'status', syncMode: 'sync_mode', profile: 'profile' };
      const fields: string[] = []; const values: unknown[] = [];
      for (const [k, v] of Object.entries(patch)) { if (map[k]) { fields.push(`${map[k]} = ?`); values.push(k === 'profile' ? j(v) : v); } }
      if (fields.length) { values.push(hotel.id); d.prepare(`UPDATE hotels SET ${fields.join(', ')} WHERE id = ?`).run(...values); }
      if (Array.isArray(patch.rooms)) {
        d.prepare('DELETE FROM room_types WHERE hotel_id = ?').run(hotel.id);
        const ins = d.prepare('INSERT INTO room_types (id, hotel_id, name, count, sleeps, rack_rate, meal) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const r of patch.rooms as Record<string, unknown>[]) ins.run(r.id, hotel.id, r.name, r.count, r.sleeps, r.rackRate, r.meal);
      }
      break;
    }
    case 'campaign/create': { createCampaign(action.campaign as Parameters<typeof createCampaign>[0]); nextSeq('campaign'); break; }
    case 'campaign/invite': { inviteCreator(action.campaignId as string, action.creatorId as string); break; }
    case 'offer/respond': {
      const { campaignId, creatorId, response, counter } = action as { campaignId: string; creatorId: string; response: string; counter?: unknown };
      if (response === 'accepted') {
        const camp = d.prepare('SELECT commission_pct FROM campaigns WHERE id = ?').get(campaignId) as { commission_pct: number } | undefined;
        respondToInvite(campaignId, creatorId, response, camp?.commission_pct);
      } else if (response === 'countered' && counter) {
        respondToInvite(campaignId, creatorId, response, undefined, counter);
      } else {
        respondToInvite(campaignId, creatorId, response);
      }
      break;
    }
    case 'offer/resolveCounter': {
      const { campaignId, creatorId, accept } = action as { campaignId: string; creatorId: string; accept: boolean };
      if (accept) {
        const inv = d.prepare('SELECT counter FROM campaign_invites WHERE campaign_id = ? AND creator_id = ?').get(campaignId, creatorId) as { counter: string } | undefined;
        const pct = inv?.counter ? (JSON.parse(inv.counter) as { pct: number }).pct : undefined;
        const camp = d.prepare('SELECT commission_pct FROM campaigns WHERE id = ?').get(campaignId) as { commission_pct: number };
        respondToInvite(campaignId, creatorId, 'accepted', pct ?? camp.commission_pct);
      } else {
        respondToInvite(campaignId, creatorId, 'declined');
      }
      break;
    }
    case 'trip/publish': { upsertTrip(action.trip as Parameters<typeof upsertTrip>[0]); break; }
    case 'trip/status': { d.prepare('UPDATE trips SET status = ? WHERE id = ?').run(action.status, action.tripId); break; }

    case 'traveler/patch': {
      const t = getTraveler(action.id as string);
      if (!t) break;
      const patch = action.patch as Record<string, unknown>;
      upsertTraveler({ id: action.id as string, name: (patch.name ?? t.name) as string, whatsapp: (patch.whatsapp ?? t.whatsapp) as string, signedIn: (patch.signedIn ?? t.signedIn) as boolean, savedTripIds: (patch.savedTripIds ?? t.savedTripIds) as string[], savedShopIds: (patch.savedShopIds ?? t.savedShopIds) as string[], followingIds: (patch.followingIds ?? t.followingIds) as string[], prefs: patch.prefs ?? t.prefs });
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
    case 'traveler/openLink': {
      const { travelerId, creatorId, tripId, now } = action as { travelerId: string; creatorId: string; tripId: string; now: string };
      const expires = new Date(new Date(now).getTime() + 60 * 86_400_000).toISOString();
      d.prepare('INSERT INTO attributions (traveler_id, creator_id, trip_id, opened_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(traveler_id, creator_id, trip_id) DO UPDATE SET opened_at = excluded.opened_at, expires_at = excluded.expires_at').run(travelerId, creatorId, tripId, now, expires);
      break;
    }

    case 'booking/create': {
      const b = action.booking as Record<string, unknown>;
      d.transaction(() => {
        createBooking(b as Parameters<typeof createBooking>[0]);
        const trip = d.prepare('SELECT place FROM trips WHERE id = ?').get(b.tripId) as { place: string } | undefined;
        const commission = Math.round((b.total as number) * 0.12); // PROTO: matches @staystory/core CREATOR_COMMISSION_PCT
        const seqVal = nextSeq('ledger');
        addLedgerEntry({ id: `l${seqVal}`, creatorId: b.creatorId as string, bookingId: b.id as string, label: `${trip?.place ?? 'Trip'} · ${b.guestName}`, meta: `${b.roomName} · stays ${b.datesLabel}${b.source === 'gap_night' ? ' · via Gap Night' : ''}`, amount: commission, status: 'pending_stay' });
        if (b.gapNightId) d.prepare('UPDATE gap_nights SET booked = booked + 1 WHERE id = ?').run(b.gapNightId);
        d.prepare('UPDATE trips SET travelers_booked = travelers_booked + 1 WHERE id = ?').run(b.tripId);
        nextSeq('booking');
      })();
      break;
    }
    case 'booking/status': {
      const { id, status } = action as { id: string; status: string };
      if (status === 'in_house') { d.prepare("UPDATE bookings SET status = 'in_house' WHERE id = ? AND status = 'upcoming'").run(id); }
      else if (status === 'completed') { d.transaction(() => { d.prepare("UPDATE bookings SET status = 'completed' WHERE id = ? AND status IN ('in_house', 'upcoming')").run(id); d.prepare("UPDATE ledger SET status = 'available' WHERE booking_id = ? AND status = 'pending_stay'").run(id); })(); }
      break;
    }
    case 'booking/cancel': {
      d.transaction(() => {
        const bk = d.prepare('SELECT gap_night_id FROM bookings WHERE id = ?').get(action.id) as { gap_night_id: string | null } | undefined;
        d.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(action.id);
        d.prepare("UPDATE ledger SET status = 'cancelled', amount = 0 WHERE booking_id = ? AND status != 'paid'").run(action.id);
        if (bk?.gap_night_id) d.prepare('UPDATE gap_nights SET booked = max(0, booked - 1) WHERE id = ?').run(bk.gap_night_id);
      })();
      break;
    }
    case 'booking/dates': {
      const { id, datesLabel, delta } = action as { id: string; datesLabel: string; delta: number };
      d.transaction(() => {
        d.prepare('UPDATE bookings SET dates_label = ?, total = total + ?, room_value = room_value + ? WHERE id = ?').run(datesLabel, delta, delta, id);
        const bk = d.prepare('SELECT total FROM bookings WHERE id = ?').get(id) as { total: number } | undefined;
        if (bk) d.prepare("UPDATE ledger SET amount = ? WHERE booking_id = ? AND status = 'pending_stay'").run(Math.round(bk.total * 0.12), id);
      })();
      break;
    }
    case 'review/add': {
      const r = action.review as Record<string, unknown>;
      d.prepare('INSERT INTO reviews (booking_id, trip_id, hotel_id, rating, matches_reel, tip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(booking_id) DO UPDATE SET rating = excluded.rating, matches_reel = excluded.matches_reel, tip = excluded.tip').run(r.bookingId, r.tripId, r.hotelId, r.rating, r.matchesReel, r.tip, r.createdAt);
      break;
    }
    case 'gap/release': {
      const g = action.gap as Record<string, unknown>;
      d.prepare('INSERT INTO gap_nights (id, hotel_id, room_type_id, dates_label, rooms, booked, rate, campaign_rate, audience, sent_to, created_at, ends_at, status, trip_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(g.id, g.hotelId, g.roomTypeId, g.datesLabel, g.rooms, g.booked ?? 0, g.rate, g.campaignRate, j(g.audience), g.sentTo, g.createdAt, g.endsAt, g.status, j(g.tripIds));
      nextSeq('gap');
      break;
    }
    case 'creator/withdraw': {
      const { creatorId, upi, id: wId } = action as { creatorId: string; upi: string; id: string; now: string };
      d.transaction(() => {
        const avail = d.prepare("SELECT coalesce(sum(amount), 0) as total FROM ledger WHERE creator_id = ? AND status = 'available'").get(creatorId) as { total: number };
        if (!avail.total) return;
        const gross = avail.total; const tds = Math.round(gross * 0.1); const net = gross - tds;
        d.prepare("UPDATE ledger SET status = 'paid' WHERE creator_id = ? AND status = 'available'").run(creatorId);
        const seqVal = nextSeq('ledger');
        addLedgerEntry({ id: `l${seqVal}`, creatorId, label: 'December withdrawal', meta: 'Requested today · 10% TDS deducted', amount: net, status: 'processing' });
        createWithdrawal({ id: wId, creatorId, gross, tds, net, upi });
        nextSeq('withdrawal');
      })();
      break;
    }
    case 'dev/ensureGap': {
      const now = action.now as string;
      const has = d.prepare("SELECT count(*) as n FROM gap_nights WHERE status = 'live'").get() as { n: number };
      if (has.n > 0) break;
      const h = d.prepare('SELECT id FROM hotels LIMIT 1').get() as { id: string } | undefined;
      if (!h) break;
      const gapId = `gap${nextSeq('gap')}`;
      d.prepare('INSERT INTO gap_nights (id, hotel_id, room_type_id, dates_label, rooms, booked, rate, campaign_rate, audience, sent_to, created_at, ends_at, status, trip_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(gapId, h.id, 'lake-deluxe', 'Dec 19 – 21', 4, 0, 3400, 4200, '["saved","free","budget"]', 312, now, new Date(new Date(now).getTime() + 48 * 3_600_000).toISOString(), 'live', '["anaya-udaipur"]');
      break;
    }
  }
}
