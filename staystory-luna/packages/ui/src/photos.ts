/**
 * Real photographs only.
 *
 * Apps ask for `photo('udaipur')`. Only real photographs ship: if one is missing or fails to load, the image shows as a calm
 * tinted block (never a broken-image icon and never a stand-in illustration). Each photo's focal point (from
 * /assets/photos/manifest.json) is applied so the subject survives cropping with object-fit: cover, and photos fade in as
 * they load instead of popping.
 */
const PHOTOS = '/assets/photos/';

export const photo = (name: string) => `${PHOTOS}${name}.jpg`;

interface Entry { focal?: { x: number; y: number }; alt?: string }
let manifest: Record<string, Entry> = {};

const keyOf = (src: string) => { const m = src.match(/\/assets\/photos\/([a-z0-9-]+)\.jpg/i); return m ? m[1]! : null; };
const isAsset = (img: HTMLImageElement) => /\/assets\//.test(img.getAttribute('src') ?? '');

function settle(img: HTMLImageElement) {
  img.classList.remove('lu-img-loading');
  const key = keyOf(img.currentSrc || img.src);
  const f = key && manifest[key]?.focal;
  if (f && !img.dataset.focalSet) { img.style.objectPosition = `${f.x}% ${f.y}%`; img.dataset.focalSet = '1'; }
}

function prepare(img: HTMLImageElement) {
  if (!isAsset(img) || img.dataset.photoReady) return;
  img.dataset.photoReady = '1';
  if (!img.decoding) img.decoding = 'async';
  if (img.complete && img.naturalWidth > 0) settle(img);
  else if (!img.complete) img.classList.add('lu-img-loading');
}

export function installPhotos(): void {
  if (typeof window === 'undefined' || (window as unknown as { __photos?: boolean }).__photos) return;
  (window as unknown as { __photos?: boolean }).__photos = true;

  // load and error do not bubble, so listen in the capture phase for every image on the page
  document.addEventListener('load', (e) => { const t = e.target; if (t instanceof HTMLImageElement) settle(t); }, true);
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLImageElement)) return;
    t.classList.remove('lu-img-loading');
    if (keyOf(t.src)) t.classList.add('lu-img-missing');
  }, true);

  const scan = (root: ParentNode) => root.querySelectorAll('img').forEach(prepare);
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
    if (n instanceof HTMLImageElement) prepare(n);
    else if (n instanceof Element) scan(n);
  }))).observe(document.documentElement, { childList: true, subtree: true });
  scan(document);

  fetch(`${PHOTOS}manifest.json`).then((r) => (r.ok ? r.json() : {})).then((m: Record<string, Entry>) => {
    manifest = m ?? {};
    document.querySelectorAll<HTMLImageElement>('img').forEach((i) => { if (i.complete && i.naturalWidth > 0) settle(i); });
  }).catch(() => { /* no manifest yet: photos still work, with default centring */ });
}
