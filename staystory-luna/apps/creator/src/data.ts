import { formatINR } from '@staystory/core';
import type { MStay, MarketState } from '@staystory/market';
import { acceptedOffers } from '@staystory/market';

export const asset = (n: string) => `/assets/${n}.jpg`;
export const CREATOR_ID = 'anaya';

export interface DayItem { id: string; name: string; kind: string; bookable: boolean; price?: number; time?: string; img?: string; dur?: string }
export interface Day { n: number; title: string; items: DayItem[] }
export const DETAIL_KEYS = ['Destination', 'Length', 'Budget', 'Vibe', 'Best for'] as const;
export type DetailKey = (typeof DETAIL_KEYS)[number];

const it = (id: string, name: string, kind: string, extra: Partial<DayItem> = {}): DayItem => ({ id, name, kind, bookable: false, ...extra });
const UDAIPUR_DAYS: Day[] = [
  { n: 1, title: 'Arrive, lakeside evening', items: [it('checkin', 'Check in · Haveli Jheel', 'Stay', { bookable: true, time: '14:00', img: 'haveli' }), it('boat', 'Sunset boat, Lake Pichola', 'Experience', { bookable: true, price: 900, time: '17:30', dur: '1 h', img: 'udaipur' }), it('ambrai', 'Dinner at Ambrai ghat', 'Restaurant', { time: '20:00', img: 'pushkar' })] },
  { n: 2, title: 'Palaces and the old city', items: [it('walk', 'City Palace guided walk', 'Experience', { bookable: true, price: 700, time: '09:30', dur: '2 h', img: 'palace' }), it('bagore', 'Bagore ki Haveli', 'Museum', { time: '13:00', img: 'verandah' }), it('cook', 'Rajasthani cooking class', 'Experience', { bookable: true, price: 1500, time: '16:00', dur: '3 h', img: 'haveli' })] },
  { n: 3, title: 'Sunrise, then home', items: [it('sajjan', 'Sajjangarh at sunrise', 'Viewpoint', { time: '06:15', img: 'hampi' }), it('hathi', 'Hathi Pol market', 'Market', { time: '10:00', img: 'jodhpur' })] },
];
const COORG_DAYS: Day[] = [
  { n: 1, title: 'Arrive at the estate', items: [it('c-checkin', 'Check in · Misty Estate', 'Stay', { bookable: true, time: '14:00', img: 'coorg' }), it('c-walk', 'Plantation walk and coffee tasting', 'Experience', { bookable: true, price: 1200, time: '16:30', dur: '2 h', img: 'coorg' }), it('c-dinner', 'Dinner at the estate kitchen', 'Restaurant', { time: '20:00', img: 'coorg' })] },
  { n: 2, title: 'Falls and viewpoints', items: [it('c-abbey', 'Abbey Falls', 'Waterfall', { time: '09:00', img: 'coorg' }), it('c-raja', 'Raja’s Seat at sunset', 'Viewpoint', { time: '17:00', img: 'coorg' }), it('c-camp', 'Dubare river and elephant camp', 'Experience', { bookable: true, price: 1000, time: '11:00', dur: '3 h', img: 'coorg' })] },
  { n: 3, title: 'A slow last morning', items: [it('c-monk', 'Namdroling monastery', 'Temple', { time: '09:30', img: 'coorg' }), it('c-fort', 'Madikeri fort', 'Museum', { time: '12:00', img: 'coorg' })] },
];
const generic = (place: string): Day[] => {
  const k = place.toLowerCase().replace(/[^a-z]/g, '');
  return [
    { n: 1, title: 'Arrive and settle in', items: [it(`${k}-in`, `Check in · ${place}`, 'Stay', { bookable: true, time: '14:00' }), it(`${k}-walk`, `Guided ${place} walk`, 'Experience', { bookable: true, price: 800, time: '17:00', dur: '2 h' }), it(`${k}-dinner`, 'Dinner at a local favourite', 'Restaurant', { time: '20:00' })] },
    { n: 2, title: 'Old town and markets', items: [it(`${k}-market`, `${place} main market`, 'Market', { time: '10:00' }), it(`${k}-view`, 'Sunset viewpoint', 'Viewpoint', { time: '17:30' }), it(`${k}-cook`, 'Local cooking class', 'Experience', { bookable: true, price: 1400, time: '15:00', dur: '3 h' })] },
    { n: 3, title: 'A slow last morning', items: [it(`${k}-cafe`, 'Café breakfast', 'Restaurant', { time: '09:00' }), it(`${k}-shop`, 'Last-minute shopping', 'Market', { time: '11:00' })] },
  ];
};

