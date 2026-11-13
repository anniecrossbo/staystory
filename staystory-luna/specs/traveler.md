# Traveler: mobile web

**Who:** people who watch travel reels and want to take the trip they saw.
**Platform:** mobile web (opens from an Instagram DM or a WhatsApp link), iPhone 16 viewport 393 × 852. Safe areas: 54px top, 34px bottom.
**Model:** the flow follows Wishlink's creator-commerce pattern. Comment on a reel, get the link in a DM, browse with no account, save to a wishlist with WhatsApp alerts. Unlike Wishlink, checkout stays inside StayStory (one payment for the whole trip) and creator credit lasts 60 days.

## Flows and screens

Every state below must be reachable. Design file in brackets.

### T0 · Reel to DM (`design/LTSocial.dc.html`)
This happens inside Instagram and is shown for context. StayStory builds the automation, not these screens.
1. `reel`: the creator's reel says "Comment link pls and I'll DM you the full bookable trip", labelled "Paid partnership · StayStory".
2. `comments`: the traveler comments; replies show "anaya.explores sent you the trip in DMs".
3. `dm`: the auto-DM with a link card for `staystory.in/anaya/udaipur` and the note "Sent automatically by StayStory for @anaya.explores".

Build: a webhook that matches a keyword comment on a registered reel and sends the DM with a tracked link. Opening the link starts the 60-day attribution.

### T3 · Trip, save and book (`design/LunaTraveler.dc.html`)
1. `trip`: the creator's trip page. Hero, creator, day-by-day plan, where you'll stay, experiences, estimated total for 2. Bookmark button saves.
2. `saved`: same page with a "Saved to your trips" banner: WhatsApp alerts on price drop or low rooms, and the credit line for the creator.
3. `customize`: dates, pick one stay (creator's pick, budget, luxury), toggle experiences. Total updates live.
4. `checkout`: lead guest, payment method (UPI, card, net banking), summary with saving line and the credit line.
5. `payfail`: "Payment didn't go through" with retry; rooms still held.
6. `booked`: confirmation with booking number.
7. `foryou`: price-drop alert on a saved trip: "Three days in Udaipur just got cheaper", Gap Night Dec 19 to 21, ends in 48 h, 4 rooms left, ₹4,200 → ₹3,400 a night. "Why you're seeing this" lists the save date and the matching dates. Button "Book at this price" goes to customize with Gap Night pricing.
8. `held`: "Rooms held for 30 minutes".

The `gap` prop switches the stay rate to ₹3,400 and the saving line to "Gap Night rate, ₹800 off a night, −₹1,600".

### T1 · Sign in when saving (`design/LTAuth.dc.html`)
Shown only when the traveler saves a trip or shop (or at checkout if not signed in). Browsing never requires it.
1. `welcome`: "Save Anaya's trip and come back to it". Primary "Continue with WhatsApp", secondary "Not now, keep browsing".
2. `phone`: WhatsApp number. "Creators never see your number."
3. `otp`: 6-digit code sent on WhatsApp, resend timer.
4. `otpError`: "That code doesn't match".
5. `prefs`: optional travel style chips, budget per night, Gap Night alerts toggle (on by default).
6. `done`: "You're in, Meera"; trip saved, alerts on.

### T2 · Discover and creator shop (`design/LTDiscover.dc.html`)
1. `feed`: "Where to next?" search, filter pills (All, Heritage, Beaches, Mountains, Under ₹10k), trending creator trips with saves count.
2. `filtered`: same feed with a filter on.
3. `loading`: skeletons.
4. `empty`: "No trips match" with clear search.
5. `creator`: the creator's trip shop (Wishlink shop pattern). Shop URL, Trips / Travelers / Followers counts, bio, Follow, "Save shop to WhatsApp", tabs Trips, Reels, Collections. Trip cards show the stay and experiences and "from" price.

### T4 · My trips (`design/LTTrips.dc.html`)
1. `upcoming`: upcoming trips with countdown.
2. `past`: past trips; "Rate your stay" prompt.
3. `saved`: the wishlist. Each saved trip shows its live status: "₹1,600 cheaper", "2 rooms left", "Saved".
4. `empty`: "No upcoming trips".
5. `detail`: vouchers (booking number to show at check-in), check-in details, free cancellation date.
6. `change`: change dates, same stay and experiences, available weekends.
7. `cancel`: reason and refund estimate.
8. `cancelled`: refund started.
9. `review`: star rating, "Was it like the reel?", tip for the next traveler (shown on the creator's trip).

## Navigation
Bottom dock: Discover, Trips, Saved, Profile. Trip links from DMs open T3 directly, not the feed.

## API a backend would need
- `GET /t/:creatorSlug/:tripSlug`: trip with live prices; records attribution.
- `GET /creators/:slug/shop`
- `POST /auth/whatsapp/start`, `POST /auth/whatsapp/verify`
- `POST /saves` (trip or shop), `GET /me/saves`
- `POST /holds` (30 min), `POST /bookings`, `POST /payments`
- `GET /me/trips`, `PATCH /bookings/:id/dates`, `POST /bookings/:id/cancel`, `POST /bookings/:id/review`
- Outbound WhatsApp templates: OTP, price drop, low availability, Gap Night, booking confirmed, voucher.
