import { useEffect, useMemo, useState } from 'react';
import { formatINR, refundAmount } from '@staystory/core';
import { Avatar, Badge, Banner, Button, Calendar, Chip, EmptyState, Icon, IconButton, Radio, SegmentedControl, TextField, Toggle, Widget } from '@staystory/ui';
import { changeOptions, daysUntil, freeCancelUntil, savedStatus, type MBooking, type MTrip } from '@staystory/market';
import { asset, go, hashFor, sentence, tripHash } from '../lib';
import { useSession } from '../session';
import { FooterPill, LinkButton, QrCode, Sheet, ToastHost, TravelerDock, useEscape } from '../ui';

export const TRIPS_SCREENS = ['upcoming', 'past', 'saved', 'empty', 'detail', 'change', 'cancel', 'cancelled', 'review'];
const LISTS = ['upcoming', 'past', 'saved', 'empty'];
const BACK: Record<string, string> = { detail: 'upcoming', change: 'detail', cancel: 'detail', cancelled: 'upcoming', review: 'past' };
const HOTEL_PHONE = '+91 294 242 0000';
const SUPPORT = { phone: '+91 80 4000 1234', whatsapp: '918040001234', email: 'help@staystory.in' };
/** The saved list names two trips differently from their shop cards. */
const SAVED_TITLE: Record<string, string> = { 'hari-rishikesh': 'Rishikesh reset', 'kabir-gokarna': 'Cliffs and coves, Gokarna' };
const GOA = { id: 'goa-past', title: 'Monsoon Goa', dates: 'Aug 14 – 18', handle: '@kabir.coast', tripId: 'kabir-goa' };
const MONTH_YEAR = (label: string) => (label.startsWith('Dec') ? { year: 2026, month: 11 } : label.startsWith('Jan') ? { year: 2027, month: 0 } : { year: 2027, month: 1 });

export function Trips({ screen }: { screen: string }) {
  const S = useSession();
  const { s, me, route } = S;
  const mine = useMemo(() => s.bookings.filter((b) => b.travelerId === me.id), [s.bookings, me.id]);
  const upcoming = mine.filter((b) => b.status === 'upcoming' || b.status === 'in_house');
  const completed = mine.filter((b) => b.status === 'completed');
  const cancelledB = mine.filter((b) => b.status === 'cancelled');
  const reviewedIds = new Set(s.reviews.map((r) => r.bookingId));
  const unreviewed = completed.filter((b) => !reviewedIds.has(b.id));
  // The Past tab counts stays waiting for a review; the upcoming stay is the one that will be, until a review exists.
  const pending = unreviewed.length || (s.reviews.length === 0 && upcoming.length > 0 ? 1 : 0);
  const isList = LISTS.includes(screen);
  const bid = route.params.b;
  const byId = mine.find((b) => b.id === bid);
  const isGoa = bid === GOA.id;

  // The booking a detail screen is about: the one named in the link, else the most relevant one.
  const pickFor = (sc: string) => byId ?? (sc === 'cancelled' ? cancelledB[0] : sc === 'review' ? completed[0] : upcoming[0]) ?? mine[0];
  const b = isList ? undefined : pickFor(screen);
  const to = (sc: string, extra: Record<string, string | undefined> = {}) => go('trips', sc, { b: b?.id ?? bid, ...extra });
  const back = () => { if (isList) return; if (isGoa) go('trips', 'past'); else to(BACK[screen]!, screen === 'cancelled' || screen === 'review' ? { b: undefined } : {}); };
  useEscape(isList ? undefined : back);

  const trip = b ? s.trips.find((t) => t.id === b.tripId) : undefined;
  // A detail link without a usable booking has nowhere to go: say so and offer the next step.
  if (!isList && !isGoa && (!b || !trip)) {
    return (<>
      <div className="scroll">
        <div className="head"><IconButton icon="arrow_back" label="Back" variant="white" onClick={() => go('trips', 'upcoming')} /><span className="col1"><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>Trip not found</span></span></div>
        <div style={{ paddingTop: 48 }}><EmptyState icon="luggage" title="We can’t find that booking">Check the booking number, or open it from your trips.</EmptyState></div>
        <Button variant="primary" size="lg" block onClick={() => go('trips', 'upcoming')}>Go to my trips</Button>
      </div>
      <ToastHost />
    </>);
  }
  const cancelled = b?.status === 'cancelled';
  const detailScreen = screen === 'cancelled' && !cancelled ? 'detail' : screen === 'detail' && cancelled ? 'cancelled' : screen;

  return (<>
    {isList ? <Lists screen={screen} upcoming={upcoming} completed={completed} cancelled={cancelledB} reviewedIds={reviewedIds} unreviewed={pending} />
      : isGoa ? <GoaDetail />
      : <Detail screen={detailScreen} b={b!} trip={trip!} to={to} back={back} />}
    <ToastHost />
  </>);
}

