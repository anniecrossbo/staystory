# Hotel: web console

**Who:** independent and boutique hotels that want bookings from creators' audiences and a way to fill unsold rooms.
**Platform:** desktop web, designed at MacBook Air 13" (1470 × 956). Layouts are fluid; widgets wrap on narrower screens.

## Flows and screens

Every state below must be reachable. Design file in brackets.

### H1 · Property onboarding (`design/LHOnboard.dc.html`)
Stepper on the left, form in the middle.
1. `property`: basics (name, city, address, total rooms, type), description and photos ("3 of 8 photos added").
2. `rooms`: room types table (name, count, sleeps, rate, meal plan), channel manager connected, policies.
3. `commission`: acquisition commission (default 15%, only on completed stays), split between the creator and StayStory, worked example on a ₹20,000 booking.
4. `payouts`: legal entity, GSTIN, bank account, billing email.
5. `review`: summary with edit links.
6. `submitted`: "Submitted for review", 48-hour review; explore the console with sample data.

### H3 · Creator campaign builder (`design/LHCampaign.dc.html`)
Steps: Offer, Commission, Creators, Review. A live preview of what creators see sits on the right.
1. `offer`: campaign name, room type, stay window, nights, package perks (chips), creator-only price (stepper, % off rack).
2. `commission`: commission on completed stays, incentives and bonus tiers, target.
3. `creators`: creators ranked by match (score, followers, conversion, niche); select to invite.
4. `review`: summary with edit links. "Billed only after check-out."
5. `launched`: "Campaign launched".

### H2 · Hotel console (`design/LunaHotel.dc.html`)
Top bar with property name and arrivals/departures today; bottom dock: Overview, Bookings, Creators, Gap Night, Payouts.
1. `overview`: attributed bookings, revenue, conversion, cost per guest; "Needs your decision" alerts (unsold rooms against saved demand, a creator accepted a campaign); live campaign; creator performance table and chart; AI summary.
2. `bookings`: table with status filters (All, Upcoming, In house, Completed, Cancelled) and search. Each row shows the creator who drove it and the commission.
3. `bookingDetail`: side sheet for a booking. Guest, booking number, source (via creator, through Gap Night), room value, commission, room, dates, what else they booked, AI note ("Came from a saved trip"), message guest, voucher.
4. `bookingsEmpty`: no search results.
5. `creators`: creator matches with reasons; invite to campaign.
6. `invited`: invite sent confirmation.
7. `gap`: Gap Night. "Unsold rooms meet saved demand": room type, dates, rooms to release (stepper up to unsold count), rate per night (stepper, ₹3,000 floor to ₹4,800), audience chips (saved the creator's trip, looked at these dates, budget, origin cities), match count and preview of the traveler alert.
8. `gapConfirm`: modal "Release 4 rooms as Gap Night?" with rate, commission and possible recovery.
9. `released`: "4 rooms released for Dec 19 to 21. Sent to 312 travelers who saved Anaya's trip."
10. `payouts`: next settlement, commission this month, waived on cancellations, weekly statements with GST invoices.

## API a backend would need
- `POST /hotels` (onboarding steps), room types, channel manager connection (inventory and rates sync)
- `POST /campaigns`, `GET /creators/matches?hotelId=`, `POST /campaigns/:id/invites`
- `GET /hotels/:id/overview?range=`, `GET /hotels/:id/bookings`, `GET /bookings/:id`
- `GET /hotels/:id/gap-night/demand?roomType=&dates=` (saved-trip demand), `POST /gap-nights`
- `POST /bookings/:id/confirm-stay` (releases creator commission), `GET /hotels/:id/settlements`
