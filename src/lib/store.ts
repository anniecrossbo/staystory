import "server-only";
import { createSeedStore } from "./seed";
import type { Store } from "./types";

const g = globalThis as unknown as { __crossboStore?: Store };

/** In-memory store. Lives as long as the server process; reset from the demo bar. */
export function getStore(): Store {
  if (!g.__crossboStore) g.__crossboStore = createSeedStore();
  return g.__crossboStore;
}

export function resetStore(): void {
  g.__crossboStore = createSeedStore();
}

export function nextBookingId(cityId: string): string {
  const s = getStore();
  const id = `CB-${cityId === "jaipur" ? "JAI" : "UDR"}-${s.seq}`;
  s.seq += 1;
  return id;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
