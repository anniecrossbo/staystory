import type { Activity, City, Creator, Hotel } from "./types";

export const CITIES: City[] = [
  {
    id: "udaipur",
    name: "Udaipur",
    knownPlaces: ["City Palace", "Lake Pichola", "Ambrai Ghat", "Gangaur Ghat", "Bagore ki Haveli", "Sajjangarh", "Fateh Sagar", "Jagdish Temple", "Old City", "Hathi Pol"],
    lat: 24.5854,
    lng: 73.7125,
  },
  {
    id: "jaipur",
    name: "Jaipur",
    knownPlaces: ["Amer Fort", "Hawa Mahal", "Nahargarh", "Patrika Gate", "City Palace", "Jal Mahal", "Bapu Bazaar", "Johari Bazaar", "Panna Meena ka Kund", "Albert Hall"],
    lat: 26.9124,
    lng: 75.7873,
  },
];

export const HOTELS: Hotel[] = [
  { id: "h-lakeview", name: "Lakeview Haveli", cityId: "udaipur", area: "Gangaur Ghat, on Lake Pichola", tier: "mid", rate: 3800, commissionPct: 0.15, totalRooms: 12, roomTypes: ["Lake-facing double", "Courtyard double"] },
  { id: "h-ambrai", name: "Ambrai Courtyard", cityId: "udaipur", area: "Hanuman Ghat, near Ambrai", tier: "mid", rate: 3200, commissionPct: 0.15, totalRooms: 10, roomTypes: ["Double room"] },
  { id: "h-bunk", name: "Pichola Bunkhouse", cityId: "udaipur", area: "Lal Ghat, old city", tier: "budget", rate: 1400, commissionPct: 0.15, totalRooms: 16, roomTypes: ["Private double", "Four-bed room"] },
  { id: "h-garh", name: "Garh Lake Palace", cityId: "udaipur", area: "Fateh Sagar shore", tier: "premium", rate: 11500, commissionPct: 0.15, totalRooms: 20, roomTypes: ["Lake suite", "Heritage room"] },
  { id: "h-verandah", name: "The Verandah Jaipur", cityId: "jaipur", area: "C-Scheme", tier: "mid", rate: 4200, commissionPct: 0.15, totalRooms: 14, roomTypes: ["Garden double", "Verandah suite"] },
  { id: "h-bapu", name: "Bapu Bazaar Haveli", cityId: "jaipur", area: "Walled city, near Bapu Bazaar", tier: "mid", rate: 2900, commissionPct: 0.15, totalRooms: 9, roomTypes: ["Haveli double"] },
  { id: "h-pinkbunk", name: "Pink City Hostel", cityId: "jaipur", area: "Near Hawa Mahal", tier: "budget", rate: 1100, commissionPct: 0.15, totalRooms: 18, roomTypes: ["Private double", "Six-bed room"] },
  { id: "h-amer", name: "Amer Fort View", cityId: "jaipur", area: "Amer, below the fort", tier: "premium", rate: 9800, commissionPct: 0.15, totalRooms: 16, roomTypes: ["Fort-view suite"] },
];

export const ACTIVITIES: Activity[] = [
  { id: "a-udr-transfer", cityId: "udaipur", name: "Airport transfers", kind: "transfer", price: 1200, keywords: ["airport", "transfer"] },
  { id: "a-udr-boat", cityId: "udaipur", name: "Boat ride on Lake Pichola", kind: "activity", price: 600, keywords: ["boat", "pichola"] },
  { id: "a-udr-cook", cityId: "udaipur", name: "Rajasthani cooking class", kind: "activity", price: 1500, keywords: ["cooking", "cook", "food"] },
  { id: "a-udr-dance", cityId: "udaipur", name: "Folk dance at Bagore ki Haveli", kind: "activity", price: 300, keywords: ["bagore", "dance", "folk"] },
  { id: "a-jai-transfer", cityId: "jaipur", name: "Airport transfers", kind: "transfer", price: 1000, keywords: ["airport", "transfer"] },
  { id: "a-jai-food", cityId: "jaipur", name: "Old city food walk", kind: "activity", price: 900, keywords: ["food", "street", "kachori", "lassi"] },
  { id: "a-jai-print", cityId: "jaipur", name: "Block printing workshop", kind: "activity", price: 1200, keywords: ["block", "print", "printing"] },
  { id: "a-jai-amer", cityId: "jaipur", name: "Amer Fort guided entry", kind: "activity", price: 700, keywords: ["amer"] },
];

export const CREATORS: Creator[] = [
  { id: "c-anaya", handle: "anaya.explores", name: "Anaya", initials: "AE", shareOfValue: 0.08, tags: ["Udaipur", "Slow travel", "Couples", "Under ₹5,000 pp"], audience: "Mumbai, Pune, Bengaluru", isDemoUser: true },
  { id: "c-riya", handle: "roamwithriya", name: "Riya", initials: "RR", shareOfValue: 0.08, tags: ["Rajasthan weekends", "Friend groups", "Weekend trips", "Under ₹5,000 pp"], audience: "Delhi, Jaipur" },
  { id: "c-kabir", handle: "wander.with.kabir", name: "Kabir", initials: "WK", shareOfValue: 0.08, tags: ["Budget backpacking", "Weekend trips", "Groups of friends"], audience: "Delhi, Chandigarh" },
  { id: "c-slow", handle: "slowtrails.in", name: "Slow Trails", initials: "ST", shareOfValue: 0.08, tags: ["Udaipur", "Groups of friends"], audience: "Ahmedabad, Mumbai" },
];

export const AUDIENCE_TAGS = ["Groups of friends", "Weekend trips", "Couples", "Under ₹5,000 pp", "Slow travel", "Budget backpacking"];
export const CAMPAIGN_PERKS = ["Breakfast included", "Late checkout", "Room upgrade", "Flexible check-in", "Experience bundle"];
