import { useEffect, useState } from 'react';
import { formatINR } from '@staystory/core';
import { Avatar, Badge, Banner, Button, FilterPill, Modal, SearchField, StatTile, Tag, Widget } from '@staystory/ui';
import { hotelBookings, market, useMarket, type InviteStatus, type MBooking, type MCreator, type MarketState } from '@staystory/market';
import { Av, Overlay } from '../components';
import { inviteCreator, type Go } from '../actions';
import { asset, commissionLabel, CREATOR_BASE, inRange, liveCampaigns, longDates, matchedCreators, STATUS_LABEL, STATUS_TONE } from '../lib';
import { ui, useUi } from '../ui';
import { bookingLink } from './Bookings';

/* ---------- Per-creator stats ---------- */
function creatorBookings(s: MarketState, creatorId: string) {
  return hotelBookings(s).filter((b) => b.creatorId === creatorId);
}
function creatorFigures(s: MarketState, creatorId: string) {
  const bks = creatorBookings(s, creatorId);
  const live = bks.filter((b) => b.status !== 'cancelled');
  const base = CREATOR_BASE[creatorId];
  const totalBookings = (base?.bookings ?? 0) + live.length;
  const totalValue = (base?.value ?? 0) + live.reduce((n, b) => n + b.roomValue + b.experiencesValue, 0);
  return { bookings: totalBookings, value: totalValue, recent: bks };
}

const FILTERS = ['All', 'Matched', 'Invited', 'Accepted'] as const;

