# CrossBo Creator Trips

Hackathon prototype. A creator turns a reel into a bookable trip with one trackable link. Followers book it as is or customize it, the creator earns commission, and the hotel sees which creator sent each guest.

Built with Next.js 14 (App Router), HeroUI 2.7, Tailwind CSS 3 and TypeScript.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for the live agent
npm run dev                  # http://localhost:3000
```

Node 18.18 or later. For the stage demo, `npm run build && npm start` is faster and steadier than dev mode.

## The demo flow

Use the role switch in the top bar to move between people, and **Reset demo** between rehearsals.

1. **Creator**: Create, pick the "Udaipur, 3 days" sample, Build my trip. Review, then Publish and get my link.
2. **Traveler**: open the link (Preview as a follower), Book trip, set 4 travelers, Book trip.
3. **Hotel**: Overview shows the new reservation credited to @anaya.explores. Confirm it in Reservations.
4. **Creator**: Earnings shows the commission as pending.
5. **Hotel**: New campaign, Find matching creators, Invite and launch. The creator's trip page now shows the creator price.
6. **Hotel**: Gap Night, pick empty nights, Release. Then See it as a traveler, See the deal, Book trip.

Booking 4 travelers on the sample trip comes to ₹20,000: the hotel pays ₹3,000 commission, ₹1,600 to the creator and ₹1,400 to CrossBo.

## How it works

| Area | Where | Notes |
| --- | --- | --- |
| Reel-to-trip agent | `src/lib/agent.ts` | Calls the Claude Messages API (15 s timeout). Falls back to cached results for the sample reels, then to rule-based reading. |
| Trip builder | `src/lib/builder.ts` | Matches the extraction to seeded hotels and activities. Prices never come from the model. Unknown stays are flagged, not invented. |
| Pricing and split | `src/lib/pricing.ts` | One function computes the commission split, so every dashboard reconciles. |
| Attribution | `src/app/actions.ts` (`recordVisit`, `createBooking`) | Last creator link opened wins, 30-day cookie. Edits keep attribution. A creator booking through their own link earns nothing. |
| Data | `src/lib/seed.ts`, `src/lib/store.ts` | In memory. Resets on server restart or with Reset demo. |
| Screens | `src/app/**` | Each page loads data on the server and renders a client view built from HeroUI components. |

Commission states: **pending** at booking, **confirmed** when the hotel marks the stay completed, **void** if cancelled.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | none | Enables the live agent. Without it the app still works using cached and rule-based extraction. |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Model for extraction. Set it to a model your key can use. |

## Limits

- Demo identities are fixed: Anaya (creator), Rhea (traveler), Lakeview Haveli (hotel).
- Only Udaipur and Jaipur are seeded.
- No payments, payouts, Instagram API or real notifications.
- All prices, bookings and earnings are illustrative.
