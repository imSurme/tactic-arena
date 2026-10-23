// Futbol kuralları: ofsayt, faul ve serbest vuruş
// Ofsayt: pas anında alıcı rakip yarı sahadaysa, toptan ve sondan ikinci rakipten (genelde son defans) daha ilerideyse.

// sondan ikinci rakip oyuncunun hücum yönündeki konumu (kaleci genelde en sondadır)
function secondLastDefender(t){
  const a=teams[1-t.id].players.map(q=>adv(t,q.y)).sort((x,y)=>y-x);
  return a[1];
}
// gerçek ofsayt çizgisi: sondan ikinci rakip ya da top, hangisi daha ilerideyse
const offsideLine=t=>Math.max(secondLastDefender(t),adv(t,ball.y));
function isOffside(r,t,passer){
  if(ball.kickoff||passer.role==='GK'||ball.setT>0)return false; // santra, kaleci vuruşu ve serbest vuruşta ofsayt yok
  const step=teams[1-t.id].fx.offside>0?22:0; // tuzak: savunma pas anında bir adım çıkar
  return adv(t,r.y)>adv(t,CY)&&adv(t,r.y)>offsideLine(t)-step+2;
}
// pas atanın gözünden ofsayt: savunma hattını bir an geç fark eder (hat aniden çıkınca yanılır)
function looksOffside(r,t){
  if(ball.kickoff)return false;
  const line=Math.max(t.seenLine??secondLastDefender(t),adv(t,ball.y));
  return adv(t,r.y)>adv(t,CY)&&adv(t,r.y)>line+3;
}
// her takım rakibin savunma hattını gecikmeli algılar (saniyede ~%35 yaklaşır)
function updateSeenLine(t,dt){
  const real=secondLastDefender(t);
  t.seenLine=t.seenLine===undefined?real:t.seenLine+(real-t.seenLine)*Math.min(1,dt*2.2);
}

