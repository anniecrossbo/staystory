import { createRoot } from 'react-dom/client';
import './traveler.css';
import { parseRoute, useRoute } from './lib';
import { SessionProvider } from './session';
import { stage } from './stage';
import { Social, SOCIAL_SCREENS } from './screens/Social';
import { TripFlow, TRIP_SCREENS } from './screens/Trip';
import { Auth, AUTH_SCREENS } from './screens/Auth';
import { Discover, DISCOVER_SCREENS } from './screens/Discover';
import { Trips, TRIPS_SCREENS, Profile } from './screens/Trips';

function App() {
  const { flow, screen } = useRoute();
  const pick = (list: string[], fallback: string) => (list.includes(screen) ? screen : fallback);
  return (
    <div className="stage"><div className="phone">
      {flow === 'social' ? <Social screen={pick(SOCIAL_SCREENS, 'reel')} />
        : flow === 'trip' ? <TripFlow screen={pick(TRIP_SCREENS, 'trip')} />
        : flow === 'auth' ? <Auth screen={pick(AUTH_SCREENS, 'welcome')} />
        : flow === 'trips' ? <Trips screen={pick(TRIPS_SCREENS, 'upcoming')} />
        : flow === 'me' ? <Profile />
        : <Discover screen={pick(DISCOVER_SCREENS, 'feed')} />}
    </div></div>
  );
}

// Deep links to result states are staged in the shared store before the first render.
stage(parseRoute());
createRoot(document.getElementById('root')!).render(<SessionProvider><App /></SessionProvider>);
