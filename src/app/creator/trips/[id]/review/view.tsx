"use client";

import { Button, Chip, TextField, Radio, Widget, Tag, Banner, Icon, IconButton, Skeleton } from "@/luna";
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
    <span style={{ fontSize: 12, color: "var(--gold, #D4A017)" }} aria-label={`${n} stars`}>
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
  const [saved, setSaved] = useState(false);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <NextLink href="/creator/trips" style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none" }}>
          My trips
        </NextLink>
        <div style={{ display: "flex", gap: 8 }}>
          <Tag hue="charcoal">{SOURCE_LABEL[trip.source]}</Tag>
          <Tag hue={published ? "moss" : "ochre"}>{published ? "Live" : "Draft"}</Tag>
        </div>
      </div>

      {/* Title */}
      <div>
        <TextField
          aria-label="Trip title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ fontSize: 24, fontWeight: 700 }}
        />
        <p style={{ marginTop: 8, fontSize: 13, lineHeight: "18px", color: "var(--ink-2)" }}>
          {cityName}, {days.length} days and {trip.nights} {trip.nights === 1 ? "night" : "nights"}. From {inr(price.perPerson)} per person for two.
        </p>
      </div>

      {/* Where to stay */}
      <Widget title="Where to stay">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {trip.unmatchedStay && (
            <Banner tone="warning" icon="info" title="Stay not matched">
              &ldquo;{trip.unmatchedStay}&rdquo; isn&apos;t a CrossBo partner yet. We picked the closest partner stay. Change it below if you like.
            </Banner>
          )}
          {hotels.map((h) => {
            const picked = hotelId === h.id;
            return (
              <div
                key={h.id}
                style={{
                  display: "flex", gap: 12, alignItems: "center", padding: 12,
                  borderRadius: "var(--radius-lg)", background: picked ? "var(--surface-tint)" : "var(--surface)",
                  border: `1px solid ${picked ? "var(--primary-edge)" : "var(--glass-edge)"}`,
                  boxShadow: "var(--shadow-card)", cursor: "pointer",
                }}
                onClick={() => setHotelId(h.id)}
                role="button"
                tabIndex={0}
                aria-pressed={picked}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHotelId(h.id); } }}
              >
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{h.name}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{TIER_LABEL[h.tier]}, {h.area}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{inr(h.rate)}</span>
                <Radio checked={picked} onChange={() => setHotelId(h.id)} label={h.name} />
              </div>
            );
          })}
          <span style={{ fontSize: 11, lineHeight: "15px", color: "var(--muted)" }}>
            The one you pick is your recommendation. Followers also see the budget and premium options.
          </span>
        </div>
      </Widget>

      {/* Live hotels */}
      {liveHotels.length > 0 && (
        <Widget title={`Live hotels in ${cityName}`} action={<Tag hue="sky">LiteAPI</Tag>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, lineHeight: "15px", color: "var(--muted)" }}>
              Real-time rates from LiteAPI. These aren&apos;t partner stays yet — showing what&apos;s available.
            </span>
            {liveHotels.slice(0, 6).map((h) => (
              <div key={h.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--glass-edge)" }}>
                {h.mainPhoto ? (
                  <img src={h.mainPhoto} alt={h.name} style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", objectFit: "cover", flexShrink: 0 }} loading="lazy" />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "var(--muted)" }}>
                    No photo
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                  <Stars count={h.starRating} />
                  <span style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.address}</span>
                  <span style={{ fontSize: 13 }}>
                    {h.ratePerNight > 0 ? (
                      <>
                        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{inr(h.ratePerNight)}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}> / night · {h.boardType}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Rate on request</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
            {liveHotels.length > 6 && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>+{liveHotels.length - 6} more hotels available</span>
            )}
          </div>
        </Widget>
      )}
      {liveSource === "fallback" && liveNote && (
        <Banner tone="warning" icon="cloud_off" title="Live hotel search unavailable">
          {liveNote}
        </Banner>
      )}

      {/* Day by day */}
      {days.map((d, di) => (
        <Widget key={di} title={`Day ${di + 1}`} subtitle={d.title} count={d.stops.length}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {d.stops.map((s, si) => {
              const act = activities.find((a) => a.id === s.activityId);
              const first = di === 0 && si === 0;
              const last = di === days.length - 1 && si === d.stops.length - 1;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 48, padding: "4px 0", borderTop: si > 0 ? "1px solid var(--glass-edge)" : undefined }}>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{s.label}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {act ? (act.kind === "transfer" ? `${inr(act.price)} per car` : `${inr(act.price)} per person`) : "Free stop, not priced"}
                    </span>
                  </span>
                  <IconButton icon="arrow_upward" label={`Move ${s.label} up`} variant="ghost" size="sm" disabled={first} onClick={() => move(di, si, -1)} />
                  <IconButton icon="arrow_downward" label={`Move ${s.label} down`} variant="ghost" size="sm" disabled={last} onClick={() => move(di, si, 1)} />
                  <IconButton icon="close" label={`Remove ${s.label}`} variant="ghost" size="sm" onClick={() => remove(di, si)} />
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
              <div style={{ flex: 1 }}>
                <TextField
                  aria-label={`Add a stop to day ${di + 1}`}
                  placeholder="Add a stop"
                  value={drafts[di]}
                  onChange={(e) => setDrafts((p) => p.map((x, i) => (i === di ? e.target.value : x)))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); add(di); }
                  }}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => add(di)}>Add</Button>
            </div>
          </div>
        </Widget>
      ))}

      {/* Price summary */}
      <Widget title="Price for two">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          {price.lines.map((l) => (
            <div key={l.label} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span style={{ color: "var(--ink-2)" }}>{l.label}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{inr(l.amount)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 8, borderTop: "1px solid var(--glass-edge)", fontWeight: 600 }}>
            <span>Total for two</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{inr(price.total)}</span>
          </div>
        </div>
      </Widget>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
        <Button
          variant="primary"
          size="lg"
          block
          loading={pending}
          disabled={totalStops === 0}
          onClick={() => start(() => publishTrip(trip.id, patch()))}
        >
          {published ? "Save and view my link" : "Publish and get my link"}
        </Button>
        {!published && (
          <Button
            variant="secondary"
            size="lg"
            block
            disabled={pending}
            onClick={() =>
              start(async () => {
                await updateTrip(trip.id, patch());
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              })
            }
          >
            Save draft
          </Button>
        )}
        {saved && (
          <Banner tone="success" icon="check_circle" title="Draft saved" />
        )}
      </div>
    </div>
  );
}
