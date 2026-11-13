# Build plan: real data for CrossBo Creator Trips

Work through the phases in order. Each phase ends with a check that must pass before starting the next one.

## What we're building

One end-to-end flow on real data:

1. A creator pastes a reel link and caption and uploads the video.
2. The app pulls audio and frames, transcribes the audio, and extracts the trip with GPT.
3. Places are resolved with Google Places. Hotels are matched to LiteAPI.
4. The trip page shows live LiteAPI prices. The creator publishes and gets a trackable link.
5. A traveler opens the link, customizes dates, travelers and stay, and books through LiteAPI's sandbox.
6. The creator and hotel dashboards show the booking, credited to the creator, with the commission split.

Campaigns and Gap Night stay on the existing seed-based logic for now. They are not part of this plan.

## Environment

```
OPENAI_API_KEY=
OPENAI_EXTRACT_MODEL=        # a current GPT model that accepts images; check OpenAI's model list
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
GOOGLE_PLACES_API_KEY=
LITEAPI_KEY=sandbox_...
LITEAPI_MARGIN=15            # percent added to net rates; this is the commission
CREATOR_SHARE_OF_VALUE=0.08  # creator earns 8% of booking value
SUPPLIER=liteapi             # or "seed" to run with no keys
DATABASE_URL=file:./dev.db
```

Add every variable to `.env.example` with a one-line comment. Fail fast at startup with a clear message if `SUPPLIER=liteapi` and a required key is missing.

---

## Phase 0: check hotel coverage

**Goal:** prove the sample reels' hotels are bookable before building anything else.

- Create `scripts/check-coverage.ts`, runnable with `npx tsx scripts/check-coverage.ts`.
- Input: `scripts/sample-hotels.json`, a list of `{ city, hotelName }` that Annie fills in.
- For each hotel:
  1. Google Places Text Search for "hotelName, city", to get coordinates.
  2. LiteAPI `GET /data/hotels` near those coordinates, then fuzzy-match the name.
  3. LiteAPI `POST /hotels/rates` for 2 adults, 2 nights, check-in 21 days from today.
- Print a table: hotel, Google match, LiteAPI hotel ID, cheapest rate in INR, verdict (bookable / no match / no rates).

**Check:** Annie confirms at least 3 reels whose hotels are bookable. Stop and report if fewer.

---

## Phase 1: SQLite with Prisma

**Goal:** data survives restarts, and the app behaves exactly as before.

- Add Prisma with SQLite. Model every type in `src/lib/types.ts`, plus:
  - `Reel`: id, url, caption, videoPath, videoHash, status, transcript, extraction (JSON), error, timestamps
  - `PlaceCache`: query (unique), placeId, name, lat, lng, types, address, fetchedAt
  - `HotelMatch`: placeId (unique), liteapiHotelId (nullable), score, distanceM, matchedAt
  - `RateCache`: cache key (hotel, dates, occupancy), JSON payload, fetchedAt
  - `Booking` gains `supplierBookingId`, `supplierStatus`, `prebookId`
- `prisma/seed.ts` loads the existing seed data from `src/lib/seed.ts`.
- Replace the in-memory `store.ts` with a data-access module. Keep the function names that `queries.ts` and `actions.ts` already use, so pages change as little as possible.
- "Reset demo" truncates the tables and reruns the seed.

**Check:** `npm run build` passes. Restart the server and confirm a booking made before the restart is still on both dashboards.

---

## Phase 2: provider clients

**Goal:** one small, typed module per external API, each with timeouts, retries and caching.

**`src/lib/openai.ts`**
- `transcribe(audioPath, hintWords[])`: uses `OPENAI_TRANSCRIBE_MODEL`. Pass city and place names as a prompt hint (helps with Hinglish).
- `extractTrip({ caption, transcript, framePaths })`: uses `OPENAI_EXTRACT_MODEL` with structured output (JSON schema). Schema:
  - `destination`, `days`, `budgetPerPerson`, `title`, `style[]`
  - `stays[]`: `{ name, evidence, source: "caption" | "audio" | "frame", confidence: "high" | "medium" | "low" }`
  - `places[]`: `{ name, kind: "sight" | "food" | "activity", evidence, source }`
- System prompt: only report what the reel shows or says; never add places or hotels.

**`src/lib/places.ts`**
- `findPlace(query)`: Google Places API (New) Text Search with a field mask of only `places.id,places.displayName,places.location,places.types,places.formattedAddress`. Cache in `PlaceCache`.
- `isLodging(types)`: true for lodging and hotel types.
- Photos are fetched only for places actually shown. Respect Google's terms on storing Places data; store place IDs, refetch the rest when needed.

**`src/lib/hotels.ts`** defines the supplier interface:

```ts
interface HotelSupplier {
  findNear(lat: number, lng: number, radiusM: number, name?: string): Promise<SupplierHotel[]>;
  getRates(input: RateQuery): Promise<SupplierRate[]>;
  prebook(offerId: string): Promise<Prebook>;
  book(input: BookInput): Promise<SupplierBooking>;
  getBooking(id: string): Promise<SupplierBooking>;
}
```

- `src/lib/suppliers/liteapi.ts` implements it:
  - Base URLs `https://api.liteapi.travel/v3.0` (search, rates) and `https://book.liteapi.travel/v3.0` (prebook, book). Auth header `X-API-Key`.
  - `GET /data/hotels` with `countryCode`, `latitude`, `longitude`, `radius`, `hotelName`.
  - `POST /hotels/rates` with `hotelIds` (or latitude, longitude and radius in metres), `occupancies`, `checkin`, `checkout`, `currency: "INR"`, `guestNationality: "IN"`, `margin: LITEAPI_MARGIN`.
  - Prebook, then book. Check the exact request and response shapes in docs.liteapi.travel; radius units differ between endpoints.
