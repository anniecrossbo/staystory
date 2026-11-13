import type { Extraction } from './types';

export interface SampleReel { id: string; label: string; reelUrl: string; caption: string; extraction: Extraction }

/** Cached results for the demo reels, used when no AI key is set or the live call fails. */
export const SAMPLE_REELS: SampleReel[] = [
  {
    id: 'udaipur-3', label: 'Udaipur, 3 days', reelUrl: 'https://www.instagram.com/reel/C9xUdr3days',
    caption: 'Three slow days in Udaipur. Sunrise at City Palace, boat ride on Lake Pichola, sunset at Ambrai Ghat. Stayed in a haveli by the lake. All under ₹15,000 per person.',
    extraction: { destination: 'Udaipur', days: 3, places: ['Ambrai Ghat', 'City Palace', 'Lake Pichola boat ride', 'Old City'], budgetPerPerson: 15000, namedStay: 'a haveli by the lake', style: ['Slow travel', 'Couples'], title: 'Three slow days in Udaipur' },
  },
  {
    id: 'jaipur-weekend', label: 'Jaipur weekend', reelUrl: 'https://www.instagram.com/reel/C8jPrWknd',
    caption: 'Jaipur weekend with the gang. Amer Fort at 7am before the crowds, kachori and lassi crawl in the old city, Nahargarh for sunset. Stayed at The Verandah. Around ₹6k each.',
    extraction: { destination: 'Jaipur', days: 2, places: ['Amer Fort', 'Old city food walk', 'Nahargarh sunset'], budgetPerPerson: 6000, namedStay: 'The Verandah', style: ['Friend groups', 'Weekend trips'], title: 'Jaipur weekend with the gang' },
  },
];
export const findSampleByCaption = (caption: string) => SAMPLE_REELS.find((s) => s.caption.toLowerCase() === caption.trim().toLowerCase());
