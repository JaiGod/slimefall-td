/**
 * game.js — the simulation. Pure logic: no DOM, no canvas. (render.js draws it,
 * ui/*.js talks to it.) Runs on a fixed 60Hz step so results are deterministic
 * per seed and identical across devices; speed-up just runs more steps per frame.
 *
 * Main concepts
 *  • Enemy:  layered slime travelling along a Path by distance `d`.
 *  • Tower:  def + purchased tiers → `base` stats → `eff` stats (after buffs/relics/weather).
 *  • Projectile / Shell / Trap / Minion / Beam: attack carriers.
 *  • Spatial hash grid for enemy queries (keeps 1000+ slimes fast on phones).
 */
import { W, H, PATH_W, TOWER_R, STEP, MAX_ENEMIES, DIFFICULTIES, MAX_TOTAL_TIERS, HIGH_TIER, SELL_RATE, TARGET_MODES, VET_STARS, VET_BONUS } from '../config.js';
import { ENEMIES, REGEN_PARENT, REGEN_RANK, rbe } from '../data/enemies.js';
import { TOWER_MAP } from '../data/towers.js';
import { HERO_MAP, heroXpFor } from '../data/heroes.js';
import { MAP_MAP, TIER_INFO } from '../data/maps.js';
import { RELICS, RESEARCH, FUSIONS, WEATHER, currentSeason } from '../data/meta.js';
import { genWave, endlessScale } from '../data/waves.js';
import { Path } from './path.js';
import { Particles } from './particles.js';
import { mulberry32, hashStr, dist2, segDist2, TAU, clamp, pick } from '../util.js';
import { prestigeBonus } from '../save.js';

let NEXT_ID = 1;
const CELL = 80, COLS = Math.ceil(W / CELL) + 2, ROWS = Math.ceil(H / CELL) + 2;
const RELIC_MAP = Object.fromEntries(RELICS.map((r) => [r.id, r]));
const FUSION_MAP = Object.fromEntries(FUSIONS.map((f) => [f.id, f]));
const FUSION_PATH = { name: 'Ascension', ups: [
  { name: 'Resonance', cost: 3000, mods: { dmgX: 1.5, rangeX: 1.1 }, desc: '+50% damage, +10% range' },
  { name: 'Harmonic Core', cost: 9000, mods: { dmgX: 1.6, rateX: 0.8 }, desc: '+60% damage, faster attacks' },
  { name: 'Transcendence', cost: 28000, mods: { dmgX: 2, rateX: 0.7, pierceX: 1.5 }, desc: 'Double damage, much faster, +50% pierce' },
] };
const BOSS_HP = { hydra: 1, chrono: 1.05, abyss: 2.2 };
const DEFAULTS = { range: 120, rate: 1, dmg: 0, pierce: 1, speed: 400, count: 1, spread: 0, dtype: 'sharp', pr: 5, splash: 0, chain: 0, chainR: 80 };
const SUPPORT_KEYS = ['buffRate', 'buffDmg', 'buffRange', 'buffPierce', 'grantDetect', 'buffAp', 'discount', 'bounty'];

/** Apply an upgrade's mod object to a stat block (see towers.js header for the mini-language). */
export function applyMods(s, m) {
  const replace = m.kind !== undefined; // a kind change redefines core numbers
  for (const k in m) {
    const v = m[k];
    if (k.endsWith('X') && typeof v === 'number') { const key = k.slice(0, -1); s[key] = (s[key] ?? DEFAULTS[key] ?? 0) * v; }
    else if (typeof v === 'number' && !replace && typeof s[k] === 'number') s[k] += v;
    else s[k] = v;
  }
}

/** Fold research + relics + prestige into one global effect block. */
export function computeGlobals(profile, relicIds = []) {
  const G = { popCash: 0, startCash: 0, startLives: 0, range: 0, rate: 0, dmg: 0, boss: 0, enemySpeed: 0, enemyHp: 0, abilityCd: 0, sharpPierce: 0,
    crit: 0, discount: 0, sell: 0, heroXp: 0, projSpeed: 0, farm: 0, loot: 0, revive: 0, piggy: 0, detectAll: false, dmgMul: 1, cashMul: 1 };
  const R = profile?.researchLv || {};
  G.startCash += 60 * (R.cash || 0); G.startLives += 8 * (R.lives || 0); G.discount += 0.01 * (R.discount || 0); G.sell += 0.03 * (R.sell || 0);
  G.heroXp += 0.08 * (R.heroxp || 0); G.projSpeed += 0.05 * (R.speed || 0); G.crit += 0.01 * (R.crit || 0); G.farm += 0.04 * (R.farm || 0);
  G.abilityCd += 0.03 * (R.ability || 0); G.boss += 0.05 * (R.boss || 0); G.loot += 0.1 * (R.loot || 0);
  for (const id of relicIds) {
    const fx = RELIC_MAP[id]?.fx; if (!fx) continue;
    for (const k in fx) { if (typeof fx[k] === 'boolean') G[k] = G[k] || fx[k]; else G[k] = (G[k] || 0) + fx[k]; }
  }
  if (profile) { const pb = prestigeBonus(profile); G.cashMul += pb.cash; G.dmgMul += pb.dmg; }
  return G;
}

export class Game {
  /**
   * @param cfg   { mapId, diff, mode, modifiers[], heroId, relics[], seed, startWave, endWave, cash, lives, banned[], coop }
   * @param profile player profile (read-only here; rewards are reported via hooks)
   * @param hooks { onEvent(type, data) }
   */
  constructor(cfg, profile, hooks = {}) {
    this.cfg = cfg; this.profile = profile; this.hooks = hooks;
    this.map = MAP_MAP[cfg.mapId];
    this.paths = this.map.paths.map((p) => new Path(p));
    this.diff = DIFFICULTIES[cfg.diff || 'normal'];
    this.mods = new Set(cfg.modifiers || []);
    this.mode = cfg.mode || 'campaign';
    this.sandbox = this.mode === 'sandbox';
    this.seed = cfg.seed ?? hashStr(cfg.mapId + (cfg.diff || ''));
    this.rng = mulberry32(this.seed);
    this.G = computeGlobals(profile, cfg.relics || []);
    this.season = currentSeason();

    this.enemies = []; this.towers = []; this.projectiles = []; this.shells = []; this.traps = []; this.minions = []; this.beams = []; this.rings = []; this.delayed = [];
    this.particles = new Particles(); this.particles.setQuality(profile?.settings?.particles || 'high');
    this.grid = Array.from({ length: COLS * ROWS }, () => []);

    this.cash = cfg.cash ?? (this.diff.cash + this.G.startCash);
    this.cash2 = cfg.coop ? this.cash : 0; this.activePlayer = 0;
    this.lives = cfg.lives ?? (this.diff.lives + this.G.startLives);
    if (this.mods.has('onelife')) this.lives = 1;
    this.startLives = this.lives;
    this.wave = (cfg.startWave || 1) - 1;
    this.endWave = cfg.endWave ?? (this.mode === 'endless' ? Infinity : this.diff.endWave);
    this.waveActive = false; this.queue = []; this.spawnT = 0; this.altPath = 0;
    this.time = 0; this.speed = 1; this.paused = false; this.over = false; this.won = false;
    this.shake = 0; this.flash = 0; this.reviveUsed = false; this.globalBuffT = 0; this.globalBuffX = 0;
    this.boss = null; this.buffT = 0; this.lightningT = 3; this.leakedThisGame = 0;
    this.session = this.freshSession();
    this.weather = 'clear'; this.rollWeather();
    this.blockers = []; // filled by renderer when decorating the map
    if (this.sandbox) { this.cash = 1e9; this.lives = 1e9; }
  }

  freshSession() { return { pops: 0, cashEarned: 0, behemoths: 0, bosses: 0, abyssKills: 0, abilitiesUsed: 0, towersPlaced: 0, upgrades: 0, tier5: 0, fusions: 0, goldens: 0, shinies: 0, ducks: 0, waves: 0, gems: 0, res: { gel: 0, crystal: 0, ember: 0, star: 0, candy: 0 }, mastery: {} }; }
  emit(type, data) { this.hooks.onEvent?.(type, data); }

