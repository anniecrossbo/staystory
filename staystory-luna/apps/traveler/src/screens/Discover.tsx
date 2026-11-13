import { useEffect, useMemo, useState } from 'react';
import { liveTrips, pickStay, tripCardPrice, type MTrip } from '@staystory/market';
import { copyText, asset, cardTitle, compact, go, hashFor, shopHash, SITE, tripHash } from '../lib';
import { formatINR } from '@staystory/core';
import { Avatar, Badge, Button, EmptyState, FilterPill, Icon, IconButton, SearchField, SegmentedControl, Skeleton } from '@staystory/ui';
import { useSession } from '../session';
import { ToastHost, TravelerDock, useEscape } from '../ui';

export const DISCOVER_SCREENS = ['feed', 'filtered', 'loading', 'empty', 'creator', 'collection'];
const FILTERS = ['All', 'Heritage', 'Beaches', 'Mountains', 'Under ₹10k'];
const matches = (t: MTrip, f: string) => (f === 'All' ? true : f === 'Under ₹10k' ? tripCardPrice(t) < 10000 : t.tags.includes(f));
const REEL_VIEWS = ['1.2M', '640K', '410K', '388K', '210K', '96K'];
/** Shop collections. The design's names and counts, each opening the creator's trips that fit. */
const COLLECTIONS: { id: string; name: string; meta: string; img: string; fits: (t: MTrip) => boolean }[] = [
  { id: 'winter', name: 'Rajasthan in winter', meta: '2 trips · 14 stays', img: 'udaipur', fits: (t) => t.tags.includes('Heritage') },
  { id: 'weekends', name: 'Long weekends from Mumbai', meta: '3 trips · 9 stays', img: 'coorg', fits: (t) => t.days <= 3 },
  { id: 'budget', name: 'Stays under ₹4,000 a night', meta: '11 stays', img: 'jodhpur', fits: (t) => t.stays.some((x) => x.nightly < 4000) },
];

function TripRow({ t, from }: { t: MTrip; from?: string }) {
  const stayLine = [pickStay(t).name, ...t.experiences.slice(0, 2).map((e) => e.name.split(',')[0]!.toLowerCase())].join(' · ');
  return (
    <a href={tripHash(t, 'trip', { from })} className="glass-card" style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 'var(--radius-lg)', textDecoration: 'none', color: 'inherit' }} aria-label={`${t.title}, from ${formatINR(tripCardPrice(t))}`}>
      <img src={asset(t.img)} alt="" style={{ width: 88, height: 104, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }} />
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span className="cap10">{t.place} · {t.days} days</span>
        <span className="t13">{cardTitle(t)}</span>
        <span className="ell" style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}>{stayLine}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="t13">from {formatINR(tripCardPrice(t))}</span><span className="m11">{compact(t.saves)} saves</span></span>
      </span>
    </a>
  );
}

