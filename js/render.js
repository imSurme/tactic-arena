// Canvas çizimi: saha, oyuncular, top, efektler
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const bg=document.createElement('canvas'),bctx=bg.getContext('2d');
let scale=1,dpr=1,viewCrop=0; // viewCrop: tuvalin üstünden ve altından kırpılan oyun pikseli
let offX=0,offY=0; // tuval sahneyi tamamen doldurur; oyun alanı ortalanır, kalan yer tribündür (oyun pikseli)
function resize(){
  const st=document.getElementById('stage').getBoundingClientRect();
  // pencere henüz boyutlanmadıysa (ilk açılış) tuvali 0 boyutla kurma; boyut gelince tekrar denenir
  if(st.width<10||st.height<10)return;
  viewCrop=matchMedia('(max-aspect-ratio:3/4)').matches?10:0;
  const vh=H-viewCrop*2;
  const cw=Math.floor(st.width),ch=Math.floor(st.height);
  scale=Math.min(cw/W,ch/vh);dpr=window.devicePixelRatio||1;
  offX=(cw/scale-W)/2;offY=(ch/scale-vh)/2;
  cv.style.width=cw+'px';cv.style.height=ch+'px';
  cv.width=bg.width=Math.round(cw*dpr);cv.height=bg.height=Math.round(ch*dpr);
  ctx.setTransform(scale*dpr,0,0,scale*dpr,offX*scale*dpr,(offY-viewCrop)*scale*dpr);
  bctx.setTransform(scale*dpr,0,0,scale*dpr,offX*scale*dpr,(offY-viewCrop)*scale*dpr);
  renderField(bctx);
}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
// sabit saha: tribün, çim, çizgiler, kaleler — bir kez çizilir
function renderField(c){
  let seed=7;const sr=()=>(seed=(seed*16807)%2147483647)/2147483647;
  // tribün
  // görünen alanın tamamı (saha dar kalınca yanlar, kısa kalınca üst ve alt da tribün)
  const x0=-offX-2,x1=W+offX+2,y0=viewCrop-offY-2,y1=H-viewCrop+offY+2;
  const st=c.createLinearGradient(0,y0,0,y1);st.addColorStop(0,'#141d48');st.addColorStop(.5,'#0e1636');st.addColorStop(1,'#141d48');
  c.fillStyle=st;c.fillRect(x0,y0,x1-x0,y1-y0);
  // tribün: koltuk sıraları, reklam panoları ve uzaktaki taraftarlar (yakındakiler her karede canlı çizilir)
  Crowd.bake(c,x0,x1,y0,y1);
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
  drawGoal(c,FY,-1,teams?teams[1].color:'#ff4d5e');drawGoal(c,FY+FH,1,teams?teams[0].color:'#2f80ff');
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
// arcade oyuncu: kalın koyu kontur, geniş omuzlu forma, büyük kafa; yüzün baktığı taraf açık (yön okunur)
const OUT='#0d1330';
function drawBody(p,x,y,jersey,trim,gk,run,sw){
  const t=p.team,dt=Math.min(.05,Math.max(0,now-(p.lastDraw??now)));p.lastDraw=now;
  // canlılık: kafa topu izler, vuruşta bacak uzar, golde sevinç / üzüntü
  const want=Math.atan2(ball.y-y,ball.x-x)-p.fa;let dl=Math.atan2(Math.sin(want),Math.cos(want));
  dl=clamp(dl,-1.25,1.25);p.look+=(dl-p.look)*Math.min(1,dt*8);
  if(p.kickA>0)p.kickA=Math.max(0,p.kickA-dt);
  const ch=Crowd.cheering(),joy=ch===t.id,sad=ch>=0&&ch!==t.id;
  const phase=p.anim*p.stride,step=Math.sin(phase)*run;
  const bob=(run*Math.abs(Math.sin(phase))*.8)+(joy?Math.abs(Math.sin(now*9+p.num))*3:0);
  const breathe=1+(1-run)*Math.sin(now*2.2+p.num)*.03;
  const bw=8.4*p.build*breathe*(sad?.92:1),bh=5.8*p.build;
  ctx.save();ctx.translate(x,y-1-bob);ctx.rotate(p.fa); // +x: baktığı yön
  ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=1.5;ctx.strokeStyle=OUT;
  // bacaklar ve kramponlar: koşarken adım, vuruşta sağ bacak öne uzanır
  const kick=p.kickA>0?Math.sin((1-p.kickA/.28)*Math.PI):0;
  for(const sd of [-1,1]){
    let fx=step*sd*5;if(sd===1&&kick>0)fx=2+kick*6.5;
    ctx.fillStyle=jersey==='#ffffff'?'#dfe5f5':t.dark;ell(fx*.45,sd*3.2,3,2.4);ctx.fill(); // şort/bacak
    ctx.fillStyle=p.boots;ell(fx+1,sd*3.4,3.3,2.2);ctx.fill();ctx.stroke();
  }
  // gövde hafif öne eğilir (koşu) ya da omuzlar düşer (gol yenince)
  const lean=run*1.2-(sad?1.2:0);ctx.translate(lean,0);
  // kollar: bacaklara ters sallanır; sevinçte iki yana açılır; kalecinin eldivenleri büyük
  for(const sd of [-1,1]){
    let ax=-step*sd*3.4,ay=sd*(bw-.4);
    if(joy){ax=2+Math.sin(now*12+sd)*1.5;ay=sd*(bw+3.2);}
    ctx.fillStyle=jersey;ell(ax*.35,sd*(bw-1),3,2.7);ctx.fill();ctx.stroke();
    ctx.fillStyle=gk?'#f2ff6b':p.skin;ell(ax+1.2,ay+sd*1.2,gk?2.9:2.1,gk?2.9:2.1);ctx.fill();ctx.stroke();
  }
  // forma: oval gövde, omuzlara doğru genişler
  const torso=()=>{ctx.beginPath();ctx.moveTo(bh*.9,0);ctx.bezierCurveTo(bh*.9,-bw*.75,bh*.2,-bw,-bh*.35,-bw);ctx.bezierCurveTo(-bh*1.05,-bw,-bh*1.1,-bw*.45,-bh*1.1,0);ctx.bezierCurveTo(-bh*1.1,bw*.45,-bh*1.05,bw,-bh*.35,bw);ctx.bezierCurveTo(bh*.2,bw,bh*.9,bw*.75,bh*.9,0);ctx.closePath();};
  ctx.fillStyle=jersey;torso();ctx.fill();
  ctx.save();torso();ctx.clip();
  ctx.globalAlpha=.5;ctx.fillStyle=gk?'#000':t.dark;ctx.fillRect(-bh,-bw,bh*.75,bw*2);ctx.globalAlpha=1; // sırt gölgesi
  ctx.fillStyle=trim;ctx.beginPath();ctx.ellipse(-bh*.3,-bw+1.2,2.6,1.6,0,0,Math.PI*2);ctx.ellipse(-bh*.3,bw-1.2,2.6,1.6,0,0,Math.PI*2);ctx.fill(); // omuz şeritleri
  ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.ellipse(bh*.45,-bw*.35,1.4,bw*.45,0,0,Math.PI*2);ctx.fill(); // ön ışık
  ctx.restore();
  torso();ctx.stroke();
  // kafa: gövdeden bağımsız döner, topa bakar
  ctx.rotate(p.look);
  const hx=.4,hr=4.8;
  drawHead(p,hx,hr,run,phase);
  ctx.restore();
  // forma numarası rozeti
  ctx.font='800 7.5px '+FB;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=t.dark;ctx.beginPath();ctx.arc(x+9,y+8.5,4.4,0,Math.PI*2);ctx.fill();ctx.lineWidth=1.3;ctx.strokeStyle='#fff';ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillText(p.num,x+9,y+9);
}
// kafa ve saç modelleri (+x yüzün baktığı yön): 0 kısa, 1 dikenli, 2 afro, 3 mohikan, 4 topuz, 5 at kuyruğu, 6 kel
function drawHead(p,hx,hr,run,phase){
  const st=p.hairStyle,hair=p.hair;
  // at kuyruğu kafanın arkasından sallanır (kafadan önce çizilir)
  if(st===5){const sw2=Math.sin(phase*1.0)*run*2.2;ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(hx-hr+1,-1.6);ctx.quadraticCurveTo(hx-hr-3.5,sw2*.5-1,hx-hr-5.5,sw2);ctx.quadraticCurveTo(hx-hr-3.5,sw2*.5+1,hx-hr+1,1.6);ctx.closePath();ctx.fill();ctx.stroke();}
  if(st===4){ctx.fillStyle=hair;ctx.beginPath();ctx.arc(hx-hr-.8,0,1.9,0,Math.PI*2);ctx.fill();ctx.stroke();}
  // afro kafadan büyük, tümsekli
  if(st===2){ctx.fillStyle=hair;ctx.beginPath();for(let i=0;i<9;i++){const an=Math.PI*.35+i*(Math.PI*1.3/8);ctx.moveTo(hx-.8+Math.cos(an)*(hr+.3)+1.7,Math.sin(an)*(hr+.3));ctx.arc(hx-.8+Math.cos(an)*(hr+.3),Math.sin(an)*(hr+.3),1.7,0,Math.PI*2);}ctx.fill();}
  // yüz / kafa
  ctx.fillStyle=p.skin;ctx.beginPath();ctx.arc(hx,0,hr,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.hair;ctx.beginPath();
  if(st===0||st===4||st===5){ // kısa / topuz / at kuyruğu: arka yarı + öne doğru perçem
    ctx.arc(hx,0,hr+.3,Math.PI*.42,Math.PI*1.58);ctx.quadraticCurveTo(hx+3.4,0,hx+Math.cos(Math.PI*.42)*(hr+.3),Math.sin(Math.PI*.42)*(hr+.3));
  }else if(st===1){ // dikenli
    ctx.moveTo(hx+1.4,-hr+.2);
    for(let i=0;i<=8;i++){const an=-Math.PI/2-i*Math.PI/8,rad=i%2?hr+1.2:hr+.2;ctx.lineTo(hx+Math.cos(an)*rad,Math.sin(an)*rad);}
    ctx.lineTo(hx+1.4,hr-.2);ctx.quadraticCurveTo(hx+.4,0,hx+1.4,-hr+.2);
  }else if(st===2){ // afro üst katman
    ctx.arc(hx-.4,0,hr+.6,Math.PI*.38,Math.PI*1.62);ctx.quadraticCurveTo(hx+2.6,0,hx-.4+Math.cos(Math.PI*.38)*(hr+.6),Math.sin(Math.PI*.38)*(hr+.6));
  }else if(st===3){ // mohikan: ortada şerit, yanlar kısa kazınmış
    ctx.globalAlpha=.25;ctx.arc(hx,0,hr,Math.PI*.45,Math.PI*1.55);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.moveTo(hx+hr-.6,-1.3);ctx.lineTo(hx-hr-1.4,-1.7);ctx.lineTo(hx-hr-1.4,1.7);ctx.lineTo(hx+hr-.6,1.3);ctx.closePath();
  }else{ // kel: parlama
    ctx.globalAlpha=.18;ctx.arc(hx,0,hr,Math.PI*.5,Math.PI*1.5);ctx.closePath();ctx.fill();ctx.globalAlpha=1;ctx.beginPath();
  }
  ctx.fill();
  if(st!==6){ctx.lineWidth=.9;ctx.strokeStyle='rgba(13,19,48,.5)';ctx.stroke();}
  ctx.lineWidth=1.5;ctx.strokeStyle=OUT;ctx.beginPath();ctx.arc(hx,0,hr,0,Math.PI*2);ctx.stroke();
  // kulaklar ve burun: yönü belli eder
  ctx.fillStyle=p.skin;for(const sd of [-1,1]){ctx.beginPath();ctx.arc(hx-.6,sd*hr,1.2,0,Math.PI*2);ctx.fill();ctx.lineWidth=1;ctx.stroke();}
  ctx.fillStyle='rgba(0,0,0,.2)';ell(hx+hr-1,0,1,1.2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,'+(st===6?.55:.3)+')';ell(hx+1.6,-2,1.5,.9);ctx.fill();
  ctx.lineWidth=1.5;ctx.strokeStyle=OUT;
}
function drawPlayer(p){
  const t=p.team,gk=p.role==='GK',jersey=gk?t.gkColor:t.color,trim=gk?t.gkTrim:t.trim;
  const run=Math.min(1,Math.hypot(p.vx,p.vy)/55),sw=Math.sin(p.anim)*run;
  const x=p.x,y=p.y;
  // gölge ve takım tabanı
  ctx.fillStyle='rgba(0,20,8,.38)';ell(x+2.5,y+4,10,7.5);ctx.fill();
  // topa basan oyuncu: top sahibine yakın ve ona doğru koşuyor
  const o=ball.owner;
  if(o&&o.team!==t&&!gk){const dx=o.x-x,dy=o.y-y,d=Math.hypot(dx,dy),v=Math.hypot(p.vx,p.vy);
    if(d<70&&v>20&&(dx*p.vx+dy*p.vy)/(d*v||1)>.7){ctx.globalAlpha=.9;ctx.strokeStyle=t.color;ctx.lineWidth=2;ell(x,y+2,12.5,8);ctx.stroke();ctx.globalAlpha=.16;ctx.fillStyle=t.color;ctx.fill();ctx.globalAlpha=1;}}
  if(ball.owner===p){ctx.strokeStyle='#ffc83d';ctx.lineWidth=2.5;ell(x,y+2,15+Math.sin(now*10)*1.2,9.5);ctx.stroke();}
  if(p.superT>0){ // yıldız oyuncu: altın hale ve parıltı
    ctx.save();ctx.globalAlpha=.55+Math.sin(now*9)*.2;ctx.strokeStyle=CARDS.hero.col;ctx.lineWidth=3;ell(x,y+2,18,12);ctx.stroke();
    ctx.globalAlpha=.18;ctx.fillStyle=CARDS.hero.col;ctx.fill();ctx.restore();
    if(Math.random()<.35)parts.push({x:x+rnd(-10,10),y:y+rnd(-12,6),vx:rnd(-12,12),vy:rnd(-40,-15),life:.6,t:0,c:'#fff3a0',s:rnd(1,2)});
  }
  const aura=['wave','counter','press','wall'].find(k=>t.fx[k]>0);
  if(aura&&!gk){ctx.strokeStyle=CARDS[aura].col;ctx.globalAlpha=.5+Math.sin(now*8+p.num)*.25;ctx.lineWidth=2.5;ctx.setLineDash([4,4]);ctx.lineDashOffset=-now*20;ell(x,y+2,17,11);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
  if(gk&&t.fx.gk>0){ctx.strokeStyle=CARDS.gk.col;ctx.globalAlpha=.45+Math.sin(now*6)*.2;ctx.lineWidth=2.5;ell(x,y,26,26);ctx.stroke();ctx.globalAlpha=.08;ctx.fillStyle=CARDS.gk.col;ctx.fill();ctx.globalAlpha=1;}
  if(p.dash>0||p.sprint>0){ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=2;ctx.lineCap='round';const a=p.fa+Math.PI;for(const o of [-6,0,6]){const ox=Math.cos(a+Math.PI/2)*o,oy=Math.sin(a+Math.PI/2)*o;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*13+ox,y+Math.sin(a)*13+oy);ctx.lineTo(x+Math.cos(a)*(22+Math.abs(o))+ox,y+Math.sin(a)*(22+Math.abs(o))+oy);ctx.stroke();}ctx.lineCap='butt';}
  drawBody(p,x,y,jersey,trim,gk,run,sw);
  if(p.stun>0){ctx.fillStyle='#ffe066';for(let i=0;i<3;i++){const a=now*7+i*2.1;ctx.beginPath();ctx.arc(x+Math.cos(a)*9,y-14+Math.sin(a)*3,1.8,0,Math.PI*2);ctx.fill();}}
}
function drawBall(){
  const b=ball,sp=Math.hypot(b.vx,b.vy),z=b.z||0;
  const lift=z>0?z:!b.owner&&b.shot?Math.min(6,sp/80):!b.owner&&sp>200?2:0,r=5.4*(1+lift/45);
  if(!b.owner&&sp>180&&z<=0){
    b.trail.forEach((q,i)=>{const k=i/b.trail.length;ctx.globalAlpha=k*.55;ctx.fillStyle=b.power?'#ff6fbf':'#fff';ctx.beginPath();ctx.arc(q.x,q.y-lift*k,4.4*k+.8,0,Math.PI*2);ctx.fill();});
    ctx.globalAlpha=1;
  }
  const sh=1/(1+lift/25);
  ctx.fillStyle='rgba(0,15,5,'+(.35*sh+.08)+')';ell(b.x+2+lift*.5,b.y+3+lift*.35,4.4*sh+1,2.6*sh+.6);ctx.fill();
  const y=b.y-lift;
  ctx.save();ctx.translate(b.x,y);
  const g=ctx.createRadialGradient(-1.6,-1.9,.4,0,0,r+.5);g.addColorStop(0,'#ffffff');g.addColorStop(.7,'#eef2fb');g.addColorStop(1,'#b9c3dc');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
  // dönen beşgen paneller (top yuvarlanıyormuş gibi kayar)
  ctx.fillStyle='#1b2142';
  const pent=(cx,cy,rad,rot)=>{ctx.beginPath();for(let i=0;i<5;i++){const an=rot+i*Math.PI*2/5;ctx.lineTo(cx+Math.cos(an)*rad,cy+Math.sin(an)*rad);}ctx.closePath();ctx.fill();};
  const ph=b.rot%1.6;
  pent(0,0,r*.36,b.rot*.6);
  for(let i=0;i<5;i++){const an=b.rot*.6+i*Math.PI*2/5+Math.PI/5;pent(Math.cos(an)*r*(.95+ph*.1),Math.sin(an)*r*(.95+ph*.1),r*.3,an);}
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.85)';ell(-r*.38,-r*.42,r*.26,r*.17);ctx.fill();
  ctx.lineWidth=1.4;ctx.strokeStyle=OUT;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
  ctx.restore();
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
    const top=Math.random()<.5,x=rnd(4-offX,W+offX-4),y=Math.random()<.7?(top?rnd(viewCrop-offY,FY-14):rnd(FY+FH+14,H-viewCrop+offY)):rnd(FY,FY+FH);
    const xx=y>FY-12&&y<FY+FH+12?(Math.random()<.5?rnd(-offX,FX-11):rnd(FX+FW+11,W+offX)):x;
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
  if(bg.width&&bg.height)ctx.drawImage(bg,-offX,viewCrop-offY,bg.width/(scale*dpr),bg.height/(scale*dpr));
  Crowd.draw(ctx);
  drawCrowdFlashes();
  drawZones();drawPassLine();drawRefFx();
  const ps=teams.flatMap(t=>t.players).sort((a,b)=>a.y-b.y);
  // oyuncular biraz daha büyük ve okunaklı
  for(const p of ps){ctx.save();ctx.translate(p.x,p.y);ctx.scale(1.22,1.22);ctx.translate(-p.x,-p.y);drawPlayer(p);ctx.restore();}
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

