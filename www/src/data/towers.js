/**
 * towers.js — the full tower roster (28 towers × 3 paths × 5 tiers = 420 upgrades).
 *
 * BASE STATS (all optional depending on `kind`):
 *   kind     proj | beam | aoe | aura | trap | orbit | support | farm | summon | mortar
 *   cost, range (px), rate (seconds between attacks), dmg, pierce, dtype
 *   proj:    speed, count, spread (deg), homing, splash, returning, radial, pr (size)
 *   beam:    chain, chainR, line (hits everything along the beam)
 *   aura:    rate = tick interval
 *   trap:    trapMax, trapPierce
 *   orbit:   blades, orbitR, spin
 *   support: buffRate, buffDmg, buffRange, buffPierce, grantDetect (can be on any kind)
 *   farm:    income (cash at end of each wave)
 *   summon:  mHp, mDmg, mSpeed, mMax, mR, mEmoji
 *   mortar:  splash, count (strikes per attack)
 *   status:  slow (0..1), slowT, stun, dot (dps), dotT, knock (px), shred (armor removal)
 *   flags:   detect (sees Phase slimes), ap (armor pierce), boss (+% vs behemoths), crit, critMul
 *
 * UPGRADE MODS: numeric values ADD (`pierce: 2`), keys ending in X MULTIPLY (`rateX: 0.8`),
 * anything else REPLACES (`dtype: 'fire'`, `homing: true`, `ability: {...}`).
 */

const P = (name, ups) => ({ name, ups: ups.map(([n, c, m, d]) => ({ name: n, cost: c, mods: m, desc: d || '' })) });