export function Discover({ screen }: { screen: string }) {
  const { s, me, signedIn, route, gate } = useSession();
  const [filter, setFilter] = useState(screen === 'filtered' ? 'Beaches' : 'All');
  const [query, setQuery] = useState(screen === 'empty' ? 'Ladakh under ₹5k' : '');
  const [busy, setBusy] = useState(false);
  const here = hashFor('discover', 'feed');

  // Route states set up what they show. Typing in search shows skeletons while it settles.
  useEffect(() => {
    if (screen === 'feed') { setFilter('All'); setQuery(''); }
    if (screen === 'filtered') setFilter((f) => (f === 'All' ? 'Beaches' : f));
    if (screen === 'empty') setQuery('Ladakh under ₹5k');
  }, [screen]);
  useEffect(() => { if (!query) return; setBusy(true); const id = setTimeout(() => setBusy(false), 350); return () => clearTimeout(id); }, [query]);

  const live = useMemo(() => liveTrips(s), [s]);
  const q = query.trim().toLowerCase();
  const results = useMemo(() => live.filter((t) => matches(t, filter) && (!q || `${t.place} ${t.title} ${s.creators[t.creatorId]?.handle ?? ''} ${s.creators[t.creatorId]?.name ?? ''} ${t.tags.join(' ')}`.toLowerCase().includes(q))), [live, filter, q, s.creators]);
  const loading = screen === 'loading' || (busy && !!q);
  const pick = (f: string) => { setFilter(f); go('discover', f === 'All' ? 'feed' : 'filtered'); };
  const avatar = () => (signedIn ? go('me', 'profile') : gate({ reason: 'signin', returnTo: here, backTo: here }));

  useEscape(screen === 'creator' || screen === 'collection' ? () => go('discover', screen === 'collection' ? 'creator' : 'feed', screen === 'collection' ? { c: route.params.c } : undefined) : undefined);
  if (screen === 'creator' || screen === 'collection') return <Shop screen={screen} />;

  return (<>
    <div className="scroll d128">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44 }}>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span className="m11">Good evening, {me.name.split(' ')[0]}</span><span className="ttl">Where to next?</span></span>
        <button className="reset" onClick={avatar} aria-label={signedIn ? 'Profile' : 'Sign in'} style={{ display: 'flex' }}><Avatar initials="MI" size={40} name={me.name} /></button>
      </div>
      <SearchField placeholder="A place, a vibe or a creator" aria-label="Search trips" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="pills">{FILTERS.map((f) => <FilterPill key={f} selected={filter === f} onClick={() => pick(f)}>{f}</FilterPill>)}</div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy="true">
          <Skeleton variant="rect" height={220} style={{ borderRadius: 20 }} /><Skeleton variant="title" width="60%" /><Skeleton variant="text" width="80%" /><Skeleton variant="rect" height={220} style={{ borderRadius: 20 }} /><Skeleton variant="title" width="50%" />
        </div>
      )}
      {!loading && results.length === 0 && (<>
        <div style={{ paddingTop: 48 }}><EmptyState icon="travel_explore" title={`No trips match “${query || filter}”`}>Try a wider budget, or follow creators who cover {query.split(' ')[0] || 'this place'} to hear about new trips.</EmptyState></div>
        <Button variant="secondary" size="lg" block icon="close" onClick={() => { setQuery(''); setFilter('All'); go('discover', 'feed'); }}>Clear search</Button>
      </>)}
      {!loading && results.length > 0 && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>{filter === 'All' ? 'Trending creator trips' : `${filter} trips`}</span>
          <span className="m11">{results.length} trips · prices for 2</span>
        </div>
        {results.map((t) => {
          const c = s.creators[t.creatorId]!;
          return (
            <div key={t.id} className="glass-card" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', flexShrink: 0 }}>
              <a href={tripHash(t, 'trip', { from: 'feed' })} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }} aria-label={`${t.title}, ${t.place}`}>
                <div style={{ position: 'relative', height: 176 }}>
                  <img src={asset(t.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 12, right: 12 }}><Badge tone="neutral" icon="bookmark">{compact(t.saves)} saves</Badge></div>
                </div>
                <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="cap10">{t.place} · {t.days} days</span>
                  <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>{cardTitle(t)}</span>
                </div>
              </a>
              <div style={{ padding: '12px 20px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="reset" onClick={() => go('discover', 'creator', { c: c.id })} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                  <Avatar initials={c.ini} size={24} /><span className="t13" style={{ color: 'var(--primary)' }}>{c.handle}</span>
                </button>
                <span style={{ flex: 1 }} /><span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>{formatINR(tripCardPrice(t))}</span>
              </div>
            </div>
          );
        })}
      </>)}
    </div>
    <TravelerDock active="discover" />
    <ToastHost />
  </>);
}

