import { formatINR } from '@staystory/core';
import { Badge, Button, DataTable, ProgressBar, Widget } from '@staystory/ui';
import { hotelBookings, useMarket } from '@staystory/market';
import { Activatable, Av, rangeInfo } from '../components';
import { downloadText, invoiceHtml, payoutFigures, statementsFor } from '../lib';
import { toast, useUi } from '../ui';

const WEEKS = [34, 52, 44, 66, 56, 70];
const STEPS = [
  ['Stay completes', 'Creator commission is calculated on the room value.'],
  ['Statement closes', 'Sunday midnight. A GST invoice is attached.'],
  ['Money lands', 'Net of commission, every Monday by 6 pm.'],
];

export function Payouts() {
  const s = useMarket();
  const { range } = useUi();
  const f = payoutFigures(s, range);
  const rows = statementsFor(s, range);
  const latest = rows[0];
  const bank = s.hotel.profile?.accountNumber?.replace(/\D/g, '').slice(-4);
  const cancelled = hotelBookings(s).filter((b) => b.status === 'cancelled');
  const c0 = cancelled[0];
  const download = (i: number) => {
    const st = rows[i]!;
    const no = 4120 + rows.length - i;
    downloadText(`GST-invoice-SS-INV-${no}.html`, invoiceHtml(s, st, no));
    toast(`GST invoice for ${st.period} downloaded`);
  };
  return (
    <div className="lu-grid fill g42">
      <Widget className="c1 r1" title="Next settlement" subtitle="Mon 16 Nov">
        <span className="big-money">{formatINR(f.next)}</span>
        <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}>{bank ? `To your bank account ending ${bank}` : 'To your bank account on file'}</span>
        {latest && <div className="kvrows" style={{ marginTop: 4 }}>
          <div className="kv"><span>Gross room value</span><span>{formatINR(latest.gross)}</span></div>
          <div className="kv"><span>Commission ({s.hotel.commissionPct}%)</span><span>−{formatINR(latest.commission)}</span></div>
          <div className="kv"><span>GST on commission</span><span>On your invoice</span></div>
        </div>}
        <div className="kvrows" style={{ marginTop: 'auto' }}>
          <div className="kv"><span>Statement closes Sun 15 Nov</span><span style={{ color: 'var(--primary)' }}>2 days</span></div>
          <ProgressBar value={70} aria-label="Days until the statement closes" />
        </div>
      </Widget>

      <Widget className="c2 r1" title={`Commission this ${rangeInfo(range).label.toLowerCase()}`} subtitle={`From ${latest?.stays ?? 0} completed stays`}>
        <span className="big-money">{formatINR(f.commission)}</span>
        <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}>Charged on completed stays only</span>
        <div className="spark" role="img" aria-label="Commission by week">{WEEKS.map((h, i) => <i key={i} className={i === WEEKS.length - 1 ? 'last' : ''} style={{ height: `${h}%` }} />)}</div>
        <div><Badge tone="success">+9% vs last month</Badge></div>
      </Widget>

      <Widget className="c3 r1" title="Waived on cancellations" subtitle="No commission on cancelled stays">
        <span className="big-money">{formatINR(f.waived)}</span>
        <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}>{cancelled.length} cancelled booking{cancelled.length === 1 ? '' : 's'} this month</span>
        {c0 && <div className="row-box"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Av initials={c0.guestInitials} id={c0.id} size="md" /><span className="rt"><b>{c0.guestName} · {c0.id}</b><span>{c0.roomName} · {c0.datesLabel}</span></span></span><b style={{ fontSize: 13 }}>{formatINR(c0.roomValue)}</b></div>}
        <div className="note-box"><span className="material-symbols-rounded" style={{ fontSize: 18 }}>schedule</span><span>Cancellations more than 48 hours before check-in carry no commission.</span></div>
      </Widget>

      <Widget className="c4 r1" title="How settlements work" subtitle="Every Monday">
        <div className="step-list">
          {STEPS.map(([t, d], i) => <div key={t}><span className="sn">{i + 1}</span><span><b>{t}</b><span className="d">{d}</span></span></div>)}
        </div>
        <div style={{ marginTop: 'auto' }}><Button block variant="secondary" icon="help" onClick={() => toast('Payout support will reply on WhatsApp within one working day', { tone: 'info' })}>Payout support</Button></div>
      </Widget>

      <Widget className="c1 span-4 r2" title="Weekly statements" subtitle="Each comes with a GST invoice" action={<Button variant="secondary" size="sm" icon="download" onClick={() => rows.forEach((_, i) => download(i))}>Download all</Button>}>
        <div style={{ overflowX: 'auto' }}>
          <Activatable selector="tbody tr" onActivate={download} label={(i) => `Download GST invoice for ${rows[i]?.period ?? 'statement'}`}>
            <DataTable columns={[{ key: 'period', label: 'Period' }, { key: 'stays', label: 'Stays', align: 'right' }, { key: 'gross', label: 'Gross', align: 'right' }, { key: 'comm', label: 'Commission', align: 'right' }, { key: 'net', label: 'Settled', align: 'right' }, { key: 'dl', label: '', align: 'right', render: () => <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20, color: 'var(--primary)' }}>download</span> }]}
              rows={rows.map((r) => ({ period: r.period, stays: String(r.stays), gross: formatINR(r.gross), comm: formatINR(r.commission), net: formatINR(r.net), dl: '' }))} />
          </Activatable>
        </div>
        <span className="caption" style={{ display: 'block', paddingTop: 8 }}>Select a statement to download its GST invoice.</span>
      </Widget>
    </div>
  );
}
