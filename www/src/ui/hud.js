/**
 * hud.js — in-game interface: top bar, tower shop, upgrade panel, abilities,
 * powers, boss bar, sandbox tools, and pointer/touch/keyboard input.
 */
import { h, $, clear, toast, bar, modal } from './dom.js';
import { W, H, TARGET_MODES } from '../config.js';
import { TOWERS, TOWER_MAP, CATEGORIES, describeMods } from '../data/towers.js';
import { HERO_MAP, heroXpFor } from '../data/heroes.js';
import { ENEMIES } from '../data/enemies.js';
import { WEATHER, POWERS } from '../data/meta.js';
import { fmt } from '../util.js';
import { audio } from '../audio.js';

const KIND_LABEL = { proj: 'Projectile', beam: 'Beam', aoe: 'Pulse', aura: 'Aura', trap: 'Trap', orbit: 'Orbit', support: 'Support', farm: 'Income', summon: 'Summoner', mortar: 'Artillery' };

export class Hud {
  constructor(app, game, renderer) {
    this.app = app; this.game = game; this.r = renderer; this.profile = app.profile;
    this.ui = { placing: null, ghost: null, selected: null };
    this.cat = 'primary'; this.uiT = 0; this.typed = '';
    this.build();
    this.bindInput();
  }

  // ───────────── layout ─────────────
  build() {
    const g = this.game, root = clear($('#screen-game'));
    this.el = {};
    const E = this.el;
    E.lives = h('span.stat', '❤️ ', h('b', '0'));
    E.cash = h('span.stat.cash', '💰 ', h('b', '0'));
    E.wave = h('span.stat', '🌊 ', h('b', '0'));
    E.weather = h('span.stat.weather', { title: '' }, '☀️');
    E.speed = h('button.tb', { onclick: () => this.cycleSpeed(), title: 'Game speed (F)' }, '1×');
    E.play = h('button.tb.play', { onclick: () => this.play(), title: 'Start wave (Space)' }, '▶');
    E.auto = h('button.tb', { onclick: () => this.toggleAuto(), title: 'Auto-start waves' }, '🔁');
    E.menu = h('button.tb', { onclick: () => this.pauseMenu(), title: 'Menu (Esc)' }, '⏸');
    E.coop = g.cfg.coop ? h('button.tb.coop', { onclick: () => { g.activePlayer ^= 1; this.refreshShop(); } }, 'P1') : null;
    const top = h('div#topbar', h('div.tb-left', E.lives, E.cash, E.coop, E.wave, E.weather), h('div.tb-right', E.auto, E.speed, E.play, E.menu));

    this.canvas = h('canvas#field');
    E.boss = h('div#bossbar.hidden', h('div.boss-name'), bar(1, '#ef4444'));
    E.abilities = h('div#abilities');
    E.powers = h('div#powers');
    E.banner = h('div#banner.hidden');
    const fieldWrap = h('div#fieldwrap', this.canvas, E.boss, E.abilities, E.powers, E.banner);

    E.side = h('div#side');
    root.append(top, h('div#gamemain', fieldWrap, E.side));
    this.r.canvas = this.canvas; this.r.ctx = this.canvas.getContext('2d');
    this.fieldWrap = fieldWrap;
    this.resize();
    this.refreshShop();
    this.refreshPowers();
  }

  resize() {
    const wrap = this.fieldWrap; if (!wrap) return;
    const bw = wrap.clientWidth, bh = wrap.clientHeight;
    const scale = Math.min(bw / W, bh / H);
    const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * (this.profile.settings.retro ? 0.35 : 1);
    this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
    this.canvas.width = Math.floor(cw * dpr); this.canvas.height = Math.floor(ch * dpr);
    this.canvas.style.imageRendering = this.profile.settings.retro ? 'pixelated' : 'auto';
    this.scale = scale; this.dpr = dpr;
  }

