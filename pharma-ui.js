/* DuctusLab Klinik Farmakoloji — UI katmanı (Tezgâh 1 Kör TDM + Tezgâh 3 Reseptör/PD) */
(function(){
'use strict';
var E=window.PharmaEngine; var $=function(id){return document.getElementById(id);};
var DEG=Math.PI/180;

/* ========================= 8 VAKA ========================= */
var CASES={
 1:{bench:1,code:'FEN',title:'Fenitoin + Nefrotik Hipoalbüminemi',
   stem:'34Y kadın, nefrotik sendrom (Alb 2.1 g/dL). Epilepsi için fenitoin alıyor. Ölçülen TOPLAM düzey düşük görünüyor — doz artırma tuzağı! Serbest düzey aslında normaldir.',
   patient:{name:'B.K.',age:34,sex:'K',weight:62,height:165,cr:0.9,alb:2.1},
   drug:{name:'Fenitoin',mm:true,boundHighly:true,freeDriven:true,Vmax:22,Km:0.6,fu0:0.10,albRef:4.4,Vc:45,ka:0.5,F:1,
     unit:'mg/L',therLow:10,therHigh:20,toxLevel:25,freeTherLow:1,freeTherHigh:2,toxFree:2.5},
   regimen:{loadMg:0,maintMg:300,interval:24,route:'oral'},
   target:{free:'1–2 mg/L (toplam yanıltıcı!)'},teach:'Hipoalbüminemide toplam düzey düşük görünür; Winter-Tozer ile düzelt veya SERBEST düzey ölç. Michaelis-Menten doygunluğunda küçük doz artışı serbest düzeyi orantısız fırlatır → nistagmus/ataksi.',
   traps:['UNBOUND_PHENYTOIN_TRAP']},
 2:{bench:1,code:'VAN',title:'Vankomisin + Akut Böbrek Hasarı (Ağır Sepsis)',
   stem:'71Y erkek, ağır sepsis + AKI (Cr 2.4). Vankomisin başlanacak. Yükleme dozu böbrek yetmezliğinde AZALTILMAZ (dağılım hacmine bağlı); idame aralığı CrCl’ye göre uzatılır.',
   patient:{name:'H.A.',age:71,sex:'E',weight:80,height:174,cr:2.4,alb:3.4},
   drug:{name:'Vankomisin',Vc:0.7*80,CLren0:3.6,crclRef:100,ka:0,F:0,unit:'mg/L',therLow:10,therHigh:20,toxLevel:30},
   regimen:{loadMg:2000,maintMg:1000,interval:24,route:'infuse'},
   target:{trough:'10–20 mg/L (vadi, 4+ yarı ömür sonrası)'},teach:'Yükleme dozu Vd’ye bağlıdır → böbrek yetmezliğinde AZALTILMAZ. İdame CrCl’ye göre seyrekleşir. 4 yarı ömür dolmadan vadi alma → yanlış düşük.',
   traps:['PRE_STEADY_STATE_ERROR']},
 3:{bench:1,code:'DIG',title:'Digoksin + Tiyazid Hipokalemisi & Erken Örnekleme',
   stem:'68Y kadın, AF için digoksin. Tiyazid ile hipokalemi var (digoksin toksisitesini artırır). Dozdan 1.5 saat sonra alınan kan DAĞILIM fazında sahte yüksek çıkar!',
   patient:{name:'S.T.',age:68,sex:'K',weight:66,height:160,cr:1.1,alb:4.0,k:3.0},
   drug:{name:'Digoksin',Vc:40,Vp:360,k12:2.0,k21:0.25,CLren0:7,crclRef:100,ka:0,F:0,distHours:6.5,unit:'ng/mL',therLow:0.5,therHigh:0.9,toxLevel:2.0,concScale:1000},
   regimen:{loadMg:0.5,maintMg:0.125,interval:24,route:'bolus'},
   target:{trough:'0.5–0.9 ng/mL (≥6–8 s sonra)'},teach:'Digoksin 6–8 saatlik yavaş doku dağılımı gösterir; erken örnek (dağılım fazında) sahte yüksektir. Hipokalemi toksisiteyi artırır → K+ replasmanı.',
   traps:['DISTRIBUTION_PHASE_SAMPLING']},
 4:{bench:1,code:'WAR',title:'Varfarin + Rifampisin (CYP2C9 Enzim Devri)',
   stem:'59Y erkek, varfarin (hedef INR 2–3). TB için rifampisin eklenecek. İndüksiyon 5–7 günde INR’yi DÜŞÜRÜR; varfarin artırıldıktan sonra rifampisin kesilip doz azaltılmazsa gecikmiş supraterapötik INR + kanama!',
   patient:{name:'M.Y.',age:59,sex:'E',weight:78,height:176,cr:1.0,alb:4.2,inr:2.4},
   drug:{name:'Varfarin',Vc:8,CLhep:0.2,CLren0:0,ka:1,F:1,enzHalf:36,indMax:1.3,inrGain:0.45,inrBase:1.0,inrTauH:40,unit:'INR',therLow:2,therHigh:3,toxLevel:4.5,isINR:true},
   regimen:{loadMg:0,maintMg:5,interval:24,route:'oral'},
   target:{inr:'INR 2–3'},teach:'Rifampisin CYP2C9’u indükler (t½,enz ≈36 s) → 5–7 günde varfarin klirensi artar, INR düşer. Rifampisin kesilince indüksiyon yavaşça geriler → doz azaltılmazsa gecikmiş INR>6 ve kanama.',
   traps:['INDUCTION_WITHDRAWAL_LAG']},
 5:{bench:1,code:'LIT',title:'Lityum + “Triple Whammy” (Tiyazid + NSAİİ)',
   stem:'46Y kadın, bipolar, lityum. Hipertansiyon için tiyazid + ağrı için NSAİİ eklendi. Proksimal tübülde Na+ ile yarışmalı Li+ geri emilimi artar → lityum klirensi çöker, kaba tremor + konfüzyon.',
   patient:{name:'E.D.',age:46,sex:'K',weight:70,height:168,cr:0.9,alb:4.3},
   drug:{name:'Lityum',Vc:0.8*70,CLren0:1.5,crclRef:100,ka:0.8,F:1,liCrclSensit:0.45,unit:'mEq/L',therLow:0.6,therHigh:1.0,toxLevel:1.5},
   regimen:{loadMg:0,maintMg:900,interval:12,route:'oral'},
   target:{trough:'0.6–1.0 mEq/L'},teach:'Tiyazid/NSAİİ/ACEi/dehidratasyon proksimal tübüler Li+ geri emilimini artırır → CL_Li %35–50 düşer → toksisite. Eşlik eden ilacı kes.',
   traps:['LI_CLEARANCE_DROP']},
 6:{bench:1,code:'GEN',title:'Obez Hastada Gentamisin Dozlama & Pik/Vadi',
   stem:'52Y erkek, 125 kg / 165 cm (obez). Gram-negatif sepsis için gentamisin. Hidrofilik aminoglikozit GERÇEK kiloyla dozlanırsa toksik pik/vadi → nefrotoksisite + vestibüler ototoksisite. Düzeltilmiş vücut ağırlığı (AdjBW) kullan.',
   patient:{name:'K.O.',age:52,sex:'E',weight:125,height:165,cr:1.0,alb:4.0},
   drug:{name:'Gentamisin',VcPerKg:0.26,vdWeight:'adj',CLren0:5.0,crclRef:100,ka:0,F:0,unit:'mg/L',therLow:0.5,therHigh:2,toxLevel:12,peakTarget:'8–10 (genişletilmiş aralık)'},
   regimen:{loadMg:0,maintMg:560,interval:24,route:'infuse'},
   target:{peak:'pik 8–10, vadi <1 mg/L'},teach:'Hidrofilik aminoglikozit dağılım hacmi yağ dokusuna az dağılır → obez hastada IBW/AdjBW kullan. Gerçek kiloyla doz → toksik pik/vadi. Genişletilmiş aralık (q24+) dozlama.',
   traps:['OBESE_TBW_DOSING']},
 /* ---- Tezgâh 3 ---- */
 7:{bench:3,code:'BUP',title:'Kronik Morfin + Buprenorfin (Presipite Yoksunluk)',
   stem:'Kronik yüksek doz morfin (tam agonist) alan hastaya buprenorfin (parsiyel agonist, çok yüksek afinite) verilmesi: morfini reseptörden kovar ve net opioid sinyalini kendi tavanına indirir → akut presipite yoksunluk.',
   patient:{name:'PD Vaka',age:40,sex:'E'},
   receptor:{mode:'competition', full:{conc:200,Kd:1,tau:12,name:'Morfin (tam)'}, partial:{conc:200,Kd:0.01,tau:0.6,name:'Buprenorfin (parsiyel)'}},
   teach:'Parsiyel agonist yüksek afinitesiyle tam agonisti kovar; düşük intrinsik aktivitesi net yanıtı kendi tavanına çeker → presipite yoksunluk. Geçişte zamanlama kritiktir.',
   traps:[]},
 8:{bench:3,code:'PBZ',title:'Yedek Reseptör + İrreversibl Antagonist (Fenoksibenzamin + NA)',
   stem:'Yedek reseptörlü dokuda noradrenalin yanıtı: düşük doz irreversibl α-blok (fenoksibenzamin) Emax’ı korur, yalnız sağa kaydırır; yüksek dozda yedek reseptörler tükenince Emax çöker.',
   patient:{name:'PD Vaka',age:40,sex:'E'},
   receptor:{mode:'spare', Kd:1, tau0:40, spare:0.75, block:0.0, name:'Noradrenalin'},
   teach:'Yedek reseptör rezervi: tam yanıt için reseptörlerin yalnız bir kısmı gerekir. İrreversibl antagonist önce rezervi tüketir (sağa kayma, Emax korunur); rezerv bitince Emax düşer.',
   traps:[]},
 /* ---- Tezgâh 2: Akut Toksikoloji ---- */
 9:{bench:2,code:'APAP',title:'Parasetamol Zehirlenmesi & Rumack-Matthew Nomogramı',
   stem:'22Y, intihar amaçlı ~15 g parasetamol aldı. Rumack-Matthew nomogramı ile risk değerlendirmesi. KRİTİK: Alımdan sonra <4. saatte alınan düzey nomogramda GEÇERSİZDİR — çizgi altında diye NAC’siz taburcu etme!',
   patient:{name:'A.Y.',age:22,sex:'E',weight:64},
   tox:{type:'paracetamol',C0:300},
   teach:'Rumack-Matthew yalnız ≥4. saat için geçerli (emilim/dağılım tamamlanır). Nomogram çizgisi üstü → NAC. NAC ilk 8 saatte başlanırsa karaciğer tam korunur; aktif kömür yalnız ilk 1–2 saatte emilimi azaltır. <4s örnek + NAC’siz taburcu → fulminan hepatotoksisite (AST/ALT>3000, INR↑).',
   traps:['PRE_4H_NOMOGRAM_TRAP']},
 10:{bench:2,code:'SAL',title:'Salisilat Zehirlenmesi: İyon Tuzağı & Paradoksal Asidüri',
   stem:'48Y, aspirin aşırı dozu. Respiratuvar alkaloz + yüksek anyon açıklı metabolik asidoz. İdrar alkalinizasyonu (NaHCO3) ile renal klirens ~4–5 kat artırılabilir. TUZAK: hipokalemiyi (K=3.0) düzeltmeden sadece NaHCO3 → paradoksal asidüri (idrar kalevileşmez)!',
   patient:{name:'R.S.',age:48,sex:'E',weight:72,k:3.0},
   tox:{type:'salicylate',level:65,serumK:3.0},
   teach:'Zayıf asit (pKa~3.0): idrar pH 5.5→7.8 olunca tübüler geri emilim kesilir, iyon tuzağıyla renal klirens ~4–5 kat artar. Hipokalemi varken böbrek K+ tutmak için H+ atar → idrar kalevileşmez (paradoksal asidüri). Önce K+ düzelt.',
   traps:['PARADOXICAL_ACIDURIA']},
 11:{bench:2,code:'OP',title:'Organofosfat: Kolinerjik Kriz, Atropinizasyon & AChE Yaşlanma',
   stem:'54Y çiftçi, organofosfat maruziyeti. Muskarinik (bronkore, miyozis, bradikardi) + nikotinik (fasikülasyon, solunum kası güçsüzlüğü). Atropini KALP HIZINA göre değil BRONŞİYAL SEKRESYON kuruyana dek titre et. Fosforile AChE zamanla geri dönüşsüz “yaşlanır” — 2-PAM’ı ERKEN ver!',
   patient:{name:'M.K.',age:54,sex:'E',weight:78},
   tox:{type:'organophosphate'},
   teach:'Atropin hedefi bronşiyal sekresyonların kuruması (akciğerler temiz), taşikardi değil. Fosforile AChE k_aging ile geri dönüşsüz Aged-AChE’ye döner; Pralidoksim (2-PAM) yalnız yaşlanmamış enzimi reaktive eder → erken verilmeli. Geç verilen 2-PAM etkisiz.',
   traps:['AGING_KINETICS']},
 12:{bench:2,code:'TCA',title:'Trisiklik Antidepresan Kardiyotoksisitesi & NaHCO3',
   stem:'31Y, amitriptilin aşırı dozu. Hızlı Na+ kanal blokajı: QRS >100 ms, sağ aks / terminal aVR R dalgası, hipotansiyon. IV Sodyum Bikarbonat (Na yükü + pH↑) protein bağlanmayı artırıp serbest TCA’yı düşürerek QRS’i dakikalar içinde daraltır.',
   patient:{name:'D.A.',age:31,sex:'K',weight:60},
   tox:{type:'tca',totalTCA:1.0},
   teach:'TCA Na+ kanal blokajı QRS’i genişletir (>100ms, terminal aVR R, aVR>3mm). IV NaHCO3: Na yükü kanal blokajını aşar + alkaloz serbest TCA’yı azaltır → QRS saniyeler/dakikalar içinde daralır. Hedef QRS<100ms.',
   traps:[]}
};

/* ========================= DURUM ========================= */
var ST={bench:1,mode:'exam',caseId:1,sim:null,tox:null,toxT:0,step:0,regimen:null,evaluated:false,
  recept:{spare:0.75,block:0.0,partialOn:false,agonistDose:50}};
var TX=window.PharmaTox;
function makeTox(cfg){ if(cfg.type==='paracetamol')return new TX.Paracetamol(cfg); if(cfg.type==='salicylate')return new TX.Salicylate(cfg);
  if(cfg.type==='organophosphate')return new TX.Organophosphate(cfg); if(cfg.type==='tca')return new TX.TCA(cfg); return null; }
var STEPS1=['Hastayı Oku','Doz & Rejim Kararı','Zamanı İlerlet','TDM Kan Al (Kör)','Beyan & Jüri'];
var STEPS2=['Zehir & Tabloyu Oku','Zamanla/Örnekle','Antidot Kararı','Yanıtı İzle','Beyan & Jüri'];
var STEPS3=['Reseptör Tipini Seç','Agonist/Antagonist Ekle','Yedek Reseptör Ayarı','Eğriyi Oku','Beyan & Jüri'];

var _toastT=null;
function toast(m,k){ var box=$('toastBox'); if(!box)return; box.innerHTML='';
  var t=document.createElement('div'); t.className='toast'+(k?' '+k:''); t.textContent=m; box.appendChild(t);
  requestAnimationFrame(function(){ t.classList.add('show'); });
  if(_toastT)clearTimeout(_toastT);
  _toastT=setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ if(t.parentNode)t.remove(); },240); },2500); }

