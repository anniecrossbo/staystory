import { useState, useEffect } from 'react';
import { formatINR, pctOf } from '@staystory/core';
import { Avatar, Badge, Button, FilterPill, Modal, SearchField, StatTile, Tag, Widget } from '@staystory/ui';
import { bookingCommission, hotelBookings, useMarket, type MBooking, type MCampaign, type MCreator, type MarketState } from '@staystory/market';
import { Overlay } from '../components';
import { openCreator, type Go } from '../actions';
import { asset, campaignProgress, fmtLakh, liveCampaigns, paceLabel, STATUS_LABEL, STATUS_TONE } from '../lib';
import { useUi } from '../ui';

/* ---------- Helpers ---------- */

function campaignBookings(s: MarketState, c: MCampaign): MBooking[] {
  return hotelBookings(s).filter((b) => {
    if (b.status === 'cancelled') return false;
    const stay = s.trips.find((t) => t.id === b.tripId)?.stays.find((x) => x.id === b.stayId);
    return stay?.campaignId === c.id;
  });
}

function campaignValue(bookings: MBooking[]): number {
  return bookings.reduce((n, b) => n + b.roomValue + b.experiencesValue, 0);
}

function campaignCommission(s: MarketState, bookings: MBooking[]): number {
  return bookings.reduce((n, b) => n + bookingCommission(s, b), 0);
}

function campaignCreators(s: MarketState, c: MCampaign): { creator: MCreator; status: string }[] {
  return Object.entries(c.invites)
    .map(([id, st]) => ({ creator: s.creators[id]!, status: st }))
    .filter((r) => r.creator);
}

const STATUS_HUE: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  live: 'success', paused: 'warning', ended: 'info',
};

const FILTERS = ['All', 'Live', 'Paused', 'Ended'] as const;

/* ---------- Campaigns screen ---------- */

export function Campaigns({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [detail, setDetail] = useState<string | null>(null);

  // Deep link: campaignDetail?id=winter-pichola
  useEffect(() => {
    if (screen !== 'campaignDetail') return;
    const cid = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('id');
    if (cid) {
      const found = s.campaigns.find((c) => c.id === cid);
      if (found) setDetail(cid);
    }
  }, [screen, s.campaigns]);

  const allCampaigns = s.campaigns.filter((c) => c.hotelId === s.hotel.id);
  const q = search.trim().toLowerCase();
  const inFilter = (c: MCampaign) => {
    if (filter === 'Live') return c.status === 'live';
    if (filter === 'Paused') return c.status === 'paused';
    if (filter === 'Ended') return c.status === 'ended';
    return true;
  };
  const matches = (c: MCampaign) => !q || c.name.toLowerCase().includes(q) || c.roomTypeId.toLowerCase().includes(q);
  const count = (f: string) => allCampaigns.filter((c) => (f === 'All' ? true : c.status === f.toLowerCase())).length;
  const rows = allCampaigns.filter((c) => inFilter(c) && matches(c));

  const detailCampaign = detail ? allCampaigns.find((c) => c.id === detail) : undefined;
  const close = () => { setDetail(null); if (screen === 'campaignDetail') go('console', 'campaigns'); };

  return (<>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {FILTERS.map((f) => <FilterPill key={f} selected={filter === f} count={count(f)} onClick={() => setFilter(f)}>{f}</FilterPill>)}
      <span style={{ flex: 1 }} />
      <div style={{ width: 280 }}>
        <SearchField placeholder="Search campaigns" aria-label="Search campaigns" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
      {rows.map((c) => {
        const prog = campaignProgress(s, c);
        const bks = campaignBookings(s, c);
        const value = campaignValue(bks);
        const creators = campaignCreators(s, c);
        const room = s.hotel.rooms.find((r) => r.id === c.roomTypeId);
        return (
          <div key={c.id} style={{ minWidth: 0 }}>
            <Widget title={c.name} subtitle={c.windowLabel}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge tone={STATUS_HUE[c.status] ?? 'info'} dot>{c.status === 'live' ? 'Live' : c.status === 'paused' ? 'Paused' : 'Ended'}</Badge>
                  {room && <Tag hue="sky">{room.name}</Tag>}
                  <Tag hue="ochre">{c.commissionPct}% commission</Tag>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}>
                    <span style={{ fontWeight: 600 }}>{prog.done} of {prog.target} bookings</span>
                    <span style={{ color: 'var(--ink-2)' }}>{prog.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--divider)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: 'var(--primary)', width: `${prog.pct}%`, transition: 'width 300ms ease' }} />
                  </div>
                  <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)', textTransform: 'capitalize' }}>{paceLabel(prog.done, prog.pct)}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  <StatTile label="Revenue" value={fmtLakh(value)} />
                  <StatTile label="Creators" value={String(creators.length)} />
                  <StatTile label="Price" value={formatINR(c.creatorPrice)} />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button block variant="secondary" icon="campaign" onClick={() => { setDetail(c.id); go('console', `campaignDetail?id=${c.id}`); }}>View campaign</Button>
                </div>
              </div>
            </Widget>
          </div>
        );
      })}
      {rows.length === 0 && (
        <div style={{ gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center' }}>
          <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>No campaigns match your filters.</span>
        </div>
      )}
    </div>

    {detailCampaign && <CampaignDetail campaign={detailCampaign} s={s} go={go} onClose={close} />}
  </>);
}

