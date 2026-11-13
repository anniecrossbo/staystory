import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { seedState } from '@staystory/market';
import { handleApi } from '../src';
import { closeDb, db } from '../src/db';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'staystory-api-')); db(dir); });
afterEach(() => { closeDb(); rmSync(dir, { recursive: true, force: true }); });

const call = (method: string, path: string, body?: unknown) => handleApi(method, new URL(`http://x${path}`), body, {});
const state = async () => JSON.parse(String((await call('GET', '/api/db/state'))!.body)) as ReturnType<typeof seedState>;

it('seeds a fresh database before serving the first /api/db request', async () => {
  const s = await state();
  expect(s.hotel.id).toBe('haveli-jheel');
  expect(s.trips.length).toBe(seedState().trips.length);
});

it('a booking dispatched over the API survives a reload and shows for hotel, creator and traveler', async () => {
  const b = { ...seedState().bookings[1]!, id: 'SS-API-1', travelerId: 'meera', creatorId: 'anaya', total: 14000, roomValue: 8400, source: 'link', status: 'upcoming', createdAt: '2026-11-14T10:00:00.000Z' };
  expect((await call('POST', '/api/db/dispatch', { type: 'booking/create', booking: b }))!.status).toBe(200);
  closeDb(); db(dir); // a reload: a new connection to the same file
  const s = await state();
  expect(s.bookings[0]).toMatchObject({ id: 'SS-API-1', travelerId: 'meera' });
  expect(s.ledger[0]).toMatchObject({ bookingId: 'SS-API-1', creatorId: 'anaya', amount: 1120 });
});

it('dev/reset over the API wipes and reseeds', async () => {
  await call('POST', '/api/db/dispatch', { type: 'trip/status', tripId: 'anaya-udaipur', status: 'paused' });
  await call('POST', '/api/db/dispatch', { type: 'dev/reset' });
  expect((await state()).trips.find((t) => t.id === 'anaya-udaipur')?.status).toBe('live');
});
