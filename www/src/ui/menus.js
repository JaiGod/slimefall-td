/**
 * menus.js — every out-of-game screen. Each export renders into #screen-menu.
 */
import { h, $, clear, modal, toast, bar } from './dom.js';
import { DIFFICULTIES, xpForLevel, PRESTIGE_LEVEL, VERSION } from '../config.js';
import { MAPS, MAP_MAP, CAMPAIGN, REGIONS, TIER_INFO, THEMES } from '../data/maps.js';
import { TOWERS, TOWER_MAP, CATEGORIES, describeMods } from '../data/towers.js';
import { HEROES, HERO_MAP } from '../data/heroes.js';
import { ENEMIES, rbe } from '../data/enemies.js';
import { RESEARCH, RELICS, RARITY, RESOURCES, RECIPES, POWERS, ACHIEVEMENTS, MODIFIERS, SKINS, TRAILS, SEASON_SHOP, FUSIONS, WEATHER, currentSeason } from '../data/meta.js';
import { exportSave, importSave, claimQuest, refreshQuests, rollRelic, addStat, doPrestige, canPrestige, checkAchievements, defaultProfile } from '../save.js';
import { fmt, encode, decode, dayKey, mulberry32, hashStr } from '../util.js';
import { audio } from '../audio.js';

const root = () => clear($('#screen-menu'));
const chips = (p) => h('div.chips', h('span.chip', `⭐ Lv ${p.level}${p.prestige ? ` · ♻️${p.prestige}` : ''}`), h('span.chip', `💎 ${fmt(p.gems)}`), h('span.chip', `🔬 ${p.research}`));
function page(app, title, ...content) {
  const r = root();
  r.append(h('div.page', h('div.page-head', h('button.btn.back', { onclick: () => app.show('title') }, '← Back'), h('h1', title), chips(app.profile)), h('div.page-body', ...content)));
}
const masteryLevel = (pops) => (pops >= 250000 ? 4 : pops >= 50000 ? 3 : pops >= 10000 ? 2 : pops >= 1000 ? 1 : 0);
const MASTERY = ['', '🥉', '🥈', '🥇', '💠'];
const mapUnlocked = (p, m) => {
  if (m.secret) return !!p.stats.konami;
  if (m.event) return currentSeason()?.id === m.event;
  const i = CAMPAIGN.indexOf(m); if (i <= 0) return true;
  const prev = p.medals[CAMPAIGN[i - 1].id]; return !!prev && ['easy', 'normal', 'hard', 'chaos'].some((k) => prev[k]);
};

// ═════════════════════════ TITLE ═════════════════════════
export function title(app) {
  const p = app.profile, r = root(), season = currentSeason();
  refreshQuests(p);
  const questsReady = [...p.quests.daily, ...p.quests.weekly].filter((q) => q.progress >= q.goal && !q.claimed).length;
  let clicks = 0;
  const logo = h('div.logo', { onclick: () => { if (++clicks === 10 && !p.stats.logoEgg) { p.stats.logoEgg = 1; p.gems += 50; toast('🟢 blorp! You found a secret: +50 💎', 'good'); app.save(); } } },
    h('span.logo-slime', '🟢'), h('span.logo-text', 'Slimefall'), h('span.logo-sub', 'Tower Defense'));
  const cp = p.checkpoint;
  const big = (emoji, label, sub, fn, cls = '') => h('button.menu-btn' + cls, { onclick: fn }, h('span.mb-em', emoji), h('span.mb-txt', h('b', label), h('small', sub)));
  const icon = (emoji, label, fn, badge) => h('button.icon-btn', { onclick: fn }, h('span', emoji), h('small', label), badge ? h('i.badge', badge) : null);
  r.append(h('div.title',
    h('div.title-top', chips(p), h('button.btn.small', { onclick: () => settings(app) }, '⚙️')),
    logo,
    season ? h('div.season', { style: { borderColor: season.color } }, `${season.emoji} ${season.name} is live! ${season.desc}`) : null,
    h('div.menu-main',
      cp ? big('▶️', 'Continue', `${MAP_MAP[cp.cfg.mapId].name} · wave ${cp.wave}`, () => app.startGame(cp.cfg, cp), '.continue') : null,
      big('🗺️', 'Campaign', 'Explore the world & story', () => app.show('world')),
      big('🧭', 'Expedition', 'Roguelike runs with relics', () => app.show('expedition')),
      big('📅', 'Daily Challenge', p.daily.last === dayKey() ? '✅ Completed today' : `Streak 🔥${p.daily.streak}`, () => dailyDialog(app)),
      big('♾️', 'Endless', 'How long can you last?', () => app.show('world', 'endless')),
      big('🏁', 'Challenges', 'Build & share custom rules', () => challengeEditor(app)),
      big('🧪', 'Sandbox', 'Infinite cash playground', () => app.show('world', 'sandbox')),
      big('🤝', 'Local Co-op', 'Two players, one screen', () => app.show('world', 'coop'))),
    h('div.menu-icons',
      icon('🦸', 'Heroes', () => app.show('heroes')), icon('🔬', 'Research', () => app.show('research'), p.research ? p.research : null),
      icon('🏺', 'Relics', () => app.show('relics')), icon('⚒️', 'Workshop', () => app.show('workshop')),
      icon('🛍️', 'Shop', () => app.show('shop')), icon('📜', 'Quests', () => app.show('quests'), questsReady || null),
      icon('🏅', 'Achievements', () => app.show('achievements')), icon('🏆', 'Leaderboards', () => app.show('leaderboard')),
      icon('📖', 'Almanac', () => app.show('almanac')), icon('👤', 'Profile', () => profileDialog(app))),
    h('div.foot', h('span#version', 'v' + VERSION), ' · ', h('a', { href: 'https://github.com/jaineil32624/slimefall-td', target: '_blank', id: 'gh-link' }, 'GitHub'), ' · 100% original game · made with 💚')));
}

