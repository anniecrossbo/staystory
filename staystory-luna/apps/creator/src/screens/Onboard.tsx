import { useState } from 'react';
import { formatINR, splitCommission } from '@staystory/core';
import { Avatar, BarChart, Button, Checkbox, Chip, DonutChart, EmptyState, Icon, IconButton, ProgressBar, SegmentedControl, StatTile, TextField, Widget } from '@staystory/ui';
import { asset } from '../data';
import type { Go } from '../router';
import { useUi } from '../store';

export const ONBOARD_SCREENS = ['welcome', 'connect', 'audience', 'payout', 'terms', 'done'];
const CTA: Record<string, string> = { welcome: 'Get started', connect: 'Continue', audience: 'Continue', payout: 'Save payout details', terms: 'Finish setup', done: 'Create my first trip' };
const REGIONS = ['Rajasthan', 'Goa', 'Kerala', 'Himachal', 'Karnataka', 'Northeast', 'Ladakh', 'Abroad'];
const CHANNELS = [
  { key: 'ig' as const, name: 'Instagram', icon: 'photo_camera', sub: '@anaya.explores · 412K' },
  { key: 'yt' as const, name: 'YouTube', icon: 'smart_display', sub: 'Anaya Explores · 88K' },
  { key: 'blog' as const, name: 'Blog or website', icon: 'language', sub: 'anayaexplores.in' },
];
export const payoutErrors = (p: { payMode: string; upi: string; account: string; ifsc: string; pan: string; gstin: string }) => {
  const e: Partial<Record<'upi' | 'account' | 'ifsc' | 'pan' | 'gstin', string>> = {};
  if (p.payMode === 'upi') { if (!/^[\w.-]{2,}@[a-z]{2,}$/i.test(p.upi.trim())) e.upi = 'Enter a UPI ID like name@bank'; }
  else {
    if (!/^\d{9,18}$/.test(p.account.replace(/\s/g, ''))) e.account = 'Enter 9 to 18 digits';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(p.ifsc.trim())) e.ifsc = 'IFSC has 11 characters, like HDFC0000000';
  }
  if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(p.pan.trim())) e.pan = 'PAN looks like ABCDE1234F';
  if (p.gstin.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(p.gstin.trim())) e.gstin = 'GSTIN has 15 characters';
  return e;
};

