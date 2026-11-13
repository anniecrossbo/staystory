"use client";

import { Button, Checkbox, CheckboxGroup, Input, Select, SelectItem } from "@heroui/react";
import { useMemo, useState, useTransition } from "react";
import { releaseGap } from "@/app/actions";
import { addDays, dayLabel, inr, parseDay } from "@/lib/format";

interface Night {
  night: string;
  booked: number;
  free: number;
}

function bestPair(nights: Night[]): string[] {
  let best = 0;
  for (let i = 1; i < nights.length - 1; i++) if (nights[i].free + nights[i + 1].free > nights[best].free + nights[best + 1].free) best = i;
  return [nights[best].night, nights[best + 1].night];
}

export function GapView({ hotel, nights }: { hotel: { rate: number; totalRooms: number; roomTypes: string[]; commissionPct: number }; nights: Night[] }) {
  const [selected, setSelected] = useState<string[]>(() => bestPair(nights));
  const [roomType, setRoomType] = useState(hotel.roomTypes[0]);
  const [rooms, setRooms] = useState("4");
  const [rate, setRate] = useState(String(Math.round((hotel.rate * 0.68) / 100) * 100));
  const firstNight = [...selected].sort()[0] ?? nights[0].night;
  const [endsAt, setEndsAt] = useState(addDays(firstNight, -3));
  const [audience, setAudience] = useState<string[]>(["saved", "groups"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sorted = [...selected].sort();
  const minFree = sorted.length ? Math.min(...nights.filter((n) => sorted.includes(n.night)).map((n) => n.free)) : 0;
  const roomsNum = Number(rooms) || 0;
  const rateNum = Number(rate) || 0;
  const total = roomsNum * sorted.length * rateNum;
  const commission = Math.round(total * hotel.commissionPct);

  const contiguous = useMemo(() => sorted.every((d, i) => i === 0 || addDays(sorted[i - 1], 1) === d), [sorted]);

  function toggle(night: string) {
    setSelected((p) => (p.includes(night) ? p.filter((x) => x !== night) : [...p, night]));
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-large border border-default-200 bg-content1 p-5" aria-labelledby="cal-h">
        <h2 id="cal-h" className="mb-1 text-base font-semibold">
          Rooms still free, week of {dayLabel(nights[0].night, false)}
        </h2>
        <p className="mb-3 text-sm text-default-600">Pick the nights to release. They need to be in a row.</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {nights.map((n) => {
            const on = selected.includes(n.night);
            const d = parseDay(n.night);
            return (
              <button
                key={n.night}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(n.night)}
                className={`rounded-large border-2 p-3 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  on ? "border-primary bg-primary-50" : "border-default-200 hover:bg-default-50"
                }`}
              >
                <div className={`text-xs ${on ? "text-primary-700" : "text-default-600"}`}>{dayLabel(n.night).split(" ").slice(0, 2).join(" ")}</div>
                <div className="text-xl font-bold tabular-nums">{n.free}</div>
                <div className={`text-[11px] ${on ? "text-primary-700" : "text-default-600"}`}>of {hotel.totalRooms} free</div>
                <span className="sr-only">{d.toDateString()}</span>
              </button>
            );
          })}
        </div>
        {sorted.length > 0 && (
          <p className="mt-3 text-sm text-default-600">
            Selected: {sorted.length} {sorted.length === 1 ? "night" : "nights"}, check in {dayLabel(sorted[0])}, check out {dayLabel(addDays(sorted[sorted.length - 1], 1))}.
            {!contiguous && <span className="text-warning-700"> Pick nights in a row.</span>}
          </p>
        )}
      </section>

      <form
        className="flex flex-col gap-5 xl:flex-row xl:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await releaseGap({ roomType, nights: sorted, rooms: roomsNum, rate: rateNum, endsAt, audience });
            if (res && "error" in res) setError(res.error);
          });
        }}
      >
        <section className="flex min-w-0 flex-1 flex-col gap-5 rounded-large border border-default-200 bg-content1 p-6" aria-label="Release details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Room type" labelPlacement="outside" selectedKeys={[roomType]} onSelectionChange={(k) => setRoomType(String(Array.from(k)[0] ?? roomType))} disallowEmptySelection>
              {hotel.roomTypes.map((r) => (
                <SelectItem key={r}>{r}</SelectItem>
              ))}
            </Select>
            <Input
              type="number"
              label="Rooms to release"
              labelPlacement="outside"
              value={rooms}
              onValueChange={setRooms}
              min={1}
              max={Math.max(1, minFree)}
              description={sorted.length ? `Up to ${minFree} free on every selected night` : undefined}
              isInvalid={roomsNum > minFree && sorted.length > 0}
              errorMessage={`Only ${minFree} rooms are free on every selected night.`}
            />
            <Input
              type="number"
              label="Gap Night rate per night"
              labelPlacement="outside"
              startContent={<span className="text-sm text-default-500">₹</span>}
              value={rate}
              onValueChange={setRate}
              description={`Public rate ${inr(hotel.rate)}. Never shown on public pages.`}
            />
            <Input type="date" label="Offer ends" labelPlacement="outside" value={endsAt} max={sorted[0]} onValueChange={setEndsAt} />
          </div>
          <CheckboxGroup label="Send the alert to" value={audience} onValueChange={setAudience} classNames={{ label: "text-sm font-medium text-foreground" }}>
            <Checkbox value="saved">Travelers who saved a trip in this city</Checkbox>
            <Checkbox value="groups">Groups with enough friends free on these dates</Checkbox>
            <Checkbox value="campaign">Followers of your campaign creators</Checkbox>
          </CheckboxGroup>
          {error && (
            <div role="alert" className="rounded-medium bg-danger-50 p-3 text-sm text-danger-700">
              {error}
            </div>
          )}
        </section>

        <aside className="flex w-full flex-col gap-3 xl:w-80" aria-labelledby="sum-h">
          <h2 id="sum-h" className="text-sm font-semibold text-default-600">
            If every room fills
          </h2>
          <div className="flex flex-col gap-1.5 rounded-large border border-default-200 bg-content1 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-default-600">
                {roomsNum} × {sorted.length} × {inr(rateNum)}
              </span>
              <span className="tabular-nums">{inr(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-600">Commission ({Math.round(hotel.commissionPct * 100)}%)</span>
              <span className="tabular-nums">{inr(commission)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>You receive</span>
              <span className="tabular-nums">{inr(total - commission)}</span>
            </div>
            <p className="pt-1 text-xs text-default-500">These rooms earn nothing if they stay empty.</p>
          </div>
          {sorted.length > 0 && (
            <div className="rounded-large bg-foreground p-4 text-background">
              <div className="text-[11px] font-bold text-warning">Alert preview</div>
              <div className="font-semibold">
                {dayLabel(sorted[0])} to {dayLabel(addDays(sorted[sorted.length - 1], 1))}
              </div>
              <div className="text-sm opacity-80">From {inr(Math.round((rateNum * sorted.length) / 2))} per person, two to a room</div>
            </div>
          )}
          <Button type="submit" color="primary" size="lg" radius="lg" className="font-semibold" isLoading={pending} isDisabled={!sorted.length || !contiguous || roomsNum < 1 || roomsNum > minFree}>
            Release {roomsNum || ""} {roomsNum === 1 ? "room" : "rooms"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
