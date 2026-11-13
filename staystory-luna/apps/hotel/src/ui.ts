import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_AUDIENCE, type AudienceState, type Range } from './lib';

/**
 * Session-only UI state: filters, dismissed alerts, drafts of the onboarding and campaign forms.
 * It is not marketplace data (that lives in @staystory/market). Persisted in sessionStorage per ?ns= so a refresh keeps it.
 */
const ns = new URLSearchParams(window.location.search).get('ns');
const KEY = `staystory.hotel.ui${ns ? `:${ns}` : ''}`;

export interface UiState {
  range: Range;
  bookingFilter: string;
  dismissed: string[];
  lastInvited: string;
  focusCreator: string;
  liveIndex: number;
  messages: Record<string, string[]>;
  gap: { room: string; dates: string; rooms: number; rate: number; aud: AudienceState };
  syncLabel: string;
  launched: string;
  /** Drafts are plain JSON owned by the form that writes them. */
  drafts: Record<string, unknown>;
}
const initial = (): UiState => ({
  range: '30', bookingFilter: 'All', dismissed: [], lastInvited: '', focusCreator: '', liveIndex: 0, messages: {},
  gap: { room: 'lake-deluxe', dates: 'wknd', rooms: 4, rate: 3400, aud: { ...DEFAULT_AUDIENCE } }, syncLabel: 'Synced 4 min ago', launched: '', drafts: {},
});

let state: UiState = (() => {
  try { const raw = sessionStorage.getItem(KEY); if (raw) return { ...initial(), ...JSON.parse(raw) }; } catch { /* fall through */ }
  return initial();
})();
const listeners = new Set<() => void>();
export const ui = {
  get: () => state,
  set(patch: Partial<UiState>) {
    state = { ...state, ...patch };
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota: keep in memory */ }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};
export const useUi = (): UiState => useSyncExternalStore(ui.subscribe, ui.get, ui.get);

/** A form draft kept in the session store. `init` runs only when no draft exists. */
export function useDraft<T extends object>(key: string, init: () => T): [T, (patch: Partial<T>) => void, () => void] {
  const all = useUi().drafts;
  const cur = (all[key] as T | undefined) ?? undefined;
  const value = cur ?? init();
  const patch = useCallback((p: Partial<T>) => {
    const d = ui.get().drafts;
    ui.set({ drafts: { ...d, [key]: { ...((d[key] as T | undefined) ?? init()), ...p } } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const clear = useCallback(() => { const { [key]: _x, ...rest } = ui.get().drafts; ui.set({ drafts: rest }); }, [key]);
  return [value, patch, clear];
}

/* ---------- Toasts ---------- */
export interface ToastItem { id: number; tone: 'success' | 'info' | 'warning' | 'danger'; text: string; action?: string; onAction?: () => void }
let toasts: ToastItem[] = [];
const tl = new Set<() => void>();
let tid = 1;
export function toast(text: string, opts: { tone?: ToastItem['tone']; action?: string; onAction?: () => void; ms?: number } = {}) {
  const t: ToastItem = { id: tid++, tone: opts.tone ?? 'success', text, action: opts.action, onAction: opts.onAction };
  toasts = [...toasts.slice(-2), t];
  tl.forEach((l) => l());
  setTimeout(() => dismissToast(t.id), opts.ms ?? 5000);
}
export function dismissToast(id: number) { toasts = toasts.filter((t) => t.id !== id); tl.forEach((l) => l()); }
export const useToasts = () => useSyncExternalStore((l) => { tl.add(l); return () => { tl.delete(l); }; }, () => toasts, () => toasts);