  // ───────────── shop ─────────────
  refreshShop() {
    const g = this.game, side = clear(this.el.side);
    if (this.ui.selected) { this.renderSelected(); return; }
    const tabs = h('div.cat-tabs', CATEGORIES.map((c) => h('button.cat' + (this.cat === c.id ? '.on' : ''), { title: c.name, onclick: () => { this.cat = c.id; this.refreshShop(); } }, c.emoji)),
      g.sandbox ? h('button.cat' + (this.cat === 'sandbox' ? '.on' : ''), { title: 'Sandbox tools', onclick: () => { this.cat = 'sandbox'; this.refreshShop(); } }, '🧪') : null);
    side.append(tabs);
    if (this.cat === 'sandbox') { side.append(this.sandboxPanel()); return; }
    const grid = h('div.shop');
    // hero card
    const heroId = g.cfg.heroId || this.app.profile.hero;
    if (!g.towers.some((t) => t.hero) && !g.mods.has('nohero') && g.cfg.heroAllowed !== false && this.cat === 'primary') {
      const hd = HERO_MAP[heroId];
      grid.append(h('button.card.hero', { 'data-cost': g.heroCost(heroId), onpointerdown: (e) => this.startPlace('hero:' + heroId, e) },
        h('div.em', hd.emoji), h('div.nm', hd.name), h('div.pr', '$' + fmt(g.heroCost(heroId)))));
    }
    for (const t of TOWERS.filter((t) => t.cat === this.cat)) {
      const banned = g.isBanned(t.id);
      grid.append(h('button.card' + (banned ? '.banned' : ''), { 'data-cost': g.towerCost(t.id), title: `${t.name} — ${t.desc}`, disabled: banned, onpointerdown: (e) => !banned && this.startPlace(t.id, e) },
        h('div.em', t.emoji), h('div.nm', t.name), h('div.pr', banned ? '🚫' : '$' + fmt(g.towerCost(t.id)))));
    }
    side.append(grid, h('div.hint', this.ui.placing ? 'Tap the field to build · Esc to cancel' : 'Tap a tower, then tap the field to build'));
    this.updateAfford();
  }

  updateAfford() {
    const cash = this.game.sandbox ? Infinity : this.game.wallet;
    for (const c of this.el.side.querySelectorAll('[data-cost]')) c.classList.toggle('poor', +c.dataset.cost > cash);
  }

  sandboxPanel() {
    const g = this.game;
    const sel = h('select', Object.keys(ENEMIES).map((k) => h('option', { value: k }, ENEMIES[k].name)));
    const cnt = h('input', { type: 'number', value: 10, min: 1, max: 200 });
    const phase = h('input', { type: 'checkbox' }), regen = h('input', { type: 'checkbox' }), fort = h('input', { type: 'checkbox' });
    const spawn = () => { const n = Math.min(200, +cnt.value || 1); for (let i = 0; i < n; i++) g.queue.unshift({ t: g.spawnT + i * 0.15, type: sel.value, flags: { phase: phase.checked, regen: regen.checked, fortified: fort.checked, bossWave: g.wave || 20 }, pi: i % g.paths.length }); g.queue.sort((a, b) => b.t - a.t); g.waveActive = true; };
    const waveIn = h('input', { type: 'number', value: g.wave + 1, min: 1, max: 500 });
    return h('div.sandbox',
      h('h3', '🧪 Sandbox'), h('label', 'Slime', sel), h('label', 'Count', cnt),
      h('div.row', h('label.ck', phase, ' Phase'), h('label.ck', regen, ' Regen'), h('label.ck', fort, ' Fortified')),
      h('button.btn', { onclick: spawn }, 'Spawn'),
      h('label', 'Jump to wave', waveIn), h('button.btn', { onclick: () => { g.wave = Math.max(0, (+waveIn.value || 1) - 1); toast(`Next wave: ${g.wave + 1}`); } }, 'Set wave'),
      h('button.btn', { onclick: () => { g.enemies.forEach((e) => (e.dead = true)); g.queue = []; } }, '💥 Clear slimes'),
      h('button.btn', { onclick: () => { g.towers.forEach((t) => Object.keys(t.abilityCds).forEach((k) => (t.abilityCds[k] = 0))); } }, '⚡ Reset cooldowns'));
  }

  // ───────────── selected tower panel ─────────────
  select(t) { this.ui.selected = t; this.ui.placing = null; this.ui.ghost = null; this.refreshShop(); }
  deselect() { this.ui.selected = null; this.refreshShop(); }

