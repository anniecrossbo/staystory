/**
 * Finds icon buttons and avatars that sit beside a text block but are not centred on it.
 * A big title (24px and up) is judged on its own line; a block of several smaller lines (a name and a caption) is judged as a block.
 * Dialog and sheet close buttons are judged on the title line. Returns [{ ctl, title, fs, off, ref }] for offsets over 3px.
 */
window.__align = function (doc) {
  doc = doc || document;
  const win = doc.defaultView; const out = [];
  const leaders = [...doc.querySelectorAll('.lu-iconbtn, .lu-avatar')].filter((e) => e.getBoundingClientRect().width > 0);
  for (const el of leaders) {
    const p = el.parentElement; if (!p) continue; const cs = win.getComputedStyle(p);
    if (!/flex|grid/.test(cs.display) || cs.flexDirection.startsWith('column')) continue;
    const sibs = [...p.children].filter((c) => c !== el && c.getBoundingClientRect().width > 0 && (c.innerText || '').trim());
    if (!sibs.length) continue;
    const sib = sibs[0]; let best = null, bf = 0;
    const walk = (n) => { for (const c of n.children) { if ((c.innerText || '').trim() && !c.children.length) { const f = parseFloat(win.getComputedStyle(c).fontSize); if (f > bf) { bf = f; best = c; } } walk(c); } };
    if (!sib.children.length) { best = sib; bf = parseFloat(win.getComputedStyle(sib).fontSize); } else walk(sib);
    if (!best) continue;
    // display:contents wrappers have no box of their own, so judge on the title element
    const tb = best.getBoundingClientRect(), eb = el.getBoundingClientRect(), sb = sib.getBoundingClientRect();
    const inHead = !!el.closest('.lu-modal-head, .lu-sheet-head');
    const multi = !inHead && sb.height > tb.height * 1.45 && bf < 24 && sb.height > 0;
    const ref = multi ? sb : tb;
    const off = Math.round(eb.top + eb.height / 2 - (ref.top + ref.height / 2));
    if (Math.abs(off) > 3) out.push({ ctl: el.getAttribute('aria-label') || el.className.toString().slice(0, 16), title: (best.innerText || '').trim().slice(0, 26), fs: bf, off, ref: multi ? 'block' : 'title' });
  }
  return out;
};
