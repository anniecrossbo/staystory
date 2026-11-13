import type { MStay, MTrip } from './types';
import { pickStay } from './travel';

export interface MapPoint { label: string; name: string; lat: number; lng: number }
export interface TripMap { center: { lat: number; lng: number }; zoom: number; markers: MapPoint[] }

const has = (x: { lat?: number; lng?: number }): x is { lat: number; lng: number } => Number.isFinite(x.lat) && Number.isFinite(x.lng);
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Zoom for the widest spread (in degrees) of the points: a bigger spread zooms out. */
export function zoomForSpread(spread: number): number {
  const steps: [number, number][] = [[0.005, 16], [0.01, 15], [0.02, 14], [0.05, 13], [0.1, 12], [0.2, 11], [0.5, 10], [1, 9], [2, 8], [5, 7]];
  return steps.find(([max]) => spread < max)?.[1] ?? 5;
}

/** Centre (average of the points) and zoom that fit them. */
export function fitPoints(points: { lat: number; lng: number }[]): { center: { lat: number; lng: number }; zoom: number } | null {
  if (!points.length) return null;
  const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const spread = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  return { center: { lat: avg(lats), lng: avg(lngs) }, zoom: points.length === 1 ? 15 : zoomForSpread(spread) };
}

/** Markers for the chosen stay (A) then each itinerary stop with coordinates in order. Null when nothing has coordinates, so the section stays hidden. */
export function tripMap(trip: MTrip, stay: MStay = pickStay(trip)): TripMap | null {
  const pts: Omit<MapPoint, 'label'>[] = [];
  if (has(stay)) pts.push({ name: stay.name, lat: stay.lat, lng: stay.lng });
  for (const d of trip.itinerary) for (const s of d.stops) if (has(s) && s.kind !== 'Stay') pts.push({ name: s.name, lat: s.lat, lng: s.lng });
  const capped = pts.slice(0, LABELS.length);
  const fit = fitPoints(capped);
  if (!fit) return null;
  return { ...fit, markers: capped.map((p, i) => ({ ...p, label: LABELS[i]! })) };
}

/** Query string for GET /api/map. `focus` centres on one marker at street zoom. */
export function mapQuery(m: TripMap, size: { w: number; h: number }, focus?: MapPoint): string {
  const c = focus ? { lat: focus.lat, lng: focus.lng } : m.center;
  const markers = m.markers.map((p) => `${p.lat},${p.lng},${p.label}`).join('|');
  return `lat=${c.lat}&lng=${c.lng}&zoom=${focus ? 16 : m.zoom}&w=${size.w}&h=${size.h}&markers=${encodeURIComponent(markers)}`;
}

export const mapsLink = (p: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
