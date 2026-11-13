import { useSyncExternalStore } from 'react';
import { reduce, type Action } from './reducer';
import { seedState } from './seed';
import type { MarketState } from './types';

/** Pass ?ns=name in the URL to get an isolated marketplace (parallel test runs, demos). */
const ns = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ns') : null;
const KEY = `staystory.market.v2${ns ? `:${ns}` : ''}`;
type Listener = () => void;

/** A tiny external store. State persists in localStorage and syncs across tabs on the same origin. */
export class MarketStore {
  private state: MarketState;
  private listeners = new Set<Listener>();
  private apiUrl?: string;
  constructor(private persist = typeof window !== 'undefined') {
    this.state = this.load();
    if (this.persist) window.addEventListener('storage', (e) => {
      if (e.key !== KEY) return;
      this.state = e.newValue ? JSON.parse(e.newValue) : seedState();
      this.emit();
    });
  }
  private load(): MarketState {
    if (!this.persist) return seedState();
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s?.v === 2) return s; } } catch { /* fall through */ }
    return seedState();
  }
  private emit() { this.listeners.forEach((l) => l()); }
  get = () => this.state;
  subscribe = (l: Listener) => { this.listeners.add(l); return () => this.listeners.delete(l); };
  /** Connect to a DB-backed API. Hydrates state from the server and persists future dispatches. */
  async connectApi(url: string): Promise<void> {
    this.apiUrl = url;
    try {
      const res = await fetch(`${url}/state`);
      if (res.ok) { this.state = await res.json(); this.emit(); }
    } catch { /* fall back to localStorage/seed */ }
  }
  dispatch = (a: Action) => {
    this.state = reduce(this.state, a);
    if (this.persist) try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch { /* quota or private mode: keep in memory */ }
    if (this.apiUrl) fetch(`${this.apiUrl}/dispatch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).catch(() => {});
    this.emit();
  };
  reset = () => this.dispatch({ type: 'dev/reset' });
}

export const market = new MarketStore();

/** The whole marketplace state. Derive what you need with the selectors or useMemo; the reference only changes when state does. */
export function useMarket(): MarketState {
  return useSyncExternalStore(market.subscribe, market.get, market.get);
}
