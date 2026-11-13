import { creatorCommission, hotel as sampleHotel } from '@staystory/core';
import type { MBooking, MCampaign, MCreator, MExperience, MLedger, MStay, MStop, MTrip, MarketState } from './types';

const NOW = () => new Date().toISOString();

export const CREATORS: MCreator[] = [
  { id: 'anaya', handle: '@anaya.explores', name: 'Anaya Rao', ini: 'AR', followers: '412K', niche: 'Slow travel', bio: 'Slow travel, Rajasthan and the South', tripsCount: '3', travelers: '1.2K', hue: 'moss', cover: 'udaipur', score: '96%', conv: '0.37%', bookingsPerMonth: '46', ncr: '15%', top: true, why: 'Already your top converter. 312 of her followers saved her Udaipur trip.', meta: '412K · 9 Udaipur trips · 0.37% conversion' },
  { id: 'riya', handle: '@roamwithriya', name: 'Riya Malhotra', ini: 'RM', followers: '238K', niche: 'Weekend escapes', bio: 'Weekends from Delhi under ₹10k', tripsCount: '1', travelers: '860', hue: 'sky', cover: 'jaipur', score: '88%', conv: '0.52%', bookingsPerMonth: '18', ncr: '41%', why: 'Weekend audience from Delhi. Good for Courtyard Room offers.', meta: '238K · 0.52% conversion' },
  { id: 'couples', handle: '@couplesgoplaces', name: 'Couples Go Places', ini: 'CG', followers: '96K', niche: 'Couples', bio: 'Romantic escapes in India', tripsCount: '2', travelers: '210', hue: 'plum', cover: 'palace', score: '80%', conv: '0.44%', bookingsPerMonth: '7', ncr: '35%', why: 'Small but high intent. Suited to Heritage Suite packages.', meta: '96K · 0.44% conversion' },
  { id: 'food', handle: '@thefoodtrail', name: 'The Food Trail', ini: 'FT', followers: '520K', niche: 'Food and culture', bio: 'Eat your way across India', tripsCount: '4', travelers: '940', hue: 'ochre', cover: 'pushkar', score: '83%', conv: '0.29%', bookingsPerMonth: '14', ncr: '30%', why: 'Pairs with your rooftop breakfast and cooking experiences.', meta: '520K · 0.29% conversion' },
  { id: 'mia', handle: '@wander.mia', name: 'Mia Wanders', ini: 'MW', followers: '64K', niche: 'Solo travel', bio: 'Solo travel, safely', tripsCount: '2', travelers: '180', hue: 'violet', cover: 'jodhpur', score: '77%', conv: '0.33%', bookingsPerMonth: '5', ncr: '28%', why: 'Safety-minded audience values your central location.', meta: '64K · 0.33% conversion' },
  { id: 'desi', handle: '@desi.nomad', name: 'Desi Nomad', ini: 'DN', followers: '180K', niche: 'Budget', bio: 'Backpacking on a budget', tripsCount: '3', travelers: '520', hue: 'clay', cover: 'hampi', score: '72%', conv: '0.21%', bookingsPerMonth: '9', ncr: '22%', why: 'Large reach, lower budget. Better for Courtyard Room offers.', meta: '180K · 0.21% conversion' },
  { id: 'kabir', handle: '@kabir.coast', name: 'Kabir Fernandes', ini: 'KF', followers: '156K', niche: 'Coast', bio: 'Konkan coast, surf and seafood', tripsCount: '2', travelers: '410', hue: 'sky', cover: 'goa' },
  { id: 'hari', handle: '@himalayan.hari', name: 'Hari Negi', ini: 'HN', followers: '97K', niche: 'Mountains', bio: 'Treks, cafés and hill towns', tripsCount: '1', travelers: '330', hue: 'moss', cover: 'rishikesh' },
];

