/* =====================================================================
 * DuctusLab Mobile Shell v1.0 — Split-Stage motoru (sıfır bağımlılık)
 * Kullanım:  DuctusMobile.init({ header:'header', stage:'#monitor', stageH:42,
 *             tabs:[{id:'ctl',icon:'🎛️',label:'Kontroller',sel:['#a','.b']}, ...4 adet] })
 * Telefonda (<=900px) sahne üstte sabit, paneller sekmeye göre alt çekmecede; masaüstüne dokunmaz.
 * ===================================================================== */
(function(root){
  'use strict';
  var doc=root.document, MQ='(max-width:900px)';
  var DM={ active:false, cfg:null, tab:0, version:'1.0' };
  var marked=[], created=[], ro=null, mql=null, mobs=[];

  function qa(sel,ctx){ var out=[]; (Array.isArray(sel)?sel:[sel]).forEach(function(s){ if(!s) return; [].forEach.call((ctx||doc).querySelectorAll(s),function(e){ if(out.indexOf(e)<0) out.push(e); }); }); return out; }
  function mark(el,cls){ if(!el.classList.contains(cls)){ el.classList.add(cls); marked.push([el,cls]); } }
  function ensureViewport(){ var m=doc.querySelector('meta[name=viewport]'); if(!m){ m=doc.createElement('meta'); m.name='viewport'; doc.head.appendChild(m); }
    var c='width=device-width, initial-scale=1, viewport-fit=cover'; if(m.getAttribute('content')!==c) m.setAttribute('content',c); }
  function fireResize(){ try{ root.dispatchEvent(new Event('resize')); }catch(e){} }
  var rq=0; function fireSoon(){ cancelAnimationFrame(rq); rq=requestAnimationFrame(function(){ rq=requestAnimationFrame(fireResize); }); }

  function setVars(){
    var h=doc.querySelector('.dm-hdr'); var h1h=h?Math.ceil(h.getBoundingClientRect().height):46; var acc=h1h;
    doc.documentElement.style.setProperty('--dm-h1',h1h+'px');
    [].forEach.call(doc.querySelectorAll('.dm-hdr2'),function(e){ e.style.top=acc+'px'; acc+=Math.ceil(e.getBoundingClientRect().height); });
    var hh=acc; doc.documentElement.style.setProperty('--dm-hdr',hh+'px');
    var land=root.matchMedia('(orientation:landscape) and (max-height:520px)').matches;
    var sh=(DM.cfg&&DM.cfg.stageH)||42; doc.documentElement.style.setProperty('--dm-stageh',(land?100:sh)+'dvh'.replace('100dvh','100dvh'));
    if(land) doc.documentElement.style.setProperty('--dm-stageh','calc(100dvh - '+hh+'px)');
  }

  function enter(){
    if(DM.active||!DM.cfg) return; var cfg=DM.cfg; ensureViewport();
    if(cfg.beforeEnter) try{ cfg.beforeEnter(DM); }catch(e){}
    var stage=qa(cfg.stage)[0]; if(!stage) return;
    var hdr=qa(cfg.header||'header')[0]; var html=doc.documentElement, body=doc.body;
    html.classList.add('dm-on'); body.classList.add('dm-on');
    if(cfg.accent) html.style.setProperty('--dm-accent',cfg.accent);
    var panes=[]; cfg.tabs.forEach(function(t,i){ qa(t.sel).forEach(function(e){ if(e===stage||stage.contains(e)) return; e.setAttribute('data-dm',i); mark(e,'dm-pane'); panes.push(e); }); });
    mark(stage,'dm-stage'); if(hdr) mark(hdr,'dm-hdr'); var hdrs2=cfg.header2?qa(cfg.header2):[]; var hdr2=hdrs2[0]||null; hdrs2.forEach(function(e){ mark(e,'dm-hdr2'); });
    var keep=qa(cfg.keep||[]); var keepSet=keep.concat(hdr?[hdr]:[]).concat(hdrs2);
    // ata zinciri → display:contents ; kardeşler (sahne/panel/başlık/keep/fixed dışı) → gizle
    var chain=[]; [stage].concat(panes).forEach(function(e){ var p=e.parentElement; while(p&&p!==body&&p!==html){ if(chain.indexOf(p)<0) chain.push(p); p=p.parentElement; } });
    var paneSet=panes.concat([stage]);
    chain.forEach(function(a){ if(paneSet.indexOf(a)>=0) return; mark(a,'dm-flat'); });
    var parents=chain.concat([body]);
    parents.forEach(function(P){ [].forEach.call(P.children,function(c){
      var tg=c.tagName; if(/^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT)$/.test(tg)) return;
      if(c.id==='dm-tabbar') return; if(chain.indexOf(c)>=0||paneSet.indexOf(c)>=0||keepSet.indexOf(c)>=0) return;
      if(keepSet.some(function(k){ return c.contains(k); })) return;
      if(c.hasAttribute('data-dm-keep')) return;
      var pos=root.getComputedStyle(c).position; if(pos==='fixed') return;
      mark(c,'dm-skip'); }); });
    // mini-PiP: köşe kılavuzları küçük + dokununca büyür/küçülür
    (cfg.pips||[]).forEach(function(pp){ qa(pp.sel).forEach(function(el){ mark(el,'dm-pip'); el.setAttribute('data-dmpip','closed');
      var h=function(ev){ var o=el.getAttribute('data-dmpip')==='open'; el.setAttribute('data-dmpip',o?'closed':'open'); el.classList.toggle('dm-pip-open',!o); if(ev) ev.stopPropagation(); fireSoon(); };
      el.__dmPip=h; el.addEventListener('click',h); created.push({parentNode:null,__undo:function(){ el.removeEventListener('click',h); el.removeAttribute('data-dmpip'); el.classList.remove('dm-pip-open'); }}); }); });
    // tam ekran modal / debrief
    (cfg.modals||[]).forEach(function(m){ qa(m.sel).forEach(function(el){ DM.modal(el,m.title,m); }); });
    // büyüt/küçült
    var eb=doc.createElement('button'); eb.className='dm-enlarge'; eb.type='button'; eb.setAttribute('aria-label','Sahneyi büyüt / küçült'); eb.textContent='⛶';
    eb.onclick=function(){ var big=stage.classList.toggle('dm-big'); eb.textContent=big?'⤡':'⛶'; fireSoon(); setTimeout(fireResize,250); };
    stage.appendChild(eb); created.push(eb);
    // sekme çubuğu
    var nav=doc.createElement('nav'); nav.id='dm-tabbar'; nav.setAttribute('role','tablist');
    cfg.tabs.forEach(function(t,i){ var b=doc.createElement('button'); b.type='button'; b.setAttribute('role','tab'); b.setAttribute('data-dmtab',i); b.id='dm-tab-'+(t.id||i);
      b.innerHTML='<span class="ic">'+(t.icon||'')+'</span><span class="lb">'+t.label+'</span><span class="dm-badge"></span>'; b.onclick=function(){ DM.show(i); }; nav.appendChild(b); });
    body.appendChild(nav); created.push(nav);
    DM.active=true; setVars(); DM.show(cfg.start||0,true);
    if(root.ResizeObserver){ ro=new ResizeObserver(function(){ setVars(); fireSoon(); }); ro.observe(stage); if(hdr) ro.observe(hdr); hdrs2.forEach(function(e){ ro.observe(e); }); }
    if(cfg.onEnter) try{ cfg.onEnter(DM); }catch(e){}
    fireSoon(); setTimeout(fireResize,300);
  }
  function leave(){
    if(!DM.active) return; if(ro){ try{ro.disconnect();}catch(e){} ro=null; }
    marked.forEach(function(m){ m[0].classList.remove(m[1]); if(m[1]==='dm-pane') m[0].removeAttribute('data-dm'); }); marked=[];
    created.forEach(function(e){ if(e.__undo) try{ e.__undo(); }catch(x){} else if(e.parentNode) e.parentNode.removeChild(e); }); created=[]; mobs.forEach(function(o){ try{o.disconnect();}catch(x){} }); mobs=[]; [].forEach.call(doc.querySelectorAll('.dm-modal-bar,.dm-d3tabs'),function(e){ e.parentNode&&e.parentNode.removeChild(e); }); [].forEach.call(doc.querySelectorAll('.dm-modal-full,.dm-d3'),function(e){ e.classList.remove('dm-modal-full','dm-d3'); }); [].forEach.call(doc.querySelectorAll('.dm-d3off'),function(e){ e.classList.remove('dm-d3off'); });
    [].forEach.call(doc.querySelectorAll('.dm-off'),function(e){ e.classList.remove('dm-off'); });
    [].forEach.call(doc.querySelectorAll('.dm-big'),function(e){ e.classList.remove('dm-big'); });
    doc.documentElement.classList.remove('dm-on'); doc.body.classList.remove('dm-on');
    ['--dm-hdr','--dm-stageh'].forEach(function(v){ doc.documentElement.style.removeProperty(v); });
    DM.active=false; if(DM.cfg&&DM.cfg.afterLeave) try{ DM.cfg.afterLeave(DM); }catch(e){} if(DM.cfg&&DM.cfg.onLeave) try{ DM.cfg.onLeave(DM); }catch(e){} fireSoon();
  }
  DM.show=function(i,silent){
    if(!DM.active) { DM.tab=i; return; } DM.tab=i;
    [].forEach.call(doc.querySelectorAll('.dm-pane'),function(p){ p.classList.toggle('dm-off',p.getAttribute('data-dm')!==String(i)); });
    [].forEach.call(doc.querySelectorAll('#dm-tabbar button'),function(b){ var on=b.getAttribute('data-dmtab')===String(i); b.classList.toggle('on',on); b.setAttribute('aria-selected',on); });
    if(!silent) root.scrollTo(0,0);
    if(DM.cfg.onTab) try{ DM.cfg.onTab(DM.cfg.tabs[i].id,i); }catch(e){}
    fireSoon();
  };
  DM.showById=function(id){ for(var i=0;i<DM.cfg.tabs.length;i++){ if(DM.cfg.tabs[i].id===id){ DM.show(i); return true; } } return false; };
  DM.badge=function(id,n){ var b=doc.getElementById('dm-tab-'+id); if(!b) return; var e=b.querySelector('.dm-badge'); e.textContent=n||''; e.classList.toggle('show',!!n); };
  DM.state=function(){ return { active:DM.active, tab:DM.tab, tabs:DM.cfg?DM.cfg.tabs.map(function(t){return t.id;}):[] }; };

  // ---- tam ekran modal + ①②③ debrief sekmeleri ----
  function closeOf(el,cfgm){
    if(cfgm&&cfgm.close){ var c=doc.querySelector(cfgm.close); if(c){ c.click(); return; } }
    var btn=[].filter.call(el.querySelectorAll('button'),function(b){ return /^\s*(✕\s*)?(Kapat|Kapa|Close|Tamam)/i.test(b.textContent||'')&&!b.closest('.dm-modal-bar'); })[0];
    if(btn){ btn.click(); return; }
    var host=el.closest('.overlay,#debriefModal,#bailoutModal,[data-dm-overlay]')||el; host.classList.remove('open'); host.style.display='none'; }
  DM.modal=function(el,title,cfgm){ if(!el) return; el.classList.add('dm-modal-full');
    function ensure(){ if(!el.querySelector(':scope > .dm-modal-bar')){ var bar=doc.createElement('div'); bar.className='dm-modal-bar'; bar.innerHTML='<button type="button" class="dm-x" aria-label="Kapat">✕ Kapat</button><span class="dm-ttl"></span>'; bar.querySelector('.dm-ttl').textContent=title||''; bar.querySelector('.dm-x').onclick=function(){ closeOf(el,cfgm); }; el.insertBefore(bar,el.firstChild); }
      if(cfgm&&cfgm.grid){ [].forEach.call(el.querySelectorAll(cfgm.grid),function(g){ DM.tabbedDebrief(g,cfgm.labels); }); } }
    ensure(); if(root.MutationObserver){ var mo=new MutationObserver(function(){ mo.disconnect(); ensure(); mo.observe(el,{childList:true,subtree:true}); }); mo.observe(el,{childList:true,subtree:true}); mobs.push(mo); } };
  DM.tabbedDebrief=function(d3,labels){ if(!d3||d3.querySelector(':scope > .dm-d3tabs')) return; var kids=[].filter.call(d3.children,function(c){return c.nodeType===1;}); if(kids.length<2) return;
    d3.classList.add('dm-d3'); labels=labels||['① Kanıtın','② 3B Gerçek','③ Karne'];
    var strip=doc.createElement('div'); strip.className='dm-d3tabs';
    function sel(k){ kids.forEach(function(c,i){ c.classList.toggle('dm-d3off',i!==k); }); [].forEach.call(strip.children,function(b,i){ b.classList.toggle('on',i===k); }); }
    kids.forEach(function(c,i){ var b=doc.createElement('button'); b.type='button'; b.textContent=labels[i]||('Görünüm '+(i+1)); b.onclick=function(){ sel(i); try{ root.dispatchEvent(new Event('resize')); }catch(e){} }; strip.appendChild(b); });
    d3.insertBefore(strip,d3.firstChild); sel(0); };

  // ---- canlı hasta başı monitörü (ACİL için): EKG / SpO2 pleth / ABP, DPR-keskin, ResizeObserver ----
  DM.liveMonitor=function(cv,get){
    var ctx=cv.getContext('2d'),W=0,H=0,t=0,last=0,buf=[[],[],[]];
    function fit(){ var r=cv.getBoundingClientRect(),d=root.devicePixelRatio||1; if(r.width<2||r.height<2) return; W=Math.round(r.width*d); H=Math.round(r.height*d); if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; } }
    if(root.ResizeObserver) new ResizeObserver(fit).observe(cv); root.addEventListener('resize',fit); fit();
    function qrs(ph){ // 0..1 ECG beat
      var g=function(x,m,s,a){ return a*Math.exp(-Math.pow((x-m)/s,2)); };
      return g(ph,.18,.03,.12)+g(ph,.30,.008,-.15)+g(ph,.325,.010,1)+g(ph,.35,.010,-.25)+g(ph,.58,.05,.28); }
    function frame(ts){ requestAnimationFrame(frame); if(!W||!H) { fit(); return; } var dt=Math.min(.05,(ts-last)/1000||0); last=ts;
      var st=get()||{}, hr=Math.max(30,Math.min(220,st.hr||80)), irr=!!st.irr, wide=!!st.wide, spo2=st.spo2==null?97:st.spo2, sbp=st.sbp||120, dbp=st.dbp||75, sinus=st.sinus!==false;
      t+=dt; var rows=3,rh=H/rows,d=root.devicePixelRatio||1, sp=90*d; var px=Math.max(1,Math.round(sp*dt));
      // faz: zamanla ilerleyen ritim
      var per=60/hr*(irr?(.75+.5*Math.abs(Math.sin(t*1.7))):1); var ph=(t%per)/per;
      var e=sinus?(wide?qrs(ph)*.9+Math.exp(-Math.pow((ph-.4)/.1,2))*.3:qrs(ph)):(Math.sin(t*40)*.06+(((t%per)/per)<.05?.9:0));
      var pp=Math.exp(-Math.pow((ph-.12)/.14,2))+.35*Math.exp(-Math.pow((ph-.42)/.1,2));
      var ab=(dbp+(sbp-dbp)*(Math.exp(-Math.pow((ph-.14)/.07,2))+.18*Math.exp(-Math.pow((ph-.36)/.06,2))+.45*Math.exp(-ph*2.2)*(ph>.14?1:0)));
      var vals=[e,pp*(spo2<90?.5:1),ab]; vals.forEach(function(v,i){ buf[i].push(v); });
      var maxN=Math.ceil(W/Math.max(1,px)); buf.forEach(function(b){ while(b.length>maxN+2) b.shift(); });
      ctx.fillStyle='#04070c'; ctx.fillRect(0,0,W,H);
      var cols=['#59d98e','#6fd2ff','#ff6b6b'],names=['EKG II','SpO₂ pleth','ABP'];
      var scale=[ [rh*.30,rh*.72], [rh*.38,rh*.82], [rh*.0075,rh*.9] ];
      ctx.lineWidth=Math.max(1.6,1.6*d); ctx.lineJoin='round';
      for(var i=0;i<3;i++){ var b=buf[i],y0=i*rh; ctx.strokeStyle='rgba(160,176,196,.1)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,y0+rh); ctx.lineTo(W,y0+rh); ctx.stroke();
        ctx.strokeStyle=cols[i]; ctx.lineWidth=Math.max(1.6,1.6*d); ctx.beginPath(); var n=b.length;
        for(var k=0;k<n;k++){ var x=W-(n-1-k)*px, y; if(i===2) y=y0+rh*.92-(b[k]-30)*rh*.0058; else y=y0+scale[i][1]-b[k]*scale[i][0]*(i===0?1.1:1); k?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.stroke();
        ctx.fillStyle=cols[i]; ctx.font='600 '+Math.round(11*d)+'px system-ui,sans-serif'; ctx.textBaseline='top'; ctx.fillText(names[i],8*d,y0+5*d); }
      ctx.textAlign='right'; ctx.font='700 '+Math.round(20*d)+'px ui-monospace,monospace';
      ctx.fillStyle=cols[0]; ctx.fillText(String(Math.round(hr))+' /dk',W-8*d,5*d);
      ctx.fillStyle=cols[1]; ctx.fillText(Math.round(spo2)+' %',W-8*d,rh+5*d);
      ctx.fillStyle=cols[2]; ctx.fillText(Math.round(sbp)+'/'+Math.round(dbp),W-8*d,2*rh+5*d); ctx.textAlign='left'; }
    requestAnimationFrame(frame); };


  DM.init=function(cfg){
    DM.cfg=cfg; ensureViewport(); if(cfg.page) doc.documentElement.setAttribute('data-dmpage',cfg.page); if(cfg.fam) doc.documentElement.setAttribute('data-dmfam',cfg.fam); mql=root.matchMedia(cfg.mq||MQ);
    function apply(){ if(mql.matches) enter(); else leave(); }
    if(mql.addEventListener) mql.addEventListener('change',apply); else if(mql.addListener) mql.addListener(apply);
    root.addEventListener('orientationchange',function(){ setTimeout(function(){ setVars(); fireSoon(); },120); });
    root.addEventListener('resize',function(){ if(DM.active) setVars(); });
    if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',apply); else apply();
    return DM;
  };
  root.DuctusMobile=DM;
  if(typeof module!=='undefined'&&module.exports) module.exports=DM;
})(typeof window!=='undefined'?window:this);
