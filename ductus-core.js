/* =====================================================================
 * DuctusLab Core v1.1 — ortak klinik durum otoritesi, kanıt sözleşmesi ve
 * sekmeler arası canlı hasta paylaşımı. Sıfır dış bağımlılık.
 * Hem <script> (window.DuctusCore) hem ES/CJS import ile kullanılabilir.
 * Mevcut standalone modülleri ETKİLEMEZ — sadece onu YÜKLEYEN sayfalar katılır.
 *
 * v1.1 SERTLEŞTİRME — 4 mimari kilit:
 *  1) Tek yazar & idempotent komut zarfı (runId / authorityEpoch / commandId)
 *  2) truth vs projection fiziksel ayrımı — truth ASLA sekmeler arası sızmaz
 *  3) case:pause klinik saati durdurur & resume duvar-saati farkını YUTAR;
 *     module:deactivate klinik saati durdurmaz (yalnız render/audio uyur)
 *  4) ModalityCanAnswerClaim kanıt kapısı (revizyon + modalite-iddia uyumu)
 * ===================================================================== */
(function (root) {
  'use strict';

  // ---- FPS / sekme-gizlenmesi bağımsız monoton duvar saati ----
  function nowMs() { return Date.now(); }

  var AREAS = ['coronary', 'rhythm', 'hemodynamic', 'respiratory', 'neuro'];
  var SCHEMA_VERSION = 1;

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + nowMs().toString(36).slice(-4); }

  // =====================================================================
  //  KİLİT 4 — Modalite → yanıtlayabildiği iddialar (kanıt kapısı)
  //  Bir modalite ancak bu listedeki iddiaları "doğrulayabilir". Örn. post-PCI
  //  EKG 'st_resolution'ı doğrular ama tek başına 'timi3_flow'u doğrulayamaz.
  // =====================================================================
  var MODALITY_CLAIMS = {
    // --- kardiyoloji / zincir ---
    'ECG12':         ['st_elevation', 'st_depression', 'rhythm', 'conduction_block', 'ischemia_territory'],
    'post-pci-ecg':  ['st_resolution', 'rhythm', 'reperfusion_arrhythmia'],
    'echo':          ['wall_motion', 'effusion', 'rv_function', 'tamponade_physiology', 'ef'],
    'pocus':         ['effusion', 'rv_dilation', 'ivc', 'b_lines', 'tamponade_physiology'],
    'angiography':   ['culprit_vessel', 'timi0_occlusion', 'timi3_flow', 'stenosis', 'no_reflow', 'stent_result'],
    // --- KS nöro-oftalmoloji muayene modaliteleri ---
    'swinging_flashlight': ['rapd', 'afferent_defect'],
    'room_light':          ['anisocoria_light_vs_dark', 'dilation_lag', 'sympathetic_defect'],
    'near_target':         ['light_near_dissociation', 'accommodation', 'convergence', 'tonic_pupil'],
    'penlight':            ['direct_light_response', 'consensual_response', 'pupil_size'],
    'gaze_h':              ['gaze_palsy', 'ino', 'cn6_abduction', 'cn3_motor', 'nystagmus', 'upgaze_palsy'],
    'head_tilt':           ['cn4_vertical', 'bielschowsky'],
    'cover_uncover':       ['tropia', 'phoria', 'diplopia_direction'],
    'confrontation':       ['visual_field', 'hemianopia', 'quadrantanopia'],
    'lift_eyelid':         ['ptosis_underlying_pupil', 'eye_position_under_lid']
  };

  function canAnswerClaim(modality, claim) {
    var list = MODALITY_CLAIMS[modality];
    return !!list && list.indexOf(claim) >= 0;
  }

  // =====================================================================
  //  Varsayılan hasta (seed ile override)
  //  Not: seed.truth → gizli tanı/suçlu/lezyon (ASLA yayınlanmaz).
  //       seed.projection/pathology → gözlenebilir çizim parametreleri.
  // =====================================================================
  function defaultState(seed) {
    seed = seed || {};
    var epoch = nowMs();
    var s = {
      v: 1,
      patientId: seed.patientId || uid('pt'),
      // KİLİT 3 — klinik saat: ham Date.now() farkıyla zıplamaz, pause gapini yutar
      clock: { epochMs: epoch, accMs: 0, running: true, rate: seed.simRate || 1 },
      // geriye dönük okunabilirlik (legacy):
      epochMs: epoch,
      simRate: seed.simRate || 1,
      demographics: Object.assign({ name: 'Anonim Hasta', age: 58, sex: 'E' }, seed.demographics || {}),
      vitals: Object.assign({ hr: 78, sbp: 124, dbp: 76, map: 92, spo2: 97, rr: 16 }, seed.vitals || {}),
      revisions: { coronary: 0, rhythm: 0, hemodynamic: 0, respiratory: 0, neuro: 0 },
      // gözlenebilir patoloji/çizim parametreleri (yayınlanır)
      pathology: Object.assign({}, seed.pathology || {}),
      projection: Object.assign({}, seed.projection || {}),
      // KİLİT 2 — GİZLİ gerçek: suçlu damar, lezyon lokalizasyonu, gizli tanı
      truth: Object.assign({}, seed.truth || {}),
      treatments: [],
      echoContext: { clipEra: 'historical', lastInterventionSimMs: null },
      updatedAt: epoch
    };
    if (seed.revisions) Object.assign(s.revisions, seed.revisions);
    return s;
  }

  // =====================================================================
  //  KİLİT 2 — yayın anlık görüntüsü: truth ALANI KESİLİR
  //  Her sekmeler-arası çıkış (BroadcastChannel + localStorage) bundan geçer.
  // =====================================================================
  function publicSnapshot(st) {
    var c = deepClone(st);
    delete c.truth;              // gizli gerçek asla dışarı çıkmaz
    c._sealed = true;
    return c;
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

  // =====================================================================
  //  KİLİT 3 — saat yardımcıları
  // =====================================================================
  function simNow(st) {
    var c = st.clock;
    if (!c) { return Math.round((nowMs() - st.epochMs) * (st.simRate || 1)); } // legacy
    var base = c.accMs;
    if (c.running) base += (nowMs() - c.epochMs) * (c.rate || 1);
    return Math.round(base);
  }
  function clockPause(st) { var c = st.clock; if (!c || !c.running) return; c.accMs += (nowMs() - c.epochMs) * (c.rate || 1); c.running = false; }
  function clockResume(st) { var c = st.clock; if (!c || c.running) return; c.epochMs = nowMs(); c.running = true; }

  // =====================================================================
  //  Komut sözleşmesi — hastayı değiştiren komut ilgili revizyonu artırır.
  //  acquisition komutları revizyonu ARTIRMAZ; kanıt üretir.
  // =====================================================================
  var COMMANDS = {
    AdministerDrug: function (st, p) {
      st.treatments.push({ name: p.name, atSimMs: simNow(st), area: p.area || 'rhythm' });
      if (p.vitals) Object.assign(st.vitals, p.vitals);
      if (p.bump) bump(st, p.bump);
    },
    DeployStent: function (st, p) {
      bump(st, ['coronary', 'rhythm']);
      st.pathology.timi = (p && p.timi != null) ? p.timi : 3;
      if (p && p.noReflow != null) st.pathology.noReflow = p.noReflow;
      st.pathology.stented = true;
      st.echoContext.clipEra = 'current';
      st.echoContext.lastInterventionSimMs = simNow(st);
    },
    SetPathology: function (st, p) { Object.assign(st.pathology, p || {}); if (p && p.bump) bump(st, p.bump); },
    SetVitals: function (st, p) { Object.assign(st.vitals, p || {}); bump(st, ['hemodynamic']); },
    MarkIntervention: function (st, p) { bump(st, (p && p.areas) || ['coronary']); st.echoContext.clipEra = 'current'; st.echoContext.lastInterventionSimMs = simNow(st); },
    // --- KS zinciri: nörolojik müdahale işareti (ör. anevrizma klipajı sonrası) ---
    MarkNeuroIntervention: function (st, p) { bump(st, ['neuro']); if (p && p.pathology) Object.assign(st.pathology, p.pathology); }
  };

  function bump(st, areas) { (areas || []).forEach(function (a) { if (st.revisions[a] != null) st.revisions[a]++; }); }

  // =====================================================================
  //  Session — tek sayfanın ortak duruma erişimi + sekmeler arası köprü
  // =====================================================================
  function Session(opts) {
    opts = opts || {};
    this.key = 'ductus:patient:' + (opts.patientId || 'default');
    this.listeners = { state: [], evidence: [], lifecycle: [] };
    this.bc = null;
    this._evidence = [];

    // KİLİT 1 — zarf / otorite durumu
    this.runId = uid('run');
    this.authorityEpoch = nowMs();
    this.seq = 0;
    this._applied = {};           // commandId → 1 (idempotency)
    this._authMax = this.authorityEpoch;

    // bootstrap
    var existing = this._load();
    if (existing && existing.state && !opts.forceSeed) {
      this.state = existing.state;
      this._evidence = existing.evidence || [];
      if (!this.state.truth) this.state.truth = (opts.seed && opts.seed.truth) ? deepClone(opts.seed.truth) : {};
      if (!this.state.clock) this.state.clock = { epochMs: nowMs(), accMs: simNow(this.state), running: true, rate: this.state.simRate || 1 };
    } else {
      this.state = defaultState(Object.assign({}, opts.seed, { patientId: opts.patientId }));
      this._persist();
    }

    // BroadcastChannel köprüsü
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.bc = new BroadcastChannel(this.key);
        var self = this;
        this.bc.onmessage = function (e) { self._onBus(e.data); };
      }
    } catch (e) { /* yoksay */ }

    // storage olayı (BroadcastChannel yoksa yedek) — truth zaten localStorage'da kesili
    var self2 = this;
    this._onStorage = function (e) { if (e.key === self2.key && e.newValue) { try { var d = JSON.parse(e.newValue); self2._applyRemote(d); } catch (x) { } } };
    if (typeof window !== 'undefined') window.addEventListener('storage', this._onStorage);
  }

  Session.prototype.simNow = function () { return simNow(this.state); };
  Session.prototype.getState = function () { return this.state; };
  Session.prototype.getVitals = function () { return this.state.vitals; };
  Session.prototype.getRevisions = function () { return this.state.revisions; };
  Session.prototype.getTruth = function () { return this.state.truth || {}; };                 // yalnız yerel sahip erişir
  Session.prototype.getPublicSnapshot = function () { return publicSnapshot(this.state); };     // truth kesili

  Session.prototype.update = function (patch) {
    if (patch.vitals) Object.assign(this.state.vitals, patch.vitals);
    if (patch.pathology) Object.assign(this.state.pathology, patch.pathology);
    if (patch.projection) Object.assign(this.state.projection, patch.projection);
    if (patch.truth) Object.assign(this.state.truth, patch.truth);        // gizli — yayınlanmaz
    if (patch.demographics) Object.assign(this.state.demographics, patch.demographics);
    if (patch.echoContext) Object.assign(this.state.echoContext, patch.echoContext);
    if (patch.revisions) Object.assign(this.state.revisions, patch.revisions);
    this._touch('state');
  };

  // ---- KİLİT 1 — zarf tabanlı, idempotent komut uygulaması ----
  Session.prototype._bumpAuthority = function () {
    this.authorityEpoch = Math.max(this.authorityEpoch, this._authMax) + 1;
    this._authMax = this.authorityEpoch;
    return this.authorityEpoch;
  };

  Session.prototype.dispatch = function (cmd) {
    if (!cmd || !cmd.type) { console.warn('[DuctusCore] boş komut'); return this.state; }
    var env = {
      schemaVersion: SCHEMA_VERSION,
      runId: this.runId,
      authorityEpoch: this._bumpAuthority(),
      seq: ++this.seq,
      commandId: cmd.commandId || uid('cmd'),
      expectedRevisions: cmd.expectedRevisions || null,
      type: cmd.type,
      payload: cmd.payload || {}
    };
    return this._applyEnvelope(env, { local: true });
  };

  Session.prototype._applyEnvelope = function (env, meta) {
    meta = meta || {};
    if (!env || env.schemaVersion !== SCHEMA_VERSION) { console.warn('[DuctusCore] zarf şema uyumsuz'); return this.state; }
    // idempotent: aynı commandId ikinci kez → yoksay
    if (this._applied[env.commandId]) { return this.state; }
    // stale run: daha yeni otorite varken eski runId mesajını reddet
    if (typeof env.authorityEpoch === 'number' && env.authorityEpoch < this._authMax) {
      console.warn('[DuctusCore] eski otorite reddedildi', env.runId, env.authorityEpoch, '<', this._authMax);
      return this.state;
    }
    // optimistic concurrency: expectedRevisions verildiyse uyuşmazsa reddet
    if (env.expectedRevisions) {
      for (var k in env.expectedRevisions) {
        if (this.state.revisions[k] !== env.expectedRevisions[k]) {
          console.warn('[DuctusCore] beklenen revizyon uyumsuz, komut reddedildi', k);
          return this.state;
        }
      }
    }
    var fn = COMMANDS[env.type];
    if (!fn) { console.warn('[DuctusCore] bilinmeyen komut', env.type); return this.state; }
    fn(this.state, env.payload);
    this._applied[env.commandId] = 1;
    this._authMax = Math.max(this._authMax, env.authorityEpoch);
    this._touch('state', { command: env.type, commandId: env.commandId }, meta.local ? env : null);
    return this.state;
  };

  // ---- KİLİT 4 — kanıt + iddia kapısı ----
  Session.prototype.addEvidence = function (ev) {
    var rec = {
      id: ev.id || uid('ev'),
      patientId: this.state.patientId,
      modality: ev.modality,
      claims: ev.claims || [],         // bu kaydın öne sürdüğü iddialar
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

  // Bir kanıt bir iddiayı doğrular MI? → (güncel) VE (modalite o iddiayı yanıtlayabilir)
  Session.prototype.supportsClaim = function (ev, claim) {
    if (!ev) return { ok: false, reason: 'no_evidence' };
    if (stalenessOf(ev, this.state).stale) return { ok: false, reason: 'stale' };
    if (!canAnswerClaim(ev.modality, claim)) return { ok: false, reason: 'modality_cannot_answer' };
    return { ok: true, reason: 'ok' };
  };
  // Depodaki güncel kanıtlar içinde bu iddiayı doğrulayan var mı?
  Session.prototype.hasSupportFor = function (claim) {
    for (var i = 0; i < this._evidence.length; i++) {
      if (this.supportsClaim(this._evidence[i], claim).ok) return this._evidence[i];
    }
    return null;
  };

  // ---- olay dinleyiciler ----
  Session.prototype.on = function (type, cb) { (this.listeners[type] || (this.listeners[type] = [])).push(cb); return this; };
  Session.prototype._emit = function (type, data) { (this.listeners[type] || []).forEach(function (cb) { try { cb(data); } catch (e) { } }); };

  // =====================================================================
  //  KİLİT 3 — klinik saat vs modül yaşam döngüsü AYRIMI
  // =====================================================================
  // case:pause → klinik saat durur; case:resume → duvar-saati farkı yutulur
  Session.prototype.pauseCase = function () { clockPause(this.state); this._touch('state', { lifecycle: 'case:pause' }); this._emit('lifecycle', { action: 'case:pause' }); if (this.bc) this._post({ t: 'lifecycle', payload: { action: 'case:pause' } }); };
  Session.prototype.resumeCase = function () { clockResume(this.state); this._touch('state', { lifecycle: 'case:resume' }); this._emit('lifecycle', { action: 'case:resume' }); if (this.bc) this._post({ t: 'lifecycle', payload: { action: 'case:resume' } }); };
  Session.prototype.isCaseRunning = function () { return !!(this.state.clock && this.state.clock.running); };
  // legacy adlar — artık klinik saati de etkiler (hiçbir modül eski no-op'a bağlı değil)
  Session.prototype.pause = function () { this.pauseCase(); };
  Session.prototype.resume = function () { this.resumeCase(); };

  // ---- iç: değişiklik yay ----
  Session.prototype._touch = function (type, meta, env) {
    this.state.updatedAt = nowMs();
    this._persist();
    this._emit('state', { state: this.state, meta: meta });
    // KİLİT 2 — sekmeler arası yalnız publicSnapshot (truth KESİLİ) + otorite başlığı
    if (this.bc) this._post({ t: 'state', state: publicSnapshot(this.state), ae: this.authorityEpoch, rid: this.runId });
  };
  Session.prototype._persist = function () {
    // same-tab: tam durum (truth dahil) — sekme dışına çıkmaz
    try { sessionStorage.setItem(this.key, JSON.stringify({ state: this.state, evidence: this._evidence })); } catch (e) { }
    // cross-tab yedek: truth KESİLİ
    try { localStorage.setItem(this.key, JSON.stringify({ state: publicSnapshot(this.state), evidence: this._evidence, ae: this.authorityEpoch })); } catch (e) { }
  };
  Session.prototype._load = function () {
    try { var a = sessionStorage.getItem(this.key); if (a) return JSON.parse(a); } catch (e) { }
    try { var b = localStorage.getItem(this.key); if (b) return JSON.parse(b); } catch (e) { }
    return null;
  };
  Session.prototype._post = function (msg) { try { this.bc.postMessage(msg); } catch (e) { } };
  Session.prototype._onBus = function (d) {
    if (!d) return;
    if (d.t === 'state') {
      // KİLİT 1 — stale otorite reddi
      if (typeof d.ae === 'number' && d.ae < this._authMax) { return; }
      if (typeof d.ae === 'number') this._authMax = Math.max(this._authMax, d.ae);
      this._adoptRemoteState(d.state);
    }
    else if (d.t === 'evidence') { if (!this._evidence.some(function (e) { return e.id === d.rec.id; })) { this._evidence.push(d.rec); this._emit('evidence', d.rec); } }
    else if (d.t === 'lifecycle') { this._emit('lifecycle', d.payload || {}); }
  };
  // Uzak durumu benimse — KİLİT 2: gelen snapshot'ta truth yok, YEREL truth korunur
  Session.prototype._adoptRemoteState = function (incoming) {
    if (!incoming) return;
    var localTruth = this.state && this.state.truth;
    if (localTruth && !incoming.truth) incoming.truth = localTruth;
    this.state = incoming;
    this._emit('state', { state: this.state, remote: true });
  };
  Session.prototype._applyRemote = function (d) {
    if (!d || !d.state) return;
    if (typeof d.ae === 'number' && d.ae < this._authMax) return;
    if (typeof d.ae === 'number') this._authMax = Math.max(this._authMax, d.ae);
    this._evidence = d.evidence || this._evidence;
    this._adoptRemoteState(d.state);
  };
  Session.prototype.broadcastLifecycle = function (action) { if (this.bc) this._post({ t: 'lifecycle', payload: { action: action } }); this._emit('lifecycle', { action: action }); };
  Session.prototype.destroy = function () { try { this.bc && this.bc.close(); } catch (e) { } if (typeof window !== 'undefined') window.removeEventListener('storage', this._onStorage); };

  function snapshotRevisions(st) { var r = {}; AREAS.forEach(function (a) { r[a] = st.revisions[a]; }); return r; }

  // =====================================================================
  //  Suite / modül yaşam döngüsü yardımcıları
  //  KİLİT 3 — module:deactivate klinik saati DURDURMAZ; yalnız render/audio uyutur.
  // =====================================================================
  function postLifecycleToFrame(frame, action) {
    // action: 'pause'|'resume' (legacy) veya 'module:deactivate'|'module:activate'
    try { frame && frame.contentWindow && frame.contentWindow.postMessage({ ductus: true, type: 'suite:' + action }, '*'); } catch (e) { }
  }

  // Promise-doğrulamalı AudioContext uyutma/uyandırma (modüller kullanır)
  function suspendAudio(ctx) {
    try { if (ctx && ctx.state === 'running' && ctx.suspend) return ctx.suspend(); } catch (e) { }
    return Promise.resolve();
  }
  function resumeAudio(ctx) {
    try { if (ctx && ctx.state === 'suspended' && ctx.resume) return ctx.resume(); } catch (e) { }
    return Promise.resolve();
  }

  // Modüller bu dinleyiciyi (opsiyonel) adopte eder — standalone'u etkilemez.
  // handlers: { onPause, onResume, onDeactivate, onActivate }
  function connectLifecycle(handlers) {
    handlers = handlers || {};
    if (typeof window === 'undefined') return;
    window.addEventListener('message', function (e) {
      var d = e.data; if (!d || !d.ductus) return;
      switch (d.type) {
        case 'suite:pause': case 'suite:module:deactivate':
          (handlers.onDeactivate || handlers.onPause || function () { })(); break;
        case 'suite:resume': case 'suite:module:activate':
          (handlers.onActivate || handlers.onResume || function () { })(); break;
      }
    });
  }

  var DuctusCore = {
    VERSION: '1.1',
    SCHEMA_VERSION: SCHEMA_VERSION,
    AREAS: AREAS,
    MODALITY_CLAIMS: MODALITY_CLAIMS,
    nowMs: nowMs,
    open: function (opts) { return new Session(opts); },
    defaultState: defaultState,
    publicSnapshot: publicSnapshot,
    stalenessOf: stalenessOf,
    canAnswerClaim: canAnswerClaim,
    ModalityCanAnswerClaim: canAnswerClaim,   // spec adı
    simNow: simNow,
    postLifecycleToFrame: postLifecycleToFrame,
    connectLifecycle: connectLifecycle,
    suspendAudio: suspendAudio,
    resumeAudio: resumeAudio,
    uid: uid
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DuctusCore;
  root.DuctusCore = DuctusCore;
})(typeof window !== 'undefined' ? window : this);