const EXPERIENCES: MExperience[] = [
  { id: 'boat', name: 'Sunset boat, Lake Pichola', day: 1, time: '17:30 · 1 h', pricePerPerson: 900, img: 'udaipur' },
  { id: 'walk', name: 'City Palace guided walk', day: 2, time: '09:30 · 2 h', pricePerPerson: 700, img: 'palace' },
  { id: 'cook', name: 'Rajasthani cooking class', day: 2, time: '16:00 · 3 h', pricePerPerson: 1500, img: 'haveli' },
];
const stop = (id: string, name: string, kind: string, extra: Partial<MStop> = {}): MStop => ({ id, name, kind, bookable: false, ...extra });
const UDAIPUR_DAYS: MTrip['itinerary'] = [
  { n: 1, title: 'Arrive, lakeside evening', stops: [stop('checkin', 'Check in · Haveli Jheel', 'Stay', { bookable: true, time: '14:00', img: 'haveli' }), stop('boat', 'Sunset boat, Lake Pichola', 'Experience', { bookable: true, pricePerPerson: 900, time: '17:30', img: 'udaipur' }), stop('ambrai', 'Dinner at Ambrai ghat', 'Restaurant', { time: '20:00', img: 'pushkar' })] },
  { n: 2, title: 'Palaces and the old city', stops: [stop('walk', 'City Palace guided walk', 'Experience', { bookable: true, pricePerPerson: 700, time: '09:30', img: 'palace' }), stop('bagore', 'Bagore ki Haveli', 'Museum', { time: '13:00', img: 'verandah' }), stop('cook', 'Rajasthani cooking class', 'Experience', { bookable: true, pricePerPerson: 1500, time: '16:00', img: 'haveli' })] },
  { n: 3, title: 'Sunrise, then home', stops: [stop('sajjan', 'Sajjangarh at sunrise', 'Viewpoint', { time: '06:15', img: 'hampi' }), stop('hathi', 'Hathi Pol market', 'Market', { time: '10:00', img: 'jodhpur' })] },
];
const UDAIPUR_STAYS: MStay[] = [
  { id: 'jheel', hotelId: 'haveli-jheel', roomTypeId: 'lake-deluxe', name: 'Haveli Jheel', tier: 'creator_pick', desc: 'Lake-view rooms, rooftop breakfast', nightly: 4200, img: 'haveli', commissionPct: 15, campaignId: 'winter-pichola' },
  { id: 'pichola', hotelId: 'pichola-courtyard', roomTypeId: 'std', name: 'Pichola Courtyard', tier: 'budget', desc: 'Old-city guesthouse near the ghats', nightly: 2300, img: 'verandah', commissionPct: 12 },
  { id: 'aravalli', hotelId: 'aravalli-palace', roomTypeId: 'suite', name: 'Aravalli Palace', tier: 'luxury', desc: 'Palace hotel, pool, transfers', nightly: 9800, img: 'palace', commissionPct: 18 },
];
/** One signature experience per generic trip, priced so a trip's card price matches the design (Jaipur ₹9,800, Goa ₹18,200 ...). */
const CARD_PRICE: Record<string, [number, string]> = {
  'riya-jaipur': [9800, 'Amer fort sunrise walk'], 'kabir-goa': [18200, 'Spice farm and beach day'], 'hari-rishikesh': [8400, 'Rafting and café trail'],
  'anaya-coorg': [12900, 'Plantation walk'], 'kabir-gokarna': [9200, 'Cove-hopping boat'], 'anaya-jodhpur': [8900, 'Old city walk'],
};
const seedExperience = (id: string, place: string, days: number, nightly: number): MExperience => {
  const [target, name] = CARD_PRICE[id] ?? [nightly * (days - 1) + 2000, `${place} guided day`];
  return { id: `${id}-exp`, name, day: Math.min(2, days), time: '09:30 · 3 h', pricePerPerson: Math.max(0, Math.round((target - nightly * (days - 1)) / 2)), img: id.split('-')[1] ?? 'udaipur' };
};
const simpleTrip = (id: string, creatorId: string, slug: string, place: string, days: number, title: string, img: string, nightly: number, saves: number, tags: string[]): MTrip => ({
  id, creatorId, slug, title, place, days, img, tags, saves, travelersBooked: 0, creatorSaving: 0, status: 'live', reelUrl: '', dmKeyword: 'link', publishedAt: '2026-10-01T00:00:00.000Z',
  itinerary: Array.from({ length: days }, (_, i) => ({ n: i + 1, title: i === 0 ? 'Arrive and settle in' : i === days - 1 ? 'A slow last morning' : 'Out and about', stops: [stop(`${id}-d${i}`, `${place}, day ${i + 1}`, 'Tip')] })),
  stays: [{ id: `${id}-stay`, hotelId: `${id}-hotel`, roomTypeId: 'std', name: `${place} partner stay`, tier: 'creator_pick', desc: 'Creator-picked stay', nightly, img, commissionPct: 12 }],
  pickStayId: `${id}-stay`, experiences: [seedExperience(id, place, days, nightly)],
});

/** The Coorg trip's creator-pick stay is Misty Estate, so its campaign has a stay to attach to. */
const withMisty = (t: MTrip): MTrip => ({
  ...t, pickStayId: 'coorg-misty',
  stays: [{ id: 'coorg-misty', hotelId: 'misty-estate', roomTypeId: 'estate-room', name: 'Misty Estate Coorg', tier: 'creator_pick', desc: 'Plantation stay with coffee tasting', nightly: 3300, img: 'coorg', commissionPct: 12, campaignId: 'misty-coorg' }],
});

