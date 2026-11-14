import { useEffect, useRef, useState } from 'react';
import { creditLine, formatINR, HOLD_MINUTES } from '@staystory/core';
import { Avatar, Badge, Banner, Button, Chip, EmptyState, Icon, IconButton, SegmentedControl, StatTile, Tag, TextField, Toggle, Widget } from '@staystory/ui';
import {
  attributionFor, buildBooking, gapForTrip, market, orderedStays, quoteSelection, shortINR, tripDateOptions, tripFromPriceFor, tripNights, freeCancelUntil, TIER_LABEL,
  type MBooking, type MGapNight, type MStay, type MTrip,
} from '@staystory/market';
import { asset, clock, copyText, go, ME, placeLine, SITE, stayDays, tripHash, tripName } from '../lib';
import { tripFor, useNow, useSession } from '../session';
import { MapSection } from '../MapSection';
import { FooterPill, ToastHost, useEscape } from '../ui';

export const TRIP_SCREENS = ['trip', 'saved', 'customize', 'checkout', 'payfail', 'booked', 'foryou', 'held'];
const label10 = { fontSize: 10, lineHeight: '14px', fontWeight: 600, letterSpacing: '.02em', textTransform: 'uppercase', color: 'var(--muted)' } as const;
const dots = (d: string) => d.replace(' – ', ' to ');

export function TripFlow({ screen }: { screen: string }) {
  const { s, route } = useSession();
  const bookingId = route.params.b;
  const booking = screen === 'booked' ? (s.bookings.find((b) => b.id === bookingId) ?? s.bookings.find((b) => b.travelerId === ME)) : undefined;
  const trip = booking ? s.trips.find((t) => t.id === booking.tripId) ?? tripFor(s, route) : tripFor(s, route);
  if (screen === 'booked' && !booking) {
    return (<>
      <div className="scroll">
        <div className="head"><IconButton icon="arrow_back" label="Back" variant="white" onClick={() => go('trips', 'upcoming')} /><span className="col1"><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>No booking to show</span></span></div>
        <div style={{ paddingTop: 48 }}><EmptyState icon="luggage" title="We can’t find that booking">Open it from your trips, or find a trip to book.</EmptyState></div>
        <Button variant="primary" size="lg" block onClick={() => go('trips', 'upcoming')}>Go to my trips</Button>
        <Button variant="secondary" size="lg" block icon="explore" onClick={() => go('discover', 'feed')}>Discover trips</Button>
      </div>
      <ToastHost />
    </>);
  }
  if (!trip || (trip.status === 'paused' && !booking)) {
    return (<>
      <div className="scroll">
        <div className="head"><IconButton icon="arrow_back" label="Back" variant="white" onClick={() => go('discover', 'feed')} /><span className="col1"><span className="h2" style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>Trip not available</span></span></div>
        <div style={{ paddingTop: 48 }}><EmptyState icon="travel_explore" title={trip ? 'This trip is paused' : 'We can’t find that trip'}>{trip ? 'The creator has paused bookings for now. Browse other trips in the meantime.' : 'The link may be old or mistyped. Browse trips from creators you follow.'}</EmptyState></div>
        <Button variant="primary" size="lg" block icon="explore" onClick={() => go('discover', 'feed')}>Discover trips</Button>
      </div>
      <ToastHost />
    </>);
  }
  return <TripScreens key={trip.id} trip={trip} screen={screen} booking={booking} />;
}

