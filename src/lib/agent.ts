import "server-only";
import { CITIES, ACTIVITIES } from "./catalog";
import type { Extraction, ExtractionSource } from "./types";
import { findSampleByCaption } from "./samples";

const SYSTEM_PROMPT = `You read an Instagram travel reel's caption and pull out the facts needed to build a trip.
Reply with one JSON object and nothing else: no prose, no code fences.
Shape:
{"destination": string|null, "days": number|null, "places": string[], "budgetPerPerson": number|null, "namedStay": string|null, "style": string[], "title": string|null}
Rules:
- destination: the city the trip is in, or null if the caption doesn't say.
- days: whole number of days. "weekend" means 2. Null if not stated.
- places: spots and activities in the order the caption mentions them, as short names ("City Palace", "Boat ride on Lake Pichola").
- budgetPerPerson: rupees per person as a whole number ("₹15,000" -> 15000, "6k" -> 6000), or null.
- namedStay: the hotel or stay exactly as the caption describes it, or null.
- style: up to 3 short tags such as "Slow travel", "Friend groups", "Couples", "Weekend trips", "Budget backpacking".
- title: a short trip title taken from the caption's own words, or null.
Never add places, prices or hotels the caption doesn't mention.`;

const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 15000;

function coerce(raw: unknown): Extraction {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim()) : []);
  return {
    destination: str(o.destination),
    days: num(o.days),
    places: arr(o.places).slice(0, 12),
    budgetPerPerson: num(o.budgetPerPerson),
    namedStay: str(o.namedStay),
    style: arr(o.style).slice(0, 3),
    title: str(o.title),
  };
}

async function extractWithOpenAI(caption: string, reelUrl: string): Promise<Extraction> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Reel URL: ${reelUrl || "not given"}\n\nCaption:\n${caption}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start < 0 || end < 0) throw new Error("No JSON object in response");
    return coerce(JSON.parse(clean.slice(start, end + 1)));
  } finally {
    clearTimeout(timer);
  }
}

const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/** Plain rules, used when neither the live call nor a cached result is available. */
export function extractWithRules(caption: string): Extraction {
  const c = caption.toLowerCase();
  const city = CITIES.find((x) => c.includes(x.name.toLowerCase()));
  const dayMatch = c.match(/\b(\d+|one|two|three|four|five)\s*(?:slow\s+)?days?\b/);
  const days = dayMatch ? Number(dayMatch[1]) || WORD_NUMBERS[dayMatch[1]] : c.includes("weekend") ? 2 : null;
  const rupee = caption.match(/₹\s?([\d,]+)\s*(k)?/i) ?? caption.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
  const budget = rupee ? Math.round(Number(rupee[1].replace(/,/g, "")) * (rupee[2] || /k$/i.test(rupee[0]) ? 1000 : 1)) : null;
  const places: string[] = [];
  if (city) {
    for (const p of city.knownPlaces) if (c.includes(p.toLowerCase())) places.push(p);
    for (const a of ACTIVITIES.filter((x) => x.cityId === city.id && x.kind === "activity")) {
      if (a.keywords.some((k) => c.includes(k)) && !places.some((p) => a.keywords.some((k) => p.toLowerCase().includes(k)))) places.push(a.name);
    }
  }
  const stay = caption.match(/stay(?:ed|ing)?\s+(?:at|in)\s+([^.,!\n]+)/i);
  const firstSentence = caption.split(/[.!\n]/)[0]?.trim();
  return {
    destination: city?.name ?? null,
    days,
    places,
    budgetPerPerson: budget,
    namedStay: stay ? stay[1].trim() : null,
    style: [],
    title: firstSentence && firstSentence.length <= 60 ? firstSentence : null,
  };
}

export async function extract(caption: string, reelUrl: string): Promise<{ extraction: Extraction; source: ExtractionSource; note?: string }> {
  try {
    return { extraction: await extractWithOpenAI(caption, reelUrl), source: "openai" as ExtractionSource };
  } catch (err) {
    const note = err instanceof Error ? err.message : "Live extraction failed";
    const sample = findSampleByCaption(caption);
    if (sample) return { extraction: sample.extraction, source: "cache", note };
    return { extraction: extractWithRules(caption), source: "rules", note };
  }
}
