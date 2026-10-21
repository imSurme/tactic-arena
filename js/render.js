// Canvas çizimi: saha, oyuncular, top, efektler
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const bg=document.createElement('canvas'),bctx=bg.getContext('2d');
let scale=1,dpr=1;
function resize(){
  const st=document.getElementById('stage').getBoundingClientRect();
  // pencere henüz boyutlanmadıysa (ilk açılış) tuvali 0 boyutla kurma; boyut gelince tekrar denenir
  if(st.width<10||st.height<10)return;
  scale=Math.min(st.width/W,st.height/H);dpr=window.devicePixelRatio||1;
  cv.style.width=W*scale+'px';cv.style.height=H*scale+'px';
  cv.width=bg.width=Math.round(W*scale*dpr);cv.height=bg.height=Math.round(H*scale*dpr);
  ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);
  bctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);
  renderField(bctx);
}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
// sabit saha: tribün, çim, çizgiler, kaleler — bir kez çizilir
function renderField(c){
  let seed=7;const sr=()=>(seed=(seed*16807)%2147483647)/2147483647;
  // tribün
  const st=c.createLinearGradient(0,0,0,H);st.addColorStop(0,'#141d48');st.addColorStop(.5,'#0e1636');st.addColorStop(1,'#141d48');
  c.fillStyle=st;c.fillRect(0,0,W,H);
  const crowd=['#2f80ff','#9cc4ff','#ff4d5e','#ffb0b8','#ffffff','#ffc83d','#3a4a8a','#3a4a8a'];
  for(let y=3;y<H;y+=5)for(let x=3;x<W;x+=5){
    if(x>FX-10&&x<FX+FW+10&&y>FY-12&&y<FY+FH+12)continue;
    c.globalAlpha=.25+sr()*.35;c.fillStyle=crowd[(sr()*crowd.length)|0];
    c.beginPath();c.arc(x+sr()*1.5,y+sr()*1.5,1.5,0,Math.PI*2);c.fill();
  }
  c.globalAlpha=1;
  // çim alanı (taşma payıyla)
  const ax=FX-10,ay=FY-12,aw=FW+20,ah=FH+24;
  c.save();c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=14;rr(c,ax,ay,aw,ah,14);c.fillStyle='#2fa855';c.fill();c.restore();
  c.save();rr(c,ax,ay,aw,ah,14);c.clip();
  const n=12;for(let i=-1;i<=n;i++){c.fillStyle=i%2?'#47c86b':'#3dba60';c.fillRect(ax,FY+i*FH/n,aw,FH/n);}
  // ince çim dokusu
  for(let i=0;i<2200;i++){c.fillStyle=sr()<.5?'rgba(255,255,255,.05)':'rgba(0,40,10,.07)';c.fillRect(ax+sr()*aw,ay+sr()*ah,1,2);}
  // projektör ışıkları
  for(const [lx,ly] of [[0,0],[W,0],[0,H],[W,H]]){const g=c.createRadialGradient(lx,ly,10,lx,ly,300);g.addColorStop(0,'rgba(255,255,230,.16)');g.addColorStop(1,'rgba(255,255,230,0)');c.fillStyle=g;c.fillRect(ax,ay,aw,ah);}
  const vg=c.createRadialGradient(CX,CY,120,CX,CY,340);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,20,10,.28)');c.fillStyle=vg;c.fillRect(ax,ay,aw,ah);
  c.restore();
  // çizgiler
  c.save();c.strokeStyle='rgba(255,255,255,.92)';c.fillStyle='rgba(255,255,255,.92)';c.lineWidth=2;c.shadowColor='rgba(255,255,255,.35)';c.shadowBlur=3;
  c.strokeRect(FX,FY,FW,FH);
  c.beginPath();c.moveTo(FX,CY);c.lineTo(FX+FW,CY);c.stroke();
  c.beginPath();c.arc(CX,CY,46,0,Math.PI*2);c.stroke();
  c.beginPath();c.arc(CX,CY,3,0,Math.PI*2);c.fill();
  const a0=Math.asin(20/36);
  for(const s of [1,-1]){
    const gy=s===1?FY:FY+FH;
    c.strokeRect(CX-90,s===1?gy:gy-72,180,72);
    c.strokeRect(CX-46,s===1?gy:gy-26,92,26);
    c.beginPath();c.arc(CX,gy+s*52,2.4,0,Math.PI*2);c.fill();
    c.beginPath();if(s===1)c.arc(CX,gy+52,36,a0,Math.PI-a0);else c.arc(CX,gy-52,36,Math.PI+a0,2*Math.PI-a0);c.stroke();
  }
  for(const [x,y,a] of [[FX,FY,0],[FX+FW,FY,.5],[FX+FW,FY+FH,1],[FX,FY+FH,1.5]]){c.beginPath();c.arc(x,y,8,a*Math.PI,(a+.5)*Math.PI);c.stroke();}
  c.restore();
  // orta yuvarlakta soluk amblem
  c.fillStyle='rgba(255,255,255,.06)';c.beginPath();c.arc(CX,CY,44,0,Math.PI*2);c.fill();
  c.save();c.globalAlpha=.1;c.font='14px '+FD;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.fillText('ARENA',CX,CY+20);c.restore();
  // köşe bayrakları
  for(const [x,y] of [[FX,FY],[FX+FW,FY],[FX,FY+FH],[FX+FW,FY+FH]]){
    c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+2,y+2,3,1.5,0,0,Math.PI*2);c.fill();
    c.fillStyle='#ffc83d';c.beginPath();c.moveTo(x,y);c.lineTo(x+(x<CX?-7:7),y-3);c.lineTo(x,y-6);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(x,y,1.6,0,Math.PI*2);c.fill();
  }
  drawGoal(c,FY,-1,teams?teams[1].color:'#ff4d5e');drawGoal(c,FY+FH,1,'#2f80ff');
}
function drawGoal(c,y,s,col){
  const d=18,x0=CX-GW/2,y0=s<0?y-d:y;
  c.save();
  c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x0+3,y0+(s<0?3:0),GW,d);
  const g=c.createLinearGradient(0,y,0,y+s*d);g.addColorStop(0,'rgba(255,255,255,.1)');g.addColorStop(1,'rgba(255,255,255,.28)');
  c.fillStyle=g;c.fillRect(x0,y0,GW,d);
  c.strokeStyle='rgba(255,255,255,.42)';c.lineWidth=.8;c.beginPath();
  for(let x=x0;x<=x0+GW;x+=6){c.moveTo(x,y0);c.lineTo(x,y0+d);}
  for(let yy=y0;yy<=y0+d;yy+=5){c.moveTo(x0,yy);c.lineTo(x0+GW,yy);}c.stroke();
  c.strokeStyle=col;c.lineWidth=3;c.lineJoin='round';
  c.beginPath();c.moveTo(x0,y);c.lineTo(x0,y+s*d);c.lineTo(x0+GW,y+s*d);c.lineTo(x0+GW,y);c.stroke();
  c.strokeStyle='#fff';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(x0,y);c.lineTo(x0+GW,y);c.stroke();
  c.fillStyle='#fff';for(const x of [x0,x0+GW]){c.beginPath();c.arc(x,y,3.6,0,Math.PI*2);c.fill();}
  c.restore();
}
function ell(x,y,rx,ry){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);}
// üstten görünüm oyuncu: omuzlar, kafa, saç, kollar ve koşan kramponlar
function drawPlayer(p){
  const t=p.team,gk=p.role==='GK',jersey=gk?t.gkColor:t.color,trim=gk?t.gkTrim:t.trim;
  const run=Math.min(1,Math.hypot(p.vx,p.vy)/55),sw=Math.sin(p.anim)*run;
  const x=p.x,y=p.y;
  // gölge ve takım tabanı
  ctx.fillStyle='rgba(0,15,5,.32)';ell(x+3,y+4,10.5,8);ctx.fill();
  ctx.globalAlpha=.9;ctx.strokeStyle=t.color;ctx.lineWidth=2;ell(x,y+2,12.5,8);ctx.stroke();
  ctx.globalAlpha=.16;ctx.fillStyle=t.color;ctx.fill();ctx.globalAlpha=1;
  if(ball.owner===p){ctx.strokeStyle='#ffc83d';ctx.lineWidth=2.5;ell(x,y+2,15+Math.sin(now*10)*1.2,9.5);ctx.stroke();}
  const aura=['wave','counter','press','wall'].find(k=>t.fx[k]>0);
  if(aura&&!gk){ctx.strokeStyle=CARDS[aura].col;ctx.globalAlpha=.5+Math.sin(now*8+p.num)*.25;ctx.lineWidth=2.5;ctx.setLineDash([4,4]);ctx.lineDashOffset=-now*20;ell(x,y+2,17,11);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
  if(gk&&t.fx.gk>0){ctx.strokeStyle=CARDS.gk.col;ctx.globalAlpha=.45+Math.sin(now*6)*.2;ctx.lineWidth=2.5;ell(x,y,26,26);ctx.stroke();ctx.globalAlpha=.08;ctx.fillStyle=CARDS.gk.col;ctx.fill();ctx.globalAlpha=1;}
  if(p.dash>0||p.sprint>0){ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=2;ctx.lineCap='round';const a=p.fa+Math.PI;for(const o of [-6,0,6]){const ox=Math.cos(a+Math.PI/2)*o,oy=Math.sin(a+Math.PI/2)*o;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*13+ox,y+Math.sin(a)*13+oy);ctx.lineTo(x+Math.cos(a)*(22+Math.abs(o))+ox,y+Math.sin(a)*(22+Math.abs(o))+oy);ctx.stroke();}ctx.lineCap='butt';}
  ctx.save();ctx.translate(x,y-1);ctx.rotate(p.fa);
  // kramponlar
  for(const s of [-1,1]){const fx=sw*s*5.5;ctx.fillStyle='#161a2b';ell(fx+1.5,s*3.8,3.4,2.3);ctx.fill();ctx.fillStyle=t.light;ell(fx+3.4,s*3.8,1,1.2);ctx.fill();}
  // kollar
  for(const s of [-1,1]){const ax=-sw*s*3.2;ctx.fillStyle=jersey;ell(ax*.4,s*8.2,3.4,3.1);ctx.fill();ctx.fillStyle=gk?'#f4f7ff':p.skin;ell(ax+1,s*9.6,2.5,2.4);ctx.fill();}
  // gövde (forma)
  const g=ctx.createLinearGradient(-6,-9,6,9);g.addColorStop(0,jersey);g.addColorStop(1,gk?jersey:t.dark);
  ctx.fillStyle=g;ell(0,0,6.4,9.4);ctx.fill();
  ctx.strokeStyle=trim;ctx.lineWidth=1.4;ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.22)';ell(-1.2,0,2.2,7.8);ctx.fill();
  // kafa ve saç
  ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(1,0,4.9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.hair;ctx.beginPath();ctx.arc(.4,0,5.1,Math.PI*.55,Math.PI*1.45);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.ellipse(-.6,0,3.6,4.6,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  // forma numarası rozeti
  ctx.font='800 8px '+FB;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=t.dark;ell(x+9,y+9,4.6,4.6);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillText(p.num,x+9,y+9.6);
  if(p.stun>0){ctx.fillStyle='#ffe066';for(let i=0;i<3;i++){const a=now*7+i*2.1;ctx.beginPath();ctx.arc(x+Math.cos(a)*9,y-14+Math.sin(a)*3,1.8,0,Math.PI*2);ctx.fill();}}
}
function drawBall(){
  const b=ball,sp=Math.hypot(b.vx,b.vy),z=b.z||0;
  const lift=z>0?z:!b.owner&&b.shot?Math.min(6,sp/80):!b.owner&&sp>200?2:0,r=4.6*(1+lift/45);
  if(!b.owner&&sp>180&&z<=0){
    b.trail.forEach((q,i)=>{const k=i/b.trail.length;ctx.globalAlpha=k*.55;ctx.fillStyle=b.power?'#ff6fbf':'#fff';ctx.beginPath();ctx.arc(q.x,q.y-lift*k,4.4*k+.8,0,Math.PI*2);ctx.fill();});
    ctx.globalAlpha=1;
  }
  const sh=1/(1+lift/25);
  ctx.fillStyle='rgba(0,15,5,'+(.35*sh+.08)+')';ell(b.x+2+lift*.5,b.y+3+lift*.35,4.4*sh+1,2.6*sh+.6);ctx.fill();
  const y=b.y-lift;
  const g=ctx.createRadialGradient(b.x-1.5,y-1.8,.5,b.x,y,r+.4);g.addColorStop(0,'#fff');g.addColorStop(1,'#cfd6e8');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,y,r,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(b.x,y,r,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#1b2142';
  for(let i=0;i<3;i++){const a=b.rot+i*2.1;ctx.beginPath();ctx.arc(b.x+Math.cos(a)*r*.74,y+Math.sin(a)*r*.48,r*.33,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  ctx.strokeStyle='#1b2142';ctx.lineWidth=.9;ctx.beginPath();ctx.arc(b.x,y,r,0,Math.PI*2);ctx.stroke();
  if(b.power&&b.shot){ctx.strokeStyle='#ff6fbf';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,y,8+Math.sin(now*30)*1.5,0,Math.PI*2);ctx.stroke();}
}
// hakem işaretleri: ofsaytta yan hakem bayrağı ve çizgi, faulde sarı kart, serbest vuruşta mesafe halkası
function drawRefFx(){
  for(const f of refFx){
    const k=f.t/f.life,a=k>.75?(1-k)/.25:1;
    ctx.save();ctx.globalAlpha=a;
    if(f.type==='flag'){
      const y=f.line,wave=Math.sin(f.t*14)*3;
      ctx.strokeStyle=CARDS.offside.col;ctx.lineWidth=2;ctx.setLineDash([6,5]);
      ctx.beginPath();ctx.moveTo(FX,y);ctx.lineTo(FX+FW,y);ctx.stroke();ctx.setLineDash([]);
      // bayrak: saha kenarında yükselir ve sallanır
      const fx=FX-9,top=y-22*Math.min(1,f.t*5);
      ctx.strokeStyle='#e8ecf8';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(fx,y);ctx.lineTo(fx,top);ctx.stroke();
      ctx.fillStyle='#ffe14d';ctx.beginPath();ctx.moveTo(fx,top);ctx.lineTo(fx+11,top+3+wave*.4);ctx.lineTo(fx+10,top+9+wave);ctx.lineTo(fx,top+8);ctx.fill();
      ctx.fillStyle='#ff4d5e';ctx.beginPath();ctx.moveTo(fx,top);ctx.lineTo(fx+5.5,top+1.5+wave*.2);ctx.lineTo(fx+5,top+8.5+wave*.5);ctx.lineTo(fx,top+8);ctx.fill();
    }else if(f.type==='card'){
      const y=f.y-28-f.t*10;
      ctx.translate(f.x,y);ctx.rotate(-.15);
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-4,-5,10,13);
      ctx.fillStyle='#ffd23f';ctx.fillRect(-5,-7,10,13);
      ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.strokeRect(-5,-7,10,13);
    }
    ctx.restore();
  }
  if(ball.setT>0&&ball.owner){
    ctx.save();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.5;ctx.setLineDash([3,4]);ctx.lineDashOffset=-now*12;
    ctx.beginPath();ctx.arc(ball.x,ball.y,30,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
}
// giden pasın rotası ve iniş noktası
function drawPassLine(){
  const b=ball;if(b.owner||!b.passTo||!b.passTarget||b.shot)return;
  const t=b.passTeam,tg=b.passTarget;
  ctx.save();ctx.strokeStyle=t.light;ctx.globalAlpha=.55;ctx.lineWidth=1.6;ctx.setLineDash([2,5]);ctx.lineDashOffset=-now*30;
  ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(tg.x,tg.y);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=.7;ell(tg.x,tg.y+1,7+Math.sin(now*8),4.2);ctx.stroke();
  ctx.restore();
}
// kart etkilerinin sahadaki izi: duvar hattı, ofsayt çizgisi, baskı alanı, pas üçgenleri, markaj bağları
function drawZones(){
  const pulse=.5+Math.sin(now*6)*.2;
  for(const t of teams){
    const fx=t.fx,outs=t.players.filter(p=>p.role!=='GK'),o=ball.owner;
    if(fx.wall>0){
      const defs=outs.filter(p=>p.role==='DEF'),y=defs.reduce((a,p)=>a+p.y,0)/defs.length+dirY(t)*14;
      ctx.save();ctx.globalAlpha=.22*pulse+.1;ctx.fillStyle=CARDS.wall.col;
      ctx.fillRect(FX,Math.min(y,y-dirY(t)*10),FW,10);
      ctx.globalAlpha=.8*pulse;ctx.strokeStyle=CARDS.wall.col;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(FX+4,y);ctx.lineTo(FX+FW-4,y);ctx.stroke();ctx.restore();
    }
    if(fx.offside>0){
      let line=-1e9;for(const p of outs)line=Math.max(line,-adv(t,p.y));
      const y=-line*dirY(t);
      ctx.save();ctx.strokeStyle=CARDS.offside.col;ctx.globalAlpha=.85;ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.lineDashOffset=now*20;
      ctx.beginPath();ctx.moveTo(FX,y);ctx.lineTo(FX+FW,y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=CARDS.offside.col;ctx.beginPath();ctx.moveTo(FX+2,y);ctx.lineTo(FX+2,y-12);ctx.lineTo(FX+12,y-8);ctx.lineTo(FX+2,y-4);ctx.fill();
      ctx.restore();
    }
    if(fx.press>0&&o&&o.team!==t){
      ctx.save();const g=ctx.createRadialGradient(o.x,o.y,4,o.x,o.y,34);
      g.addColorStop(0,'rgba(167,123,255,0)');g.addColorStop(.7,'rgba(167,123,255,.18)');g.addColorStop(1,'rgba(167,123,255,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(o.x,o.y,34,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=CARDS.press.col;ctx.globalAlpha=pulse;ctx.lineWidth=2;ctx.setLineDash([3,4]);ctx.lineDashOffset=now*25;
      ctx.beginPath();ctx.arc(o.x,o.y,26,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if(fx.tiki>0){
      ctx.save();ctx.strokeStyle=CARDS.tiki.col;ctx.globalAlpha=.35;ctx.lineWidth=1.5;
      for(let i=0;i<outs.length;i++)for(let j=i+1;j<outs.length;j++){if(dist(outs[i],outs[j])<130){ctx.beginPath();ctx.moveTo(outs[i].x,outs[i].y);ctx.lineTo(outs[j].x,outs[j].y);ctx.stroke();}}
      ctx.restore();
    }
    if(fx.mark>0){
      ctx.save();ctx.strokeStyle=CARDS.mark.col;ctx.globalAlpha=.6;ctx.lineWidth=1.5;ctx.setLineDash([2,3]);
      for(const p of outs)if(p.mark){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.mark.x,p.mark.y);ctx.stroke();}
      ctx.restore();
    }
  }
}
// gol anında ve top kaleye yaklaşınca tribünde flaşlar patlar
function drawCrowdFlashes(){
  const d=Math.min(dist(ball,oppGoal(teams[0])),dist(ball,oppGoal(teams[1])));
  const n=state==='goal'?14:d<70&&state==='play'?3:0;
  ctx.fillStyle='#fff';
  for(let i=0;i<n;i++){
    if(Math.random()>.5)continue;
    const top=Math.random()<.5,x=rnd(4,W-4),y=Math.random()<.7?(top?rnd(2,FY-14):rnd(FY+FH+14,H-2)):rnd(FY,FY+FH);
    const xx=y>FY-12&&y<FY+FH+12?(Math.random()<.5?rnd(1,FX-11):rnd(FX+FW+11,W-1)):x;
    ctx.globalAlpha=rnd(.5,1);ctx.beginPath();ctx.arc(xx,y,rnd(.8,1.8),0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function drawBanners(){
  for(const b of banners){
    const k=b.t/b.life;
    if(b.type==='big'){
      const s=k<.15?k/.15*1.2:k<.25?1.2-(k-.15)*2:1,a=k>.8?(1-k)/.2:1;
      ctx.save();ctx.globalAlpha=a;ctx.translate(CX,CY-10);ctx.scale(s,s);ctx.rotate(-.06);
      ctx.font='70px '+FD;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineJoin='round';ctx.lineWidth=12;ctx.strokeStyle='#0b1230';ctx.strokeText(b.text,0,0);
      ctx.fillStyle='#0b1230';ctx.fillText(b.text,0,5);ctx.fillStyle=b.color;ctx.fillText(b.text,0,0);
      ctx.fillStyle='rgba(255,255,255,.35)';ctx.save();ctx.beginPath();ctx.rect(-150,-40,300,22);ctx.clip();ctx.fillText(b.text,0,0);ctx.restore();
      ctx.font='800 17px '+FB;ctx.lineWidth=5;ctx.strokeText(b.sub,0,50);ctx.fillStyle='#fff';ctx.fillText(b.sub,0,50);
      ctx.restore();
    }else if(b.type==='info'){
      const a=k<.1?k/.1:k>.8?(1-k)/.2:1;
      ctx.save();ctx.globalAlpha=a;ctx.font='36px '+FD;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
      ctx.lineWidth=9;ctx.strokeStyle='#0b1230';ctx.strokeText(b.text,CX,CY-30);ctx.fillStyle=b.color;ctx.fillText(b.text,CX,CY-30);
      if(b.sub){ctx.font='800 15px '+FB;ctx.lineWidth=5;ctx.strokeText(b.sub,CX,CY+4);ctx.fillStyle='#fff';ctx.fillText(b.sub,CX,CY+4);}
      ctx.restore();
    }
  }

}
function draw(){
  ctx.save();
  if(shake>0)ctx.translate(rnd(-1,1)*shake*.5,rnd(-1,1)*shake*.5);
  if(bg.width&&bg.height)ctx.drawImage(bg,0,0,W,H);
  drawCrowdFlashes();
  drawZones();drawPassLine();drawRefFx();
  const ps=teams.flatMap(t=>t.players).sort((a,b)=>a.y-b.y);
  // oyuncular biraz daha büyük ve okunaklı
  for(const p of ps){ctx.save();ctx.translate(p.x,p.y);ctx.scale(1.12,1.12);ctx.translate(-p.x,-p.y);drawPlayer(p);ctx.restore();}
  drawBall();
  if(DEBUG){
    ctx.font='800 7px '+FB;ctx.textAlign='center';ctx.textBaseline='middle';
    for(const p of ps){const st=p.fsm.current;if(!st)continue;ctx.fillStyle='rgba(11,18,48,.8)';rr(ctx,p.x-11,p.y-25,22,10,4);ctx.fill();ctx.fillStyle=p.team.light;ctx.fillText(st.short,p.x,p.y-19.6);}
  }
  for(const p of parts){
    const k=p.t/p.life;ctx.globalAlpha=1-k;
    if(p.ring){ctx.strokeStyle=p.c;ctx.lineWidth=3*(1-k)+.5;ell(p.x,p.y+2,10+k*18,6+k*11);ctx.stroke();}
    else if(p.sq){ctx.fillStyle=p.c;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.t*8);ctx.fillRect(-p.s/2,-p.s,p.s,p.s*2);ctx.restore();}
    else{ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=1;
  ctx.font='12px '+FD;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  for(const f of floats){const k=f.t/f.life,s=k<.15?.6+k/.15*.4:1;ctx.save();ctx.globalAlpha=1-k*k;ctx.translate(f.x,f.y);ctx.scale(s,s);ctx.lineWidth=4;ctx.strokeStyle='#0b1230';ctx.strokeText(f.text,0,0);ctx.fillStyle=f.c;ctx.fillText(f.text,0,0);ctx.restore();}
  drawBanners();
  ctx.restore();
}

