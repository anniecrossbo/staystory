import { useEffect, useState } from 'react';
import { creatorCommission, formatINR, matchesKeyword, withdrawal } from '@staystory/core';
import {
  compactCount, countLabel, creatorBalances, creatorInsights, creatorNotifications, creatorOfferViews, latestPendingBooking, ledgerRows, tripDmCount, tripStats, tripVisitsLine,
  market, reelCaption, reelComments, reelInsights, reelRows, useMarket, type LedgerFilter, type MCreator, type OfferView, type RangeKey,
} from '@staystory/market';
import {
  AIAction, AISummary, Avatar, Badge, Banner, Button, Checkbox, Dock, EmptyState, Icon, IconButton,
  ProgressBar, SegmentedControl, Skeleton, StatTile, Stepper, TextField, Tag, Toggle, Widget,
} from '@staystory/ui';
import { asset, CREATOR_ID } from '../data';
import type { Go } from '../router';
import { useUi } from '../store';
import { payoutErrors } from './Onboard';
import { AreaChart, CloseFooter, Sheet, travelerHref, tripUrl, useCopy } from '../ui';

export const HOME_SCREENS = ['insights', 'empty', 'trip', 'reel', 'earnings', 'withdrawn', 'offers', 'offerDetail', 'counter', 'accepted', 'profile'];
const TAB_OF: Record<string, string> = { insights: 'insights', empty: 'insights', trip: 'insights', reel: 'insights', earnings: 'earnings', withdrawn: 'earnings', offers: 'offers', offerDetail: 'offers', counter: 'offers', accepted: 'offers', profile: 'profile' };
const BACK: Record<string, string> = { trip: 'insights', reel: 'insights', offerDetail: 'offers', counter: 'offerDetail', accepted: 'offers' };
const SUB = ['trip', 'reel', 'offerDetail', 'counter', 'accepted'];
const NOTE: Record<string, string> = { 'winter-pichola': 'My Udaipur audience books for Christmas week. Could we run this through January?' };
const DOCK_BASE = [{ id: 'insights', icon: 'dashboard', label: 'Dashboard' }, { id: 'earnings', icon: 'account_balance_wallet', label: 'Earnings' }, { id: 'offers', icon: 'redeem', label: 'Offers' }, { id: 'profile', icon: 'person', label: 'Profile' }];
const shortDate = (iso: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(iso));
const words = ['no', 'one', 'two', 'three', 'four', 'five'];