function TripScreens({ trip, screen, booking }: { trip: MTrip; screen: string; booking?: MBooking }) {
  const { s, me, signedIn, route, dispatch, ui, patchUi, flash, gate, selFor, setSel, startHold } = useSession();
  const creator = s.creators[trip.creatorId]!;
  const from = route.params.from;
  const gapParam = route.params.gap;
  const P = { c: trip.creatorId, s: trip.slug, from, gap: gapParam };
  const to = (sc: string, extra: Record<string, string | undefined> = {}) => go('trip', sc, { ...P, ...extra });
  const isTripPage = screen === 'trip' || screen === 'saved';
  const isForYou = screen === 'foryou' || screen === 'held';
  const saved = me.savedTripIds.includes(trip.id);
  const gap = gapForTrip(s, me.id, trip.id);
  const sel = selFor(trip);
  const q = quoteSelection(trip, sel, gap);
  const gapStay = gap ? trip.stays.find((x) => x.hotelId === gap.hotelId && x.roomTypeId === gap.roomTypeId) : undefined;
  const gapQ = gap && gapStay ? quoteSelection(trip, { ...sel, stayId: gapStay.id, dateLabel: gap.datesLabel }, gap) : undefined;
  const [paying, setPaying] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Arriving on a trip (from a DM, a shop, the feed or a link) starts the 60-day credit for its creator.
  useEffect(() => {
    if (screen === 'booked') return;
    const now = new Date().toISOString();
    dispatch({ type: 'traveler/openLink', travelerId: me.id, creatorId: trip.creatorId, tripId: trip.id, now });
    // One visit per browser session per trip; the store ignores repeats.
    let sessionId = '';
    try { sessionId = sessionStorage.getItem('staystory.session') ?? ''; if (!sessionId) { sessionId = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; sessionStorage.setItem('staystory.session', sessionId); } } catch { sessionId = 'anonymous'; }
    dispatch({ type: 'trip/visit', tripId: trip.id, sessionId, at: now });
  }, [trip.id]);
  // Starting checkout holds the rooms for 30 minutes.
  const holding = ui.hold?.tripId === trip.id && new Date(ui.hold.until).getTime() > Date.now();
  useEffect(() => { if ((screen === 'checkout' || screen === 'payfail' || screen === 'held') && !holding) startHold(trip.id); }, [screen, trip.id]);

  const signInThenCheckout = () => gate({ reason: 'checkout', tripId: trip.id, returnTo: tripHash(trip, 'checkout', { from, gap: gapParam }), backTo: tripHash(trip, 'customize', { from, gap: gapParam }) });
  const onSave = () => {
    if (!signedIn) { gate({ reason: 'save', tripId: trip.id, returnTo: tripHash(trip, 'saved', { from }), backTo: tripHash(trip, 'trip', { from }) }); return; }
    dispatch({ type: 'traveler/save', id: me.id, tripId: trip.id, on: !saved });
    flash(saved ? 'Removed from your saved trips' : 'Saved to your trips');
    to(saved ? 'trip' : 'saved');
  };
  const pay = () => {
    if (!signedIn) { signInThenCheckout(); return; }
    if (paying) return;
    setPaying(true);
    timer.current = window.setTimeout(() => {
      setPaying(false);
      // Mock gateway: a UPI ID containing "fail" is declined, so the failure state can be reached.
      if (ui.pay === 'upi' && /fail/i.test(ui.upi)) { to('payfail'); return; }
      const st = market.get();
      const g = gapForTrip(st, ME, trip.id);
      const attr = attributionFor(st, ME);
      const b = buildBooking({ state: st, travelerId: ME, guestName: ui.guest.name, trip, sel, gap: g, creatorId: attr?.creatorId ?? trip.creatorId, now: new Date().toISOString() });
      dispatch({ type: 'booking/create', booking: b });
      patchUi({ hold: undefined });
      go('trip', 'booked', { b: b.id });
    }, 900);
  };
  const bookGap = () => { if (!gap || !gapStay) return; setSel(trip, { stayId: gapStay.id, dateLabel: gap.datesLabel }); to('customize', { gap: '1' }); };

  const back = () => {
    if (isTripPage) {
      if (from === 'dm') go('social', 'dm', { c: trip.creatorId, s: trip.slug });
      else if (from?.startsWith('shop:')) go('discover', 'creator', { c: from.slice(5) });
      else if (from === 'saved') go('trips', 'saved');
      else go('discover', 'feed');
    } else if (isForYou) to('trip', { gap: undefined });
    else if (screen === 'customize') to(gapParam === '1' ? 'foryou' : 'trip');
    else if (screen === 'booked') go('trips', 'upcoming');
    else to('customize');
  };
  useEscape(back);

  const HEAD: Record<string, [string, string]> = {
    trip: [`${trip.place} · by ${creator.handle}`, trip.title], saved: [`${trip.place} · by ${creator.handle}`, trip.title],
    customize: ['Step 1 of 2', 'Make it yours'], checkout: ['Step 2 of 2', 'Checkout'], payfail: ['Step 2 of 2', 'Checkout'],
    booked: [trip.place, 'All set'], foryou: [`For you, ${me.name.split(' ')[0]}`, 'The trip you saved'], held: [`For you, ${me.name.split(' ')[0]}`, 'The trip you saved'],
  };
  const noGapOffer = isForYou && !gapQ;
  const cta: Record<string, [string, string]> = {
    trip: ['Customize and book', 'arrow_forward'], saved: ['Customize and book', 'arrow_forward'], customize: ['Continue', 'arrow_forward'],
    checkout: [`Pay ${formatINR(q.total)}`, 'lock'], payfail: ['Try again', 'refresh'], booked: ['View my trip', 'arrow_forward'],
    foryou: [noGapOffer ? 'Customize and book' : 'Book at this price', 'arrow_forward'], held: [noGapOffer ? 'Customize and book' : 'Book at this price', 'arrow_forward'],
  };
  const next = () => {
    if (isTripPage) to('customize', { gap: undefined });
    else if (isForYou) { if (gapQ) bookGap(); else to('customize', { gap: undefined }); }
    else if (screen === 'customize') { if (!signedIn) signInThenCheckout(); else to('checkout'); }
    else if (screen === 'checkout' || screen === 'payfail') pay();
    else if (screen === 'booked') go('trips', 'detail', { b: booking?.id });
  };

  const share = async () => { const link = `${SITE}/${trip.creatorId}/${trip.slug}`; flash((await copyText(link)) ? 'Trip link copied' : `Copy this link: ${link}`); };
  const onTrip = isTripPage || isForYou;
  const placeScore = s.reviews.filter((r) => r.tripId === trip.id);
  const rating = placeScore.length ? (placeScore.reduce((a, r) => a + r.rating, 0) / placeScore.length).toFixed(1) : '4.8';
  const seg = (
    <SegmentedControl size="sm" aria-label="Trip or offers" value={isForYou ? 'foryou' : 'trip'} onChange={(v) => to(v === 'foryou' ? 'foryou' : saved ? 'saved' : 'trip')}
      options={[{ value: 'trip', label: 'Trip' }, { value: 'foryou', label: 'For you', count: gapQ ? 1 : undefined }]} />
  );
  const isBooked = screen === 'booked';
  const showTotal = onTrip || screen === 'customize';

  return (<>
    <div className={onTrip ? 'scroll tvx tvt' : isBooked ? 'scroll tvx tvb' : 'scroll tvx'}>
      {onTrip ? (<>
        <div style={{ position: 'relative', height: 300, flexShrink: 0 }}>
          <img src={asset(trip.img)} alt={`Illustrated ${trip.place}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 'max(54px, env(safe-area-inset-top))', left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
            <IconButton icon="arrow_back" label="Back" variant="white" onClick={back} />
            <span style={{ display: 'flex', gap: 8 }}>
              <IconButton icon="ios_share" label="Share trip" variant="white" onClick={share} />
              {isTripPage && <IconButton icon="favorite" label={saved ? 'Remove from saved trips' : 'Save trip'} variant={saved ? 'primary' : 'white'} onClick={onSave} />}
            </span>
          </div>
        </div>
        <div className="tv-sheet">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="tv-av tv-av22"><Avatar initials={creator.ini} size={24} name={creator.name} /></span><span style={{ fontSize: 12, fontWeight: 590, color: 'var(--primary)' }}>Trip by {creator.handle}</span></span>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700, letterSpacing: '-.016em' }}>{tripName(trip)}</h1>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, lineHeight: '16px', color: 'var(--muted)', flexWrap: 'wrap' }}>
              <Icon name="location_on" size={14} />{placeLine(trip.place)}<span>·</span><span style={{ display: 'inline-flex', color: '#E6A817' }}><Icon name="star" size={14} /></span>{rating} · {trip.travelersBooked.toLocaleString('en-IN')} travelers
            </span>
          </div>
          {seg}
          {isTripPage && <TripPage trip={trip} q={q} saved={saved} />}
          {isForYou && <ForYou trip={trip} screen={screen} gap={gap} gapStay={gapStay} onHold={() => { startHold(trip.id); to('held'); }} onSave={onSave} saved={saved} />}
        </div>
      </>) : (<>
        {!isBooked && (
          <div className="head" style={{ justifyContent: 'space-between' }}>
            <IconButton icon="arrow_back" label="Back" variant="white" onClick={back} />
            <div className="col1" style={{ alignItems: 'center', textAlign: 'center' }}><span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 590 }}>{HEAD[screen]![1]}</span><span className="m11">{HEAD[screen]![0]}</span></div>
            <span style={{ width: 40, flexShrink: 0 }} />
          </div>
        )}
        {screen === 'customize' && <Customize trip={trip} gap={gap} />}
        {(screen === 'checkout' || screen === 'payfail') && <Checkout trip={trip} q={q} failed={screen === 'payfail'} />}
        {isBooked && booking && <Booked trip={trip} b={booking} onView={next} onShare={share} />}
      </>)}
    </div>

    {!isBooked && (
      <FooterPill gap={14} className="tv">
        {showTotal && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 1 }}>
            <span style={{ fontSize: 11, lineHeight: '14px', color: 'var(--muted)' }}>{isForYou && gapQ ? 'Gap Night total for 2' : 'Total for 2 travelers'}</span>
            <span style={{ fontSize: 20, lineHeight: '24px', fontWeight: 700, letterSpacing: '-.008em' }}>{formatINR(isForYou && gapQ ? gapQ.total : q.total)}</span>
          </div>
        )}
        <Button variant="primary" size="lg" icon={screen === 'checkout' ? 'lock' : undefined} iconRight={screen === 'checkout' || onTrip ? undefined : cta[screen]![1]} loading={paying} block={!showTotal} onClick={next}>{cta[screen]![0]}</Button>
      </FooterPill>
    )}
    <ToastHost />
  </>);
}

/** The itinerary: stops from the trip, the chosen stay on day 1 and only the experiences the traveler kept. */
function dayPlan(trip: MTrip, stay: MStay, expIds: string[]) {
  type Item = { name: string; meta: string; img: string; tag: 'Bookable' | 'Tip'; hue: 'moss' | 'charcoal' };
  const stayItem = (): Item => ({ name: `Check in · ${stay.name}`, meta: '14:00 · stay', img: stay.img, tag: 'Bookable', hue: 'moss' });
  const days = trip.itinerary.map((d) => ({ n: d.n, title: d.title, items: [] as Item[] }));
  if (!days.length) return days;
  const placed = new Set<string>();
  let stayPlaced = false;
  trip.itinerary.forEach((d, i) => d.stops.forEach((st) => {
    const exp = trip.experiences.find((e) => e.id === st.id);
    const item = (e: typeof exp): Item => ({ name: e!.name, meta: e!.time, img: e!.img, tag: 'Bookable', hue: 'moss' });
    if (st.id === 'checkin' || (st.kind === 'Stay' && st.bookable)) { stayPlaced = true; days[i]!.items.push(stayItem()); }
    else if (exp) { placed.add(exp.id); if (expIds.includes(exp.id)) days[i]!.items.push(item(exp)); }
    else days[i]!.items.push({ name: st.name, meta: `${st.time ?? (st.kind === 'Tip' ? 'Local tip' : st.kind)}${st.kind === 'Museum' ? ' · museum' : ''}`, img: st.img ?? trip.img, tag: 'Tip', hue: 'charcoal' });
  }));
  if (!stayPlaced) days[0]!.items.unshift(stayItem());
  trip.experiences.filter((e) => !placed.has(e.id) && expIds.includes(e.id)).forEach((e) => days[Math.min(days.length, Math.max(1, e.day)) - 1]!.items.push({ name: e.name, meta: e.time, img: e.img, tag: 'Bookable', hue: 'moss' }));
  return days;
}

/** Icon and tint for an itinerary stop. */
function stopLook(name: string, tag: string) {
  if (/check in|stay/i.test(name)) return { icon: 'bed', bg: '#E4EDF7', fg: '#4C7FA6' };
  if (/lunch|dinner|breakfast|cook|food|café|cafe|thali|kitchen|restaurant/i.test(name)) return { icon: 'restaurant', bg: '#FAF0E0', fg: '#B07F2E' };
  if (/boat|sunset|evening|night|cruise/i.test(name)) return { icon: 'dark_mode', bg: '#E4EDF7', fg: '#4C7FA6' };
  return { icon: 'location_on', bg: '#E3EFE6', fg: tag === 'Tip' ? '#3F7A52' : '#3F7A52' };
}

function TripPage({ trip, q, saved }: { trip: MTrip; q: ReturnType<typeof quoteSelection>; saved: boolean }) {
  const { s, selFor } = useSession();
  const creator = s.creators[trip.creatorId]!;
  const sel = selFor(trip);
  const days = dayPlan(trip, q.stay, sel.expIds);
  const reviews = s.reviews.filter((r) => r.tripId === trip.id && r.tip.trim());
  return (<>
    {saved && <Banner tone="success" icon="favorite" title="Saved to your trips">We'll WhatsApp you if the price drops or rooms run low. Credit stays with {creator.handle} for 60 days.</Banner>}
    {days.map((d) => (
      <div key={d.n} className="tv-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 590 }}>Day {d.n} · {d.title}</span>
          <span style={{ fontSize: 12, lineHeight: '15px', color: 'var(--muted)' }}>{d.items.length} stop{d.items.length === 1 ? '' : 's'}</span>
        </div>
        {d.items.map((st, i) => { const l = stopLook(st.name, st.tag); return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="tv-ico" style={{ background: l.bg, color: l.fg }}><Icon name={l.icon} size={17} /></span>
            <div className="col1" style={{ gap: 1 }}><span className="ell" style={{ fontSize: 14, lineHeight: '18px', fontWeight: 590 }}>{st.name}</span><span style={{ fontSize: 12, lineHeight: '15px', color: 'var(--muted)' }}>{st.meta}</span></div>
            {st.tag === 'Bookable' ? <span className="tv-chip ok">Bookable</span> : <span className="tv-chip" style={{ background: '#E6E8EB', color: '#2C3543' }}>Tip</span>}
          </div>
        ); })}
      </div>
    ))}
    <MapSection trip={trip} stay={q.stay} />
    <div className="tv-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <img src={asset(q.stay.img)} alt="" style={{ width: 84, height: 84, borderRadius: 16, objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, flex: 1, minWidth: 0 }}>
        {q.stay.tier === 'creator_pick' ? <span className="tv-chip pick">{creator.name.split(' ')[0]}’s pick</span> : <span className="tv-chip" style={{ background: '#E6E8EB', color: '#2C3543' }}>{TIER_LABEL[q.stay.tier]}</span>}
        <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 590 }}>{q.stay.name}</span>
        <span style={{ fontSize: 12, lineHeight: '15px', color: 'var(--muted)' }}>{q.stay.desc.split(',')[0]} · {tripNights(trip)} night{tripNights(trip) === 1 ? '' : 's'}</span>
        <span style={{ fontSize: 12, lineHeight: '15px', fontWeight: 590, color: 'var(--primary)' }}>{formatINR(q.nightly)} a night</span>
      </div>
    </div>
    {reviews.length > 0 && (
      <Widget title="Was it like the reel?" subtitle={`${reviews.length} traveler tip${reviews.length === 1 ? '' : 's'}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((r) => (
            <div key={r.bookingId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge tone={r.matchesReel === 'no' ? 'warning' : 'success'}>{r.matchesReel === 'spot' ? 'Spot on' : r.matchesReel === 'mostly' ? 'Mostly' : 'Not really'}</Badge>
                <span className="m11">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </span>
              <span className="body">{r.tip}</span>
            </div>
          ))}
        </div>
      </Widget>
    )}
  </>);
}

function Customize({ trip, gap }: { trip: MTrip; gap?: MGapNight }) {
  const { s, selFor, setSel } = useSession();
  const creator = s.creators[trip.creatorId]!;
  const sel = selFor(trip);
  const dates = tripDateOptions(trip, gap);
  const nights = tripNights(trip);
  const gapOffDates = !!gap && !dates.length;
  void gapOffDates;
  const gapMissed = !!gap && sel.dateLabel !== gap.datesLabel && dates.includes(gap.datesLabel);
  return (<>
    <Banner tone="success" icon="verified" title={`Credit stays with ${creator.handle}`}>Change dates, stay or experiences. Her link still gets the booking.</Banner>
    <Widget title="Dates" subtitle={nights === 2 ? 'Fri to Sun, 2 nights' : `${nights} night${nights === 1 ? '' : 's'}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {dates.map((d) => <Chip key={d} selected={sel.dateLabel === d} icon="calendar_today" onClick={() => setSel(trip, { dateLabel: d })}>{d}</Chip>)}
        </div>
        {gapMissed && <span className="m11">The Gap Night rate of {formatINR(gap!.rate)} applies to {gap!.datesLabel} only.</span>}
      </div>
    </Widget>
    <Widget title="Stay" subtitle="Pick one">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {orderedStays(trip).map((h) => {
          const on = sel.stayId === h.id;
          const rate = gap && gap.hotelId === h.hotelId && gap.roomTypeId === h.roomTypeId && sel.dateLabel === gap.datesLabel ? gap.rate : h.nightly;
          return (
            <button key={h.id} className="pick" aria-pressed={on} onClick={() => setSel(trip, { stayId: h.id })} style={{ padding: 8, border: `1px solid ${on ? 'var(--primary-edge)' : 'transparent'}`, background: on ? 'var(--surface-tint)' : 'transparent' }}>
              <img src={asset(h.img)} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
              <span className="col1"><span style={label10}>{TIER_LABEL[h.tier]}</span><span className="t13">{h.name}</span><span className="m11">{h.desc}</span></span>
              <span className="t13">{formatINR(rate)}</span>
            </button>
          );
        })}
      </div>
    </Widget>
    {trip.experiences.length > 0 && (
      <Widget title="Experiences" subtitle="Prices for 2">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {trip.experiences.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, borderBottom: '1px solid var(--divider)' }}>
              <img src={asset(e.img)} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
              <span className="col1"><span className="t13">{e.name}</span><span className="m11">Day {e.day} · {e.time.split('·')[1]?.trim() ?? e.time} · {formatINR(e.pricePerPerson * 2)}</span></span>
              <Toggle checked={sel.expIds.includes(e.id)} aria-label={e.name} onChange={(v) => setSel(trip, { expIds: v ? [...sel.expIds, e.id] : sel.expIds.filter((x) => x !== e.id) })} />
            </div>
          ))}
        </div>
      </Widget>
    )}
  </>);
}

function Checkout({ trip, q, failed }: { trip: MTrip; q: ReturnType<typeof quoteSelection>; failed: boolean }) {
  const { s, ui, patchUi, selFor } = useSession();
  const now = useNow();
  const sel = selFor(trip);
  const attr = attributionFor(s, ME, now);
  const creatorId = attr?.creatorId ?? trip.creatorId;
  const handle = (s.creators[creatorId]?.handle ?? '').slice(1);
  const holding = ui.hold?.tripId === trip.id;
  const left = holding ? Math.max(0, new Date(ui.hold!.until).getTime() - now.getTime()) : 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const credit = creditLine(handle, attr ? new Date(attr.openedAt) : now);
  const guest = (k: 'name' | 'mobile' | 'email') => ({ value: ui.guest[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => patchUi({ guest: { ...ui.guest, [k]: e.target.value } }) });
  return (<>
    {failed && <Banner tone="danger" icon="credit_card_off" title="Payment didn't go through">Your UPI app declined the request. No money was taken. Try again or pay by card.</Banner>}
    {holding && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FBF0E3', borderRadius: 16, padding: '12px 14px', flexShrink: 0 }}>
        <span style={{ color: '#B8741A', display: 'flex' }}><Icon name="schedule" size={18} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 13, lineHeight: '16px', fontWeight: 590, color: '#B8741A' }}>{left > 0 ? `Your room is held for ${mm}:${ss}` : 'Your hold ended'}</span>
          <span style={{ fontSize: 11, lineHeight: '14px', color: 'rgba(184,116,26,.85)' }}>{left > 0 ? 'Pay to confirm before the hold ends' : 'We’ll check the rooms are still free when you pay.'}</span>
        </span>
      </div>
    )}
    <div className="tv-card" style={{ padding: '12px 12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <img src={asset(q.stay.img)} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span className="ell" style={{ fontSize: 15, lineHeight: '19px', fontWeight: 590 }}>{tripName(trip)}</span>
        <span className="ell" style={{ fontSize: 12, lineHeight: '15px', color: 'var(--muted)' }}>{q.stay.name} · {q.stay.desc.split(',')[0]}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, lineHeight: '15px', fontWeight: 510, color: 'var(--primary)' }}><Icon name="calendar_month" size={12} />{sel.dateLabel} · 2 travelers</span>
      </span>
    </div>
    <div className="tv-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="tv-row"><span>Stay · {q.stay.name}</span><span>{formatINR(q.roomValue)}</span></div>
      <div className="tv-row"><span>Experiences · {q.experienceCount}</span><span>{formatINR(q.experiencesValue)}</span></div>
      {q.gap
        ? <div className="tv-row" style={{ color: '#0FA37F' }}><span style={{ color: '#0FA37F' }}>Gap Night rate, {formatINR(q.gapSaving / q.nights)} off a night</span><span style={{ color: '#0FA37F' }}>{formatINR(-q.gapSaving)}</span></div>
        : q.creatorSaving > 0 && <div className="tv-row"><span style={{ color: '#0FA37F' }}>{s.creators[creatorId]?.name.split(' ')[0]}’s follower price</span><span style={{ color: '#0FA37F' }}>{formatINR(-q.creatorSaving)}</span></div>}
      <div className="tv-row"><span>Taxes and fees</span><span>₹0</span></div>
      <div className="tv-hr" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 15, fontWeight: 590 }}>Total</span><span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700, letterSpacing: '-.008em' }}>{formatINR(q.total)}</span></div>
      <span className="m11">Taxes included. Free cancellation until {freeCancelUntil(sel.dateLabel)}.</span>
      <span className="m11" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="verified" size={16} />{credit}</span>
    </div>
    <div className="tv-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 590 }}>Pay with</span>
      <SegmentedControl options={[{ value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }, { value: 'emi', label: 'EMI' }]} value={ui.pay} onChange={(v) => patchUi({ pay: v as 'upi' | 'card' | 'emi' })} size="sm" aria-label="Payment method" />
      {ui.pay === 'upi'
        ? <TextField label="UPI ID" icon="qr_code" value={ui.upi} onChange={(e) => patchUi({ upi: e.target.value })} autoComplete="off" />
        : <span className="m11">You'll enter your {ui.pay === 'card' ? 'card' : 'EMI card'} details in the secure payment window.</span>}
    </div>
    <div className="tv-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 590 }}>Lead guest</span>
      <TextField label="Full name" autoComplete="name" {...guest('name')} />
      <TextField label="Mobile" icon="call" autoComplete="tel" inputMode="tel" {...guest('mobile')} />
      <TextField label="Email" icon="mail" hint="Vouchers are sent here" autoComplete="email" inputMode="email" {...guest('email')} />
    </div>
  </>);
}

function Booked({ trip, b, onView, onShare }: { trip: MTrip; b: MBooking; onView: () => void; onShare: () => void }) {
  const { ui } = useSession();
  const { s } = useSession();
  const creator = s.creators[b.creatorId];
  const stay = trip.stays.find((x) => x.id === b.stayId);
  const cancelled = b.status === 'cancelled';
  const d = stayDays(b.datesLabel);
  const via = ui.pay === 'card' ? 'card' : ui.pay === 'emi' ? 'EMI' : 'UPI';
  const first = creator?.name.split(' ')[0] ?? 'The creator';
  return (<>
    <div style={{ alignSelf: 'center', width: 96, height: 96, borderRadius: 99, background: cancelled ? 'var(--danger-tint)' : '#D9F1E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ width: 68, height: 68, borderRadius: 99, background: cancelled ? 'var(--danger-strong)' : '#0FA37F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={cancelled ? 'close' : 'check'} size={34} /></span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }}>
      <h1 style={{ margin: 0, fontSize: 30, lineHeight: '36px', fontWeight: 700, letterSpacing: '-.018em' }}>{cancelled ? 'Booking cancelled' : 'You’re booked'}</h1>
      <span style={{ fontSize: 15, lineHeight: '20px', color: 'var(--muted)' }}>{stay?.name ?? b.roomName} is {cancelled ? 'cancelled' : 'confirmed'} for {b.datesLabel}</span>
    </div>
    <span style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 99, background: 'rgba(255,255,255,.8)', border: '1px solid #E7EAED', fontSize: 13, fontWeight: 590, color: 'var(--primary)' }}><Icon name="confirmation_number" size={14} />{b.id}</span>
    <div className="tv-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <img src={asset(stay?.img ?? trip.img)} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700, letterSpacing: '-.005em' }}>{tripName(trip)}</span>
          <span style={{ fontSize: 13, lineHeight: '16px', color: 'var(--muted)' }}>{stay?.desc.split(',')[0] ?? b.roomName} · {b.guests} travelers</span>
        </span>
        <div className="tv-hr" />
        <div className="tv-row"><span>Check-in</span><span>{d.inn} · from 2 pm</span></div>
        <div className="tv-row"><span>Check-out</span><span>{d.out} · by 11 am</span></div>
        <div className="tv-row"><span>{cancelled ? 'Total' : 'Paid'}</span><span style={{ color: cancelled ? 'var(--ink)' : '#0FA37F' }}>{formatINR(b.total)}{cancelled ? '' : ` via ${via}`}</span></div>
      </div>
    </div>
    {!cancelled && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#E7F6F0', borderRadius: 18, padding: 14, flexShrink: 0 }}>
        <span style={{ color: 'var(--primary)', display: 'flex' }}><Icon name="chat_bubble" size={18} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 590, color: 'var(--primary)' }}>Voucher sent on WhatsApp</span>
          <span style={{ fontSize: 12, lineHeight: '16px', color: '#15616D' }}>Show it at the front desk. {first} earns a share after you check out.</span>
        </span>
      </div>
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Button variant="primary" size="lg" block icon="luggage" onClick={onView}>View my trip</Button>
      <Button variant="secondary" size="lg" block icon="ios_share" onClick={onShare}>Share with friends</Button>
    </div>
  </>);
}

function ForYou({ trip, screen, gap, gapStay, onHold, onSave, saved }: { trip: MTrip; screen: string; gap?: MGapNight; gapStay?: MStay; onHold: () => void; onSave: () => void; saved: boolean }) {
  const { s, me, ui, flash } = useSession();
  const now = useNow(screen === 'held');
  const creator = s.creators[trip.creatorId]!;
  const held = screen === 'held';
  const attr = attributionFor(s, me.id);
  if (!gap || !gapStay) {
    return (<>
      <div style={{ paddingTop: 32 }}>
        <EmptyState icon="notifications" title="No offers on this trip right now">{saved ? 'We’ll WhatsApp you the moment the price drops or rooms run low on your dates.' : 'Save this trip and we’ll WhatsApp you if the price drops or rooms run low.'}</EmptyState>
      </div>
      {!saved && <Button variant="primary" size="lg" block icon="bookmark" onClick={onSave}>Save this trip</Button>}
    </>);
  }
  const nightlyOld = gap.campaignRate, left = gap.rooms - gap.booked;
  const hours = Math.max(1, Math.ceil((new Date(gap.endsAt).getTime() - Date.now()) / 3_600_000));
  const hold = ui.hold?.tripId === trip.id ? new Date(ui.hold.until) : null;
  const rem = hold ? Math.max(0, hold.getTime() - now.getTime()) : 0;
  const link = `${SITE}/${trip.creatorId}/${trip.slug}?gap=${gap.id}`;
  const budget = ({ low: 'under ₹2k', mid: '₹2k to ₹5k', high: '₹5k plus' } as const)[me.prefs.budget];
  const savedOn = new Date(attr?.openedAt ?? Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).split(' ').reverse().join(' ');
  return (<>
    <Widget title={`${trip.title} just got cheaper`} subtitle={`Gap Night · ${dots(gap.datesLabel)} · ends in ${hours} h`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', height: 200, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <img src={asset(gapStay.img)} alt={`Illustrated rooms at ${gapStay.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 12, left: 12 }}><Badge tone="warning" icon="schedule">{left} room{left === 1 ? '' : 's'} left</Badge></div>
        </div>
        <span className="body">{gapStay.name} opened {(gapStay.desc.split(',')[0] ?? 'rooms').toLowerCase()} on the dates you saved. {creator.name.split(' ')[0]}'s pick drops from {formatINR(nightlyOld)} to <b style={{ color: 'var(--ink)' }}>{formatINR(gap.rate)} a night</b>.</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag hue="clay">{gapStay.name}</Tag><Tag hue="moss">Save {formatINR((nightlyOld - gap.rate) * tripNights(trip))}</Tag><Tag hue="sky">via {creator.handle}</Tag>
        </div>
        {held && hold && <Banner tone="success" icon="check_circle" title={`Rooms held for ${HOLD_MINUTES} minutes`}>Invite sent to your group. Pay before {clock(hold)} to keep them.</Banner>}
        {held && hold && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TextField label="Invite link for your group" value={link} readOnly icon="link" onFocus={(e) => e.currentTarget.select()} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button variant="secondary" icon="content_copy" onClick={async () => flash((await copyText(link)) ? 'Invite link copied' : 'Copy the link from the field')}>Copy link</Button>
              <span className="m11" style={{ flex: 1, textAlign: 'right' }}>{rem > 0 ? `${String(Math.floor(rem / 60000)).padStart(2, '0')}:${String(Math.floor((rem % 60000) / 1000)).padStart(2, '0')} left to pay` : 'Hold ended. Book again to hold new rooms.'}</span>
            </div>
          </div>
        )}
        {!held && <Button variant="secondary" block icon="group_add" onClick={onHold}>Hold rooms and invite my group</Button>}
      </div>
    </Widget>
    <Widget title="Why you're seeing this">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>
        {[['bookmark', `You saved this trip on ${savedOn}`], ['event_available', 'It matches the dates you looked at'], ['payments', `Within your ${budget} budget`]].map(([i, t]) => (
          <span key={t} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name={i!} size={18} />{t}</span>
        ))}
      </div>
    </Widget>
  </>);
}

