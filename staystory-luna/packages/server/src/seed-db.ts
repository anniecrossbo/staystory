import { db, closeDb } from './db';
import { seedState, SEED_CREATORS, type MCreator } from '@staystory/market';

let _seeded = false;

/** Populate the database with the same fixtures the localStorage store uses. Idempotent: skips if data exists. */
export function seedDatabase(dataDir?: string): void {
  if (_seeded) return;
  const d = db(dataDir);
  const count = (d.prepare('SELECT count(*) as n FROM hotels').get() as { n: number }).n;
  if (count > 0) { _seeded = true; return; }

  const s = seedState();

  d.transaction(() => {
    // Hotel
    d.prepare('INSERT INTO hotels (id, name, city, commission_pct, floor_rate, status, sync_mode) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      s.hotel.id, s.hotel.name, s.hotel.city, s.hotel.commissionPct, s.hotel.floorRate, s.hotel.status, s.hotel.syncMode,
    );
    const insRoom = d.prepare('INSERT INTO room_types (id, hotel_id, name, count, sleeps, rack_rate, meal) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const r of s.hotel.rooms) insRoom.run(r.id, s.hotel.id, r.name, r.count, r.sleeps, r.rackRate, r.meal);

    // Creators
    const insCreator = d.prepare(`INSERT INTO creators (id, handle, name, ini, followers, niche, bio, trips_count, travelers, hue, cover, score, conv, bookings_per_month, ncr, why, top, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const c of SEED_CREATORS) {
      insCreator.run(c.id, c.handle, c.name, c.ini, c.followers, c.niche, c.bio, c.tripsCount ?? null, c.travelers ?? null, c.hue, c.cover ?? null, c.score ?? null, c.conv ?? null, c.bookingsPerMonth ?? null, c.ncr ?? null, c.why ?? null, c.top ? 1 : 0, c.meta ?? null);
    }

    // Insert placeholder hotels for any campaign that references one not yet in the table
    const hotelIds = new Set([s.hotel.id]);
    const insPlaceholderHotel = d.prepare('INSERT OR IGNORE INTO hotels (id, name, city, commission_pct, floor_rate, status, sync_mode) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const camp of s.campaigns) {
      if (!hotelIds.has(camp.hotelId)) {
        insPlaceholderHotel.run(camp.hotelId, camp.meta?.hotelName ?? camp.hotelId, camp.meta?.city ?? 'India', camp.commissionPct, 3000, 'submitted', 'manual');
        hotelIds.add(camp.hotelId);
      }
    }

    // Campaigns
    const insCamp = d.prepare(`INSERT INTO campaigns (id, hotel_id, name, room_type_id, window_label, nights, perks, rack_price, creator_price, commission_pct, booking_target, status, created_at, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insInvite = d.prepare('INSERT INTO campaign_invites (campaign_id, creator_id, status, agreed_pct, counter) VALUES (?, ?, ?, ?, ?)');
    for (const camp of s.campaigns) {
      insCamp.run(camp.id, camp.hotelId, camp.name, camp.roomTypeId, camp.windowLabel, camp.nights, JSON.stringify(camp.perks), camp.rackPrice, camp.creatorPrice, camp.commissionPct, camp.bookingTarget, camp.status, camp.createdAt, camp.meta ? JSON.stringify(camp.meta) : null);
      for (const [creatorId, status] of Object.entries(camp.invites)) {
        const agreedPct = camp.agreedPct[creatorId] ?? null;
        const counter = camp.counters[creatorId] ? JSON.stringify(camp.counters[creatorId]) : null;
        insInvite.run(camp.id, creatorId, status, agreedPct, counter);
      }
    }

    // Trips
    const insTrip = d.prepare(`INSERT INTO trips (id, creator_id, slug, title, place, days, img, itinerary, stays, pick_stay_id, experiences, creator_saving, saves, travelers_booked, tags, status, reel_url, dm_keyword, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const t of s.trips) {
      insTrip.run(t.id, t.creatorId, t.slug, t.title, t.place, t.days, t.img, JSON.stringify(t.itinerary), JSON.stringify(t.stays), t.pickStayId, JSON.stringify(t.experiences), t.creatorSaving, t.saves, t.travelersBooked, JSON.stringify(t.tags), t.status, t.reelUrl, t.dmKeyword, t.publishedAt);
    }

    // Bookings
    const insBooking = d.prepare(`INSERT INTO bookings (id, traveler_id, guest_name, guest_initials, trip_id, creator_id, hotel_id, room_type_id, room_name, stay_id, dates_label, nights, guests, room_value, experiences_value, creator_saving, total, experience_ids, source, status, created_at, gap_night_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const b of s.bookings) {
      insBooking.run(b.id, b.travelerId, b.guestName, b.guestInitials, b.tripId, b.creatorId, b.hotelId, b.roomTypeId, b.roomName, b.stayId, b.datesLabel, b.nights, b.guests, b.roomValue, b.experiencesValue, b.creatorSaving, b.total, JSON.stringify(b.experienceIds), b.source, b.status, b.createdAt, b.gapNightId ?? null);
    }

    // Ledger
    const insLedger = d.prepare('INSERT INTO ledger (id, creator_id, booking_id, label, meta, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const l of s.ledger) {
      insLedger.run(l.id, l.creatorId, l.bookingId ?? null, l.label, l.meta, l.amount, l.status, l.createdAt);
    }

    // Travelers
    const insTraveler = d.prepare('INSERT INTO travelers (id, name, whatsapp, signed_in, saved_trip_ids, saved_shop_ids, following_ids, prefs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const [id, t] of Object.entries(s.travelers)) {
      insTraveler.run(id, t.name, t.whatsapp, t.signedIn ? 1 : 0, JSON.stringify(t.savedTripIds), JSON.stringify(t.savedShopIds), JSON.stringify(t.followingIds), JSON.stringify(t.prefs));
    }

    // Settlements
    const insSettlement = d.prepare('INSERT INTO settlements (id, hotel_id, period, stays, gross, commission, net) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const st of s.settlements) {
      insSettlement.run(st.id, st.hotelId, st.period, st.stays, st.gross, st.commission, st.net);
    }

    // Sequences
    const insSeq = d.prepare('INSERT INTO sequences (name, value) VALUES (?, ?)');
    for (const [name, value] of Object.entries(s.seq)) {
      insSeq.run(name, value);
    }
  })();
}

/** CLI entry: `npx tsx packages/server/src/seed-db.ts` */
if (process.argv[1]?.endsWith('seed-db.ts')) {
  seedDatabase();
  console.log('Database seeded.');
  closeDb();
}
