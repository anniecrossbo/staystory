import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketStore, seedState } from '../src';

const act = { type: 'trip/status', tripId: 'anaya-udaipur', status: 'paused' } as const;

/** A fake server: GET /state returns `serverState` after `delay` ms; POSTs are recorded in arrival order. */
function fakeServer(serverState: unknown, delay = 20) {
  const posts: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST') { posts.push(JSON.parse(init.body!).type + ':' + (JSON.parse(init.body!).status ?? JSON.parse(init.body!).text ?? '')); return { ok: true, json: async () => ({}) }; }
    await new Promise((r) => setTimeout(r, delay));
    return { ok: true, json: async () => serverState };
  }));
  return posts;
}
afterEach(() => vi.unstubAllGlobals());

describe('database-backed store', () => {
  it('hydrates from the server', async () => {
    const server = { ...seedState(), hotel: { ...seedState().hotel, name: 'From the database' } };
    fakeServer(server);
    const s = new MarketStore(false);
    await s.connectApi('/api/db');
    expect(s.get().hotel.name).toBe('From the database');
  });

  it('keeps an action dispatched before the server answered, on top of the server state', async () => {
    const posts = fakeServer(seedState(), 40);
    const s = new MarketStore(false);
    const connecting = s.connectApi('/api/db');
    s.dispatch(act); // staged deep link, tap before hydration finishes
    await connecting;
    await new Promise((r) => setTimeout(r, 60));
    expect(s.get().trips.find((t) => t.id === 'anaya-udaipur')!.status).toBe('paused');
    expect(posts).toEqual(['trip/status:paused']);
  });

  it('sends writes to the server one at a time, in the order they were made', async () => {
    const order: string[] = [];
    let inFlight = 0, maxInFlight = 0;
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: { method?: string; body?: string }) => {
      if (init?.method !== 'POST') return { ok: true, json: async () => seedState() };
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      const a = JSON.parse(init.body!); await new Promise((r) => setTimeout(r, a.status === 'paused' ? 30 : 1));
      order.push(a.status); inFlight--; return { ok: true, json: async () => ({}) };
    }));
    const s = new MarketStore(false);
    await s.connectApi('/api/db');
    s.dispatch({ type: 'trip/status', tripId: 'anaya-udaipur', status: 'paused' });
    s.dispatch({ type: 'trip/status', tripId: 'anaya-udaipur', status: 'live' });
    await new Promise((r) => setTimeout(r, 90));
    expect(order).toEqual(['paused', 'live']);
    expect(maxInFlight).toBe(1);
  });
});
