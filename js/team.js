// Senin takımın: ad, kısa ad, forma ve şerit rengi, arma (tarayıcıda saklanır, arkadaş maçında rakibe de gider)
const KIT_COLORS=[
  ['#2f80ff','Mavi'],['#1e2a78','Lacivert'],['#14b8a6','Turkuaz'],['#ff4d5e','Kırmızı'],['#8c1c3c','Bordo'],['#ff8a1f','Turuncu'],
  ['#ffd23f','Sarı'],['#a34dff','Mor'],['#ff5fb0','Pembe'],['#2a2f45','Siyah'],['#f2f2f2','Beyaz'],['#94a3b8','Gri'],
];
const CREST_SHAPES=[
  'M16 2 28 6v9c0 7-5 12.5-12 15C9 27.5 4 22 4 15V6z',  // kalkan
  'M3 16a13 13 0 1 0 26 0a13 13 0 1 0-26 0z',           // yuvarlak
  'M16 1.5 30 16 16 30.5 2 16z',                       // baklava
  'M4.5 3h23v16.5L16 29.5 4.5 19.5z',                  // flama
];
// sembol çizimi: f = sembol rengi, k = arma rengi
const CREST_SYMBOLS=[
  f=>`<path d="M16 9l2 4.3 4.6.5-3.4 3.1 1 4.6L16 19.2l-4.2 2.3 1-4.6-3.4-3.1 4.6-.5z" fill="${f}"/>`,   // yıldız
  f=>`<circle cx="16" cy="15.5" r="5.6" fill="none" stroke="${f}" stroke-width="2.6"/>`,               // halka
  f=>`<path d="M17.8 7.5 11 17.2h4.4l-1.6 7.3 7.2-10.2h-4.5z" fill="${f}"/>`,                           // şimşek
  f=>`<path d="M9.5 20.5h13l1-9.2-4 3.4L16 9l-3.5 5.7-4-3.4z" fill="${f}"/>`,                         // taç
  (f,k)=>`<circle cx="16" cy="15.5" r="6.2" fill="${f}"/><path d="M16 12.4l2.5 1.8-.9 2.9h-3.2l-.9-2.9z" fill="${k}"/>`, // top
  f=>`<path d="M11.2 9h3.3v13h-3.3zM17.5 9h3.3v13h-3.3z" fill="${f}"/>`,                               // çubuklar
];
const CREST_SHAPE_NAMES=['Kalkan','Yuvarlak','Baklava','Flama'];
const CREST_SYMBOL_NAMES=['Yıldız','Halka','Şimşek','Taç','Top','Çubuklar'];
const CLASH=45; // iki forma rengi bundan yakınsa sahada karışır

