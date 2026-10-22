/**
 * maps.js — 20 handcrafted maps + 1 secret + 1 seasonal event map.
 *
 * Paths are authored on a 32×18 grid (1 unit = 40px) and converted to pixels.
 * Points outside 0..32 / 0..18 are off-screen spawn/exit points.
 * A map may have several paths (enemies alternate between them).
 *
 *   theme   — visual palette key (see THEMES)
 *   tier    — beginner | intermediate | advanced | expert
 *   world   — {x,y} node position on the world map (0..100 %)
 *   region  — world map region
 *   weather — weather pool for this map
 *   blockers— extra density of decorations that block tower placement
 */
import { GRID } from '../config.js';

const arc = (cx, cy, r, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const a = (a0 + (a1 - a0) * (i / n)) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});

export const THEMES = {
  meadow:  { grass: '#7cc867', grass2: '#6ab857', path: '#d9b382', edge: '#a8835a', deco: ['🌳', '🌼', '🌷', '🌲', '🪨'], tint: null },
  autumn:  { grass: '#d8a24a', grass2: '#c98f3a', path: '#9c7650', edge: '#6e5236', deco: ['🍂', '🌳', '🍁', '🪵', '🍄'] },
  desert:  { grass: '#e8c87a', grass2: '#ddb966', path: '#c49a5a', edge: '#97723f', deco: ['🌵', '🪨', '🦴', '🌴'] },
  beach:   { grass: '#f2dc9b', grass2: '#4fc3f7', path: '#e0c27a', edge: '#b39555', deco: ['🌴', '🐚', '🦀', '⛱️'], water: true },
  tundra:  { grass: '#e9f3fb', grass2: '#d6e8f5', path: '#a9c6dc', edge: '#7b9ab3', deco: ['🌲', '⛄', '❄️', '🧊'] },
  cave:    { grass: '#4a4a5e', grass2: '#3d3d50', path: '#8c7a9e', edge: '#5d4f6e', deco: ['💎', '🍄', '🪨', '🕯️'] },
  volcano: { grass: '#5a3a32', grass2: '#4a2e28', path: '#2e2220', edge: '#ff6b2c', deco: ['🌋', '🔥', '🪨', '💀'] },
  sky:     { grass: '#bfe6ff', grass2: '#a6dbff', path: '#ffffff', edge: '#cfd8e3', deco: ['☁️', '🎈', '🪽', '⭐'] },
  candy:   { grass: '#ffc8e6', grass2: '#ffb3dc', path: '#fff3b0', edge: '#e6b85c', deco: ['🍭', '🍬', '🧁', '🍩'] },
  swamp:   { grass: '#5c7a4a', grass2: '#4e6b3e', path: '#7a6a3a', edge: '#4a3f20', deco: ['🌿', '🐸', '🪷', '🍄'] },
  ruins:   { grass: '#9aa878', grass2: '#8b9a6a', path: '#c8c0a8', edge: '#8a826a', deco: ['🏛️', '🗿', '🪨', '🌿'] },
  neon:    { grass: '#141433', grass2: '#1b1b44', path: '#2a2a66', edge: '#00e5ff', deco: ['💠', '🔷', '✨'] },
  crystal: { grass: '#2b2f5a', grass2: '#353a6e', path: '#6a5acd', edge: '#c4b5fd', deco: ['💎', '🔮', '✨'] },
  abyss:   { grass: '#1a0f2e', grass2: '#22143b', path: '#3b1f5c', edge: '#a855f7', deco: ['🌑', '👁️', '🕯️', '💀'] },
  desk:    { grass: '#c9a27a', grass2: '#bf966c', path: '#f5f5f5', edge: '#9aa0a6', deco: ['☕', '📎', '✏️', '📚', '🖱️'] },
  spooky:  { grass: '#2d3a2a', grass2: '#263222', path: '#6b5a3a', edge: '#ff8c1a', deco: ['🎃', '👻', '🕸️', '🦇', '🪦'] },
};

const M = (id, name, theme, tier, region, world, paths, extra = {}) => ({
  id, name, theme, tier, region, world, paths: paths.map((p) => p.map(([x, y]) => [x * GRID, y * GRID])), ...extra,
});

