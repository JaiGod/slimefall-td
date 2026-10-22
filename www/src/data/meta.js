/**
 * meta.js — long-term progression content: research tree, relics, crafting,
 * powers, fusions, weather, modifiers, achievements, quests, seasonal events,
 * cosmetics and story cutscenes.
 */

// ───────────── Research tree (permanent upgrades bought with 🔬 research points) ─────────────
export const RESEARCH = [
  { id: 'cash', name: 'Seed Funding', emoji: '💰', max: 5, cost: 1, desc: '+$60 starting cash per level', req: null },
  { id: 'lives', name: 'Thick Hedges', emoji: '❤️', max: 5, cost: 1, desc: '+8 starting lives per level', req: null },
  { id: 'discount', name: 'Bulk Lumber', emoji: '🪓', max: 5, cost: 2, desc: '-1% tower cost per level', req: 'cash' },
  { id: 'sell', name: 'Resale Market', emoji: '🏷️', max: 3, cost: 2, desc: '+3% sell value per level', req: 'cash' },
  { id: 'heroxp', name: 'Hero Training', emoji: '🎖️', max: 5, cost: 2, desc: '+8% hero XP per level', req: 'lives' },
  { id: 'speed', name: 'Aerodynamics', emoji: '💨', max: 3, cost: 2, desc: '+5% projectile speed per level', req: 'lives' },
  { id: 'crit', name: 'Lucky Strikes', emoji: '🍀', max: 5, cost: 3, desc: '+1% crit chance (x2 dmg) per level', req: 'speed' },
  { id: 'farm', name: 'Fertile Soil', emoji: '🌾', max: 5, cost: 3, desc: '+4% farm income per level', req: 'discount' },
  { id: 'ability', name: 'Quick Recall', emoji: '⏱️', max: 5, cost: 3, desc: '-3% ability cooldown per level', req: 'heroxp' },
  { id: 'boss', name: 'Giant Slayer', emoji: '🗡️', max: 5, cost: 4, desc: '+5% damage vs behemoths per level', req: 'crit' },
  { id: 'loot', name: 'Treasure Sense', emoji: '🧭', max: 5, cost: 4, desc: '+10% resource drops per level', req: 'farm' },
  { id: 'relic', name: 'Relic Mastery', emoji: '🏺', max: 2, cost: 8, desc: '+1 relic slot per level', req: 'loot' },
];

// ───────────── Relics (equip up to 1 + Relic Mastery) ─────────────
export const RELICS = [
  { id: 'clover', name: 'Four-Leaf Clover', emoji: '🍀', rarity: 'common', desc: '+6% cash from pops', fx: { popCash: 0.06 } },
  { id: 'acorn', name: 'Golden Acorn', emoji: '🌰', rarity: 'common', desc: '+$200 starting cash', fx: { startCash: 200 } },
  { id: 'heart', name: 'Heartwood', emoji: '🪵', rarity: 'common', desc: '+30 starting lives', fx: { startLives: 30 } },
  { id: 'lens', name: 'Monocle of Insight', emoji: '🧐', rarity: 'common', desc: '+6% tower range', fx: { range: 0.06 } },
  { id: 'whetstone', name: 'Whetstone', emoji: '🔪', rarity: 'common', desc: 'Sharp towers +1 pierce', fx: { sharpPierce: 1 } },
  { id: 'kettle', name: 'Ember Kettle', emoji: '🫖', rarity: 'rare', desc: 'Fire damage +20%', fx: { fire: 0.2 } },
  { id: 'snowglobe', name: 'Snow Globe', emoji: '🔮', rarity: 'rare', desc: 'All slimes 5% slower', fx: { enemySpeed: -0.05 } },
  { id: 'battery', name: 'Infinite Battery', emoji: '🔋', rarity: 'rare', desc: 'Energy damage +20%', fx: { energy: 0.2 } },
  { id: 'hourglass', name: 'Sandglass', emoji: '⌛', rarity: 'rare', desc: 'Abilities recharge 12% faster', fx: { abilityCd: 0.12 } },
  { id: 'crown', name: 'Slime Crown', emoji: '👑', rarity: 'epic', desc: '+15% damage vs behemoths', fx: { boss: 0.15 } },
  { id: 'feather', name: 'Phoenix Feather', emoji: '🪶', rarity: 'epic', desc: 'Once per game, revive with 50 lives', fx: { revive: 50 } },
  { id: 'compass', name: 'Star Compass', emoji: '🧭', rarity: 'epic', desc: 'All towers detect Phase slimes', fx: { detectAll: true } },
  { id: 'piggy', name: 'Piggy Bank', emoji: '🐷', rarity: 'epic', desc: '+$40 per wave per 10 waves survived', fx: { piggy: 40 } },
  { id: 'gear', name: 'Overclocked Gear', emoji: '⚙️', rarity: 'legendary', desc: 'All towers attack 8% faster', fx: { rate: 0.08 } },
  { id: 'eye', name: 'Eye of the Rift', emoji: '👁️', rarity: 'legendary', desc: '+1 damage for all towers, slimes +10% HP', fx: { dmg: 1, enemyHp: 0.1 } },
  { id: 'duck', name: 'Rubber Duck of Destiny', emoji: '🦆', rarity: 'legendary', desc: 'Quack. +3% everything.', fx: { rate: 0.03, range: 0.03, popCash: 0.03 } },
];
export const RARITY = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };

