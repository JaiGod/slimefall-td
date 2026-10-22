/**
 * render.js — Canvas2D renderer.
 *
 * Performance strategy:
 *  • Static map (grass, path, decorations) is painted ONCE to an offscreen canvas.
 *  • Slimes and emoji are pre-rendered into a sprite cache, then blitted with drawImage.
 *  • Everything is drawn in logical 1280×720 coordinates; the canvas transform handles DPI/scale.
 */
import { W, H, PATH_W, TOWER_R } from '../config.js';
import { THEMES } from '../data/maps.js';
import { SKINS } from '../data/meta.js';
import { mulberry32, hashStr, TAU, shade, dist2 } from '../util.js';

const spriteCache = new Map();
function sprite(key, w, h, draw) {
  let c = spriteCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); spriteCache.set(key, c); }
  return c;
}
export function emojiSprite(emoji, size) {
  return sprite('e' + emoji + size, size * 1.4, size * 1.4, (g, w, h) => {
    g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, w / 2, h / 2 + size * 0.06);
  });
}
function slimeSprite(color, r, kind) {
  const pad = 6, S = Math.ceil(r * 2 + pad * 2);
  return sprite(`s${color}${r}${kind || ''}`, S, S, (g) => {
    const cx = S / 2, cy = S / 2 + 1;
    const base = color === 'rainbow' ? null : color;
    // shadow-ish outline
    g.beginPath(); g.ellipse(cx, cy, r, r * 0.9, 0, 0, TAU);
    if (base) {
      const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
      gr.addColorStop(0, shade(base, 0.45)); gr.addColorStop(0.6, base); gr.addColorStop(1, shade(base, -0.35)); g.fillStyle = gr;
    } else {
      const gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      ['#ff5252', '#ffeb3b', '#69f0ae', '#40c4ff', '#e040fb'].forEach((c, i) => gr.addColorStop(i / 4, c)); g.fillStyle = gr;
    }
    g.fill(); g.lineWidth = Math.max(1.5, r * 0.09); g.strokeStyle = base ? shade(base, -0.5) : '#333'; g.stroke();
    // shine
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx - r * 0.38, cy - r * 0.42, r * 0.28, r * 0.16, -0.5, 0, TAU); g.fill();
    if (kind === 'armor') { g.strokeStyle = 'rgba(40,40,50,.55)'; g.lineWidth = r * 0.12; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(cx, cy + r * 0.25, r * (0.55 + i * 0.18), Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
    if (kind === 'crystal') { g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 4; i++) { const a = i * 1.6; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3); g.lineTo(cx + Math.cos(a + 0.4) * r * 0.85, cy + Math.sin(a + 0.4) * r * 0.85); g.lineTo(cx + Math.cos(a - 0.3) * r * 0.8, cy + Math.sin(a - 0.3) * r * 0.8); g.fill(); } }
    // eyes
    const er = Math.max(1.6, r * 0.2), ex = r * 0.3, ey = -r * 0.05;
    for (const sx of [-1, 1]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + sx * ex + r * 0.12, cy + ey, er, er * 1.2, 0, 0, TAU); g.fill();
      g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(cx + sx * ex + r * 0.12 + er * 0.35, cy + ey + er * 0.15, er * 0.55, 0, TAU); g.fill();
    }
    if (kind === 'angry' || kind === 'boss') { g.strokeStyle = '#1b1b1b'; g.lineWidth = Math.max(1.5, r * 0.07); for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(cx + sx * ex * 1.8 + r * 0.12, cy + ey - er * 1.8); g.lineTo(cx + sx * ex * 0.4 + r * 0.12, cy + ey - er * 1.1); g.stroke(); } }
    // mouth
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = Math.max(1, r * 0.06); g.beginPath();
    if (kind === 'boss' || kind === 'angry') { g.moveTo(cx - r * 0.1, cy + r * 0.38); g.lineTo(cx + r * 0.35, cy + r * 0.3); } else g.arc(cx + r * 0.12, cy + r * 0.25, r * 0.16, 0.2, Math.PI - 0.2);
    g.stroke();
  });
}
const KIND = { shell: 'armor', crystal: 'crystal', disruptor: 'angry', titan: 'angry', royal: 'angry', colossus: 'angry', hydra: 'boss', chrono: 'boss', abyss: 'boss' };

