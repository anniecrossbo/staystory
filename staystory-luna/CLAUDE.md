# StayStory

Start with `HANDOFF.md`, then `specs/shared.md`, then the spec for the product you are building.

- The UI source of truth is `design/*.dc.html`. Match its layout, copy, states and sample data. Read the `screen` enum in each file's `data-props` to find every state.
- Use the Luna OS components in `design/ds/luna/components` (typings in `index.d.ts`) and the tokens in `design/styles/luna-tokens.css`. Do not introduce another component library.
- Keep copy in sentence case, no emoji, and keep all amounts in Indian rupees formatted with `en-IN` grouping (₹1,04,000).
- Put pricing, commission and attribution logic in one shared module with unit tests. The numbers in `specs/shared.md` are the test cases.
- Build each product with mock data first. Each spec lists the screens as acceptance criteria: every listed state must be reachable.
