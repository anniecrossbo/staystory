import { ATTRIBUTION_DAYS, creatorCommission, matchesKeyword, withdrawal, TDS_PCT } from '@staystory/core';
import { seedState } from './seed';
import type { InviteStatus, MBooking, MCampaign, MGapNight, MReview, MTraveler, MTrip, MarketState } from './types';

export type Action =
  | { type: 'dev/reset' }
  | { type: 'hotel/update'; patch: Partial<MarketState['hotel']> }
  | { type: 'campaign/create'; campaign: MCampaign }
  | { type: 'campaign/invite'; campaignId: string; creatorId: string }
  | { type: 'offer/respond'; campaignId: string; creatorId: string; response: Exclude<InviteStatus, 'invited'>; counter?: { pct: number; message: string; extras: string[] } }
  | { type: 'offer/resolveCounter'; campaignId: string; creatorId: string; accept: boolean }
  | { type: 'trip/publish'; trip: MTrip }
  | { type: 'trip/status'; tripId: string; status: MTrip['status'] }
  | { type: 'traveler/patch'; id: string; patch: Partial<MTraveler> }
  | { type: 'traveler/save'; id: string; tripId: string; on: boolean }
  | { type: 'traveler/follow'; id: string; creatorId: string }
  | { type: 'traveler/saveShop'; id: string; creatorId: string }
  | { type: 'traveler/openLink'; travelerId: string; creatorId: string; tripId: string; now: string }
  | { type: 'reel/comment'; id: string; tripId: string; travelerId: string; name: string; text: string; at: string }
  | { type: 'trip/visit'; tripId: string; sessionId: string; at: string; byCreatorId?: string }
  | { type: 'booking/create'; booking: MBooking }
  | { type: 'booking/status'; id: string; status: 'in_house' | 'completed' }
  | { type: 'booking/cancel'; id: string }
  | { type: 'booking/dates'; id: string; datesLabel: string; delta: number }
  | { type: 'review/add'; review: MReview }
  | { type: 'gap/release'; gap: MGapNight }
  | { type: 'creator/withdraw'; creatorId: string; upi: string; id: string; now: string }
  | { type: 'dev/ensureGap'; now: string };

const pending = (s: MarketState, bookingId: string) => s.ledger.findIndex((l) => l.bookingId === bookingId);

