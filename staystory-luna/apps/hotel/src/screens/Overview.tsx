import { formatINR } from '@staystory/core';
import { AISummary, AlertCard, Badge, Button, DataTable, EmptyState, ProgressBar, Select, Widget } from '@staystory/ui';
import { market, useMarket, type MarketState } from '@staystory/market';
import { Activatable, Av, HBars, Tile } from '../components';
import { inviteCreator, openCreator, type Go } from '../actions';
import {
  asset, campaignProgress, creatorRows, decisions, fmtCount, fmtLakh, liveCampaigns, matchCount, DEFAULT_AUDIENCE, matchedCreators,
  overviewFigures, paceLabel, PRONOUN, RANGES, toWords, unsoldRooms, windowEnd, GAP_DATES, type Decision, type Range,
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

  const barRows = [...rows].sort((a, b) => b.bookings - a.bookings).map((r) => ({ label: r.handle, value: r.bookings }));
  const other = Math.max(0, fig.bookings - barRows.reduce((n, r) => n + r.value, 0));
  const accepted = camp ? Object.values(camp.invites).filter((v) => v === 'accepted').length : 0;

  return (
    <div className="lu-grid fill g42">
      <Widget className="c1 r1 h2" title="Needs your decision" subtitle="Creator replies and unsold rooms" count={decs.length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {decs.length === 0 && <EmptyState icon="task_alt" title="Nothing needs your decision">Creator replies and unsold rooms for saved demand show up here.</EmptyState>}
          {decs.map((d) => <DecisionItem key={d.key} d={d} s={s} go={go} dismiss={dismiss} />)}
        </div>
      </Widget>

      <Widget className="c2 r1" title="Booking summary" subtitle={`Attributed · ${days}`}>
        <div className="tiles">
          <Tile tone="teal" label="Attributed bookings" value={fmtCount(fig.bookings)} />
          <Tile tone="sky" label="Booking value" value={fmtLakh(fig.value)} />
          <Tile tone="violet" label="Cost per guest" value={formatINR(fig.cpa)} />
          <Tile tone="ochre" label="Cancellations" value={`${fig.cancelPct.toFixed(1)}%`} />
        </div>
      </Widget>

      <Widget className="c3 r1" title="Bookings by creator" subtitle={`Share of ${fmtCount(fig.bookings)} attributed`}
        action={<div className="wsel"><Select label="Period" aria-label="Period" value={range} onChange={(v) => ui.set({ range: v as Range })} options={RANGES.map((r) => ({ value: r.value, label: `${r.value} days` }))} /></div>}>
        <HBars rows={[...barRows, { label: 'Other', value: other }]} />
      </Widget>

      <Widget className="c4 r1" title="Live campaign" subtitle={camp?.name ?? 'No live campaign'} action={camp ? <Badge tone="success">Live</Badge> : undefined}>
        {camp ? (() => {
          const p = campaignProgress(s, camp);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <img src={asset('verandah')} alt="" style={{ width: '100%', height: 84, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>{p.done} of {p.target}</span><span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--muted)' }}>bookings · {paceLabel(p.done, p.pct)}</span></div>
              <ProgressBar value={p.pct} tone="success" aria-label="Campaign progress" />
              <div className="kvrows">
                <div className="kv"><span>Creators accepted</span><span>{accepted} of {Object.keys(camp.invites).length}</span></div>
                <div className="kv"><span>Commission</span><span>{camp.commissionPct}%</span></div>
                <div className="kv"><span>Ends</span><span>{windowEnd(camp.windowLabel)}</span></div>
              </div>
            </div>
          );
        })() : (
          <EmptyState icon="campaign" title="No live campaign" action={<Button variant="primary" icon="add" onClick={() => go('campaign', 'offer')}>Create campaign</Button>}>Offer creators a private price to get booked by their audiences.</EmptyState>
        )}
      </Widget>

      <Widget className="c2 span-2 r2" title="Creator performance" subtitle={`Attributed bookings · ${days}`} action={<Button variant="secondary" size="sm" iconRight="chevron_right" onClick={() => go('console', 'creators')}>See all</Button>}>
        <div style={{ overflowX: 'auto' }}>
          <Activatable selector="tbody tr" onActivate={(i) => openCreator(rows[i]!.id, go)} label={(i) => `Open ${rows[i]?.handle ?? 'creator'} in Creators`}>
            <DataTable compact columns={[
              { key: 'handle', label: 'Creator', render: (r: { id: string; handle: string }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Av initials={(s.creators[r.id]?.ini ?? r.handle.slice(1, 3)).slice(0, 2).toUpperCase()} id={r.id} />{r.handle}</span> },
              { key: 'visits', label: 'Visits', align: 'right' }, { key: 'bookings', label: 'Bookings', align: 'right' }, { key: 'conv', label: 'Conversion', align: 'right' }, { key: 'value', label: 'Value', align: 'right' }, { key: 'cpa', label: 'Cost per guest', align: 'right' }]}
              rows={rows.map((r) => ({ id: r.id, handle: r.handle, visits: fmtCount(r.visits), bookings: String(r.bookings), conv: `${r.conv.toFixed(2)}%`, value: fmtLakh(r.value), cpa: formatINR(r.cpa) }))} />
          </Activatable>
        </div>
      </Widget>

      <div className="c4 r2" style={{ display: 'flex', minHeight: 0 }}>
        <Activatable selector=".lu-ai-body" onActivate={() => nextId && inviteCreator(nextId, go)} label={() => `Invite ${nextCreator?.handle ?? 'creator'} to ${camp?.name ?? 'a campaign'}`}>
          <AISummary label="AI summary" title={`Two creators bring ${topShare}% of guests`}
            bullets={[`${c1!.handle} and ${c2!.handle} drive ${c1!.bookings + c2!.bookings} of ${fmtCount(fig.bookings)} bookings`, `${priciest.handle} costs ${formatINR(priciest.cpa)} per guest, ${above}% above average`, 'Lake-view Deluxe converts best from slow-travel audiences']}
            next={nextCreator ? `Invite ${nextCreator.handle} for ${INVITE_HINT[nextCreator.id] ?? 'your live campaign'}.` : undefined} />
        </Activatable>
      </div>
    </div>
  );
}

function DecisionItem({ d, s, go, dismiss }: { d: Decision; s: MarketState; go: Go; dismiss: (key: string) => void }) {
  if (d.kind === 'unsold') {
    const n = unsoldRooms(s, 'lake-deluxe');
    return <AlertCard tone="warning" title={`${n} lake-view room${n === 1 ? '' : 's'} unsold for ${toWords(GAP_DATES)}`} meta={`${matchCount(DEFAULT_AUDIENCE)} travelers saved Anaya’s Udaipur trip for these dates and have not booked yet`}
      actions={<>
        <Button variant="primary" size="sm" icon="nights_stay" onClick={() => go('console', 'gap')}>Release as Gap Night</Button>
        <Button variant="tertiary" size="sm" onClick={() => dismiss(d.key)}>Dismiss</Button>
      </>} />;
  }
  const camp = s.campaigns.find((c) => c.id === d.campaignId)!;
  const cr = s.creators[d.creatorId!]!;
  const room = s.hotel.rooms.find((r) => r.id === camp.roomTypeId)?.name ?? 'room';
  if (d.kind === 'accepted') {
    const trip = s.trips.find((t) => t.creatorId === cr.id && t.stays.some((x) => x.hotelId === s.hotel.id));
    const pct = camp.agreedPct[cr.id];
    const pro = PRONOUN[cr.id] ?? 'Their';
    return <AlertCard tone="success" title={`${cr.handle} accepted ${camp.name}`}
      actions={<Button variant="secondary" size="sm" onClick={() => go('console', `campaignDetail?id=${camp.id}`)}>View campaign</Button>}
      meta={`${trip ? `${pro} ${trip.place} trip now books your ${room}` : `Once ${cr.name.split(' ')[0]} publishes a trip it books your ${room}`}${pct && pct !== camp.commissionPct ? ` at ${pct}% commission` : ''}`} />;
  }
  if (d.kind === 'countered') {
    const c = camp.counters[cr.id];
    const act = (accept: boolean) => {
      market.dispatch({ type: 'offer/resolveCounter', campaignId: camp.id, creatorId: cr.id, accept });
      toast(accept ? `Accepted ${cr.handle}’s counter at ${c?.pct}%` : `Declined ${cr.handle}’s counter`, { tone: accept ? 'success' : 'info' });
    };
    return (
      <AlertCard tone="warning" title={`${cr.handle} countered ${camp.name}`}
        meta={`Asked ${c?.pct}% instead of ${camp.commissionPct}%${c?.message ? `: “${c.message}”` : ''}${c?.extras?.length ? ` Also asks for ${c.extras.map((e) => e.replace(/^ask for /i, '')).join(', ').toLowerCase()}.` : ''}`}
        actions={<>
          <Button variant="primary" size="sm" icon="check" onClick={() => act(true)}>Accept {c?.pct}%</Button>
          <Button variant="tertiary" size="sm" onClick={() => act(false)}>Decline</Button>
        </>} />
    );
  }
  return <AlertCard title={`${cr.handle} declined ${camp.name}`} meta="No change to your campaign. You can invite other creators."
    actions={<>
      <Button variant="secondary" size="sm" icon="group" onClick={() => go('console', 'creators')}>Find creators</Button>
      <Button variant="tertiary" size="sm" onClick={() => dismiss(d.key)}>Dismiss</Button>
    </>} />;
}
