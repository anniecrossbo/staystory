import { createRoot } from 'react-dom/client';
import { market } from '@staystory/market';
import './creator.css';
import { useRoute } from './router';
import { CreatorProvider } from './store';
import { Toasts } from './ui';
import { Onboard, ONBOARD_SCREENS } from './screens/Onboard';
import { Create, CREATE_SCREENS } from './screens/Create';
import { Home, HOME_SCREENS } from './screens/Home';

market.connectApi('/api/db');

function App() {
  const [{ flow, screen, q }, go] = useRoute();
  return (
    <div className="stage"><div className="phone">
      {flow === 'onboard' ? <Onboard screen={ONBOARD_SCREENS.includes(screen) ? screen : 'welcome'} go={go} />
        : flow === 'create' ? <Create screen={CREATE_SCREENS.includes(screen) ? screen : 'pick'} go={go} />
        : <Home screen={HOME_SCREENS.includes(screen) ? screen : 'insights'} go={go} q={q} />}
      <Toasts />
    </div></div>
  );
}
createRoot(document.getElementById('root')!).render(<CreatorProvider><App /></CreatorProvider>);