export const SEED_TRIPS: MTrip[] = [
  { id: 'anaya-udaipur', creatorId: 'anaya', slug: 'udaipur', title: 'Three days in Udaipur', place: 'Udaipur', days: 3, img: 'udaipur', tags: ['Heritage'], saves: 2184, travelersBooked: 312, creatorSaving: 600, status: 'live', reelUrl: 'instagram.com/reel/udaipur', dmKeyword: 'link', publishedAt: '2026-10-20T00:00:00.000Z', itinerary: UDAIPUR_DAYS, stays: UDAIPUR_STAYS, pickStayId: 'jheel', experiences: EXPERIENCES },
  simpleTrip('riya-jaipur', 'riya', 'jaipur', 'Jaipur', 2, 'Pink City weekend with friends', 'jaipur', 3200, 1400, ['Heritage']),
  simpleTrip('kabir-goa', 'kabir', 'goa', 'Goa', 4, 'Monsoon Goa, the quiet south', 'goa', 3800, 972, ['Beaches']),
  simpleTrip('hari-rishikesh', 'hari', 'rishikesh', 'Rishikesh', 3, 'River, yoga and a café trail', 'rishikesh', 2100, 1100, ['Mountains']),
  withMisty(simpleTrip('anaya-coorg', 'anaya', 'coorg', 'Coorg', 3, 'Coffee estates in Coorg', 'coorg', 3300, 804, ['Mountains'])),
  simpleTrip('kabir-gokarna', 'kabir', 'gokarna', 'Gokarna', 3, 'Cliffs, coves and slow sunsets', 'gokarna', 2800, 640, ['Beaches']),
  simpleTrip('anaya-jodhpur', 'anaya', 'jodhpur', 'Jodhpur', 2, 'The blue city on foot', 'jodhpur', 3500, 590, ['Heritage']),
];

const campaign: MCampaign = {
  id: 'winter-pichola', hotelId: 'haveli-jheel', name: 'Winter on Lake Pichola', roomTypeId: 'lake-deluxe', windowLabel: 'Nov 15 to Jan 31', nights: 2,
  perks: ['Breakfast', 'Late checkout', 'Sunset boat ride'], rackPrice: 9600, creatorPrice: 8400, commissionPct: 15, bookingTarget: 60,
  invites: { anaya: 'invited', riya: 'invited' }, agreedPct: {}, counters: {}, status: 'live', createdAt: '2026-11-01T00:00:00.000Z',
  meta: { listTitle: 'Haveli Jheel, Udaipur', hotelName: 'Haveli Jheel', city: 'Udaipur', when: 'Dec to Jan', img: 'haveli', roomName: 'Lake-view Deluxe', headline: 'Winter on Lake Pichola: 2 lake-view nights with breakfast and a sunset boat ride at a price only your followers get.', perk: 'Content stay after 5 bookings', why: 'Your Udaipur reels drive 1 in 3 of their lake-view enquiries, and your followers save trips for weeks before booking.' },
};

/** A second hotel inviting Anaya: Misty Estate in Coorg. Appended after the first campaign so existing indexes hold. */
const mistyCampaign: MCampaign = {
  id: 'misty-coorg', hotelId: 'misty-estate', name: 'Coffee estate stays', roomTypeId: 'estate-room', windowLabel: 'Dec 1 to Feb 28', nights: 2,
  perks: ['Plantation walk', 'Coffee tasting', 'Free plantation tour'], rackPrice: 7800, creatorPrice: 6600, commissionPct: 12, bookingTarget: 30,
  invites: { anaya: 'invited' }, agreedPct: {}, counters: {}, status: 'live', createdAt: '2026-11-03T00:00:00.000Z',
  meta: { hotelName: 'Misty Estate Coorg', city: 'Coorg', when: 'Dec to Feb', img: 'coorg', roomName: 'Estate Room', headline: 'Plantation walk and coffee tasting with every 2-night stay.', perk: 'Free plantation tour', why: 'Your Coorg monsoon reel is the most saved coffee-estate trip this season, and your followers book plantation stays early.' },
};

