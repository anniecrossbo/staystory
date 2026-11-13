import { notFound } from "next/navigation";
import { CreatorPhone } from "@/components/CreatorPhone";
import { getStore } from "@/lib/store";
import { getCity, getTrip } from "@/lib/queries";
import { searchHotels } from "@/lib/liteapi";
import { addDays, toDay } from "@/lib/format";
import { ReviewView } from "./view";

// PROTO: default check-in 14 days out; real version uses traveler-selected dates
function defaultDates(nights: number) {
  const checkIn = toDay(new Date(Date.now() + 14 * 86400000));
  return { checkIn, checkOut: addDays(checkIn, nights) };
}

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const trip = getTrip(params.id);
  if (!trip) notFound();
  const s = getStore();
  const city = getCity(trip.cityId)!;

  let liveHotels: { hotels: import("@/contracts/hotel-search").HotelSearchResult[]; source: "liteapi" | "fallback"; note?: string } = {
    hotels: [],
    source: "fallback",
  };

  if (process.env.LITEAPI_KEY) {
    const { checkIn, checkOut } = defaultDates(trip.nights);
    liveHotels = await searchHotels({
      cityName: city.name,
      countryCode: "IN",
      checkIn,
      checkOut,
      adults: 2,
      currency: "INR",
    });
  }

  return (
    <CreatorPhone>
      <ReviewView
        trip={trip}
        cityName={city.name}
        hotels={s.hotels.filter((h) => h.cityId === trip.cityId)}
        activities={s.activities.filter((a) => a.cityId === trip.cityId)}
        liveHotels={liveHotels.hotels}
        liveSource={liveHotels.source}
        liveNote={liveHotels.note}
      />
    </CreatorPhone>
  );
}
