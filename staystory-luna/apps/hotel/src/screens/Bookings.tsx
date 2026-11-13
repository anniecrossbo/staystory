import { useEffect, useState } from 'react';
import { creatorCommission, formatINR } from '@staystory/core';
import { AISummary, Avatar, Badge, Banner, Button, Chip, EmptyState, FilterPill, Modal, SearchField, StatTile, Tag, TextField, Widget } from '@staystory/ui';
import { hotelBookings, hotelCommissionPct, market, useMarket, type MBooking, type MarketState } from '@staystory/market';
import { Overlay } from '../components';
import type { Go } from '../actions';
import { commissionLabel, inRange, longDates, STATUS_LABEL, STATUS_TONE } from '../lib';
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
  useEffect(() => { if (screen === 'bookingsEmpty') setSearch('Kapoor'); }, [screen]);
  useEffect(() => { setVoucher(false); setCompose(false); }, [screen]);

  const all = hotelBookings(s).filter((b) => inRange(b, range) || b.id === selectedId());
  const q = search.trim().toLowerCase();
  const handle = (b: MBooking) => s.creators[b.creatorId]?.handle ?? '';
  const matches = (b: MBooking) => !q || b.guestName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || handle(b).toLowerCase().includes(q);
  const inFilter = (b: MBooking, f: string) => f === 'All' || b.status === FILTER_STATUS[f];
  const count = (f: string) => all.filter((b) => inFilter(b, f)).length;
  const rows = all.filter((b) => inFilter(b, bookingFilter) && matches(b));
  const detail = screen === 'bookingDetail' ? all.find((b) => b.id === selectedId()) ?? all[0] : undefined;
  const close = () => go('console', 'bookings');
  const clear = () => { setSearch(''); ui.set({ bookingFilter: 'All' }); if (screen !== 'bookings') go('console', 'bookings'); };

  return (<>
    <div className="filters-row">
      {FILTERS.map((f) => <FilterPill key={f} selected={bookingFilter === f} count={count(f)} onClick={() => { ui.set({ bookingFilter: f }); if (screen !== 'bookings') go('console', 'bookings'); }}>{f}</FilterPill>)}
      <span className="grow" />
      <div className="search-w">
        <SearchField placeholder="Search guest or booking" aria-label="Search guest or booking" value={search} onChange={(e) => { setSearch(e.target.value); if (screen === 'bookingsEmpty') go('console', 'bookings'); }} />
      </div>
    </div>
    <div className="lu-grid">
    {rows.length > 0 ? (
      <Widget className="span-full" title="Attributed bookings" count={rows.length}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((b) => (
            <button key={b.id} className={`table-row${detail?.id === b.id ? ' on' : ''}`} aria-label={`Open booking ${b.id} for ${b.guestName}`} onClick={() => go('console', bookingLink(b.id))}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar initials={b.guestInitials} size={34} tone="muted" />
                <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{b.guestName}</span><span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{b.id}</span></span></span>
              <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--primary)', fontWeight: 600, ...(b.selfBooking ? { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const } : {}) }}>{handle(b)}{b.selfBooking && <Tag hue="ochre">Creator’s own booking</Tag>}</span>
              <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 13, lineHeight: '18px' }}>{b.roomName}</span><span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{b.datesLabel}</span></span>
              <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600, textAlign: 'right' }}>{formatINR(b.roomValue)}</span>
              <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)', textAlign: 'right' }}>{commissionLabel(s, b)}</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Badge tone={STATUS_TONE[b.status]} dot>{STATUS_LABEL[b.status]}</Badge></span>
            </button>
          ))}
        </div>
      </Widget>
    ) : (
      <Widget className="span-full" title="Attributed bookings" count={0}>
        <div style={{ padding: '48px 0' }}>
          <EmptyState icon="event_busy" title={`No bookings match “${search || bookingFilter}”`} action={<Button variant="secondary" icon="close" onClick={clear}>Clear search and filters</Button>}>Check the spelling, or search by booking number such as SS-UDR-48213.</EmptyState>
        </div>
      </Widget>
    )}
    </div>

    {detail && <Detail b={detail} s={s} onClose={close} onVoucher={() => setVoucher(true)} onMessage={() => setCompose(true)} />}
    {detail && compose && <Composer b={detail} onClose={() => setCompose(false)} />}
    {detail && voucher && <Voucher b={detail} s={s} onClose={() => setVoucher(false)} />}
  </>);
}

function Detail({ b, s, onClose, onVoucher, onMessage }: { b: MBooking; s: MarketState; onClose: () => void; onVoucher: () => void; onMessage: () => void }) {
  const handle = s.creators[b.creatorId]?.handle ?? '';
  const pct = hotelCommissionPct(s, b);
  const trip = s.trips.find((t) => t.id === b.tripId);
  const extras = b.experienceIds.map((id) => EXP_SHORT[id] ?? trip?.experiences.find((e) => e.id === id)?.name.toLowerCase()).filter(Boolean).join(', ');
  const gap = b.source === 'gap_night';
  const perNight = Math.round(b.roomValue / Math.max(1, b.nights));
  const first = b.guestName.split(' ')[0];
  const checkIn = () => { market.dispatch({ type: 'booking/status', id: b.id, status: 'in_house' }); toast(`${b.guestName} is checked in`); };
  const checkOut = () => {
    market.dispatch({ type: 'booking/status', id: b.id, status: 'completed' });
    toast(b.selfBooking ? 'Check-out confirmed. No creator commission on this booking' : `Check-out confirmed. ${formatINR(creatorCommission(b.total))} is now available to ${handle}`);
  };
  return (
    <Overlay side="center" wide label={`Booking ${b.id}`} onClose={onClose}>
      <Modal title={`${b.guestName} · ${b.guests} guest${b.guests > 1 ? 's' : ''}`} subtitle={`${b.id} · ${b.selfBooking ? 'booked by' : 'via'} ${handle}`} layout="dialog" onClose={onClose}
        footer={<>
          <Button variant="tertiary" icon="receipt_long" onClick={onVoucher}>Voucher</Button>
          <Button variant={b.status === 'upcoming' || b.status === 'in_house' ? 'secondary' : 'primary'} icon="mail" onClick={onMessage}>Message guest</Button>
          {b.status === 'upcoming' && <Button variant="primary" icon="login" onClick={checkIn}>Mark checked in</Button>}
          {b.status === 'in_house' && <Button variant="primary" icon="task_alt" onClick={checkOut}>Confirm check-out</Button>}
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={STATUS_TONE[b.status]} dot>{STATUS_LABEL[b.status]}{gap ? ' · booked through Gap Night' : ''}</Badge>
            {b.selfBooking && <Tag hue="ochre">Creator’s own booking</Tag>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <StatTile label="Room value" value={formatINR(b.roomValue)} />
            <StatTile label={`Commission at ${pct}%`} value={commissionLabel(s, b)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, lineHeight: '18px' }}>
            <div className="kv"><span>Room</span><span>{b.roomName}</span></div>
            {b.selfBooking && <div className="kv"><span>Creator commission</span><span>None</span></div>}
            <div className="kv"><span>Dates</span><span>{longDates(b.datesLabel)}</span></div>
            {gap && <div className="kv"><span>Offer</span><span>Gap Night · {formatINR(perNight)} a night</span></div>}
            {extras && <div className="kv"><span>Also booked</span><span>{extras}</span></div>}
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
        </div>
      </Modal>
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
