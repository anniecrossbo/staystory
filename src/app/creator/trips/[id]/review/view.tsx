"use client";

import { Button, Chip, Input, Radio, RadioGroup, addToast, cn } from "@heroui/react";
import NextLink from "next/link";
import { useMemo, useState, useTransition } from "react";
import { publishTrip, updateTrip } from "@/app/actions";
import { inr } from "@/lib/format";
import { priceTrip } from "@/lib/pricing";
import type { HotelSearchResult } from "@/contracts/hotel-search";
import type { Activity, Day, Hotel, Trip } from "@/lib/types";

const SOURCE_LABEL = { openai: "Read by OpenAI", claude: "Read by Claude", cache: "Cached agent result", rules: "Rule-based read" } as const;
const TIER_LABEL = { budget: "Budget", mid: "Mid-range", premium: "Premium" } as const;

function Stars({ count }: { count: number }) {
  const n = Math.min(Math.max(Math.round(count), 0), 5);
  return (
    <span className="text-xs text-warning-500" aria-label={`${n} stars`}>
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

function newStopId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function ReviewView({
  trip,
  cityName,
  hotels,
  activities,
  liveHotels = [],
  liveSource = "fallback",
  liveNote,
}: {
  trip: Trip;
  cityName: string;
  hotels: Hotel[];
  activities: Activity[];
  liveHotels?: HotelSearchResult[];
  liveSource?: "liteapi" | "fallback";
  liveNote?: string;
}) {
  const [title, setTitle] = useState(trip.title);
  const [days, setDays] = useState<Day[]>(trip.days);
  const [hotelId, setHotelId] = useState(trip.recommendedHotelId);
  const [drafts, setDrafts] = useState<string[]>(trip.days.map(() => ""));
  const [pending, start] = useTransition();
  const published = trip.status === "published";

  const hotel = hotels.find((h) => h.id === hotelId)!;
  const price = useMemo(() => {
    const ids = new Set(days.flatMap((d) => d.stops.map((s) => s.activityId).filter(Boolean)));
    return priceTrip({ roomRate: hotel.rate, nights: trip.nights, travelers: 2, activities: activities.filter((a) => ids.has(a.id)) });
  }, [days, hotel, activities, trip.nights]);

  function move(di: number, si: number, dir: -1 | 1) {
    setDays((prev) => {
      const next = prev.map((d) => ({ ...d, stops: [...d.stops] }));
      const [stop] = next[di].stops.splice(si, 1);
      const target = si + dir;
      if (target < 0 && di > 0) next[di - 1].stops.push(stop);
      else if (target > prev[di].stops.length - 1 && di < next.length - 1) next[di + 1].stops.unshift(stop);
      else next[di].stops.splice(Math.max(0, Math.min(target, next[di].stops.length)), 0, stop);
      return next;
    });
  }

  function remove(di: number, si: number) {
    setDays((prev) => prev.map((d, i) => (i === di ? { ...d, stops: d.stops.filter((_, j) => j !== si) } : d)));
  }

  function add(di: number) {
    const label = drafts[di].trim();
    if (!label) return;
    const act = activities.find((a) => a.kind === "activity" && a.keywords.some((k) => label.toLowerCase().includes(k)));
    setDays((prev) =>
      prev.map((d, i) =>
        i === di ? { ...d, stops: [...d.stops, act ? { id: newStopId(), label: act.name, kind: "activity" as const, activityId: act.id } : { id: newStopId(), label, kind: "free" as const }] } : d,
      ),
    );
    setDrafts((p) => p.map((x, i) => (i === di ? "" : x)));
  }

  const patch = () => ({ title, days, recommendedHotelId: hotelId });
  const totalStops = days.reduce((n, d) => n + d.stops.length, 0);

  return (
    <div className="flex flex-col gap-6 p-5 pt-6">
      <div className="flex items-center justify-between gap-3">
        <NextLink href="/creator/trips" className="text-sm text-primary">
          My trips
        </NextLink>
        <div className="flex gap-2">
          <Chip size="sm" variant="flat">
            {SOURCE_LABEL[trip.source]}
          </Chip>
          <Chip size="sm" variant="flat" color={published ? "success" : "warning"}>
            {published ? "Live" : "Draft"}
          </Chip>
        </div>
      </div>

      <div>
        <Input aria-label="Trip title" value={title} onValueChange={setTitle} variant="underlined" classNames={{ input: "text-2xl font-bold tracking-tight" }} />
        <p className="mt-2 text-sm text-default-600">
          {cityName}, {days.length} days and {trip.nights} {trip.nights === 1 ? "night" : "nights"}. From {inr(price.perPerson)} per person for two.
        </p>
      </div>

      <section aria-labelledby="stay-h" className="flex flex-col gap-3">
        <h2 id="stay-h" className="text-base font-semibold">
          Where to stay
        </h2>
        {trip.unmatchedStay && (
          <div className="rounded-medium border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
            &ldquo;{trip.unmatchedStay}&rdquo; isn&apos;t a CrossBo partner yet. We picked the closest partner stay. Change it below if you like.
          </div>
        )}
        <RadioGroup aria-label="Recommended stay" value={hotelId} onValueChange={setHotelId}>
          {hotels.map((h) => (
            <Radio
              key={h.id}
              value={h.id}
              classNames={{
                base: cn(
                  "m-0 inline-flex w-full max-w-full items-center justify-between rounded-large border-2 border-default-200 p-3",
                  "data-[selected=true]:border-primary data-[selected=true]:bg-primary-50",
                ),
                labelWrapper: "w-full",
              }}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-xs text-default-600">
                    {TIER_LABEL[h.tier]}, {h.area}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{inr(h.rate)}</div>
              </div>
            </Radio>
          ))}
        </RadioGroup>
        <p className="text-xs text-default-500">The one you pick is your recommendation. Followers also see the budget and premium options.</p>
      </section>

      {liveHotels.length > 0 && (
        <section aria-labelledby="live-h" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="live-h" className="text-base font-semibold">Live hotels in {cityName}</h2>
            <Chip size="sm" variant="flat" color="success">LiteAPI</Chip>
          </div>
          <p className="text-xs text-default-500">Real-time rates from LiteAPI. These aren&apos;t partner stays yet — showing what&apos;s available.</p>
          <div className="flex flex-col gap-2">
            {liveHotels.slice(0, 6).map((h) => (
              <div key={h.id} className="flex gap-3 rounded-large border border-default-200 p-3">
                {h.mainPhoto ? (
                  <img
                    src={h.mainPhoto}
                    alt={h.name}
                    className="h-16 w-16 shrink-0 rounded-medium object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-medium bg-default-100 text-xs text-default-400">No photo</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-sm">{h.name}</div>
                  <Stars count={h.starRating} />
                  <div className="mt-0.5 truncate text-xs text-default-500">{h.address}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    {h.ratePerNight > 0 ? (
                      <>
                        <span className="text-sm font-semibold tabular-nums">{inr(h.ratePerNight)}</span>
                        <span className="text-xs text-default-500">/ night · {h.boardType}</span>
                      </>
                    ) : (
                      <span className="text-xs text-default-400">Rate on request</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {liveHotels.length > 6 && (
            <p className="text-xs text-default-500">+{liveHotels.length - 6} more hotels available</p>
          )}
        </section>
      )}
      {liveSource === "fallback" && liveNote && (
        <div className="rounded-medium border border-warning-200 bg-warning-50 p-3 text-xs text-warning-700">
          Live hotel search unavailable: {liveNote}
        </div>
      )}

      <section aria-labelledby="days-h" className="flex flex-col gap-3">
        <h2 id="days-h" className="text-base font-semibold">
          Day by day
        </h2>
        {days.map((d, di) => (
          <div key={di} className="overflow-hidden rounded-large border border-default-200">
            <div className="bg-default-100 px-3 py-2">
              <Input
                aria-label={`Day ${di + 1} title`}
                size="sm"
                variant="flat"
                startContent={<span className="whitespace-nowrap text-xs font-semibold text-default-600">Day {di + 1}</span>}
                value={d.title}
                onValueChange={(v) => setDays((p) => p.map((x, i) => (i === di ? { ...x, title: v } : x)))}
                classNames={{ inputWrapper: "bg-transparent shadow-none" }}
              />
            </div>
            <ul>
              {d.stops.map((s, si) => {
                const act = activities.find((a) => a.id === s.activityId);
                const first = di === 0 && si === 0;
                const last = di === days.length - 1 && si === d.stops.length - 1;
                return (
                  <li key={s.id} className="flex items-center gap-2 border-t border-default-200 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{s.label}</div>
                      <div className="text-xs text-default-500">
                        {act ? (act.kind === "transfer" ? `${inr(act.price)} per car` : `${inr(act.price)} per person`) : "Free stop, not priced"}
                      </div>
                    </div>
                    <Button isIconOnly size="sm" variant="light" aria-label={`Move ${s.label} up`} isDisabled={first} onPress={() => move(di, si, -1)}>
                      ↑
                    </Button>
                    <Button isIconOnly size="sm" variant="light" aria-label={`Move ${s.label} down`} isDisabled={last} onPress={() => move(di, si, 1)}>
                      ↓
                    </Button>
                    <Button isIconOnly size="sm" variant="light" aria-label={`Remove ${s.label}`} onPress={() => remove(di, si)}>
                      ✕
                    </Button>
                  </li>
                );
              })}
              <li className="flex items-center gap-2 border-t border-default-200 px-3 py-2">
                <Input
                  aria-label={`Add a stop to day ${di + 1}`}
                  size="sm"
                  placeholder="Add a stop"
                  value={drafts[di]}
                  onValueChange={(v) => setDrafts((p) => p.map((x, i) => (i === di ? v : x)))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add(di);
                    }
                  }}
                />
                <Button size="sm" variant="flat" onPress={() => add(di)}>
                  Add
                </Button>
              </li>
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-large bg-default-100 p-4 text-sm" aria-label="Price for two">
        {price.lines.map((l) => (
          <div key={l.label} className="flex justify-between py-0.5">
            <span className="text-default-600">{l.label}</span>
            <span className="tabular-nums">{inr(l.amount)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-default-200 pt-2 font-semibold">
          <span>Total for two</span>
          <span className="tabular-nums">{inr(price.total)}</span>
        </div>
      </section>

      <div className="flex flex-col gap-2 pb-2">
        <Button
          color="primary"
          size="lg"
          radius="lg"
          className="font-semibold"
          isLoading={pending}
          isDisabled={totalStops === 0}
          onPress={() => start(() => publishTrip(trip.id, patch()))}
        >
          {published ? "Save and view my link" : "Publish and get my link"}
        </Button>
        {!published && (
          <Button
            size="lg"
            radius="lg"
            variant="flat"
            isDisabled={pending}
            onPress={() =>
              start(async () => {
                await updateTrip(trip.id, patch());
                addToast({ title: "Draft saved", color: "success" });
              })
            }
          >
            Save draft
          </Button>
        )}
      </div>
    </div>
  );
}
