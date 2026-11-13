# CrossBo Creator Trips

Hackathon project for Crossbo. Creators turn an Instagram travel reel into a bookable trip with one trackable link. Followers book the trip as is or customize it, the creator earns commission, and the hotel sees which creator sent each guest.

Target audience for the demo: Gen Z budget travellers in India (Udaipur, Jaipur).

**The build plan is in `docs/BUILD_PLAN.md`. Work through it phase by phase.**

## Current state

The repo is a working prototype on seeded, in-memory data:

- 14 screens across creator, traveler and hotel surfaces, all built with HeroUI.
- A reel-to-trip agent that calls Claude, with cached and rule-based fallbacks.
- Attribution, commission split, campaigns and Gap Night all work end to end on seed data.

We are now replacing seed data with real data: OpenAI for reading reels, Google Places for locations, LiteAPI for hotels, rates and booking, and SQLite for storage.

## Stack

- Next.js 14 App Router, React 18, TypeScript (strict)
- HeroUI 2.7 on Tailwind CSS 3. Do not upgrade to HeroUI 3 or Tailwind 4.
- SQLite through Prisma (to be added in phase 1)
- OpenAI API (transcription and extraction), Google Places API (New), LiteAPI (sandbox)
- `ffmpeg` on the host for audio and frame extraction

## Commands

```bash
npm run dev          # local dev on :3000
npm run build        # production build; must pass after every phase
npx tsc --noEmit     # type check
```

## Where things live

| Path | What |
| --- | --- |
| `src/app/**/page.tsx` | Server components: load data, render a client view |
| `src/app/**/view.tsx` | Client components built from HeroUI |
| `src/app/actions.ts` | All server actions (mutations) |
| `src/lib/types.ts` | Domain types |
| `src/lib/pricing.ts` | Price lines and `computeSplit`, the single source for commission maths |
| `src/lib/builder.ts` | Turns an extraction into a trip |
| `src/lib/agent.ts` | Reel extraction (moving to OpenAI) |
| `src/lib/queries.ts` | Read helpers and dashboard stats |
| `src/lib/store.ts`, `seed.ts`, `catalog.ts`, `samples.ts` | In-memory store and seed data (to become the fallback) |

## Rules

**Data and honesty**
- Never invent hotels, prices or places. If something can't be matched to a real record, flag it in the UI as "not bookable yet".
- Prices always come from LiteAPI (or the seed fallback), never from the model.
- Do not scrape Instagram. Reels come in as a pasted link, caption and uploaded video file.
- Keep the seed data path working. `SUPPLIER=seed` must run the whole demo with no API keys.

**Secrets**
- Keys live only in `.env.local`. Never hard-code, log or print them.
- Server-only code imports `server-only`. Never expose keys to client components.

**Next.js and HeroUI patterns**
- Server components must not pass functions to client components. Use the existing client wrappers: `LinkButton`, `InitialsAvatar`, `InitialsGroup`.
- HeroUI `Table`, `Tabs`, `RadioGroup`, `CheckboxGroup` and similar go in client views, not server components.
- After any mutation, call `revalidatePath("/", "layout")`.

**Money**
- All commission maths goes through `computeSplit` in `src/lib/pricing.ts`.
- Booking refs are sequential; order bookings with `newestFirst` from `queries.ts`.

**Copy**
- Sentence case, plain verbs, no filler. Buttons say exactly what happens ("Book trip", "Release 4 rooms").
- Errors say what went wrong and how to fix it.
- Every screen keeps the prototype disclosure in the footer.

**Working style**
- One phase at a time. At the end of each phase, run the type check and `npm run build`, and fix everything before moving on.
- Before adding any paid service or new dependency not listed here, ask Annie.
- If an API behaves differently from the plan, check the provider's docs and follow them, then note the difference in `docs/BUILD_PLAN.md`.
