import '../hotel.css';
import { Button, Dock, SegmentedControl } from '@staystory/ui';
import { useMarket } from '@staystory/market';
import { ChromeTopBar } from '../components';
import { ui, useUi } from '../ui';
import { RANGES, type Range } from '../lib';
import type { Go } from '../actions';
import { Overview } from './Overview';
import { Bookings } from './Bookings';
import { Creators } from './Creators';
import { GapNight } from './GapNight';
import { Payouts } from './Payouts';

export const CONSOLE_SCREENS = ['overview', 'bookings', 'bookingDetail', 'bookingsEmpty', 'creators', 'invited', 'gap', 'gapConfirm', 'released', 'payouts'];
const VIEW_OF: Record<string, string> = { overview: 'overview', bookings: 'bookings', bookingDetail: 'bookings', bookingsEmpty: 'bookings', creators: 'creators', invited: 'creators', gap: 'gap', gapConfirm: 'gap', released: 'gap', payouts: 'payouts' };
const HEAD: Record<string, string> = { overview: 'Creator bookings', bookings: 'Bookings', creators: 'Find creators', gap: 'Gap Night', payouts: 'Payouts' };
/** The date range changes the numbers on these views only. */
const RANGED = ['overview', 'payouts'];

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {RANGED.includes(view) && (
            <SegmentedControl size="sm" aria-label="Date range" value={range} onChange={(v) => ui.set({ range: v as Range })}
              options={RANGES.map(({ value, label }) => ({ value, label }))} />
          )}
          <Button variant="primary" icon="add" onClick={() => go('campaign', 'offer')}>Create campaign</Button>
        </div>
      </div>

      {view === 'overview' && <Overview go={go} />}
      {view === 'bookings' && <Bookings screen={screen} go={go} />}
      {view === 'creators' && <Creators screen={screen} go={go} />}
      {view === 'gap' && <GapNight screen={screen} go={go} />}
      {view === 'payouts' && <Payouts />}

      <div className="dock-wrap"><div>
        <Dock aria-label="Hotel console navigation" active={view} orb={false} onSelect={toScreen}
          items={[{ id: 'overview', icon: 'space_dashboard', label: 'Overview' }, { id: 'bookings', icon: 'event_available', label: 'Bookings' }, { id: 'creators', icon: 'group', label: 'Creators' }, { id: 'gap', icon: 'nights_stay', label: 'Gap Night' }, { id: 'payouts', icon: 'payments', label: 'Payouts' }]} />
      </div></div>
    </div>
  );
}
