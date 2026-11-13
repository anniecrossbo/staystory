import { useEffect, useState } from 'react';
import { formatINR, matchesKeyword, withdrawal } from '@staystory/core';
import {
  availableShare, compactCount, countLabel, creatorBalances, creatorInsights, creatorNotifications, creatorOfferViews, latestPendingBooking, ledgerRows, tripDmCount, tripStats, tripVisitsLine,
  market, reelCaption, reelComments, reelInsights, reelRows, useMarket, type LedgerFilter, type OfferView, type RangeKey,
} from '@staystory/market';
import {
  AIAction, AISummary, Avatar, Badge, Banner, Button, Checkbox, Dock, EmptyState, FilterPill, Icon, IconButton, LineChart,
  ProgressBar, SegmentedControl, StatTile, Stepper, TextField, Tag, Toggle, Widget,
} from '@staystory/ui';
import { asset, CREATOR_ID } from '../data';
import type { Go } from '../router';
import { useUi } from '../store';
import { payoutErrors } from './Onboard';
import { CloseFooter, Sheet, travelerHref, tripUrl, useCopy } from '../ui';

export const HOME_SCREENS = ['insights', 'empty', 'trip', 'reel', 'earnings', 'withdrawn', 'offers', 'offerDetail', 'counter', 'accepted', 'profile'];
const TAB_OF: Record<string, string> = { insights: 'insights', empty: 'insights', trip: 'insights', reel: 'insights', earnings: 'earnings', withdrawn: 'earnings', offers: 'offers', offerDetail: 'offers', counter: 'offers', accepted: 'offers', profile: 'profile' };
const BACK: Record<string, string> = { trip: 'insights', reel: 'insights', offerDetail: 'offers', counter: 'offerDetail', accepted: 'offers' };
const SUB = ['trip', 'reel', 'offerDetail', 'counter', 'accepted'];
const NOTE: Record<string, string> = { 'winter-pichola': 'My Udaipur audience books for Christmas week. Could we run this through January?' };
const DOCK = [{ id: 'insights', icon: 'insights', label: 'Insights' }, { id: 'earnings', icon: 'account_balance_wallet', label: 'Earnings' }, { id: 'offers', icon: 'handshake', label: 'Offers' }, { id: 'profile', icon: 'person', label: 'Profile' }];
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
  const newCount = views.filter((o) => o.tab === 'new').length;
  const creatorHandle = s.creators[CREATOR_ID]?.handle ?? '@anaya.explores';
  const [sheet, setSheet] = useState<null | 'notifications' | 'decline' | 'withdraw' | 'handle' | 'channels' | 'payout' | 'tax'>(null);
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
    insights: [creatorHandle, 'Insights'], empty: ['Welcome, Anaya', 'Insights'], trip: [tripUrl(profile.handle, trip?.slug ?? ''), trip?.title ?? 'Trip'],
    reel: [reelView ? `Posted ${reelView.reel.postedLabel}` : creatorHandle, reelView ? `${reelView.reel.place} reel` : 'Reel'],
    earnings: [creatorHandle, 'Earnings'], withdrawn: [creatorHandle, 'Earnings'], offers: [newCount ? `${newCount} new this week` : 'No new offers', 'Hotel offers'],
    offerDetail: [offer ? `${offer.city} · ${offer.when}` : 'Offer', offer?.hotelName ?? 'Hotel offers'], counter: [offer?.hotelName ?? '', 'Counter offer'], accepted: [offer ? `${offer.city} · ${offer.when}` : 'Offer', offer?.hotelName ?? 'Hotel offers'], profile: ['Anaya Rao', 'Profile'],
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
            <Button variant="tertiary" size="lg" onClick={() => setSheet('decline')}>Decline</Button>
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
    <div className="scroll">
      <div className="head">
        {sub ? <IconButton icon="arrow_back" label="Back" variant="white" onClick={() => to(BACK[screen]!, offer && screen !== 'trip' && screen !== 'reel' ? { o: offer.campaign.id } : undefined)} /> : <Avatar initials="AR" size={40} tone="solid" name="Anaya Rao" />}
        <div className="ttl">
          <span className="meta">{screen === 'trip' && trip ? <a className="plain" href={travelerHref(trip.slug)} target="_blank" rel="noreferrer" title="Open the follower page">{HEAD.trip![0]}</a> : HEAD[screen]![0]}</span>
          <span className="h-title">{HEAD[screen]![1]}</span>
        </div>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton icon="notifications" label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'} variant="white" onClick={() => setSheet('notifications')} />
          {unread.length > 0 && <span className="notif-dot" aria-hidden="true" />}
        </span>
      </div>

      {screen === 'insights' && (myTrips.length ? <Insights go={go} /> : <Empty onNew={() => { ui.startNewTrip(); go('create', 'pick'); }} />)}
      {screen === 'empty' && <Empty onNew={() => { ui.startNewTrip(); go('create', 'pick'); }} />}
      {screen === 'trip' && <TripScreen go={go} />}
      {screen === 'reel' && <ReelScreen go={go} reelId={reelId} />}
      {(screen === 'earnings' || screen === 'withdrawn') && <Earnings screen={screen} payout={payoutLabel} onWithdraw={() => setSheet('withdraw')} />}
      {screen === 'offers' && <Offers views={views} to={to} />}
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
      <div className="dock-bar"><Dock aria-label="Creator navigation" active={TAB_OF[screen]} orb={false} onSelect={(id) => to(id)} items={DOCK} /></div>
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
    {sheet === 'decline' && offer && (
      <Sheet title={`Decline ${offer.hotelName}?`} subtitle="They will see that you declined. You can still find the offer under Past." onClose={() => setSheet(null)}
        footer={<><CloseFooter onClose={() => setSheet(null)} label="Keep offer" /><Button variant="danger" onClick={() => { market.dispatch({ type: 'offer/respond', campaignId: offer.campaign.id, creatorId: CREATOR_ID, response: 'declined' }); ui.setOfferTab('past'); flash('Offer declined. It is now under Past.'); to('offers'); }}>Decline offer</Button></>} />
    )}
    {sheet === 'withdraw' && (() => { const w = withdrawal(bal.available); return (
      <Sheet title={`Withdraw ${formatINR(w.gross)}?`} subtitle={`${formatINR(w.tds)} TDS is deducted at 10%. You receive ${formatINR(w.net)} in ${payoutLabel} in 1 to 2 working days.`} onClose={() => setSheet(null)}
        footer={<><CloseFooter onClose={() => setSheet(null)} label="Not now" /><Button variant="primary" icon="account_balance" onClick={() => { doWithdraw(); to('withdrawn'); }}>Withdraw {formatINR(w.net)}</Button></>} />); })()}
    {(sheet === 'handle' || sheet === 'channels' || sheet === 'payout' || sheet === 'tax') && <ProfileSheet kind={sheet} close={() => setSheet(null)} />}
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
    <Widget title="Commission earned" subtitle={m.sub}>
      <div className="stack gap12">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}><span className="t-big">{formatINR(m.commission)}</span><Badge tone="success" icon="trending_up">{m.delta}</Badge></div>
        <LineChart height={120} aria-label="Commission over time" series={[{ name: 'Commission', values: m.values }]} labels={m.labels} />
      </div>
    </Widget>
    <div className="tiles">
      <StatTile label="Link visits" value={countLabel(m.visits)} /><StatTile label="Saved trips" value={countLabel(m.saves)} />
      <StatTile label="Bookings" value={countLabel(m.bookings)} /><StatTile label="Conversion" value={m.conv} />
    </div>
    <AISummary label="AI summary" title="Udaipur is doing the work"
      bullets={['Udaipur drives 61% of bookings at a 0.42% conversion', 'Followers often switch to the budget stay; keep it listed', 'Coorg visits are up 38% since the monsoon reel']}
      next="Pin the Udaipur link in your bio before the December long weekend." />
    <Widget title="Reel performance" subtitle="Since posted · from your Instagram">
      <div className="stack">
        {rows.map((r) => (
          <button key={r.id} className="link-row reel-row" onClick={() => go('app', 'reel', { r: r.id })} aria-label={`${r.place} reel, ${reelCaption(r)}${r.hasTrip ? `, ${formatINR(r.commission)} earned` : ', no trip yet'}`}>
            <img src={asset(r.img)} alt="" className="reel-thumb" />
            <span className="col1"><span className="t-s">{r.place}</span><span className="t-cap">{reelCaption(r)}</span></span>
            <span className="reel-end">{r.hasTrip ? <span className="t-s" style={{ color: 'var(--success-ink)' }}>{formatINR(r.commission)}</span> : <Tag hue="ochre">No trip yet</Tag>}{r.topEarner && <Badge tone="success" icon="trending_up">Top earner</Badge>}</span>
          </button>
        ))}
      </div>
    </Widget>
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
      <EmptyState icon="insights" title="Your numbers start with your first trip">Publish a trip link and visits, saves and bookings show up here within the hour.</EmptyState>
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
      <span className="reel-play" aria-hidden="true"><Icon name="play_arrow" size={28} fill /></span>
    </div>
    <Button variant="secondary" block icon="open_in_new" onClick={() => { window.open(`https://${reel.url}`, '_blank', 'noopener'); ui.flash('Opening the reel on Instagram'); }}>Open on Instagram</Button>
    <div className="tiles">
      <StatTile label="Views" value={compactCount(i.views)} /><StatTile label="Comments" value={compactCount(i.comments)} />
      <StatTile label="DMs sent" value={countLabel(i.dms)} /><StatTile label="Commission" value={formatINR(i.commission)} />
    </div>
    {trip ? (<>
      <Widget title="From reel to booking" subtitle="Since posted">
        <div className="stack gap12">
          {i.funnel.map((f) => (
            <div key={f.label} className="stack gap4">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }} className="t-b"><span style={{ color: 'var(--ink-2)' }}>{f.label}</span><span style={{ fontWeight: 600 }}>{f.label === 'Views' ? compactCount(f.value) : countLabel(f.value)}</span></div>
              <ProgressBar value={f.w} aria-label={f.label} />
            </div>
          ))}
          <div className="t-cap">{i.openRate} of viewers opened the trip.</div>
        </div>
      </Widget>
      <Widget title="Auto-DM" subtitle={on ? `Answers “${trip.dmKeyword}” comments` : 'Off. Keyword comments get no DM'}>
        <div className="stack gap12">
          <span className="t-b">{countLabel(i.dms)} of {countLabel(i.keywordComments)} keyword comments were answered with a DM.</span>
          <Toggle checked={on} onChange={(v) => saveKeyword(v, kw)} label={on ? 'Auto-DM is on' : 'Auto-DM is off'} />
          <TextField label="Change keyword" value={kw} disabled={!on} hint="Anyone who comments this on your reel gets the trip in their DMs"
            onChange={(e) => setKw(e.target.value.replace(/\s/g, '').toLowerCase())} onBlur={() => saveKeyword(on, kw)}
            onKeyDown={(e) => { if (e.key === 'Enter') { saveKeyword(on, kw); (e.target as HTMLElement).blur(); } }} />
        </div>
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
  const { ledgerFilter, setLedgerFilter } = useUi();
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
    {nb && <Banner {...({ tone: 'info' } as object)} icon="celebration" title={`New booking from your ${place} trip`}>{nb.guest} booked {nb.dates} at {nb.hotelName}{nExp ? ` with ${words[nExp] ?? nExp} ${nExp === 1 ? 'experience' : 'experiences'}` : ''}. {formatINR(nb.amount)} becomes available after they check out.</Banner>}
    <Widget title="Available to withdraw" subtitle={`Paid to ${payout} · 10% TDS`}>
      <div className="stack gap12">
        <span className="t-big">{formatINR(bal.available)}</span>
        <ProgressBar value={availableShare(bal)} aria-label="Share available" />
        <span className="t-cap">{formatINR(bal.pending)} more unlocks when guests check out</span>
        <Button variant="primary" size="lg" block icon="account_balance" disabled={none} onClick={onWithdraw}>{none ? (screen === 'withdrawn' || w ? 'Withdrawal requested' : 'Nothing to withdraw') : `Withdraw ${formatINR(bal.available)}`}</Button>
      </div>
    </Widget>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {(['All', 'Available', 'Pending stay', 'Paid'] as LedgerFilter[]).map((f) => <FilterPill key={f} size="sm" selected={ledgerFilter === f} onClick={() => setLedgerFilter(f)}>{f}</FilterPill>)}
    </div>
    <Widget title="Activity">
      {rows.length ? (
        <div className="stack">
          {rows.map((r) => (
            <div key={r.id} className="line" style={{ minHeight: 56 }}>
              <Avatar initials={r.ini} size={34} tone="muted" />
              <span className="col1"><span className="t-s">{r.title}</span><span className="t-cap">{r.meta}</span></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}><span className="t-s">{r.amt}</span><Badge tone={r.tone}>{r.status}</Badge></span>
            </div>
          ))}
        </div>
      ) : <EmptyState icon="receipt_long" title="Nothing here yet" action={<Button variant="secondary" size="sm" onClick={() => setLedgerFilter('All')}>Show all activity</Button>}>No {ledgerFilter.toLowerCase()} activity.</EmptyState>}
    </Widget>
  </>);
}

