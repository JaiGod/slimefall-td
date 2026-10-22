/**
 * enemies.js — every slime in the game.
 *
 * Slimes are LAYERED: when one is destroyed it releases its `children`, and any
 * overflow damage carries into the first child. `hp` is per-layer health.
 *
 * Fields:
 *  hp, speed (px/s), r (radius), color, children[], immune[] (damage types),
 *  armor (flat reduction unless the hit has armor-pierce), big (behemoth),
 *  boss (has phases), ai (special behaviour), cash (bonus on destroy)
 *
 * Damage types: sharp, blast, fire, ice, energy, magic, poison, nature
 */

export const ENEMIES = {
  drip:     { name: 'Drip',      hp: 1,  speed: 62,  r: 9,  color: '#7ed957', children: [] },
  blob:     { name: 'Blob',      hp: 1,  speed: 78,  r: 10, color: '#3fc1c9', children: ['drip'] },
  glob:     { name: 'Glob',      hp: 1,  speed: 98,  r: 11, color: '#4a6cf7', children: ['blob'] },
  ooze:     { name: 'Ooze',      hp: 1,  speed: 150, r: 11, color: '#ffd23f', children: ['glob'] },
  jelly:    { name: 'Jelly',     hp: 1,  speed: 172, r: 12, color: '#ff6fb5', children: ['ooze'] },
  splitter: { name: 'Splitter',  hp: 1,  speed: 108, r: 11, color: '#3b3b52', children: ['jelly', 'jelly'], immune: ['blast'] },
  frosty:   { name: 'Frosty',    hp: 1,  speed: 112, r: 11, color: '#e6f4ff', children: ['jelly', 'jelly'], immune: ['ice'] },
  ember:    { name: 'Emberling', hp: 1,  speed: 108, r: 12, color: '#ff7a29', children: ['jelly', 'jelly'], immune: ['fire'] },
  leaper:   { name: 'Leaper',    hp: 3,  speed: 70,  r: 12, color: '#9be15d', children: ['ooze', 'ooze'], ai: 'leap' },
  shell:    { name: 'Shellback', hp: 7,  speed: 55,  r: 13, color: '#8a8f98', children: ['splitter', 'splitter'], immune: ['sharp'] },
  healer:   { name: 'Mender',    hp: 8,  speed: 60,  r: 13, color: '#a3ffb0', children: ['jelly', 'jelly', 'jelly'], ai: 'heal' },
  prism:    { name: 'Prism',     hp: 2,  speed: 120, r: 13, color: 'rainbow', children: ['splitter', 'frosty', 'ember'] },
  crystal:  { name: 'Crystal',   hp: 14, speed: 72,  r: 15, color: '#b388ff', children: ['prism', 'prism'], armor: 1, immune: ['poison'] },
  disruptor:{ name: 'Disruptor', hp: 40, speed: 50,  r: 16, color: '#ff4d6d', children: ['shell', 'shell'], ai: 'emp' },
  golden:   { name: 'Golden Slime', hp: 25, speed: 150, r: 12, color: '#ffcc00', children: [], noLeak: true, cash: 350, rare: true },
  duck:     { name: 'Rubber Duck', hp: 1, speed: 90, r: 12, color: '#ffe14d', children: [], cash: 1, secret: true },

  // ---- Behemoths --------------------------------------------------------
  titan:    { name: 'Gloop Titan',   hp: 220,  speed: 40, r: 30, color: '#5b8c5a', children: ['crystal', 'crystal', 'crystal', 'crystal'], big: true, cash: 40 },
  royal:    { name: 'Royal Gel',     hp: 850,  speed: 30, r: 38, color: '#c9a227', children: ['titan', 'titan', 'titan'], big: true, cash: 80 },
  colossus: { name: 'Gel Colossus',  hp: 3800, speed: 22, r: 46, color: '#6a3fa0', children: ['royal', 'royal'], big: true, cash: 200 },

  // ---- Bosses (hp scaled by boss level at spawn) -----------------------
  hydra:  { name: 'Hydra Bloom',     hp: 1500, speed: 22, r: 50, color: '#2fbf71', children: ['crystal', 'crystal', 'crystal'], big: true, boss: true, cash: 500,
            phases: [0.66, 0.33], title: 'The garden itself turns against you.' },
  chrono: { name: 'Chrono Slime',    hp: 5000, speed: 20, r: 50, color: '#4fc3f7', children: ['titan', 'titan', 'titan'], big: true, boss: true, cash: 900,
            phases: [0.75, 0.5, 0.25], title: 'It has already seen how this ends.' },
  abyss:  { name: 'The Abyss King',  hp: 16000, speed: 16, r: 60, color: '#2b1645', children: ['colossus', 'colossus'], big: true, boss: true, cash: 3000,
            phases: [0.66, 0.33], title: 'The Rift opens. Its king steps through.' },
};

/** Single-child chain used by Regen slimes to regrow back toward their origin. */
export const REGEN_PARENT = { drip: 'blob', blob: 'glob', glob: 'ooze', ooze: 'jelly' };
export const REGEN_RANK = { drip: 0, blob: 1, glob: 2, ooze: 3, jelly: 4 };

/** Red-Blob-Equivalent: total layers (lives lost on leak, wave budget). Memoised. */
const rbeCache = {};
export function rbe(type) {
  if (rbeCache[type] != null) return rbeCache[type];
  const d = ENEMIES[type];
  let total = d.hp;
  for (const c of d.children) total += rbe(c);
  return (rbeCache[type] = total);
}

/** Wave a type first appears in generated waves (campaign pacing). */
export const UNLOCK_WAVE = {
  drip: 1, blob: 2, glob: 5, ooze: 9, jelly: 13, splitter: 18, frosty: 20, ember: 22,
  leaper: 24, shell: 26, healer: 28, prism: 30, crystal: 34, titan: 38, disruptor: 44,
  royal: 55, colossus: 76,
};
