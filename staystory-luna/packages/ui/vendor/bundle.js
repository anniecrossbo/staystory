/* @ds-bundle: {"format":4,"namespace":"Luna","components":[{"name":"Button"},{"name":"IconButton"},{"name":"TextField"},{"name":"SearchField"},{"name":"Select"},{"name":"Menu"},{"name":"Toggle"},{"name":"Checkbox"},{"name":"Radio"},{"name":"SegmentedControl"},{"name":"Tabs"},{"name":"Chip"},{"name":"Stepper"},{"name":"ProgressBar"},{"name":"Calendar"},{"name":"TimeWheel"},{"name":"Badge"},{"name":"CountBadge"},{"name":"Tag"},{"name":"Avatar"},{"name":"AvatarRing"},{"name":"StatTile"},{"name":"Widget"},{"name":"Panel"},{"name":"ListRow"},{"name":"DataTable"},{"name":"AlertCard"},{"name":"Banner"},{"name":"EmptyState"},{"name":"ErrorState"},{"name":"Skeleton"},{"name":"Toast"},{"name":"Tooltip"},{"name":"RoomChip"},{"name":"TaskPill"},{"name":"KpiChip"},{"name":"KanbanCard"},{"name":"ShiftCell"},{"name":"BarChart"},{"name":"LineChart"},{"name":"DonutChart"},{"name":"Dock"},{"name":"TopBar"},{"name":"Modal"},{"name":"SideSheet"},{"name":"BottomSheet"},{"name":"Orb"},{"name":"VoiceCard"},{"name":"SpeechPill"},{"name":"CommandMenu"},{"name":"ChatBubble"},{"name":"Composer"},{"name":"AISummary"},{"name":"AIAction"},{"name":"ProvenanceTag"},{"name":"Logo"},{"name":"Icon"},{"name":"FilterPill"},{"name":"TagDisc"},{"name":"TagCluster"}]} */
(function(){
/* ---------- core helpers ---------- */
var React = window.React, h = React.createElement, useState = React.useState;
var C = {};
function cx() { var o = []; for (var i = 0; i < arguments.length; i++) { if (arguments[i]) o.push(arguments[i]); } return o.join(' '); }
function pick(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }
var uid = 0;
function useControlled(value, def, onChange) {
  var s = useState(def), v = value !== undefined ? value : s[0];
  return [v, function (nv) { if (value === undefined) s[1](nv); if (onChange) onChange(nv); }];
}

/* ---------- Icon ---------- */
C.Icon = function Icon(p) {
  var st = Object.assign({}, p.style); if (p.size) st.fontSize = p.size;
  return h('span', { className: cx('lu-icon', p.fill && 'is-fill', p.className), style: st, 'aria-hidden': p.label ? undefined : 'true', role: p.label ? 'img' : undefined, 'aria-label': p.label }, p.name);
};
var I = function (name, cls) { return h(C.Icon, { name: name, className: cls }); };

/* ---------- Button / IconButton ---------- */
C.Button = function Button(p) {
  var v = p.variant || 'secondary', s = p.size || 'md';
  var rest = pick(p, ['variant', 'size', 'icon', 'iconRight', 'loading', 'block', 'children', 'className']);
  return h('button', Object.assign({ type: 'button' }, rest, { className: cx('lu-btn', 'lu-btn-' + v, 'lu-btn-' + s, p.block && 'lu-btn-block', p.loading && 'is-loading', p.className), 'aria-busy': p.loading || undefined }),
    p.loading ? h('span', { className: 'lu-spin', 'aria-hidden': 'true' }) : (p.icon ? I(p.icon) : null), p.children, p.iconRight ? I(p.iconRight) : null);
};
C.IconButton = function IconButton(p) {
  var rest = pick(p, ['variant', 'size', 'icon', 'label', 'className']);
  return h('button', Object.assign({ type: 'button' }, rest, { 'aria-label': p.label, className: cx('lu-iconbtn', 'lu-iconbtn-' + (p.size || 'md'), p.variant && 'lu-iconbtn-' + p.variant, p.className) }), I(p.icon));
};

/* ---------- TextField / SearchField ---------- */
C.TextField = function TextField(p) {
  var auto = useState(function () { return 'lu-f' + (++uid); })[0], id = p.id || auto;
  var rest = pick(p, ['label', 'hint', 'error', 'icon', 'multiline', 'className', 'caps', 'disabled']);
  var hid = id + '-h';
  var input = h(p.multiline ? 'textarea' : 'input', Object.assign({ id: id, className: 'lu-input', disabled: p.disabled, 'aria-invalid': p.error ? 'true' : undefined, 'aria-describedby': (p.hint || p.error) ? hid : undefined }, rest));
  return h('div', { className: cx('lu-field', p.error && 'has-error', p.disabled && 'is-disabled', p.className) },
    p.label ? h('label', { className: cx('lu-label', p.caps && 'lu-label-caps'), htmlFor: id }, p.label) : null,
    h('div', { className: cx('lu-input-wrap', p.multiline && 'lu-textarea') }, p.icon ? I(p.icon) : null, input),
    (p.error || p.hint) ? h('div', { id: hid, className: 'lu-hint' }, p.error ? I('error') : null, p.error || p.hint) : null);
};
C.SearchField = function SearchField(p) {
  var rest = pick(p, ['className']);
  return h('div', { className: cx('lu-input-wrap lu-search', p.className) }, I('search'), h('input', Object.assign({ className: 'lu-input', type: 'search', placeholder: 'Search room, guest or task', 'aria-label': p['aria-label'] || 'Search' }, rest)));
};

/* ---------- Select / Menu ---------- */
C.Menu = function Menu(p) {
  return h('div', { className: cx('lu-menu', p.className), role: 'menu' }, (p.items || []).map(function (it, i) {
    if (it.sep) return h('div', { key: i, className: 'lu-menu-sep', role: 'separator' });
    if (it.section) return h('div', { key: i, className: 'lu-menu-label' }, it.section);
    return h('button', { key: i, type: 'button', role: 'menuitem', className: cx('lu-menu-item', it.selected && 'is-selected', it.danger && 'is-danger'), onClick: it.onClick },
      it.icon ? I(it.icon) : null, h('span', { className: 'lu-grow' }, it.label), it.selected ? I('check') : null);
  }));
};
C.Select = function Select(p) {
  var o = useState(!!p.open), open = o[0], setOpen = o[1];
  var cv = useControlled(p.value, p.defaultValue, p.onChange), val = cv[0], set = cv[1];
  var cur = (p.options || []).filter(function (x) { return x.value === val; })[0];
  return h('div', { className: cx('lu-field lu-select', p.className) },
    p.label ? h('span', { className: 'lu-label' }, p.label) : null,
    h('button', { type: 'button', className: 'lu-select-trigger', 'aria-haspopup': 'listbox', 'aria-expanded': open, onClick: function () { setOpen(!open); } },
      h('span', { className: cur ? '' : 'is-placeholder' }, cur ? cur.label : (p.placeholder || 'Select')), I(open ? 'expand_less' : 'expand_more')),
    open ? h(C.Menu, { items: (p.options || []).map(function (x) { return { label: x.label, selected: x.value === val, onClick: function () { set(x.value); setOpen(false); } }; }) }) : null);
};

/* ---------- Toggle / Checkbox / Radio ---------- */
C.Toggle = function Toggle(p) {
  var cv = useControlled(p.checked, !!p.defaultChecked, p.onChange), on = cv[0];
  var b = h('button', { type: 'button', role: 'switch', 'aria-checked': on, 'aria-label': p.label ? undefined : p['aria-label'], disabled: p.disabled, className: cx('lu-toggle', 'lu-toggle-' + (p.size || 'md')), onClick: function () { cv[1](!on); } });
  return p.label ? h('label', { className: 'lu-opt' }, b, p.label) : b;
};
C.Checkbox = function Checkbox(p) {
  var cv = useControlled(p.checked, !!p.defaultChecked, p.onChange), on = cv[0];
  var st = p.indeterminate ? 'mixed' : on;
  var b = h('button', { type: 'button', role: 'checkbox', 'aria-checked': st, disabled: p.disabled, className: 'lu-check', onClick: function () { cv[1](!on); } }, st ? I(p.indeterminate ? 'remove' : 'check') : null);
  return p.label ? h('label', { className: 'lu-opt' }, b, p.label) : b;
};
C.Radio = function Radio(p) {
  var cv = useControlled(p.checked, !!p.defaultChecked, p.onChange), on = cv[0];
  var b = h('button', { type: 'button', role: 'radio', 'aria-checked': on, disabled: p.disabled, className: 'lu-radio', onClick: function () { cv[1](true); } });
  return p.label ? h('label', { className: 'lu-opt' }, b, p.label) : b;
};

/* ---------- SegmentedControl / Tabs / Chip ---------- */
C.SegmentedControl = function SegmentedControl(p) {
  var opts = p.options || [], cv = useControlled(p.value, p.defaultValue !== undefined ? p.defaultValue : (opts[0] && opts[0].value), p.onChange), val = cv[0];
  return h('div', { className: cx('lu-seg', 'lu-seg-' + (p.size || 'lg'), p.glass && 'lu-seg-glass', p.className), role: 'group', 'aria-label': p['aria-label'] },
    opts.map(function (o) {
      return h('button', { key: o.value, type: 'button', 'aria-pressed': val === o.value, onClick: function () { cv[1](o.value); } }, o.icon ? I(o.icon) : null, o.label, o.count != null ? h('span', { className: 'lu-count lu-count-warning' }, o.count) : null);
    }));
};
C.Tabs = function Tabs(p) {
  var tabs = p.tabs || [], cv = useControlled(p.value, p.defaultValue !== undefined ? p.defaultValue : (tabs[0] && tabs[0].value), p.onChange), val = cv[0];
  return h('div', { className: cx('lu-tabs', p.className), role: 'tablist' }, tabs.map(function (t) {
    return h('button', { key: t.value, type: 'button', role: 'tab', 'aria-selected': val === t.value, className: 'lu-tab', onClick: function () { cv[1](t.value); } }, t.label);
  }));
};
C.Chip = function Chip(p) {
  var cv = useControlled(p.selected, !!p.defaultSelected, p.onChange), on = cv[0];
  var rest = pick(p, ['selected', 'defaultSelected', 'onChange', 'icon', 'count', 'children', 'className']);
  return h('button', Object.assign({ type: 'button' }, rest, { className: cx('lu-chip', p.className), 'aria-pressed': on, onClick: function (e) { cv[1](!on); if (p.onClick) p.onClick(e); } }),
    p.icon ? I(p.icon) : null, p.children, p.count != null ? h('span', { className: 'lu-chip-count' }, p.count) : null);
};

/* ---------- FilterPill (from Legacy: status filter tabs with a count disc) ---------- */
C.FilterPill = function FilterPill(p) {
  var cv = useControlled(p.selected, !!p.defaultSelected, p.onChange), on = cv[0];
  var rest = pick(p, ['selected', 'defaultSelected', 'onChange', 'count', 'tone', 'size', 'children', 'className']);
  return h('button', Object.assign({ type: 'button' }, rest, { className: cx('lu-fpill', p.size === 'sm' && 'is-sm', p.tone === 'danger' && 'tone-danger', p.className), 'aria-pressed': on, onClick: function (e) { cv[1](!on); if (p.onClick) p.onClick(e); } }),
    p.count != null ? h('span', { className: 'lu-fpill-count' }, p.count) : null, h('span', null, p.children));
};

/* ---------- Stepper / Progress ---------- */
C.Stepper = function Stepper(p) {
  var min = p.min != null ? p.min : 0, max = p.max != null ? p.max : 99;
  var cv = useControlled(p.value, p.defaultValue != null ? p.defaultValue : 1, p.onChange), v = cv[0];
  return h('div', { className: 'lu-stepper', role: 'group', 'aria-label': p['aria-label'] || 'Quantity' },
    h('button', { type: 'button', 'aria-label': 'Decrease', disabled: v <= min, onClick: function () { cv[1](v - 1); } }, I('remove')),
    h('output', null, v),
    h('button', { type: 'button', 'aria-label': 'Increase', disabled: v >= max, onClick: function () { cv[1](v + 1); } }, I('add')));
};
C.ProgressBar = function ProgressBar(p) {
  return h('div', { className: cx('lu-progress', p.tone && 'tone-' + p.tone), role: 'progressbar', 'aria-valuenow': p.value, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': p['aria-label'] }, h('i', { style: { width: Math.max(0, Math.min(100, p.value)) + '%' } }));
};

/* ---------- Calendar / TimeWheel ---------- */
C.Calendar = function Calendar(p) {
  var year = p.year || 2026, month = p.month != null ? p.month : 9;
  var cv = useControlled(p.selected, p.defaultSelected, p.onSelect), sel = cv[0];
  var first = new Date(year, month, 1), lead = (first.getDay() + 6) % 7, dim = new Date(year, month + 1, 0).getDate(), prev = new Date(year, month, 0).getDate();
  var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var cells = [];
  for (var i = 0; i < lead; i++) cells.push({ d: prev - lead + 1 + i, out: true });
  for (var d = 1; d <= dim; d++) cells.push({ d: d });
  while (cells.length % 7) cells.push({ d: cells.length - lead - dim + 1, out: true });
  var rg = p.range;
  return h('div', { className: cx('lu-cal', p.className) },
    h('div', { className: 'lu-cal-head' }, h(C.IconButton, { icon: 'chevron_left', label: 'Previous month', size: 'sm', variant: 'ghost' }), names[month] + ' ' + year, h(C.IconButton, { icon: 'chevron_right', label: 'Next month', size: 'sm', variant: 'ghost' })),
    h('div', { className: 'lu-cal-grid' },
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x, i) { return h('div', { key: 'w' + i, className: 'lu-cal-dow' }, x); }),
      cells.map(function (c, i) {
        var cl = cx('lu-cal-day', c.out && 'is-out', !c.out && p.today === c.d && 'is-today', !c.out && sel === c.d && 'is-selected',
          !c.out && rg && c.d > rg[0] && c.d < rg[1] && 'is-in-range', !c.out && rg && c.d === rg[0] && 'is-start', !c.out && rg && c.d === rg[1] && 'is-end');
        return h('button', { key: i, type: 'button', className: cl, disabled: c.out, onClick: function () { cv[1](c.d); } }, c.d);
      })));
};
C.TimeWheel = function TimeWheel(p) {
  function col(vals, cur) {
    var idx = vals.indexOf(cur); if (idx < 0) idx = 0;
    return h('div', { className: 'lu-wheel-col' }, h('div', { className: 'lu-wheel-list', style: { transform: 'translateY(' + (-(idx * 36 + 18)) + 'px)' } }, vals.map(function (v) { return h('div', { key: v, className: v === cur ? 'is-on' : '' }, v); })));
  }
  var hrs = [], mins = []; for (var i = 0; i < 24; i++) hrs.push(('0' + i).slice(-2)); for (var j = 0; j < 60; j += 5) mins.push(('0' + j).slice(-2));
  return h('div', { className: cx('lu-wheel', p.className), role: 'group', 'aria-label': 'Time' }, col(hrs, p.hour || '14'), h('span', { className: 'lu-wheel-colon' }, ':'), col(mins, p.minute || '40'));
};

/* ---------- Badge / CountBadge / Tag ---------- */
C.Badge = function Badge(p) {
  return h('span', { className: cx('lu-badge', 'lu-badge-' + (p.tone || 'neutral'), p.className) }, p.dot ? h('span', { className: 'lu-dot' }) : null, p.icon ? I(p.icon) : null, p.children);
};
C.CountBadge = function CountBadge(p) { return h('span', { className: cx('lu-count', p.tone && 'lu-count-' + p.tone) }, p.children); };
C.Tag = function Tag(p) { return h('span', { className: cx('lu-tag', 'lu-cat-' + (p.hue || 'sky')) }, p.children); };
/* TagDisc / TagCluster (from Legacy: status-tag icon discs and the tag cluster pill) */
var TAGDISC = { escalated: ['priority_high', 'Escalated'], priority: ['flag', 'High priority'], hold: ['pause', 'On hold'], conflicted: ['sync_problem', 'Conflicted'], delayed: ['schedule', 'Delayed'], reopened: ['replay', 'Reopened'], attention: ['notification_important', 'Need attention'] };
C.TagDisc = function TagDisc(p) {
  var t = TAGDISC[p.tag] || TAGDISC.escalated;
  return h('span', { className: cx('lu-tagdisc', 'tag-' + (p.tag || 'escalated'), p.size === 32 && 'is-lg', p.size === 24 && 'is-sm', p.className), role: 'img', 'aria-label': p.label || t[1] }, I(t[0]));
};
C.TagCluster = function TagCluster(p) {
  var tags = (p.tags || []).slice(0, 3);
  return h('span', { className: cx('lu-tagcluster', p.children && 'has-label', p.className) }, tags.map(function (t, i) { return h(C.TagDisc, { key: i, tag: t, size: 24 }); }), p.children ? h('span', { className: 'lu-tagcluster-label' }, p.children) : null);
};

/* ---------- Avatar / AvatarRing ---------- */
C.Avatar = function Avatar(p) {
  var s = p.size || 34;
  return h('span', { className: cx('lu-avatar', 'lu-avatar-' + s, p.tone && 'tone-' + p.tone), 'aria-label': p.name, role: p.name ? 'img' : undefined }, p.initials);
};
C.AvatarRing = function AvatarRing(p) {
  var s = p.size || 40, r = s / 2 - 2, circ = 2 * Math.PI * r, pr = Math.max(0, Math.min(100, p.progress || 0));
  var col = { success: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' }[p.tone || 'success'];
  return h('span', { className: 'lu-avatar-ring', style: { width: s, height: s }, role: 'img', 'aria-label': (p.name || '') + ' ' + pr + '%' },
    h('svg', { width: s, height: s, viewBox: '0 0 ' + s + ' ' + s, 'aria-hidden': 'true' },
      h('circle', { cx: s / 2, cy: s / 2, r: r, fill: 'none', stroke: 'var(--divider)', strokeWidth: 3 }),
      h('circle', { cx: s / 2, cy: s / 2, r: r, fill: 'none', stroke: col, strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: circ, strokeDashoffset: circ * (1 - pr / 100), transform: 'rotate(-90 ' + s / 2 + ' ' + s / 2 + ')' })),
    h('span', { className: 'lu-avatar', style: { width: s - 12, height: s - 12, fontSize: 10 } }, p.initials));
};

/* ---------- StatTile / Widget / Panel / ListRow ---------- */
C.StatTile = function StatTile(p) {
  return h('div', { className: cx('lu-tile', p.tone && 'tone-' + p.tone) }, h('span', { className: 'lu-tile-value' }, p.value), h('span', { className: 'lu-tile-label' }, p.label));
};
C.Widget = function Widget(p) {
  return h('section', { className: cx('lu-widget', p.className), style: p.style },
    p.title ? h('header', { className: 'lu-widget-head' }, h('div', null, h('h3', { className: 'lu-widget-title' }, p.title), p.subtitle ? h('p', { className: 'lu-widget-sub' }, p.subtitle) : null),
      p.count != null ? h(C.CountBadge, null, p.count) : null, p.action || null) : null,
    h('div', { className: 'lu-widget-body' }, p.children));
};
C.Panel = function Panel(p) { return h('section', { className: cx('lu-panel', p.className), style: p.style }, p.children); };
C.ListRow = function ListRow(p) {
  var rest = pick(p, ['leading', 'title', 'meta', 'trailing', 'selected', 'chevron', 'className']);
  return h('button', Object.assign({ type: 'button' }, rest, { className: cx('lu-row-item', p.selected && 'is-selected', p.className), 'aria-current': p.selected ? 'true' : undefined }),
    p.leading || null, h('span', { className: 'lu-row-main' }, h('span', { className: 'lu-row-title' }, p.title), p.meta ? h('span', { className: 'lu-row-meta' }, p.meta) : null), p.trailing || null, p.chevron ? I('chevron_right') : null);
};

/* ---------- DataTable ---------- */
C.DataTable = function DataTable(p) {
  var cols = p.columns || [];
  return h('div', { className: 'lu-table-wrap' }, h('table', { className: cx('lu-table', p.zebra && 'is-zebra', p.compact && 'is-compact') },
    h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { key: c.key, scope: 'col', className: c.align === 'right' ? 'is-num' : undefined }, c.label); }))),
    h('tbody', null, (p.rows || []).map(function (r, i) {
      return h('tr', { key: i, className: p.selectedIndex === i ? 'is-selected' : undefined }, cols.map(function (c) { return h('td', { key: c.key, className: c.align === 'right' ? 'is-num' : undefined }, c.render ? c.render(r) : r[c.key]); }));
    }))));
};

