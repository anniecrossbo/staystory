import { notFound } from "next/navigation";
import { Phone } from "@/components/Phone";
import { CreatorTag } from "@/components/CreatorTag";
import { LinkButton } from "@/components/LinkButton";
import { getStore } from "@/lib/store";
import { getCity, getCreator, getHotel, getTrip } from "@/lib/queries";
import { dayLabel, inr } from "@/lib/format";
import { SplitButton } from "./split-button";

export default function BookingPage({ params }: { params: { id: string } }) {
  const b = getStore().bookings.find((x) => x.id === params.id);
  if (!b) notFound();
  const trip = getTrip(b.tripId)!;
  const hotel = getHotel(b.hotelId)!;
  const city = getCity(trip.cityId)!;
  const creator = getCreator(b.creatorId);
  const tripCreator = getCreator(trip.creatorId)!;
  const perPerson = Math.round(b.value / b.travelers);
  const heading = b.status === "cancelled" ? "This booking was cancelled" : `You're going to ${city.name}`;

  return (
    <Phone>
      <div className="flex flex-col gap-6 p-5 pt-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${b.status === "cancelled" ? "bg-danger-50 text-danger" : "bg-success-50 text-success-700"}`}
            aria-hidden="true"
          >
            {b.status === "cancelled" ? "✕" : "✓"}
          </span>
          <h1 className="text-[26px] font-bold tracking-tight">{heading}</h1>
          <p className="text-sm text-default-600">
            Booking {b.id}. {dayLabel(b.checkIn)} to {dayLabel(b.checkOut)}.
          </p>
        </div>

        {creator && !b.selfBooking && <CreatorTag handle={creator.handle} initials={creator.initials} label="Trip by" size="sm" />}
        {b.selfBooking && <div className="rounded-medium bg-warning-50 p-3 text-sm text-warning-800">Booked through your own link, so no creator commission applies.</div>}

        <section className="rounded-large border border-default-200 p-4 text-sm" aria-labelledby="trip-h">
          <h2 id="trip-h" className="mb-2 text-base font-semibold">
            {trip.title}
          </h2>
          <div className="flex justify-between py-0.5">
            <span className="text-default-600">Stay</span>
            <span>
              {hotel.name}, {b.rooms} {b.rooms === 1 ? "room" : "rooms"}
            </span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-default-600">Travelers</span>
            <span>{b.travelers}</span>
          </div>
          {b.gapReleaseId && (
            <div className="flex justify-between py-0.5">
              <span className="text-default-600">Rate</span>
              <span>Gap Night deal</span>
            </div>
          )}
        </section>

        <section className="rounded-large bg-default-100 p-4 text-sm" aria-labelledby="price-h">
          <h2 id="price-h" className="mb-2 text-base font-semibold">
            Price breakdown
          </h2>
          {b.lines.map((l) => (
            <div key={l.label} className="flex justify-between py-0.5">
              <span>{l.label}</span>
              <span className="tabular-nums">{inr(l.amount)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-default-200 pt-2 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{inr(b.value)}</span>
          </div>
          <div className="text-right text-default-600">{inr(perPerson)} per person</div>
        </section>

        <div className="flex flex-col gap-2">
          {b.status !== "cancelled" && <SplitButton text={`${city.name} is booked! ${trip.title}, ${dayLabel(b.checkIn)} to ${dayLabel(b.checkOut)}. ${inr(perPerson)} each. Ref ${b.id}.`} />}
          <LinkButton href={`/t/${tripCreator.handle}/${trip.slug}`} variant="flat" size="lg" radius="lg">
            View trip
          </LinkButton>
          <LinkButton href="/traveler" variant="light" size="lg" radius="lg">
            My saved trips
          </LinkButton>
        </div>
        <p className="text-center text-xs text-default-500">Simulated booking. No payment taken.</p>
      </div>
    </Phone>
  );
}
