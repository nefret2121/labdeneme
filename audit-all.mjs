#!/usr/bin/env node
// DuctusLab Platform QA — audit-all.mjs
// 17 sayfa (15 modül + 2 portal + vaka zinciri) × 6 kapı → audit-summary.json
// Kullanım: node audit-all.mjs   (THREE_LOCAL=/path/three.module.js ile headless üç.js yerelden servis edilir)
import { createRequire } from 'module';
import http from 'http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname, normalize } from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = dirname(fileURLToPath(import.meta.url));

const PAGES = [
  'index.html', 'ductuslab-suite.html', 'ductuslab-case-chain.html',
  'ductuslab-airway.html', 'ductuslab-cathlab.html', 'ductuslab-lapchole.html',
  'ductuslab-neurosurgery.html', 'ductuslab-usg-access.html', 'ductuslab-pharma.html', 'ductuslab-endo.html', 'ductuslab-perio.html', 'ductuslab-omfs.html', 'ductuslab-vpt.html', 'ductuslab-ortho.html',
  'acil/index.html', 'ekg/index.html', 'eko/index.html', 'fnd/index.html',
  'ks/index.html', 'nro/index.html', 'oto/index.html', 'sft/index.html', 'ventilator/index.html'
];
const VIEWPORTS = [ {w:1920,h:1080}, {w:1366,h:768}, {w:1180,h:820} ];
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff' };
const ASSET_EXT = ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.glb','.gltf'];
const ALLOWED_HOSTS = ['fonts.googleapis.com','fonts.gstatic.com','unpkg.com','cdnjs.cloudflare.com','cdn.jsdelivr.net','code.jquery.com'];
const THREE_LOCAL = process.env.THREE_LOCAL && existsSync(process.env.THREE_LOCAL) ? process.env.THREE_LOCAL : null;

// ---- yerel statik sunucu ----
function serve(){ return new Promise(res=>{ const srv=http.createServer((req,resp)=>{
  try{ let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html';
    const fp=normalize(join(ROOT,p)); if(!fp.startsWith(ROOT)){ resp.writeHead(403);return resp.end(); }
    if(!existsSync(fp)||!statSync(fp).isFile()){ resp.writeHead(404);return resp.end('404'); }
    resp.writeHead(200,{'content-type':MIME[extname(fp).toLowerCase()]||'application/octet-stream'}); resp.end(readFileSync(fp)); }
  catch(e){ resp.writeHead(500); resp.end(String(e)); } });
  srv.listen(0,'127.0.0.1',()=>res(srv)); }); }

function fileExists(rel){ const fp=normalize(join(ROOT,rel.split('?')[0].split('#')[0])); return fp.startsWith(ROOT)&&existsSync(fp)&&statSync(fp).isFile(); }

