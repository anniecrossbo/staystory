import { useEffect, useState } from 'react';
import { Icon, Widget } from '@staystory/ui';
import { mapQuery, mapsLink, tripMap, type MStay, type MTrip } from '@staystory/market';

/** `/api/status` is asked once per session; the Google key itself never leaves the server. */
let mapsReady: Promise<boolean> | undefined;
const mapsConfigured = () => (mapsReady ??= fetch('/api/status').then((r) => (r.ok ? r.json() : null)).then((j) => j?.maps === true).catch(() => false));

const H = 200;
const pin = { width: 24, height: 24, borderRadius: 'var(--radius-pill)', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as const;

export function MapSection({ trip, stay }: { trip: MTrip; stay: MStay }) {
  const map = tripMap(trip, stay);
  const [ready, setReady] = useState<boolean | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [focus, setFocus] = useState<string | undefined>();
  useEffect(() => { let on = true; mapsConfigured().then((v) => on && setReady(v)); return () => { on = false; }; }, []);
  if (!map) return null;
  const f = map.markers.find((m) => m.label === focus);
  const showImage = ready === true && !failed;
  const src = `/api/map?${mapQuery(map, { w: 393, h: H }, f)}`;
  return (
    <Widget className="section-map" title="On the map" subtitle={`${map.markers.length} place${map.markers.length === 1 ? '' : 's'} · stay and stops`}>
      <div style={{ position: 'relative', height: H, borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-card)', background: 'var(--surface-sunken)' }}>
        {showImage ? (
          <img src={src} alt={`Map of ${map.markers.map((m) => m.name).join(', ')}`} onError={() => setFailed(true)} style={{ width: '100%', height: H, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', background: 'var(--surface-tint)' }}>
            <Icon name="map" size={18} /><span className="m11">{ready === undefined ? 'Loading map' : "Map preview isn't connected yet"}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
        {map.markers.map((m) => {
          const on = focus === m.label;
          return (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 'var(--radius-sm)', background: on ? 'var(--primary-tint)' : 'transparent' }}>
              <button type="button" aria-pressed={on} aria-label={`${m.label}, ${m.name}. ${on ? 'Show all places' : 'Zoom the map to this place'}`} onClick={() => setFocus(on ? undefined : m.label)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, minHeight: 44, padding: '0 4px', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                <span aria-hidden style={pin}>{m.label}</span>
                <span className="t13">{m.name}</span>
              </button>
              <a href={mapsLink(m)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${m.name} in maps`} className="m11"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '0 8px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                <span>Open in maps</span><Icon name="open_in_new" size={14} />
              </a>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}
