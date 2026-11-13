import { Chip } from "@heroui/react";
import { notFound } from "next/navigation";
import { Phone } from "@/components/Phone";
import { CreatorTag } from "@/components/CreatorTag";
import { LinkButton } from "@/components/LinkButton";
import { SaveButton } from "@/components/SaveButton";
import { StaticMap } from "@/components/StaticMap";
import { VisitTracker } from "@/components/VisitTracker";
import { getStore } from "@/lib/store";
import { getCity, getCreator, getHotel, getTripByHandleSlug, liveCampaignFor } from "@/lib/queries";
import { getRole } from "@/lib/session";
import { tripActivityIds } from "@/lib/builder";
import { inr } from "@/lib/format";
import { priceTrip } from "@/lib/pricing";

export default function TripPage({ params }: { params: { handle: string; slug: string } }) {
  const trip = getTripByHandleSlug(params.handle, params.slug);
  const s = getStore();
  if (!trip) notFound();
  const isOwner = getRole() === "creator" && trip.creatorId === s.demoCreatorId;
  if (trip.status !== "published" && !isOwner) notFound();

  const creator = getCreator(trip.creatorId)!;
  const city = getCity(trip.cityId)!;
  const hotel = getHotel(trip.recommendedHotelId)!;
  const campaign = liveCampaignFor(hotel.id, creator.id);
  const rate = campaign?.creatorPrice ?? hotel.rate;
  const ids = tripActivityIds(trip);
  const activities = s.activities.filter((a) => ids.includes(a.id));
  const price = priceTrip({ roomRate: rate, nights: trip.nights, travelers: 2, activities });
  const alts = [trip.budgetHotelId, trip.premiumHotelId].map((id) => (id ? getHotel(id) : undefined)).filter(Boolean);
  const bookHref = `/t/${creator.handle}/${trip.slug}/book`;

  return (
    <Phone>
      <VisitTracker tripId={trip.id} />
      <div className="flex flex-col">
        <header className="bg-primary-50 px-5 pb-6 pt-10 sm:rounded-t-large">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-primary-700">
              {trip.days.length} days, {trip.nights} {trip.nights === 1 ? "night" : "nights"}
            </p>
            <SaveButton tripId={trip.id} saved={s.traveler.savedTripIds.includes(trip.id)} />
          </div>
          <p className="mt-2 text-[64px] font-extrabold leading-[0.9] tracking-tighter text-primary-700" aria-hidden="true">
            {city.name}
          </p>
          <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight">{trip.title}</h1>
          {trip.style.length > 0 && <p className="mt-1 text-sm text-default-600">{trip.style.join(", ")}</p>}
        </header>

        <div className="flex flex-col gap-6 p-5">
          {isOwner && trip.status !== "published" && <div className="rounded-medium bg-warning-50 p-3 text-sm text-warning-800">Preview. Followers can&apos;t see this trip until you publish it.</div>}
          <CreatorTag handle={creator.handle} initials={creator.initials} />

          <div className="flex items-end justify-between rounded-large border border-default-200 p-4">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {inr(price.perPerson)} <span className="text-sm font-medium text-default-600">per person</span>
              </div>
              <div className="text-sm text-default-600">{inr(price.total)} for two. Stay, activities and transfers.</div>
            </div>
          </div>

          <section aria-labelledby="stay-h" className="flex flex-col gap-2">
            <h2 id="stay-h" className="text-base font-semibold">
              Where {creator.name} would stay
            </h2>
            <div className="rounded-large border border-default-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{hotel.name}</div>
                  <div className="text-sm text-default-600">{hotel.area}</div>
                </div>
                {campaign && (
                  <Chip size="sm" color="primary" variant="flat">
                    Creator deal
                  </Chip>
                )}
              </div>
              <div className="mt-2 text-sm font-semibold tabular-nums">
                {inr(rate)} a night {campaign && <span className="font-normal text-default-500 line-through">{inr(hotel.rate)}</span>}
              </div>
              {campaign && campaign.perks.length > 0 && <div className="mt-1 text-xs text-default-600">{campaign.perks.join(", ")}</div>}
            </div>
            {alts.length > 0 && <p className="text-sm text-default-600">Also bookable: {alts.map((h) => `${h!.name} (${inr(h!.rate)})`).join(" or ")}.</p>}
          </section>

          {city.lat && city.lng && (
            <section aria-label="Map">
              <StaticMap center={{ lat: city.lat, lng: city.lng }} zoom={13} width={350} height={180} className="w-full" />
            </section>
          )}

          <section aria-labelledby="plan-h">
            <h2 id="plan-h" className="mb-3 text-base font-semibold">
              The plan
            </h2>
            <ol className="flex flex-col">
              {trip.days.map((d, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex flex-col items-center" aria-hidden="true">
                    <span className="mt-1 h-3 w-3 rounded-full bg-primary" />
                    {i < trip.days.length - 1 && <span className="w-0.5 flex-1 bg-default-200" />}
                  </div>
                  <div className="pb-5">
                    <div className="text-xs font-semibold text-primary-700">Day {i + 1}</div>
                    <div className="font-semibold">{d.title}</div>
                    <div className="text-sm leading-relaxed text-default-600">{d.stops.map((st) => st.label).join(". ")}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="inc-h" className="rounded-large bg-default-100 p-4 text-sm">
            <h2 id="inc-h" className="mb-2 text-base font-semibold">
              Included for two
            </h2>
            {price.lines.map((l) => (
              <div key={l.label} className="flex justify-between py-0.5">
                <span>{l.label}</span>
                <span className="tabular-nums">{inr(l.amount)}</span>
              </div>
            ))}
          </section>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-default-200 bg-content1/95 p-4 backdrop-blur sm:rounded-b-large">
          <LinkButton href={bookHref} variant="flat" size="lg" radius="lg" className="flex-1 font-semibold">
            Customize
          </LinkButton>
          <LinkButton href={bookHref} color="primary" size="lg" radius="lg" className="flex-1 font-semibold">
            Book trip
          </LinkButton>
        </div>
      </div>
    </Phone>
  );
}
