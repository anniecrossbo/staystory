import { useSyncExternalStore } from 'react';
import type { MTrip } from '@staystory/market';

export const asset = (n: string) => `/assets/${n}.jpg`;
export const ME = 'meera';
export const DEFAULT_TRIP = { c: 'anaya', s: 'udaipur' };
export const SITE = 'https://staystory.in';

export interface Route { flow: string; screen: string; params: Record<string, string> }
export type Go = (flow: string, screen?: string, params?: Record<string, string | undefined>) => void;

const FLOWS = ['social', 'trip', 'auth', 'discover', 'trips', 'me'];

/** Hash routes `#/<flow>/<screen>?k=v`. Also `#/t/<creator>/<slug>` and `#/<creator>/<slug>` open a trip, `#/shop/<creator>` a shop. */
export function parseRoute(hash = window.location.hash): Route {
  const [path = '', query = ''] = hash.replace(/^#/, '').split('?');
  const seg = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((v, k) => { params[k] = v; });
  const [a, b, c] = seg;
  if (a === 't' && b && c) return { flow: 'trip', screen: 'trip', params: { ...params, c: b, s: c } };
  if (a === 'shop' && b) return { flow: 'discover', screen: 'creator', params: { ...params, c: b } };
  if (a && !FLOWS.includes(a) && b) return { flow: 'trip', screen: 'trip', params: { ...params, c: a, s: b } };
  return { flow: a && FLOWS.includes(a) ? a : 'discover', screen: (a && FLOWS.includes(a) ? b : '') || '', params };
}
export function hashFor(flow: string, screen = '', params: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][]).toString();
  return `#/${flow}/${screen}${q ? `?${q}` : ''}`;
}
export const go: Go = (flow, screen, params) => { window.location.hash = hashFor(flow, screen, params); };

const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
const snap = () => window.location.hash;
/** The current hash route; re-renders on every hash change. */
export function useRoute(): Route {
  useSyncExternalStore(subscribe, snap, snap);
  return parseRoute();
}

/** Link to a trip screen by creator and slug. Pass `from` to remember where the traveler came from. */
export const tripHash = (t: Pick<MTrip, 'creatorId' | 'slug'>, screen = 'trip', extra: Record<string, string | undefined> = {}) => hashFor('trip', screen, { c: t.creatorId, s: t.slug, ...extra });
export const shopHash = (creatorId: string) => hashFor('discover', 'creator', { c: creatorId });
export const bookingHash = (id: string, screen = 'detail') => hashFor('trips', screen, { b: id });

export const initialsOf = (name: string) => name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
export const sentence = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1).toLowerCase() : s);
export const clock = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
/** 2184 -> `2.1K` (the design truncates). */
export const compact = (n: number) => (n >= 10000 ? `${Math.floor(n / 1000)}K` : n >= 1000 ? `${(Math.floor(n / 100) / 10).toString()}K` : String(n));
/** The feed and shop title of a trip. The design shows Udaipur with its price promise. */
export const cardTitle = (t: { id: string; title: string }) => (t.id === 'anaya-udaipur' ? `${t.title} under ₹15,000` : t.title);

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* clipboard blocked: fall back */ }
  try {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
  } catch { return false; }
}
