import { useEffect, useRef, type ReactNode } from 'react';
import { BottomSheet, Button, Dock, Toast } from '@staystory/ui';
import { go, hashFor } from './lib';
import { useSession } from './session';

/** Escape handlers form a stack: only the most recently mounted one runs, so a sheet closes before the screen goes back. */
const escStack: { current: (() => void) | undefined }[] = [];
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (let i = escStack.length - 1; i >= 0; i--) { const fn = escStack[i]!.current; if (fn) { e.preventDefault(); fn(); return; } }
});
/** Escape runs `fn` (close a sheet, go back). */
export function useEscape(fn: (() => void) | undefined) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => { escStack.push(ref); return () => { const i = escStack.indexOf(ref); if (i >= 0) escStack.splice(i, 1); }; }, []);
}

const DOCK = [
  { id: 'discover', icon: 'explore', label: 'Discover' }, { id: 'trips', icon: 'luggage', label: 'Trips' },
  { id: 'saved', icon: 'bookmark', label: 'Saved' }, { id: 'me', icon: 'person', label: 'Profile' },
];
const TARGET: Record<string, [string, string]> = { discover: ['discover', 'feed'], trips: ['trips', 'upcoming'], saved: ['trips', 'saved'], me: ['me', 'profile'] };

/** Browsing needs no account. Trips, Saved and Profile ask for a WhatsApp sign-in first, then return to the tab asked for. */
export function TravelerDock({ active }: { active: string }) {
  const { signedIn, gate } = useSession();
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
      <Dock aria-label="Traveler navigation" items={DOCK} active={active} orb={false} onSelect={(id) => {
        const [flow, screen] = TARGET[id]!;
        if (id !== 'discover' && !signedIn) { const here = hashFor(flow, screen); gate({ reason: 'tab', returnTo: here, backTo: hashFor('discover', 'feed') }); } else go(flow, screen);
      }} />
    </div>
  );
}

export function ToastHost() {
  const { toast } = useSession();
  return toast ? <div style={{ position: 'absolute', left: 16, right: 16, bottom: 120, zIndex: 40, display: 'flex' }}><Toast tone="success">{toast}</Toast></div> : null;
}

/** The floating action bar of the booking and trip screens. */
export function FooterPill({ children, gap = 12, padding = '8px 8px 8px 16px' }: { children: ReactNode; gap?: number; padding?: string }) {
  return <div className="footer-pill" style={{ gap, padding }}>{children}</div>;
}

/** A bottom sheet over the screen with a scrim. Escape and the scrim close it. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(onClose);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (ref.current?.querySelector('input, button, a') as HTMLElement | null)?.focus();
    return () => prev?.focus?.();
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <button aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 0, padding: 0, background: 'var(--scrim)', cursor: 'default' }} />
      <div ref={ref} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', overflowY: 'auto' }}>
        <BottomSheet title={title}>
          {children}
          <Button variant="tertiary" size="lg" block onClick={onClose}>Close</Button>
        </BottomSheet>
      </div>
    </div>
  );
}

/** A link styled as a Luna button (real anchors for tel:, https: and mailto:). */
export function LinkButton({ href, icon, children, variant = 'secondary', block, external }: { href: string; icon?: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'tertiary'; block?: boolean; external?: boolean }) {
  return (
    <a className={`lu-btn lu-btn-${variant} lu-btn-${block ? 'lg' : 'md'}${block ? ' lu-btn-block' : ''}`} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {icon && <span className="lu-icon" aria-hidden="true">{icon}</span>}{children}
    </a>
  );
}

/** A deterministic QR-style code for a voucher. Mock: it is a picture of a code, not a scannable one. */
export function QrCode({ seed, size = 168 }: { seed: string; size?: number }) {
  const n = 21;
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let on = rnd() > 0.52;
    if (finder(x, y)) {
      const ax = x >= n - 7 ? x - (n - 7) : x, ay = y >= n - 7 ? y - (n - 7) : y;
      on = ax === 0 || ax === 6 || ay === 0 || ay === 6 || (ax >= 2 && ax <= 4 && ay >= 2 && ay <= 4);
    }
    if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  }
  return <svg role="img" aria-label={`Voucher code for ${seed}`} width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} style={{ background: '#fff', borderRadius: 8, display: 'block' }} fill="#10222A" shapeRendering="crispEdges">{cells}</svg>;
}
