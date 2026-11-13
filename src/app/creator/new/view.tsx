"use client";

import { Button, Chip, TextField, Select, Icon, Widget, ProgressBar, Banner, Tag } from "@/luna";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createTripFromReel } from "@/app/actions";

interface Sample {
  id: string;
  label: string;
  reelUrl: string;
  caption: string;
}

const STEPS = ["Reading the caption", "Finding the destination, days and places", "Matching partner stays", "Pricing activities and transfers"];

export function NewTripView({ samples, cities, liveEnabled }: { samples: Sample[]; cities: { id: string; name: string }[]; liveEnabled: boolean }) {
  const router = useRouter();
  const [reelUrl, setReelUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needCity, setNeedCity] = useState(false);
  const [city, setCity] = useState<string>("");

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, [busy]);

  async function run(cityOverride?: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await createTripFromReel({ reelUrl, caption, cityOverride });
      if (res.ok) {
        setStep(STEPS.length);
        router.push(`/creator/trips/${res.tripId}/review`);
        return;
      }
      setBusy(false);
      if (res.reason === "empty") setError("Paste the reel's caption so the agent has something to read.");
      else {
        setNeedCity(true);
        setError(
          res.reason === "unknown_city"
            ? `${res.destination} isn't covered in this demo yet. Pick Udaipur or Jaipur to keep going.`
            : "The caption doesn't name a city. Pick where this trip happens.",
        );
      }
    } catch {
      setBusy(false);
      setError("The trip couldn't be built. Check the caption and try again.");
    }
  }

  if (busy) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "32px 20px" }}>
        <h1 style={{ fontSize: 28, lineHeight: "39px", fontWeight: 700 }}>Building your trip</h1>
        <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", fontSize: 13, lineHeight: "18px", color: "var(--ink-2)" }}>
          {caption || "Using the city you picked."}
        </div>
        <Widget title="Luna is extracting" subtitle="From caption and reel link">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 24 }}>
                  <span style={{ display: "flex", color: done ? "var(--success)" : current ? "var(--primary)" : "var(--faint)" }}>
                    <Icon name={done ? "check_circle" : current ? "progress_activity" : "radio_button_unchecked"} size={20} />
                  </span>
                  <span style={{ flex: 1, fontSize: 13, lineHeight: "18px", color: done || current ? "var(--ink)" : "var(--muted)" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </Widget>
        <ProgressBar value={Math.round(((step + 1) / STEPS.length) * 100)} aria-label="Trip builder progress" />
        <p style={{ fontSize: 13, lineHeight: "18px", color: "var(--muted)" }}>Only partner stays are priced. Anything the agent can't match is flagged for you to review.</p>
      </div>
    );
  }

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 20, padding: "32px 20px" }}
      onSubmit={(e) => {
        e.preventDefault();
        void run(needCity && city ? city : undefined);
      }}
    >
      <div>
        <h1 style={{ fontSize: 28, lineHeight: "39px", fontWeight: 700 }}>Turn a reel into a bookable trip</h1>
        <p style={{ marginTop: 8, fontSize: 15, lineHeight: "22px", color: "var(--ink-2)" }}>
          Paste your reel. We build the itinerary, price it with partner stays and give you one link that earns on every booking.
        </p>
      </div>

      <TextField
        label="Reel link"
        placeholder="instagram.com/reel/…"
        icon="link"
        value={reelUrl}
        onChange={(e) => setReelUrl(e.target.value)}
        type="url"
      />

      <TextField
        multiline
        label="Caption"
        hint="The agent reads places, days and budget from it."
        placeholder="Three slow days in Udaipur…"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />

      <div>
        <div style={{ marginBottom: 8, fontSize: 11, lineHeight: "15px", fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase" as const, color: "var(--muted)" }}>Or try a sample reel</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {samples.map((s) => (
            <Chip
              key={s.id}
              selected={caption === s.caption}
              icon="auto_awesome"
              onClick={() => {
                setReelUrl(s.reelUrl);
                setCaption(s.caption);
                setNeedCity(false);
                setError(null);
              }}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {needCity && (
        <Select
          label="Where is this trip?"
          placeholder="Pick a city"
          options={cities.map((c) => ({ value: c.name, label: c.name }))}
          value={city || undefined}
          onChange={(v) => setCity(v)}
        />
      )}

      {error && (
        <Banner tone="warning" icon="warning" title="Heads up">
          {error}
        </Banner>
      )}

      <Button type="submit" variant="primary" size="lg" block disabled={needCity && !city}>
        Build my trip
      </Button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, lineHeight: "15px", color: "var(--muted)" }}>
        <Tag hue={liveEnabled ? "moss" : "charcoal"}>
          {liveEnabled ? "Live agent on" : "Live agent off"}
        </Tag>
        <span>{liveEnabled ? "Captions are read by OpenAI." : "No API key set, so cached and rule-based extraction is used."}</span>
      </div>
    </form>
  );
}
