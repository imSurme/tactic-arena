// Arkadaşla oyna (PvP): iki tarayıcı WebRTC ile doğrudan bağlanır (PeerJS).
// Ev sahibi (linki paylaşan) oyunu çalıştırır; misafir kart oynama isteği gönderir,
// saniyede 20 kez oyunun anlık durumunu alır ve sahayı ters çevirip kendi takımını altta görür.
const Net=(()=>{
  const PEER_SRC=['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
  const ID_PREFIX='tactic-arena-',CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const PUBLIC_URL='https://imsurme.github.io/tactic-arena/'; // dosyadan açılınca paylaşılacak adres
  const SNAP_EVERY=.05; // saniye
  // Bağlantı: önce cihazlar doğrudan buluşmaya çalışır (STUN). Farklı ağlarda (mobil veri, operatör NAT'ı)
  // bu çoğu zaman olmaz; o zaman trafik bir TURN sunucusu üzerinden aktarılır.
  // TURN bilgileri repoda tutulmaz: yayın sırasında GitHub Secrets'tan js/turn-config.js dosyasına yazılır
  // (.github/workflows/pages.yml). Dosya yoksa sadece STUN kullanılır.
  //   window.TURN_CONFIG={api:'kimlik bilgisi veren adres', servers:[{urls:'turn:sunucu:3478',username:'...',credential:'...'}]}
  const TURN_CFG=window.TURN_CONFIG||{};
  const TURN_API=TURN_CFG.api||'';
  const TURN_SERVERS=Array.isArray(TURN_CFG.servers)?TURN_CFG.servers:[];
  const STUN=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'}];
  let iceCache=null;
  async function iceServers(){
    if(iceCache)return iceCache;
    let turn=TURN_SERVERS.slice();
    if(TURN_API){
      try{
        const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);
        const r=await fetch(TURN_API,{signal:ctl.signal});clearTimeout(t);
        const list=await r.json();if(Array.isArray(list))turn=turn.concat(list);
      }catch(e){}
    }
    iceCache=STUN.concat(turn);
    return iceCache;
  }
  const peerOpts=async()=>({debug:0,config:{iceServers:await iceServers()}});
  let role=null,peer=null,conn=null,code='',sendT=0,events=[],lastSnapAt=0,snap=null;
  // kalp atışı: iki taraf 1,5 sn'de bir ping atar; rakipten 4 sn ses çıkmazsa oyun durur, 15 sn içinde dönmezse maç hükmen kazanılır
  const GONE_AFTER=4000,FORFEIT_AFTER=15;
  let lastHeard=0,gone=null,hiddenAt=0;
  // rakibin oyun döngüsünden geldiğini kanıtlayan mesajlar (arka plandaki sayfa ping'e cevap verebilir ama bunları gönderemez)
  const ALIVE=new Set(['s','pi','ev','card','super','hello','start','rematch']);
  // hızlı kanal: konum güncellemeleri sırasız ve yeniden gönderimsiz gider; biri kaybolursa beklenmez, sonraki kullanılır
  let fast=null,snapN=0,lastN=-1,buf=[],offMin=null,pingMs=null,pingT=0,offs=[],delay=120,renderT=null;
  // misafir ekranı ev sahibinin gerisinden çizilir; gecikme ne kadar dalgalanıyorsa tampon o kadar uzun (80-320 ms)
  let readyMe=false,readyThem=false,guestDeck=null,cardLock=0,sentEnd=false;

  // ---------- yardımcılar
  function loadPeer(){
    if(window.Peer)return Promise.resolve();
    let i=0;
    return new Promise((ok,fail)=>{
      const tryNext=()=>{
        if(i>=PEER_SRC.length){fail(new Error('peerjs'));return;}
        const s=document.createElement('script');s.src=PEER_SRC[i++];s.onload=()=>ok();s.onerror=()=>{s.remove();tryNext();};
        document.head.appendChild(s);
      };
      tryNext();
    });
  }
  const newCode=()=>[...Array(6)].map(()=>CODE_CHARS[Math.random()*CODE_CHARS.length|0]).join('');
  function roomLink(){
    const base=location.protocol==='file:'?PUBLIC_URL:location.origin+location.pathname;
    return base+'?oda='+code;
  }
  const r1=v=>Math.round(v*10)/10;
  // misafirin gözünden: saha 180° döner, takımlar yer değiştirir
  const mx=x=>2*CX-x,my=y=>2*CY-y;
  // misafir kendi takımını ev sahibindeki rengiyle (kırmızı) görür, bu yüzden olay renkleri değişmez
  const sc=c=>c;
  const KIT_KEYS=['color','dark','light','trim','gkColor','gkTrim'];
  function swapKits(){const a=teams[0],b=teams[1];for(const k of KIT_KEYS)[a[k],b[k]]=[b[k],a[k]];}
  const send=m=>{if(conn&&conn.open)conn.send(m);};
  const sendFast=m=>{if(fast&&fast.readyState==='open'){try{fast.send(JSON.stringify(m));return true;}catch(e){}}return false;};
  // iki taraf da aynı numarayla kendi kanalını açar (WebRTC "negotiated" kanal: ek sinyal gerekmez)
  function openFast(c){
    let tries=0;
    const go=()=>{
      const pc=c.peerConnection;if(!pc){if(++tries<50)setTimeout(go,100);return;}
      try{fast=pc.createDataChannel('ta-fast',{negotiated:true,id:7,ordered:false,maxRetransmits:0});}catch(e){fast=null;return;}
      fast.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}onData(m);};
    };
    go();
  }
  function pingTick(dt){
    pingT-=dt;if(pingT>0)return;pingT=1.5;
    const m={t:'pi',c:performance.now()};if(!sendFast(m))send(m);
  }
  function keepAlive(p){
    p.on('disconnected',()=>{if(role&&p===peer&&!p.destroyed)setTimeout(()=>{try{if(p===peer&&!p.destroyed&&p.disconnected)p.reconnect();}catch(e){}},800);});
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden||!peer||peer.destroyed)return;
    if(peer.disconnected){try{peer.reconnect();}catch(e){}}
  });
  // WebRTC bağlantısı kurulamazsa (ağlar birbirine ulaşamıyor) beklemeden haber ver
  function watchIce(c,onFail){
    let tries=0;
    const hook=()=>{
      const pc=c.peerConnection;
      if(!pc){if(++tries<50)setTimeout(hook,100);return;}
      pc.addEventListener('iceconnectionstatechange',()=>{if(pc.iceConnectionState==='failed')onFail();});
    };
    hook();
  }
  const emit=e=>{if(role==='host')events.push(e);};

  // ---------- ev sahibi: oyundaki görsel/ses olaylarını misafire aktar
  let hooked=false;
  function hookHost(){
    if(hooked)return;hooked=true;
    const _ft=floatText;floatText=function(x,y,t,c,up){_ft(x,y,t,c,up);emit(['f',r1(x),r1(y),t,c,up||0]);};
    const _bu=burst;burst=function(x,y,c,n,s){_bu(x,y,c,n,s);emit(['b',r1(x),r1(y),c,n,s]);};
    const _ri=ring;ring=function(x,y,c){_ri(x,y,c);emit(['r',r1(x),r1(y),c]);};
    const _co=callOffside;callOffside=function(r,t){_co(r,t);const f=refFx[refFx.length-1];if(f)emit(['ref',f]);};
    const _cf=callFoul;callFoul=function(a,b,o){_cf(a,b,o);const f=refFx[refFx.length-1];if(f)emit(['ref',f]);};
    const _pen=penalty;penalty=function(t){_pen(t);emit(['pen',t.id]);};
    const _go=goal;goal=function(tid){_go(tid);emit(['goal',tid]);};
    const _psu=playSuper;playSuper=function(t,from){const ok=_psu(t,from);if(ok)emit(['play',t.id,t.superKey]);return ok;};
    const _pc=playCard;playCard=function(t,i,from){const k=t.hand[i],ok=_pc(t,i,from);if(ok)emit(['play',t.id,k]);return ok;};
    const _imp=CardFx.impact;CardFx.impact=function(t,k,at){_imp(t,k,at);emit(['imp',t.id,k,r1(at.x),r1(at.y)]);};
    for(const n of ['pass','shot','tackle','save','whistle','whistleEnd','overtime'])
      {const o=Sfx[n];Sfx[n]=function(...a){o.apply(Sfx,a);emit(['sfx',n,...a]);};}
  }
  const ri=Math.round;
  function snapshot(){
    const P=[...teams[0].players,...teams[1].players],b=ball;
    const fxOf=t=>Object.fromEntries(Object.entries(t.fx).filter(([,v])=>v>0).map(([k,v])=>[k,r1(v)]));
    return{t:'s',n:++snapN,ht:ri(performance.now()),st:state,c:r1(clock),ot:overtime?1:0,sc:[teams[0].score,teams[1].score],
      stars:[r1(teams[0].stars),r1(teams[1].stars)],hand:teams[1].hand,next:teams[1].queue[0],fx:[fxOf(teams[0]),fxOf(teams[1])],
      p:P.map(p=>[ri(p.x),ri(p.y),ri(p.fa*100),ri(p.vx),ri(p.vy),(p.stun>0?1:0)|(p.dash>0?2:0)|(p.sprint>0?4:0)]),
      b:[ri(b.x),ri(b.y),r1(b.z||0),ri(b.vx),ri(b.vy),b.owner?P.indexOf(b.owner):-1,b.shot?1:0,b.power?1:0,b.setT>0?1:0,b.kickoff?1:0,
        b.passTo?P.indexOf(b.passTo):-1,b.passTeam?b.passTeam.id:-1,b.passTarget?ri(b.passTarget.x):0,b.passTarget?ri(b.passTarget.y):0],
      su:[teams[0].superUsed?1:0,teams[1].superUsed?1:0]};
  }

  // ---------- misafir: gelen durumu kendi tarafına çevirip uygula
  const localTeam=h=>teams[1-h];
  const localPlayer=idx=>idx<0?null:localTeam(idx<5?0:1).players[idx%5];
  function applyEvent(e){
    const [k]=e;
    if(k==='f')floatText(mx(e[1]),my(e[2]),e[3],sc(e[4]),e[5]||0);
    else if(k==='b')burst(mx(e[1]),my(e[2]),sc(e[3]),e[4],e[5]);
    else if(k==='r')ring(mx(e[1]),my(e[2]),sc(e[3]));
    else if(k==='ref'){const f={...e[1]};if(f.type==='flag'){f.y=my(f.y);f.line=my(f.line);}else{f.x=mx(f.x);f.y=my(f.y);}refFx.push(f);}
    else if(k==='goal')goalFx(1-e[1]);
    else if(k==='pen')banners.push({type:'info',text:'PENALTI!',sub:e[1]===1?'Kaleye vur!':'Kaleci, hazır ol!',color:'#ffe14d',t:0,life:1.6});
    else if(k==='play'){
      if(e[1]===0){const t=teams[1];CardFx.play(t,e[2],null);Sfx.oppCard();oppLog.unshift(e[2]);oppLog.length=Math.min(oppLog.length,3);if(CARDS[e[2]].type==='super')superBanner(false,e[2]);}
    }
    else if(k==='imp')CardFx.impact(localTeam(e[1]),e[2],{x:mx(e[3]),y:my(e[4])});
    else if(k==='sfx'){const n=e[1];if(Sfx[n])Sfx[n](...e.slice(2));if(n==='shot'&&e[2])shake=8;}
  }
  // misafirde gol anı (ev sahibindeki goal() ile aynı görüntü)
  function goalFx(tid){
    const t=teams[tid];shake=12;Crowd.goal(tid);
    for(let i=0;i<70;i++){const c=['#ffc83d','#fff',t.color,t.light,'#d23cff'][i%5];parts.push({x:ball.x,y:ball.y,vx:rnd(-230,230),vy:rnd(-230,230),life:rnd(.9,1.7),t:0,c,s:rnd(2,4.5),sq:true});}
    banners.push({type:'big',text:'GOL!',sub:overtime?'ALTIN GOL!':tid===0?'Harika vuruş!':'Rakip attı',color:t.color,t:0,life:2.2});
    Sfx.goal();
    const el=$('s'+tid);el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
  }
  // gelen görüntü: sırasız kanal olduğu için eskisi gelirse atlanır; saat farkı en az gecikmeli görüntüden ölçülür
  function receiveSnap(s){
    if(s.n<=lastN)return;lastN=s.n;
    const rt=performance.now(),off=rt-s.ht;
    s.rt=rt;buf.push(s);if(buf.length>40)buf.shift();
    offMin=offMin==null?off:Math.min(offMin+.02,off); // en hızlı gelenin gecikmesi; yavaşça yukarı da kayabilir (saat kayması)
    offs.push(off);if(offs.length>60)offs.shift();
    applySnapshot(s);
  }
  function applySnapshot(s){
    const prevState=state,prevOt=overtime,prevClock=clock;
    snap=s;lastSnapAt=performance.now();
    // takımlar: ev sahibinin 1. takımı = misafirin kendi takımı (0)
    teams[0].score=s.sc[1];teams[1].score=s.sc[0];
    teams[0].stars=s.stars[1];teams[1].stars=s.stars[0];
    teams[0].hand=s.hand;teams[0].queue=[s.next];
    teams[0].fx=s.fx[1];teams[1].fx=s.fx[0];
    if(s.su){teams[0].superUsed=!!s.su[1];teams[1].superUsed=!!s.su[0];}
    overtime=!!s.ot;clock=s.c;
    if(s.ev)for(const e of s.ev)applyEvent(e);
    if(s.st!==prevState){
      state=s.st;
      if(state==='play'&&prevState==='goal')ball.trail=[];
      if(state==='end')showPvpEnd(teams[0].score,teams[1].score);
    }
    if(overtime&&!prevOt)banners.push({type:'info',text:'UZATMA',sub:'Altın gol: ilk atan kazanır',color:'#ffc83d',t:0,life:2.2});
    if(!overtime&&prevClock>FAST_TIME&&clock<=FAST_TIME&&!doubleShown){doubleShown=true;banners.push({type:'info',text:'2x YILDIZ',sub:'Son 60 saniye!',color:'#ff8cf0',t:0,life:1.8});}
  }
  // her kare: ekran ev sahibinin INTERP kadar gerisinden çizilir; o ana denk gelen iki görüntü arası doldurulur
  // (görüntü gecikirse en son görüntüden en fazla 0,2 sn ileri tahmin edilir)
  const lerp=(a,b,f)=>a+(b-a)*f;
  const lerpAng=(a,b,f)=>{let d=b-a;d=Math.atan2(Math.sin(d),Math.cos(d));return a+d*f;};
  function ballAt(s){ // görüntüdeki topun yeri (ev sahibi koordinatı); sahibi varsa sahibinin önünde
    const b=s.b;if(b[5]>=0){const q=s.p[b[5]],fa=q[2]/100;return[q[0]+Math.cos(fa)*9,q[1]+Math.sin(fa)*9];}
    return[b[0],b[1]];
  }
  function guestFrame(dt){
    now+=dt;updateFx(dt);pingTick(dt);
    if(!buf.length)return;
    // tampon: son 60 görüntüde gecikmenin %90'lık dalgalanması + bir görüntü aralığı
    const sorted=offs.slice().sort((x,y)=>x-y),jit=sorted.length?sorted[Math.floor(sorted.length*.9)]-sorted[0]:0;
    delay+=(clamp(jit+60,80,320)-delay)*Math.min(1,dt*1.5);
    // çizim zamanı geri gitmez: hedefin gerisindeyse biraz hızlı, önündeyse biraz yavaş akar (en fazla %15); çok saparsa atlar
    const target=performance.now()-offMin-delay;
    if(renderT==null||Math.abs(target-renderT)>600)renderT=target;
    else renderT+=dt*1000*(1+clamp((target-renderT)*.004,-.15,.15));
    const T=renderT;
    let a=buf[0],b2=null;
    for(let i=buf.length-1;i>=0;i--){if(buf[i].ht<=T){a=buf[i];b2=buf[i+1]||null;break;}}
    let f=0,ext=0;
    if(b2){f=Math.min(1,(T-a.ht)/Math.max(1,b2.ht-a.ht));}else{ext=Math.min(.2,Math.max(0,(T-a.ht)/1000));}
    const B=b2||a;
    a.p.forEach((qa,idx)=>{
      const p=localPlayer(idx),qb=B.p[idx];
      let x=lerp(qa[0],qb[0],f),y=lerp(qa[1],qb[1],f);
      if(ext){x+=qa[3]*ext;y+=qa[4]*ext;}
      const tx=mx(x),ty=my(y),k=Math.min(1,dt*22);
      if(Math.hypot(tx-p.x,ty-p.y)>60){p.x=tx;p.y=ty;}else{p.x+=(tx-p.x)*k;p.y+=(ty-p.y)*k;}
      p.vx=-lerp(qa[3],qb[3],f);p.vy=-lerp(qa[4],qb[4],f);
      p.fa=lerpAng(qa[2]/100,qb[2]/100,f)+Math.PI;
      const fl=(f<.5?qa:qb)[5];p.stun=fl&1?1:0;p.dash=fl&2?1:0;p.sprint=fl&4?1:0;
      const v=Math.hypot(p.vx,p.vy);p.anim+=v*dt*.25;
      if(v>48&&Math.random()<dt*4)parts.push({x:p.x+rnd(-3,3),y:p.y+6,vx:-p.vx*.1,vy:-p.vy*.1,life:.4,t:0,c:'rgba(230,255,220,.6)',s:rnd(1,1.8)});
    });
    const sb=(f<.5?a:B).b,ba=ballAt(a),bb=ballAt(B);
    ball.owner=localPlayer(sb[5]);
    let bx=lerp(ba[0],bb[0],f),by=lerp(ba[1],bb[1],f);
    if(ext&&a.b[5]<0){bx+=a.b[3]*ext;by+=a.b[4]*ext;}
    if(ball.owner){const o=ball.owner;ball.x=o.x+Math.cos(o.fa)*9;ball.y=o.y+Math.sin(o.fa)*9;}
    else{const tx=mx(bx),ty=my(by),k=Math.min(1,dt*26);if(Math.hypot(tx-ball.x,ty-ball.y)>70){ball.x=tx;ball.y=ty;}else{ball.x+=(tx-ball.x)*k;ball.y+=(ty-ball.y)*k;}}
    ball.z=lerp(a.b[2],B.b[2],f);ball.vx=-sb[3];ball.vy=-sb[4];ball.shot=!!sb[6];ball.power=!!sb[7];ball.setT=sb[8]?1:0;ball.kickoff=!!sb[9];
    ball.passTo=localPlayer(sb[10]);ball.passTeam=sb[11]<0?null:localTeam(sb[11]);ball.passTarget=sb[10]<0?null:{x:mx(sb[12]),y:my(sb[13])};
    ball.rot+=Math.hypot(ball.vx,ball.vy)*dt*.12;
    ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift();
    // eski görüntüleri at (çizilen andan eski olanların sonuncusu kalsın)
    while(buf.length>2&&buf[1].ht<=T)buf.shift();
    checkPeer();
  }

  // ---------- rakip sessiz kaldı mı?
  function checkPeer(){
    if(!role||!conn||!conn.open||(state!=='play'&&state!=='goal'))return;
    const now0=performance.now();
    if(!gone&&now0-lastHeard>GONE_AFTER)showGone(false);
    if(gone){
      const left=Math.max(0,Math.ceil(FORFEIT_AFTER-(now0-gone.t0)/1000)),el=$('goneLeft');
      if(el&&el.textContent!==String(left))el.textContent=left;
      if(left<=0&&!document.hidden)forfeitWin('Rakip geri dönmedi.');
    }
  }
  function showGone(away){
    gone={t0:performance.now(),away};if(role==='host')paused=true; // ev sahibinde oyun bekler
    showOverlay(`<h2>${away?'RAKİP OYUNDAN ÇIKTI':'RAKİBİN BAĞLANTISI KOPTU'}</h2><p>Bekleniyor… <b id="goneLeft">${FORFEIT_AFTER}</b></p><p class="tip">Dönmezse maçı hükmen kazanırsın.</p><button class="link" id="menu">Maçtan çık</button>`,{menu:()=>{send({t:'bye'});leave();}});
  }
  function peerAway(){if(role&&(state==='play'||state==='goal')&&!(gone&&gone.away))showGone(true);}
  function peerBack(){gone=null;if(role==='host')paused=false;if(state==='play'||state==='goal')hideOverlay();}
  function forfeitLoss(){
    const sc=[teams[0].score,teams[1].score];cleanup();state='end';
    showOverlay(`<h2 style="color:var(--away-l)">KAYBETTİN</h2><p>Maçtan uzun süre ayrıldın; maç hükmen rakibin.</p><div class="big">${sc[0]} – ${sc[1]}</div><button class="cta" id="go">ANA MENÜ</button>`,{go:showMenu});
  }
  // rakip ayrıldı: maç hükmen bizim
  function forfeitWin(why){
    const sc=[teams[0].score,teams[1].score];
    cleanup();state='end';
    showOverlay(`<h2 style="color:var(--gold)">KAZANDIN!</h2><p>${why} Maçı hükmen kazandın.</p><div class="big">${sc[0]} – ${sc[1]}</div><button class="cta" id="go">ANA MENÜ</button>`,{go:showMenu});
  }
  // biz arka plana gidince rakibe hemen haber ver; dönünce "geri geldim" de.
  // 15 sn'den uzun ayrı kaldıysak maç rakibe hükmen gitmiştir: bizde asla "kazandın" çıkmaz
  document.addEventListener('visibilitychange',()=>{
    if(!role||!conn||(state!=='play'&&state!=='goal'))return;
    if(document.hidden){hiddenAt=performance.now();const m={t:'away'};sendFast(m);send(m);return;}
    const away=performance.now()-hiddenAt;
    if(hiddenAt&&away>FORFEIT_AFTER*1000+1000){forfeitLoss();return;}
    hiddenAt=0;lastHeard=performance.now(); // sessizlik bizdendi: rakibi kopmuş sayma
    const m={t:'back'};sendFast(m);send(m);
  });
  // sekme kapanırken ya da sayfadan çıkarken rakibe haber ver (tarayıcı izin verdiği kadar)
  addEventListener('pagehide',()=>{if(role){try{sendFast({t:'bye'});send({t:'bye'});}catch(e){}}});

  // ---------- bağlantı
  function wire(c){
    conn=c;
    c.on('data',onData);
    let opened=false;c.on('open',()=>{opened=true;openFast(c);});
    c.on('close',()=>{if(role&&opened&&conn===c)lost('Rakip maçtan ayrıldı ya da bağlantısı koptu.');});
    c.on('error',()=>{if(role&&opened&&conn===c)lost('Bağlantı hatası oluştu.');});
  }
  function lost(msg){
    // uzun süre arka planda kaldıktan sonra bağlantı kapandıysa: maç hükmen rakibin
    if(hiddenAt&&performance.now()-hiddenAt>FORFEIT_AFTER*1000&&(state==='play'||state==='goal')){forfeitLoss();return;}
    const r=role;cleanup();
    if(r==='host'&&state==='play'){state='end';}
    showOverlay(`<h2>BAĞLANTI KOPTU</h2><p>${msg}</p><button class="cta" id="go">ANA MENÜ</button>`,{go:showMenu});
  }
  function cleanup(){
    role=null;matchCtx=null;
    try{conn&&conn.close();}catch(e){}
    try{peer&&peer.destroy();}catch(e){}
    try{fast&&fast.close();}catch(e){}
    gone=null;hiddenAt=0;
    conn=null;peer=null;fast=null;events=[];snap=null;buf=[];offs=[];renderT=null;lastN=-1;offMin=null;pingMs=null;readyMe=readyThem=false;
    if(location.search.includes('oda='))history.replaceState(null,'',location.pathname);
  }
  function leave(){cleanup();showMenu();}
  function onData(m){
    if(!m||typeof m!=='object')return;
    if(ALIVE.has(m.t)){lastHeard=performance.now();if(gone&&!gone.away)peerBack();}
    if(m.t==='away'){peerAway();return;}
    if(m.t==='back'){lastHeard=performance.now();if(gone)peerBack();return;}
    if(m.t==='pi'){const r={t:'po',c:m.c};if(!sendFast(r))send(r);return;}
    if(m.t==='po'){const rtt=performance.now()-m.c;pingMs=pingMs==null?rtt:pingMs*.7+rtt*.3;return;}
    if(role==='host'){
      if(m.t==='hello'){guestDeck=Array.isArray(m.deck)&&Deck.valid(m.deck)?m.deck:Deck.random();pvpOppSuper=SUPER_KEYS.includes(m.super)?m.super:Deck.randomSuper();beginMatch();}
      else if(m.t==='super'&&state==='play'&&!paused){if(!playSuper(teams[1],null))send({t:'deny'});}
      else if(m.t==='card'&&state==='play'&&!paused){
        if(!playCard(teams[1],m.i,null))send({t:'deny'});
      }
      else if(m.t==='rematch'){readyThem=true;rematchStatus();if(readyMe)beginMatch();}
      else if(m.t==='bye'){if(state==='play'||state==='goal')forfeitWin('Rakip maçtan ayrıldı.');else lost('Rakip maçtan ayrıldı.');}
    }else if(role==='guest'){
      if(m.t==='start')guestBegin(m);
      else if(m.t==='s')receiveSnap(m);
      else if(m.t==='ev'){for(const e of m.ev)applyEvent(e);}
      else if(m.t==='stats')pvpStats=m.s;
      else if(m.t==='deny')Sfx.deny();
      else if(m.t==='rematch'){readyThem=true;rematchStatus();}
      else if(m.t==='bye'){if(state==='play'||state==='goal')forfeitWin('Rakip maçtan ayrıldı.');else lost('Rakip maçtan ayrıldı.');}
    }
  }
  function netError(err){
    const t=err&&err.type,r=role,c=code;
    const msg=t==='peer-unavailable'?'Bu oda bulunamadı. Arkadaşının oda ekranı açık kalmalı; link eskiyse yeni oda kurmasını iste.'
      :t==='network'||t==='server-error'||t==='socket-error'?'Eşleştirme sunucusuna ulaşılamadı. İnternet bağlantını kontrol et.'
      :t==='browser-incompatible'?'Bu tarayıcı arkadaş maçını desteklemiyor. Chrome ya da Safari ile dene.'
      :t==='ice'?"Cihazlarınız birbirine ulaşamadı. Farklı ağlarda (ör. biri mobil veride) bu olabilir; ikiniz aynı Wi-Fi'ya geçip tekrar deneyin."
      :'Bağlantı zaman aşımına uğradı. Tekrar dene.';
    cleanup();
    const retry=r==='guest'&&c?()=>Net.join(c):r==='host'?()=>Net.host():null;
    showOverlay('<h2>BAĞLANAMADI</h2><p>'+msg+'</p>'+(retry?'<button class="cta" id="go">TEKRAR DENE</button><button class="link" id="menu">Ana menü</button>':'<button class="cta" id="menu">ANA MENÜ</button>'),retry?{go:retry,menu:showMenu}:{menu:showMenu});
  }

  // ---------- maçı başlat
  function beginMatch(){
    readyMe=readyThem=false;
    matchCtx={pvp:true,label:'ARKADAŞ MAÇI'};matchOpp=null;pvpOppDeck=guestDeck;
    Sfx.init();newMatch();paused=false;hideOverlay();applyOppHud();resize();
    state='play';sendT=0;events=[];sentEnd=false;lastHeard=performance.now();gone=null;
    banners.push({type:'info',text:'BAŞLA!',sub:'Arkadaş maçı',color:'#ffc83d',t:0,life:1.6});
    if(ball.owner)ball.owner.decT=1.7; // santra yazı bitince yapılır
    Sfx.whistle();
    send({t:'start'});
  }
  function guestBegin(){
    readyMe=readyThem=false;
    matchCtx={pvp:true,guest:true,label:'ARKADAŞ MAÇI'};matchOpp=null;
    Sfx.init();newMatch();swapKits();paused=false;hideOverlay();applyOppHud();resize();
    for(const t of teams)for(const p of t.players)p.fsm.current=null;
    state='play';snap=null;buf=[];offs=[];renderT=null;offMin=null;lastSnapAt=performance.now();lastHeard=performance.now();gone=null;
    banners.push({type:'info',text:'BAŞLA!',sub:'Arkadaş maçı',color:'#ffc83d',t:0,life:1.6});
    Sfx.whistle();
  }
  function rematchStatus(){const el=$('rmStatus');if(el)el.textContent=readyThem?(readyMe?'Başlıyor…':'Rakip rövanş istiyor!'):readyMe?'Rakibin cevabı bekleniyor…':'';}
  return{
    get role(){return role;},
    isGuest:()=>role==='guest',
    active:()=>!!role,
    // oda kur ve linki göster
    async host(fixedCode){
      cleanup();role='host';hookHost();
      showOverlay('<h2>ODA KURULUYOR…</h2><p>Bağlantı hazırlanıyor.</p><button class="link" id="menu">Vazgeç</button>',{menu:leave});
      try{await loadPeer();}catch(e){netError({type:'network'});return;}
      code=fixedCode||newCode();
      const opts=await peerOpts();if(role!=='host')return;
      peer=new Peer(ID_PREFIX+code,opts);keepAlive(peer);
      peer.on('error',e=>{
        if(e.type==='unavailable-id'){peer.destroy();role='host';Net.host();}
        else if(peer&&peer.__ready&&(e.type==='peer-unavailable'||e.type==='disconnected'||e.type==='network'||e.type==='server-error'||e.type==='socket-error'))return; // oda kurulduktan sonra geçici: sunucuya yeniden bağlanılır
        else if(role&&!(conn&&conn.open))netError(e);
      });
      peer.on('open',()=>{
        if(peer.__ready)return; // arka plandan dönüp yeniden bağlandı
        peer.__ready=true;
        const link=roomLink();
        showOverlay(`<h2>ODA HAZIR</h2>
<p>Linki arkadaşına gönder ya da oda kodunu söyle. Arkadaşın girdiği an maç başlar.</p>
<div class="roomcode">${code}</div>
<div class="linkbox"><input id="roomLink" readonly value="${link}"><button class="cta alt small" id="copyLink">KOPYALA</button></div>
${navigator.share?'<button class="cta" id="shareLink">PAYLAŞ</button>':''}
<p class="tip" id="netStatus"><span class="dotpulse"></span> Arkadaşın bekleniyor…</p>
<button class="link" id="menu">Vazgeç</button>`,{menu:leave});
        $('obox').classList.add('wide');
        $('copyLink').onclick=async()=>{
          const inp=$('roomLink');
          try{await navigator.clipboard.writeText(link);$('copyLink').textContent='KOPYALANDI';}
          catch(e){inp.select();$('copyLink').textContent='SEÇİLDİ';}
        };
        if($('shareLink'))$('shareLink').onclick=()=>navigator.share({title:'Tactic Arena',text:'Tactic Arena\'da benimle maç yap!',url:link}).catch(()=>{});
      });
      peer.on('connection',c=>{
        if(conn&&conn.open){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),300);});return;} // oda dolu
        if(conn){try{conn.close();}catch(e){}} // yarım kalmış önceki deneme
        wire(c);
        const say=h=>{const el=$('netStatus');if(el)el.innerHTML=h;};
        say('<span class="dotpulse"></span> Arkadaşın bulundu, bağlanılıyor…');
        const drop=txt=>{if(conn===c&&!c.open){clearTimeout(t);try{c.close();}catch(e){}conn=null;say('<span class="dotpulse"></span> '+txt);}};
        const t=setTimeout(()=>drop('Bağlantı kurulamadı, arkadaşın tekrar denemeli…'),25000);
        watchIce(c,()=>drop('Cihazlar birbirine ulaşamadı, arkadaşın tekrar denesin…'));
        c.on('open',()=>{clearTimeout(t);say('Arkadaşın bağlandı, maç başlıyor…');});
      });
    },
    // linkteki odaya katıl
    async join(roomCode){
      cleanup();role='guest';code=roomCode.toUpperCase();
      showOverlay(`<h2>BAĞLANIYOR…</h2><p>${code} odasına bağlanılıyor.</p><p class="tip" id="guestStatus"><span class="dotpulse"></span> Birkaç saniye sürebilir</p><button class="link" id="menu">Vazgeç</button>`,{menu:leave});
      try{await loadPeer();}catch(e){netError({type:'network'});return;}
      const opts=await peerOpts();if(role!=='guest')return;
      let attempt=0,timer=null;
      const status=txt=>{const el=$('guestStatus');if(el)el.innerHTML='<span class="dotpulse"></span> '+txt;};
      const attemptJoin=()=>{
        if(role!=='guest')return;
        attempt++;
        if(peer){try{peer.destroy();}catch(e){}}
        conn=null;clearTimeout(timer);
        const p=peer=new Peer(opts);keepAlive(p);
        p.on('error',e=>{
          if(!role||p!==peer)return;
          // oda henüz yok: ev sahibi linki paylaşırken sunucudan kopmuş olabilir, birkaç kez yeniden dene
          if(e.type==='peer-unavailable'&&attempt<6){status('Oda aranıyor ('+attempt+'/6)…');clearTimeout(timer);setTimeout(attemptJoin,1500);return;}
          if(e.type==='disconnected'||(conn&&conn.open))return; // maç sürerken eşleştirme sunucusu kopsa da bağlantı yaşar
          clearTimeout(timer);netError(e);
        });
        p.on('open',()=>{
          if(p!==peer||conn)return;
          const c=p.connect(ID_PREFIX+code,{reliable:true});
          wire(c);
          // istek bazen sunucuda askıda kalır: 9 sn'de açılmazsa temiz bir bağlantıyla yeniden dene
          timer=setTimeout(()=>{if(role==='guest'&&conn===c&&!c.open){if(attempt<6){status('Tekrar deneniyor ('+attempt+'/6)…');attemptJoin();}else netError({type:'timeout'});}},9000);
          watchIce(c,()=>{if(role==='guest'&&conn===c&&!c.open){clearTimeout(timer);netError({type:'ice'});}});
          c.on('open',()=>{clearTimeout(timer);status('Bağlandı, maç başlıyor…');c.send({t:'hello',deck:Deck.get(),super:Deck.getSuper(),v:1});});
          c.on('data',m=>{if(m&&m.t==='full'){cleanup();showOverlay('<h2>ODA DOLU</h2><p>Bu odada zaten iki oyuncu var.</p><button class="cta" id="go">ANA MENÜ</button>',{go:showMenu});}});
        });
      };
      attemptJoin();
    },
    // ev sahibi her karede çağırır: belli aralıklarla anlık görüntü gönder
    hostTick(dt){
      if(role!=='host'||!conn||!conn.open)return;
      pingTick(dt);checkPeer();
      if(events.length)send({t:'ev',ev:events.splice(0)}); // olaylar (gol, kart, ses) kaybolmamalı: güvenilir kanal
      if(state==='end'){if(!sentEnd){sentEnd=true;send({t:'stats',s:stats});send(snapshot());}return;} // maç sonu bir kez, güvenilir kanaldan
      sendT-=dt;
      if(sendT<=0){sendT=SNAP_EVERY;const sn=snapshot();if(!sendFast(sn))send(sn);}
    },
    ping:()=>pingMs==null?null:Math.round(pingMs),
    guestFrame,
    // misafir kart oynar: isteği gönder, kartın uçuşunu hemen göster
    guestSuper(rect){
      const t=teams[0],k=t.superKey;
      if(t.superUsed||state!=='play'||t.stars<CARDS[k].cost||performance.now()<cardLock){Sfx.deny();return;}
      cardLock=performance.now()+350;
      send({t:'super'});
      CardFx.play(t,k,rect);Sfx.card('atk');superBanner(true,k);
    },
    guestCard(i,rect){
      const t=teams[0],k=t.hand[i];
      if(!k||state!=='play'||t.stars<CARDS[k].cost||performance.now()<cardLock){Sfx.deny();return;}
      cardLock=performance.now()+350;
      send({t:'card',i});
      CardFx.play(t,k,rect);Sfx.card(CARDS[k].type);
    },
    rematch(){readyMe=true;send({t:'rematch'});rematchStatus();if(role==='host'&&readyThem)beginMatch();},
    leave(){send({t:'bye'});leave();},
  };
})();
// ev sahibinde misafirin destesi (state.js'deki makeTeam kullanır)
let pvpOppDeck=null,pvpOppSuper=null;
let pvpStats=null; // misafirde: ev sahibinden gelen maç istatistikleri
// maç sonu ekranı (iki taraf da kendi gözünden görür)
function showPvpEnd(a,b){
  state='end';
  const res=a>b?['KAZANDIN!','var(--gold)']:['KAYBETTİN','var(--away-l)'];
  showOverlay(`<h2 style="color:${res[1]}">${res[0]}</h2><div class="big"><span style="color:${teams[0].light}">${a}</span> – <span style="color:${teams[1].light}">${b}</span></div>${overtime?'<p class="tip">Uzatmada altın gol</p>':''}
${Net.isGuest()?(pvpStats?statsHTML(pvpStats,1):''):statsHTML(stats,0)}<button class="cta" id="go">RÖVANŞ</button><p class="tip" id="rmStatus"></p><button class="link" id="menu">Ana menü</button>`,
  {go:()=>{Net.rematch();},menu:()=>Net.leave()});
  $('obox').classList.add('wide','end');
}
