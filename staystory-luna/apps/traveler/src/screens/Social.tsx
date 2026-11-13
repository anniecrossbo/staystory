import { useEffect, useState } from 'react';
import { Icon } from '@staystory/ui';
import { buildDm } from '@staystory/core';
import { dmSentTo, reelComments } from '@staystory/market';
import { ME, asset, go, tripHash } from '../lib';
import { tripFor, useSession } from '../session';
import { useEscape } from '../ui';

export const SOCIAL_SCREENS = ['reel', 'comments', 'dm'];
const COMMENTS = [
  { ini: 'RK', bg: '#8A55E0', name: 'rohan.k', when: '2 min', text: 'link pls! which haveli is this', reply: true },
  { ini: 'SP', bg: '#B07F2E', name: 'sneha.p', when: '6 min', text: 'link pls', reply: true },
  { ini: 'DK', bg: '#3D7151', name: 'divya.k', when: '11 min', text: 'how much for 3 days with flights?', reply: false },
  { ini: 'AM', bg: '#0786B5', name: 'arjun.m', when: '18 min', text: 'link pls', reply: true },
];
const circle = (size: number, bg: string, extra: React.CSSProperties = {}): React.CSSProperties => ({ width: size, height: size, borderRadius: 999, background: bg, flexShrink: 0, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', ...extra });
const stat: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 };
const btnReset: React.CSSProperties = { border: 0, background: 'transparent', color: '#fff', font: 'inherit', cursor: 'pointer', padding: 0 };

/** Lift the sheet above the on-screen keyboard (visual viewport shrinks); 0 on desktop. */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const f = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    f(); vv.addEventListener('resize', f); vv.addEventListener('scroll', f);
    return () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f); };
  }, []);
  return inset;
}

