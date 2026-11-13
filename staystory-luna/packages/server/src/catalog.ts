/** The places the rule-based reader knows about, with approximate coordinates (illustrative). */
export interface City { id: string; name: string; countryCode: string; lat: number; lng: number; knownPlaces: string[] }
export interface Activity { cityId: string; name: string; keywords: string[] }

export const CITIES: City[] = [
  { id: 'udaipur', name: 'Udaipur', countryCode: 'IN', lat: 24.5854, lng: 73.7125, knownPlaces: ['City Palace', 'Lake Pichola', 'Ambrai Ghat', 'Gangaur Ghat', 'Bagore ki Haveli', 'Sajjangarh', 'Fateh Sagar', 'Jagdish Temple', 'Old City', 'Hathi Pol'] },
  { id: 'jaipur', name: 'Jaipur', countryCode: 'IN', lat: 26.9124, lng: 75.7873, knownPlaces: ['Amer Fort', 'Hawa Mahal', 'Nahargarh', 'Patrika Gate', 'City Palace', 'Jal Mahal', 'Bapu Bazaar', 'Johari Bazaar', 'Panna Meena ka Kund', 'Albert Hall'] },
  { id: 'jodhpur', name: 'Jodhpur', countryCode: 'IN', lat: 26.2389, lng: 73.0243, knownPlaces: ['Mehrangarh Fort', 'Jaswant Thada', 'Clock Tower', 'Sardar Market', 'Blue City'] },
  { id: 'goa', name: 'Goa', countryCode: 'IN', lat: 15.2993, lng: 74.124, knownPlaces: ['Palolem', 'Fontainhas', 'Anjuna', 'Chapora Fort', 'Old Goa'] },
  { id: 'coorg', name: 'Coorg', countryCode: 'IN', lat: 12.4244, lng: 75.7382, knownPlaces: ['Abbey Falls', 'Raja Seat', 'Dubare', 'Namdroling'] },
];

export const ACTIVITIES: Activity[] = [
  { cityId: 'udaipur', name: 'Boat ride on Lake Pichola', keywords: ['boat', 'pichola'] },
  { cityId: 'udaipur', name: 'Rajasthani cooking class', keywords: ['cooking', 'cook'] },
  { cityId: 'udaipur', name: 'Folk dance at Bagore ki Haveli', keywords: ['bagore', 'dance', 'folk'] },
  { cityId: 'jaipur', name: 'Old city food walk', keywords: ['food', 'street', 'kachori', 'lassi'] },
  { cityId: 'jaipur', name: 'Block printing workshop', keywords: ['block', 'print', 'printing'] },
  { cityId: 'jaipur', name: 'Amer Fort guided entry', keywords: ['amer'] },
];

/** Approximate coordinates for places on the maps. Illustrative, not survey-grade. */
export const PLACE_COORDS: Record<string, { lat: number; lng: number }> = {
  'city palace udaipur': { lat: 24.5764, lng: 73.6835 }, 'lake pichola': { lat: 24.5726, lng: 73.6794 }, 'ambrai ghat': { lat: 24.5788, lng: 73.6812 },
  'bagore ki haveli': { lat: 24.5799, lng: 73.6809 }, sajjangarh: { lat: 24.5896, lng: 73.636 }, 'hathi pol': { lat: 24.5793, lng: 73.6862 }, 'fateh sagar': { lat: 24.5993, lng: 73.6772 },
  'amer fort': { lat: 26.9855, lng: 75.8513 }, 'hawa mahal': { lat: 26.9239, lng: 75.8267 }, nahargarh: { lat: 26.9371, lng: 75.8155 },
  'mehrangarh fort': { lat: 26.298, lng: 73.0184 },
};

/** Coordinates for a place name the reader returned ("Lake Pichola boat ride" still finds Lake Pichola). */
export function coordsFor(place: string, destination?: string | null): { lat: number; lng: number } | null {
  const p = place.toLowerCase();
  const d = (destination ?? '').toLowerCase();
  const hit = PLACE_COORDS[`${p} ${d}`.trim()] ?? Object.entries(PLACE_COORDS).find(([k]) => { const base = k.replace(/ (udaipur|jaipur)$/, ''); return p.includes(base) && (!/ (udaipur|jaipur)$/.test(k) || k.endsWith(d)); })?.[1];
  return hit ?? null;
}
