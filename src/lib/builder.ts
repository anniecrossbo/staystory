import { ACTIVITIES, CITIES, HOTELS } from "./catalog";
import type { Activity, City, Day, Extraction, ExtractionSource, Hotel, Stop, Trip } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/\bthe\b/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function matchCity(destination: string | null | undefined): City | undefined {
  if (!destination) return undefined;
  const d = norm(destination);
  return CITIES.find((c) => d.includes(norm(c.name)) || norm(c.name).includes(d));
}

export function matchHotel(cityHotels: Hotel[], namedStay: string | null): Hotel | undefined {
  if (!namedStay) return undefined;
  const n = norm(namedStay);
  if (n.length < 4) return undefined;
  return cityHotels.find((h) => {
    const hn = norm(h.name);
    const core = hn.replace(norm(CITIES.find((c) => c.id === h.cityId)?.name ?? ""), "").trim();
    return hn.includes(n) || n.includes(hn) || (core.length > 3 && n.includes(core));
  });
}

function pickRecommended(cityHotels: Hotel[], nights: number, budgetPerPerson: number | null): Hotel {
  const mids = cityHotels.filter((h) => h.tier === "mid").sort((a, b) => b.rate - a.rate);
  if (budgetPerPerson) {
    // Stay should take at most ~60% of the per-person budget, two people per room.
    const fit = mids.find((h) => (h.rate * nights) / 2 <= budgetPerPerson * 0.6);
    if (fit) return fit;
  }
  return mids[0] ?? cityHotels[0];
}

let stopSeq = 0;
const stopId = () => `s${Date.now().toString(36)}${(stopSeq++).toString(36)}`;

function placeToStop(place: string, cityActivities: Activity[], used: Set<string>): Stop {
  const p = place.toLowerCase();
  const act = cityActivities.find((a) => a.kind === "activity" && !used.has(a.id) && a.keywords.some((k) => p.includes(k)));
  if (act) {
    used.add(act.id);
    return { id: stopId(), label: act.name, kind: "activity", activityId: act.id };
  }
  return { id: stopId(), label: place, kind: "free" };
}

function dayTitle(stops: Stop[], isFirst: boolean, isLast: boolean): string {
  const names = stops.filter((s) => s.kind !== "transfer").map((s) => s.label);
  const core = names.slice(0, 2).join(" and ");
  if (isFirst && isLast) return core ? `${core}` : "Day trip";
  if (isFirst) return core ? `Arrive, then ${core}` : "Arrive and settle in";
  if (isLast) return core ? `${core}, then fly out` : "Fly out";
  return core || "Free day";
}

export interface BuildInput {
  extraction: Extraction;
  creatorId: string;
  reelUrl: string;
  caption: string;
  source: ExtractionSource;
  id: string;
  existingSlugs: string[];
  status?: Trip["status"];
  baselineVisits?: number;
  baselineSaves?: number;
  forceHotelId?: string;
}

export type BuildResult = { ok: true; trip: Trip } | { ok: false; reason: "no_destination" | "unknown_city"; destination?: string | null };

export function buildTrip(input: BuildInput): BuildResult {
  const { extraction } = input;
  if (!extraction.destination) return { ok: false, reason: "no_destination" };
  const city = matchCity(extraction.destination);
  if (!city) return { ok: false, reason: "unknown_city", destination: extraction.destination };

  const dayCount = Math.min(5, Math.max(1, extraction.days ?? 3));
  const nights = Math.max(1, dayCount - 1);
  const cityHotels = HOTELS.filter((h) => h.cityId === city.id);
  const cityActivities = ACTIVITIES.filter((a) => a.cityId === city.id);
  const transfer = cityActivities.find((a) => a.kind === "transfer");

  const named = matchHotel(cityHotels, extraction.namedStay);
  const forced = input.forceHotelId ? cityHotels.find((h) => h.id === input.forceHotelId) : undefined;
  const recommended = forced ?? named ?? pickRecommended(cityHotels, nights, extraction.budgetPerPerson);
  const budget = cityHotels.filter((h) => h.tier === "budget" && h.id !== recommended.id).sort((a, b) => a.rate - b.rate)[0];
  const premium = cityHotels.filter((h) => h.tier === "premium" && h.id !== recommended.id).sort((a, b) => b.rate - a.rate)[0];

  const used = new Set<string>();
  const placeStops = extraction.places.map((p) => placeToStop(p, cityActivities, used));
  const days: Day[] = Array.from({ length: dayCount }, () => ({ title: "", stops: [] as Stop[] }));
  placeStops.forEach((s, i) => {
    const d = Math.min(dayCount - 1, Math.floor((i * dayCount) / Math.max(1, placeStops.length)));
    days[d].stops.push(s);
  });
  if (transfer) {
    days[0].stops.unshift({ id: stopId(), label: "Airport transfer in", kind: "transfer", activityId: transfer.id });
    days[dayCount - 1].stops.push({ id: stopId(), label: "Airport transfer out", kind: "transfer", activityId: transfer.id });
  }
  days.forEach((d, i) => (d.title = dayTitle(d.stops, i === 0, i === dayCount - 1)));

  const base = city.id;
  let slug = base;
  let n = 2;
  while (input.existingSlugs.includes(slug)) slug = `${base}-${n++}`;

  return {
    ok: true,
    trip: {
      id: input.id,
      creatorId: input.creatorId,
      slug,
      title: extraction.title?.trim() || `${dayCount} days in ${city.name}`,
      cityId: city.id,
      nights,
      days,
      recommendedHotelId: recommended.id,
      budgetHotelId: budget?.id,
      premiumHotelId: premium?.id,
      unmatchedStay: extraction.namedStay && !named && !forced ? extraction.namedStay : undefined,
      style: extraction.style,
      status: input.status ?? "draft",
      reelUrl: input.reelUrl,
      caption: input.caption,
      source: input.source,
      baselineVisits: input.baselineVisits ?? 0,
      baselineSaves: input.baselineSaves ?? 0,
      createdAt: new Date().toISOString(),
    },
  };
}

/** Activities a trip includes by default: every priced stop. */
export function tripActivityIds(trip: Trip): string[] {
  const ids = new Set<string>();
  for (const d of trip.days) for (const s of d.stops) if (s.activityId) ids.add(s.activityId);
  return [...ids];
}