export const MAPS = [
  // ── Verdant Vale (beginner) ──
  M('sprout', 'Sprout Meadow', 'meadow', 'beginner', 'vale', { x: 6, y: 82 },
    [[[-1, 3], [8, 3], [8, 9], [3, 9], [3, 15], [14, 15], [14, 5], [20, 5], [20, 13], [27, 13], [27, 2], [33, 2]]], { weather: ['clear', 'rain'] }),
  M('brook', 'Pebble Brook', 'meadow', 'beginner', 'vale', { x: 13, y: 66 },
    [[[-1, 9], [5, 9], [5, 3], [11, 3], [11, 15], [17, 15], [17, 3], [23, 3], [23, 15], [28, 15], [28, 9], [33, 9]]], { weather: ['clear', 'rain'] }),
  M('ring', 'Mushroom Ring', 'swamp', 'beginner', 'vale', { x: 7, y: 50 },
    [[[-1, 2], [29, 2], [29, 16], [3, 16], [3, 6], [25, 6], [25, 12], [8, 12], [8, 9], [19, 9]]], { weather: ['clear', 'fog', 'rain'] }),
  M('hills', 'Honeycomb Hills', 'autumn', 'beginner', 'vale', { x: 15, y: 34 },
    [[[16, -1], [16, 4], [4, 4], [4, 14], [12, 14], [12, 8], [20, 8], [20, 14], [28, 14], [28, 4], [24, 4], [24, -1]]], { weather: ['clear', 'rain'] }),
  M('cove', 'Coral Cove', 'beach', 'beginner', 'vale', { x: 24, y: 22 },
    [[[-1, 5], [10, 5], [13, 8], [13, 13], [18, 15], [24, 13], [26, 8], [22, 4], [17, 5], [16, 10], [33, 10]]], { weather: ['clear', 'rain', 'heat'] }),

  // ── Sunscar Wastes (intermediate) ──
  M('dunes', 'Sunbaked Dunes', 'desert', 'intermediate', 'wastes', { x: 30, y: 40 },
    [[[-1, 15], [6, 3], [12, 15], [18, 3], [24, 15], [30, 3], [33, 3]]], { weather: ['clear', 'heat'] }),
  M('frostbite', 'Frostbite Pass', 'tundra', 'intermediate', 'peaks', { x: 25, y: 60 },
    [[[-1, 2], [26, 2], [26, 7], [5, 7], [5, 12], [26, 12], [26, 16], [-1, 16]]], { weather: ['snow', 'clear', 'fog'] }),
  M('cavern', 'Glowcap Cavern', 'cave', 'intermediate', 'wastes', { x: 32, y: 80 },
    [[[33, 9], [24, 9], [24, 2], [14, 2], [14, 16], [6, 16], [6, 6], [-1, 6]]], { weather: ['fog', 'clear'] }),
  M('twins', 'Twin Rivers', 'meadow', 'intermediate', 'vale', { x: 42, y: 68 },
    [[[-1, 4], [12, 4], [12, 9], [33, 9]], [[-1, 14], [20, 14], [20, 9], [33, 9]]], { weather: ['rain', 'clear'] }),
  M('clock', 'Clocktower Square', 'ruins', 'intermediate', 'wastes', { x: 47, y: 48 },
    [[[16, -1], [16, 3], [26, 3], [26, 15], [6, 15], [6, 3], [12, 3], [12, 11], [20, 11], [20, 7], [16, 7], [16, 19]]], { weather: ['clear', 'fog', 'storm'] }),

  // ── Emberreach & Skyreach (advanced) ──
  M('caldera', 'Ember Caldera', 'volcano', 'advanced', 'ember', { x: 41, y: 28 },
    [[[-1, 9], [8, 9], [8, 2], [24, 2], [24, 16], [8, 16], [8, 12], [33, 12]]], { weather: ['heat', 'storm'] }),
  M('skyreach', 'Skyreach Isles', 'sky', 'advanced', 'sky', { x: 51, y: 14 },
    [[[-1, 3], [7, 3], [7, 15], [15, 15], [15, 3], [23, 3], [23, 15], [33, 15]]], { weather: ['clear', 'storm', 'fog'] }),
  M('candy', 'Candy Canyon', 'candy', 'advanced', 'sky', { x: 61, y: 27 },
    [[[-1, 9], [6, 9], ...arc(16, 9, 7, 180, 540, 28), [16, 2], [16, -1]]], { weather: ['clear', 'rain'] }),
  M('swamp', 'Sorrowmire', 'swamp', 'advanced', 'ember', { x: 57, y: 48 },
    [[[-1, 9], [5, 9], [5, 4], [10, 4], [10, 14], [15, 14], [15, 4], [20, 4], [20, 14], [33, 14]]], { weather: ['fog', 'rain'], blockers: 0.6 }),
  M('neon', 'Neon Grid', 'neon', 'advanced', 'rift', { x: 63, y: 68 },
    [[[-1, 9], [12, 9], [12, 5], [20, 5], [20, 13], [33, 13]]], { weather: ['clear', 'storm'] }),

  // ── The Rift (expert) ──
  M('hollow', 'Crystal Hollow', 'crystal', 'expert', 'rift', { x: 73, y: 82 },
    [[[-1, 2], [33, 16]], [[-1, 16], [33, 2]]], { weather: ['clear', 'storm', 'fog'] }),
  M('bridge', 'Shattered Bridge', 'sky', 'expert', 'sky', { x: 78, y: 60 },
    [[[16, -1], [16, 19]]], { weather: ['storm', 'fog', 'clear'] }),
  M('labyrinth', 'Thorn Labyrinth', 'autumn', 'expert', 'ember', { x: 73, y: 40 },
    [[[-1, 1], [31, 1], [31, 17], [1, 17], [1, 4], [28, 4], [28, 14], [4, 14], [4, 7], [25, 7], [25, 11], [8, 11]]], { weather: ['clear', 'rain'], blockers: 1.6 }),
  M('core', 'Rift Core', 'abyss', 'expert', 'rift', { x: 84, y: 22 },
    [[[-1, 9], [10, 9], ...arc(16, 9, 6, 180, 520, 30), [33, 9]]], { weather: ['storm', 'fog'] }),
  M('gate', 'Abyss Gate', 'abyss', 'expert', 'rift', { x: 94, y: 40 },
    [[[-1, 9], [15, 9]], [[16, -1], [16, 8]], [[33, 9], [17, 9]]], { weather: ['storm', 'fog'] }),

  // ── Secret & seasonal ──
  M('desk', "Developer's Desk", 'desk', 'intermediate', 'secret', { x: 53, y: 92 },
    [[[-1, 4], [9, 4], [9, 13], [22, 13], [22, 4], [33, 4]]], { weather: ['clear'], secret: true }),
  M('pumpkin', 'Pumpkin Patch', 'spooky', 'intermediate', 'event', { x: 90, y: 84 },
    [[[-1, 14], [6, 14], [6, 4], [14, 4], [14, 14], [20, 14], [20, 4], [27, 4], [27, 10], [33, 10]]], { weather: ['fog', 'rain'], event: 'spooky' }),
];

