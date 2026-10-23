// Takım yönetimi ve hareket: her karede takım görevleri dağıtır (kim topa basar, kim kimi tutar),
// her oyuncu durum makinesiyle bir durum seçer, durum bir hedef verir, oyuncu oraya koşar

// görev dağıtımı: topa koşan/basan oyuncular ve markajlar
function assignRoles(t){
  const o=ball.owner;
  const out=t.players.filter(p=>p.role!=='GK'&&p.stun<=0&&p!==o);
  // kendi son üçte birimizde ikinci oyuncu da topa basar
  const ref=o||ball,n=t.fx.press||(o&&o.team!==t&&toN(t,o.x,o.y).y>.72)?2:1;
  out.sort((a,b)=>dist(a,ref)-dist(b,ref));
  if(ball.kickoff||(ball.setT>0&&o&&o.team!==t))t.chasers=[]; // serbest vuruşta topa basılmaz
  else if(!o)t.chasers=ball.passTo&&ball.passTo.team===t?[ball.passTo]:out.slice(0,n);
  else if(o.team!==t)t.chasers=o.role==='GK'?[]:out.slice(0,n); // topu tutan kaleciye basılmaz
  else t.chasers=[];
  // Taktik Faul kartı: topçuya en yakın oyuncu faul için koşar (topu tutan kaleciye ve duran topta yapılmaz)
  t.fouler=t.fx.foul>0&&o&&o.team!==t&&o.role!=='GK'&&!ball.kickoff&&!(ball.setT>0)?out[0]||null:null;
  assignMarks(t);
}
// hedefe doğru hızlanarak koş, takım arkadaşlarından uzak dur, yüzünü hareket yönüne ya da topa çevir
function steer(p,t,tg,dt){
  let sp=TEMPO.run*p.spd*(t.fx.counter?1.3:1)*(t.fx.wave?1.25:1)*(p.superT>0?1.3:1)*tg.sp;
  if(ball.owner===p)sp*=t.fx.dribble>0?1:.82;
  if(p.sprint>0)sp*=1.45;else if(p.run>0)sp*=1.2;
  if(t.fx.offside>0&&p.role==='DEF'&&!attacking(t))sp*=1.25; // tuzak: hat hızla çıkar
  if(teams[1-t.id].fx.tiki>0&&attacking(teams[1-t.id]))sp*=.8; // tiki-taka: top peşinde koşan rakip yorulur
  if(ball.tactical&&ball.setT>0&&ball.owner&&ball.owner.team===t&&ball.owner!==p)sp*=.35; // taktik faul sonrası atak durur
  if(p.dash>0)sp=265;
  if(p.stun>0)sp=0;
  const dx=clamp(tg.x,FX+6,FX+FW-6)-p.x,dy=clamp(tg.y,FY+6,FY+FH-6)-p.y,d=Math.hypot(dx,dy);
  let ax=0,ay=0;
  if(d>2){const s=Math.min(sp,d*4);ax=dx/d*s;ay=dy/d*s;}
  for(const q of t.players){if(q===p)continue;const ex=p.x-q.x,ey=p.y-q.y,ed=Math.hypot(ex,ey);if(ed<22&&ed>0){ax+=ex/ed*(22-ed)*4;ay+=ey/ed*(22-ed)*4;}}
  if(p.dash<=0&&p!==ball.owner&&p!==ball.passTo)for(const q of teams[1-t.id].players){const ex=p.x-q.x,ey=p.y-q.y,ed=Math.hypot(ex,ey);if(ed<12&&ed>0){ax+=ex/ed*(12-ed)*9;ay+=ey/ed*(12-ed)*9;}} // rakibin içine girme
  const k=Math.min(1,dt*(p.dash>0?14:7));
  p.vx+=(ax-p.vx)*k;p.vy+=(ay-p.vy)*k;
  p.x=clamp(p.x+p.vx*dt,FX+6,FX+FW-6);p.y=clamp(p.y+p.vy*dt,FY+6,FY+FH-6);
  const v=Math.hypot(p.vx,p.vy);
  if(v>8){const ta=Math.atan2(p.vy,p.vx);let da=ta-p.fa;da=Math.atan2(Math.sin(da),Math.cos(da));p.fa+=da*Math.min(1,dt*12);}
  else if(p.role!=='GK'||ball.owner!==p){const ta=Math.atan2(ball.y-p.y,ball.x-p.x);let da=ta-p.fa;da=Math.atan2(Math.sin(da),Math.cos(da));p.fa+=da*Math.min(1,dt*5);}
  p.anim+=v*dt*.25;
  if(v>48&&Math.random()<dt*4)parts.push({x:p.x+rnd(-3,3),y:p.y+6,vx:-p.vx*.1,vy:-p.vy*.1,life:.4,t:0,c:'rgba(230,255,220,.6)',s:rnd(1,1.8)}); // koşu tozu
}
function simPlayers(dt){
  for(const t of teams){updateSeenLine(t,dt);assignRoles(t);}
  for(const t of teams)for(const p of t.players){
    playerGlobal(p,t,dt);
    p.fsm.change(p.role==='GK'?chooseKeeperState(p,t):chooseFieldState(p,t));
    let tg=p.fsm.update(dt);
    // serbest vuruşta rakipler topa 30 px'ten fazla yaklaşamaz
    if(ball.setT>0&&ball.owner&&ball.owner.team!==t){const d=dist(tg,ball);if(d<32){const k=32/(d||1);tg={...tg,x:ball.x+(tg.x-ball.x)*k,y:ball.y+(tg.y-ball.y)*k};}}
    // penaltıda vurucu ve kaleci dışında herkes ceza sahası dışında bekler
    if(ball.penalty&&ball.setT>0&&p!==ball.owner&&!(p.role==='GK'&&t!==ball.owner.team)){const g=oppGoal(ball.owner.team);if(inBox(tg,g))tg={...tg,y:g.y-dirY(ball.owner.team)*86};}
    steer(p,t,tg,dt);
  }
  separate();
}
// oyuncular birbirinin içinden geçmez: gövdeler çakışırsa ikisi de geri itilir (top süren daha az kayar)
const BODY=11;
function separate(){
  const all=teams[0].players.concat(teams[1].players);
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
    const a=all[i],b=all[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
    if(d>=BODY)continue;
    const nx=d>0?dx/d:1,ny=d>0?dy/d:0,o=BODY-d;
    const wa=a===ball.owner?.25:b===ball.owner?.75:.5;
    a.x=clamp(a.x-nx*o*wa,FX+6,FX+FW-6);a.y=clamp(a.y-ny*o*wa,FY+6,FY+FH-6);
    b.x=clamp(b.x+nx*o*(1-wa),FX+6,FX+FW-6);b.y=clamp(b.y+ny*o*(1-wa),FY+6,FY+FH-6);
  }
}