const hexRGB=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function mixHex(a,b,k){
  const x=hexRGB(a),y=hexRGB(b);
  return'#'+x.map((v,i)=>Math.round(v+(y[i]-v)*k).toString(16).padStart(2,'0')).join('');
}
// göze göre renk uzaklığı (Lab uzayında). Küçük oyuncularda ton farkı açıklık farkından çok daha iyi seçilir,
// bu yüzden açıklık daha az sayılır: kırmızıyla koyu kırmızı karışır, kırmızıyla turuncu karışmaz
function toLab(h){
  const[r,g,b]=hexRGB(h).map(v=>{v/=255;return v>.04045?((v+.055)/1.055)**2.4:v/12.92;});
  const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
  const x=f((r*.4124+g*.3576+b*.1805)/.95047),y=f(r*.2126+g*.7152+b*.0722),z=f((r*.0193+g*.1192+b*.9505)/1.08883);
  return[116*y-16,500*(x-y),200*(y-z)];
}
function kitDist(a,b){const x=toLab(a),y=toLab(b);return Math.hypot((x[0]-y[0])*.75,x[1]-y[1],x[2]-y[2]);}
const isLight=h=>{const[r,g,b]=hexRGB(h);return r*.3+g*.59+b*.11>170;};
// bir forma renginden koyu (şort), açık (yazılar) ve şerit renklerini türet; kaleci rengi maçta seçilir
function kitFrom(hex,trim){
  return{color:hex,dark:mixHex(hex,'#000000',.35),light:mixHex(hex,'#ffffff',.55),trim:trim||mixHex(hex,'#000000',.6),gkColor:'#b6f23a',gkTrim:'#2e5a00'};
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');

const Team=(()=>{
  const DEFAULT={name:'Mavi Yıldızlar',short:'MAVİ',color:'#2f80ff',trim:'#ffffff',shape:0,symbol:0};
  const COLORS=KIT_COLORS.map(c=>c[0]);
  const cleanName=s=>String(s||'').replace(/[^\p{L}\p{N} .'-]/gu,'').replace(/\s+/g,' ').trim().slice(0,20);
  const cleanShort=s=>String(s||'').toLocaleUpperCase('tr').replace(/[^\p{L}\p{N}]/gu,'').slice(0,8);
  const shortFrom=name=>cleanShort(name.split(' ')[0]);
  // dışarıdan gelen (kayıt ya da arkadaşın gönderdiği) takımı güvenli hale getir
  function clean(o){
    o=o&&typeof o==='object'?o:{};
    const name=cleanName(o.name)||DEFAULT.name;
    const color=COLORS.includes(o.color)?o.color:DEFAULT.color;
    let trim=COLORS.includes(o.trim)?o.trim:DEFAULT.trim;if(trim===color)trim=color==='#f2f2f2'?'#2a2f45':'#f2f2f2';
    return{name,short:cleanShort(o.short)||shortFrom(name)||'TAKIM',color,trim,
      shape:Number.isInteger(o.shape)&&o.shape>=0&&o.shape<CREST_SHAPES.length?o.shape:0,
      symbol:Number.isInteger(o.symbol)&&o.symbol>=0&&o.symbol<CREST_SYMBOLS.length?o.symbol:0};
  }
  let me;
  try{me=clean(JSON.parse(localStorage.getItem('ta-team')));}catch(e){me=clean(DEFAULT);}
  // sayfadaki "senin renk" değişkenleri (menü, turnuva tablosu, skor yazıları)
  function applyCss(){const s=document.documentElement.style,k=kitFrom(me.color);s.setProperty('--home',k.color);s.setProperty('--home-l',k.light);}
  // turnuva rakipleri için addan sabit bir arma
  function badgeFor(name,color){
    let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;
    return{color,trim:isLight(color)?'#2a2f45':'#ffffff',shape:h%CREST_SHAPES.length,symbol:(h>>3)%CREST_SYMBOLS.length};
  }
  // arma SVG'si; b: {color, trim, shape, symbol}
  function crestSVG(b,cls){
    const f=kitDist(b.trim,b.color)<CLASH?(isLight(b.color)?'#2a2f45':'#ffffff'):b.trim;
    return`<svg class="crest${cls?' '+cls:''}" viewBox="0 0 32 32" aria-hidden="true"><path d="${CREST_SHAPES[b.shape]||CREST_SHAPES[0]}" fill="${b.color}" stroke="${f}" stroke-width="2.4" stroke-linejoin="round"/>${(CREST_SYMBOLS[b.symbol]||CREST_SYMBOLS[0])(f,b.color)}</svg>`;
  }
  return{
    COLORS,DEFAULT,clean,shortFrom,badgeFor,crestSVG,applyCss,
    get:()=>({...me}),
    set(o){me=clean(o);try{localStorage.setItem('ta-team',JSON.stringify(me));}catch(e){}applyCss();},
    kit:()=>kitFrom(me.color,me.trim),
  };
})();
Team.applyCss();

// hızlı maçın "Rakip"i: her maç senin formandan belirgin şekilde farklı rastgele bir renk giyer (arması da o renkte)
function rivalBadge(mine){
  const far=Team.COLORS.filter(c=>kitDist(c,mine)>=70),color=far[Math.random()*far.length|0]||'#ff4d5e';
  return{color,trim:isLight(color)?'#2a2f45':'#ffffff',shape:0,symbol:1};
}
// renk çakışması: deplasman takımı ana rengini şeridiyle değiştirir, o da yakınsa en uzak renge geçer.
// Şerit ancak paletten seçilmişse kullanılır: yapay zekâ takımlarının şeridi kendi renginin koyu tonudur, sahada yine karışır.
// İki taraf da aynı sonucu bulur (arkadaş maçında ev sahibi = odayı kuran). Kaleciler iki takımdan da ayrışır.
function settleKits(home,away){
  if(kitDist(home.color,away.color)<CLASH){
    const main=Team.COLORS.includes(away.trim)&&kitDist(home.color,away.trim)>=CLASH?away.trim:Team.COLORS.reduce((a,c)=>kitDist(c,home.color)>kitDist(a,home.color)?c:a);
    const trim=kitDist(main,away.color)>=CLASH?away.color:isLight(main)?'#2a2f45':'#ffffff';
    Object.assign(away,kitFrom(main,trim));
  }
  const GK=['#b6f23a','#ffa21f','#3fe0d0','#9b5cff','#ff5fb0'];
  const far=c=>Math.min(kitDist(c,home.color),kitDist(c,away.color));
  const pick=skip=>GK.filter(c=>c!==skip).reduce((a,c)=>far(c)>far(a)?c:a);
  home.gkColor=pick(null);away.gkColor=pick(home.gkColor);
  home.gkTrim=mixHex(home.gkColor,'#000000',.55);away.gkTrim=mixHex(away.gkColor,'#000000',.55);
}
