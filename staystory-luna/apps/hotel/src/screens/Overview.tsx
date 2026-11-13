import { formatINR } from '@staystory/core';
import { AISummary, AlertCard, BarChart, Button, DataTable, EmptyState, ProgressBar, StatTile, Widget } from '@staystory/ui';
import { market, useMarket, type MarketState } from '@staystory/market';
import { Activatable } from '../components';
import { inviteCreator, openCreator, type Go } from '../actions';
import {
  asset, campaignProgress, creatorRows, decisions, fmtCount, fmtLakh, liveCampaigns, matchCount, DEFAULT_AUDIENCE, matchedCreators,
  overviewFigures, paceLabel, PRONOUN, RANGES, toWords, unsoldRooms, GAP_DATES, type Decision,
} from '../lib';
import { toast, ui, useUi } from '../ui';

const INVITE_HINT: Record<string, string> = { couples: 'Heritage Suite packages', food: 'your rooftop breakfast and cooking experiences', mia: 'solo travelers who value your location', desi: 'Courtyard Room offers' };

export function Overview({ go }: { go: Go }) {
  const s = useMarket();
  const { range, dismissed } = useUi();
  const decs = decisions(s, dismissed);
  const camp = liveCampaigns(s)[0];
  const fig = overviewFigures(s, range);
  const rows = creatorRows(s, range);
  const days = RANGES.find((r) => r.value === range)!.days;

  const byConv = [...rows].sort((a, b) => b.conv - a.conv);
  const [c1, c2] = byConv;
  const topShare = fig.bookings ? Math.round(((c1!.bookings + c2!.bookings) / fig.bookings) * 100) : 0;
  const priciest = [...rows].sort((a, b) => b.cpa - a.cpa)[0]!;
  const above = Math.round((priciest.cpa / fig.cpa - 1) * 100);
  const invited = camp?.invites ?? {};
  const nextCreator = matchedCreators(s).find((c) => !invited[c.id]);
  const nextId = nextCreator?.id;

  const dismiss = (key: string) => {
    ui.set({ dismissed: [...ui.get().dismissed, key] });
    toast('Alert dismissed', { tone: 'info', action: 'Undo', onAction: () => ui.set({ dismissed: ui.get().dismissed.filter((k) => k !== key) }) });
  };

  return (<>
    <div className="lu-grid fill">
      <Widget className="span-1 row-2" title="Needs your decision" count={decs.length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {decs.length === 0 && <EmptyState icon="task_alt" title="Nothing needs your decision">Creator replies and unsold rooms for saved demand show up here.</EmptyState>}
          {decs.map((d) => <DecisionItem key={d.key} d={d} s={s} go={go} dismiss={dismiss} />)}
        </div>
      </Widget>
      <Widget className="span-1" title="Booking summary" subtitle={`Attributed · ${days}`}>
        <div className="tiles-2">
          <StatTile label="Attributed bookings" value={fmtCount(fig.bookings)} />
          <StatTile label="Booking value" value={fmtLakh(fig.value)} />
          <StatTile label="Cost per guest" value={formatINR(fig.cpa)} />
          <StatTile label="Cancellations" value={`${fig.cancelPct.toFixed(1)}%`} />
        </div>
      </Widget>
      <Widget className="span-1" title="Bookings by creator" subtitle={days}>
        <BarChart height={150} aria-label="Bookings by creator" data={[...rows].sort((a, b) => b.bookings - a.bookings).map((r) => ({ label: r.short, value: r.bookings }))} />
      </Widget>
      <Widget title="Live campaign" subtitle={camp?.name ?? 'No live campaign'} className="span-1">
        {camp ? (() => {
          const p = campaignProgress(s, camp);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <img src={asset('verandah')} alt="" style={{ width: '100%', height: 96, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>{p.done} of {p.target}</span><span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>bookings · {paceLabel(p.done, p.pct)}</span></div>
              <ProgressBar value={p.pct} tone="success" aria-label="Campaign progress" />
            </div>
          );
        })() : (
          <EmptyState icon="campaign" title="No live campaign" action={<Button variant="primary" icon="add" onClick={() => go('campaign', 'offer')}>Create campaign</Button>}>Offer creators a private price to get booked by their audiences.</EmptyState>
        )}
      </Widget>
      <Widget className="span-2" title="Creator performance" subtitle={`Attributed bookings · ${days}`}>
        <div style={{ overflowX: 'auto' }}>
          <Activatable selector="tbody tr" onActivate={(i) => openCreator(rows[i]!.id, go)} label={(i) => `Open ${rows[i]?.handle ?? 'creator'} in Creators`}>
            <DataTable compact columns={[{ key: 'handle', label: 'Creator' }, { key: 'bookings', label: 'Bookings', align: 'right' }, { key: 'conv', label: 'Conversion', align: 'right' }, { key: 'value', label: 'Value', align: 'right' }, { key: 'cpa', label: 'Cost per guest', align: 'right' }]}
              rows={rows.map((r) => ({ handle: r.handle, bookings: String(r.bookings), conv: `${r.conv.toFixed(2)}%`, value: fmtLakh(r.value), cpa: formatINR(r.cpa) }))} />
          </Activatable>
        </div>
      </Widget>
      <div className="span-1 cell">
        <Activatable selector=".lu-ai-body" onActivate={() => nextId && inviteCreator(nextId, go)} label={() => `Invite ${nextCreator?.handle ?? 'creator'} to ${camp?.name ?? 'a campaign'}`}>
          <AISummary label="AI summary" title={`Two creators bring ${topShare}% of guests`}
            bullets={[`${c1!.handle} and ${c2!.handle} drive ${c1!.bookings + c2!.bookings} of ${fmtCount(fig.bookings)} bookings`, `${priciest.handle} costs ${formatINR(priciest.cpa)} per guest, ${above}% above average`, 'Lake-view Deluxe converts best from slow-travel audiences']}
            next={nextCreator ? `Invite ${nextCreator.handle} for ${INVITE_HINT[nextCreator.id] ?? 'your live campaign'}.` : undefined} />
        </Activatable>
      </div>
    </div>
  </>);
}

function DecisionItem({ d, s, go, dismiss }: { d: Decision; s: MarketState; go: Go; dismiss: (key: string) => void }) {
  if (d.kind === 'unsold') {
    const n = unsoldRooms(s, 'lake-deluxe');
    return (<>
      <AlertCard tone="warning" title={`${n} lake-view room${n === 1 ? '' : 's'} unsold for ${toWords(GAP_DATES)}`} meta={`${matchCount(DEFAULT_AUDIENCE)} travelers saved Anaya’s Udaipur trip for these dates and have not booked yet`} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="primary" icon="nights_stay" onClick={() => go('console', 'gap')}>Release as Gap Night</Button>
        <Button variant="tertiary" onClick={() => dismiss(d.key)}>Dismiss</Button>
      </div>
    </>);
  }
  const camp = s.campaigns.find((c) => c.id === d.campaignId)!;
  const cr = s.creators[d.creatorId!]!;
  const room = s.hotel.rooms.find((r) => r.id === camp.roomTypeId)?.name ?? 'room';
  if (d.kind === 'accepted') {
    const trip = s.trips.find((t) => t.creatorId === cr.id && t.stays.some((x) => x.hotelId === s.hotel.id));
    const pct = camp.agreedPct[cr.id];
    const pro = PRONOUN[cr.id] ?? 'Their';
    return <AlertCard tone="success" title={`${cr.handle} accepted ${camp.name}`}
      meta={`${trip ? `${pro} ${trip.place} trip now books your ${room}` : `Once ${cr.name.split(' ')[0]} publishes a trip it books your ${room}`}${pct && pct !== camp.commissionPct ? ` at ${pct}% commission` : ''}`} />;
  }
  if (d.kind === 'countered') {
    const c = camp.counters[cr.id];
    const act = (accept: boolean) => {
      market.dispatch({ type: 'offer/resolveCounter', campaignId: camp.id, creatorId: cr.id, accept });
      toast(accept ? `Accepted ${cr.handle}’s counter at ${c?.pct}%` : `Declined ${cr.handle}’s counter`, { tone: accept ? 'success' : 'info' });
    };
    return (<>
      <AlertCard tone="warning" title={`${cr.handle} countered ${camp.name}`}
        meta={`Asked ${c?.pct}% instead of ${camp.commissionPct}%${c?.message ? `: “${c.message}”` : ''}${c?.extras?.length ? ` Also asks for ${c.extras.map((e) => e.replace(/^ask for /i, '')).join(', ').toLowerCase()}.` : ''}`} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="primary" icon="check" onClick={() => act(true)}>Accept {c?.pct}%</Button>
        <Button variant="tertiary" onClick={() => act(false)}>Decline</Button>
      </div>
    </>);
  }
  return (<>
    <AlertCard title={`${cr.handle} declined ${camp.name}`} meta="No change to your campaign. You can invite other creators." />
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button variant="secondary" icon="group" onClick={() => go('console', 'creators')}>Find creators</Button>
      <Button variant="tertiary" onClick={() => dismiss(d.key)}>Dismiss</Button>
    </div>
  </>);
}
