"use client";

import { Button, Chip, Tab, Tabs, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, addToast } from "@heroui/react";
import { useMemo, useState, useTransition } from "react";
import { acknowledgeBooking, cancelBooking, completeStay } from "@/app/actions";
import { dayLabel, inr, rangeLabel } from "@/lib/format";
import type { PriceLine } from "@/lib/types";

interface Row {
  id: string;
  handle: string | null;
  tripTitle: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  travelers: number;
  value: number;
  commission: number;
  lines: PriceLine[];
  status: "pending" | "completed" | "cancelled";
  acknowledged: boolean;
  gap: boolean;
  campaign: boolean;
  selfBooking: boolean;
}

type Filter = "all" | "new" | "upcoming" | "completed" | "cancelled";

function label(r: Row): { text: string; color: "primary" | "default" | "success" | "danger" } {
  if (r.status === "cancelled") return { text: "Cancelled", color: "danger" };
  if (r.status === "completed") return { text: "Completed", color: "success" };
  if (!r.acknowledged) return { text: "New", color: "primary" };
  return { text: "Upcoming", color: "default" };
}

const match = (r: Row, f: Filter) =>
  f === "all" ||
  (f === "new" && r.status === "pending" && !r.acknowledged) ||
  (f === "upcoming" && r.status === "pending" && r.acknowledged) ||
  (f === "completed" && r.status === "completed") ||
  (f === "cancelled" && r.status === "cancelled");

export function ReservationsView({ rows, initialId, commissionPct }: { rows: Row[]; initialId?: string; commissionPct: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | undefined>(initialId);
  const [pending, start] = useTransition();
  const shown = useMemo(() => rows.filter((r) => match(r, filter)), [rows, filter]);
  const current = rows.find((r) => r.id === selected);
  const count = (f: Filter) => rows.filter((r) => match(r, f)).length;

  function act(fn: (id: string) => Promise<void>, msg: string) {
    if (!current) return;
    start(async () => {
      await fn(current.id);
      addToast({ title: msg, color: "success" });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Reservations</h1>
        <p className="text-sm text-default-600">Every booking shows the creator who sent it.</p>
      </div>
      <Tabs aria-label="Filter reservations" radius="full" selectedKey={filter} onSelectionChange={(k) => setFilter(k as Filter)}>
        <Tab key="all" title={`All ${count("all")}`} />
        <Tab key="new" title={`New ${count("new")}`} />
        <Tab key="upcoming" title={`Upcoming ${count("upcoming")}`} />
        <Tab key="completed" title={`Completed ${count("completed")}`} />
        <Tab key="cancelled" title={`Cancelled ${count("cancelled")}`} />
      </Tabs>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <Table
            aria-label="Reservations"
            selectionMode="single"
            selectionBehavior="replace"
            selectedKeys={selected ? [selected] : []}
            onSelectionChange={(keys) => {
              const k = Array.from(keys as Set<string>)[0];
              if (k) setSelected(k);
            }}
            color="primary"
            classNames={{ wrapper: "shadow-none border border-default-200" }}
          >
            <TableHeader>
              <TableColumn>Booking</TableColumn>
              <TableColumn>Sent by</TableColumn>
              <TableColumn>Dates</TableColumn>
              <TableColumn>Rooms, guests</TableColumn>
              <TableColumn align="end">Value</TableColumn>
              <TableColumn>Status</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Nothing here.">
              {shown.map((r) => {
                const l = label(r);
                return (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell className="text-primary-700">{r.handle ? `@${r.handle}` : "Direct"}</TableCell>
                    <TableCell>{rangeLabel(r.checkIn, r.checkOut)}</TableCell>
                    <TableCell>
                      {r.rooms}, {r.travelers}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{inr(r.value)}</TableCell>
                    <TableCell>
                      <Chip size="sm" color={l.color} variant={l.text === "New" ? "solid" : "flat"}>
                        {l.text}
                      </Chip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {current && (
          <aside className="flex w-full flex-col gap-4 rounded-large border-2 border-primary bg-content1 p-5 xl:w-80" aria-labelledby="detail-h">
            <div className="text-sm text-default-600">{current.id}</div>
            <h2 id="detail-h" className="-mt-2 text-lg font-semibold">
              {dayLabel(current.checkIn)} to {dayLabel(current.checkOut)}
            </h2>
            <div className="rounded-medium bg-primary-50 p-3 text-sm text-primary-800">
              {current.handle ? (
                <>
                  Sent by <strong>@{current.handle}</strong>
                  <br />
                  Trip: {current.tripTitle}
                </>
              ) : (
                "Direct booking, no creator link"
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {current.gap && (
                <Chip size="sm" color="warning" variant="flat">
                  Gap Night rate
                </Chip>
              )}
              {current.campaign && (
                <Chip size="sm" color="primary" variant="flat">
                  Campaign price
                </Chip>
              )}
              {current.selfBooking && (
                <Chip size="sm" variant="flat">
                  Creator&apos;s own booking
                </Chip>
              )}
            </div>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-default-600">Guest</dt>
                <dd>{current.guestName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-default-600">Rooms</dt>
                <dd>{current.rooms}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-default-600">Guests</dt>
                <dd>{current.travelers}</dd>
              </div>
            </dl>
            <div className="border-t border-default-200 pt-3 text-sm">
              {current.lines.map((l) => (
                <div key={l.label} className="flex justify-between py-0.5 text-default-600">
                  <span>{l.label}</span>
                  <span className="tabular-nums">{inr(l.amount)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between">
                <span>Booking value</span>
                <span className="tabular-nums">{inr(current.value)}</span>
              </div>
              <div className="flex justify-between">
                <span>Commission ({Math.round(commissionPct * 100)}%)</span>
                <span className="tabular-nums">{inr(current.commission)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>You receive</span>
                <span className="tabular-nums">{inr(current.value - current.commission)}</span>
              </div>
            </div>
            {current.status === "pending" && (
              <div className="flex flex-col gap-2">
                {!current.acknowledged && (
                  <Button color="primary" radius="lg" isLoading={pending} onPress={() => act(acknowledgeBooking, "Reservation confirmed")}>
                    Confirm reservation
                  </Button>
                )}
                <Button variant="flat" radius="lg" isDisabled={pending} onPress={() => act(completeStay, "Stay marked completed. Commission is now earned.")}>
                  Mark stay completed
                </Button>
                <Button variant="light" color="danger" radius="lg" isDisabled={pending} onPress={() => act(cancelBooking, "Booking cancelled. Pending commission is voided.")}>
                  Cancel booking
                </Button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
