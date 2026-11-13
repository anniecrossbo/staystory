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
