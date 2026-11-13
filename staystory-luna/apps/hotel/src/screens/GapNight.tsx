import { useEffect } from 'react';
import { formatINR } from '@staystory/core';
import { Banner, Button, Chip, Modal, Select, Stepper, Widget } from '@staystory/ui';
import { liveTrips, market, useMarket, type MGapNight } from '@staystory/market';
import { Overlay } from '../components';
import type { Go } from '../actions';
import { asset, AUDIENCE, audienceKeys, GAP_DATES, liveCampaigns, liveGap, matchCount, toWords, unsoldRooms } from '../lib';
import { toast, ui, useUi } from '../ui';
import { gapError, gapRateMax } from '../rules';

export function GapNight({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const { gap } = useUi();
  const set = (p: Partial<typeof gap>) => ui.set({ gap: { ...ui.get().gap, ...p } });
  const g = liveGap(s);

  // Deep link to `released` shows a result even when nothing was released yet.
  useEffect(() => { if (screen === 'released' && !liveGap(market.get())) market.dispatch({ type: 'dev/ensureGap', now: new Date().toISOString() }); }, [screen]);

  const roomType = s.hotel.rooms.find((r) => r.id === gap.room) ?? s.hotel.rooms[0]!;
  const unsold = unsoldRooms(s, roomType.id);
  const mine = s.gapNights.find((x) => x.hotelId === s.hotel.id && x.status === 'live' && x.roomTypeId === roomType.id);
  const frozen = unsold === 0 && !!mine;
  const nights = gap.dates === 'wknd' ? 2 : 1;
  const rooms = frozen ? mine!.rooms : Math.max(1, gap.rooms);
  const rate = frozen ? mine!.rate : gap.rate;
  const floor = s.hotel.floorRate;
  const check = () => gapError({ rooms, unsold, rate, floor, publicRate: roomType.rackRate });
  const error = check();
  const matches = frozen ? mine!.sentTo : matchCount(gap.aud);
  const camp = liveCampaigns(s).find((c) => c.roomTypeId === roomType.id);
  const campRate = camp ? Math.round(camp.creatorPrice / camp.nights) : roomType.rackRate;
  const front = liveTrips(s).find((t) => t.stays.some((x) => x.hotelId === s.hotel.id));
  const fronted = front ? s.creators[front.creatorId]?.handle ?? '@anaya.explores' : '@anaya.explores';
  const dateText = gap.dates === 'wknd' ? toWords(GAP_DATES) : 'tonight';
  const recover = rate * nights * rooms;
  const blocker = unsold === 0 && !mine ? 'No unsold rooms of this type for these dates.' : matches === 0 ? 'No travelers match. Choose at least one audience.' : error;
  const canRelease = !frozen && !blocker && unsold > 0;
  const closeOverlay = () => go('console', 'gap');

  const release = () => {
    const bad = check() ?? (matches === 0 ? 'No travelers match. Choose at least one audience.' : null);
    if (bad) { toast(bad, { tone: 'warning' }); go('console', 'gap'); return; }
    const st = market.get();
    const gn: MGapNight = {
      id: `gap${st.seq.gap}`, hotelId: st.hotel.id, roomTypeId: roomType.id, datesLabel: gap.dates === 'wknd' ? GAP_DATES : 'Tonight', rooms, booked: 0, rate, campaignRate: campRate,
      audience: audienceKeys(gap.aud), sentTo: matches, createdAt: new Date().toISOString(), endsAt: new Date(Date.now() + 48 * 3_600_000).toISOString(), status: 'live',
      tripIds: liveTrips(st).filter((t) => t.stays.some((x) => x.hotelId === st.hotel.id)).map((t) => t.id),
    };
    market.dispatch({ type: 'gap/release', gap: gn });
    toast(`${rooms} room${rooms > 1 ? 's' : ''} released as Gap Night. Alerts sent to ${matches} travelers`);
    go('console', 'released');
  };

  return (<>
    {g && (screen === 'released' || screen === 'gap') && (
      <Banner tone="success" icon="check_circle" title={`${g.rooms} room${g.rooms > 1 ? 's' : ''} released for ${toWords(g.datesLabel)}`}>
        Sent to {g.sentTo} travelers who saved Anaya’s trip. {g.booked > 0 ? `${g.booked} room${g.booked > 1 ? 's' : ''} booked so far.` : 'No rooms booked yet.'}
      </Banner>
    )}
    <div className="lu-grid fill">
      <Widget className="span-2" title="Unsold rooms meet saved demand" subtitle={`${gap.dates === 'wknd' ? toWords(GAP_DATES) : 'Tonight'} · your floor is ${formatINR(floor)} a night`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <Select label="Room type" value={roomType.id}
              onChange={(v) => { const r = s.hotel.rooms.find((x) => x.id === v)!; set({ room: v, rooms: Math.min(gap.rooms, Math.max(1, unsoldRooms(s, v))), rate: Math.min(gap.rate, gapRateMax(r.rackRate)) }); }}
              options={['lake-deluxe', 'courtyard'].map((id) => ({ value: id, label: `${s.hotel.rooms.find((r) => r.id === id)?.name ?? id} · ${unsoldRooms(s, id)} unsold` }))} />
            <Select label="Dates" value={gap.dates} onChange={(v) => set({ dates: v })} options={[{ value: 'wknd', label: 'Sat 19 to Mon 21 Dec' }, { value: 'tonight', label: 'Tonight only' }]} />
        </div>
      </Widget>
      <Widget className="span-1" title="Rooms and rate" subtitle="What you release">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600, color: 'var(--ink-2)' }}>Rooms</span><span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}>{unsold} unsold{mine ? ` · ${mine.rooms} released` : ''}</span></span>
              <Stepper value={rooms} min={frozen ? rooms : 1} max={frozen ? rooms : Math.max(1, unsold)} onChange={(v) => set({ rooms: v })} aria-label="Rooms to release" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600, color: 'var(--ink-2)' }}>Gap Night rate per night</span><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>{formatINR(rate)}</span></span>
              <Stepper value={rate / 100} min={frozen ? rate / 100 : floor / 100} max={frozen ? rate / 100 : gapRateMax(roomType.rackRate) / 100} onChange={(v) => set({ rate: v * 100 })} aria-label="Price in hundreds of rupees" />
            </div>
        </div>
      </Widget>
      <Widget title="What travelers see" subtitle="WhatsApp alert and offer card" className="span-1 row-2">
        <div style={{ position: 'relative', height: '100%', minHeight: 200, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <img src={asset('udaipur')} alt="Lake Pichola at dusk" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', left: 12, right: 12, top: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--glass-card)', backdropFilter: 'blur(var(--blur-chrome))', border: '1px solid var(--glass-edge)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}><span style={{ fontWeight: 600 }}>StayStory · Gap Night</span><span>now</span></div>
            <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{front?.title ?? 'Three days in Udaipur'} just got cheaper</span>
            <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>Anaya’s pick drops to {formatINR(rate)} a night on the dates you saved.</span>
          </div>
        </div>
      </Widget>
      <Widget className="span-2" title="Send to travelers who" subtitle={`${matches} travelers match`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AUDIENCE.map((a) => <Chip key={a.key} selected={frozen ? mine!.audience.includes(a.key) : gap.aud[a.key]} disabled={frozen} onClick={() => { const cur = ui.get().gap.aud; set({ aud: { ...cur, [a.key]: !cur[a.key] } }); }}>{a.label}</Chip>)}
            </div>
        </div>
      </Widget>
      <Widget className="span-1" title="Release" subtitle={`Campaign rate ${formatINR(campRate)}`}>
        <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{matches} travelers match · fronted by {fronted}</span>
        {error && !frozen && <span className="err" role="alert">{error}</span>}
        {blocker && !frozen && !error && <span className="err" role="alert">{blocker}</span>}
        <Button variant="primary" size="lg" block icon="send" disabled={!canRelease} onClick={() => go('console', 'gapConfirm')}>Release {rooms} room{rooms > 1 ? 's' : ''}</Button>
      </Widget>
    </div>

    {screen === 'gapConfirm' && (
      <Overlay side="center" label="Confirm Gap Night release" onClose={closeOverlay}>
        <Modal title={`Release ${rooms} room${rooms > 1 ? 's' : ''} as Gap Night?`} subtitle={`${gap.dates === 'wknd' ? toWords(GAP_DATES) : 'Tonight'} · ${roomType.name}`} layout="dialog" onClose={closeOverlay}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{matches} travelers {gap.aud.saved ? 'who saved Anaya’s Udaipur trip' : 'in your chosen audience'} get a WhatsApp alert now. Booked rooms come off your channel manager automatically. Anaya earns her usual share, so she keeps promoting you.</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: '18px' }}>
              <div className="kv"><span>Rate per night</span><span>{formatINR(rate)}</span></div>
              <div className="kv"><span>Commission</span><span>{s.hotel.commissionPct}% on completed stays</span></div>
              <div className="kv"><span>You could recover</span><span>up to {formatINR(recover)}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="tertiary" onClick={closeOverlay}>Cancel</Button>
              <Button variant="primary" icon="send" disabled={!canRelease} onClick={release}>Release rooms</Button>
            </div>
          </div>
        </Modal>
      </Overlay>
    )}
  </>);
}
