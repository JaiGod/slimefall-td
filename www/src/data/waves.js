/**
 * waves.js — deterministic wave generator.
 *
 * Waves 1-15 are handcrafted for a gentle tutorial curve. From 16 onward a
 * budget-based generator builds groups from unlocked slime types, so every
 * seed (map + difficulty, or the daily date) produces a stable, replayable set.
 *
 * Output: { groups:[{type,count,gap,delay,flags}], boss?, elite?, golden? }
 */
import { rbe, UNLOCK_WAVE } from './enemies.js';
import { mulberry32 } from '../util.js';

const G = (type, count, gap, delay = 0, flags = {}) => ({ type, count, gap, delay, flags });

const EARLY = [
  [G('drip', 18, 0.9)],
  [G('drip', 22, 0.7), G('blob', 4, 1.2, 8)],
  [G('drip', 15, 0.6), G('blob', 10, 0.9, 4)],
  [G('blob', 18, 0.7), G('drip', 20, 0.4, 3)],
  [G('glob', 6, 1.2), G('blob', 20, 0.5, 4)],
  [G('drip', 30, 0.3), G('glob', 12, 0.8, 5)],
  [G('blob', 30, 0.4), G('glob', 15, 0.6, 6)],
  [G('glob', 25, 0.5), G('blob', 20, 0.4, 4)],
  [G('ooze', 8, 1.0), G('glob', 20, 0.5, 3)],
  [G('glob', 40, 0.35), G('ooze', 10, 0.8, 8)],
  [G('ooze', 18, 0.6), G('blob', 40, 0.25, 2)],
  [G('glob', 50, 0.25), G('ooze', 14, 0.5, 6)],
  [G('jelly', 8, 1.0), G('ooze', 20, 0.4, 4)],
  [G('ooze', 30, 0.35), G('jelly', 12, 0.6, 6), G('glob', 30, 0.2, 2)],
  [G('jelly', 25, 0.45), G('ooze', 30, 0.3, 5)],
];

/** Total budget (in RBE) for wave n. */
export const budget = (n) => Math.floor((10 + n * 9 + n * n * 1.15) * Math.min(1, 0.4 + n / 50));

/** Boss schedule: wave -> {type, level}. */
export function bossFor(n) {
  if (n % 20 !== 0) return null;
  const cycle = ['hydra', 'chrono', 'hydra', 'chrono', 'abyss'];
  const idx = n / 20 - 1;
  return { type: cycle[idx % 5], level: 1 + Math.floor(idx / 2) + Math.floor(idx / 5) * 2 };
}

export function genWave(n, seed = 1, opts = {}) {
  const rng = mulberry32(seed * 7919 + n * 104729);
  const wave = { n, groups: [], elite: false, boss: null, golden: false };

  if (n <= EARLY.length) {
    wave.groups = EARLY[n - 1].map((g) => ({ ...g, flags: { ...g.flags } }));
  } else {
    const unlocked = Object.keys(UNLOCK_WAVE).filter((t) => UNLOCK_WAVE[t] <= n);
    let left = budget(n);
    const groups = Math.min(2 + Math.floor(n / 15), 6);
    for (let gi = 0; gi < groups && left > 0; gi++) {
      // bias towards newer/tougher types as waves progress
      const sorted = unlocked.slice().sort((a, b) => rbe(a) - rbe(b));
      const bias = Math.pow(rng(), gi === 0 ? 0.55 : 1.1);
      const type = sorted[Math.min(sorted.length - 1, Math.floor(bias * sorted.length))];
      const share = gi === groups - 1 ? left : left * (0.3 + rng() * 0.4);
      const count = Math.max(1, Math.min(220, Math.floor(share / rbe(type))));
      const big = rbe(type) > 300;
      const gap = big ? 2.2 - Math.min(1.4, n / 80) : Math.max(0.06, 0.6 - n / 180) * (0.6 + rng() * 0.8);
      const flags = {};
      if (n >= 24 && !big && rng() < 0.18 + (opts.phase || 0)) flags.phase = true;
      if (n >= 18 && !big && rng() < 0.2) flags.regen = true;
      if (n >= 46 && big && rng() < 0.35) flags.fortified = true;
      if (n >= 70 && rng() < 0.15) flags.swift = true;
      wave.groups.push(G(type, count, gap, gi * (1.5 + rng() * 3), flags));
      left -= count * rbe(type);
    }
  }

  // global modifiers
  if (opts.allPhase) wave.groups.forEach((g) => { if (rbe(g.type) < 300) g.flags.phase = true; });
  if (opts.allRegen) wave.groups.forEach((g) => { if (rbe(g.type) < 300) g.flags.regen = true; });

  // elite waves: every 10th (offset 5) wave after 25, or every 5th with the Elite Horde modifier
  const eliteEvery = opts.elite ? 5 : 10;
  if (n > 20 && n % eliteEvery === 5 % eliteEvery) {
    wave.elite = true;
    wave.groups.forEach((g) => { g.flags.swift = true; g.flags.fortified = true; });
  }

  const boss = bossFor(n);
  if (boss) { wave.boss = boss; wave.groups.push(G(boss.type, 1, 1, 6, { boss: boss.level })); }

  // rare golden slime from wave 12
  if (n >= 12 && rng() < 0.08) { wave.golden = true; wave.groups.push(G('golden', 1, 1, 3 + rng() * 10)); }
  return wave;
}

/** Endless scaling beyond wave 100: hp and speed multipliers. */
export function endlessScale(n) {
  if (n <= 80) return { hp: 1, speed: 1 };
  const k = n - 80;
  return { hp: 1 + k * 0.05 + Math.pow(k / 40, 2), speed: 1 + Math.min(0.6, k * 0.006) };
}
