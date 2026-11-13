# Creator: mobile app

**Who:** travel creators who already post reels and want to earn when followers take the trip.
**Platform:** mobile app (a PWA first is fine), iPhone 16 viewport 393 × 852.

## Flows and screens

Every state below must be reachable. Design file in brackets.

### C1 · Onboarding (`design/LCOnboard.dc.html`)
1. `welcome`: value proposition and "How it works".
2. `connect`: connect channels (Instagram, YouTube).
3. `audience`: top follower cities and regions covered (read from the connected account).
4. `payout`: payout method (UPI ID, or bank account with IFSC), PAN, optional GSTIN; booking split on a ₹20,000 booking.
5. `terms`: disclosure rules (paid partnership label).
6. `done`: "You're set, Anaya".

### C3 · Reel to bookable trip (`design/LCCreate.dc.html`)
1. `pick`: choose a reel already posted.
2. `analyzing`: "Luna is extracting" from video, captions and comments (AI-labelled).
3. `error`: "We couldn't read this reel", with a manual option.
4. `detected`: trip details found (city, length, budget); creator confirms each.
5. `days`: day-by-day plan of places and experiences; edit, reorder, remove.
6. `stays`: partner stays to attach. Hotels with an active campaign show "Your offer" and commission.
7. `preview`: the traveler's view of the trip.
8. `published`: "Your trip is live", link `staystory.in/anaya/udaipur`, share options, comment keyword for auto-DM, reminder to label it a paid partnership.

### C2 · Insights, earnings, offers, profile (`design/LunaCreator.dc.html`)
1. `insights`: commission earned with chart (Week, Month, Quarter), visits, saves, bookings, conversion, top trips, AI summary ("Udaipur is doing the work").
2. `empty`: new creator: "Your numbers start with your first trip".
3. `trip`: one trip's funnel (visits, saves, bookings) and where followers booked.
4. `earnings`: available to withdraw (UPI, 10% TDS), ledger with filters (All, Available, Pending stay, Paid). Banner for a new booking: "New booking from your Udaipur trip. ₹1,040 becomes available after she checks out."
5. `withdrawn`: "₹21,760 on its way"; Meera's ₹1,040 now shows as paid after the hotel confirmed the stay.
6. `offers`: hotel offers inbox with tabs New, Active, Past.
7. `offerDetail`: the Haveli Jheel offer. Terms (follower price ₹8,400 for 2 nights, perks, 15% commission, about 8% to the creator, content stay after 5 bookings), "Why they picked you" (AI-labelled), estimated earnings.
8. `counter`: ask for a different commission (stepper 8 to 25%), extras, message to the hotel.
9. `accepted`: "Offer accepted"; the hotel becomes the stay in the creator's trip.
10. `profile`: storefront link, trip links, notifications.

## Navigation
Bottom dock: Insights, Earnings, Offers, Profile. Creating a trip (C3) opens from Insights and the empty state.

## API a backend would need
- OAuth connect for Instagram and YouTube; read reels and audience insights.
- `POST /reels/:id/extract` (async, AI) → draft trip; `PUT /trips/:id`; `POST /trips/:id/publish`
- `POST /trips/:id/dm-keyword` to register the comment-to-DM rule
- `GET /me/insights?range=`, `GET /me/trips/:id/funnel`
- `GET /me/ledger`, `POST /me/withdrawals`
- `GET /me/offers`, `POST /offers/:id/accept`, `POST /offers/:id/counter`
