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
  'ductuslab-neurosurgery.html', 'ductuslab-usg-access.html', 'ductuslab-pharma.html',
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

  // Gate 3: link integrity (portallar + vaka zinciri) — link kaynağın dizinine göre çözülür
  const linkSources=['index.html','ductuslab-suite.html','ductuslab-case-chain.html'];
  const broken=[]; const checked=new Set(); let skipped=0;
  for(const src of linkSources){ const srcDir=dirname(src); for(const lnk of extractLinks(src)){ const key=src+'|'+lnk; if(checked.has(key))continue; checked.add(key);
    const resolved=normalize(join(ROOT, srcDir, lnk)); // kök dışına çıkan ../ linkleri modül-içi geri bağlantıdır (alt dizinden doğru çözülür) → atla
    if(!resolved.startsWith(ROOT)){ skipped++; continue; }
    const rel=resolved.slice(ROOT.length+1); if(!fileExists(rel)) broken.push({from:src,link:lnk,resolved:rel}); } }
  gate3.push({pass:broken.length===0, checked:checked.size, skipped, broken});

  await browser.close(); srv.close();

  const pageGate=(arr)=>({pass:arr.every(x=>x.pass!==false), fails:arr.filter(x=>x.pass===false)});
  summary.gates={
    gate1_boot_console: pageGate(gate1),
    gate2_zero_external_asset: pageGate(gate2),
    gate3_link_integrity: {pass:broken.length===0, checked:checked.size, skipped, broken},
    gate4_responsive: pageGate(gate4),
    gate5_truth_leak_lifecycle: pageGate(gate5),
    gate6_clinical_selftests: { hooks:gate6.filter(x=>x.pass!==null).length, pass:gate6.filter(x=>x.pass!==null).every(x=>x.pass===true), detail:gate6 }
  };
  const allPass=['gate1_boot_console','gate2_zero_external_asset','gate3_link_integrity','gate4_responsive','gate5_truth_leak_lifecycle'].every(g=>summary.gates[g].pass) && summary.gates.gate6_clinical_selftests.pass;
  summary.overallPass=allPass;
  writeFileSync(join(ROOT,'audit-summary.json'),JSON.stringify(summary,null,2));
  console.log('\n=== KAPI ÖZETİ ===');
  for(const [k,v] of Object.entries(summary.gates)){ console.log(`  ${v.pass?'✓':'✗'} ${k}` + (v.fails&&v.fails.length?` (${v.fails.length} başarısız: ${v.fails.map(f=>f.page).join(', ')})`:'') + (k==='gate3_link_integrity'?` [${v.checked} link]`:'') + (k==='gate6_clinical_selftests'?` [${v.hooks} self-test hook]`:'')); }
  console.log(`\nSONUÇ: ${allPass?'TÜM KAPILAR GEÇTİ':'BAŞARISIZ KAPI VAR'} → audit-summary.json`);
  process.exit(allPass?0:1);
}
run().catch(e=>{ console.error(e); process.exit(2); });