// ───────────── Crafting resources & recipes ─────────────
export const RESOURCES = {
  gel:     { name: 'Gel', emoji: '🟢' },
  crystal: { name: 'Crystal', emoji: '💎' },
  ember:   { name: 'Ember', emoji: '🔥' },
  star:    { name: 'Starlight', emoji: '⭐' },
  candy:   { name: 'Candy Corn', emoji: '🍬' }, // seasonal
};
export const RECIPES = [
  { id: 'p_cash', out: { power: 'cashdrop', n: 1 }, cost: { gel: 40 }, name: 'Cash Drop', emoji: '💸' },
  { id: 'p_freeze', out: { power: 'freezebomb', n: 1 }, cost: { gel: 30, crystal: 5 }, name: 'Freeze Bomb', emoji: '🧊' },
  { id: 'p_life', out: { power: 'lifepotion', n: 1 }, cost: { gel: 50, ember: 5 }, name: 'Life Potion', emoji: '🧪' },
  { id: 'p_nuke', out: { power: 'meteor', n: 1 }, cost: { ember: 20, star: 5 }, name: 'Meteor Strike', emoji: '☄️' },
  { id: 'r_common', out: { relic: 'common' }, cost: { gel: 120, crystal: 10 }, name: 'Common Relic Chest', emoji: '📦' },
  { id: 'r_rare', out: { relic: 'rare' }, cost: { crystal: 40, ember: 25 }, name: 'Rare Relic Chest', emoji: '🎁' },
  { id: 'r_epic', out: { relic: 'epic' }, cost: { crystal: 80, ember: 60, star: 25 }, name: 'Epic Relic Chest', emoji: '💝' },
  { id: 'r_leg', out: { relic: 'legendary' }, cost: { crystal: 150, ember: 120, star: 80 }, name: 'Legendary Relic Chest', emoji: '🏆' },
];
export const POWERS = {
  cashdrop:   { name: 'Cash Drop', emoji: '💸', desc: '+$1000 instantly' },
  freezebomb: { name: 'Freeze Bomb', emoji: '🧊', desc: 'Freeze every slime for 4s' },
  lifepotion: { name: 'Life Potion', emoji: '🧪', desc: '+25 lives' },
  meteor:     { name: 'Meteor Strike', emoji: '☄️', desc: '2000 damage to the strongest slime and around it' },
};

