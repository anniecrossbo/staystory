import { useEffect, useState } from 'react';

/** Hash routes shaped `#/<flow>/<screen>`. Every design state gets its own URL so it can be reached directly. */
export interface Route { flow: string; screen: string }

function parse(defaultFlow: string, defaultScreen: string): Route {
  const [, flow, screen] = window.location.hash.split('?')[0]!.split('/');
  return { flow: flow || defaultFlow, screen: screen || defaultScreen };
}

export function useHashRoute(defaultFlow: string, defaultScreen: string): [Route, (flow: string, screen?: string) => void] {
  const [route, setRoute] = useState<Route>(() => parse(defaultFlow, defaultScreen));
  useEffect(() => {
    const on = () => setRoute(parse(defaultFlow, defaultScreen));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, [defaultFlow, defaultScreen]);
  const go = (flow: string, screen = '') => { window.location.hash = `/${flow}/${screen}`; };
  return [route, go];
}
