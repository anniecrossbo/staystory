import { useEffect } from 'react';
import { Badge, Banner, Button, StatTile, Tag, Widget } from '@staystory/ui';
import { market, useMarket, type InviteStatus } from '@staystory/market';
import { inviteCreator, type Go } from '../actions';
import { asset, liveCampaigns, matchedCreators } from '../lib';
import { ui, useUi } from '../ui';

export function Creators({ screen, go }: { screen: string; go: Go }) {
  const s = useMarket();
  const { lastInvited, focusCreator } = useUi();
  const camp = liveCampaigns(s)[0];
  const creators = matchedCreators(s);

  // Deep link to `invited` shows the confirmation for @couplesgoplaces, as in the design.
  useEffect(() => {
    if (screen !== 'invited' || lastInvited) return;
    const c = liveCampaigns(market.get())[0];
    if (c && !c.invites.couples) market.dispatch({ type: 'campaign/invite', campaignId: c.id, creatorId: 'couples' });
    ui.set({ lastInvited: 'couples' });
  }, [screen, lastInvited]);

  // Coming from a table row or a link: scroll to that creator and mark it for a moment.
  useEffect(() => {
    if (!focusCreator) return;
    const el = document.getElementById(`creator-${focusCreator}`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => ui.set({ focusCreator: '' }), 2600);
    return () => clearTimeout(t);
  }, [focusCreator]);

  const status = (id: string): InviteStatus | undefined => camp?.invites[id];
  const banner = s.creators[lastInvited];
  return (<>
    {screen === 'invited' && banner && <Banner tone="success" icon="send" title={`Invite sent to ${banner.handle}`}>They usually reply within a day. You'll see it in Needs your decision.</Banner>}
    <span className="body">Matched on destination, audience cities, budget and booking performance.</span>
    <div className="lu-grid">
      {creators.map((m) => {
        const st = status(m.id);
        const btn = !st
          ? { variant: 'primary' as const, icon: 'send', label: 'Invite to campaign', disabled: false, onClick: () => inviteCreator(m.id, go) }
          : st === 'invited' ? { variant: 'secondary' as const, icon: 'check', label: 'Invited, awaiting reply', disabled: true, onClick: () => {} }
          : st === 'accepted' ? { variant: 'secondary' as const, icon: 'check_circle', label: 'Accepted, view campaign', disabled: false, onClick: () => go('console', 'overview') }
          : st === 'countered' ? { variant: 'primary' as const, icon: 'forum', label: 'Countered, review offer', disabled: false, onClick: () => go('console', 'overview') }
          : { variant: 'secondary' as const, icon: 'block', label: 'Declined this campaign', disabled: true, onClick: () => {} };
        return (
          <div key={m.id} id={`creator-${m.id}`} className={`span-1${focusCreator === m.id ? ' hl' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <Widget style={{ flex: 1 }} title={m.handle} subtitle={`${m.followers} followers · ${m.score} match`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <img src={asset(m.cover)} alt="" style={{ width: '100%', height: 96, borderRadius: 'var(--radius-md)', objectFit: 'cover', display: 'block' }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Tag hue={m.hue}>{m.niche}</Tag>{m.top && <Badge tone="vip" icon="star">Top converter</Badge>}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  <StatTile label="Conversion" value={m.conv ?? ''} /><StatTile label="Bookings/mo" value={m.bookingsPerMonth ?? ''} /><StatTile label="Delhi NCR" value={m.ncr ?? ''} />
                </div>
                <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--ink-2)' }}>{m.why}</span>
                <Button block variant={btn.variant} icon={btn.icon} disabled={btn.disabled} onClick={btn.onClick}>{btn.label}</Button>
              </div>
            </Widget>
          </div>
        );
      })}
    </div>
  </>);
}