function Head({ meta, title, onBack }: { meta: string; title: string; onBack?: () => void }) {
  return (
    <div className="head">
      {onBack && <IconButton icon="arrow_back" label="Back" variant="white" onClick={onBack} />}
      <span className="col1"><span className="m11">{meta}</span><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>{title}</span></span>
    </div>
  );
}

function Lists({ screen, upcoming, completed, cancelled, reviewedIds, unreviewed }: { screen: string; upcoming: MBooking[]; completed: MBooking[]; cancelled: MBooking[]; reviewedIds: Set<string>; unreviewed: number }) {
  const { s, me } = useSession();
  const tab = screen === 'empty' ? 'upcoming' : screen;
  const tripOf = (id: string) => s.trips.find((t) => t.id === id);
  const savedTrips = me.savedTripIds.map(tripOf).filter(Boolean) as MTrip[];

  const pastRows = [
    ...completed.map((b) => { const t = tripOf(b.tripId); const done = reviewedIds.has(b.id); return { key: b.id, title: t?.title ?? b.roomName, meta: `${b.datesLabel} · ${t?.stays.find((x) => x.id === b.stayId)?.name ?? b.roomName}`, img: t?.img ?? 'udaipur', status: done ? 'Reviewed' : 'Rate your stay', tone: done ? 'neutral' as const : 'warning' as const, open: () => go('trips', 'review', { b: b.id }) }; }),
    ...cancelled.map((b) => { const t = tripOf(b.tripId); return { key: b.id, title: t?.title ?? b.roomName, meta: `${b.datesLabel} · refund ${formatINR(refundAmount(b.total))}`, img: t?.img ?? 'udaipur', status: 'Cancelled', tone: 'danger' as const, open: () => go('trips', 'cancelled', { b: b.id }) }; }),
    { key: GOA.id, title: GOA.title, meta: `${GOA.dates} · via ${GOA.handle}`, img: 'goa', status: 'Reviewed', tone: 'neutral' as const, open: () => go('trips', 'detail', { b: GOA.id }) },
  ];
  const savedRows = savedTrips.map((t) => {
    const st = savedStatus(s, me.id, t);
    return { key: t.id, title: SAVED_TITLE[t.id] ?? t.title, meta: st.meta, img: t.img, status: t.status === 'paused' ? 'Paused' : !st.gap && t.savedStatus ? t.savedStatus.text : st.label, tone: t.status === 'paused' ? 'neutral' as const : !st.gap && t.savedStatus ? t.savedStatus.tone : st.tone, open: () => (st.gap ? go('trip', 'foryou', { c: t.creatorId, s: t.slug, from: 'saved' }) : window.location.assign(tripHash(t, 'trip', { from: 'saved' }))) };
  });
  const rows = screen === 'past' ? pastRows : savedRows;

  return (<>
    <div className="scroll">
      <Head meta={me.name} title="My trips" />
      <SegmentedControl size="lg" aria-label="Trip lists" value={tab} onChange={(v) => go('trips', v)}
        options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past', count: unreviewed || undefined }, { value: 'saved', label: 'Saved' }]} />

      {(screen === 'upcoming' || screen === 'empty') && (upcoming.length > 0 && screen === 'upcoming' ? upcoming.map((b) => {
        const t = tripOf(b.tripId); const stay = t?.stays.find((x) => x.id === b.stayId); const n = b.experienceIds.length; const d = daysUntil(b.datesLabel);
        return (
          <Widget key={b.id} title={`${t?.place ?? 'Trip'} · ${b.datesLabel}`} subtitle={`${b.status === 'in_house' ? 'Checked in' : d === 0 ? 'Today' : `In ${d} day${d === 1 ? '' : 's'}`} · ${b.guests} adults`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative', height: 180, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <img src={asset(t?.img ?? 'udaipur')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 12, left: 12 }}><Badge tone={b.status === 'in_house' ? 'info' : 'success'} dot>{b.status === 'in_house' ? 'Checked in' : 'Confirmed'}</Badge></div>
              </div>
              <span className="body">{stay?.name ?? b.roomName} · {n} experience{n === 1 ? '' : 's'} · via {s.creators[b.creatorId]?.handle}</span>
              <Button variant="primary" block iconRight="arrow_forward" onClick={() => go('trips', 'detail', { b: b.id })}>Trip details</Button>
            </div>
          </Widget>
        );
      }) : (<>
        <div style={{ paddingTop: 64 }}><EmptyState icon="luggage" title="No upcoming trips">Trips you book from a creator's link appear here, with vouchers and check-in details.</EmptyState></div>
        <Button variant="primary" size="lg" block icon="explore" onClick={() => go('discover', 'feed')}>Discover trips</Button>
      </>))}

      {(screen === 'past' || screen === 'saved') && (rows.length > 0 ? (
        <Widget title={screen === 'past' ? 'Past trips' : 'Saved trips'} count={rows.length}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((r) => (
              <button key={r.key} className="reset" onClick={r.open} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', minHeight: 64, borderBottom: '1px solid var(--divider)', width: '100%' }}>
                <img src={asset(r.img)} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 4 }}><span className="t13">{r.title}</span><span className="m11">{r.meta}</span></span>
                <Badge tone={r.tone}>{r.status}</Badge>
              </button>
            ))}
          </div>
        </Widget>
      ) : (<>
        <div style={{ paddingTop: 48 }}><EmptyState icon="bookmark" title="Nothing saved yet">Tap the bookmark on a trip and we'll WhatsApp you when the price drops or rooms run low.</EmptyState></div>
        <Button variant="primary" size="lg" block icon="explore" onClick={() => go('discover', 'feed')}>Discover trips</Button>
      </>))}
    </div>
    <TravelerDock active="trips" />
  </>);
}

