/* =====================================================================
 * DuctusLab · optic-viewport.js — ortak OPTİK VİZÖR motoru
 * Otoskop / oftalmoskop gibi dairesel-diyaframlı aletler için yeniden
 * kullanılabilir katman. Hiçbir dış bağımlılık; render-agnostik:
 * gözlenen sahneyi (timpanik zar / retina) HOST çizer, bu modül yalnız
 *  - dairesel optik diyafram + vinyet + retikül,
 *  - odak / defokus bulanıklığı modeli,
 *  - el mikro-tremoru,
 *  - odak-kalitesi duyarlı CoverageTracker (bölge tarama haritası),
 *  - speküler aydınlatma yardımcıları
 * sağlar. FND (fundoskopi) ve OTO (otoskopi) aynı motoru paylaşır.
 * ===================================================================== */
(function (root) {
  'use strict';
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  // ---- el mikro-tremoru: birkaç sinüsün toplamı + yavaş sürüklenme ----
  function Tremor(amp) {
    this.amp = amp == null ? 1 : amp; this.t = 0;
    this.phx = Math.random() * 6.28; this.phy = Math.random() * 6.28; this.pht = Math.random() * 6.28;
    this.dx = 0; this.dy = 0; this.dth = 0;
  }
  Tremor.prototype.step = function (dt) {
    this.t += dt; var s = this.t / 1000, a = this.amp;
    // fizyolojik tremor ~8-12 Hz düşük genlik + yavaş sürüklenme ~0.4 Hz
    this.dx = a * (0.0065 * Math.sin(s * 10.2 + this.phx) + 0.011 * Math.sin(s * 2.3 + this.phy) + 0.014 * Math.sin(s * 0.5));
    this.dy = a * (0.0065 * Math.sin(s * 9.3 + this.phy) + 0.011 * Math.sin(s * 2.7 + this.phx) + 0.014 * Math.cos(s * 0.42));
    this.dth = a * (0.010 * Math.sin(s * 1.7 + this.pht));
    return this;
  };

  // ---- CoverageTracker: odak-kalitesi duyarlı bölge tarama ----
  function Coverage(regions) { this.set(regions || []); }
  Coverage.prototype.set = function (regions) {
    this.regions = regions.map(function (r) { return { id: r.id, x: r.x, y: r.y, r: r.r || 0.22, need: r.need || 650, acc: 0 }; });
    this.byId = {}; var self = this; this.regions.forEach(function (r) { self.byId[r.id] = r; });
  };
  // look: {x,y} normalize alan koordinatı (-1..1); q: odak kalitesi 0..1; gate: ek koşul (seal vb.)
  Coverage.prototype.frame = function (dt, look, q, gate) {
    if (gate === false || q < 0.45) return;
    for (var i = 0; i < this.regions.length; i++) {
      var rg = this.regions[i], dx = look.x - rg.x, dy = look.y - rg.y;
      if (dx * dx + dy * dy <= rg.r * rg.r) { rg.acc = clamp(rg.acc + dt * q, 0, rg.need); }
    }
  };
  Coverage.prototype.map = function () { var m = {}; this.regions.forEach(function (r) { m[r.id] = r.acc / r.need; }); return m; };
  Coverage.prototype.seen = function (id, thr) { var r = this.byId[id]; return !!r && (r.acc / r.need) >= (thr == null ? 0.6 : thr); };
  Coverage.prototype.overall = function () { if (!this.regions.length) return 0; var s = 0; this.regions.forEach(function (r) { s += clamp(r.acc / r.need, 0, 1); }); return s / this.regions.length; };
  Coverage.prototype.reset = function () { this.regions.forEach(function (r) { r.acc = 0; }); };

  // ---- speküler aydınlatma yardımcısı: (max(dot(n,h),0))^p ----
  function specular(nx, ny, nz, hx, hy, hz, power) {
    var nl = Math.hypot(nx, ny, nz) || 1, hl = Math.hypot(hx, hy, hz) || 1;
    var d = (nx * hx + ny * hy + nz * hz) / (nl * hl);
    if (d < 0) d = 0;
    return Math.pow(d, power || 32);
  }

  // =====================================================================
  //  Instance
  // =====================================================================
  function OpticViewport(opts) {
    opts = opts || {};
    this.fieldRadius = opts.fieldRadius == null ? 0.9 : opts.fieldRadius;  // diyafram yarıçapı (kısa kenar oranı)
    this.reticle = !!opts.reticle;
    this.tremor = new Tremor(opts.tremorAmp == null ? 1 : opts.tremorAmp);
    this.coverage = new Coverage(opts.regions || []);
    this.vignetteColor = opts.vignetteColor || 'rgba(2,3,6,1)';
    this.focus = 1; this.focusTarget = 1;
  }
  OpticViewport.prototype.setTremorAmp = function (a) { this.tremor.amp = a; return this; };
  OpticViewport.prototype.setRegions = function (r) { this.coverage.set(r); return this; };
  // host her karede çağırır
  OpticViewport.prototype.frame = function (dt, state) {
    state = state || {};
    this.tremor.step(dt);
    var look = state.look || { x: 0, y: 0 };
    this.coverage.frame(dt, look, state.focusQuality == null ? 1 : state.focusQuality, state.gate);
    // odak yumuşak takip
    if (state.focusTarget != null) this.focusTarget = state.focusTarget;
    this.focus += (this.focusTarget - this.focus) * (1 - Math.exp(-dt / 160));
    return this;
  };
  OpticViewport.prototype.tremorOffset = function () { return { dx: this.tremor.dx, dy: this.tremor.dy, dth: this.tremor.dth }; };
  // defokus bulanıklığı (px) — odak kalitesi 1=keskin, 0=tam bulanık
  OpticViewport.prototype.focusBlurPx = function (q, maxBlur) { return (1 - clamp(q == null ? this.focus : q, 0, 1)) * (maxBlur == null ? 9 : maxBlur); };
  // dairesel diyafram + vinyet maskesi (host sahnesi üstüne)
  OpticViewport.prototype.drawDiaphragm = function (ctx, w, h, cx, cy) {
    var R = Math.min(w, h) * 0.5 * this.fieldRadius;
    cx = cx == null ? w / 2 : cx; cy = cy == null ? h / 2 : cy;
    ctx.save();
    // tüm alanı karart, sonra yumuşak kenarlı dairesel deliği DESTINATION-OUT ile aç
    ctx.fillStyle = this.vignetteColor; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    var hole = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(0.82, 'rgba(0,0,0,1)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hole; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // optik halka parlaması
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(180,200,220,.12)'; ctx.stroke();
    if (this.reticle) {
      ctx.strokeStyle = 'rgba(180,200,220,.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - R * 0.08, cy); ctx.lineTo(cx + R * 0.08, cy); ctx.moveTo(cx, cy - R * 0.08); ctx.lineTo(cx, cy + R * 0.08); ctx.stroke();
    }
    ctx.restore();
    return R;
  };
  OpticViewport.prototype.fieldPx = function (w, h) { return Math.min(w, h) * 0.5 * this.fieldRadius; };
  OpticViewport.prototype.specular = specular;

  var OpticViewportAPI = {
    VERSION: '1.0',
    create: function (opts) { return new OpticViewport(opts); },
    Tremor: Tremor, Coverage: Coverage, specular: specular, clamp: clamp
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = OpticViewportAPI;
  root.OpticViewport = OpticViewportAPI;
})(typeof window !== 'undefined' ? window : this);