// ───────────── Tower fusion recipes (two towers within 90px, one at tier 3+) ─────────────
export const FUSIONS = [
  { id: 'steam', a: 'frost', b: 'ember', name: 'Steam Geyser', emoji: '♨️', color: '#e0f2fe', cost: 2500,
    stats: { kind: 'aoe', range: 130, rate: 0.6, dmg: 8, pierce: 120, dtype: 'magic', slow: 0.5, slowT: 2, dot: 6, dotT: 3, ap: true, detect: true } },
  { id: 'stormlens', a: 'tesla', b: 'prism', name: 'Stormlens', emoji: '🌩️', color: '#fef08a', cost: 3500,
    stats: { kind: 'beam', range: 220, rate: 0.35, dmg: 14, chain: 14, chainR: 120, dtype: 'energy', ap: true, detect: true, boss: 0.5 } },
  { id: 'siege', a: 'crab', b: 'mole', name: 'Siege Titan', emoji: '🏰', color: '#78350f', cost: 3500,
    stats: { kind: 'mortar', range: 320, rate: 0.9, dmg: 30, pierce: 60, splash: 90, count: 2, delay: 0.5, dtype: 'blast', ap: true, stun: 0.4, boss: 1 } },
  { id: 'plague', a: 'venom', b: 'sap', name: 'Plague Garden', emoji: '🥀', color: '#86198f', cost: 2800,
    stats: { kind: 'aura', range: 160, rate: 0.4, dmg: 2, pierce: 200, dtype: 'poison', dot: 18, dotT: 3, slow: 0.4, slowT: 0.5, ap: true, detect: true } },
  { id: 'factory', a: 'hive', b: 'workshop', name: 'Golden Factory', emoji: '🏭', color: '#eab308', cost: 4000,
    stats: { kind: 'summon', range: 0, rate: 1.5, mHp: 60, mDmg: 10, mSpeed: 70, mMax: 8, mR: 16, mEmoji: '🦾', dtype: 'blast', income: 1500 } },
  { id: 'lance', a: 'hawk', b: 'rail', name: 'Orbital Lance', emoji: '🛰️', color: '#cbd5e1', cost: 5000,
    stats: { kind: 'beam', range: 9999, sniper: true, line: true, rate: 0.8, dmg: 80, pierce: 30, dtype: 'energy', ap: true, detect: true, boss: 1.5 } },
  { id: 'eclipse', a: 'star', b: 'lantern', name: 'Eclipse Spire', emoji: '🌘', color: '#312e81', cost: 4200,
    stats: { kind: 'mortar', range: 300, rate: 0.5, dmg: 20, pierce: 40, splash: 50, count: 4, delay: 0.4, random: true, dtype: 'magic', detect: true, grantDetect: true } },
];

// ───────────── Weather (changes every 10 waves) ─────────────
export const WEATHER = {
  clear: { name: 'Clear Skies', emoji: '☀️', desc: 'Perfect conditions.', fx: {} },
  rain:  { name: 'Downpour', emoji: '🌧️', desc: 'Slimes +8% speed. Fire -25%. Nature +15%.', fx: { enemySpeed: 0.08, fire: -0.25, nature: 0.15 } },
  snow:  { name: 'Snowfall', emoji: '🌨️', desc: 'Slimes -10% speed. Ice +25%.', fx: { enemySpeed: -0.1, ice: 0.25 } },
  fog:   { name: 'Thick Fog', emoji: '🌫️', desc: 'Tower range -12%. More Phase slimes.', fx: { range: -0.12, phase: 0.15 } },
  storm: { name: 'Thunderstorm', emoji: '⛈️', desc: 'Energy +30%. Lightning strikes slimes at random!', fx: { energy: 0.3, lightning: true } },
  heat:  { name: 'Heatwave', emoji: '🥵', desc: 'Fire +30%. Ice -25%. Towers +5% attack speed.', fx: { fire: 0.3, ice: -0.25, rate: 0.05 } },
};

// ───────────── Map modifiers (challenge editor, daily challenge, roguelike curses) ─────────────
export const MODIFIERS = [
  { id: 'fast', name: 'Hyper Slimes', emoji: '⏩', desc: 'Slimes move 25% faster' },
  { id: 'tough', name: 'Tough Gel', emoji: '🛡️', desc: 'Behemoths have +50% HP' },
  { id: 'poor', name: 'Lean Times', emoji: '🪙', desc: 'Half cash from pops' },
  { id: 'nosell', name: 'No Refunds', emoji: '🚫', desc: 'Towers cannot be sold' },
  { id: 'nofarm', name: 'No Farming', emoji: '🌾', desc: 'Income towers are banned' },
  { id: 'phase', name: 'Phantom Plague', emoji: '👻', desc: 'Every slime is Phase' },
  { id: 'regen', name: 'Regrowth', emoji: '♻️', desc: 'Every slime is Regen' },
  { id: 'nohero', name: 'Lone Defenders', emoji: '🚷', desc: 'No heroes' },
  { id: 'tier3', name: 'Humble Arsenal', emoji: '3️⃣', desc: 'Upgrades capped at tier 3' },
  { id: 'onelife', name: 'Glass Garden', emoji: '💔', desc: 'Start with 1 life' },
  { id: 'elite', name: 'Elite Horde', emoji: '😈', desc: 'Every 5th wave is Elite' },
  { id: 'storm', name: 'Eternal Storm', emoji: '⛈️', desc: 'Weather locked to Thunderstorm' },
];

