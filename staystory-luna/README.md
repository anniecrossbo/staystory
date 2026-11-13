# StayStory (Luna OS build)

Three apps on one shared mock marketplace: a hotel web console, a creator mobile app and a traveler mobile web app. Built from the approved Luna OS designs in `design/`.

```bash
npm install
cp .env.example .env.local   # optional: AI, live hotels and map keys
npm run dev                  # http://localhost:5173
```

| Where | What |
| --- | --- |
| `/hotel/` | Hotel console: onboarding, campaign builder, bookings, Gap Night, payouts |
| `/creator/` | Creator app: onboarding, reel to trip, insights, earnings, offers |
| `/traveler/` | Traveler app: reel and DM context, trip, checkout, sign in, discover, my trips |
| `/demo/` | Start page, with a button that resets the shared data |
| `/viewer/`, `/viewer/compare.html` | Render the original design files and diff them against the apps |

Add `?ns=name` to any URL for an isolated copy of the marketplace. The traveler sign-in demo code is `123456`.

## Layout

- `packages/core`: pricing, commission and attribution rules, with the numbers from `specs/shared.md` as tests
- `packages/market`: the shared marketplace store (reducer, selectors, localStorage sync)
- `packages/server`: reel reading, live hotels and maps, ported from the CrossBo prototype, served at `/api/*`
- `packages/ui`: the Luna OS component bundle and a hash router
- `apps/*`: the three apps, the design viewer and the demo page
- `specs/`: product specs and `journeys.md` (the end-to-end chain and the quality bar)

## Photos

The apps show real photographs from `apps/public/assets/photos/` (Unsplash, credits in `CREDITS.md`, focal points in `manifest.json`). Only real photographs ship; the original illustrations live in `design/assets` as the design source and are not served. A missing photo shows as a tinted block. A test (`packages/market/test/photos.test.ts`) fails if any image the apps can show has no photo. To swap a photo, replace the file and adjust its `focal` point; hotels and creators will upload their own photos in the real product.

## Tests

```bash
npm test                 # core, market and server
npm run typecheck
npm run build
```

Everything works without API keys: reel reading falls back to cached samples and simple rules, live hotels shows a note, and the trip map shows a placeholder.
