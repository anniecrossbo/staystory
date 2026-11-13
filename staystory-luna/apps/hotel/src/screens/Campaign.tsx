import { useState } from 'react';
import { formatINR, percentOff, splitCommission } from '@staystory/core';
import { Badge, Banner, Button, Checkbox, Chip, EmptyState, IconButton, Select, Stepper, StatTile, Tag, TextField, Toggle, Widget } from '@staystory/ui';
import { market, useMarket, type MCampaign, type MarketState } from '@staystory/market';
import type { Go } from '../actions';
import { asset, matchedCreators, scoreNum, SHORT_NICHE } from '../lib';
import { toast, ui, useDraft, useUi } from '../ui';

export const CAMPAIGN_STEPS = ['offer', 'commission', 'creators', 'review', 'launched'];
const ICONS: Record<string, string> = { Breakfast: 'free_breakfast', 'Late checkout': 'schedule', 'Sunset boat ride': 'sailing', 'Welcome drink': 'local_bar', 'Room upgrade': 'upgrade', 'Airport pickup': 'local_taxi' };
const HEAD: Record<string, string> = { offer: 'Build the offer', commission: 'Commission and incentives', creators: 'Choose creators', review: 'Review and launch', launched: 'Launched' };
const WINDOWS: Record<string, string> = { winter: 'Nov 15 to Jan 31', dec: 'December only' };
const ROOM_ORDER = ['lake-deluxe', 'jharokha', 'courtyard'];

interface Draft {
  name: string; roomId: string; window: string; nights: string; perks: Record<string, boolean>; price: number; pct: number;
  bonus: boolean; contentStay: boolean; firstLook: boolean; target: string; cap: string; picks: string[];
}
const initial = (): Draft => ({
  name: 'Winter on Lake Pichola', roomId: 'lake-deluxe', window: 'winter', nights: '2',
  perks: { Breakfast: true, 'Late checkout': true, 'Sunset boat ride': true, 'Welcome drink': false, 'Room upgrade': false, 'Airport pickup': false },
  price: 84, pct: 15, bonus: true, contentStay: true, firstLook: false, target: '60', cap: '₹80,000', picks: ['anaya'],
});
const nightsNum = (d: Draft) => (/^\d+$/.test(d.nights.trim()) ? Number(d.nights) : NaN);
const errors = (d: Draft, strict: boolean) => {
  const e: { name?: string; nights?: string; target?: string; cap?: string } = {};
  if (!d.name.trim()) e.name = 'Enter a campaign name';
  const n = nightsNum(d);
  if (!(n >= 1 && n <= 14)) e.nights = 'Enter 1 to 14 nights';
  if (!/^\d+$/.test(d.target.trim()) || Number(d.target) < 1) e.target = 'Enter a target of at least 1 booking';
  if (d.cap.trim() && !/^\d+$/.test(d.cap.replace(/[₹,\s]/g, ''))) e.cap = 'Enter an amount in rupees, or leave empty';
  void strict;
  return e;
};