function GoaDetail() {
  const { s } = useSession();
  const t = s.trips.find((x) => x.id === GOA.tripId);
  return (<>
    <div className="scroll">
      <Head meta="Completed trip" title={`${GOA.title} · ${GOA.dates}`} onBack={() => go('trips', 'past')} />
      <div style={{ position: 'relative', height: 200, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <img src={asset('goa')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', top: 12, left: 12 }}><Badge tone="neutral" dot>Completed</Badge></div>
      </div>
      <Widget title="Your stay" subtitle={`Booked via ${GOA.handle}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: '18px' }}>
          <div className="kv"><span>Dates</span><span style={{ fontWeight: 600 }}>{GOA.dates}</span></div>
          <div className="kv"><span>Your review</span><span style={{ fontWeight: 600 }}>Sent</span></div>
        </div>
      </Widget>
    </div>
    <FooterPill gap={8} padding="8px">
      <div style={{ flex: 1 }}><Button variant="primary" size="lg" block icon="refresh" onClick={() => (t ? window.location.assign(tripHash(t, 'trip', { from: 'saved' })) : go('discover', 'feed'))}>Book it again</Button></div>
    </FooterPill>
    <ToastHost />
  </>);
}

type Sheets = null | { kind: 'help' } | { kind: 'voucher'; name: string; meta: string };

function Detail({ screen, b, trip, to, back }: { screen: string; b: MBooking; trip: MTrip; to: (s: string, e?: Record<string, string | undefined>) => void; back: () => void }) {
  const { s, dispatch, flash } = useSession();
  const [sheet, setSheet] = useState<Sheets>(null);
  const [reason, setReason] = useState(0);
  const opts = useMemo(() => changeOptions(b), [b.datesLabel, b.nights, b.experienceIds.join()]);
  const [pick, setPick] = useState(() => Math.max(0, opts.findIndex((o) => !o.current)));
  const existing = s.reviews.find((r) => r.bookingId === b.id);
  const [rating, setRating] = useState(existing?.rating ?? 4);
  const [match, setMatch] = useState<string>(existing?.matchesReel ?? 'spot');
  const [tip, setTip] = useState(existing?.tip ?? 'Book the sunset boat for the second evening. The lake-view room is worth it.');
  const opt = opts[pick] ?? opts[0]!;
  const [view, setView] = useState(MONTH_YEAR(opt.label));
  useEffect(() => setView(MONTH_YEAR(opt.label)), [opt.label]);
  const stay = trip.stays.find((x) => x.id === b.stayId);
  const creator = s.creators[b.creatorId];
  const cancelled = b.status === 'cancelled';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stay?.name ?? b.roomName} ${trip.place}`)}`;
  const room = s.hotel.id === b.hotelId ? s.hotel.rooms.find((r) => r.id === b.roomTypeId) : undefined;
  const isSecond = b.status === 'in_house' || b.status === 'completed';
  const HEAD: Record<string, [string, string]> = {
    detail: [b.id, `${trip.place} · ${b.datesLabel}`], cancelled: [b.id, `${trip.place} · ${b.datesLabel}`],
    change: [trip.place, 'Change dates'], cancel: [trip.place, 'Cancel trip'], review: [trip.place, 'Rate your trip'],
  };

  const vouchers = [
    { name: `${stay?.name ?? b.roomName} · ${b.nights} night${b.nights === 1 ? '' : 's'}`, meta: `${sentence(b.roomName)}${room ? ` · ${room.meal.toLowerCase()}` : ''}`, img: stay?.img ?? trip.img },
    ...trip.experiences.filter((e) => b.experienceIds.includes(e.id)).map((e) => ({ name: e.name, meta: `Day ${e.day} · ${e.time.split('·')[0]!.trim()} · ${b.guests} ${/class|workshop|lesson/i.test(e.name) ? 'seats' : 'tickets'}`, img: e.id === 'cook' ? 'verandah' : e.img })),
  ];

  // Calendar: move between months and pick a weekend by its day.
  const monthShift = (d: number) => setView((v) => { const m = v.month + d; return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }; });
  const dayPick = (day: number) => {
    const i = opts.findIndex((o) => { const m = MONTH_YEAR(o.label); const d = Number(/(\d+)/.exec(o.label)![1]); return m.year === view.year && m.month === view.month && day >= d && day <= d + b.nights; });
    if (i >= 0) setPick(i);
  };
  const range = (): [number, number] => { const m = MONTH_YEAR(opt.label); const d = Number(/(\d+)/.exec(opt.label)![1]); return m.year === view.year && m.month === view.month ? [d, d + b.nights] : [0, 0]; };
  const calClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button'); const l = btn?.getAttribute('aria-label');
    if (l === 'Previous month') monthShift(-1); else if (l === 'Next month') monthShift(1);
  };

  const submitReview = () => {
    dispatch({ type: 'review/add', review: { bookingId: b.id, tripId: trip.id, hotelId: b.hotelId, rating, matchesReel: match as 'spot' | 'mostly' | 'no', tip: tip.trim(), createdAt: new Date().toISOString() } });
    flash('Review sent. Thank you.'); go('trips', 'past');
  };

  return (<>
    <div className="scroll">
      <Head meta={HEAD[screen]![0]} title={HEAD[screen]![1]} onBack={back} />

      {(screen === 'detail' || screen === 'cancelled') && (<>
        <div style={{ position: 'relative', height: 200, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <img src={asset(trip.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 12, left: 12 }}><Badge tone={cancelled ? 'danger' : b.status === 'completed' ? 'neutral' : 'success'} dot>{cancelled ? 'Cancelled' : b.status === 'completed' ? 'Completed' : b.status === 'in_house' ? 'Checked in' : 'Confirmed'}</Badge></div>
        </div>
        {cancelled && <Banner tone="success" icon="currency_rupee" title={`Refund of ${formatINR(refundAmount(b.total))} started`}>It reaches your UPI account in 5 to 7 working days. The creator's link is unaffected.</Banner>}
        <Widget title="Vouchers" subtitle={`${b.id} · show at check-in`}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {vouchers.map((v) => (
              <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, borderBottom: '1px solid var(--divider)' }}>
                <img src={asset(v.img)} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                <span className="col1"><span className="t13">{v.name}</span><span className="m11">{v.meta}</span></span>
                <IconButton icon="qr_code_2" label={`Show voucher, ${v.name}`} variant="ghost" onClick={() => setSheet({ kind: 'voucher', name: v.name, meta: v.meta })} />
              </div>
            ))}
          </div>
        </Widget>
        <Widget title="Check-in" subtitle={`${stay?.name ?? b.roomName}, ${s.hotel.id === b.hotelId ? 'Lal Ghat' : trip.place} · from 14:00`}>
          <div className="btn-row">
            <LinkButton href={mapsUrl} icon="directions" external>Directions</LinkButton>
            <LinkButton href={`tel:${HOTEL_PHONE.replace(/\s/g, '')}`} icon="call">Call hotel</LinkButton>
            <Button variant="ghost" icon="help" onClick={() => setSheet({ kind: 'help' })}>Help</Button>
          </div>
        </Widget>
      </>)}

      {screen === 'change' && (<>
        <div onClick={calClick}>
          <Calendar year={view.year} month={view.month} today={13} selected={0} range={range()} onSelect={dayPick} />
        </div>
        <Widget title="Available weekends" subtitle="Same stay and experiences">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {opts.map((d, i) => (
              <button key={d.label} className="pick" aria-pressed={pick === i} onClick={() => setPick(i)} style={{ padding: 12, minHeight: 52, border: `1px solid ${pick === i ? 'var(--primary-edge)' : 'transparent'}`, background: pick === i ? 'var(--surface-tint)' : 'transparent' }}>
                <span className="col1"><span className="t13">{d.label}</span><span className="m11">{d.sub}</span></span>
                <Badge tone={d.tone}>{d.current ? 'Current' : formatINR(d.delta).replace(/^(?=₹)/, '+')}</Badge>
              </button>
            ))}
          </div>
        </Widget>
      </>)}

      {screen === 'cancel' && (<>
        <Widget title="Refund estimate" subtitle={`Free cancellation until ${freeCancelUntil(b.datesLabel)}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: '18px' }}>
            <div className="kv"><span>Paid</span><span>{formatINR(b.total)}</span></div>
            <div className="kv"><span>Cancellation fee</span><span>{formatINR(0)}</span></div>
            <div style={{ height: 1, background: 'var(--divider)' }} />
            <div className="kv" style={{ alignItems: 'baseline' }}><span style={{ fontWeight: 600, color: 'var(--ink)' }}>Refund</span><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700, color: 'var(--success-ink)' }}>{formatINR(refundAmount(b.total))}</span></div>
          </div>
        </Widget>
        <Widget title="Why are you cancelling?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Plans changed', 'Found another trip', 'Too expensive', 'Something else'].map((l, i) => <Radio key={l} label={l} checked={reason === i} onChange={() => setReason(i)} />)}
          </div>
        </Widget>
      </>)}

      {screen === 'review' && (<>
        <div style={{ height: 160, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}><img src={asset(stay?.img ?? trip.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>
        <Widget title={`${stay?.name ?? b.roomName}, ${trip.place}`} subtitle={`Your stay, ${b.datesLabel.replace(' – ', ' to ')}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[1, 2, 3, 4, 5].map((n) => <IconButton key={n} icon="star" label={`${n} star${n === 1 ? '' : 's'}`} variant={n <= rating ? 'primary' : 'ghost'} aria-pressed={n === rating} onClick={() => setRating(n)} />)}
          </div>
        </Widget>
        <Widget title="Was it like the reel?" subtitle={`Shows on ${creator?.handle ?? 'the creator'}’s trip for the next traveler`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SegmentedControl options={[{ value: 'spot', label: 'Spot on' }, { value: 'mostly', label: 'Mostly' }, { value: 'no', label: 'Not really' }]} value={match} onChange={setMatch} size="sm" aria-label="Match to reel" />
            <TextField label="Tip for the next traveler" multiline value={tip} onChange={(e) => setTip(e.target.value)} />
          </div>
        </Widget>
      </>)}
    </div>

    <FooterPill gap={8} padding="8px">
      {screen === 'detail' && !isSecond && (<>
        <div style={{ flex: 1 }}><Button variant="secondary" size="lg" block onClick={() => to('cancel')}>Cancel trip</Button></div>
        <div style={{ flex: 1 }}><Button variant="primary" size="lg" block onClick={() => to('change')}>Change dates</Button></div>
      </>)}
      {screen === 'detail' && b.status === 'in_house' && <div style={{ flex: 1 }}><Button variant="primary" size="lg" block icon="help" onClick={() => setSheet({ kind: 'help' })}>Get help during your stay</Button></div>}
      {screen === 'detail' && b.status === 'completed' && <div style={{ flex: 1 }}><Button variant="primary" size="lg" block icon="star" onClick={() => go('trips', 'review', { b: b.id })}>{existing ? 'Update your review' : 'Rate your stay'}</Button></div>}
      {screen === 'change' && <div style={{ flex: 1 }}><Button variant="primary" size="lg" block disabled={opt.current} onClick={() => {
        dispatch({ type: 'booking/dates', id: b.id, datesLabel: opt.label, delta: opt.delta }); flash(`Dates changed to ${opt.label}`); to('detail');
      }}>Confirm new dates</Button></div>}
      {screen === 'cancel' && (<>
        <div style={{ flex: 1 }}><Button variant="tertiary" size="lg" block onClick={() => to('detail')}>Keep trip</Button></div>
        <div style={{ flex: 1 }}><Button variant="danger" size="lg" block onClick={() => { dispatch({ type: 'booking/cancel', id: b.id }); to('cancelled'); }}>Cancel and refund</Button></div>
      </>)}
      {screen === 'review' && <div style={{ flex: 1 }}><Button variant="primary" size="lg" block onClick={submitReview}>{existing ? 'Update review' : 'Submit review'}</Button></div>}
      {screen === 'cancelled' && <div style={{ flex: 1 }}><Button variant="primary" size="lg" block icon="explore" onClick={() => go('discover', 'feed')}>Find another trip</Button></div>}
    </FooterPill>

    {sheet?.kind === 'help' && (
      <Sheet title={`Help with ${b.id}`} onClose={() => setSheet(null)}>
        <span className="body">Quote the booking number <b style={{ color: 'var(--ink)' }}>{b.id}</b> when you get in touch. We reply within 10 minutes between 8:00 and 22:00.</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <LinkButton block href={`tel:${SUPPORT.phone.replace(/\s/g, '')}`} icon="call">Call StayStory, {SUPPORT.phone}</LinkButton>
          <LinkButton block href={`https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(`Hi, I need help with booking ${b.id}`)}`} icon="chat" external>Message us on WhatsApp</LinkButton>
          <LinkButton block href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent(`Booking ${b.id}`)}`} icon="mail">Email {SUPPORT.email}</LinkButton>
          <LinkButton block href={`tel:${HOTEL_PHONE.replace(/\s/g, '')}`} icon="hotel">Call {stay?.name ?? 'the hotel'} directly</LinkButton>
        </div>
      </Sheet>
    )}
    {sheet?.kind === 'voucher' && (
      <Sheet title="Voucher" onClose={() => setSheet(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <QrCode seed={`${b.id}|${sheet.name}`} />
          <span className="t13" style={{ textAlign: 'center' }}>{sheet.name}</span>
          <span className="m11" style={{ textAlign: 'center' }}>{sheet.meta}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: '18px' }}>
          <div className="kv"><span>Booking number</span><span style={{ fontWeight: 600 }}>{b.id}</span></div>
          <div className="kv"><span>Dates</span><span style={{ fontWeight: 600 }}>{b.datesLabel}</span></div>
          <div className="kv"><span>Guest</span><span style={{ fontWeight: 600 }}>{b.guestName}, {b.guests} adults</span></div>
        </div>
        <span className="m11">Show this at check-in. The hotel can also find you by booking number.</span>
      </Sheet>
    )}
  </>);
}

