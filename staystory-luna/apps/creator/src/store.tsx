import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { market, makeCreatorTrip, acceptedOffers, type LedgerFilter, type MStay, type MTrip, type MarketState, type OfferTab, type RangeKey } from '@staystory/market';
import { CREATOR_ID, DESTS, destFor, stayCatalog, stayCard, type Day, type DetailKey } from './data';

/**
 * Creator-only state (not marketplace data): onboarding answers, profile, notification preferences and the trip draft.
 * Everything the other apps care about lives in @staystory/market.
 */
const ns = new URLSearchParams(window.location.search).get('ns');
const keyOf = (name: string) => `staystory.creator.${name}${ns ? `:${ns}` : ''}`;
function usePersisted<T>(name: string, init: () => T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, set] = useState<T>(() => { try { const raw = localStorage.getItem(keyOf(name)); if (raw) return { ...(init() as object), ...JSON.parse(raw) } as T; } catch { /* use default */ } return init(); });
  useEffect(() => { try { localStorage.setItem(keyOf(name), JSON.stringify(v)); } catch { /* private mode */ } }, [name, v]);
  return [v, set];
}

export interface Profile { handle: string; channels: { ig: boolean; yt: boolean; blog: boolean }; regions: string[]; payMode: 'upi' | 'bank'; upi: string; account: string; ifsc: string; pan: string; gstin: string; agree: boolean }
export interface Prefs { booking: boolean; offers: boolean; weekly: boolean }
export interface Draft {
  editId?: string; reel: number; analyzed: number; link: string; place: string; details: Record<DetailKey, string>; title: string; days: Day[];
  pick: string; inc: Record<string, boolean>; slug: string; keyword: string; autoReply: boolean; published?: string; manual?: boolean;
  /** The reel caption the creator pasted, and what reading it gave. */
  caption: string; source?: 'ai' | 'cache' | 'rules'; provider?: string; extractError?: string;
  /** Live partner stays the creator chose (plain stays, no commission). */
  liveStays: MStay[];
  /** A stay the caption names that we could not match; the creator must pick one before preview. */
  unmatchedStay?: string;
}
interface Ui {
  profile: Profile; setProfile: (p: Partial<Profile>) => void; prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void;
  draft: Draft; setDraft: (d: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
  range: RangeKey; setRange: (r: RangeKey) => void; ledgerFilter: LedgerFilter; setLedgerFilter: (f: LedgerFilter) => void;
  offerTab: OfferTab; setOfferTab: (t: OfferTab) => void;
  read: string[]; markRead: (ids: string[]) => void; countered: string[]; addCountered: (id: string) => void;
  toast: string; flash: (m: string) => void; analyzing: boolean; setAnalyzing: (b: boolean) => void;
  startNewTrip: (o?: { place?: string; pickHotelId?: string }) => Draft; startEdit: (t: MTrip) => Draft;
}
const Ctx = createContext<Ui | null>(null);
export const useUi = () => { const v = useContext(Ctx); if (!v) throw new Error('useUi outside provider'); return v; };

const defaultProfile = (): Profile => ({ handle: 'anaya', channels: { ig: true, yt: false, blog: false }, regions: ['Rajasthan', 'Karnataka'], payMode: 'upi', upi: 'anaya@okaxis', account: '', ifsc: '', pan: 'ABCDE1234F', gstin: '', agree: true });

/** A fresh draft for a destination. The link name avoids ones this creator already uses. */
export function draftFor(s: MarketState, reel: number, opts: { pickHotelId?: string; place?: string } = {}): Draft {
  const d = opts.place ? destFor(opts.place) : DESTS[reel] ?? DESTS[0]!;
  const cat = stayCatalog(s, d.place);
  const offered = acceptedOffers(s, CREATOR_ID);
  const pickStay = (opts.pickHotelId && cat.find((x) => x.hotelId === opts.pickHotelId)) || cat.find((x) => offered[x.hotelId]) || cat[0]!;
  const inc: Record<string, boolean> = {};
  cat.slice(0, 3).forEach((x) => { inc[x.id] = true; });
  cat.forEach((x) => { if (offered[x.hotelId]) inc[x.id] = true; });
  inc[pickStay.id] = true;
  const base = d.place.toLowerCase();
  let slug = base; for (let i = 2; s.trips.some((t) => t.id === `${CREATOR_ID}-${slug}`); i++) slug = `${base}-${i}`;
  return {
    reel, analyzed: -1, link: '', place: d.place, details: { ...d.details }, title: `Three days in ${d.place} under ₹15,000`, caption: '', liveStays: [],
    days: d.days.map((x) => ({ ...x, items: x.items.map((i) => ({ ...i })) })), pick: pickStay.id, inc, slug, keyword: 'link', autoReply: true,
  };
}
export function draftFromTrip(t: MTrip): Draft {
  const d = destFor(t.place);
  const inc: Record<string, boolean> = {}; t.stays.forEach((x) => { inc[x.id] = true; });
  return {
    editId: t.id, reel: Math.max(0, DESTS.findIndex((x) => x.place === t.place)), analyzed: 1, link: t.reelUrl, place: t.place,
    details: { ...d.details, Destination: `${t.place}${d.place === t.place ? ', ' + d.region : ''}`, Length: `${t.days} days, ${Math.max(1, t.days - 1)} nights` }, title: t.title,
    days: t.itinerary.map((day) => ({ n: day.n, title: day.title, items: day.stops.map((p) => ({ id: p.id, name: p.name, kind: p.kind, bookable: p.bookable, price: p.pricePerPerson && p.kind !== 'Stay' ? p.pricePerPerson : undefined, time: p.time, img: p.img, lat: p.lat, lng: p.lng, dur: t.experiences.find((e) => e.id === p.id)?.time.split(' · ')[1] })) })),
    pick: t.pickStayId, inc, slug: t.slug, keyword: t.dmKeyword || 'link', autoReply: !!t.dmKeyword, caption: '', liveStays: [],
  };
}

export function CreatorProvider({ children }: { children: ReactNode }) {
  const [profile, setP] = usePersisted<Profile>('profile', defaultProfile);
  const [prefs, setPr] = usePersisted<Prefs>('prefs', () => ({ booking: true, offers: true, weekly: false }));
  const [draft, setD] = usePersisted<Draft>('draft', () => draftFor(market.get(), 0));
  const [ui, setUi] = usePersisted<{ range: RangeKey; ledgerFilter: LedgerFilter; offerTab: OfferTab; read: string[]; countered: string[] }>('ui', () => ({ range: '30', ledgerFilter: 'All', offerTab: 'new', read: [], countered: [] }));
  const [toast, setToast] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const timer = useRef<number>();
  const flash = useCallback((m: string) => { setToast(m); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setToast(''), 2400); }, []);
  const value: Ui = {
    profile, setProfile: (p) => setP((x) => ({ ...x, ...p })), prefs, setPrefs: (p) => setPr((x) => ({ ...x, ...p })),
    draft, setDraft: (d) => setD((x) => ({ ...x, ...(typeof d === 'function' ? d(x) : d) })),
    range: ui.range, setRange: (range) => setUi((x) => ({ ...x, range })), ledgerFilter: ui.ledgerFilter, setLedgerFilter: (ledgerFilter) => setUi((x) => ({ ...x, ledgerFilter })),
    offerTab: ui.offerTab, setOfferTab: (offerTab) => setUi((x) => ({ ...x, offerTab })),
    read: ui.read, markRead: (ids) => setUi((x) => ({ ...x, read: Array.from(new Set([...x.read, ...ids])) })),
    countered: ui.countered, addCountered: (id) => setUi((x) => ({ ...x, countered: Array.from(new Set([...x.countered, id])) })),
    toast, flash, analyzing, setAnalyzing,
    startNewTrip: (o = {}) => { const s = market.get(); const reel = Math.max(0, DESTS.findIndex((x) => x.place === o.place)); const d = draftFor(s, reel, { pickHotelId: o.pickHotelId }); if (o.place) d.analyzed = reel; setD(d); return d; },
    startEdit: (t) => { const d = draftFromTrip(t); setD(d); return d; },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { stayCard, makeCreatorTrip };