function profileDialog(app) {
  const p = app.profile, need = xpForLevel(p.level);
  const name = h('input', { value: p.name, maxlength: 16 });
  modal('👤 Profile', h('div.profile',
    h('label', 'Name', name),
    h('p', `Level ${p.level} · ${fmt(p.xp)} / ${fmt(need)} XP`), bar(p.xp / need, '#facc15'),
    h('p', `♻️ Prestige ${p.prestige} — each star gives +2% cash and +1% damage forever.`),
    h('p.muted', `Pops: ${fmt(p.stats.pops || 0)} · Wins: ${p.stats.wins || 0} · Bosses: ${p.stats.bosses || 0} · Waves: ${fmt(p.stats.waves || 0)}`)),
  [{ label: '💾 Save', cls: 'primary', onclick: () => { p.name = name.value.trim() || 'Gardener'; app.save(); } },
    { label: canPrestige(p) ? '♻️ Prestige now' : `♻️ Prestige at Lv ${PRESTIGE_LEVEL}`, disabled: !canPrestige(p), onclick: () => { if (doPrestige(p)) { checkAchievements(p); app.save(); toast('♻️ Prestiged! +500 💎', 'good'); app.show('title'); } } }]);
}

// ═════════════════════════ WORLD MAP ═════════════════════════
export function world(app, mode = 'campaign') {
  const p = app.profile, r = root();
  const svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="world-lines">${CAMPAIGN.slice(1).map((m, i) => { const a = CAMPAIGN[i].world, b = m.world; return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`; }).join('')}</svg>`;
  const nodes = MAPS.filter((m) => !m.event || mapUnlocked(p, m)).filter((m) => !m.secret || mapUnlocked(p, m)).map((m) => {
    const open = mapUnlocked(p, m) || mode === 'sandbox';
    const med = p.medals[m.id] || {};
    const medals = ['easy', 'normal', 'hard', 'chaos'].filter((k) => med[k]).map((k) => DIFFICULTIES[k].emoji).join('');
    return h('button.node' + (open ? '' : '.locked'), { style: { left: m.world.x + '%', top: m.world.y + '%', '--ring': TIER_INFO[m.tier].color, '--bg': THEMES[m.theme].grass }, title: m.name,
      onclick: () => open ? mapDialog(app, m, mode) : toast('🔒 Beat the previous map to unlock') },
      h('span.node-em', open ? THEMES[m.theme].deco[0] : '🔒'), h('span.node-name', m.name), medals ? h('span.node-med', medals) : null, med.endless ? h('span.node-end', `♾️${med.endless}`) : null);
  });
  const regions = Object.entries(REGIONS).filter(([k]) => !['secret', 'event'].includes(k)).map(([k, v]) => {
    const ms = CAMPAIGN.filter((m) => m.region === k); const cx = ms.reduce((a, m) => a + m.world.x, 0) / ms.length, cy = ms.reduce((a, m) => a + m.world.y, 0) / ms.length;
    return h('div.region', { style: { left: cx + '%', top: cy + '%', background: v.color } }, '');
  });
  const titles = { campaign: '🗺️ The Verdant World', endless: '♾️ Endless — pick a map', sandbox: '🧪 Sandbox — pick a map', coop: '🤝 Local Co-op — pick a map' };
  r.append(h('div.page', h('div.page-head', h('button.btn.back', { onclick: () => app.show('title') }, '← Back'), h('h1', titles[mode]), chips(p)),
    h('div.world', ...regions, h('div', { html: svg }), ...nodes),
    h('div.legend', Object.entries(TIER_INFO).map(([k, v]) => h('span', h('i', { style: { background: v.color } }), v.name)))));
}

export function mapDialog(app, m, mode = 'campaign') {
  const p = app.profile;
  let diff = 'normal', submode = mode;
  const heroSel = h('div.hero-pick', p.heroes.map((id) => h('button.hp' + (p.hero === id ? '.on' : ''), { title: HERO_MAP[id].name, onclick: (e) => { p.hero = id; app.save(); heroSel.querySelectorAll('.hp').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, HERO_MAP[id].emoji)));
  const diffs = h('div.diffs', Object.values(DIFFICULTIES).map((d) => h('button.diff' + (d.id === diff ? '.on' : ''), { onclick: (e) => { diff = d.id; diffs.querySelectorAll('.diff').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); } },
    h('b', `${d.emoji} ${d.name}`), h('small', `${d.endWave} waves · ❤️${d.lives}`), p.medals[m.id]?.[d.id] ? h('i', '🏅') : null)));
  const relics = p.equipped.map((id) => RELICS.find((r) => r.id === id)?.emoji).join(' ') || 'none';
  const cp = p.checkpoint?.cfg?.mapId === m.id ? p.checkpoint : null;
  const preview = h('canvas.preview', { width: 320, height: 180 });
  drawPreview(preview, m);
  modal(`${THEMES[m.theme].deco[0]} ${m.name}`, h('div.mapdlg',
    preview,
    h('p', h('span.tier', { style: { background: TIER_INFO[m.tier].color } }, TIER_INFO[m.tier].name), ` · ${REGIONS[m.region].emoji} ${REGIONS[m.region].name} · ${m.paths.length} path${m.paths.length > 1 ? 's' : ''} · Weather: ${(m.weather || ['clear']).map((w) => WEATHER[w].emoji).join('')}`),
    mode === 'sandbox' ? null : diffs,
    h('div.row', h('span', '🦸 Hero:'), heroSel),
    h('div.row', h('span', `🏺 Relics: ${relics}`), h('button.btn.small', { onclick: () => app.show('relics') }, 'Edit')),
    p.medals[m.id]?.endless ? h('p.muted', `♾️ Best endless wave: ${p.medals[m.id].endless}`) : null),
  [cp ? { label: `▶ Continue (wave ${cp.wave})`, onclick: () => app.startGame(cp.cfg, cp) } : null,
    { label: mode === 'sandbox' ? '🧪 Start Sandbox' : mode === 'endless' ? '♾️ Start Endless' : mode === 'coop' ? '🤝 Start Co-op' : '▶ Play', cls: 'primary',
      onclick: () => app.startGame({ mapId: m.id, diff: mode === 'sandbox' ? 'easy' : diff, mode: submode, coop: mode === 'coop' }) }].filter(Boolean), { wide: true });
}

export function drawPreview(c, m) {
  const x = c.getContext('2d'), th = THEMES[m.theme], s = c.width / 1280;
  x.fillStyle = th.grass; x.fillRect(0, 0, c.width, c.height);
  for (const path of m.paths) {
    x.beginPath(); path.forEach(([px, py], i) => (i ? x.lineTo(px * s, py * s) : x.moveTo(px * s, py * s)));
    x.lineJoin = 'round'; x.lineCap = 'round'; x.lineWidth = 50 * s + 3; x.strokeStyle = th.edge; x.stroke(); x.lineWidth = 44 * s; x.strokeStyle = th.path; x.stroke();
  }
}

// ═════════════════════════ CUTSCENES ═════════════════════════
export function cutscene(app, lines, done) {
  let i = 0, typing = null;
  const portrait = h('div.cs-portrait'), name = h('div.cs-name'), text = h('div.cs-text');
  const box = h('div.cutscene', { onclick: () => next() }, h('div.cs-box', portrait, h('div', name, text), h('div.cs-hint', 'tap ▶')), h('button.btn.small.cs-skip', { onclick: (e) => { e.stopPropagation(); finish(); } }, 'Skip ⏭'));
  $('#modal-root').append(box);
  const show = () => {
    const [em, who, msg] = lines[i]; portrait.textContent = em; name.textContent = who; text.textContent = '';
    let k = 0; clearInterval(typing); typing = setInterval(() => { text.textContent = msg.slice(0, ++k); if (k >= msg.length) clearInterval(typing); }, 22);
  };
  const next = () => { const msg = lines[i][2]; if (text.textContent.length < msg.length) { clearInterval(typing); text.textContent = msg; return; } if (++i >= lines.length) finish(); else show(); };
  const finish = () => { clearInterval(typing); box.remove(); done?.(); };
  show();
}

// ═════════════════════════ HEROES ═════════════════════════
export function heroes(app) {
  const p = app.profile;
  page(app, '🦸 Heroes', h('div.cards', HEROES.map((hd) => {
    const owned = p.heroes.includes(hd.id);
    return h('div.hcard' + (p.hero === hd.id ? '.on' : ''), { style: { '--c': hd.color } },
      h('div.hc-em', hd.emoji), h('h3', hd.name), h('p.muted', hd.lore),
      h('ul', hd.abilities.map((a) => h('li', `Lv ${a.lvl}: ⚡ ${a.name}`))),
      owned ? h('button.btn' + (p.hero === hd.id ? '.primary' : ''), { onclick: () => { p.hero = hd.id; app.save(); heroes(app); } }, p.hero === hd.id ? '✔ Selected' : 'Select')
        : h('button.btn', { disabled: p.gems < hd.price, onclick: () => { if (p.gems >= hd.price) { p.gems -= hd.price; p.heroes.push(hd.id); checkAchievements(p); app.save(); toast(`${hd.emoji} ${hd.name} joined you!`, 'good'); heroes(app); } } }, `Unlock 💎 ${hd.price}`));
  })));
}

// ═════════════════════════ RESEARCH ═════════════════════════
export function research(app) {
  const p = app.profile, R = p.researchLv;
  page(app, '🔬 Research Tree', h('p.muted', 'Earn 🔬 research points by levelling up. Bonuses apply to every game.'),
    h('div.tree', RESEARCH.map((n) => {
      const lv = R[n.id] || 0, reqOk = !n.req || (R[n.req] || 0) > 0, maxed = lv >= n.max;
      return h('div.rnode' + (reqOk ? '' : '.locked') + (maxed ? '.maxed' : ''),
        h('div.rn-em', n.emoji), h('b', n.name), h('small', n.desc), h('div.pips', Array.from({ length: n.max }, (_, i) => h('span.pip' + (i < lv ? '.on' : '')))),
        n.req ? h('small.muted', `Requires: ${RESEARCH.find((x) => x.id === n.req).name}`) : null,
        h('button.btn.small', { disabled: !reqOk || maxed || p.research < n.cost, onclick: () => { p.research -= n.cost; R[n.id] = lv + 1; app.save(); research(app); } }, maxed ? 'MAX' : `Upgrade 🔬${n.cost}`));
    })),
    h('button.btn.danger', { onclick: () => { let refund = 0; for (const n of RESEARCH) refund += (R[n.id] || 0) * n.cost; p.researchLv = {}; p.research += refund; app.save(); toast(`Refunded 🔬${refund}`); research(app); } }, '↺ Respec (free)'));
}

// ═════════════════════════ RELICS ═════════════════════════
export function relics(app) {
  const p = app.profile, slots = 1 + (p.researchLv.relic || 0);
  page(app, '🏺 Relics', h('p.muted', `Equip up to ${slots} relic${slots > 1 ? 's' : ''} (more slots via Research → Relic Mastery). Find relics from bosses, victories, crafting and Expeditions.`),
    h('div.cards.small', RELICS.map((r) => {
      const owned = p.relics.includes(r.id), on = p.equipped.includes(r.id);
      return h('button.rcard' + (owned ? '' : '.locked') + (on ? '.on' : ''), { style: { '--c': RARITY[r.rarity] }, onclick: () => {
        if (!owned) return toast('🔒 Not found yet');
        if (on) p.equipped = p.equipped.filter((x) => x !== r.id); else if (p.equipped.length < slots) p.equipped.push(r.id); else { p.equipped.shift(); p.equipped.push(r.id); }
        app.save(); relics(app);
      } }, h('div.rc-em', owned ? r.emoji : '❔'), h('b', owned ? r.name : '???'), h('small', owned ? r.desc : r.rarity), on ? h('i.badge', '✔') : null);
    })));
}

// ═════════════════════════ WORKSHOP (crafting) ═════════════════════════
export function workshop(app) {
  const p = app.profile;
  const res = h('div.chips', Object.entries(RESOURCES).map(([k, v]) => h('span.chip', `${v.emoji} ${fmt(p.resources[k] || 0)}`)));
  page(app, '⚒️ Workshop', h('p.muted', 'Slimes drop resources when popped. Craft consumable powers (usable mid-game) and relic chests.'), res,
    h('div.cards.small', RECIPES.map((rc) => {
      const can = Object.entries(rc.cost).every(([k, n]) => (p.resources[k] || 0) >= n);
      return h('div.rcard', h('div.rc-em', rc.emoji), h('b', rc.name), h('small', Object.entries(rc.cost).map(([k, n]) => `${RESOURCES[k].emoji}${n}`).join('  ')),
        rc.out.power ? h('small.muted', `Owned: ${p.powers[rc.out.power] || 0}`) : null,
        h('button.btn.small', { disabled: !can, onclick: () => {
          for (const [k, n] of Object.entries(rc.cost)) p.resources[k] -= n;
          if (rc.out.power) { p.powers[rc.out.power] = (p.powers[rc.out.power] || 0) + rc.out.n; toast(`Crafted ${rc.emoji} ${rc.name}`, 'good'); }
          else { const r = rollRelic(p, rc.out.relic); toast(`${r.relic.emoji} ${r.relic.name}${r.dupe ? ' (duplicate → gems)' : '!'}`, 'good'); }
          addStat(p, 'crafted'); checkAchievements(p); app.save(); workshop(app);
        } }, 'Craft'));
    })));
}

// ═════════════════════════ SHOP (cosmetics & seasonal) ═════════════════════════
export function shop(app) {
  const p = app.profile, season = currentSeason();
  const skinCard = (s) => {
    const owned = p.skins.includes(s.id);
    if (s.cost < 0 && !owned) return null;
    return h('div.rcard' + (p.skin === s.id ? '.on' : ''), h('div.rc-em', s.emoji), h('b', s.name),
      owned ? h('button.btn.small', { onclick: () => { p.skin = s.id; app.save(); shop(app); } }, p.skin === s.id ? '✔ Equipped' : 'Equip')
        : h('button.btn.small', { disabled: p.gems < s.cost, onclick: () => { p.gems -= s.cost; p.skins.push(s.id); app.save(); shop(app); } }, `💎 ${s.cost}`));
  };
  page(app, '🛍️ Shop',
    h('h3', '🎨 Tower skins'), h('div.cards.small', SKINS.map(skinCard)),
    h('h3', '✨ Projectile trails (cosmetic)'), h('div.cards.small', TRAILS.map((t) => {
      const owned = p.trails.includes(t.id);
      return h('div.rcard' + (p.trail === t.id ? '.on' : ''), h('b', t.name), owned ? h('button.btn.small', { onclick: () => { p.trail = t.id; app.save(); shop(app); } }, p.trail === t.id ? '✔' : 'Equip')
        : h('button.btn.small', { disabled: p.gems < t.cost, onclick: () => { p.gems -= t.cost; p.trails.push(t.id); app.save(); shop(app); } }, `💎 ${t.cost}`));
    })),
    season ? h('div', h('h3', `${season.emoji} ${season.name} Event Shop — 🍬 ${p.resources.candy || 0}`), h('div.cards.small', SEASON_SHOP.map((it) => h('div.rcard', h('div.rc-em', it.emoji), h('b', it.name),
      h('button.btn.small', { disabled: (p.resources.candy || 0) < it.cost || (it.skin && p.skins.includes(it.skin)), onclick: () => {
        p.resources.candy -= it.cost; if (it.skin) p.skins.push(it.skin); if (it.gems) p.gems += it.gems; if (it.relicId) rollRelic(p, 'rare'); app.save(); toast(`${it.emoji} Purchased!`, 'good'); shop(app);
      } }, `🍬 ${it.cost}`))))) : h('p.muted', '🎪 No seasonal event right now — check back during Bloomtide, Sunburst, Gloomfest or Frostfest!'),
    h('p.muted', '💡 Slimefall has no real-money purchases. Everything is earned by playing.'));
}

// ═════════════════════════ QUESTS ═════════════════════════
export function quests(app) {
  const p = app.profile; refreshQuests(p);
  const row = (q) => h('div.quest' + (q.claimed ? '.done' : ''), h('div', h('b', q.text), bar(q.progress / q.goal, q.claimed ? '#64748b' : '#4ade80'), h('small', `${fmt(q.progress)} / ${fmt(q.goal)}`)),
    h('button.btn.small' + (q.progress >= q.goal && !q.claimed ? '.primary' : ''), { disabled: q.claimed || q.progress < q.goal, onclick: () => { if (claimQuest(p, q)) { toast(`+${q.gems} 💎`, 'good'); checkAchievements(p); app.save(); quests(app); } } }, q.claimed ? '✔' : `💎 ${q.gems}`));
  page(app, '📜 Quests', h('h3', '☀️ Daily'), h('div.quests', p.quests.daily.map(row)), h('h3', '📆 Weekly (×3 rewards)'), h('div.quests', p.quests.weekly.map(row)));
}

// ═════════════════════════ ACHIEVEMENTS ═════════════════════════
export function achievements(app) {
  const p = app.profile, got = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
  page(app, `🏅 Achievements ${got}/${ACHIEVEMENTS.length}`, h('div.cards.small', ACHIEVEMENTS.map((a) => {
    const done = !!p.achievements[a.id], prog = Math.min(1, (p.stats[a.stat] || 0) / a.n);
    const secret = !done && ['konami', 'duck', 'desk'].includes(a.id);
    return h('div.rcard' + (done ? '.on' : '.locked'), h('div.rc-em', secret ? '❔' : a.emoji), h('b', secret ? 'Secret' : a.name), h('small', secret ? '???' : a.desc), done ? h('small', '✔ +' + a.gems + '💎') : bar(prog));
  })));
}

// ═════════════════════════ LEADERBOARDS ═════════════════════════
export function leaderboard(app) {
  const p = app.profile, lb = p.leaderboard;
  const boards = Object.keys(lb).sort();
  page(app, '🏆 Leaderboards', h('p.muted', 'Local leaderboards on this device. Online leaderboards plug in via the cloud adapter — see docs/BACKEND.md.'),
    boards.length ? h('div.boards', boards.map((b) => {
      const [kind, id] = b.split(':'); const label = kind === 'endless' ? `♾️ Endless — ${MAP_MAP[id]?.name}` : kind === 'daily' ? `📅 Daily ${id}` : `🧭 Expedition`;
      return h('div.board', h('h3', label), h('ol', lb[b].map((e) => h('li', h('b', fmt(e.score)), ` ${e.name} · ${new Date(e.at).toLocaleDateString()}`))));
    })) : h('p', 'No scores yet — play Endless, Daily or Expedition modes!'));
}

// ═════════════════════════ ALMANAC ═════════════════════════
export function almanac(app, tab = 'towers') {
  const p = app.profile;
  const tabs = h('div.tabs', [['towers', '🗼 Towers'], ['slimes', '🟢 Slimes'], ['fusions', '🧬 Fusions'], ['weather', '⛅ Weather']].map(([k, l]) => h('button.btn.small' + (tab === k ? '.primary' : ''), { onclick: () => almanac(app, k) }, l)));
  let body;
  if (tab === 'towers') body = h('div.cards.small', TOWERS.map((t) => {
    const ml = masteryLevel(p.mastery[t.id] || 0);
    return h('button.rcard', { style: { '--c': t.color }, onclick: () => towerDetail(t, p) }, h('div.rc-em', t.emoji), h('b', t.name), h('small', `$${t.cost} · ${CATEGORIES.find((c) => c.id === t.cat).name}`), h('small', `${MASTERY[ml] || '—'} ${fmt(p.mastery[t.id] || 0)} pops`));
  }));
  else if (tab === 'slimes') body = h('div.cards.small', Object.entries(ENEMIES).filter(([, e]) => !e.secret).map(([k, e]) => h('div.rcard', h('div.slime-dot', { style: { background: e.color === 'rainbow' ? 'linear-gradient(90deg,#f55,#ff5,#5f5,#5ff,#f5f)' : e.color, width: Math.min(46, e.r * 1.6) + 'px', height: Math.min(46, e.r * 1.6) + 'px' } }),
    h('b', e.name), h('small', `${e.boss ? '👑 Boss' : e.big ? '🐘 Behemoth' : 'Layer'} · HP ${e.hp} · RBE ${rbe(k)}`), e.immune ? h('small', `Immune: ${e.immune.join(', ')}`) : null, e.armor ? h('small', '🛡 Armored') : null, e.ai ? h('small', `🧠 ${{ leap: 'Leaps forward', heal: 'Heals allies', emp: 'Stuns towers' }[e.ai]}`) : null)));
  else if (tab === 'fusions') body = h('div.cards.small', FUSIONS.map((f) => h('div.rcard', { style: { '--c': f.color } }, h('div.rc-em', f.emoji), h('b', f.name), h('small', `${TOWER_MAP[f.a].emoji} ${TOWER_MAP[f.a].name} + ${TOWER_MAP[f.b].emoji} ${TOWER_MAP[f.b].name}`), h('small.muted', 'Place within reach; one must be tier 3+. Select & press Fuse.'))));
  else body = h('div.cards.small', Object.values(WEATHER).map((w) => h('div.rcard', h('div.rc-em', w.emoji), h('b', w.name), h('small', w.desc))));
  page(app, '📖 Almanac', tabs, body);
}
function towerDetail(t, p) {
  modal(`${t.emoji} ${t.name}`, h('div.tdetail', h('p', t.desc), h('p.muted', `Cost $${t.cost} · Range ${t.range || '—'} · ${t.dtype || ''} · Mastery pops: ${fmt(p.mastery[t.id] || 0)}`),
    t.paths.map((path, i) => h('div.path.p' + i, h('div.path-name', path.name), h('ol', path.ups.map((u) => h('li', h('b', u.name), ` ($${fmt(u.cost)}) — `, u.desc || describeMods(u.mods)))))),
    h('p.muted', '📐 Crosspath rule: up to 7 tiers total, and only one path may reach tier 3 or higher (e.g. 5-2-0, 4-2-1, 3-2-2).')), [], { wide: true });
}

// ═════════════════════════ SETTINGS ═════════════════════════
export function settings(app) {
  const p = app.profile, S = p.settings;
  const tog = (key, label, fn) => h('label.ck', h('input', { type: 'checkbox', checked: S[key], onchange: (e) => { S[key] = e.target.checked; fn?.(S[key]); app.save(); } }), ' ' + label);
  const range = (key, fn) => h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: S[key], oninput: (e) => { S[key] = +e.target.value; fn(); app.save(); } });
  const q = h('select', { onchange: (e) => { S.particles = e.target.value; app.save(); } }, ['high', 'med', 'low'].map((v) => h('option', { value: v, selected: S.particles === v }, v)));
  modal('⚙️ Settings', h('div.settings',
    tog('music', '🎵 Music', (v) => audio.setMusic(v)), h('label', 'Music volume', range('musicVol', () => audio.setVolumes(S.musicVol, S.sfxVol))),
    tog('sfx', '🔊 Sound effects', (v) => audio.setSfx(v)), h('label', 'SFX volume', range('sfxVol', () => audio.setVolumes(S.musicVol, S.sfxVol))),
    tog('shake', '📳 Screen shake'), tog('autoStart', '🔁 Auto-start waves'), h('label', '✨ Particles', q),
    p.stats.konami ? tog('retro', '🕹️ Retro pixel mode') : null,
    h('hr'), h('h3', '☁️ Save'),
    h('div.row', h('button.btn.small', { onclick: () => { const code = exportSave(p); navigator.clipboard?.writeText(code); modal('📤 Export save', h('textarea.code', { readonly: true }, code), [{ label: 'Done' }]); } }, '📤 Export'),
      h('button.btn.small', { onclick: () => { const ta = h('textarea.code', { placeholder: 'Paste save code…' }); modal('📥 Import save', ta, [{ label: 'Import', cls: 'primary', onclick: () => { try { Object.assign(p, importSave(ta.value)); app.save(true); toast('Save imported!', 'good'); app.show('title'); } catch { toast('Invalid save code', 'bad'); return false; } } }]); } }, '📥 Import'),
      h('button.btn.small.danger', { onclick: () => { if (confirm('Erase ALL progress? This cannot be undone.')) { Object.assign(p, defaultProfile()); app.save(true); app.show('title'); } } }, '🗑 Reset')),
    h('p.muted', 'Keyboard: Space = start wave · F = speed · 1/2/3 = upgrade path · Tab = targeting · Del = sell · Esc = cancel/pause · Shift+click = place multiple'),
    h('p.muted', `Slimefall TD v${VERSION} — original game. Procedural music & art. MIT licensed.`)), [{ label: 'Done', cls: 'primary' }]);
}

// ═════════════════════════ DAILY ═════════════════════════
function dailyDialog(app) {
  const cfg = app.dailyCfg(), p = app.profile, m = MAP_MAP[cfg.mapId];
  const done = p.daily.last === dayKey();
  const lb = p.leaderboard['daily:' + dayKey()] || [];
  modal(`📅 Daily Challenge — ${dayKey()}`, h('div',
    h('p', `🗺️ ${m.name} · 🌼 Bloom · 40 waves · Hero: ${HERO_MAP[cfg.heroId].emoji} ${HERO_MAP[cfg.heroId].name}`),
    h('ul', cfg.modifiers.map((id) => { const md = MODIFIERS.find((x) => x.id === id); return h('li', `${md.emoji} ${md.name} — ${md.desc}`); })),
    h('p', `🔥 Streak: ${p.daily.streak}${done ? ' · ✅ Completed today' : ''}`),
    lb.length ? h('p.muted', `Your best today: ❤️ ${lb[0].score} lives remaining`) : null,
    h('p.muted', 'Same seed for every player today. Rewards: +40 💎 bonus.')),
  [{ label: '▶ Play Daily', cls: 'primary', onclick: () => app.startGame(cfg) }]);
}

// ═════════════════════════ CHALLENGE EDITOR ═════════════════════════
export function challengeEditor(app, preset = null) {
  const c = preset || { mapId: 'sprout', diff: 'normal', cash: 700, lives: 150, startWave: 1, endWave: 40, modifiers: [], banned: [], heroAllowed: true, maxTier: 5, name: 'My Challenge' };
  const name = h('input', { value: c.name || 'Challenge', maxlength: 30 });
  const map = h('select', MAPS.filter((m) => !m.event).map((m) => h('option', { value: m.id, selected: m.id === c.mapId }, m.name)));
  const diff = h('select', Object.values(DIFFICULTIES).map((d) => h('option', { value: d.id, selected: d.id === c.diff }, `${d.emoji} ${d.name}`)));
  const num = (v, min, max) => h('input', { type: 'number', value: v, min, max });
  const cash = num(c.cash, 0, 1e7), lives = num(c.lives, 1, 10000), sw = num(c.startWave, 1, 200), ew = num(c.endWave, 1, 300), mt = num(c.maxTier, 0, 5);
  const hero = h('input', { type: 'checkbox', checked: c.heroAllowed !== false });
  const mods = new Set(c.modifiers), banned = new Set(c.banned);
  const modBox = h('div.chipsel', MODIFIERS.map((m) => h('button.chipbtn' + (mods.has(m.id) ? '.on' : ''), { title: m.desc, onclick: (e) => { mods.has(m.id) ? mods.delete(m.id) : mods.add(m.id); e.currentTarget.classList.toggle('on'); } }, `${m.emoji} ${m.name}`)));
  const towBox = h('div.chipsel', TOWERS.map((t) => h('button.chipbtn' + (banned.has(t.id) ? '.off' : '.on'), { title: t.name, onclick: (e) => { banned.has(t.id) ? banned.delete(t.id) : banned.add(t.id); e.currentTarget.classList.toggle('off'); e.currentTarget.classList.toggle('on'); } }, t.emoji)));
  const collect = () => ({ name: name.value, mapId: map.value, diff: diff.value, cash: +cash.value, lives: +lives.value, startWave: +sw.value, endWave: Math.max(+sw.value, +ew.value), modifiers: [...mods], banned: [...banned], heroAllowed: hero.checked, maxTier: +mt.value });
  const play = (cc) => app.startGame({ ...cc, mode: 'challenge', seed: hashStr(JSON.stringify(cc)) });
  modal('🏁 Challenge Editor', h('div.editor',
    h('label', 'Name', name), h('div.grid2', h('label', 'Map', map), h('label', 'Difficulty', diff), h('label', 'Start cash', cash), h('label', 'Lives', lives), h('label', 'Start wave', sw), h('label', 'End wave', ew), h('label', 'Max tier', mt), h('label.ck', hero, ' Heroes allowed')),
    h('h3', 'Modifiers'), modBox, h('h3', 'Allowed towers (tap to ban)'), towBox),
  [{ label: '📋 Copy share link', onclick: () => { const url = `${location.origin}${location.pathname}?challenge=${encode(collect())}`; navigator.clipboard?.writeText(url); toast('🔗 Link copied!', 'good'); return false; } },
    { label: '📥 Import code', onclick: () => { const ta = h('textarea.code', { placeholder: 'Paste challenge code or link…' }); modal('Import challenge', ta, [{ label: 'Load', cls: 'primary', onclick: () => { try { const raw = ta.value.includes('challenge=') ? ta.value.split('challenge=')[1] : ta.value; challengeEditor(app, decode(raw)); } catch { toast('Invalid code', 'bad'); return false; } } }]); } },
    { label: '▶ Play', cls: 'primary', onclick: () => play(collect()) }], { wide: true });
}

// ═════════════════════════ EXPEDITION (roguelike) ═════════════════════════
const STAGES = [{ waves: [1, 15], cash: 700 }, { waves: [16, 30], cash: 4200 }, { waves: [31, 45], cash: 11000 }, { waves: [46, 60], cash: 24000 }];
export function expedition(app) {
  const p = app.profile, run = p.rogue;
  const best = p.leaderboard['rogue:best']?.[0]?.score || 0;
  page(app, '🧭 Expedition',
    h('div.expo',
      h('p', 'A roguelike run across 4 random maps. You only get a random draft of towers. Win a stage to pick a reward — relics, new towers, cash or lives. Curses appear deeper in. Lives carry over. Lose once and the run ends.'),
      h('p.muted', `Best: stage ${best}/4 · Completed runs: ${p.stats.rogueWins || 0}`),
      run ? h('div.run', h('h3', `Current run — Stage ${run.stage + 1}/4`), h('p', `❤️ ${run.lives} · Towers: ${run.allowed.map((id) => TOWER_MAP[id].emoji).join(' ')}`),
        h('p', `Run relics: ${run.relics.map((id) => RELICS.find((r) => r.id === id).emoji).join(' ') || 'none'} · Curses: ${run.curses.map((id) => MODIFIERS.find((m) => m.id === id).emoji).join(' ') || 'none'}`),
        h('button.btn.primary', { onclick: () => rogueStart(app) }, `▶ Enter stage ${run.stage + 1}: ${MAP_MAP[run.maps[run.stage]].name}`),
        h('button.btn.danger', { onclick: () => { p.rogue = null; app.save(); expedition(app); } }, 'Abandon run'))
        : h('button.btn.primary.big', { onclick: () => { newRun(app); expedition(app); } }, '🧭 Begin new Expedition')));
}
function newRun(app) {
  const seed = (Math.random() * 1e9) | 0, r = mulberry32(seed);
  const pool = TOWERS.map((t) => t.id).filter((id) => id !== 'pebble').sort(() => r() - 0.5);
  const maps = CAMPAIGN.slice().sort(() => r() - 0.5).sort((a, b) => Object.keys(TIER_INFO).indexOf(a.tier) - Object.keys(TIER_INFO).indexOf(b.tier));
  const pickMaps = [maps[Math.floor(r() * 5)], maps[5 + Math.floor(r() * 5)], maps[10 + Math.floor(r() * 5)], maps[15 + Math.floor(r() * 5)]].map((m) => m.id);
  app.profile.rogue = { seed, stage: 0, maps: pickMaps, allowed: ['pebble', ...pool.slice(0, 7)], relics: [], curses: [], lives: 120, bonusCash: 0 };
  app.save();
}
function rogueStart(app) {
  const run = app.profile.rogue, st = STAGES[run.stage];
  app.startGame({ mapId: run.maps[run.stage], diff: 'normal', mode: 'rogue', allowed: run.allowed, startWave: st.waves[0], endWave: st.waves[1], cash: st.cash + run.bonusCash,
    lives: run.lives, modifiers: run.curses, relics: [...app.profile.equipped, ...run.relics], seed: run.seed + run.stage });
}
export function rogueStageEnd(app, won, wave) {
  const p = app.profile, run = p.rogue, g = app.game;
  const best = p.leaderboard['rogue:best']?.[0]?.score || 0;
  if (!won) {
    app.recordScore('rogue:best', Math.max(best, run.stage)); p.rogue = null; app.save(true);
    return modal('💀 Expedition failed', h('p', `You fell on stage ${run.stage + 1} at wave ${wave}.`), [{ label: '🏠 Menu', cls: 'primary', onclick: () => app.quitGame() }], { locked: true });
  }
  run.lives = Math.floor(g.lives); run.stage++; run.bonusCash = 0;
  app.recordScore('rogue:best', Math.max(best, run.stage));
  if (run.stage >= STAGES.length) {
    addStat(p, 'rogueWins'); p.gems += 300; const r = rollRelic(p, 'epic'); p.rogue = null; checkAchievements(p); app.save(true);
    return modal('🏆 Expedition complete!', h('div.result', h('div.result-big', '🧭'), h('p', `+300 💎 · ${r.relic.emoji} ${r.relic.name}`)), [{ label: '🏠 Menu', cls: 'primary', onclick: () => app.quitGame() }], { locked: true });
  }
  if (run.stage >= 2) { const pool = MODIFIERS.filter((m) => !['onelife', 'nohero', 'nofarm'].includes(m.id) && !run.curses.includes(m.id)); run.curses.push(pool[Math.floor(Math.random() * pool.length)].id); }
  // reward draft
  const r = Math.random, notOwned = TOWERS.filter((t) => !run.allowed.includes(t.id));
  const relicPool = RELICS.filter((x) => !run.relics.includes(x.id) && x.rarity !== 'legendary');
  const opts = [
    { label: '🏺 Relic', make: () => relicPool[Math.floor(r() * relicPool.length)], apply: (x) => run.relics.push(x.id), text: (x) => `${x.emoji} ${x.name} — ${x.desc}` },
    { label: '🗼 Towers', make: () => notOwned.sort(() => r() - 0.5).slice(0, 2), apply: (x) => run.allowed.push(...x.map((t) => t.id)), text: (x) => `Unlock ${x.map((t) => `${t.emoji} ${t.name}`).join(' & ')}` },
    { label: '💰 Cash', make: () => 2000 + run.stage * 1500, apply: (x) => (run.bonusCash += x), text: (x) => `+$${fmt(x)} next stage` },
    { label: '❤️ Lives', make: () => 50, apply: (x) => (run.lives += x), text: (x) => `+${x} lives` },
  ].sort(() => r() - 0.5).slice(0, 3).map((o) => ({ ...o, val: o.make() }));
  app.save(true);
  const m = modal(`✅ Stage ${run.stage} cleared!`, h('div', h('p', 'Choose a reward:'), h('div.cards.small', opts.map((o) => h('button.rcard', { onclick: () => { o.apply(o.val); app.save(true); m.close(); app.quitGame(); app.show('expedition'); } }, h('b', o.label), h('small', o.text(o.val))))),
    run.curses.length ? h('p.muted', `⚠️ Curse added: ${MODIFIERS.find((x) => x.id === run.curses[run.curses.length - 1]).name}`) : null), [], { locked: true });
}
