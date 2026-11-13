"use client";

import { Button, Checkbox, CheckboxGroup, Input, Radio, RadioGroup, cn } from "@heroui/react";
import NextLink from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createBooking } from "@/app/actions";
import { addDays, dayLabel, inr, nightsBetween } from "@/lib/format";
import { priceTrip, roomsFor } from "@/lib/pricing";
import type { Activity, Hotel } from "@/lib/types";

const TIER = { budget: "Budget", mid: "Mid-range", premium: "Premium" } as const;

interface Props {
  trip: { id: string; title: string; recommendedHotelId: string; backHref: string };
  hotels: Hotel[];
  activities: Activity[];
  defaultActivityIds: string[];
  defaults: { checkIn: string; checkOut: string; travelers: number };
  gap?: { id: string; hotelId: string; rate: number; roomsLeft: number; nights: string[] };
  campaigns: { hotelId: string; creatorPrice: number; validFrom: string; validTo: string }[];
  attribution: { handle: string; self: boolean } | null;
  today: string;
}

export function BookView({ trip, hotels, activities, defaultActivityIds, defaults, gap, campaigns, attribution, today }: Props) {
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [travelers, setTravelers] = useState(Math.max(1, defaults.travelers));
  const [hotelId, setHotelId] = useState(trip.recommendedHotelId);
  const [activityIds, setActivityIds] = useState<string[]>(defaultActivityIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hotel = hotels.find((h) => h.id === hotelId)!;
  const usingGap = !!gap && gap.hotelId === hotelId;
  const campaign = campaigns.find((c) => c.hotelId === hotelId && checkIn >= c.validFrom && checkIn <= c.validTo);
  const rate = usingGap ? gap!.rate : campaign ? campaign.creatorPrice : hotel.rate;
  const nights = nightsBetween(checkIn, checkOut);
  const maxTravelers = usingGap ? gap!.roomsLeft * 2 : 12;

  const price = useMemo(
    () => priceTrip({ roomRate: rate, nights: Math.max(1, nights), travelers, activities: activities.filter((a) => activityIds.includes(a.id)) }),
    [rate, nights, travelers, activities, activityIds],
  );

  const priced = activities.filter((a) => a.price > 0);

  function book() {
    setError(null);
    start(async () => {
      const res = await createBooking({ tripId: trip.id, hotelId, checkIn, checkOut, travelers, activityIds, gapId: usingGap ? gap!.id : undefined });
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <div className="flex min-h-[inherit] flex-col">
      <div className="flex flex-1 flex-col gap-6 p-5 pt-6">
        <NextLink href={trip.backHref} className="text-sm text-primary">
          Back to the trip
        </NextLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Make it yours</h1>
          <p className="text-sm text-default-600">{trip.title}</p>
        </div>

        {attribution && (
          <div className="self-start rounded-full bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-800">
            {attribution.self ? "This is your own link, so it won't earn commission" : `Still booking via @${attribution.handle}`}
          </div>
        )}
        {usingGap && (
          <div className="rounded-large bg-foreground p-4 text-background">
            <div className="text-xs font-bold text-warning">Gap Night deal</div>
            <div className="mt-1 font-semibold">
              {dayLabel(gap!.nights[0])} to {dayLabel(addDays(gap!.nights[gap!.nights.length - 1], 1))}
            </div>
            <div className="text-sm opacity-80">
              {inr(gap!.rate)} a room per night instead of {inr(hotel.rate)}. {gap!.roomsLeft} {gap!.roomsLeft === 1 ? "room" : "rooms"} left.
            </div>
          </div>
        )}

        <section aria-labelledby="when-h" className="flex flex-col gap-3">
          <h2 id="when-h" className="text-base font-semibold">
            When and who
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Check in"
              labelPlacement="outside"
              value={checkIn}
              min={today}
              isDisabled={usingGap}
              onValueChange={(v) => {
                setCheckIn(v);
                if (v && (!checkOut || checkOut <= v)) setCheckOut(addDays(v, Math.max(1, nights)));
              }}
            />
            <Input type="date" label="Check out" labelPlacement="outside" value={checkOut} min={checkIn ? addDays(checkIn, 1) : today} isDisabled={usingGap} onValueChange={setCheckOut} />
          </div>
          <div className="flex items-center justify-between rounded-large bg-default-100 py-2 pl-4 pr-2">
            <div>
              <div className="font-medium">Travelers</div>
              <div className="text-xs text-default-600">
                {roomsFor(travelers)} {roomsFor(travelers) === 1 ? "room" : "rooms"}, two per room
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button isIconOnly variant="bordered" aria-label="Fewer travelers" isDisabled={travelers <= 1} onPress={() => setTravelers((t) => t - 1)}>
                −
              </Button>
              <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
                {travelers}
              </span>
              <Button isIconOnly variant="bordered" aria-label="More travelers" isDisabled={travelers >= maxTravelers} onPress={() => setTravelers((t) => t + 1)}>
                +
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="stay-h" className="flex flex-col gap-3">
          <h2 id="stay-h" className="text-base font-semibold">
            Stay
          </h2>
          <RadioGroup aria-label="Stay" value={hotelId} onValueChange={setHotelId}>
            {hotels.map((h) => {
              const isGap = gap && gap.hotelId === h.id;
              const c = campaigns.find((x) => x.hotelId === h.id && checkIn >= x.validFrom && checkIn <= x.validTo);
              const shown = isGap ? gap!.rate : c ? c.creatorPrice : h.rate;
              return (
                <Radio
                  key={h.id}
                  value={h.id}
                  classNames={{
                    base: cn("m-0 inline-flex w-full max-w-full rounded-large border-2 border-default-200 p-3", "data-[selected=true]:border-primary data-[selected=true]:bg-primary-50"),
                    labelWrapper: "w-full",
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{h.name}</div>
                      <div className="text-xs text-default-600">
                        {h.id === trip.recommendedHotelId && !isGap ? "The creator's pick" : isGap ? "Gap Night deal" : TIER[h.tier]}
                        {c && !isGap ? ", creator deal" : ""}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{inr(shown)}</div>
                  </div>
                </Radio>
              );
            })}
          </RadioGroup>
          <p className="text-xs text-default-500">Per room, per night.</p>
        </section>

        <section aria-labelledby="act-h" className="flex flex-col gap-3">
          <h2 id="act-h" className="text-base font-semibold">
            Activities and transfers
          </h2>
          <CheckboxGroup aria-label="Activities and transfers" value={activityIds} onValueChange={setActivityIds}>
            {priced.map((a) => (
              <Checkbox
                key={a.id}
                value={a.id}
                classNames={{ base: "m-0 inline-flex w-full max-w-full rounded-large border border-default-200 p-3", label: "w-full" }}
              >
                <div className="flex w-full justify-between gap-2">
                  <span className="text-sm">{a.name}</span>
                  <span className="text-sm text-default-600 tabular-nums">
                    {inr(a.price)} {a.kind === "transfer" ? "per car" : "pp"}
                  </span>
                </div>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </section>

        <section aria-label="Price breakdown" className="rounded-large bg-default-100 p-4 text-sm">
          {price.lines.map((l) => (
            <div key={l.label} className="flex justify-between py-0.5">
              <span>{l.label}</span>
              <span className="tabular-nums">{inr(l.amount)}</span>
            </div>
          ))}
        </section>

        {error && (
          <div role="alert" className="rounded-medium bg-danger-50 p-3 text-sm text-danger-700">
            {error}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-default-200 bg-content1/95 p-4 backdrop-blur sm:rounded-b-large">
        <div className="flex-1">
          <div className="text-xl font-bold tabular-nums">{inr(price.total)}</div>
          <div className="text-sm text-default-600">
            {inr(price.perPerson)} per person, {travelers} {travelers === 1 ? "person" : "people"}
          </div>
        </div>
        <Button color="primary" size="lg" radius="lg" className="font-semibold" isLoading={pending} isDisabled={nights < 1} onPress={book}>
          Book trip
        </Button>
      </div>
    </div>
  );
}
