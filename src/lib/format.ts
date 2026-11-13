const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function inr(n: number): string {
  return `₹${inrFormatter.format(Math.round(n))}`;
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse YYYY-MM-DD as a UTC date so labels never shift by time zone. */
export function parseDay(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function toDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  const x = parseDay(d);
  x.setUTCDate(x.getUTCDate() + n);
  return toDay(x);
}

export function dayLabel(d: string, withWeekday = true): string {
  const x = parseDay(d);
  const base = `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
  return withWeekday ? `${WEEKDAYS[x.getUTCDay()]} ${base}` : base;
}

export function weekdayShort(d: string): string {
  return WEEKDAYS[parseDay(d).getUTCDay()];
}

export function rangeLabel(from: string, to: string): string {
  const a = parseDay(from);
  const b = parseDay(to);
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
  }
  return `${dayLabel(from, false)} – ${dayLabel(to, false)}`;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, Math.round((parseDay(checkOut).getTime() - parseDay(checkIn).getTime()) / 86400000));
}
