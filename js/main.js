// Oyun döngüsü ve açılış
let last=performance.now(),nextAt=0,lastHud=0,drawn=false;
// arayüz penceresi (menü, duraklatma, maç sonu) sahayı kapatırken tuval bir kez çizilip dondurulur: telefon ısınmasın, pil bitmesin
function redraw(){drawn=false;}
// süre bitince: berabereyse gol atılana kadar altın gollü uzatma, değilse maç biter
function timeUp(){
  if(teams[0].score===teams[1].score){
    overtime=true;clock=0;
    for(const t of teams)t.superUsed=false; // uzatmada süper kart hakkı yenilenir
    banners.push({type:'info',text:'UZATMA',sub:'Altın gol: ilk atan kazanır',color:'#ffc83d',t:0,life:2.2});
    Sfx.overtime();
  }else endMatch();
}
function frame(ts){
  requestAnimationFrame(frame); // önce sıradaki kareyi iste: bir karede hata olsa da oyun donmasın
  if(ts<nextAt-2)return; // 90/120 Hz ekranlarda da saniyede en fazla ~60 kare
  nextAt=Math.max(nextAt,ts-1000/60)+1000/60;
  const dt=Math.min(.05,(ts-last)/1000);last=ts;
  if(Net.isGuest()){Net.guestFrame(dt);show(ts);return;} // misafir oyunu çalıştırmaz, ev sahibinden gelen durumu çizer
  if(!paused){
    now+=dt;
    updateFx(dt);
    if(state==='play'){
      if(overtime)clock+=dt; // uzatmada saat ileri sayar
      else clock-=dt;
      if(!overtime&&clock<=0){clock=0;timeUp();}
      else{
        const mult=overtime||clock<=FAST_TIME?2:1;
        for(const t of teams){t.stars=Math.min(STAR_MAX,t.stars+STAR_REGEN*mult*dt);for(const k in t.fx){t.fx[k]=Math.max(0,t.fx[k]-dt*(fxLive(t,k)?1:FX_IDLE));if(!t.fx[k])t.quiet.delete(k);}}
        if(!overtime&&clock<=FAST_TIME&&!doubleShown){doubleShown=true;banners.push({type:'info',text:'2x YILDIZ',sub:'Son 60 saniye!',color:'#ff8cf0',t:0,life:1.8});}
        if(attacking(teams[0]))stats.poss[0]+=dt;else if(attacking(teams[1]))stats.poss[1]+=dt;
        updatePendingCards(dt);aiCards(dt);simPlayers(dt);if(state==='play')simBall(dt,true);
        Tutorial.update(dt);
      }
    }else if(state==='coach'){
      Coach.tick(dt);
    }else if(state==='goal'){
      goalT-=dt;simBall(dt,false);
      for(const t of teams)for(const p of t.players){p.vx*=.9;p.vy*=.9;p.x+=p.vx*dt;p.y+=p.vy*dt;}
      if(goalT<=0){
        if(overtime)endMatch(); // altın gol
        else{kickoff(pendingKick);state='play';Sfx.whistle();}
      }
    }
  }
  Net.hostTick(dt);
  show(ts);
}
// pencere sahayı kapatınca arkadaki CSS animasyonları da durur (yalnız değişince sayfaya yazılır)
let idleOn=false;
function setIdle(v){if(v!==idleOn){idleOn=v;document.documentElement.classList.toggle('idle',v);}}
function show(ts){
  if(document.getElementById('overlay').hidden&&document.getElementById('cardModal').hidden){setIdle(false);drawn=false;updateHud();draw();return;}
  setIdle(true);
  if(!drawn){drawn=true;updateHud();draw();lastHud=ts;}
  else if(ts-lastHud>250){lastHud=ts;updateHud();} // pencere açıkken skorbord seyrek güncellenir
}
// iPhone ana ekran uygulaması: iOS açılışta ekran yüksekliğini ara sıra kısa bildirir ve düzeltmez (altta boşluk kalır).
// Yükseklik birkaç kez ölçülür, en büyüğü oyun kutusuna verilir.
{
  const standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  if(standalone){
    const fit=()=>{
      const h=Math.max(innerHeight,document.documentElement.clientHeight,window.visualViewport?visualViewport.height:0);
      document.documentElement.style.setProperty('--apph',h+'px');document.documentElement.classList.add('standalone');
    };
    fit();for(const t of [50,300,1000])setTimeout(fit,t);
    for(const ev of ['resize','orientationchange','pageshow'])addEventListener(ev,()=>{fit();setTimeout(fit,300);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){fit();setTimeout(fit,300);}});
  }
}
// çevrimdışı oyun için dosyaları kaydeden service worker (dosyayı çift tıklayıp açınca çalışmaz, gerek de yok)
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
resize();addEventListener('resize',resize);
// saha alanının boyutu değişince (pencere ilk kez boyutlanınca, yazı tipleri geç yüklenince) yeniden ölç
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>resize()).observe(document.getElementById('stage'));
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(resize);
showMenu();
// arkadaşın gönderdiği link (?oda=KOD) ile açıldıysa doğrudan odaya katıl
{const q=new URLSearchParams(location.search);if(q.get('oda'))Net.join(q.get('oda'));else if(q.get('kur'))Net.host(q.get('kur').toUpperCase());}
requestAnimationFrame(frame);