export interface Dest { place: string; region: string; views: string; img: string; days: Day[]; details: Record<DetailKey, string>; tags: string[]; extras: MStay[]; suggest: { name: string; kind: string }[] }
const DEST_ROWS: [string, string, string, string][] = [
  ['Udaipur', 'Rajasthan', '1.2M', 'udaipur'], ['Coorg', 'Karnataka', '640K', 'coorg'], ['Jodhpur', 'Rajasthan', '310K', 'jodhpur'],
  ['Pushkar', 'Rajasthan', '220K', 'pushkar'], ['Hampi', 'Karnataka', '180K', 'hampi'], ['Gokarna', 'Karnataka', '96K', 'gokarna'],
];
const stay = (id: string, hotelId: string, name: string, tier: MStay['tier'], nightly: number, img: string, pct: number): MStay => ({ id, hotelId, roomTypeId: 'std', name, tier, desc: `${name}, partner stay`, nightly, img, commissionPct: pct });
const extrasFor = (place: string, img: string): MStay[] => {
  const k = place.toLowerCase();
  if (place === 'Udaipur') return [stay('lakeside', 'fateh-sagar', 'Fateh Sagar Lakeside', 'mid', 3600, 'pushkar', 14)];
  if (place === 'Coorg') return [stay('coorg-planters', 'planters-bungalow', 'Planters Bungalow', 'budget', 2600, 'coorg', 12), stay('coorg-resort', 'cardamom-hill', 'Cardamom Hill Resort', 'luxury', 8200, 'coorg', 16)];
  return [stay(`${k}-courtyard`, `${k}-courtyard`, `${place} Courtyard Stay`, 'budget', 2400, img, 12), stay(`${k}-heritage`, `${k}-heritage`, `${place} Heritage Hotel`, 'luxury', 7600, img, 18)];
};
export const DESTS: Dest[] = DEST_ROWS.map(([place, region, views, img]) => ({
  place, region, views, img,
  days: place === 'Udaipur' ? UDAIPUR_DAYS : place === 'Coorg' ? COORG_DAYS : generic(place),
  details: place === 'Udaipur'
    ? { Destination: 'Udaipur, Rajasthan', Length: '3 days, 2 nights', Budget: 'Under ₹15,000 for 2', Vibe: 'Lakes, palaces, food', 'Best for': 'Couples and friends' }
    : { Destination: `${place}, ${region}`, Length: '3 days, 2 nights', Budget: 'Under ₹15,000 for 2', Vibe: place === 'Coorg' ? 'Coffee, waterfalls, slow mornings' : 'Heritage, food, markets', 'Best for': 'Couples and friends' },
  tags: place === 'Udaipur' || place === 'Jodhpur' || place === 'Pushkar' ? ['Heritage'] : place === 'Hampi' ? ['Heritage'] : place === 'Gokarna' ? ['Beaches'] : ['Mountains'],
  extras: extrasFor(place, img),
  suggest: [
    { name: place === 'Udaipur' ? 'Saheliyon ki Bari' : `${place} old town stroll`, kind: 'Garden' }, { name: place === 'Udaipur' ? 'Jag Mandir by boat' : 'Local sunrise point', kind: 'Viewpoint' },
    { name: place === 'Udaipur' ? 'Monsoon Palace' : 'Craft market', kind: place === 'Udaipur' ? 'Palace' : 'Market' }, { name: 'Street food walk', kind: 'Restaurant' }, { name: 'Café with a view', kind: 'Restaurant' },
  ],
}));
export const destFor = (place: string): Dest => DESTS.find((d) => d.place === place) ?? { ...DESTS[0]!, place, days: generic(place), details: { ...DESTS[0]!.details, Destination: place }, extras: extrasFor(place, 'udaipur') };

/** Hotels the creator can attach in this place: stays from trips already in the store plus partner extras. */
export function stayCatalog(s: MarketState, place: string, own: MStay[] = []): MStay[] {
  const seen = new Set<string>(); const out: MStay[] = [];
  const add = (st: MStay) => { if (!seen.has(st.id)) { seen.add(st.id); out.push(st); } };
  own.forEach(add);
  s.trips.filter((t) => t.place === place && t.creatorId === CREATOR_ID).forEach((t) => t.stays.forEach(add));
  s.trips.filter((t) => t.place === place).forEach((t) => t.stays.forEach(add));
  destFor(place).extras.forEach(add);
  // Anything else in the store with an accepted offer for this place (e.g. an offer on a hotel the app already knows).
  return out;
}

const TIER = { creator_pick: 'Partner stay', budget: 'Budget', mid: 'Mid-range', luxury: 'Luxury' } as const;
/** Card copy for a stay: "Your offer" only when the creator accepted that hotel's campaign. */
export function stayCard(s: MarketState, st: MStay) {
  const offer = acceptedOffers(s, CREATOR_ID)[st.hotelId];
  const nightly = offer ? Math.round(offer.campaign.creatorPrice / offer.campaign.nights) : st.nightly;
  return {
    meta: offer ? `Your offer: ${offer.campaign.name} · ${formatINR(nightly)} a night` : `${TIER[st.tier]} · ${formatINR(nightly)} a night`,
    comm: `${offer ? offer.pct : st.commissionPct}% commission`, offer: !!offer,
    stay: { ...st, nightly, commissionPct: offer ? offer.pct : st.commissionPct, campaignId: offer ? offer.campaign.id : undefined } as MStay,
  };
}
