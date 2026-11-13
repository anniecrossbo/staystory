import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultSelection, tripByCreatorSlug, useMarket, market, type Action, type MarketState, type MTraveler, type MTrip, type Selection } from '@staystory/market';
import { DEFAULT_TRIP, ME, go, hashFor, useRoute, type Route } from './lib';

/** Why the sign-in screens were opened, and where to go next. Survives a refresh. */
export interface AuthCtx { reason: 'save' | 'shop' | 'checkout' | 'tab' | 'signin'; tripId?: string; creatorId?: string; returnTo: string; backTo: string }
export type PayMethod = 'upi' | 'card' | 'emi';
interface UI {
  sel: Record<string, Selection>;
  hold?: { tripId: string; until: string };
  auth: AuthCtx;
  pay: PayMethod; upi: string;
  guest: { name: string; mobile: string; email: string };
}
const DISCOVER = hashFor('discover', 'feed');
// A fresh deep link to the sign-in screens shows the save-a-trip version, as in the design.
const DEFAULT_UI: UI = {
  sel: {}, auth: { reason: 'save', tripId: 'anaya-udaipur', returnTo: hashFor('trip', 'saved', { c: 'anaya', s: 'udaipur' }), backTo: DISCOVER }, pay: 'upi', upi: 'meera@okhdfc',
  guest: { name: 'Meera Iyer', mobile: '+91 98200 00000', email: 'meera@example.com' },
};
const ns = new URLSearchParams(window.location.search).get('ns');
const KEY = `staystory.traveler.ui${ns ? `:${ns}` : ''}`;
const loadUi = (): UI => { try { const raw = sessionStorage.getItem(KEY); if (raw) return { ...DEFAULT_UI, ...JSON.parse(raw) }; } catch { /* private mode */ } return DEFAULT_UI; };

export interface Session {
  s: MarketState; me: MTraveler; signedIn: boolean; route: Route;
  dispatch: (a: Action) => void;
  ui: UI; patchUi: (p: Partial<UI>) => void;
  /** The traveler's current choices for a trip (stay, experiences, dates), validated against the trip. */
  selFor: (t: MTrip) => Selection; setSel: (t: MTrip, p: Partial<Selection>) => void;
  startHold: (tripId: string) => void;
  gate: (ctx: AuthCtx) => void;
  toast: string; flash: (m: string) => void;
}
const Ctx = createContext<Session | null>(null);
export const useSession = () => { const v = useContext(Ctx); if (!v) throw new Error('useSession outside provider'); return v; };

/** Re-render every second while mounted (hold countdown, resend timer). */
export function useNow(active = true) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (!active) return; const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, [active]);
  return now;
}

/** The trip a route points at: by creator and slug, by id, or the default Udaipur trip. */
export function tripFor(s: MarketState, r: Route): MTrip | undefined {
  if (r.params.id) return s.trips.find((t) => t.id === r.params.id);
  return tripByCreatorSlug(s, r.params.c ?? DEFAULT_TRIP.c, r.params.s ?? DEFAULT_TRIP.s);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const s = useMarket();
  const route = useRoute();
  const [ui, setUi] = useState<UI>(loadUi);
  const [toast, setToast] = useState('');
  const timer = useRef<number>();
  const persist = (u: UI) => { try { sessionStorage.setItem(KEY, JSON.stringify(u)); } catch { /* ignore */ } };
  const patchUi = useCallback((p: Partial<UI>) => setUi((u) => { const n = { ...u, ...p }; persist(n); return n; }), []);
  const flash = useCallback((m: string) => { setToast(m); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(''), 2400); }, []);

  const value = useMemo<Session>(() => {
    const me = s.travelers[ME]!;
    const valid = (t: MTrip, v?: Selection) => v && t.stays.some((x) => x.id === v.stayId) && v.expIds.every((id) => t.experiences.some((e) => e.id === id));
    const selFor = (t: MTrip) => (valid(t, ui.sel[t.id]) ? ui.sel[t.id]! : defaultSelection(t));
    return {
      s, me, signedIn: me.signedIn, route, dispatch: market.dispatch, ui, patchUi,
      selFor, setSel: (t, p) => patchUi({ sel: { ...ui.sel, [t.id]: { ...selFor(t), ...p } } }),
      startHold: (tripId) => patchUi({ hold: { tripId, until: new Date(Date.now() + 30 * 60_000).toISOString() } }),
      gate: (ctx) => { patchUi({ auth: ctx }); go('auth', 'welcome'); },
      toast, flash,
    };
  }, [s, route, ui, patchUi, toast, flash]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
