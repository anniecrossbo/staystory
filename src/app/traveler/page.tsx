import { Chip } from "@heroui/react";
import { InitialsAvatar, InitialsGroup } from "@/components/InitialsAvatar";
import NextLink from "next/link";
import { Phone } from "@/components/Phone";
import { LinkButton } from "@/components/LinkButton";
import { getStore } from "@/lib/store";
import { gapAlerts, getCity, getCreator, getHotel, getTrip, newestFirst } from "@/lib/queries";
import { tripActivityIds } from "@/lib/builder";
import { dayLabel, inr } from "@/lib/format";
import { priceTrip } from "@/lib/pricing";

export default function TravelerPage() {
  const s = getStore();
  const alerts = gapAlerts();
  const saved = s.traveler.savedTripIds.map(getTrip).filter((t) => !!t);
  const mine = s.bookings.filter((b) => b.guestName.startsWith(s.traveler.name)).sort(newestFirst);

  return (
    <Phone>
      <div className="flex flex-col gap-5 p-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Saved trips</h1>
          <InitialsAvatar initials={s.traveler.initials} size="sm" aria-label={`${s.traveler.name}'s profile`} />
        </div>

        {alerts.map((a) => {
          const total = s.traveler.friends.length;
          return (
            <section key={a.release.id} className="flex flex-col gap-4 rounded-large bg-foreground p-5 text-background" aria-labelledby={`gap-${a.release.id}`}>
              <div className="flex items-center gap-2">
                <Chip size="sm" color="warning" className="font-bold">
                  Gap Night
                </Chip>
                <span className="text-xs opacity-80">Offer ends {dayLabel(a.release.endsAt)}</span>
              </div>
              <h2 id={`gap-${a.release.id}`} className="text-[22px] font-bold leading-tight">
                {dayLabel(a.checkIn)} to {dayLabel(a.checkOut)} in {getCity(a.hotel.cityId)?.name}
              </h2>
              <div className="flex items-center gap-3">
                <InitialsGroup people={a.freeFriends.map((f) => ({ id: f.id, initials: f.initials }))} />
                <span className="text-sm opacity-90">
                  {a.freeFriends.length} of your {total} friends are free
                </span>
              </div>
              <div>
                <div className="text-sm opacity-80">
                  {a.hotel.name}, from @{a.creator.handle}&apos;s trip you saved
                </div>
                <div className="text-[26px] font-bold tabular-nums">
                  {inr(a.perPerson)} <span className="text-sm font-medium opacity-80">per person, {a.release.nights.length} {a.release.nights.length === 1 ? "night" : "nights"}</span>
                </div>
                <div className="text-sm opacity-70">
                  <s>{inr(a.hotel.rate)}</s> {inr(a.release.rate)} a room per night
                </div>
              </div>
              <LinkButton href={`/t/${a.creator.handle}/${a.trip.slug}/book?gap=${a.release.id}`} radius="lg" size="lg" className="bg-background font-semibold text-foreground">
                See the deal
              </LinkButton>
            </section>
          );
        })}

        {saved.length === 0 ? (
          <p className="rounded-large border border-dashed border-default-300 p-5 text-sm text-default-600">
            Trips you save from creator links show up here. When a hotel on one of them has empty nights, the deal appears at the top.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {saved.map((t) => {
              const c = getCreator(t!.creatorId)!;
              const h = getHotel(t!.recommendedHotelId)!;
              const ids = tripActivityIds(t!);
              const p = priceTrip({ roomRate: h.rate, nights: t!.nights, travelers: 2, activities: s.activities.filter((a) => ids.includes(a.id)) });
              return (
                <li key={t!.id}>
                  <NextLink href={`/t/${c.handle}/${t!.slug}`} className="flex items-center justify-between gap-3 rounded-large border border-default-200 p-4 hover:bg-default-50">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{t!.title}</div>
                      <div className="text-sm text-default-600">by @{c.handle}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold tabular-nums">From {inr(p.perPerson)} pp</div>
                  </NextLink>
                </li>
              );
            })}
          </ul>
        )}
        {alerts.length === 0 && saved.length > 0 && (
          <p className="text-sm text-default-500">No deals right now. When a hotel on a trip you saved has empty nights, the deal shows here first.</p>
        )}

        {mine.length > 0 && (
          <section aria-labelledby="mine-h" className="flex flex-col gap-2">
            <h2 id="mine-h" className="text-base font-semibold">
              Your bookings
            </h2>
            {mine.map((b) => (
              <NextLink key={b.id} href={`/bookings/${b.id}`} className="flex justify-between rounded-large border border-default-200 p-3 text-sm hover:bg-default-50">
                <span>
                  {getTrip(b.tripId)?.title}, {dayLabel(b.checkIn, false)}
                </span>
                <span className="font-semibold tabular-nums">{inr(b.value)}</span>
              </NextLink>
            ))}
          </section>
        )}
      </div>
    </Phone>
  );
}