  renderSelected() {
    const g = this.game, t = this.ui.selected, side = this.el.side, s = t.eff;
    const head = h('div.sel-head', h('div.sel-em', t.def.emoji), h('div', h('div.sel-name', t.def.name), h('div.sel-sub', t.hero ? `Hero · Level ${t.level}` : t.fusion ? 'Fusion tower' : KIND_LABEL[s.kind] || '')), h('button.x', { onclick: () => this.deselect() }, '✕'));
    const stat = (k, v) => h('div.st', h('span', k), h('b', v));
    const stats = h('div.sel-stats',
      s.dmg ? stat('Damage', +s.dmg.toFixed(1)) : null, s.pierce > 1 && s.kind !== 'support' ? stat('Pierce', Math.round(s.pierce)) : null,
      s.kind !== 'farm' && s.kind !== 'support' ? stat('Speed', (1 / s.rate).toFixed(2) + '/s') : null,
      s.range && s.range < 2000 ? stat('Range', Math.round(s.range)) : s.range >= 2000 ? stat('Range', '∞') : null,
      s.income ? stat('Income', '$' + Math.round(s.income)) : null,
      stat('Pops', fmt(t.pops)), t.stars ? stat('Veteran', '★'.repeat(t.stars)) : null,
      h('div.tags', s.detect ? h('span.tag', '👁 Phase') : null, s.ap ? h('span.tag', '🛡 Armor-pierce') : null, h('span.tag', s.dtype)));
    side.append(head, stats);
    if (t.hero) {
      side.append(h('div.hero-xp', `XP ${Math.floor(t.xp)} / ${heroXpFor(t.level)}`, bar(t.level >= 20 ? 1 : t.xp / heroXpFor(t.level), '#80deea')),
        h('div.hint', t.hero.lore));
    }
    // targeting
    if (['proj', 'beam', 'mortar', 'aoe'].includes(s.kind) && s.range < 2000 || s.sniper) {
      side.append(h('button.btn.target', { onclick: () => { t.target = (t.target + 1) % TARGET_MODES.length; this.refreshShop(); } }, '🎯 Target: ' + TARGET_MODES[t.target].toUpperCase()));
    }
    // upgrade paths
    if (!t.hero) {
      const paths = h('div.paths');
      const n = t.fusion ? 1 : 3;
      for (let p = 0; p < n; p++) {
        const info = g.upgradeInfo(t, p); if (!info) continue;
        const pips = h('div.pips', info.path.ups.map((u, i) => h('span.pip' + (i < t.tiers[p] ? '.on' : ''), { title: u.name })));
        let body;
        if (info.maxed) body = h('div.up-max', '✨ MAXED');
        else {
          const desc = info.up.desc || describeMods(info.up.mods);
          const can = !info.locked && (g.sandbox || g.wallet >= info.cost);
          body = h('button.up' + (info.locked ? '.locked' : can ? '' : '.poor'), { 'data-cost': info.locked ? 1e12 : info.cost, disabled: !!info.locked, onclick: () => { if (g.upgrade(t, p)) { audio.sfx('upgrade'); this.refreshShop(); } else audio.sfx('leak'); } },
            h('div.up-name', `T${info.tier} · ${info.up.name}`), h('div.up-desc', info.locked || desc), h('div.up-cost', info.locked ? '🔒' : '$' + fmt(info.cost)));
        }
        paths.append(h('div.path.p' + p, h('div.path-name', info.path.name, pips), body));
      }
      side.append(paths);
    }
    // abilities
    for (const a of t.abilities) {
      const cd = t.abilityCds[a.name];
      side.append(h('button.btn.ability-btn', { disabled: cd > 0, onclick: () => { if (g.useAbility(t, a)) this.refreshShop(); } }, `⚡ ${a.name}${cd > 0 ? ` (${Math.ceil(cd)}s)` : ''}`));
    }
    // fusion
    const fu = g.fusionFor(t);
    if (fu) side.append(h('button.btn.fuse', { 'data-cost': fu.cost, onclick: () => { const nt = g.fuse(t); if (nt) { toast(`🧬 Fused into ${fu.recipe.name}!`, 'good'); audio.sfx('ability'); this.select(nt); } } }, `🧬 Fuse → ${fu.recipe.emoji} ${fu.recipe.name} ($${fmt(fu.cost)})`));
    // sell
    const nosell = g.mods.has('nosell') && !g.sandbox;
    side.append(h('button.btn.sell', { disabled: nosell, onclick: () => { if (g.sell(t)) { audio.sfx('sell'); this.deselect(); } } }, nosell ? '🚫 No refunds' : `💰 Sell $${fmt(g.sellValue(t))}`));
    this.selSig = this.sig();
    this.updateAfford();
  }
  sig() { const t = this.ui.selected; return t ? `${t.id}|${t.tiers}|${t.level}|${t.abilities.map((a) => Math.ceil(t.abilityCds[a.name])).join()}|${t.stars}|${t.target}` : ''; }