export const MAP_MAP = Object.fromEntries(MAPS.map((m) => [m.id, m]));
export const CAMPAIGN = MAPS.filter((m) => !m.secret && !m.event);

export const REGIONS = {
  vale:   { name: 'Verdant Vale',  emoji: '🌳', color: '#7cc867' },
  wastes: { name: 'Sunscar Wastes', emoji: '🏜️', color: '#e8c87a' },
  peaks:  { name: 'Frostfang Peaks', emoji: '🏔️', color: '#e9f3fb' },
  ember:  { name: 'Emberreach',    emoji: '🌋', color: '#ff6b2c' },
  sky:    { name: 'Skyreach',      emoji: '☁️', color: '#bfe6ff' },
  rift:   { name: 'The Rift',      emoji: '🌀', color: '#a855f7' },
  secret: { name: '???',           emoji: '❓', color: '#999' },
  event:  { name: 'Seasonal',      emoji: '🎃', color: '#ff8c1a' },
};

export const TIER_INFO = {
  beginner: { name: 'Beginner', color: '#4ade80', mult: 1.0 },
  intermediate: { name: 'Intermediate', color: '#facc15', mult: 1.15 },
  advanced: { name: 'Advanced', color: '#fb923c', mult: 1.3 },
  expert: { name: 'Expert', color: '#ef4444', mult: 1.5 },
};
