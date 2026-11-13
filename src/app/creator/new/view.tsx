"use client";

import { Button, Chip, Input, Select, SelectItem, Textarea } from "@heroui/react";
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
      <div className="flex flex-col gap-6 p-5 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Building your trip</h1>
        <div className="rounded-large bg-default-100 p-4 text-sm leading-relaxed text-default-700">{caption || "Using the city you picked."}</div>
        <ol className="flex flex-col gap-4" aria-live="polite">
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? "bg-success text-success-foreground" : current ? "border-[3px] border-primary-100 border-t-primary motion-safe:animate-spin" : "border-2 border-default-200"
                  }`}
                  aria-hidden="true"
                >
                  {done ? "✓" : ""}
                </span>
                <span className={current ? "font-semibold" : done ? "" : "text-default-500"}>{label}</span>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-default-500">Only partner stays are priced. Anything the agent can't match is flagged for you to review.</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5 p-5 pt-8"
      onSubmit={(e) => {
        e.preventDefault();
        void run(needCity && city ? city : undefined);
      }}
    >
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">Turn a reel into a bookable trip</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-default-600">
          Paste your reel. We build the itinerary, price it with partner stays and give you one link that earns on every booking.
        </p>
      </div>
      <Input label="Reel link" labelPlacement="outside" placeholder="instagram.com/reel/…" value={reelUrl} onValueChange={setReelUrl} type="url" size="lg" />
      <Textarea
        label="Caption"
        labelPlacement="outside"
        description="The agent reads places, days and budget from it."
        placeholder="Three slow days in Udaipur…"
        value={caption}
        onValueChange={setCaption}
        minRows={4}
        size="lg"
      />
      <div>
        <div className="mb-2 text-sm text-default-500">Or try a sample reel</div>
        <div className="flex flex-wrap gap-2">
          {samples.map((s) => (
            <Button
              key={s.id}
              size="sm"
              radius="full"
              variant={caption === s.caption ? "solid" : "flat"}
              color={caption === s.caption ? "primary" : "default"}
              onPress={() => {
                setReelUrl(s.reelUrl);
                setCaption(s.caption);
                setNeedCity(false);
                setError(null);
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
      {needCity && (
        <Select label="Where is this trip?" labelPlacement="outside" placeholder="Pick a city" selectedKeys={city ? [city] : []} onSelectionChange={(k) => setCity(String(Array.from(k)[0] ?? ""))}>
          {cities.map((c) => (
            <SelectItem key={c.name}>{c.name}</SelectItem>
          ))}
        </Select>
      )}
      {error && (
        <div role="alert" className="rounded-medium bg-warning-50 p-3 text-sm text-warning-800">
          {error}
        </div>
      )}
      <Button type="submit" color="primary" size="lg" radius="lg" className="font-semibold" isDisabled={needCity && !city}>
        Build my trip
      </Button>
      <div className="flex items-center gap-2 text-xs text-default-500">
        <Chip size="sm" variant="dot" color={liveEnabled ? "success" : "default"}>
          {liveEnabled ? "Live agent on" : "Live agent off"}
        </Chip>
        {liveEnabled ? "Captions are read by OpenAI." : "No API key set, so cached and rule-based extraction is used."}
      </div>
    </form>
  );
}