/* ---------- Campaign detail side sheet ---------- */

function CampaignDetail({ campaign: c, s, go, onClose }: { campaign: MCampaign; s: MarketState; go: Go; onClose: () => void }) {
  const prog = campaignProgress(s, c);
  const bks = campaignBookings(s, c);
  const value = campaignValue(bks);
  const commission = campaignCommission(s, bks);
  const creators = campaignCreators(s, c);
  const room = s.hotel.rooms.find((r) => r.id === c.roomTypeId);
  const accepted = creators.filter((r) => r.status === 'accepted').length;
  const { range } = useUi();

  // Intel: derive observations from the campaign data
  const intel = buildIntel(s, c, prog, bks, creators, value);

  return (
    <Overlay side="center" wide label={`${c.name} details`} onClose={onClose}>
      <Modal layout="dialog" title={c.name} subtitle={`${c.windowLabel} · ${room?.name ?? c.roomTypeId}`} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status and meta */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge tone={STATUS_HUE[c.status] ?? 'info'} dot>{c.status === 'live' ? 'Live' : c.status === 'paused' ? 'Paused' : 'Ended'}</Badge>
            <Tag hue="ochre">{c.commissionPct}% commission</Tag>
            {c.perks.length > 0 && <Tag hue="moss">{c.perks.length} perks</Tag>}
          </div>

          {/* Stats */}
          <Widget title="Stats">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <StatTile label="Bookings" value={`${prog.done} / ${prog.target}`} />
                <StatTile label="Progress" value={`${prog.pct}%`} />
                <StatTile label="Revenue" value={fmtLakh(value)} />
                <StatTile label="Commission" value={fmtLakh(commission)} />
                <StatTile label="Creator price" value={formatINR(c.creatorPrice)} />
                <StatTile label="Rack rate" value={formatINR(c.rackPrice)} />
              </div>
              {/* Progress bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--divider)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'var(--primary)', width: `${prog.pct}%`, transition: 'width 300ms ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}>
                  <span style={{ textTransform: 'capitalize' }}>{paceLabel(prog.done, prog.pct)}</span>
                  <span>{prog.target - prog.done} to go</span>
                </div>
              </div>
            </div>
          </Widget>

          {/* Influencers */}
          <Widget title="Influencers" count={creators.length} subtitle={accepted > 0 ? `${accepted} accepted` : undefined}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {creators.map(({ creator: cr, status }) => (
                <button key={cr.id} className="table-row" aria-label={`View ${cr.handle}`}
                  onClick={() => openCreator(cr.id, go)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={asset(cr.cover)} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{cr.handle}</span>
                      <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{cr.followers} followers · {cr.niche}</span>
                    </span>
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Badge tone={status === 'accepted' ? 'success' : status === 'countered' ? 'warning' : status === 'declined' ? 'danger' : 'info'} dot>
                      {status === 'accepted' ? 'Accepted' : status === 'countered' ? 'Countered' : status === 'declined' ? 'Declined' : 'Invited'}
                    </Badge>
                  </span>
                </button>
              ))}
              {creators.length === 0 && (
                <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)', padding: '16px 0' }}>No creators invited yet.</span>
              )}
            </div>
          </Widget>

          {/* Bookings */}
          <Widget title="Bookings" count={bks.length}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {bks.slice(0, 10).map((b) => (
                <button key={b.id} className="table-row" aria-label={`Booking ${b.id}`}
                  onClick={() => go('console', `bookingDetail?b=${encodeURIComponent(b.id)}`)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={b.guestInitials} size={34} tone="muted" />
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{b.guestName}</span>
                      <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>{b.datesLabel} · {b.nights} night{b.nights === 1 ? '' : 's'}</span>
                    </span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                    <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600 }}>{formatINR(b.roomValue)}</span>
                    <Badge tone={STATUS_TONE[b.status]} dot>{STATUS_LABEL[b.status]}</Badge>
                  </span>
                </button>
              ))}
              {bks.length === 0 && (
                <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)', padding: '16px 0' }}>No bookings from this campaign yet.</span>
              )}
              {bks.length > 10 && (
                <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)', padding: '8px 0' }}>Showing 10 of {bks.length}</span>
              )}
            </div>
          </Widget>

          {/* Intel */}
          <Widget title="Intel" subtitle="AI-generated insights">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {intel.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>{line.icon}</span>
                  <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{line.text}</span>
                </div>
              ))}
            </div>
          </Widget>

        </div>
      </Modal>
    </Overlay>
  );
}

