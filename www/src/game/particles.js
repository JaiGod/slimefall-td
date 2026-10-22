/**
 * particles.js — pooled particle system (no per-frame allocations once warm).
 * Quality setting scales spawn counts so low-end phones stay at 60fps.
 */
import { TAU } from '../util.js';

export class Particles {
  constructor(max = 2500) {
    this.pool = []; this.live = []; this.max = max; this.quality = 1;
  }
  setQuality(q) { this.quality = q === 'low' ? 0.3 : q === 'med' ? 0.6 : 1; }

  spawn(x, y, o = {}) {
    if (this.live.length >= this.max) return;
    const p = this.pool.pop() || {};
    const a = o.a ?? Math.random() * TAU, sp = (o.speed ?? 120) * (0.4 + Math.random() * 0.8);
    p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
    p.life = p.max = (o.life ?? 0.5) * (0.6 + Math.random() * 0.6);
    p.size = (o.size ?? 4) * (0.6 + Math.random() * 0.8); p.color = o.color || '#fff';
    p.grav = o.grav ?? 0; p.drag = o.drag ?? 2.5; p.shape = o.shape || 'circle'; p.text = o.text; p.spin = (Math.random() - 0.5) * 8; p.rot = 0;
    this.live.push(p);
  }

  burst(x, y, n, o) { n = Math.ceil(n * this.quality); for (let i = 0; i < n; i++) this.spawn(x, y, o); }

  /** Floating combat text (cash, IMMUNE, crits). */
  text(x, y, text, color = '#fff', size = 14) { this.spawn(x, y, { a: -Math.PI / 2, speed: 40, life: 0.9, size, color, shape: 'text', text, drag: 1.5 }); }

  update(dt) {
    const L = this.live;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]; p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); this.pool.push(p); continue; }
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
    }
  }

  draw(ctx) {
    for (const p of this.live) {
      const t = p.life / p.max; ctx.globalAlpha = Math.min(1, t * 1.5);
      if (p.shape === 'text') {
        ctx.font = `bold ${p.size}px system-ui, sans-serif`; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
      } else if (p.shape === 'spark') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
      } else if (p.shape === 'square') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; const s = p.size * t; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
      } else {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.4 + t * 0.6)), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
