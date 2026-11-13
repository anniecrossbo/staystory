"use client";

import { Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import NextLink from "next/link";
import { LinkButton } from "@/components/LinkButton";
import { Stat } from "@/components/Stat";
import { addDays, dayLabel, inr, pct } from "@/lib/format";

interface Props {
  hotel: { name: string; cityName: string; commissionPct: number; totalRooms: number };
  stats: { bookings: number; value: number; commission: number; guests: number; costPerGuest: number; cancellationRate: number };
  byCreator: { handle: string; views: number; bookings: number; conversion: number; value: number }[];
  newest: {
    id: string;
    isNew: boolean;
    handle: string | null;
    tripTitle: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    travelers: number;
    value: number;
    commission: number;
    gap: boolean;
  } | null;
  lowNights: { night: string; free: number }[];
  liveCampaigns: { id: string; name: string; invited: number }[];
  gaps: { id: string; nights: string[]; rooms: number; roomsLeft: number; rate: number }[];
}

export function HotelDashboardView({ hotel, stats, byCreator, newest, lowNights, liveCampaigns, gaps }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">
            {hotel.name}, {hotel.cityName}
          </h1>
          <p className="text-sm text-default-600">Bookings that creators sent you</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/hotel/campaigns/new" variant="bordered" radius="lg">
            New campaign
          </LinkButton>
          <LinkButton href="/hotel/gap-night" color="primary" radius="lg">
            Release Gap Night rooms
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Creator bookings" value={String(stats.bookings)} />
        <Stat label="Booking value" value={inr(stats.value)} />
        <Stat label={`Commission (${Math.round(hotel.commissionPct * 100)}%)`} value={inr(stats.commission)} />
        <Stat label="Cost per guest" value={inr(stats.costPerGuest)} note={`${stats.guests} guests`} />
        <Stat label="Cancellation rate" value={pct(stats.cancellationRate, 0)} />
      </div>

      {newest && (
        <section className={`flex flex-wrap items-center gap-4 rounded-large border-2 bg-content1 p-5 ${newest.isNew ? "border-primary" : "border-default-200"}`} aria-labelledby="newest-h">
          <div className="min-w-[260px] flex-1">
            <div className="flex items-center gap-2">
              <Chip size="sm" color={newest.isNew ? "primary" : "default"} variant={newest.isNew ? "solid" : "flat"}>
                {newest.isNew ? "New reservation" : "Latest reservation"}
              </Chip>
              <span className="text-sm text-default-600">{newest.id}</span>
              {newest.gap && (
                <Chip size="sm" color="warning" variant="flat">
                  Gap Night
                </Chip>
              )}
            </div>
            <h2 id="newest-h" className="mt-2 text-lg font-semibold">
              {newest.rooms} {newest.rooms === 1 ? "room" : "rooms"}, {newest.travelers} guests, {dayLabel(newest.checkIn)} to {dayLabel(newest.checkOut)}
            </h2>
            <p className="text-sm text-primary-700">
              {newest.handle ? `Sent by @${newest.handle}` : "Direct booking"}, trip &ldquo;{newest.tripTitle}&rdquo;.{" "}
              <NextLink href={`/hotel/reservations?id=${newest.id}`} className="font-semibold underline">
                Open in reservations
              </NextLink>
            </p>
          </div>
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-default-600">Booking value</dt>
              <dd className="text-lg font-bold tabular-nums">{inr(newest.value)}</dd>
            </div>
            <div>
              <dt className="text-default-600">Commission</dt>
              <dd className="text-lg font-bold tabular-nums">{inr(newest.commission)}</dd>
            </div>
            <div>
              <dt className="text-default-600">You receive</dt>
              <dd className="text-lg font-bold tabular-nums">{inr(newest.value - newest.commission)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section aria-labelledby="creators-h" className="flex flex-col gap-3">
        <h2 id="creators-h" className="text-base font-semibold">
          Conversion by creator
        </h2>
        <Table aria-label="Conversion by creator" classNames={{ wrapper: "shadow-none border border-default-200" }}>
          <TableHeader>
            <TableColumn>Creator</TableColumn>
            <TableColumn align="end">Trip views with your stay</TableColumn>
            <TableColumn align="end">Bookings</TableColumn>
            <TableColumn align="end">Conversion</TableColumn>
            <TableColumn align="end">Booking value</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No creator bookings yet. Start a campaign to reach creators.">
            {byCreator.map((r) => (
              <TableRow key={r.handle}>
                <TableCell className="font-semibold">@{r.handle}</TableCell>
                <TableCell className="text-right tabular-nums">{r.views.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right tabular-nums">{r.bookings}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(r.conversion, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">{inr(r.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="low-h" className="rounded-large border border-default-200 bg-content1 p-5">
          <h2 id="low-h" className="mb-1 text-base font-semibold">
            Nights with empty rooms
          </h2>
          <p className="mb-3 text-sm text-default-600">These nights are at least 60% empty. Gap Night can fill them.</p>
          <ul className="divide-y divide-default-200">
            {lowNights.map((n) => (
              <li key={n.night} className="flex justify-between py-2 text-sm">
                <span>
                  {dayLabel(n.night)} to {dayLabel(addDays(n.night, 1), false)}
                </span>
                <span className="font-semibold text-warning-700 tabular-nums">
                  {n.free} of {hotel.totalRooms} free
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="active-h" className="flex flex-col gap-3 rounded-large bg-default-100 p-5">
          <h2 id="active-h" className="text-base font-semibold">
            Running now
          </h2>
          {liveCampaigns.length === 0 && gaps.length === 0 && <p className="text-sm text-default-600">No campaigns or Gap Night releases yet.</p>}
          {liveCampaigns.map((c) => (
            <NextLink key={c.id} href={`/hotel/campaigns/${c.id}`} className="flex justify-between rounded-medium bg-content1 p-3 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="text-default-600">{c.invited} creators</span>
            </NextLink>
          ))}
          {gaps.map((g) => (
            <div key={g.id} className="flex justify-between rounded-medium bg-content1 p-3 text-sm">
              <span className="font-medium">
                Gap Night, {dayLabel(g.nights[0], false)} to {dayLabel(addDays(g.nights[g.nights.length - 1], 1), false)} at {inr(g.rate)}
              </span>
              <span className="text-default-600">
                {g.rooms - g.roomsLeft} of {g.rooms} filled
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