// ───────────── Seasonal events (by real-world month) ─────────────
export const SEASONS = [
  { id: 'bloomtide', name: 'Bloomtide', emoji: '🌸', months: [3, 4], color: '#f9a8d4', desc: 'Spring festival! Double Gel drops.', fx: { gel: 2 } },
  { id: 'sunburst', name: 'Sunburst Games', emoji: '☀️', months: [6, 7, 8], color: '#fde047', desc: 'Summer games! +25% XP.', fx: { xp: 1.25 } },
  { id: 'spooky', name: 'Gloomfest', emoji: '🎃', months: [10], color: '#ff8c1a', desc: 'Spooky season! Pumpkin slimes drop Candy Corn. Pumpkin Patch map unlocked.', fx: { candy: true } },
  { id: 'frostfest', name: 'Frostfest', emoji: '🎄', months: [12, 1], color: '#93c5fd', desc: 'Winter festival! Snow everywhere and +50% gems.', fx: { gems: 1.5, snow: true } },
];
export function currentSeason(d = new Date()) { return SEASONS.find((s) => s.months.includes(d.getMonth() + 1)) || null; }
export const SEASON_SHOP = [
  { id: 'skin_pumpkin', name: 'Pumpkin Tower Skin', emoji: '🎃', cost: 60, skin: 'pumpkin' },
  { id: 'relic_lantern', name: 'Jack’s Lantern (relic)', emoji: '🏮', cost: 120, relicId: 'clover' },
  { id: 'gems_100', name: '100 Gems', emoji: '💎', cost: 40, gems: 100 },
];

// ───────────── Cosmetics ─────────────
export const SKINS = [
  { id: 'default', name: 'Classic', emoji: '🎨', cost: 0, ring: null },
  { id: 'gold', name: 'Gilded', emoji: '🥇', cost: 500, ring: '#fbbf24' },
  { id: 'neon', name: 'Neon', emoji: '💡', cost: 400, ring: '#22d3ee', glow: true },
  { id: 'shadow', name: 'Shadow', emoji: '🌑', cost: 400, ring: '#1f2937' },
  { id: 'rainbow', name: 'Prismatic', emoji: '🌈', cost: 1200, ring: 'rainbow' },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', cost: -1, ring: '#ff8c1a' },
];
export const TRAILS = [
  { id: 'none', name: 'None', cost: 0 }, { id: 'sparkle', name: 'Sparkles ✨', cost: 300 }, { id: 'hearts', name: 'Hearts 💖', cost: 300 }, { id: 'fire', name: 'Flames 🔥', cost: 600 },
];