/* ---------- AlertCard / Banner / EmptyState / ErrorState / Skeleton ---------- */
C.AlertCard = function AlertCard(p) {
  return h('div', { className: cx('lu-alert', p.tone && 'tone-' + p.tone, p.className) }, h('div', null, h('div', { className: 'lu-alert-title' }, p.title), p.meta ? h('div', { className: 'lu-alert-meta' }, p.meta) : null), p.actions ? h('div', { className: 'lu-alert-actions' }, p.actions) : null);
};
C.Banner = function Banner(p) {
  var ic = p.icon || { warning: 'warning', danger: 'error', success: 'check_circle' }[p.tone] || 'info';
  return h('div', { className: cx('lu-banner', p.tone && 'tone-' + p.tone), role: p.tone === 'danger' ? 'alert' : 'status' }, I(ic), h('div', { className: 'lu-banner-main' }, p.title ? h('div', { className: 'lu-banner-title' }, p.title) : null, h('div', { className: 'lu-banner-text' }, p.children)), p.action || null);
};
C.EmptyState = function EmptyState(p) {
  return h('div', { className: 'lu-empty' }, I(p.icon || 'inbox'), h('div', { className: 'lu-empty-title' }, p.title), p.children ? h('div', { className: 'lu-empty-text' }, p.children) : null, p.action || null);
};
C.ErrorState = function ErrorState(p) {
  return h('div', { className: 'lu-empty', role: 'alert' }, h(C.Icon, { name: 'error', style: { color: 'var(--danger-strong)' } }), h('div', { className: 'lu-empty-title' }, p.title || 'Something went wrong'), p.detail ? h('div', { className: 'lu-empty-text' }, p.detail) : null,
    p.onRetry ? h(C.Button, { variant: 'secondary', icon: 'refresh', loading: p.retrying, onClick: p.onRetry }, 'Try again') : null);
};
C.Skeleton = function Skeleton(p) {
  var v = p.variant || 'text', st = Object.assign({ width: p.width, height: p.height }, p.style);
  return h('span', { className: cx('lu-skel', 'lu-skel-' + v, p.className), style: st, 'aria-hidden': 'true' });
};