  // ═════════════════════════ WEATHER ═════════════════════════
  rollWeather() {
    let pool = this.map.weather || ['clear'];
    if (this.mods.has('storm')) pool = ['storm'];
    else if (this.season?.fx?.snow && this.rng() < 0.5) pool = ['snow'];
    const w = this.wave < 3 ? 'clear' : pick(pool, this.rng);
    if (w !== this.weather) { this.weather = w; this.emit('weather', WEATHER[w]); }
    this.W = WEATHER[this.weather].fx;
    this.refreshAll();
  }

  // ═════════════════════════ ECONOMY ═════════════════════════
  get wallet() { return this.activePlayer === 1 ? this.cash2 : this.cash; }
  spend(n) { if (this.sandbox) return true; if (this.wallet < n) return false; if (this.activePlayer === 1) this.cash2 -= n; else this.cash -= n; return true; }
  gain(n, split = true) {
    if (this.sandbox) return;
    n *= this.G.cashMul;
    if (this.cfg.coop && split) { this.cash += n / 2; this.cash2 += n / 2; } else this.cash += n;
    this.session.cashEarned += n;
  }
  popCashMul() {
    let m = 1 + this.G.popCash; if (this.mods.has('poor')) m *= 0.5;
    if (this.wave > 100) m *= 0.1; else if (this.wave > 85) m *= 0.2; else if (this.wave > 50) m *= 0.5;
    return m;
  }
  localDiscount(x, y) {
    let d = 0;
    for (const t of this.towers) if (t.base.discount && dist2(x, y, t.x, t.y) <= t.eff.range ** 2) d = Math.max(d, t.base.discount);
    return d;
  }
  price(base, x, y) {
    const disc = this.G.discount + (x != null ? this.localDiscount(x, y) : 0);
    return Math.max(5, Math.round((base * this.diff.costX * (1 - disc)) / 5) * 5);
  }
  towerCost(id, x, y) { return this.price(TOWER_MAP[id].cost, x, y); }
  heroCost(id) { return this.price(HERO_MAP[id].base.cost); }

  // ═════════════════════════ PLACEMENT ═════════════════════════
  canPlace(x, y, ignore = null) {
    if (x < 16 || y < 16 || x > W - 16 || y > H - 16) return false;
    const minPath = (PATH_W / 2 + TOWER_R - 6) ** 2;
    for (const p of this.paths) if (p.distTo2(x, y) < minPath) return false;
    for (const t of this.towers) if (t !== ignore && dist2(x, y, t.x, t.y) < (TOWER_R * 2 - 4) ** 2) return false;
    for (const b of this.blockers) if (dist2(x, y, b.x, b.y) < (b.r + TOWER_R - 4) ** 2) return false;
    return true;
  }

  isBanned(id) {
    if (this.cfg.banned?.includes(id)) return true;
    if (this.mods.has('nofarm') && (id === 'hive' || TOWER_MAP[id]?.kind === 'farm')) return true;
    if (this.cfg.allowed && !this.cfg.allowed.includes(id)) return true;
    return false;
  }

  placeTower(id, x, y) {
    const def = TOWER_MAP[id]; if (!def || this.isBanned(id) || !this.canPlace(x, y)) return null;
    const cost = this.towerCost(id, x, y);
    if (!this.spend(cost)) return null;
    const t = this.makeTower(def, x, y); t.spent = cost;
    this.towers.push(t); this.session.towersPlaced++;
    this.particles.burst(x, y, 14, { color: def.color, speed: 120, life: 0.5 });
    this.refreshAll(); return t;
  }

  placeHero(id, x, y) {
    if (this.mods.has('nohero') || this.cfg.heroAllowed === false) return null;
    if (this.towers.some((t) => t.hero)) return null;
    const h = HERO_MAP[id]; if (!h || !this.canPlace(x, y)) return null;
    const cost = this.heroCost(id); if (!this.spend(cost)) return null;
    const def = { id: 'hero:' + id, name: h.name, emoji: h.emoji, color: h.color, kind: h.base.kind, paths: [], desc: h.lore };
    const t = this.makeTower(def, x, y); t.hero = h; t.level = 1; t.xp = 0; t.spent = cost;
    this.towers.push(t); this.refreshAll(); return t;
  }

  makeTower(def, x, y) {
    const t = { id: NEXT_ID++, def, x, y, tiers: [0, 0, 0], target: 0, cd: 0.3, angle: -Math.PI / 2, pops: 0, stars: 0, dmgDone: 0, stun: 0, owner: this.activePlayer,
      frenzyT: 0, frenzyX: 1, abilityCds: {}, orbA: 0, orbHits: new Map(), minions: 0, traps: 0, recoil: 0, base: null, eff: null, buffs: {} };
    this.computeBase(t);
    t.pathSamples = [];
    for (let pi = 0; pi < this.paths.length; pi++) for (const s of this.paths[pi].samples) {
      if (s.x > 0 && s.y > 0 && s.x < W && s.y < H) t.pathSamples.push({ ...s, pi });
    }
    return t;
  }

  /** Recompute static stats from def + tiers (+ hero level). */
  computeBase(t) {
    let s;
    if (t.hero) {
      s = { ...DEFAULTS, ...t.hero.base };
      for (let l = 2; l <= t.level; l++) { applyMods(s, t.hero.grow); if (t.hero.milestones[l]) applyMods(s, t.hero.milestones[l]); }
    } else if (t.fusion) {
      s = { ...DEFAULTS, ...t.fusion.stats };
      for (let i = 0; i < t.tiers[0]; i++) applyMods(s, FUSION_PATH.ups[i].mods);
    } else {
      const d = t.def; s = { ...DEFAULTS };
      for (const k of Object.keys(d)) if (!['paths', 'name', 'emoji', 'desc', 'cat', 'id', 'cost', 'color'].includes(k)) s[k] = d[k];
      for (let p = 0; p < 3; p++) for (let i = 0; i < t.tiers[p]; i++) applyMods(s, d.paths[p].ups[i].mods);
    }
    if (s.dtype === 'sharp') s.pierce += this.G.sharpPierce;
    t.base = s;
    // abilities (tier-5 + hero)
    t.abilities = [];
    if (s.ability) t.abilities.push(s.ability);
    if (t.hero) for (const a of t.hero.abilities) if (t.level >= a.lvl) t.abilities.push(a);
    for (const a of t.abilities) if (t.abilityCds[a.name] == null) t.abilityCds[a.name] = a.cd * 0.35;
    this.refreshTower(t);
  }

  /** Dynamic stats = base × globals × weather × veterancy × support buffs × abilities. */
  refreshTower(t) {
    const s = t.base, b = t.buffs, Wx = this.W || {}, vet = t.stars * VET_BONUS;
    const e = { ...s };
    const rateBoost = 1 + this.G.rate + (Wx.rate || 0) + vet + (b.rate || 0) + (this.globalBuffT > 0 ? this.globalBuffX : 0);
    e.rate = s.rate / rateBoost * (t.frenzyT > 0 ? t.frenzyX : 1);
    e.range = s.range * Math.max(0.5, 1 + this.G.range + (Wx.range || 0) + vet + (b.range || 0));
    if (s.sniper) e.range = 9999;
    e.dmg = s.dmg > 0 ? s.dmg + this.G.dmg + (b.dmg || 0) : s.dmg;
    if (s.mDmg) e.mDmg = s.mDmg + (b.dmg || 0);
    e.pierce = s.pierce + (b.pierce || 0);
    e.trapPierce = (s.trapPierce || 0) + (b.pierce || 0) * 2;
    e.detect = s.detect || b.detect || this.G.detectAll;
    e.ap = s.ap || b.ap;
    e.speed = s.speed * (1 + this.G.projSpeed);
    e.crit = (s.crit || 0) + this.G.crit; e.critMul = s.critMul || 2;
    e.dmgMul = (1 + vet) * this.G.dmgMul;
    t.eff = e;
  }

