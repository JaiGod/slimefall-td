/**
 * save.js — player profile persistence.
 *
 *  • Versioned schema with forward migrations (never lose a player's save).
 *  • localStorage by default (works on Web, Capacitor WebView and Electron).
 *  • Export / import as a share code (manual cloud save, device transfer).
 *  • CloudAdapter interface: plug in Firebase / Supabase / PlayFab later
 *    without touching game code (see docs/BACKEND.md).
 */
import { encode, decode, dayKey, weekKey, mulberry32, hashStr } from './util.js';
import { ACHIEVEMENTS, QUEST_POOL, RELICS } from './data/meta.js';
import { xpForLevel, PRESTIGE_LEVEL } from './config.js';

const KEY = 'slimefall.profile';
const SCHEMA = 3;

export function defaultProfile() {
  return {
    schema: SCHEMA, created: Date.now(), name: 'Gardener',
    level: 1, xp: 0, prestige: 0, gems: 150, research: 0, candy: 0,
    researchLv: {}, relics: [], equipped: [], heroes: ['mossa'], hero: 'mossa',
    skins: ['default'], skin: 'default', trails: ['none'], trail: 'none',
    resources: { gel: 0, crystal: 0, ember: 0, star: 0, candy: 0 }, powers: { cashdrop: 1, freezebomb: 1, lifepotion: 0, meteor: 0 },
    medals: {},         // mapId -> { easy:true, normal:true, hard:true, chaos:true, endless: bestWave }
    mastery: {},        // towerId -> pops
    stats: {},          // lifetime counters (achievements & quests read these)
    achievements: {},   // id -> timestamp
    quests: { day: null, week: null, daily: [], weekly: [] },
    seen: {},           // story cutscenes shown
    leaderboard: {},    // local best scores
    daily: { last: null, streak: 0 },
    settings: { music: true, sfx: true, musicVol: 0.5, sfxVol: 0.6, shake: true, particles: 'high', autoStart: false, showRange: true, retro: false },
    checkpoint: null,   // resumable mid-game state
  };
}

/** Migrations: each takes profile at version n and returns version n+1. */
const MIGRATIONS = {
  1: (p) => ({ ...p, resources: p.resources || { gel: 0, crystal: 0, ember: 0, star: 0 }, schema: 2 }),
  2: (p) => ({ ...p, trails: p.trails || ['none'], trail: p.trail || 'none', candy: p.candy || 0, schema: 3 }),
};

export function migrate(p) {
  while ((p.schema || 1) < SCHEMA) p = MIGRATIONS[p.schema || 1](p);
  // fill any missing keys from defaults (defensive)
  const d = defaultProfile();
  for (const k in d) if (p[k] === undefined) p[k] = d[k];
  for (const k in d.settings) if (p.settings[k] === undefined) p.settings[k] = d.settings[k];
  for (const k in d.resources) if (p.resources[k] === undefined) p.resources[k] = 0;
  return p;
}

export function loadProfile() {
  try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { console.warn('Save load failed, starting fresh', e); }
  return defaultProfile();
}
let saveTimer = null;
export function saveProfile(p, immediate = false) {
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); cloud.push(p); } catch (e) { console.warn('Save failed', e); } };
  if (immediate) { clearTimeout(saveTimer); write(); return; }
  clearTimeout(saveTimer); saveTimer = setTimeout(write, 400);
}
export const exportSave = (p) => encode({ v: SCHEMA, p });
export function importSave(code) { const o = decode(code); if (!o || !o.p) throw new Error('Invalid save code'); return migrate(o.p); }

// ───────────── Cloud adapter (no-op by default) ─────────────
export const cloud = {
  provider: null,
  /** provider = { push(profile):Promise, pull():Promise<profile>, submitScore(board, score, name):Promise, top(board):Promise<[]> } */
  use(provider) { this.provider = provider; },
  push(p) { if (this.provider) this.provider.push(p).catch(() => {}); },
  async pull() { return this.provider ? this.provider.pull() : null; },
  async submitScore(board, score, name) { return this.provider ? this.provider.submitScore(board, score, name) : null; },
  async top(board) { return this.provider ? this.provider.top(board) : null; },
};

// ───────────── Progression helpers ─────────────
export function addStat(p, key, n = 1) { p.stats[key] = (p.stats[key] || 0) + n; bumpQuests(p, key, n); }
export function maxStat(p, key, v) { if ((p.stats[key] || 0) < v) p.stats[key] = v; }

/** Grant player XP; returns number of levels gained. Each level = +1 research point. */
export function addXp(p, amount) {
  p.xp += Math.floor(amount); let gained = 0;
  while (p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; p.research++; gained++; }
  maxStat(p, 'level', p.level);
  return gained;
}
export function canPrestige(p) { return p.level >= PRESTIGE_LEVEL; }
export function doPrestige(p) {
  if (!canPrestige(p)) return false;
  p.prestige++; p.level = 1; p.xp = 0; p.gems += 500; p.stats.prestige = p.prestige; return true;
}
/** Prestige gives +2% cash and +1% damage per star, forever. */
export const prestigeBonus = (p) => ({ cash: 0.02 * p.prestige, dmg: 0.01 * p.prestige });

/** Check achievements; returns newly unlocked ones. */
export function checkAchievements(p) {
  p.stats.relicsOwned = new Set(p.relics).size; p.stats.heroesOwned = p.heroes.length;
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements[a.id]) continue;
    if ((p.stats[a.stat] || 0) >= a.n) { p.achievements[a.id] = Date.now(); p.gems += a.gems; out.push(a); }
  }
  return out;
}

// ───────────── Daily & weekly quests ─────────────
function rollQuests(seedStr, count, tierBias) {
  const r = mulberry32(hashStr(seedStr)); const pool = QUEST_POOL.slice(); const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    const q = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const tier = Math.min(2, Math.floor(r() * 2) + tierBias);
    out.push({ id: q.id, text: q.text.replace('{n}', q.n[tier].toLocaleString()), stat: q.stat, goal: q.n[tier], gems: q.gems[tier] * (tierBias ? 3 : 1), progress: 0, claimed: false });
  }
  return out;
}
export function refreshQuests(p) {
  const d = dayKey(), w = weekKey();
  if (p.quests.day !== d) { p.quests.day = d; p.quests.daily = rollQuests('d' + d, 3, 0); }
  if (p.quests.week !== w) { p.quests.week = w; p.quests.weekly = rollQuests('w' + w, 3, 1); }
}
function bumpQuests(p, stat, n) {
  for (const q of [...p.quests.daily, ...p.quests.weekly]) if (q.stat === stat && !q.claimed) q.progress = Math.min(q.goal, q.progress + n);
}
export function claimQuest(p, q) {
  if (q.claimed || q.progress < q.goal) return false;
  q.claimed = true; p.gems += q.gems; addStat(p, 'questsDone'); return true;
}

// ───────────── Relic drops ─────────────
export function rollRelic(p, rarity, r = Math.random) {
  const pool = RELICS.filter((x) => !rarity || x.rarity === rarity);
  const relic = pool[Math.floor(r() * pool.length)];
  if (p.relics.includes(relic.id)) { p.gems += { common: 20, rare: 50, epic: 120, legendary: 300 }[relic.rarity]; return { relic, dupe: true }; }
  p.relics.push(relic.id); return { relic, dupe: false };
}
