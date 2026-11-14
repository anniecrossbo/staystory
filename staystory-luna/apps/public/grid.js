/**
 * Measures every .lu-grid against the Luna OS layout grid (design/ds/luna/tokens.json "layout").
 * For each visible grid it reports, as { grid, kind, ... } rows:
 *   margin: the grid's left or right edge is not --layout-margin from the page edge (1px tolerance)
 *   gap:    two adjacent children are not --layout-gap (20px) apart on either axis
 *   column: a child's left edge is off a column boundary
 *   span:   a child's width is not n columns plus (n-1) gaps for the span n its class declares (span-1..4, span-full)
 *   width:  at a 1512px viewport the four columns are not 337.5px
 * An empty array means the page is on the grid. Pass the document to check (default: this one).
 */
window.__grid = function (doc) {
  doc = doc || document;
  const win = doc.defaultView; const out = [];
  const TOL = 1;
  const px = (v) => { const p = doc.createElement('div'); p.style.cssText = `position:absolute;visibility:hidden;width:${v}`; doc.body.appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return w; };
  const margin = px('var(--layout-margin)'), gapTok = px('var(--layout-gap)');
  const vw = doc.documentElement.clientWidth;
  const grids = [...doc.querySelectorAll('.lu-grid')].filter((g) => !(g instanceof win.SVGElement) && g.getBoundingClientRect().width > 0) // Luna's chart gridlines reuse the class name on SVG lines;
  grids.forEach((g, gi) => {
    const name = `${g.parentElement && g.parentElement.className ? '.' + String(g.parentElement.className).split(' ')[0] : g.parentElement && g.parentElement.tagName.toLowerCase()} > .lu-grid #${gi}`;
    const gb = g.getBoundingClientRect(); const cs = win.getComputedStyle(g);
    const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    const gx = parseFloat(cs.columnGap), gy = parseFloat(cs.rowGap);
    const add = (kind, extra) => out.push({ grid: name, kind, ...extra });
    if (Math.abs(gb.left - margin) > TOL) add('margin', { side: 'left', got: +gb.left.toFixed(1), want: margin });
    if (Math.abs(vw - gb.right - margin) > TOL) add('margin', { side: 'right', got: +(vw - gb.right).toFixed(1), want: margin });
    if (Math.abs(gx - gapTok) > TOL || Math.abs(gy - gapTok) > TOL) add('gap', { axis: 'token', got: `${gx}/${gy}`, want: gapTok });
    const colW = (gb.width - (cols - 1) * gx) / cols;
    if (win.innerWidth === 1512 && Math.abs(colW - 337.5) > TOL) add('width', { got: +colW.toFixed(2), want: 337.5 });
    const kids = [...g.children].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && win.getComputedStyle(c).display !== 'none'; });
    const label = (c) => (c.className && String(c.className).trim().split(' ').slice(0, 2).join('.')) || c.tagName.toLowerCase();
    kids.forEach((c) => {
      const r = c.getBoundingClientRect();
      const i = Math.round((r.left - gb.left) / (colW + gx));
      const wantLeft = gb.left + i * (colW + gx);
      if (Math.abs(r.left - wantLeft) > TOL) add('column', { child: label(c), got: +(r.left - gb.left).toFixed(1), want: +(wantLeft - gb.left).toFixed(1) });
      const m = /\bspan-(\d|full)\b/.exec(String(c.className));
      const declared = m ? (m[1] === 'full' || m[1] === '4' ? cols : Math.min(+m[1], cols)) : 1;
      const wantW = declared * colW + (declared - 1) * gx;
      if (Math.abs(r.width - wantW) > TOL) add('span', { child: label(c), declared, got: +r.width.toFixed(1), want: +wantW.toFixed(1) });
    });
    // adjacent children: same row means the horizontal gap, next row means the vertical gap
    for (let a = 0; a < kids.length; a++) for (let b = 0; b < kids.length; b++) {
      if (a === b) continue;
      const A = kids[a].getBoundingClientRect(), B = kids[b].getBoundingClientRect();
      const sameRow = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 1;
      if (sameRow && B.left > A.left && B.left - A.right < gapTok + 40 && Math.abs(B.left - A.right - gx) > TOL) add('gap', { axis: 'x', child: label(kids[b]), got: +(B.left - A.right).toFixed(1), want: gx });
      const sameCol = Math.min(A.right, B.right) - Math.max(A.left, B.left) > 1;
      if (sameCol && B.top >= A.bottom - 0.5 && B.top - A.bottom < gapTok + 40 && Math.abs(B.top - A.bottom - gy) > TOL) {
        // only the nearest row below counts
        const nearer = kids.some((k) => { if (k === kids[a] || k === kids[b]) return false; const K = k.getBoundingClientRect(); return K.top >= A.bottom - 0.5 && K.top < B.top - 0.5 && Math.min(A.right, K.right) - Math.max(A.left, K.left) > 1; });
        if (!nearer) add('gap', { axis: 'y', child: label(kids[b]), got: +(B.top - A.bottom).toFixed(1), want: gy });
      }
    }
  });
  return out;
};