- `src/lib/suppliers/seed.ts` implements the same interface from the seed catalog.
- `SUPPLIER` picks the implementation.
- Rates are cached for 10 minutes in `RateCache`. Rate calls time out after 12 seconds.

**Check:** a script calls each client once with real keys and prints the results.

---

## Phase 3: reel pipeline

**Goal:** a pasted reel becomes a stored extraction, with real progress shown to the creator.

- `POST /api/reels`: multipart upload of the video (mp4 or mov, up to 100 MB) with link and caption. Hash the file; if the hash exists, reuse the stored result.
- Processing runs as a background job in the server process. The `Reel.status` moves through `uploaded → media → transcribing → extracting → resolving → ready` or `failed`.
- `src/lib/media.ts`: with `ffmpeg`, extract mono 16 kHz audio and one frame every 2 seconds, capped at 8 frames, scaled to 768 px wide. Store files under `data/reels/<id>/`.
- Call `transcribe`, then `extractTrip`.
- Update `/creator/new`: after upload, poll `GET /api/reels/:id` every second and show the real status steps. On `failed`, show the error and a retry button.
- Keep the caption-only path for reels with no video, and the existing cached samples for demo safety.

**Check:** the 3–5 sample reels each produce an extraction that names the right hotel.

---

## Phase 4: resolve places and match hotels

**Goal:** every stay maps to a LiteAPI hotel or is clearly flagged.

- For each stay and place in the extraction, call `findPlace("name, city")`.
- For lodging results: `findNear(lat, lng, 500, name)`, then score each candidate:
  - name similarity after normalising (lowercase, strip "the", "hotel", "resort", punctuation), using token-based similarity
  - distance from the Google coordinates
  - accept the best candidate if similarity ≥ 0.8 and distance ≤ 400 m
- Store the result in `HotelMatch`, including misses.
- A stay with no match is shown to the creator as "not bookable yet", with the three nearest bookable hotels as suggestions.
- Non-lodging places become free stops on the itinerary, with Google's name and place ID.

**Check:** a unit test covers the matcher with a correct match, a near-miss name, and a hotel too far away.

---

## Phase 5: trips and live prices

**Goal:** trip pages show real hotels and live prices.

- Update `builder.ts` to build from the resolved extraction instead of the seed catalog. The creator's pick is the matched hotel. Budget and premium alternatives come from a rates search by latitude and longitude near the pick, choosing the cheapest and the most expensive rate.
- Trip page: price for 2 travelers, 2 rooms rule unchanged, check-in 21 days out by default, cheapest refundable rate if there is one.
- Customize page: refetch rates when dates, travelers or stay change, with a loading state on the total. If the hotel has no availability, say so and suggest the alternatives.
- Show "Prices from our hotel partner. Final price confirmed at booking." under the total.

**Check:** a sample reel's trip page shows a live rate that matches a direct LiteAPI rates call for the same dates.

---

## Phase 6: booking through LiteAPI

**Goal:** a real sandbox booking from the trip page.

- On "Book trip": prebook the selected offer. If the price changed, show the new total and ask the traveler to confirm.
- Payment: LiteAPI's payment SDK in sandbox. Sandbox test card: 4242 4242 4242 4242, any future expiry, any CVV. Show this note on the payment step in sandbox only.
- Book with the prebook ID and guest details. Save `supplierBookingId`, the rate, the line items and the split from `computeSplit`.
- Make booking idempotent per prebook ID, so a double click can't book twice.
- Handle and explain: price changed, rate no longer available, payment declined, timeout (check `getBooking` before retrying).

**Check:** two test bookings succeed, and both appear on the creator and hotel dashboards with the right amounts.

---

## Phase 7: attribution and dashboards on real data

**Goal:** the dashboards reconcile with LiteAPI.

- Attribution is unchanged: last creator link opened, 30-day window, edits keep attribution, no commission on a creator's own link.
- Commission: the LiteAPI margin is the total commission. The creator's share is `CREATOR_SHARE_OF_VALUE` of the booking value, paid out of the margin. CrossBo keeps the rest.
- A `Sync bookings` button on the hotel reservations page calls `getBooking` for open bookings and updates status (cancelled bookings void the commission).
- The hotel dashboard works for any hotel: add a hotel picker in the demo bar, defaulting to the hotel of the most recent booking.

**Check:** for every booking, value = hotel net + creator share + CrossBo share.

---

## Phase 8: demo hardening

- `scripts/precompute.ts` runs every sample reel through phases 3–5 and stores the results, so nothing slow happens on stage.
- If a live rates call fails, fall back to the latest cached rate and label it "Price from 5 minutes ago".
- Update the Playwright e2e test (`e2e.py` from the prototype, or port to `@playwright/test`) to cover: upload sample reel, publish, open link as traveler, book in sandbox, check both dashboards.
- Update `README.md`: setup, keys, the demo script, and known limits.

**Check:** the e2e test passes twice in a row from a fresh `Reset demo`.

---

## Out of scope

Instagram API access, real money, creator payouts, flights, activities booking, push or WhatsApp alerts, campaigns and Gap Night on live inventory, more than two cities.

## Questions to ask Annie when you reach them

- Phase 0: which reels and hotels to use.
- Phase 5: default check-in date and number of travelers for the trip page.
- Phase 6: whether to collect guest phone numbers.
- Phase 7: whether the creator's share should be a percentage of booking value or of the margin.
