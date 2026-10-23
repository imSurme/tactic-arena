// HTML arayüz: skorbord, kart eli, enerji, rakip kartları, menüler, duraklatma
const $=id=>document.getElementById(id);
const iconSvg=k=>`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[k]}</svg>`;
const UI_ICONS={
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
function cardHTML(k,i){
  const c=CARDS[k];
  return `<button class="card ${c.type}" data-i="${i}" style="--c1:${c.c1};--c2:${c.c2}" aria-label="${c.name}, ${c.cost} yıldız" ${i<0?'tabindex="-1"':''}>${c.type==='super'?'<span class="spin" aria-hidden="true"><i></i></span>':''}
    <span class="cost">${STAR}<span>${c.cost}</span></span>
    <span class="art">${iconSvg(k)}<span class="tag">${c.type==='atk'?'HÜCUM':c.type==='def'?'SAVUNMA':'SÜPER'}</span></span>
    <span class="nm"><b>${c.name}</b></span><span class="lock"></span></button>`;
}
// yan sütun için kısa adlı kart
const miniCard=(k,i)=>cardHTML(k,i).replace('<b>'+CARDS[k].name+'</b>','<b>'+CARDS[k].short+'</b>');
// top kimdeyse ona uygun kart türü parlar
function suggestedType(){
  if(state!=='play')return null;
  if(attacking(teams[0]))return'atk';
  if(attacking(teams[1]))return'def';
  return null;
}
let oppKey='',lastWhole=0,superKeyShown='';
// her karede çağrılır: değer değişmediyse sayfaya dokunma (gereksiz yeniden düzen ve boyama olmasın)
const setText=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v;};
const setCss=(el,p,v)=>{const c=el._css||(el._css={});if(c[p]!==v){c[p]=v;el.style.setProperty(p,v);}};
function updateFxChips(t){
  const box=$('fx'+t.id),keys=Object.keys(t.fx).filter(k=>t.fx[k]>0&&DUR[k]&&!['through','longball','foul'].includes(k));
  for(const el of [...box.children])if(!keys.includes(el.dataset.k))el.remove();
  for(const k of keys){
    let el=box.querySelector('[data-k="'+k+'"]');
    if(!el){
      const c=CARDS[k];el=document.createElement('span');el.className='fxchip';el.dataset.k=k;el.title=c.name;
      el.style.cssText='--c1:'+c.c1+';--c2:'+c.c2+';--col:'+c.col+';--team:'+t.color;
      el.innerHTML='<i>'+iconSvg(k)+'</i>';box.appendChild(el);
    }
    setCss(el,'--p',(t.fx[k]/DUR[k]*100).toFixed(1)+'%');
    el.classList.toggle('ending',t.fx[k]<1.5);el.classList.toggle('wait',!fxLive(t,k));
  }
}
function updateHud(){
  setText($('s0'),teams[0].score);setText($('s1'),teams[1].score);
  const live=state==='play'||state==='coach';
  $('side0').classList.toggle('has',live&&attacking(teams[0]));$('side1').classList.toggle('has',live&&attacking(teams[1]));
  const s=overtime?Math.floor(clock):Math.ceil(clock);setText($('timer'),(overtime?'+':'')+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'));
  const fast=overtime||clock<=FAST_TIME;
  $('timer').classList.toggle('hot',fast);
  if(Net.active()&&matchCtx&&matchCtx.pvp){ // arkadaş maçı: süre altında bağlantı gecikmesi (yeşil iyi, sarı orta, kırmızı kötü)
    const p=Net.ping(),lbl=overtime?'UZATMA · ':clock<=FAST_TIME&&state==='play'?'SON DK · ':'';
    const html=lbl+(p==null?'<span class="ping">● …</span>':'<span class="ping '+(p<80?'g':p<150?'y':'r')+'">● '+p+' ms</span>');
    if($('half').innerHTML!==html)$('half').innerHTML=html;
    $('half').classList.add('net');
  }else{$('half').classList.remove('net');setText($('half'),overtime?'UZATMA · ALTIN GOL':clock<=FAST_TIME&&state==='play'?'SON DAKİKALAR':'MAÇ');}
  const t=teams[0],key=t.hand.join()+'|'+t.queue[0],sug=suggestedType();
  if(key!==handKey){handKey=key;$('hand').innerHTML=t.hand.map(cardHTML).join('');$('nextCard').innerHTML=miniCard(t.queue[0],-1);lastAfford=[];}
  document.querySelectorAll('#hand .card').forEach(el=>{
    const i=+el.dataset.i,c=CARDS[t.hand[i]],can=t.stars>=c.cost&&(state==='play'||state==='coach')&&!paused;
    el.classList.toggle('off',!can);
    el.classList.toggle('hint',can&&(state==='play'||state==='coach')&&c.type===sug);
    if(can&&lastAfford[i]===false){el.classList.remove('ready');void el.offsetWidth;el.classList.add('ready');Sfx.ready();}
    lastAfford[i]=can;
    setCss(el.querySelector('.lock'),'height',(t.stars<c.cost?(1-t.stars/c.cost)*100:0).toFixed(1)+'%');
  });
  // süper kart yuvası
  const sk=t.superKey+'|'+t.superUsed;
  if(sk!==superKeyShown){superKeyShown=sk;$('superCard').innerHTML=miniCard(t.superKey,-2);$('super').classList.toggle('used',t.superUsed);$('superLbl').textContent=t.superUsed?'KULLANILDI':'SÜPER';}
  {const el=$('superCard').querySelector('.card'),c=CARDS[t.superKey],can=!t.superUsed&&t.stars>=c.cost&&state==='play'&&!paused;
    if(el){el.classList.toggle('off',!can);el.classList.toggle('ready',can);setCss(el.querySelector('.lock'),'height',(t.superUsed?100:t.stars<c.cost?(1-t.stars/c.cost)*100:0).toFixed(1)+'%');}}
  setCss($('sfill'),'width',(t.stars/STAR_MAX*100).toFixed(1)+'%');{const v=''+Math.floor(t.stars);if($('sbar').getAttribute('aria-valuenow')!==v)$('sbar').setAttribute('aria-valuenow',v);}
  const whole=Math.floor(t.stars);
  if(whole!==lastWhole){if(whole>lastWhole){const si=$('sicon');si.classList.remove('gain');void si.offsetWidth;si.classList.add('gain');}lastWhole=whole;$('snum').textContent=whole;}
  setText($('x2'),fast&&state==='play'?'x2':'');
  for(const tm of teams)updateFxChips(tm);
  const ok=oppLog.join();
  if(ok!==oppKey){
    oppKey=ok;
    $('oppCards').innerHTML=oppLog.map((k,i)=>`<span class="mini ${CARDS[k].type}${i===0?' new':''}" title="${CARDS[k].name}" style="--c1:${CARDS[k].c1};--c2:${CARDS[k].c2}"><i>${iconSvg(k)}</i></span>`).join('');
    $('oppLog').hidden=!oppLog.length;
  }
}
function trySuper(){
  if(paused||state!=='play')return;
  const el=$('superCard').querySelector('.card'),rect=el?el.getBoundingClientRect():null;
  if(Net.isGuest()){Net.guestSuper(rect);return;}
  if(!playSuper(teams[0],rect))Sfx.deny();
}
function tryCard(i){
  if(paused||state!=='play')return;
  const el=document.querySelector('#hand .card[data-i="'+i+'"]');
  if(Net.isGuest()){Net.guestCard(i,el?el.getBoundingClientRect():null);return;} // kart isteği ev sahibine gider
  if(!playCard(teams[0],i,el?el.getBoundingClientRect():null))Sfx.deny();
}
// son kullanılan giriş klavye mi? (dokunmatik ve farede otomatik odak çerçevesi gösterilmez)
let kbNav=false;
addEventListener('keydown',e=>{if(e.key==='Tab'||e.key==='Enter'||e.key.startsWith('Arrow'))kbNav=true;},true);
addEventListener('pointerdown',()=>{kbNav=false;},true);
function showOverlay(html,handlers={}){
  closeCardModal();
  $('obox').className='box';$('obox').innerHTML=html;$('overlay').hidden=false;$('overlay').scrollTop=0;
  for(const id in handlers){const el=$(id);if(el)el.onclick=()=>{Sfx.init();Sfx.click();handlers[id]();};}
  const go=$('go');if(go&&kbNav)go.focus({preventScroll:true}); // klavyeyle gezinirken; odak pencereyi aşağı kaydırmasın
}
function hideOverlay(){$('overlay').hidden=true;}
function tourButton(){
  const nx=Tour.active()&&Tour.next();
  return'<button class="cta alt small pvpbtn tourbtn" id="go">'+(nx?'TURNUVAYA DEVAM<small>'+nx.label+'</small>':'TURNUVA<small>32 takım</small>')+'</button>';
}
// skorbordda rakibin adı ve forma rengi
function applyOppHud(){
  const t=teams[1];
  $('crest0').setAttribute('fill',teams[0].color);$('side0').style.setProperty('--tc',teams[0].color);
  $('crest1').setAttribute('fill',t.color);$('side1').style.setProperty('--tc',t.color);
  $('who1').textContent=matchOpp?matchOpp.short:'RAKİP';
}
function showMenu(){
  // Sfx.resume: duraklatılmış maçtan çıkılınca ses kapalı kalmasın
  state='menu';paused=false;Sfx.resume();Tutorial.hide();matchCtx=null;matchOpp=null;newMatch();applyOppHud();resize();
  showOverlay(`<h1>TACTIC<br>ARENA</h1><p>Oyuncuların kendi kendine oynar. Sen yıldız harcayıp taktik kartı oynarsın. ${Settings.get('length')/60} dakikada en çok golü atan kazanır, berabere biterse altın gollü uzatma oynanır.</p>
<button class="cta tour" id="pvp">ARKADAŞINLA OYNA<small>Link ya da oda koduyla</small></button><div class="menurow"><button class="cta alt small" id="quick">HIZLI MAÇ</button><button class="cta alt small" id="deck">DESTE</button></div>${tourButton()}<button class="cta alt gray small" id="opts">AYARLAR</button><div class="tip">Rakip: ${Settings.diff().name} · Maç: ${Settings.get('length')/60} dk</div>`,
  {go:showTournament,pvp:showPvpMenu,quick:()=>{matchCtx=null;matchOpp=null;start();},deck:showDeck,opts:showSettings});
  $('obox').classList.add('menu');
}
// arkadaş maçı: oda kur ya da arkadaşının oda kodunu gir
function showPvpMenu(){
  showOverlay(`<h2>ARKADAŞINLA OYNA</h2>
<p>Oda kur, linki ya da kodu arkadaşına gönder. Arkadaşın oda kurduysa kodunu gir.</p>
<button class="cta" id="host">ODA KUR</button>
<div class="ordiv"><span>ya da</span></div>
<div class="linkbox codebox"><input id="codeIn" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ODA KODU" aria-label="Oda kodu"><button class="cta alt small" id="joinBtn">KATIL</button></div>
<p class="tip" id="codeErr" hidden>Kod 6 karakter olmalı.</p>
<button class="link" id="menu">Ana menü</button>`,{host:()=>Net.host(),menu:showMenu});
  const inp=$('codeIn');
  const join=()=>{
    const c=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(c.length!==6){$('codeErr').hidden=false;inp.focus();Sfx.deny();return;}
    Sfx.click();Net.join(c);
  };
  inp.oninput=()=>{inp.value=inp.value.toUpperCase().replace(/[^A-Z0-9]/g,'');$('codeErr').hidden=true;};
  inp.onkeydown=e=>{if(e.key==='Enter')join();};
  $('joinBtn').onclick=join;
}
// deste ekranında seçilen kartın ayrıntıları
const CARD_DETAIL={
  counter:'Takım 6 sn boyunca %30 hızlı koşar, topu kazanınca oyuncular hücuma çıkar.',
  through:'En öndeki oyuncuya savunmanın arkasına derin pas atılır. Bu pas yolda kesilemez, topu alan oyuncu ilk dokunuşta kaleye vurur. Top rakipteyse, topu geri aldığın an atılır.',
  power:'15 sn içinde takımın çektiği ilk şut güçlü şut olur: oyuncu iyi bir pozisyon kollar, çok sert ve isabetli vurur, kaleci zor kurtarır.',
  wave:'7 sn boyunca kaleci hariç herkes ileri çıkar, %25 hızlanır ve çok daha sık şut çeker. Arkada boşluk kalır.',
  overlap:'7 sn boyunca iki bek kanatlardan hücuma bindirir, orta saha ve forvet ceza sahasına yaklaşır; paslar kanatlara akar ve sık orta yapılır. Ortaya yapılan kafa ve voleler köşeye, çok isabetli gider.',
  longball:'Top savunmanın arkasına havadan gönderilir, havadayken kesilemez. Topu alan oyuncu ilk dokunuşta kaleye vurur. Top rakipteyse, topu geri aldığın an atılır.',
  dribble:'6 sn boyunca top süren oyuncundan top kapmak çok zorlaşır, daha cesur sürer.',
  tiki:'8 sn boyunca top hızlı paslarla dolaşır. Rakip pasları zor keser, topu kapmakta zorlanır ve peşinden koşarken yavaşlar. Her isabetli pas +0,25★.',
  press:'6 sn boyunca iki oyuncu birden topa basar, top kapma şansı artar.',
  wall:'7 sn boyunca takım kendi kalesine yaslanır ve ortayı kapatır. Şutun önüne giren savunmacı topu büyük ihtimalle bloke eder, kaleci de daha çok kurtarır.',
  gk:'10 sn boyunca kaleci daha geniş alanı kapatır, kurtarış şansı çok artar.',
  slide:'Topa en yakın oyuncun kayarak atılır. Rakibe yetişirse topu çoğunlukla alır, rakip pası çıkarırsa pası kesmeye çalışır. Kayarak müdahale bazen faul olur.',
  offside:'6 sn boyunca savunma hattı aniden öne çıkar. Rakip bunu geç fark eder; pas anında hattın arkasında kalan oyuncu topu alınca ofsayt olur, top sana geçer ve +1★ kazanırsın. Hattın arkasına atılan ara pasa karşı risklidir.',
  foul:'Top süren rakibe bilerek faul yapılır, atak orada kesilir. Rakip serbest vuruşu geriye oynamak zorundadır, atak baştan kurulur. Bu sırada takımın koşarak savunmaya dizilir ve 5 sn şutları bloklar. Serbest vuruş faulün yapıldığı yerden kullanılır. Dikkat: ceza sahası içinde yapılan faul penaltıdır!',
  mark:'7 sn boyunca savunmacılar rakiplerini yakından tutar; pas arası ve top kapma şansı artar.',
  total:'10 sn boyunca Kontra Atak, Hücum Dalgası ve Çalım Ustası aynı anda: takım hızlanır, herkes ileri çıkar, topu süren oyuncudan top almak çok zorlaşır.',
  bus:'10 sn boyunca Savunma Duvarı ve Kaleci Refleksi aynı anda: takım kaleye yaslanır, şutların önüne atlar, kaleci çok daha geniş alanı kapatır.',
  hero:'Forvetin 12 sn süperstar olur: ondan top alınamaz, %30 hızlı koşar, takım topu ona akıtır ve çektiği ilk şut Güçlü Şut\'tan da serttir.',
  intercept:'6 sn boyunca rakip paslarını kesme şansı çok yüksek, oyuncuların menzili artar.',
};
function cardInfoHTML(k){
  const c=CARDS[k],dur=DUR[k]&&!['through','longball','foul','slide','power'].includes(k)?DUR[k]+' sn':'Anlık';
  return `<div class="cinfo ${c.type}"><span class="cart" style="--c1:${c.c1};--c2:${c.c2}">${iconSvg(k)}</span>
<div><b>${c.name}</b><div class="cmeta"><span class="ctype">${c.type==='atk'?'HÜCUM':c.type==='def'?'SAVUNMA':'SÜPER · maçta 1 kez'}</span><span>${c.cost}★</span><span>${dur}</span></div><p>${CARD_DETAIL[k]}</p></div></div>`;
}
// dokun = tap, basılı tut = hold; basılı tutulan kart oynanmaz/seçilmez
function pressable(root,{tap,hold,release},sel='.card'){
  let p=null;
  const end=fire=>{
    if(!p)return;clearTimeout(p.timer);
    if(fire&&!p.long)tap(p.el);
    if(p.long&&release)release(p.el);
    p=null;
  };
  root.addEventListener('pointerdown',e=>{
    const el=e.target.closest(sel);if(!el||e.button>0)return;
    p={el,long:false,timer:setTimeout(()=>{if(p){p.long=true;hold(p.el);}},420)};
  });
  root.addEventListener('pointerup',()=>end(true));
  root.addEventListener('pointercancel',()=>end(false));
  root.addEventListener('pointerleave',()=>end(false));
  root.addEventListener('contextmenu',e=>e.preventDefault());
}
let modalOpenedAt=0,modalPaused=false;
function openCardModal(k){
  const c=CARDS[k],dur=DUR[k]&&!['through','longball','foul','slide','power'].includes(k)?DUR[k]+' saniye':'Anlık';
  $('cmBody').innerHTML=`<div class="cm-card">${cardHTML(k,-1)}</div>
<h3 id="cmTitle">${c.name}</h3>
<div class="cmeta ${c.type}"><span class="ctype">${c.type==='atk'?'HÜCUM':c.type==='def'?'SAVUNMA':'SÜPER · maçta 1 kez'}</span><span>${c.cost} ★</span><span>${dur}</span></div>
<p>${CARD_DETAIL[k]}</p>`;
  $('cardModal').hidden=false;modalOpenedAt=performance.now();
  if(state==='play'&&!paused&&!(matchCtx&&matchCtx.pvp)){paused=true;modalPaused=true;}
  Sfx.ready();$('cmClose').focus();
}
function closeCardModal(){
  if($('cardModal').hidden)return;
  $('cardModal').hidden=true;
  if(modalPaused){paused=false;modalPaused=false;}
}
$('cmClose').onclick=()=>{Sfx.click();closeCardModal();};
// basılı tutmayı bırakan parmak pencereyi hemen kapatmasın
$('cardModal').addEventListener('click',e=>{if(e.target===$('cardModal')&&performance.now()-modalOpenedAt>350)closeCardModal();});
addEventListener('keydown',e=>{if(e.key==='Escape')closeCardModal();});
// deste ekranı: 16 karttan 8'ini seç
// deste ekranı: HÜCUM / SAVUNMA / SÜPER sekmeleri; her sekmede tek grup kart (mobilde kaydırmadan sığar)
function showDeck(){
  let sel=Deck.get(),selSuper=Deck.getSuper(),tab='atk';
  const ofType=type=>Object.keys(CARDS).filter(k=>CARDS[k].type===type).sort((x,y)=>CARDS[x].cost-CARDS[y].cost);
  showOverlay(`<h2>DESTEN</h2>
<div class="deckbar"><span>Seçili <b id="deckCount"></b></span><span>Ortalama <b id="deckAvg"></b>★</span></div>
<div class="decktabs" role="tablist">
<button class="dtab" data-t="atk" role="tab">HÜCUM <b id="deckAtk"></b></button>
<button class="dtab" data-t="def" role="tab">SAVUNMA <b id="deckDef"></b></button>
<button class="dtab sup" data-t="super" role="tab">SÜPER</button></div>
<div class="tip dtip" id="deckHint"></div>
<div id="deckGrid"></div>
<button class="cta" id="go">KAYDET</button><button class="link" id="back">Vazgeç</button>`,
  {go:()=>{Deck.set(sel);Deck.setSuper(selSuper);showMenu();},back:showMenu});
  $('obox').classList.add('wide');
  const draw=()=>{
    const keys=tab==='super'?SUPER_KEYS:ofType(tab);
    $('deckGrid').className=tab==='super'?'sup':'';
    $('deckGrid').innerHTML=keys.map(k=>cardHTML(k,-1).replace('data-i="-1"','data-k="'+k+'"').replace('tabindex="-1"','')).join('');
    $('deckHint').textContent=tab==='super'?'Maçta 1 kez oynanır, uzatmada +1 hak. Birini seç.':'Dokun: desteye ekle ya da çıkar · Basılı tut: ayrıntı';
    document.querySelectorAll('.dtab').forEach(el=>{el.classList.toggle('on',el.dataset.t===tab);el.setAttribute('aria-selected',el.dataset.t===tab);});
    render();
  };
  const render=()=>{
    $('deckGrid').querySelectorAll('.card').forEach(el=>el.classList.toggle('in',tab==='super'?el.dataset.k===selSuper:sel.includes(el.dataset.k)));
    $('deckCount').textContent=sel.length+'/'+DECK_SIZE;
    $('deckAtk').textContent=sel.filter(k=>CARDS[k].type==='atk').length;
    $('deckDef').textContent=sel.filter(k=>CARDS[k].type==='def').length;
    $('deckAvg').textContent=sel.length?avgCost(sel).toFixed(1):'–';
    $('go').disabled=sel.length!==DECK_SIZE;
  };
  const toggle=el=>{
    const k=el.dataset.k;
    if(tab==='super'){selSuper=k;Sfx.click();render();return;}
    if(sel.includes(k))sel=sel.filter(x=>x!==k);
    else if(sel.length<DECK_SIZE)sel.push(k);
    else{Sfx.deny();el.classList.remove('full');void el.offsetWidth;el.classList.add('full');return;} // deste dolu
    Sfx.click();
    render();
  };
  document.querySelectorAll('.dtab').forEach(el=>el.onclick=()=>{if(tab===el.dataset.t)return;tab=el.dataset.t;Sfx.click();draw();});
  pressable($('deckGrid'),{tap:toggle,hold:el=>openCardModal(el.dataset.k)});
  $('deckGrid').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const el=e.target.closest('.card');if(el){e.preventDefault();toggle(el);}}};
  draw();
  // sekme değişince ekran zıplamasın: ızgara iki sıralık kart yüksekliğinde sabit kalır
  $('deckGrid').style.minHeight=$('deckGrid').offsetHeight+'px';
}
function showSettings(){
  const seg=(name,items,cur)=>'<div class="seg" role="radiogroup">'+items.map(([v,l])=>
    '<input type="radio" name="'+name+'" id="'+name+'-'+v+'" value="'+v+'"'+(String(v)===String(cur)?' checked':'')+'><label for="'+name+'-'+v+'">'+l+'</label>').join('')+'</div>';
  const d=Settings.diff();
  showOverlay(`<h2>AYARLAR</h2>
<div class="settings">
  <fieldset><legend>Rakip zorluğu <small id="diffDesc">· ${d.desc}</small></legend>${seg('diff',Object.entries(Settings.DIFF).map(([k,v])=>[k,v.name]),Settings.get('difficulty'))}</fieldset>
  <fieldset><legend>Maç süresi</legend>${seg('len',Settings.LENGTHS.map(v=>[v,v/60+' dk']),Settings.get('length'))}</fieldset>
  <div class="srow"><label for="optSound">Ses</label><input type="checkbox" class="sw" id="optSound"${Sfx.muted?'':' checked'}></div>
  <div class="srow"><label for="optShake">Ekran sarsıntısı</label><input type="checkbox" class="sw" id="optShake"${Settings.get('shake')?' checked':''}></div>
</div>
<button class="cta alt small" id="replayTut">EĞİTİMİ TEKRAR İZLE</button>
<button class="cta" id="go">TAMAM</button>`,{go:showMenu,replayTut:()=>{Coach.reset();Tutorial.reset();matchCtx=null;matchOpp=null;start();}});
  $('obox').classList.add('wide');
  $('obox').querySelectorAll('input[name=diff]').forEach(el=>el.onchange=()=>{Settings.set('difficulty',el.value);$('diffDesc').textContent='· '+Settings.diff().desc;Sfx.click();});
  $('obox').querySelectorAll('input[name=len]').forEach(el=>el.onchange=()=>{Settings.set('length',+el.value);Sfx.click();});
  $('optSound').onchange=e=>{Sfx.init();if(e.target.checked===Sfx.muted)Sfx.toggleMute();if(!Sfx.muted)Sfx.click();updateMuteBtn();}; // kapatırken ses yok, açınca tık
  $('optShake').onchange=e=>{Settings.set('shake',e.target.checked);Sfx.click();};
}
function start(){
  Sfx.init();Sfx.resume(); // "Yeniden başla" duraklatma ekranından gelir
  newMatch();paused=false;hideOverlay();applyOppHud();resize();
  if(Coach.needed()){state='coach';Coach.run(kickOffMatch);}
  else kickOffMatch();
}
function kickOffMatch(){
  state='play';
  banners.push({type:'info',text:'BAŞLA!',sub:matchCtx?matchCtx.label+' · '+matchOpp.name:'Taktiğini kartlarla kur',color:'#ffc83d',t:0,life:1.6});
  if(ball.owner)ball.owner.decT=1.7; // santra yazı bitince yapılır
  Sfx.whistle();Tutorial.begin();
}
function setPaused(v){
  if(state!=='play'&&state!=='goal')return;
  // arkadaş maçı durmaz; düğme sadece çıkış seçeneği sunar
  if(matchCtx&&matchCtx.pvp){
    if(!v)return;
    showOverlay('<h2>MAÇ SÜRÜYOR</h2><p>Arkadaş maçı duraklatılamaz.</p><button class="cta" id="go">DEVAM</button><button class="link" id="menu">Maçtan çık (rakip kazanır)</button>',{go:hideOverlay,menu:()=>Net.leave()});
    return;
  }
  if(v===paused)return;
  paused=v;
  if(v){
    Sfx.suspend();
    showOverlay(`<h2>DURAKLATILDI</h2><div class="big"><span style="color:var(--home-l)">${teams[0].score}</span> – <span style="color:var(--away-l)">${teams[1].score}</span></div>
<button class="cta" id="go">DEVAM</button>${matchCtx?'':'<button class="link" id="restart">Yeniden başla</button>'}<button class="link" id="menu">${matchCtx?'Maçı bırak (sonuç kaydedilmez)':'Ana menü'}</button>`,
    {go:()=>setPaused(false),restart:start,menu:showMenu});
  }else{hideOverlay();Sfx.resume();}
}
// maç sonu istatistikleri: solda izleyenin takımı, sağda rakip
const fmtT=sec=>Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
function statsHTML(s,me){
  const o=1-me,cL=teams[0].color,cR=teams[1].color;
  const row=(label,a,b,va=a,vb=b)=>{const t=a+b,pa=t>0?a/t*100:50;
    return`<div class="srow2"><b>${va}</b><span>${label}</span><b>${vb}</b><i style="--pa:${pa.toFixed(1)}%;--cl:${cL};--cr:${cR}"></i></div>`;};
  const pct=(n,d)=>d>0?Math.round(n/d*100):0;
  const pT=s.poss[0]+s.poss[1],pm=pT>0?Math.round(s.poss[me]/pT*100):50;
  // gol akışı: süre çizgisi üzerinde senin gollerin altta, rakibinkiler üstte
  const end=Math.max(s.len,...s.goals.map(g=>g.at),1);
  const marks=s.goals.map(g=>{const mine=g.tid===me,x=Math.min(98,Math.max(2,g.at/end*100));
    return`<span class="gm ${mine?'me':'op'}" style="left:${x}%;--c:${mine?cL:cR}">${fmtT(g.at)}${g.pen?' P':''}${g.ot?' AG':''}</span>`;}).join('');
  const ot=end>s.len?`<span class="otline" style="left:${s.len/end*100}%"></span>`:'';
  // kartlar
  const mine=Object.entries(s.cards[me]).sort((a,b)=>b[1]-a[1]);
  const chips=mine.length?mine.map(([k,n])=>`<span class="mcard" title="${CARDS[k].name}" style="--c1:${CARDS[k].c1};--c2:${CARDS[k].c2}">${iconSvg(k)}<em>×${n}</em></span>`).join(''):'<span class="tip">Kart oynamadın</span>';
  const best=Object.entries(s.cardXg[me]).sort((a,b)=>b[1]-a[1])[0];
  let star='';
  if(best&&best[1]>=.05)star=`<div class="motm"><span class="mcard" style="--c1:${CARDS[best[0]].c1};--c2:${CARDS[best[0]].c2}">${iconSvg(best[0])}</span><div><small>MAÇIN KARTI</small><b>${CARDS[best[0]].name}</b><span>${best[1].toFixed(2)} xG yarattı</span></div></div>`;
  else if(mine.length)star=`<div class="motm"><span class="mcard" style="--c1:${CARDS[mine[0][0]].c1};--c2:${CARDS[mine[0][0]].c2}">${iconSvg(mine[0][0])}</span><div><small>EN ÇOK OYNADIĞIN</small><b>${CARDS[mine[0][0]].name}</b><span>${mine[0][1]} kez</span></div></div>`;
  return`<div class="mstats">
<div class="gline">${ot}${marks}</div>
${row('xG',s.xg[me],s.xg[o],s.xg[me].toFixed(2),s.xg[o].toFixed(2))}
${row('Topa sahip olma',pm,100-pm,pm+'%',(100-pm)+'%')}
${row('Şut (isabetli)',s.shots[me],s.shots[o],s.shots[me]+' ('+s.onT[me]+')',s.shots[o]+' ('+s.onT[o]+')')}
${row('Pas isabeti',pct(s.passOk[me],s.passes[me]),pct(s.passOk[o],s.passes[o]),s.passes[me]?pct(s.passOk[me],s.passes[me])+'%':'–',s.passes[o]?pct(s.passOk[o],s.passes[o])+'%':'–')}
${row('Top kapma',s.tackles[me],s.tackles[o])}
${row('Pas arası',s.ints[me],s.ints[o])}
${row('Kurtarış',s.saves[me],s.saves[o])}
${row('Faul',s.foulsT[me],s.foulsT[o])}
${row('Ofsayt',s.offT[me],s.offT[o])}
<div class="mcards"><div class="mchips">${chips}</div><div class="tip">Harcanan yıldız: <b>${s.stars[me]}★</b> · Rakip ${s.stars[o]}★</div></div>
${star}
</div>`;
}
function endMatch(){
  state='end';Tutorial.hide();Sfx.whistleEnd();
  const a=teams[0].score,b=teams[1].score;
  if(matchCtx&&matchCtx.tour){tourAfterMatch(a,b);return;}
  if(matchCtx&&matchCtx.pvp){showPvpEnd(a,b);return;}
  const res=a>b?['KAZANDIN!','var(--gold)']:a<b?['KAYBETTİN','var(--away-l)']:['BERABERE','var(--home-l)'];
  showOverlay(`<h2 style="color:${res[1]}">${res[0]}</h2>${overtime?'<div class="tip">UZATMADA ALTIN GOL</div>':''}<div class="big"><span style="color:var(--home-l)">${a}</span> – <span style="color:var(--away-l)">${b}</span></div>${statsHTML(stats,0)}<div class="btnrow"><button class="cta" id="go">TEKRAR</button></div><button class="link" id="menu">Ana menü</button>`,
  {go:start,menu:showMenu});
  $('obox').classList.add('wide','end');
}
function updateMuteBtn(){
  const b=$('muteBtn');b.innerHTML=Sfx.muted?UI_ICONS.mute:UI_ICONS.sound;
  b.setAttribute('aria-label',Sfx.muted?'Sesi aç':'Sesi kapat');b.setAttribute('aria-pressed',Sfx.muted);
  const sw=$('optSound');if(sw)sw.checked=!Sfx.muted;
}
$('pauseBtn').innerHTML=UI_ICONS.pause;
$('pauseBtn').onclick=()=>setPaused(!paused);
$('muteBtn').onclick=()=>{Sfx.init();Sfx.toggleMute();if(!Sfx.muted)Sfx.click();updateMuteBtn();};
updateMuteBtn();
pressable($('super'),{
  tap:()=>trySuper(),
  hold:()=>{if(state==='play'||state==='coach'||state==='menu')openCardModal(teams[0].superKey);},
});
pressable($('hand'),{
  tap:el=>tryCard(+el.dataset.i),
  hold:el=>{if(state==='play'||state==='coach')openCardModal(teams[0].hand[+el.dataset.i]);},
});
$('hand').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const el=e.target.closest('.card');if(el){e.preventDefault();tryCard(+el.dataset.i);}}});
// sekme arka plana geçince oyun kendiliğinden durur
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!Net.active())setPaused(true);});
