import { formatINR } from '@staystory/core';
import { DataTable, StatTile, Widget } from '@staystory/ui';
import { useMarket } from '@staystory/market';
import { Activatable, rangeInfo } from '../components';
import { downloadText, invoiceHtml, payoutFigures, statementsFor } from '../lib';
import { toast, useUi } from '../ui';

export function Payouts() {
  const s = useMarket();
  const { range } = useUi();
  const f = payoutFigures(s, range);
  const rows = statementsFor(s, range);
  const download = (i: number) => {
    const st = rows[i]!;
    const no = 4120 + rows.length - i;
    downloadText(`GST-invoice-SS-INV-${no}.html`, invoiceHtml(s, st, no));
    toast(`GST invoice for ${st.period} downloaded`);
  };
  return (<>
    <div className="stat-grid w220">
      <StatTile label="Next settlement · Mon 16" value={formatINR(f.next)} />
      <StatTile label={`Commission this ${rangeInfo(range).label.toLowerCase()}`} value={formatINR(f.commission)} />
      <StatTile label="Waived on cancellations" value={formatINR(f.waived)} />
    </div>
    <Widget title="Weekly statements" subtitle="Each comes with a GST invoice">
      <div style={{ overflowX: 'auto' }}>
        <Activatable selector="tbody tr" onActivate={download} label={(i) => `Download GST invoice for ${rows[i]?.period ?? 'statement'}`}>
          <DataTable columns={[{ key: 'period', label: 'Period' }, { key: 'stays', label: 'Stays', align: 'right' }, { key: 'gross', label: 'Gross', align: 'right' }, { key: 'comm', label: 'Commission', align: 'right' }, { key: 'net', label: 'Settled', align: 'right' }]}
            rows={rows.map((r) => ({ period: r.period, stays: String(r.stays), gross: formatINR(r.gross), comm: formatINR(r.commission), net: formatINR(r.net) }))} />
        </Activatable>
      </div>
      <span className="caption" style={{ display: 'block', paddingTop: 8 }}>Select a statement to download its GST invoice.</span>
    </Widget>
  </>);
}