/** T0 is shown for context only. StayStory builds the comment-to-DM automation, not these screens. The link card opens the trip and starts the credit. */
export function Social({ screen }: { screen: string }) {
  const { s, route, dispatch } = useSession();
  const [draft, setDraft] = useState('');
  const kb = useKeyboardInset();
  const trip = tripFor(s, route) ?? s.trips[0]!;
  const creator = s.creators[trip.creatorId]!;
  const handle = creator.handle.slice(1);
  const isDefault = trip.id === 'anaya-udaipur';
  const kw = trip.dmKeyword;
  const keyword = kw === 'link' ? 'link pls' : kw || 'link pls';
  const autoOn = !!kw;
  const mine = reelComments(s, trip.id).filter((c) => c.travelerId === ME);
  const dmd = dmSentTo(s, trip.id, ME);
  const dmComment = [...mine].reverse().find((c) => c.dmSent);
  const dm = buildDm({ creatorHandle: creator.handle, tripTitle: trip.title, url: `staystory.in/${trip.creatorId}/${trip.slug}`, firstName: 'Meera' });
  const post = () => {
    const text = draft.trim().slice(0, 300); if (!text) return;
    dispatch({ type: 'reel/comment', id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, tripId: trip.id, travelerId: ME, name: 'meera.iyer', text, at: new Date().toISOString() });
    setDraft('');
  };
  const q = { c: trip.creatorId, s: trip.slug };
  const to = (sc: string) => go('social', sc, q);
  useEscape(screen === 'reel' ? undefined : () => to('reel'));
  useEffect(() => { document.title = 'StayStory traveler'; }, []);

  if (screen === 'dm' && !dmd) return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', paddingTop: 54, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 12px', borderBottom: '1px solid #1C1C1E' }}>
        <button aria-label="Back to comments" onClick={() => to('comments')} style={{ ...btnReset, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center' }}><Icon name="arrow_back_ios" size={24} /></button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Messages</span>
      </div>
      <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Icon name="chat" size={40} />
        <span style={{ fontSize: 17, fontWeight: 700 }}>No messages yet</span>
        <span style={{ fontSize: 14, lineHeight: '19px', color: '#AEAEB2' }}>{autoOn ? <>Comment “{keyword}” on the reel and {creator.name.split(' ')[0]}'s trip arrives here.</> : `${creator.name.split(' ')[0]} is not sending trips by DM on this reel right now.`}</span>
        <button onClick={() => to('comments')} style={{ ...btnReset, marginTop: 12, minHeight: 44, padding: '0 24px', borderRadius: 999, background: '#3797F0', fontSize: 14, fontWeight: 700 }}>Back to comments</button>
      </div>
    </div>
  );

  if (screen === 'dm') return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', paddingTop: 54, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 12px', borderBottom: '1px solid #1C1C1E' }}>
        <button aria-label="Back to reel" onClick={() => to('reel')} style={{ ...btnReset, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center' }}><Icon name="arrow_back_ios" size={24} /></button>
        <span style={circle(36, '#C20E4D', { fontSize: 13 })}>{creator.ini[0]}</span>
        <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 15, fontWeight: 700 }}>{handle}</span><span style={{ fontSize: 12, color: '#8E8E93' }}>{creator.name}</span></span>
      </div>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <span style={{ alignSelf: 'center', fontSize: 11, color: '#8E8E93' }}>Today 21:14</span>
        <span style={{ alignSelf: 'flex-end', maxWidth: '70%', background: '#3797F0', padding: '10px 14px', borderRadius: 20, fontSize: 14, lineHeight: '19px' }}>{dmComment?.text ?? keyword}</span>
        <span style={{ alignSelf: 'flex-start', maxWidth: '80%', background: '#262626', padding: '10px 14px', borderRadius: 20, fontSize: 14, lineHeight: '19px' }}>{dm.text}</span>
        <a href={tripHash(trip, 'trip', { from: 'dm' })} style={{ alignSelf: 'flex-start', width: 260, background: '#262626', borderRadius: 20, overflow: 'hidden', textDecoration: 'none', color: '#fff' }}>
          <img src={asset(trip.img)} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 14px' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{dm.cardTitle}</span>
            <span style={{ fontSize: 12, color: '#AEAEB2' }}>{dm.cardUrl}</span>
          </span>
        </a>
        <span style={{ alignSelf: 'flex-start', fontSize: 11, color: '#8E8E93', paddingLeft: 8 }}>{dm.footer}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 34px' }}>
        <span style={{ flex: 1, height: 44, borderRadius: 999, background: '#1C1C1E', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 14, color: '#8E8E93' }}>Message</span>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', color: '#fff' }}>
      <img src={asset(trip.img)} alt={`Reel: ${trip.title}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 55%, rgba(0,0,0,.75) 100%)' }} />
      <div style={{ position: 'absolute', top: 58, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 20, lineHeight: '28px', fontWeight: 700 }}>Reels</span>
        <Icon name="photo_camera" size={24} />
      </div>
      <div style={{ position: 'absolute', right: 12, bottom: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, fontSize: 12, fontWeight: 600 }}>
        <span style={stat}><Icon name="favorite" size={28} fill />84.2K</span>
        <button onClick={() => to('comments')} aria-label="Comments" style={{ ...btnReset, ...stat }}><Icon name="chat_bubble" size={28} />12.4K</button>
        <span style={stat}><Icon name="send" size={28} />9.1K</span>
        <span style={stat}><Icon name="bookmark" size={28} />21K</span>
      </div>
      <div style={{ position: 'absolute', left: 16, right: 72, bottom: 112, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={circle(32, '#C20E4D', { border: '2px solid #fff', fontSize: 12 })}>{creator.ini[0]}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{handle}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', border: '1px solid rgba(255,255,255,.6)', borderRadius: 8 }}>Follow</span>
        </div>
        <span style={{ fontSize: 13, lineHeight: '18px' }}>
          {isDefault ? 'Three days in Udaipur under ₹15,000, lake-view stay included.' : `${trip.title}, stays and experiences included.`} {autoOn && <>Comment <b>{keyword}</b> and I'll DM you the full bookable trip.</>}
        </span>
        <span style={{ fontSize: 11, lineHeight: '15px', color: 'rgba(255,255,255,.75)' }}>Paid partnership · StayStory</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: '#000', display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 12, boxSizing: 'border-box' }}>
        {['home', 'search', 'smart_display', 'chat', 'person'].map((n) => <Icon key={n} name={n} size={24} fill={n === 'smart_display'} />)}
      </div>

      {screen === 'comments' && (<>
        <button aria-label="Close comments" onClick={() => to('reel')} style={{ ...btnReset, position: 'absolute', left: 0, right: 0, top: 0, bottom: 560 }} />
        <div role="dialog" aria-label="Comments" style={{ position: 'absolute', left: 0, right: 0, bottom: kb, height: 560, maxHeight: `calc(100% - ${kb}px - 60px)`, background: '#1C1C1E', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}><span style={{ width: 36, height: 4, borderRadius: 999, background: '#48484A' }} /></div>
          <span style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, paddingBottom: 12, borderBottom: '1px solid #2C2C2E' }}>Comments</span>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
            {mine.map((c) => (
              <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={circle(32, '#5F9298', { fontSize: 12 })}>MI</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: '#AEAEB2' }}><b style={{ color: '#fff' }}>{c.name}</b> · now</span>
                  <span style={{ fontSize: 13, lineHeight: '18px', overflowWrap: 'anywhere' }}>{c.text}</span>
                  {c.dmSent && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9CC8FF' }}><Icon name="mark_chat_read" size={16} />{handle} sent you the trip in DMs</span>}
                </span>
              </div>
            ))}
            {COMMENTS.map((c) => (
              <div key={c.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={circle(32, c.bg, { fontSize: 12 })}>{c.ini}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 12, color: '#AEAEB2' }}><b style={{ color: '#fff' }}>{c.name}</b> · {c.when}</span>
                  <span style={{ fontSize: 13, lineHeight: '18px' }}>{c.text}</span>
                  {c.reply && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9CC8FF' }}><Icon name="mark_chat_read" size={16} />{handle} sent you the trip in DMs</span>}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 34px', borderTop: '1px solid #2C2C2E' }}>
            <span style={circle(32, '#5F9298', { fontSize: 12 })}>MI</span>
            <input className="ss-comment" value={draft} maxLength={300} placeholder="Add a comment" aria-label="Add a comment" enterKeyHint="send"
              onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); post(); } }}
              style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 999, border: '1px solid #3A3A3C', background: 'transparent', color: '#fff', font: 'inherit', fontSize: 13, padding: '0 16px', boxSizing: 'border-box' }} />
            {draft.trim() && <button onClick={post} aria-label="Post comment" style={{ ...btnReset, color: '#9CC8FF', fontSize: 13, fontWeight: 700, minHeight: 44, padding: '1px 6px' }}>Post</button>}
            <button onClick={() => to('dm')} aria-label="Open messages" style={{ ...btnReset, padding: '1px 6px', color: '#9CC8FF', fontSize: 13, fontWeight: 700, minHeight: 44 }}>{dmd ? 'Inbox 1' : 'Inbox'}</button>
          </div>
        </div>
      </>)}
    </div>
  );
}
