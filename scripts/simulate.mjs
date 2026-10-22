/**
 * simulate.mjs — headless balance & crash test.
 * A "decent player" bot builds a mix of damage towers near the path, follows
 * sensible upgrade plans (main path to 4, secondary to 2), uses abilities on
 * bosses, then plays until it wins or loses.
 *
 *   node scripts/simulate.mjs [games=8] [difficulty=normal]
 *
 * Use it as a regression test: if a change shifts the waves the bot reaches by a
 * lot, balance has moved. It also catches crashes across every map.
 */
import { Game } from '../www/src/game/game.js';
import { CAMPAIGN } from '../www/src/data/maps.js';
import { mulberry32 } from '../www/src/util.js';

const N = +process.argv[2] || 8, DIFF = process.argv[3] || 'normal';
const ROSTER = ['pebble', 'thorn', 'beetle', 'crab', 'tesla', 'ember', 'hawk', 'mole', 'prism', 'rail', 'star', 'roost', 'orrery', 'blade', 'lantern', 'frost', 'beacon', 'hive'];
const results = [];
for (let gi = 0; gi < N; gi++) {
  const map = CAMPAIGN[(gi * 3) % CAMPAIGN.length];
  const r = mulberry32(1000 + gi);
  const g = new Game({ mapId: map.id, diff: DIFF, mode: 'campaign', seed: 42 + gi }, null, {});
  const t0 = Date.now();
  try {
    if (g.cash - g.heroCost('mossa') >= 250) g.placeHero('mossa', ...spot(g, r));
    const plan = new Map(); // tower -> [main, second]
    while (!g.over) {
      if (!g.waveActive) {
        for (let k = 0; k < 60; k++) {
          const wantMore = g.towers.length < 3 + g.wave / 2.5;
          if (wantMore && r() < 0.65) {
            const pool = ROSTER.filter((id) => (id !== 'hive' || g.wave < 30) && (id !== 'beacon' || g.towers.length > 6));
            const id = pool[Math.floor(r() * pool.length)];
            if (g.towerCost(id) <= g.cash) { const t = g.placeTower(id, ...spot(g, r)); if (t) plan.set(t, [Math.floor(r() * 3), Math.floor(r() * 3)]); }
          } else {
            // cheapest available planned upgrade
            let best = null;
            for (const t of g.towers) {
              if (t.hero) continue;
              const [a, b] = plan.get(t) || [0, 1];
              for (const p of [a, b === a ? (a + 1) % 3 : b]) {
                const info = g.upgradeInfo(t, p); if (!info || info.maxed || info.locked) continue;
                if ((p === a && t.tiers[p] >= 5) || (p !== a && t.tiers[p] >= 2)) continue;
                if (!best || info.cost < best.cost) best = { t, p, cost: info.cost };
              }
            }
            if (best && best.cost <= g.cash) g.upgrade(best.t, best.p);
          }
        }
        if (!g.towers.some((t) => t.hero) && g.cash >= g.heroCost('mossa')) g.placeHero('mossa', ...spot(g, r));
        g.startWave();
      }
      g.step(1 / 60);
      if (g.boss || g.enemies.length > 120) for (const t of g.towers) for (const a of t.abilities) if (t.abilityCds[a.name] <= 0) g.useAbility(t, a);
    }
    results.push({ map: map.id, diff: DIFF, wave: g.wave, won: g.won, towers: g.towers.length, lives: Math.floor(g.lives), ms: Date.now() - t0 });
  } catch (e) {
    console.error('CRASH on', map.id, 'wave', g.wave, e); process.exitCode = 1; break;
  }
}
console.table(results);

function spot(g, r) {
  for (let i = 0; i < 500; i++) {
    const p = g.paths[Math.floor(r() * g.paths.length)];
    const s = p.samples[Math.floor(r() * p.samples.length)];
    const a = r() * Math.PI * 2, d = 45 + r() * 50;
    const x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
    if (g.canPlace(x, y)) return [x, y];
  }
  return [640, 360];
}
