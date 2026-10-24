// Top fiziği, kaleci kurtarışı, top kapma, gol
function simBall(dt,live){
  const b=ball;
  if(b.owner){const p=b.owner;b.x=p.x+Math.cos(p.fa)*9;b.y=p.y+Math.sin(p.fa)*9;b.vx=p.vx;b.vy=p.vy;b.ownT+=dt;}
  else{
    b.x+=b.vx*dt;b.y+=b.vy*dt;const f=Math.exp(-(b.shot?TEMPO.shotFriction:TEMPO.friction)*dt);b.vx*=f;b.vy*=f; // şut daha az yavaşlar
    const sp=Math.hypot(b.vx,b.vy);if(sp<170)b.shot=false;if(sp<40)b.passTo=null;
    if(b.y>FY&&b.y<FY+FH){
      if(b.x<FX+3){b.x=FX+3;b.vx=Math.abs(b.vx)*.65;}
      if(b.x>FX+FW-3){b.x=FX+FW-3;b.vx=-Math.abs(b.vx)*.65;}
    }
  }
  if(b.setT>0)b.setT-=dt;
  if(b.loft){b.loft.t+=dt;if(b.loft.t>=b.loft.T)b.loft=null;}
  b.z=b.loft?4*b.loft.h*(b.loft.t/b.loft.T)*(1-b.loft.t/b.loft.T):0;
  b.rot+=Math.hypot(b.vx,b.vy)*dt*.12;
  b.trail.push({x:b.x,y:b.y});if(b.trail.length>12)b.trail.shift();
  if(!live){
    if(b.y<FY-14){b.y=FY-14;b.vy*=-.2;}if(b.y>FY+FH+14){b.y=FY+FH+14;b.vy*=-.2;}
    if(b.y<FY||b.y>FY+FH)b.x=clamp(b.x,CX-GW/2+4,CX+GW/2-4);
    return;
  }
  const inGoal=Math.abs(b.x-CX)<GW/2;
  if(b.y<FY){if(inGoal)return goal(0);b.y=FY;b.vy=Math.abs(b.vy)*.65;}
  if(b.y>FY+FH){if(inGoal)return goal(1);b.y=FY+FH;b.vy=-Math.abs(b.vy)*.65;}
  if(!b.owner){
    const sp=Math.hypot(b.vx,b.vy);
    // Savunma Duvarı: şutun önüne giren oyuncu topu bloke eder
    if(b.shot){
      const dt2=teams[1-b.shotTeam.id];
      if(dt2.fx.wall>0)for(const p of dt2.players){
        if(p.role==='GK'||p.stun>0||b.rolled.has(p)||dist(p,b)>20)continue;
        b.rolled.add(p);
        if(Math.random()<.75){
          b.vx=-b.vx*.35+rnd(-1,1)*90;b.vy=-b.vy*.35;b.shot=false;
          burst(b.x,b.y,CARDS.wall.col,12,110);floatAbove(p.x,p.y,20,'BLOK!',dt2.light);Sfx.tackle();addStars(dt2,REWARD.tackle,p.x,p.y);
          return;
        }
      }
    }
    if(b.shot&&!b.gkRolled){
      const t=teams[1-b.shotTeam.id],gk=t.players[0];
      // uzaktan gelen şutta kaleci uzanmaya zaman bulur: erişim mesafeyle artar
      const reach=(t.fx.gk?30:21)+clamp(((b.shotDist||0)-110)/9,0,12);
      if(dist(gk,b)<reach){
        b.gkRolled=true;
        // uzaktan gelen şutu görüp hazırlanmak için kalecinin daha çok zamanı olur
        // kurtarış şansı (kaleci yetişirse): yakından ~%68, uzaktan ~%95; köşeye ve güçlü şut daha zor
        const ch=b.pen?(t.fx.gk?.42:.25):clamp(.68+clamp(((b.shotDist||0)-50)/150,0,1)*.27-(sp-380)/900+(t.fx.gk?.3:0)+(t.fx.wall?.1:0)-(b.corner?.1:0)+(b.power?.04:0)-(b.header?.28:0),.12,.95);
        if(Math.random()<ch){
          burst(b.x,b.y,'#fff',12,120);floatAbove(gk.x,gk.y,20,'KURTARIŞ!',t.gkColor);Sfx.save();addStars(t,REWARD.save,gk.x,gk.y+10);
          stats.saves[t.id]++;statOnTarget(b.shotTeam.id);Crowd.save(b.shotTeam.id);
          if(sp<430&&Math.random()<.6){take(gk);gk.decT=.9;}
          else{b.vy=-b.vy*.45;b.vx=rnd(-1,1)*200;b.shot=false;gk.kickCd=.3;}
          return;
        }
      }
    }
    let best=null,bd=1e9;
    if(b.z<6)for(const t of teams)for(const p of t.players){ // havadaki top kesilemez
      if(p.stun>0||p.kickCd>0)continue;
      if(b.shot&&b.gkRolled&&p.role==='GK'&&p.team!==b.shotTeam)continue; // kurtarışı kaçıran kaleci aynı şutu tutamaz
      const foe=b.passTeam&&b.passTeam!==p.team;
      const d=dist(p,b),reach=(p.role==='GK'?13:p.dash>0?13:10)+(foe&&p.team.fx.intercept?8:0);
      if(d>=reach||d>=bd)continue;
      // canlı pası sadece alıcı alır; rakip ancak şansla keser ya da top neredeyse durmuşsa alır
      let ok=b.passTo===p||(b.shot?(p.role==='GK'||sp<150):p.role==='GK'||(foe?sp<70:sp<230));
      // pas arası: hızlı pası da kesebilir ama şansa bağlı (her oyuncu bir kez dener)
      if(!ok&&!b.shot&&!b.safe&&foe&&sp<(p.team.fx.intercept?420:TEMPO.interceptMaxSpeed)&&!b.rolled.has(p)){
        b.rolled.add(p);
        let ch=p.team.fx.intercept?.8:TEMPO.intercept+(p.team.fx.mark?.4:0);
        if(p.dash>0)ch=Math.max(ch,.65); // kayarak gelen oyuncu çıkan pası da keser
        if(b.passTeam.fx.tiki)ch*=.3;
        if(p.team.id===1)ch*=oppMod().skill;
        ok=Math.random()<ch;
      }
      if(ok){bd=d;best=p;}
    }
    if(best){
      const pt=b.passTeam;take(best);
      if(pt&&ball.owner===best){if(pt===best.team)stats.passOk[pt.id]++;else stats.ints[best.team.id]++;}
      if(pt&&pt!==best.team){floatAbove(best.x,best.y,20,'ARAYA GİRDİ',best.team.light);addStars(best.team,REWARD.intercept,best.x,best.y);}
      else if(pt&&pt.fx.tiki)addStars(pt,REWARD.tiki);
    }
  }else if(!(b.setT>0)){
    const o=b.owner,t=teams[1-o.team.id];
    if(o.role!=='GK')for(const p of t.players){ // topu elinde tutan kaleciye müdahale yok
      const dashing=p.dash>0; // kayarak gelen oyuncu bekleme süresine takılmaz
      if(!dashing&&b.ownT<=TEMPO.grace)continue;
      if(p.stun>0||(p.tackleCd>0&&!dashing))continue;
      if(dist(p,o)>(dashing?18:13))continue;
      p.tackleCd=TEMPO.tackleCd;
      if(tackleFoul(p,o)){p.dash=0;callFoul(p,o);break;} // sert ya da arkadan müdahale
      let ch=p.dash>0?SLIDE_WIN:TEMPO.tackle+(t.fx.press?.2:0)+(t.fx.wall?.08:0)+(t.fx.mark?.3:0);
      const ax=p.x-o.x,ay=p.y-o.y,dirC=(Math.cos(o.fa)*ax+Math.sin(o.fa)*ay)/(Math.hypot(ax,ay)||1); // >0 önden, <0 arkadan
      if(p.dash<=0)ch*=dirC>.3?1.6:dirC<-.3?.45:1.9; // önden karşılama ve omuz omuza mücadele iyi, arkadan zor
      if(o.team.fx.dribble&&p.dash<=0)ch*=.2; // çalım ustası
      if(o.superT>0)ch*=p.dash>0?.35:0; // yıldız oyuncudan top alınmaz (kayarak ancak zor)
      if(o.team.fx.tiki&&p.dash<=0)ch*=.45;
      if(t.id===1)ch*=oppMod().skill; // rakip zorluğu
      if(Math.random()<ch){
        o.stun=.7;o.kickCd=.5;p.dash=0;
        burst((o.x+p.x)/2,(o.y+p.y)/2,'#ffe066',10,110);
        floatAbove(p.x,p.y,20,'KAPTI!',t.light);Sfx.tackle();addStars(t,REWARD.tackle,p.x,p.y);
        stats.tackles[t.id]++;
        if(Math.random()<.75)take(p);
        else{b.owner=null;const a=rnd(0,Math.PI*2);b.vx=Math.cos(a)*130;b.vy=Math.sin(a)*130;}
        break;
      }
      if(o.team.fx.dribble&&p.dash<=0){floatAbove(o.x,o.y,20,'ÇALIM!',CARDS.dribble.col);burst(o.x,o.y,CARDS.dribble.col,6,70);} // müdahale boşa çıktı
      if(p.dash<=0&&dirC<=.3)p.stun=Math.max(p.stun,.3); // yandan/arkadan giren ve topu alamayan savunmacı geçilir, bir an dengesini kaybeder
    }
  }
}
function take(p){
  // ofsayt konumundaki oyuncu topu aldı: yan hakem bayrağı kaldırır
  const off=ball.offsideR;
  if(off&&!ball.owner){ball.offsideR=null;if(off===p&&state==='play'){p.kickCd=.4;callOffside(p,p.team);return;}}
  ball.offsideR=null;
  if(ball.passTeam===p.team&&ball.passer&&ball.passer!==p){p.passFrom=ball.passer;p.passFromT=now;}else p.passFrom=null;
  Object.assign(ball,{owner:p,ownT:0,passTo:null,passTeam:null,shot:false,power:false});
  p.hold=0;p.run=0;p.drib=dirY(p.team)*Math.PI/2;
  if(p.team!==lastPossessor){lastPossessor=p.team;const r=Math.random();p.team.lane=r<.38?-1:r<.76?1:0;}
  // baskı altındaysa tek dokunuş
  p.decT=p.role==='GK'?.3:nearestOpp(p,p.team).d<25?.12:rnd(.25,.4);
}
function goal(tid){
  const t=teams[tid];t.score++;Crowd.goal(tid);
  statOnTarget(tid);stats.goals.push({tid,at:Math.round(elapsed()),pen:!!ball.pen,ot:overtime});
  Sfx.goal();state='goal';goalT=2.3;pendingKick=1-tid;shake=12;
  for(let i=0;i<70;i++){const c=['#ffc83d','#fff',t.color,t.light,'#d23cff'][i%5];parts.push({x:ball.x,y:ball.y,vx:rnd(-230,230),vy:rnd(-230,230),life:rnd(.9,1.7),t:0,c,s:rnd(2,4.5),sq:true});}
  banners.push({type:'big',text:'GOL!',sub:overtime?'ALTIN GOL!':tid===0?'Harika vuruş!':'Rakip attı',color:t.color,t:0,life:2.2});
  const el=$('s'+tid);el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
}