export function Home({ screen, go, q }: { screen: string; go: Go; q: URLSearchParams }) {
  const s = useMarket();
  const ui = useUi();
  const { profile, flash } = ui;
  const views = creatorOfferViews(s, CREATOR_ID);
  const offer = views.find((o) => o.campaign.id === q.get('o')) ?? views[0];
  const myTrips = s.trips.filter((t) => t.creatorId === CREATOR_ID);
  const trip = myTrips.find((t) => t.id === q.get('t')) ?? myTrips[0];
  const bal = creatorBalances(s, CREATOR_ID);
  const to = (sc: string, params?: Record<string, string>) => go('app', sc, params);
  const sub = SUB.includes(screen);
  const creatorHandle = s.creators[CREATOR_ID]?.handle ?? '@anaya.explores';
  const [sheet, setSheet] = useState<null | 'notifications' | 'decline' | 'withdraw' | 'handle' | 'channels' | 'payout' | 'tax' | 'bio' | 'prefs'>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [counter, setCounter] = useState<{ id: string; pct: number; extras: boolean[]; message: string; tried: boolean } | null>(null);
  const copy = useCopy();
  const reelId = (reelRows(s, CREATOR_ID).find((r) => r.id === q.get('r')) ?? reelRows(s, CREATOR_ID)[0])?.id;
  const reelView = reelId ? reelInsights(s, reelId) : undefined;

  // Deep links to a resulting state show that state.
  useEffect(() => {
    if (screen === 'accepted' && offer && offer.status === 'invited') market.dispatch({ type: 'offer/respond', campaignId: offer.campaign.id, creatorId: CREATOR_ID, response: 'accepted' });
    if (screen === 'withdrawn' && !s.withdrawals.some((w) => w.creatorId === CREATOR_ID) && bal.available > 0) doWithdraw();
  }, [screen]);
  useEffect(() => { setSheet(null); }, [screen]);

  const payoutLabel = profile.payMode === 'upi' ? profile.upi : `bank account ending ${profile.account.replace(/\s/g, '').slice(-4) || '0000'}`;
  function doWithdraw() {
    const now = new Date().toISOString();
    market.dispatch({ type: 'creator/withdraw', creatorId: CREATOR_ID, upi: payoutLabel, id: `w${market.get().seq.withdrawal}`, now });
  }

  const notes = creatorNotifications(s, CREATOR_ID, ui.countered);
  const unread = notes.filter((n) => !ui.read.includes(n.id));
  const HEAD: Record<string, [string, string]> = {
    insights: [creatorHandle, 'Dashboard'], empty: ['Welcome, Anaya', 'Dashboard'], trip: [tripUrl(profile.handle, trip?.slug ?? ''), trip?.title ?? 'Trip'],
    reel: [reelView ? `Posted ${reelView.reel.postedLabel}` : creatorHandle, reelView ? `${reelView.reel.place} reel` : 'Reel'],
    earnings: [creatorHandle, 'Earnings'], withdrawn: [creatorHandle, 'Earnings'], offers: [creatorHandle, 'Offers'],
    offerDetail: [offer ? `${offer.city} · ${offer.when}` : 'Offer', offer?.hotelName ?? 'Hotel offers'], counter: [offer?.hotelName ?? '', 'Counter offer'], accepted: [offer ? `${offer.city} · ${offer.when}` : 'Offer', offer?.hotelName ?? 'Hotel offers'], profile: ['Your account', 'Profile'],
  };
  const noteTarget = (id: string): (() => void) => () => {
    const [kind, ref] = id.split(':');
    setSheet(null);
    if (kind === 'offer' || kind === 'counter') to(ui.countered.includes(ref!) && kind === 'counter' ? 'offerDetail' : 'offerDetail', { o: ref! });
    else if (kind === 'withdraw') to('withdrawn');
    else to('earnings');
  };

  const ctaOffer = offer && (
    screen === 'offerDetail' || screen === 'accepted' ? (
      <div className="glass-bar">
        {screen === 'accepted' || offer.status === 'accepted'
          ? <div className="grow1"><Button variant="primary" size="lg" block icon="add" onClick={() => { ui.startNewTrip({ place: offer.city, pickHotelId: offer.campaign.hotelId }); go('create', 'pick'); }}>Build a trip with this stay</Button></div>
          : offer.status === 'invited' ? (<>
            <Button variant="tertiary" size="lg" onClick={() => { setDeclineId(offer.campaign.id); setSheet('decline'); }}>Decline</Button>
            <Button variant="secondary" size="lg" onClick={() => to('counter', { o: offer.campaign.id })}>Counter</Button>
            <div className="grow1"><Button variant="primary" size="lg" block onClick={() => { market.dispatch({ type: 'offer/respond', campaignId: offer.campaign.id, creatorId: CREATOR_ID, response: 'accepted' }); to('accepted', { o: offer.campaign.id }); }}>Accept</Button></div>
          </>) : <div className="grow1"><Button variant="primary" size="lg" block icon="arrow_back" onClick={() => to('offers')}>Back to offers</Button></div>}
      </div>
    ) : null
  );
  const c = offer && screen === 'counter' ? (counter && counter.id === offer.campaign.id ? counter : { id: offer.campaign.id, pct: Math.min(25, offer.commissionPct + 2), extras: [true, false], message: NOTE[offer.campaign.id] ?? `My ${offer.city} audience books early for the season. Could we agree on this rate?`, tried: false }) : null;
  const counterErr = c ? { pct: c.pct === offer!.commissionPct ? `That is the rate ${offer!.hotelName} already offered. Ask for a different one.` : undefined, message: c.message.trim() ? undefined : 'Add a short note so the hotel knows why.' } : null;
  const sendCounter = () => {
    if (!c || !offer || !counterErr) return;
    if (counterErr.pct || counterErr.message) { setCounter({ ...c, tried: true }); return; }
    const labels = ['Ask for a 2-night content stay', 'Extend the offer through January'];
    market.dispatch({ type: 'offer/respond', campaignId: offer.campaign.id, creatorId: CREATOR_ID, response: 'countered', counter: { pct: c.pct, message: c.message.trim(), extras: labels.filter((_, i) => c.extras[i]) } });
    ui.addCountered(offer.campaign.id); ui.setOfferTab('active'); setCounter(null);
    flash('Counter sent. They usually reply within a day.'); to('offers');
  };

  return (<>
    <div className="scroll home">
      {!sub ? (
        <div className="lt">
          <span className="eyebrow">{HEAD[screen]![0]}</span>
          <div className="row">
            <h1>{HEAD[screen]![1]}</h1>
            {(screen === 'insights' || screen === 'empty') && (
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <IconButton icon="notifications" label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'} variant="white" onClick={() => setSheet('notifications')} />
                {unread.length > 0 && <span className="notif-dot" aria-hidden="true" />}
              </span>
            )}
          </div>
        </div>
      ) : screen === 'reel' ? (
        <div className="nav">
          <IconButton icon="arrow_back" label="Back" variant="white" onClick={() => to(BACK[screen]!)} />
          <div className="nav-title"><span className="nt">{HEAD.reel![1]}</span><span className="ns">{HEAD.reel![0]}</span></div>
          <span className="nav-spacer" aria-hidden="true" />
        </div>
      ) : (
        <div className="head">
          <IconButton icon="arrow_back" label="Back" variant="white" onClick={() => to(BACK[screen]!, offer && screen !== 'trip' ? { o: offer.campaign.id } : undefined)} />
          <div className="ttl">
            <span className="meta">{screen === 'trip' && trip ? <a className="plain" href={travelerHref(trip.slug)} target="_blank" rel="noreferrer" title="Open the follower page">{HEAD.trip![0]}</a> : HEAD[screen]![0]}</span>
            <span className="h-title">{HEAD[screen]![1]}</span>
          </div>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <IconButton icon="notifications" label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'} variant="white" onClick={() => setSheet('notifications')} />
            {unread.length > 0 && <span className="notif-dot" aria-hidden="true" />}
          </span>
        </div>
      )}

      {screen === 'insights' && (myTrips.length ? <Insights go={go} /> : <Empty onNew={() => { ui.startNewTrip(); go('create', 'pick'); }} />)}
      {screen === 'empty' && <Empty onNew={() => { ui.startNewTrip(); go('create', 'pick'); }} />}
      {screen === 'trip' && <TripScreen go={go} />}
      {screen === 'reel' && <ReelScreen go={go} reelId={reelId} />}
      {(screen === 'earnings' || screen === 'withdrawn') && <Earnings screen={screen} payout={payoutLabel} onWithdraw={() => setSheet('withdraw')} />}
      {screen === 'offers' && <Offers views={views} to={to} onDecline={(id) => { setDeclineId(id); setSheet('decline'); }} />}
      {(screen === 'offerDetail' || screen === 'accepted') && (offer ? <OfferDetail v={offer} accepted={offer.status === 'accepted'} /> : <NoOffer to={to} />)}
      {screen === 'counter' && (offer && c && counterErr ? (<>
        <Widget title="Commission you're asking for" subtitle={`${offer.hotelName} offered ${offer.commissionPct}%`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="t-big">{c.pct}%</span>
            <Stepper value={c.pct} min={8} max={25} onChange={(v) => setCounter({ ...c, pct: v })} aria-label="Commission percent" />
          </div>
          {c.tried && counterErr.pct && <div role="alert" className="t-cap" style={{ color: 'var(--danger)', paddingTop: 8 }}>{counterErr.pct}</div>}
        </Widget>
        <Widget title="Extras">
          <div className="stack gap12">
            <Checkbox checked={c.extras[0]} onChange={(v) => setCounter({ ...c, extras: [v, c.extras[1]!] })} label="Ask for a 2-night content stay" />
            <Checkbox checked={c.extras[1]} onChange={(v) => setCounter({ ...c, extras: [c.extras[0]!, v] })} label="Extend the offer through January" />
          </div>
        </Widget>
        <TextField label={`Message to ${offer.hotelName}`} multiline value={c.message} error={c.tried ? counterErr.message : undefined} onChange={(e) => setCounter({ ...c, message: e.target.value })} />
      </>) : <NoOffer to={to} />)}
      {screen === 'profile' && <Profile go={go} open={(k) => setSheet(k)} />}
    </div>

    {ctaOffer}
    {screen === 'counter' && offer && <div className="glass-bar"><div className="grow1"><Button variant="primary" size="lg" block icon="send" onClick={sendCounter}>Send counter</Button></div></div>}

    {(!sub || screen === 'trip' || screen === 'reel') && (
      <div className="dock-bar"><Dock aria-label="Creator navigation" active={TAB_OF[screen]} orb={false} onSelect={(id) => to(id)} items={DOCK_BASE} /></div>
    )}

    {sheet === 'notifications' && (
      <Sheet title="Notifications" subtitle={unread.length ? `${unread.length} unread` : 'You are all caught up'} onClose={() => setSheet(null)}
        footer={<><CloseFooter onClose={() => setSheet(null)} /><Button variant="primary" icon="done_all" disabled={!unread.length} onClick={() => { ui.markRead(notes.map((n) => n.id)); flash('All notifications marked read'); }}>Mark all read</Button></>}>
        {notes.length ? <div className="stack">{notes.map((n) => (
          <button key={n.id} className="line" onClick={() => { ui.markRead([n.id]); noteTarget(n.id)(); }} style={{ padding: '10px 0', border: 0, borderBottom: '1px solid var(--divider)', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'inherit', alignItems: 'flex-start', width: '100%' }}>
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: 'var(--primary)' }}><Icon name={n.icon} size={20} /></span>
            <span className="col1"><span className="t-s">{n.title}</span><span className="t-cap">{n.body}</span><span className="t-cap">{shortDate(n.at)}</span></span>
            {!ui.read.includes(n.id) && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flex: 'none' }} />}
          </button>))}</div>
          : <EmptyState icon="notifications" title="Nothing new">Offers, bookings and withdrawals show up here.</EmptyState>}
      </Sheet>
    )}
    {sheet === 'decline' && (() => { const d = views.find((o) => o.campaign.id === declineId) ?? offer; return d ? (
      <Sheet title={`Decline ${d.hotelName}?`} subtitle="They will see that you declined. You can still find the offer under Declined." onClose={() => setSheet(null)}
        footer={<><CloseFooter onClose={() => setSheet(null)} label="Keep offer" /><Button variant="danger" onClick={() => { market.dispatch({ type: 'offer/respond', campaignId: d.campaign.id, creatorId: CREATOR_ID, response: 'declined' }); ui.setOfferTab('past'); flash('Offer declined. It is now under Declined.'); to('offers'); }}>Decline offer</Button></>} />
    ) : null; })()}
    {sheet === 'prefs' && <PrefsSheet close={() => setSheet(null)} />}
    {sheet === 'withdraw' && (() => { const w = withdrawal(bal.available); return (
      <Sheet title={`Withdraw ${formatINR(w.gross)}?`} subtitle={`${formatINR(w.tds)} TDS is deducted at 10%. You receive ${formatINR(w.net)} in ${payoutLabel} in 1 to 2 working days.`} onClose={() => setSheet(null)}
        footer={<><CloseFooter onClose={() => setSheet(null)} label="Not now" /><Button variant="primary" icon="account_balance" onClick={() => { doWithdraw(); to('withdrawn'); }}>Withdraw {formatINR(w.net)}</Button></>} />); })()}
    {(sheet === 'handle' || sheet === 'channels' || sheet === 'payout' || sheet === 'tax' || sheet === 'bio') && <ProfileSheet kind={sheet} close={() => setSheet(null)} />}
  </>);
}