/* ---------- Intel generation ---------- */

interface IntelLine { icon: string; text: string }

function buildIntel(s: MarketState, c: MCampaign, prog: { done: number; target: number; pct: number }, bks: MBooking[], creators: { creator: MCreator; status: string }[], value: number): IntelLine[] {
  const lines: IntelLine[] = [];
  const accepted = creators.filter((r) => r.status === 'accepted');
  const countered = creators.filter((r) => r.status === 'countered');

  // Pace insight
  if (prog.pct >= 80) {
    lines.push({ icon: 'trending_up', text: `Campaign is ${prog.pct}% to target. Consider increasing the booking target or launching a follow-up campaign.` });
  } else if (prog.pct >= 40) {
    lines.push({ icon: 'speed', text: `On pace at ${prog.pct}%. ${prog.target - prog.done} bookings to go before the target is reached.` });
  } else if (prog.done > 0) {
    lines.push({ icon: 'schedule', text: `${prog.done} bookings so far, ${prog.pct}% of target. Inviting more creators could accelerate progress.` });
  } else {
    lines.push({ icon: 'rocket_launch', text: 'Campaign just launched. First bookings typically arrive within a few days of creator posts.' });
  }

  // Creator insight
  if (accepted.length > 0 && creators.length > accepted.length) {
    lines.push({ icon: 'group', text: `${accepted.length} of ${creators.length} creators accepted. ${creators.length - accepted.length} still pending or countered.` });
  }

  // Counter insight
  if (countered.length > 0) {
    const names = countered.slice(0, 2).map((r) => r.creator.handle).join(' and ');
    lines.push({ icon: 'forum', text: `${names} countered${countered.length > 2 ? ` and ${countered.length - 2} more` : ''}. Review their offers in Needs your decision.` });
  }

  // Revenue per booking
  if (bks.length > 0) {
    const avg = Math.round(value / bks.length);
    lines.push({ icon: 'payments', text: `Average booking value is ${formatINR(avg)}. ${c.creatorPrice > avg ? 'Below' : 'Above'} the campaign creator price of ${formatINR(c.creatorPrice)}.` });
  }

  // Commission savings vs rack
  if (bks.length > 0) {
    const savings = bks.length * (c.rackPrice - c.creatorPrice);
    if (savings > 0) {
      lines.push({ icon: 'savings', text: `Guests saved ${fmtLakh(savings)} total compared to rack rate. This drives conversion and repeat stays.` });
    }
  }

  // If no special insights, add a generic one
  if (lines.length < 2) {
    lines.push({ icon: 'lightbulb', text: `Creator price is ${Math.round(((c.rackPrice - c.creatorPrice) / c.rackPrice) * 100)}% below rack. ${c.perks.length > 0 ? `${c.perks.join(', ')} included in the package.` : 'No perks included.'}` });
  }

  return lines;
}