export function Creators({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const { lastInvited, focusCreator } = useUi();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [detail, setDetail] = useState<string | null>(null);
  const camp = liveCampaigns(s)[0];
  const allCreators = Object.values(s.creators);
  const matched = new Set(matchedCreators(s).map((c) => c.id));

  useEffect(() => {
    if (screen !== 'invited' || lastInvited) return;
    const c = liveCampaigns(market.get())[0];
    if (c && !c.invites.couples) market.dispatch({ type: 'campaign/invite', campaignId: c.id, creatorId: 'couples' });
    ui.set({ lastInvited: 'couples' });
  }, [screen, lastInvited]);

  useEffect(() => {
    if (!focusCreator) return;
    setDetail(focusCreator);
    const t = setTimeout(() => ui.set({ focusCreator: '' }), 600);
    return () => clearTimeout(t);
  }, [focusCreator]);

  // Deep link: creatorDetail?c=anaya
  useEffect(() => {
    if (screen !== 'creatorDetail') return;
    const cid = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('c');
    if (cid && s.creators[cid]) setDetail(cid);
  }, [screen, s.creators]);

  const inviteStatus = (id: string): InviteStatus | undefined => camp?.invites[id];
  const q = search.trim().toLowerCase();
  const inFilter = (c: MCreator) => {
    if (filter === 'Matched') return matched.has(c.id);
    if (filter === 'Invited') return !!inviteStatus(c.id);
    if (filter === 'Accepted') return inviteStatus(c.id) === 'accepted';
    return true;
  };
  const matches = (c: MCreator) => !q || c.handle.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.niche.toLowerCase().includes(q);
  const count = (f: string) => allCreators.filter((c) => (f === 'All' ? true : f === 'Matched' ? matched.has(c.id) : f === 'Invited' ? !!inviteStatus(c.id) : inviteStatus(c.id) === 'accepted')).length;
  const rows = allCreators.filter((c) => inFilter(c) && matches(c)).sort((a, b) => (matched.has(b.id) ? 1 : 0) - (matched.has(a.id) ? 1 : 0));

  const banner = s.creators[lastInvited];
  const detailCreator = detail ? s.creators[detail] : undefined;
  const close = () => { setDetail(null); if (screen === 'creatorDetail') go('console', 'creators'); };

  const matchedRows = rows.filter((m) => matched.has(m.id));
  const openProfile = (id: string) => { setDetail(id); go('console', `creatorDetail?c=${id}`); };
  const invitedCount = matchedRows.filter((m) => inviteStatus(m.id)).length;
  const label = (m: MCreator) => {
    const st = inviteStatus(m.id);
    if (st === 'invited') return { text: 'Awaiting reply', tone: 'warning' as const, sub: m.id === 'anaya' ? 'Sent 2 days ago' : 'Sent today' };
    if (st === 'countered') return { text: `Countered at ${camp?.counters[m.id]?.pct ?? ''}%`, tone: 'info' as const, sub: 'Replied today' };
    if (st === 'accepted') return { text: 'Accepted', tone: 'success' as const, sub: 'Accepted your offer' };
    if (st === 'declined') return { text: 'Declined', tone: 'neutral' as const, sub: 'Declined your offer' };
    return { text: 'Not invited', tone: 'neutral' as const, sub: `${m.niche} fit ${m.score ?? ''}`.trim() };
  };

  const card = (m: MCreator) => {
    const st = inviteStatus(m.id);
    return (
      <Widget key={m.id} className="cr-card">
        <div id={`creator-${m.id}`} style={{ display: 'contents' }} />
        <button className="cr-head cr-open" onClick={() => openProfile(m.id)} aria-label={`View ${m.handle} profile`}>
          <Av initials={m.ini} id={m.id} size="lg" />
          <span className="ct"><b>{m.handle}</b><span>{m.followers} followers{m.score ? ` · ${m.score} match` : ''}</span></span>
        </button>
        <div className="chip-row">
          <Tag hue={m.hue}>{m.niche}</Tag>
          {m.top && <Badge tone="vip" icon="star">Top converter</Badge>}
          {st === 'accepted' && <Badge tone="success" dot>Accepted</Badge>}
          {st === 'countered' && <Badge tone="warning" dot>Countered</Badge>}
        </div>
        <div className="mini-stats">
          <div><b>{m.conv ?? '—'}</b><span>Conversion</span></div>
          <div><b>{m.bookingsPerMonth ?? '—'}</b><span>Bookings/mo</span></div>
          <div><b>{m.ncr ?? '—'}</b><span>Delhi NCR</span></div>
        </div>
        {(m.why || m.bio) && <p className="cr-desc">{m.why ?? m.bio}</p>}
        <div className="cr-foot">
          {!st && <Button block variant="primary" icon="send" onClick={() => inviteCreator(m.id, go)}>Invite to campaign</Button>}
          {st === 'invited' && <Button block variant="secondary" icon="check" disabled>Invited, awaiting reply</Button>}
          {st === 'accepted' && <Button block variant="secondary" icon="campaign" onClick={() => go('console', 'campaigns')}>View campaign</Button>}
          {st === 'countered' && <Button block variant="primary" icon="forum" onClick={() => go('console', 'overview')}>Review counter</Button>}
          {st === 'declined' && <Button block variant="secondary" icon="person" onClick={() => openProfile(m.id)}>View profile</Button>}
        </div>
      </Widget>
    );
  };

  return (<>
    <div className="lu-grid fill cr-grid">
      {matchedRows.map(card)}
      <Widget className="inv-widget span-2" title="Your invites" subtitle={camp ? `${camp.name} · matched on destination, audience cities and budget` : 'No live campaign'}
        action={camp ? <Badge tone="success">{invitedCount} of {matchedRows.length} invited</Badge> : undefined}>
        {screen === 'invited' && banner && <Banner tone="success" icon="send" title={`Invite sent to ${banner.handle}`}>They usually reply within a day. You'll see it in Needs your decision.</Banner>}
        <div className="chip-row">
          {FILTERS.map((f) => <FilterPill key={f} size="sm" selected={filter === f} count={count(f)} onClick={() => setFilter(f)}>{f}</FilterPill>)}
        </div>
        <SearchField placeholder="Search by name or niche" aria-label="Search creators" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="inv-list">
          {matchedRows.length === 0 && <span className="caption">No creators match your filters.</span>}
          {matchedRows.map((m) => {
            const l = label(m);
            return (
              <button key={m.id} className="inv-row" aria-label={`View ${m.handle} profile`} onClick={() => openProfile(m.id)}>
                <Av initials={m.ini} id={m.id} size="md" />
                <span className="it"><b>{m.handle}</b><span>{l.sub}</span></span>
                <Badge tone={l.tone}>{l.text}</Badge>
                <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--muted)' }}>chevron_right</span>
              </button>
            );
          })}
        </div>
        <div className="inv-foot">
          <span className="caption">Invites go out as private offers in each creator’s StayStory app.</span>
          <Button variant="primary" size="sm" icon="add" onClick={() => go('console', 'newCampaign')}>Create campaign</Button>
        </div>
      </Widget>
      {rows.filter((m) => !matched.has(m.id)).map(card)}
    </div>

    {detailCreator && <CreatorDetail creator={detailCreator} s={s} go={go} onClose={close} />}
  </>);
}

/* ---------- Creator profile side sheet ---------- */

function CreatorDetail({ creator: c, s, go, onClose }: { creator: MCreator; s: MarketState; go: Go; onClose: () => void }) {
  const camp = liveCampaigns(s)[0];
  const st = camp?.invites[c.id];
  const fig = creatorFigures(s, c.id);
  const trips = s.trips.filter((t) => t.creatorId === c.id);
  const { range } = useUi();

  return (
    <Overlay side="center" wide label={`${c.handle} profile`} onClose={onClose}>
      <Modal layout="dialog" title={c.name} subtitle={`${c.handle} · ${c.followers} followers`} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header with cover */}
          <img src={asset(c.cover)} alt="" style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag hue={c.hue}>{c.niche}</Tag>
            {c.top && <Badge tone="vip" icon="star">Top converter</Badge>}
            {st === 'accepted' && <Badge tone="success" dot>Accepted campaign</Badge>}
            {st === 'invited' && <Badge tone="info" dot>Invited, awaiting reply</Badge>}
            {st === 'countered' && <Badge tone="warning" dot>Countered</Badge>}
          </div>
          <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{c.bio}</span>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <StatTile label="Total bookings" value={String(fig.bookings)} />
            <StatTile label="Booking value" value={fig.value >= 100000 ? `₹${(fig.value / 100000).toFixed(1)}L` : formatINR(fig.value)} />
            <StatTile label="Conversion" value={c.conv ?? '—'} />
            <StatTile label="Bookings per month" value={c.bookingsPerMonth ?? '—'} />
          </div>

          {/* Trips */}
          {trips.length > 0 && (
            <Widget title="Trips" count={trips.length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trips.map((t) => (
                  <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img src={asset(t.img)} alt="" style={{ width: 56, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{t.place} · {t.days} days · {t.saves.toLocaleString('en-IN')} saves</span>
                    </div>
                    <Badge tone={t.status === 'live' ? 'success' : 'info'} dot>{t.status === 'live' ? 'Live' : 'Paused'}</Badge>
                  </div>
                ))}
              </div>
            </Widget>
          )}

          {/* Bookings */}
          <CreatorBookings bookings={fig.recent} s={s} go={go} range={range} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!st && <Button variant="primary" icon="send" onClick={() => inviteCreator(c.id, go)}>Invite to campaign</Button>}
            {st === 'accepted' && <Button variant="secondary" icon="campaign" onClick={() => go('console', 'overview')}>View campaign</Button>}
            {st === 'countered' && <Button variant="primary" icon="forum" onClick={() => go('console', 'overview')}>Review counter</Button>}
          </div>
        </div>
      </Modal>
    </Overlay>
  );
}

/* ---------- Bookings table inside a creator profile ---------- */

function CreatorBookings({ bookings, s, go, range }: { bookings: MBooking[]; s: MarketState; go: Go; range: string }) {
  const filtered = bookings.filter((b) => inRange(b, range as '7' | '30' | '90'));
  if (filtered.length === 0) {
    return (
      <Widget title="Bookings" count={0}>
        <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)', padding: '16px 0' }}>No bookings from this creator in the selected period.</span>
      </Widget>
    );
  }
  return (
    <Widget title="Bookings" count={filtered.length}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((b) => (
          <button key={b.id} className="table-row" aria-label={`Open booking ${b.id}`} onClick={() => go('console', bookingLink(b.id))}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar initials={b.guestInitials} size={34} tone="muted" />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{b.guestName}</span>
                <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{b.id}</span>
              </span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, lineHeight: '18px' }}>{b.roomName}</span>
              <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{b.datesLabel}</span>
            </span>
            <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600, textAlign: 'right' }}>{formatINR(b.roomValue)}</span>
            <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Badge tone={STATUS_TONE[b.status]} dot>{STATUS_LABEL[b.status]}</Badge></span>
          </button>
        ))}
      </div>
    </Widget>
  );
}
