import { market } from '@staystory/market';
import { DEFAULT_TRIP, ME, type Route } from './lib';

/**
 * Deep links to result states must render a sensible state on a fresh marketplace.
 * Before the first render, stage what a state needs, only for a traveler who is not signed in yet
 * (a fresh visitor), so a real session is never rewritten by a refresh.
 */
export function stage(r: Route) {
  const d = market.dispatch;
  const st = () => market.get();
  const me = () => st().travelers[ME]!;
  const trip = st().trips.find((t) => t.creatorId === (r.params.c ?? DEFAULT_TRIP.c) && t.slug === (r.params.s ?? DEFAULT_TRIP.s));
  const signIn = () => { if (!me().signedIn) d({ type: 'traveler/patch', id: ME, patch: { signedIn: true } }); };
  const save = (tripId: string) => { if (!me().savedTripIds.includes(tripId)) d({ type: 'traveler/save', id: ME, tripId, on: true }); };
  const gap = () => { if (st().trips.some((t) => t.id === 'anaya-udaipur')) d({ type: 'dev/ensureGap', now: new Date().toISOString() }); };
  const fresh = !me().signedIn;
  const key = `${r.flow}/${r.screen}`;
  // The DM thread is real: a fresh deep link to it records the design's sample comment once.
  if (key === 'social/dm' && trip && !(st().reelComments ?? []).some((c) => c.tripId === trip.id && c.travelerId === ME)) {
    d({ type: 'reel/comment', id: `stage-${trip.id}`, tripId: trip.id, travelerId: ME, name: 'meera.iyer', text: 'link pls', at: new Date().toISOString() });
  }
  const wantsGap = ['trip/foryou', 'trip/held'].includes(key) || (r.flow === 'trip' && r.params.gap === '1');

  if (wantsGap) { signIn(); save(trip?.id ?? 'anaya-udaipur'); gap(); return; }
  if (key === 'trip/saved' && fresh) { signIn(); save(trip?.id ?? 'anaya-udaipur'); return; }
  if (key === 'trips/saved' && fresh) {
    signIn(); ['anaya-udaipur', 'hari-rishikesh', 'kabir-gokarna', 'anaya-coorg'].forEach(save); gap();
    return;
  }
  const mine = () => st().bookings.filter((b) => b.travelerId === ME);
  if ((key === 'trips/past' || key === 'trips/review') && fresh) {
    signIn();
    if (!mine().some((b) => b.status === 'completed')) { const b = mine().find((x) => x.status === 'upcoming'); if (b) d({ type: 'booking/status', id: b.id, status: 'completed' }); }
    return;
  }
  if (key === 'trips/cancelled' && fresh) {
    signIn();
    if (!mine().some((b) => b.status === 'cancelled')) { const b = mine().find((x) => x.status === 'upcoming'); if (b) d({ type: 'booking/cancel', id: b.id }); }
  }
}
