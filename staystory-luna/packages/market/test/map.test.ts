import { describe, expect, it } from 'vitest';
import { fitPoints, mapQuery, mapsLink, seedState, tripMap, zoomForSpread } from '../src';

const udaipur = seedState().trips.find((t) => t.id === 'anaya-udaipur')!;

describe('trip map', () => {
  it('puts the stay first then stops in itinerary order', () => {
    const m = tripMap(udaipur)!;
    expect(m.markers.map((p) => p.label).join('')).toBe('ABCDEFG');
    expect(m.markers[0]!.name).toBe('Haveli Jheel');
    expect(m.markers.slice(1).map((p) => p.name)).toEqual(['Sunset boat, Lake Pichola', 'Dinner at Ambrai ghat', 'City Palace guided walk', 'Bagore ki Haveli', 'Sajjangarh at sunrise', 'Hathi Pol market']);
  });
  it('centres on the average of the points', () => {
    const f = fitPoints([{ lat: 10, lng: 20 }, { lat: 12, lng: 24 }])!;
    expect(f.center).toEqual({ lat: 11, lng: 22 });
  });
  it('zooms out as the spread grows', () => {
    expect(zoomForSpread(0.001)).toBe(16);
    expect(zoomForSpread(0.03)).toBe(13);
    expect(zoomForSpread(0.3)).toBe(10);
    expect(zoomForSpread(10)).toBe(5);
    expect(tripMap(udaipur)!.zoom).toBe(12);
    expect(fitPoints([{ lat: 1, lng: 1 }])!.zoom).toBe(15);
  });
  it('is null without coordinates', () => {
    const other = seedState().trips.find((t) => t.id !== 'anaya-udaipur')!;
    expect(tripMap(other)).toBeNull();
    expect(fitPoints([])).toBeNull();
  });
  it('builds the request and link', () => {
    const m = tripMap(udaipur)!;
    const q = mapQuery(m, { w: 393, h: 200 }, m.markers[1]);
    expect(q).toContain('zoom=16');
    expect(q).toContain('w=393&h=200');
    expect(mapsLink(m.markers[0]!)).toBe('https://www.google.com/maps/search/?api=1&query=24.5737,73.6796');
  });
});
