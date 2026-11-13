/** Geometry of everything visible in a document, for numeric design-vs-app comparison. */
window.__geom = function (doc, rootSel) {
  doc = doc || document;
  const root = (rootSel && doc.querySelector(rootSel)) || doc.body;
  const win = doc.defaultView;
  const text = [], imgs = [];
  // Merge a parent's direct text nodes, so "Release {n} rooms" is one run however the markup splits it.
  const seen = new Set();
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement; if (!el || seen.has(el)) continue;
    seen.add(el);
    const nodes = Array.from(el.childNodes).filter((c) => c.nodeType === 3 && c.textContent.trim());
    if (!nodes.length) continue;
    const t = nodes.map((c) => c.textContent).join('').replace(/\s+/g, ' ').trim();
    const cs = win.getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (/Material Symbols/.test(cs.fontFamily)) continue; // icon glyph text
    const r = doc.createRange(); r.setStartBefore(nodes[0]); r.setEndAfter(nodes[nodes.length - 1]); const b = r.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    text.push({ t, x: b.x, y: b.y, w: b.width, h: b.height, fs: parseFloat(cs.fontSize), fw: cs.fontWeight, c: cs.color, tt: cs.textTransform });
  }
  root.querySelectorAll('img').forEach((im) => { const b = im.getBoundingClientRect(); imgs.push({ s: (im.getAttribute('src') || '').split('/').pop(), x: b.x, y: b.y, w: b.width, h: b.height }); });
  return { text, imgs };
};