export const TOWERS = [
  // ───────────────────────────── PRIMARY ─────────────────────────────
  { id: 'pebble', name: 'Pebble Slinger', emoji: '🪨', color: '#a07850', cat: 'primary', cost: 200,
    desc: 'A trusty sling that hurls sharp pebbles. Cheap, flexible, beloved.',
    kind: 'proj', range: 135, rate: 0.95, dmg: 1, pierce: 2, speed: 560, dtype: 'sharp',
    paths: [
      P('Precision', [['Sharper Stones', 140, { pierce: 1 }], ['Razor Shards', 220, { pierce: 2, dmg: 1 }], ['Flint Fury', 450, { rateX: 0.7, pierce: 2 }],
        ['Obsidian Barrage', 3200, { count: 2, spread: 22, rateX: 0.6, dmg: 2 }], ['Pebble Monarch', 18000, { count: 3, dmg: 6, pierce: 10, rateX: 0.5, ap: true, ability: { id: 'frenzy', name: 'Rockslide', cd: 45, dur: 8, x: 0.25 } }, 'Ability: triple attack speed for 8s.']]),
      P('Reach', [['Long Sling', 100, { rangeX: 1.25 }], ['Eagle Eye', 180, { rangeX: 1.15, detect: true }], ['Ricochet Rock', 600, { pierce: 4, speedX: 1.3 }],
        ['Boulder Toss', 1700, { dmg: 3, splash: 34, dtype: 'blast', pr: 4 }], ['Avalanche', 9500, { dmg: 12, splash: 30, rateX: 0.6, boss: 0.5 }]]),
      P('Volley', [['Twin Pouch', 250, { count: 1, spread: 12 }], ['Triple Pouch', 400, { count: 1 }], ['Homing Pebbles', 900, { homing: true, speedX: 1.2 }],
        ['Crystal Shot', 2800, { ap: true, dmg: 2, dtype: 'magic' }], ['Meteor Shower', 14000, { count: 4, dmg: 5, rateX: 0.55, spread: 40 }]]),
    ] },

  { id: 'thorn', name: 'Thorn Turret', emoji: '🌵', color: '#4f9d4a', cat: 'primary', cost: 280,
    desc: 'Sprays a ring of thorns in every direction. Great at corners.',
    kind: 'proj', radial: true, count: 8, range: 95, rate: 1.4, dmg: 1, pierce: 1, speed: 420, dtype: 'sharp', pr: 3,
    paths: [
      P('Bramble', [['Quick Bloom', 150, { rateX: 0.8 }], ['Faster Bloom', 300, { rateX: 0.8 }], ['Thorn Storm', 700, { count: 8, rateX: 0.85 }],
        ['Blade Bramble', 2600, { dmg: 2, pierce: 2, rateX: 0.7 }], ['Endless Thicket', 16000, { count: 16, rateX: 0.4, dmg: 3, ability: { id: 'frenzy', name: 'Overgrow', cd: 40, dur: 6, x: 0.2 } }]]),
      P('Reach', [['Long Thorns', 110, { rangeX: 1.2 }], ['Barbed Tips', 260, { pierce: 1 }], ['Hot Thorns', 600, { dtype: 'fire', dot: 1, dotT: 2, pierce: 1 }],
        ['Inferno Ring', 3500, { kind: 'aoe', dmg: 3, pierce: 60, rateX: 0.6, dtype: 'fire', dot: 3, dotT: 3 }], ['Sunflare Core', 19000, { dmg: 10, pierce: 200, rangeX: 1.4, dot: 10, boss: 0.4 }]]),
      P('Barbs', [['More Thorns', 120, { count: 2 }], ['Even More', 220, { count: 2 }], ['Poison Barbs', 650, { dtype: 'poison', dot: 1, dotT: 3 }],
        ['Shredder', 2100, { shred: 1, dmg: 1, ap: true }], ['Thorn Maelstrom', 11000, { count: 12, dmg: 4, pierce: 3, rateX: 0.6 }]]),
    ] },

  { id: 'beetle', name: 'Boomer Beetle', emoji: '🪲', color: '#3b82c4', cat: 'primary', cost: 330,
    desc: 'Throws a spinning shell that curves out and comes back.',
    kind: 'proj', returning: true, range: 150, rate: 1.1, dmg: 1, pierce: 5, speed: 380, dtype: 'sharp', pr: 7, shape: 'disc',
    paths: [
      P('Spin', [['Spikier Shell', 180, { pierce: 3 }], ['Faster Spin', 250, { rateX: 0.8, speedX: 1.2 }], ['Glaive Shell', 900, { dmg: 2, pierce: 6 }],
        ['Twin Glaives', 2700, { count: 1, spread: 30, rateX: 0.8 }], ['Shell Tempest', 15000, { count: 3, dmg: 6, pierce: 20, rateX: 0.5, ap: true }]]),
      P('Arc', [['Wide Throw', 120, { rangeX: 1.2 }], ['Hunter Shell', 300, { homing: true }], ['Red Hot Shell', 700, { dtype: 'fire', dot: 1, dotT: 2 }],
        ['Kinetic Charge', 3000, { stun: 0.4, dmg: 4, boss: 0.5 }], ['Comet Carapace', 13500, { dmg: 18, speedX: 1.4, boss: 1 }]]),
      P('Swarm', [['Quick Hands', 150, { rateX: 0.85 }], ['Double Catch', 380, { rateX: 0.75 }], ['Bounce Shell', 1100, { pierce: 10 }],
        ['Beetle Squadron', 4200, { count: 2, spread: 60, dmg: 2 }], ['Beetle Queen', 21000, { count: 4, spread: 90, dmg: 6, rateX: 0.5, ability: { id: 'barrage', name: 'Swarm Call', cd: 50, n: 40, dmg: 30 } }]]),
    ] },

  { id: 'crab', name: 'Cannon Crab', emoji: '🦀', color: '#e2553a', cat: 'primary', cost: 520,
    desc: 'Lobs explosive bubbles. Splash damage, but splitters shrug it off.',
    kind: 'proj', splash: 42, range: 140, rate: 1.5, dmg: 1, pierce: 1, speed: 330, dtype: 'blast', pr: 8, shape: 'bomb',
    paths: [
      P('Blast', [['Bigger Bubbles', 280, { splash: 14 }], ['Heavy Bubbles', 420, { dmg: 1, splash: 8 }], ['Depth Charge', 1300, { dmg: 3, boss: 0.5 }],
        ['Tidal Bomb', 4200, { dmg: 10, splash: 20, boss: 1, stun: 0.3 }], ['Kraken Shell', 27000, { dmg: 40, splash: 30, boss: 2, rateX: 0.8, ability: { id: 'nuke', name: 'Kraken Strike', cd: 60, dmg: 400, ap: true } }]]),
      P('Rapid', [['Quick Claws', 200, { rateX: 0.8 }], ['Faster Fuses', 320, { rateX: 0.8, speedX: 1.3 }], ['Cluster Bubbles', 1100, { cluster: 6 }],
        ['Bubble Barrage', 3600, { rateX: 0.5 }], ['Armada Crab', 16000, { cluster: 10, count: 2, spread: 18, rateX: 0.6 }]]),
      P('Reach', [['Long Shot', 150, { rangeX: 1.2 }], ['Crab Scope', 300, { rangeX: 1.15, detect: true }], ['Frag Bubbles', 900, { frag: 8 }],
        ['Pressure Wave', 3000, { knock: 20, dmg: 2, ap: true }], ['Leviathan Cannon', 14500, { dmg: 18, splash: 35, rangeX: 1.4, speedX: 1.5 }]]),
    ] },

  { id: 'sap', name: 'Sap Sprayer', emoji: '🍯', color: '#d99a1e', cat: 'primary', cost: 270,
    desc: 'Coats slimes in sticky sap, slowing them down.',
    kind: 'proj', range: 140, rate: 1.0, dmg: 0, pierce: 1, speed: 450, dtype: 'nature', slow: 0.5, slowT: 3, pr: 6, shape: 'goo',
    paths: [
      P('Corrode', [['Acid Sap', 150, { dmg: 0, dot: 1, dotT: 3, dtype: 'poison' }], ['Stronger Acid', 300, { dot: 1 }], ['Melting Sap', 1100, { dot: 3, ap: true }],
        ['Dissolver', 3200, { dot: 10, boss: 1 }], ['Primordial Goo', 18000, { dot: 40, slow: 0.2, boss: 2 }]]),
      P('Spread', [['Splatter', 140, { splash: 30 }], ['Big Splat', 260, { splash: 20, pierce: 2 }], ['Hose Mode', 850, { rateX: 0.45 }],
        ['Flood Sap', 3000, { splash: 30, pierce: 10 }], ['Sap Tsunami', 12500, { kind: 'aoe', range: 260, pierce: 400, rateX: 1.5, ability: { id: 'freeze', name: 'Amber Lock', cd: 60, dur: 4 } }]]),
      P('Hold', [['Thick Sap', 120, { slow: 0.15, slowT: 1 }], ['Glue Hardener', 250, { slowT: 2 }], ['Amber Shell', 900, { stun: 0.6 }],
        ['Behemoth Glue', 3800, { bossSlow: true, slow: 0.1 }], ['Eternal Amber', 15000, { stun: 1.5, rateX: 0.6, pierce: 4 }]]),
    ] },

  // ───────────────────────────── ELEMENTAL ─────────────────────────────
  { id: 'frost', name: 'Frost Fern', emoji: '❄️', color: '#7fd3ff', cat: 'elemental', cost: 360,
    desc: 'Releases freezing pulses that stop slimes in their tracks.',
    kind: 'aoe', range: 85, rate: 2.2, dmg: 0, pierce: 40, dtype: 'ice', stun: 1.0,
    paths: [
      P('Permafrost', [['Chill Air', 120, { slow: 0.4, slowT: 2 }], ['Cold Snap', 250, { dmg: 1 }], ['Ice Shards', 900, { frag: 6, dmg: 1 }],
        ['Glacial Spire', 3500, { dmg: 3, stun: 0.5, ap: true }], ['Absolute Zero', 17000, { dmg: 8, pierce: 300, ability: { id: 'freeze', name: 'Absolute Zero', cd: 40, dur: 5 } }]]),
      P('Reach', [['Wider Chill', 150, { rangeX: 1.2 }], ['Frost Lens', 300, { rangeX: 1.2, detect: true }], ['Brittle Ice', 1200, { brittle: 1 }],
        ['Arctic Wind', 4000, { kind: 'aura', rate: 0.25, slow: 0.5, slowT: 0.5, stun: 0, dmg: 1 }], ['Blizzard Heart', 15000, { rangeX: 1.5, dmg: 4, slow: 0.7, bossSlow: true }]]),
      P('Cryo', [['Faster Freeze', 180, { rateX: 0.8 }], ['Deep Freeze', 320, { stun: 0.5 }], ['Ice Beam', 1300, { kind: 'beam', rate: 0.9, dmg: 2, chain: 3, chainR: 90 }],
        ['Cryo Cannon', 3900, { dmg: 6, chain: 3, ap: true, boss: 0.5 }], ['Winter Monarch', 22000, { dmg: 25, chain: 8, rateX: 0.5, boss: 1 }]]),
    ] },

  { id: 'ember', name: 'Ember Shrine', emoji: '🔥', color: '#ff6b2c', cat: 'elemental', cost: 480,
    desc: 'Hurls fireballs that set slimes ablaze.',
    kind: 'proj', range: 140, rate: 1.1, dmg: 1, pierce: 3, speed: 400, dtype: 'fire', dot: 1, dotT: 3, pr: 6, shape: 'fireball',
    paths: [
      P('Blaze', [['Hotter Coals', 200, { dot: 1 }], ['Wildfire', 400, { splash: 30 }], ['Dragon Breath', 1400, { kind: 'aoe', rate: 0.2, pierce: 30, range: 110, dmg: 1, cone: true }],
        ['Inferno Shrine', 4500, { dot: 6, dmg: 3, pierce: 20 }], ['Phoenix Altar', 24000, { dot: 25, dmg: 10, ability: { id: 'meteor', name: 'Phoenix Dive', cd: 45, dmg: 1500, r: 140 } }]]),
      P('Kindle', [['Quick Kindle', 150, { rateX: 0.8 }], ['Twin Flames', 350, { count: 1, spread: 15 }], ['Heat Seekers', 1000, { homing: true, rangeX: 1.2 }],
        ['Flame Volley', 3300, { count: 2, rateX: 0.7 }], ['Solar Flare', 14000, { count: 4, dmg: 6, pierce: 10, rateX: 0.6 }]]),
      P('Ritual', [['Ember Sight', 160, { detect: true }], ['Cinder Shield', 300, { buffDmg: 0.5 }], ['Lava Burst', 1600, { splash: 50, dmg: 2, ap: true }],
        ['Magma Heart', 4800, { boss: 1.5, dmg: 10 }], ['Volcanic God', 26000, { dmg: 60, splash: 70, rateX: 0.9, boss: 2 }]]),
    ] },

  { id: 'tesla', name: 'Tesla Totem', emoji: '⚡', color: '#ffe14d', cat: 'elemental', cost: 650,
    desc: 'Lightning arcs between multiple slimes at once.',
    kind: 'beam', range: 130, rate: 1.2, dmg: 1, chain: 4, chainR: 85, dtype: 'energy',
    paths: [
      P('Overload', [['Higher Voltage', 300, { dmg: 1 }], ['Static Field', 500, { chain: 2, stun: 0.15 }], ['Ball Lightning', 1600, { chain: 6, chainR: 20 }],
        ['Thunder Totem', 5200, { dmg: 5, chain: 10, boss: 0.5 }], ['Storm Sovereign', 28000, { dmg: 18, chain: 25, rateX: 0.5, ability: { id: 'nuke', name: 'Skyfall', cd: 55, dmg: 250 } }]]),
      P('Capacitor', [['Fast Discharge', 220, { rateX: 0.8 }], ['Double Strike', 450, { rateX: 0.75 }], ['Ion Radar', 900, { detect: true, rangeX: 1.2 }],
        ['Plasma Arc', 3600, { ap: true, dmg: 3, rateX: 0.7 }], ['Railstorm', 16000, { rateX: 0.35, dmg: 6 }]]),
      P('Grid', [['Copper Coil', 180, { rangeX: 1.15 }], ['Conductive', 400, { buffRate: 0.08 }], ['Arc Network', 1400, { chainR: 40, chain: 3 }],
        ['Magnetic Pulse', 4400, { shred: 2, stun: 0.3 }], ['Grid Overlord', 20000, { buffRate: 0.15, buffDmg: 1, chain: 10, dmg: 8 }]]),
    ] },

  { id: 'prism', name: 'Prism Lens', emoji: '🔮', color: '#c084fc', cat: 'elemental', cost: 700,
    desc: 'Focuses light into a laser that pierces every slime in a line.',
    kind: 'beam', line: true, range: 170, rate: 0.6, dmg: 1, pierce: 6, dtype: 'energy',
    paths: [
      P('Focus', [['Polished Lens', 300, { dmg: 1 }], ['Twin Lens', 600, { rateX: 0.7 }], ['Sunbeam', 1800, { dmg: 2, pierce: 6, dtype: 'fire', dot: 1, dotT: 2 }],
        ['Solar Lance', 5500, { dmg: 8, boss: 1, ap: true }], ['Heliostat', 30000, { dmg: 30, pierce: 40, boss: 2, ability: { id: 'frenzy', name: 'Overcharge', cd: 50, dur: 6, x: 0.2 } }]]),
      P('Spectrum', [['Wider Beam', 250, { pierce: 4 }], ['Refraction', 550, { chain: 2, chainR: 100 }], ['Rainbow Split', 1700, { chain: 3, dtype: 'magic' }],
        ['Kaleidoscope', 5000, { chain: 6, dmg: 3 }], ['Aurora Engine', 21000, { chain: 12, dmg: 10, rateX: 0.6 }]]),
      P('Optics', [['Long Focus', 200, { rangeX: 1.25 }], ['True Sight', 400, { detect: true }], ['Crit Lens', 1200, { crit: 0.15, critMul: 4 }],
        ['Lens Array', 4200, { buffRange: 0.1, rateX: 0.7 }], ['Starfocus', 18000, { crit: 0.25, critMul: 10, dmg: 6 }]]),
    ] },

  { id: 'tide', name: 'Tidecaller', emoji: '🌊', color: '#2f80ed', cat: 'elemental', cost: 450,
    desc: 'Sends crashing waves that push slimes backwards.',
    kind: 'proj', range: 150, rate: 1.8, dmg: 1, pierce: 12, speed: 260, dtype: 'nature', knock: 18, pr: 16, shape: 'wave',
    paths: [
      P('Surge', [['Stronger Current', 200, { knock: 10 }], ['Big Waves', 400, { pr: 6, pierce: 8 }], ['Undertow', 1300, { slow: 0.4, slowT: 2 }],
        ['Riptide', 4200, { knock: 20, dmg: 3, bossKnock: true }], ['Tsunami Lord', 20000, { pierce: 80, dmg: 10, ability: { id: 'tsunami', name: 'Tsunami', cd: 60, push: 260 } }]]),
      P('Flow', [['Quick Tides', 180, { rateX: 0.8 }], ['Rolling Tides', 350, { rateX: 0.8 }], ['Twin Waves', 1100, { count: 1, spread: 25 }],
        ['Whirlpool', 3800, { dmg: 4, dot: 2, dotT: 2 }], ['Maelstrom', 16000, { count: 3, spread: 60, dmg: 8, rateX: 0.6 }]]),
      P('Depths', [['Far Tides', 150, { rangeX: 1.2 }], ['Sonar', 300, { detect: true }], ['Pressure', 1000, { ap: true, dmg: 2 }],
        ['Abyssal Current', 3600, { dtype: 'magic', dmg: 4 }], ['Ocean Heart', 17000, { dmg: 16, pierce: 40, boss: 1 }]]),
    ] },

  { id: 'wind', name: 'Gust Windmill', emoji: '🌪️', color: '#b6e3d4', cat: 'elemental', cost: 400,
    desc: 'Blasts gusts that blow slimes back down the path.',
    kind: 'aoe', range: 100, rate: 2.4, dmg: 0, pierce: 20, dtype: 'nature', knock: 35, slow: 0.3, slowT: 1,
    paths: [
      P('Gale', [['Stronger Gust', 200, { knock: 15 }], ['Gale Force', 450, { pierce: 20, rateX: 0.85 }], ['Cyclone', 1500, { knock: 30, dmg: 1 }],
        ['Hurricane', 4800, { knock: 30, dmg: 3, bossKnock: true }], ['Sky Tyrant', 22000, { knock: 60, dmg: 10, ability: { id: 'tsunami', name: 'Hurricane', cd: 50, push: 320 } }]]),
      P('Breeze', [['Fresh Breeze', 150, { rateX: 0.8 }], ['Tailwind', 350, { buffRate: 0.1 }], ['Updraft', 1200, { rangeX: 1.3 }],
        ['Jetstream', 4000, { buffRate: 0.15, buffRange: 0.1 }], ['Wind Spirit', 15000, { buffRate: 0.25, buffPierce: 1 }]]),
      P('Shear', [['Sand Gust', 160, { dmg: 1 }], ['Razor Wind', 380, { dtype: 'sharp', dmg: 1 }], ['Fog Clear', 1000, { detect: true, grantDetect: true }],
        ['Shear Storm', 3600, { dmg: 4, ap: true, rateX: 0.7 }], ['Tempest Blades', 17000, { dmg: 12, pierce: 60, rateX: 0.5 }]]),
    ] },

  { id: 'venom', name: 'Venom Bloom', emoji: '🌺', color: '#c13584', cat: 'elemental', cost: 500,
    desc: 'A poisonous flower whose aura melts slimes over time.',
    kind: 'aura', range: 80, rate: 0.5, dmg: 0, dtype: 'poison', dot: 1, dotT: 2, pierce: 30,
    paths: [
      P('Toxin', [['Bitter Pollen', 220, { dot: 1 }], ['Nightshade', 450, { dot: 1, dotT: 1 }], ['Corrosion', 1400, { shred: 1, ap: true }],
        ['Deathcap', 4600, { dot: 6, boss: 1 }], ['Plague Rose', 23000, { dot: 30, pierce: 200, boss: 2 }]]),
      P('Spores', [['Wide Petals', 160, { rangeX: 1.2 }], ['Spore Cloud', 380, { rangeX: 1.2, slow: 0.2, slowT: 0.6 }], ['Seeker Spores', 1200, { detect: true }],
        ['Garden of Rot', 4100, { rangeX: 1.4, pierce: 60 }], ['Endless Bloom', 18000, { rangeX: 1.4, dot: 10, ability: { id: 'nuke', name: 'Pollen Burst', cd: 50, dmg: 120 } }]]),
      P('Thornroot', [['Root Snare', 200, { slow: 0.35, slowT: 0.6 }], ['Strangle', 400, { dmg: 1 }], ['Vine Lash', 1500, { kind: 'proj', speed: 600, pr: 4, rate: 0.5, dmg: 2, pierce: 4, dtype: 'nature' }],
        ['Briar Wall', 4500, { stun: 0.2, dmg: 4 }], ['World Tree Sprout', 21000, { dmg: 14, pierce: 14, rateX: 0.5, count: 2, spread: 15 }]]),
    ] },

  // ───────────────────────────── PRECISION ─────────────────────────────
  { id: 'hawk', name: 'Hawk Sniper', emoji: '🦅', color: '#8b5e3c', cat: 'precision', cost: 400,
    desc: 'Strikes any slime on the map with pinpoint accuracy.',
    kind: 'beam', range: 9999, rate: 1.7, dmg: 2, pierce: 1, dtype: 'sharp', detect: false, sniper: true,
    paths: [
      P('Talon', [['Sharp Talons', 300, { dmg: 2 }], ['Steel Talons', 600, { dmg: 3, ap: true }], ['Headhunter', 2200, { dmg: 8, boss: 1 }],
        ['Death Dive', 6000, { dmg: 25, boss: 1 }], ['Sky Executioner', 30000, { dmg: 90, boss: 2, ability: { id: 'nuke', name: 'Executioner', cd: 60, dmg: 4000, single: true } }]]),
      P('Wing', [['Swift Wings', 250, { rateX: 0.75 }], ['Night Vision', 400, { detect: true }], ['Shrapnel Feathers', 1500, { frag: 6 }],
        ['Hawk Flock', 5000, { rateX: 0.4 }], ['Storm Raptor', 19000, { rateX: 0.4, dmg: 6, frag: 6 }]]),
      P('Command', [['Spotter', 200, { buffRange: 0.08 }], ['Supply Drop', 600, { income: 120 }], ['Eagle Nest', 1600, { income: 250, grantDetect: true }],
        ['Air Command', 4800, { buffRate: 0.1, income: 350 }], ['Hawk Marshal', 20000, { income: 1200, ability: { id: 'cash', name: 'Air Drop', cd: 60, cash: 2500 } }]]),
    ] },

  { id: 'rail', name: 'Rail Gunner', emoji: '🎯', color: '#6b7280', cat: 'precision', cost: 800,
    desc: 'Fires hypersonic slugs that punch through armor and everything behind it.',
    kind: 'proj', range: 260, rate: 2.0, dmg: 3, pierce: 12, speed: 1800, dtype: 'energy', ap: true, pr: 3, shape: 'slug',
    paths: [
      P('Slug', [['Tungsten Slugs', 400, { dmg: 2 }], ['Depleted Core', 700, { dmg: 3, pierce: 8 }], ['Collider', 2400, { dmg: 10, boss: 1 }],
        ['Mass Driver', 7000, { dmg: 30, pierce: 30 }], ['Orbital Rail', 34000, { dmg: 120, pierce: 100, boss: 2 }]]),
      P('Cycle', [['Coolant', 300, { rateX: 0.8 }], ['Capacitor Bank', 600, { rateX: 0.75 }], ['Burst Fire', 1900, { count: 2, spread: 4 }],
        ['Gatling Rail', 6000, { rateX: 0.35, dmg: 1 }], ['Infinite Rail', 26000, { rateX: 0.4, count: 2, dmg: 6, ability: { id: 'frenzy', name: 'Redline', cd: 45, dur: 6, x: 0.25 } }]]),
      P('Sensor', [['Scope', 250, { rangeX: 1.25 }], ['Thermal Scope', 450, { detect: true }], ['Marked Target', 1600, { crit: 0.2, critMul: 3 }],
        ['Shatter Rounds', 4500, { shred: 3, splash: 30 }], ['Godslayer', 22000, { crit: 0.3, critMul: 8, boss: 1.5 }]]),
    ] },

  { id: 'mole', name: 'Mortar Mole', emoji: '🦫', color: '#7c5a3b', cat: 'precision', cost: 620,
    desc: 'Digs in and shells the strongest slime in range with explosive mud.',
    kind: 'mortar', range: 230, rate: 1.6, dmg: 1, pierce: 25, splash: 50, dtype: 'blast', count: 1, delay: 0.6,
    paths: [
      P('Shells', [['Bigger Shells', 300, { splash: 15 }], ['Heavy Shells', 500, { dmg: 2 }], ['Burning Mud', 1500, { dtype: 'fire', dot: 2, dotT: 3 }],
        ['Earthquake', 5000, { dmg: 8, stun: 0.4, splash: 20 }], ['Tectonic Mole', 26000, { dmg: 40, splash: 40, boss: 1.5, ability: { id: 'meteor', name: 'Tectonic Slam', cd: 50, dmg: 2500, r: 180 } }]]),
      P('Barrage', [['Fast Loader', 250, { rateX: 0.8 }], ['Twin Mortar', 550, { count: 1 }], ['Shrapnel Mud', 1400, { frag: 6 }],
        ['Artillery Line', 4200, { count: 2, rateX: 0.7 }], ['Bombardier', 18000, { count: 4, rateX: 0.6, dmg: 6 }]]),
      P('Burrow', [['Tremor Sense', 200, { detect: true }], ['Deep Shells', 450, { ap: true, dmg: 1 }], ['Seismic Mines', 1300, { stun: 0.3 }],
        ['Burrow Network', 4000, { rangeX: 2.5 }], ['Core Driller', 20000, { dmg: 25, ap: true, boss: 1, splash: 30 }]]),
    ] },

  { id: 'star', name: 'Starfall Observatory', emoji: '🔭', color: '#4c3fa0', cat: 'precision', cost: 900,
    desc: 'Calls down shooting stars on random slimes within its huge range.',
    kind: 'mortar', range: 220, rate: 1.4, dmg: 2, pierce: 15, splash: 34, dtype: 'magic', count: 2, delay: 0.45, random: true, detect: true,
    paths: [
      P('Nova', [['Brighter Stars', 400, { dmg: 1 }], ['Red Giants', 700, { splash: 15, dmg: 1 }], ['Supernova', 2200, { dmg: 6, splash: 20 }],
        ['Pulsar', 6500, { stun: 0.4, dmg: 10 }], ['Big Bang', 32000, { dmg: 50, splash: 50, boss: 1, ability: { id: 'nuke', name: 'Big Bang', cd: 70, dmg: 900, ap: true } }]]),
      P('Constellation', [['Twin Stars', 350, { count: 1 }], ['Triangulum', 600, { count: 1 }], ['Orion Rain', 2000, { count: 2, rateX: 0.8 }],
        ['Meteor Belt', 5800, { count: 4 }], ['Galaxy Engine', 26000, { count: 8, dmg: 10, rateX: 0.6 }]]),
      P('Astrology', [['Star Chart', 250, { rangeX: 1.2 }], ['Lucky Star', 500, { gemChance: 0.002 }], ['Zodiac Aura', 1500, { buffDmg: 1 }],
        ['Cosmic Alignment', 4600, { buffRate: 0.12, buffDmg: 1 }], ['Celestial Throne', 20000, { buffDmg: 3, buffRate: 0.15, buffPierce: 2 }]]),
    ] },

  { id: 'lantern', name: 'Shadow Lantern', emoji: '🏮', color: '#ff9f43', cat: 'precision', cost: 550,
    desc: 'Reveals Phase slimes and blasts them with spirit fire.',
    kind: 'beam', range: 150, rate: 0.9, dmg: 1, pierce: 1, chain: 1, chainR: 70, dtype: 'magic', detect: true,
    paths: [
      P('Spirit', [['Wisp Fire', 250, { dmg: 1 }], ['Twin Wisps', 450, { chain: 2 }], ['Soul Burn', 1500, { dot: 2, dotT: 3 }],
        ['Will-o-Wisps', 4600, { chain: 6, dmg: 4 }], ['Lantern of Souls', 23000, { chain: 12, dmg: 15, rateX: 0.5 }]]),
      P('Reveal', [['Brighter Glow', 200, { rangeX: 1.2 }], ['Revealing Light', 500, { grantDetect: true }], ['Dispel', 1700, { strip: true }],
        ['Exorcism', 5000, { dmg: 10, boss: 1, strip: true }], ['Eternal Lantern', 19000, { rangeX: 1.6, buffDmg: 2, ability: { id: 'buff', name: 'Lantern Festival', cd: 60, dur: 10, x: 0.5 } }]]),
      P('Hex', [['Curse', 180, { brittle: 1 }], ['Weakness Hex', 400, { slow: 0.2, slowT: 1 }], ['Doom Mark', 1300, { crit: 0.2, critMul: 5 }],
        ['Hex Cascade', 4000, { chain: 4, brittle: 1 }], ['Night Mother', 21000, { dmg: 20, crit: 0.3, critMul: 6, chain: 4 }]]),
    ] },

  // ───────────────────────────── TRAPS & MELEE ─────────────────────────────
  { id: 'spike', name: 'Spike Weaver', emoji: '🕸️', color: '#94a3b8', cat: 'trap', cost: 600,
    desc: 'Weaves spiky webs onto the path nearby.',
    kind: 'trap', range: 110, rate: 2.2, dmg: 1, trapPierce: 10, trapMax: 15, dtype: 'sharp',
    paths: [
      P('Silk', [['Sharper Silk', 250, { trapPierce: 5 }], ['Barbed Silk', 500, { dmg: 1 }], ['Steel Webs', 1600, { trapPierce: 15, ap: true }],
        ['Adamant Webs', 5200, { dmg: 6, boss: 1 }], ['Arachne', 25000, { dmg: 30, trapPierce: 40, boss: 2 }]]),
      P('Weave', [['Fast Weaving', 200, { rateX: 0.75 }], ['More Silk', 400, { trapMax: 10, rateX: 0.8 }], ['Sticky Web', 1100, { slow: 0.5, slowT: 2 }],
        ['Web Cannon', 3600, { rateX: 0.4 }], ['Silk Storm', 16000, { rateX: 0.4, trapPierce: 20, ability: { id: 'barrage', name: 'Web Rain', cd: 45, n: 30, dmg: 20 } }]]),
      P('Venom', [['Fang Webs', 220, { dtype: 'poison', dot: 1, dotT: 3 }], ['Widow Bite', 450, { dot: 2 }], ['Mine Weaver', 1400, { splash: 40, dtype: 'blast' }],
        ['Cluster Mines', 4600, { splash: 20, dmg: 5 }], ['Doom Nest', 21000, { dmg: 40, splash: 30, boss: 1 }]]),
    ] },

  { id: 'blade', name: 'Bladewheel', emoji: '🌀', color: '#64748b', cat: 'trap', cost: 520,
    desc: 'Spinning blades orbit the tower and shred anything nearby.',
    kind: 'orbit', range: 70, blades: 2, orbitR: 55, spin: 3.2, dmg: 1, rate: 0.35, dtype: 'sharp',
    paths: [
      P('Edge', [['Honed Edges', 250, { dmg: 1 }], ['Serrated', 500, { dmg: 1, ap: true }], ['Buzzsaw', 1600, { dmg: 3, spin: 1.5 }],
        ['Diamond Saw', 5000, { dmg: 10, boss: 1 }], ['Eclipse Wheel', 26000, { dmg: 40, boss: 2, blades: 2 }]]),
      P('Spin', [['Third Blade', 300, { blades: 1 }], ['Fourth Blade', 450, { blades: 1 }], ['Wide Orbit', 1200, { orbitR: 18, range: 18 }],
        ['Blade Storm', 4200, { blades: 4, rateX: 0.7 }], ['Cyclone of Steel', 18000, { blades: 6, dmg: 8, ability: { id: 'frenzy', name: 'Overspin', cd: 40, dur: 8, x: 0.3 } }]]),
      P('Fling', [['Shard Fling', 200, { fling: 1 }], ['More Shards', 400, { fling: 2 }], ['Burning Blades', 1300, { dtype: 'fire', dot: 2, dotT: 2 }],
        ['Gravity Wheel', 4000, { slow: 0.3, slowT: 0.5 }], ['Singularity Wheel', 22000, { dmg: 18, fling: 6, slow: 0.4 }]]),
    ] },

  { id: 'golem', name: 'Quartz Golem', emoji: '🗿', color: '#a1a1aa', cat: 'trap', cost: 750,
    desc: 'A slow but devastating ground-pound that stuns everything nearby.',
    kind: 'aoe', range: 75, rate: 2.0, dmg: 3, pierce: 40, dtype: 'blast', stun: 0.3, ap: true,
    paths: [
      P('Crush', [['Heavy Fists', 350, { dmg: 2 }], ['Granite Fists', 650, { dmg: 3 }], ['Fault Line', 2000, { dmg: 6, rangeX: 1.2 }],
        ['Mountain Breaker', 6200, { dmg: 25, boss: 1.5 }], ['Titan of Quartz', 30000, { dmg: 100, boss: 2, ability: { id: 'meteor', name: 'Earthshatter', cd: 50, dmg: 3000, r: 200 } }]]),
      P('Tremor', [['Quick Stomp', 250, { rateX: 0.8 }], ['Shockwave', 550, { stun: 0.3 }], ['Aftershock', 1600, { rateX: 0.7 }],
        ['Seismic Core', 4800, { stun: 0.4, rangeX: 1.3 }], ['Earth Mother', 21000, { rateX: 0.4, stun: 0.6, pierce: 200 }]]),
      P('Crystal', [['Crystal Eyes', 200, { detect: true }], ['Geode Skin', 450, { dtype: 'magic' }], ['Crystal Shards', 1300, { frag: 8 }],
        ['Amethyst Core', 4100, { buffDmg: 1, frag: 4 }], ['Prismatic Golem', 19000, { frag: 16, dmg: 12, buffDmg: 2 }]]),
    ] },

  { id: 'gravity', name: 'Gravity Well', emoji: '🕳️', color: '#3f3d56', cat: 'trap', cost: 850,
    desc: 'Warps space: slimes slow to a crawl and get crushed.',
    kind: 'aura', range: 90, rate: 0.4, dmg: 1, pierce: 25, dtype: 'magic', slow: 0.35, slowT: 0.5,
    paths: [
      P('Crush', [['Denser Core', 400, { dmg: 1 }], ['Neutron Core', 700, { dmg: 2, ap: true }], ['Spaghettify', 2100, { shred: 1, dmg: 3 }],
        ['Event Horizon', 6500, { dmg: 10, boss: 1, bossSlow: true }], ['Black Hole', 32000, { dmg: 40, pierce: 200, ability: { id: 'nuke', name: 'Collapse', cd: 60, dmg: 800, ap: true } }]]),
      P('Warp', [['Wider Pull', 300, { rangeX: 1.2 }], ['Heavy Pull', 600, { slow: 0.2 }], ['Time Dilation', 1900, { slow: 0.15, rangeX: 1.2 }],
        ['Stasis Field', 5200, { stun: 0.15 }], ['Frozen Time', 22000, { slow: 0.2, ability: { id: 'freeze', name: 'Stop Time', cd: 50, dur: 6 } }]]),
      P('Lens', [['Gravity Lens', 250, { detect: true }], ['Bending Light', 500, { buffRange: 0.1 }], ['Orbit Stabilizer', 1600, { buffPierce: 1 }],
        ['Lagrange Point', 4800, { buffRate: 0.1, buffPierce: 1 }], ['Cosmic Anchor', 20000, { buffRate: 0.2, buffRange: 0.15, buffPierce: 2 }]]),
    ] },

  // ───────────────────────────── SUPPORT ─────────────────────────────
  { id: 'hive', name: 'Honey Hive', emoji: '🐝', color: '#f5b700', cat: 'support', cost: 1050,
    desc: 'Busy bees produce honey-money at the end of every wave.',
    kind: 'farm', range: 60, income: 90,
    paths: [
      P('Nectar', [['Busy Bees', 400, { income: 40 }], ['Clover Fields', 700, { income: 80 }], ['Royal Jelly', 2500, { income: 250 }],
        ['Honey Empire', 6500, { income: 700 }], ['Golden Comb', 50000, { income: 3500, ability: { id: 'cash', name: 'Honey Rush', cd: 70, cash: 5000 } }]]),
      P('Bank', [['Honey Jar', 300, { bank: 0.05 }], ['Honey Vault', 600, { bank: 0.05 }], ['Interest Bees', 2200, { bank: 0.05, income: 100 }],
        ['Comb Exchange', 7000, { bank: 0.05, income: 300 }], ['Bee Bank Tycoon', 40000, { bank: 0.1, income: 1500 }]]),
      P('Swarm', [['Guard Bees', 250, { kind: 'proj', rate: 0.9, dmg: 1, pierce: 1, speed: 500, range: 130, dtype: 'sharp', homing: true, pr: 3 }], ['Stinger Bees', 500, { dmg: 1, pierce: 2 }], ['Pollinator', 1500, { buffRate: 0.08 }],
        ['Killer Swarm', 4600, { count: 3, spread: 30, dmg: 2 }], ['Hive Mind', 22000, { count: 6, dmg: 6, buffRate: 0.12, income: 600 }]]),
    ] },

  { id: 'beacon', name: 'Beacon of Valor', emoji: '🗼', color: '#f43f5e', cat: 'support', cost: 750,
    desc: 'Inspires nearby towers to attack faster and see further.',
    kind: 'support', range: 140, buffRate: 0.15, buffRange: 0.1,
    paths: [
      P('Rally', [['Battle Hymn', 400, { buffRate: 0.05 }], ['War Drums', 800, { buffDmg: 1 }], ['Valor Aura', 2500, { buffPierce: 2 }],
        ['Heroic Presence', 7000, { buffDmg: 2, buffRate: 0.05 }], ['Avatar of Valor', 30000, { buffDmg: 4, buffPierce: 4, ability: { id: 'buff', name: 'Last Stand', cd: 60, dur: 12, x: 0.5 } }]]),
      P('Signal', [['Wide Signal', 300, { rangeX: 1.25 }], ['Radar Pulse', 500, { grantDetect: true }], ['Coordination', 1800, { buffRange: 0.1 }],
        ['Overwatch', 5200, { buffAp: true }], ['Grand Beacon', 20000, { rangeX: 1.5, buffRate: 0.1 }]]),
      P('Trade', [['Discount Banner', 500, { discount: 0.05 }], ['Merchant Guild', 1000, { discount: 0.05 }], ['Bounty Board', 2600, { bounty: 0.1 }],
        ['Gilded Beacon', 6000, { bounty: 0.1, income: 200 }], ['Treasury Spire', 26000, { bounty: 0.2, income: 800 }]]),
    ] },

  { id: 'bard', name: 'Bard of Echoes', emoji: '🎻', color: '#e879f9', cat: 'support', cost: 600,
    desc: 'Plays sonic chords that daze slimes and hype up allies.',
    kind: 'aoe', range: 110, rate: 2.5, dmg: 1, pierce: 30, dtype: 'magic', stun: 0.1, buffRate: 0.08,
    paths: [
      P('Ballad', [['Sweet Melody', 300, { buffRate: 0.04 }], ['Encore', 600, { buffDmg: 1 }], ['Anthem', 2100, { buffRate: 0.06, buffRange: 0.08 }],
        ['Symphony', 6000, { buffDmg: 2, buffPierce: 1 }], ['Maestro', 26000, { buffDmg: 3, buffRate: 0.1, ability: { id: 'buff', name: 'Crescendo', cd: 55, dur: 10, x: 0.4 } }]]),
      P('Discord', [['Sharp Notes', 200, { dmg: 1 }], ['Dissonance', 450, { stun: 0.3 }], ['Sonic Boom', 1600, { dmg: 4, ap: true }],
        ['Shatter Chord', 5200, { dmg: 10, brittle: 1 }], ['Death Metal', 22000, { dmg: 35, rateX: 0.5, boss: 1 }]]),
      P('Echo', [['Resonance', 180, { rangeX: 1.2 }], ['Echo Sight', 380, { detect: true, grantDetect: true }], ['Lullaby', 1400, { slow: 0.4, slowT: 2 }],
        ['Sleep Song', 4400, { stun: 0.8 }], ['Song of Ages', 19000, { stun: 1.2, slow: 0.3, rangeX: 1.4 }]]),
    ] },

  { id: 'sundial', name: 'Chrono Sundial', emoji: '⏳', color: '#e2b04a', cat: 'support', cost: 900,
    desc: 'Bends time: slimes nearby slow down and towers speed up.',
    kind: 'aura', range: 120, rate: 0.5, dmg: 0, pierce: 40, dtype: 'magic', slow: 0.2, slowT: 0.6, buffRate: 0.1,
    paths: [
      P('Haste', [['Quick Sand', 400, { buffRate: 0.05 }], ['Hourglass', 900, { buffRate: 0.05 }], ['Time Warp', 2800, { buffRate: 0.08 }],
        ['Temporal Rift', 7500, { buffRate: 0.08, buffPierce: 1 }], ['Lord of Time', 34000, { buffRate: 0.1, ability: { id: 'buff', name: 'Haste', cd: 60, dur: 12, x: 0.5 } }]]),
      P('Slow', [['Sticky Seconds', 300, { slow: 0.1 }], ['Long Minutes', 600, { rangeX: 1.2 }], ['Dragging Hours', 2000, { slow: 0.15, bossSlow: true }],
        ['Stasis', 5600, { stun: 0.1 }], ['Eternity', 24000, { slow: 0.15, ability: { id: 'freeze', name: 'Eternity', cd: 50, dur: 7 } }]]),
      P('Age', [['Erode', 250, { dmg: 1 }], ['Decay', 500, { dot: 1, dotT: 1 }], ['Rust', 1500, { shred: 1 }],
        ['Wither', 4600, { dmg: 4, ap: true, boss: 1 }], ['Entropy', 20000, { dmg: 15, dot: 10, pierce: 100 }]]),
    ] },

  // ───────────────────────────── SUMMONERS ─────────────────────────────
  { id: 'workshop', name: 'Clockwork Workshop', emoji: '⚙️', color: '#b45309', cat: 'summon', cost: 850,
    desc: 'Builds wind-up golems that march up the path into the slimes.',
    kind: 'summon', range: 0, rate: 3.0, mHp: 6, mDmg: 1, mSpeed: 55, mMax: 4, mR: 12, mEmoji: '🤖', dtype: 'blast',
    paths: [
      P('Golems', [['Thicker Plating', 350, { mHp: 4 }], ['Iron Golems', 700, { mHp: 6, mDmg: 1 }], ['Steam Knights', 2300, { mHp: 15, mDmg: 3 }],
        ['Siege Automaton', 6500, { mHp: 60, mDmg: 10, mR: 6 }], ['Colossal Mech', 30000, { mHp: 300, mDmg: 40, mR: 8, ability: { id: 'summon', name: 'Deploy Mech', cd: 60, hp: 2000, dmg: 100 } }]]),
      P('Assembly', [['Spring Coils', 250, { rateX: 0.8 }], ['Assembly Line', 500, { mMax: 3, rateX: 0.85 }], ['Mass Production', 1700, { mMax: 4, rateX: 0.7 }],
        ['Factory Floor', 5000, { mMax: 6, rateX: 0.6 }], ['Gigafactory', 22000, { mMax: 12, rateX: 0.5, mHp: 20 }]]),
      P('Gadgets', [['Spark Plugs', 220, { dtype: 'energy' }], ['Magnet Boots', 450, { mSpeed: 25 }], ['Boom Bots', 1400, { mBoom: 50 }],
        ['Tesla Bots', 4200, { mDmg: 4, mChain: 3 }], ['Omega Drones', 20000, { mDmg: 15, mBoom: 80, mHp: 30 }]]),
    ] },

  { id: 'roost', name: 'Dragonling Roost', emoji: '🐉', color: '#16a34a', cat: 'summon', cost: 1100,
    desc: 'Baby dragons swoop and breathe homing fireballs.',
    kind: 'proj', range: 210, rate: 1.0, dmg: 2, pierce: 2, speed: 380, dtype: 'fire', homing: true, dot: 1, dotT: 2, pr: 6, shape: 'fireball',
    paths: [
      P('Wyrm', [['Hatchling Fury', 450, { dmg: 1 }], ['Drake Fire', 900, { dmg: 2, dot: 2 }], ['Wyvern', 2800, { splash: 40, dmg: 4 }],
        ['Elder Dragon', 8000, { dmg: 18, boss: 1 }], ['Dragon Sovereign', 38000, { dmg: 70, splash: 60, boss: 2, ability: { id: 'meteor', name: 'Dragonfire', cd: 50, dmg: 4000, r: 200 } }]]),
      P('Clutch', [['Second Egg', 400, { count: 1, spread: 20 }], ['Third Egg', 700, { count: 1 }], ['Brood Mother', 2400, { rateX: 0.7 }],
        ['Dragon Flight', 6800, { count: 3, rateX: 0.7 }], ['Endless Brood', 27000, { count: 6, dmg: 8, rateX: 0.6 }]]),
      P('Scale', [['Keen Eyes', 300, { detect: true }], ['Frost Wyrm', 650, { dtype: 'ice', slow: 0.4, slowT: 1.5, dot: 0 }], ['Storm Wyrm', 2000, { dtype: 'energy', stun: 0.2 }],
        ['Void Wyrm', 6000, { dtype: 'magic', ap: true, dmg: 6 }], ['Prismatic Dragon', 25000, { dmg: 20, pierce: 10, crit: 0.2, critMul: 5 }]]),
    ] },

  { id: 'orrery', name: 'Arcane Orrery', emoji: '🪐', color: '#7c3aed', cat: 'summon', cost: 750,
    desc: 'Fires seeking arcane orbs that hunt down slimes.',
    kind: 'proj', range: 160, rate: 0.9, dmg: 1, pierce: 3, speed: 300, dtype: 'magic', homing: true, pr: 6, shape: 'orb',
    paths: [
      P('Arcana', [['Arcane Focus', 350, { dmg: 1 }], ['Mana Bolts', 700, { rateX: 0.7 }], ['Arcane Blast', 2200, { splash: 35, dmg: 2 }],
        ['Archmage Orrery', 6800, { dmg: 10, count: 2, spread: 30 }], ['Cosmic Arcanist', 32000, { dmg: 35, count: 3, boss: 1, ability: { id: 'nuke', name: 'Arcane Storm', cd: 55, dmg: 600, ap: true } }]]),
      P('Orbit', [['Moon Orbs', 300, { orbit: true, blades: 1 }], ['Twin Moons', 600, { blades: 1 }], ['Planet Ring', 1800, { blades: 2, dmg: 1 }],
        ['Solar System', 5500, { blades: 4, dmg: 3 }], ['Grand Orrery', 24000, { blades: 6, dmg: 10, rangeX: 1.3 }]]),
      P('Wisdom', [['Third Eye', 200, { detect: true }], ['Mana Shield', 500, { buffPierce: 1 }], ['Spell Echo', 1500, { crit: 0.25, critMul: 3 }],
        ['Arcane Library', 4600, { buffDmg: 1, buffRange: 0.08 }], ['Sage of Spheres', 20000, { buffDmg: 2, crit: 0.3, critMul: 6 }]]),
    ] },

  { id: 'mushroom', name: 'Sporecap Colony', emoji: '🍄', color: '#ef4444', cat: 'summon', cost: 480,
    desc: 'Grows bouncy mushrooms on the path that pop slimes and spread spores.',
    kind: 'trap', range: 120, rate: 2.8, dmg: 2, trapPierce: 4, trapMax: 8, dtype: 'nature', splash: 40,
    paths: [
      P('Bloom', [['Plump Caps', 200, { trapPierce: 3 }], ['Puffballs', 400, { splash: 15, dmg: 1 }], ['Toxic Bloom', 1200, { dtype: 'poison', dot: 3, dotT: 3 }],
        ['Fungal Bomb', 4000, { dmg: 10, splash: 20 }], ['Mycelium Overmind', 20000, { dmg: 40, trapPierce: 10, splash: 30, boss: 1 }]]),
      P('Grow', [['Fast Spores', 180, { rateX: 0.8 }], ['Fertile Soil', 350, { trapMax: 6, rateX: 0.85 }], ['Fairy Ring', 1100, { rateX: 0.6 }],
        ['Mushroom Forest', 3600, { trapMax: 12, rateX: 0.6 }], ['Endless Mycelium', 16000, { rateX: 0.4, trapMax: 20, ability: { id: 'barrage', name: 'Spore Storm', cd: 45, n: 25, dmg: 40 } }]]),
      P('Fungus', [['Glowcaps', 160, { detect: true }], ['Sleepy Spores', 400, { stun: 0.4 }], ['Rot Caps', 1300, { shred: 1, ap: true }],
        ['Truffle Farm', 3200, { income: 300 }], ['Fungal Kingdom', 15000, { income: 900, dmg: 10 }]]),
    ] },

  { id: 'lumen', name: 'Lumen Monk', emoji: '🧘', color: '#fde68a', cat: 'summon', cost: 680,
    desc: 'A meditating monk who unleashes waves of radiant chi.',
    kind: 'proj', radial: true, count: 4, range: 120, rate: 1.2, dmg: 2, pierce: 4, speed: 360, dtype: 'magic', pr: 7, shape: 'orb', detect: true,
    paths: [
      P('Radiance', [['Inner Light', 300, { dmg: 1 }], ['Halo', 600, { count: 4 }], ['Chi Burst', 2000, { dmg: 3, pierce: 4 }],
        ['Enlightened', 6000, { dmg: 10, count: 4 }], ['Ascended Master', 28000, { dmg: 35, count: 8, ability: { id: 'nuke', name: 'Nirvana', cd: 60, dmg: 700, ap: true } }]]),
      P('Flow', [['Breathing', 250, { rateX: 0.8 }], ['Focus', 500, { rateX: 0.8 }], ['Thousand Palms', 1600, { rateX: 0.6 }],
        ['Flowing River', 4600, { rateX: 0.6, pierce: 6 }], ['Endless Flow', 21000, { rateX: 0.4, dmg: 8 }]]),
      P('Harmony', [['Calm Mind', 220, { buffRange: 0.06 }], ['Peaceful Aura', 450, { slow: 0.25, slowT: 1 }], ['Healing Chant', 1500, { lifeRegen: 1 }],
        ['Monastery', 4400, { lifeRegen: 3, buffRate: 0.08 }], ['Zen Garden', 18000, { lifeRegen: 10, buffRate: 0.12, buffDmg: 2 }]]),
    ] },
];