  refreshAll() {
    // support buffs: take the strongest of each buff type in range (no infinite stacking)
    for (const t of this.towers) t.buffs = {};
    for (const s of this.towers) {
      const B = s.base; if (!SUPPORT_KEYS.some((k) => B[k])) continue;
      const r2 = (B.range * (1 + this.G.range)) ** 2;
      for (const t of this.towers) {
        if (t === s || dist2(s.x, s.y, t.x, t.y) > r2) continue;
        const b = t.buffs;
        if (B.buffRate) b.rate = Math.max(b.rate || 0, B.buffRate);
        if (B.buffDmg) b.dmg = Math.max(b.dmg || 0, B.buffDmg);
        if (B.buffRange) b.range = Math.max(b.range || 0, B.buffRange);
        if (B.buffPierce) b.pierce = Math.max(b.pierce || 0, B.buffPierce);
        if (B.grantDetect) b.detect = true;
        if (B.buffAp) b.ap = true;
        if (B.bounty) b.bounty = Math.max(b.bounty || 0, B.bounty);
      }
    }
    for (const t of this.towers) this.refreshTower(t);
  }

  // ═════════════════════════ UPGRADES / SELL / FUSION ═════════════════════════
  upgradeInfo(t, p) {
    if (t.hero) return null;
    const path = t.fusion ? (p === 0 ? FUSION_PATH : null) : t.def.paths[p];
    if (!path) return null;
    const next = t.tiers[p];
    if (next >= path.ups.length) return { maxed: true, path };
    const up = path.ups[next];
    const tiers = t.tiers.slice(); tiers[p]++;
    let locked = null;
    if (!t.fusion) {
      if (tiers.reduce((a, b) => a + b, 0) > MAX_TOTAL_TIERS) locked = 'Tier limit (7 total)';
      else if (tiers.filter((x) => x >= HIGH_TIER).length > 1) locked = 'Only one path can reach tier 3+';
      if (this.mods.has('tier3') && tiers[p] > 3) locked = 'Capped at tier 3';
      if (this.cfg.maxTier && tiers[p] > this.cfg.maxTier) locked = `Capped at tier ${this.cfg.maxTier}`;
    }
    return { up, tier: next + 1, cost: this.price(up.cost, t.x, t.y), locked, path };
  }

  upgrade(t, p) {
    const info = this.upgradeInfo(t, p);
    if (!info || info.maxed || info.locked) return false;
    if (!this.spend(info.cost)) return false;
    t.tiers[p]++; t.spent += info.cost; this.session.upgrades++;
    if (info.tier === 5) this.session.tier5++;
    this.computeBase(t); this.refreshAll();
    this.particles.burst(t.x, t.y, 24, { color: '#ffe066', speed: 160, life: 0.6, shape: 'square' });
    this.rings.push({ x: t.x, y: t.y, r: 10, max: 60, life: 0.4, color: '#ffe066' });
    return true;
  }

  sellValue(t) { return this.sandbox ? t.spent : Math.floor(t.spent * (SELL_RATE + this.G.sell)); }
  sell(t) {
    if (this.mods.has('nosell') && !this.sandbox) return false;
    const v = this.sellValue(t);
    if (t.owner === 1) this.cash2 += v; else this.cash += v;
    this.towers = this.towers.filter((x) => x !== t);
    this.traps = this.traps.filter((x) => x.t !== t);
    this.particles.burst(t.x, t.y, 12, { color: '#ffd700', speed: 100 });
    this.refreshAll(); return true;
  }

  fusionFor(t) {
    if (t.hero || t.fusion) return null;
    for (const f of FUSIONS) {
      if (t.def.id !== f.a && t.def.id !== f.b) continue;
      const other = t.def.id === f.a ? f.b : f.a;
      const partner = this.towers.find((o) => o !== t && !o.fusion && o.def.id === other && dist2(o.x, o.y, t.x, t.y) < 110 ** 2);
      if (partner && Math.max(...t.tiers, ...partner.tiers) >= 3) return { recipe: f, partner, cost: this.price(f.cost) };
    }
    return null;
  }
  fuse(t) {
    const info = this.fusionFor(t); if (!info || !this.spend(info.cost)) return null;
    const { recipe: f, partner } = info;
    this.towers = this.towers.filter((x) => x !== t && x !== partner);
    const def = { id: 'fusion:' + f.id, name: f.name, emoji: f.emoji, color: f.color, kind: f.stats.kind, paths: [FUSION_PATH], desc: 'A fused tower of immense power.' };
    const nt = this.makeTower(def, (t.x + partner.x) / 2, (t.y + partner.y) / 2);
    nt.fusion = f; nt.spent = t.spent + partner.spent + info.cost; nt.pops = t.pops + partner.pops; this.computeBase(nt);
    this.towers.push(nt); this.session.fusions++;
    this.particles.burst(nt.x, nt.y, 60, { color: f.color, speed: 260, life: 0.9, shape: 'square' });
    this.shake = Math.max(this.shake, 8); this.flash = 0.4; this.refreshAll();
    return nt;
  }

  // ═════════════════════════ WAVES ═════════════════════════
  startWave() {
    if (this.over || (this.waveActive && this.queue.length)) return false;
    this.wave++;
    const w = genWave(this.wave, this.seed, { allPhase: this.mods.has('phase'), allRegen: this.mods.has('regen'), elite: this.mods.has('elite'), phase: this.W.phase || 0 });
    this.queue = [];
    for (const g of w.groups) for (let i = 0; i < g.count; i++) {
      const pi = g.flags.boss ? 0 : (this.altPath++) % this.paths.length;
      this.queue.push({ t: g.delay + i * g.gap, type: g.type, flags: g.flags, pi });
    }
    this.queue.sort((a, b) => b.t - a.t); // pop from the end
    this.spawnT = 0; this.waveActive = true; this.currentWave = w;
    this.emit('wave', w);
    return true;
  }

  enemyHpScale(def) {
    const es = endlessScale(this.wave).hp;
    let s = this.diff.hpX * es * (1 + this.G.enemyHp);
    if (def.big && this.mods.has('tough')) s *= 1.5;
    if (this.wave > 60 && def.big) s *= 1 + (this.wave - 60) * 0.02;
    return s;
  }

  spawnEnemy(type, pi, d, flags = {}, origin = null) {
    if (this.enemies.length >= MAX_ENEMIES) return null;
    const def = ENEMIES[type];
    let hp = def.hp;
    if (def.boss) hp = 520 * Math.pow(Math.max(20, flags.bossWave || this.wave) / 20, 2.3) * (BOSS_HP[type] || 1) * this.diff.hpX * (this.mods.has('tough') ? 1.5 : 1);
    else if (def.hp > 1) hp = def.hp * this.enemyHpScale(def);
    if (flags.fortified) hp *= 2;
    let speed = def.speed * this.diff.speedX * endlessScale(this.wave).speed * (flags.swift ? 1.45 : 1) * (this.mods.has('fast') ? 1.25 : 1);
    const e = { id: NEXT_ID++, type, def, hp, maxHp: hp, d, pi, x: -100, y: -100, a: 0, r: def.r, baseSpeed: speed, curSpeed: speed,
      phase: !!flags.phase && !def.big, regen: !!flags.regen && !def.big, fortified: !!flags.fortified, swift: !!flags.swift,
      shiny: !def.big && !def.rare && this.rng() < 1 / 600, slowF: 0, slowT: 0, stunT: 0, dot: 0, dotT: 0, dotTick: 0, dotType: null, dotSrc: null,
      armor: def.armor || 0, brittle: false, shieldT: 0, half: false, phaseIdx: 0, aiT: 1 + this.rng() * 3, regenT: 0, origin: origin || type,
      dead: false, jump: 0, wob: this.rng() * TAU, rank: rbe(type), pumpkin: this.season?.id === 'spooky' && this.rng() < 0.15, flags };
    if (def.boss) { e.boss = true; this.boss = e; this.emit('boss', e); this.shake = 14; this.flash = 0.5; }
    this.paths[pi].posAt(d, e);
    this.enemies.push(e); return e;
  }

  // ═════════════════════════ MAIN LOOP ═════════════════════════
  /** Advance by real elapsed time; runs fixed steps. */
  tick(realDt) {
    if (this.paused || this.over) return;
    const steps = Math.min(12, Math.round((realDt / STEP) * this.speed)) || (this.speed > 0 ? 1 : 0);
    for (let i = 0; i < steps && !this.over; i++) this.step(STEP);
  }

