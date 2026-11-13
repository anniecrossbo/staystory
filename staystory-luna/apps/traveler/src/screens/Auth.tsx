import { useEffect, useRef, useState } from 'react';
import { Avatar, Banner, Button, Chip, EmptyState, Icon, IconButton, ProgressBar, SegmentedControl, TextField, Toggle } from '@staystory/ui';
import { asset, go } from '../lib';
import { useSession } from '../session';
import { ToastHost, useEscape } from '../ui';

export const AUTH_SCREENS = ['welcome', 'phone', 'otp', 'otpError', 'prefs', 'done'];
const ORDER = ['welcome', 'phone', 'otp', 'prefs', 'done'];
const DEMO_CODE = '123456';
const STYLES = [['Heritage', 'account_balance'], ['Lakes', 'water'], ['Beaches', 'beach_access'], ['Mountains', 'landscape'], ['Food', 'restaurant'], ['Slow towns', 'local_cafe']];
const BUDGETS = [{ value: 'low', label: 'Under ₹2k' }, { value: 'mid', label: '₹2k to ₹5k' }, { value: 'high', label: '₹5k plus' }];
const step = { fontSize: 28, lineHeight: '39px', fontWeight: 700 } as const;
const sub = { fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' } as const;
const cap = { fontSize: 11, lineHeight: '15px', color: 'var(--muted)' } as const;

export function Auth({ screen }: { screen: string }) {
  const { s, me, dispatch, ui, flash } = useSession();
  const ctx = ui.auth;
  const trip = s.trips.find((t) => t.id === ctx.tripId) ?? s.trips.find((t) => t.id === 'anaya-udaipur') ?? s.trips[0]!;
  const creator = s.creators[ctx.creatorId ?? trip.creatorId]!;
  const first = creator.name.split(' ')[0]!;
  const myFirst = me.name.split(' ')[0]!;
  const to = (sc: string) => go('auth', sc);
  const idx = Math.max(1, ORDER.indexOf(screen === 'otpError' ? 'otp' : screen));
  const [phone, setPhone] = useState(me.whatsapp || '+91 98200 00000');
  const [phoneErr, setPhoneErr] = useState('');
  const [code, setCode] = useState(screen === 'otpError' ? '482190' : screen === 'otp' ? '48219' : '');
  const [styles, setStyles] = useState<string[]>(me.prefs.styles);
  const [budget, setBudget] = useState<string>(me.prefs.budget);
  const [gapAlerts, setGapAlerts] = useState(me.prefs.gapAlerts);
  const [secs, setSecs] = useState(24);
  const input = useRef<HTMLInputElement>(null);
  const inOtp = screen === 'otp' || screen === 'otpError';

  // Deep links to `otp` and `otpError` start prefilled as in the design. Entering the step normally starts empty,
  // and moving between `otp` and `otpError` keeps what was typed.
  const prev = useRef(screen);
  useEffect(() => {
    const was = prev.current === 'otp' || prev.current === 'otpError';
    if (!was && inOtp) { setCode(''); setSecs(24); }
    prev.current = screen;
  }, [screen, inOtp]);
  useEffect(() => { if (!inOtp) return; const i = setInterval(() => setSecs((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(i); }, [inOtp]);
  useEffect(() => { if (inOtp) input.current?.focus(); }, [inOtp]);

  const leave = () => { window.location.hash = ctx.backTo; };
  useEscape(() => { if (screen === 'welcome') leave(); else if (screen === 'done') go('discover', 'feed'); else to(ORDER[idx - 1] ?? 'welcome'); });

  const verify = () => {
    if (code !== DEMO_CODE) { to('otpError'); return; }
    dispatch({ type: 'traveler/patch', id: me.id, patch: { signedIn: true, whatsapp: phone.trim() } });
    // Finish what the traveler came to do: save the trip or the shop.
    if (ctx.reason === 'save' && ctx.tripId && !me.savedTripIds.includes(ctx.tripId)) dispatch({ type: 'traveler/save', id: me.id, tripId: ctx.tripId, on: true });
    if (ctx.reason === 'shop' && ctx.creatorId && !me.savedShopIds.includes(ctx.creatorId)) dispatch({ type: 'traveler/saveShop', id: me.id, creatorId: ctx.creatorId });
    to('prefs');
  };
  const sendCode = () => { if (phone.replace(/\D/g, '').length < 10) { setPhoneErr('Enter a 10-digit WhatsApp number'); return; } setPhoneErr(''); to('otp'); };
  const resend = () => {
    if (secs > 0) { flash(`You can ask for a new code in 0:${String(secs).padStart(2, '0')}`); return; }
    setSecs(24); setCode(''); flash('New code sent on WhatsApp'); if (screen === 'otpError') to('otp'); input.current?.focus();
  };
  const typeCode = (raw: string) => { setCode(raw.replace(/\D/g, '').slice(0, 6)); if (screen === 'otpError') to('otp'); };
  const savePrefs = () => { dispatch({ type: 'traveler/patch', id: me.id, patch: { prefs: { ...me.prefs, styles, budget: budget as 'low' | 'mid' | 'high', gapAlerts } } }); to('done'); };

  const welcome = {
    save: [`Save ${first}’s trip and come back to it`, `Sign in with WhatsApp in 20 seconds. We’ll message you if the price drops or rooms run low, and ${first} still gets the credit when you book.`],
    shop: [`Save ${first}’s shop and come back to it`, `Sign in with WhatsApp in 20 seconds. We’ll message you when ${first} adds trips, and ${first} still gets the credit when you book.`],
    checkout: [`Sign in to book ${first}’s trip`, `Sign in with WhatsApp in 20 seconds. Your choices are kept, vouchers arrive on WhatsApp, and ${first} still gets the credit when you book.`],
    tab: ['Sign in to see your trips', 'Sign in with WhatsApp in 20 seconds. Your trips, saved places and price alerts live here, and vouchers arrive on WhatsApp.'],
    signin: ['Sign in to StayStory', 'Sign in with WhatsApp in 20 seconds. Your trips, saved places and price alerts live here, and vouchers arrive on WhatsApp.'],
  }[ctx.reason];
  const done = {
    save: [`${first}’s ${trip.place} trip is saved. We’ll WhatsApp you if the price drops on your dates.`, `Open the ${trip.place} trip`],
    shop: [`${first}’s shop is saved. We’ll WhatsApp you when new trips land.`, `Back to ${first}’s shop`],
    checkout: ['Your choices are kept. Pick up where you left off and pay when you are ready.', 'Continue to checkout'],
    tab: ['We’ll WhatsApp you if prices drop on trips you save.', 'Continue'],
    signin: ['We’ll WhatsApp you if prices drop on trips you save.', 'Continue'],
  }[ctx.reason];

  return (<>
    {screen === 'welcome' && (
      <div className="flex-page" style={{ gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, flexShrink: 0 }}>
          <Icon name="home_work" size={24} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>StayStory</span>
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 160, borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <img src={asset(trip.img)} alt={`Illustrated ${trip.place}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--glass-bar)', backdropFilter: 'blur(var(--blur-chrome))', border: '1px solid var(--glass-edge)' }}>
            <Avatar initials={creator.ini} size={34} />
            <span style={{ display: 'flex', flexDirection: 'column' }}><span className="t13">{creator.handle} shared a trip</span><span className="m11">{trip.title}</span></span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <span style={step}>{welcome[0]}</span>
          <span style={sub}>{welcome[1]}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <Button variant="primary" size="lg" block icon="chat" onClick={() => to('phone')}>Continue with WhatsApp</Button>
          <Button variant="secondary" size="lg" block onClick={leave}>Not now, keep browsing</Button>
        </div>
      </div>
    )}

    {['phone', 'otp', 'otpError', 'prefs'].includes(screen) && (
      <div className="flex-page" style={{ gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44, flexShrink: 0 }}>
          <IconButton icon="arrow_back" label="Back" variant="white" onClick={() => to(ORDER[idx - 1] ?? 'welcome')} />
          <div style={{ flex: 1 }}><ProgressBar value={idx * 25} aria-label="Sign-in progress" /></div>
          <span style={{ fontSize: 11, lineHeight: '15px', fontWeight: 600, color: 'var(--muted)' }}>{idx} of 3</span>
        </div>

        {screen === 'phone' && (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={step}>Your WhatsApp number</span><span style={sub}>We’ll send a code on WhatsApp. Price alerts, vouchers and trip updates arrive there too.</span></div>
          <TextField label="WhatsApp number" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneErr(''); }} icon="call" hint="Creators never see your number" error={phoneErr || undefined} inputMode="tel" autoComplete="tel" onKeyDown={(e) => e.key === 'Enter' && sendCode()} />
          <span style={cap}>By continuing you agree to the Terms and Privacy Policy.</span>
          <div style={{ marginTop: 'auto' }}><Button variant="primary" size="lg" block onClick={sendCode}>Send code</Button></div>
        </>)}

        {inOtp && (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={step}>Enter the 6-digit code</span><span style={sub}>Sent on WhatsApp to {phone}</span></div>
          <div className="otp-wrap">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const err = screen === 'otpError', active = !err && i === code.length;
              return <span key={i} aria-hidden="true" style={{ flex: 1, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: `1.5px solid ${err ? 'var(--danger-strong)' : active ? 'var(--primary)' : 'var(--border)'}`, boxShadow: active ? '0 0 0 3px var(--primary-ring)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>{code[i] ?? ''}</span>;
            })}
            <input ref={input} inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" value={code} onChange={(e) => typeCode(e.target.value)}
              onPaste={(e) => { e.preventDefault(); typeCode(e.clipboardData.getData('text')); }} onKeyDown={(e) => e.key === 'Enter' && verify()} />
          </div>
          {screen === 'otpError' && <Banner tone="danger" icon="error" title="That code doesn't match">Check the latest WhatsApp message, or resend a new code.</Banner>}
          <Button variant="ghost" icon="refresh" onClick={resend}>{secs > 0 ? `Resend code in 0:${String(secs).padStart(2, '0')}` : 'Resend code'}</Button>
          {import.meta.env.DEV && <span style={cap}>Demo build: the code is {DEMO_CODE}.</span>}
          <div style={{ marginTop: 'auto' }}><Button variant="primary" size="lg" block onClick={verify}>Verify</Button></div>
        </>)}

        {screen === 'prefs' && (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={step}>How do you like to travel?</span><span style={sub}>Used to match trips and Gap Night deals.</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="cap10">Travel style</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STYLES.map(([l, i]) => <Chip key={l} selected={styles.includes(l!)} icon={i} onClick={() => setStyles((x) => (x.includes(l!) ? x.filter((y) => y !== l) : [...x, l!]))}>{l}</Chip>)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="cap10">Budget per night</span>
            <SegmentedControl size="sm" aria-label="Budget" value={budget} onChange={setBudget} options={BUDGETS} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span className="t13">Gap Night alerts</span><span className="m11">Last-minute rooms on trips you saved</span></span>
            <Toggle checked={gapAlerts} onChange={setGapAlerts} aria-label="Gap Night alerts" />
          </div>
          <div style={{ marginTop: 'auto' }}><Button variant="primary" size="lg" block onClick={savePrefs}>Save preferences</Button></div>
        </>)}
      </div>
    )}

    {screen === 'done' && (
      <div className="flex-page" style={{ gap: 20, justifyContent: 'flex-end' }}>
        <EmptyState icon="check_circle" title={`You're in, ${myFirst}`}>{done[0]}</EmptyState>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
          <Button variant="primary" size="lg" block iconRight="arrow_forward" onClick={() => { window.location.hash = ctx.returnTo; }}>{done[1]}</Button>
          <Button variant="secondary" size="lg" block onClick={() => go('discover', 'feed')}>Explore more trips</Button>
        </div>
      </div>
    )}
    <ToastHost />
  </>);
}

