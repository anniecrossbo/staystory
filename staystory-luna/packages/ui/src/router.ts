import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Runs a state update inside a cross-fade between screens where the browser supports it. Everywhere else, and for
 * reduced motion, the update just happens.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(() => flushSync(update));
  else update();
}

/** Hash routes shaped `#/<flow>/<screen>`. Every design state gets its own URL so it can be reached directly. */
export interface Route { flow: string; screen: string }

function parse(defaultFlow: string, defaultScreen: string): Route {
  const [, flow, screen] = window.location.hash.split('?')[0]!.split('/');
  return { flow: flow || defaultFlow, screen: screen || defaultScreen };
}

export function useHashRoute(defaultFlow: string, defaultScreen: string): [Route, (flow: string, screen?: string) => void] {
  const [route, setRoute] = useState<Route>(() => parse(defaultFlow, defaultScreen));
  useEffect(() => {
    const on = () => withViewTransition(() => setRoute(parse(defaultFlow, defaultScreen)));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, [defaultFlow, defaultScreen]);
  const go = (flow: string, screen = '') => { window.location.hash = `/${flow}/${screen}`; };
  return [route, go];
}
