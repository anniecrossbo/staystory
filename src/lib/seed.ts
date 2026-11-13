import { ACTIVITIES, CITIES, CREATORS, HOTELS } from "./catalog";
import { buildTrip, tripActivityIds } from "./builder";
import { SAMPLE_REELS } from "./samples";
import { addDays, nightsBetween } from "./format";
import { computeSplit, priceTrip } from "./pricing";
import type { Booking, Extraction, Store, Trip } from "./types";

interface SeedTrip {
  id: string;
  creatorId: string;
  extraction: Extraction;
  reelUrl: string;
  caption: string;
  baselineVisits: number;
  baselineSaves: number;
  forceHotelId?: string;
}

const udaipurSample = SAMPLE_REELS[0];
const jaipurSample = SAMPLE_REELS[1];

const SEED_TRIPS: SeedTrip[] = [
  { id: "t-anaya-udaipur", creatorId: "c-anaya", extraction: udaipurSample.extraction, reelUrl: udaipurSample.reelUrl, caption: udaipurSample.caption, baselineVisits: 1019, baselineSaves: 300 },
  {
    id: "t-anaya-jaipur",
    creatorId: "c-anaya",
    extraction: { destination: "Jaipur", days: 2, places: ["Hawa Mahal at sunrise", "Old city food walk"], budgetPerPerson: 6000, namedStay: null, style: ["Weekend trips"], title: "Jaipur weekend" },
    reelUrl: "https://www.instagram.com/reel/C7anJaipur",
    caption: "Jaipur weekend: Hawa Mahal at sunrise and a food walk through the old city.",
    baselineVisits: 264,
    baselineSaves: 42,
  },
  { id: "t-riya-jaipur", creatorId: "c-riya", extraction: jaipurSample.extraction, reelUrl: jaipurSample.reelUrl, caption: jaipurSample.caption, baselineVisits: 980, baselineSaves: 150 },
  {
    id: "t-riya-udaipur",
    creatorId: "c-riya",
    extraction: { destination: "Udaipur", days: 2, places: ["Fateh Sagar evening", "Boat ride at golden hour"], budgetPerPerson: 8000, namedStay: "Lakeview Haveli", style: ["Friend groups"], title: "Udaipur weekend, no rush" },
    reelUrl: "https://www.instagram.com/reel/C6riyaUdr",
    caption: "Udaipur weekend, no rush. Fateh Sagar evenings and a golden-hour boat ride. Stayed at Lakeview Haveli.",
    baselineVisits: 639,
    baselineSaves: 88,
    forceHotelId: "h-lakeview",
  },
  {
    id: "t-kabir-udaipur",
    creatorId: "c-kabir",
    extraction: { destination: "Udaipur", days: 3, places: ["Old City lanes", "Folk dance at Bagore ki Haveli", "Sajjangarh sunset"], budgetPerPerson: 7000, namedStay: null, style: ["Budget backpacking"], title: "Udaipur on a student budget" },
    reelUrl: "https://www.instagram.com/reel/C5kabirUdr",
    caption: "Udaipur on a student budget: old city lanes, folk dance at Bagore ki Haveli, Sajjangarh sunset.",
    baselineVisits: 410,
    baselineSaves: 61,
    forceHotelId: "h-lakeview",
  },
];

// [id, tripId, checkIn, checkOut, travelers, status]
const SEED_BOOKINGS: [string, string, string, string, number, Booking["status"]][] = [
  ["CB-UDR-2179", "t-riya-udaipur", "2026-12-24", "2026-12-27", 2, "pending"],
  ["CB-UDR-2142", "t-anaya-udaipur", "2026-12-06", "2026-12-08", 2, "pending"],
  ["CB-UDR-2120", "t-kabir-udaipur", "2026-12-04", "2026-12-06", 2, "pending"],
  ["CB-JAI-2093", "t-anaya-jaipur", "2026-11-28", "2026-11-30", 3, "pending"],
  ["CB-UDR-2050", "t-anaya-udaipur", "2026-11-22", "2026-11-24", 2, "pending"],
  ["CB-JAI-2066", "t-riya-jaipur", "2026-11-21", "2026-11-23", 4, "pending"],
  ["CB-UDR-2011", "t-riya-udaipur", "2026-11-14", "2026-11-15", 2, "cancelled"],
  ["CB-UDR-1988", "t-anaya-udaipur", "2026-11-07", "2026-11-09", 2, "completed"],
  ["CB-UDR-1902", "t-riya-udaipur", "2026-10-24", "2026-10-26", 2, "completed"],
  ["CB-UDR-1877", "t-riya-udaipur", "2026-10-17", "2026-10-19", 4, "completed"],
  ["CB-UDR-1851", "t-kabir-udaipur", "2026-10-10", "2026-10-12", 2, "completed"],
  ["CB-UDR-1820", "t-anaya-udaipur", "2026-10-03", "2026-10-05", 2, "completed"],
];