function Shop({ screen }: { screen: string }) {
  const { s, me, route, dispatch, flash, signedIn, gate } = useSession();
  const [tab, setTab] = useState('trips');
  const c = s.creators[route.params.c ?? 'anaya'] ?? s.creators.anaya!;
  const trips = liveTrips(s).filter((t) => t.creatorId === c.id);
  const following = me.followingIds.includes(c.id);
  const saved = me.savedShopIds.includes(c.id);
  const col = COLLECTIONS.find((k) => k.id === route.params.k);
  const link = `${SITE}/${c.id}`;
  const back = () => (screen === 'collection' ? go('discover', 'creator', { c: c.id }) : go('discover', 'feed'));

  const saveShop = () => {
    if (!signedIn) { gate({ reason: 'shop', creatorId: c.id, returnTo: shopHash(c.id), backTo: shopHash(c.id) }); return; }
    dispatch({ type: 'traveler/saveShop', id: me.id, creatorId: c.id });
    flash(saved ? 'Shop removed from WhatsApp' : 'Shop saved. We’ll WhatsApp you new trips.');
  };
  const share = async () => { flash((await copyText(link)) ? 'Shop link copied' : `Copy this link: ${link}`); };
  const reelTrips = trips.length ? Array.from({ length: 6 }, (_, i) => trips[i % trips.length]!) : [];

  return (<>
    <div className="scroll d128">
      <div className="head">
        <IconButton icon="arrow_back" label="Back" variant="white" onClick={back} />
        <span className="col1"><span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 600 }}>{screen === 'collection' ? (col?.name ?? 'Collection') : `${c.name}’s trip shop`}</span><span className="m11">staystory.in/{c.id}</span></span>
        <IconButton icon="ios_share" label="Share shop" variant="white" onClick={share} />
      </div>

      {screen === 'collection' ? (<>
        {(col ? trips.filter(col.fits) : []).map((t) => <TripRow key={t.id} t={t} from={`shop:${c.id}`} />)}
        {(!col || !trips.some(col.fits)) && <>
          <EmptyState icon="travel_explore" title="No trips in this collection yet">{c.name} has not added trips here. Browse the rest of the shop.</EmptyState>
          <Button variant="secondary" size="lg" block onClick={back}>Back to the shop</Button>
        </>}
      </>) : (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar initials={c.ini} size={64 as 48} tone="solid" />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', textAlign: 'center' }}>
            {[[String(trips.length), 'Trips'], [c.travelers, 'Travelers'], [c.followers, 'Followers']].map(([v, l]) => (
              <span key={l} style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 700 }}>{v}</span><span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--ink-2)' }}>{l}</span></span>
            ))}
          </div>
        </div>
        <span className="body">{c.bio}. Every trip here is one I took, with the stays and experiences from the reel.</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button variant={following ? 'secondary' : 'primary'} size="lg" icon={following ? 'check' : 'person_add'} onClick={() => dispatch({ type: 'traveler/follow', id: me.id, creatorId: c.id })}>{following ? 'Following' : 'Follow'}</Button>
          <Button variant="secondary" size="lg" icon={saved ? 'check' : 'chat'} onClick={saveShop}>{saved ? 'Shop saved' : 'Save shop to WhatsApp'}</Button>
        </div>
        <SegmentedControl aria-label="Shop sections" value={tab} onChange={setTab} options={[{ value: 'trips', label: 'Trips' }, { value: 'reels', label: 'Reels' }, { value: 'collections', label: 'Collections' }]} />
        {tab === 'trips' && (trips.length ? trips.map((t) => <TripRow key={t.id} t={t} from={`shop:${c.id}`} />) : <EmptyState icon="luggage" title="No trips yet">{c.name} has not published a trip. Follow to hear when they do.</EmptyState>)}
        {tab === 'reels' && (reelTrips.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
            {reelTrips.map((t, i) => (
              <a key={i} href={tripHash(t, 'trip', { from: `shop:${c.id}` })} aria-label={`Reel, ${t.title}, ${REEL_VIEWS[i]} views`} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'block' }}>
                <img src={asset(t.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span style={{ position: 'absolute', left: 6, bottom: 6, display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}><Icon name="play_arrow" size={16} />{REEL_VIEWS[i]}</span>
              </a>
            ))}
          </div>
        ) : <EmptyState icon="smart_display" title="No reels yet">Reels with bookable trips appear here.</EmptyState>)}
        {tab === 'collections' && COLLECTIONS.map((k) => (
          <button key={k.id} className="reset" onClick={() => go('discover', 'collection', { c: c.id, k: k.id })} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, borderBottom: '1px solid var(--divider)' }}>
            <img src={asset(k.img)} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span className="t13">{k.name}</span><span className="m11">{k.meta}</span></span>
            <Icon name="chevron_right" size={20} />
          </button>
        ))}
      </>)}
    </div>
    <TravelerDock active="discover" />
    <ToastHost />
  </>);
}
