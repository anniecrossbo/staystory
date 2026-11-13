import type { Rupees } from './types';

const grouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Format whole rupees with Indian grouping: 104000 -> "₹1,04,000". Negatives use a real minus: "−₹600". */
export function formatINR(amount: Rupees): string {
  const body = `₹${grouping.format(Math.abs(Math.round(amount)))}`;
  return amount < 0 ? `−${body}` : body;
}

/** Percentage of an amount, rounded to the nearest rupee (half up). */
export function pctOf(amount: Rupees, pct: number): Rupees {
  return Math.round((amount * pct) / 100);
}
