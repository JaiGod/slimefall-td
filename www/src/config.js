/**
 * config.js — global tuning constants. Balance numbers live here or in /data,
 * never hard-coded inside engine logic.
 */

export const VERSION = '1.0.0';
export const W = 1280;            // logical field width  (32 grid units * 40px)
export const H = 720;             // logical field height (18 grid units * 40px)
export const GRID = 40;           // map authoring unit
export const PATH_W = 44;         // visual + collision width of the slime road
export const TOWER_R = 20;        // footprint radius of a tower
export const STEP = 1 / 60;       // fixed simulation step (seconds)
export const MAX_ENEMIES = 1800;  // hard safety cap

/** Difficulty presets. hpX/speedX scale enemies, costX scales tower prices. */
export const DIFFICULTIES = {
  easy:   { id: 'easy',   name: 'Sprout',  emoji: '🌱', cash: 850, lives: 200, costX: 0.85, endWave: 40,  hpX: 1.0,  speedX: 0.92, gems: 15, xp: 1.0 },
  normal: { id: 'normal', name: 'Bloom',   emoji: '🌼', cash: 700, lives: 150, costX: 1.0,  endWave: 60,  hpX: 1.0,  speedX: 1.0,  gems: 30, xp: 1.3 },
  hard:   { id: 'hard',   name: 'Thorn',   emoji: '🌵', cash: 650, lives: 100, costX: 1.08, endWave: 80,  hpX: 1.1,  speedX: 1.06, gems: 55, xp: 1.7 },
  chaos:  { id: 'chaos',  name: 'Chaos',   emoji: '💀', cash: 650, lives: 25,  costX: 1.2,  endWave: 100, hpX: 1.25, speedX: 1.12, gems: 100, xp: 2.4 },
};

/** Crosspath rule ("Triad Attunement"): total tiers ≤ 7 and only one path may exceed tier 3.
 *  Allows 5-2-0, 4-2-1, 3-2-2, 3-3-1 … but never 4-3-x or 5-3-x. */
export const MAX_TOTAL_TIERS = 7;
export const HIGH_TIER = 3;

export const SELL_RATE = 0.7;
export const TARGET_MODES = ['first', 'last', 'strong', 'close'];

/** Tower veterancy (in-game evolution) thresholds: pops needed per star. */
export const VET_STARS = [150, 700, 2500, 9000];
export const VET_BONUS = 0.05; // +5% dmg, range and attack speed per star

/** Player levels: xp needed for level n. */
export const xpForLevel = (n) => Math.floor(120 * Math.pow(n, 1.6));
export const PRESTIGE_LEVEL = 50;