// ───────────── Achievements (checked against profile.stats) ─────────────
const A = (id, name, emoji, desc, stat, n, gems = 20) => ({ id, name, emoji, desc, stat, n, gems });
export const ACHIEVEMENTS = [
  A('pop1k', 'Pop Goes the Gel', '🫧', 'Pop 1,000 slimes', 'pops', 1000, 10),
  A('pop100k', 'Gel Grinder', '🌀', 'Pop 100,000 slimes', 'pops', 100000, 50),
  A('pop1m', 'Million Popper', '💥', 'Pop 1,000,000 slimes', 'pops', 1000000, 200),
  A('win1', 'First Bloom', '🌱', 'Win your first map', 'wins', 1, 20),
  A('win10', 'Seasoned Gardener', '🧑‍🌾', 'Win 10 games', 'wins', 10, 60),
  A('win50', 'Garden Legend', '🏆', 'Win 50 games', 'wins', 50, 200),
  A('chaos1', 'Order from Chaos', '💀', 'Win on Chaos difficulty', 'chaosWins', 1, 150),
  A('boss1', 'Giant Slayer', '🗡️', 'Defeat a boss', 'bosses', 1, 40),
  A('boss10', 'Kingbreaker', '👑', 'Defeat 10 bosses', 'bosses', 10, 120),
  A('abyss', 'Rift Sealer', '🌌', 'Defeat The Abyss King', 'abyssKills', 1, 300),
  A('tier5', 'Peak Performance', '5️⃣', 'Buy a tier 5 upgrade', 'tier5', 1, 50),
  A('tier5x10', 'Paragon Collector', '🌟', 'Buy 10 tier 5 upgrades', 'tier5', 10, 120),
  A('fusion', 'Better Together', '🧬', 'Fuse two towers', 'fusions', 1, 60),
  A('towers500', 'Architect', '🏗️', 'Place 500 towers', 'towersPlaced', 500, 60),
  A('endless50', 'No End in Sight', '♾️', 'Reach wave 50 in Endless', 'endlessBest', 50, 80),
  A('endless120', 'Eternal Gardener', '🌌', 'Reach wave 120 in Endless', 'endlessBest', 120, 250),
  A('golden', 'Midas Touch', '🪙', 'Pop a Golden Slime', 'goldens', 1, 40),
  A('shiny', 'Shiny Hunter', '✨', 'Pop a Shiny slime', 'shinies', 1, 60),
  A('rogue1', 'Expedition Survivor', '🧭', 'Complete a roguelike Expedition', 'rogueWins', 1, 150),
  A('daily1', 'Daily Grind', '📅', 'Complete a Daily Challenge', 'dailyWins', 1, 40),
  A('daily7', 'Habit Formed', '🗓️', 'Complete 7 Daily Challenges', 'dailyWins', 7, 120),
  A('quests10', 'Quest Taker', '📜', 'Complete 10 quests', 'questsDone', 10, 60),
  A('craft10', 'Artisan', '⚒️', 'Craft 10 items', 'crafted', 10, 50),
  A('relics8', 'Curator', '🏺', 'Own 8 different relics', 'relicsOwned', 8, 100),
  A('heroes6', 'Full Roster', '🦸', 'Unlock every hero', 'heroesOwned', 6, 150),
  A('level25', 'Veteran', '🎖️', 'Reach player level 25', 'level', 25, 100),
  A('prestige', 'Born Again', '♻️', 'Prestige once', 'prestige', 1, 200),
  A('perfect', 'Flawless', '💎', 'Win without losing a life', 'perfectWins', 1, 80),
  A('vet4', 'Living Legend', '⭐', 'Get a tower to 4 veterancy stars', 'vet4', 1, 60),
  A('ability100', 'Button Masher', '🔘', 'Use 100 abilities', 'abilitiesUsed', 100, 50),
  A('konami', '↑↑↓↓←→←→', '🕹️', 'Find a secret code', 'konami', 1, 100),
  A('duck', 'Quack Attack', '🦆', 'Pop a rubber duck', 'ducks', 1, 30),
  A('desk', 'Behind the Scenes', '🖥️', "Beat the Developer's Desk", 'deskWins', 1, 100),
  A('allmaps', 'Cartographer', '🗺️', 'Win on every campaign map', 'mapsWon', 20, 300),
  A('coop', 'Better With Friends', '🤝', 'Win a local co-op game', 'coopWins', 1, 60),
];

// ───────────── Quests (3 daily + 3 weekly, seeded by date) ─────────────
export const QUEST_POOL = [
  { id: 'pops', text: 'Pop {n} slimes', stat: 'pops', n: [2000, 5000, 10000], gems: [10, 20, 35] },
  { id: 'waves', text: 'Survive {n} waves', stat: 'waves', n: [30, 60, 120], gems: [10, 20, 40] },
  { id: 'wins', text: 'Win {n} games', stat: 'wins', n: [1, 2, 4], gems: [20, 35, 60] },
  { id: 'bosses', text: 'Defeat {n} bosses', stat: 'bosses', n: [1, 2, 4], gems: [25, 45, 80] },
  { id: 'towers', text: 'Place {n} towers', stat: 'towersPlaced', n: [20, 50, 100], gems: [10, 20, 35] },
  { id: 'upgrades', text: 'Buy {n} upgrades', stat: 'upgrades', n: [30, 80, 150], gems: [10, 20, 40] },
  { id: 'abilities', text: 'Use {n} abilities', stat: 'abilitiesUsed', n: [3, 8, 20], gems: [10, 20, 40] },
  { id: 'cash', text: 'Earn ${n} in games', stat: 'cashEarned', n: [20000, 60000, 150000], gems: [10, 25, 45] },
  { id: 'behemoths', text: 'Destroy {n} behemoths', stat: 'behemoths', n: [5, 15, 40], gems: [15, 30, 55] },
  { id: 'gel', text: 'Collect {n} Gel', stat: 'gel', n: [50, 150, 400], gems: [10, 20, 40] },
];