function Offers({ views, to }: { views: OfferView[]; to: (s: string, p?: Record<string, string>) => void }) {
  const { offerTab: tab, setOfferTab } = useUi();
  const count = (t: string) => views.filter((o) => o.tab === t).length;
  const list = views.filter((o) => o.tab === tab);
  return (<>
    <SegmentedControl size="sm" aria-label="Offer status" value={tab} onChange={(v) => setOfferTab(v as typeof tab)}
      options={[{ value: 'new', label: 'New', count: count('new') || undefined }, { value: 'active', label: 'Active' }, { value: 'past', label: 'Past' }]} />
    {list.length === 0 && <EmptyState icon="handshake" title={`No ${tab} offers`} action={tab !== 'new' ? <Button variant="secondary" size="sm" onClick={() => setOfferTab('new')}>See new offers</Button> : undefined}>{tab === 'new' ? 'New hotel offers show up here.' : tab === 'active' ? 'Offers you accept or counter show up here.' : 'Declined offers show up here.'}</EmptyState>}
    {list.map((o) => (
      <Widget key={o.campaign.id} title={o.listTitle} subtitle={`${o.city} · ${o.when}`}>
        <div className="stack gap12">
          <img src={asset(o.img)} alt="" style={{ width: '100%', height: 132, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
          <span className="t-b2">{o.headline}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Tag hue="moss">{o.agreedPct ?? o.commissionPct}% commission</Tag><Tag hue="ochre">{o.perk}</Tag></div>
          {o.status === 'countered' && <div><Badge tone="info" icon="schedule">Counter sent · waiting for the hotel</Badge></div>}
          {o.status === 'accepted' && <div><Badge tone="success" icon="check">Accepted</Badge></div>}
          {o.status === 'declined' && <div><Badge tone="neutral">Declined</Badge></div>}
          <Button variant="secondary" block iconRight="arrow_forward" onClick={() => to(o.status === 'accepted' ? 'accepted' : 'offerDetail', { o: o.campaign.id })}>{o.status === 'invited' ? 'Review offer' : 'View offer'}</Button>
        </div>
      </Widget>
    ))}
  </>);
}

function OfferDetail({ v, accepted }: { v: OfferView; accepted: boolean }) {
  const c = v.campaign;
  const terms = [
    ['Follower price', `${formatINR(v.followerPrice)} for ${c.nights} nights`],
    ['Includes', c.perks.map((p, i) => (i ? p.toLowerCase() : p)).join(', ')],
    ['Commission', `${v.agreedPct ?? v.commissionPct}% on completed stays`],
    ['Your share', `About ${v.creatorSharePct}% of booking value`],
    ['Your perk', v.perk],
  ];
  return (<>
    <div style={{ height: 180, borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 'none' }}><img src={asset(v.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>
    {accepted && <Banner tone="success" icon="handshake" title="Offer accepted">{v.hotelName} is now the stay in your {v.city} trip. Every follower who books within 60 days of opening your link earns you commission.</Banner>}
    {v.status === 'countered' && <Banner tone="warning" icon="schedule" title="Counter sent">You asked for {v.counter?.pct}%. {v.hotelName} usually replies within a day.</Banner>}
    {v.status === 'declined' && <Banner tone="danger" icon="cancel" title="You declined this offer">It stays under Past. The hotel can invite you again.</Banner>}
    <AIAction title="Why they picked you" body={v.why} />
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

function Profile({ go, open }: { go: Go; open: (k: 'handle' | 'channels' | 'payout' | 'tax') => void }) {
  const { profile: p, prefs, setPrefs, flash } = useUi();
  const rows: ['handle' | 'channels' | 'payout' | 'tax', string, string, string][] = [
    ['handle', 'link', 'Handle and link', `/${p.handle}`], ['channels', 'photo_camera', 'Connected channels', String(Object.values(p.channels).filter(Boolean).length)],
    ['payout', 'account_balance', 'Payout method', p.payMode === 'upi' ? 'UPI' : 'Bank'], ['tax', 'receipt_long', 'Tax details', /^[A-Z]{5}\d{4}[A-Z]$/i.test(p.pan) ? 'PAN added' : 'Add PAN'],
  ];
  return (<>
    <Widget title="Storefront" subtitle={`staystory.in/${p.handle}`}>
      <div className="stack">
        {rows.map(([k, icon, label, value]) => (
          <button key={k} className="line" onClick={() => open(k)} style={{ minHeight: 48, width: '100%', border: 0, borderBottom: '1px solid var(--divider)', background: 'transparent', padding: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
            <span className="muted-ic"><Icon name={icon} size={20} /></span>
            <span className="t-b" style={{ flex: 1 }}>{label}</span>
            <span className="t-cap">{value}</span>
            <span className="muted-ic"><Icon name="chevron_right" size={20} /></span>
          </button>
        ))}
      </div>
    </Widget>
    <Widget title="Notifications">
      <div className="stack gap16">
        <Toggle checked={prefs.booking} onChange={(v) => setPrefs({ booking: v })} label="New booking alerts" />
        <Toggle checked={prefs.offers} onChange={(v) => setPrefs({ offers: v })} label="Hotel offers" />
        <Toggle checked={prefs.weekly} onChange={(v) => setPrefs({ weekly: v })} label="Weekly summary email" />
      </div>
    </Widget>
    <Button variant="tertiary" size="lg" block icon="logout" onClick={() => { flash('Logged out'); go('onboard', 'welcome'); }}>Log out</Button>
  </>);
}

function ProfileSheet({ kind, close }: { kind: 'handle' | 'channels' | 'payout' | 'tax'; close: () => void }) {
  const { profile: p, setProfile, flash } = useUi();
  const [f, setF] = useState({ handle: p.handle, channels: p.channels, payMode: p.payMode, upi: p.upi, account: p.account, ifsc: p.ifsc, pan: p.pan, gstin: p.gstin });
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
    close();
  };
  const title = { handle: 'Handle and link', channels: 'Connected channels', payout: 'Payout method', tax: 'Tax details' }[kind];
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
      </div>
    </Sheet>
  );
}
