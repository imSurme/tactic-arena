// Maç durumu: takımlar, top, santra
// matchOpp: turnuva rakibi {name, short, kit, str}; matchCtx: {tour, knockout, label}. Hızlı maçta ikisi de null
let matchOpp=null,matchCtx=null;
// rakibin gücü: ayarlardaki zorluk × turnuva rakibinin gücü
function oppMod(){if(matchCtx&&matchCtx.pvp)return{skill:1,think:1};const d=Settings.diff(),s=matchOpp?matchOpp.str:1;return{skill:d.skill*s,think:d.think/s};}
let lastPossessor=null,teams,ball,state='menu',clock=MATCH,goalT=0,pendingKick=0,shake=0,now=0,aiT=2,doubleShown=false;
let parts=[],floats=[],banners=[],handKey='',lastAfford=[],oppLog=[],overtime=false,paused=false;

function makeTeam(id){
  const keys=shuffle(id===0?Deck.get():matchCtx&&matchCtx.pvp&&pvpOppDeck?pvpOppDeck.slice():Deck.random());
  const t={id,score:0,stars:STAR_START,fx:{},hand:keys.slice(0,4),queue:keys.slice(4),players:[],chasers:[],
    color:id?'#ff4d5e':'#2f80ff',dark:id?'#b81f35':'#1747b5',light:id?'#ffb0b8':'#9cc4ff',trim:id?'#7a0f22':'#ffffff',
    gkColor:id?'#ffa21f':'#b6f23a',gkTrim:id?'#7a3d00':'#2e5a00'};
  if(id===1&&matchOpp&&matchOpp.kit)Object.assign(t,matchOpp.kit);
  ROLES.forEach(([role,bx,by,num],i)=>{
    const pl={team:t,role,bx,by,num,x:0,y:0,vx:0,vy:0,fa:id?Math.PI/2:-Math.PI/2,
      skin:SKIN[(i*2+id*3+Math.random()*2|0)%5],hair:HAIR[Math.random()*HAIR.length|0],hairStyle:Math.random()*7|0,
      boots:BOOTS[Math.random()*BOOTS.length|0],build:role==='DEF'?rnd(1,1.08):role==='GK'?1.04:rnd(.92,1.02),stride:rnd(.9,1.12),look:0,kickA:0,
      spd:role==='GK'?1:role==='DEF'?rnd(.94,1):rnd(1,1.07),stun:0,dash:0,sprint:0,kickCd:0,tackleCd:0,decT:0,anim:Math.random()*6};
    pl.fsm=new StateMachine(pl);t.players.push(pl);
  });
  return t;
}
function newMatch(){
  teams=[makeTeam(0),makeTeam(1)];
  clock=Settings.get('length');stats=freshStats();refFx=[];pendingCards=[];lastPossessor=null;doubleShown=false;overtime=false;paused=false;oppLog=[];aiT=2.5;parts=[];floats=[];banners=[];handKey='';lastAfford=[];
  kickoff(Math.random()<.5?0:1);
}
function kickoff(tid){
  for(const t of teams)for(const p of t.players){
    let ny=Math.max(p.by,.57);if(p.role==='FWD')ny=.55;
    if(t.id!==tid)ny=Math.max(ny,.62); // rakip santra yuvarlağının dışında bekler
    const w=toW(t,p.bx,ny);Object.assign(p,{x:w.x,y:w.y,vx:0,vy:0,stun:0,dash:0,sprint:0,run:0,kickCd:0,tackleCd:0,hold:0,spot:null,spotT:0,mark:null,fa:t.id?Math.PI/2:-Math.PI/2});
  }
  const kt=teams[tid],f=kt.players[4],r=Math.random();
  const m=r<.5?kt.players[3]:r<.75?kt.players[1]:kt.players[2]; // geri pası alacak oyuncu: orta saha ya da bir bek
  kt.koRecv=m;
  f.x=CX;f.y=CY-dirY(kt)*8;
  if(m.role==='MID'){m.x=CX+(Math.random()<.5?-28:28);m.y=CY-dirY(kt)*48;} // orta saha geride, sağda ya da solda bekler
  f.fa=Math.atan2(m.y-f.y,m.x-f.x);
  ball={x:CX,y:CY,vx:0,vy:0,owner:f,ownT:0,passTo:null,passTeam:null,shot:false,shotTeam:null,power:false,gkRolled:false,kickoff:true,rolled:new Set(),trail:[],rot:0};
  f.decT=.8;f.drib=f.fa;
}

