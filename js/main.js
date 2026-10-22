// Oyun döngüsü ve açılış
let last=performance.now();
// süre bitince: berabereyse gol atılana kadar altın gollü uzatma, değilse maç biter
function timeUp(){
  if(teams[0].score===teams[1].score){
    overtime=true;clock=0;
    banners.push({type:'info',text:'UZATMA',sub:'Altın gol: ilk atan kazanır',color:'#ffc83d',t:0,life:2.2});
    Sfx.overtime();
  }else endMatch();
}
function frame(ts){
  requestAnimationFrame(frame); // önce sıradaki kareyi iste: bir karede hata olsa da oyun donmasın
  const dt=Math.min(.05,(ts-last)/1000);last=ts;
  if(Net.isGuest()){Net.guestFrame(dt);updateHud();draw();return;} // misafir oyunu çalıştırmaz, ev sahibinden gelen durumu çizer
  if(!paused){
    now+=dt;
    updateFx(dt);
    if(state==='play'){
      if(overtime)clock+=dt; // uzatmada saat ileri sayar
      else clock-=dt;
      if(!overtime&&clock<=0){clock=0;timeUp();}
      else{
        const mult=overtime||clock<=FAST_TIME?2:1;
        for(const t of teams){t.stars=Math.min(STAR_MAX,t.stars+STAR_REGEN*mult*dt);for(const k in t.fx)t.fx[k]=Math.max(0,t.fx[k]-dt*(fxLive(t,k)?1:FX_IDLE));}
        if(!overtime&&clock<=FAST_TIME&&!doubleShown){doubleShown=true;banners.push({type:'info',text:'2x YILDIZ',sub:'Son 60 saniye!',color:'#ff8cf0',t:0,life:1.8});}
        updatePendingCards(dt);aiCards(dt);simPlayers(dt);if(state==='play')simBall(dt,true);
        Tutorial.update(dt);
      }
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
  updateHud();draw();
}
resize();addEventListener('resize',resize);
// saha alanının boyutu değişince (pencere ilk kez boyutlanınca, yazı tipleri geç yüklenince) yeniden ölç
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>resize()).observe(document.getElementById('stage'));
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(resize);
showMenu();
// arkadaşın gönderdiği link (?oda=KOD) ile açıldıysa doğrudan odaya katıl
{const q=new URLSearchParams(location.search);if(q.get('oda'))Net.join(q.get('oda'));else if(q.get('kur'))Net.host(q.get('kur').toUpperCase());}
requestAnimationFrame(frame);
