// Kart oynama, kart etkileri, deste ve rakibin kart seçimi
const Deck=(()=>{
  let deck=null;
  try{deck=JSON.parse(localStorage.getItem('ta-deck'));}catch(e){}
  const valid=d=>Array.isArray(d)&&d.length===DECK_SIZE&&new Set(d).size===DECK_SIZE&&d.every(k=>CARDS[k]&&CARDS[k].type!=='super');
  if(!valid(deck))deck=DEFAULT_DECK.slice();
  let sup=null;try{sup=localStorage.getItem('ta-super');}catch(e){}
  if(!SUPER_KEYS.includes(sup))sup=DEFAULT_SUPER;
  return{
    get:()=>deck.slice(),
    valid,
    set(d){if(!valid(d))return;deck=d.slice();try{localStorage.setItem('ta-deck',JSON.stringify(deck));}catch(e){}},
    getSuper:()=>sup,
    setSuper(k){if(!SUPER_KEYS.includes(k))return;sup=k;try{localStorage.setItem('ta-super',k);}catch(e){}},
    randomSuper:()=>SUPER_KEYS[Math.random()*SUPER_KEYS.length|0],
    // rakip: her maç 4 hücum + 4 savunma kartından rastgele deste
    random(){
      const pick=type=>shuffle(Object.keys(CARDS).filter(k=>CARDS[k].type===type)).slice(0,DECK_SIZE/2);
      return[...pick('atk'),...pick('def')];
    },
  };
})();
const avgCost=d=>d.reduce((s,k)=>s+CARDS[k].cost,0)/d.length;
function addStars(t,n,x,y){
  t.stars=Math.min(STAR_MAX,t.stars+n);
  if(x!==undefined)floatAbove(x,y,30,'+'+(n%1?n.toFixed(1):n)+'★','#ffd23f');
}
// uçuşu süren kartlar: etkileri çarpma anında uygulanır (oyun duraklayınca bekler)
const CARD_FLIGHT=.5;
let pendingCards=[];
function updatePendingCards(dt){
  for(const c of pendingCards)c.t-=dt;
  const ready=pendingCards.filter(c=>c.t<=0);
  pendingCards=pendingCards.filter(c=>c.t>0);
  for(const c of ready){applyCard(c.team,c.key);CardFx.impact(c.team,c.key,CardFx.landing(c.team,c.key));}
}
// from: elden oynanan kartın ekran dikdörtgeni, uçuş buradan başlar
function playCard(t,i,from){
  if(state!=='play')return false;
  const k=t.hand[i],c=CARDS[k];
  if(!c||t.stars<c.cost)return false;
  t.stars-=c.cost;
  t.hand[i]=t.queue.shift();t.queue.push(k);
  statCard(t,k);
  pendingCards.push({team:t,key:k,t:CARD_FLIGHT});
  CardFx.play(t,k,from);
  if(t.id===0){Sfx.card(c.type);Tutorial.onCard();}
  else{Sfx.oppCard();oppLog.unshift(k);oppLog.length=Math.min(oppLog.length,3);}
  return true;
}
// süreli kartın sayacı işe yaramadığı anda yavaş akar: hücum kartı rakip topa sahipken, savunma kartı top bizdeyken
const FX_IDLE=.6;
const fxLive=(t,k)=>CARDS[k].type==='atk'?!attacking(teams[1-t.id]):CARDS[k].type==='def'?!attacking(t):true;
// süper kart: maçta bir kez (uzatmada bir hak daha); kendi yuvasından oynanır
function playSuper(t,from){
  if(state!=='play'||t.superUsed)return false;
  const k=t.superKey,c=CARDS[k];if(!c||t.stars<c.cost)return false;
  t.stars-=c.cost;t.superUsed=true;statCard(t,k);
  pendingCards.push({team:t,key:k,t:CARD_FLIGHT});
  CardFx.play(t,k,from);
  if(t.id===0)Sfx.card('atk');else{Sfx.oppCard();oppLog.unshift(k);oppLog.length=Math.min(oppLog.length,3);}
  superBanner(t.id===0,k);
  return true;
}
function superBanner(mine,k){banners.push({type:'info',text:CARDS[k].name.toLocaleUpperCase('tr'),sub:mine?'SÜPER KART!':'Rakip süper kart oynadı!',color:CARDS[k].col,t:0,life:1.7});}
function applyCard(t,k){
  const o=ball.owner,mine=o&&o.team===t,theirs=o&&o.team!==t;
  switch(k){
    case'through':if(mine&&throughPass(o,t))return;break;
    case'longball':if(mine&&longBall(o,t))return;break;
    case'foul':if(theirs){tacticalFoul(t);return;}break;
    case'total':{ // Kontra Atak + Hücum Dalgası + Çalım Ustası
      for(const x of ['counter','wave','dribble'])t.fx[x]=Math.max(t.fx[x]||0,DUR.total);
      for(const p of t.players)if(p.role!=='GK')ring(p.x,p.y,CARDS.total.col);
      return;
    }
    case'bus':{ // Savunma Duvarı + Kaleci Refleksi
      t.fx.wall=Math.max(t.fx.wall||0,DUR.bus);t.fx.gk=Math.max(t.fx.gk||0,DUR.bus);
      for(const p of t.players)ring(p.x,p.y,CARDS.bus.col);
      return;
    }
    case'hero':{ // forvet süperstar: top kaptırmaz, hızlı, ilk şutu çok sert
      const f=t.players.find(p=>p.role==='FWD');
      f.superT=DUR.hero;f.superShot=false;t.fx.hero=DUR.hero;
      ring(f.x,f.y,CARDS.hero.col);burst(f.x,f.y,CARDS.hero.col,18,140);floatAbove(f.x,f.y,22,'YILDIZ!',CARDS.hero.col);
      return;
    }
    case'slide':{
      const tgt=theirs?o:ball;
      let best=null,bd=1e9;
      for(const p of t.players){if(p.role==='GK'||p.stun>0||p===o)continue;const d=dist(p,tgt);if(d<bd){bd=d;best=p;}}
      if(best){best.dash=1;best.tackleCd=0;burst(best.x,best.y,CARDS.slide.col,10,90);}
      return;
    }
  }
  // süreli etkiler; ara pas, uzun top ve faul top uygun ana kadar bekler
  t.fx[k]=DUR[k];
  if(k==='gk')ring(t.players[0].x,t.players[0].y,CARDS.gk.col);
  else for(const p of t.players)if(p.role!=='GK')ring(p.x,p.y,CARDS[k].col);
}
// Taktik Faul: atak bilerek faulle kesilir. Rakip serbest vuruş kullanır ama vuruş geç gelir,
// bu sırada takım koşarak savunmaya dizilir. Rakip karşılığında yıldız kazanır.
function tacticalFoul(t){
  const o=ball.owner,opp=o.team;
  let best=null,bd=1e9;
  for(const p of t.players){if(p.role==='GK')continue;const d=dist(p,o);if(d<bd){bd=d;best=p;}}
  t.fx.foul=0;
  // serbest vuruş faulün yapıldığı yerden; ceza sahası içindeyse penaltı
  best.x=clamp(o.x-dirY(opp)*10,FX+6,FX+FW-6);best.y=clamp(o.y-dirY(opp)*10,FY+6,FY+FH-6);
  callFoul(best,o,{delay:2.6,label:'TAKTİK FAUL!',indirect:true});
  for(const p of t.players)if(p.role!=='GK'&&p!==best)p.sprint=2.2; // savunmaya koş
  t.fx.wall=Math.max(t.fx.wall||0,5); // savunmaya dizilir, şutların önünü keser
  ball.tactical=true; // vuruş gelene kadar rakibin diğer oyuncuları yavaş ilerler
  addStars(opp,REWARD.foulComp,o.x,o.y);
}
function aiCards(dt){
  if(matchCtx&&matchCtx.pvp)return; // arkadaş maçında rakibin kartlarını insan oynar
  aiT-=dt;if(aiT>0)return;aiT=rnd(1.5,3.5)*oppMod().think;
  const t=teams[1],o=ball.owner,own=o&&o.team===t,opp=o&&o.team!==t;
  const by=toN(t,ball.x,ball.y).y,late=clock<40;
  const lead=t.score-teams[0].score;
  if(!t.superUsed&&t.stars>=CARDS[t.superKey].cost&&!pendingCards.length&&Math.random()<.6){
    const k=t.superKey,lateS=overtime||clock<45;
    const go=k==='total'?own&&by<.65:k==='bus'?opp&&by>.55&&(lead>=0||lateS):own&&by<.8;
    if(go){playSuper(t);return;}
  }
  let best=-1,bs=-1e9;
  t.hand.forEach((k,i)=>{
    if(CARDS[k].cost>t.stars||(t.fx[k]>0)||pendingCards.some(c=>c.team===t&&c.key===k))return;
    let s=Math.random();
    switch(k){
      case'power':s+=own&&by<.45?2.2:-1;break;
      case'through':s+=own&&by>.3?1.4:-.5;break;
      case'longball':s+=own&&by>.55?1.5:-.5;break;
      case'counter':s+=own&&by>.45?1.4:0;break;
      case'wave':s+=own?.7:0;if(late&&lead<=0)s+=1.5;break;
      case'overlap':s+=own&&by<.6?1.2:0;break;
      case'dribble':s+=own&&nearestOpp(o,t).d<35?1.4:0;break;
      case'tiki':s+=own?1:0;if(late&&lead>0)s+=1;break;
      case'press':s+=opp&&by<.6?1.4:0;break;
      case'wall':s+=opp&&by>.6?1.4:0;if(late&&lead>0)s+=1.2;break;
      case'gk':s+=(opp&&by>.72)||(ball.shot&&ball.shotTeam!==t)?1.8:-.5;break;
      case'slide':s+=opp&&by>.5?1.3:opp?.5:-1;break;
      case'offside':s+=opp&&by>.35&&by<.7?1.3:0;break;
      case'foul':s+=opp&&by>.65&&!inBox(o,ownGoal(t))?1.6:-1;break; // ceza sahasında faul yapmaz (penaltı)
      case'mark':s+=opp?1.1:0;break;
      case'intercept':s+=opp&&by>.4?1.2:0;break;
    }
    if(s>bs){bs=s;best=i;}
  });
  // süper kart henüz oynanmadıysa maçın ikinci yarısında yıldız biriktirir; sadece çok iyi fırsatta normal kart oynar
  const saving=!t.superUsed&&(overtime||clock<100)&&t.stars<CARDS[t.superKey].cost+1;
  if(best>=0&&(bs>(saving?2.4:1.5)||t.stars>=9.5))playCard(t,best);
}
