/**
 * heroes.js — unique champions. One hero per game, levels 1→20 during the match
 * from XP earned each wave and per pop. Abilities unlock at levels 3 and 10.
 * `grow` is applied once per level gained (same mod language as towers).
 */
export const HEROES = [
  { id: 'mossa', name: 'Captain Mossa', emoji: '🧝', color: '#22c55e', price: 0,
    lore: 'Ranger of the Verdant Vale. First to see the Rift open.',
    base: { kind: 'proj', range: 160, rate: 0.7, dmg: 1, pierce: 3, speed: 600, dtype: 'nature', count: 1, spread: 10, pr: 4, cost: 400 },
    grow: { dmg: 0.35, pierce: 0.4, rateX: 0.97, rangeX: 1.01 }, milestones: { 5: { detect: true }, 8: { count: 1 }, 14: { ap: true }, 18: { count: 2 } },
    abilities: [{ lvl: 3, id: 'barrage', name: 'Thorn Storm', cd: 40, n: 30, dmg: 6 }, { lvl: 10, id: 'freeze', name: 'Overgrowth', cd: 70, dur: 5 }] },
  { id: 'vex', name: 'Volt Vex', emoji: '🧑‍🔬', color: '#facc15', price: 1200,
    lore: 'A mad inventor who thinks slimes are excellent conductors.',
    base: { kind: 'beam', range: 140, rate: 1.0, dmg: 1, chain: 4, chainR: 90, dtype: 'energy', cost: 650 },
    grow: { dmg: 0.4, chain: 0.5, rateX: 0.97 }, milestones: { 6: { detect: true }, 12: { stun: 0.2 }, 16: { ap: true } },
    abilities: [{ lvl: 3, id: 'frenzy', name: 'Overcharge', cd: 45, dur: 8, x: 0.3 }, { lvl: 10, id: 'nuke', name: 'Thunderdome', cd: 75, dmg: 300 }] },
  { id: 'ladle', name: 'Sir Ladle', emoji: '👨‍🍳', color: '#f97316', price: 1500,
    lore: 'Retired royal chef. Believes every slime is just an unfinished soup.',
    base: { kind: 'aoe', range: 80, rate: 1.4, dmg: 2, pierce: 30, dtype: 'blast', stun: 0.2, ap: true, cost: 600 },
    grow: { dmg: 0.5, pierce: 3, rateX: 0.97 }, milestones: { 4: { income: 60 }, 9: { income: 150 }, 15: { income: 400 } },
    abilities: [{ lvl: 3, id: 'cash', name: "Soup's On!", cd: 60, cash: 400, scale: true }, { lvl: 10, id: 'freeze', name: 'Big Stir', cd: 60, dur: 3 }] },
  { id: 'nova', name: 'Nova', emoji: '🧙‍♀️', color: '#818cf8', price: 2000,
    lore: 'Stargazer who reads the slimes’ next move in the constellations.',
    base: { kind: 'mortar', range: 240, rate: 1.5, dmg: 2, pierce: 20, splash: 45, dtype: 'magic', count: 1, delay: 0.5, detect: true, cost: 700 },
    grow: { dmg: 0.6, splash: 1.2, rateX: 0.97 }, milestones: { 7: { count: 1 }, 13: { count: 1 }, 17: { stun: 0.3 } },
    abilities: [{ lvl: 3, id: 'meteor', name: 'Meteor', cd: 40, dmg: 400, r: 120 }, { lvl: 10, id: 'nuke', name: 'Supernova', cd: 80, dmg: 1200, ap: true }] },
  { id: 'pyra', name: 'Pyra', emoji: '🧚‍♀️', color: '#ef4444', price: 2500,
    lore: 'A fire sprite reborn from the Ember Caldera. Hot-tempered.',
    base: { kind: 'proj', range: 150, rate: 0.6, dmg: 1, pierce: 2, speed: 420, dtype: 'fire', dot: 1, dotT: 3, homing: true, pr: 6, shape: 'fireball', cost: 650 },
    grow: { dmg: 0.4, dot: 0.5, rateX: 0.97 }, milestones: { 5: { splash: 30 }, 11: { count: 1 }, 16: { boss: 1 } },
    abilities: [{ lvl: 3, id: 'meteor', name: 'Inferno Ring', cd: 45, dmg: 300, r: 160 }, { lvl: 10, id: 'frenzy', name: 'Phoenix Form', cd: 70, dur: 10, x: 0.25 }] },
  { id: 'gearhart', name: 'Gearhart', emoji: '🤖', color: '#94a3b8', price: 3000,
    lore: 'A clockwork knight who outlived the kingdom that built him.',
    base: { kind: 'summon', range: 0, rate: 4, mHp: 10, mDmg: 2, mSpeed: 60, mMax: 3, mR: 13, mEmoji: '🛡️', dtype: 'sharp', cost: 750 },
    grow: { mHp: 3, mDmg: 0.6, rateX: 0.96 }, milestones: { 6: { mMax: 1 }, 12: { mMax: 2 }, 18: { mBoom: 60 } },
    abilities: [{ lvl: 3, id: 'summon', name: 'Drone Swarm', cd: 45, hp: 200, dmg: 20 }, { lvl: 10, id: 'summon', name: 'Mega Mech', cd: 80, hp: 3000, dmg: 150 }] },
];
export const HERO_MAP = Object.fromEntries(HEROES.map((h) => [h.id, h]));
export const heroXpFor = (lvl) => Math.floor(60 * Math.pow(lvl, 1.75));
