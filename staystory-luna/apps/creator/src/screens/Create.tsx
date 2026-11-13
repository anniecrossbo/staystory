import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { formatINR } from '@staystory/core';
import { useMarket, market, builderFromPrice, daysTitle, extractionDetails, makeCreatorTrip, planItinerary, slugify, stayFromHotel, tripIdFor, type MStay } from '@staystory/market';
import { Banner, Button, Checkbox, Chip, EmptyState, ErrorState, Icon, IconButton, ProgressBar, ProvenanceTag, Radio, Skeleton, Tag, TextField, Toggle, Widget } from '@staystory/ui';
import { asset, CREATOR_ID, DESTS, DETAIL_KEYS, destFor, regionFor, stayCatalog, stayCard, type DetailKey } from '../data';
import { SAMPLES } from '../samples';
import type { Go } from '../router';
import { draftFor, useUi } from '../store';
import { CloseFooter, Sheet, tripUrl, useCopy } from '../ui';

export const CREATE_SCREENS = ['pick', 'analyzing', 'error', 'detected', 'days', 'stays', 'preview', 'published'];
const ORDER = ['pick', 'analyzing', 'detected', 'days', 'stays', 'preview', 'published'];
const CTA: Record<string, [string, string]> = { pick: ['Build the trip', 'auto_awesome'], detected: ['Looks right', 'arrow_forward'], days: ['Next: stays', 'arrow_forward'], stays: ['Next: preview', 'arrow_forward'], preview: ['Publish link', 'rocket_launch'], published: ['Track performance', 'insights'] };
/** A pasted link must look like an Instagram or YouTube post. Empty means "use the reel I picked below". */
export const validReelLink = (s: string) => !s.trim() || /(instagram\.com\/\S+|youtube\.com\/\S+|youtu\.be\/\S+)/i.test(s.trim());
/** The caption must be at least a sentence before we spend a reading on it. */
export const captionReady = (c: string) => c.trim().length >= 20 && c.trim().split(/\s+/).length >= 4;
const PROVIDERS: Record<string, string> = { anthropic: 'Claude', openai: 'OpenAI' };
const BOARD: Record<string, string> = { RO: 'Room only', BB: 'Breakfast included', HB: 'Half board', FB: 'Full board', AI: 'All inclusive' };
interface LiveHotel { id: string; name: string; address: string; starRating: number; mainPhoto: string; ratePerNight: number; currency: string; boardType: string }
type Live = { status: 'idle' | 'loading' | 'ready' | 'error'; hotels: LiveHotel[]; source?: string; note?: string };
const isoDay = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
interface ExtractReply { extraction: { destination: string | null; days: number | null; places: string[]; budgetPerPerson: number | null; namedStay: string | null; style: string[]; title: string | null }; source: 'ai' | 'cache' | 'rules'; provider?: string; usable: boolean; coords?: Record<string, { lat: number; lng: number }> }
class ReadError extends Error {}
const h1: React.CSSProperties = { fontSize: 28, lineHeight: '39px', fontWeight: 700 };

