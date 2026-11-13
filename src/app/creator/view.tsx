"use client";

import { Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Stat } from "@/components/Stat";
import { LinkButton } from "@/components/LinkButton";
import { inr, pct, rangeLabel } from "@/lib/format";

interface Row {
  id: string;
  city: string;
  checkIn: string;
  checkOut: string;
  travelers: number;
  value: number;
  share: number;
  status: "pending" | "completed" | "cancelled";
  isNew: boolean;
}

const STATUS = {
  pending: { label: "Pending", color: "warning" as const },
  completed: { label: "Confirmed", color: "success" as const },
  cancelled: { label: "Cancelled", color: "danger" as const },
};

export function CreatorDashboardView({
  name,
  handle,
  stats,
  rows,
  trips,
  bands,
}: {
  name: string;
  handle: string;
  stats: { visits: number; saves: number; bookings: number; conversion: number; avgValue: number; pending: number; confirmed: number };
  rows: Row[];
  trips: { id: string; title: string; visits: number; bookings: number }[];
  bands: { label: string; count: number }[];
}) {
  const bandTotal = bands.reduce((s, b) => s + b.count, 0) || 1;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Hi {name}</h1>
          <p className="text-sm text-default-600">What your trip links earned. @{handle}</p>
        </div>
        <LinkButton href="/creator/new" color="primary" radius="lg">
          New trip from a reel
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Link visits" value={stats.visits.toLocaleString("en-IN")} />
        <Stat label="Saved itineraries" value={stats.saves.toLocaleString("en-IN")} />
        <Stat label="Bookings" value={String(stats.bookings)} note={`${pct(stats.conversion, 2)} of visits`} />
        <Stat label="Avg booking value" value={inr(stats.avgValue)} />
        <Stat label="Pending commission" value={inr(stats.pending)} note="Paid after checkout" tone="warning" />
        <Stat label="Confirmed earnings" value={inr(stats.confirmed)} tone="success" />
      </div>

      <section aria-labelledby="recent-h" className="flex flex-col gap-3">
        <h2 id="recent-h" className="text-base font-semibold">
          Recent bookings from your links
        </h2>
        <Table aria-label="Recent bookings" removeWrapper={false} classNames={{ wrapper: "shadow-none border border-default-200" }}>
          <TableHeader>
            <TableColumn>Booking</TableColumn>
            <TableColumn>Trip</TableColumn>
            <TableColumn>Dates</TableColumn>
            <TableColumn align="end">Travelers</TableColumn>
            <TableColumn align="end">Value</TableColumn>
            <TableColumn align="end">Your share</TableColumn>
            <TableColumn>Status</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No bookings yet. Share a trip link to start earning.">
            {rows.map((r) => (
              <TableRow key={r.id} className={r.isNew ? "bg-primary-50" : undefined}>
                <TableCell>
                  <span className="font-medium">{r.id}</span>
                  {r.isNew && (
                    <Chip size="sm" color="primary" className="ml-2">
                      New
                    </Chip>
                  )}
                </TableCell>
                <TableCell>{r.city}</TableCell>
                <TableCell>{rangeLabel(r.checkIn, r.checkOut)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.travelers}</TableCell>
                <TableCell className="text-right tabular-nums">{inr(r.value)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{inr(r.share)}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={STATUS[r.status].color}>
                    {STATUS[r.status].label}
                  </Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="trips-h" className="rounded-large border border-default-200 bg-content1 p-5">
          <h2 id="trips-h" className="mb-3 text-base font-semibold">
            Best-performing trips
          </h2>
          <ul className="divide-y divide-default-200">
            {trips.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>{t.title}</span>
                <span className="shrink-0 text-default-600 tabular-nums">
                  {t.visits.toLocaleString("en-IN")} visits, {t.bookings} {t.bookings === 1 ? "booking" : "bookings"}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="bands-h" className="rounded-large border border-default-200 bg-content1 p-5">
          <h2 id="bands-h" className="mb-3 text-base font-semibold">
            What your bookers spend per person
          </h2>
          <ul className="flex flex-col gap-3">
            {bands.map((b) => (
              <li key={b.label}>
                <div className="flex justify-between text-sm">
                  <span>{b.label}</span>
                  <span className="tabular-nums">{Math.round((b.count / bandTotal) * 100)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-default-100" aria-hidden="true">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(b.count / bandTotal) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
