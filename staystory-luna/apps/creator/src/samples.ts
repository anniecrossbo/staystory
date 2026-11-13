/** One-tap sample reels for the caption field. Captions match the server's cached samples (SAMPLE_REELS in @staystory/server), so the cached reading is used. */
export const SAMPLES = [
  { id: 'udaipur-3', label: 'Udaipur 3 days', reelUrl: 'https://www.instagram.com/reel/C9xUdr3days', caption: 'Three slow days in Udaipur. Sunrise at City Palace, boat ride on Lake Pichola, sunset at Ambrai Ghat. Stayed in a haveli by the lake. All under ₹15,000 per person.' },
  { id: 'jaipur-weekend', label: 'Jaipur weekend', reelUrl: 'https://www.instagram.com/reel/C8jPrWknd', caption: 'Jaipur weekend with the gang. Amer Fort at 7am before the crowds, kachori and lassi crawl in the old city, Nahargarh for sunset. Stayed at The Verandah. Around ₹6k each.' },
] as const;