export class Renderer {
  constructor(canvas, game, profile) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.game = game; this.profile = profile;
    this.theme = THEMES[game.map.theme];
    this.bg = this.paintBackground();
    this.weatherParts = Array.from({ length: 120 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() }));
    this.t = 0;
  }

  // ───────────── static background ─────────────
  paintBackground() {
    const g = this.game, th = this.theme, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), rng = mulberry32(hashStr(g.map.id));
    x.fillStyle = th.grass; x.fillRect(0, 0, W, H);
    // organic texture
    for (let i = 0; i < 220; i++) { x.fillStyle = i % 2 ? th.grass2 : shade(th.grass, 0.06); x.globalAlpha = 0.35; x.beginPath(); x.ellipse(rng() * W, rng() * H, 20 + rng() * 60, 12 + rng() * 30, rng() * 3, 0, TAU); x.fill(); }
    x.globalAlpha = 1;
    if (th.water) { const gr = x.createLinearGradient(0, H * 0.7, 0, H); gr.addColorStop(0, 'rgba(79,195,247,0)'); gr.addColorStop(1, 'rgba(41,182,246,.65)'); x.fillStyle = gr; x.fillRect(0, H * 0.7, W, H * 0.3); }
    if (g.map.theme === 'neon') { x.strokeStyle = 'rgba(0,229,255,.12)'; x.lineWidth = 1; for (let i = 0; i <= W; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 40) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } }
    // paths: edge, fill, centre dashes
    const stroke = (w, col, dash) => {
      for (const p of g.paths) {
        x.beginPath(); p.pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
        x.lineWidth = w; x.strokeStyle = col; x.lineJoin = 'round'; x.lineCap = 'round'; x.setLineDash(dash || []); x.stroke();
      }
      x.setLineDash([]);
    };
    stroke(PATH_W + 10, 'rgba(0,0,0,.18)'); stroke(PATH_W + 6, th.edge); stroke(PATH_W, th.path); stroke(4, 'rgba(255,255,255,.18)', [10, 16]);
    // pebbles on road
    for (const p of g.paths) for (const s of p.samples) if (rng() < 0.12) { x.fillStyle = 'rgba(0,0,0,.08)'; x.beginPath(); x.arc(s.x + (rng() - 0.5) * PATH_W * 0.8, s.y + (rng() - 0.5) * PATH_W * 0.8, 1.5 + rng() * 2.5, 0, TAU); x.fill(); }
    // decorations (some block placement)
    const n = Math.floor(26 * (g.map.blockers || 1));
    for (let i = 0, tries = 0; i < n && tries < 600; tries++) {
      const dx = 20 + rng() * (W - 40), dy = 20 + rng() * (H - 40);
      if (g.paths.some((p) => p.distTo2(dx, dy) < (PATH_W + 18) ** 2)) continue;
      if (g.blockers.some((b) => dist2(b.x, b.y, dx, dy) < 50 ** 2)) continue;
      const big = rng() < 0.35, size = big ? 38 : 22, emoji = th.deco[Math.floor(rng() * th.deco.length)];
      x.fillStyle = 'rgba(0,0,0,.15)'; x.beginPath(); x.ellipse(dx, dy + size * 0.4, size * 0.45, size * 0.15, 0, 0, TAU); x.fill();
      x.drawImage(emojiSprite(emoji, size), dx - size * 0.7, dy - size * 0.7);
      if (big) g.blockers.push({ x: dx, y: dy, r: size * 0.42 });
      i++;
    }
    // entrance portals & exit gate
    for (const p of g.paths) {
      const [sx, sy] = p.pts[0], [ex, ey] = p.pts[p.pts.length - 1];
      const clampP = (v, m) => Math.max(26, Math.min(m - 26, v));
      x.drawImage(emojiSprite('🌀', 34), clampP(sx, W) - 24, clampP(sy, H) - 24);
      x.drawImage(emojiSprite(g.map.theme === 'desk' ? '☕' : '🏰', 40), clampP(ex, W) - 28, clampP(ey, H) - 28);
    }
    return c;
  }

  // ───────────── frame ─────────────
  draw(dt, ui) {
    const g = this.game, x = this.ctx; this.t += dt;
    x.save();
    if (g.shake > 0 && this.profile.settings.shake) x.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    x.drawImage(this.bg, 0, 0);

    // range circle of selected tower / ghost
    if (ui.selected) this.rangeCircle(ui.selected.x, ui.selected.y, ui.selected.eff.range, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.5)');
    if (ui.ghost) {
      const ok = ui.ghost.ok;
      this.rangeCircle(ui.ghost.x, ui.ghost.y, ui.ghost.range, ok ? 'rgba(120,255,140,.14)' : 'rgba(255,80,80,.16)', ok ? 'rgba(120,255,140,.7)' : 'rgba(255,80,80,.7)');
    }

    // traps
    for (const tr of g.traps) {
      const sz = tr.s.splash ? 20 : 18; x.globalAlpha = 0.5 + 0.5 * Math.min(1, tr.uses / 4);
      x.drawImage(emojiSprite(tr.t.def.id === 'mushroom' ? '🍄' : '🕸️', sz), tr.x - sz * 0.7, tr.y - sz * 0.7); x.globalAlpha = 1;
    }

    // enemies
    for (const e of g.enemies) this.drawEnemy(e);

    // minions
    for (const m of g.minions) {
      const s = m.r * 2; x.drawImage(emojiSprite(m.emoji, Math.round(s)), m.x - s * 0.7, m.y - s * 0.7 + Math.sin(this.t * 12 + m.d) * 1.5);
      if (m.hp < m.maxHp) this.bar(m.x, m.y - m.r - 6, 20, m.hp / m.maxHp, '#64b5f6');
    }

    // towers
    for (const t of g.towers) this.drawTower(t, ui.selected === t);

    // projectiles
    for (const p of g.projectiles) this.drawProj(p);

    // mortar shells: arc from source to target
    for (const sh of g.shells) {
      const k = Math.min(1, sh.time / sh.delay), px = sh.sx + (sh.x - sh.sx) * k, py = sh.sy + (sh.y - sh.sy) * k - Math.sin(k * Math.PI) * (sh.star ? 0 : 90);
      x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(sh.x, sh.y, 8 * k + 3, 4 * k + 1.5, 0, 0, TAU); x.fill();
      if (sh.star) { x.drawImage(emojiSprite('☄️', 22), px - 15, py - 15); }
      else { x.fillStyle = '#5d4037'; x.beginPath(); x.arc(px, py, 6, 0, TAU); x.fill(); }
    }

    // beams
    for (const b of g.beams) {
      x.strokeStyle = b.color; x.lineWidth = b.w; x.globalAlpha = Math.min(1, b.life * 10); x.shadowColor = b.color; x.shadowBlur = 8;
      x.beginPath(); x.moveTo(b.pts[0], b.pts[1]);
      for (let i = 2; i < b.pts.length; i += 2) {
        if (b.zig) { const px = b.pts[i - 2], py = b.pts[i - 1], qx = b.pts[i], qy = b.pts[i + 1]; for (let k = 1; k < 5; k++) x.lineTo(px + (qx - px) * k / 5 + (Math.random() - 0.5) * 10, py + (qy - py) * k / 5 + (Math.random() - 0.5) * 10); }
        x.lineTo(b.pts[i], b.pts[i + 1]);
      }
      x.stroke(); x.shadowBlur = 0; x.globalAlpha = 1;
    }

    // rings (explosions, pulses, auras)
    for (const r of g.rings) { x.strokeStyle = r.color; x.globalAlpha = Math.max(0, r.life * 2.5); x.lineWidth = 3; x.beginPath(); x.arc(r.x, r.y, r.r, 0, TAU); x.stroke(); }
    x.globalAlpha = 1;
    // aura towers show a soft field
    for (const t of g.towers) if (t.eff.kind === 'aura') { x.fillStyle = t.def.color; x.globalAlpha = 0.07 + Math.sin(this.t * 3 + t.id) * 0.02; x.beginPath(); x.arc(t.x, t.y, t.eff.range, 0, TAU); x.fill(); x.globalAlpha = 1; }

    g.particles.draw(x);
    if (ui.ghost) this.drawGhost(ui.ghost);
    this.drawWeather(dt);
    x.restore();
    if (g.flash > 0) { x.fillStyle = `rgba(255,255,255,${g.flash * 0.5})`; x.fillRect(0, 0, W, H); }
  }

  rangeCircle(cx, cy, r, fill, stroke) {
    const x = this.ctx; if (r > 2000) return;
    x.fillStyle = fill; x.strokeStyle = stroke; x.lineWidth = 2; x.setLineDash([8, 6]);
    x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); x.stroke(); x.setLineDash([]);
  }

  bar(cx, cy, w, f, col) {
    const x = this.ctx; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(cx - w / 2 - 1, cy - 1, w + 2, 5); x.fillStyle = col; x.fillRect(cx - w / 2, cy, w * Math.max(0, f), 3);
  }

  drawEnemy(e) {
    const x = this.ctx, d = e.def, k = KIND[e.type];
    const spr = slimeSprite(d.color, d.r, k);
    const wob = Math.sin(this.t * (d.big ? 5 : 11) + e.wob) * (e.stunT > 0 ? 0 : 0.08);
    const jumpY = e.jump > 0 ? -Math.sin((e.jump / 0.4) * Math.PI) * 30 : 0;
    const flip = Math.cos(e.a) < -0.1 ? -1 : 1;
    x.save(); x.translate(e.x, e.y + jumpY);
    // ground shadow
    x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(0, d.r * 0.85 - jumpY, d.r * 0.85, d.r * 0.28, 0, 0, TAU); x.fill();
    if (e.phase) x.globalAlpha = 0.42;
    x.scale(flip * (1 + wob), 1 - wob);
    x.drawImage(spr, -spr.width / 2, -spr.height / 2);
    x.restore();
    x.save(); x.translate(e.x, e.y + jumpY);
    if (e.phase) { x.strokeStyle = 'rgba(200,200,255,.6)'; x.setLineDash([3, 3]); x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, d.r + 3, 0, TAU); x.stroke(); x.setLineDash([]); }
    if (e.fortified) { x.strokeStyle = '#90a4ae'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, d.r + 1, Math.PI * 1.05, Math.PI * 1.95); x.stroke(); }
    if (e.regen) { x.fillStyle = '#76ff03'; x.font = 'bold 10px sans-serif'; x.textAlign = 'center'; x.fillText('✚', d.r * 0.8, -d.r * 0.6); }
    if (e.swift) { x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(-d.r - 4 * flip, i * 4); x.lineTo(-d.r - 12 * flip, i * 4); x.stroke(); } }
    if (e.stunT > 0) { x.fillStyle = 'rgba(160,220,255,.35)'; x.beginPath(); x.arc(0, 0, d.r + 2, 0, TAU); x.fill(); }
    if (e.slowF > 0 && e.stunT <= 0) { x.fillStyle = 'rgba(217,154,30,.35)'; x.beginPath(); x.ellipse(0, d.r * 0.5, d.r, d.r * 0.4, 0, 0, TAU); x.fill(); }
    if (e.dotT > 0 && Math.random() < 0.15) this.game.particles.spawn(e.x, e.y - d.r * 0.5, { a: -Math.PI / 2, speed: 30, life: 0.4, size: 3, color: e.dotType === 'fire' ? '#ff7043' : '#ab47bc' });
    if (e.shiny && Math.random() < 0.2) this.game.particles.spawn(e.x + (Math.random() - 0.5) * d.r * 2, e.y + (Math.random() - 0.5) * d.r * 2, { speed: 10, life: 0.5, size: 3, color: '#fff59d' });
    if (e.pumpkin) x.drawImage(emojiSprite('🎃', Math.round(d.r * 1.1)), -d.r * 0.75, -d.r * 1.75);
    if (e.type === 'royal' || e.type === 'abyss') x.drawImage(emojiSprite('👑', Math.round(d.r * 0.9)), -d.r * 0.63, -d.r * 1.65);
    if (e.type === 'hydra') for (let i = 0; i < 2 + e.phaseIdx; i++) x.drawImage(emojiSprite('🌿', 22), -d.r + i * 18, -d.r - 18);
    if (e.type === 'chrono') x.drawImage(emojiSprite('⏳', 26), -18, -d.r - 26);
    if (e.type === 'duck') x.drawImage(emojiSprite('🦆', 26), -18, -18);
    if (e.type === 'golden') { x.strokeStyle = `rgba(255,236,130,${0.5 + Math.sin(this.t * 10) * 0.3})`; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, d.r + 4, 0, TAU); x.stroke(); }
    if (e.half || e.shieldT > 0) { x.strokeStyle = e.half ? 'rgba(168,85,247,.8)' : 'rgba(79,195,247,.9)'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, d.r + 6 + Math.sin(this.t * 6) * 2, 0, TAU); x.stroke(); }
    x.restore();
    if ((d.big || d.hp > 3) && e.hp < e.maxHp) this.bar(e.x, e.y - d.r - 10, Math.min(70, d.r * 1.6), e.hp / e.maxHp, d.boss ? '#ef5350' : '#66bb6a');
  }

  drawTower(t, sel) {
    const x = this.ctx, skin = SKINS.find((s) => s.id === this.profile.skin) || SKINS[0];
    const R = t.fusion ? TOWER_R + 4 : TOWER_R;
    x.save(); x.translate(t.x, t.y);
    // platform
    x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(0, R * 0.7, R * 1.05, R * 0.4, 0, 0, TAU); x.fill();
    const gr = x.createLinearGradient(0, -R, 0, R); gr.addColorStop(0, shade(t.def.color, 0.25)); gr.addColorStop(1, shade(t.def.color, -0.3));
    x.fillStyle = gr; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
    let ring = skin.ring; if (ring === 'rainbow') ring = `hsl(${(this.t * 120) % 360},90%,60%)`;
    x.lineWidth = sel ? 4 : 3; x.strokeStyle = sel ? '#fff' : ring || shade(t.def.color, -0.5); x.stroke();
    if (skin.glow) { x.shadowColor = ring; x.shadowBlur = 12; x.stroke(); x.shadowBlur = 0; }
    if (this.game.cfg.coop) { x.fillStyle = t.owner ? '#42a5f5' : '#ef5350'; x.beginPath(); x.arc(R * 0.75, -R * 0.75, 4, 0, TAU); x.fill(); }
    // barrel shows aim direction
    if (['proj', 'beam', 'mortar'].includes(t.eff.kind) && !t.eff.radial) {
      x.save(); x.rotate(t.angle); x.fillStyle = 'rgba(30,30,30,.55)'; x.fillRect(R * 0.45 - t.recoil * 3, -3, R * 0.75, 6); x.restore();
    }
    // emoji icon
    const es = t.fusion ? 30 : 26; const bob = t.hero ? Math.sin(this.t * 3) * 1.5 : 0;
    const spr = emojiSprite(t.def.emoji, es); x.drawImage(spr, -spr.width / 2, -spr.height / 2 - 2 + bob);
    if (t.stun > 0) x.drawImage(emojiSprite('💫', 16), -11, -R - 14);
    if (t.frenzyT > 0) { x.strokeStyle = 'rgba(255,82,82,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, R + 4 + Math.sin(this.t * 20) * 2, 0, TAU); x.stroke(); }
    // tier pips
    if (!t.hero && !t.fusion) {
      for (let p = 0; p < 3; p++) for (let i = 0; i < t.tiers[p]; i++) { x.fillStyle = ['#ff7043', '#42a5f5', '#66bb6a'][p]; x.fillRect(-11 + p * 8, R - 1 - i * 3.2, 6, 2.4); }
    } else if (t.hero) { x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText(t.level, 0, R + 10); x.fillStyle = '#80deea'; x.fillText(t.level, 0, R + 10); }
    if (t.stars) { x.font = '9px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ffd54f'; x.fillText('★'.repeat(t.stars), 0, -R - 3); }
    x.restore();
    // orbit blades
    if (t.eff.kind === 'orbit' || (t.eff.orbit && t.eff.blades)) {
      const n = t.eff.blades || 1, R2 = t.eff.orbitR || 50;
      for (let i = 0; i < n; i++) {
        const a = t.orbA + (i / n) * TAU, bx = t.x + Math.cos(a) * R2, by = t.y + Math.sin(a) * R2;
        if (t.eff.orbit) { x.fillStyle = '#b388ff'; x.shadowColor = '#b388ff'; x.shadowBlur = 10; x.beginPath(); x.arc(bx, by, 7, 0, TAU); x.fill(); x.shadowBlur = 0; }
        else { x.save(); x.translate(bx, by); x.rotate(a * 3); x.fillStyle = '#cfd8dc'; x.strokeStyle = '#455a64'; x.lineWidth = 1.5; x.beginPath(); for (let k = 0; k < 4; k++) { const aa = k * Math.PI / 2; x.lineTo(Math.cos(aa) * 11, Math.sin(aa) * 11); x.lineTo(Math.cos(aa + 0.6) * 4, Math.sin(aa + 0.6) * 4); } x.closePath(); x.fill(); x.stroke(); x.restore(); }
      }
    }
  }

  drawProj(p) {
    const x = this.ctx;
    switch (p.shape) {
      case 'disc': x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.color; x.fillRect(-p.r, -2.5, p.r * 2, 5); x.fillRect(-2.5, -p.r, 5, p.r * 2); x.restore(); break;
      case 'bomb': x.fillStyle = 'rgba(180,230,255,.8)'; x.strokeStyle = '#4fc3f7'; x.lineWidth = 2; x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill(); x.stroke(); break;
      case 'fireball': { const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.6); g.addColorStop(0, '#fff3e0'); g.addColorStop(0.4, '#ff9800'); g.addColorStop(1, 'rgba(255,61,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r * 1.6, 0, TAU); x.fill(); break; }
      case 'orb': x.fillStyle = '#d1c4e9'; x.shadowColor = '#b388ff'; x.shadowBlur = 10; x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill(); x.shadowBlur = 0; break;
      case 'goo': x.fillStyle = '#ffb300'; x.beginPath(); x.ellipse(p.x, p.y, p.r, p.r * 0.75, Math.atan2(p.vy, p.vx), 0, TAU); x.fill(); break;
      case 'wave': { const a = Math.atan2(p.vy, p.vx); x.strokeStyle = 'rgba(129,212,250,.9)'; x.lineWidth = 5; x.beginPath(); x.arc(p.x - Math.cos(a) * p.r, p.y - Math.sin(a) * p.r, p.r, a - 1, a + 1); x.stroke(); break; }
      case 'slug': { const a = Math.atan2(p.vy, p.vx); x.strokeStyle = '#e0f7fa'; x.lineWidth = 3; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - Math.cos(a) * 30, p.y - Math.sin(a) * 30); x.stroke(); break; }
      case 'shard': x.fillStyle = p.color; x.fillRect(p.x - 2, p.y - 2, 4, 4); break;
      default: x.fillStyle = shade(p.color, -0.2); x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.arc(p.x - 1, p.y - 1, p.r * 0.4, 0, TAU); x.fill();
    }
  }

  drawGhost(gh) {
    const x = this.ctx; x.globalAlpha = 0.75;
    x.fillStyle = gh.ok ? 'rgba(255,255,255,.3)' : 'rgba(255,60,60,.4)'; x.beginPath(); x.arc(gh.x, gh.y, TOWER_R, 0, TAU); x.fill();
    const spr = emojiSprite(gh.emoji, 26); x.drawImage(spr, gh.x - spr.width / 2, gh.y - spr.height / 2); x.globalAlpha = 1;
  }

  drawWeather(dt) {
    const x = this.ctx, w = this.game.weather;
    if (w === 'rain' || w === 'storm') {
      x.strokeStyle = 'rgba(70,100,170,.5)'; x.lineWidth = 1.4; x.beginPath();
      for (const p of this.weatherParts) { p.y += (700 + p.s * 400) * dt; p.x -= 120 * dt; if (p.y > H) { p.y = -10; p.x = Math.random() * (W + 200); } x.moveTo(p.x, p.y); x.lineTo(p.x - 4, p.y + 14); }
      x.stroke(); if (w === 'storm') { x.fillStyle = 'rgba(20,20,50,.18)'; x.fillRect(0, 0, W, H); }
    } else if (w === 'snow') {
      x.fillStyle = 'rgba(255,255,255,.85)';
      for (const p of this.weatherParts) { p.y += (40 + p.s * 50) * dt; p.x += Math.sin(this.t + p.s * 10) * 20 * dt; if (p.y > H) { p.y = -5; p.x = Math.random() * W; } x.beginPath(); x.arc(p.x, p.y, 1.5 + p.s * 2, 0, TAU); x.fill(); }
    } else if (w === 'fog') {
      const g = x.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 800); g.addColorStop(0, 'rgba(230,230,240,0.05)'); g.addColorStop(1, 'rgba(230,230,240,0.55)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    } else if (w === 'heat') {
      x.fillStyle = `rgba(255,150,50,${0.06 + Math.sin(this.t * 2) * 0.02})`; x.fillRect(0, 0, W, H);
    }
  }
}