/* ========================= VAKA YÜKLE ========================= */
function loadCase(id){ ST.caseId=id; var C=CASES[id]; ST.bench=C.bench; ST.evaluated=false; ST.step=0;
  $('caseTag').textContent=C.code+' · Vaka '+id; renderStem();
  if(C.bench===1){ ST.regimen=Object.assign({},C.regimen); ST.sim=new E.PKSim({patient:C.patient,drug:C.drug}); applyRegimenSetup(); }
  else if(C.bench===2){ ST.tox=makeTox(C.tox); ST.toxT=0; }
  else { ST.recept={spare:(C.receptor.spare!=null?C.receptor.spare:0.75),block:(C.receptor.block!=null?C.receptor.block:0.0),partialOn:(C.receptor.mode==='competition'),agonistDose:50}; }
  syncBenchTabs(); resetJury(); renderAll();
}
// TUS/Sınav modunda vaka açıklamasından öğretici ipuçlarını (KRİTİK/TUZAK/hedef) gizle
function examStem(C){ if(ST.mode==='explore'||ST.evaluated) return C.stem;
  var sentences=C.stem.split(/(?<=[.!?])\s+/);
  var spoiler=/KR[İIi]T[İIi]K|TUZAK|tuzak|tuzağı|hedef|Hedef|TAM PUAN|güvenli dur|AZALTILMA|aslında normal|nomogram|≥\s?4|<\s?4\.?\s?saat|Vertucci|kalevileş|paradoks/;
  var kept=sentences.filter(function(s){ return !spoiler.test(s); });
  return (kept.join(' ').trim()) || sentences[0];
}
function renderStem(){ var C=CASES[ST.caseId]; $('caseStem').textContent=examStem(C); }
function resetJury(){ var j=$('juryOut'); if(!j)return;
  j.innerHTML = (ST.bench===1) ? 'Kararlarını uygula, zamanı ilerlet, gerektiğinde 🩸 TDM al → <b>Beyanı Değerlendir</b>.'
    : (ST.bench===2) ? 'Zehir tablosunu oku, antidot/düzeltme kararlarını uygula → <b>Beyanı Değerlendir</b>.'
    : 'Reseptör/antagonist ekle ve yedek reseptör ayarını değiştir → <b>Beyanı Değerlendir</b>.';
  j.style.color='var(--ink-3)'; j.style.fontSize='10.5px';
}
function applyRegimenSetup(){ var C=CASES[ST.caseId],r=ST.regimen; ST.sim.reset();
  if(r.loadMg>0){ if(r.route==='bolus')ST.sim.giveBolus(r.loadMg); else if(r.route==='infuse')ST.sim.startInfusion(r.loadMg, 1), ST.sim.advance(1); else ST.sim.giveOral(r.loadMg); }
}

