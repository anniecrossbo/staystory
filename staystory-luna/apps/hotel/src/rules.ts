import { validateCampaign, validateGap, type CampaignInput, type GapInput } from '@staystory/core';

export type CampaignStep = 'offer' | 'commission' | 'creators';
export const STEP_INDEX: Record<CampaignStep, number> = { offer: 0, commission: 1, creators: 2 };

/** Placeholders that always pass, so each step can ask the shared rules only about its own fields. */
const PASS = { name: 'x', creatorPrice: 1, rackPrice: 2, commissionPct: 15, invitedCount: 1 } satisfies CampaignInput;

/** The shared campaign rules, split by the step that owns each field. */
export function campaignStepErrors(c: CampaignInput): Record<CampaignStep, string | null> {
  return {
    offer: validateCampaign({ ...PASS, name: c.name, creatorPrice: c.creatorPrice, rackPrice: c.rackPrice }),
    commission: validateCampaign({ ...PASS, commissionPct: c.commissionPct }),
    creators: validateCampaign({ ...PASS, invitedCount: c.invitedCount }),
  };
}

/** First step (in order) with a problem, with its message; null when the campaign can launch. */
export function firstCampaignProblem(c: CampaignInput): { step: CampaignStep; message: string } | null {
  const e = campaignStepErrors(c);
  for (const step of ['offer', 'commission', 'creators'] as const) if (e[step]) return { step, message: e[step]! };
  return null;
}

/** Price problems only (creator price against the public rate). */
export const campaignPriceError = (c: CampaignInput) => validateCampaign({ ...PASS, creatorPrice: c.creatorPrice, rackPrice: c.rackPrice });

/** Name problems only, for the field-level error on the campaign name. */
export const campaignNameError = (c: CampaignInput) => validateCampaign({ ...PASS, name: c.name });

/** Gap Night stepper limits: rate runs from the floor up to one ₹100 step below the public rate. */
export const GAP_STEP = 100;
export const gapRateMax = (publicRate: number) => publicRate - GAP_STEP;
export const gapError = (g: GapInput) => validateGap(g);