const GUESTS = ["Ishaan M.", "Tara S.", "Kunal R.", "Neha P.", "Aditi V.", "Rohan K.", "Sana Q.", "Vikram D.", "Meera T.", "Arnav G.", "Zoya F.", "Dhruv B."];

export function createSeedStore(): Store {
  const trips: Trip[] = [];
  for (const s of SEED_TRIPS) {
    const res = buildTrip({
      extraction: s.extraction,
      creatorId: s.creatorId,
      reelUrl: s.reelUrl,
      caption: s.caption,
      source: "cache",
      id: s.id,
      existingSlugs: trips.filter((t) => t.creatorId === s.creatorId).map((t) => t.slug),
      status: "published",
      baselineVisits: s.baselineVisits,
      baselineSaves: s.baselineSaves,
      forceHotelId: s.forceHotelId,
    });
    if (res.ok) trips.push({ ...res.trip, createdAt: "2026-09-01T09:00:00.000Z" });
  }
  // Friendlier slug for Anaya's Jaipur trip.
  const aj = trips.find((t) => t.id === "t-anaya-jaipur");
  if (aj) aj.slug = "jaipur-weekend";
  const ru = trips.find((t) => t.id === "t-riya-udaipur");
  if (ru) ru.slug = "udaipur-weekend";

  const bookings: Booking[] = SEED_BOOKINGS.map(([id, tripId, checkIn, checkOut, travelers, status], i) => {
    const trip = trips.find((t) => t.id === tripId)!;
    const hotel = HOTELS.find((h) => h.id === trip.recommendedHotelId)!;
    const creator = CREATORS.find((c) => c.id === trip.creatorId)!;
    const activityIds = tripActivityIds(trip);
    const nights = nightsBetween(checkIn, checkOut);
    const price = priceTrip({ roomRate: hotel.rate, nights, travelers, activities: ACTIVITIES.filter((a) => activityIds.includes(a.id)) });
    const split = computeSplit(price.total, hotel.commissionPct, creator.shareOfValue, true);
    return {
      id,
      tripId,
      hotelId: hotel.id,
      creatorId: creator.id,
      selfBooking: false,
      checkIn,
      checkOut,
      rooms: price.rooms,
      travelers,
      roomRate: hotel.rate,
      activityIds,
      lines: price.lines,
      value: price.total,
      hotelCommission: split.hotelCommission,
      creatorShare: split.creatorShare,
      crossboShare: split.crossboShare,
      status,
      hotelAcknowledged: true,
      guestName: GUESTS[i % GUESTS.length],
      createdAt: `${addDays(checkIn, -21)}T10:00:00.000Z`,
    };
  });

  return {
    cities: CITIES,
    hotels: HOTELS,
    activities: ACTIVITIES,
    creators: CREATORS,
    trips,
    bookings,
    visits: [],
    campaigns: [],
    gapReleases: [],
    traveler: {
      id: "u-rhea",
      name: "Rhea",
      initials: "RK",
      savedTripIds: ["t-anaya-udaipur", "t-riya-jaipur"],
      friends: [
        { id: "f1", name: "Mira", initials: "MS", busy: [{ from: "2026-12-24", to: "2026-12-27" }] },
        { id: "f2", name: "Priya", initials: "PJ", busy: [] },
        { id: "f3", name: "Arjun", initials: "AV", busy: [{ from: "2026-12-12", to: "2026-12-14" }] },
        { id: "f4", name: "Dev", initials: "DM", busy: [] },
        { id: "f5", name: "Kiara", initials: "KT", busy: [{ from: "2027-01-01", to: "2027-01-10" }] },
      ],
    },
    demoHotelId: "h-lakeview",
    demoCreatorId: "c-anaya",
    seq: 2187,
  };
}
