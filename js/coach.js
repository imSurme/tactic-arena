// İlk "Oyna"da maç başlamadan önce ekranın her parçasını tek tek gösteren eğitim
const Coach=(()=>{
  let done=false;
  try{done=localStorage.getItem('ta-coach')==='1';}catch(e){}
  // sahanın içindeki bir bölgeyi (oyun koordinatlarında) ekran dikdörtgenine çevirir
  const fieldRect=(x,y,w,h)=>{
    const r=$('c').getBoundingClientRect(),k=r.width/W;
    return{left:r.left+x*k,top:r.top+y*k,width:w*k,height:h*k};
  };
  const el=id=>()=>$(id).getBoundingClientRect();
  const steps=[
    {at:el('field'),title:'Tactic Arena\'ya hoş geldin',
     text:'Oyuncuların kendi kendine oynar: pas verir, şut çeker, savunma yapar. Senin işin doğru anda doğru <b>taktik kartını</b> oynamak.'},
    {at:el('hud'),title:'Sen maviysin',
     text:'Mavi takım sensin ve aşağıdan yukarıya, kırmızının kalesine hücum edersin. Top hangi takımdaysa skorbordda o taraf parlar.'},
    {at:el('timer'),title:'Maç süresi',
     text:()=>`Maç ${Settings.get('length')/60} dakika sürer. Son 60 saniyede yıldızlar 2 kat hızlı dolar. Berabere biterse <b>altın gollü uzatma</b> oynanır: ilk golü atan kazanır.`},
    {at:el('stars'),title:'Yıldızlar',
     text:'Kart oynamak yıldız ister. Yıldızlar zamanla dolar, en fazla 10 birikir. İyi oyunla bonus da kazanırsın: top kapma ve pas arası +0,5★, kaleci kurtarışı +1★.'},
    {at:el('hand'),title:'Elindeki kartlar',
     text:'Her an elinde 4 kart olur. Karta <b>dokununca oynanır</b>. Köşedeki yıldız bedelini gösterir. Yıldızın yetmiyorsa kart soluk durur ve yıldız doldukça alttan aydınlanır.'},
    {at:el('hand'),title:'Hücum mu, savunma mı?',
     text:'<span class="t-atk">Turuncu çerçeve HÜCUM</span>: top sendeyken oyna. <span class="t-def">Mavi çerçeve SAVUNMA</span>: top rakipteyken oyna. O an işe yarayacak kartlar hafifçe parlayıp zıplar.'},
    {at:()=>$('hand').querySelector('.card').getBoundingClientRect(),title:'Basılı tut, ayrıntıyı gör',
     text:'Bir kartın ne yaptığını görmek için ona <b>basılı tut</b>. Kart oynanmaz; ekranın ortasında ayrıntı penceresi açılır ve maç sen kapatana kadar durur.'},
    {at:el('next'),title:'Sıradaki kart',
     text:'Oynadığın kart destenin sonuna gider, yerine buradaki kart gelir. 8 kartlık desteni menüdeki <b>DESTE</b> ekranında 16 kart arasından kurarsın.'},
    {at:()=>fieldRect(FX+FW-44,FY+FH-110,44,104),title:'Aktif kartlar',
     text:'Oynadığın kart sahaya uçar ve çarptığı an etkisi başlar. Süren kartlar sağ altta küçük ikonlar olarak durur; çevresindeki halka kalan süreyi gösterir. Rakibinkiler sağ üstte.'},
    {at:()=>fieldRect(0,0,140,30),title:'Rakibin kartları',
     text:'Rakip de kart oynar. Son oynadığı 3 kart sol üstte belirir. Ona göre cevap ver: rakip hücum kartı oynadıysa savunma kartını hazır tut.'},
    {at:()=>fieldRect(CX-60,CY-60,120,120),title:'Sahayı okumak',
     text:'Topu süren oyuncunun altında <b>sarı halka</b> olur. Kesikli çizgi, giden pasın ineceği yeri gösterir. Ortalar ve uzun toplar havadan gider, havadayken kesilemez.'},
    {at:()=>fieldRect(FX,CY-110,FW,120),title:'Ofsayt ve faul',
     text:'Kurallar gerçek: savunmanın arkasında bekleyen oyuncuya atılan pas <b>ofsayttır</b>, yan hakem bayrağı kaldırır ve top rakibe geçer. Sert ya da arkadan müdahale <b>faul</b> olur, faule uğrayan takım serbest vuruş kullanır. Kaleye yakın serbest vuruş direkt kaleye çekilir.'},
    {at:el('ctrl'),title:'Duraklat ve ses',
     text:'Buradan oyunu duraklatır, sesi açıp kapatırsın. Rakip zorluğu ve maç süresi menüdeki <b>AYARLAR</b> ekranında.'},
    {at:el('field'),title:'Hazırsın!',last:true,
     text:'İlk maçta küçük ipuçlarıyla yanında olacağım. Topu kaptır, kartını oyna, golü at!'},
  ];
  let i=0,root=null,onDone=null;
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
    root.remove();root=null;
    const cb=onDone;onDone=null;if(cb)cb();
  }
  return{
    needed:()=>!done,
    run(cb){onDone=cb;i=0;if(!root)build();addEventListener('resize',place);show();},
  };
})();
