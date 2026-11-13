import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CreatorPhone } from "@/components/CreatorPhone";
import { getStore } from "@/lib/store";
import { getCreator, getHotel, getTrip } from "@/lib/queries";
import { tripActivityIds } from "@/lib/builder";
import { computeSplit, priceTrip } from "@/lib/pricing";
import { ShareView } from "./view";

export default function SharePage({ params }: { params: { id: string } }) {
  const trip = getTrip(params.id);
  if (!trip) notFound();
  const creator = getCreator(trip.creatorId)!;
  const hotel = getHotel(trip.recommendedHotelId)!;
  const ids = tripActivityIds(trip);
  const price = priceTrip({ roomRate: hotel.rate, nights: trip.nights, travelers: 4, activities: getStore().activities.filter((a) => ids.includes(a.id)) });
  const split = computeSplit(price.total, hotel.commissionPct, creator.shareOfValue, true);
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const path = `/t/${creator.handle}/${trip.slug}`;
  return (
    <CreatorPhone>
      <ShareView
        published={trip.status === "published"}
        tripId={trip.id}
        title={trip.title}
        path={path}
        fullUrl={`${proto}://${host}${path}`}
        example={{ value: price.total, share: split.creatorShare }}
      />
    </CreatorPhone>
  );
}
