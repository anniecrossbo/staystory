import { useEffect, useState } from 'react';
import { withViewTransition } from '@staystory/ui';

/** Hash routes shaped `#/<flow>/<screen>?key=value`. Every design state has its own URL. */
export interface Route { flow: string; screen: string; q: URLSearchParams }
export type Go = (flow: string, screen?: string, params?: Record<string, string>) => void;

function parse(): Route {
  const [path = '', query = ''] = window.location.hash.replace(/^#/, '').split('?');
  const [, flow, screen] = path.split('/');
  return { flow: flow || 'app', screen: screen || '', q: new URLSearchParams(query) };
}

export function useRoute(): [Route, Go] {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => withViewTransition(() => setRoute(parse()));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go: Go = (flow, screen = '', params) => {
    const qs = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
    window.location.hash = `/${flow}/${screen}${qs}`;
  };
  return [route, go];
}
