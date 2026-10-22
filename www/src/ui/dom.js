/**
 * dom.js — tiny DOM toolkit (hyperscript, modals, toasts). No framework needed:
 * keeps the bundle small and boot fast on low-end Android WebViews.
 */
import { audio } from '../audio.js';

/** h('div.card#id', {onclick, style}, ...children) */
export function h(sel, attrs, ...kids) {
  if (attrs == null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) { kids.unshift(attrs); attrs = {}; }
  const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][\w-]+/g) || []).forEach((t) => (t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1))));
  for (const k in attrs) {
    const v = attrs[k];
    if (k.startsWith('on')) el.addEventListener(k.slice(2), k === 'onclick' ? (e) => { audio.sfx('click'); v(e); } : v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : document.createTextNode(String(c))); };
  kids.forEach(add);
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

/** Modal with a title, body and button row. Returns { el, close }. */
export function modal(title, body, buttons = [], opts = {}) {
  const root = $('#modal-root');
  const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 160); opts.onClose?.(); };
  const wrap = h('div.modal-wrap', { onpointerdown: (e) => { if (e.target === wrap && !opts.locked) close(); } },
    h('div.modal' + (opts.wide ? '.wide' : ''),
      h('div.modal-head', h('h2', title), opts.locked ? null : h('button.x', { onclick: close, 'aria-label': 'Close' }, '✕')),
      h('div.modal-body', body),
      buttons.length ? h('div.modal-foot', buttons.map((b) => h('button.btn' + (b.cls ? '.' + b.cls : ''), { onclick: () => { if (b.onclick?.() !== false) close(); }, disabled: b.disabled }, b.label))) : null));
  root.append(wrap);
  return { el: wrap, close };
}

export function toast(msg, cls = '') {
  const t = h('div.toast' + (cls ? '.' + cls : ''), msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

/** Progress bar element. */
export const bar = (f, color = '#4ade80') => h('div.bar', h('div.bar-fill', { style: { width: `${Math.max(0, Math.min(1, f)) * 100}%`, background: color } }));
