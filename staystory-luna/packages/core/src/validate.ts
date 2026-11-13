import type { Rupees } from './types';

/** Rules from the CrossBo prototype's server actions, kept in one place so every surface enforces them the same way. Each returns an error message or null. */

export interface CampaignInput { name: string; creatorPrice: Rupees; rackPrice: Rupees; commissionPct: number; invitedCount: number }

export function validateCampaign(c: CampaignInput): string | null {
  if (!c.name.trim()) return 'Give the campaign a name.';
  if (!(c.creatorPrice > 0)) return 'Set a creator price.';
  if (c.creatorPrice >= c.rackPrice) return `Set a creator price below your public rate of ₹${c.rackPrice.toLocaleString('en-IN')}.`;
  if (!(c.commissionPct >= 5 && c.commissionPct <= 30)) return 'Commission must be between 5% and 30%.';
  if (c.invitedCount < 1) return 'Pick at least one creator to invite.';
  return null;
}

export interface GapInput { rooms: number; unsold: number; rate: Rupees; floor: Rupees; publicRate: Rupees }

export function validateGap(g: GapInput): string | null {
  if (!(g.rooms >= 1)) return 'Release at least one room.';
  if (g.rooms > g.unsold) return `Only ${g.unsold} ${g.unsold === 1 ? 'room is' : 'rooms are'} unsold.`;
  if (g.rate < g.floor) return `Rate is below your floor of ₹${g.floor.toLocaleString('en-IN')}.`;
  if (!(g.rate < g.publicRate)) return `Set a Gap Night rate below your public rate of ₹${g.publicRate.toLocaleString('en-IN')}.`;
  return null;
}
