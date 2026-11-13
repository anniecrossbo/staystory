import type { Env, MapMarker } from './types';

export interface StaticMapOptions { center: { lat: number; lng: number }; zoom: number; width: number; height: number; markers: MapMarker[] }

/** Google Static Maps URL. Contains the key, so it is only ever fetched server side, never sent to the browser. */
export function staticMapUrl(o: StaticMapOptions, env: Env): string | null {
  const key = env.GOOGLE_MAPS_KEY;
  if (!key) return null;
  const markers = o.markers.map((m, i) => `markers=color:0x0F5563%7Clabel:${encodeURIComponent((m.label ?? String(i + 1)).slice(0, 1))}%7C${m.lat},${m.lng}`).join('&');
  return `https://maps.googleapis.com/maps/api/staticmap?center=${o.center.lat},${o.center.lng}&zoom=${o.zoom}&size=${o.width}x${o.height}&scale=2&maptype=roadmap&${markers}&key=${key}`;
}
