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
  floatText(r.x,r.y-20,'OFSAYT!',CARDS.offside.col);Sfx.whistle();
  stats.offside++;
  if(def.fx.offside>0){def.fx.offside=0;addStars(def,1,r.x,r.y);} // tuzak tuttu
  setPiece(def,{x:r.x,y:r.y},1.2);
}
// faul: top faule uğrayan takıma geçer, oradan serbest vuruş
function callFoul(fouler,victim,{delay=1.3,label='FAUL!'}={}){
  const t=victim.team;
  refFx.push({type:'card',x:fouler.x,y:fouler.y,t:0,life:1.4});
  floatText(fouler.x,fouler.y-22,label,'#ffe14d');Sfx.whistle();
  stats.fouls++;
  fouler.stun=Math.max(fouler.stun,.5);
  // ceza sahası içindeki faul ceza sahası çizgisine alınır (oyunda penaltı yok)
  const spot={x:victim.x,y:victim.y},g=oppGoal(t);
  if(Math.abs(spot.x-CX)<90&&Math.abs(spot.y-g.y)<74)spot.y=g.y-dirY(t)*76;
  setPiece(t,spot,delay);
}
// serbest vuruş: en yakın oyuncu topun başına geçer; rakip 30 px uzakta durur, süre dolana kadar dokunulmaz
function setPiece(t,spot,delay){
  let taker=null,bd=1e9;
  for(const p of t.players){if(p.role==='GK'&&dist(p,spot)>60)continue;const d=dist(p,spot);if(d<bd){bd=d;taker=p;}}
  spot={x:clamp(spot.x,FX+8,FX+FW-8),y:clamp(spot.y,FY+10,FY+FH-10)};
  taker.x=spot.x;taker.y=spot.y-dirY(t)*8;taker.vx=taker.vy=0;taker.fa=dirY(t)*Math.PI/2; // topun arkasına geç
  for(const q of teams[1-t.id].players){const d=dist(q,spot);if(d<30){const k=30/(d||1);q.x=clamp(spot.x+(q.x-spot.x)*k,FX+6,FX+FW-6);q.y=clamp(spot.y+(q.y-spot.y)*k,FY+6,FY+FH-6);}}
  take(taker);
  ball.setT=delay;taker.decT=delay;
  // kaleye yakınsa direkt şut
  taker.freeKick=dist(spot,oppGoal(t))<170;
  if(taker.freeKick)floatText(spot.x,spot.y+18,'SERBEST VURUŞ','#fff');
}
// müdahale faul mü? Kayarak ve arkadan müdahale daha riskli; ceza sahası içinde faul çalınmaz
function tackleFoul(tackler,carrier){
  const g=ownGoal(tackler.team);
  if(Math.abs(carrier.x-CX)<90&&Math.abs(carrier.y-g.y)<74)return false;
  const ax=tackler.x-carrier.x,ay=tackler.y-carrier.y;
  const fromBehind=Math.cos(carrier.fa)*ax+Math.sin(carrier.fa)*ay<-4; // taşıyanın arkasından
  const ch=tackler.dash>0?.06+(fromBehind?.05:0):.04+(fromBehind?.1:0);
  return Math.random()<ch;
}
function updateRefFx(dt){for(const f of refFx)f.t+=dt;refFx=refFx.filter(f=>f.t<f.life);}
// maç istatistikleri (ölçüm ve ileride maç sonu ekranı için)
let stats={offside:0,fouls:0};