export function Profile() {
  const { me, dispatch, flash, gate, signedIn } = useSession();
  const [sheet, setSheet] = useState<null | 'phone' | 'style'>(null);
  const [phone, setPhone] = useState(me.whatsapp);
  const [styles, setStyles] = useState(me.prefs.styles);
  const [budget, setBudget] = useState<string>(me.prefs.budget);
  const priceAlerts = me.prefs.priceAlerts !== false;
  const setPrefs = (p: Partial<typeof me.prefs>) => dispatch({ type: 'traveler/patch', id: me.id, patch: { prefs: { ...me.prefs, ...p } } });
  const STYLE_ICONS = [['Heritage', 'account_balance'], ['Lakes', 'water'], ['Beaches', 'beach_access'], ['Mountains', 'landscape'], ['Food', 'restaurant'], ['Slow towns', 'local_cafe']];
  const rows: [string, string, string, () => void][] = [
    ['call', 'WhatsApp', me.whatsapp, () => { setPhone(me.whatsapp); setSheet('phone'); }],
    ['bookmark', 'Saved trips', String(me.savedTripIds.length), () => go('trips', 'saved')],
    ['tune', 'Travel style', me.prefs.styles.join(', ') || 'Not set', () => { setStyles(me.prefs.styles); setBudget(me.prefs.budget); setSheet('style'); }],
  ];
  useEscape(sheet ? () => setSheet(null) : undefined);
  return (<>
    <div className="scroll">
      <div className="head"><Avatar initials="MI" size={48} name={me.name} tone="solid" /><span className="col1"><span className="m11">Profile</span><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>{me.name}</span></span></div>
      <Widget title="Account">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map(([i, l, v, fn]) => (
            <button key={l} className="reset" onClick={fn} aria-label={`${l}, ${v}. Edit`} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, borderBottom: '1px solid var(--divider)', width: '100%' }}>
              <Icon name={i} size={20} /><span className="t13" style={{ flex: 1 }}>{l}</span><span className="m11 ell" style={{ maxWidth: 160 }}>{v}</span><Icon name="chevron_right" size={20} />
            </button>
          ))}
        </div>
      </Widget>
      <Widget title="Alerts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Toggle checked={priceAlerts} label="Price drops and low rooms" onChange={(v) => { setPrefs({ priceAlerts: v }); flash(v ? 'Price alerts on' : 'Price alerts off'); }} />
          <Toggle checked={me.prefs.gapAlerts} label="Gap Night alerts" onChange={(v) => { setPrefs({ gapAlerts: v }); flash(v ? 'Gap Night alerts on' : 'Gap Night alerts off'); }} />
        </div>
      </Widget>
      {signedIn
        ? <Button variant="tertiary" size="lg" block icon="logout" onClick={() => { dispatch({ type: 'traveler/patch', id: me.id, patch: { signedIn: false } }); flash('Logged out'); go('discover', 'feed'); }}>Log out</Button>
        : <Button variant="primary" size="lg" block icon="chat" onClick={() => gate({ reason: 'signin', returnTo: hashFor('me', 'profile'), backTo: hashFor('discover', 'feed') })}>Sign in with WhatsApp</Button>}
    </div>
    <TravelerDock active="me" />
    {sheet === 'phone' && (
      <Sheet title="WhatsApp number" onClose={() => setSheet(null)}>
        <TextField label="WhatsApp number" value={phone} onChange={(e) => setPhone(e.target.value)} icon="call" hint="Alerts and vouchers arrive here. Creators never see it." inputMode="tel" />
        <Button variant="primary" size="lg" block onClick={() => { if (phone.replace(/\D/g, '').length < 10) { flash('Enter a 10-digit number'); return; } dispatch({ type: 'traveler/patch', id: me.id, patch: { whatsapp: phone.trim() } }); setSheet(null); flash('WhatsApp number updated'); }}>Save number</Button>
      </Sheet>
    )}
    {sheet === 'style' && (
      <Sheet title="Travel style" onClose={() => setSheet(null)}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{STYLE_ICONS.map(([l, i]) => <Chip key={l} selected={styles.includes(l!)} icon={i} onClick={() => setStyles((x) => (x.includes(l!) ? x.filter((y) => y !== l) : [...x, l!]))}>{l}</Chip>)}</div>
        <SegmentedControl size="sm" aria-label="Budget per night" value={budget} onChange={setBudget} options={[{ value: 'low', label: 'Under ₹2k' }, { value: 'mid', label: '₹2k to ₹5k' }, { value: 'high', label: '₹5k plus' }]} />
        <Button variant="primary" size="lg" block onClick={() => { setPrefs({ styles, budget: budget as 'low' | 'mid' | 'high' }); setSheet(null); flash('Travel style saved'); }}>Save</Button>
      </Sheet>
    )}
    <ToastHost />
  </>);
}

