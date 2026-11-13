/**
 * Finds white blocks sitting on white, where nothing separates them: a card inside a card with no border, shadow, tint or
 * outline of its own (an inset accent stripe does not count). Returns [{ el, parent, w, h }] for each one found.
 */
window.__surfaces = function (doc) {
  doc = doc || document;
  const win = doc.defaultView; const out = [];
  const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const whiteish = (c) => c && c.a >= 0.8 && c.r >= 248 && c.g >= 248 && c.b >= 248;
  const hasEdge = (cs) => {
    const bw = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && rgba(cs['border' + s + 'Color']) && rgba(cs['border' + s + 'Color']).a > 0.05);
    const shadow = cs.boxShadow !== 'none' && cs.boxShadow.split(/,(?![^(]*\))/).some((x) => !/inset/.test(x));
    const outline = parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none';
    return bw || shadow || outline;
  };
  for (const el of doc.querySelectorAll('body *')) {
    const b = el.getBoundingClientRect(); if (b.width < 40 || b.height < 24) continue;
    const cs = win.getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (!whiteish(rgba(cs.backgroundColor))) continue;
    if (cs.backgroundImage !== 'none') continue;
    if (hasEdge(cs)) continue;
    let p = el.parentElement; let pbg = null;
    while (p && p !== doc.documentElement) { const c = rgba(win.getComputedStyle(p).backgroundColor); if (c && c.a >= 0.5) { pbg = c; break; } p = p.parentElement; }
    if (!whiteish(pbg)) continue;
    out.push({ el: (el.className || el.tagName).toString().slice(0, 40), parent: (p.className || p.tagName).toString().slice(0, 30), w: Math.round(b.width), h: Math.round(b.height) });
  }
  return out;
};
