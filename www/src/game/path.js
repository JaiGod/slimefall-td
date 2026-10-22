/**
 * path.js — polyline path with O(log n) distance→position lookup.
 * Enemies store only `d` (distance travelled); position is derived, which makes
 * knockback, "first/last" targeting and save/load trivial and cheap.
 */
export class Path {
  constructor(points) {
    this.pts = points;
    this.segs = [];
    let cum = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, ay] = points[i], [bx, by] = points[i + 1];
      const len = Math.hypot(bx - ax, by - ay) || 0.0001;
      this.segs.push({ ax, ay, bx, by, len, cum, ux: (bx - ax) / len, uy: (by - ay) / len });
      cum += len;
    }
    this.length = cum;
    // dense samples used for placement checks and trap spawning
    this.samples = [];
    for (let d = 0; d <= cum; d += 8) { const p = this.posAt(d); this.samples.push({ x: p.x, y: p.y, d }); }
  }

  segAt(d) {
    const s = this.segs; let lo = 0, hi = s.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (s[mid].cum <= d) lo = mid; else hi = mid - 1; }
    return s[lo];
  }

  /** Writes position into `out` (avoids allocations in the hot loop). */
  posAt(d, out = { x: 0, y: 0, a: 0 }) {
    if (d <= 0) { const s = this.segs[0]; out.x = s.ax + s.ux * d; out.y = s.ay + s.uy * d; out.a = Math.atan2(s.uy, s.ux); return out; }
    const s = this.segAt(Math.min(d, this.length));
    const t = Math.min(d, this.length) - s.cum;
    out.x = s.ax + s.ux * t; out.y = s.ay + s.uy * t; out.a = Math.atan2(s.uy, s.ux);
    return out;
  }

  /** Squared distance from (x,y) to the nearest point on the path. */
  distTo2(x, y) {
    let best = Infinity;
    for (const s of this.segs) {
      const t = Math.max(0, Math.min(s.len, (x - s.ax) * s.ux + (y - s.ay) * s.uy));
      const px = s.ax + s.ux * t, py = s.ay + s.uy * t, dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return best;
  }
}
