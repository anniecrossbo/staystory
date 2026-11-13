import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

let _db: Database.Database | null = null;

/** Returns the singleton DB connection, creating the file and tables on first call. */
export function db(dataDir?: string): Database.Database {
  if (_db) return _db;
  const dir = dataDir ?? resolve(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  _db = new Database(resolve(dir, 'staystory.db'));
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

/** Closes the connection (useful for tests). */
export function closeDb(): void { _db?.close(); _db = null; }

function migrate(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS hotels (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      city        TEXT NOT NULL,
      commission_pct INTEGER NOT NULL DEFAULT 15,
      floor_rate  INTEGER NOT NULL DEFAULT 3000,
      status      TEXT NOT NULL DEFAULT 'draft',
      sync_mode   TEXT NOT NULL DEFAULT 'manual',
      profile     TEXT -- JSON
    );

    CREATE TABLE IF NOT EXISTS room_types (
      id        TEXT NOT NULL,
      hotel_id  TEXT NOT NULL REFERENCES hotels(id),
      name      TEXT NOT NULL,
      count     INTEGER NOT NULL,
      sleeps    INTEGER NOT NULL,
      rack_rate INTEGER NOT NULL,
      meal      TEXT NOT NULL DEFAULT 'Room only',
      PRIMARY KEY (hotel_id, id)
    );

    CREATE TABLE IF NOT EXISTS creators (
      id        TEXT PRIMARY KEY,
      handle    TEXT NOT NULL,
      name      TEXT NOT NULL,
      ini       TEXT NOT NULL,
      followers TEXT NOT NULL,
      niche     TEXT NOT NULL,
      bio       TEXT NOT NULL DEFAULT '',
      trips_count TEXT,
      travelers TEXT,
      hue       TEXT NOT NULL DEFAULT 'moss',
      cover     TEXT,
      score     TEXT,
      conv      TEXT,
      bookings_per_month TEXT,
      ncr       TEXT,
      why       TEXT,
      top       INTEGER NOT NULL DEFAULT 0,
      meta      TEXT
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id             TEXT PRIMARY KEY,
      hotel_id       TEXT NOT NULL REFERENCES hotels(id),
      name           TEXT NOT NULL,
      room_type_id   TEXT NOT NULL,
      window_label   TEXT NOT NULL,
      nights         INTEGER NOT NULL,
      perks          TEXT NOT NULL DEFAULT '[]', -- JSON array
      rack_price     INTEGER NOT NULL,
      creator_price  INTEGER NOT NULL,
      commission_pct INTEGER NOT NULL,
      booking_target INTEGER NOT NULL DEFAULT 0,
      status         TEXT NOT NULL DEFAULT 'live',
      created_at     TEXT NOT NULL,
      meta           TEXT -- JSON
    );

    CREATE TABLE IF NOT EXISTS campaign_invites (
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      creator_id  TEXT NOT NULL REFERENCES creators(id),
      status      TEXT NOT NULL DEFAULT 'invited',
      agreed_pct  INTEGER,
      counter     TEXT, -- JSON { pct, message, extras }
      PRIMARY KEY (campaign_id, creator_id)
    );

    CREATE TABLE IF NOT EXISTS trips (
      id              TEXT PRIMARY KEY,
      creator_id      TEXT NOT NULL REFERENCES creators(id),
      slug            TEXT NOT NULL,
      title           TEXT NOT NULL,
      place           TEXT NOT NULL,
      days            INTEGER NOT NULL,
      img             TEXT NOT NULL DEFAULT '',
      itinerary       TEXT NOT NULL DEFAULT '[]', -- JSON
      stays           TEXT NOT NULL DEFAULT '[]', -- JSON
      pick_stay_id    TEXT,
      experiences     TEXT NOT NULL DEFAULT '[]', -- JSON
      creator_saving  INTEGER NOT NULL DEFAULT 0,
      saves           INTEGER NOT NULL DEFAULT 0,
      travelers_booked INTEGER NOT NULL DEFAULT 0,
      tags            TEXT NOT NULL DEFAULT '[]', -- JSON
      status          TEXT NOT NULL DEFAULT 'live',
      reel_url        TEXT NOT NULL DEFAULT '',
      dm_keyword      TEXT NOT NULL DEFAULT 'link',
      published_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id                TEXT PRIMARY KEY,
      traveler_id       TEXT NOT NULL,
      guest_name        TEXT NOT NULL,
      guest_initials    TEXT NOT NULL,
      trip_id           TEXT NOT NULL,
      creator_id        TEXT NOT NULL,
      hotel_id          TEXT NOT NULL,
      room_type_id      TEXT NOT NULL,
      room_name         TEXT NOT NULL,
      stay_id           TEXT NOT NULL,
      dates_label       TEXT NOT NULL,
      nights            INTEGER NOT NULL,
      guests            INTEGER NOT NULL DEFAULT 2,
      room_value        INTEGER NOT NULL,
      experiences_value INTEGER NOT NULL DEFAULT 0,
      creator_saving    INTEGER NOT NULL DEFAULT 0,
      total             INTEGER NOT NULL,
      experience_ids    TEXT NOT NULL DEFAULT '[]', -- JSON
      source            TEXT NOT NULL DEFAULT 'link',
      status            TEXT NOT NULL DEFAULT 'upcoming',
      created_at        TEXT NOT NULL,
      gap_night_id      TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_hotel ON bookings(hotel_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_creator ON bookings(creator_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

    CREATE TABLE IF NOT EXISTS gap_nights (
      id            TEXT PRIMARY KEY,
      hotel_id      TEXT NOT NULL REFERENCES hotels(id),
      room_type_id  TEXT NOT NULL,
      dates_label   TEXT NOT NULL,
      rooms         INTEGER NOT NULL,
      booked        INTEGER NOT NULL DEFAULT 0,
      rate          INTEGER NOT NULL,
      campaign_rate INTEGER NOT NULL,
      audience      TEXT NOT NULL DEFAULT '[]', -- JSON
      sent_to       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      ends_at       TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'live',
      trip_ids      TEXT NOT NULL DEFAULT '[]' -- JSON
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id          TEXT PRIMARY KEY,
      creator_id  TEXT NOT NULL,
      booking_id  TEXT,
      label       TEXT NOT NULL,
      meta        TEXT NOT NULL DEFAULT '',
      amount      INTEGER NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending_stay',
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_creator ON ledger(creator_id);

    CREATE TABLE IF NOT EXISTS withdrawals (
      id          TEXT PRIMARY KEY,
      creator_id  TEXT NOT NULL,
      gross       INTEGER NOT NULL,
      tds         INTEGER NOT NULL,
      net         INTEGER NOT NULL,
      upi         TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS travelers (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      whatsapp        TEXT NOT NULL,
      signed_in       INTEGER NOT NULL DEFAULT 0,
      saved_trip_ids  TEXT NOT NULL DEFAULT '[]', -- JSON
      saved_shop_ids  TEXT NOT NULL DEFAULT '[]', -- JSON
      following_ids   TEXT NOT NULL DEFAULT '[]', -- JSON
      prefs           TEXT NOT NULL DEFAULT '{}' -- JSON
    );

    CREATE TABLE IF NOT EXISTS attributions (
      traveler_id TEXT NOT NULL,
      creator_id  TEXT NOT NULL,
      trip_id     TEXT NOT NULL,
      opened_at   TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      PRIMARY KEY (traveler_id, creator_id, trip_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      booking_id   TEXT PRIMARY KEY,
      trip_id      TEXT NOT NULL,
      hotel_id     TEXT NOT NULL,
      rating       INTEGER NOT NULL,
      matches_reel TEXT NOT NULL DEFAULT 'spot',
      tip          TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id          TEXT PRIMARY KEY,
      hotel_id    TEXT NOT NULL REFERENCES hotels(id),
      period      TEXT NOT NULL,
      stays       INTEGER NOT NULL,
      gross       INTEGER NOT NULL,
      commission  INTEGER NOT NULL,
      net         INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sequences (
      name  TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );
  `);
}
