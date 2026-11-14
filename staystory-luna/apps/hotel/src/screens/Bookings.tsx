import { useEffect, useState } from 'react';
import { creatorCommission, formatINR } from '@staystory/core';
import { AISummary, Badge, Banner, Button, Chip, EmptyState, LineChart, Modal, SearchField, SegmentedControl, Select, Tag, TextField, Widget } from '@staystory/ui';
import { hotelBookings, hotelCommissionPct, market, useMarket, type MBooking, type MarketState } from '@staystory/market';
import { Av, Dialog, HBars, Overlay, Tile } from '../components';
import type { Go } from '../actions';
import { asset, bookingFigures, commissionLabel, inRange, longDates, OVERVIEW_SERIES, RANGES, stayEnds, STATUS_LABEL, STATUS_TONE, type Range } from '../lib';
import { toast, ui, useUi } from '../ui';

const FILTERS = ['All', 'Upcoming', 'In house', 'Completed', 'Cancelled'] as const;
const FILTER_STATUS: Record<string, MBooking['status'] | undefined> = { Upcoming: 'upcoming', 'In house': 'in_house', Completed: 'completed', Cancelled: 'cancelled' };
const EXP_SHORT: Record<string, string> = { boat: 'boat ride', walk: 'palace walk', cook: 'cooking class' };

/** The booking id rides in the hash (`#/console/bookingDetail?b=SS-UDR-48213`) so a refresh keeps the sheet. */
const selectedId = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('b');
export const bookingLink = (id: string) => `bookingDetail?b=${encodeURIComponent(id)}`;