function NoOffer({ to }: { to: (s: string) => void }) {
  return <EmptyState icon="handshake" title="That offer is not available" action={<Button variant="secondary" onClick={() => to('offers')}>Back to offers</Button>}>It may have been withdrawn by the hotel.</EmptyState>;
}

function Insights({ go }: { go: Go }) {
  const s = useMarket();
  const { range, setRange, profile, startNewTrip } = useUi();
  const copy = useCopy();
  const m = creatorInsights(s, CREATOR_ID, range);
  const links = s.trips.filter((t) => t.creatorId === CREATOR_ID);
  const rows = reelRows(s, CREATOR_ID);
  return (<>
    <SegmentedControl size="sm" aria-label="Date range" value={range} onChange={(v) => setRange(v as RangeKey)}
      options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
    <Widget title="Commission earned" subtitle={`Last ${range} days · from ${countLabel(m.bookings)} ${m.bookings === 1 ? 'booking' : 'bookings'}`}>
      <div className="stack gap12">
        <div className="hero-amt"><span className="amt34">{formatINR(m.commission)}</span><span className="chip chip-up"><Icon name="north_east" size={11} />{m.delta}</span></div>
        <AreaChart values={m.values} range={Number(range)} label="Commission over time" />
      </div>
    </Widget>
    <div className="tiles">
      <StatTile label="Link visits" value={countLabel(m.visits)} /><StatTile label="Saved trips" value={countLabel(m.saves)} />
      <StatTile label="Bookings" value={countLabel(m.bookings)} /><StatTile label="Conversion" value={m.conv} />
    </div>
    <Widget title="Reel performance" subtitle="Views, DMs and bookings per reel">
      <div className="rlist">
        {rows.map((r) => (
          <button key={r.id} className="link-row reel-line" onClick={() => go('app', 'reel', { r: r.id })} aria-label={`${r.place} reel, ${reelCaption(r)}${r.hasTrip ? `, ${formatINR(r.commission)} earned` : ', no trip yet'}`}>
            <span className="rthumb"><img src={asset(r.img)} alt="" /><span className="rscrim" /><Icon name="play_arrow" size={16} fill /></span>
            <span className="col1"><span className="rt">{r.place} reel</span><span className="rc">{compactCount(r.views)} views{r.hasTrip ? ` · ${countLabel(r.dms)} ${r.dms === 1 ? 'DM' : 'DMs'}` : ''}</span></span>
            {!r.hasTrip && <Tag hue="ochre">No trip yet</Tag>}
            <span className="muted-ic"><Icon name="chevron_right" size={20} /></span>
          </button>
        ))}
      </div>
    </Widget>
    <AISummary label="AI summary" title="Udaipur is doing the work"
      bullets={['Udaipur drives 61% of bookings at a 0.42% conversion', 'Followers often switch to the budget stay; keep it listed', 'Coorg visits are up 38% since the monsoon reel']}
      next="Pin the Udaipur link in your bio before the December long weekend." />
    <Widget title="Your trip links" count={links.length}>
      <div className="stack">
        {links.map((t) => { const st = tripStats(s, t.id)!; return (
          <div key={t.id} className="line" style={{ padding: '8px 0' }}>
            <button className="link-row" onClick={() => go('app', 'trip', { t: t.id })}>
              <img src={asset(t.img)} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
              <span className="col1"><span className="t-s">{t.title}</span><span className="t-cap">{tripVisitsLine(st)}{t.status === 'paused' ? ' · paused' : ''}</span></span>
            </button>
            <Button variant="secondary" size="sm" icon="content_copy" onClick={() => copy(`https://${tripUrl(profile.handle, t.slug)}`)}>Copy</Button>
          </div>); })}
        <div style={{ paddingTop: 8 }}><Button variant="ghost" size="sm" icon="add" onClick={() => { startNewTrip(); go('create', 'pick'); }}>New trip</Button></div>
      </div>
    </Widget>
  </>);
}

