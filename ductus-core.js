/* =====================================================================
 * DuctusLab Core — ortak klinik durum otoritesi, kanıt sözleşmesi ve
 * sekmeler arası canlı hasta paylaşımı. Sıfır dış bağımlılık.
 * Hem <script> (window.DuctusCore) hem ES import ile kullanılabilir.
 * Mevcut standalone modülleri ETKİLEMEZ — sadece onu YÜKLEYEN sayfalar katılır.
 * ===================================================================== */
(function (root) {
  'use strict';

  // ---- FPS / sekme-gizlenmesi bağımsız monoton simülasyon saati ----
  // performance.now() arka planda kısılabilir; Date.now() kısılmaz.
  function nowMs() { return Date.now(); }

  var AREAS = ['coronary', 'rhythm', 'hemodynamic', 'respiratory', 'neuro'];

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + nowMs().toString(36).slice(-4); }

  // ---- varsayılan hasta (seed ile override) ----
  function defaultState(seed) {
    seed = seed || {};
    var epoch = nowMs();
    var s = {
      v: 1,
      patientId: seed.patientId || uid('pt'),
      epochMs: epoch,                 // simTimeMs = nowMs()-epochMs  (gerçek zaman akışı)
      simRate: seed.simRate || 1,
      demographics: Object.assign({ name: 'Anonim Hasta', age: 58, sex: 'E' }, seed.demographics || {}),
      vitals: Object.assign({ hr: 78, sbp: 124, dbp: 76, map: 92, spo2: 97, rr: 16 }, seed.vitals || {}),
      revisions: { coronary: 0, rhythm: 0, hemodynamic: 0, respiratory: 0, neuro: 0 },
      pathology: Object.assign({}, seed.pathology || {}),   // ör. {culprit:'RCA', wall:'inferior', timi:0, stPattern:'inferior', effusion:false}
      treatments: [],                                        // {name, atSimMs, area}
      echoContext: { clipEra: 'historical', lastInterventionSimMs: null },  // historical | current
      updatedAt: epoch
    };
    if (seed.revisions) Object.assign(s.revisions, seed.revisions);
    return s;
  }

  // ---- kanıt staleness: bağımlı olunan alan revizyonu arttıysa kanıt "tarihsel" ----
  function stalenessOf(ev, state) {
    var stale = false, areas = [];
    var dep = ev.dependsOn || {};
    for (var k in dep) {
      var cur = state.revisions[k];
      if (typeof cur === 'number' && cur > dep[k]) { stale = true; areas.push(k); }
    }
    return { stale: stale, staleAreas: areas };
  }

  // ---- komut sözleşmesi: hastayı değiştiren komut ilgili revizyonu artırır ----
  // acquisition komutları (AcquireECG/AcquireEcho) revizyonu ARTIRMAZ; kanıt üretir.
  var COMMANDS = {
    AdministerDrug: function (st, p) {
      st.treatments.push({ name: p.name, atSimMs: simNow(st), area: p.area || 'rhythm' });
      if (p.vitals) Object.assign(st.vitals, p.vitals);
      if (p.bump) bump(st, p.bump);
    },
    DeployStent: function (st, p) {
      // koroner akım değişir → coronary + rhythm (reperfüzyon ritmi) revizyonu artar
      bump(st, ['coronary', 'rhythm']);
      st.pathology.timi = (p && p.timi != null) ? p.timi : 3;
      if (p && p.noReflow != null) st.pathology.noReflow = p.noReflow;
      st.pathology.stented = true;
      st.echoContext.clipEra = 'current';
      st.echoContext.lastInterventionSimMs = simNow(st);
    },
    SetPathology: function (st, p) { Object.assign(st.pathology, p || {}); if (p && p.bump) bump(st, p.bump); },
    SetVitals: function (st, p) { Object.assign(st.vitals, p || {}); bump(st, ['hemodynamic']); },
    MarkIntervention: function (st, p) { bump(st, (p && p.areas) || ['coronary']); st.echoContext.clipEra = 'current'; st.echoContext.lastInterventionSimMs = simNow(st); }
  };

  function bump(st, areas) { (areas || []).forEach(function (a) { if (st.revisions[a] != null) st.revisions[a]++; }); }
  function simNow(st) { return Math.round((nowMs() - st.epochMs) * (st.simRate || 1)); }

  // =====================================================================
  //  Session — tek sayfanın ortak duruma erişimi + sekmeler arası köprü
  // =====================================================================
  function Session(opts) {
    opts = opts || {};
    this.key = 'ductus:patient:' + (opts.patientId || 'default');
    this.listeners = { state: [], evidence: [], lifecycle: [] };
    this.bc = null;
    this._evidence = [];
    // bootstrap: sessionStorage'dan oku, yoksa seed ile oluştur
    var existing = this._load();
    if (existing && !opts.forceSeed) { this.state = existing.state; this._evidence = existing.evidence || []; }
    else { this.state = defaultState(Object.assign({}, opts.seed, { patientId: opts.patientId })); this._persist(); }
    // BroadcastChannel köprüsü (destekleniyorsa)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.bc = new BroadcastChannel(this.key);
        var self = this;
        this.bc.onmessage = function (e) { self._onBus(e.data); };
      }
    } catch (e) { /* yoksay */ }
    // storage olayı (BroadcastChannel yoksa sekmeler arası yedek)
    var self2 = this;
    this._onStorage = function (e) { if (e.key === self2.key && e.newValue) { try { var d = JSON.parse(e.newValue); self2._applyRemote(d); } catch (x) { } } };
    if (typeof window !== 'undefined') window.addEventListener('storage', this._onStorage);
  }

  Session.prototype.simNow = function () { return simNow(this.state); };
  Session.prototype.getState = function () { return this.state; };
  Session.prototype.getVitals = function () { return this.state.vitals; };
  Session.prototype.getRevisions = function () { return this.state.revisions; };

  Session.prototype.update = function (patch) {
    // vitaller/patoloji vb. doğrudan yama (revizyon değiştirmez)
    if (patch.vitals) Object.assign(this.state.vitals, patch.vitals);
    if (patch.pathology) Object.assign(this.state.pathology, patch.pathology);
    if (patch.demographics) Object.assign(this.state.demographics, patch.demographics);
    if (patch.echoContext) Object.assign(this.state.echoContext, patch.echoContext);
    if (patch.revisions) Object.assign(this.state.revisions, patch.revisions);
    this._touch('state');
  };

  Session.prototype.dispatch = function (cmd) {
    var fn = COMMANDS[cmd && cmd.type];
    if (!fn) { console.warn('[DuctusCore] bilinmeyen komut', cmd && cmd.type); return; }
    fn(this.state, cmd.payload || {});
    this._touch('state', { command: cmd.type });
    return this.state;
  };

  // ---- kanıt ----
  Session.prototype.addEvidence = function (ev) {
    var rec = {
      id: ev.id || uid('ev'),
      patientId: this.state.patientId,
      modality: ev.modality,
      acquiredAtSimMs: ev.acquiredAtSimMs != null ? ev.acquiredAtSimMs : this.simNow(),
      quality: Object.assign({ assessable: true, reasonCodes: [], regionsSeen: [] }, ev.quality || {}),
      dependsOn: Object.assign({}, snapshotRevisions(this.state), ev.dependsOn || {}),
      summary: ev.summary || ''
    };
    this._evidence.push(rec);
    this._persist();
    this._emit('evidence', rec);
    if (this.bc) this._post({ t: 'evidence', rec: rec });
    return rec;
  };
  Session.prototype.getEvidence = function () { return this._evidence.slice(); };
  Session.prototype.isStale = function (ev) { return stalenessOf(ev, this.state); };

  // ---- olay dinleyiciler ----
  Session.prototype.on = function (type, cb) { (this.listeners[type] || (this.listeners[type] = [])).push(cb); return this; };
  Session.prototype._emit = function (type, data) { (this.listeners[type] || []).forEach(function (cb) { try { cb(data); } catch (e) { } }); };

  // ---- yaşam döngüsü (suite:pause / suite:resume) ----
  Session.prototype.pause = function () { this._emit('lifecycle', { action: 'pause' }); };
  Session.prototype.resume = function () { this._emit('lifecycle', { action: 'resume' }); };

  // ---- iç: değişiklik yay ----
  Session.prototype._touch = function (type, meta) {
    this.state.updatedAt = nowMs();
    this._persist();
    this._emit('state', { state: this.state, meta: meta });
    if (this.bc) this._post({ t: 'state', state: this.state });
  };
  Session.prototype._persist = function () {
    try { sessionStorage.setItem(this.key, JSON.stringify({ state: this.state, evidence: this._evidence })); } catch (e) { }
    try { localStorage.setItem(this.key, JSON.stringify({ state: this.state, evidence: this._evidence })); } catch (e) { } // sekmeler arası storage olayı için
  };
  Session.prototype._load = function () {
    try { var a = sessionStorage.getItem(this.key); if (a) return JSON.parse(a); } catch (e) { }
    try { var b = localStorage.getItem(this.key); if (b) return JSON.parse(b); } catch (e) { }
    return null;
  };
  Session.prototype._post = function (msg) { try { this.bc.postMessage(msg); } catch (e) { } };
  Session.prototype._onBus = function (d) {
    if (!d) return;
    if (d.t === 'state') { this.state = d.state; this._emit('state', { state: this.state, remote: true }); }
    else if (d.t === 'evidence') { if (!this._evidence.some(function (e) { return e.id === d.rec.id; })) { this._evidence.push(d.rec); this._emit('evidence', d.rec); } }
    else if (d.t === 'lifecycle') { this._emit('lifecycle', d.payload || {}); }
  };
  Session.prototype._applyRemote = function (d) {
    if (d && d.state) { this.state = d.state; this._evidence = d.evidence || this._evidence; this._emit('state', { state: this.state, remote: true }); }
  };
  Session.prototype.broadcastLifecycle = function (action) { if (this.bc) this._post({ t: 'lifecycle', payload: { action: action } }); this._emit('lifecycle', { action: action }); };
  Session.prototype.destroy = function () { try { this.bc && this.bc.close(); } catch (e) { } if (typeof window !== 'undefined') window.removeEventListener('storage', this._onStorage); };

  function snapshotRevisions(st) { var r = {}; AREAS.forEach(function (a) { r[a] = st.revisions[a]; }); return r; }

  // =====================================================================
  //  Suite yaşam döngüsü yardımcıları (ductuslab-suite.html kullanır)
  // =====================================================================
  function postLifecycleToFrame(frame, action) {
    try { frame && frame.contentWindow && frame.contentWindow.postMessage({ ductus: true, type: 'suite:' + action }, '*'); } catch (e) { }
  }
  // Modüller bu dinleyiciyi (opsiyonel) adopte edebilir — standalone'u etkilemez.
  function connectLifecycle(handlers) {
    handlers = handlers || {};
    if (typeof window === 'undefined') return;
    window.addEventListener('message', function (e) {
      var d = e.data; if (!d || !d.ductus) return;
      if (d.type === 'suite:pause' && handlers.onPause) handlers.onPause();
      else if (d.type === 'suite:resume' && handlers.onResume) handlers.onResume();
    });
  }

  var DuctusCore = {
    VERSION: 1,
    AREAS: AREAS,
    nowMs: nowMs,
    open: function (opts) { return new Session(opts); },
    stalenessOf: stalenessOf,
    postLifecycleToFrame: postLifecycleToFrame,
    connectLifecycle: connectLifecycle,
    uid: uid
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DuctusCore;
  root.DuctusCore = DuctusCore;
})(typeof window !== 'undefined' ? window : this);