/* ========================= RENDER ========================= */
function syncBenchTabs(){ [].forEach.call($('benchtabs').children,function(b){ b.classList.toggle('on',+b.dataset.bench===ST.bench); }); }
function renderStepper(){ var steps=ST.bench===1?STEPS1:ST.bench===2?STEPS2:STEPS3; var h=''; steps.forEach(function(n,i){ h+='<div class="step'+(i===ST.step?' active':(i<ST.step?' done':''))+'"><span class="dot">'+(i<ST.step?'✓':(i+1))+'</span>'+n+'</div>'; }); $('stepper').innerHTML=h; }
function renderAll(){ renderStepper(); renderStem(); renderPatient(); renderControls(); renderLegend();
  $('chartWrap2').classList.toggle('hidden',ST.bench!==3);
  $('blindTag').classList.toggle('hidden', !(ST.bench===1 && ST.mode==='exam' && !ST.evaluated));
  var C=CASES[ST.caseId];
  $('evTitle').textContent=ST.bench===1?'TDM Ölçüm Kanıtı':ST.bench===2?'Toksikoloji Durumu':'PD Ölçümleri';
  $('chartLbl1').textContent=ST.bench===1?'Plazma Konsantrasyon–Zaman':ST.bench===2?toxChartTitle():'Log[Agonist] → % Yanıt';
  draw(); renderEvidence();
}
function toxChartTitle(){ var t=CASES[ST.caseId].tox.type; return t==='paracetamol'?'Rumack-Matthew Nomogramı (semilog)':t==='salicylate'?'Asit-Baz & İyon Tuzağı':t==='organophosphate'?'AChE Enzim Durumu & Atropinizasyon':'QRS & Na⁺ Kanal Blokajı'; }
function renderPatient(){ var C=CASES[ST.caseId],pt=C.patient; var h='';
  function row(k,v,cls){ return '<div class="ptrow"><span class="k">'+k+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>'; }
  h+=row('Ad / Yaş / Cins',(pt.name||'—')+' · '+(pt.age||'—')+' · '+(pt.sex||'—'));
  if(ST.bench===1){ h+=row('Kilo / Boy',(pt.weight+' kg / '+pt.height+' cm'));
    var crcl=E.cockcroftGault(pt.age,pt.weight,pt.cr,pt.sex);
    h+=row('Kreatinin',pt.cr+' mg/dL',pt.cr>1.5?'bad':''); h+=row('CrCl (C-G)',Math.round(crcl)+' mL/dk',crcl<50?'warn':'good');
    h+=row('Albümin',pt.alb+' g/dL',pt.alb<3?'warn':''); if(pt.k!=null)h+=row('Potasyum',pt.k+' mEq/L',pt.k<3.5?'bad':'');
    if(C.drug.vdWeight==='adj'){ h+=row('İBW / AdjBW',Math.round(E.ibwKg(pt.height,pt.sex))+' / '+Math.round(E.adjBWKg(pt.weight,pt.height,pt.sex))+' kg','warn'); }
  }
  if(ST.bench===2){ h+=row('Kilo',(pt.weight||'—')+' kg'); if(pt.k!=null)h+=row('Potasyum',pt.k+' mEq/L',pt.k<3.5?'bad':''); h+=row('Toksik ajan',C.title.split(' ')[0]); }
  $('ptBody').innerHTML=h;
  // canlı vitaller + semptomlar (sim durumuna göre)
  if(ST.bench===1){ renderVitals(); }
  else if(ST.bench===2){ renderToxVitals(); }
  else { $('vitalBody').innerHTML='<div class="ptrow"><span class="k">Hedef</span><span class="v">'+(C.receptor.name||C.receptor.full&&C.receptor.full.name||'reseptör')+'</span></div>'; $('symptBody').innerHTML=''; }
}
function renderToxVitals(){ var C=CASES[ST.caseId],tx=ST.tox,t=C.tox.type,h='',sy=[];
  function vr(k,v,cls){ h+='<div class="ptrow"><span class="k">'+k+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>'; }
  vr('Sim. Zaman', 't+'+ST.toxT.toFixed(1)+' s');
  if(t==='paracetamol'){ var o=tx.outcome(); vr('AST/ALT',o.AST+'/'+o.ALT,o.hepatotox?'bad':'good'); vr('INR',o.INR.toFixed(1),o.INR>1.5?'bad':'good'); if(o.hepatotox)sy=['bulantı/kusma','sağ üst kadran ağrı','ensefalopati']; else sy=['erken: asemptomatik']; }
  else if(t==='salicylate'){ var s=tx.state(); vr('İdrar pH',s.urinePH,s.urinePH>=7.5?'good':'warn'); vr('Serum K+',s.serumK.toFixed(1),s.serumK<3.5?'bad':'good'); vr('Renal klirens','×'+s.clearanceFactor.toFixed(1),s.clearanceFactor>=4?'good':''); sy=['tinnitus','hiperventilasyon','bulantı']; if(s.paradoxicalAciduria)sy.push('paradoksal asidüri'); }
  else if(t==='organophosphate'){ var st=tx.state(); vr('Kalp Hızı',st.hr+' /dk',st.hr>120?'warn':''); vr('Bronş sekresyon',(st.secretions*100).toFixed(0)+'%',st.secretions>0.2?'bad':'good'); vr('Aktif AChE',(st.active*100).toFixed(0)+'%',st.active<0.3?'bad':''); vr('Yaşlanmış (aged)',(st.aged*100).toFixed(0)+'%',st.aged>0.5?'bad':''); sy=['miyozis','fasikülasyon']; if(st.secretions>0.2)sy.push('bronkore/ronküs'); if(st.muscleStrength<0.4)sy.push('solunum kası güçsüzlüğü'); }
  else if(t==='tca'){ var ts=tx.state(); vr('QRS',ts.qrs+' ms',ts.wideQRS?'bad':'good'); vr('Kan pH',ts.pH.toFixed(2),ts.pH<7.3?'warn':''); vr('Serbest TCA',(ts.freeFraction*100).toFixed(0)+'%',''); sy=[]; if(ts.wideQRS)sy.push('QRS >100ms'); if(ts.terminalRaVR)sy.push('terminal aVR R'); if(ts.hypotension)sy.push('hipotansiyon'); }
  $('vitalBody').innerHTML=h; $('symptBody').innerHTML=sy.map(function(x){return '<span class="s hot">'+x+'</span>';}).join('')||'<span class="s">—</span>';
}
function renderVitals(){ var C=CASES[ST.caseId],sim=ST.sim,c=sim.conc(); var tox=toxFraction(); var h=''; var sy=[];
  function vr(k,v,cls){ h+='<div class="ptrow"><span class="k">'+k+'</span><span class="v'+(cls?' '+cls:'')+'">'+v+'</span></div>'; }
  vr('Sim. Zaman',fmtT(sim.t));
  // genel vitaller etkilenir (toksisiteyle)
  var hr=84+Math.round(tox*20*(C.code==='DIG'?-1:1)); var sbp=120-Math.round(tox*18); var qtc=420+Math.round(tox*(C.code==='DIG'?40:10));
  vr('Kalp Hızı',hr+' /dk', (hr<55||hr>110)?'warn':''); vr('Kan Basıncı',sbp+'/'+(70-Math.round(tox*8)), sbp<95?'warn':'');
  if(C.drug.isINR){ vr('INR',c.INR.toFixed(1), c.INR>3.5?'bad':c.INR<2?'warn':'good'); }
  vr('QTc',qtc+' ms', qtc>470?'bad':'');
  $('vitalBody').innerHTML=h;
  // toksisite semptomları
  if(tox>0.5){ if(C.code==='FEN')sy=['nistagmus','ataksi','letarji']; else if(C.code==='DIG')sy=['bulantı','görme değişikliği','bradiaritmi']; else if(C.code==='LIT')sy=['kaba tremor','konfüzyon']; else if(C.code==='GEN')sy=['vertigo (vestibüler)','işitme azalması']; else if(C.code==='VAN')sy=['böbrek fonksiyon ↓']; else if(C.code==='WAR')sy=['ekimoz/kanama']; }
  $('symptBody').innerHTML=sy.map(function(s){return '<span class="s hot">'+s+'</span>';}).join('')||'<span class="s">semptomsuz</span>';
}
function toxFraction(){ var C=CASES[ST.caseId],sim=ST.sim; if(!sim)return 0; var c=sim.conc();
  var val=C.drug.isINR?c.INR:(C.drug.freeDriven?c.Ctot:c.Ctot)*(C.drug.concScale?C.drug.concScale:1);
  var tox=C.drug.toxLevel; if(C.drug.freeDriven){ val=c.Cfree; tox=C.drug.toxFree||2.5; }
  return Math.max(0,Math.min(1,(val-(C.drug.therHigh||tox*0.6))/(tox-(C.drug.therHigh||tox*0.6))));
}

/* ========================= KONTROL ŞERİDİ ========================= */
function renderControls(){ var s=$('ctrlStrip');
  if(ST.bench===1){ var r=ST.regimen,C=CASES[ST.caseId];
    s.innerHTML=
      '<div class="ctrlgrp"><span class="lbl">Yükleme</span><input class="fld" id="fLoad" value="'+r.loadMg+'"><span class="lbl">mg</span></div>'+
      '<div class="ctrlgrp"><span class="lbl">İdame</span><input class="fld" id="fMaint" value="'+r.maintMg+'"><span class="lbl">mg</span></div>'+
      '<div class="ctrlgrp"><span class="lbl">Aralık</span><select class="fld" id="fIntv"><option value="6">q6h</option><option value="8">q8h</option><option value="12">q12h</option><option value="24">q24h</option></select></div>'+
      '<div class="ctrlgrp"><span class="lbl">Yol</span><select class="fld" id="fRoute"><option value="oral">Oral</option><option value="bolus">IV Bolus</option><option value="infuse">1s İnfüzyon</option></select></div>'+
      '<div class="ctrlgrp"><span class="lbl">Eşlik İlaç</span><button class="btn sm" id="comedBtn">'+comedLabel()+'</button></div>'+
      '<button class="btn sm accent" id="doseBtn">💊 Dozu Uygula</button>'+
      '<div class="ctrlgrp"><span class="lbl">İlerlet</span><div class="timebtns"><button class="btn sm" data-adv="2">+2s</button><button class="btn sm" data-adv="6">+6s</button><button class="btn sm" data-adv="24">+24s</button><button class="btn sm" data-adv="72">+3g</button></div></div>'+
      '<button class="btn sm warn" id="tdmBtn">🩸 TDM Kan Al</button>'+
      '<div class="spacer"></div><button class="btn sm go" id="evalBtn">⚖ Beyanı Değerlendir</button>';
    $('fIntv').value=r.interval; $('fRoute').value=r.route;
    $('doseBtn').onclick=applyDoseFromUI; $('tdmBtn').onclick=doDrawTDM; $('evalBtn').onclick=evaluate; $('comedBtn').onclick=toggleComed;
    [].forEach.call(s.querySelectorAll('[data-adv]'),function(b){ b.onclick=function(){ advanceTime(+b.dataset.adv); }; });
  } else if(ST.bench===2){ renderToxControls(s);
  } else {
    var C=CASES[ST.caseId],rc=ST.recept;
    if(C.receptor.mode==='competition'){
      s.innerHTML='<div class="ctrlgrp"><span class="lbl">Tam Agonist</span><span class="v mono">'+C.receptor.full.name+' (sabit)</span></div>'+
        '<div class="ctrlgrp"><span class="lbl">Parsiyel Agonist Ekle</span><button class="btn sm '+(rc.partialOn?'accent':'')+'" id="partialBtn">'+(rc.partialOn?'✓ Eklendi: '+C.receptor.partial.name:'+ '+C.receptor.partial.name)+'</button></div>'+
        '<div class="spacer"></div><button class="btn sm go" id="evalBtn">⚖ Beyanı Değerlendir</button>';
      $('partialBtn').onclick=function(){ rc.partialOn=!rc.partialOn; ST.step=2; renderAll(); toast(rc.partialOn?'Parsiyel agonist eklendi — net yanıt kendi tavanına iniyor (presipite yoksunluk)':'Parsiyel agonist çıkarıldı',rc.partialOn?'warn':''); };
    } else {
      s.innerHTML='<div class="slider"><div class="sl-lbl"><span>Yedek Reseptör %</span><span id="spareVal">'+Math.round(rc.spare*100)+'%</span></div><input type="range" id="spareSl" min="0" max="80" value="'+Math.round(rc.spare*100)+'"></div>'+
        '<div class="slider"><div class="sl-lbl"><span>İrreversibl Blok %</span><span id="blockVal">'+Math.round(rc.block*100)+'%</span></div><input type="range" id="blockSl" min="0" max="98" value="'+Math.round(rc.block*100)+'"></div>'+
        '<div class="spacer"></div><button class="btn sm go" id="evalBtn">⚖ Beyanı Değerlendir</button>';
      $('spareSl').oninput=function(){ rc.spare=+this.value/100; $('spareVal').textContent=this.value+'%'; ST.step=2; draw(); };
      $('blockSl').oninput=function(){ rc.block=+this.value/100; $('blockVal').textContent=this.value+'%'; ST.step=3; draw(); };
    }
    $('evalBtn').onclick=evaluate;
  }
}
function renderToxControls(s){ var C=CASES[ST.caseId],t=C.tox.type,tx=ST.tox;
  function adv(h){ ST.toxT+=h; if(tx.advance)tx.advance(h); ST.step=Math.max(ST.step,1); renderAll(); toast('Zaman +'+h+' saat ilerletildi (t+'+ST.toxT.toFixed(1)+'s)',''); }
  var common='<div class="ctrlgrp"><span class="lbl">İlerlet</span><div class="timebtns"><button class="btn sm" data-th="1">+1s</button><button class="btn sm" data-th="2">+2s</button><button class="btn sm" data-th="4">+4s</button></div></div>';
  if(t==='paracetamol'){
    s.innerHTML=common+'<button class="btn sm warn" id="apapSample">🩸 Düzey Al (nomograma koy)</button>'+
      '<button class="btn sm" id="apapChar">Aktif Kömür</button>'+
      '<button class="btn sm accent" id="apapNAC">NAC (N-Asetilsistein) Başla</button>'+
      '<div class="spacer"></div><button class="btn sm go" id="evalBtn">⚖ Beyanı Değerlendir</button>';
    $('apapSample').onclick=function(){ var r=tx.sample(ST.toxT); ST.step=Math.max(ST.step,3); renderAll();
      toast('Düzey '+r.level+' mcg/mL @ '+ST.toxT.toFixed(1)+'s'+(r.line!=null?' (çizgi '+r.line+')':'')+(r.flags.length?' ⚠ '+r.flags.join(','):(r.aboveLine?' — ÇİZGİ ÜSTÜ: NAC!':' — çizgi altı')), r.flags.length?'err':(r.aboveLine?'warn':'good')); };
    $('apapChar').onclick=function(){ var r=tx.giveCharcoal(ST.toxT); ST.step=Math.max(ST.step,2); renderAll(); toast('Aktif kömür verildi'+(r.effective?' (ilk 1–2s: emilim azaldı)':' — geç: etkisiz'), r.effective?'good':'warn'); };
    $('apapNAC').onclick=function(){ var r=tx.giveNAC(ST.toxT); ST.step=Math.max(ST.step,2); renderAll(); toast('NAC başlandı @ '+ST.toxT.toFixed(1)+'s'+(r.inWindow?' — ilk 8s: tam hepatoprotek siyon':' — geç başlandı'), r.inWindow?'good':'warn'); };
  } else if(t==='salicylate'){
    s.innerHTML='<div class="ctrlgrp"><span class="lbl">Elektrolit</span><button class="btn sm" id="salK">K+ Düzelt (→4.0)</button></div>'+
      '<button class="btn sm accent" id="salBicarb">IV NaHCO3 (idrar alkalinizasyonu)</button>'+
      '<div class="spacer"></div><button class="btn sm go" id="evalBtn">⚖ Beyanı Değerlendir</button>';
    $('salK').onclick=function(){ tx.correctK(); ST.step=Math.max(ST.step,2); renderAll(); toast('K+ 4.0 mEq/L’ye düzeltildi','good'); };
    $('salBicarb').onclick=function(){ var r=tx.giveBicarb(); ST.step=Math.max(ST.step,2); var st=tx.state(); renderAll();
      toast('IV NaHCO3 → idrar pH '+r.urinePH+(st.paradoxicalAciduria?' ⚠ PARADOKSAL ASİDÜRİ (önce K+ düzelt!)':' · klirens ×'+st.clearanceFactor.toFixed(1)), st.paradoxicalAciduria?'err':'good'); };
  } else if(t==='organophosphate'){
    s.innerHTML=common+'<button class="btn sm" id="opAtr2">Atropin +2 mg</button><button class="btn sm warn" id="opAtr4">Atropin +4 mg (sekresyona titre)</button>'+
      '<button class="btn sm accent" id="opPAM">Pralidoksim (2-PAM)</button>'+
      '<div class="spacer"></div><button class="btn sm go" id="evalBtn">⚖ Beyanı Değerlendir</button>';
    function atr(d){ var r=tx.giveAtropine(d); ST.step=Math.max(ST.step,2); renderAll(); toast('Atropin +'+d+'mg → HR '+r.hr+', sekresyon '+(r.secretions*100).toFixed(0)+'%'+(tx.state().atropineAdequate?' ✓ atropinizasyon':' (sekresyon sürüyor)'), tx.state().atropineAdequate?'good':'warn'); }
    $('opAtr2').onclick=function(){ atr(2); }; $('opAtr4').onclick=function(){ atr(4); };
    $('opPAM').onclick=function(){ var r=tx.givePralidoxime(); ST.step=Math.max(ST.step,2); renderAll(); toast('2-PAM verildi: reaktive '+(r.reactivatedFrac*100).toFixed(0)+'% (yaşlanmış '+(r.agedFrac*100).toFixed(0)+'%)'+(r.effective?' — nikotinik güç geri döndü':' ⚠ geç: enzim yaşlandı, etkisiz'), r.effective?'good':'err'); };
  } else if(t==='tca'){
    s.innerHTML='<button class="btn sm accent" id="tcaBicarb">IV Sodyum Bikarbonat Bolus</button>'+
      '<div class="ctrlgrp"><span class="lbl">Hedef</span><span class="v mono">QRS < 100 ms</span></div>'+
      '<div class="spacer"></div><button class="btn sm go" id="evalBtn">⚖ Beyanı Değerlendir</button>';
    $('tcaBicarb').onclick=function(){ var r=tx.giveBicarb(); ST.step=Math.max(ST.step,2); renderAll(); toast('NaHCO3 bolus → QRS '+r.qrs+' ms, pH '+r.pH+(r.qrs<100?' ✓ daraldı':' (daralıyor)'), r.qrs<100?'good':'warn'); };
  }
  [].forEach.call(s.querySelectorAll('[data-th]'),function(b){ b.onclick=function(){ adv(+b.dataset.th); }; });
  $('evalBtn').onclick=evaluate;
}
function comedLabel(){ var C=CASES[ST.caseId],sim=ST.sim; if(C.code==='WAR')return sim.hasComed('inducer')?'Rifampisin: AÇIK':'Rifampisin Başla'; if(C.code==='LIT')return sim.hasComed('liBlock')?'Tiyazid+NSAİİ: AÇIK':'Tiyazid+NSAİİ Başla'; if(C.code==='DIG')return sim.hasComed('liBlock')?'Tiyazid: AÇIK':'Tiyazid (hipoK)'; return '—'; }
function toggleComed(){ var C=CASES[ST.caseId],sim=ST.sim; var kind=(C.code==='WAR')?'inducer':'liBlock';
  var on=!sim.hasComed(kind); sim.setComed(kind,on); $('comedBtn').textContent=comedLabel();
  toast((C.code==='WAR'?'Rifampisin ':(C.code==='LIT'?'Tiyazid+NSAİİ ':'Eşlik ilaç '))+(on?'başlandı — etki zamanla gelişir':'kesildi — indüksiyon yavaşça geriler'), on?'warn':''); }
function applyDoseFromUI(){ var r=ST.regimen; r.loadMg=+$('fLoad').value||0; r.maintMg=+$('fMaint').value||0; r.interval=+$('fIntv').value; r.route=$('fRoute').value;
  var dose=r.maintMg; if(r.route==='bolus')ST.sim.giveBolus(dose); else if(r.route==='infuse')ST.sim.startInfusion(dose,1),ST.sim.advance(1); else ST.sim.giveOral(dose);
  ST.step=Math.max(ST.step,2); ST._dosedThisInterval=true; renderAll(); toast('İdame doz uygulandı: '+dose+' mg '+({oral:'Oral',bolus:'IV Bolus',infuse:'1s İnfüzyon'}[r.route])+' · q'+r.interval+'h',''); }
function advanceTime(h){ var r=ST.regimen,C=CASES[ST.caseId]; ST.step=Math.max(ST.step,3);
  // aralık boyunca otomatik idame dozları (basit: her interval'de bir doz)
  var remaining=h, given=0;
  while(remaining>0){ var stepH=Math.min(remaining, r.interval - (ST.sim.t % r.interval)); if(stepH<=0.01)stepH=Math.min(remaining,r.interval);
    ST.sim.advance(stepH); remaining-=stepH;
    if(Math.abs((ST.sim.t % r.interval))<0.05 && remaining>0.01){ var d=r.maintMg; if(r.route==='bolus')ST.sim.giveBolus(d); else if(r.route==='infuse')ST.sim.startInfusion(d,1); else ST.sim.giveOral(d); given++; }
  }
  renderAll(); toast('Zaman +'+fmtDur(h)+' ilerletildi'+(given?' ('+given+' idame doz)':'') ,''); }
function doDrawTDM(){ var rec=ST.sim.drawTDM(); ST.step=Math.max(ST.step,4);
  var C=CASES[ST.caseId]; var disp=C.drug.concScale?(rec.Ctot*C.drug.concScale):rec.Ctot;
  var msg='🩸 TDM: '+(C.drug.isINR?('INR '+rec.INR.toFixed(1)):(disp.toFixed(2)+' '+C.drug.unit))+' (son dozdan '+fmtDur(rec.sinceDose)+' sonra)';
  if(rec.flags.length)msg+=' ⚠ '+rec.flags.join(',');
  toast(msg, rec.flags.length?'warn':'good'); renderAll(); }

/* ========================= ÇİZİM (Canvas2D) ========================= */
function setupCanvas(cv){ var dpr=Math.min(2,window.devicePixelRatio||1); var w=cv.clientWidth,h=cv.clientHeight; cv.width=w*dpr; cv.height=h*dpr; var x=cv.getContext('2d'); x.setTransform(dpr,0,0,dpr,0,0); return {x:x,w:w,h:h}; }
function draw(){ if(ST.bench===1)drawPK(); else if(ST.bench===2)drawTox(); else drawPD(); }
function drawTox(){ var C=CASES[ST.caseId],t=C.tox.type,tx=ST.tox; var cv=$('chart1'),g=setupCanvas(cv),x=g.x,W=g.w,H=g.h; x.clearRect(0,0,W,H);
  var L=46,R=16,T=16,B=26,pw=W-L-R,ph=H-T-B;
  if(t==='paracetamol'){ // Rumack-Matthew semilog: Y log 1–1000, X 0–24s
    var yTop=1000,yBot=1; function Y(v){ v=Math.max(yBot,Math.min(yTop,v)); return T+ph*(1-(Math.log10(v)-Math.log10(yBot))/(Math.log10(yTop)-Math.log10(yBot))); } function X(h){ return L+pw*(h/24); }
    x.strokeStyle='rgba(255,255,255,.05)';x.fillStyle='#5a6b80';x.font='9px '+mono();x.textAlign='right';
    [1,10,100,1000].forEach(function(v){ var yy=Y(v); x.beginPath();x.moveTo(L,yy);x.lineTo(W-R,yy);x.stroke(); x.fillText(v,L-4,yy+3); });
    x.textAlign='center'; for(var hx=0;hx<=24;hx+=4){ x.fillText(hx+'s',X(hx),H-8); }
    // tedavi çizgisi (≥4s)
    x.strokeStyle='#e4607a';x.lineWidth=2;x.beginPath(); var started=false;
    for(var hh=4;hh<=24;hh+=0.5){ var lv=TX.rumackLine(hh); var px=X(hh),py=Y(lv); started?x.lineTo(px,py):x.moveTo(px,py); started=true; } x.stroke();
    x.fillStyle='#e4607a';x.font='8.5px '+mono();x.textAlign='left';x.fillText('Rumack-Matthew tedavi çizgisi (NAC üstü)',X(7),Y(TX.rumackLine(7))-5);
    // <4s geçersiz bölge
    x.fillStyle='rgba(228,96,122,.06)';x.fillRect(L,T,X(4)-L,ph); x.fillStyle='rgba(228,96,122,.5)';x.save();x.translate(X(2),T+ph*0.5);x.rotate(-Math.PI/2);x.textAlign='center';x.fillText('<4s GEÇERSİZ',0,0);x.restore();
    x.strokeStyle='rgba(228,96,122,.35)';x.setLineDash([3,3]);x.beginPath();x.moveTo(X(4),T);x.lineTo(X(4),T+ph);x.stroke();x.setLineDash([]);
    // örnek noktası
    if(tx.sampleRec){ var r=tx.sampleRec; var px=X(r.tH),py=Y(r.level); x.fillStyle=r.flags.length?'#e4607a':(r.aboveLine?'#d9a441':'#8fe3bf'); x.beginPath();x.arc(px,py,5,0,2*Math.PI);x.fill(); x.strokeStyle='#0a1120';x.lineWidth=1.5;x.stroke();
      x.fillStyle='#eaf4fb';x.textAlign='center';x.fillText(r.level+' @'+r.tH.toFixed(1)+'s',px,py-9); }
    $('chartBadge1').textContent=tx.nacTime!=null?('NAC @'+tx.nacTime.toFixed(1)+'s'):(tx.sampleRec?(tx.sampleRec.aboveLine?'ÇİZGİ ÜSTÜ':'çizgi altı'):'örnek bekleniyor');
  }
  else { // 10/11/12: durum bar/gauge görünümü
    x.font='10px '+mono(); var bars=[];
    if(t==='salicylate'){ var s=tx.state(); bars=[['İdrar pH (hedef ≥7.5)',(s.urinePH-4)/(8-4),s.urinePH.toFixed(1),s.urinePH>=7.5?'#8fe3bf':'#d9a441'],['Serum K+ (≥3.5)',(s.serumK-2)/(5-2),s.serumK.toFixed(1),s.serumK>=3.5?'#8fe3bf':'#e4607a'],['Renal klirens çarpanı',(s.clearanceFactor-1)/(5-1),'×'+s.clearanceFactor.toFixed(1),s.clearanceFactor>=4?'#8fe3bf':'#7bc5ed']];
      drawBanner(x,L,T,pw,s.paradoxicalAciduria?'⚠ PARADOKSAL ASİDÜRİ — K+ düzeltilmeden idrar kalevileşmez':s.acidBase, s.paradoxicalAciduria?'#e4607a':'#7f8fa3'); }
    else if(t==='organophosphate'){ var st=tx.state(); bars=[['Aktif AChE',st.active,(st.active*100).toFixed(0)+'%',st.active<0.3?'#e4607a':'#8fe3bf'],['İnhibe (reaktive edilebilir)',st.inhibited,(st.inhibited*100).toFixed(0)+'%','#d9a441'],['Yaşlanmış (aged, geri dönüşsüz)',st.aged,(st.aged*100).toFixed(0)+'%',st.aged>0.5?'#e4607a':'#7f8fa3'],['Bronş sekresyon (hedef→0)',st.secretions,(st.secretions*100).toFixed(0)+'%',st.secretions<0.2?'#8fe3bf':'#e4607a'],['Kas gücü (nikotinik)',st.muscleStrength,(st.muscleStrength*100).toFixed(0)+'%',st.muscleStrength>0.6?'#8fe3bf':'#d9a441']];
      drawBanner(x,L,T,pw,st.atropinized?'✓ Atropinizasyon tam (sekresyon kurudu)':'Atropini bronşiyal sekresyona titre et (HR’ye değil)', st.atropinized?'#8fe3bf':'#d9a441'); }
    else if(t==='tca'){ var ts=tx.state(); bars=[['QRS (hedef <100 ms)',Math.min(1,(ts.qrs-60)/(160-60)),ts.qrs+' ms',ts.wideQRS?'#e4607a':'#8fe3bf'],['Kan pH',Math.min(1,(ts.pH-7.0)/(7.6-7.0)),ts.pH.toFixed(2),ts.pH>=7.4?'#8fe3bf':'#d9a441'],['Serbest TCA fraksiyonu',ts.freeFraction,(ts.freeFraction*100).toFixed(0)+'%','#7bc5ed']];
      drawBanner(x,L,T,pw,ts.wideQRS?'QRS >100 ms + terminal aVR R → IV NaHCO3':'✓ QRS daraldı (<100 ms)', ts.wideQRS?'#e4607a':'#8fe3bf'); }
    var by=T+40, bh=22, gap=16;
    bars.forEach(function(bar,i){ var yy=by+i*(bh+gap); x.fillStyle='#9fb0c2';x.textAlign='left';x.font='10px '+mono();x.fillText(bar[0],L,yy-4);
      x.fillStyle='rgba(255,255,255,.06)';x.fillRect(L,yy,pw,bh); x.fillStyle=bar[3]; x.fillRect(L,yy,pw*Math.max(0,Math.min(1,bar[1])),bh);
      x.fillStyle='#eaf4fb';x.textAlign='right';x.fillText(bar[2],L+pw-6,yy+15); });
    $('chartBadge1').textContent='';
  }
}
function drawBanner(x,L,T,pw,txt,col){ x.fillStyle='rgba(255,255,255,.03)';x.fillRect(L,T,pw,26); x.fillStyle=col;x.font='11px '+mono();x.textAlign='left';x.fillText(txt,L+6,T+17); }
function drawPK(){ var cv=$('chart1'); var g=setupCanvas(cv),x=g.x,W=g.w,H=g.h; x.clearRect(0,0,W,H);
  var C=CASES[ST.caseId],sim=ST.sim,scale=C.drug.concScale||1; var L=44,R=14,T=16,B=26; var pw=W-L-R,ph=H-T-B;
  var tMax=Math.max(24, sim.t*1.05); var isINR=C.drug.isINR;
  // tüm eksen/bantlar GÖRÜNÜM biriminde (ng/mL, mg/L...); eğri = Ctot*scale ile görünüme çevrilir
  var trajMax=sim.traj.reduce(function(m,p){return Math.max(m,p.Ctot*scale);},0);
  var yMax=isINR?6:Math.max((C.drug.toxLevel||10)*1.2, trajMax*1.12, (C.drug.therHigh||1)*1.5);
  function X(t){return L+pw*(t/tMax);} function Y(v){return T+ph*(1-v/yMax);}
  x.strokeStyle='rgba(255,255,255,.05)';x.lineWidth=1; x.fillStyle='#5a6b80';x.font='9px '+mono();x.textAlign='right';
  for(var gy=0;gy<=5;gy++){ var vv=yMax*gy/5; var yy=Y(vv); x.beginPath();x.moveTo(L,yy);x.lineTo(W-R,yy);x.stroke(); x.fillText((isINR?vv.toFixed(1):vv.toFixed(vv<2?2:vv<20?1:0)),L-4,yy+3); }
  x.textAlign='center'; for(var gx=0;gx<=6;gx++){ var tt=tMax*gx/6; var xx=X(tt); x.fillText(fmtAxisT(tt),xx,H-8); }
  function band(lo,hi,col){ x.fillStyle=col; x.fillRect(L,Y(hi),pw,Y(lo)-Y(hi)); }
  if(!isINR){ band(C.drug.therLow||0,C.drug.therHigh||0,'rgba(123,197,237,.10)'); var txl=Math.min(C.drug.toxLevel||yMax,yMax); x.fillStyle='rgba(228,96,122,.08)'; x.fillRect(L,T,pw,Y(txl)-T);
    x.strokeStyle='rgba(228,96,122,.4)';x.setLineDash([4,3]);x.beginPath();x.moveTo(L,Y(txl));x.lineTo(W-R,Y(txl));x.stroke();x.setLineDash([]);
    // C_total bandı etiketi
    x.fillStyle='rgba(123,197,237,.8)';x.font='8.5px '+mono();x.textAlign='left';x.fillText('C_total terapötik '+C.drug.therLow+'–'+C.drug.therHigh,L+4,Y(C.drug.therHigh)-3);
    // freeDriven (fenitoin): ayrı C_free terapötik bandı (1–2) + etiket
    if(C.drug.freeDriven && C.drug.freeTherLow!=null){ band(C.drug.freeTherLow,C.drug.freeTherHigh,'rgba(217,164,65,.16)');
      x.fillStyle='rgba(217,164,65,.9)';x.fillText('C_free hedef '+C.drug.freeTherLow+'–'+C.drug.freeTherHigh,L+4,Y(C.drug.freeTherHigh)-3); }
  }
  else { band(2,3,'rgba(143,227,191,.10)'); x.fillStyle='rgba(143,227,191,.8)';x.font='8.5px '+mono();x.textAlign='left';x.fillText('INR hedef 2–3',L+4,Y(3)-3); }
  var showCurve=(ST.mode==='explore'||ST.evaluated);
  if(showCurve){ // sürekli eğri(ler)
    function line(key,col,wid,dash){ x.strokeStyle=col;x.lineWidth=wid||1.8;if(dash)x.setLineDash(dash);x.beginPath(); sim.traj.forEach(function(p,i){ var v=(isINR?p.INR:(C.drug.freeDriven&&key==='Cfree'?p.Cfree:p.Ctot)*scale); var px=X(p.t),py=Y(v); i?x.lineTo(px,py):x.moveTo(px,py); }); x.stroke();x.setLineDash([]); }
    if(isINR){ line('INR','#d9a441',2); }
    else { line('Ctot','#7bc5ed',2); if(C.drug.freeDriven)line('Cfree','#d9a441',1.6,[5,3]); }
  }
  // örnek noktaları (her modda görünür)
  sim.samples.forEach(function(sm){ var v=isINR?sm.INR:(C.drug.freeDriven?sm.Cfree:sm.Ctot)*scale; if(C.drug.freeDriven&&!isINR)v=sm.Ctot*scale; var px=X(sm.t),py=Y(v);
    x.fillStyle=sm.flags.length?'#e4607a':'#eaf4fb'; x.beginPath();x.arc(px,py,4,0,2*Math.PI);x.fill(); x.strokeStyle='#0a1120';x.lineWidth=1.5;x.stroke();
    if(sm.flags.length){ x.fillStyle='#e4607a';x.font='8px '+mono();x.textAlign='center';x.fillText('⚠',px,py-7); } });
  $('chartBadge1').textContent=(ST.mode==='exam'&&!ST.evaluated)?('KÖR · '+sim.samples.length+' örnek'):(isINR?('INR '+sim.conc().INR.toFixed(1)):((sim.conc().Ctot*scale).toFixed(2)+' '+C.drug.unit));
}
function drawPD(){ var C=CASES[ST.caseId];
  // chart1: Log[Agonist] → %yanıt (dose-response)
  var cv=$('chart1'),g=setupCanvas(cv),x=g.x,W=g.w,H=g.h; x.clearRect(0,0,W,H); var L=40,R=14,T=16,B=26,pw=W-L-R,ph=H-T-B;
  var logs=[]; for(var e=-3;e<=3;e+=0.1)logs.push(e); // log10 doz
  function X(lg){return L+pw*((lg+3)/6);} function Y(e){return T+ph*(1-e);}
  x.strokeStyle='rgba(255,255,255,.05)';x.fillStyle='#5a6b80';x.font='9px '+mono();
  x.textAlign='right';for(var gy=0;gy<=5;gy++){var yy=Y(gy/5);x.beginPath();x.moveTo(L,yy);x.lineTo(W-R,yy);x.stroke();x.fillText((gy*20)+'%',L-4,yy+3);}
  x.textAlign='center';for(var lg=-3;lg<=3;lg++){var xx=X(lg);x.fillText('1e'+lg,xx,H-8);}
  function curve(fn,col,wid,dash){ x.strokeStyle=col;x.lineWidth=wid||2;if(dash)x.setLineDash(dash);x.beginPath(); logs.forEach(function(lg,i){ var d=Math.pow(10,lg),e=fn(d); var px=X(lg),py=Y(e); i?x.lineTo(px,py):x.moveTo(px,py); }); x.stroke();x.setLineDash([]); }
  if(C.receptor.mode==='competition'){ var f=C.receptor.full,p=C.receptor.partial,rc=ST.recept;
    curve(function(d){ return E.competitionResponse({conc:d,Kd:f.Kd,tau:f.tau},{conc:0,Kd:p.Kd,tau:p.tau}).E; },'#7bc5ed',2); // tam agonist tek
    if(rc.partialOn){ curve(function(d){ return E.competitionResponse({conc:d,Kd:f.Kd,tau:f.tau},{conc:p.conc,Kd:p.Kd,tau:p.tau}).E; },'#e4607a',2); // + parsiyel (düşer)
      var pc=p.tau/(1+p.tau); x.strokeStyle='rgba(217,164,65,.5)';x.setLineDash([3,3]);x.beginPath();x.moveTo(L,Y(pc));x.lineTo(W-R,Y(pc));x.stroke();x.setLineDash([]); x.fillStyle='#d9a441';x.textAlign='left';x.fillText('parsiyel tavan',L+6,Y(pc)-4); }
  } else { var rc2=ST.recept,tau0=C.receptor.tau0;
    curve(function(d){ var tau=tau0; var rho=d/(d+C.receptor.Kd); return (tau*rho)/(1+tau*rho); },'rgba(143,227,191,.5)',1.4,[4,3]); // blok yok (referans)
    curve(function(d){ var tau=tau0*(1-rc2.block); var rho=d/(d+C.receptor.Kd); return (tau*rho)/(1+tau*rho); },'#7bc5ed',2.2); // mevcut blok
  }
  // chart2: kuantal ED50/TD50
  var cv2=$('chart2'),g2=setupCanvas(cv2),x2=g2.x,W2=g2.w,H2=g2.h; x2.clearRect(0,0,W2,H2); var L2=36,R2=12,T2=14,B2=22,pw2=W2-L2-R2,ph2=H2-T2-B2;
  function X2(lg){return L2+pw2*((lg+3)/6);} function Y2(e){return T2+ph2*(1-e);}
  x2.strokeStyle='rgba(255,255,255,.05)';for(var gy2=0;gy2<=4;gy2++){var yy2=Y2(gy2/4);x2.beginPath();x2.moveTo(L2,yy2);x2.lineTo(W2-R2,yy2);x2.stroke();}
  function cum(fn,col){ x2.strokeStyle=col;x2.lineWidth=2;x2.beginPath(); for(var lg=-3;lg<=3;lg+=0.1){var d=Math.pow(10,lg);var e=fn(d);var px=X2(lg),py=Y2(e);lg===-3?x2.moveTo(px,py):x2.lineTo(px,py);} x2.stroke(); }
  var ed50=1,td50=30; cum(function(d){return d/(d+ed50);},'#8fe3bf'); cum(function(d){return d/(d+td50);},'#e4607a');
  x2.fillStyle='#8fe3bf';x2.font='9px '+mono();x2.textAlign='left';x2.fillText('Etki (ED50)',L2+4,T2+10); x2.fillStyle='#e4607a';x2.fillText('Toksisite (TD50)',L2+4,T2+22);
  x2.fillStyle='#b9c7d8';x2.fillText('Terapötik İndeks TD50/ED50 = '+(td50/ed50).toFixed(0),L2+4,H2-8);
}
function mono(){return "'JetBrains Mono',monospace";}
function fmtT(h){ if(h<24)return h.toFixed(1)+' s'; return (h/24).toFixed(1)+' gün'; }
function fmtDur(h){ if(h<1)return Math.round(h*60)+' dk'; if(h<48)return h.toFixed(h<10?1:0)+' s'; return (h/24).toFixed(1)+' gün'; }
function fmtAxisT(h){ if(h<48)return Math.round(h)+'s'; return Math.round(h/24)+'g'; }

/* ========================= KANIT LİSTESİ ========================= */
function renderEvidence(){ var box=$('evList'),C=CASES[ST.caseId];
  if(ST.bench===2){ var t=C.tox.type,tx=ST.tox,rows=[];
    if(t==='paracetamol'){ if(tx.sampleRec)rows.push(['Düzey @'+tx.sampleRec.tH.toFixed(1)+'s',tx.sampleRec.level+' mcg/mL'+(tx.sampleRec.flags.length?' ⚠':'')]); if(tx.charcoalGiven!=null)rows.push(['Aktif kömür','@'+tx.charcoalGiven.toFixed(1)+'s']); if(tx.nacTime!=null)rows.push(['NAC','@'+tx.nacTime.toFixed(1)+'s']); }
    else if(t==='salicylate'){ var s=tx.state(); rows.push(['İdrar pH',s.urinePH.toFixed(1)]); rows.push(['Serum K+',s.serumK.toFixed(1)]); rows.push(['Klirens','×'+s.clearanceFactor.toFixed(1)]); }
    else if(t==='organophosphate'){ var st=tx.state(); rows.push(['Atropin',st.atropinized?'yeterli':'yetersiz']); rows.push(['Aged AChE',(st.aged*100).toFixed(0)+'%']); if(st.pamGiven)rows.push(['2-PAM','verildi']); }
    else if(t==='tca'){ var ts=tx.state(); rows.push(['QRS',ts.qrs+' ms']); rows.push(['NaHCO3',ts.bicarbBoluses+' bolus']); rows.push(['pH',ts.pH.toFixed(2)]); }
    box.innerHTML=rows.length?rows.map(function(r){return '<div class="ev"><span>'+r[0]+'</span><span class="em">'+r[1]+'</span></div>';}).join(''):'<div style="font-size:10px;color:var(--ink-3)">Kararlarını uygula; durum burada izlenir.</div>'; return; }
  if(ST.bench!==1){ box.innerHTML='<div class="ev"><span>Reseptör tezgâhı</span><span class="em">canlı eğri</span></div>'; return; }
  var sm=ST.sim.samples; if(!sm.length){ box.innerHTML='<div style="font-size:10px;color:var(--ink-3)">Henüz TDM alınmadı. 🩸 ile kan düzeyi örnekle.</div>'; return; }
  box.innerHTML=sm.map(function(s,i){ var disp=C.drug.isINR?('INR '+s.INR.toFixed(1)):((C.drug.concScale?s.Ctot*C.drug.concScale:s.Ctot).toFixed(2)+' '+C.drug.unit);
    return '<div class="ev'+(s.flags.length?' flagged':'')+'"><span>t='+fmtAxisT(s.t)+' (Δ'+fmtDur(s.sinceDose)+')</span><span class="em">'+disp+(s.flags.length?' ⚠':'')+'</span></div>'; }).join('');
}
function renderLegend(){ var C=CASES[ST.caseId];
  if(ST.bench===2){ var t=C.tox.type;
    $('legend').innerHTML = t==='paracetamol' ? '<div class="li"><span class="sw" style="background:#e4607a"></span>Rumack-Matthew tedavi çizgisi</div><div class="li"><span class="sw" style="background:#e4607a;opacity:.4"></span><4s geçersiz bölge</div><div class="li"><span class="sw" style="background:#8fe3bf;border-radius:50%;width:8px;height:8px"></span>çizgi altı örnek</div><div class="li"><span class="sw" style="background:#d9a441;border-radius:50%;width:8px;height:8px"></span>çizgi üstü (NAC)</div>'
      : '<div class="li">Durum çubukları: <span style="color:#8fe3bf">hedef</span> · <span style="color:#d9a441">ara</span> · <span style="color:#e4607a">kritik</span></div>';
    return; }
  if(ST.bench===1){ var h='<div class="li"><span class="sw" style="background:#7bc5ed"></span>C_total</div>'; if(C.drug.freeDriven)h+='<div class="li"><span class="sw" style="background:#d9a441"></span>C_free</div>'; if(C.drug.isINR)h='<div class="li"><span class="sw" style="background:#d9a441"></span>INR</div>'; h+='<div class="li"><span class="sw" style="background:rgba(143,227,191,.6)"></span>Terapötik bant</div><div class="li"><span class="sw" style="background:rgba(228,96,122,.6)"></span>Toksik eşik</div><div class="li"><span class="sw" style="background:#eaf4fb;border-radius:50%;width:8px;height:8px"></span>TDM örneği</div>';
    $('legend').innerHTML=h; }
  else { $('legend').innerHTML='<div class="li"><span class="sw" style="background:#7bc5ed"></span>Mevcut yanıt</div><div class="li"><span class="sw" style="background:#e4607a"></span>Değişen eğri</div><div class="li"><span class="sw" style="background:rgba(143,227,191,.6)"></span>Referans / ED50</div>'; }
}

/* ========================= JÜRİ + DEBRIEF ========================= */
function evaluate(){ ST.evaluated=true; ST.step=4; var C=CASES[ST.caseId]; var cats=[],flags=[];
  if(ST.bench===1){ gradeBench1(C,cats,flags); } else if(ST.bench===2){ gradeBench2(C,cats,flags); } else { gradeBench3(C,cats,flags); }
  var overall=Math.round(cats.reduce(function(a,c){return a+c.v*c.w;},0));
  var col=function(v){return v>=75?'#8fe3bf':v>=55?'#d9a441':'#e88b92';};
  var h='<div style="display:flex;justify-content:space-between;align-items:baseline"><b>Farmakoloji Karnesi</b><span class="mono" style="font-size:20px;font-weight:700;color:'+col(overall)+'">'+overall+'</span></div>';
  cats.forEach(function(c){ var cc=col(c.v); h+='<div class="jury-cat"><div class="row"><span>'+c.n+' ('+Math.round(c.w*100)+'%)</span><span class="mono" style="color:'+cc+'">'+c.v+'</span></div><div class="bar"><span style="width:'+c.v+'%;background:'+cc+'"></span></div>'+(c.note?'<div style="font-size:9.5px;color:var(--ink-3);margin-top:3px">'+c.note+'</div>':'')+'</div>'; });
  flags.forEach(function(f){ h+='<div class="flag '+f.cls+'">'+f.t+'</div>'; }); if(!flags.length)h+='<div class="flag green">Güvenli ve kanıta dayalı yönetim.</div>';
  h+='<div class="flag green" style="background:rgba(123,197,237,.08);border-color:rgba(123,197,237,.3);color:#cfe3f2">📚 '+C.teach+'</div>';
  $('juryOut').innerHTML=h; renderAll();
  if(ST.bench===1&&ST.mode==='exam'){ toast('Gizli gerçek eğri açıldı — aldığın örnekleri gerçek C(t) üzerine kıyasla','good'); }
}
function gradeBench1(C,cats,flags){ var sim=ST.sim,c=sim.conc(),sm=sim.samples; var tox=toxFraction();
  var inTher; if(C.drug.isINR)inTher=(c.INR>=2&&c.INR<=3); else if(C.drug.freeDriven)inTher=(c.Cfree>=(C.drug.freeTherLow||1)&&c.Cfree<=(C.drug.freeTherHigh||2)); else { var v=c.Ctot*(C.drug.concScale||1); inTher=(v>=C.drug.therLow&&v<=C.drug.therHigh); }
  // 1 Terapötik hedef & doz matematiği %30
  var v1=inTher?95:(tox>0.5?25:55); cats.push({n:'Terapötik Hedef & Doz Matematiği',w:0.30,v:v1,note:inTher?'hedef bantta':(tox>0.5?'toksik aralıkta':'hedef dışı')});
  // 2 TDM örnekleme zamanlaması & kanıt %25
  var distFlag=sm.some(function(s){return s.flags.indexOf('DISTRIBUTION_PHASE_SAMPLING')>=0;});
  var tooMany=sm.length>4; var noSample=sm.length===0;
  var v2=100; var sNote=sm.length+' örnek'; if(distFlag){v2-=45;flags.push({cls:'red',t:'DISTRIBUTION_PHASE_SAMPLING — dağılım fazında (erken) örnek aldın; düzey sahte yüksek. Digoksinde ≥6–8 s sonra örnekle.'});}
  if(tooMany){v2-=20;sNote+=' (fazla kan alımı)';flags.push({cls:'amber',t:'Gereksiz sık kan alımı kaynak israfı.'});}
  if(noSample&&C.drug.therHigh-C.drug.therLow<C.drug.therHigh){v2-=30;flags.push({cls:'amber',t:'Dar terapötik indeksli ilacı hiç TDM almadan yönettin.'});}
  v2=Math.max(0,v2); cats.push({n:'TDM Örnekleme Zamanlaması & Kanıt',w:0.25,v:v2,note:sNote});
  // 3 etkileşim & özel popülasyon %25
  var v3=70,iNote='';
  if(C.code==='FEN'&&c.Cfree>(C.drug.toxFree||2.5)){ v3=20; flags.push({cls:'red',t:'UNBOUND_PHENYTOIN_TRAP — toplam düzeye bakıp doz artırdın; serbest fenitoin toksik. Hipoalbüminemide serbest düzeyi değerlendir.'}); }
  else if(C.code==='FEN'){ v3=92; iNote='serbest düzey doğru değerlendirildi'; }
  if(C.code==='LIT'){ if(sim.hasComed('liBlock')&&tox>0.4){ v3=25; flags.push({cls:'red',t:'LI_CLEARANCE_DROP — tiyazid+NSAİİ lityum klirensini düşürdü; eşlik ilacı kesmeden toksisite gelişti.'});} else if(!sim.hasComed('liBlock')||tox<0.4){ v3=88; iNote='triple-whammy etkileşimi yönetildi'; } }
  if(C.code==='WAR'){ if(tox>0.5){ v3=25; flags.push({cls:'red',t:'INDUCTION_WITHDRAWAL_LAG — rifampisin kesildikten sonra doz azaltılmadı; gecikmeli INR yükselişi + kanama.'});} else { v3=85; iNote='CYP indüksiyon/geri çekilme zamanlaması yönetildi'; } }
  if(C.code==='GEN'){ var usedAdj=true; v3=inTher?88:35; iNote=inTher?'AdjBW ile dozlandı':'gerçek kiloyla aşırı doz riski'; if(!inTher&&tox>0.5)flags.push({cls:'red',t:'OBESE_TBW_DOSING — hidrofilik aminoglikoziti gerçek kiloyla dozladın; toksik pik/vadi (nefro/ototoksisite).'}); }
  if(C.code==='VAN'){ var loadOk=ST.regimen.loadMg>=1500; v3=loadOk?88:40; iNote=loadOk?'yükleme Vd’ye göre korundu':'yükleme dozu gereksiz azaltıldı'; if(!loadOk)flags.push({cls:'amber',t:'PRE_STEADY_STATE_ERROR / yükleme — yükleme dozu Vd’ye bağlıdır, böbrek yetmezliğinde azaltılmaz.'}); }
  cats.push({n:'İlaç Etkileşimi & Özel Popülasyon',w:0.25,v:v3,note:iNote});
  // 4 hasta güvenliği %20
  var v4=tox>0.6?20:tox>0.3?55:92; cats.push({n:'Hasta Güvenliği & Toksisiteden Kaçınma',w:0.20,v:v4,note:tox>0.3?'toksisite bulguları':'güvenli aralık'});
}
function gradeBench2(C,cats,flags){ var t=C.tox.type,tx=ST.tox;
  if(t==='paracetamol'){ var r=tx.sampleRec, o=tx.outcome();
    var preHit=(r&&r.flags.indexOf('PRE_4H_NOMOGRAM_TRAP')>=0);
    cats.push({n:'Nomogram Yorumu & Zamanlama',w:0.30,v:(r&&r.valid)?90:(preHit?20:50),note:r?('örnek '+r.tH.toFixed(1)+'s '+(r.valid?'(geçerli)':'(<4s geçersiz)')):'örnek alınmadı'});
    cats.push({n:'Antidot Kararı (NAC/kömür)',w:0.30,v:o.protectedLiver?95:30,note:o.nacGiven?('NAC @ '+tx.nacTime.toFixed(1)+'s'+(o.nacInWindow?' ✓':' geç')):'NAC verilmedi'});
    cats.push({n:'Sonuç (Hepatoproteksiyon)',w:0.25,v:o.hepatotox?15:95,note:o.hepatotox?('AST '+o.AST+' INR '+o.INR.toFixed(1)):'karaciğer korundu'});
    cats.push({n:'Güvenli Disposisyon',w:0.15,v:o.hepatotox?20:88,note:''});
    if(preHit)flags.push({cls:'red',t:'PRE_4H_NOMOGRAM_TRAP — <4. saat düzeyi nomogramda geçersizdir; çizgi altı diye NAC’siz taburcu etme.'});
    if(o.hepatotox)flags.push({cls:'red',t:'Fulminan hepatotoksisite: zamanında NAC verilmedi (AST/ALT>3000, INR↑).'});
    if(o.protectedLiver)flags.push({cls:'green',t:'İlk 8 saatte NAC → tam hepatoproteksiyon.'});
  }
  else if(t==='salicylate'){ var s=tx.state();
    cats.push({n:'Asit-Baz Tanıma',w:0.25,v:85,note:s.acidBase});
    cats.push({n:'Elektrolit Düzeltme (K+)',w:0.25,v:s.serumK>=3.5?92:30,note:'K+ '+s.serumK.toFixed(1)});
    cats.push({n:'İyon Tuzağı / Alkalinizasyon',w:0.30,v:(s.urinePH>=7.5)?92:(s.paradoxicalAciduria?20:55),note:'idrar pH '+s.urinePH.toFixed(1)+' · klirens ×'+s.clearanceFactor.toFixed(1)});
    cats.push({n:'Hasta Güvenliği',w:0.20,v:s.paradoxicalAciduria?30:85,note:''});
    if(s.paradoxicalAciduria)flags.push({cls:'red',t:'PARADOXICAL_ACIDURIA — hipokalemi düzeltilmeden NaHCO3; böbrek K+ tutmak için H+ atar, idrar kalevileşmez, iyon tuzağı çalışmaz.'});
    else if(s.urinePH>=7.5)flags.push({cls:'green',t:'K+ düzeltilip alkalinizasyon → idrar pH 7.8, renal salisilat klirensi ~4–5 kat.'});
  }
  else if(t==='organophosphate'){ var st=tx.state();
    cats.push({n:'Atropinizasyon (sekresyona titre)',w:0.30,v:st.atropinized?92:35,note:'sekresyon '+(st.secretions*100).toFixed(0)+'% · HR '+st.hr});
    cats.push({n:'Pralidoksim Zamanlaması',w:0.30,v:(st.pamGiven&&st.aged<0.4)?90:(st.pamGiven?25:50),note:st.pamGiven?('yaşlanmış '+(st.aged*100).toFixed(0)+'%'):'2-PAM verilmedi'});
    cats.push({n:'Nikotinik Kurtarma (Kas Gücü)',w:0.25,v:Math.round(st.muscleStrength*100),note:'kas gücü '+(st.muscleStrength*100).toFixed(0)+'%'});
    cats.push({n:'Hasta Güvenliği',w:0.15,v:st.atropinized?85:40,note:''});
    if(!st.atropinized)flags.push({cls:'amber',t:'Atropini KALP HIZINA göre kesme — bronşiyal sekresyon kuruyana dek titre et (akciğerler ıslakken HR 115 olması atropin yetersizliğini dışlamaz).'});
    if(st.pamGiven&&st.aged>0.5)flags.push({cls:'red',t:'AGING_KINETICS — 2-PAM geç verildi; fosforile AChE yaşlandı (geri dönüşsüz), reaktivasyon etkisiz.'});
    else if(st.pamGiven&&st.aged<0.4)flags.push({cls:'green',t:'Erken 2-PAM → yaşlanmamış enzim reaktive oldu, nikotinik güç geri döndü.'});
  }
  else if(t==='tca'){ var ts=tx.state();
    cats.push({n:'EKG Yorumu (QRS/aVR)',w:0.30,v:ts.bicarbBoluses>0?88:55,note:'QRS '+ts.qrs+' ms'+(ts.terminalRaVR?' + terminal aVR R':'')});
    cats.push({n:'NaHCO3 Tedavisi',w:0.35,v:(!ts.wideQRS)?95:(ts.bicarbBoluses>0?55:25),note:ts.bicarbBoluses+' bolus · pH '+ts.pH.toFixed(2)});
    cats.push({n:'Hemodinamik Stabilizasyon',w:0.20,v:ts.hypotension?30:85,note:''});
    cats.push({n:'Mekanizma Kavrayışı',w:0.15,v:ts.bicarbBoluses>0?85:60,note:'Na yükü + alkaloz → serbest TCA↓'});
    if(!ts.wideQRS&&ts.bicarbBoluses>0)flags.push({cls:'green',t:'IV NaHCO3 → QRS <100 ms’ye daraldı (Na yükü + serbest TCA azalması).'});
    else if(ts.wideQRS)flags.push({cls:'amber',t:'QRS hâlâ geniş (>100 ms) — ek NaHCO3 bolusu gerekli.'});
  }
}
function gradeBench3(C,cats,flags){ var rc=ST.recept;
  if(C.receptor.mode==='competition'){ var f=C.receptor.full,p=C.receptor.partial; var eFull=E.competitionResponse({conc:f.conc,Kd:f.Kd,tau:f.tau},{conc:0,Kd:p.Kd,tau:p.tau}).E; var eBoth=E.competitionResponse({conc:f.conc,Kd:f.Kd,tau:f.tau},{conc:p.conc,Kd:p.Kd,tau:p.tau}).E;
    var understood=rc.partialOn && eBoth<eFull*0.75; cats.push({n:'Reseptör Mekanizması & Yanıt',w:0.35,v:understood?92:50,note:'tam yanıt '+(eFull*100).toFixed(0)+'% → +parsiyel '+(eBoth*100).toFixed(0)+'%'});
    cats.push({n:'Klinik Korelasyon (Presipite Yoksunluk)',w:0.35,v:understood?90:55,note:understood?'parsiyel agonist net sinyali tavanına indirdi':'parsiyel agonist eklenmedi'});
    cats.push({n:'Güvenli Geçiş Kararı',w:0.30,v:understood?85:60,note:'kronik tam agonistte geçiş zamanlaması kritik'});
    if(understood)flags.push({cls:'amber',t:'Presipite yoksunluk gösterildi: yüksek afiniteli parsiyel agonist tam agonisti kovup yanıtı kendi tavanına çekti.'});
  } else { var tau0=C.receptor.tau0; var emaxLow=Math.max.apply(null,E.spareReceptorCurve([0.1,1,10,100,1000],C.receptor.Kd,tau0,Math.min(rc.block,0.5)));
    var emaxNow=Math.max.apply(null,E.spareReceptorCurve([0.1,1,10,100,1000],C.receptor.Kd,tau0,rc.block));
    var sawReserve=rc.spare>0.3; var sawCrash=rc.block>0.9;
    cats.push({n:'Yedek Reseptör Kavramı',w:0.35,v:sawReserve?90:55,note:'yedek '+(rc.spare*100).toFixed(0)+'% · blok '+(rc.block*100).toFixed(0)+'% → Emax '+(emaxNow*100).toFixed(0)+'%'});
    cats.push({n:'İrreversibl Antagonist Davranışı',w:0.35,v:(sawReserve&&sawCrash)?90:(rc.block>0.2?70:50),note:(emaxNow>=0.95?'düşük blokta Emax korunuyor (sağa kayma)':'yedekler tükendi, Emax düşüyor')});
    cats.push({n:'Eğri Okuma & Yorum',w:0.30,v:sawReserve?85:60,note:'TD50/ED50 ve Emax ilişkisi'});
    if(sawReserve&&sawCrash)flags.push({cls:'amber',t:'Yedek reseptör yıldızı: düşük blokta Emax korunup sağa kaydı, yüksek blokta yedekler tükenince Emax çöktü.'});
  }
}

/* ========================= BENCH / MODE ========================= */
function setBench(n){ ST.bench=n; // o tezgâha ait ilk vakayı yükle
  var first=Object.keys(CASES).map(Number).filter(function(id){return CASES[id].bench===n;})[0]; loadCase(first); }
function setMode(m){ ST.mode=m; ST.evaluated=false; [].forEach.call($('modeSeg').children,function(b){b.classList.toggle('on',b.dataset.mode===m);}); resetJury(); renderAll(); toast(m==='exam'?'TUS/Sınav: sürekli eğri gizli, yalnız TDM örnekleri görünür':'Keşfet: canlı eğri açık','') ; }

/* ========================= TEST API ========================= */
window.PHARMA={
  setBench:function(n){ setBench(n); return ST.bench; },
  bench:function(){ return ST.bench; },
  setMode:function(m){ setMode(m); return ST.mode; }, mode:function(){ return ST.mode; },
  loadCase:function(id){ loadCase(id); return ST.caseId; }, caseId:function(){ return ST.caseId; },
  cases:function(){ return Object.keys(CASES).map(Number); },
  curveHidden:function(){ return !$('blindTag').classList.contains('hidden'); },
  sim:function(){ return ST.sim; }, conc:function(){ return ST.sim?ST.sim.conc():null; },
  setRegimen:function(o){ Object.assign(ST.regimen,o||{}); return ST.regimen; },
  applyDose:function(){ var r=ST.regimen,d=r.maintMg; if(r.route==='bolus')ST.sim.giveBolus(d); else if(r.route==='infuse'){ST.sim.startInfusion(d,1);ST.sim.advance(1);} else ST.sim.giveOral(d); renderAll(); return ST.sim.conc(); },
  giveBolus:function(mg){ ST.sim.giveBolus(mg); renderAll(); return ST.sim.conc(); },
  giveOral:function(mg){ ST.sim.giveOral(mg); renderAll(); return ST.sim.conc(); },
  infuse:function(rate,dur){ ST.sim.startInfusion(rate,dur); return true; },
  advance:function(h){ ST.sim.advance(h); renderAll(); return ST.sim.conc(); },
  setComed:function(kind,on){ ST.sim.setComed(kind,on!==false); return ST.sim.comeds.slice(); },
  clearance:function(){ return ST.sim.clearanceNow(); },
  drawTDM:function(){ var r=ST.sim.drawTDM(); renderAll(); return r; },
  samples:function(){ return ST.sim.samples.slice(); },
  trajectory:function(){ return ST.sim.traj.slice(); },
  setReceptor:function(o){ Object.assign(ST.recept,o||{}); renderAll(); return ST.recept; },
  competition:function(full,partial){ return E.competitionResponse(full,partial); },
  spareCurve:function(doses,Kd,tau0,q){ return E.spareReceptorCurve(doses,Kd,tau0,q); },
  evaluate:function(){ evaluate(); return {overall:+($('juryOut').querySelector('.mono')?$('juryOut').querySelector('.mono').textContent:0)}; },
  juryText:function(){ return $('juryOut').innerText; },
  // --- Tezgâh 2 toksikoloji ---
  tox:function(){ return ST.tox; },
  toxState:function(){ return ST.tox&&ST.tox.state?ST.tox.state():null; },
  toxAdvance:function(h){ ST.toxT+=h; if(ST.tox.advance)ST.tox.advance(h); renderAll(); return ST.toxT; },
  setToxT:function(h){ ST.toxT=h; renderAll(); return ST.toxT; },
  apapSample:function(h){ if(h!=null)ST.toxT=h; var r=ST.tox.sample(ST.toxT); renderAll(); return r; },
  apapNAC:function(h){ if(h!=null)ST.toxT=h; var r=ST.tox.giveNAC(ST.toxT); renderAll(); return r; },
  apapCharcoal:function(h){ if(h!=null)ST.toxT=h; var r=ST.tox.giveCharcoal(ST.toxT); renderAll(); return r; },
  apapOutcome:function(){ return ST.tox.outcome(); },
  salBicarb:function(){ var r=ST.tox.giveBicarb(); renderAll(); return ST.tox.state(); },
  salCorrectK:function(){ ST.tox.correctK(); renderAll(); return ST.tox.state(); },
  opAtropine:function(d){ var r=ST.tox.giveAtropine(d); renderAll(); return ST.tox.state(); },
  opPralidoxime:function(){ var r=ST.tox.givePralidoxime(); renderAll(); return r; },
  tcaBicarb:function(){ var r=ST.tox.giveBicarb(); renderAll(); return ST.tox.state(); },
  rumackLine:function(h){ return TX.rumackLine(h); },
  _eng:E, _tox:TX, _st:ST
};
// Kapı 6 öz-test
window.__selfTest=function(){ var checks=[],ok=function(n,c){checks.push({n:n,ok:!!c});};
  try{
    // RK4 steady-state
    var sim=new E.PKSim({patient:{weight:70,age:50,cr:1,sex:'E',alb:4.4},drug:{Vc:50,CLhep:5,ka:0,F:0,crclRef:100}}); sim.startInfusion(10,1e6); var thalf=Math.LN2/(5/50); sim.advance(thalf);
    ok('RK4 1·t½ ≈ %50', Math.abs(sim.conc().Ctot-1.0)<0.01);
    // fenitoin Winter-Tozer
    function ss(alb){ var s=new E.PKSim({patient:{weight:70,age:45,cr:1,sex:'E',alb:alb},drug:{mm:true,boundHighly:true,freeDriven:true,Vmax:22,Km:0.6,fu0:0.1,albRef:4.4,Vc:45,ka:0,F:0}}); s.startInfusion(12,1e6); s.advance(240); return s.conc(); }
    var n=ss(4.4),l=ss(2.1); ok('hipoalbüminemi C_total↓ C_free korunur', l.Ctot<n.Ctot*0.8 && Math.abs(l.Cfree-n.Cfree)/n.Cfree<0.05);
    // digoksin distribution flag
    var ds=new E.PKSim({patient:{weight:70,age:65,cr:1,sex:'E',alb:4.4},drug:{Vc:40,Vp:360,k12:2,k21:0.25,CLren0:7,ka:0,F:0,distHours:6.5}}); ds.giveBolus(0.5); ds.advance(1.5); var dr=ds.drawTDM();
    ok('digoksin 1.5s DISTRIBUTION_PHASE_SAMPLING', dr.flags.indexOf('DISTRIBUTION_PHASE_SAMPLING')>=0);
    // receptor spare
    var lo=Math.max.apply(null,E.spareReceptorCurve([0.1,1,10,100,1000],1,40,0.5)), hi=Math.max.apply(null,E.spareReceptorCurve([0.1,1,10,100,1000],1,40,0.97));
    ok('yedek reseptör Emax korunur/çöker', lo>=0.95 && hi<0.8);
    // partial agonist
    var pf=E.competitionResponse({conc:200,Kd:1,tau:12},{conc:0,Kd:0.01,tau:0.6}).E, pb=E.competitionResponse({conc:200,Kd:1,tau:12},{conc:200,Kd:0.01,tau:0.6}).E;
    ok('parsiyel agonist presipite yoksunluk', pf>0.9 && pb<pf*0.6);
  }catch(e){ return {hook:true,pass:false,error:String(e).slice(0,140),checks:checks}; }
  var pass=checks.every(function(c){return c.ok;});
  return {hook:true,module:'Pharma',pass:pass,total:checks.length,failed:checks.filter(function(c){return !c.ok;}).map(function(c){return c.n;})};
};

/* ========================= BAŞLAT ========================= */
[].forEach.call($('benchtabs').children,function(b){ b.onclick=function(){ setBench(+b.dataset.bench); }; });
[].forEach.call($('modeSeg').children,function(b){ b.onclick=function(){ setMode(b.dataset.mode); }; });
$('homeBtn').onclick=function(){ location.href='index.html'; };
window.addEventListener('resize',function(){ draw(); });
loadCase(1);
/* Case Chain senkronu: ?chain=1&case=<id> → doğrudan ilgili farmakoloji vakası/tezgâhı */
try{ var _q=new URLSearchParams(location.search); if(_q.get('chain')==='1'){ var _c=parseInt(_q.get('case'),10); if(_c&&CASES[_c]) loadCase(_c); } }catch(e){}
window.PHARMA_READY=true;
})();
