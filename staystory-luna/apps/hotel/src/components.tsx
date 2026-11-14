import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { IconButton, Menu, Toast, TopBar } from '@staystory/ui';
import { market, useMarket } from '@staystory/market';
import { dismissToast, toast, ui, useToasts, useUi } from './ui';
import { RANGES, avatarColor } from './lib';

/* ---------- Overlay: dialog semantics, Escape, focus trap and restore ---------- */
const stack: symbol[] = [];
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Overlay({ side = 'center', onClose, label, children, z, print, wide }: { side?: 'center'; onClose: () => void; label: string; children: ReactNode; z?: number; print?: boolean; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const id = Symbol('overlay');
    stack.push(id);
    const prev = document.activeElement as HTMLElement | null;
    const el = box.current!;
    (el.querySelector<HTMLElement>('input,textarea') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus();
    const key = (e: globalThis.KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') { e.stopPropagation(); close.current(); }
      if (e.key === 'Tab') {
        const f = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
        if (!f.length) { e.preventDefault(); return; }
        const first = f[0]!; const last = f[f.length - 1]!;
        if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('keydown', key, true);
      stack.splice(stack.indexOf(id), 1);
      if (prev && document.contains(prev)) prev.focus();
    };
  }, []);
  return (
    <div className={`overlay ${side}${print ? ' print-area' : ''}`} style={z ? { zIndex: z } : undefined} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`overlay-box ${side}${wide ? ' wide' : ''}`}>{children}</div>
    </div>
  );
}

/* ---------- Make rendered Luna elements that are not buttons behave like buttons ---------- */
export function Activatable({ selector, onActivate, label, children }: { selector: string; onActivate: (index: number, el: HTMLElement) => void; label: (index: number, el: HTMLElement) => string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(selector) ?? []);
  useEffect(() => {
    items().forEach((el, i) => { el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', label(i, el)); el.classList.add('activatable'); });
  });
  const hit = (target: EventTarget | null) => { const t = (target as HTMLElement).closest(selector) as HTMLElement | null; const list = items(); return t && list.includes(t) ? ([list.indexOf(t), t] as const) : null; };
  const click = (e: MouseEvent) => { const h = hit(e.target); if (h) onActivate(h[0], h[1]); };
  const key = (e: KeyboardEvent) => { if (e.key !== 'Enter' && e.key !== ' ') return; const h = hit(e.target); if (h) { e.preventDefault(); onActivate(h[0], h[1]); } };
  return <div ref={ref} style={{ display: 'contents' }} onClick={click} onKeyDown={key}>{children}</div>;
}

/* ---------- Toasts ---------- */
export function Toaster() {
  const list = useToasts();
  return (
    <div className="toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <Toast key={t.id} tone={t.tone} action={t.action} onAction={() => { t.onAction?.(); dismissToast(t.id); }}>{t.text}</Toast>
      ))}
    </div>
  );
}

