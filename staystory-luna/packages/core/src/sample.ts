import type { Campaign, Creator, Hotel, Trip, Traveler } from './types';

export const hotel: Hotel = {
  id: 'haveli-jheel', name: 'Haveli Jheel', city: 'Udaipur', defaultCommissionPct: 15, floorRate: 3000,
  rooms: [
    { id: 'courtyard', name: 'Courtyard Room', count: 8, sleeps: 2, rackRate: 3200, meal: 'Breakfast' },
    { id: 'lake-deluxe', name: 'Lake-view Deluxe', count: 12, sleeps: 2, rackRate: 4800, meal: 'Breakfast' },
    { id: 'jharokha', name: 'Jharokha Suite', count: 4, sleeps: 3, rackRate: 7400, meal: 'Breakfast' },
  ],
};

export const campaign: Campaign = {
  id: 'winter-pichola', hotelId: hotel.id, name: 'Winter on Lake Pichola', roomTypeId: 'lake-deluxe',
  window: { from: '2026-12-01', to: '2027-02-28' }, nights: 2,
  perks: ['Breakfast', 'Late checkout', 'Sunset boat ride'],
  creatorPrice: 8400, commissionPct: 15, invitedCreatorIds: ['anaya'], status: 'live',
};

export const creator: Creator = {
  id: 'anaya', handle: 'anaya.explores', name: 'Anaya Rao', followers: 412_000, niche: 'Heritage and slow travel', shopSlug: 'anaya',
};

export const trip: Trip = {
  id: 'anaya-udaipur', creatorId: creator.id, slug: 'udaipur', title: 'Three days in Udaipur', city: 'Udaipur', days: 3,
  stays: [{ hotelId: hotel.id, roomTypeId: 'lake-deluxe', nights: 2, nightlyRate: 4200, label: 'creator_pick' }],
  experiences: [
    { id: 'boat', name: 'Sunset boat, Lake Pichola', day: 1, time: '1 h', price: 900, partner: 'Pichola Boat Club' },
    { id: 'walk', name: 'City Palace guided walk', day: 2, time: '2 h', price: 700, partner: 'Udaipur Heritage Walks' },
    { id: 'cook', name: 'Rajasthani cooking class', day: 2, time: '3 h', price: 1500, partner: 'Haveli Jheel kitchen' },
  ],
  reelUrl: '', saves: 0, creatorSaving: 600,
};

export const traveler: Traveler = { id: 'meera', name: 'Meera Iyer', whatsapp: '', savedTripIds: [], savedShopIds: [] };
