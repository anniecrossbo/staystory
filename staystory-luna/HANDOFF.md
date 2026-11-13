# StayStory: build handoff

StayStory turns travel creators' reels into trips people can book. It has three products:

| Product | Who | Platform | Design size | Spec |
|---|---|---|---|---|
| Traveler | People who watch travel reels | Mobile web | iPhone 16, 393 × 852 | `specs/traveler.md` |
| Creator | Travel creators (Instagram, YouTube) | Mobile app | iPhone 16, 393 × 852 | `specs/creator.md` |
| Hotel | Independent and boutique hotels | Web console | MacBook Air 13", 1470 × 956, fluid | `specs/hotel.md` |

Shared rules, the data model and sample data are in `specs/shared.md`. Read it first.

## What's in this folder

```
HANDOFF.md            this file
CLAUDE.md             short instructions for Claude Code
specs/                one spec per product, plus shared rules and data
design/               the approved Luna OS designs (source of truth for the UI)
  LT*.dc.html, LunaTraveler.dc.html   traveler screens
  LC*.dc.html, LunaCreator.dc.html    creator screens
  LH*.dc.html, LunaHotel.dc.html      hotel screens
  *States.dc.html                     sheets that lay out each screen state side by side
  styles/luna-tokens.css              design tokens as CSS variables
  ds/luna/tokens.json                 the same tokens as JSON
  ds/luna/components/                 Luna OS React component bundle and typings (index.d.ts)
  assets/                             placeholder destination art (illustrations, not photos)
  canvas.json                         board titles and layout from the design canvas
```

## How to read a design file

Each `*.dc.html` file is one flow. Read it as a spec, not as code to ship:

- The `data-props` attribute on the last `<script>` lists every screen in the flow (the `screen` enum).
- `<sc-if value="{{isX}}">` blocks are the screens and states; `<sc-for list="{{x}}">` are repeated rows.
- `<x-import component-from-global-scope="Luna.Button" variant="primary" …>` means "use the Luna `Button` with these props". Kebab-case attributes map to camelCase props (`on-click` is `onClick`, `icon-right` is `iconRight`).
- `{{value}}` holes are filled by `renderVals()` in the `class Component` script at the bottom. That script holds the sample data, the screen-to-screen navigation and any pricing maths.
- The `*States.dc.html` sheets show the order of screens and what each state is called.

The `<script src="./support.js">` line points to the design tool's runtime, which is not included; the files will not render on their own outside the design canvas.

## Design system

Use Luna OS (`design/ds/luna`). The components are React; `index.d.ts` lists their props. Rules from the system:

- One brand colour, teal `#0F5563`. Light theme only.
- Sentence case everywhere. No emoji.
- 4-point spacing. Buttons have 8px radius, widgets 20px.
- Gold accent at most once per screen.
- Anything AI-generated carries a label (`AISummary`, `AIAction`, `ProvenanceTag`).
- Icons are Material Symbols Rounded (by name). Font is Inter.

## Suggested build order

1. `packages/core`: types, sample data and the pricing and attribution rules from `specs/shared.md`.
2. `packages/ui`: wrap the Luna bundle (or port the components) and tokens.
3. Traveler mobile web. It is the revenue path and the one the Wishlink study changed most.
4. Hotel web console.
5. Creator app (a mobile web or PWA version first is fine; the design is iPhone sized).

A monorepo (for example `apps/traveler`, `apps/hotel`, `apps/creator`, `packages/ui`, `packages/core`) is a suggestion. Choose the stack you prefer. Start with mock data and no backend; each spec lists the API calls a real backend would need.

## Not decided yet

- Payments provider (UPI, cards, net banking are shown in the design).
- WhatsApp Business API provider for one-time codes and alerts.
- How the comment-to-DM automation connects to Instagram (Meta's messaging API, needs app review).
- Real photography. The art in `design/assets` is placeholder illustration.
