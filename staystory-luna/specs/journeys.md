# End-to-end journeys and the quality bar

The three apps share one mock marketplace (`packages/market`, persisted in `localStorage`, synced across tabs on the same origin). Run everything with `npm run dev` (one origin, http://localhost:5173): `/hotel/`, `/creator/`, `/traveler/`, plus `/demo/`, `/viewer/` and `/viewer/compare.html`. Add `?ns=name` to any URL for an isolated marketplace (use your own `ns` when testing in parallel).

## The story, as one chain

Each step is written to the shared store by one app and read by the others. No app may keep a private copy of marketplace data.

1. **Hotel onboards** (`H1`). Property, rooms, commission, payouts, submit. Writes `hotel`. Submitted opens the console.
2. **Hotel makes a campaign** (`H3`). Offer, commission, creators, review, launch. `campaign/create` with `invites` for every picked creator. The console overview shows it as the live campaign.
3. **Creator gets the offer** (`C2 offers`). Appears under New for every invited creator (`creatorOffers`). Accept, decline or counter (`offer/respond`).
4. **Hotel sees the response** (`H2 overview › Needs your decision`). Accepted: success card. Countered: card with the asked commission and message plus **Accept** and **Decline** (`offer/resolveCounter`). Declined: neutral card. Creators page shows each creator's real status (Invite, Invited, Accepted, Countered, Declined).
5. **Creator builds a trip** (`C3`). Stays step lists hotels; a hotel with a campaign the creator accepted shows "Your offer" and the agreed commission, others do not. Publish writes `trip/publish` (slug from the link field, stays, experiences from the bookable stops, `dmKeyword`). Insights "Your trip links" lists the creator's trips from the store; copy and open work.
6. **Traveler arrives from the reel** (`T0`). Comment, DM, link opens the trip page (`/traveler/#/trip/trip?...` or by creator and slug). Opening writes the 60-day attribution (`traveler/openLink`). Discover shows every live trip from the store, including the one the creator just published.
7. **Traveler saves** (`T1`). Signing in is asked only when saving or at checkout. Save writes `traveler/save` (the trip's save count goes up).
8. **Traveler books** (`T3`). Customize, checkout, pay. `booking/create` writes the booking, a `pending_stay` ledger entry for the credited creator (about 8%), and bumps `travelersBooked`. The hold runs 30 minutes.
9. **Hotel and creator see it**. Hotel Bookings lists it with the creator and commission; the overview counts move. Creator Earnings shows the new-booking banner and the pending entry.
10. **Hotel releases a Gap Night** (`H2 gap`). `gap/release` with the trips that include this hotel. Only travelers who saved a covered trip get the alert (`gapAlertFor`): `For you` tab on the trip, "₹1,600 cheaper" on Saved. Booking at the Gap rate uses `source: 'gap_night'` and `gapNightId`, adds to `booked`, and the hotel sees "N rooms booked" and the booking tagged Gap Night.
11. **Stay completes**. Hotel booking detail: **Mark checked in** (`booking/status in_house`), then **Confirm check-out** (`booking/status completed`). The creator's entry becomes Available.
12. **Creator withdraws** (`creator/withdraw`): available entries become paid, a Processing entry shows the net after 10% TDS.
13. **Traveler reviews** (`review/add`) from Past. The tip shows on the trip page ("Was it like the reel?").
14. **Change and cancel**. Traveler change dates (`booking/dates`) and cancel (`booking/cancel`) show on the hotel (dates, Cancelled, commission waived) and the creator (entry cancelled, ₹0). Refund equals what was paid.

`dev/ensureGap` exists so deep links to result states (`released`, `foryou`, `held`) work when the chain has not been walked yet. Use the same idea for other result states (`accepted`, `withdrawn`, `booked`). Deep links must never crash and must show a sensible state.

## No dead ends (hard rule)

For every screen, in every state:

- Every visible control does something observable: navigates, changes shared state, opens a sheet or shows a toast that reports a real change. No silent buttons, no `href="#"`, no controls that only exist to look right. If a control cannot work in a mock build, wire the nearest honest behaviour (copy to clipboard, open the related screen, show an inline "coming next" only as a last resort and list it in your report).
- Every screen has a way forward and a way back. After every terminal state (booked, published, launched, released, withdrawn, cancelled, submitted, accepted) there is a primary action to the next useful place.
- Every empty or error state has a next action.
- Back never loses the user's input, and refreshing the page on any route renders it.
- Tab bars and docks reach every destination the spec names, with the right item active.
- Numbers are consistent everywhere they appear, derived from the store and `@staystory/core`, never typed twice.
- Keyboard: Enter and Space work on custom buttons, focus is visible, icon-only buttons have labels.

## Pixel and UI bar

The original designs are the source of truth. `/viewer/?file=LunaHotel&screen=gap` renders any original with the Luna bundle; `/viewer/compare.html?file=LunaHotel&screen=gap&app=%2Fhotel%2F%3Fns%3Dx%23%2Fconsole%2Fgap&w=1470&h=956` shows design and app side by side and `await window.__compare()` (in the compare tab) returns text and image geometry mismatches (position, width, font size, weight, colour; missing and extra text).

- Read the design file's inline styles (`design/*.dc.html`), not just the structure: padding, gap, radius, font size and weight, colour tokens, image heights.
- Aim for zero mismatches over 1.5px, zero font or colour mismatches, no missing text. Differences that are intentional (extra controls that remove a dead end, copy fixed per `specs/shared.md` "Known inconsistencies") are allowed; list them in your report.
- Use only Luna components and tokens from `design/styles/luna-tokens.css`. No new component library. Sentence case, no emoji, rupees as `₹1,04,000` via `formatINR`.
- Check at the design size and one narrower size (hotel: 1280 and 1024 wide, widgets wrap; phones: 375 wide). No horizontal scroll, no clipped text, no overlap with the dock or footer bars, safe areas respected.
- The `*States.dc.html` sheets show intended state order and names. Every enum value in each file's `data-props` must still be reachable and match its original.

## Rules for working in parallel

- Edit only your app's folder (`apps/hotel`, `apps/creator` or `apps/traveler`). Do not touch `packages/ui/vendor`.
- `packages/market` is shared: additive changes only (new fields, actions, selectors, seed rows), re-read the file right before editing, keep `npx vitest run --root packages/market` green, and say what you changed in your report. Do not change existing behaviour another app relies on.
- Use your own browser tab (create one) and your own `?ns=` on every URL. Do not start or stop the dev server (already running on 5173). Reset your viewport to desktop when done.
- Typecheck (`npx tsc --noEmit -p apps/<app>`) and `npx vitest run --root packages/core` must pass before you finish.

## The feel layer

`packages/ui/src/polish.css` holds the motion and feedback shared by all three apps: press dip and hover depth on controls, one keyboard focus ring, content rising into place, dialogs that pop, sheets that travel, toasts that slide in, and a short cross-fade between screens (`withViewTransition`, with the dock and action bars held still). Everything is switched off under `prefers-reduced-motion`.

The rule for changing it: nothing may change the size or position of anything at rest, so the layouts keep matching the designs. The sweep and compare pages switch animations off in the app frame before measuring, because a hidden tab never finishes them. After any change to this file, re-run all three sweeps and expect the same counts as before.

## The Apple visual layer

`packages/ui/src/apple.css` restyles all three apps in Apple's visual language while keeping every screen's content and structure: a grouped grey canvas with white cards, system separators (inset hairlines on lists), softer continuous depth, squircle corners where the browser supports `corner-shape`, frosted bars and sheets, filled borderless fields with a focus ring, SF-style tracking that tightens as text grows, 34px large titles on top-level phone screens and a 17px nav title where there is a back button. The brand stays teal. It loads after Luna's styles and overrides Luna's tokens, so `design/styles/luna-tokens.css` is untouched.

This changes type and spacing slightly, so the design sweeps are no longer the visual bar: use them to check content, states and structure (missing or extra text), not pixel offsets. Scrolling screens also no longer squash their content (the designs' flex layout shrank fixed-height blocks, which read as a bug with real photography).

Rules for changing it: keep layouts free of horizontal scroll at 375 (phones) and 1024 (hotel); keep error states visible (they have their own classes); text set inline is overridden by attribute selectors, and sizes need `!important`.

## The layout audit

`/viewer/audit.html?set=hotel|creator|traveler` loads every screen state of one product in a fresh marketplace (hotel at 1470 and 1024, phones at 393 and 375) and reports, per route, any control that is not centred on its title and any horizontal overflow. `await` until `window.__audit.done`, then expect `window.__audit.rows` to be empty. The check itself lives in `apps/public/align.js`.

- A big title (24px and up) is judged on its own line; a block of several smaller lines (a name and a caption) is judged as a block; dialog and sheet close buttons are judged on the title line.
- Headers with a large title use a grid in `apple.css` that centres the back button, avatar, bell or step chips on the title line. A header's text wrapper is recognised by holding the title (`.h1`, `.h2`, `.h-title` or an inline 20px title), so a new header needs one of those, or its name added to the selector list.
- Run all three after any change to `packages/ui/src/apple.css`, `polish.css` or a screen header. The audit was checked with a negative control: switching the fix off reproduces the 7px offset it exists to catch.

## The Luna grid

Layouts follow `design/ds/luna/tokens.json` ("layout"): four columns of 337.5px at 1512 wide, 20px gap on both axes, 51px side margin (40px on narrow screens), 20px widget padding, dock 24px from the bottom, no shell container. `packages/ui/src/grid.css` provides `.lu-page` (side margin, vertical gap) and `.lu-grid` with `.span-1` to `.span-4` / `.span-full`; it is two columns below 1200px and one below 760px. Build screens on it; do not add flex-wrap rows, `max-width` wrappers or page padding of your own.

Hotel placements: overview (Needs your decision span-3 + Live campaign span-1; four stat tiles span-1; Creator performance span-3 + a span-1 column of Bookings by creator and the AI summary), Bookings (filters row, table span-full), Creators (one card per cell, span-1), Gap Night (form span-3 + traveler preview span-1), Payouts (three stat tiles span-1, statements span-full), Campaign builder (main span-3 + aside span-1). Onboarding keeps its image panel and form column on the grid margins and gap.

`apps/public/grid.js` exposes `window.__grid(doc)`. For every `.lu-grid` it reports the page margin versus `--layout-margin`, the 20px gap on both axes, every child's left edge on a column boundary, every child's width as n columns plus (n-1) gaps for the span its class declares, and 337.5px columns at 1512. The layout audit runs it (`grid` in each row) at hotel widths 1512, 1470, 1280 and 1024; the list must be empty. Negative control: forcing `style="grid-column: span 2"` on a `span-3` widget, or an inline `padding-inline: 70px` on the page, is flagged.

## Side sheets are modals everywhere

No product uses a right-docked sheet or drawer on desktop. The hotel booking detail, message composer and voucher are centred Luna `Modal`s (dialog layout, about 560px, scrim, focus trap, Escape to close, focus returns to the opener). Phones use bottom sheets.

## One fold (hotel console)

The hotel console never scrolls as a page. `.page` is exactly the window height; the header sits on top, the content region (`.fold`) takes what is left, and the dock is `position: fixed`, 24px above the window bottom, on every view. A row that should take the remaining height is `.lu-grid.fill`; widgets scroll inside their own body (`.lu-widget-body`), and the creator cards scroll as a group. Detail that does not fit belongs in a modal, not further down the page. Windows shorter than 620px fall back to a scrolling page so nothing is unreachable.

Segmented controls fill their container with equal segments (compact only in a page header's control cluster).
