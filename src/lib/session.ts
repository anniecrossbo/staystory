import "server-only";
import { cookies } from "next/headers";

export type Role = "creator" | "traveler" | "hotel";
export const ATTRIBUTION_WINDOW_DAYS = 30;

export function getRole(): Role {
  const r = cookies().get("cb_role")?.value;
  return r === "creator" || r === "hotel" ? r : "traveler";
}

export interface Attribution {
  creatorId: string;
  tripId: string;
  at: string;
}

/** Last creator link opened wins, within the attribution window. */
export function getAttribution(): Attribution | null {
  const raw = cookies().get("cb_attr")?.value;
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as Attribution;
    const ageDays = (Date.now() - new Date(a.at).getTime()) / 86400000;
    return ageDays <= ATTRIBUTION_WINDOW_DAYS ? a : null;
  } catch {
    return null;
  }
}