// görsel: yan hakem bayrağı ve faul kartı
let refFx=[];
function callOffside(r,t){
  const def=teams[1-t.id];
  refFx.push({type:'flag',y:r.y,line:offsideLine(t)*dirY(t),t:0,life:1.6});
  floatAbove(r.x,r.y,20,'OFSAYT!',CARDS.offside.col);Sfx.whistle();
  stats.offside++;stats.offT[t.id]++;
  if(def.fx.offside>0){def.fx.offside=0;addStars(def,1,r.x,r.y);} // tuzak tuttu
  setPiece(def,{x:r.x,y:r.y},1.2);
}
// faul: top faule uğrayan takıma geçer, oradan serbest vuruş
function callFoul(fouler,victim,{delay=1.3,label='FAUL!',indirect=false}={}){
  const t=victim.team;
  refFx.push({type:'card',x:fouler.x,y:fouler.y,t:0,life:1.4});
  floatAbove(fouler.x,fouler.y,22,label,'#ffe14d');Sfx.whistle();
  stats.fouls++;stats.foulsT[fouler.team.id]++;
  fouler.stun=Math.max(fouler.stun,.5);
  const spot={x:victim.x,y:victim.y},g=oppGoal(t);
  if(inBox(spot,g)){penalty(t);return;}
  setPiece(t,spot,delay,indirect);
}
// serbest vuruş: en yakın oyuncu topun başına geçer; rakip 30 px uzakta durur, süre dolana kadar dokunulmaz
function setPiece(t,spot,delay,indirect=false){
  let taker=null,bd=1e9;
  for(const p of t.players){if(p.role==='GK'&&dist(p,spot)>60)continue;const d=dist(p,spot);if(d<bd){bd=d;taker=p;}}
  spot={x:clamp(spot.x,FX+8,FX+FW-8),y:clamp(spot.y,FY+10,FY+FH-10)};
  taker.x=spot.x;taker.y=spot.y-dirY(t)*8;taker.vx=taker.vy=0;taker.fa=dirY(t)*Math.PI/2; // topun arkasına geç
  for(const q of teams[1-t.id].players){const d=dist(q,spot);if(d<30){const k=30/(d||1);q.x=clamp(spot.x+(q.x-spot.x)*k,FX+6,FX+FW-6);q.y=clamp(spot.y+(q.y-spot.y)*k,FY+6,FY+FH-6);}}
  take(taker);
  ball.setT=delay;ball.kickoff=false;taker.decT=delay;
  // kaleye yakınsa direkt şut
  const dg=dist(spot,oppGoal(t));
  taker.freeKick=!indirect&&dg<150&&Math.random()<(dg<110?.45:.25);
  taker.setPass=!taker.freeKick;
  taker.resetPass=indirect; // taktik fauldan sonra vuruş geriye oynanır, atak yeniden kurulur
  if(taker.freeKick)floatAbove(spot.x,spot.y,-18,'SERBEST VURUŞ','#fff');
}
// müdahale faul mü? Kayarak ve arkadan müdahale daha riskli; ceza sahası içinde faul çalınmaz
function tackleFoul(tackler,carrier){
  const ax=tackler.x-carrier.x,ay=tackler.y-carrier.y;
  const fromBehind=Math.cos(carrier.fa)*ax+Math.sin(carrier.fa)*ay<-4; // taşıyanın arkasından
  const ch=tackler.dash>0?.035+(fromBehind?.035:0):.017+(fromBehind?.045:0);
  const box=inBox(carrier,ownGoal(tackler.team))?.5:1; // ceza sahasında savunmacı daha dikkatli (faul = penaltı)
  return Math.random()<ch*box;
}
const inBox=(pt,g)=>Math.abs(pt.x-CX)<90&&Math.abs(pt.y-g.y)<72;
// penaltı: forvet noktaya geçer, kaleci çizgide, diğer herkes ceza sahası dışında; düdükten sonra şut
function penalty(t){
  const g=oppGoal(t),def=teams[1-t.id],taker=t.players[4],gk=def.players[0];
  const spot={x:CX,y:g.y-dirY(t)*52};
  for(const tm of teams)for(const p of tm.players){
    if(p===taker||p===gk)continue;
    if(inBox(p,g)||dist(p,spot)<40){p.y=g.y-dirY(t)*rnd(84,104);p.x=clamp(p.x,FX+14,FX+FW-14);}
    p.vx=p.vy=0;p.stun=0;p.dash=0;
  }
  taker.x=spot.x;taker.y=spot.y-dirY(t)*8;taker.vx=taker.vy=0;taker.fa=dirY(t)*Math.PI/2;
  gk.x=CX;gk.y=g.y+dirY(t)*6;gk.vx=gk.vy=0;
  take(taker);
  ball.setT=1.8;ball.penalty=true;ball.kickoff=false;taker.decT=1.8;taker.penalty=true;
  banners.push({type:'info',text:'PENALTI!',sub:t.id===0?'Kaleye vur!':'Kaleci, hazır ol!',color:'#ffe14d',t:0,life:1.6});
}
function updateRefFx(dt){for(const f of refFx)f.t+=dt;refFx=refFx.filter(f=>f.t<f.life);}
// maç istatistikleri (ölçüm ve ileride maç sonu ekranı için)
// her alan [takım 0, takım 1]
function freshStats(){
  const z=()=>[0,0];
  return{offside:0,fouls:0,len:Settings.get('length'),poss:z(),shots:z(),onT:z(),xg:z(),passes:z(),passOk:z(),tackles:z(),ints:z(),saves:z(),
    foulsT:z(),offT:z(),stars:z(),cards:[{},{}],cardXg:[{},{}],recent:[[],[]],goals:[]};
}
let stats=freshStats();
// maçın kaçıncı saniyesi (uzatmada normal süre + uzatma)
const elapsed=()=>overtime?stats.len+clock:stats.len-clock;
// şut: xG takıma ve son 10 sn'de oynanan ya da etkisi süren hücum kartlarına yazılır
function statShot(p,t,xg){
  const i=t.id;stats.shots[i]++;stats.xg[i]+=xg;stats.cur={team:i,on:false};
  const now0=elapsed(),keys=new Set(stats.recent[i].filter(r=>now0-r.at<=10&&CARDS[r.k].type==='atk').map(r=>r.k));
  for(const k in t.fx)if(t.fx[k]>0&&CARDS[k].type==='atk')keys.add(k);
  for(const k of keys)stats.cardXg[i][k]=(stats.cardXg[i][k]||0)+xg;
}
// son şut kaleyi buldu (kurtarış ya da gol); her şut bir kez sayılır
function statOnTarget(i){const c=stats.cur;if(c&&c.team===i&&!c.on){c.on=true;stats.onT[i]++;}}
function statCard(t,k){
  const i=t.id;stats.cards[i][k]=(stats.cards[i][k]||0)+1;stats.stars[i]+=CARDS[k].cost;
  stats.recent[i].push({k,at:elapsed()});
}
