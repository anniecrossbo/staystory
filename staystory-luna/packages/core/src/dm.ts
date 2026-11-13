/**
 * Comment-to-DM automation. A creator registers a keyword for a reel ("link"); when a follower comments it, StayStory
 * replies with the trip in a DM. This is the matching and the message. The real version sits behind Meta's messaging
 * webhook (needs app review); the same functions run there.
 */

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** True when the comment contains the keyword as a whole word or phrase: "link pls" and "Link!" match "link", "linked" does not. */
export function matchesKeyword(comment: string, keyword: string): boolean {
  const k = norm(keyword);
  if (!k) return false;
  return (` ${norm(comment)} `).includes(` ${k} `);
}

export interface DmInput { creatorHandle: string; tripTitle: string; url: string; firstName?: string }
export interface DmMessage { text: string; cardTitle: string; cardUrl: string; footer: string }

/** The auto-DM. It always says it was sent automatically and for whom, as the partnership rules require. */
export function buildDm({ creatorHandle, tripTitle, url, firstName }: DmInput): DmMessage {
  return {
    text: `Hi${firstName ? ` ${firstName}` : ''}! Here's my full ${tripTitle.replace(/^three days in /i, '').replace(/ under .*$/i, '')} trip. You can change dates, stays and experiences, and book it all in one go.`,
    cardTitle: tripTitle,
    cardUrl: url,
    footer: `Sent automatically by StayStory for ${creatorHandle}`,
  };
}