export function Create({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const { draft: d, setDraft, profile, flash, analyzing, setAnalyzing } = useUi();
  const copy = useCopy();
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<DetailKey | null>(null);
  const [editVal, setEditVal] = useState('');
  const [drag, setDrag] = useState<{ di: number; id: string } | null>(null);
  const [share, setShare] = useState<'story' | null>(null);
  const idx = Math.max(0, ORDER.indexOf(screen === 'error' ? 'analyzing' : screen));
  const to = (k: string) => go('create', k);
  const dest = destFor(d.place);
  const prev = d.editId ? s.trips.find((t) => t.id === d.editId) : undefined;
  const catalog = stayCatalog(s, d.place, prev?.stays);
  const included = [...catalog.filter((x) => d.inc[x.id] || d.pick === x.id), ...d.liveStays.filter((x) => (d.inc[x.id] || d.pick === x.id) && !catalog.some((c) => c.id === x.id))];
  const stops = d.days.reduce((n, x) => n + x.items.length, 0);
  const experiences = d.days.flatMap((x) => x.items).filter((i) => i.bookable && i.price && i.kind !== 'Stay').map((i) => ({ pricePerPerson: i.price! }));
  const nights = Math.max(1, d.days.length - 1);
  const fromPrice = builderFromPrice(included.map((x) => stayCard(s, x).stay), experiences, nights);
  const slugTaken = !d.editId && s.trips.some((t) => t.id === tripIdFor(CREATOR_ID, d.slug));
  const slugError = !d.slug ? 'Add a name for your link' : slugTaken ? 'You already have a trip at this link. Pick another name.' : undefined;
  const tripId = d.published ?? tripIdFor(CREATOR_ID, d.slug);

  // The reading is a real request. The checklist only shows that we are waiting; it never moves on by itself.
  const [live, setLive] = useState<Live>({ status: 'idle', hotels: [] });
  const dRef = useRef(d); dRef.current = d;
  useEffect(() => {
    if (screen !== 'analyzing') { setTick(0); return; }
    if (!analyzing) return;
    let cancelled = false; let timedOut = false;
    const ctrl = new AbortController();
    const ts = [setTimeout(() => setTick(1), 600), setTimeout(() => setTick(2), 1300), setTimeout(() => { timedOut = true; ctrl.abort(); }, 25_000)];
    (async () => {
      const cur = dRef.current;
      try {
        const res = await fetch('/api/extract', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption: cur.caption.trim(), reelUrl: cur.link.trim() || undefined }) });
        let body: (Partial<ExtractReply> & { error?: string }) | null = null;
        try { body = await res.json(); } catch { /* not JSON */ }
        if (!res.ok) throw new ReadError(body?.error ?? 'The reader is not available right now. Try again in a moment, or build the trip by hand.');
        if (!body?.extraction) throw new ReadError('The reader sent back something we could not use. Try again, or build the trip by hand.');
        const r = body as ExtractReply;
        if (cancelled) return;
        if (!r.usable) {
          const e = r.extraction;
          setDraft({ extractError: !e.destination ? 'We could not find a destination in that caption. It may have no places we recognise.' : `We found ${e.destination} but no places we recognise. Add the place names to your caption, or add them yourself.` });
          setAnalyzing(false); to('error'); return;
        }
        applyReading(r);
        setAnalyzing(false); to('detected');
      } catch (err) {
        if (cancelled) return;
        setDraft({ extractError: err instanceof ReadError ? err.message : timedOut ? 'Reading took too long. Check your connection and try again.' : 'We could not reach the reader. Check your connection and try again, or build the trip by hand.' });
        setAnalyzing(false); to('error');
      }
    })();
    return () => { cancelled = true; ts.forEach(clearTimeout); ctrl.abort(); };
  }, [screen, analyzing]);

  /** Turn a reading into the draft: details, title, itinerary seeded from the places, and the stays for that destination. */
  function applyReading(r: ExtractReply) {
    const e = r.extraction; const cur = dRef.current; const place = e.destination!;
    const reel = DESTS.findIndex((x) => x.place === place);
    const base = draftFor(s, reel < 0 ? cur.reel : reel, { place });
    const keep = place === cur.place && !cur.editId;
    const pool = s.trips.filter((t) => t.creatorId === CREATOR_ID).flatMap((t) => t.experiences);
    const days = planItinerary(e, r.coords ?? {}, pool).map((day) => ({ n: day.n, title: day.title, items: day.stops.map((p) => ({ id: p.id, name: p.name, kind: p.kind, bookable: p.bookable, price: p.pricePerPerson, time: p.time, img: p.img, dur: p.dur, lat: p.lat, lng: p.lng })) }));
    setDraft({
      reel: base.reel, analyzed: base.reel, place, details: extractionDetails(e, regionFor(place)), title: e.title?.trim() || daysTitle(days.length, place), days,
      pick: keep ? cur.pick : base.pick, inc: keep ? cur.inc : base.inc, slug: keep ? cur.slug : base.slug, liveStays: keep ? cur.liveStays : [],
      source: r.source, provider: r.provider, extractError: undefined, manual: false,
    });
  }

  useEffect(() => {
    if (screen !== 'stays') return;
    const ctrl = new AbortController();
    setLive((l) => ({ ...l, status: 'loading' }));
    const q = new URLSearchParams({ cityName: d.place, countryCode: 'IN', checkIn: isoDay(30), checkOut: isoDay(32), adults: '2' });
    fetch(`/api/hotels?${q}`, { signal: ctrl.signal }).then((r) => r.json()).then((b: { hotels?: LiveHotel[]; source?: string; note?: string }) => setLive({ status: 'ready', hotels: Array.isArray(b.hotels) ? b.hotels : [], source: b.source, note: b.note }))
      .catch((err) => { if (!ctrl.signal.aborted) setLive({ status: 'error', hotels: [], note: err instanceof Error ? err.message : undefined }); });
    return () => ctrl.abort();
  }, [screen, d.place]);

  const makeTrip = () => {
    const place = (d.details.Destination.split(',')[0] || d.place).trim() || d.place;
    const stays: MStay[] = included.map((x) => stayCard(s, x).stay);
    const trip = makeCreatorTrip(s, {
      creatorId: CREATOR_ID, slug: d.slug, title: d.title.trim() || daysTitle(d.days.length, place), place, img: destFor(d.place).img, tags: prev?.tags ?? destFor(d.place).tags,
      days: d.days.map((x) => ({ n: x.n, title: x.title, stops: x.items.map((i) => ({ id: i.id, name: i.name, kind: i.kind, bookable: i.bookable, pricePerPerson: i.price, time: i.time, img: i.img, dur: i.dur, lat: i.lat, lng: i.lng })) })),
      stays, pickStayId: d.pick, dmKeyword: d.keyword, reelUrl: d.link.trim() || `instagram.com/reel/${d.place.toLowerCase()}`, now: new Date().toISOString(), previous: prev,
    });
    return d.autoReply ? trip : { ...trip, dmKeyword: '' };
  };
  const publish = () => {
    if (slugError || !included.length) return;
    const trip = makeTrip();
    market.dispatch({ type: 'trip/publish', trip });
    setDraft({ published: trip.id });
    go('create', 'published');
  };
  // A deep link straight to `published` should still describe something that is really live.
  useEffect(() => {
    if (screen === 'published' && !s.trips.some((t) => t.id === tripId) && !slugError && included.length) { const t = makeTrip(); market.dispatch({ type: 'trip/publish', trip: t }); setDraft({ published: t.id }); }
  }, [screen]);

  const build = () => {
    if (!captionReady(d.caption) || !validReelLink(d.link)) return;
    setDraft({ extractError: undefined }); setAnalyzing(true); to('analyzing');
  };
  const manual = () => {
    const f = draftFor(s, d.reel);
    setDraft({ ...f, link: d.link, caption: d.caption, analyzed: d.reel, manual: true, days: f.days.map((x) => ({ ...x, items: [] })) });
    to('days');
  };
  const onCta = () => {
    if (screen === 'pick') build();
    else if (screen === 'preview') publish();
    else if (screen === 'published') go('app', 'trip', { t: tripId });
    else to(ORDER[idx + 1]!);
  };
  const close = () => { setAnalyzing(false); go('app', d.editId ? 'trip' : 'insights', d.editId ? { t: d.editId } : undefined); };
  const back = () => {
    if (idx <= 1 || screen === 'published') close();
    else if (d.editId && screen === 'days') close();
    else to(idx <= 2 ? 'pick' : ORDER[idx - 1]!);
  };

  const move = (di: number, from: number, dir: -1 | 1) => setDraft((x) => ({ days: x.days.map((day, k) => {
    if (k !== di) return day; const to2 = from + dir; if (to2 < 0 || to2 >= day.items.length) return day;
    const items = [...day.items]; [items[from], items[to2]] = [items[to2]!, items[from]!]; return { ...day, items };
  }) }));
  const onHandleMove = (e: RPointerEvent) => {
    if (!drag) return;
    const row = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-row]');
    if (!row || Number(row.dataset.day) !== drag.di) return;
    const cur = d.days[drag.di]!.items.findIndex((i) => i.id === drag.id); const over = Number(row.dataset.idx);
    if (cur >= 0 && over !== cur) move(drag.di, cur, over > cur ? 1 : -1);
  };
  const addStop = (di: number) => setDraft((x) => {
    const used = new Set(x.days.flatMap((y) => y.items.map((i) => i.name)));
    const pick = dest.suggest.find((g) => !used.has(g.name)) ?? { name: `Extra stop ${stops + 1}`, kind: 'Tip' };
    return { days: x.days.map((day, k) => (k === di ? { ...day, items: [...day.items, { id: `s${Date.now()}`, name: pick.name, kind: pick.kind, bookable: false }] } : day)) };
  });

  const saveDetail = () => {
    if (!editing) return; const v = editVal.trim(); if (!v) { setEditing(null); return; }
    const patch: Partial<typeof d> = { details: { ...d.details, [editing]: v } };
    if (editing === 'Destination') patch.place = d.place;
    if (editing === 'Length') {
      const n = Math.min(7, Math.max(1, parseInt(v.match(/\d+/)?.[0] ?? '', 10) || d.days.length));
      if (n !== d.days.length) {
        patch.days = n > d.days.length ? [...d.days, ...Array.from({ length: n - d.days.length }, (_, k) => ({ n: d.days.length + k + 1, title: 'Open day', items: [] }))] : d.days.slice(0, n);
        patch.details = { ...d.details, Length: `${n} ${n === 1 ? 'day' : 'days'}, ${Math.max(0, n - 1)} ${n === 2 ? 'night' : 'nights'}` };
        flash(n > d.days.length ? `Added ${n - d.days.length} open ${n - d.days.length === 1 ? 'day' : 'days'}` : `Removed day ${n + 1} onwards`);
      }
    }
    setDraft(patch); setEditing(null);
  };

  const checks = [
    { label: `Destination: ${d.place}`, done: true, doing: false },
    { label: `${stops} places across ${d.days.length} days`, done: tick >= 1 || !analyzing, doing: false },
    { label: 'Matching partner stays nearby', done: !analyzing ? false : tick >= 2, doing: !analyzing || tick === 1 },
    { label: 'Pricing bookable experiences', done: false, doing: analyzing && tick >= 2 },
  ];
  const liveChecks = [
    { label: 'Reading your caption', done: tick >= 1, doing: tick === 0 },
    { label: 'Finding the destination and places', done: tick >= 2, doing: tick === 1 },
    { label: 'Waiting for the reader to answer', done: false, doing: tick >= 2 },
    { label: 'Building your itinerary', done: false, doing: false },
  ];
  const cta = CTA[screen];
  const ctaDisabled = (screen === 'pick' && (!captionReady(d.caption) || !validReelLink(d.link))) || (screen === 'preview' && !!slugError) || (screen === 'days' && stops === 0) || (screen === 'stays' && !included.length);
  const link = tripUrl(profile.handle, d.slug);

  return (<>
    <div className="scroll s120">
      <div className="head">
        <IconButton icon={idx <= 1 || screen === 'published' ? 'close' : 'arrow_back'} label={idx <= 1 || screen === 'published' ? 'Close' : 'Back'} variant="white" onClick={back} />
        <div className="stack gap4" style={{ flex: 1 }}>
          <span style={{ fontSize: 11, lineHeight: '15px', fontWeight: 600, color: 'var(--muted)' }}>{screen === 'published' ? 'Published' : screen === 'error' ? 'Step 1 of 5 · needs attention' : `Step ${Math.max(1, idx)} of 5`}</span>
          <ProgressBar value={Math.round((idx / 6) * 100)} tone={screen === 'error' ? 'danger' : screen === 'published' ? 'success' : undefined} aria-label="Trip builder progress" />
        </div>
      </div>

      {screen === 'pick' && (<>
        <span style={h1}>Which reel should become a trip?</span>
        <TextField label="Paste a reel, story or guide link" placeholder="instagram.com/reel/…" icon="link" value={d.link} onChange={(e) => setDraft({ link: e.target.value })}
          error={validReelLink(d.link) ? undefined : 'That doesn’t look like an Instagram or YouTube link'} />
        <div className="stack gap8">
          <TextField multiline label="Reel caption" placeholder="Three slow days in Udaipur. Sunrise at City Palace…" value={d.caption} onChange={(e) => setDraft({ caption: e.target.value })}
            hint="Paste the caption from your reel. We can't read Instagram directly yet." />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SAMPLES.map((x) => <Chip key={x.id} selected={d.caption === x.caption} icon="auto_awesome" onClick={() => setDraft({ link: x.reelUrl, caption: x.caption })}>{x.label}</Chip>)}
          </div>
          {!captionReady(d.caption) && <span className="t-cap" role="status">Add a sentence from your caption to build the trip. Try a sample above.</span>}
        </div>
        <span className="t-eyebrow">Your recent reels</span>
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {DESTS.map((r, k) => (
            <button key={r.place} className="pick-btn" onClick={() => setDraft({ reel: k })} aria-pressed={d.reel === k}
              style={{ position: 'relative', height: 160, padding: 0, border: `2px solid ${d.reel === k ? 'var(--primary)' : 'transparent'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              <img src={asset(r.img)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', left: 4, right: 4, bottom: 4, padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-bar)', backdropFilter: 'blur(var(--blur-chrome))', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: 'var(--ink)' }}>
                <span style={{ fontSize: 11, lineHeight: '15px', fontWeight: 600 }}>{r.place}</span>
                <span style={{ fontSize: 10, lineHeight: '14px', fontWeight: 600, color: 'var(--ink-2)' }}>{r.views} views</span>
              </span>
            </button>
          ))}
        </div>
      </>)}

      {screen === 'analyzing' && (<>
        <div className="hero" style={{ height: 300 }}><img src={asset(dest.img)} alt="" /></div>
        <span className="h-title">Reading your reel</span>
        <Widget title="Luna is extracting" subtitle="From video, captions and comments">
          <div className="stack gap12">
            {(analyzing ? liveChecks : checks).map((c) => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 24 }}>
                <span style={{ display: 'flex', color: c.done ? 'var(--success)' : c.doing ? 'var(--primary)' : 'var(--faint)' }}><Icon name={c.done ? 'check_circle' : c.doing ? 'progress_activity' : 'radio_button_unchecked'} size={20} /></span>
                <span className="t-b" style={{ flex: 1, color: c.done || c.doing ? 'var(--ink)' : 'var(--muted)' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </Widget>
      </>)}

      {screen === 'error' && (<>
        <div style={{ paddingTop: 48 }}><ErrorState title="We couldn't read this reel" detail={d.extractError ?? 'It may be private or have no places mentioned. Make it public, or add the places yourself.'} /></div>
        <div className="stack gap8">
          <Button variant="primary" size="lg" block icon="refresh" onClick={() => to('pick')}>Try again</Button>
          <Button variant="secondary" size="lg" block icon="edit_note" onClick={manual}>Build the trip by hand</Button>
        </div>
      </>)}

      {screen === 'detected' && (<>
        <span style={h1}>Here's what we found</span>
        {d.source ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {d.source === 'ai' ? <ProvenanceTag kind="inferred" /> : <Tag hue="charcoal">{d.source === 'cache' ? 'Cached sample' : 'Rule-based reading'}</Tag>}
            <span className="t-cap">{d.source === 'ai' ? `Read by AI${d.provider ? ` (${PROVIDERS[d.provider] ?? d.provider})` : ''}` : d.source === 'cache' ? 'Saved reading of a sample reel' : 'Read from your caption with simple rules'}</span>
          </div>
        ) : <ProvenanceTag kind="inferred" />}
        {d.source && d.source !== 'ai' && <span className="t-b2">Read with simple rules. Check each detail.</span>}
        <Widget title="Trip details">
          <div className="stack">
            {DETAIL_KEYS.map((k) => (
              <div key={k} className="line" style={{ minHeight: 48, padding: editing === k ? '8px 0' : 0 }}>
                <span className="t-cap" style={{ width: 96, flex: 'none' }}>{k}</span>
                {editing === k
                  ? <div style={{ flex: 1 }}><TextField aria-label={k} value={editVal} autoFocus onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveDetail(); if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); } }} /></div>
                  : <span className="t-s" style={{ flex: 1 }}>{d.details[k]}</span>}
                {editing === k
                  ? <IconButton icon="check" label={`Save ${k}`} variant="ghost" size="sm" onClick={saveDetail} />
                  : <IconButton icon="edit" label={`Edit ${k}`} variant="ghost" size="sm" onClick={() => { setEditing(k); setEditVal(d.details[k]); }} />}
              </div>
            ))}
          </div>
        </Widget>
        <TextField label="Trip title on your storefront" value={d.title} onChange={(e) => setDraft({ title: e.target.value })} />
      </>)}

      {screen === 'days' && (<>
        <span style={h1}>Day by day</span>
        {d.manual && stops === 0 && <Banner tone="warning" icon="edit_note" title="Add the places yourself">Use Add a stop on each day. Bookable experiences come from your stays and offers.</Banner>}
        {d.days.map((day, di) => (
          <Widget key={day.n} title={`Day ${day.n}`} subtitle={day.title} count={day.items.length}>
            <div className="stack">
              {day.items.map((it, ii) => (
                <div key={it.id} className={`line${drag?.id === it.id ? ' dragging' : ''}`} data-row data-day={di} data-idx={ii} style={{ minHeight: 48 }}>
                  <button className="drag-handle" aria-label={`Reorder ${it.name}. Drag, or use the up and down arrow keys.`} aria-roledescription="drag handle"
                    onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDrag({ di, id: it.id }); }} onPointerMove={onHandleMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
                    onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(di, ii, -1); } if (e.key === 'ArrowDown') { e.preventDefault(); move(di, ii, 1); } }}>
                    <Icon name="drag_indicator" size={20} />
                  </button>
                  <span className="col1"><span className="t-s">{it.name}</span><span className="t-cap">{it.kind}{it.price && it.kind !== 'Stay' ? ` · ${formatINR(it.price)} per person` : ''}</span></span>
                  <Tag hue={it.bookable ? 'moss' : 'charcoal'}>{it.bookable ? 'Bookable' : 'Tip'}</Tag>
                  <IconButton icon="close" label={`Remove ${it.name}`} variant="ghost" size="sm" onClick={() => setDraft((x) => ({ days: x.days.map((y, k) => (k === di ? { ...y, items: y.items.filter((z) => z.id !== it.id) } : y)) }))} />
                </div>
              ))}
              <div style={{ paddingTop: 8 }}><Button variant="ghost" size="sm" icon="add" onClick={() => addStop(di)}>Add a stop</Button></div>
            </div>
          </Widget>
        ))}
      </>)}

      {screen === 'stays' && (<>
        <span style={h1}>Pick partner stays</span>
        <span className="t-b2">Your pick is the default. Followers can switch; you're credited either way.</span>
        {catalog.map((h) => { const c = stayCard(s, h); const pick = d.pick === h.id; const on = !!d.inc[h.id] || pick; return (
          <div key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 'var(--radius-lg)', background: pick ? 'var(--surface-tint)' : 'var(--surface)', border: `1px solid ${pick ? 'var(--primary-edge)' : 'var(--glass-edge)'}`, boxShadow: 'var(--shadow-card)' }}>
            <img src={asset(h.img)} alt="" style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span className="t-s">{h.name}</span><span className="t-cap">{c.meta}</span><span><Tag hue="moss">{c.comm}</Tag></span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <Radio checked={pick} onChange={() => setDraft({ pick: h.id, inc: { ...d.inc, [h.id]: true } })} label="Pick" />
              <Checkbox checked={on} disabled={pick} onChange={() => setDraft({ inc: { ...d.inc, [h.id]: !d.inc[h.id] } })} label="Offer" />
            </span>
          </div>); })}

        <span className="t-eyebrow">More stays near {d.place}</span>
        {live.status === 'loading' && [0, 1].map((k) => (
          <div key={k} aria-hidden style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--glass-edge)' }}>
            <Skeleton variant="rect" width={64} height={64} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}><Skeleton variant="text" width="70%" /><Skeleton variant="text" width="45%" /></span>
          </div>
        ))}
        {live.status !== 'loading' && live.hotels.filter((h) => !catalog.some((c) => c.id === `liteapi-${h.id}`)).map((h) => {
          const st = stayFromHotel(h, dest.img); const id = `liteapi-${h.id}`; const pick = d.pick === id; const on = !!d.inc[id] || pick;
          const choose = (next: Partial<typeof d>) => setDraft((x) => ({ ...next, liveStays: x.liveStays.some((y) => y.id === id) ? x.liveStays : [...x.liveStays, st!] }));
          return (
            <div key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 'var(--radius-lg)', background: pick ? 'var(--surface-tint)' : 'var(--surface)', border: `1px solid ${pick ? 'var(--primary-edge)' : 'var(--glass-edge)'}`, boxShadow: 'var(--shadow-card)' }}>
              <img src={h.mainPhoto || asset(dest.img)} alt="" onError={(e) => { const el = e.currentTarget; if (!el.src.endsWith(`${dest.img}.jpg`)) el.src = asset(dest.img); }} style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover', flex: 'none' }} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span className="t-s">{h.name}</span>
                <span className="t-cap">{[h.starRating ? `${h.starRating}-star` : '', BOARD[h.boardType] ?? h.boardType].filter(Boolean).join(' · ')}</span>
                <span className="t-cap">{st ? `${formatINR(st.nightly)} a night` : 'Rate on request'}</span>
                {st && <span><Tag hue="sky">Live rate</Tag></span>}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <Radio checked={pick} disabled={!st} onChange={() => st && choose({ pick: id, inc: { ...d.inc, [id]: true } })} label="Pick" />
                <Checkbox checked={on} disabled={!st || pick} onChange={() => st && choose({ inc: { ...d.inc, [id]: !d.inc[id] } })} label="Offer" />
              </span>
            </div>);
        })}
        {live.status !== 'loading' && !live.hotels.length && (
          <Banner tone="warning" icon="hotel" title={live.status === 'error' ? 'We couldn’t load live rates' : live.source === 'liteapi' ? 'No live rates for these dates' : 'Live hotel rates aren’t connected yet'}>
            {live.status === 'ready' && live.source !== 'liteapi' ? 'Your own stays still work.' : 'Your own stays still work. Try again later.'}
          </Banner>
        )}
      </>)}

      {screen === 'preview' && (<>
        <span style={h1}>Preview and publish</span>
        <Widget title={d.source ? d.title : daysTitle(d.days.length, d.place)} subtitle={`${d.days.length} days · ${stops} stops · ${included.length} stays`}>
          <div className="stack gap12">
            <img src={asset(dest.img)} alt="" style={{ width: '100%', height: 180, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-b"><span style={{ color: 'var(--ink-2)' }}>From, for 2</span><span style={{ fontWeight: 600 }}>{formatINR(fromPrice)}</span></div>
          </div>
        </Widget>
        <TextField label="Your link" value={link} icon="link" disabled={!!d.editId} error={slugError} hint={d.editId ? 'The link stays the same when you edit a live trip' : 'Short and lowercase works best in bios'}
          onChange={(e) => { const raw = e.target.value; const pre = `staystory.in/${profile.handle}/`; setDraft({ slug: slugify(raw.startsWith(pre) ? raw.slice(pre.length) : raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw) }); }} />
        <Banner tone="warning" icon="campaign" title="Label it as a paid partnership">Add "Paid partnership" or #ad when you share this link.</Banner>
      </>)}

      {screen === 'published' && (<>
        <div style={{ paddingTop: 24 }}><EmptyState icon="rocket_launch" title="Your trip is live">Followers can book it now at {link}.</EmptyState></div>
        <Widget title="Share it">
          <div className="stack gap12">
            <div className="row8">
              <Button variant="secondary" icon="content_copy" onClick={() => copy(`https://${link}`)}>Copy link</Button>
              <Button variant="secondary" icon="photo_camera" onClick={() => setShare('story')}>Story</Button>
              <Button variant="secondary" icon="chat" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${d.title}: book the whole trip here https://${link}`)}`, '_blank', 'noopener')}>WhatsApp</Button>
            </div>
            <Toggle checked={d.autoReply} onChange={(v) => { setDraft({ autoReply: v }); saveKeyword(v, d.keyword); }} label={`Auto-reply to “${d.keyword || 'link'} pls” comments`} />
            <TextField label="Comment keyword" value={d.keyword} disabled={!d.autoReply} hint="Anyone who comments this on your reel gets the trip in their DMs"
              onChange={(e) => setDraft({ keyword: e.target.value.replace(/\s/g, '').toLowerCase() })} onBlur={() => saveKeyword(d.autoReply, d.keyword)} onKeyDown={(e) => { if (e.key === 'Enter') { saveKeyword(d.autoReply, d.keyword); (e.target as HTMLElement).blur(); } }} />
          </div>
        </Widget>
        <Banner tone="warning" icon="campaign" title="Label it as a paid partnership">Add "Paid partnership" or #ad on the reel and in the DM.</Banner>
      </>)}
    </div>

    {cta && <div className="cta"><Button variant="primary" size="lg" block iconRight={cta[1]} disabled={ctaDisabled} onClick={onCta}>{cta[0]}</Button></div>}

    {share && (
      <Sheet title="Share to your story" subtitle="Instagram does not take stories from the web, so copy the caption and paste it on your story." onClose={() => setShare(null)}
        footer={<><CloseFooter onClose={() => setShare(null)} /><Button variant="primary" icon="open_in_new" onClick={() => window.open('https://www.instagram.com/', '_blank', 'noopener')}>Open Instagram</Button></>}>
        <div className="stack gap12">
          <div style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--surface-sunken)' }} className="t-b">{d.title}. Book the whole trip: {link} #ad</div>
          <Button variant="secondary" icon="content_copy" onClick={() => { copy(`${d.title}. Book the whole trip: https://${link} #ad`, 'Caption copied'); }}>Copy caption</Button>
        </div>
      </Sheet>
    )}
  </>);

  function saveKeyword(on: boolean, kw: string) {
    const t = s.trips.find((x) => x.id === tripId); if (!t) return;
    const next = on ? kw.trim() || 'link' : '';
    if (t.dmKeyword !== next) { market.dispatch({ type: 'trip/publish', trip: { ...t, dmKeyword: next } }); flash(on ? 'Keyword saved' : 'Auto-reply off'); }
  }
}
