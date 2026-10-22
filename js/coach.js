// İlk "Oyna"da maç başlamadan önce ekranın her parçasını tek tek gösteren eğitim
const Coach=(()=>{
  let done=false;
  try{done=localStorage.getItem('ta-coach')==='1';}catch(e){}
  // sahanın içindeki bir bölgeyi (oyun koordinatlarında) ekran dikdörtgenine çevirir
  const fieldRect=(x,y,w,h)=>{
    const r=$('c').getBoundingClientRect(),k=scale;
    return{left:r.left+(x+offX)*k,top:r.top+(y-viewCrop+offY)*k,width:w*k,height:h*k};
  };
  const el=id=>()=>$(id).getBoundingClientRect();
  // --- canlı gösterim: eğitim sırasında sahada gerçek oyun akar, her adım anlattığı olayı sahneler
  // saat, yıldız yenilenmesi ve rakip yapay zekasının kartları çalışmaz; gol olursa sayılmaz, santraya dönülür
  function sandbox(dt){
    const s0=[teams[0].score,teams[1].score];
    state='play';
    updatePendingCards(dt);simPlayers(dt);if(state==='play')simBall(dt,true);
    if(state==='goal'){teams[0].score=s0[0];teams[1].score=s0[1];banners=banners.filter(b=>b.text!=='GOL!');kickoff(Math.random()<.5?0:1);ball.owner.decT=.6;}
    state='coach';
  }
  const asPlay=fn=>{state='play';try{fn();}finally{if(state==='play')state='coach';}};
  const give=p=>{ball.kickoff=false;ball.setT=0;ball.passTo=null;ball.passTeam=null;take(p);p.decT=.7;};
  const handRect=i=>{const e=document.querySelector('#hand .card[data-i="'+i+'"]');return e?e.getBoundingClientRect():null;};
  // her "every" saniyede bir fn çalışır (adıma girildiği an da bir kez)
  const every=(sec,fn)=>{let next=0;return{enter(){next=0;},update(dt,t){sandbox(dt);if(t>=next){next=t+sec;fn(t);}}};};
  let flip=false;
  const swapBall=()=>{flip=!flip;give(teams[flip?0:1].players[3]);};
  const steps=[
    {at:el('field'),title:'Tactic Arena\'ya hoş geldin',
     text:'Oyuncuların kendi kendine oynar: pas verir, şut çeker, savunma yapar. Senin işin doğru anda doğru <b>taktik kartını</b> oynamak.'},
    {at:el('hud'),title:'Sen maviysin',demo:{enter(){give(teams[0].players[3]);},update:sandbox},
     text:'Mavi takım sensin ve aşağıdan yukarıya, kırmızının kalesine hücum edersin. Top hangi takımdaysa skorbordda o taraf parlar.'},
    {at:el('timer'),title:'Maç süresi',demo:{enter(){this.c=clock;},update(dt){sandbox(dt);const before=clock;clock=Math.max(52,clock-dt*45);if(before>FAST_TIME&&clock<=FAST_TIME)banners.push({type:'info',text:'2x YILDIZ',sub:'Son 60 saniye!',color:'#ff8cf0',t:0,life:1.8});},exit(){clock=this.c;}},
     text:()=>`Maç ${Settings.get('length')/60} dakika sürer. Son 60 saniyede yıldızlar 2 kat hızlı dolar. Berabere biterse <b>altın gollü uzatma</b> oynanır: ilk golü atan kazanır.`},
    {at:el('stars'),title:'Yıldızlar',demo:{enter(){teams[0].stars=0;this.n=0;},update(dt,t){sandbox(dt);teams[0].stars=Math.min(STAR_MAX,teams[0].stars+dt*2.2);if(teams[0].stars>=STAR_MAX&&t>this.n){teams[0].stars=0;}if(t>this.n){this.n=t+2.4;const p=teams[0].players[1+(Math.random()*4|0)];floatText(p.x,p.y-20,'KAPTI!',teams[0].light);addStars(teams[0],REWARD.tackle,p.x,p.y);}}},
     text:'Kart oynamak yıldız ister. Yıldızlar zamanla dolar, en fazla 10 birikir. İyi oyunla bonus da kazanırsın: top kapma ve pas arası +0,5★, kaleci kurtarışı +1★.'},
    {at:el('hand'),title:'Elindeki kartlar',demo:{enter(){teams[0].stars=0;},update(dt){sandbox(dt);teams[0].stars+=dt*1.6;if(teams[0].stars>STAR_MAX+1.5)teams[0].stars=0;teams[0].stars=Math.min(teams[0].stars,STAR_MAX+1.6);}},
     text:'Her an elinde 4 kart olur. Karta <b>dokununca oynanır</b>. Köşedeki yıldız bedelini gösterir. Yıldızın yetmiyorsa kart soluk durur ve yıldız doldukça alttan aydınlanır.'},
    {at:el('hand'),title:'Hücum mu, savunma mı?',demo:every(2.6,()=>{teams[0].stars=STAR_MAX;swapBall();}),
     text:'<span class="t-atk">Turuncu çerçeve HÜCUM</span>: top sendeyken oyna. <span class="t-def">Mavi çerçeve SAVUNMA</span>: top rakipteyken oyna. O an işe yarayacak kartlar hafifçe parlayıp zıplar.'},
    {at:()=>$('hand').querySelector('.card').getBoundingClientRect(),title:'Basılı tut, ayrıntıyı gör',demo:{enter(){teams[0].stars=STAR_MAX;},update:sandbox},
     text:'Bir kartın ne yaptığını görmek için ona <b>basılı tut</b>. Kart oynanmaz; ekranın ortasında ayrıntı penceresi açılır ve maç sen kapatana kadar durur.'},
    {at:el('next'),title:'Sıradaki kart',demo:every(2.8,t=>{if(t<.5)return;teams[0].stars=STAR_MAX;asPlay(()=>playCard(teams[0],0,handRect(0)));}),
     text:'Oynadığın kart destenin sonuna gider, yerine buradaki kart gelir. 8 kartlık desteni menüdeki <b>DESTE</b> ekranında 16 kart arasından kurarsın.'},
    {at:()=>{const r=$('field').getBoundingClientRect();return{left:r.right-48,top:r.bottom-118,width:44,height:112};},title:'Aktif kartlar',demo:every(3,t=>{teams[0].stars=STAR_MAX;if(t<.5||!Object.values(teams[0].fx).some(v=>v>0))asPlay(()=>{playCard(teams[0],0,handRect(0));playCard(teams[0],1,handRect(1));});else swapBall();}),
     text:'Oynadığın kart sahaya uçar ve çarptığı an etkisi başlar. Süren kartlar sağ altta küçük ikonlar olarak durur; çevresindeki halka kalan süreyi gösterir. Hücum kartının süresi top rakipteyken, savunma kartınınki top sendeyken <b>yavaş akar</b> (ikon soluklaşır), yani kart boşa gitmez. Rakibinkiler sağ üstte.'},
    {at:()=>{const r=$('field').getBoundingClientRect();return{left:r.left+2,top:r.top+2,width:150,height:36};},title:'Rakibin kartları',demo:every(2.2,t=>{if(t<.4)return;teams[1].stars=STAR_MAX;asPlay(()=>playCard(teams[1],Math.random()*4|0));}),
     text:'Rakip de kart oynar. Son oynadığı 3 kart sol üstte belirir. Ona göre cevap ver: rakip hücum kartı oynadıysa savunma kartını hazır tut.'},
    {at:()=>fieldRect(CX-60,CY-60,120,120),title:'Sahayı okumak',demo:every(3.6,()=>{kickoff(0);const m=teams[0].players[3];give(m);m.x=CX;m.y=CY+30;m.decT=.6;}),
     text:'Topu süren oyuncunun altında <b>sarı halka</b> olur. Kesikli çizgi, giden pasın ineceği yeri gösterir. Ortalar ve uzun toplar havadan gider, havadayken kesilemez.'},
    {at:()=>fieldRect(FX,CY-110,FW,120),title:'Ofsayt ve faul',demo:every(4.5,()=>{flip=!flip;kickoff(0);ball.kickoff=false;const t=teams[0],f=t.players[4],m=t.players[3];if(flip){const line=secondLastDefender(t);f.x=CX+40;f.y=(line+26)*dirY(t);m.x=CX-20;m.y=CY+20;give(m);asPlay(()=>pass(m,f,t,{x:f.x,y:f.y},220));}else{f.x=CX+30;f.y=CY-70;give(f);const d=teams[1].players[2];d.x=f.x;d.y=f.y+14;asPlay(()=>callFoul(d,f));}}),
     text:'Kurallar gerçek: pas anında savunmanın arkasında bekleyen oyuncu topu alınca <b>ofsayt</b> olur, yan hakem bayrağı kaldırır ve top rakibe geçer. Sert ya da arkadan müdahale <b>faul</b> olur; faule uğrayan takım serbest vuruşu genelde pasla kullanır, kaleye yakınsa direkt şut da çekebilir. Ceza sahasındaki faul <b>penaltıdır</b>.'},
    {at:el('ctrl'),title:'Duraklat ve ses',
     text:'Buradan oyunu duraklatır, sesi açıp kapatırsın. Rakip zorluğu ve maç süresi menüdeki <b>AYARLAR</b> ekranında.'},
    {at:el('field'),title:'Hazırsın!',last:true,
     text:'İlk maçta küçük ipuçlarıyla yanında olacağım. Topu kaptır, kartını oyna, golü at!'},
  ];
  let i=0,root=null,onDone=null,cur=null,demoT=0;
  function enterDemo(){
    if(cur&&cur.exit)cur.exit();
    cur=steps[i].demo||null;demoT=0;
    if(cur&&cur.enter)cur.enter();
  }
  function build(){
    root=document.createElement('div');root.id='coach';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    root.innerHTML='<div class="spot"></div><div class="bubble" aria-live="polite"></div>';
    document.body.appendChild(root);
  }
  function place(){
    if(!root)return;
    const s=steps[i],r=s.at(),pad=6;
    const spot=root.querySelector('.spot'),b=root.querySelector('.bubble');
    Object.assign(spot.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'});
    const bh=b.offsetHeight,bw=b.offsetWidth,vh=innerHeight,vw=innerWidth;
    let top;
    if(r.top+r.height+pad+12+bh<vh-8)top=r.top+r.height+pad+12;      // altına
    else if(r.top-pad-12-bh>8)top=r.top-pad-12-bh;                     // üstüne
    else top=Math.max(8,r.top+r.height/2-bh/2);                        // ortasına
    b.style.top=top+'px';
    b.style.left=clamp(r.left+r.width/2-bw/2,12,vw-bw-12)+'px';
  }
  function show(){
    const s=steps[i],b=root.querySelector('.bubble');
    enterDemo();
    b.innerHTML=`<div class="cstep">ADIM ${i+1} / ${steps.length}</div><h3>${s.title}</h3><p>${typeof s.text==='function'?s.text():s.text}</p>
<div class="crow">${s.last?'<span></span>':'<button class="link" id="cSkip">Eğitimi atla</button>'}<div class="btnrow">${i>0?'<button class="cta alt gray small" id="cBack">GERİ</button>':''}<button class="cta small" id="cNext">${s.last?'MAÇA BAŞLA':'İLERİ'}</button></div></div>`;
    b.querySelector('#cNext').onclick=()=>{Sfx.click();if(s.last)finish();else{i++;show();}};
    const back=b.querySelector('#cBack');if(back)back.onclick=()=>{Sfx.click();i--;show();};
    const skip=b.querySelector('#cSkip');if(skip)skip.onclick=()=>{Sfx.click();finish();};
    place();b.querySelector('#cNext').focus();
  }
  function finish(){
    done=true;try{localStorage.setItem('ta-coach','1');}catch(e){}
    removeEventListener('resize',place);
    if(cur&&cur.exit)cur.exit();cur=null;
    root.remove();root=null;
    newMatch();applyOppHud(); // gösterimde oynanan kartlar ve yer değiştirmeler sıfırlanır
    const cb=onDone;onDone=null;if(cb)cb();
  }
  return{
    needed:()=>!done,
    tick(dt){if(!root)return;demoT+=dt;if(cur&&cur.update)cur.update.call(cur,dt,demoT);else sandbox(dt);},
    run(cb){onDone=cb;i=0;if(!root)build();addEventListener('resize',place);show();},
  };
})();
