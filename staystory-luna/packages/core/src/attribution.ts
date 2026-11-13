import type { Attribution } from './types';

export const ATTRIBUTION_DAYS = 60;
const DAY_MS = 86_400_000;

export function createAttribution(args: { travelerId: string; creatorId: string; tripId: string; openedAt: Date }): Attribution {
  return {
    travelerId: args.travelerId,
    creatorId: args.creatorId,
    tripId: args.tripId,
    openedAt: args.openedAt.toISOString(),
    expiresAt: new Date(args.openedAt.getTime() + ATTRIBUTION_DAYS * DAY_MS).toISOString(),
  };
}

export const isActive = (a: Attribution, now: Date): boolean => now.getTime() < new Date(a.expiresAt).getTime();

/**
 * Apply a newly opened link to the traveler's current credit.
 * - No credit, or an expired one: the new link wins.
 * - A newer link from a different creator replaces it.
 * - The same creator opening again keeps the original window (opening twice does not extend credit).
 */
export function applyLink(current: Attribution | undefined, incoming: Attribution, now: Date): Attribution {
  if (!current || !isActive(current, now)) return incoming;
  if (current.creatorId === incoming.creatorId) return current;
  return incoming;
}

/** The creator who gets credit for a booking made now, or undefined if none is active. */
export const creditFor = (a: Attribution | undefined, now: Date): string | undefined =>
  a && isActive(a, now) ? a.creatorId : undefined;

const fmtDay = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** "Credit: @anaya.explores · link opened Nov 13 · valid 60 days" */
export function creditLine(handle: string, openedAt: Date): string {
  const [d, m] = fmtDay.format(openedAt).split(' ');
  return `Credit: @${handle} · link opened ${m} ${d} · valid ${ATTRIBUTION_DAYS} days`;
}