/* ---------- Top bar: pills open real things ---------- */
export function ChromeTopBar({ go }: { go: (flow: string, screen?: string) => void }) {
  const s = useMarket();
  const { syncLabel } = useUi();
  const [menu, setMenu] = useState<{ left: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const arrivals = s.bookings.filter((b) => b.hotelId === s.hotel.id && b.status === 'upcoming').length;
  const departures = s.bookings.filter((b) => b.hotelId === s.hotel.id && b.status === 'in_house').length;
  useEffect(() => {
    if (!menu) return;
    const off = (e: globalThis.MouseEvent) => { if (!(e.target as HTMLElement).closest('.chrome-menu, .lu-topbar-pill.has-avatar')) setMenu(null); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [menu]);
  const sync = () => {
    ui.set({ syncLabel: 'Syncing…' });
    setTimeout(() => { ui.set({ syncLabel: 'Synced just now' }); toast('Rates and availability are up to date'); }, 700);
  };
  const act = (i: number, el: HTMLElement) => {
    if (i === 0) sync();
    else if (i === 1) { const w = wrap.current!.getBoundingClientRect(); const r = el.getBoundingClientRect(); setMenu(menu ? null : { left: Math.max(0, r.right - w.left - 240) }); }
    else {
      ui.set({ bookingFilter: i === 2 ? 'Upcoming' : 'In house' });
      toast(i === 2 ? `7 arrivals today from your channel manager, ${arrivals} through StayStory` : `4 departures today from your channel manager, ${departures} through StayStory`, { tone: 'info' });
      go('console', 'overview');
    }
  };
  const labels = ['Sync rates and availability', 'Account menu', 'Arrivals today', 'Departures today'];
  return (
    <div ref={wrap} className="topbar-slot">
      <Activatable selector=".lu-topbar-pill.is-fresh, .lu-topbar-pill.has-avatar, .lu-topbar-pill.has-disc" onActivate={act} label={(i) => labels[i] ?? ''}>
        <TopBar fresh="fresh" refreshed={syncLabel} time="09:41, Friday" user={s.hotel.name} initials={s.hotel.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          kpis={[{ icon: 'login', value: 7 }, { icon: 'logout', tone: 'warning', value: 4 }]} />
      </Activatable>
      {menu && (
        <div className="chrome-menu" style={{ left: menu.left }}>
          <Menu items={[
            { section: s.hotel.name },
            { label: 'Property and payout details', icon: 'home_work', onClick: () => { setMenu(null); go('onboarding', 'property'); } },
            { label: 'Create campaign', icon: 'add', onClick: () => { setMenu(null); go('console', 'newCampaign'); } },
            { sep: true },
            { label: 'Reset demo data', icon: 'restart_alt', danger: true, onClick: () => { setMenu(null); if (window.confirm('Reset the shared demo marketplace for this namespace? Bookings, campaigns and Gap Nights return to the sample data.')) { market.reset(); ui.set({ dismissed: [], lastInvited: '', launched: '' }); toast('Demo data reset', { tone: 'info' }); go('console', 'overview'); } } },
          ]} />
        </div>
      )}
    </div>
  );
}

export const rangeInfo = (r: string) => RANGES.find((x) => x.value === r) ?? RANGES[1]!;
export function Heading({ t, d }: { t: string; d: string }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 28, lineHeight: '39px', fontWeight: 700 }}>{t}</span><span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{d}</span></div>;
}

/* ---------- Small building blocks for the Luna widgets ---------- */
export function Tile({ label, value, tone, unit, size }: { label: string; value: ReactNode; tone: 'teal' | 'sky' | 'violet' | 'ochre'; unit?: string; size?: 'sm' }) {
  return <div className={`tile ${tone}${size ? ' ' + size : ''}`}><span className="tl">{label}</span><span className="tv">{value}{unit && <small>{unit}</small>}</span></div>;
}

/** Horizontal bars, widest first. Each bar fades from the brand colour as it gets shorter. */
export function HBars({ rows, large }: { rows: { label: string; value: number }[]; large?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="hbars">
      {rows.map((r, i) => (
        <div className="hbar" key={r.label}>
          <div className={`hb-top${large ? ' lg' : ''}`}><span>{r.label}</span><span>{r.value}</span></div>
          <div className="hb-track"><div className="hb-fill" style={{ width: `${(r.value / max) * 100}%`, opacity: large ? 1 - Math.min(i, 3) * 0.2 : 1 - i * 0.12 }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Av({ initials, id, size }: { initials: string; id: string; size?: 'md' | 'lg' }) {
  return <span className={`av${size ? ' ' + size : ''}`} style={{ background: avatarColor(id) }} aria-hidden="true">{initials}</span>;
}

/** Dialog with a header (title, subtitle, a right-hand slot and close), a scrolling body and a footer. */
export function Dialog({ title, subtitle, aside, onClose, footer, children }: { title: string; subtitle?: string; aside?: ReactNode; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="dlg">
      <div className="dlg-head">
        <div><h2>{title}</h2>{subtitle && <div className="sub">{subtitle}</div>}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{aside}<IconButton icon="close" label="Close" onClick={onClose} /></div>
      </div>
      <div className="dlg-body">{children}</div>
      {footer && <div className="dlg-foot">{footer}</div>}
    </div>
  );
}
