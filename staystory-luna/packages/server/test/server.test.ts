import { describe, expect, it } from 'vitest';
import { SAMPLE_REELS, extract, extractWithRules, handleApi, isUsable, staticMapUrl } from '../src';

const call = (method: string, path: string, body?: unknown, env = {}) => handleApi(method, new URL(`http://x${path}`), body, env);

describe('rule-based reel reading', () => {
  it('reads the Udaipur sample caption', () => {
    const e = extractWithRules(SAMPLE_REELS[0]!.caption);
    expect(e).toMatchObject({ destination: 'Udaipur', days: 3, budgetPerPerson: 15000, namedStay: 'a haveli by the lake' });
    expect(e.places).toEqual(expect.arrayContaining(['City Palace', 'Lake Pichola', 'Ambrai Ghat']));
  });
  it('reads "weekend" as 2 days and "₹6k" as 6,000', () => {
    const e = extractWithRules(SAMPLE_REELS[1]!.caption);
    expect(e).toMatchObject({ destination: 'Jaipur', days: 2, budgetPerPerson: 6000, namedStay: 'The Verandah' });
  });
  it('never invents places the caption does not mention', () => {
    const e = extractWithRules('Loved our time in Goa, so relaxed!');
    expect(e.destination).toBe('Goa');
    expect(e.places).toEqual([]);
    expect(isUsable(e)).toBe(false);
  });
  it('reports nothing usable for an unrelated caption', () => {
    expect(isUsable(extractWithRules('New haircut, who dis'))).toBe(false);
  });
});

describe('extract fallbacks', () => {
  it('uses the cached sample when no AI key is set', async () => {
    const r = await extract(SAMPLE_REELS[0]!.caption, '', {});
    expect(r.source).toBe('cache');
    expect(r.extraction.destination).toBe('Udaipur');
  });
  it('falls back to rules for an unknown caption', async () => {
    expect((await extract('Two days in Jodhpur. Mehrangarh Fort at sunrise.', '', {})).source).toBe('rules');
  });
});

describe('api', () => {
  it('reports which integrations are configured, never the keys', async () => {
    const r = await call('GET', '/api/status', undefined, { LITEAPI_KEY: 'secret-1', GOOGLE_MAPS_KEY: 'secret-2' });
    expect(JSON.parse(r!.body as string)).toEqual({ ai: null, hotels: true, maps: true });
    expect(r!.body as string).not.toContain('secret');
  });
  it('validates extract input', async () => {
    expect((await call('POST', '/api/extract', { caption: 'hi' }))!.status).toBe(400);
    const ok = await call('POST', '/api/extract', { caption: SAMPLE_REELS[0]!.caption });
    expect(JSON.parse(ok!.body as string)).toMatchObject({ source: 'cache', usable: true });
  });
  it('adds coordinates for places it knows, so the trip map has something to draw', async () => {
    const r = JSON.parse((await call('POST', '/api/extract', { caption: SAMPLE_REELS[0]!.caption }))!.body as string);
    expect(r.coords['City Palace']).toEqual({ lat: 24.5764, lng: 73.6835 });
    expect(r.coords['Lake Pichola boat ride']).toBeDefined();
    expect(r.coords['Old City']).toBeUndefined();
  });
  it('validates hotel search input', async () => {
    expect((await call('GET', '/api/hotels?cityName=Udaipur'))!.status).toBe(400);
  });
  it('returns hotels as a fallback with a note when no LiteAPI key is set', async () => {
    const r = await call('GET', '/api/hotels?cityName=Udaipur&checkIn=2026-12-19&checkOut=2026-12-21');
    expect(JSON.parse(r!.body as string)).toMatchObject({ hotels: [], source: 'fallback' });
  });
  it('returns 204 for a map without a key, and builds a keyed URL only server side', async () => {
    expect((await call('GET', '/api/map?lat=24.58&lng=73.68'))!.status).toBe(204);
    expect(staticMapUrl({ center: { lat: 1, lng: 2 }, zoom: 13, width: 300, height: 200, markers: [{ lat: 1, lng: 2, label: 'A' }] }, { GOOGLE_MAPS_KEY: 'k' })).toContain('key=k');
  });
  it('ignores unknown routes', async () => { expect(await call('GET', '/api/nope')).toBeNull(); });
});
