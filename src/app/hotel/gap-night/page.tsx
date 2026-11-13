import NextLink from "next/link";
import { HotelShell } from "@/components/HotelShell";
import { LinkButton } from "@/components/LinkButton";
import { getStore } from "@/lib/store";
import { getHotel, occupancy } from "@/lib/queries";
import { addDays, dayLabel, inr, parseDay, toDay } from "@/lib/format";
import { GapView } from "./view";

function mondayAfter(daysAhead: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysAhead);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return toDay(d);
}

export default function GapNightPage({ searchParams }: { searchParams: { week?: string; released?: string } }) {
  const s = getStore();
  const hotel = getHotel(s.demoHotelId)!;
  const valid = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) && parseDay(searchParams.week).getUTCDay() === 1;
  const minWeek = mondayAfter(1);
  const week = valid && searchParams.week! >= minWeek ? searchParams.week! : mondayAfter(7);
  const nights = Array.from({ length: 7 }, (_, i) => {
    const night = addDays(week, i);
    return { night, ...occupancy(hotel, night) };
  });
  const released = searchParams.released ? s.gapReleases.find((g) => g.id === searchParams.released) : undefined;
  const prev = addDays(week, -7);

  return (
    <HotelShell hotelName={hotel.name}>
      {released && (
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-large border border-success-200 bg-success-50 p-4">
          <div className="text-sm text-success-800">
            <strong>
              {released.rooms} {released.rooms === 1 ? "room" : "rooms"} released
            </strong>{" "}
            for {dayLabel(released.nights[0])} to {dayLabel(addDays(released.nights[released.nights.length - 1], 1))} at {inr(released.rate)}. Travelers who saved a trip here now see the deal.
          </div>
          <LinkButton href="/traveler" color="success" variant="flat" radius="lg" size="sm">
            See it as a traveler
          </LinkButton>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Release Gap Night rooms</h1>
          <p className="text-sm text-default-600">Sell empty nights to travelers who already saved this city. You pay commission only on rooms filled.</p>
        </div>
        <div className="flex gap-2 text-sm">
          {prev >= minWeek ? (
            <NextLink href={`/hotel/gap-night?week=${prev}`} className="rounded-medium px-3 py-2 text-primary hover:bg-default-100">
              Previous week
            </NextLink>
          ) : null}
          <NextLink href={`/hotel/gap-night?week=${addDays(week, 7)}`} className="rounded-medium px-3 py-2 text-primary hover:bg-default-100">
            Next week
          </NextLink>
        </div>
      </div>
      <GapView key={week} hotel={{ rate: hotel.rate, totalRooms: hotel.totalRooms, roomTypes: hotel.roomTypes, commissionPct: hotel.commissionPct }} nights={nights} />
    </HotelShell>
  );
}
