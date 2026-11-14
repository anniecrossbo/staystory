import { useSyncExternalStore } from 'react';
import { withViewTransition } from '@staystory/ui';
import { photo } from '@staystory/ui/src/photos';
import type { MTrip } from '@staystory/market';

export const asset = (n: string) => photo(n);
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

const subscribe = (cb: () => void) => { const on = () => withViewTransition(cb); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); };
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
export const cardTitle = (t: { id: string; title: string; shopTitle?: string }) => (t.id === 'anaya-udaipur' ? `${t.title} under ₹15,000` : t.shopTitle ?? t.title);

/** The short trip names the refined designs use on the feed, trip page, checkout and my trips. */
const SHORT_NAMES: Record<string, string> = { 'anaya-udaipur': 'Udaipur in 3 days', 'anaya-coorg': 'Coorg, slow and misty', 'anaya-jodhpur': 'Jodhpur weekend' };
export const tripName = (t: { id: string; title: string; shopTitle?: string }) => SHORT_NAMES[t.id] ?? cardTitle(t);

const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** `Dec 19 – 21` -> `Sat 19 Dec` and `Mon 21 Dec`. Falls back to the label when it can't be read. */
export function stayDays(label: string) {
  const m = /^([A-Za-z]{3}) (\d+) – (?:([A-Za-z]{3}) )?(\d+)$/.exec(label);
  if (!m) return { inn: label, out: label };
  const m1 = MON.indexOf(m[1]!.toLowerCase()), m2 = m[3] ? MON.indexOf(m[3].toLowerCase()) : m1;
  if (m1 < 0 || m2 < 0) return { inn: label, out: label };
  const yr = (mo: number) => (mo === 11 ? 2026 : mo <= 1 ? 2027 : 2026);
  const cap = (x: string) => x[0]!.toUpperCase() + x.slice(1);
  return { inn: `${DAYS[new Date(yr(m1), m1, Number(m[2])).getDay()]} ${m[2]} ${cap(MON[m1]!)}`, out: `${DAYS[new Date(yr(m2), m2, Number(m[4])).getDay()]} ${m[4]} ${cap(MON[m2]!)}` };
}
const REGION: Record<string, string> = { Udaipur: 'Rajasthan', Jaipur: 'Rajasthan', Jodhpur: 'Rajasthan', Goa: 'Goa', Rishikesh: 'Uttarakhand', Coorg: 'Karnataka', Gokarna: 'Karnataka' };
export const placeLine = (place: string) => (REGION[place] ? `${place}, ${REGION[place]}` : place);

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* clipboard blocked: fall back */ }
  try {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok;
  } catch { return false; }
}