export function reduce(s: MarketState, a: Action): MarketState {
  switch (a.type) {
    case 'dev/reset': return seedState();
    case 'hotel/update': return { ...s, hotel: { ...s.hotel, ...a.patch } };

    case 'campaign/create':
      return { ...s, campaigns: [a.campaign, ...s.campaigns], seq: { ...s.seq, campaign: s.seq.campaign + 1 } };
    case 'campaign/invite':
      return { ...s, campaigns: s.campaigns.map((c) => (c.id === a.campaignId && (!c.invites[a.creatorId] || c.invites[a.creatorId] === 'declined') ? { ...c, invites: { ...c.invites, [a.creatorId]: 'invited' } } : c)) };

    case 'offer/respond':
      return {
        ...s,
        campaigns: s.campaigns.map((c) => {
          if (c.id !== a.campaignId) return c;
          const agreedPct = a.response === 'accepted' ? { ...c.agreedPct, [a.creatorId]: c.commissionPct } : c.agreedPct;
          const counters = a.response === 'countered' && a.counter ? { ...c.counters, [a.creatorId]: a.counter } : c.counters;
          return { ...c, invites: { ...c.invites, [a.creatorId]: a.response }, agreedPct, counters };
        }),
      };
    case 'offer/resolveCounter':
      return {
        ...s,
        campaigns: s.campaigns.map((c) => {
          if (c.id !== a.campaignId || c.invites[a.creatorId] !== 'countered') return c;
          const counter = c.counters[a.creatorId];
          const { [a.creatorId]: _drop, ...rest } = c.counters;
          return a.accept
            ? { ...c, invites: { ...c.invites, [a.creatorId]: 'accepted' }, agreedPct: { ...c.agreedPct, [a.creatorId]: counter?.pct ?? c.commissionPct }, counters: rest }
            : { ...c, invites: { ...c.invites, [a.creatorId]: 'declined' }, counters: rest };
        }),
      };

    case 'trip/publish': {
      const exists = s.trips.some((t) => t.id === a.trip.id);
      return { ...s, trips: exists ? s.trips.map((t) => (t.id === a.trip.id ? { ...t, ...a.trip } : t)) : [a.trip, ...s.trips], seq: { ...s.seq, trip: s.seq.trip + (exists ? 0 : 1) } };
    }
    case 'trip/status': return { ...s, trips: s.trips.map((t) => (t.id === a.tripId ? { ...t, status: a.status } : t)) };

    case 'traveler/patch': return { ...s, travelers: { ...s.travelers, [a.id]: { ...s.travelers[a.id]!, ...a.patch } } };
    case 'traveler/save': {
      const t = s.travelers[a.id]!;
      const ids = a.on ? Array.from(new Set([...t.savedTripIds, a.tripId])) : t.savedTripIds.filter((x) => x !== a.tripId);
      const was = t.savedTripIds.includes(a.tripId);
      return { ...s, travelers: { ...s.travelers, [a.id]: { ...t, savedTripIds: ids } }, trips: s.trips.map((x) => (x.id === a.tripId && was !== a.on ? { ...x, saves: x.saves + (a.on ? 1 : -1) } : x)) };
    }
    case 'traveler/follow': { const t = s.travelers[a.id]!; const f = t.followingIds.includes(a.creatorId); return { ...s, travelers: { ...s.travelers, [a.id]: { ...t, followingIds: f ? t.followingIds.filter((x) => x !== a.creatorId) : [...t.followingIds, a.creatorId] } } }; }
    case 'traveler/saveShop': { const t = s.travelers[a.id]!; const f = t.savedShopIds.includes(a.creatorId); return { ...s, travelers: { ...s.travelers, [a.id]: { ...t, savedShopIds: f ? t.savedShopIds.filter((x) => x !== a.creatorId) : [...t.savedShopIds, a.creatorId] } } }; }
    case 'traveler/openLink': {
      // 60-day credit tied to the traveler. A newer link from a different creator replaces it; the same creator keeps the original window.
      const cur = s.attributions.find((x) => x.travelerId === a.travelerId);
      const active = cur && new Date(cur.expiresAt).getTime() > new Date(a.now).getTime();
      if (active && cur!.creatorId === a.creatorId) return s;
      const next = { travelerId: a.travelerId, creatorId: a.creatorId, tripId: a.tripId, openedAt: a.now, expiresAt: new Date(new Date(a.now).getTime() + ATTRIBUTION_DAYS * 86_400_000).toISOString() };
      return { ...s, attributions: [...s.attributions.filter((x) => x.travelerId !== a.travelerId), next] };
    }

    case 'reel/comment': {
      // The automation: a keyword match on a live trip's reel sends one DM per follower per trip.
      const trip = s.trips.find((t) => t.id === a.tripId);
      const comments = s.reelComments ?? [];
      const already = comments.some((c) => c.tripId === a.tripId && c.travelerId === a.travelerId && c.dmSent);
      const dmSent = !!trip && trip.status === 'live' && !already && matchesKeyword(a.text, trip.dmKeyword);
      return { ...s, reelComments: [{ id: a.id, tripId: a.tripId, travelerId: a.travelerId, name: a.name, text: a.text.slice(0, 300), at: a.at, dmSent }, ...comments] };
    }

    case 'trip/visit': {
      // Counted once per session per live trip, and never for the creator looking at their own trip.
      const trip = s.trips.find((t) => t.id === a.tripId);
      if (!trip || trip.status !== 'live' || a.byCreatorId === trip.creatorId) return s;
      const visits = s.visits ?? [];
      if (visits.some((v) => v.tripId === a.tripId && v.sessionId === a.sessionId)) return s;
      return { ...s, visits: [...visits, { tripId: a.tripId, creatorId: trip.creatorId, sessionId: a.sessionId, at: a.at }] };
    }

    case 'booking/create': {
      const self = a.booking.travelerId === a.booking.creatorId;
      const b = self ? { ...a.booking, selfBooking: true } : a.booking;
      const entry = { id: `l${s.seq.ledger}`, creatorId: b.creatorId, bookingId: b.id, label: `${s.trips.find((t) => t.id === b.tripId)?.place ?? 'Trip'} · ${b.guestName}`, meta: `${b.roomName} · stays ${b.datesLabel}${b.source === 'gap_night' ? ' · via Gap Night' : ''}`, amount: creatorCommission(b.total), status: 'pending_stay' as const, createdAt: b.createdAt };
      return {
        ...s,
        bookings: [b, ...s.bookings],
        ledger: self ? s.ledger : [entry, ...s.ledger],
        gapNights: s.gapNights.map((g) => (g.id === b.gapNightId ? { ...g, booked: g.booked + 1 } : g)),
        trips: s.trips.map((t) => (t.id === b.tripId ? { ...t, travelersBooked: t.travelersBooked + 1 } : t)),
        seq: { ...s.seq, booking: s.seq.booking + 1, ledger: s.seq.ledger + 1 },
      };
    }
    case 'booking/status': {
      if (a.status === 'in_house') return { ...s, bookings: s.bookings.map((b) => (b.id === a.id && b.status === 'upcoming' ? { ...b, status: 'in_house' } : b)) };
      // The hotel confirms the stay after check-out: the creator's pending commission becomes available.
      const ok = s.bookings.find((b) => b.id === a.id && (b.status === 'in_house' || b.status === 'upcoming'));
      if (!ok) return s;
      const i = pending(s, a.id);
      return { ...s, bookings: s.bookings.map((b) => (b.id === a.id ? { ...b, status: 'completed' } : b)), ledger: s.ledger.map((l, k) => (k === i && l.status === 'pending_stay' ? { ...l, status: 'available' } : l)) };
    }
    case 'booking/cancel': {
      const i = pending(s, a.id);
      return {
        ...s,
        bookings: s.bookings.map((b) => (b.id === a.id ? { ...b, status: 'cancelled' } : b)),
        ledger: s.ledger.map((l, k) => (k === i && l.status !== 'paid' ? { ...l, status: 'cancelled', amount: 0 } : l)),
        gapNights: s.gapNights.map((g) => { const b = s.bookings.find((x) => x.id === a.id); return b && g.id === b.gapNightId ? { ...g, booked: Math.max(0, g.booked - 1) } : g; }),
      };
    }
    case 'booking/dates': {
      return {
        ...s,
        bookings: s.bookings.map((b) => (b.id === a.id ? { ...b, datesLabel: a.datesLabel, total: b.total + a.delta, roomValue: b.roomValue + a.delta } : b)),
        ledger: s.ledger.map((l) => { const b = s.bookings.find((x) => x.id === a.id); return l.bookingId === a.id && l.status === 'pending_stay' && b ? { ...l, amount: creatorCommission(b.total + a.delta), meta: l.meta.replace(/stays [^·]+/, `stays ${a.datesLabel} `).trim() } : l; }),
      };
    }
    case 'review/add': return { ...s, reviews: [...s.reviews.filter((r) => r.bookingId !== a.review.bookingId), a.review] };

    case 'gap/release': return { ...s, gapNights: [a.gap, ...s.gapNights], seq: { ...s.seq, gap: s.seq.gap + 1 } };

    case 'creator/withdraw': {
      const avail = s.ledger.filter((l) => l.creatorId === a.creatorId && l.status === 'available');
      const gross = avail.reduce((t, l) => t + l.amount, 0);
      if (!gross) return s;
      const w = withdrawal(gross);
      return {
        ...s,
        ledger: [
          { id: `l${s.seq.ledger}`, creatorId: a.creatorId, label: 'December withdrawal', meta: `Requested today · ${TDS_PCT}% TDS deducted`, amount: w.net, status: 'processing' as const, createdAt: a.now },
          ...s.ledger.map((l) => (l.creatorId === a.creatorId && l.status === 'available' ? { ...l, status: 'paid' as const } : l)),
        ],
        withdrawals: [{ id: `w${s.seq.withdrawal}`, creatorId: a.creatorId, gross: w.gross, tds: w.tds, net: w.net, upi: a.upi, createdAt: a.now }, ...s.withdrawals],
        seq: { ...s.seq, ledger: s.seq.ledger + 1, withdrawal: s.seq.withdrawal + 1 },
      };
    }

    case 'dev/ensureGap': {
      if (s.gapNights.some((g) => g.status === 'live')) return s;
      const gap: MGapNight = { id: `gap${s.seq.gap}`, hotelId: s.hotel.id, roomTypeId: 'lake-deluxe', datesLabel: 'Dec 19 – 21', rooms: 4, booked: 0, rate: 3400, campaignRate: 4200, audience: ['saved', 'free', 'budget'], sentTo: 312, createdAt: a.now, endsAt: new Date(new Date(a.now).getTime() + 48 * 3_600_000).toISOString(), status: 'live', tripIds: ['anaya-udaipur'] };
      return { ...s, gapNights: [gap, ...s.gapNights], seq: { ...s.seq, gap: s.seq.gap + 1 } };
    }
  }
}
