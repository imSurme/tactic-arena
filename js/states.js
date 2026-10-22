// Oyuncu durumları. Her durumun execute'u bu kare için hedefi döndürür: {x, y, sp}
// sp, oyuncunun normal koşu hızına göre çarpandır. Geçiş kuralları dosyanın sonunda.
const stay=p=>({x:p.x,y:p.y,sp:0});

const FieldStates={
  stunned:{name:'Sersemledi',short:'SRS',execute:stay},
  // Kayan Müdahale kartı: rakip top sürene ya da topa atılır
  dash:{name:'Atılma',short:'ATL',execute(p){
    const o=ball.owner;
    return o&&o.team!==p.team?{x:o.x,y:o.y,sp:1}:{x:ball.x,y:ball.y,sp:1};
  }},
  // santrada orta saha geriye gelecek pası yerinde bekler
  kickoffWait:{name:'Santra pasını bekle',short:'SNT',execute:stay},
  dribble:{name:'Top sürme',short:'SÜR',
    enter(p){p.hold=0;},
    execute(p,dt){
      carrierThink(p,p.team,dt);
      if(ball.owner!==p)return formation(p,p.team); // pas ya da şut çıktı; sonraki karede yeni durum
      if(ball.kickoff||ball.setT>0||p.setPass||p.penalty)return stay(p); // santra ve duran topta top sürülmez, pasla başlanır
      const a=p.drib;
      return{x:p.x+Math.cos(a)*60,y:p.y+Math.sin(a)*60,sp:.9};
    }},
  receive:{name:'Pası karşıla',short:'KRŞ',execute(){
    return{x:ball.x+ball.vx*.45,y:ball.y+ball.vy*.45,sp:1.1};
  }},
  chase:{name:'Boştaki topa koş',short:'KOŞ',execute(p){
    const l=Math.min(.6,dist(p,ball)/150);
    return{x:ball.x+ball.vx*l,y:ball.y+ball.vy*l,sp:1.1};
  }},
  // önce rakiple kale arasına gir, yaklaşınca topa dal
  press:{name:'Baskı',short:'BSK',execute(p){
    const o=ball.owner;
    if(dist(p,o)<22)return{x:o.x,y:o.y,sp:1.08};
    const g=ownGoal(p.team),dx=g.x-o.x,dy=g.y-o.y,d=Math.hypot(dx,dy)||1;
    return{x:o.x+dx/d*12,y:o.y+dy/d*12,sp:1.08};
  }},
  mark:{name:'Markaj',short:'MRK',execute:p=>markSpot(p,p.team)},
  // hücumda boş alan bul; fırsat olursa savunma arkasına koşuya çık
  support:{name:'Destek',short:'DST',
    enter(p){p.spotT=0;},
    execute(p,dt){
      const t=p.team;
      p.spotT-=dt;
      if(p.spotT<=0){p.spot=supportSpot(p,t);p.spotT=rnd(.35,.55);}
      const lim=offsideLimit(t);
      if(p.role!=='DEF'&&ball.owner&&!ball.kickoff&&adv(t,p.y)>lim-50&&Math.random()<dt*(p.role==='FWD'?.6:.25)){
        p.run=1.3;
        p.runTo={x:clamp(p.x+(CX-p.x)*.3+rnd(-35,35),FX+20,FX+FW-20),y:clamp((lim+65)*dirY(t),FY+20,FY+FH-20)};
      }
      return{...p.spot,sp:.95};
    }},
  run:{name:'Derine koşu',short:'DRN',execute:p=>({...p.runTo,sp:1.15})},
  position:{name:'Yerini al',short:'YER',execute:p=>formation(p,p.team)},
};

const gkLine=t=>ownGoal(t).y+dirY(t)*14; // kalecinin durduğu çizgi
const KeeperStates={
  distribute:{name:'Oyunu başlat',short:'KUR',execute(p,dt){carrierThink(p,p.team,dt);return stay(p);}},
  // ceza sahasındaki boş topa çık
  rush:{name:'Topa çık',short:'ÇIK',execute:()=>({x:ball.x,y:ball.y,sp:1.15})},
  // rakip ceza sahasına girince açıyı daraltmak için öne çık
  narrow:{name:'Açıyı daralt',short:'AÇI',execute(p){
    const o=ball.owner,g=ownGoal(p.team),d=dist(o,g);
    return{x:g.x+(o.x-g.x)/d*20,y:g.y+(o.y-g.y)/d*20,sp:1.1};
  }},
  // plonjon: şut gelince topun gideceği noktaya atıl
  dive:{name:'Plonjon',short:'PLJ',execute(p){
    const ly=gkLine(p.team),tt=(ly-ball.y)/ball.vy;
    return{x:clamp(ball.x+ball.vx*tt,CX-GW/2+4,CX+GW/2-4),y:ly,sp:2.4};
  }},
  guard:{name:'Kaleyi koru',short:'KLE',execute(p){
    return{x:CX+clamp((ball.x-CX)*.4,-36,36),y:gkLine(p.team),sp:1.25};
  }},
};

// her karede, duruma bakmadan: zamanlayıcılar ve hücum dışı kalınca boş alan/koşu bilgisinin sıfırlanması
function playerGlobal(p,t,dt){
  p.stun=Math.max(0,p.stun-dt);if(p.volley>0)p.volley-=dt;p.dash=Math.max(0,p.dash-dt);
  p.sprint=Math.max(0,p.sprint-dt);p.run=Math.max(0,p.run-dt);
  p.kickCd=Math.max(0,p.kickCd-dt);p.tackleCd=Math.max(0,p.tackleCd-dt);
  if(!(attacking(t)&&p.role!=='GK'&&ball.owner!==p)){p.spot=null;p.spotT=0;p.run=0;}
}

// geçiş kuralları: yukarıdan aşağı ilk uyan durum seçilir
function chooseFieldState(p,t){
  const o=ball.owner,S=FieldStates;
  if(p.stun>0)return S.stunned;
  if(p.dash>0)return S.dash;
  if(ball.kickoff&&p===t.players[3]&&attacking(t))return S.kickoffWait;
  if(o===p)return S.dribble;
  if(ball.passTo===p&&!o)return S.receive;
  if(t.chasers.includes(p))return o?S.press:S.chase;
  if(p.mark)return S.mark;
  if(attacking(t))return p.run>0?S.run:S.support;
  return S.position;
}
function chooseKeeperState(p,t){
  const o=ball.owner,K=KeeperStates;
  if(o===p)return K.distribute;
  const bn=toN(t,ball.x,ball.y);
  if(!o&&!ball.shot&&bn.y>.84&&Math.abs(ball.x-CX)<90)return K.rush;
  if(o&&o.team!==t&&dist(o,ownGoal(t))<90)return K.narrow;
  if(ball.shot&&ball.shotTeam!==t&&ball.vy*dirY(t)<0&&(gkLine(t)-ball.y)/ball.vy>0)return K.dive;
  return K.guard;
}
