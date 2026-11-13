import { useRef, useState } from 'react';
import { formatINR, splitCommission } from '@staystory/core';
import { Badge, Banner, Button, Chip, DataTable, DonutChart, EmptyState, Icon, IconButton, SegmentedControl, Select, Stepper, TextField, Toggle, Widget } from '@staystory/ui';
import { market, useMarket, type HotelProfile, type MarketState } from '@staystory/market';
import { Heading } from '../components';
import type { Go } from '../actions';
import { asset, payoutErrors, type PayoutFields } from '../lib';
import { toast, ui, useDraft } from '../ui';

export const ONBOARD_STEPS = ['property', 'rooms', 'commission', 'payouts', 'review', 'submitted'];
const LABELS = ['Property', 'Rooms', 'Commission', 'Payouts', 'Review'];
const PANELS = [
  ['haveli', 'Get booked by the creators your guests follow', 'List once. You pay only when a guest completes their stay.'],
  ['haveli', 'Your rooms, in their reels', 'Connect your channel manager so every creator trip shows live rates.'],
  ['palace', 'Pay for guests, not reach', 'Commission is split between the creator who inspired the trip and StayStory.'],
  ['palace', 'Weekly payouts, clean invoices', 'Settlements arrive every Monday with a GST invoice.'],
  ['haveli', 'Almost there', 'Our partner team reviews every property to keep trips trustworthy.'],
  ['haveli', 'Welcome to StayStory', 'Your console is ready with sample data while we verify.'],
] as const;
const CATEGORIES = [{ value: 'heritage', label: 'Heritage boutique' }, { value: 'palace', label: 'Palace hotel' }, { value: 'resort', label: 'Resort' }, { value: 'homestay', label: 'Homestay' }];
const CAT_SUMMARY: Record<string, string> = { heritage: 'Heritage haveli', palace: 'Palace hotel', resort: 'Resort', homestay: 'Homestay' };
const MEALS = ['Room only', 'Breakfast', 'Half board', 'Full board'].map((m) => ({ value: m, label: m }));
const MAX_PHOTOS = 8;
const DESC = 'A restored 18th-century haveli on the banks of Lake Pichola, with lake-view rooms, a jharokha suite and a rooftop that faces the City Palace.';

interface Room { id: string; name: string; count: number; sleeps: number; rackRate: number; meal: string }
interface Draft extends Required<Pick<HotelProfile, 'category' | 'description' | 'legalName' | 'gstin' | 'pan' | 'billingEmail' | 'accountNumber' | 'ifsc'>> {
  name: string; cityLine: string; totalRooms: string; photos: string[]; rooms: Room[]; sync: 'api' | 'manual'; pct: number;
  policies: { payOnComplete: boolean; exclusiveRates: boolean; gapNight: boolean };
}
/** The form starts from what the store already knows about the hotel; the design's sample values fill the gaps. */
const fromStore = (s: MarketState): Draft => {
  const p = s.hotel.profile ?? {};
  return {
    name: s.hotel.name, cityLine: `${s.hotel.city}${p.region ? `, ${p.region}` : s.hotel.city === 'Udaipur' ? ', Rajasthan' : ''}`, category: p.category ?? 'heritage',
    totalRooms: String(p.totalRooms ?? s.hotel.rooms.reduce((n, r) => n + r.count, 0)), description: p.description ?? DESC,
    photos: p.photos ?? [asset('verandah'), asset('haveli'), asset('haveli')],
    rooms: s.hotel.rooms.map((r) => ({ ...r })), sync: s.hotel.syncMode, pct: s.hotel.commissionPct,
    policies: p.policies ?? { payOnComplete: true, exclusiveRates: true, gapNight: true },
    legalName: p.legalName ?? 'Jheel Heritage Hotels Pvt. Ltd.', gstin: p.gstin ?? '08ABCDE1234F1Z5', pan: p.pan ?? 'ABCDE1234F', billingEmail: p.billingEmail ?? 'accounts@haveli-jheel.in',
    accountNumber: p.accountNumber ?? '', ifsc: p.ifsc ?? 'HDFC00012',
  };
};
const toPayout = (d: Draft): PayoutFields => ({ legalName: d.legalName, gstin: d.gstin, pan: d.pan, billingEmail: d.billingEmail, accountNumber: d.accountNumber, ifsc: d.ifsc });
const propertyErrors = (d: Draft, strict: boolean) => {
  const e: { name?: string; city?: string; total?: string } = {};
  if (!d.name.trim()) e.name = 'Enter the property name';
  if (!d.cityLine.trim()) e.city = 'Enter the city';
  if (!/^\d+$/.test(d.totalRooms.trim()) || Number(d.totalRooms) < 1) { if (strict || d.totalRooms.trim()) e.total = 'Enter the number of rooms, at least 1'; }
  return e;
};