function Empty({ onNew }: { onNew: () => void }) {
  return (<>
    <Widget title="Commission earned" subtitle="Nothing yet">
      <EmptyState icon="dashboard" title="Your numbers start with your first trip">Publish a trip link and visits, saves and bookings show up here within the hour.</EmptyState>
    </Widget>
    <div className="tiles"><StatTile label="Link visits" value="0" /><StatTile label="Bookings" value="0" /></div>
    <Button variant="primary" size="lg" block icon="add" onClick={onNew}>Create your first trip</Button>
  </>);
}

function TripScreen({ go }: { go: Go }) {
  const s = useMarket();
  const ui = useUi();
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const mine = s.trips.filter((t) => t.creatorId === CREATOR_ID);
  const trip = mine.find((t) => t.id === q.get('t')) ?? mine[0];
  if (!trip) return <EmptyState icon="route" title="No trips yet" action={<Button variant="primary" onClick={() => { ui.startNewTrip(); go('create', 'pick'); }}>Create your first trip</Button>}>Publish a trip and its numbers show up here.</EmptyState>;
  const st = tripStats(s, trip.id)!;
  const paused = trip.status === 'paused';
  const dmCount = tripDmCount(s, trip.id);
  return (<>
    <div style={{ height: 180, borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 'none' }}><img src={asset(trip.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>
    {paused && <Banner tone="warning" icon="pause_circle" title="Link paused">Followers who open it see the trip as unavailable.</Banner>}
    <Widget title="Funnel" subtitle="Last 30 days">
      <div className="stack gap12">
        {st.funnel.map((f) => (
          <div key={f.label} className="stack gap4">
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-b"><span style={{ color: 'var(--ink-2)' }}>{f.label}</span><span style={{ fontWeight: 600 }}>{countLabel(f.value)}</span></div>
            <ProgressBar value={f.w} aria-label={f.label} />
          </div>
        ))}
        {!st.visits && <div className="t-cap">No visits yet. Share your link.</div>}
        <div className="t-cap">{countLabel(st.saves)} followers have saved this trip.</div>
        <div className="t-cap">{dmCount ? `${dmCount} ${dmCount === 1 ? 'comment' : 'comments'} answered with a DM` : 'No DMs sent yet. Followers who comment your keyword get your trip in their DMs.'}</div>
      </div>
    </Widget>
    <Widget title="Where followers booked">
      <div className="stack">
        {st.byStay.map((h) => (
          <div key={h.stayId} className="line" style={{ minHeight: 52 }}>
            <img src={asset(h.img)} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
            <span className="col1"><span className="t-s">{h.name}</span><span className="t-cap">{h.n} {h.n === 1 ? 'booking' : 'bookings'} · {h.stayId === trip.pickStayId ? "creator's pick" : { creator_pick: 'partner stay', budget: 'budget', mid: 'mid-range', luxury: 'luxury' }[h.tier]}</span></span>
            <span className="t-s" style={{ color: 'var(--success-ink)' }}>{formatINR(h.earn)}</span>
          </div>
        ))}
      </div>
    </Widget>
    <div className="row8">
      <Button variant="secondary" icon="edit" onClick={() => { ui.startEdit(trip); go('create', 'days'); }}>Edit trip</Button>
      <Button variant="tertiary" icon={paused ? 'play_arrow' : 'pause'} onClick={() => { market.dispatch({ type: 'trip/status', tripId: trip.id, status: paused ? 'live' : 'paused' }); ui.flash(paused ? 'Link live again' : 'Link paused'); }}>{paused ? 'Resume link' : 'Pause link'}</Button>
    </div>
  </>);
}

const KW_KEY = (tripId: string) => `staystory.creator.kw:${new URLSearchParams(window.location.search).get('ns') ?? ''}:${tripId}`;
const lastKeyword = (tripId: string): string | undefined => { try { return localStorage.getItem(KW_KEY(tripId)) || undefined; } catch { return undefined; } };
const rememberKeyword = (tripId: string, kw: string) => { try { localStorage.setItem(KW_KEY(tripId), kw); } catch { /* private mode */ } };

function ReelScreen({ go, reelId }: { go: Go; reelId?: string }) {
  const s = useMarket();
  const ui = useUi();
  const i = reelId ? reelInsights(s, reelId) : undefined;
  const trip = i?.trip;
  const [kw, setKw] = useState(trip?.dmKeyword ?? '');
  useEffect(() => { setKw(trip?.dmKeyword || lastKeyword(trip?.id ?? '') || 'link'); }, [trip?.id, trip?.dmKeyword]);
  if (!i) return <EmptyState icon="movie" title="No reels yet" action={<Button variant="secondary" onClick={() => go('app', 'insights')}>Back to Insights</Button>}>Reels from your Instagram show up here.</EmptyState>;
  const { reel } = i;
  const on = !!trip?.dmKeyword;
  const comments = trip ? reelComments(s, trip.id) : [];
  const saveKeyword = (enabled: boolean, raw: string) => {
    if (!trip) return;
    const clean = raw.replace(/\s/g, '').toLowerCase() || trip.dmKeyword || lastKeyword(trip.id) || 'link';
    const next = enabled ? clean : '';
    if (enabled) rememberKeyword(trip.id, clean);
    setKw(clean);
    if (trip.dmKeyword !== next) { market.dispatch({ type: 'trip/publish', trip: { ...trip, dmKeyword: next } }); ui.flash(enabled ? (trip.dmKeyword ? 'Keyword saved' : 'Auto-DM on') : 'Auto-DM off'); }
  };
  const turnIntoTrip = () => { ui.startNewTrip({ place: reel.place }); ui.setDraft({ analyzed: -1 }); go('create', 'pick'); };
  return (<>
    <div className="reel-hero">
      <img src={asset(reel.img)} alt={`${reel.place} reel`} />
      <span className="reel-play" aria-hidden="true"><Icon name="play_arrow" size={22} fill /></span>
    </div>
    <button className="obtn" onClick={() => { window.open(`https://${reel.url}`, '_blank', 'noopener'); ui.flash('Opening the reel on Instagram'); }}><Icon name="open_in_new" size={16} />Open on Instagram</button>
    <div className="tiles">
      <StatTile label="Views" value={compactCount(i.views)} /><StatTile label="Comments" value={compactCount(i.comments)} />
      <StatTile label="DMs sent" value={countLabel(i.dms)} /><StatTile label="Commission" value={formatINR(i.commission)} />
    </div>
    {trip ? (<>
      <Widget title="From reel to booking" subtitle="Where viewers drop off">
        <div className="stack" style={{ gap: 14 }}>
          {(() => {
            const NAMES: Record<string, string> = { Views: 'Reel views', 'Commented your keyword': 'Keyword comments', 'Got your DM': 'DMs sent', 'Opened the trip': 'Trip link opens', Booked: 'Bookings' };
            const steps = i.funnel.filter((f) => NAMES[f.label]);
            const pctOf = (v: number, prev: number) => { if (!prev) return ''; const p = (v / prev) * 100; return `${p >= 10 ? Math.round(p) : p >= 1 ? (Math.round(p * 10) / 10) : (Math.round(p * 100) / 100)}%`; };
            return steps.map((f, n) => (
              <div key={f.label} className="fstep">
                <div className="frow"><span className="fl">{NAMES[f.label]}</span><span className="fr">{n > 0 && <span className="fp">{pctOf(f.value, steps[n - 1]!.value)}</span>}<span className="fv">{f.label === 'Views' ? compactCount(f.value) : countLabel(f.value)}</span></span></div>
                <div className="ftrack" role="progressbar" aria-label={NAMES[f.label]} aria-valuenow={f.w} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${f.w}%`, opacity: [1, 0.86, 0.81, 0.69, 0.55][n] ?? 0.55 }} /></div>
              </div>
            ));
          })()}
          <div className="t-cap">{i.openRate} of viewers opened the trip.</div>
        </div>
      </Widget>
      <Widget>
        <div className="adm-head">
          <span className="col1"><span className="adm-t">Auto-DM</span><span className="adm-s">{on ? 'Send the trip link when someone comments the keyword' : 'Off. Keyword comments get no DM'}</span></span>
          <Toggle checked={on} onChange={(v) => saveKeyword(v, kw)} aria-label={on ? 'Auto-DM is on' : 'Auto-DM is off'} />
        </div>
        <span className="t-cap">{countLabel(i.dms)} of {countLabel(i.keywordComments)} keyword comments were answered with a DM.</span>
        <TextField label="Change keyword" value={kw} disabled={!on} hint="Anyone who comments this on your reel gets the trip in their DMs"
          onChange={(e) => setKw(e.target.value.replace(/\s/g, '').toLowerCase())} onBlur={() => saveKeyword(on, kw)}
          onKeyDown={(e) => { if (e.key === 'Enter') { saveKeyword(on, kw); (e.target as HTMLElement).blur(); } }} />
      </Widget>
      <Widget title="Recent comments" count={comments.length || undefined}>
        {comments.length ? (
          <div className="stack">
            {comments.slice(0, 8).map((c) => {
              const hit = matchesKeyword(c.text, trip.dmKeyword);
              return (
                <div key={c.id} className="line" style={{ minHeight: 52, padding: '8px 0', alignItems: 'flex-start' }}>
                  <Avatar initials={c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()} size={34} tone="muted" />
                  <span className="col1"><span className="t-s">{c.name}</span><span className="t-cap" style={{ overflowWrap: 'anywhere' }}>{c.text}</span></span>
                  {c.dmSent ? <Badge tone="success">DM sent</Badge> : hit ? <Badge tone="neutral">Already DMed</Badge> : <Badge tone="neutral">No keyword</Badge>}
                </div>);
            })}
          </div>
        ) : <EmptyState icon="chat_bubble" title="No comments yet">Comments on this reel show up here.</EmptyState>}
      </Widget>
      <div className="row8">
        <Button variant="secondary" icon="insights" onClick={() => go('app', 'trip', { t: trip.id })}>View trip performance</Button>
        <Button variant="tertiary" icon="edit" onClick={() => { ui.startEdit(trip); go('create', 'days'); }}>Edit trip</Button>
      </div>
    </>) : (
      <EmptyState icon="movie" title="No trip from this reel yet" action={<Button variant="primary" icon="add" onClick={turnIntoTrip}>Turn this reel into a trip</Button>}>Followers who watch it have nowhere to book. Turn it into a trip in a few minutes.</EmptyState>
    )}
  </>);
}

function Earnings({ screen, payout, onWithdraw }: { screen: string; payout: string; onWithdraw: () => void }) {
  const s = useMarket();
  const { ledgerFilter, setLedgerFilter, profile } = useUi();
  const bal = creatorBalances(s, CREATOR_ID);
  const byId = new Map(s.ledger.map((l) => [l.id, l]));
  const rows = ledgerRows(s, CREATOR_ID, ledgerFilter).filter((r) => !byId.get(r.id)?.summary).map((r) => ({ ...r, ini: byId.get(r.id)?.ini ?? (r.raw === 'processing' ? 'NV' : r.ini) }));
  const w = s.withdrawals.find((x) => x.creatorId === CREATOR_ID);
  const nb = screen === 'earnings' ? latestPendingBooking(s, CREATOR_ID) : undefined;
  const place = nb && (s.trips.find((t) => t.id === nb.booking.tripId)?.place ?? 'Udaipur');
  const nExp = nb?.booking.experienceIds.length ?? 0;
  const paidBooking = s.ledger.find((l) => l.creatorId === CREATOR_ID && l.status === 'paid' && l.bookingId);
  const pb = paidBooking && s.bookings.find((b) => b.id === paidBooking.bookingId);
  const none = bal.available <= 0;
  return (<>
    {screen === 'withdrawn' && w && <Banner tone="success" icon="check_circle" title={`${formatINR(w.net)} on its way`}>{formatINR(w.gross)} less {formatINR(w.tds)} TDS.{pb && paidBooking ? ` Includes ${formatINR(paidBooking.amount)} from ${pb.guestName.replace(/ [A-Z]\.$/, '')}’s ${s.trips.find((t) => t.id === pb.tripId)?.place ?? ''} trip, confirmed by the hotel after checkout.` : ''} Arrives in {w.upi} in 1 to 2 working days.</Banner>}
    <div className="balance">
      <div className="bal-top"><span className="bal-l">Available to withdraw</span><span className="bal-amt">{formatINR(bal.available)}</span></div>
      {bal.pending > 0 && <div className="bal-pend"><span className="chip chip-glass"><Icon name="auto_awesome" size={12} fill />{formatINR(bal.pending)} pending until check-out</span></div>}
      <button className="wbtn" disabled={none} onClick={onWithdraw}>{!none && <Icon name="arrow_downward" size={16} />}{none ? (screen === 'withdrawn' || w ? 'Withdrawal requested' : 'Nothing to withdraw') : `Withdraw ${formatINR(bal.available)}`}</button>
      <span className="bal-foot">Paid to {profile.payMode === 'upi' ? 'UPI ' : ''}{payout} · 10% TDS is deducted at withdrawal</span>
    </div>
    {nb && (
      <div className="note-ok">
        <span className="note-ic"><Icon name="check" size={18} /></span>
        <span className="col1"><span className="n1">New booking from your {place} reel</span><span className="n2">{nb.guest.replace(/ ([A-Z])[a-z]+$/, ' $1.')} · {nb.booking.roomName} · {formatINR(nb.amount)} pending</span></span>
      </div>
    )}
    <div className="fchips" role="group" aria-label="Activity filter">
      {([['All', 'All'], ['Pending stay', 'Pending'], ['Available', 'Available'], ['Paid', 'Paid']] as [LedgerFilter, string][]).map(([f, l]) => <button key={f} className="fchip" aria-pressed={ledgerFilter === f} onClick={() => setLedgerFilter(f)}>{l}</button>)}
    </div>
    <div className="ledger">
      {rows.length ? rows.map((r) => (
        <div key={r.id} className="lrow">
          <span className="col1"><span className="lt1">{r.title}</span><span className="lt2">{r.meta}</span></span>
          <span className="lend"><span className="lamt">{r.amt}</span><span className={`chip chip-s chip-${r.tone === 'warning' ? 'warn' : r.tone === 'success' ? 'ok' : 'mute'}`}>{r.status === 'Pending stay' ? 'Pending' : r.status}</span></span>
        </div>
      )) : <EmptyState icon="receipt_long" title="Nothing here yet" action={<Button variant="secondary" size="sm" onClick={() => setLedgerFilter('All')}>Show all activity</Button>}>No {ledgerFilter.toLowerCase()} activity.</EmptyState>}
    </div>
  </>);
}

function Offers({ views, to, onDecline }: { views: OfferView[]; to: (s: string, p?: Record<string, string>) => void; onDecline: (id: string) => void }) {
  const { offerTab: tab, setOfferTab } = useUi();
  const s = useMarket();
  const me: MCreator | undefined = s.creators[CREATOR_ID];
  const count = (t: string) => views.filter((o) => o.tab === t).length;
  const list = views.filter((o) => o.tab === tab);
  const statusChip = (o: OfferView) => (o.status === 'invited' ? 'New offer' : o.status === 'accepted' ? 'Accepted' : o.status === 'countered' ? 'Counter sent' : 'Declined');
  return (<>
    <SegmentedControl size="sm" aria-label="Offer status" value={tab} onChange={(v) => setOfferTab(v as typeof tab)}
      options={[{ value: 'new', label: `New${count('new') ? ` ${count('new')}` : ''}` }, { value: 'active', label: `Accepted${count('active') ? ` ${count('active')}` : ''}` }, { value: 'past', label: 'Declined' }]} />
    {list.length === 0 && <EmptyState icon={tab === 'new' ? 'mail' : tab === 'active' ? 'handshake' : 'history'} title={tab === 'new' ? 'No new offers' : tab === 'active' ? 'No accepted offers' : 'No declined offers'} action={tab !== 'new' ? <Button variant="secondary" size="sm" onClick={() => setOfferTab('new')}>See new offers</Button> : undefined}>{tab === 'new' ? 'Hotels send offers when your audience matches their guests. Keep posting and they will come.' : tab === 'active' ? 'Offers you accept or counter move here. Check New for pending ones.' : 'Declined offers show up here.'}</EmptyState>}
    {list.map((o) => {
      const pct = o.agreedPct ?? o.commissionPct;
      const open = () => to(o.status === 'accepted' ? 'accepted' : 'offerDetail', { o: o.campaign.id });
      const trip = s.trips.find((t) => t.creatorId === CREATOR_ID && t.place === o.city);
      return (
        <article key={o.campaign.id} className="ocard">
          <button className="ophoto" onClick={open} aria-label={`${o.status === 'invited' ? 'Review' : 'View'} offer from ${o.hotelName}`}>
            <img src={asset(o.img)} alt="" />
            <span className="oscrim" />
            <span className="ohead">
              <span className="ohotel"><span className="on">{o.hotelName}</span>{o.city && <span className="oc"><Icon name="location_on" size={11} fill />{o.city}</span>}</span>
              <span className="chip chip-white">{statusChip(o)}</span>
            </span>
          </button>
          <div className="obody">
            <div className="otitles"><span className="o1">{o.listTitle}</span><span className="o2">{o.roomName} · {o.campaign.nights} nights · {o.when}</span></div>
            <div className="otiles">
              <span className="ot ot1"><span className="ol">Commission</span><span className="ov">{pct}%</span></span>
              <span className="ot ot2"><span className="ol">Follower price</span><span className="ov">{formatINR(o.followerPrice)}</span></span>
              <span className="ot ot3"><span className="ol">You earn</span><span className="ov">{formatINR(creatorCommission(o.followerPrice, pct))}</span></span>
            </div>
            <div className="omatch">
              {me?.campaignScore && <span className="chip chip-ok"><Icon name="auto_awesome" size={11} fill />{me.campaignScore} match</span>}
              <span className="om">{trip ? `${trip.travelersBooked} of your followers saved ${o.city}` : o.why.split('. ')[0]!.replace(/\.$/, '')}</span>
            </div>
            {o.status === 'invited' ? (
              <div className="oact">
                <button className="pbtn pbtn-fill" onClick={() => { market.dispatch({ type: 'offer/respond', campaignId: o.campaign.id, creatorId: CREATOR_ID, response: 'accepted' }); to('accepted', { o: o.campaign.id }); }}><Icon name="check" size={15} />Accept</button>
                <button className="pbtn pbtn-line" onClick={() => to('counter', { o: o.campaign.id })}>Counter</button>
                <button className="pbtn pbtn-text" onClick={() => onDecline(o.campaign.id)}>Decline</button>
              </div>
            ) : (
              <div className="oact"><button className="pbtn pbtn-line" onClick={open}>View offer<Icon name="arrow_forward" size={15} /></button></div>
            )}
          </div>
        </article>
      );
    })}
  </>);
}

function OfferDetail({ v, accepted }: { v: OfferView; accepted: boolean }) {
  const s = useMarket();
  const c = v.campaign;
  const me: MCreator | undefined = s.creators[CREATOR_ID];
  const terms = [
    ['Follower price', `${formatINR(v.followerPrice)} for ${c.nights} nights`],
    ['Includes', c.perks.map((p, i) => (i ? p.toLowerCase() : p)).join(', ')],
    ['Commission', `${v.agreedPct ?? v.commissionPct}% on completed stays`],
    ['Your share', `About ${v.creatorSharePct}% of booking value`],
    ['Your perk', v.perk],
  ];
  const matchStats: [string, string, string][] = [];
  if (me?.conv) matchStats.push(['percent', me.conv, 'Conversion rate']);
  if (me?.bookingsPerMonth) matchStats.push(['shopping_bag', `${me.bookingsPerMonth}/mo`, 'Bookings driven']);
  if (me?.followers) matchStats.push(['group', me.followers, 'Followers']);
  return (<>
    <div style={{ height: 180, borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 'none' }}><img src={asset(v.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>
    {accepted && <Banner tone="success" icon="handshake" title="Offer accepted">{v.hotelName} is now the stay in your {v.city} trip. Every follower who books within 60 days of opening your link earns you commission.</Banner>}
    {v.status === 'countered' && <Banner tone="warning" icon="schedule" title="Counter sent">You asked for {v.counter?.pct}%. {v.hotelName} usually replies within a day.</Banner>}
    {v.status === 'declined' && <Banner tone="danger" icon="cancel" title="You declined this offer">It stays under Past. The hotel can invite you again.</Banner>}
    <AIAction title="Why they picked you" body={v.why} />
    {matchStats.length > 0 && (
      <Widget title="Your match stats" subtitle={me?.score ? `${me.score} match` : undefined}>
        <div className="stack gap12">
          {matchStats.map(([icon, val, label]) => (
            <div key={label} className="line" style={{ minHeight: 40 }}>
              <span className="muted-ic" style={{ color: 'var(--primary)' }}><Icon name={icon} size={20} /></span>
              <span className="t-b" style={{ flex: 1 }}>{label}</span>
              <span className="t-s" style={{ fontWeight: 600 }}>{val}</span>
            </div>
          ))}
          {me?.niche && <div className="t-cap">Niche: {me.niche}</div>}
        </div>
      </Widget>
    )}
    <Widget title="Terms">
      <div className="stack">
        {terms.map(([k, val]) => (
          <div key={k} className="line t-b" style={{ gap: 12, minHeight: 44 }}><span style={{ width: 120, color: 'var(--ink-2)' }}>{k}</span><span style={{ flex: 1, fontWeight: 600 }}>{val}</span></div>
        ))}
      </div>
    </Widget>
    <StatTile label="If 20 followers book in 60 days, you earn about" value={formatINR(v.estimate20)} />
  </>);
}

function Profile({ go, open }: { go: Go; open: (k: 'handle' | 'channels' | 'payout' | 'tax' | 'bio' | 'prefs') => void }) {
  const s = useMarket();
  const { profile: p, prefs, flash } = useUi();
  const copy = useCopy();
  const me: MCreator | undefined = s.creators[CREATOR_ID];
  const myTrips = s.trips.filter((t) => t.creatorId === CREATOR_ID);
  const live = myTrips.filter((t) => t.status !== 'paused').length;
  const connected = Object.values(p.channels).filter(Boolean).length;
  const handle = me?.handle ?? `@${p.handle}`;
  const notePart = [prefs.booking && 'Bookings', prefs.offers && 'offers', prefs.weekly && 'weekly summary'].filter(Boolean) as string[];
  const rows: ['handle' | 'channels' | 'payout' | 'tax' | 'prefs', string, string, string][] = [
    ['payout', 'account_balance', 'Payout method', p.payMode === 'upi' ? `UPI · ${p.upi}` : `Bank account · ending ${p.account.replace(/\s/g, '').slice(-4) || '0000'}`],
    ['channels', 'photo_camera', 'Instagram', p.channels.ig ? `Connected · ${handle}${connected > 1 ? ` and ${connected - 1} more` : ''}` : connected ? `${connected} connected` : 'Not connected'],
    ['handle', 'link', 'Handle and link', `staystory.in/${p.handle}`],
    ['tax', 'receipt_long', 'Tax details', /^[A-Z]{5}\d{4}[A-Z]$/i.test(p.pan) ? 'PAN added' : 'Add PAN'],
    ['prefs', 'notifications', 'Notifications', notePart.length ? `${notePart.join(notePart.length > 2 ? ', ' : ' and ')} on` : 'All off'],
  ];
  return (<>
    <div className="pcard">
      <div className="ptop">
        <span className="pav" aria-hidden="true">{me?.ini ?? 'AR'}</span>
        <div className="col1" style={{ gap: 3 }}>
          <span className="pname">{me?.name ?? 'Anaya Rao'}</span>
          <span className="phandle">{handle}</span>
          {me?.niche && <span className="chip chip-s chip-moss" style={{ alignSelf: 'flex-start' }}>{me.niche}</span>}
        </div>
      </div>
      {me && (
        <div className="pstats">
          <span className="pst"><span className="pv">{me.followers}</span><span className="pl">Followers</span></span>
          <span className="pst"><span className="pv">{me.tripsCount}</span><span className="pl">Trips</span></span>
          <span className="pst"><span className="pv">{me.travelers ?? '0'}</span><span className="pl">Travelers</span></span>
        </div>
      )}
      <button className="bio-btn" onClick={() => open('bio')}>{p.bio || 'Add a bio'} <Icon name="edit" size={14} /></button>
      {p.regions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{p.regions.map((r) => <Tag key={r} hue="charcoal">{r}</Tag>)}</div>
      )}
    </div>
    {myTrips.length > 0 && (
      <Widget title="Your trip links" subtitle="Share these in your bio and DMs" action={<span className="chip chip-ok">{live} live</span>}>
        <div className="rlist">
          {myTrips.map((t) => {
            const st = tripStats(s, t.id);
            return (
              <div key={t.id} className="plink">
                <button className="link-row plink-t" onClick={() => go('app', 'trip', { t: t.id })}>
                  <span className="col1"><span className="lt1">{t.title}</span><span className="lt2">{tripUrl(p.handle, t.slug)}{st ? ` · ${countLabel(st.visits)} opens` : ''}{t.status === 'paused' ? ' · paused' : ''}</span></span>
                </button>
                <button className="cbtn" aria-label={`Copy link for ${t.title}`} onClick={() => copy(`https://${tripUrl(p.handle, t.slug)}`)}><Icon name="content_copy" size={15} /></button>
                <a className="cbtn" aria-label={`Open ${t.title} as followers see it`} href={travelerHref(t.slug)} target="_blank" rel="noreferrer"><Icon name="open_in_new" size={15} /></a>
              </div>
            );
          })}
        </div>
      </Widget>
    )}
    <div className="settings">
      {rows.map(([k, icon, label, value]) => (
        <button key={k} className="srow" onClick={() => open(k)}>
          <span className="sic"><Icon name={icon} size={18} /></span>
          <span className="col1"><span className="st1">{label}</span><span className="st2">{value}</span></span>
          <span className="muted-ic"><Icon name="chevron_right" size={20} /></span>
        </button>
      ))}
    </div>
    <Button variant="tertiary" size="lg" block icon="logout" onClick={() => { flash('Logged out'); go('onboard', 'welcome'); }}>Log out</Button>
  </>);
}

function PrefsSheet({ close }: { close: () => void }) {
  const { prefs, setPrefs } = useUi();
  return (
    <Sheet title="Notifications" subtitle="Choose what we tell you about" onClose={close} footer={<CloseFooter onClose={close} label="Done" />}>
      <div className="stack gap16">
        <Toggle checked={prefs.booking} onChange={(v) => setPrefs({ booking: v })} label="New booking alerts" />
        <Toggle checked={prefs.offers} onChange={(v) => setPrefs({ offers: v })} label="Hotel offers" />
        <Toggle checked={prefs.weekly} onChange={(v) => setPrefs({ weekly: v })} label="Weekly summary email" />
      </div>
    </Sheet>
  );
}

function ProfileSheet({ kind, close }: { kind: 'handle' | 'channels' | 'payout' | 'tax' | 'bio'; close: () => void }) {
  const { profile: p, setProfile, flash } = useUi();
  const [f, setF] = useState({ handle: p.handle, channels: p.channels, payMode: p.payMode, upi: p.upi, account: p.account, ifsc: p.ifsc, pan: p.pan, gstin: p.gstin, bio: p.bio });
  const [tried, setTried] = useState(false);
  const errs = payoutErrors(f);
  const handleErr = /^[a-z0-9-]{3,30}$/.test(f.handle) ? undefined : 'Use 3 to 30 lowercase letters, numbers or hyphens';
  const vis = (k: keyof typeof errs) => (tried ? errs[k] : undefined);
  const save = () => {
    setTried(true);
    if (kind === 'handle') { if (handleErr) return; setProfile({ handle: f.handle }); flash(`Link is now staystory.in/${f.handle}`); }
    if (kind === 'channels') { setProfile({ channels: f.channels }); flash('Channels updated'); }
    if (kind === 'payout') { if (errs.upi || errs.account || errs.ifsc) return; setProfile({ payMode: f.payMode, upi: f.upi.trim(), account: f.account, ifsc: f.ifsc }); flash('Payout method saved'); }
    if (kind === 'tax') { if (errs.pan || errs.gstin) return; setProfile({ pan: f.pan.trim(), gstin: f.gstin.trim() }); flash('Tax details saved'); }
    if (kind === 'bio') { setProfile({ bio: f.bio.trim() }); flash('Bio updated'); }
    close();
  };
  const title = { handle: 'Handle and link', channels: 'Connected channels', payout: 'Payout method', tax: 'Tax details', bio: 'About you' }[kind];
  return (
    <Sheet title={title} onClose={close} footer={<><CloseFooter onClose={close} label="Cancel" /><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="stack gap12">
        {kind === 'handle' && <TextField label="Your link" icon="link" value={f.handle} error={tried ? handleErr : undefined} hint={`Followers see staystory.in/${f.handle || 'your-name'}`} onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />}
        {kind === 'channels' && (<>
          <Toggle checked={f.channels.ig} onChange={(v) => setF({ ...f, channels: { ...f.channels, ig: v } })} label="Instagram · @anaya.explores" />
          <Toggle checked={f.channels.yt} onChange={(v) => setF({ ...f, channels: { ...f.channels, yt: v } })} label="YouTube · Anaya Explores" />
          <Toggle checked={f.channels.blog} onChange={(v) => setF({ ...f, channels: { ...f.channels, blog: v } })} label="Blog or website · anayaexplores.in" />
        </>)}
        {kind === 'payout' && (<>
          <SegmentedControl size="lg" aria-label="Payout method" value={f.payMode} onChange={(v) => { setTried(false); setF({ ...f, payMode: v as 'upi' | 'bank' }); }} options={[{ value: 'upi', label: 'UPI' }, { value: 'bank', label: 'Bank account' }]} />
          {f.payMode === 'upi'
            ? <TextField label="UPI ID" icon="qr_code" value={f.upi} error={vis('upi')} onChange={(e) => setF({ ...f, upi: e.target.value })} />
            : <><TextField label="Account number" inputMode="numeric" placeholder="0000 0000 0000" value={f.account} error={vis('account')} onChange={(e) => setF({ ...f, account: e.target.value })} />
              <TextField label="IFSC" placeholder="HDFC0000000" value={f.ifsc} error={vis('ifsc')} onChange={(e) => setF({ ...f, ifsc: e.target.value.toUpperCase() })} /></>}
        </>)}
        {kind === 'tax' && (<>
          <TextField label="PAN" value={f.pan} hint="Needed for TDS" error={vis('pan')} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} />
          <TextField label="GSTIN (optional)" placeholder="If registered" value={f.gstin} error={vis('gstin')} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
        </>)}
        {kind === 'bio' && (
          <TextField multiline label="Bio" value={f.bio} hint="Hotels see this when deciding to send you offers" placeholder="Slow travel, Rajasthan and the South" onChange={(e) => setF({ ...f, bio: e.target.value })} />
        )}
      </div>
    </Sheet>
  );
}