  step(dt) {
    this.time += dt;
    // spawning
    if (this.waveActive) {
      this.spawnT += dt;
      while (this.queue.length && this.queue[this.queue.length - 1].t <= this.spawnT) {
        const q = this.queue.pop(); this.spawnEnemy(q.type, q.pi, 0, q.flags.boss ? { ...q.flags, bossWave: this.wave } : q.flags);
      }
    }
    this.updateEnemies(dt);
    this.buildGrid();
    this.buffT -= dt; if (this.buffT <= 0) { this.buffT = 0.5; this.refreshAll(); }
    if (this.globalBuffT > 0) { this.globalBuffT -= dt; if (this.globalBuffT <= 0) this.refreshAll(); }
    for (const t of this.towers) this.updateTower(t, dt);
    this.updateProjectiles(dt);
    this.updateShells(dt);
    this.updateTraps(dt);
    this.updateMinions(dt);
    this.updateDelayed(dt);
    this.updateWeather(dt);
    // cleanup
    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);
    for (let i = this.beams.length - 1; i >= 0; i--) if ((this.beams[i].life -= dt) <= 0) this.beams.splice(i, 1);
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 10); if (r.life <= 0) this.rings.splice(i, 1); }
    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt * 30); this.flash = Math.max(0, this.flash - dt * 2);
    // wave end
    if (this.waveActive && !this.queue.length && !this.enemies.length) this.finishWave();
  }

  // ═════════════════════════ ENEMIES ═════════════════════════
  updateEnemies(dt) {
    const Wx = this.W || {}; const envSpeed = 1 + this.G.enemySpeed + (Wx.enemySpeed || 0);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const path = this.paths[e.pi];
      // status effects
      if (e.stunT > 0) e.stunT -= dt;
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 0; }
      if (e.shieldT > 0) e.shieldT -= dt;
      if (e.dotT > 0) {
        e.dotT -= dt; e.dotTick += dt;
        if (e.dotTick >= 0.25) { e.dotTick = 0; if (!e.def.immune?.includes(e.dotType)) this.damage(e, e.dot * 0.25 * (e.big ? (1 + this.G.boss) : 1), e.dotSrc); if (e.dead) continue; }
      }
      // regen: regrow toward origin
      if (e.regen && REGEN_PARENT[e.type] && REGEN_RANK[e.type] < (REGEN_RANK[e.origin] ?? -1)) {
        e.regenT += dt;
        if (e.regenT > 2.2) { e.regenT = 0; e.type = REGEN_PARENT[e.type]; e.def = ENEMIES[e.type]; e.hp = e.maxHp = e.def.hp; e.r = e.def.r; e.rank = rbe(e.type); e.baseSpeed = e.def.speed * this.diff.speedX * (e.swift ? 1.45 : 1); this.particles.burst(e.x, e.y, 5, { color: '#7CFC00', speed: 60 }); }
      }
      // movement
      let sp = e.baseSpeed * envSpeed;
      if (e.stunT > 0) sp = 0; else if (e.slowF > 0) sp *= 1 - e.slowF;
      e.curSpeed = sp;
      e.d += sp * dt;
      if (e.jump > 0) e.jump -= dt;
      // AI behaviours
      if (e.def.ai || e.boss) this.enemyAI(e, dt);
      if (e.d >= path.length) { this.leak(e); continue; }
      path.posAt(e.d, e);
    }
  }

  enemyAI(e, dt) {
    e.aiT -= dt;
    const ai = e.def.ai;
    if (ai === 'leap' && e.aiT <= 0 && e.stunT <= 0) { e.aiT = 3.5 + this.rng() * 2; e.d += 75; e.jump = 0.4; }
    else if (ai === 'heal' && e.aiT <= 0) {
      e.aiT = 2.5; this.rings.push({ x: e.x, y: e.y, r: 5, max: 90, life: 0.5, color: '#7CFC00' });
      for (const o of this.near(e.x, e.y, 90)) {
        if (o === e) continue;
        if (o.big && !o.boss) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.05);
        else if (REGEN_RANK[o.type] != null && !o.regen) { o.regen = true; o.origin = 'jelly'; }
      }
    } else if (ai === 'emp' && e.aiT <= 0) {
      e.aiT = 6; this.rings.push({ x: e.x, y: e.y, r: 5, max: 115, life: 0.6, color: '#ff4d6d' });
      for (const t of this.towers) if (dist2(t.x, t.y, e.x, e.y) < 115 ** 2) t.stun = 1.5;
    }
    if (e.boss) this.bossAI(e, dt);
  }

  bossAI(e, dt) {
    const frac = e.hp / e.maxHp, phases = e.def.phases;
    if (e.phaseIdx < phases.length && frac < phases[e.phaseIdx]) { e.phaseIdx++; this.bossPhase(e, e.phaseIdx); }
    if (e.type === 'chrono' && e.aiT <= 0) { e.aiT = 8; e.d += 35; this.particles.burst(e.x, e.y, 20, { color: '#4fc3f7', speed: 200 }); }
    if (e.type === 'hydra' && e.phaseIdx > 0 && this.time - (e.lastHit || 0) > 2) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.004 * dt);
    if (e.type === 'abyss' && e.phaseIdx === 1 && e.aiT <= 0) { e.aiT = 6; this.spawnEnemy('royal', e.pi, Math.max(0, e.d - 40), {}); }
  }

  bossPhase(e, idx) {
    this.shake = 12; this.flash = 0.3; this.emit('bossPhase', { e, idx });
    const behind = (type, n, flags = {}) => { for (let i = 0; i < n; i++) this.spawnEnemy(type, e.pi, Math.max(0, e.d - 30 - i * 14), flags); };
    if (e.type === 'hydra') {
      const early = this.wave < 40;
      if (idx === 1) { behind(early ? 'prism' : 'crystal', early ? 5 : 8); this.toast('🌿 The Hydra sprouts new heads!'); }
      if (idx === 2) { behind(early ? 'shell' : 'titan', early ? 6 : 2); e.baseSpeed *= 1.3; this.toast('🌿 The Hydra is enraged!'); }
    } else if (e.type === 'chrono') {
      e.shieldT = 2.5; e.d += 70;
      for (const t of this.towers) if (dist2(t.x, t.y, e.x, e.y) < 230 ** 2) t.stun = 2.5;
      behind(this.wave < 50 ? 'prism' : 'crystal', 3 * idx);
      this.toast('⏳ Chrono Slime warps time!');
    } else if (e.type === 'abyss') {
      if (idx === 1) { e.half = true; e.aiT = 2; this.toast('👑 The Abyss King raises a void shield! (-50% damage)'); }
      if (idx === 2) { e.half = false; e.baseSpeed *= 1.8; behind('colossus', 1); this.toast('👑 The Abyss King is ENRAGED!'); }
    }
  }

  leak(e) {
    e.dead = true;
    if (e.def.noLeak) { this.toast(`${e.def.name} escaped!`); return; }
    if (this.sandbox) return;
    let loss = e.boss ? Math.ceil(25 + 200 * (e.hp / e.maxHp)) : Math.ceil(rbe(e.type) * (e.hp / e.maxHp * 0.5 + 0.5));
    if (e.boss) this.boss = null;
    this.lives -= loss; this.leakedThisGame += loss; this.shake = Math.max(this.shake, 6);
    this.emit('leak', loss);
    if (this.lives <= 0) {
      if (this.G.revive && !this.reviveUsed) { this.reviveUsed = true; this.lives = this.G.revive; this.toast('🪶 Phoenix Feather! Revived!'); this.flash = 0.8; return; }
      this.lives = 0; this.gameOver(false);
    }
  }

  // ═════════════════════════ SPATIAL GRID ═════════════════════════
  buildGrid() {
    for (const c of this.grid) c.length = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const cx = clamp(Math.floor(e.x / CELL) + 1, 0, COLS - 1), cy = clamp(Math.floor(e.y / CELL) + 1, 0, ROWS - 1);
      this.grid[cy * COLS + cx].push(e);
    }
  }
  /** Enemies whose body intersects circle (x,y,r). */
  near(x, y, r) {
    const out = [], pad = 60;
    const x0 = clamp(Math.floor((x - r - pad) / CELL) + 1, 0, COLS - 1), x1 = clamp(Math.floor((x + r + pad) / CELL) + 1, 0, COLS - 1);
    const y0 = clamp(Math.floor((y - r - pad) / CELL) + 1, 0, ROWS - 1), y1 = clamp(Math.floor((y + r + pad) / CELL) + 1, 0, ROWS - 1);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) for (const e of this.grid[cy * COLS + cx]) {
      if (!e.dead && dist2(x, y, e.x, e.y) <= (r + e.r) ** 2) out.push(e);
    }
    return out;
  }
  onScreen(e) { return e.x > -5 && e.y > -5 && e.x < W + 5 && e.y < H + 5; }

  pickTarget(t, list) {
    const mode = TARGET_MODES[t.target]; let best = null, bv = -Infinity;
    for (const e of list) {
      if (e.dead || (e.phase && !t.eff.detect) || !this.onScreen(e)) continue;
      const rem = this.paths[e.pi].length - e.d;
      const v = mode === 'first' ? -rem : mode === 'last' ? rem : mode === 'strong' ? e.rank * 1000 + e.hp : -dist2(t.x, t.y, e.x, e.y);
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }

  // ═════════════════════════ DAMAGE ═════════════════════════
  /** A hit from a tower's attack: immunity, crits, armor, statuses, then damage. */
  hit(e, dmg, s, t, x, y) {
    if (e.dead) return false;
    if (e.def.immune?.includes(s.dtype)) { if (this.rng() < 0.05) this.particles.text(e.x, e.y - 12, 'IMMUNE', '#bbb', 11); return false; }
    if (e.shieldT > 0) { if (this.rng() < 0.1) this.particles.text(e.x, e.y - 20, 'WARPED', '#4fc3f7', 12); return false; }
    // statuses
    if (s.slow) { const f = e.boss ? (s.bossSlow ? 0.5 : 0.2) : e.big ? (s.bossSlow ? 0.8 : 0.5) : 1; e.slowF = Math.max(e.slowF, Math.min(0.9, s.slow) * f); e.slowT = Math.max(e.slowT, s.slowT || 1); }
    if (s.stun) { const f = e.boss ? 0.12 : e.big ? 0.4 : 1; e.stunT = Math.max(e.stunT, s.stun * f); }
    if (s.dot) { if (s.dot >= e.dot || e.dotT <= 0) { e.dot = s.dot * (t?.eff?.dmgMul || 1); e.dotType = s.dtype; e.dotSrc = t; } e.dotT = Math.max(e.dotT, s.dotT || 2); }
    if (s.knock && (!e.big || s.bossKnock)) e.d = Math.max(0, e.d - s.knock * (e.boss ? 0.2 : e.big ? 0.5 : 1));
    if (s.shred && e.armor > 0) e.armor = Math.max(0, e.armor - s.shred);
    if (s.brittle) e.brittle = true;
    if (s.strip) { e.phase = false; e.regen = false; }
    if (dmg <= 0) return true;
    let d = dmg * (s.dmgMul || 1);
    if (s.crit && this.rng() < s.crit) { d *= s.critMul || 2; if (this.rng() < 0.3) this.particles.text(e.x, e.y - 14, 'CRIT!', '#ffeb3b', 13); }
    const Wx = this.W || {}; d *= 1 + (this.G[s.dtype] || 0) + (Wx[s.dtype] || 0);
    if (e.big) d *= 1 + (s.boss || 0) + this.G.boss;
    if (e.brittle) d += 1;
    if (e.armor > 0 && !s.ap) { const raw = d; d = Math.max(raw * 0.25, raw - e.armor * 1.5); if (d < raw * 0.3 && this.rng() < 0.04) this.particles.text(e.x, e.y - 12, 'ARMOR', '#ccc', 11); }
    if (e.half) d *= 0.5;
    this.damage(e, d, t);
    return true;
  }

  damage(e, d, t) {
    if (e.dead) return;
    e.hp -= d; e.regenT = 0; e.lastHit = this.time;
    if (t) t.dmgDone += d;
    if (e.hp <= 1e-6) this.pop(e, -e.hp, t);
  }

  pop(e, overflow, t) {
    e.dead = true;
    const def = e.def, s = this.session;
    // cash
    let cash = (def.cash || 1) * this.popCashMul() * (1 + (t?.buffs?.bounty || 0));
    if (def.rare) { cash = def.cash * (1 + this.wave / 30); s.goldens++; this.toast(`🪙 Golden Slime popped! +$${Math.floor(cash)}`); }
    this.gain(cash); s.pops++;
    if (def.secret) { s.ducks++; this.hooks.sfx?.('quack'); }
    if (t) {
      t.pops++; s.mastery[t.def.id] = (s.mastery[t.def.id] || 0) + 1;
      if (t.stars < VET_STARS.length && t.pops >= VET_STARS[t.stars]) { t.stars++; this.refreshTower(t); this.particles.text(t.x, t.y - 26, '★'.repeat(t.stars), '#ffd54f', 16); }
      if (t.hero) this.heroXp(t, 1);
      if (t.base.gemChance && this.rng() < t.base.gemChance) { s.gems++; this.particles.text(e.x, e.y, '💎', '#fff', 16); }
    }
    // loot
    const loot = 1 + this.G.loot;
    if (this.rng() < 0.012 * loot * (this.season?.fx?.gel || 1)) s.res.gel++;
    if ((e.type === 'crystal' || e.type === 'prism') && this.rng() < 0.05 * loot) s.res.crystal++;
    if (e.type === 'ember' && this.rng() < 0.05 * loot) s.res.ember++;
    if ((e.pumpkin || this.season?.fx?.candy) && this.rng() < (e.pumpkin ? 0.3 : 0.003)) s.res.candy++;
    if (e.shiny) { s.shinies++; s.gems += 5; this.particles.text(e.x, e.y - 10, '✨ +5💎', '#fff59d', 15); }
    if (def.big) { s.behemoths++; this.shake = Math.max(this.shake, def.boss ? 16 : 4); this.hooks.sfx?.('boom'); }
    if (def.boss) {
      s.bosses++; s.res.star += 5 + Math.floor(this.wave / 10); if (e.type === 'abyss') s.abyssKills++;
      this.boss = null; this.flash = 0.8; this.emit('bossDefeated', e); this.toast(`🏆 ${def.name} defeated!`);
    }
    // visuals
    const col = def.color === 'rainbow' ? `hsl(${(this.time * 300) % 360},90%,60%)` : def.color;
    this.particles.burst(e.x, e.y, def.big ? 26 : 5, { color: col, speed: def.big ? 220 : 110, life: def.big ? 0.8 : 0.35, size: def.big ? 7 : 3.5 });
    this.hooks.sfx?.('pop');
    // children (layered slimes)
    let first = true;
    const kids = def.boss && this.wave <= 25 ? ['prism', 'prism', 'prism'] : def.children;
    for (let i = 0; i < kids.length; i++) {
      const c = this.spawnEnemy(kids[i], e.pi, Math.max(0, e.d - i * 7), { phase: e.phase, regen: e.regen, fortified: e.fortified && ENEMIES[kids[i]].big, swift: e.swift }, REGEN_RANK[e.origin] != null ? e.origin : kids[i]);
      if (!c) break;
      c.slowF = e.slowF; c.slowT = e.slowT; c.dot = e.dot; c.dotT = e.dotT; c.dotType = e.dotType; c.dotSrc = e.dotSrc; c.brittle = e.brittle;
      if (first && overflow > 0) { first = false; this.damage(c, overflow, t); }
    }
  }

  // ═════════════════════════ TOWERS ═════════════════════════
  updateTower(t, dt) {
    if (t.frenzyT > 0) { t.frenzyT -= dt; if (t.frenzyT <= 0) this.refreshTower(t); }
    for (const a of t.abilities) if (t.abilityCds[a.name] > 0) t.abilityCds[a.name] -= dt;
    if (t.recoil > 0) t.recoil -= dt * 4;
    if (t.stun > 0) { t.stun -= dt; return; }
    const s = t.eff;
    // orbiting blades (Bladewheel, Arcane Orrery path 2)
    if (s.kind === 'orbit' || (s.orbit && s.blades)) this.updateOrbit(t, dt);
    if (s.kind === 'orbit' || s.kind === 'support' || s.kind === 'farm') return;
    t.cd -= dt;
    if (t.cd > 0) return;
    switch (s.kind) {
      case 'proj': case 'beam': case 'mortar': {
        const list = s.range > 2000 ? this.enemies : this.near(t.x, t.y, s.range);
        const target = this.pickTarget(t, list);
        if (!target) { t.cd = 0.05; return; }
        t.angle = Math.atan2(target.y - t.y, target.x - t.x); t.recoil = 1;
        if (s.kind === 'proj') this.fireProj(t, target); else if (s.kind === 'beam') this.fireBeam(t, target); else this.fireMortar(t, target, list);
        t.cd = s.rate; break;
      }
      case 'aoe': {
        const list = this.near(t.x, t.y, s.range).filter((e) => this.onScreen(e));
        if (!list.length) { t.cd = 0.05; return; }
        let targets = list;
        if (s.cone) {
          const tg = this.pickTarget(t, list); if (!tg) { t.cd = 0.05; return; }
          t.angle = Math.atan2(tg.y - t.y, tg.x - t.x);
          targets = list.filter((e) => { let da = Math.atan2(e.y - t.y, e.x - t.x) - t.angle; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.abs(da) < 0.6; });
          for (let i = 0; i < 3; i++) this.particles.spawn(t.x, t.y, { a: t.angle + (this.rng() - 0.5) * 1.1, speed: s.range * 2.2, life: 0.4, color: i ? '#ffb347' : '#ff5722', size: 6, drag: 1 });
        } else this.rings.push({ x: t.x, y: t.y, r: 8, max: s.range, life: 0.35, color: t.def.color });
        let n = 0;
        for (const e of targets) { if (n++ >= s.pierce) break; this.hit(e, s.dmg, s, t); }
        if (s.frag) this.frag(t, t.x, t.y, s.frag);
        if (s.dtype === 'ice') this.hooks.sfx?.('freeze');
        t.cd = s.rate; t.recoil = 1; break;
      }
      case 'aura': {
        const list = this.near(t.x, t.y, s.range); let n = 0;
        for (const e of list) { if (n++ >= s.pierce) break; this.hit(e, s.dmg, s, t); }
        t.cd = s.rate; break;
      }
      case 'trap': {
        if (t.traps < (s.trapMax || 10) && t.pathSamples.length) {
          const r2 = s.range * s.range, cand = t.pathSamples.filter((p) => dist2(p.x, p.y, t.x, t.y) <= r2);
          if (cand.length) {
            const p = cand[Math.floor(this.rng() * cand.length)];
            this.traps.push({ x: p.x + (this.rng() - 0.5) * 16, y: p.y + (this.rng() - 0.5) * 16, uses: s.trapPierce || s.pierce, t, s, hit: new Set(), life: 90, born: this.time });
            t.traps++;
          }
        }
        t.cd = s.rate; break;
      }
      case 'summon': {
        if (t.minions < s.mMax) this.spawnMinion(t, { hp: s.mHp, dmg: s.mDmg, speed: s.mSpeed, r: s.mR, emoji: s.mEmoji || '🤖', boom: s.mBoom, chain: s.mChain });
        t.cd = s.rate; break;
      }
    }
  }

  fireProj(t, target) {
    const s = t.eff, n = s.count || 1;
        for (let i = 0; i < n; i++) {
      // spread = total arc in degrees across all projectiles
      const arc = ((s.spread || 6 * (n - 1)) * Math.PI) / 180;
      const a = s.radial ? t.angle + (i / n) * TAU : t.angle + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0);
      const life = s.returning ? 3 : (s.range * 1.35) / s.speed + 0.1;
      this.projectiles.push({ x: t.x + Math.cos(a) * 16, y: t.y + Math.sin(a) * 16, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, a,
        dmg: s.dmg, pierce: s.pierce, s, t, life, r: s.pr || 5, hit: [], target: s.homing ? target : null, ret: s.returning ? 0 : -1, travel: 0, maxTravel: s.range * 1.05, shape: s.shape, color: t.def.color });
    }
    this.hooks.sfx?.('shoot');
  }

  fireBeam(t, target) {
    const s = t.eff;
    const hits = [];
    if (s.line) {
      const len = Math.min(s.range, 1600), ex = t.x + Math.cos(t.angle) * len, ey = t.y + Math.sin(t.angle) * len;
      const list = (s.range > 2000 ? this.enemies : this.near(t.x, t.y, s.range)).filter((e) => !e.dead && segDist2(e.x, e.y, t.x, t.y, ex, ey) < (e.r + 7) ** 2);
      list.sort((a, b) => dist2(a.x, a.y, t.x, t.y) - dist2(b.x, b.y, t.x, t.y));
      for (const e of list.slice(0, s.pierce)) { this.hit(e, s.dmg, s, t); hits.push(e); }
      this.beams.push({ pts: [t.x, t.y, ex, ey], color: t.def.color, life: 0.12, w: 4 });
    } else {
      this.hit(target, s.dmg, s, t); hits.push(target);
      this.beams.push({ pts: s.sniper ? [target.x, target.y - 60, target.x, target.y] : [t.x, t.y, target.x, target.y], color: s.dtype === 'energy' ? '#fff59d' : t.def.color, life: 0.1, w: s.sniper ? 3 : 2.5, zig: s.dtype === 'energy' });
      if (s.sniper) this.particles.burst(target.x, target.y, 4, { color: '#fff', speed: 140, shape: 'spark', life: 0.2 });
    }
    // chain lightning
    let last = hits[hits.length - 1] || target;
    const chained = new Set(hits.map((h) => h.id));
    for (let c = 0; c < (s.chain || 0) && last; c++) {
      let best = null, bd = (s.chainR || 80) ** 2;
      for (const e of this.near(last.x, last.y, s.chainR || 80)) { if (chained.has(e.id) || e.dead) continue; const d = dist2(e.x, e.y, last.x, last.y); if (d < bd) { bd = d; best = e; } }
      if (!best) break;
      chained.add(best.id);
      this.beams.push({ pts: [last.x, last.y, best.x, best.y], color: s.dtype === 'energy' ? '#fff59d' : t.def.color, life: 0.12, w: 2, zig: true });
      this.hit(best, s.dmg, s, t); last = best;
    }
    if (s.frag) this.frag(t, target.x, target.y, s.frag);
    if (s.dtype === 'energy') this.hooks.sfx?.('zap'); else this.hooks.sfx?.('shoot');
  }

  fireMortar(t, target, list) {
    const s = t.eff, n = s.count || 1;
    const vis = list.filter((e) => !e.dead && (!e.phase || s.detect) && this.onScreen(e));
    for (let i = 0; i < n; i++) {
      const tg = s.random ? vis[Math.floor(this.rng() * vis.length)] : (i === 0 ? target : vis[Math.floor(this.rng() * vis.length)]);
      if (!tg) continue;
      const p = this.paths[tg.pi].posAt(tg.d + tg.curSpeed * (s.delay || 0.5), {});
      this.shells.push({ sx: t.x, sy: t.y, x: p.x + (this.rng() - 0.5) * 12, y: p.y + (this.rng() - 0.5) * 12, time: 0, delay: (s.delay || 0.5) + i * 0.06, s, t, star: s.random });
    }
  }

  frag(t, x, y, n) {
    const s = { ...t.eff, dmg: Math.max(1, Math.floor(t.eff.dmg / 2)), splash: 0, dot: 0, homing: false };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + this.rng() * 0.3;
      this.projectiles.push({ x, y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, a, dmg: s.dmg, pierce: 1, s, t, life: 0.25, r: 3, hit: [], target: null, ret: -1, travel: 0, maxTravel: 999, shape: 'shard', color: '#ddd' });
    }
  }

  explode(x, y, r, s, t, pierce = 40) {
    let n = 0;
    for (const e of this.near(x, y, r)) { if (n++ >= pierce) break; this.hit(e, s.dmg, s, t); }
    this.rings.push({ x, y, r: 4, max: r, life: 0.3, color: s.dtype === 'fire' ? '#ff7043' : s.dtype === 'magic' ? '#b39ddb' : '#ffcc80' });
    this.particles.burst(x, y, 8, { color: s.dtype === 'fire' ? '#ff7043' : '#ffcc80', speed: r * 3, life: 0.35, size: 5 });
    this.shake = Math.max(this.shake, Math.min(5, r / 18));
    this.hooks.sfx?.('boom');
    if (s.cluster) for (let i = 0; i < s.cluster; i++) {
      const a = this.rng() * TAU, d = r * (0.6 + this.rng() * 0.8);
      this.delayed.push({ t: 0.15 + this.rng() * 0.2, fn: () => this.explode(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.55, { ...s, cluster: 0, frag: 0 }, t, 12) });
    }
    if (s.frag) this.frag(t, x, y, s.frag);
  }

  updateProjectiles(dt) {
    const P = this.projectiles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life -= dt;
      // homing
      if (p.target) {
        if (p.target.dead) { const near = this.near(p.x, p.y, 220).filter((e) => !e.phase || p.s.detect); p.target = near[0] || null; }
        if (p.target) {
          const want = Math.atan2(p.target.y - p.y, p.target.x - p.x), cur = Math.atan2(p.vy, p.vx);
          let da = want - cur; da = Math.atan2(Math.sin(da), Math.cos(da));
          const na = cur + clamp(da, -9 * dt, 9 * dt), sp = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        }
      }
      // boomerang
      if (p.ret === 0) { p.travel += Math.hypot(p.vx, p.vy) * dt; if (p.travel >= p.maxTravel) { p.ret = 1; p.hit.length = 0; } }
      else if (p.ret === 1) {
        const want = Math.atan2(p.t.y - p.y, p.t.x - p.x), sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx);
        let da = want - cur; da = Math.atan2(Math.sin(da), Math.cos(da)); const na = cur + clamp(da, -7 * dt, 7 * dt);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        if (dist2(p.x, p.y, p.t.x, p.t.y) < 400) p.life = 0;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.a += dt * 14;
      if (p.life <= 0 || p.x < -60 || p.y < -60 || p.x > W + 60 || p.y > H + 60) { this.killProj(i); continue; }
      // collision
      const list = this.near(p.x, p.y, p.r);
      for (const e of list) {
        if (p.hit.includes(e.id)) continue;
        p.hit.push(e.id);
        if (p.s.splash > 0) { this.explode(p.x, p.y, p.s.splash, p.s, p.t, Math.max(30, p.s.pierce * 8)); p.pierce--; }
        else { this.hit(e, p.dmg, p.s, p.t); p.pierce--; }
        if (p.pierce <= 0) break;
      }
      if (p.pierce <= 0) this.killProj(i);
    }
  }
  killProj(i) { const P = this.projectiles; P[i] = P[P.length - 1]; P.pop(); }

  updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i]; sh.time += dt;
      if (sh.time >= sh.delay) { this.explode(sh.x, sh.y, sh.s.splash, sh.s, sh.t, sh.s.pierce); this.shells.splice(i, 1); }
    }
  }

  updateTraps(dt) {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i]; tr.life -= dt;
      if (tr.uses > 0) for (const e of this.near(tr.x, tr.y, 14)) {
        if (tr.hit.has(e.id)) continue; tr.hit.add(e.id);
        if (tr.s.splash) { this.explode(tr.x, tr.y, tr.s.splash, tr.s, tr.t, 30); tr.uses = 0; break; }
        this.hit(e, tr.s.dmg, tr.s, tr.t); if (--tr.uses <= 0) break;
      }
      if (tr.uses <= 0 || tr.life <= 0) { tr.t.traps--; this.traps.splice(i, 1); }
    }
  }

  updateOrbit(t, dt) {
    const s = t.eff, n = s.blades || 1, R = s.orbitR || 50;
    t.orbA += (s.spin || 3) * dt * (t.frenzyT > 0 ? 2 : 1);
    t.flingT = (t.flingT || 0) - dt;
    for (let i = 0; i < n; i++) {
      const a = t.orbA + (i / n) * TAU, bx = t.x + Math.cos(a) * R, by = t.y + Math.sin(a) * R;
      for (const e of this.near(bx, by, 12)) {
        const last = t.orbHits.get(e.id) || -9;
        if (this.time - last < s.rate) continue;
        t.orbHits.set(e.id, this.time); this.hit(e, s.dmg, s, t);
      }
      if (s.fling && t.flingT <= 0 && i < s.fling) {
        this.projectiles.push({ x: bx, y: by, vx: Math.cos(a + Math.PI / 2) * 450, vy: Math.sin(a + Math.PI / 2) * 450, a, dmg: s.dmg, pierce: 2, s: { ...s, splash: 0 }, t, life: 0.5, r: 4, hit: [], target: null, ret: -1, travel: 0, maxTravel: 999, shape: 'shard', color: '#cfd8dc' });
      }
    }
    if (s.fling && t.flingT <= 0) t.flingT = 1.2;
    if (t.orbHits.size > 400) t.orbHits.clear();
  }

  spawnMinion(t, o) {
    const pi = Math.floor(this.rng() * this.paths.length), path = this.paths[pi];
    this.minions.push({ t, pi, d: path.length, x: 0, y: 0, hp: o.hp, maxHp: o.hp, dmg: o.dmg, speed: o.speed, r: o.r || 12, emoji: o.emoji, boom: o.boom, chain: o.chain, hits: new Map(), big: o.big });
    t.minions++;
  }
  updateMinions(dt) {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i], path = this.paths[m.pi];
      m.d -= m.speed * dt; path.posAt(m.d, m);
      for (const e of this.near(m.x, m.y, m.r)) {
        const last = m.hits.get(e.id) || -9; if (this.time - last < 0.4) continue;
        m.hits.set(e.id, this.time);
        this.hit(e, m.dmg, m.t.eff, m.t);
        if (m.chain) { let from = e; for (let c = 0; c < m.chain; c++) { const nx = this.near(from.x, from.y, 80).find((o) => o !== from && !o.dead); if (!nx) break; this.beams.push({ pts: [from.x, from.y, nx.x, nx.y], color: '#fff59d', life: 0.1, w: 2, zig: true }); this.hit(nx, m.dmg, m.t.eff, m.t); from = nx; } }
        m.hp -= e.boss ? 25 : e.big ? 6 : 1;
        if (m.hp <= 0) break;
      }
      if (m.hp <= 0 || m.d <= 0) {
        if (m.boom) this.explode(m.x, m.y, m.boom, { ...m.t.eff, dmg: m.dmg * 3, cluster: 0, frag: 0 }, m.t, 60);
        else this.particles.burst(m.x, m.y, 8, { color: '#bdbdbd', speed: 100 });
        if (!m.special) m.t.minions--;
        this.minions.splice(i, 1);
      }
    }
  }

  updateDelayed(dt) {
    for (let i = this.delayed.length - 1; i >= 0; i--) { const d = this.delayed[i]; d.t -= dt; if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); } }
  }

  updateWeather(dt) {
    if (!this.W?.lightning || !this.waveActive) return;
    this.lightningT -= dt;
    if (this.lightningT <= 0) {
      this.lightningT = 2.5 + this.rng() * 3;
      const vis = this.enemies.filter((e) => this.onScreen(e)); if (!vis.length) return;
      const e = vis[Math.floor(this.rng() * vis.length)];
      this.beams.push({ pts: [e.x + 30, -10, e.x - 10, e.y * 0.5, e.x, e.y], color: '#fffde7', life: 0.18, w: 4, zig: true });
      this.flash = Math.max(this.flash, 0.25);
      this.explode(e.x, e.y, 40, { dmg: 3 + this.wave * 0.4, dtype: 'energy', ap: true }, null, 20);
    }
  }

  // ═════════════════════════ HERO ═════════════════════════
  heroXp(t, amount) {
    if (t.level >= 20) return;
    t.xp += amount * (1 + this.G.heroXp);
    while (t.level < 20 && t.xp >= heroXpFor(t.level)) {
      t.xp -= heroXpFor(t.level); t.level++;
      this.computeBase(t); this.particles.text(t.x, t.y - 30, `LEVEL ${t.level}!`, '#80deea', 16);
      this.particles.burst(t.x, t.y, 20, { color: t.def.color, speed: 150 });
    }
  }

  // ═════════════════════════ ABILITIES ═════════════════════════
  /** All ready/charging abilities on the field (for the HUD). */
  abilityList() {
    const out = [];
    for (const t of this.towers) for (const a of t.abilities) out.push({ t, a, cd: Math.max(0, t.abilityCds[a.name]), max: a.cd * (1 - this.G.abilityCd) });
    return out;
  }

  useAbility(t, a) {
    if (t.abilityCds[a.name] > 0 || this.over) return false;
    t.abilityCds[a.name] = a.cd * (1 - this.G.abilityCd);
    this.session.abilitiesUsed++; this.hooks.sfx?.('ability');
    const vis = () => this.enemies.filter((e) => !e.dead && this.onScreen(e));
    const strongest = () => vis().sort((a, b) => b.rank * 1e6 + b.hp - (a.rank * 1e6 + a.hp))[0];
    const s = { ...t.eff, dmg: a.dmg || 0, ap: a.ap ?? true, slow: 0, stun: 0, dot: 0, knock: 0, splash: 0, cluster: 0, frag: 0, crit: 0 };
    switch (a.id) {
      case 'frenzy': t.frenzyT = a.dur; t.frenzyX = a.x; this.refreshTower(t); this.rings.push({ x: t.x, y: t.y, r: 10, max: 80, life: 0.5, color: '#ff5252' }); break;
      case 'nuke':
        if (a.single) { const e = strongest(); if (e) { this.beams.push({ pts: [e.x, -20, e.x, e.y], color: '#fff', life: 0.3, w: 10 }); this.hit(e, a.dmg, s, t); } }
        else { for (const e of vis()) this.hit(e, a.dmg, s, t); this.flash = 0.6; }
        this.shake = 12; break;
      case 'freeze': for (const e of this.enemies) e.stunT = Math.max(e.stunT, a.dur * (e.boss ? 0.25 : e.big ? 0.6 : 1)); this.flash = 0.3; this.hooks.sfx?.('freeze'); break;
      case 'cash': { const c = a.cash * (a.scale ? 1 + this.wave / 15 : 1); this.gain(c); this.particles.text(t.x, t.y - 30, `+$${Math.floor(c)}`, '#ffd54f', 20); this.hooks.sfx?.('coin'); break; }
      case 'meteor': { const e = strongest(); if (e) { this.shells.push({ sx: e.x, sy: -40, x: e.x, y: e.y, time: 0, delay: 0.5, s: { ...s, splash: a.r || 120, pierce: 500, dtype: 'fire' }, t, star: true }); } break; }
      case 'barrage': for (let i = 0; i < a.n; i++) this.delayed.push({ t: i * 0.05, fn: () => { const v = vis(); const e = v[Math.floor(this.rng() * v.length)]; if (e) this.explode(e.x, e.y, 34, { ...s, dmg: a.dmg }, t, 20); } }); break;
      case 'summon': { this.spawnMinion(t, { hp: a.hp, dmg: a.dmg, speed: 45, r: 22, emoji: t.hero ? '🦾' : '🤖', boom: 120, big: true }); t.minions--; this.minions[this.minions.length - 1].special = true; break; }
      case 'buff': this.globalBuffT = a.dur; this.globalBuffX = a.x; this.refreshAll(); this.flash = 0.25; break;
      case 'tsunami': for (const e of this.enemies) e.d = Math.max(0, e.d - a.push * (e.boss ? 0.15 : e.big ? 0.4 : 1)); this.flash = 0.3; this.shake = 8; break;
    }
    return true;
  }

  /** Consumable powers crafted in the Workshop. */
  usePower(id) {
    switch (id) {
      case 'cashdrop': this.gain(1000, false); break;
      case 'freezebomb': for (const e of this.enemies) e.stunT = Math.max(e.stunT, e.boss ? 1 : 4); this.flash = 0.4; break;
      case 'lifepotion': this.lives += 25; break;
      case 'meteor': { const e = this.enemies.filter((x) => this.onScreen(x)).sort((a, b) => b.rank - a.rank)[0]; if (!e) return false;
        this.shells.push({ sx: e.x, sy: -40, x: e.x, y: e.y, time: 0, delay: 0.6, s: { dmg: 2000, dtype: 'fire', ap: true, splash: 150, pierce: 500 }, t: null, star: true }); break; }
      default: return false;
    }
    return true;
  }

  // ═════════════════════════ WAVE END / GAME END ═════════════════════════
  finishWave() {
    this.waveActive = false; this.session.waves++;
    const bonus = (100 + this.wave) * (this.mods.has('poor') ? 0.5 : 1);
    if (!this.sandbox) { this.gain(bonus, false); if (this.cfg.coop) this.cash2 += bonus; }
    for (const t of this.towers) {
      const s = t.base;
      if (s.income) { const inc = s.income * (1 + this.G.farm); if (t.owner === 1) this.cash2 += inc; else this.gain(inc, false); this.particles.text(t.x, t.y - 20, `+$${Math.floor(inc)}`, '#ffd54f', 14); }
      if (s.bank) { const b = Math.min(this.cash, 15000) * s.bank; this.gain(b, false); }
      if (s.lifeRegen && !this.sandbox) this.lives += s.lifeRegen;
      if (t.hero) this.heroXp(t, 25 + this.wave * 6);
    }
    if (this.G.piggy) this.gain(this.G.piggy * Math.floor(this.wave / 10), false);
    this.emit('waveEnd', this.wave);
    if (this.wave % 10 === 0) this.rollWeather();
    if (this.wave >= this.endWave) { this.gameOver(true); return; }
    this.emit('checkpoint', this.serialize());
    if (this.autoStart) this.startWave();
  }

  gameOver(won) {
    if (this.over) return;
    this.over = true; this.won = won; this.waveActive = false;
    this.emit(won ? 'win' : 'lose', { wave: this.wave, perfect: this.leakedThisGame === 0 });
  }

  toast(msg) { this.emit('toast', msg); }

  // ═════════════════════════ SAVE / LOAD (checkpoint) ═════════════════════════
  serialize() {
    return { cfg: this.cfg, wave: this.wave, cash: this.cash, cash2: this.cash2, lives: this.lives, weather: this.weather, reviveUsed: this.reviveUsed,
      towers: this.towers.map((t) => ({ id: t.def.id, x: t.x, y: t.y, tiers: t.tiers, target: t.target, pops: t.pops, stars: t.stars, spent: t.spent, owner: t.owner, level: t.level, xp: t.xp, hero: t.hero?.id, fusion: t.fusion?.id })) };
  }
  restore(cp) {
    this.wave = cp.wave; this.cash = cp.cash; this.cash2 = cp.cash2 || 0; this.lives = cp.lives; this.reviveUsed = cp.reviveUsed;
    this.weather = cp.weather; this.W = WEATHER[this.weather].fx;
    for (const d of cp.towers) {
      let t;
      if (d.hero) { const h = HERO_MAP[d.hero]; const def = { id: 'hero:' + h.id, name: h.name, emoji: h.emoji, color: h.color, kind: h.base.kind, paths: [], desc: h.lore }; t = this.makeTower(def, d.x, d.y); t.hero = h; t.level = d.level; t.xp = d.xp; }
      else if (d.fusion) { const f = FUSION_MAP[d.fusion]; const def = { id: 'fusion:' + f.id, name: f.name, emoji: f.emoji, color: f.color, kind: f.stats.kind, paths: [FUSION_PATH], desc: '' }; t = this.makeTower(def, d.x, d.y); t.fusion = f; }
      else { const def = TOWER_MAP[d.id]; if (!def) continue; t = this.makeTower(def, d.x, d.y); }
      Object.assign(t, { tiers: d.tiers, target: d.target, pops: d.pops, stars: d.stars, spent: d.spent, owner: d.owner || 0 });
      this.computeBase(t); this.towers.push(t);
    }
    this.refreshAll();
  }
}

export { FUSION_PATH, TIER_INFO, RESEARCH };