function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 360 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    img.src = url;
  });
}

export function Onboarding({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const [d, patch, clear] = useDraft<Draft>('onboarding', () => fromStore(s));
  const [tried, setTried] = useState<Record<string, boolean>>({});
  const [photoMsg, setPhotoMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const i = ONBOARD_STEPS.indexOf(screen);
  const to = (k: number) => go('onboarding', ONBOARD_STEPS[k]);
  const [img, title, body] = PANELS[i]!;

  const split = splitCommission(20000, d.pct);
  const interest = d.pct >= 16 ? 'high' : d.pct >= 12 ? 'average' : 'low';
  const prop = propertyErrors(d, !!tried.property);
  const pay = payoutErrors(toPayout(d), !!tried.payouts);

  const stepValid = (step: string): boolean => {
    if (step === 'property') return Object.keys(propertyErrors(d, true)).length === 0;
    if (step === 'rooms') return d.rooms.length > 0;
    if (step === 'payouts') return Object.keys(payoutErrors(toPayout(d), true)).length === 0;
    return true;
  };
  const commit = (extra: Partial<MarketState['hotel']> = {}) => {
    market.dispatch({
      type: 'hotel/update',
      patch: {
        name: d.name.trim(), city: d.cityLine.split(',')[0]!.trim(), commissionPct: d.pct, syncMode: d.sync,
        rooms: d.rooms.map((r) => ({ id: r.id, name: r.name, count: r.count, sleeps: r.sleeps, rackRate: r.rackRate, meal: r.meal })),
        profile: {
          region: d.cityLine.split(',').slice(1).join(',').trim() || undefined, category: d.category, description: d.description, totalRooms: Number(d.totalRooms) || undefined, photos: d.photos,
          legalName: d.legalName, gstin: d.gstin, pan: d.pan, billingEmail: d.billingEmail, accountNumber: d.accountNumber, ifsc: d.ifsc, policies: d.policies,
        },
        ...extra,
      },
    });
  };
  const badStep = ['property', 'rooms', 'payouts'].find((st) => !stepValid(st));
  const focusInvalid = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('main [aria-invalid="true"], main .lu-field.has-error input, main .lu-field.is-error input')?.focus());

  const next = () => {
    if (screen === 'submitted') return go('console', 'overview');
    if (screen === 'review') {
      const bad = ['property', 'rooms', 'payouts'].find((st) => !stepValid(st));
      if (bad) { setTried((t) => ({ ...t, property: true, payouts: true, submit: true })); return; }
      commit({ status: 'submitted' }); clear(); to(5); return;
    }
    if (!stepValid(screen)) { setTried((t) => ({ ...t, [screen]: true })); focusInvalid(); return; }
    commit(); to(i + 1);
  };
  const saveExit = () => { commit(); toast('Progress saved. Pick up where you left off from the account menu'); go('console', 'overview'); };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - d.photos.length;
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const msgs: string[] = [];
    if (imgs.length < files.length) msgs.push('Only image files can be added.');
    if (imgs.length > room) msgs.push(`You can add up to ${MAX_PHOTOS} photos. ${room > 0 ? `The first ${room} were added.` : 'Remove one to add another.'}`);
    const urls: string[] = [];
    for (const f of imgs.slice(0, Math.max(0, room))) { try { urls.push(await shrink(f)); } catch { msgs.push(`${f.name} could not be read.`); } }
    if (urls.length) patch({ photos: [...d.photos, ...urls] });
    setPhotoMsg(msgs.join(' '));
    if (file.current) file.current.value = '';
  };

  // Add room type form
  const [rf, setRf] = useState({ name: '', count: '4', sleeps: '2', rate: '', meal: 'Breakfast' });
  const [rfTried, setRfTried] = useState(false);
  const rfErr = {
    name: rf.name.trim() ? '' : 'Enter a room type name',
    count: /^\d+$/.test(rf.count) && +rf.count >= 1 ? '' : 'At least 1 room',
    sleeps: /^\d+$/.test(rf.sleeps) && +rf.sleeps >= 1 ? '' : 'At least 1 guest',
    rate: /^\d+$/.test(rf.rate.replace(/[,₹\s]/g, '')) && +rf.rate.replace(/[,₹\s]/g, '') >= 500 ? '' : 'Enter a rate of ₹500 or more',
  };
  const rfOk = !Object.values(rfErr).some(Boolean);
  const addRoom = () => {
    setRfTried(true);
    if (!rfOk) return;
    const count = +rf.count;
    const room: Room = { id: `room-${Date.now().toString(36)}`, name: rf.name.trim(), count, sleeps: +rf.sleeps, rackRate: +rf.rate.replace(/[,₹\s]/g, ''), meal: rf.meal };
    patch({ rooms: [...d.rooms, room], totalRooms: String((Number(d.totalRooms) || 0) + count) });
    setRf({ name: '', count: '4', sleeps: '2', rate: '', meal: 'Breakfast' }); setRfTried(false); setAdding(false);
    toast(`${room.name} added. ${d.rooms.length + 1} room types`, { action: 'Undo', onAction: () => removeRoom(room.id, count) });
  };
  const removeRoom = (id: string, count: number) => { const cur = ui.get().drafts.onboarding as Draft | undefined; if (!cur) return; patch({ rooms: cur.rooms.filter((r) => r.id !== id), totalRooms: String(Math.max(0, (Number(cur.totalRooms) || 0) - count)) }); };

  const roomRows = d.rooms.map((r) => ({ name: r.name, count: String(r.count), sleeps: String(r.sleeps), rate: formatINR(r.rackRate), meal: r.meal, id: r.id }));
  const summary = [
    { k: 'Property', v: `${d.name}, ${d.cityLine.split(',')[0]}`, d: `${CAT_SUMMARY[d.category] ?? 'Property'} · ${d.totalRooms} rooms`, step: 0 },
    { k: 'Inventory', v: d.sync === 'api' ? 'Channel manager' : 'Manual allotment', d: `${d.rooms.length} room types`, step: 1 },
    { k: 'Commission', v: `${d.pct}% on completed stays`, d: d.policies.gapNight && d.policies.exclusiveRates ? 'Gap Night and exclusives on' : [d.policies.gapNight ? 'Gap Night on' : 'Gap Night off', d.policies.exclusiveRates ? 'exclusives on' : 'exclusives off'].join(', '), step: 2 },
    { k: 'Payouts', v: 'Weekly to bank', d: `GSTIN ${d.gstin}`, step: 3 },
  ];
  const text = (label: string, key: keyof Draft, extra: Record<string, unknown> = {}) => (
    <TextField label={label} value={String(d[key] ?? '')} onChange={(e) => patch({ [key]: e.target.value } as Partial<Draft>)} {...extra} />
  );
  const upper = (label: string, key: 'gstin' | 'pan' | 'ifsc', max: number) => (
    <TextField label={label} value={d[key]} maxLength={max} spellCheck={false} onChange={(e) => patch({ [key]: e.target.value.toUpperCase().replace(/\s/g, '') } as Partial<Draft>)} error={pay[key]} />
  );

  return (
    <div style={{ boxSizing: 'border-box', minHeight: '100vh', background: 'var(--canvas)', fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', display: 'flex', flexWrap: 'wrap', gap: 20, padding: 20 }}>
      <aside style={{ flex: '1 1 360px', maxWidth: 480, minHeight: 320, position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex' }}>
        <img src={asset(img)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'relative', margin: 'auto 16px 16px', padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--glass-card)', backdropFilter: 'blur(var(--blur-chrome))', border: '1px solid var(--glass-edge)', display: 'flex', flexDirection: 'column', gap: 8, width: 'calc(100% - 32px)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="home_work" size={20} /><span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>StayStory for hotels</span></div>
          <span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>{title}</span>
          <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{body}</span>
        </div>
      </aside>

      <main style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 32px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {LABELS.map((label, k) => (
              <Chip key={label} selected={k === i} icon={k < i || screen === 'submitted' ? 'check_circle' : 'radio_button_unchecked'} onClick={() => to(k)}>{label}</Chip>
            ))}
          </div>
          <Button variant="tertiary" icon="save" onClick={saveExit}>Save and exit</Button>
        </div>

        <div style={{ maxWidth: 760, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {screen === 'property' && (<>
            <Heading t="Tell us about your property" d="Creators and travelers see this on every trip that features you." />
            <Widget title="Basics">
              <div className="form-grid">
                {text('Property name', 'name', { error: prop.name })}
                {text('City', 'cityLine', { icon: 'location_on', error: prop.city })}
                <Select label="Category" value={d.category} onChange={(v) => patch({ category: v })} options={CATEGORIES} />
                {text('Total rooms', 'totalRooms', { inputMode: 'numeric', error: prop.total })}
              </div>
            </Widget>
            <Widget title="Description and photos" subtitle={`${d.photos.length} of ${MAX_PHOTOS} photos added`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <TextField label="Short description" multiline value={d.description} onChange={(e) => patch({ description: e.target.value })} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  {d.photos.map((p, k) => (
                    <div className="ph" key={`${k}-${p.slice(-24)}`}>
                      <img src={p} alt={`Property photo ${k + 1}`} />
                      <span className="rm"><IconButton icon="close" label={`Remove photo ${k + 1}`} variant="white" size="sm" onClick={() => patch({ photos: d.photos.filter((_, j) => j !== k) })} /></span>
                    </div>
                  ))}
                  <input ref={file} type="file" accept="image/*" multiple hidden aria-label="Choose photos" onChange={(e) => void addPhotos(e.target.files)} />
                  <Button variant="secondary" icon="add_photo_alternate" disabled={d.photos.length >= MAX_PHOTOS} onClick={() => file.current?.click()}>Add photos</Button>
                </div>
                {photoMsg && <span className="err" role="alert">{photoMsg}</span>}
              </div>
            </Widget>
          </>)}

          {screen === 'rooms' && (<>
            <Heading t="Rooms and inventory" d="How should StayStory see your availability?" />
            <SegmentedControl size="lg" aria-label="Inventory source" value={d.sync} onChange={(v) => patch({ sync: v as 'api' | 'manual' })}
              options={[{ value: 'api', label: 'Channel manager', icon: 'sync' }, { value: 'manual', label: 'Manage manually', icon: 'edit_calendar' }]} />
            {d.sync === 'api'
              ? <Banner tone="success" icon="sync" title="Channel manager connected">Rates and availability sync every 5 minutes. {d.rooms.length} room types found.</Banner>
              : <Banner tone="warning" icon="edit_calendar" title="You will update availability yourself">Open the console each day to confirm unsold rooms. Switch back to the channel manager any time.</Banner>}
            <Widget title="Room types" count={d.rooms.length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ overflowX: 'auto' }}>
                  <DataTable rows={roomRows} columns={[{ key: 'name', label: 'Room type' }, { key: 'count', label: 'Rooms', align: 'right' }, { key: 'sleeps', label: 'Sleeps', align: 'right' }, { key: 'rate', label: 'Rack rate', align: 'right' }, { key: 'meal', label: 'Meal plan' }
                  ]} />
                </div>
                {d.rooms.length === 0 && <span className="err" role="alert">Add at least one room type to continue.</span>}
                {adding ? (
                  <div className="col g12" style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                    <div className="form-grid">
                      <TextField label="Room type name" value={rf.name} onChange={(e) => setRf({ ...rf, name: e.target.value })} error={rfTried ? rfErr.name : undefined} />
                      <Select label="Meal plan" value={rf.meal} onChange={(v) => setRf({ ...rf, meal: v })} options={MEALS} />
                      <TextField label="Number of rooms" inputMode="numeric" value={rf.count} onChange={(e) => setRf({ ...rf, count: e.target.value })} error={rfTried ? rfErr.count : undefined} />
                      <TextField label="Sleeps" inputMode="numeric" value={rf.sleeps} onChange={(e) => setRf({ ...rf, sleeps: e.target.value })} error={rfTried ? rfErr.sleeps : undefined} />
                      <TextField label="Rack rate a night" inputMode="numeric" placeholder="₹8,900" value={rf.rate} onChange={(e) => setRf({ ...rf, rate: e.target.value })} error={rfTried ? rfErr.rate : undefined} />
                    </div>
                    <div className="row g8"><Button variant="primary" icon="add" onClick={addRoom}>Add room type</Button><Button variant="tertiary" onClick={() => { setAdding(false); setRfTried(false); }}>Cancel</Button></div>
                  </div>
                ) : (
                  <div><Button variant="ghost" icon="add" onClick={() => setAdding(true)}>Add room type</Button></div>
                )}
              </div>
            </Widget>
          </>)}

          {screen === 'commission' && (<>
            <Heading t="Commission terms" d="Only on completed stays. Higher rates make creators more likely to feature you." />
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <Widget title="Acquisition commission" subtitle="Split between the creator and StayStory" style={{ flex: '1 1 280px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 28, lineHeight: '39px', fontWeight: 700 }}>{d.pct}%</span>
                    <Stepper value={d.pct} min={8} max={25} onChange={(v) => patch({ pct: v })} aria-label="Commission percent" /></div>
                  <div><Badge tone={interest === 'high' ? 'success' : interest === 'average' ? 'warning' : 'danger'} icon="groups">Creator interest: {interest}</Badge></div>
                </div>
              </Widget>
              <Widget title="On a ₹20,000 booking" style={{ flex: '1 1 280px' }}>
                <DonutChart size={160} aria-label="Booking split" center={formatINR(split.hotelReceives)} sub="you receive"
                  segments={[{ label: 'You receive', value: split.hotelReceives, color: 'var(--chart-1)' }, { label: 'Creator', value: split.creator, color: 'var(--chart-2)' }, { label: 'StayStory', value: split.staystory, color: 'var(--chart-5)' }]} />
              </Widget>
            </div>
            <Widget title="Policies">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Toggle checked={d.policies.payOnComplete} onChange={(v) => patch({ policies: { ...d.policies, payOnComplete: v } })} label="Pay only on completed stays" />
                <Toggle checked={d.policies.exclusiveRates} onChange={(v) => patch({ policies: { ...d.policies, exclusiveRates: v } })} label="Allow creator-exclusive rates" />
                <Toggle checked={d.policies.gapNight} onChange={(v) => patch({ policies: { ...d.policies, gapNight: v } })} label="Release unsold rooms as Gap Night above a floor price" />
              </div>
            </Widget>
          </>)}

          {screen === 'payouts' && (<>
            <Heading t="Payouts and tax" d="Guests pay StayStory. We settle weekly, minus commission, with a GST invoice." />
            <Widget title="Legal entity">
              <div className="form-grid">
                <TextField label="Registered name" value={d.legalName} onChange={(e) => patch({ legalName: e.target.value })} error={pay.legalName} />
                {upper('GSTIN', 'gstin', 15)}
                {upper('PAN', 'pan', 10)}
                <TextField label="Billing email" icon="mail" value={d.billingEmail} onChange={(e) => patch({ billingEmail: e.target.value })} error={pay.billingEmail} />
              </div>
            </Widget>
            <Widget title="Bank account">
              <div className="form-grid">
                <TextField label="Account number" aria-label="Account number" placeholder="0000 0000 0000" inputMode="numeric" value={d.accountNumber} onChange={(e) => patch({ accountNumber: e.target.value.replace(/[^\d\s]/g, '') })} error={pay.accountNumber} />
                {upper('IFSC', 'ifsc', 11)}
              </div>
            </Widget>
          </>)}

          {screen === 'review' && (<>
            <Heading t="Review and submit" d="We verify new properties within 24 to 48 hours." />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {summary.map((x) => (
                <Widget key={x.k} title={x.k} subtitle={x.d}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>{x.v}</span>
                    <Button variant="ghost" size="sm" icon="edit" onClick={() => to(x.step)}>Edit</Button>
                  </div>
                </Widget>
              ))}
            </div>
            {tried.submit && badStep && (
              <Banner tone="danger" icon="error" title="Some details need attention" action={<Button variant="secondary" size="sm" onClick={() => { to(ONBOARD_STEPS.indexOf(badStep)); focusInvalid(); }}>Fix {badStep === 'rooms' ? 'room types' : badStep}</Button>}>
                {badStep === 'payouts' ? 'Check the GSTIN, PAN, account number and IFSC.' : badStep === 'rooms' ? 'Add at least one room type.' : 'Check the property name, city and number of rooms.'}
              </Banner>
            )}
          </>)}

          {screen === 'submitted' && (
            <div style={{ padding: '64px 0' }}>
              <EmptyState icon="verified_user" title="Submitted for review">We'll email {s.hotel.profile?.billingEmail ?? d.billingEmail} within 48 hours. Meanwhile, explore the console with sample data.</EmptyState>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 8 }}>
            <Button variant="tertiary" size="lg" icon="arrow_back" disabled={i === 0} onClick={() => to(Math.max(0, i - 1))}>Back</Button>
            <Button variant="primary" size="lg" iconRight={screen === 'review' ? 'send' : 'arrow_forward'} onClick={next}>
              {screen === 'review' ? 'Submit for review' : screen === 'submitted' ? 'Open hotel console' : 'Continue'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
