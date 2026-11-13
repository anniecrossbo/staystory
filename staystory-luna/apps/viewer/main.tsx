/**
 * Renders the original design files (design/*.dc.html) without the design tool's runtime (support.js).
 * Usage: /viewer/?file=LunaHotel&screen=gap   (extra query params are passed to the component as props)
 * Without ?file it lists every file and screen.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import '@staystory/ui';

const Luna = (window as any).Luna as Record<string, React.ComponentType<any>>;
const h = React.createElement;

class DCLogic {
  props: any; state: any = {}; _u: ((prev: any) => void) | null = null;
  constructor(props: any) { this.props = props; }
  setState(p: any) { const prev = this.state; this.state = { ...prev, ...(typeof p === 'function' ? p(prev) : p) }; this._u?.(prev); }
}

const holeRe = /^\s*\{\{([\s\S]+)\}\}\s*$/;
const evalExpr = (expr: string, scope: any) => { try { return new Function('s', `with(s){return (${expr})}`)(scope); } catch (e) { console.warn('hole failed', expr, e); return undefined; } };
const value = (raw: string | null, scope: any): any => {
  if (raw == null) return undefined;
  const m = raw.match(holeRe);
  if (m && !raw.trim().slice(2).includes('{{')) return evalExpr(m[1]!, scope);
  if (raw.includes('{{')) return raw.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => { const v = evalExpr(e, scope); return v == null ? '' : String(v); });
  return raw;
};
const camel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const parseStyle = (css: string) => { const o: Record<string, string> = {}; css.split(';').forEach((d) => { const i = d.indexOf(':'); if (i < 0) return; const k = d.slice(0, i).trim(); const v = d.slice(i + 1).trim(); if (k) o[k.startsWith('--') ? k : camel(k)] = v; }); return o; };
const HTML_ATTR: Record<string, string> = { class: 'className', for: 'htmlFor', onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', tabindex: 'tabIndex', inputmode: 'inputMode', autocomplete: 'autoComplete', viewbox: 'viewBox', 'stroke-width': 'strokeWidth' };
const IMPORT_ATTR: Record<string, string> = { inputmode: 'inputMode', 'aria-label': 'aria-label', 'default-value': 'defaultValue', 'default-checked': 'defaultChecked', 'default-selected': 'defaultSelected' };

function kids(el: Element, scope: any, key: string): React.ReactNode[] { return Array.from(el.childNodes).map((n, i) => render(n, scope, `${key}.${i}`)); }

function render(node: Node, scope: any, key: string): React.ReactNode {
  if (node.nodeType === 3) { const t = node.textContent ?? ''; return t.includes('{{') ? value(t, scope) : t; }
  if (node.nodeType !== 1) return null;
  const el = node as Element; const tag = el.tagName.toLowerCase();
  if (tag === 'helmet' || tag === 'script' || tag === 'style') return null;
  if (tag === 'sc-if') return value(el.getAttribute('value'), scope) ? h(React.Fragment, { key }, ...kids(el, scope, key)) : null;
  if (tag === 'sc-for') {
    const list = value(el.getAttribute('list'), scope) ?? []; const as = el.getAttribute('as') ?? 'item';
    return (list as any[]).map((item, i) => h(React.Fragment, { key: `${key}.f${i}` }, ...kids(el, { ...scope, [as]: item }, `${key}.f${i}`)));
  }
  if (tag === 'x-import') {
    const name = (el.getAttribute('component-from-global-scope') ?? '').split('.')[1]!;
    const Comp = Luna[name]; const props: any = { key };
    for (const a of Array.from(el.attributes)) {
      if (a.name === 'component-from-global-scope' || a.name.startsWith('hint-placeholder')) continue;
      const k = IMPORT_ATTR[a.name] ?? camel(a.name);
      const v = a.value === '' ? true : value(a.value, scope);
      props[k] = k === 'style' && typeof v === 'string' ? parseStyle(v) : v;
    }
    if (!Comp) return h('span', { key, style: { color: 'red' } }, `[missing Luna.${name}]`);
    const c = kids(el, scope, key);
    return h(Comp, props, ...(c.length ? c : []));
  }
  const props: any = { key };
  for (const a of Array.from(el.attributes)) {
    if (a.name.startsWith('hint-placeholder')) continue;
    const k = HTML_ATTR[a.name] ?? a.name;
    const v = value(a.value, scope);
    if (k === 'style') props.style = typeof v === 'string' ? parseStyle(v) : v;
    else if (a.value === '') props[k] = true;
    else props[k] = v;
  }
  const c = kids(el, scope, key);
  return ['img', 'br', 'hr', 'input'].includes(tag) ? h(tag, props) : h(tag, props, ...c);
}

function Viewer({ file, params }: { file: string; params: Record<string, string> }) {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const [err, setErr] = React.useState('');
  const ref = React.useRef<{ root: Element; inst: any; w: number; hgt: number } | null>(null);
  React.useEffect(() => {
    fetch(`/design-src/${file}.dc.html`).then((r) => r.text()).then((src) => {
      const doc = new DOMParser().parseFromString(src, 'text/html');
      const root = doc.querySelector('x-dc')!; const sc = doc.querySelector('script[data-dc-script]')!;
      const meta = JSON.parse(sc.getAttribute('data-props') ?? '{}'); const prev = meta.$preview ?? { width: 393, height: 852 };
      const Cls = new Function('DCLogic', `${sc.textContent}\nreturn Component;`)(DCLogic);
      const inst = new Cls(params); inst._u = (p: any) => { inst.componentDidUpdate?.(inst.props, p); force(); };
      ref.current = { root, inst, w: prev.width, hgt: prev.height }; force();
    }).catch((e) => setErr(String(e)));
  }, [file]);
  if (err) return h('pre', null, err);
  if (!ref.current) return null;
  const { root, inst, w, hgt } = ref.current;
  const vals = inst.renderVals();
  return h('div', { id: 'design-root', style: { width: w, minHeight: hgt, position: 'relative', overflow: w < 600 ? 'hidden' : 'visible', height: w < 600 ? hgt : undefined } }, ...kids(root, vals, 'r'));
}

function Index() {
  const [files, setFiles] = React.useState<{ file: string; screens: string[] }[]>([]);
  React.useEffect(() => {
    const names = ['LunaHotel', 'LHOnboard', 'LHCampaign', 'LunaCreator', 'LCOnboard', 'LCCreate', 'LunaTraveler', 'LTAuth', 'LTDiscover', 'LTTrips', 'LTSocial'];
    Promise.all(names.map(async (file) => {
      const src = await (await fetch(`/design-src/${file}.dc.html`)).text();
      const m = src.match(/data-props='([^']+)'/); const meta = m ? JSON.parse(m[1]!) : {};
      return { file, screens: meta.screen?.options ?? [] };
    })).then(setFiles);
  }, []);
  return h('div', { style: { padding: 24, fontFamily: 'var(--font-sans)' } }, files.map((f) => h('div', { key: f.file }, h('b', null, f.file), ' ', f.screens.map((s: string) => h('a', { key: s, href: `?file=${f.file}&screen=${s}`, style: { marginRight: 8 } }, s)))));
}

const q = Object.fromEntries(new URLSearchParams(location.search));
const { file, ...params } = q;
createRoot(document.getElementById('root')!).render(file ? h(Viewer, { file, params }) : h(Index));
