/* DuctusLab Farmakoloji — Tezgâh 2: Akut Toksikoloji & Antidot motoru (deterministik, sıfır bağımlılık) */
(function(){
'use strict';
var LN2=Math.LN2;

/* ===== Vaka 9 — Parasetamol & Rumack-Matthew semilog nomogram ===== */
// Tedavi çizgisi: 4. saatte 150 mcg/mL, yarı ömür 4s eğimi → 24. saatte ~4.7
function rumackLine(tH){ if(tH<4) return null; return 150*Math.exp(-(LN2/4)*(tH-4)); }
function Paracetamol(cfg){ cfg=cfg||{}; this.C0=cfg.C0!=null?cfg.C0:300; this.thalf=4; this.charcoalGiven=null; this.nacTime=null; this.sampleRec=null; this.reset(); }
Paracetamol.prototype.reset=function(){ this.ingestT=0; };
Paracetamol.prototype.level=function(tH){ var c0=this.C0; if(this.charcoalGiven!=null && this.charcoalGiven<=2) c0=this.C0*0.45; // kömür ilk 1–2s emilimi azaltır
  return c0*Math.exp(-(LN2/this.thalf)*tH); };
Paracetamol.prototype.giveCharcoal=function(tH){ this.charcoalGiven=tH; return {effective:tH<=2}; };
Paracetamol.prototype.giveNAC=function(tH){ this.nacTime=tH; return {inWindow:tH<=8}; };
Paracetamol.prototype.sample=function(tH){ var lvl=this.level(tH), line=rumackLine(tH), flags=[];
  if(tH<4) flags.push('PRE_4H_NOMOGRAM_TRAP');
  var aboveLine=(line!=null && lvl>=line);
  this.sampleRec={tH:tH,level:+lvl.toFixed(1),line:(line!=null?+line.toFixed(1):null),aboveLine:aboveLine,valid:tH>=4,flags:flags};
  return this.sampleRec; };
// sonuç: nomogram eşiği üstünde (ya da <4s belirsiz) olup NAC verilmediyse fulminan hepatotoksisite
Paracetamol.prototype.outcome=function(){ var trueToxic=(this.C0>=200); var protectedLiver=(this.nacTime!=null && this.nacTime<=8);
  var hepatotox = trueToxic && !protectedLiver;
  return { trueToxic:trueToxic, nacGiven:this.nacTime!=null, nacInWindow:(this.nacTime!=null&&this.nacTime<=8),
    hepatotox:hepatotox, AST:hepatotox?3400:40, ALT:hepatotox?3800:38, INR:hepatotox?3.2:1.0, protectedLiver:protectedLiver }; };

/* ===== Vaka 10 — Salisilat: iyon tuzağı & paradoksal asidüri ===== */
function Salicylate(cfg){ cfg=cfg||{}; this.level=cfg.level!=null?cfg.level:65; this.serumK=cfg.serumK!=null?cfg.serumK:3.0; this.urinePH=5.5; this.bicarbGiven=false; this.kCorrected=false; }
Salicylate.prototype.correctK=function(){ this.kCorrected=true; this.serumK=4.0; this._recompute(); return this.serumK; };
Salicylate.prototype.giveBicarb=function(){ this.bicarbGiven=true; this._recompute(); return {urinePH:this.urinePH}; };
Salicylate.prototype._recompute=function(){ // hipokalemi düzeltilmeden HCO3 → paradoksal asidüri (idrar kalevileşmez)
  if(this.bicarbGiven){ if(this.serumK>=3.5){ this.urinePH=7.8; } else { this.urinePH=5.6; /* K+ tutmak için H+ atılır → asidüri */ } }
  else { this.urinePH=5.5; } };
// idrar pH >=7.5 → iyon tuzağı: tübüler geri emilim kesilir, renal klirens ~4–5 kat
Salicylate.prototype.clearanceFactor=function(){ return (this.urinePH>=7.5)?4.5:1.0; };
Salicylate.prototype.state=function(){ return { level:this.level, serumK:this.serumK, urinePH:+this.urinePH.toFixed(1),
  bicarbGiven:this.bicarbGiven, kCorrected:this.kCorrected, clearanceFactor:this.clearanceFactor(),
  paradoxicalAciduria:(this.bicarbGiven && this.serumK<3.5),
  acidBase:'Respiratuvar alkaloz + yüksek anyon açıklı metabolik asidoz (HAGMA)' }; };

/* ===== Vaka 11 — Organofosfat: atropinizasyon + AChE "aging" ODE + 2-PAM ===== */
function Organophosphate(cfg){ cfg=cfg||{}; this.kAging=cfg.kAging!=null?cfg.kAging:(LN2/5); // yaşlanma t½ ~5s
  this.inhibited=0.9; this.aged=0.0; this.active=0.1; this.reactivated=0.0; this.t=0;
  this.secretions=1.0; this.hr=62; this.atropineDose=0; this.pamGiven=null; }
// zaman ilerlet: inhibe enzim geri dönüşsüz aged'e dönüşür
Organophosphate.prototype.advance=function(hours){ var dt=0.1, steps=Math.round(hours/dt);
  for(var i=0;i<steps;i++){ var dAge=this.kAging*this.inhibited*dt; this.inhibited-=dAge; this.aged+=dAge; this.t+=dt; } return this; };
Organophosphate.prototype.giveAtropine=function(dose){ this.atropineDose+=dose; this.secretions=Math.max(0,this.secretions-dose*0.18); this.hr=Math.min(150,this.hr+dose*9); return {secretions:+this.secretions.toFixed(2),hr:Math.round(this.hr)}; };
// 2-PAM: yalnız YAŞLANMAMIŞ inhibe enzimi reaktive eder
Organophosphate.prototype.givePralidoxime=function(){ this.pamGiven=this.t; var react=this.inhibited*0.85; this.inhibited-=react; this.reactivated+=react; this.active+=react;
  return {reactivatedFrac:+react.toFixed(3), agedFrac:+this.aged.toFixed(3), effective:react>0.3}; };
Organophosphate.prototype.muscleStrength=function(){ return Math.max(0,Math.min(1,this.active)); };
Organophosphate.prototype.state=function(){ return { active:+this.active.toFixed(3), inhibited:+this.inhibited.toFixed(3), aged:+this.aged.toFixed(3),
  secretions:+this.secretions.toFixed(2), hr:Math.round(this.hr), atropinized:(this.secretions<0.2), muscleStrength:+this.muscleStrength().toFixed(3),
  atropineAdequate:(this.secretions<0.2), pamGiven:this.pamGiven!=null }; };

/* ===== Vaka 12 — TCA kardiyotoksisite: QRS & NaHCO3 ===== */
function TCA(cfg){ cfg=cfg||{}; this.totalTCA=cfg.totalTCA!=null?cfg.totalTCA:1.0; this.pH=7.30; this.na=138; this.bicarbBoluses=0; }
// serbest TCA: pH arttıkça protein bağlanma artar → serbest düşer; QRS serbest TCA ile genişler
TCA.prototype.freeFraction=function(){ return Math.max(0.1, 0.6 - (this.pH-7.30)*1.6); };
TCA.prototype.qrs=function(){ var free=this.totalTCA*this.freeFraction(); return Math.round(80 + free*95 - (this.na-138)*1.2); };
TCA.prototype.giveBicarb=function(){ this.bicarbBoluses++; this.pH=Math.min(7.55,this.pH+0.08); this.na+=3; return {qrs:this.qrs(),pH:+this.pH.toFixed(2)}; };
TCA.prototype.state=function(){ var q=this.qrs(); return { qrs:q, pH:+this.pH.toFixed(2), na:this.na, freeFraction:+this.freeFraction().toFixed(3),
  wideQRS:(q>100), terminalRaVR:(q>100), bicarbBoluses:this.bicarbBoluses, hypotension:(q>120) }; };

var PharmaTox={ rumackLine:rumackLine, Paracetamol:Paracetamol, Salicylate:Salicylate, Organophosphate:Organophosphate, TCA:TCA };
if(typeof module!=='undefined'&&module.exports) module.exports=PharmaTox;
if(typeof window!=='undefined') window.PharmaTox=PharmaTox;
})();
