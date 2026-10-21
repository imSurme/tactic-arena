// Arkadaşla oyna (PvP): iki tarayıcı WebRTC ile doğrudan bağlanır (PeerJS).
// Ev sahibi (linki paylaşan) oyunu çalıştırır; misafir kart oynama isteği gönderir,
// saniyede 20 kez oyunun anlık durumunu alır ve sahayı ters çevirip kendi takımını altta görür.
const Net=(()=>{
  const PEER_SRC=['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
  const ID_PREFIX='tactic-arena-',CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const PUBLIC_URL='https://imsurme.github.io/tactic-arena/'; // dosyadan açılınca paylaşılacak adres
  const SNAP_EVERY=.05; // saniye
  let role=null,peer=null,conn=null,code='',sendT=0,events=[],lastSnapAt=0,snap=null,snapAt=0,stalled=false;
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
  const SWAP={'#9cc4ff':'#ffb0b8','#ffb0b8':'#9cc4ff','#2f80ff':'#ff4d5e','#ff4d5e':'#2f80ff','#b6f23a':'#ffa21f','#ffa21f':'#b6f23a'};
  const sc=c=>SWAP[c]||c;
  const send=m=>{if(conn&&conn.open)conn.send(m);};
  const emit=e=>{if(role==='host')events.push(e);};

  // ---------- ev sahibi: oyundaki görsel/ses olaylarını misafire aktar
  let hooked=false;
  function hookHost(){
    if(hooked)return;hooked=true;
    const _ft=floatText;floatText=function(x,y,t,c){_ft(x,y,t,c);emit(['f',r1(x),r1(y),t,c]);};
    const _bu=burst;burst=function(x,y,c,n,s){_bu(x,y,c,n,s);emit(['b',r1(x),r1(y),c,n,s]);};
    const _ri=ring;ring=function(x,y,c){_ri(x,y,c);emit(['r',r1(x),r1(y),c]);};
    const _co=callOffside;callOffside=function(r,t){_co(r,t);const f=refFx[refFx.length-1];if(f)emit(['ref',f]);};
    const _cf=callFoul;callFoul=function(a,b,o){_cf(a,b,o);const f=refFx[refFx.length-1];if(f)emit(['ref',f]);};
    const _go=goal;goal=function(tid){_go(tid);emit(['goal',tid]);};
    const _pc=playCard;playCard=function(t,i,from){const k=t.hand[i],ok=_pc(t,i,from);if(ok)emit(['play',t.id,k]);return ok;};
    const _imp=CardFx.impact;CardFx.impact=function(t,k,at){_imp(t,k,at);emit(['imp',t.id,k,r1(at.x),r1(at.y)]);};
    for(const n of ['pass','shot','tackle','save','whistle','whistleEnd','overtime'])
      {const o=Sfx[n];Sfx[n]=function(...a){o.apply(Sfx,a);emit(['sfx',n,...a]);};}
  }
  function snapshot(){
    const P=[...teams[0].players,...teams[1].players],b=ball;
    const fxOf=t=>Object.fromEntries(Object.entries(t.fx).filter(([,v])=>v>0).map(([k,v])=>[k,r1(v)]));
    return{t:'s',st:state,c:r1(clock),ot:overtime?1:0,sc:[teams[0].score,teams[1].score],
      stars:[r1(teams[0].stars),r1(teams[1].stars)],hand:teams[1].hand,next:teams[1].queue[0],fx:[fxOf(teams[0]),fxOf(teams[1])],
      p:P.map(p=>[r1(p.x),r1(p.y),r1(p.fa),r1(p.vx),r1(p.vy),(p.stun>0?1:0)|(p.dash>0?2:0)|(p.sprint>0?4:0)]),
      b:[r1(b.x),r1(b.y),r1(b.z||0),r1(b.vx),r1(b.vy),b.owner?P.indexOf(b.owner):-1,b.shot?1:0,b.power?1:0,b.setT>0?1:0,b.kickoff?1:0,
        b.passTo?P.indexOf(b.passTo):-1,b.passTeam?b.passTeam.id:-1,b.passTarget?r1(b.passTarget.x):0,b.passTarget?r1(b.passTarget.y):0],
      ev:events.splice(0)};
  }

  // ---------- misafir: gelen durumu kendi tarafına çevirip uygula
  const localTeam=h=>teams[1-h];
  const localPlayer=idx=>idx<0?null:localTeam(idx<5?0:1).players[idx%5];
  function applyEvent(e){
    const [k]=e;
    if(k==='f')floatText(mx(e[1]),my(e[2]),e[3],sc(e[4]));
    else if(k==='b')burst(mx(e[1]),my(e[2]),sc(e[3]),e[4],e[5]);
    else if(k==='r')ring(mx(e[1]),my(e[2]),sc(e[3]));
    else if(k==='ref'){const f={...e[1]};if(f.type==='flag'){f.y=my(f.y);f.line=my(f.line);}else{f.x=mx(f.x);f.y=my(f.y);}refFx.push(f);}
    else if(k==='goal')goalFx(1-e[1]);
    else if(k==='play'){
      if(e[1]===0){const t=teams[1];CardFx.play(t,e[2],null);Sfx.oppCard();oppLog.unshift(e[2]);oppLog.length=Math.min(oppLog.length,3);}
    }
    else if(k==='imp')CardFx.impact(localTeam(e[1]),e[2],{x:mx(e[3]),y:my(e[4])});
    else if(k==='sfx'){const n=e[1];if(Sfx[n])Sfx[n](...e.slice(2));if(n==='shot'&&e[2])shake=8;}
  }
  // misafirde gol anı (ev sahibindeki goal() ile aynı görüntü)
  function goalFx(tid){
    const t=teams[tid];shake=12;
    for(let i=0;i<70;i++){const c=['#ffc83d','#fff',t.color,t.light,'#d23cff'][i%5];parts.push({x:ball.x,y:ball.y,vx:rnd(-230,230),vy:rnd(-230,230),life:rnd(.9,1.7),t:0,c,s:rnd(2,4.5),sq:true});}
    banners.push({type:'big',text:'GOL!',sub:overtime?'ALTIN GOL!':tid===0?'Harika vuruş!':'Rakip attı',color:t.color,t:0,life:2.2});
    Sfx.goal();
    const el=$('s'+tid);el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
  }
  function applySnapshot(s){
    const prevState=state,prevOt=overtime,prevClock=clock;
    snap=s;snapAt=now;lastSnapAt=performance.now();
    if(stalled){stalled=false;hideOverlay();}
    // takımlar: ev sahibinin 1. takımı = misafirin kendi takımı (0)
    teams[0].score=s.sc[1];teams[1].score=s.sc[0];
    teams[0].stars=s.stars[1];teams[1].stars=s.stars[0];
    teams[0].hand=s.hand;teams[0].queue=[s.next];
    teams[0].fx=s.fx[1];teams[1].fx=s.fx[0];
    overtime=!!s.ot;clock=s.c;
    for(const e of s.ev)applyEvent(e);
    if(s.st!==prevState){
      state=s.st;
      if(state==='play'&&prevState==='goal')ball.trail=[];
      if(state==='end')showPvpEnd(teams[0].score,teams[1].score);
    }
    if(overtime&&!prevOt)banners.push({type:'info',text:'UZATMA',sub:'Altın gol: ilk atan kazanır',color:'#ffc83d',t:0,life:2.2});
    if(!overtime&&prevClock>FAST_TIME&&clock<=FAST_TIME&&!doubleShown){doubleShown=true;banners.push({type:'info',text:'2x YILDIZ',sub:'Son 60 saniye!',color:'#ff8cf0',t:0,life:1.8});}
  }
  // her karede: anlık görüntüye doğru yumuşak hareket (araya geçen süre kadar ileri tahmin)
  function guestFrame(dt){
    now+=dt;updateFx(dt);
    if(!snap)return;
    const ahead=Math.min(.15,now-snapAt),k=Math.min(1,dt*18);
    snap.p.forEach((q,idx)=>{
      const p=localPlayer(idx);
      const tx=mx(q[0]+q[3]*ahead),ty=my(q[1]+q[4]*ahead);
      if(Math.hypot(tx-p.x,ty-p.y)>60){p.x=tx;p.y=ty;}else{p.x+=(tx-p.x)*k;p.y+=(ty-p.y)*k;}
      p.vx=-q[3];p.vy=-q[4];
      let da=(q[2]+Math.PI)-p.fa;da=Math.atan2(Math.sin(da),Math.cos(da));p.fa+=da*Math.min(1,dt*14);
      p.stun=q[5]&1?1:0;p.dash=q[5]&2?1:0;p.sprint=q[5]&4?1:0;
      const v=Math.hypot(p.vx,p.vy);p.anim+=v*dt*.25;
      if(v>48&&Math.random()<dt*4)parts.push({x:p.x+rnd(-3,3),y:p.y+6,vx:-p.vx*.1,vy:-p.vy*.1,life:.4,t:0,c:'rgba(230,255,220,.6)',s:rnd(1,1.8)});
    });
    const b=snap.b,owner=localPlayer(b[5]);
    ball.owner=owner;
    if(owner){ball.x=owner.x+Math.cos(owner.fa)*9;ball.y=owner.y+Math.sin(owner.fa)*9;}
    else{
      const tx=mx(b[0]+b[3]*ahead),ty=my(b[1]+b[4]*ahead);
      if(Math.hypot(tx-ball.x,ty-ball.y)>80){ball.x=tx;ball.y=ty;}else{ball.x+=(tx-ball.x)*k;ball.y+=(ty-ball.y)*k;}
    }
    ball.z=b[2];ball.vx=-b[3];ball.vy=-b[4];ball.shot=!!b[6];ball.power=!!b[7];ball.setT=b[8]?1:0;ball.kickoff=!!b[9];
    ball.passTo=localPlayer(b[10]);ball.passTeam=b[11]<0?null:localTeam(b[11]);ball.passTarget=b[10]<0?null:{x:mx(b[12]),y:my(b[13])};
    ball.rot+=Math.hypot(ball.vx,ball.vy)*dt*.12;
    ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift();
    // ev sahibinden 1,5 sn haber yoksa uyar
    if(state==='play'&&!stalled&&performance.now()-lastSnapAt>1500){stalled=true;showOverlay('<div class="tip">ARKADAŞ MAÇI</div><h2>BAĞLANTI YAVAŞ</h2><p>Rakipten veri gelmiyor. Rakibin oyunu arka plana almış olabilir.</p><button class="link" id="menu">Maçtan çık</button>',{menu:leave});}
  }

  // ---------- bağlantı
  function wire(c){
    conn=c;
    c.on('data',onData);
    c.on('close',()=>{if(role)lost('Rakip maçtan ayrıldı.');});
    c.on('error',()=>{if(role)lost('Bağlantı hatası oluştu.');});
  }
  function lost(msg){
    const r=role;cleanup();
    if(r==='host'&&state==='play'){state='end';}
    showOverlay(`<div class="tip">ARKADAŞ MAÇI</div><h2>BAĞLANTI KOPTU</h2><p>${msg}</p><button class="cta" id="go">ANA MENÜ</button>`,{go:showMenu});
  }
  function cleanup(){
    role=null;matchCtx=null;
    try{conn&&conn.close();}catch(e){}
    try{peer&&peer.destroy();}catch(e){}
    conn=null;peer=null;events=[];snap=null;readyMe=readyThem=false;
    if(location.search.includes('oda='))history.replaceState(null,'',location.pathname);
  }
  function leave(){cleanup();showMenu();}
  function onData(m){
    if(!m||typeof m!=='object')return;
    if(role==='host'){
      if(m.t==='hello'){guestDeck=Array.isArray(m.deck)&&Deck.valid(m.deck)?m.deck:Deck.random();beginMatch();}
      else if(m.t==='card'&&state==='play'&&!paused){
        if(!playCard(teams[1],m.i,null))send({t:'deny'});
      }
      else if(m.t==='rematch'){readyThem=true;rematchStatus();if(readyMe)beginMatch();}
      else if(m.t==='bye')lost('Rakip maçtan ayrıldı.');
    }else if(role==='guest'){
      if(m.t==='start')guestBegin(m);
      else if(m.t==='s')applySnapshot(m);
      else if(m.t==='deny')Sfx.deny();
      else if(m.t==='rematch'){readyThem=true;rematchStatus();}
      else if(m.t==='bye')lost('Rakip maçtan ayrıldı.');
    }
  }
  function netError(err){
    const t=err&&err.type;
    const msg=t==='peer-unavailable'?'Bu oda bulunamadı. Link eskimiş olabilir ya da arkadaşın odayı kapatmış.'
      :t==='network'||t==='server-error'||t==='socket-error'?'Eşleştirme sunucusuna ulaşılamadı. İnternet bağlantını kontrol et.'
      :t==='browser-incompatible'?'Bu tarayıcı arkadaş maçını desteklemiyor.'
      :'Bağlantı kurulamadı. Mobil veride sorun olabilir; Wi-Fi\'ye geçip tekrar dene.';
    cleanup();
    showOverlay(`<div class="tip">ARKADAŞ MAÇI</div><h2>BAĞLANAMADI</h2><p>${msg}</p><button class="cta" id="go">ANA MENÜ</button>`,{go:showMenu});
  }

  // ---------- maçı başlat
  function beginMatch(){
    readyMe=readyThem=false;
    matchCtx={pvp:true,label:'ARKADAŞ MAÇI'};matchOpp=null;pvpOppDeck=guestDeck;
    Sfx.init();newMatch();paused=false;hideOverlay();applyOppHud();resize();
    state='play';sendT=0;events=[];sentEnd=false;
    banners.push({type:'info',text:'BAŞLA!',sub:'Arkadaş maçı',color:'#ffc83d',t:0,life:1.6});
    Sfx.whistle();
    send({t:'start'});
  }
  function guestBegin(){
    readyMe=readyThem=false;
    matchCtx={pvp:true,guest:true,label:'ARKADAŞ MAÇI'};matchOpp=null;
    Sfx.init();newMatch();paused=false;hideOverlay();applyOppHud();resize();
    for(const t of teams)for(const p of t.players)p.fsm.current=null;
    state='play';snap=null;lastSnapAt=performance.now();
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
      showOverlay('<div class="tip">ARKADAŞ MAÇI</div><h2>ODA KURULUYOR…</h2><p>Bağlantı hazırlanıyor.</p><button class="link" id="menu">Vazgeç</button>',{menu:leave});
      try{await loadPeer();}catch(e){netError({type:'network'});return;}
      code=fixedCode||newCode();
      peer=new Peer(ID_PREFIX+code);
      peer.on('error',e=>{if(e.type==='unavailable-id'){peer.destroy();role='host';Net.host();}else if(role)netError(e);});
      peer.on('open',()=>{
        const link=roomLink();
        showOverlay(`<div class="tip">ARKADAŞ MAÇI</div><h2>ODA HAZIR</h2>
<p>Bu linki arkadaşına gönder. Linke girdiği an maç başlar.</p>
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
        if(conn){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),300);});return;} // oda dolu
        wire(c);
        c.on('open',()=>{const st=$('netStatus');if(st)st.textContent='Arkadaşın bağlandı, maç başlıyor…';});
      });
    },
    // linkteki odaya katıl
    async join(roomCode){
      cleanup();role='guest';code=roomCode.toUpperCase();
      showOverlay(`<div class="tip">ARKADAŞ MAÇI</div><h2>BAĞLANIYOR…</h2><p>${code} odasına bağlanılıyor.</p><p class="tip"><span class="dotpulse"></span> Birkaç saniye sürebilir</p><button class="link" id="menu">Vazgeç</button>`,{menu:leave});
      try{await loadPeer();}catch(e){netError({type:'network'});return;}
      peer=new Peer();
      peer.on('error',e=>{if(role)netError(e);});
      peer.on('open',()=>{
        const c=peer.connect(ID_PREFIX+code,{reliable:true});
        wire(c);
        const t=setTimeout(()=>{if(role==='guest'&&!(conn&&conn.open))netError({type:'timeout'});},15000);
        c.on('open',()=>{clearTimeout(t);c.send({t:'hello',deck:Deck.get(),v:1});});
        c.on('data',m=>{if(m&&m.t==='full'){cleanup();showOverlay('<div class="tip">ARKADAŞ MAÇI</div><h2>ODA DOLU</h2><p>Bu odada zaten iki oyuncu var.</p><button class="cta" id="go">ANA MENÜ</button>',{go:showMenu});}});
      });
    },
    // ev sahibi her karede çağırır: belli aralıklarla anlık görüntü gönder
    hostTick(dt){
      if(role!=='host'||!conn||!conn.open)return;
      if(state==='end'){if(!sentEnd){sentEnd=true;send(snapshot());}return;} // maç sonu bir kez gönderilir
      sendT-=dt;
      if(sendT<=0){sendT=SNAP_EVERY;send(snapshot());}
    },
    guestFrame,
    // misafir kart oynar: isteği gönder, kartın uçuşunu hemen göster
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
let pvpOppDeck=null;
// maç sonu ekranı (iki taraf da kendi gözünden görür)
function showPvpEnd(a,b){
  state='end';
  const res=a>b?['KAZANDIN!','var(--gold)']:['KAYBETTİN','var(--away-l)'];
  showOverlay(`<div class="tip">ARKADAŞ MAÇI</div><h2 style="color:${res[1]}">${res[0]}</h2><div class="big"><span style="color:var(--home-l)">${a}</span> – <span style="color:var(--away-l)">${b}</span></div>${overtime?'<p class="tip">Uzatmada altın gol</p>':''}
<button class="cta" id="go">RÖVANŞ</button><p class="tip" id="rmStatus"></p><button class="link" id="menu">Ana menü</button>`,
  {go:()=>{Net.rematch();},menu:()=>Net.leave()});
}