export function Bookings({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const { bookingFilter, range } = useUi();
  const [search, setSearch] = useState(screen === 'bookingsEmpty' ? 'Kapoor' : '');
  const [voucher, setVoucher] = useState(false);
  const [compose, setCompose] = useState(false);
  const [by, setBy] = useState<'status' | 'creator'>('status');
  const [creatorSel, setCreatorSel] = useState('all');
  const [span, setSpan] = useState('6');
  useEffect(() => { if (screen === 'bookingsEmpty') setSearch('Kapoor'); }, [screen]);
  useEffect(() => { setVoucher(false); setCompose(false); }, [screen]);

  const all = hotelBookings(s).filter((b) => inRange(b, range) || b.id === selectedId());
  const q = search.trim().toLowerCase();
  const handle = (b: MBooking) => s.creators[b.creatorId]?.handle ?? '';
  const matches = (b: MBooking) => !q || b.guestName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || handle(b).toLowerCase().includes(q);
  const inFilter = (b: MBooking, f: string) => f === 'All' || b.status === FILTER_STATUS[f];
  const inCreator = (b: MBooking) => creatorSel === 'all' || b.creatorId === creatorSel;
  const count = (f: string) => all.filter((b) => inFilter(b, f)).length;
  const rows = all.filter((b) => inFilter(b, bookingFilter) && inCreator(b) && matches(b));
  const detail = screen === 'bookingDetail' ? all.find((b) => b.id === selectedId()) ?? all[0] : undefined;
  const close = () => go('console', 'bookings');
  const open = (b: MBooking) => go('console', bookingLink(b.id));
  const clear = () => { setSearch(''); setCreatorSel('all'); ui.set({ bookingFilter: 'All' }); if (screen !== 'bookings') go('console', 'bookings'); };

  const fig = bookingFigures(s, range);
  const days = RANGES.find((r) => r.value === range)!.days;
  const creatorIds = [...new Set(all.map((b) => b.creatorId))];
  const todays = all.filter((b) => b.status === 'in_house' || b.status === 'upcoming').sort((a, b) => (a.status === b.status ? 0 : a.status === 'in_house' ? -1 : 1)).slice(0, 3);
  const recent = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const extra = hotelBookings(s).length - 6;
  const cancelledExtra = hotelBookings(s).filter((b) => b.status === 'cancelled').length - 1;
  const newCount = 10 + extra;
  const n = Number(span);
  const col = (k: 'created' | 'confirmed' | 'cancelled') => OVERVIEW_SERIES[k].slice(-n);
  const legend = { created: 158 + extra, confirmed: 126 + extra - cancelledExtra, cancelled: 10 + cancelledExtra };
  const empty = rows.length === 0;
  const pickStatus = (f: string) => { ui.set({ bookingFilter: f }); if (screen !== 'bookings') go('console', 'bookings'); };

  return (<>
    <div className="lu-grid fill g42">
      <Widget className="c1 r1 h2">
        <SegmentedControl aria-label="Group bookings" value={by} onChange={(v) => setBy(v as 'status' | 'creator')} options={[{ value: 'status', label: 'Status' }, { value: 'creator', label: 'Creator' }]} />
        <SearchField placeholder="Search guest or booking" aria-label="Search guest or booking" value={search} onChange={(e) => { setSearch(e.target.value); if (screen === 'bookingsEmpty') go('console', 'bookings'); }} />
        {by === 'status' ? (
          <div className="side-list" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => <button key={f} className={`side-item${bookingFilter === f ? ' on' : ''}`} aria-pressed={bookingFilter === f} onClick={() => pickStatus(f)}><span>{f}</span><span className="n">{count(f)}</span></button>)}
          </div>
        ) : (
          <div className="side-list" role="group" aria-label="Filter by creator">
            <button className={`side-item${creatorSel === 'all' ? ' on' : ''}`} aria-pressed={creatorSel === 'all'} onClick={() => setCreatorSel('all')}><span>All creators</span><span className="n">{all.length}</span></button>
            {creatorIds.map((id) => <button key={id} className={`side-item${creatorSel === id ? ' on' : ''}`} aria-pressed={creatorSel === id} onClick={() => setCreatorSel(id)}><span>{s.creators[id]?.handle ?? id}</span><span className="n">{all.filter((b) => b.creatorId === id).length}</span></button>)}
          </div>
        )}
        <span className="eyebrow-s" style={{ marginTop: 8 }}>Today</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {todays.map((b) => {
            const e = stayEnds(b.datesLabel);
            return (
              <button key={b.id} className={`today-card${b.status === 'in_house' ? ' warn' : ''}`} aria-label={`Open booking ${b.id} for ${b.guestName}`} onClick={() => open(b)}>
                <span className="tc-t"><b>{b.guestName}</b><span>{b.status === 'in_house' ? `In house · checks out ${e.to}` : `Arrives ${e.from} · ${b.roomName}`}</span></span>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--muted)' }}>chevron_right</span>
              </button>
            );
          })}
          {todays.length === 0 && <span className="caption">No arrivals or departures today.</span>}
        </div>
      </Widget>

      <Widget className="c2 r1" title="Booking summary" subtitle={`For ${days}`}>
        <div className="tiles">
          <Tile tone="teal" label="Total bookings" value={String(fig.total)} />
          <Tile tone="sky" label="Room nights" value={String(fig.nights)} />
          <Tile tone="violet" label="Guests" value={String(fig.guests)} />
          <Tile tone="ochre" label="Avg. stay" value={fig.avgStay.toFixed(1)} unit="nights" />
        </div>
      </Widget>

      <Widget className="c3 r1" title="Booking overview" subtitle={`${OVERVIEW_SERIES.labels[6 - n]} – ${OVERVIEW_SERIES.labels[5]}`}
        action={<div className="wsel"><Select label="Months shown" value={span} onChange={setSpan} options={[{ value: '3', label: '3M' }, { value: '6', label: '6M' }]} /></div>}>
        <LineChart height={150} aria-label="Bookings created, confirmed and cancelled by month" labels={OVERVIEW_SERIES.labels.slice(-n)}
          series={[{ name: 'Created', values: col('created'), color: 'var(--cat-navy-ink)' }, { name: 'Confirmed', values: col('confirmed'), color: 'var(--primary)' }, { name: 'Cancelled', values: col('cancelled'), color: 'var(--danger-strong)' }]} />
        <div className="legend">
          {(['created', 'confirmed', 'cancelled'] as const).map((k) => (
            <div key={k}><span className="lg-l"><i style={{ background: k === 'created' ? 'var(--cat-navy-ink)' : k === 'confirmed' ? 'var(--primary)' : 'var(--danger-strong)' }} />{k[0]!.toUpperCase() + k.slice(1)}</span><span className="lg-v">{legend[k]}</span></div>
          ))}
        </div>
      </Widget>

      <Widget className="c4 r1" title="Bookings by room type" subtitle={`For ${days}`}
        action={<div className="wsel"><Select label="Period" value={range} onChange={(v) => ui.set({ range: v as Range })} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} /></div>}>
        <div className="big-num"><span className="bn">{fig.rooms.reduce((n2, r) => n2 + r.count, 0)}</span><span className="bs">total bookings</span></div>
        <HBars large rows={[...fig.rooms].sort((a, b) => b.count - a.count).map((r) => ({ label: r.name, value: r.count }))} />
      </Widget>

      <Widget className="c2 r2" title="Recent bookings" subtitle={`New · ${days}`}>
        <div className="big-num"><span className="bn">{newCount}</span><span className="bs">new</span><Badge tone="success">+13% vs last week</Badge></div>
        {empty ? <span className="caption">No bookings match.</span> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recent.map((b) => (
              <button key={b.id} className="rb-row" aria-label={`Open booking ${b.id} for ${b.guestName}`} onClick={() => open(b)}>
                <Av initials={b.guestInitials} id={b.id} size="md" />
                <span className="rb-t"><b>{b.guestName}</b><span>{b.roomName} · {b.datesLabel}</span></span>
                <span className="rb-v">{formatINR(b.roomValue)}</span>
              </button>
            ))}
          </div>
        )}
        <Button variant="tertiary" size="sm" iconRight="arrow_forward" onClick={clear}>View all bookings</Button>
      </Widget>

      <Widget className="c3 span-2 r2" title="Booking pipeline" subtitle={`Attributed bookings · ${bookingFilter === 'All' ? 'open items' : bookingFilter.toLowerCase()}`}
        action={<div style={{ display: 'flex', gap: 8 }}>
          <div className="wsel"><Select label="Creator" value={creatorSel} onChange={setCreatorSel} options={[{ value: 'all', label: 'Creators' }, ...creatorIds.map((id) => ({ value: id, label: s.creators[id]?.handle ?? id }))]} /></div>
          <div className="wsel"><Select label="Period" value={range} onChange={(v) => ui.set({ range: v as Range })} options={RANGES.map((r) => ({ value: r.value, label: r.value === '30' ? 'November' : r.label }))} /></div>
        </div>}>
        {empty ? (
          <EmptyState icon="event_busy" title={`No bookings match “${search || (bookingFilter !== 'All' ? bookingFilter : s.creators[creatorSel]?.handle ?? 'your filters')}”`} action={<Button variant="secondary" icon="close" onClick={clear}>Clear search and filters</Button>}>Check the spelling, or search by booking number such as SS-UDR-48213.</EmptyState>
        ) : (
          <div className="pipeline">
            {(['upcoming', 'in_house', 'completed', 'cancelled'] as const).map((st) => {
              const list = rows.filter((b) => b.status === st);
              return (
                <div className="pcol" key={st}>
                  <div className="phead"><span>{STATUS_LABEL[st]}</span><span>{list.length}</span></div>
                  {list.map((b) => {
                    const e = stayEnds(b.datesLabel);
                    return (
                      <button key={b.id} className="mini-card" aria-label={`Open booking ${b.id} for ${b.guestName}`} onClick={() => open(b)}>
                        <span className="mc-h"><Av initials={b.guestInitials} id={b.id} />{b.guestName}</span>
                        <span className="mc-m">{e.from.split(' ')[0]}–{e.to} · {b.nights}N</span>
                        <span className="mc-f"><span>{b.status === 'cancelled' ? 'Waived' : formatINR(b.roomValue)}</span><i>{handle(b).split('.')[0]}</i></span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Widget>
    </div>

    {detail && <Detail b={detail} s={s} onClose={close} onVoucher={() => setVoucher(true)} onMessage={() => setCompose(true)} />}
    {detail && compose && <Composer b={detail} onClose={() => setCompose(false)} />}
    {detail && voucher && <Voucher b={detail} s={s} onClose={() => setVoucher(false)} />}
  </>);
}

const stamp = (iso: string, plusMin = 0) => {
  const d = new Date(new Date(iso).getTime() + plusMin * 60_000);
  const h = d.getHours() % 12 || 12;
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} · ${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'am' : 'pm'}`;
};

function Detail({ b, s, onClose, onVoucher, onMessage }: { b: MBooking; s: MarketState; onClose: () => void; onVoucher: () => void; onMessage: () => void }) {
  const handle = s.creators[b.creatorId]?.handle ?? '';
  const pct = hotelCommissionPct(s, b);
  const trip = s.trips.find((t) => t.id === b.tripId);
  const extras = b.experienceIds.map((id) => EXP_SHORT[id] ?? trip?.experiences.find((e) => e.id === id)?.name.toLowerCase()).filter(Boolean).join(', ');
  const camp = s.campaigns.find((c) => trip?.stays.find((x) => x.id === b.stayId)?.campaignId === c.id);
  const gap = b.source === 'gap_night';
  const perNight = Math.round(b.roomValue / Math.max(1, b.nights));
  const first = b.guestName.split(' ')[0];
  const e = stayEnds(b.datesLabel);
  const checkIn = () => { market.dispatch({ type: 'booking/status', id: b.id, status: 'in_house' }); toast(`${b.guestName} is checked in`); };
  const checkOut = () => {
    market.dispatch({ type: 'booking/status', id: b.id, status: 'completed' });
    toast(b.selfBooking ? 'Check-out confirmed. No creator commission on this booking' : `Check-out confirmed. ${formatINR(creatorCommission(b.total))} is now available to ${handle}`);
  };
  const cancelled = b.status === 'cancelled';
  const stayed = b.status === 'in_house' || b.status === 'completed';
  const steps: { label: string; when: string; done: boolean }[] = [
    { label: 'Booked', when: stamp(b.createdAt), done: true },
    { label: 'Paid', when: stamp(b.createdAt, 2), done: true },
    ...(cancelled ? [{ label: 'Cancelled by guest', when: 'Commission waived', done: true }] : [
      { label: 'Checked in', when: stayed ? `${e.from} · 2:40 pm` : `${e.from} · from 2 pm`, done: stayed },
      { label: 'Check-out', when: b.status === 'completed' ? `${e.to} · 11:00 am` : `${e.to} · due by 11 am`, done: b.status === 'completed' },
    ]),
  ];
  return (
    <Overlay side="center" wide label={`Booking ${b.id}`} onClose={onClose}>
      <Dialog title={`${b.guestName} · ${b.guests} guest${b.guests > 1 ? 's' : ''}`} subtitle={`${b.id} · ${b.selfBooking ? 'booked by' : 'via'} ${handle}`} onClose={onClose}
        aside={<Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>}
        footer={<>
          <Button variant="secondary" icon="description" onClick={onVoucher}>Voucher</Button>
          <Button variant="secondary" icon="chat_bubble" onClick={onMessage}>Message guest</Button>
          {b.status === 'upcoming' && <Button variant="primary" icon="login" onClick={checkIn}>Mark checked in</Button>}
          {b.status === 'in_house' && <Button variant="primary" icon="logout" onClick={checkOut}>Confirm check-out</Button>}
        </>}>
        <div className="room-card">
          <img src={asset('verandah')} alt="" />
          <span className="rc-t"><b>{b.roomName}</b><span>{longDates(b.datesLabel).replace(/ to /, ' – ')} · {b.nights} night{b.nights === 1 ? '' : 's'} · {b.guests} guest{b.guests > 1 ? 's' : ''}</span><span>{[camp?.perks.length ? `${camp.perks.slice(0, 2).join(', ')} included` : '', extras ? `also ${extras}` : ''].filter(Boolean).join(' · ') || 'Room only'}</span></span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {gap && <Badge tone="info">Booked through Gap Night</Badge>}
          {b.selfBooking && <Tag hue="ochre">Creator’s own booking</Tag>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="dkv"><span>Room value</span><span>{formatINR(b.roomValue)}</span></div>
          <div className="dkv"><span>StayStory commission ({pct}%)</span><span>{commissionLabel(s, b)}</span></div>
          <div className="dkv"><span>Creator credited</span><span>{b.selfBooking ? 'None, own booking' : `${handle} · ${Math.round((creatorCommission(b.total) / Math.max(1, b.total)) * 100)}%`}</span></div>
          {gap && <div className="dkv"><span>Offer</span><span>Gap Night · {formatINR(perNight)} a night</span></div>}
          <div className="dkv"><span>Paid by guest</span><span className="good">{cancelled ? 'Refunded' : `${formatINR(b.total)} via UPI`}</span></div>
        </div>
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="eyebrow-s">Timeline</span>
          <div className="timeline">
            {steps.map((st) => (
              <div key={st.label}><span className={`tdot${st.done ? ' done' : ''}`}>{st.done && <span className="material-symbols-rounded">check</span>}</span><span><b>{st.label}</b><span className="d">{st.when}</span></span></div>
            ))}
          </div>
        </div>
        <AISummary label="Luna inferred · review" title={b.selfBooking ? `${handle} booked their own stay` : gap ? 'Came from a saved trip' : `Came from ${handle}’s link`}
          bullets={b.selfBooking
            ? ['Booked directly through their own trip link, so no creator commission applies', 'Your commission is still charged on the room value']
            : gap
            ? [`Saved ${s.creators[b.creatorId]?.name.split(' ')[0]}’s trip on Nov 13 and booked when the Gap Night alert arrived`, extras ? `Booked ${b.experienceIds.length} experience${b.experienceIds.length > 1 ? 's' : ''}, so plan a lake-side table for dinner` : 'Booked the room only']
            : [`Opened ${handle}’s link and booked within the 60-day credit window`, b.nights > 2 ? `${b.nights}-night stay, a good fit for an in-room welcome` : 'Short stay, so keep check-in quick']} />
        {b.status === 'upcoming' && <span className="caption">Mark {first} as checked in when they arrive. Check-out comes next.</span>}
        {b.status === 'in_house' && <span className="caption">{b.selfBooking ? 'Confirming check-out completes the stay. There is no creator commission on this booking.' : `Confirming check-out completes the stay and makes ${handle}’s commission available to withdraw.`}</span>}
        {b.status === 'completed' && <span className="caption">{b.selfBooking ? 'Stay completed. No creator commission on this booking.' : `Stay completed. ${handle}’s commission is available to withdraw.`}</span>}
        {b.status === 'cancelled' && <span className="caption">Cancelled by the guest. Commission is waived and the room is back in your inventory.</span>}
      </Dialog>
    </Overlay>
  );
}

const TEMPLATES = (b: MBooking, hotel: string) => [
  { label: 'Welcome', text: `Hi ${b.guestName.split(' ')[0]}, we are looking forward to hosting you at ${hotel} on ${b.datesLabel}. Let us know your arrival time and we will have your room ready.` },
  { label: 'Arrival details', text: `Hi ${b.guestName.split(' ')[0]}, your booking ${b.id} is confirmed. Check-in opens at 14:00. Our team will meet you at the lake gate and help with your luggage.` },
  { label: 'Late arrival', text: `Hi ${b.guestName.split(' ')[0]}, if you will arrive after 22:00 please tell us. We will keep the gate open and your dinner ready.` },
];
function Composer({ b, onClose }: { b: MBooking; onClose: () => void }) {
  const s = useMarket();
  const sent = useUi().messages[b.id] ?? [];
  const [text, setText] = useState('');
  const [justSent, setJustSent] = useState(false);
  const send = () => {
    if (!text.trim()) return;
    ui.set({ messages: { ...ui.get().messages, [b.id]: [...sent, text.trim()] } });
    setText(''); setJustSent(true);
  };
  return (
    <Overlay side="center" z={100} label={`Message ${b.guestName}`} onClose={onClose}>
      <Modal title={`Message ${b.guestName}`} subtitle={`${b.id} · sent on WhatsApp from StayStory`} layout="dialog" onClose={onClose}
        footer={<><Button variant="tertiary" onClick={onClose}>{justSent ? 'Done' : 'Cancel'}</Button><Button variant="primary" icon="send" disabled={!text.trim()} onClick={send}>Send message</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {justSent && <Banner tone="success" icon="check_circle" title={`Sent to ${b.guestName}`}>They will see it on WhatsApp. Replies appear in your StayStory inbox.</Banner>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TEMPLATES(b, s.hotel.name).map((t) => <Chip key={t.label} onClick={() => { setText(t.text); setJustSent(false); }}>{t.label}</Chip>)}
          </div>
          <TextField label="Message" multiline value={text} onChange={(e) => { setText(e.target.value); setJustSent(false); }} placeholder="Write a message to your guest" />
          {sent.length > 0 && <span className="caption">{sent.length} message{sent.length > 1 ? 's' : ''} sent to this guest in this session. Last: “{sent[sent.length - 1]!.slice(0, 80)}{sent[sent.length - 1]!.length > 80 ? '…' : ''}”</span>}
        </div>
      </Modal>
    </Overlay>
  );
}

function Voucher({ b, s, onClose }: { b: MBooking; s: MarketState; onClose: () => void }) {
  const trip = s.trips.find((t) => t.id === b.tripId);
  const camp = s.campaigns.find((c) => trip?.stays.find((x) => x.id === b.stayId)?.campaignId === c.id);
  const room = s.hotel.rooms.find((r) => r.id === b.roomTypeId);
  const lines: [string, string][] = [
    ['Booking number', b.id], ['Guest', b.guestName], ['Guests', String(b.guests)], ['Room', b.roomName], ['Dates', longDates(b.datesLabel)],
    ['Nights', String(b.nights)], ['Meal plan', room?.meal ?? 'Breakfast'], ['Includes', camp?.perks.join(', ') || 'Room only'], ['Room value', formatINR(b.roomValue)],
  ];
  return (
    <Overlay side="center" z={110} print label={`Voucher ${b.id}`} onClose={onClose}>
      <div className="overlay-box-inner" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="voucher">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>StayStory</span><Badge tone="success" dot>Confirmed</Badge></div>
          <div><div style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>Booking voucher</div><div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{s.hotel.name}, {s.hotel.city} · present at check-in</div></div>
          <div>{lines.map(([k, v]) => <div className="kvv" key={k}><span>{k}</span><span>{v}</span></div>)}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Paid in full to StayStory. No payment is due at the property. Booked via {s.creators[b.creatorId]?.handle}.</div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="tertiary" onClick={onClose}>Close</Button>
          <Button variant="primary" icon="print" onClick={() => window.print()}>Print or save as PDF</Button>
        </div>
      </div>
    </Overlay>
  );
}
