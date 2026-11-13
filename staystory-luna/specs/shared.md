# Shared rules, data model and sample data

## How the business works

1. A hotel lists rooms and sets a commission it pays only on completed stays (default 15%).
2. The hotel makes a campaign: a creator-only price and perks. It invites creators.
3. A creator turns a reel into a bookable trip (stays plus experiences) with a link.
4. Travelers reach the trip from the reel (comment-to-DM), save it, and book everything in one checkout.
5. StayStory is the merchant of record for the whole trip. After checkout it pays the hotel (minus commission), the experience partners and the creator.

## Rules

**Attribution (60-day credit).** When a traveler opens a creator's link, that creator gets credit for any booking on the traveler's account for 60 days. The credit is tied to the account (phone number), not the browser session. A newer link from a different creator replaces it. Show the credit at checkout: "Credit: @anaya.explores · link opened Nov 13 · valid 60 days".

**Why 60 days.** Travel is a considered purchase. Plannin reports bookings 15 to 60 days after the first visit; a short session cookie (Wishlink style) would lose most travel bookings.

**Creator commission.** About 8% of the trip value, paid out of the hotel commission and StayStory's take. It is "Pending stay" until the guest checks out and the hotel confirms. Then it becomes "Available". Withdrawals go to UPI with 10% TDS deducted.

**Hotel commission.** A percentage of the room value, charged only after check-out. Waived on cancellations. Settled weekly with a GST invoice.

**Gap Night.** A hotel can release unsold rooms for specific dates at a lower rate (above a floor it sets). The alert goes only to travelers who saved a trip that includes this hotel and looked at those dates. The public rate does not change. The creator still earns on these bookings.

**Saving.** Browsing needs no account. Saving a trip or a creator's shop asks for a WhatsApp number and a one-time code. Saved trips get WhatsApp alerts for price drops and low availability.

**Holds.** Starting checkout holds the rooms for 30 minutes.

## Data model (minimum)

- `Hotel`: id, name, city, rooms: `RoomType[]`, defaultCommissionPct, floorRate, payoutAccount
- `RoomType`: id, name, count, sleeps, rackRate, meal
- `Campaign`: id, hotelId, name, roomTypeId, window, nights, perks[], creatorPrice, commissionPct, invitedCreatorIds[], status
- `Creator`: id, handle, name, followers, niche, payoutUpi, shopSlug
- `Trip`: id, creatorId, slug, title, city, days, stays: `TripStay[]`, experiences: `Experience[]`, reelUrl, saves
- `Experience`: id, name, day, time, price, partner
- `Traveler`: id, name, whatsapp, savedTripIds[], savedShopIds[], prefs
- `Attribution`: travelerId, creatorId, tripId, openedAt, expiresAt (openedAt + 60 days)
- `Booking`: id (for example `SS-UDR-48213`), travelerId, tripId, creatorId, hotelId, roomTypeId, dates, guests, roomValue, experiencesValue, total, source (`link` | `gap_night`), status (`held` | `upcoming` | `in_house` | `completed` | `cancelled`)
- `GapNight`: id, hotelId, roomTypeId, dates, rooms, rate, audience filters, sentTo, booked
- `LedgerEntry` (creator): bookingId, amount, status (`pending_stay` | `available` | `paid` | `cancelled`)
- `Settlement` (hotel): period, stays, gross, commission, net

## Sample data used across all three designs

| | |
|---|---|
| Hotel | Haveli Jheel, Udaipur. 24 rooms: Courtyard Room ×8 (₹3,200), Lake-view Deluxe ×12 (₹4,800), Jharokha Suite ×4 (₹7,400) |
| Campaign | Winter on Lake Pichola. Lake-view Deluxe, 2 nights, rack ₹9,600, creator price ₹8,400 (₹4,200 a night). Breakfast, late checkout, sunset boat ride. 15% commission |
| Creator | Anaya Rao, @anaya.explores, 412K followers, shop `staystory.in/anaya` |
| Trip | Three days in Udaipur, `staystory.in/anaya/udaipur`. Haveli Jheel 2 nights (₹8,400) + 3 experiences for 2 (₹6,200) − ₹600 creator-exclusive saving = ₹14,000 for 2. Alternative stays: Pichola Courtyard ₹2,300 a night, Aravalli Palace ₹9,800 a night |
| Traveler | Meera Iyer. Opens the link Nov 13, saves the trip |
| Gap Night | Dec 19 to 21, 4 Lake-view Deluxe rooms at ₹3,400 a night, sent to 312 travelers who saved the trip |
| Booking | SS-UDR-48213, Dec 19 to 21, 2 guests. Room ₹6,800 + experiences ₹6,200 = ₹13,000. Saving ₹1,600 against the campaign rate |
| Payouts | Hotel commission ₹1,020 (15% of ₹6,800). Creator ₹1,040 (8% of ₹13,000), pending until checkout |

Use these as unit-test cases for the pricing and commission module.

## Known inconsistencies in the designs

- My trips' cancelled state says "Refund of ₹14,000 started"; with the Gap Night booking it should be ₹13,000.
- The hotel Gap Night preview says "Push notification"; travelers get the alert on WhatsApp.
