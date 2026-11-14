import '../hotel.css';
import { Button, Dock, SegmentedControl } from '@staystory/ui';
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

export const CONSOLE_SCREENS = ['overview', 'bookings', 'bookingsEmpty', 'campaigns', 'campaignDetail', 'newCampaign', 'bookingDetail', 'creators', 'creatorDetail', 'invited', 'gap', 'gapConfirm', 'released', 'payouts'];
const VIEW_OF: Record<string, string> = { overview: 'overview', bookings: 'bookings', bookingsEmpty: 'bookings', campaigns: 'campaigns', campaignDetail: 'campaigns', newCampaign: 'overview', bookingDetail: 'bookings', creators: 'creators', creatorDetail: 'creators', invited: 'creators', gap: 'gap', gapConfirm: 'gap', released: 'gap', payouts: 'payouts' };
const HEAD: Record<string, string> = { overview: 'Overview', bookings: 'Bookings', campaigns: 'Campaigns', creators: 'Find creators', gap: 'Gap Night', payouts: 'Payouts' };

export function Console({ screen, go }: { screen: string; go: Go }) {
  const { range } = useUi();
  const view = VIEW_OF[screen]!;
  const toScreen = (id: string) => go('console', id);
  return (
    <div className="page lu-page">
      <div className="page-title-row">
        <span className="h1">{HEAD[view]}</span>
        <ChromeTopBar go={go} />
        <div className="controls">
          <SegmentedControl size="sm" aria-label="Date range" value={range} onChange={(v) => ui.set({ range: v as Range })}
            options={RANGES.map(({ value, label }) => ({ value, label }))} />
          <Button variant="primary" icon="add" onClick={() => go('console', 'newCampaign')}>Create campaign</Button>
        </div>
      </div>

      <div className="fold">
      {view === 'overview' && <Overview go={go} />}
      {view === 'bookings' && <Bookings screen={screen} go={go} />}
      {view === 'campaigns' && <Campaigns screen={screen} go={go} />}
      {view === 'creators' && <Creators screen={screen} go={go} />}
      {view === 'gap' && <GapNight screen={screen} go={go} />}
      {view === 'payouts' && <Payouts />}
      </div>

      {screen === 'newCampaign' && <Campaign go={go} onClose={() => go('console', 'overview')} />}

      <div className="dock-wrap"><div>
        <Dock aria-label="Hotel console navigation" active={view} orb={false} onSelect={toScreen}
          items={[{ id: 'overview', icon: 'space_dashboard', label: 'Overview' }, { id: 'bookings', icon: 'work', label: 'Bookings' }, { id: 'creators', icon: 'group', label: 'Creators' }, { id: 'campaigns', icon: 'campaign', label: 'Campaigns' }, { id: 'gap', icon: 'nights_stay', label: 'Gap Night' }, { id: 'payouts', icon: 'payments', label: 'Payouts' }]} />
      </div></div>
    </div>
  );
}