/* ---------- Operations: RoomChip, TaskPill, KpiChip, KanbanCard, ShiftCell ---------- */
var STAY = { occupied: 'fiber_manual_record', vacant: 'radio_button_unchecked', oos: 'block', checkin: 'south_west', checkout: 'north_east' };
C.RoomChip = function RoomChip(p) {
  return h('span', { className: cx('lu-room', 'lu-room-' + (p.status || 'ready')) }, p.number, p.stay ? h(C.Icon, { name: STAY[p.stay], className: 'lu-stay', fill: p.stay === 'occupied', label: p.stay }) : null);
};
var PILL_ICON = { done: 'check', pinned: 'push_pin', deferred: 'schedule', risk: 'warning' };
C.TaskPill = function TaskPill(p) {
  var s = p.state || 'scheduled';
  return h('span', { className: cx('lu-pill', 'lu-pill-' + s, p.lifted && 'is-lifted') }, p.lifted ? I('drag_indicator') : (PILL_ICON[s] ? I(PILL_ICON[s]) : null), p.children);
};
C.KpiChip = function KpiChip(p) {
  return h('span', { className: cx('lu-kpi', p.tone && 'tone-' + p.tone) }, h('span', { className: 'lu-kpi-value' }, p.value, p.total != null ? h('small', null, '/' + p.total) : null), p.label);
};
C.KanbanCard = function KanbanCard(p) {
  return h('div', { className: 'lu-kanban' }, h('div', { className: 'lu-kanban-top' }, h(C.Avatar, { initials: p.initials, size: 24 }), p.name), h('div', { className: 'lu-kanban-meta' }, p.dates, p.place ? ' · ' + p.place : ''), p.amount ? h('div', { className: 'lu-kanban-amount' }, p.amount) : null);
};
C.ShiftCell = function ShiftCell(p) {
  var hue = { morning: 'sky', evening: 'violet', night: 'charcoal' }[p.shift];
  return h('div', { className: cx('lu-shift', hue ? 'lu-cat-' + hue : 'is-rest') }, h('b', null, p.label), p.time ? h('span', null, p.time) : null);
};

