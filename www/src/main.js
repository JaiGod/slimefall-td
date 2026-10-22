/**
 * main.js — application entry point & session controller.
 *
 * Owns the profile, switches screens, runs the render/sim loop, and turns game
 * results into rewards (XP, gems, research points, medals, relics, resources).
 */
import { Game } from './game/game.js';
import { Renderer } from './game/render.js';
import { Hud } from './ui/hud.js';
import { h, $, modal, toast } from './ui/dom.js';
import * as Menus from './ui/menus.js';
import { audio } from './audio.js';
import { loadProfile, saveProfile, addStat, maxStat, addXp, checkAchievements, refreshQuests, rollRelic } from './save.js';
import { DIFFICULTIES, VERSION } from './config.js';
import { MAP_MAP, CAMPAIGN, TIER_INFO } from './data/maps.js';
import { STORY, ENDING, MODIFIERS, currentSeason } from './data/meta.js';
import { TOWERS } from './data/towers.js';
import { HEROES } from './data/heroes.js';
import { mulberry32, hashStr, dayKey, decode } from './util.js';

class App {
  constructor() {
    this.profile = loadProfile();
    refreshQuests(this.profile);
    this.game = null; this.hud = null; this.renderer = null; this.lastCfg = null;
    this.season = currentSeason();
    const params = new URLSearchParams(location.search);
    if (params.get('music') === 'off') this.profile.settings.music = false;
    if (params.get('music') === 'on') this.profile.settings.music = true;
    audio.musicOn = this.profile.settings.music; audio.sfxOn = this.profile.settings.sfx;
    audio.musicVol = this.profile.settings.musicVol; audio.sfxVol = this.profile.settings.sfxVol;
    // first user gesture unlocks WebAudio (autoplay policy)
    const unlock = () => { audio.unlock(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    this.bindSecrets();
    this.loop = this.loop.bind(this); this.last = performance.now(); requestAnimationFrame(this.loop);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.game && !this.game.over) { if (!$('.modal-wrap')) this.hud?.pauseMenu(); } });
    const ch = params.get('challenge');
    this.show('title');
    if (ch) { try { Menus.challengeEditor(this, decode(ch)); } catch { toast('Invalid challenge link', 'bad'); } }
  }

  save(now = false) { saveProfile(this.profile, now); }
  setMusic(on) { this.profile.settings.music = on; audio.setMusic(on); this.save(); }
  setSfx(on) { this.profile.settings.sfx = on; audio.setSfx(on); this.save(); }

  /** Switch top-level screen ('title' | 'world' | 'game' | 'page'). */
  show(name, ...args) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + (name === 'game' ? 'game' : 'menu')));
    if (name !== 'game') { audio.setMood('menu', 0.35); Menus[name](this, ...args); }
  }

  // ───────────── game sessions ─────────────
  /** cfg: { mapId, diff, mode, modifiers, relics, ... } */
  startGame(cfg, checkpoint = null) {
    const p = this.profile;
    cfg = { relics: p.equipped.slice(), heroId: p.hero, ...cfg };
    const story = STORY[cfg.mapId];
    if (!checkpoint && story && !p.seen[cfg.mapId] && cfg.mode !== 'sandbox') {
      p.seen[cfg.mapId] = true; this.save();
      return Menus.cutscene(this, story, () => this.startGame(cfg));
    }
    this.lastCfg = cfg;
    this.teardown();
    const game = new Game(cfg, p, { onEvent: (t, d) => this.onGameEvent(t, d), sfx: (n) => audio.sfx(n) });
    this.game = game;
    this.renderer = new Renderer(document.createElement('canvas'), game, p);
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-game'));
    this.hud = new Hud(this, game, this.renderer);
    document.body.classList.add('ingame');
    if (checkpoint) { game.restore(checkpoint); toast(`▶ Resumed at wave ${game.wave}`); }
    game.autoStart = p.settings.autoStart;
    audio.setMood('battle', 0.3);
    const m = MAP_MAP[cfg.mapId];
    this.hud.banner(`${m.name}`, cfg.mode === 'sandbox' ? '🧪 Sandbox' : `${game.diff.emoji} ${game.diff.name}${cfg.mode !== 'campaign' ? ' · ' + this.modeName(cfg.mode) : ''}`);
    if (game.mods.size) setTimeout(() => toast('Modifiers: ' + [...game.mods].map((id) => MODIFIERS.find((x) => x.id === id)?.emoji).join(' ')), 600);
  }
  modeName(m) { return { endless: '♾️ Endless', daily: '📅 Daily', challenge: '🏁 Challenge', rogue: '🧭 Expedition', coop: '🤝 Co-op', sandbox: '🧪 Sandbox' }[m] || m; }

  restart() { const cfg = this.lastCfg; this.profile.checkpoint = null; this.startGame({ ...cfg }); }
  quitGame() { this.flushSession(); this.teardown(); this.show('title'); }
  teardown() { document.body.classList.remove('ingame'); this.hud?.destroy(); this.hud = null; this.game = null; this.renderer = null; }

  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const g = this.game;
    if (g && this.hud) {
      g.tick(dt);
      this.renderer.ctx.setTransform(this.hud.scale * this.hud.dpr, 0, 0, this.hud.scale * this.hud.dpr, 0, 0);
      this.renderer.draw(g.paused ? 0 : dt * g.speed, this.hud.ui);
      this.hud.update(dt);
      // dynamic music intensity follows the action
      const inten = g.boss ? 1 : g.waveActive ? Math.min(0.95, 0.45 + g.enemies.length / 250 + g.wave / 200) : 0.25;
      audio.setMood(g.boss ? 'boss' : 'battle', inten);
    }
    requestAnimationFrame(this.loop);
  }

  onGameEvent(type, d) {
    const g = this.game, hud = this.hud; if (!hud) return;
    switch (type) {
      case 'wave': audio.sfx('wave'); if (d.boss) hud.banner('⚠️ BOSS WAVE', `Wave ${d.n}`, 'boss'); else if (d.elite) hud.banner('😈 ELITE WAVE', `Wave ${d.n} — swift & fortified`, 'elite'); break;
      case 'boss': audio.sfx('boss'); hud.banner(`👑 ${d.def.name}`, d.def.title, 'boss'); break;
      case 'bossDefeated': audio.sfx('win'); if (Math.random() < 0.35) { const r = rollRelic(this.profile, Math.random() < 0.2 ? 'epic' : 'rare'); toast(`🏺 Relic found: ${r.relic.emoji} ${r.relic.name}${r.dupe ? ' (duplicate → gems)' : ''}`, 'good'); } break;
      case 'toast': toast(d); break;
      case 'weather': if (g.wave > 1) toast(`${d.emoji} Weather: ${d.name} — ${d.desc}`); break;
      case 'leak': audio.sfx('leak'); hud.el.lives.classList.remove('hurt'); void hud.el.lives.offsetWidth; hud.el.lives.classList.add('hurt'); break;
      case 'waveEnd': this.flushSession(); break;
      case 'checkpoint': if (['campaign', 'endless'].includes(g.mode) && !g.cfg.coop) { this.profile.checkpoint = d; this.save(); } break;
      case 'win': this.endGame(true, d); break;
      case 'lose': this.endGame(false, d); break;
    }
  }

  /** Move per-session counters into the profile (quests/achievements read from stats). */
  flushSession() {
    const g = this.game; if (!g || g.sandbox) { if (g) g.session = g.freshSession(); return; }
    const s = g.session, p = this.profile;
    for (const k of ['pops', 'cashEarned', 'behemoths', 'bosses', 'abyssKills', 'abilitiesUsed', 'towersPlaced', 'upgrades', 'tier5', 'fusions', 'goldens', 'shinies', 'ducks', 'waves']) if (s[k]) addStat(p, k, Math.floor(s[k]));
    for (const r in s.res) if (s.res[r]) { p.resources[r] = (p.resources[r] || 0) + s.res[r]; if (r === 'gel') addStat(p, 'gel', s.res[r]); }
    for (const id in s.mastery) p.mastery[id] = (p.mastery[id] || 0) + s.mastery[id];
    p.gems += s.gems;
    if (g.towers.some((t) => t.stars >= 4)) maxStat(p, 'vet4', 1);
    addXp(p, s.pops * 0.02 + s.waves * 8);
    g.session = g.freshSession();
    for (const a of checkAchievements(p)) toast(`🏅 Achievement: ${a.emoji} ${a.name} (+${a.gems}💎)`, 'good');
    this.save();
  }

  endGame(won, d) {
    const g = this.game, p = this.profile, cfg = g.cfg;
    this.flushSession();
    audio.sfx(won ? 'win' : 'lose');
    p.checkpoint = null;
    const rewards = [];
    if (!g.sandbox) {
      const tierMult = TIER_INFO[g.map.tier].mult;
      const xp = (g.wave * 25) * g.diff.xp * tierMult * (won ? 1.5 : 0.6) * (this.season?.fx?.xp || 1);
      const lv = addXp(p, xp); rewards.push(`⭐ ${Math.floor(xp)} XP`); if (lv) rewards.push(`🎉 Level up! +${lv} 🔬`);
      if (cfg.mode === 'endless') {
        const best = p.medals[cfg.mapId]?.endless || 0;
        p.medals[cfg.mapId] = { ...(p.medals[cfg.mapId] || {}), endless: Math.max(best, g.wave) };
        maxStat(p, 'endlessBest', g.wave);
        this.recordScore(`endless:${cfg.mapId}`, g.wave);
        const gems = Math.floor(g.wave / 2); p.gems += gems; rewards.push(`💎 ${gems} gems`);
      }
      if (won) {
        addStat(p, 'wins');
        let gems = Math.floor(g.diff.gems * tierMult * (this.season?.fx?.gems || 1));
        if (cfg.mode === 'campaign' || cfg.mode === 'coop') {
          const first = !p.medals[cfg.mapId]?.[cfg.diff];
          p.medals[cfg.mapId] = { ...(p.medals[cfg.mapId] || {}), [cfg.diff]: true };
          if (first) { gems *= 2; rewards.push('🏅 New medal! (first clear ×2 gems)'); }
          p.stats.mapsWon = CAMPAIGN.filter((m) => p.medals[m.id] && ['easy', 'normal', 'hard', 'chaos'].some((k) => p.medals[m.id][k])).length;
          if (cfg.mapId === 'desk') maxStat(p, 'deskWins', 1);
          if (cfg.coop) addStat(p, 'coopWins');
          if (cfg.diff === 'chaos') addStat(p, 'chaosWins');
        }
        if (d.perfect) addStat(p, 'perfectWins');
        if (cfg.mode === 'daily') { addStat(p, 'dailyWins'); gems += 40; p.daily.streak = p.daily.last === dayKey(new Date(Date.now() - 864e5)) ? p.daily.streak + 1 : 1; p.daily.last = dayKey(); this.recordScore('daily:' + dayKey(), Math.floor(g.lives)); }
        p.gems += gems; rewards.push(`💎 ${gems} gems`);
        if (Math.random() < 0.25 + (cfg.diff === 'chaos' ? 0.5 : 0)) { const r = rollRelic(p, cfg.diff === 'chaos' ? 'epic' : null); rewards.push(`🏺 ${r.relic.emoji} ${r.relic.name}${r.dupe ? ' (dupe→gems)' : ''}`); }
      }
      for (const a of checkAchievements(p)) rewards.push(`🏅 ${a.emoji} ${a.name}`);
    }
    this.save(true);
    // Expedition (roguelike) flow
    if (cfg.mode === 'rogue') return Menus.rogueStageEnd(this, won, g.wave);
    const ending = won && g.boss === null && g.wave >= 100 && cfg.mapId === 'gate' && !p.seen.__ending;
    const showResult = () => modal(won ? '🏆 Victory!' : '💀 Defeat', h('div.result',
      h('div.result-big', won ? '🎉' : '🫠'),
      h('p', `${g.map.name} · Wave ${g.wave}${cfg.mode === 'endless' ? ' (Endless)' : ''}`),
      rewards.length ? h('ul.rewards', rewards.map((r) => h('li', r))) : null),
    [{ label: '🔄 Play again', onclick: () => this.restart() }, { label: '🏠 Menu', cls: 'primary', onclick: () => this.quitGame() }], { locked: true });
    if (ending) { p.seen.__ending = true; this.save(); Menus.cutscene(this, ENDING, showResult); } else showResult();
  }

  recordScore(board, score) {
    const lb = (this.profile.leaderboard[board] ||= []);
    lb.push({ score, name: this.profile.name, at: Date.now() }); lb.sort((a, b) => b.score - a.score); lb.length = Math.min(lb.length, 10);
  }

  /** Daily challenge config, identical for every player on a given date. */
  dailyCfg() {
    const key = dayKey(), r = mulberry32(hashStr('daily' + key));
    const maps = CAMPAIGN.filter((m) => m.tier !== 'expert');
    const mods = MODIFIERS.filter((m) => !['onelife', 'nohero'].includes(m.id));
    const picked = [];
    while (picked.length < 2) { const m = mods[Math.floor(r() * mods.length)].id; if (!picked.includes(m)) picked.push(m); }
    return { mapId: maps[Math.floor(r() * maps.length)].id, diff: 'normal', mode: 'daily', modifiers: picked, endWave: 40, seed: hashStr(key), heroId: HEROES[Math.floor(r() * HEROES.length)].id, key };
  }

  // ───────────── secrets ─────────────
  bindSecrets() {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let i = 0;
    window.addEventListener('keydown', (e) => {
      i = e.key === code[i] ? i + 1 : e.key === code[0] ? 1 : 0;
      if (i === code.length) {
        i = 0; const p = this.profile;
        if (!p.stats.konami) { p.stats.konami = 1; p.gems += 100; toast("🕹️ Secret unlocked: Developer's Desk map + retro mode!", 'good'); }
        p.settings.retro = !p.settings.retro; this.hud?.resize(); checkAchievements(p); this.save();
      }
    });
  }
}

// boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  $('#version').textContent = 'v' + VERSION;
  $('#loading')?.remove();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.hostname.match(/^(localhost|127\.)/)) navigator.serviceWorker.register('sw.js').catch(() => {});
});
// keep for debugging in console
export { App, TOWERS, DIFFICULTIES };
