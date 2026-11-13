import '../hotel.css';
import { Button, Dock, SegmentedControl } from '@staystory/ui';
import { useMarket } from '@staystory/market';
import { ChromeTopBar } from '../components';
import { ui, useUi } from '../ui';
import { RANGES, type Range } from '../lib';
import type { Go } from '../actions';
import { Overview } from './Overview';
import { Bookings } from './Bookings';
import { Campaign } from './Campaign';
import { Campaigns } from './Campaigns';
import { Creators } from './Creators';
import { GapNight } from './GapNight';
import { Payouts } from './Payouts';

export const CONSOLE_SCREENS = ['overview', 'campaigns', 'campaignDetail', 'newCampaign', 'bookingDetail', 'creators', 'creatorDetail', 'invited', 'gap', 'gapConfirm', 'released', 'payouts'];
const VIEW_OF: Record<string, string> = { overview: 'overview', campaigns: 'campaigns', campaignDetail: 'campaigns', newCampaign: 'campaigns', bookingDetail: 'campaigns', creators: 'creators', creatorDetail: 'creators', invited: 'creators', gap: 'gap', gapConfirm: 'gap', released: 'gap', payouts: 'payouts' };
const HEAD: Record<string, string> = { overview: 'Creator bookings', campaigns: 'Campaigns', creators: 'Creators', gap: 'Gap Night', payouts: 'Payouts' };
/** Creators, campaigns and the gap night have no dated figures; the choice still carries to the overview. */
const NO_EFFECT = ['creators', 'campaigns', 'gap'];

export function Console({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const { range } = useUi();
  const view = VIEW_OF[screen]!;
  const toScreen = (id: string) => go('console', id);
  return (
    <div className="page">
      <ChromeTopBar go={go} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="eyebrow">StayStory for hotels · {s.hotel.name}, {s.hotel.city}</span>
          <span className="h1">{HEAD[view]}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
          <SegmentedControl size="sm" aria-label="Date range" value={range} onChange={(v) => ui.set({ range: v as Range })}
            options={RANGES.map(({ value, label }) => ({ value, label }))} />
          <Button variant="primary" icon="add" onClick={() => go('console', 'newCampaign')}>Create campaign</Button>
          {NO_EFFECT.includes(view) && <span className="caption" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, whiteSpace: 'nowrap' }}>Applies to the overview figures</span>}
        </div>
      </div>

      {view === 'overview' && <Overview go={go} />}
      {view === 'campaigns' && (screen === 'bookingDetail' ? <Bookings screen={screen} go={go} /> : <Campaigns screen={screen} go={go} />)}
      {view === 'creators' && <Creators screen={screen} go={go} />}
      {view === 'gap' && <GapNight screen={screen} go={go} />}
      {view === 'payouts' && <Payouts />}

      {screen === 'newCampaign' && <Campaign go={go} onClose={() => go('console', 'campaigns')} />}

      <div className="dock-wrap"><div>
        <Dock aria-label="Hotel console navigation" active={view} orb={false} onSelect={toScreen}
          items={[{ id: 'overview', icon: 'space_dashboard', label: 'Overview' }, { id: 'creators', icon: 'group', label: 'Creators' }, { id: 'campaigns', icon: 'campaign', label: 'Campaigns' }, { id: 'gap', icon: 'nights_stay', label: 'Gap Night' }, { id: 'payouts', icon: 'payments', label: 'Payouts' }]} />
      </div></div>
    </div>
  );
}
