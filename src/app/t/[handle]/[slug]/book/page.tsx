import { notFound } from "next/navigation";
import { Phone } from "@/components/Phone";
import { VisitTracker } from "@/components/VisitTracker";
import { getStore } from "@/lib/store";
import { getCreator, getHotel, getTripByHandleSlug } from "@/lib/queries";
import { getAttribution, getRole } from "@/lib/session";
import { tripActivityIds } from "@/lib/builder";
import { addDays, parseDay, toDay } from "@/lib/format";
import { BookView } from "./view";

function nextFriday(minDaysAhead: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + minDaysAhead);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  return toDay(d);
}

export default function BookPage({ params, searchParams }: { params: { handle: string; slug: string }; searchParams: { gap?: string } }) {
  const trip = getTripByHandleSlug(params.handle, params.slug);
  if (!trip || trip.status !== "published") notFound();
  const s = getStore();
  const gap = searchParams.gap ? s.gapReleases.find((g) => g.id === searchParams.gap && g.roomsLeft > 0) : undefined;
  const attribution = getAttribution();
  const attributedCreator = getCreator(attribution?.creatorId);
  const hotels = [trip.recommendedHotelId, trip.budgetHotelId, trip.premiumHotelId, gap?.hotelId]
    .filter((id, i, arr): id is string => !!id && arr.indexOf(id) === i)
    .map((id) => getHotel(id)!)
    .filter((h) => h.cityId === trip.cityId);
  const campaigns = attributedCreator
    ? s.campaigns
        .filter((c) => c.status === "live" && c.invitedCreatorIds.includes(attributedCreator.id))
        .map((c) => ({ hotelId: c.hotelId, creatorPrice: c.creatorPrice, validFrom: c.validFrom, validTo: c.validTo }))
    : [];
  const checkIn = gap ? gap.nights[0] : nextFriday(14);
  const checkOut = gap ? addDays(gap.nights[gap.nights.length - 1], 1) : addDays(checkIn, trip.nights);
  const freeFriends = gap ? s.traveler.friends.filter((f) => !f.busy.some((r) => r.from <= gap.nights[gap.nights.length - 1] && r.to >= gap.nights[0])).length : 0;

  return (
    <Phone>
      <VisitTracker tripId={trip.id} />
      <BookView
        trip={{ id: trip.id, title: trip.title, recommendedHotelId: gap?.hotelId ?? trip.recommendedHotelId, backHref: `/t/${params.handle}/${params.slug}` }}
        hotels={hotels}
        activities={s.activities.filter((a) => a.cityId === trip.cityId)}
        defaultActivityIds={tripActivityIds(trip)}
        defaults={{ checkIn, checkOut, travelers: gap ? Math.min(gap.roomsLeft * 2, freeFriends + 1) : 2 }}
        gap={gap ? { id: gap.id, hotelId: gap.hotelId, rate: gap.rate, roomsLeft: gap.roomsLeft, nights: gap.nights } : undefined}
        campaigns={campaigns}
        attribution={attributedCreator ? { handle: attributedCreator.handle, self: getRole() === "creator" && attributedCreator.id === s.demoCreatorId } : null}
        today={toDay(parseDay(new Date().toISOString().slice(0, 10)))}
      />
    </Phone>
  );
}
