// Tribün: sıra sıra oturan taraftarlar. Kalemizin arkası bizim, rakip kalenin arkası rakip taraftarı,
// yan tribünler karışık. Canlı sıralar oyuna tepki verir (atakta ayağa kalkar, şutta zıplar, golde coşar).
// Yatay ekranda tüm sıralar canlı (arkadakiler daha sakin); dikey ekranda yalnız ön sıralar, arkası sabit.
const Crowd=(()=>{
  const SX=5.4,SY=5.8; // taraftar aralığı (oyun pikseli)
  const DEPTH=70; // tribün sahadan en fazla bu kadar uzanır; geniş ekranda kalan yer koyu stadyum zemini olur
  const FRONT=34; // ön sıralar: tam coşku; arkadakiler de canlı ama daha sakin hareket eder
  const NEUTRAL=['#3a4a8a','#2b3566','#56628f','#c9d2f0'];
  let fans=[],far=[],sprites={},spriteScale=0;
  const ex=[.05,.05];let lastNow=0,cheer={tid:-1,at:-9};
  const apron={x0:FX-10,x1:FX+FW+10,y0:FY-12,y1:FY+FH+12};
  // sabit tohumlu rastgele: ekran boyutu değişse de tribün aynı kalır
  const hash=(x,y,k)=>{let h=Math.imul((x*73856093)^(y*19349663)^(k*83492791),2654435761)>>>0;return (h%10007)/10007;};
  function shirtOf(f){
    if(f.aff<0)return NEUTRAL[f.col%NEUTRAL.length];
    const t=teams&&teams[f.aff];if(!t)return f.aff?'#ff4d5e':'#2f80ff';
    return[t.color,t.color,t.light,'#ffffff'][f.col%4];
  }
  // tek taraftar çizimi küçük bir tuvale önceden çizilir (gömlek rengi × ten × poz)
  function sprite(shirt,skin,up){
    const k=shirt+skin+up;let s=sprites[k];if(s)return s;
    const px=scale*dpr;s=document.createElement('canvas');s.width=Math.ceil(8*px);s.height=Math.ceil(10*px);
    const c=s.getContext('2d');c.setTransform(px,0,0,px,4*px,4.5*px);
    if(up){c.strokeStyle=shirt;c.lineWidth=1.05;c.lineCap='round';c.beginPath();c.moveTo(-1.6,1.8);c.lineTo(-2.6,-1.9);c.moveTo(1.6,1.8);c.lineTo(2.6,-1.9);c.stroke();
      c.fillStyle=skin;c.beginPath();c.arc(-2.7,-2.2,.6,0,7);c.arc(2.7,-2.2,.6,0,7);c.fill();}
    c.fillStyle=shirt;rr(c,-1.95,1.1,3.9,3.4,1.3);c.fill();
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(-1.95,3.6,3.9,.9);
    c.fillStyle=skin;c.beginPath();c.arc(0,-.1,1.45,0,7);c.fill();
    c.fillStyle='rgba(20,14,10,.75)';c.beginPath();c.arc(0,-.35,1.45,Math.PI*1.05,Math.PI*1.95);c.fill();
    sprites[k]=s;return s;
  }
  // görünen alana göre taraftarları yerleştir (resize'da)
  function build(x0,x1,y0,y1){
    fans=[];far=[];sprites={};spriteScale=scale*dpr;
    // yatay ekranda (masaüstü) tüm sıralar canlı; telefonda pil için yalnız ön sıralar, arkası arka plana bir kez çizilir
    const live=landscape?DEPTH+1:FRONT;
    let row=0;
    for(let y=Math.floor(y0/SY)*SY;y<y1+SY;y+=SY,row++){
      const ry=Math.round(y/SY);
      for(let x=Math.floor(x0/SX)*SX+(ry%2?SX/2:0);x<x1+SX;x+=SX){
        const d=Math.max(apron.y0-y,y-apron.y1,apron.x0-x,x-apron.x1);
        if(d<7||d>DEPTH)continue; // reklam panoları ve saha kenarı boş, tribün sınırının ötesi boş
        const rx=Math.round(x/SX),r1=hash(rx,ry,1),r2=hash(rx,ry,2),r3=hash(rx,ry,3);
        if(r1<.06)continue; // boş koltuk
        const top=y<apron.y0,bottom=y>apron.y1;
        let aff;
        if(bottom)aff=r2<.82?0:r2<.9?1:-1;
        else if(top)aff=r2<.82?1:r2<.9?0:-1;
        else{const home=y>CY;aff=r2<.62?(home?0:1):r2<.78?(home?1:0):-1;}
        const f={x:x+(r3-.5)*1.2,y:y+(hash(rx,ry,4)-.5)*.8,aff,col:(r3*997|0),skin:SKIN[(hash(rx,ry,5)*SKIN.length)|0],
          ph:hash(rx,ry,6)*6.28,spd:4.5+hash(rx,ry,7)*2,stand:hash(rx,ry,8)<.12,calm:d<FRONT?1:.55};
        (d<live?fans:far).push(f);
      }
    }
    // önden arkaya çiz: sahaya uzak sıradakiler önce
    const depth=f=>Math.max(apron.y0-f.y,f.y-apron.y1,apron.x0-f.x,f.x-apron.x1);
    fans.sort((a,b)=>depth(b)-depth(a));
  }
  // arka plana: tribün zemini, koltuk sıraları, reklam panoları ve uzaktaki taraftarlar
  function bake(c,x0,x1,y0,y1){
    build(x0,x1,y0,y1);
    c.save();
    // koltuk sıraları: sahaya paralel açık-koyu şeritler
    for(let k=0;k<60;k++){
      const m=7+k*SY;if(m>DEPTH)break;
      if(apron.x0-m<x0&&apron.y0-m<y0&&apron.x1+m>x1&&apron.y1+m>y1)break;
      c.fillStyle=k%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.12)';
      c.beginPath();c.rect(apron.x0-m-SY,apron.y0-m-SY,apron.x1-apron.x0+2*(m+SY),apron.y1-apron.y0+2*(m+SY));
      c.rect(apron.x0-m,apron.y0-m,apron.x1-apron.x0+2*m,apron.y1-apron.y0+2*m);c.fill('evenodd');
    }
    // reklam panoları: sahayı çevreleyen ince LED şerit
    const bx0=apron.x0-5,by0=apron.y0-5,bw=apron.x1-apron.x0+10,bh=apron.y1-apron.y0+10;
    c.fillStyle='#0a0f2a';c.fillRect(bx0,by0,bw,bh);
    const PANEL=['#ffc83d','#2f80ff','#ffffff','#ff4d5e','#5be38b'];
    const seg=(ax,ay,len,horiz)=>{for(let i=0,n=Math.ceil(len/34);i<n;i++){
      const s=i*34,l=Math.min(30,len-s);if(l<=4)continue;
      c.fillStyle=PANEL[(i+(horiz?0:2))%PANEL.length];c.globalAlpha=.55;
      if(horiz)c.fillRect(ax+s+2,ay,l,2.2);else c.fillRect(ax,ay+s+2,2.2,l);}c.globalAlpha=1;};
    seg(bx0,by0+1.2,bw,true);seg(bx0,by0+bh-3.4,bw,true);seg(bx0+1.2,by0,bh,false);seg(bx0+bw-3.4,by0,bh,false);
    // uzak taraftarlar sabit (yatay ekranda figürler dik kalsın diye her biri geri döndürülür)
    for(const f of far){const s=sprite(shirtOf(f),f.skin,false);
      if(landscape){c.save();c.translate(f.x,f.y);upright(c);c.drawImage(s,-4,-4.5,8,10);c.restore();}else c.drawImage(s,f.x-4,f.y-4.5,8,10);}
    // tribünün dış kenarı: ötesi koyu stadyum zemini, tribün ekranın kenarına kadar uzanmaz
    const ex0=apron.x0-DEPTH-3,ey0=apron.y0-DEPTH-3,ew=apron.x1-apron.x0+2*(DEPTH+3),eh=apron.y1-apron.y0+2*(DEPTH+3);
    if(ex0>x0||ey0>y0||ex0+ew<x1||ey0+eh<y1){
      rr(c,ex0,ey0,ew,eh,18);c.rect(x0,y0,x1-x0,y1-y0);c.fillStyle='#0b1230';c.fill('evenodd'); // rr yolu başlatır, dış dikdörtgen ona eklenir
      c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=2;rr(c,ex0,ey0,ew,eh,18);c.stroke();
    }
    c.restore();
  }
  // her kare: takımın hücumuna göre heyecan, sonra canlı taraftarlar
  function update(){
    const dt=Math.min(.1,Math.max(0,now-lastNow));lastNow=now;
    for(const i of [0,1]){
      let tg=.06;
      const t=teams&&teams[i];
      if(t&&ball&&state==='play'){
        const att=(ball.owner&&ball.owner.team===t)||(!ball.owner&&ball.passTeam===t);
        const d=dist(ball,oppGoal(t));
        if(att&&d<170)tg=.25+(1-d/170)*.6;
        if(ball.shot&&ball.shotTeam===t)tg=1;
      }
      if(cheer.tid===i&&now-cheer.at<3)tg=1.35;
      ex[i]+=(tg-ex[i])*Math.min(1,dt*(tg>ex[i]?5:1.4));
    }
  }
  function draw(c){
    if(!fans.length||spriteScale!==scale*dpr)return;
    update();
    const amp=RM?.3:1,k=scale*dpr;
    // ekran konumu: dikeyde x→x, yatay ekranda saha döner (w2s ile aynı, her taraftar için nesne üretmeden)
    const ax=landscape?0:k,ay=landscape?-k:0,cx=landscape?(H+offY)*k:offX*k,bx=landscape?k:0,by=landscape?0:k,cy=landscape?offX*k:(offY-viewCrop)*k;
    c.save();c.setTransform(1,0,0,1,0,0); // ekran pikseline ölçeksiz kopyalama (çok daha hızlı)
    for(const f of fans){
      const e=f.aff<0?Math.max(ex[0],ex[1])*.45:ex[f.aff];
      const w=Math.sin(now*(f.spd+e*3)+f.ph);
      const jump=Math.max(0,w)*(.25+e*e*2.4)*(f.stand||e>.5?1:.55)*amp*f.calm;
      const up=e>(f.calm<1?.95:.7)&&Math.sin(now*2.2+f.ph*1.7)>-.2; // arka sıralar kollarını ancak büyük anlarda (gol, şut) kaldırır
      const s=sprite(shirtOf(f),f.skin,up);
      c.drawImage(s,(ax*f.x+ay*f.y+cx-4*k)|0,(bx*f.x+by*f.y+cy-(4.5+jump)*k)|0); // figür ve zıplaması ekranda dik
    }
    c.restore();
  }
  return{
    bake,draw,DEPTH,
    goal(tid){cheer={tid,at:now};ex[tid]=1.35;},
    cheering:()=>now-cheer.at<2.6?cheer.tid:-1, // golü atan takım (oyuncular sevinir)
    save(tid){ex[tid]=Math.max(ex[tid],.9);} // kaçan fırsat: "ooo"
  };
})();
