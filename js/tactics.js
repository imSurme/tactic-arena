// Taktik hesapları: pas seçimi, şut kalitesi, orta, top sürme yönü, dizilim, boş alan ve markaj
// Durumlar (states.js) bu fonksiyonları çağırarak karar verir
function nearestOpp(p,t){let best=null,bd=1e9;for(const q of teams[1-t.id].players){const d=dist(p,q);if(d<bd){bd=d;best=q;}}return{p:best,d:bd};}
const adv=(t,y)=>y*dirY(t); // hücum yönünde ne kadar ileride
// ofsayt çizgisi: rakibin en geri oyuncusu ya da top, hangisi daha ilerideyse
// oyuncuların ofsayta düşmemek için beklediği çizgi: algıladıkları savunma hattı ya da top
function offsideLimit(t){
  const line=t.seenLine??secondLastDefender(t);
  return Math.max(line,adv(t,ball.y))-2;
}
const passSpeed=d=>clamp(120+d*1.1,TEMPO.passMin,TEMPO.passMax);
// rakip, top oraya varmadan pas yoluna yetişebilir mi? (pozitif = güvenli)
function laneSafety(a,b,sp,t){
  const dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy||1,L=Math.sqrt(L2);let m=1e9;
  for(const q of teams[1-t.id].players){
    const k=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/L2,0,1);
    const sd=Math.hypot(q.x-a.x-dx*k,q.y-a.y-dy*k);
    m=Math.min(m,sd-(9+TEMPO.run*q.spd*(k*L/sp)*.7));
  }
  return m;
}
// koşan oyuncunun ayağına değil önüne pas
function passTarget(r){
  const lead=r.run>0||r.sprint>0?.55:.3;
  return{x:clamp(r.x+r.vx*lead,FX+8,FX+FW-8),y:clamp(r.y+r.vy*lead,FY+8,FY+FH-8)};
}
function passOptions(p,t){
  const res=[],gk=p.role==='GK',deep=toN(t,p.x,p.y).y>.7;
  for(const r of t.players){
    if(r===p||r.stun>0||(r.role==='GK'&&(gk||!deep)))continue;
    if(!gk&&looksOffside(r,t))continue; // ofsayttaki arkadaşa pas atılmaz (hattı doğru gördüyse)
    const tg=passTarget(r),d=dist(p,tg);
    if(d<28||d>(gk?280:240))continue;
    const sp=passSpeed(d),safe=laneSafety(p,tg,sp,t);
    if(safe<(t.fx.tiki?8:3))continue; // riskli pas atılmaz; tiki-taka daha da temkinli
    const prog=(tg.y-p.y)*dirY(t),open=Math.min(nearestOpp(tg,t).d,60);
    const near=Math.max(0,200-dist(tg,oppGoal(t)))*.25;
    const s=prog*.7+open*.8+near+Math.min(safe,30)*.4-d*.08+rnd(0,8)-(r.role==='GK'?25:0)
      +(t.fx.overlap&&r.role==='DEF'?18:0)-(t.fx.tiki?d*.15:0)
      +(laneX(t)!==null&&Math.abs(tg.x-laneX(t))<60?14:0); // hücum kanadına pas
    res.push({r,tg,sp,s});
  }
  return res.sort((a,b)=>b.s-a.s);
}
function kick(p,tx,ty,sp){
  const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy)||1;
  Object.assign(ball,{owner:null,vx:dx/d*sp,vy:dy/d*sp,x:p.x+dx/d*9,y:p.y+dy/d*9,shot:false,passTo:null,passTeam:null,power:false,kickoff:false,loft:null,passTarget:null,setT:0,rolled:new Set()});
  p.kickCd=.35;p.fa=Math.atan2(dy,dx);
}
function pass(p,r,t,tg,sp){
  tg=tg||passTarget(r);
  // ofsayt: yan hakem bayrağı kaldırır, rakip serbest vuruş kullanır
  if(isOffside(r,t,p)){p.kickCd=.6;callOffside(r,t);return;}
  kick(p,tg.x,tg.y,sp||passSpeed(dist(p,tg)));
  ball.passTo=r;ball.passTeam=t;ball.passTarget=tg;Sfx.pass();
}
// Uzun Top: savunmanın arkasındaki boşluğa havadan, kesilemeyen pas
function longBall(p,t){
  const lim=offsideLimit(t);let best=null,bs=-1e9;
  for(const r of t.players){if(r===p||r.role==='GK'||r.stun>0||(p.role!=='GK'&&looksOffside(r,t)))continue;const s=adv(t,r.y)+rnd(0,20);if(s>bs){bs=s;best=r;}}
  if(!best)return false;
  const tg={x:clamp(best.x+(CX-best.x)*.4,FX+30,FX+FW-30),y:clamp((lim+50)*dirY(t),FY+40,FY+FH-40)};
  const d=dist(p,tg);
  best.run=2.2;best.runTo=tg;best.sprint=2;
  pass(p,best,t,tg,clamp(d*1.15,200,330));
  ball.loft={t:0,T:Math.min(1.6,d/210),h:clamp(d/8,14,34)};
  t.fx.longball=0;
  floatText(p.x,p.y-20,'UZUN TOP!',CARDS.longball.col);
  return true;
}
function throughPass(p,t){
  const lim=offsideLimit(t);let best=null,bs=-1e9;
  for(const r of t.players){
    if(r===p||r.role==='GK'||r.stun>0||looksOffside(r,t))continue;
    const fwd=(r.y-p.y)*dirY(t);if(fwd<-10)continue;
    const s=fwd-Math.abs(r.x-CX)*.2;if(s>bs){bs=s;best=r;}
  }
  if(!best)return false;
  const goalAdv=adv(t,oppGoal(t).y);
  const tg={x:best.x+(CX-best.x)*.3,y:clamp(Math.min(Math.max(adv(t,best.y),lim)+40,goalAdv-95)*dirY(t),FY+30,FY+FH-30)};
  best.run=1.6;best.runTo=tg;best.sprint=1.4;
  pass(p,best,t,tg,clamp(dist(p,tg)*1.25,180,280));
  floatText(p.x,p.y-20,'ARA PAS!',CARDS.through.col);
  return true;
}
function shoot(p,t){
  const g=oppGoal(t),gk=teams[1-t.id].players[0],d=dist(p,g);
  let side=gk.x>CX?-1:1;if(Math.random()<.3)side=-side;
  const pow=t.fx.power>0;
  const tx=CX+side*(GW/2-10)*rnd(.4,1)+rnd(-.5,.5)*d*(pow?.04:.18);
  const sp=pow?TEMPO.powerShot+d*.3:Math.min(450,rnd(...TEMPO.shot)+d*.4);
  kick(p,tx,g.y+dirY(t)*10,sp);
  ball.shot=true;ball.shotTeam=t;ball.power=pow;ball.gkRolled=false;Sfx.shot(pow);
  ball.corner=Math.abs(tx-CX)>GW/2-16;ball.shotDist=d;
  if(pow){t.fx.power=0;shake=8;burst(p.x,p.y,CARDS.power.col,18,160);floatText(p.x,p.y-20,'BOMBA!',CARDS.power.col);}
  else floatText(p.x,p.y-20,d>110?'UZAKTAN!':'ŞUT!',d>110?'#ffd23f':'#fff');
}