export function Onboard({ screen, go }: { screen: string; go: Go }) {
  const { profile: p, setProfile, startNewTrip } = useUi();
  const [touched, setTouched] = useState(false);
  const i = ONBOARD_SCREENS.indexOf(screen);
  const to = (k: number) => go('onboard', ONBOARD_SCREENS[k]);
  const split = splitCommission(20000, 15);
  const errors = payoutErrors(p);
  const disabled = screen === 'terms' && !p.agree;
  const connected = Object.values(p.channels).filter(Boolean).length;
  const next = () => {
    if (screen === 'done') { startNewTrip(); go('create', 'pick'); return; }
    if (screen === 'payout' && Object.keys(errors).length) { setTouched(true); return; }
    to(Math.min(5, i + 1));
  };
  const err = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  return (<>
    <div className="scroll s120 g20">
      {i >= 1 && i <= 4 && (
        <div className="head fixed">
          <IconButton icon="arrow_back" label="Back" variant="white" onClick={() => to(i - 1)} />
          <div style={{ flex: 1 }}><ProgressBar value={i * 25} aria-label="Setup progress" /></div>
          <span style={{ fontSize: 11, lineHeight: '15px', fontWeight: 600, color: 'var(--muted)' }}>{i} of 4</span>
        </div>
      )}

      {screen === 'welcome' && (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44 }}>
          <span className="muted-ic" style={{ color: 'var(--primary)' }}><Icon name="home_work" size={24} /></span>
          <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>StayStory for creators</span>
        </div>
        <div className="hero" style={{ height: 260, boxShadow: 'var(--shadow-card)' }}><img src={asset('jaipur')} alt="Illustrated fort above Jaipur" /></div>
        <span className="t-h1">Your reels already sell trips. Get paid for them.</span>
        <Widget title="How it works">
          <div className="stack gap12">
            {[['01', 'Post normally', 'Keep making the reels you already make'], ['02', 'Publish one trackable link', 'We turn a reel into a day-by-day trip'], ['03', 'Earn on completed stays', 'See visits, saves and bookings; paid monthly']].map(([n, t, d]) => (
              <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar initials={n!} size={34} /><span className="stack"><span className="t-s">{t}</span><span className="t-cap">{d}</span></span></div>
            ))}
          </div>
        </Widget>
      </>)}

      {screen === 'connect' && (<>
        <div className="stack gap8"><span className="t-h1">Connect your channels</span><span className="t-b2">We read public posts and audience stats to match you with hotels. We never post for you.</span></div>
        <Widget title="Channels" count={connected}>
          <div className="stack">
            {CHANNELS.map((ch) => { const on = p.channels[ch.key]; return (
              <div key={ch.key} className="line" style={{ minHeight: 60 }}>
                <span className="muted-ic" style={{ color: 'var(--ink-2)' }}><Icon name={ch.icon} size={24} /></span>
                <span className="col1"><span className="t-s">{ch.name}</span><span className="t-cap">{on ? ch.sub : 'Not connected'}</span></span>
                <Button variant={on ? 'secondary' : 'primary'} size="sm" icon={on ? 'check' : 'link'} aria-pressed={on} onClick={() => setProfile({ channels: { ...p.channels, [ch.key]: !on } })}>{on ? 'Connected' : 'Connect'}</Button>
              </div>); })}
          </div>
        </Widget>
      </>)}

      {screen === 'audience' && (<>
        <div className="stack gap8"><span className="t-h1">Your audience</span><span className="t-b2">From Instagram. Hotels see this when matching.</span></div>
        <div className="tiles"><StatTile label="Followers" value="412K" /><StatTile label="Average save rate" value="6.8%" /></div>
        <Widget title="Top follower cities">
          <BarChart height={120} aria-label="Followers by city" data={[{ label: 'Mumbai', value: 24 }, { label: 'Bengaluru', value: 18 }, { label: 'Delhi', value: 15 }, { label: 'Pune', value: 9 }, { label: 'Other', value: 34 }]} />
        </Widget>
        <Widget title="Regions you cover">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{REGIONS.map((r) => <Chip key={r} selected={p.regions.includes(r)} onClick={() => setProfile({ regions: p.regions.includes(r) ? p.regions.filter((x) => x !== r) : [...p.regions, r] })}>{r}</Chip>)}</div>
        </Widget>
      </>)}

      {screen === 'payout' && (<>
        <div className="stack gap8"><span className="t-h1">Where should we pay you?</span><span className="t-b2">Monthly, for stays that are completed.</span></div>
        <SegmentedControl size="lg" aria-label="Payout method" value={p.payMode} onChange={(v) => { setTouched(false); setProfile({ payMode: v as 'upi' | 'bank' }); }} options={[{ value: 'upi', label: 'UPI' }, { value: 'bank', label: 'Bank account' }]} />
        <Widget title={p.payMode === 'upi' ? 'UPI and tax' : 'Bank and tax'}>
          <div className="stack gap12">
            {p.payMode === 'upi'
              ? <TextField label="UPI ID" value={p.upi} icon="qr_code" error={err('upi')} onChange={(e) => setProfile({ upi: e.target.value })} />
              : <><TextField label="Account number" placeholder="0000 0000 0000" inputMode="numeric" value={p.account} error={err('account')} onChange={(e) => setProfile({ account: e.target.value })} />
                <TextField label="IFSC" placeholder="HDFC0000000" value={p.ifsc} error={err('ifsc')} onChange={(e) => setProfile({ ifsc: e.target.value.toUpperCase() })} /></>}
            <TextField label="PAN" value={p.pan} hint="Needed for TDS" error={err('pan')} onChange={(e) => setProfile({ pan: e.target.value.toUpperCase() })} />
            <TextField label="GSTIN (optional)" placeholder="If registered" value={p.gstin} error={err('gstin')} onChange={(e) => setProfile({ gstin: e.target.value.toUpperCase() })} />
          </div>
        </Widget>
      </>)}

      {screen === 'terms' && (<>
        <div className="stack gap8"><span className="t-h1">How you earn</span><span className="t-b2">Illustrative ₹20,000 booking. Rates vary by hotel.</span></div>
        <Widget title="Booking value ₹20,000">
          <DonutChart size={180} aria-label="Booking split" center={formatINR(split.creator)} sub="your share" segments={[
            { label: 'Hotel keeps', value: split.hotelReceives, color: 'var(--chart-6)' },
            { label: 'You earn', value: split.creator, color: 'var(--chart-1)' },
            { label: 'StayStory', value: split.staystory, color: 'var(--chart-5)' },
          ]} />
        </Widget>
        <Widget title="Disclosure">
          <Checkbox checked={p.agree} onChange={(v) => setProfile({ agree: typeof v === 'boolean' ? v : !p.agree })} label="I'll label StayStory links as paid partnerships and accept the creator terms" />
        </Widget>
      </>)}

      {screen === 'done' && (
        <div style={{ paddingTop: 120 }}><EmptyState icon="verified" title="You're set, Anaya">Send us your first reel and we'll turn it into a bookable trip.</EmptyState></div>
      )}
    </div>
    <div className="cta">
      <Button variant="primary" size="lg" block iconRight={screen === 'done' ? 'add' : 'arrow_forward'} disabled={disabled} onClick={next}>{CTA[screen]}</Button>
      {screen === 'done' && <Button variant="secondary" size="lg" block onClick={() => go('app', 'insights')}>Go to dashboard</Button>}
    </div>
  </>);
}
