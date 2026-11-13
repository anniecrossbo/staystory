import type { LedgerEntry, LedgerStatus, Rupees, Settlement } from './types';

export const TDS_PCT = 10;

/** Withdrawals to UPI deduct 10% TDS. */
export function withdrawal(available: Rupees) {
  const tds = Math.round((available * TDS_PCT) / 100);
  return { gross: available, tds, net: available - tds };
}

export const availableBalance = (entries: LedgerEntry[]): Rupees =>
  entries.filter((e) => e.status === 'available').reduce((s, e) => s + e.amount, 0);

export const pendingBalance = (entries: LedgerEntry[]): Rupees =>
  entries.filter((e) => e.status === 'pending_stay').reduce((s, e) => s + e.amount, 0);

/** Hotel confirms the stay after check-out: pending_stay becomes available. Other states are unchanged. */
export function confirmStay(entries: LedgerEntry[], bookingId: string): LedgerEntry[] {
  return entries.map((e) => (e.bookingId === bookingId && e.status === 'pending_stay' ? { ...e, status: 'available' as LedgerStatus } : e));
}

/** Cancelling before stay cancels the pending entry. A paid entry cannot be undone here. */
export function cancelBooking(entries: LedgerEntry[], bookingId: string): LedgerEntry[] {
  return entries.map((e) => (e.bookingId === bookingId && e.status !== 'paid' ? { ...e, status: 'cancelled' as LedgerStatus } : e));
}

/** Withdraw all available entries: they become paid. */
export function withdrawAll(entries: LedgerEntry[]) {
  const summary = withdrawal(availableBalance(entries));
  return { summary, entries: entries.map((e) => (e.status === 'available' ? { ...e, status: 'paid' as LedgerStatus } : e)) };
}

/** Weekly hotel settlement over completed stays. Cancelled stays are excluded (commission waived). */
export function settle(period: string, stays: { roomValue: Rupees; commission: Rupees; cancelled?: boolean }[]): Settlement {
  const done = stays.filter((s) => !s.cancelled);
  const gross = done.reduce((s, x) => s + x.roomValue, 0);
  const commission = done.reduce((s, x) => s + x.commission, 0);
  return { period, stays: done.length, gross, commission, net: gross - commission };
}