export const TOWER_MAP = Object.fromEntries(TOWERS.map((t) => [t.id, t]));
export const CATEGORIES = [
  { id: 'primary', name: 'Primary', emoji: '🎯' },
  { id: 'elemental', name: 'Elemental', emoji: '🔥' },
  { id: 'precision', name: 'Precision', emoji: '🔭' },
  { id: 'trap', name: 'Traps', emoji: '🕸️' },
  { id: 'support', name: 'Support', emoji: '🐝' },
  { id: 'summon', name: 'Summoners', emoji: '🐉' },
];

/** Human readable descriptions auto-generated from upgrade mods (keeps 420 upgrades maintainable). */
const LABELS = {
  dmg: (v) => `${v > 0 ? '+' : ''}${v} damage`, pierce: (v) => `+${v} pierce`, count: (v) => `+${v} projectiles`,
  rateX: (v) => `${Math.round((1 / v - 1) * 100)}% faster attacks`, rangeX: (v) => `+${Math.round((v - 1) * 100)}% range`,
  speedX: (v) => `+${Math.round((v - 1) * 100)}% projectile speed`, splash: (v) => `+${v} splash radius`,
  detect: () => 'detects Phase slimes', ap: () => 'pierces armor', homing: () => 'homing shots', dot: (v) => `+${v} damage over time`,
  slow: (v) => `+${Math.round(v * 100)}% slow`, stun: (v) => `+${v}s stun`, knock: (v) => `+${v} knockback`, chain: (v) => `+${v} chain targets`,
  boss: (v) => `+${Math.round(v * 100)}% vs behemoths`, income: (v) => `+$${v} per wave`, buffRate: (v) => `nearby towers +${Math.round(v * 100)}% attack speed`,
  buffDmg: (v) => `nearby towers +${v} damage`, buffRange: (v) => `nearby towers +${Math.round(v * 100)}% range`, buffPierce: (v) => `nearby towers +${v} pierce`,
  grantDetect: () => 'nearby towers detect Phase', shred: (v) => `strips ${v} armor`, crit: (v) => `${Math.round(v * 100)}% crit chance`,
  frag: (v) => `releases ${v} fragments`, cluster: (v) => `${v} cluster bomblets`, blades: (v) => `+${v} orbiting blades`, mHp: (v) => `+${v} minion health`,
  mDmg: (v) => `+${v} minion damage`, mMax: (v) => `+${v} max minions`, trapPierce: (v) => `+${v} trap durability`, trapMax: (v) => `+${v} max traps`,
  bank: (v) => `+${Math.round(v * 100)}% interest on banked cash`, discount: (v) => `${Math.round(v * 100)}% discount nearby`, bounty: (v) => `+${Math.round(v * 100)}% pop cash nearby`,
  lifeRegen: (v) => `+${v} lives per wave`, brittle: () => 'targets take +1 damage from all hits', strip: () => 'strips Phase & Regen', bossSlow: () => 'slows behemoths',
  bossKnock: () => 'pushes behemoths', fling: (v) => `flings ${v} shards`, mBoom: () => 'minions explode', dtype: (v) => `${v} damage`,
};
export function describeMods(m) {
  const out = [];
  for (const k in m) { if (k === 'ability') { out.push(`⚡ Ability: ${m.ability.name}`); continue; } if (LABELS[k]) out.push(LABELS[k](m[k])); }
  return out.join(', ');
}