  // ───────────── powers & abilities ─────────────
  refreshPowers() {
    const P = this.profile.powers, box = clear(this.el.powers);
    for (const id in POWERS) {
      if (!P[id]) continue;
      box.append(h('button.power', { title: `${POWERS[id].name}: ${POWERS[id].desc}`, onclick: () => { if (P[id] > 0 && this.game.usePower(id)) { P[id]--; this.app.save(); audio.sfx('ability'); this.refreshPowers(); } } }, POWERS[id].emoji, h('small', P[id])));
    }
  }
  refreshAbilities() {
    const list = this.game.abilityList(), box = this.el.abilities;
    const key = list.map((x) => x.t.id + x.a.name).join();
    if (key !== this.abKey) {
      this.abKey = key; clear(box);
      for (const x of list) {
        const b = h('button.ab', { title: `${x.a.name} (${x.t.def.name})`, onclick: () => { this.game.useAbility(x.t, x.a); } }, x.t.def.emoji, h('div.ab-cd'));
        b._x = x; box.append(b);
      }
    }
    for (const b of box.children) {
      const x = b._x, cd = Math.max(0, x.t.abilityCds[x.a.name]);
      b.classList.toggle('ready', cd <= 0); b.firstElementChild.style.height = `${(cd / x.max) * 100}%`;
    }
  }

  // ───────────── controls ─────────────
  play() {
    const g = this.game; audio.unlock();
    if (g.over) return;
    if (!g.waveActive) { g.startWave(); return; }
    // already active: start the next wave early ("send next")
    if (!g.queue.length && g.wave < g.endWave) { g.waveActive = false; g.startWave(); }
  }
  cycleSpeed() { const max = this.game.sandbox ? 5 : 3; this.game.speed = this.game.speed >= max ? 1 : this.game.speed + 1; }
  toggleAuto() { this.game.autoStart = !this.game.autoStart; this.profile.settings.autoStart = this.game.autoStart; this.app.save(); this.el.auto.classList.toggle('on', this.game.autoStart); if (this.game.autoStart && !this.game.waveActive) this.play(); }

  pauseMenu() {
    const g = this.game; g.paused = true;
    modal('⏸ Paused', h('div.pause',
      h('p', `${g.map.name} · ${g.diff.emoji} ${g.diff.name} · Wave ${g.wave}`),
      h('div.toggles',
        h('button.btn', { onclick: (e) => { this.app.setMusic(!this.profile.settings.music); e.target.textContent = this.profile.settings.music ? '🎵 Music: ON' : '🔇 Music: OFF'; } }, this.profile.settings.music ? '🎵 Music: ON' : '🔇 Music: OFF'),
        h('button.btn', { onclick: (e) => { this.app.setSfx(!this.profile.settings.sfx); e.target.textContent = this.profile.settings.sfx ? '🔊 SFX: ON' : '🔈 SFX: OFF'; } }, this.profile.settings.sfx ? '🔊 SFX: ON' : '🔈 SFX: OFF'))),
    [{ label: '▶ Resume', cls: 'primary' }, { label: '🔄 Restart', onclick: () => this.app.restart() }, { label: '🏠 Quit', cls: 'danger', onclick: () => this.app.quitGame() }],
    { onClose: () => { g.paused = false; } });
  }

  startPlace(id, e) {
    audio.unlock();
    if (this.ui.placing === id) { this.ui.placing = null; this.ui.ghost = null; this.refreshShop(); return; }
    this.ui.placing = id; this.ui.selected = null;
    this.dragFromShop = e?.pointerType === 'touch' || e?.pointerType === 'mouse';
    this.refreshShop();
  }

