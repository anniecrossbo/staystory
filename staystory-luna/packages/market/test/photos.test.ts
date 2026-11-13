import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seedState } from '../src';

const dir = resolve(__dirname, '../../../apps/public/assets/photos');
const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8')) as Record<string, { file: string; alt: string; license: string; photographer: string; sourceUrl: string; focal: { x: number; y: number } }>;

/** Every image key the seed data can put on a screen. */
function keys(): string[] {
  const s = seedState();
  const out = new Set<string>();
  for (const c of Object.values(s.creators)) out.add(c.cover);
  for (const t of s.trips) {
    out.add(t.img);
    t.stays.forEach((x) => out.add(x.img));
    t.experiences.forEach((x) => out.add(x.img));
    t.itinerary.forEach((d) => d.stops.forEach((st) => st.img && out.add(st.img)));
  }
  // names the apps request directly for heroes and side panels
  ['haveli', 'verandah', 'palace', 'udaipur', 'jaipur', 'jodhpur', 'pushkar', 'hampi'].forEach((k) => out.add(k));
  return [...out];
}

describe('photographs', () => {
  it('every image the apps can show is a real photo on disk, with a credit', () => {
    for (const k of keys()) {
      expect(existsSync(resolve(dir, `${k}.jpg`)), `missing photo: ${k}`).toBe(true);
      const m = manifest[k];
      expect(m, `no manifest entry: ${k}`).toBeTruthy();
      expect(m!.photographer && m!.sourceUrl && m!.license && m!.alt, `incomplete credit: ${k}`).toBeTruthy();
      expect(m!.focal.x >= 0 && m!.focal.x <= 100 && m!.focal.y >= 0 && m!.focal.y <= 100, `bad focal point: ${k}`).toBe(true);
    }
  });
  it('no illustration is served: the public assets folder holds only the photos folder', () => {
    const entries = readdirSync(resolve(dir, '..'));
    expect(entries.filter((e) => /\.(jpg|png|svg|webp)$/i.test(e))).toEqual([]);
  });
});