export function Campaign({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const { launched } = useUi();
  const [d, patch, clear] = useDraft<Draft>('campaign', initial);
  const [tried, setTried] = useState(false);
  const i = CAMPAIGN_STEPS.indexOf(screen);
  const to = (k: number) => go('campaign', CAMPAIGN_STEPS[k]);

  const rooms = [...s.hotel.rooms].sort((a, b) => (ROOM_ORDER.indexOf(a.id) + 99) % 99 - (ROOM_ORDER.indexOf(b.id) + 99) % 99);
  const room = rooms.find((r) => r.id === d.roomId) ?? rooms[0]!;
  const nights = Number.isFinite(nightsNum(d)) && nightsNum(d) >= 1 ? nightsNum(d) : 2;
  const rack = room.rackRate * nights;
  const minHundreds = Math.ceil((rack * 0.625) / 100);
  const maxHundreds = Math.floor(rack / 100);
  const price = Math.min(maxHundreds, Math.max(minHundreds, d.price)) * 100;
  const perkOn = Object.keys(d.perks).filter((k) => d.perks[k]);
  const pool = matchedCreators(s).sort((a, b) => scoreNum(b) - scoreNum(a));
  const picks = d.picks.filter((id) => s.creators[id]);
  const err = errors(d, tried);
  const target = Number(d.target) > 0 ? Number(d.target) : 60;
  const sp = splitCommission(price, d.pct);
  const resetPrice = (r: typeof room, n: number) => Math.round((r.rackRate * n * 0.875) / 100);

  const valid = (step: string) => {
    const e = errors(d, true);
    if (step === 'offer') return !e.name && !e.nights;
    if (step === 'commission') return !e.target && !e.cap;
    if (step === 'creators') return picks.length > 0;
    return true;
  };
  const next = () => {
    if (screen === 'launched') return go('console', 'overview');
    if (screen === 'review') return launch();
    if (!valid(screen)) { setTried(true); requestAnimationFrame(() => document.querySelector<HTMLElement>('main [aria-invalid="true"], main .lu-field.has-error input')?.focus()); return; }
    setTried(false); to(i + 1);
  };
  const launch = () => {
    const bad = ['offer', 'commission', 'creators'].find((st) => !valid(st));
    if (bad) { setTried(true); to(CAMPAIGN_STEPS.indexOf(bad)); toast('Finish the highlighted step before launching', { tone: 'warning' }); return; }
    const st = market.get();
    const slug = d.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campaign';
    const c: MCampaign = {
      id: `${slug}-${st.seq.campaign}`, hotelId: st.hotel.id, name: d.name.trim(), roomTypeId: room.id, windowLabel: WINDOWS[d.window] ?? WINDOWS.winter!, nights, perks: perkOn,
      rackPrice: rack, creatorPrice: price, commissionPct: d.pct, bookingTarget: target,
      invites: Object.fromEntries(picks.map((id) => [id, 'invited' as const])), agreedPct: {}, counters: {}, status: 'live', createdAt: new Date().toISOString(),
    };
    market.dispatch({ type: 'campaign/create', campaign: c });
    ui.set({ launched: c.id });
    clear(); setTried(false);
    toast(`${c.name} is live. Offers sent to ${picks.length} creator${picks.length === 1 ? '' : 's'}`);
    to(4);
  };
  const toggle = (id: string) => patch({ picks: d.picks.includes(id) ? d.picks.filter((p) => p !== id) : [...d.picks, id] });
  const launchedCamp: MCampaign | undefined = s.campaigns.find((c) => c.id === launched) ?? s.campaigns[0];

  const review = [
    { k: 'Offer', v: `${formatINR(price)} for ${nights} nights`, step: 0 },
    { k: 'Includes', v: perkOn.join(', ') || 'Room only', step: 0 },
    { k: 'Commission', v: `${d.pct}%${d.bonus ? ' plus bonus tier' : ''}`, step: 1 },
    { k: 'Creators', v: `${picks.length} invited`, step: 2 },
  ];

  return (
    <div style={{ boxSizing: 'border-box', minHeight: '100vh', background: 'var(--canvas)', fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', padding: '20px clamp(16px, 3.4vw, 48px) 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <IconButton icon="arrow_back" label="Back to console" variant="white" onClick={() => go('console', 'overview')} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 }}>
          <span className="eyebrow">{s.hotel.name}, {s.hotel.city} · new campaign</span>
          <span className="h1">{HEAD[screen]}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Offer', 'Commission', 'Creators', 'Review'].map((label, k) => (
            <Chip key={label} selected={k === i} icon={k < i ? 'check_circle' : 'radio_button_unchecked'} onClick={() => to(k)}>{label}</Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <main style={{ flex: '999 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {screen === 'offer' && (<>
            <Widget title="The offer">
              <div className="form-grid">
                <TextField label="Campaign name" value={d.name} onChange={(e) => patch({ name: e.target.value })} error={tried ? err.name : undefined} />
                <Select label="Room type" value={room.id} onChange={(v) => { const r = rooms.find((x) => x.id === v)!; patch({ roomId: v, price: resetPrice(r, nights) }); }} options={rooms.map((r) => ({ value: r.id, label: r.name }))} />
                <Select label="Stay window" value={d.window} onChange={(v) => patch({ window: v })} options={[{ value: 'winter', label: WINDOWS.winter! }, { value: 'dec', label: WINDOWS.dec! }]} />
                <TextField label="Nights" inputMode="numeric" value={d.nights} onChange={(e) => { const v = e.target.value; patch({ nights: v, ...(/^\d+$/.test(v) && +v >= 1 && +v <= 14 ? { price: resetPrice(room, +v) } : {}) }); }} error={d.nights.trim() || tried ? err.nights : undefined} />
              </div>
            </Widget>
            <Widget title="Package includes" count={perkOn.length}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.keys(d.perks).map((p) => <Chip key={p} selected={d.perks[p]} icon={ICONS[p]} onClick={() => patch({ perks: { ...d.perks, [p]: !d.perks[p] } })}>{p}</Chip>)}
              </div>
            </Widget>
            <Widget title="Creator-exclusive price" subtitle={`Rack rate ${formatINR(rack)} for ${nights} night${nights === 1 ? '' : 's'}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 28, lineHeight: '39px', fontWeight: 700 }}>{formatINR(price)}</span><Badge tone="success">{percentOff(rack, price)}% off rack</Badge></span>
                <Stepper value={price / 100} min={minHundreds} max={maxHundreds} onChange={(v) => patch({ price: v })} aria-label="Price in hundreds of rupees" />
              </div>
            </Widget>
          </>)}

          {screen === 'commission' && (<>
            <Widget title="Commission on completed stays" subtitle={`Your default is ${s.hotel.commissionPct}%`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ fontSize: 28, lineHeight: '39px', fontWeight: 700 }}>{d.pct}%</span>
                <Stepper value={d.pct} min={8} max={25} onChange={(v) => patch({ pct: v })} aria-label="Commission percent" />
              </div>
            </Widget>
            <Widget title="Incentives">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Toggle checked={d.bonus} onChange={(v) => patch({ bonus: v })} label="Bonus tier: 2% extra after 20 bookings" />
                <Toggle checked={d.contentStay} onChange={(v) => patch({ contentStay: v })} label="Content stay: 2 nights after 5 bookings" />
                <Toggle checked={d.firstLook} onChange={(v) => patch({ firstLook: v })} label="First look: creator sees the offer 7 days early" />
              </div>
            </Widget>
            <Widget title="Target">
              <div className="form-grid">
                <TextField label="Booking target" inputMode="numeric" value={d.target} onChange={(e) => patch({ target: e.target.value })} hint="Campaign pauses when reached" error={err.target} />
                <TextField label="Commission cap" value={d.cap} onChange={(e) => patch({ cap: e.target.value })} hint="Optional" error={err.cap} />
              </div>
            </Widget>
          </>)}

          {screen === 'creators' && (
            <Widget title="Choose creators" subtitle="Ranked by match" count={picks.length}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pool.map((c) => (
                  <div key={c.id} className="pick-row" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}
                    onClick={(e) => { if (!(e.target as HTMLElement).closest('label,input')) toggle(c.id); }}>
                    <Checkbox checked={picks.includes(c.id)} onChange={() => toggle(c.id)} label="" />
                    <img src={asset(c.cover)} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}><span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{c.handle}</span><span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{c.meta}</span></span>
                    <Tag hue={c.hue}>{SHORT_NICHE[c.niche] ?? c.niche}</Tag>
                    <span style={{ width: 64, textAlign: 'right', fontSize: 13, lineHeight: '18px', fontWeight: 600, color: 'var(--primary)' }}>{c.score}</span>
                  </div>
                ))}
              </div>
              {picks.length === 0 && <span className="err" role="alert" style={{ display: 'block', paddingTop: 8 }}>Pick at least one creator to invite.</span>}
            </Widget>
          )}

          {screen === 'review' && (<>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {review.map((r) => (
                <Widget key={r.k} title={r.k}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>{r.v}</span>
                    <Button variant="ghost" size="sm" icon="edit" onClick={() => to(r.step)}>Edit</Button>
                  </div>
                </Widget>
              ))}
            </div>
            <Banner tone="warning" icon="info" title="Billed only after check-out">Cancellations and no-shows cost nothing.</Banner>
          </>)}

          {screen === 'launched' && (
            <Widget title="Campaign launched">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <img src={asset('haveli')} alt="" style={{ width: '100%', height: 220, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
                {launchedCamp ? (() => {
                  const n = Object.keys(launchedCamp.invites).length;
                  return <EmptyState icon="campaign" title={`Private offers sent to ${n} creator${n === 1 ? '' : 's'}`}>Accepts and counters appear in Needs your decision on your console.</EmptyState>;
                })() : <EmptyState icon="campaign" title="Campaign launched">Accepts and counters appear in Needs your decision on your console.</EmptyState>}
              </div>
            </Widget>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            {screen === 'launched'
              ? <Button variant="tertiary" size="lg" icon="add" onClick={() => { clear(); ui.set({ launched: '' }); go('campaign', 'offer'); }}>Create another</Button>
              : <Button variant="tertiary" size="lg" icon="arrow_back" disabled={i === 0} onClick={() => to(Math.max(0, i - 1))}>Back</Button>}
            <Button variant="primary" size="lg" iconRight={screen === 'review' ? 'rocket_launch' : screen === 'launched' ? 'space_dashboard' : 'arrow_forward'} disabled={screen === 'creators' && picks.length === 0} onClick={next}>
              {screen === 'review' ? 'Launch campaign' : screen === 'launched' ? 'View in console' : 'Continue'}
            </Button>
          </div>
        </main>

        <aside style={{ flex: '1 1 340px', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Widget title="What creators see" subtitle="Private offer in their StayStory app">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <img src={asset('haveli')} alt="" style={{ width: '100%', height: 160, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
              <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>{s.hotel.name}, {s.hotel.city}</span>
              <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{`${nights} night${nights === 1 ? '' : 's'}${perkOn.length ? ' with ' + perkOn.join(', ').toLowerCase() : ''}.`}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Tag hue="moss">{d.pct}% commission</Tag>{d.contentStay && <Tag hue="ochre">Content stay after 5</Tag>}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><span style={{ color: 'var(--ink-2)' }}>Follower price</span><span style={{ fontWeight: 600 }}>{formatINR(price)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><span style={{ color: 'var(--ink-2)' }}>Creator earns about</span><span style={{ fontWeight: 600, color: 'var(--success-ink)' }}>{formatINR(sp.creator)} a booking</span></div>
            </div>
          </Widget>
          <Widget title={`At ${target} bookings`} subtitle="Illustrative, not a forecast">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <StatTile label="Revenue" value={formatINR(price * target)} />
              <StatTile label="Commission" value={formatINR(sp.commission * target)} />
            </div>
          </Widget>
        </aside>
      </div>
    </div>
  );
}
export type { MarketState };