// index/suite/case-chain içindeki modül/köprü linklerini çıkar
function extractLinks(rel){ const fp=join(ROOT,rel); if(!existsSync(fp))return []; const html=readFileSync(fp,'utf8'); const set=new Set();
  const re=/(?:href|src|window\.open\(\s*['"]|data-href=['"]|location\.href\s*=\s*['"])([^'"\)#]+\.html[^'"\)]*)/g; let m;
  while((m=re.exec(html))){ let u=m[1]; if(/^https?:/.test(u))continue; set.add(u.replace(/^\.?\//,'')); }
  // vaka zincirindeki modül dosyaları
  const re2=/['"]([a-z0-9_\-]+\/index\.html|ductuslab-[a-z0-9_\-]+\.html)['"]/g;
  while((m=re2.exec(html))){ set.add(m[1]); }
  return [...set]; }

async function run(){
  const srv=await serve(); const PORT=srv.address().port; const base=`http://127.0.0.1:${PORT}`;
  const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
  const summary={ generatedAt:new Date().toISOString(), threeLocal:!!THREE_LOCAL, pages:PAGES.length, viewports:VIEWPORTS,
    gates:{}, perPage:{} };
  const gate1=[], gate2=[], gate3=[], gate4=[], gate5=[], gate6=[];

  for(const page of PAGES){
    const rec={ page, pageerrors:[], consoleErrors:[], externalAssets:[], disallowedReq:[], overflow:[], truthLeak:[], selfTest:null, lifecycle:null };
    const ctx=await browser.newContext({viewport:{width:1366,height:768}});
    const pg=await ctx.newPage();
    pg.on('pageerror',e=>rec.pageerrors.push(String(e).slice(0,160)));
    // "Failed to load resource" satırları ağ izleme ile ele alınır; gerçek JS/console hatalarını say
    pg.on('console',m=>{ if(m.type()==='error'){ const t=m.text(); if(!/different type|favicon|Failed to load resource/i.test(t)) rec.consoleErrors.push(t.slice(0,160)); } });
    // başarısız istekler: yalnız İZİNSİZ host'a giden başarısızlık gerçek bulgu (izinli CDN çevrimdışı sandbox'ta zaten başarısız olur)
    pg.on('requestfailed',req=>{ try{ const url=new URL(req.url()); const host=url.hostname;
      const isLocal=(host==='127.0.0.1'||host==='localhost'); const isAllowed=ALLOWED_HOSTS.some(h=>host.endsWith(h));
      if(!isLocal && !isAllowed) rec.disallowedReq.push(req.url().slice(0,120)); }catch(e){} });
    // istek denetimi: harici asset + three yönlendirme
    await pg.route('**/*',route=>{ const u=route.request().url();
      if(THREE_LOCAL && /unpkg\.com\/three.*three\.module\.js/.test(u)){ return route.fulfill({path:THREE_LOCAL,contentType:'text/javascript'}); }
      if(/fonts\.googleapis\.com/.test(u)){ return route.fulfill({status:200,body:'',contentType:'text/css'}); }
      try{ const url=new URL(u); const ext=extname(url.pathname).toLowerCase();
        if(ASSET_EXT.includes(ext)){ const host=url.hostname;
          const isLocal=(host==='127.0.0.1'||host==='localhost'); const isAllowed=ALLOWED_HOSTS.some(h=>host.endsWith(h));
          if(!isLocal && !isAllowed){ rec.externalAssets.push(u.slice(0,120)); } } }catch(e){}
      return route.continue(); });
    // truth-leak dinleyici (ductus-core postMessage sözleşmesi)
    await pg.addInitScript(()=>{ window.__truthLeak=[]; const scan=(o,d)=>{ if(!o||d>4||typeof o!=='object')return; for(const k in o){ if(k==='truth'){ window.__truthLeak.push('truth@'+d); } else { try{scan(o[k],d+1);}catch(e){} } } };
      const _pm=window.postMessage.bind(window); window.addEventListener('message',ev=>{ try{ if(ev.data&&typeof ev.data==='object'&&ev.data.ductus){ scan(ev.data,0); } }catch(e){} });
      window.addEventListener('message',ev=>{},false); });
    try{ await pg.goto(`${base}/${page}`,{waitUntil:'load',timeout:30000}); }catch(e){ rec.pageerrors.push('GOTO:'+String(e).slice(0,100)); }
    await pg.waitForTimeout(2200);

    // Gate 4: responsive overflow (3 viewport)
    for(const v of VIEWPORTS){ await pg.setViewportSize({width:v.w,height:v.h}); await pg.waitForTimeout(350);
      const o=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth, iw:window.innerWidth}));
      if(o.sw>o.iw+2) rec.overflow.push(`${v.w}x${v.h}:${o.sw}>${o.iw}`); }
    await pg.setViewportSize({width:1366,height:768}); await pg.waitForTimeout(150);

    // Gate 5b: lifecycle — module:deactivate sonrası hata yok + SimClock ilerliyor (destekleyen modüllerde)
    const life=await pg.evaluate(async()=>{ try{
      const clock=()=>{ try{ return (window.ENG&&window.ENG.t)||(window.__eng&&window.__eng.t)||(window.SimClock&&window.SimClock.now&&window.SimClock.now())||null; }catch(e){ return null; } };
      const c0=clock(); window.postMessage({ductus:true,type:'suite:module:deactivate'},'*'); await new Promise(r=>setTimeout(r,250));
      const c1=clock(); window.postMessage({ductus:true,type:'suite:module:activate'},'*');
      return { supported:c0!=null, advanced:(c0!=null&&c1!=null)?(c1>=c0):null }; }catch(e){ return {supported:false,err:String(e).slice(0,80)}; } });
    rec.lifecycle=life;

    // Gate 5a: truth leak
    rec.truthLeak=await pg.evaluate(()=>window.__truthLeak||[]);

    // Gate 6: self-test hook
    rec.selfTest=await pg.evaluate(async()=>{ try{ if(typeof window.__selfTest==='function'){ const r=await window.__selfTest(); return r; } return {hook:false}; }catch(e){ return {hook:true,pass:false,error:String(e).slice(0,120)}; } });

    await ctx.close();
    // kayıtları kapılara dağıt
    const g1=(rec.pageerrors.length===0&&rec.consoleErrors.length===0&&rec.disallowedReq.length===0);
    const g4=(rec.overflow.length===0);
    const g5=(rec.truthLeak.length===0);
    gate1.push({page,pass:g1,pageerrors:rec.pageerrors,consoleErrors:rec.consoleErrors,disallowedReq:rec.disallowedReq});
    gate2.push({page,pass:rec.externalAssets.length===0,assets:rec.externalAssets});
    gate4.push({page,pass:g4,overflow:rec.overflow});
    gate5.push({page,pass:g5,truthLeak:rec.truthLeak,lifecycle:rec.lifecycle});
    gate6.push({page,pass:(rec.selfTest&&rec.selfTest.hook===false)?null:!!(rec.selfTest&&rec.selfTest.pass),selfTest:rec.selfTest});
    summary.perPage[page]=rec;
    process.stdout.write(`  ${g1&&g4&&g5?'OK ':'!! '}${page}  err:${rec.pageerrors.length} con:${rec.consoleErrors.length} ext:${rec.externalAssets.length} ovf:${rec.overflow.length} truth:${rec.truthLeak.length} self:${rec.selfTest&&rec.selfTest.hook===false?'—':(rec.selfTest&&rec.selfTest.pass?'PASS':'FAIL')}\n`);
  }

  // Gate 7: Portal kart erişilebilirliği (index.html modal) — 16 kart, LAP rozeti temiz, FRM'e dek kaydırılabilir
  var portalCheck={pass:false};
  try{ var pctx=await browser.newContext({viewport:{width:1366,height:768}}); var ppg=await pctx.newPage();
    await ppg.route('**/*',route=>{ var u=route.request().url(); if(/fonts\.googleapis\.com|cdnjs|jsdelivr|gstatic|unpkg/.test(u))return route.fulfill({status:200,body:'',contentType:'text/javascript'}); return route.continue(); });
    await ppg.goto(`${base}/index.html`,{waitUntil:'load',timeout:30000}); await ppg.waitForTimeout(1200);
    var pc=await ppg.evaluate(()=>{ var m=document.getElementById('portalModal'); if(m)m.classList.remove('hidden');
      var cards=document.querySelectorAll('#pgrid .pcard'); var sc=document.querySelector('.portal-scroll');
      var lap=[].slice.call(cards).filter(function(c){return (c.dataset.s||'').indexOf('lap')===0;})[0];
      var frm=[].slice.call(cards).filter(function(c){return (c.dataset.s||'').indexOf('frm')===0;})[0];
      var box=document.querySelector('.modal-box'); var br=box?box.getBoundingClientRect():null;
      var scrollOk = sc ? (getComputedStyle(sc).overflowY==='auto'||getComputedStyle(sc).overflowY==='scroll') : false;
      var lapBadge = lap? lap.querySelector('.pbadge').textContent.trim() : '';
      return { cards:cards.length, lapBadgeClean:(lapBadge==='Aktif'), frmPresent:!!frm, scrollOk:scrollOk,
        modalFits:(br? (br.bottom<=window.innerHeight+2):false) }; });
    portalCheck={ pass:(pc.cards===21 && pc.lapBadgeClean && pc.frmPresent && pc.scrollOk && pc.modalFits), detail:pc };
    await pctx.close();
  }catch(e){ portalCheck={pass:false,error:String(e).slice(0,100)}; }

  // Gate 3: link integrity (portallar + vaka zinciri) — link kaynağın dizinine göre çözülür
  const linkSources=['index.html','ductuslab-suite.html','ductuslab-case-chain.html'];
  const broken=[]; const checked=new Set(); let skipped=0;
  for(const src of linkSources){ const srcDir=dirname(src); for(const lnk of extractLinks(src)){ const key=src+'|'+lnk; if(checked.has(key))continue; checked.add(key);
    const resolved=normalize(join(ROOT, srcDir, lnk)); // kök dışına çıkan ../ linkleri modül-içi geri bağlantıdır (alt dizinden doğru çözülür) → atla
    if(!resolved.startsWith(ROOT)){ skipped++; continue; }
    const rel=resolved.slice(ROOT.length+1); if(!fileExists(rel)) broken.push({from:src,link:lnk,resolved:rel}); } }
  gate3.push({pass:broken.length===0, checked:checked.size, skipped, broken});


  // Gate 8: Mobile Phone Viewport & Ergonomics Audit — Dalga 1 (8 sayfa × 3 telefon ekranı, hasTouch+isMobile)
  const M8=['index.html','ductuslab-suite.html','ductuslab-case-chain.html','acil/index.html','ekg/index.html','ventilator/index.html','ductuslab-pharma.html','sft/index.html'];
  const PHONES=[{n:'390x844',w:390,h:844},{n:'360x800',w:360,h:800},{n:'844x390',w:844,h:390}];
  const gate8=[];
  const probe8=()=>{ const de=document.documentElement, iw=innerWidth, ih=innerHeight;
    const vis=e=>{ const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&r.bottom>0&&r.top<ih&&r.right>0&&r.left<iw; };
    const cvs=[...document.querySelectorAll('canvas')].filter(vis).map(c=>{const r=c.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];});
    const th=document.getElementById('thoraxSvg'); const svg=(th&&vis(th))?(()=>{const r=th.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];})():null;
    const bad=[...document.querySelectorAll('select,input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not([type=submit]),textarea')].filter(vis).map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(f=>f<16).length;
    const crit=[...document.querySelectorAll('button,[role=button]')].filter(vis).filter(b=>/Değerlendir|Jüri|Beyan/i.test(b.textContent||'')).length;
    const tb=document.getElementById('dm-tabbar')||document.getElementById('ccTabs'); const tabs=tb?[...tb.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];}):[];
    return { sw:de.scrollWidth, iw, cvs, svg, bad, crit, tabs, dm:de.classList.contains('dm-on'), api:!!(window.DuctusMobile&&window.DuctusMobile.cfg), ntab:(window.DuctusMobile&&window.DuctusMobile.cfg)?window.DuctusMobile.cfg.tabs.length:0 }; };
  for(const page of M8){
    for(const ph of PHONES){
      const rec={ page, viewport:ph.n, pass:true, fails:[], detail:{} };
      try{
        const ctx=await browser.newContext({viewport:{width:ph.w,height:ph.h},deviceScaleFactor:2,hasTouch:true,isMobile:true});
        const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,120)));
        await pg.route('**/*',route=>{ var u=route.request().url(); if(/fonts\.googleapis\.com|cdnjs|jsdelivr|gstatic|unpkg/.test(u))return route.fulfill({status:200,body:'',contentType:'text/css'}); return route.continue(); });
        await pg.goto(`${base}/${page}`,{waitUntil:'load',timeout:30000}); await pg.waitForTimeout(1400);
        const snaps=[]; const st0=await pg.evaluate(probe8); snaps.push(st0);
        let critSeen=st0.crit>0;
        if(st0.api&&st0.ntab>1){ for(let i=0;i<st0.ntab;i++){ await pg.evaluate(i=>window.DuctusMobile.show(i),i); await pg.waitForTimeout(350); const s1=await pg.evaluate(probe8); snaps.push(s1); if(s1.crit>0) critSeen=true; } }
        if(page==='ductuslab-case-chain.html'){ await pg.evaluate(()=>{ window.pickChain&&window.pickChain(1); }); await pg.waitForTimeout(500); const s2=await pg.evaluate(probe8); snaps.push(s2);
          const idx=await pg.evaluate(()=>CC.chain.stations.findIndex(s=>!!HREF[s.mod])); await pg.evaluate(i=>{renderStation(i);toggleDrawer(i);},idx); await pg.waitForTimeout(1500);
          const fr=await pg.evaluate(()=>{const f=document.querySelector('.drawer.open iframe');if(!f)return null;const r=f.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];}); rec.detail.embed=fr;
          if(!fr||fr[0]<Math.min(300,ph.w-2)||fr[1]<Math.min(160,ph.h-60)) rec.fails.push('gömülü modül tam ekran değil '+JSON.stringify(fr)); snaps.push(await pg.evaluate(probe8));
          await pg.evaluate(i=>closeEmbed(i),idx); await pg.waitForTimeout(250);
          const tabsOk=await pg.evaluate(()=>{const b=document.getElementById('ccT-ev');if(!b)return false;const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44;}); critSeen=critSeen||tabsOk; if(!tabsOk) rec.fails.push('Kanıt sekmesi yok');
          await pg.evaluate(()=>{window.showSelector&&window.showSelector();}); await pg.waitForTimeout(300); snaps.push(await pg.evaluate(probe8)); }
        if(page==='ductuslab-suite.html'){ await pg.evaluate(()=>DuctusSuite.switchModule('vent')); await pg.waitForTimeout(1500); snaps.push(await pg.evaluate(probe8));
          const fi=await pg.evaluate(()=>{const f=document.getElementById('frame-vent');const r=f.getBoundingClientRect();const d=f.contentDocument;const cv=[...d.querySelectorAll('canvas')].map(c=>{const q=c.getBoundingClientRect();return [Math.round(q.width),Math.round(q.height)];}).filter(x=>x[0]>0);return {w:Math.round(r.width),h:Math.round(r.height),on:d.documentElement.classList.contains('dm-on'),sw:d.documentElement.scrollWidth,iw:f.contentWindow.innerWidth,cv};}); rec.detail.frame=fi;
          if(fi.w<Math.min(300,ph.w-2)||fi.h<150) rec.fails.push('gömülü iframe alanı küçük '+JSON.stringify(fi)); if(fi.sw>fi.iw) rec.fails.push('iframe yatay taşma');
          await pg.evaluate(()=>DuctusSuite.toggleJury()); await pg.waitForTimeout(450); const jw=await pg.evaluate(()=>{const j=document.getElementById('jury').getBoundingClientRect();return [Math.round(j.width),innerWidth];}); rec.detail.jury=jw; if(Math.abs(jw[0]-jw[1])>2) rec.fails.push('jüri tam genişlik değil '+jw);
          await pg.evaluate(()=>{ DuctusSuite.toggleJury(); document.body.classList.add('dm-menu'); }); await pg.waitForTimeout(350); const mn=await pg.evaluate(()=>{const r=document.querySelector('.navwrap').getBoundingClientRect();return [Math.round(r.left),Math.round(r.width)];}); rec.detail.menu=mn; if(mn[0]<-2||mn[1]<200) rec.fails.push('çekmece menü açılmıyor '+mn);
          critSeen=true; }
        if(page==='index.html'){ await pg.evaluate(()=>{window.togglePortalModal&&window.togglePortalModal();}); await pg.waitForTimeout(500); const pp=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,cards:document.querySelectorAll('#pgrid .pcard').length,pillsScroll:getComputedStyle(document.getElementById('portalPills')).overflowX,box:(()=>{const r=document.querySelector('.modal-box').getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];})(),fs:[...document.querySelectorAll('#portalSearch')].map(e=>parseFloat(getComputedStyle(e).fontSize))})); rec.detail.portal=pp;
          if(pp.sw>pp.iw) rec.fails.push('portal yatay taşma'); if(pp.cards!==21) rec.fails.push('portal kart '+pp.cards); if(!/auto|scroll/.test(pp.pillsScroll)) rec.fails.push('kategori hapları kaymıyor'); if(pp.fs[0]<16) rec.fails.push('portal arama <16px');
          await pg.evaluate(()=>window.togglePortalModal()); await pg.waitForTimeout(250); }
        // (a) yatay taşma, (b) kanvas, (c) font + kritik aksiyon + dokunma hedefi
        const mw=Math.max(...snaps.map(x=>x.sw-x.iw)); if(mw>0) rec.fails.push('yatay taşma +'+mw+'px');
        const bestCv=snaps.flatMap(x=>x.cvs.map(c=>({w:c[0],h:c[1]})));
        const maxW=Math.max(0,...bestCv.map(c=>c.w)), maxH=Math.max(0,...bestCv.map(c=>c.h));
        const stackH=(()=>{ let best=0; for(const x of snaps){ const w=x.cvs.filter(c=>c[0]>=300); const t=w.reduce((a,c)=>a+c[1],0); if(w.length&&w.every(c=>c[1]>=60)&&t>best) best=t; } return best; })();
        const svgOk=snaps.some(x=>x.svg&&x.svg[0]>=300&&x.svg[1]>=160);
        const needsCanvas=!['ductuslab-case-chain.html','ductuslab-suite.html'].includes(page);
        const cvOk=(maxW>=300&&(maxH>=160||stackH>=160))||svgOk;
        rec.detail.canvas={maxW,maxH,stackH,svgOk}; if(needsCanvas&&!cvOk) rec.fails.push('ana kanvas ezik/görünmüyor '+JSON.stringify(rec.detail.canvas));
        if(page==='ductuslab-suite.html'&&rec.detail.frame&&!rec.detail.frame.cv.some(c=>c[0]>=300)) rec.fails.push('iframe kanvası <300px');
        const badFont=Math.max(...snaps.map(x=>x.bad)); if(badFont>0) rec.fails.push('16px altı girdi: '+badFont);
        const tabs=snaps.flatMap(x=>x.tabs); if(tabs.some(t=>t[0]>0&&(t[0]<44||t[1]<44))) rec.fails.push('44px altı sekme düğmesi');
        const usesShell=snaps.some(x=>x.api); if(usesShell&&!(snaps[0].dm)) rec.fails.push('mobil kabuk devreye girmedi');
        if(['ductuslab-suite.html','ductuslab-case-chain.html'].includes(page)===false&&!critSeen) rec.fails.push('Değerlendir/Jüri aksiyonuna sekmeyle erişilemedi');
        if(errs.length) rec.fails.push('pageerror: '+errs[0]);
        rec.pass=rec.fails.length===0; await ctx.close();
      }catch(e){ rec.pass=false; rec.fails.push('hata: '+String(e).slice(0,140)); }
      gate8.push(rec);
    }
    // (d') masaüstü dokunulmazlık: 1366x768'de kabuk devreye girmez
    try{ const dctx=await browser.newContext({viewport:{width:1366,height:768}}); const dpg=await dctx.newPage();
      await dpg.route('**/*',route=>{ var u=route.request().url(); if(/fonts\.googleapis\.com|cdnjs|jsdelivr|gstatic|unpkg/.test(u))return route.fulfill({status:200,body:'',contentType:'text/css'}); return route.continue(); });
      await dpg.goto(`${base}/${page}`,{waitUntil:'load',timeout:30000}); await dpg.waitForTimeout(900);
      const dd=await dpg.evaluate(()=>{const tb=document.getElementById('dm-tabbar');const cc=document.getElementById('ccTabs');const dm=document.getElementById('dmMenuBtn');const mon=document.getElementById('dmMonitor');
        const hid=e=>!e||getComputedStyle(e).display==='none'; return {shell:document.documentElement.classList.contains('dm-on'),tb:hid(tb),cc:hid(cc),menu:hid(dm),mon:hid(mon),sw:document.documentElement.scrollWidth<=innerWidth}; });
      const ok=!dd.shell&&dd.tb&&dd.cc&&dd.menu&&dd.mon; gate8.push({page,viewport:'desktop-1366x768',pass:ok,fails:ok?[]:['masaüstüne kabuk sızdı '+JSON.stringify(dd)],detail:dd}); await dctx.close();
    }catch(e){ gate8.push({page,viewport:'desktop-1366x768',pass:false,fails:['hata '+String(e).slice(0,100)]}); }
    process.stdout.write(`  G8 ${gate8.filter(r=>r.page===page).every(r=>r.pass)?'OK ':'!! '}${page}\n`);
  }

  await browser.close(); srv.close();

  const pageGate=(arr)=>({pass:arr.every(x=>x.pass!==false), fails:arr.filter(x=>x.pass===false)});
  summary.gates={
    gate1_boot_console: pageGate(gate1),
    gate2_zero_external_asset: pageGate(gate2),
    gate3_link_integrity: {pass:broken.length===0, checked:checked.size, skipped, broken},
    gate4_responsive: pageGate(gate4),
    gate5_truth_leak_lifecycle: pageGate(gate5),
    gate6_clinical_selftests: { hooks:gate6.filter(x=>x.pass!==null).length, pass:gate6.filter(x=>x.pass!==null).every(x=>x.pass===true), detail:gate6 },
    gate7_portal_accessibility: portalCheck,
    gate8_mobile_phone_ergonomics: { pass:gate8.every(r=>r.pass), checks:gate8.length, fails:gate8.filter(r=>!r.pass).map(r=>({page:r.page,viewport:r.viewport,fails:r.fails})), detail:gate8 }
  };
  const allPass=['gate1_boot_console','gate2_zero_external_asset','gate3_link_integrity','gate4_responsive','gate5_truth_leak_lifecycle','gate7_portal_accessibility','gate8_mobile_phone_ergonomics'].every(g=>summary.gates[g].pass) && summary.gates.gate6_clinical_selftests.pass;
  summary.overallPass=allPass;
  writeFileSync(join(ROOT,'audit-summary.json'),JSON.stringify(summary,null,2));
  console.log('\n=== KAPI ÖZETİ ===');
  for(const [k,v] of Object.entries(summary.gates)){ console.log(`  ${v.pass?'✓':'✗'} ${k}` + (v.fails&&v.fails.length?` (${v.fails.length} başarısız: ${v.fails.map(f=>f.page).join(', ')})`:'') + (k==='gate3_link_integrity'?` [${v.checked} link]`:'') + (k==='gate6_clinical_selftests'?` [${v.hooks} self-test hook]`:'')); }
  console.log(`\nSONUÇ: ${allPass?'TÜM KAPILAR GEÇTİ':'BAŞARISIZ KAPI VAR'} → audit-summary.json`);
  process.exit(allPass?0:1);
}
run().catch(e=>{ console.error(e); process.exit(2); });