  toLogical(e) { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / this.scale, y: (e.clientY - r.top) / this.scale, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom }; }

  ghostAt(x, y) {
    const id = this.ui.placing, g = this.game;
    const isHero = id.startsWith('hero:');
    const def = isHero ? HERO_MAP[id.slice(5)] : TOWER_MAP[id];
    const range = isHero ? def.base.range : def.range;
    this.ui.ghost = { x, y, ok: g.canPlace(x, y), range: range * (1 + g.G.range + (g.W.range || 0)), emoji: def.emoji };
  }

  tryPlace(x, y) {
    const id = this.ui.placing, g = this.game;
    const t = id.startsWith('hero:') ? g.placeHero(id.slice(5), x, y) : g.placeTower(id, x, y);
    if (t) {
      audio.sfx('place');
      if (!this.keepPlacing) { this.ui.placing = null; this.ui.ghost = null; }
      this.refreshShop();
      return true;
    }
    if (!g.canPlace(x, y)) toast("Can't build there", 'bad'); else toast('Not enough cash 💸', 'bad');
    audio.sfx('leak'); return false;
  }

  bindInput() {
    const c = this.canvas;
    this.onMove = (e) => {
      if (!this.ui.placing) return;
      const p = this.toLogical(e);
      if (p.inside) this.ghostAt(p.x, p.y); else this.ui.ghost = null;
    };
    this.onUp = (e) => {
      const p = this.toLogical(e);
      if (this.ui.placing && p.inside) { this.keepPlacing = e.shiftKey; this.tryPlace(p.x, p.y); return; }
      if (!p.inside || e.target !== c) return;
      // select tower
      const t = this.game.towers.find((t) => (t.x - p.x) ** 2 + (t.y - p.y) ** 2 < 26 ** 2);
      if (t) { audio.sfx('click'); this.select(t); } else if (this.ui.selected) this.deselect();
    };
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    this.onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const k = e.key, t = this.ui.selected, g = this.game;
      // easter egg: type "quack"
      this.typed = (this.typed + k.toLowerCase()).slice(-5);
      if (this.typed === 'quack' && g.waveActive) { g.spawnEnemy('duck', 0, 0, {}); toast('🦆 Quack!'); audio.sfx('quack'); }
      if (k === ' ') { e.preventDefault(); this.play(); }
      else if (k === 'Escape') { if (this.ui.placing) { this.ui.placing = null; this.ui.ghost = null; this.refreshShop(); } else if (t) this.deselect(); else if (!$('.modal-wrap')) this.pauseMenu(); }
      else if (k === 'f' || k === 'F') this.cycleSpeed();
      else if (t && ['1', '2', '3'].includes(k) && !t.hero) { if (g.upgrade(t, +k - 1)) { audio.sfx('upgrade'); this.refreshShop(); } }
      else if (t && k === 'Tab') { e.preventDefault(); t.target = (t.target + 1) % TARGET_MODES.length; this.refreshShop(); }
      else if (t && (k === 'Delete' || k === 'Backspace')) { if (g.sell(t)) { audio.sfx('sell'); this.deselect(); } }
      else if (!t && /^[1-9]$/.test(k)) { const list = TOWERS.filter((x) => x.cat === this.cat); if (list[+k - 1]) this.startPlace(list[+k - 1].id); }
    };
    window.addEventListener('keydown', this.onKey);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
  }

  // ───────────── per-frame ─────────────
  update(dt) {
    const g = this.game, E = this.el;
    this.uiT -= dt;
    if (this.uiT > 0) return;
    this.uiT = 0.12;
    E.lives.lastChild.textContent = g.sandbox ? '∞' : fmt(g.lives);
    E.cash.lastChild.textContent = g.sandbox ? '∞' : g.cfg.coop ? `${fmt(g.cash)} | ${fmt(g.cash2)}` : fmt(g.cash);
    if (E.coop) { E.coop.textContent = g.activePlayer ? 'P2 🔵' : 'P1 🔴'; }
    E.wave.lastChild.textContent = g.endWave === Infinity ? `${g.wave}` : `${g.wave}/${g.endWave}`;
    const w = WEATHER[g.weather]; E.weather.textContent = w.emoji; E.weather.title = `${w.name}: ${w.desc}`;
    E.speed.textContent = g.speed + '×';
    E.play.textContent = g.waveActive ? (g.queue.length ? '…' : '⏭') : '▶';
    E.play.classList.toggle('pulse', !g.waveActive && !g.over);
    E.auto.classList.toggle('on', !!g.autoStart);
    // boss bar
    if (g.boss && !g.boss.dead) { E.boss.classList.remove('hidden'); E.boss.firstChild.textContent = `${g.boss.def.name}${g.boss.half ? ' 🛡' : ''}`; E.boss.lastChild.firstChild.style.width = `${(g.boss.hp / g.boss.maxHp) * 100}%`; }
    else E.boss.classList.add('hidden');
    this.refreshAbilities();
    if (this.ui.selected) { if (!g.towers.includes(this.ui.selected)) this.deselect(); else if (this.sig() !== this.selSig) this.refreshShop(); }
    this.updateAfford();
  }

  banner(text, sub = '', cls = '') {
    const b = this.el.banner; clear(b); b.className = cls; b.append(h('div.b-title', text), sub ? h('div.b-sub', sub) : null);
    clearTimeout(this.bannerT); this.bannerT = setTimeout(() => b.classList.add('hidden'), 2600);
  }

  destroy() {
    window.removeEventListener('pointermove', this.onMove); window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('keydown', this.onKey); window.removeEventListener('resize', this.onResize);
  }
}