// ───────────── Story mode cutscenes (shown on first visit of a map) ─────────────
export const STORY = {
  sprout: [
    ['🧝', 'Captain Mossa', 'Something is wrong with the meadow. The dew… it’s moving.'],
    ['🟢', 'Drip', 'blorp.'],
    ['🧝', 'Captain Mossa', 'Slimes! A whole river of them. Get the slingers on the hill — NOW!'],
    ['📜', 'Tip', 'Tap a tower in the shop, then tap the grass to build. Press ▶ to start the wave.'],
  ],
  ring: [['🧝', 'Captain Mossa', 'They’re circling the old mushroom ring. Something is calling them.'], ['🍄', 'Old Shroom', 'The Rift is waking, little ranger. The slimes are only its dreams.']],
  dunes: [['🧑‍🔬', 'Volt Vex', 'Fascinating! The heat makes them faster. And extremely conductive. Build my totems!'], ['🧝', 'Captain Mossa', 'Can we please not electrocute the desert?'], ['🧑‍🔬', 'Volt Vex', 'No promises.']],
  frostbite: [['❄️', 'The Pass', 'Wind howls through the peaks. Snow slows everything… even them.'], ['🧝', 'Captain Mossa', 'Frosty slimes are immune to ice. Bring fire.']],
  twins: [['👨‍🍳', 'Sir Ladle', 'Two rivers of slime! Twice the soup!'], ['🧝', 'Captain Mossa', 'Please stop calling them soup.']],
  caldera: [['🧚‍♀️', 'Pyra', 'You walk into MY volcano and bring slime? Fine. I’ll help. This once.'], ['🔥', 'Tip', 'Emberlings are immune to fire. Pyra knows. Pyra is annoyed about it.']],
  skyreach: [['🧙‍♀️', 'Nova', 'The stars say a great slime approaches on the twentieth wave.'], ['🧝', 'Captain Mossa', 'Do the stars say how to beat it?'], ['🧙‍♀️', 'Nova', 'They say "bring more towers".']],
  hollow: [['🤖', 'Gearhart', 'CRYSTAL SLIMES DETECTED. ARMOR RATING: ANNOYING.'], ['🤖', 'Gearhart', 'RECOMMEND: ARMOR-PIERCING ORDNANCE.']],
  gate: [['🌌', '???', 'YOU HAVE COME FAR, GARDENER.'], ['👑', 'The Abyss King', 'THE RIFT IS MY CROWN. YOUR WORLD, MY FEAST.'], ['🧝', 'Captain Mossa', 'Everyone — this is it. Hold the gate!']],
  desk: [['🖥️', 'Developer', 'Oh! You found my desk. Please don’t let them reach my coffee.'], ['☕', 'Coffee', '…']],
  pumpkin: [['🎃', 'Gourdon', 'Happy Gloomfest! The slimes have dressed up as… slimes. Spooky!'], ['👻', 'Tip', 'Seasonal slimes drop 🍬 Candy Corn — spend it in the Event Shop.']],
};
export const ENDING = [
  ['👑', 'The Abyss King', 'IMPOSSIBLE… A GARDEN… DEFEATED THE ABYSS…'],
  ['🧝', 'Captain Mossa', 'It’s over. The Rift is sealing.'],
  ['🧙‍♀️', 'Nova', 'For now. The stars say… endless mode.'],
  ['🎉', 'The End?', 'Thank you for defending the Vale! Try Chaos difficulty, Expeditions and Endless.'],
];
