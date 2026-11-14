import { useEffect, useRef, type ReactNode } from 'react';
import { Button, Modal, Toast } from '@staystory/ui';
import { useUi } from './store';

/** A bottom sheet inside the phone frame. Closes on Escape and when the backdrop is tapped; focus moves into it. */
export function Sheet({ title, subtitle, onClose, footer, children }: { title: string; subtitle?: string; onClose: () => void; footer?: ReactNode; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, textarea, button:not([aria-label="Close"])');
    first?.focus();
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', on);
    return () => { window.removeEventListener('keydown', on); prev?.focus?.(); };
  }, []);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
      <div className="lu-scrim" onClick={onClose} aria-hidden="true" />
      <Modal title={title} subtitle={subtitle} layout="sheet" onClose={onClose} footer={footer}>{children}</Modal>
    </div>
  );
}

export function Toasts() {
  const { toast } = useUi();
  return toast ? <div className="toast-pos" role="status" aria-live="polite"><Toast tone="success">{toast}</Toast></div> : null;
}

/** Copy text. Resolves true on success so the caller can report what really happened. */
export async function copyText(text: string): Promise<boolean> {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall back */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}
export function useCopy() {
  const { flash } = useUi();
  return async (text: string, msg = 'Link copied') => flash((await copyText(text)) ? msg : 'Could not copy. Select the link and copy it by hand.');
}
export const tripUrl = (handle: string, slug: string) => `staystory.in/${handle}/${slug}`;
/** The real traveler page for a trip in this build, for opening in a new tab. */
export const travelerHref = (slug: string) => { const ns = new URLSearchParams(window.location.search).get('ns'); return `/traveler/${ns ? `?ns=${encodeURIComponent(ns)}` : ''}#/trip/trip?c=anaya&s=${encodeURIComponent(slug)}`; };

export const CloseFooter = ({ onClose, label = 'Close' }: { onClose: () => void; label?: string }) => <Button variant="secondary" onClick={onClose}>{label}</Button>;

const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
/** Commission over the chosen range: a filled line with five date labels, as in the refined designs. */
export function AreaChart({ values, range, label }: { values: number[]; range: number; label: string }) {
  const W = 329, LINE = 58, H = 84;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * W : W / 2, 1.5 + (1 - (v - min) / span) * (LINE - 3)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const end = new Date();
  const ticks = [0, 1, 2, 3, 4].map((i) => dayMonth.format(new Date(end.getTime() - range * 86400000 * (1 - i / 4))));
  return (
    <div className="area">
      <svg viewBox={`0 0 ${W} 96`} preserveAspectRatio="none" role="img" aria-label={label}>
        <defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#15616D" stopOpacity=".22" /><stop offset="1" stopColor="#15616D" stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#area-fill)" />
        <path d={line} fill="none" stroke="#15616D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="area-x">{ticks.map((t, i) => <span key={i}>{t}</span>)}</div>
    </div>
  );
}
