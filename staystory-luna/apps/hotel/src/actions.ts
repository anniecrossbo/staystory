import { market } from '@staystory/market';
import { liveCampaigns } from './lib';
import { toast, ui } from './ui';

export type Go = (flow: string, screen?: string) => void;

/** The campaign new invites go to: the newest live one. */
export const activeCampaign = () => liveCampaigns(market.get())[0];

/** Invite a creator to the live campaign. Without a live campaign, open the builder instead. */
export function inviteCreator(creatorId: string, go: Go): void {
  const camp = activeCampaign();
  if (!camp) { toast('Create a campaign first, then pick creators to invite', { tone: 'info' }); go('campaign', 'offer'); return; }
  const handle = market.get().creators[creatorId]?.handle ?? 'creator';
  if (!camp.invites[creatorId]) market.dispatch({ type: 'campaign/invite', campaignId: camp.id, creatorId });
  ui.set({ lastInvited: creatorId });
  go('console', 'invited');
  toast(`Invite sent to ${handle}`);
}

export function openCreator(creatorId: string, go: Go): void {
  ui.set({ focusCreator: creatorId });
  go('console', `creatorDetail?c=${creatorId}`);
}
