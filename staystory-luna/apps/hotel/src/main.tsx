import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { useHashRoute } from '@staystory/ui';
import { market } from '@staystory/market';
import { Toaster } from './components';
import { Onboarding, ONBOARD_STEPS } from './screens/Onboarding';
import { Console, CONSOLE_SCREENS } from './screens/Console';

market.connectApi('/api/db');

function App() {
  const [route, go] = useHashRoute('console', 'overview');
  const { flow, screen } = route;
  // PROTO: campaign flow now opens as a popup from within the console
  useEffect(() => { if (flow === 'campaign') go('console', 'newCampaign'); }, [flow, go]);
  return (
    <>
      {flow === 'onboarding' ? <Onboarding screen={ONBOARD_STEPS.includes(screen) ? screen : 'property'} go={go} />
        : <Console screen={CONSOLE_SCREENS.includes(screen) ? screen : 'overview'} go={go} />}
      <Toaster />
    </>
  );
}

// Handy in dev tools: __market.dispatch({ type: 'offer/respond', ... })
if (import.meta.env.DEV) (window as unknown as { __market: typeof market }).__market = market;

createRoot(document.getElementById('root')!).render(<App />);