// takımın seçtiği hücum kanadının dünya x'i (orta için null)
function laneX(t){
  if(!t.lane)return null;
  return t.id===0?CX+t.lane*118:CX-t.lane*118;
}
// şut kalitesi: mesafe, açı ve araya giren savunmacılar (0 = şut yok)
function shotQuality(p,t){
  const g=oppGoal(t),d=dist(p,g),max=t.fx.power>0?280:TEMPO.shotRange;
  if(d>max)return 0;
  let q=1-d/max-Math.abs(p.x-CX)/d*.35;
  for(const o of teams[1-t.id].players)if(o.role!=='GK'&&segDist(o.x,o.y,p.x,p.y,CX,g.y)<9)q-=.3;
  if(d>72&&nearestOpp(p,t).d>28)q+=.08; // ceza sahası dışında, üzerinde baskı yok: vur
  return q;
}
// orta: kanattan ceza sahasındaki arkadaşa havadan
function cross(p,t){
  const g=oppGoal(t);let best=null,bs=-1e9;
  for(const r of t.players){
    if(r===p||r.role==='GK'||r.stun>0||looksOffside(r,t))continue;
    const dg=dist(r,g);if(dg>120||Math.abs(r.x-CX)>75)continue;
    const s=-dg*.3+Math.min(nearestOpp(r,t).d,40)+rnd(0,10);
    if(s>bs){bs=s;best=r;}
  }
  if(!best)return false;
  const tg={x:best.x+(CX-best.x)*.25,y:best.y+dirY(t)*8},d=dist(p,tg);
  pass(p,best,t,tg,clamp(d*1.2,190,300));
  if(ball.owner)return true; // ofsayta düştü
  ball.loft={t:0,T:Math.min(1.1,d/190),h:clamp(d/7,14,30)};
  best.volley=1.5; // gelen ortaya ilk vuruş
  floatText(p.x,p.y-20,'ORTA!','#fff');
  return true;
}
// önü en açık sürüş yönü
function dribbleDir(p,t){
  const g=oppGoal(t),c=(dirY(t)*Math.PI/2+Math.atan2(g.y-p.y,g.x-p.x))/2;
  let best=c,bs=-1e9,bc=0;
  for(let i=-3;i<=3;i++){
    const a=c+i*.38,ex=p.x+Math.cos(a)*45,ey=p.y+Math.sin(a)*45;
    if(ex<FX+10||ex>FX+FW-10)continue;
    let clr=70;for(const q of teams[1-t.id].players)clr=Math.min(clr,segDist(q.x,q.y,p.x,p.y,ex,ey));
    let s=clr-Math.abs(i)*5;
    const ny=toN(t,p.x,p.y).y,lx=laneX(t);
    if(lx!==null&&ny>.22)s-=Math.abs(ex-lx)*.35;
    if(s>bs){bs=s;best=a;bc=clr;}
  }
  return{a:best,clr:bc};
}
function carrierThink(p,t,dt){
  p.hold+=dt;p.decT-=dt;if(p.decT>0)return;p.decT=rnd(...TEMPO.think);
  if(ball.kickoff){pass(p,t.players[3],t);floatText(p.x,p.y-20,'SANTRA','#fff');return;}
  if(p.freeKick){p.freeKick=false;if(shotQuality(p,t)>-.45){shoot(p,t);return;}}
  if(p.role==='GK'){
    if(p.hold<1.2)return;
    const o=passOptions(p,t)[0];
    if(o)pass(p,o.r,t,o.tg,o.sp);else longBall(p,t); // kısa pas yoksa forvete havadan
    return;
  }
  if(t.fx.through>0&&throughPass(p,t)){t.fx.through=0;return;}
  if(t.fx.longball>0&&longBall(p,t))return;
  const g=oppGoal(t),dG=dist(p,g),press=nearestOpp(p,t).d,ny=toN(t,p.x,p.y).y;
  // ortadan gelen topa vole, yakından kesin şut, uzaktan ise açı ve boşluk varsa şut
  const q=shotQuality(p,t);
  // Güçlü Şut: iyi pozisyonu bekle (165 px içi, önü çok kapalı değil); süre bitmek üzereyse uzaktan da vur
  const powerReady=t.fx.power>0&&((dG<165&&q>-.3)||(t.fx.power<1.2&&dG<240));
  if(powerReady||p.volley>0&&dG<120||dG<58){shoot(p,t);return;}
  if(q>0&&Math.random()<q*.32+(press<26?.08:0)){shoot(p,t);return;}
  // ceza sahası içinde önü kapalı da olsa vur; ceza sahası önünde topu uzun süre tutma
  if(dG<85&&q>-.4&&Math.random()<.6){shoot(p,t);return;}
  if(dG<130&&p.hold>1.1&&q>-.25){shoot(p,t);return;}
  // kanatta ve son üçte birdeyse ortala
  if(Math.abs(p.x-CX)>85&&ny<.3&&Math.random()<(ny<.18?.75:.4)&&cross(p,t))return;
  const dd=dribbleDir(p,t);p.drib=dd.a;
  const best=passOptions(p,t)[0];
  // sürmeye devam etmenin değeri: önü ne kadar açık, ne kadar baskı var, topu ne zamandır tutuyor
  const keep=Math.min(dd.clr,60)*.8-(press<22?25:0)-p.hold*12+(t.fx.counter>0?10:0)+(t.fx.dribble>0?15:0)-(t.fx.tiki>0?12:0)
    -(ny>.5?15:0); // kendi yarı sahasında oyunu pasla kurar
  if(best&&(best.s>keep+12||(press<16&&best.s>-40)))pass(p,best.r,t,best.tg,best.sp);
}
const attacking=t=>(ball.owner&&ball.owner.team===t)||(!ball.owner&&ball.passTeam===t);
function formation(p,t){
  const b=toN(t,ball.x,ball.y),has=attacking(t);
  let nx=p.bx+(b.x-.5)*.35,ny=p.by+(b.y-.55)*.3;
  if(has){
    ny-=p.role==='FWD'?.22:p.role==='MID'?.16:.12;
    if(p.role==='DEF')nx=.5+(nx-.5)*1.45; // bekler kanada açılır
    if(t.fx.counter)ny-=.12;
    if(t.lane&&p.role!=='GK'){
      nx+=t.lane*.14;
      if(p.role==='DEF'&&(p.bx-.5)*t.lane>0){ny-=.12;nx=t.lane>0?.88:.12;} // kanat tarafındaki bek bindirir
    }
    if(t.fx.overlap&&p.role==='DEF'){ny-=.22;nx=p.bx<.5?.08:.92;} // bekler bindirir
  }else if(t.fx.offside&&p.role!=='GK')ny-=p.role==='DEF'?.16:.07; // ofsayt tuzağı: hat aniden öne çıkar
  if(t.fx.wave)ny-=.15;
  if(t.fx.wall&&!has){ny=.7+(p.by-.44)*.45+(b.y-.5)*.08;nx=.5+(nx-.5)*.75;}
  if(ball.kickoff)ny=Math.max(ny,has?.52:.6);
  nx+=Math.sin(now*.9+p.num)*.015;
  return{...toW(t,clamp(nx,.07,.93),clamp(ny,.1,.93)),sp:.85};
}
// hücumda boş alan bul: formasyon noktasının çevresinden en açık, pas yolu temiz yeri seç
function supportSpot(p,t){
  const base=formation(p,t),c=ball.owner,lim=offsideLimit(t);
  let best=base,bs=-1e9;
  for(let i=0;i<9;i++){
    const ox=(i%3-1)*34,oy=((i/3|0)-1)*34;
    let x=clamp(base.x+ox,FX+12,FX+FW-12),y=clamp(base.y+oy,FY+12,FY+FH-12);
    if(adv(t,y)>lim)y=lim*dirY(t);
    const pt={x,y};
    let s=Math.min(nearestOpp(pt,t).d,55)-Math.hypot(ox,oy)*.25;
    if(c&&c.team===t){
      const dc=dist(pt,c);
      if(dc<40)s-=25;if(dc>200)s-=20;
      s+=laneSafety(c,pt,passSpeed(dc),t)>0?15:-10;
    }
    for(const q of t.players)if(q!==p&&dist(q,pt)<30)s-=15;
    if(c&&c.team===t&&Math.abs(c.x-CX)>85&&p.role==='FWD')s-=Math.abs(pt.x-CX)*.3+dist(pt,oppGoal(t))*.15; // ortaya hazırlan
    if(s>bs){bs=s;best=pt;}
  }
  return best;
}
// savunma: topa basmayan oyuncular, kalemize en tehlikeli rakipleri adam adama tutar
function assignMarks(t){
  for(const p of t.players)p.mark=null;
  const opp=teams[1-t.id];
  if(!attacking(opp)||ball.kickoff)return;
  const g=ownGoal(t);
  const free=t.players.filter(p=>p.role!=='GK'&&p.stun<=0&&!t.chasers.includes(p));
  const atk=opp.players.filter(q=>q.role!=='GK'&&q!==ball.owner).sort((a,b)=>dist(a,g)-dist(b,g));
  for(const q of atk){
    if(!free.length)break;
    let bi=0,bd=1e9;free.forEach((p,i)=>{const d=dist(p,q);if(d<bd){bd=d;bi=i;}});
    free[bi].mark=q;free.splice(bi,1);
  }
}
// rakibin kale tarafında ve top tarafında dur; rakip kalemizden uzaksa bölge savunmasına yaslan
function markSpot(p,t){
  const q=p.mark,g=ownGoal(t);
  const dx=g.x-q.x,dy=g.y-q.y,d=Math.hypot(dx,dy)||1;
  const bx=ball.x-q.x,by=ball.y-q.y,bd=Math.hypot(bx,by)||1;
  const tight=t.fx.mark>0,md=tight?9:14;
  const mx=q.x+dx/d*md+bx/bd*7,my=q.y+dy/d*md+by/bd*7;
  const base=formation(p,t),w=tight?1:clamp(1-(d-110)/220,.25,1)*(t.fx.wall?.55:1);
  return{x:base.x+(mx-base.x)*w,y:base.y+(my-base.y)*w,sp:.95};
}
