import type { Activity, PriceLine } from "./types";
import { inr } from "./format";

export const roomsFor = (travelers: number) => Math.max(1, Math.ceil(travelers / 2));
export const carsPerLeg = (travelers: number) => Math.max(1, Math.ceil(travelers / 4));

export interface PriceInput {
  roomRate: number;
  nights: number;
  travelers: number;
  activities: Activity[];
}

export interface PriceResult {
  rooms: number;
  lines: PriceLine[];
  total: number;
  perPerson: number;
}

export function priceTrip({ roomRate, nights, travelers, activities }: PriceInput): PriceResult {
  const rooms = roomsFor(travelers);
  const lines: PriceLine[] = [
    {
      label: `${rooms} ${rooms === 1 ? "room" : "rooms"} × ${nights} ${nights === 1 ? "night" : "nights"} × ${inr(roomRate)}`,
      amount: rooms * nights * roomRate,
    },
  ];
  for (const a of activities) {
    if (a.kind === "transfer") {
      const cars = carsPerLeg(travelers) * 2;
      lines.push({ label: `${a.name} × ${cars}`, amount: a.price * cars });
    } else if (a.price > 0) {
      lines.push({ label: `${a.name} × ${travelers}`, amount: a.price * travelers });
    }
  }
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { rooms, lines, total, perPerson: Math.round(total / travelers) };
}

export interface Split {
  hotelCommission: number;
  creatorShare: number;
  crossboShare: number;
  hotelReceives: number;
}

/** One place computes the split, so every dashboard reconciles. */
export function computeSplit(value: number, commissionPct: number, creatorShareOfValue: number, attributed: boolean): Split {
  const hotelCommission = Math.round(value * commissionPct);
  const creatorShare = attributed ? Math.min(hotelCommission, Math.round(value * creatorShareOfValue)) : 0;
  return {
    hotelCommission,
    creatorShare,
    crossboShare: hotelCommission - creatorShare,
    hotelReceives: value - hotelCommission,
  };
}