/* ---------- Charts (SVG, token colours) ---------- */
C.BarChart = function BarChart(p) {
  var d = p.data || [], W = 320, H = p.height || 160, pad = 24, bw = Math.min(34, (W - 20) / d.length - 12), max = Math.max.apply(null, d.map(function (x) { return x.value; })) * 1.15 || 1;
  var step = (W - 20) / d.length;
  return h('svg', { className: 'lu-chart', viewBox: '0 0 ' + W + ' ' + (H + pad), role: 'img', 'aria-label': p['aria-label'] || 'Bar chart' },
    [0, .5, 1].map(function (g) { return h('line', { key: g, className: 'lu-grid', x1: 0, x2: W, y1: H * g, y2: H * g }); }),
    d.map(function (x, i) {
      var bh = x.value / max * H, cxp = 10 + step * i + step / 2, col = x.tone === 'danger' ? 'var(--chart-4)' : 'var(--chart-1)';
      return h('g', { key: i }, h('path', { d: 'M' + (cxp - bw / 2) + ' ' + H + 'v' + (-bh + 6) + 'q0 -6 6 -6h' + (bw - 12) + 'q6 0 6 6v' + (bh - 6) + 'z', fill: col, opacity: .85 }),
        h('text', { className: 'lu-val', x: cxp, y: H - bh - 6, textAnchor: 'middle' }, x.value), h('text', { x: cxp, y: H + 16, textAnchor: 'middle' }, x.label));
    }));
};
C.LineChart = function LineChart(p) {
  var W = 320, H = p.height || 150, ser = p.series || [], n = (ser[0] && ser[0].values.length) || 0;
  var max = Math.max.apply(null, ser.map(function (s) { return Math.max.apply(null, s.values); })) * 1.1 || 1;
  function pt(s, i) { return (10 + (W - 20) * i / (n - 1)) + ',' + (H - s.values[i] / max * H); }
  return h('div', null, h('svg', { className: 'lu-chart', viewBox: '0 0 ' + W + ' ' + (H + 24), role: 'img', 'aria-label': p['aria-label'] || 'Line chart' },
    [0, .5, 1].map(function (g) { return h('line', { key: g, className: 'lu-grid', x1: 0, x2: W, y1: H * g, y2: H * g }); }),
    ser.map(function (s, k) { var pts = []; for (var i = 0; i < n; i++) pts.push(pt(s, i)); return h('polyline', { key: k, points: pts.join(' '), fill: 'none', stroke: s.color || 'var(--chart-' + (k + 1) + ')', strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round', opacity: .9 }); }),
    (p.labels || []).map(function (l, i) { return h('text', { key: i, x: 10 + (W - 20) * i / (n - 1), y: H + 18, textAnchor: 'middle' }, l); })),
    h('div', { className: 'lu-legend' }, ser.map(function (s, k) { return h('span', { key: k }, h('i', { style: { background: s.color || 'var(--chart-' + (k + 1) + ')' } }), s.name); })));
};
C.DonutChart = function DonutChart(p) {
  var segs = p.segments || [], tot = segs.reduce(function (a, s) { return a + s.value; }, 0) || 1, s = p.size || 120, r = s / 2 - 10, circ = 2 * Math.PI * r, off = 0;
  return h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 16 } }, h('svg', { className: 'lu-chart', style: { width: s, height: s }, viewBox: '0 0 ' + s + ' ' + s, role: 'img', 'aria-label': p['aria-label'] || 'Donut chart' },
    h('circle', { cx: s / 2, cy: s / 2, r: r, fill: 'none', stroke: 'var(--surface-sunken)', strokeWidth: 14 }),
    segs.map(function (g, i) { var len = g.value / tot * circ, el = h('circle', { key: i, cx: s / 2, cy: s / 2, r: r, fill: 'none', stroke: g.color || 'var(--chart-' + (i + 1) + ')', strokeWidth: 14, strokeDasharray: len + ' ' + (circ - len), strokeDashoffset: -off, transform: 'rotate(-90 ' + s / 2 + ' ' + s / 2 + ')' }); off += len; return el; }),
    h('text', { x: s / 2, y: s / 2 + 2, textAnchor: 'middle', style: { fontSize: 22, fontWeight: 700, fill: 'var(--ink)' } }, p.center), p.sub ? h('text', { x: s / 2, y: s / 2 + 18, textAnchor: 'middle' }, p.sub) : null),
    h('div', { className: 'lu-legend', style: { flexDirection: 'column', gap: 6 } }, segs.map(function (g, i) { return h('span', { key: i }, h('i', { style: { background: g.color || 'var(--chart-' + (i + 1) + ')' } }), g.label); })));
};

/* ---------- Orb / ListeningIndicator ---------- */
C.Orb = function Orb(p) {
  var s = p.size || 60, st = p.state || 'idle';
  return h(p.onClick ? 'button' : 'span', { type: p.onClick ? 'button' : undefined, onClick: p.onClick, 'aria-label': p.onClick ? (p.label || 'Ask Luna') : undefined, className: cx('lu-orb', st === 'muted' && 'is-muted', st === 'listening' && 'is-listening', p.className), style: { width: s, height: s } }, p.mic === false ? null : h(C.Icon, { name: 'mic', size: Math.round(s * .38) }));
};
C.ListeningIndicator = function ListeningIndicator() { return h('span', { className: 'lu-listening', role: 'img', 'aria-label': 'Listening' }, h('i'), h('i'), h('i'), h('i')); };

/* ---------- Dock / TopBar ---------- */
C.Dock = function Dock(p) {
  var cv = useControlled(p.active, p.defaultActive, p.onSelect), act = cv[0];
  return h('nav', { className: cx('lu-dock', p.className), 'aria-label': p['aria-label'] || 'Main' },
    h('div', { className: 'lu-dock-track' }, (p.items || []).map(function (it) {
      var on = act === it.id;
      return h('button', { key: it.id, type: 'button', className: 'lu-dock-item', 'aria-current': on ? 'page' : undefined, 'aria-label': on ? undefined : it.label, onClick: function () { cv[1](it.id); } }, I(it.icon), on ? it.label : null);
    })), p.orb === false ? null : h(C.Orb, { size: 60, onClick: p.onOrb }));
};
C.TopBar = function TopBar(p) {
  var stale = p.fresh === 'stale', kpis = p.kpis || [], hasSlot = !!p.slot || kpis.length > 0;
  return h('header', { className: cx('lu-topbar', p.className) },
    p.refreshed ? h('span', { className: cx('lu-topbar-pill', stale ? 'is-stale' : 'is-fresh') }, I(stale ? 'sync_problem' : 'sync'), p.refreshed) : null,
    p.time ? h('span', { className: 'lu-topbar-pill' }, p.time) : null,
    p.user ? h('span', { className: 'lu-topbar-pill has-avatar' }, p.user, h(C.Avatar, { initials: p.initials || 'HA', size: 24 })) : null,
    hasSlot ? h('span', { className: 'lu-topbar-sep', 'aria-hidden': 'true' }) : null,
    p.slot ? h('span', { className: 'lu-topbar-slot' }, p.slot) : null,
    kpis.map(function (k, i) { return h('span', { key: i, className: 'lu-topbar-pill has-disc' }, h('span', { className: cx('lu-topbar-disc', 'tone-' + (k.tone || 'success')) }, I(k.icon)), k.value); }));
};

/* ---------- Overlays ---------- */
C.Scrim = function Scrim() { return h('div', { className: 'lu-scrim', 'aria-hidden': 'true' }); };
C.Modal = function Modal(p) {
  var sheet = p.layout === 'sheet', tid = 'lu-m' + (++uid);
  return h('div', { className: cx('lu-modal', sheet && 'lu-modal-sheet', p.className), style: p.style, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': tid },
    h('div', { className: 'lu-modal-head' }, h('div', null, h('h2', { id: tid, className: 'lu-modal-title' }, p.title), p.subtitle ? h('p', { className: 'lu-modal-sub' }, p.subtitle) : null), p.onClose !== null ? h(C.IconButton, { icon: 'close', label: 'Close', size: 'md', onClick: p.onClose }) : null),
    sheet ? h('div', { className: 'lu-modal-body' }, p.children) : p.children,
    p.footer ? h('div', { className: 'lu-modal-foot' }, p.footer) : null);
};
C.SideSheet = function SideSheet(p) {
  return h('aside', { className: cx('lu-sheet', p.className), role: 'dialog', 'aria-label': p.title },
    h('div', { className: 'lu-sheet-head' }, h('div', null, h('h2', { className: 'lu-sheet-title' }, p.title), p.subtitle ? h('p', { className: 'lu-widget-sub' }, p.subtitle) : null), h(C.IconButton, { icon: 'close', label: 'Close', size: 'sm', onClick: p.onClose })),
    h('div', { className: 'lu-sheet-body' }, p.children), p.footer ? h('div', { className: 'lu-sheet-foot' }, p.footer) : null);
};
C.BottomSheet = function BottomSheet(p) {
  return h('div', { className: cx('lu-bsheet', p.className), role: 'dialog', 'aria-label': p.title }, h('div', { className: 'lu-bsheet-grab' }), h('div', { className: 'lu-widget-title' }, p.title), p.children);
};
C.Toast = function Toast(p) {
  var t = p.tone || 'success', ic = { success: 'check', info: 'info', warning: 'priority_high', danger: 'priority_high' }[t];
  return h('div', { className: cx('lu-toast', 'tone-' + t, p.className), role: t === 'danger' ? 'alert' : 'status' }, h('span', { className: 'lu-toast-icon' }, I(ic)), h('span', null, p.children), p.action ? h('button', { type: 'button', className: 'lu-toast-action', onClick: p.onAction }, p.action) : null);
};
C.Tooltip = function Tooltip(p) { return h('span', { className: 'lu-tip', role: 'tooltip' }, p.children); };

/* ---------- Luna: voice card, speech pill, command menu ---------- */
C.VoiceCard = function VoiceCard(p) {
  var st = p.state || 'listening';
  return h('div', { className: cx('lu-luna lu-voice', p.className) },
    h('div', { className: 'lu-voice-top' }, st === 'reply' || st === 'greeting' ? h(C.Orb, { size: 20, mic: false }) : null, h('div', { className: 'lu-voice-text' }, p.children), h('button', { type: 'button', className: 'lu-glassbtn', 'aria-label': 'Close', onClick: p.onClose }, I('close'))),
    h('div', { className: 'lu-voice-foot' }, st === 'typing' ? h('input', { className: 'lu-voice-input', placeholder: 'What do you need?', 'aria-label': 'Ask Luna' }) : h(C.IconButton, { icon: 'keyboard', label: 'Type instead', size: 'sm', variant: 'white' }),
      st === 'typing' ? h(C.Orb, { size: 34, onClick: p.onSend, label: 'Send' }) : h(C.ListeningIndicator)));
};
C.SpeechPill = function SpeechPill(p) { return h('div', { className: cx('lu-luna lu-speech', p.className), style: { borderRadius: 'var(--radius-md)' } }, p.children); };
C.CommandMenu = function CommandMenu(p) {
  return h('div', { className: cx('lu-luna lu-cmd', p.className), role: 'dialog', 'aria-label': 'Luna command menu' },
    h('button', { type: 'button', className: 'lu-cmd-collapse', 'aria-label': 'Collapse', onClick: p.onCollapse }, I('close_fullscreen')),
    (p.sections || []).map(function (s, i) {
      return h('div', { key: i, className: 'lu-cmd-block' }, h('div', { className: 'lu-cmd-section' }, h('div', { className: 'lu-cmd-label' }, s.label), h('div', { className: 'lu-cmd-chips' }, s.items.map(function (it, j) { return h('button', { key: j, type: 'button', className: 'lu-cmd-chip' }, h('span', { className: 'lu-cmd-disc' }, I(it.icon)), it.label); }))), h('div', { className: 'lu-cmd-rule' }));
    }),
    h('div', { className: 'lu-cmd-ask' }, h('div', { className: 'lu-cmd-field' }, h('input', { className: 'lu-input', placeholder: p.placeholder || 'What do you need?', 'aria-label': 'Ask Luna' }), I('arrow_outward')), h(C.Orb, { size: 42, label: 'Send' })));
};

/* ---------- Chat ---------- */
C.ChatBubble = function ChatBubble(p) {
  var k = p.kind || 'guest';
  if (k === 'luna') return h('div', { className: 'lu-bubble lu-bubble-luna' }, h(C.Orb, { size: 20, mic: false }), h('span', null, p.children));
  return h('div', { className: cx('lu-bubble', 'lu-bubble-' + k, p.frosted && 'is-frosted') }, h('span', null, p.children), p.meta ? h('span', { className: 'lu-bubble-meta' }, p.meta) : null);
};
C.DayLabel = function DayLabel(p) { return h('div', { className: 'lu-day' }, p.children); };
C.Composer = function Composer(p) {
  return h('div', { className: cx('lu-composer', p.className) }, h('input', { className: 'lu-input', placeholder: p.placeholder || 'Write a message', 'aria-label': p.placeholder || 'Write a message' }), h(C.IconButton, { icon: 'mic', label: 'Dictate', size: 'sm', variant: 'ghost' }), h(C.IconButton, { icon: 'arrow_upward', label: 'Send', size: 'md', variant: 'primary' }));
};

/* ---------- Luna intelligence patterns ---------- */
C.AISummary = function AISummary(p) {
  return h('div', { className: 'lu-ai' }, h('div', { className: 'lu-ai-label' }, I('auto_awesome'), p.label || 'AI summary'), p.title ? h('div', { className: 'lu-ai-title' }, p.title) : null,
    p.bullets ? h('ul', null, p.bullets.map(function (b, i) { return h('li', { key: i }, b); })) : null, p.next ? h('div', { className: 'lu-ai-body' }, h('b', null, 'Suggested next step: '), p.next) : null);
};
C.AIAction = function AIAction(p) {
  return h('div', { className: 'lu-ai' }, h('div', { className: 'lu-ai-label' }, I('auto_awesome'), 'AI recommended action'), h('div', { className: 'lu-ai-title' }, p.title), p.body ? h('div', { className: 'lu-ai-body' }, p.body) : null, p.link ? h('button', { type: 'button', className: 'lu-ai-link', onClick: p.onClick }, p.link + ' →') : null);
};
C.ProvenanceTag = function ProvenanceTag(p) {
  var inferred = p.kind === 'inferred';
  return h('span', { className: cx('lu-prov', inferred ? 'lu-prov-inferred' : 'lu-prov-stated') }, inferred ? 'Luna inferred · review' : 'Customer stated', inferred && p.onConfirm ? h('button', { type: 'button', onClick: p.onConfirm }, 'Confirm') : null, inferred && p.onDismiss ? h('button', { type: 'button', onClick: p.onDismiss }, 'Dismiss') : null);
};

/* ---------- Logo (vector copied from the Luna brand file; ink = currentColor) ---------- */
C.Logo = function Logo(p) {
  var s = p.size || 32, filled = p.variant === 'filled', mid = useState(function () { return 'lu-lm' + (++uid); })[0];
  return h('svg', { className: cx('lu-logo', p.className), width: s, height: s, viewBox: '60 60 120 120', role: 'img', 'aria-label': p.title || 'Luna' },
    h('defs', null, h('mask', { id: mid }, h('rect', { x: 60, y: 60, width: 120, height: 120, fill: '#fff' }), h('circle', { cx: 133, cy: 109, r: 31, fill: '#000' }))),
    filled ? h('rect', { x: 60, y: 60, width: 120, height: 120, rx: 37, fill: 'currentColor' }) : h('rect', { x: 63.25, y: 63.25, width: 113.5, height: 113.5, rx: 33.75, fill: 'none', stroke: 'currentColor', strokeWidth: 6.5 }),
    h('circle', { cx: 120, cy: 120, r: 32, fill: filled ? '#E4F4EE' : 'currentColor', mask: 'url(#' + mid + ')' }));
};
C.Wordmark = function Wordmark(p) { var s = p.size || 20; return h('span', { className: 'lu-wordmark', style: { fontSize: s } }, h(C.Logo, { size: Math.round(s * 1.5) }), 'Luna'); };

window.Luna = window.Luna || {};
Object.assign(window.Luna, C);
})();