const bk = (id: string, guest: string, ini: string, creatorId: string, room: string, roomTypeId: string, dates: string, nights: number, roomValue: number, status: MBooking['status'], extra: Partial<MBooking> = {}): MBooking => ({
  id, travelerId: `t-${ini.toLowerCase()}`, guestName: guest, guestInitials: ini, tripId: 'anaya-udaipur', creatorId, hotelId: 'haveli-jheel', roomTypeId, roomName: room, stayId: 'jheel',
  datesLabel: dates, nights, guests: 2, roomValue, experiencesValue: 0, creatorSaving: 0, total: roomValue, experienceIds: [], source: 'link', status, createdAt: '2026-11-01T00:00:00.000Z', ...extra,
});
export const SEED_BOOKINGS: MBooking[] = [
  bk('SS-UDR-48213', 'Meera I.', 'MI', 'anaya', 'Lake-view Deluxe', 'lake-deluxe', 'Dec 19 – 21', 2, 6800, 'upcoming', { travelerId: 'meera', experiencesValue: 6200, total: 13000, experienceIds: ['boat', 'walk', 'cook'], source: 'gap_night', gapNightId: 'seed-gap' }),
  bk('SS-UDR-48190', 'Arjun M.', 'AM', 'anaya', 'Jharokha Suite', 'jharokha', 'Nov 11 – 13', 2, 14800, 'in_house'),
  bk('SS-UDR-48171', 'Sneha K.', 'SK', 'food', 'Courtyard Room', 'courtyard', 'Nov 7 – 9', 2, 6400, 'completed'),
  bk('SS-UDR-48165', 'Rohan T.', 'RT', 'desi', 'Courtyard Room', 'courtyard', 'Nov 6 – 8', 2, 6400, 'cancelled'),
  bk('SS-UDR-48142', 'Mia W.', 'MW', 'mia', 'Lake-view Deluxe', 'lake-deluxe', 'Nov 1 – 3', 2, 8400, 'completed'),
  bk('SS-UDR-48220', 'Neha P.', 'NP', 'anaya', 'Jharokha Suite', 'jharokha', 'Dec 24 – 27', 3, 22200, 'upcoming'),
];

const L = (id: string, label: string, meta: string, amount: number, status: MLedger['status'], bookingId?: string): MLedger => ({ id, creatorId: 'anaya', bookingId, label, meta, amount, status, createdAt: '2026-11-01T00:00:00.000Z' });
export const SEED_LEDGER: MLedger[] = [
  L('l1', 'Udaipur · Meera I.', 'Haveli Jheel · stays Dec 19 to 21 · via Gap Night', creatorCommission(13000), 'pending_stay', 'SS-UDR-48213'),
  L('l2', 'Udaipur · Rohan S.', 'Haveli Jheel · checked out Nov 10', 1168, 'available'),
  L('l3', 'Coorg · Divya K.', 'Misty Estate · checked out Nov 3', 1032, 'available'),
  L('l4', 'Udaipur · Arjun P.', 'Pichola Courtyard', 0, 'cancelled'),
  L('l5', 'Earlier bookings', '14 stays · checked out in October and November', 19560, 'available'),
  L('l6', 'Upcoming stays', '9 bookings waiting for check-out', 11440, 'pending_stay'),
  L('l7', 'October payout', 'Paid Nov 5', 48160, 'paid'),
];

const room = sampleHotel.rooms;
export function seedState(): MarketState {
  return {
    v: 2,
    hotel: {
      id: 'haveli-jheel', name: 'Haveli Jheel', city: 'Udaipur', commissionPct: 15, floorRate: 3000, status: 'submitted', syncMode: 'api',
      rooms: room.map((r) => ({ id: r.id, name: r.name, count: r.count, sleeps: r.sleeps, rackRate: r.rackRate, meal: r.meal })),
    },
    creators: Object.fromEntries(CREATORS.map((c) => [c.id, c])),
    campaigns: [campaign, mistyCampaign],
    trips: SEED_TRIPS,
    bookings: SEED_BOOKINGS,
    gapNights: [],
    ledger: SEED_LEDGER,
    withdrawals: [],
    travelers: { meera: { id: 'meera', name: 'Meera Iyer', whatsapp: '+91 98200 00000', signedIn: false, savedTripIds: [], savedShopIds: [], followingIds: [], prefs: { styles: ['Heritage', 'Lakes', 'Food'], budget: 'mid', gapAlerts: true } } },
    attributions: [],
    reviews: [],
    settlements: [
      { id: 's1', hotelId: 'haveli-jheel', period: 'Nov 2 – 8', stays: 21, gross: 436200, commission: 65430, net: 370770 },
      { id: 's2', hotelId: 'haveli-jheel', period: 'Oct 26 – Nov 1', stays: 18, gross: 352000, commission: 52800, net: 299200 },
      { id: 's3', hotelId: 'haveli-jheel', period: 'Oct 19 – 25', stays: 24, gross: 510400, commission: 76560, net: 433840 },
      { id: 's4', hotelId: 'haveli-jheel', period: 'Oct 12 – 18', stays: 15, gross: 288900, commission: 43335, net: 245565 },
    ],
    seq: { booking: 48230, trip: 1, campaign: 1, gap: 1, ledger: 100, withdrawal: 1 },
  };
}
export { NOW };
