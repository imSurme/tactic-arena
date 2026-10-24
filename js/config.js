// Sabitler: saha ölçüleri, tempo, kartlar, ikonlar, roller, renkler
const W=360,H=560,FX=20,FY=30,FW=320,FH=500,CX=FX+FW/2,CY=FY+FH/2,GW=96;
const MATCH=180,FAST_TIME=60;          // 3 dk maç, son 60 sn 2x yıldız
const STAR_MAX=10,STAR_REGEN=1/4.5,STAR_START=3;  // yıldız: kart oynama parası (4,5 sn'de 1); maç başında tek kart oynanabilsin diye 3 ile başlar
const DECK_SIZE=8;
// tempo: oyuncu ve top hızları, top kapma ve pas arası olasılıkları
const TEMPO={
  run:54,            // oyuncu koşu hızı (px/sn)
  friction:1.0,      // topun yavaşlama katsayısı
  shotFriction:.4,   // şutun yavaşlama katsayısı
  passMin:160,passMax:310,
  shot:[320,380],powerShot:500,shotRange:240,
  tackle:.15,tackleCd:.8,grace:.8,  // top kapma şansı, deneme arası, topu yeni alana dokunulmaz süre
  intercept:.18,interceptMaxSpeed:320,
  think:[.35,.55],   // top sürenin karar verme aralığı
};
// oyun içi yıldız ödülleri
const REWARD={tackle:.3,intercept:.3,save:.6,tiki:.25,foulComp:0};
const DEBUG=typeof location!=='undefined'&&location.hash==='#debug';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CARDS={
  counter:{name:'Kontra Atak',short:'KONTRA',type:'atk',cost:3,desc:'6 sn hız, öne çık',c1:'#ffd36b',c2:'#ff6a00',col:'#ffb52e'},
  through:{name:'Ara Pas',short:'ARA PAS',type:'atk',cost:3,desc:'Forvete derin pas',c1:'#7dffb0',c2:'#0f9b6c',col:'#43e97b'},
  power:{name:'Güçlü Şut',short:'BOMBA',type:'atk',cost:3,desc:'Uzaktan sert şut',c1:'#ff9ad0',c2:'#c2187a',col:'#ff6fbf'},
  wave:{name:'Hücum Dalgası',short:'DALGA',type:'atk',cost:4,desc:'7 sn herkes ileri',c1:'#ffb27a',c2:'#d9431e',col:'#ff8a4d'},
  overlap:{name:'Kanat Bindirme',short:'BİNDİRME',type:'atk',cost:2,desc:'Bekler kanattan hücuma',c1:'#ffe27a',c2:'#c98a00',col:'#ffd23f'},
  longball:{name:'Uzun Top',short:'UZUN TOP',type:'atk',cost:3,desc:'Havadan savunma arkasına',c1:'#9ff0ff',c2:'#1b88b5',col:'#6fe3ff'},
  dribble:{name:'Çalım Ustası',short:'ÇALIM',type:'atk',cost:3,desc:'6 sn top kaptırmaz',c1:'#ffc2f2',c2:'#a1309a',col:'#ff9ae8'},
  tiki:{name:'Tiki-Taka',short:'TİKİ-TAKA',type:'atk',cost:2,desc:'Hızlı paslarla topu sakla',c1:'#c3ff9e',c2:'#3e9a20',col:'#9cf26a'},
  press:{name:'Sığır Press',short:'S. PRESS',type:'def',cost:3,desc:'2 oyuncu topa basar',c1:'#b18cff',c2:'#5a2fd0',col:'#a77bff'},
  wall:{name:'Savunma Duvarı',short:'DUVAR',type:'def',cost:3,desc:'Geriye yaslan, şutları blokla',c1:'#8fd3ff',c2:'#2a5bd0',col:'#5cb8ff'},
  gk:{name:'Kaleci Refleksi',short:'KALECİ',type:'def',cost:3,desc:'10 sn süper kurtarış',c1:'#8ff5e6',c2:'#118a8c',col:'#3fe0d0'},
  slide:{name:'Kayan Müdahale',short:'KAYMA',type:'def',cost:3,desc:'4 sn kayarak topa dalar',c1:'#d4f78a',c2:'#4c9a1f',col:'#b4e85a'},
  offside:{name:'Ofsayt Tuzağı',short:'OFSAYT',type:'def',cost:3,desc:'Hat çıkar, ofsayt yakalar',c1:'#fff3a0',c2:'#b58b00',col:'#ffe14d'},
  foul:{name:'Taktik Faul',short:'FAUL',type:'def',cost:2,desc:'Atağı kes, baştan kurdur',c1:'#ffa3a3',c2:'#b3122b',col:'#ff6b7a'},
  mark:{name:'Adam Adama',short:'MARKAJ',type:'def',cost:3,desc:'8 sn sıkı markaj',c1:'#a6c8ff',c2:'#28408f',col:'#7fa8ff'},
  // süper kartlar: destede bir tane seçilir, maçta bir kez (uzatmada bir hak daha) oynanır
  total:{name:'Total Futbol',short:'TOTAL',type:'super',cost:7,desc:'10 sn tüm hücum gücü',c1:'#ffe27a',c2:'#d9431e',col:'#ffb52e'},
  bus:{name:'Otobüsü Çek',short:'OTOBÜS',type:'super',cost:6,desc:'10 sn kaleyi kapat',c1:'#9fd8ff',c2:'#1f3fa8',col:'#5cb8ff'},
  hero:{name:'Yıldız Oyuncu',short:'YILDIZ',type:'super',cost:7,desc:'Forvet 12 sn süperstar',c1:'#fff3a0',c2:'#c98a00',col:'#ffd23f'},
  intercept:{name:'Pas Kesme',short:'PAS KESME',type:'def',cost:2,desc:'7 sn pasları keser',c1:'#b9fff0',c2:'#14806a',col:'#5cf0cf'},
};
const SLIDE_RANGE=75,SLIDE_SPEED=200,SLIDE_REST=.9,SLIDE_WIN=.6; // kayan müdahale: kaymaya başlama mesafesi, kayış hızı, kayan oyuncunun kalkma süresi, rakibe yetişince topu alma şansı
const DUR={slide:4,total:10,bus:10,hero:12,counter:6,press:6,through:6,power:15,wall:7,gk:10,wave:7,overlap:8,longball:6,dribble:6,tiki:8,offside:6,foul:5,mark:8,intercept:7};
// xG: şutun gol olma olasılığı. Simülasyondaki 18.153 şuttan lojistik regresyonla çıkarıldı.
// mesafe dilimleri (px): <50, <80, <110, <150, <200, 200+ (her dilimin kendi sabiti);
// sonra: açı, öndeki savunmacı, baskı altında, güçlü şut, güçlü şut×mesafe, vole, rakip kaleci kartı, rakip duvar kartı
const XG={bins:[50,80,110,150,200],b:[0.391,-0.53,-0.864,-1.408,-1.878,-2.448],w:[-0.044,-0.099,0.108,0.838,-0.066,0.042,-1.47,-1.324],pen:.74};
const SUPER_KEYS=['total','bus','hero'],DEFAULT_SUPER='total';
const DEFAULT_DECK=['counter','through','power','wave','press','wall','gk','slide'];
const ICONS={
  total:'<path d="M12 1.5 15.5 6h-2.3v4.8H18V8.5L22.5 12 18 15.5v-2.3h-4.8V18h2.3L12 22.5 8.5 18h2.3v-4.8H6v2.3L1.5 12 6 8.5v2.3h4.8V6H8.5z"/>',
  bus:'<rect x="3" y="3.5" width="18" height="14.5" rx="3.2"/><rect x="5.3" y="5.8" width="5.7" height="4.6" rx="1" fill="rgba(0,0,0,.4)"/><rect x="13" y="5.8" width="5.7" height="4.6" rx="1" fill="rgba(0,0,0,.4)"/><rect x="5.5" y="13" width="2.6" height="1.8" rx=".6" fill="rgba(0,0,0,.4)"/><rect x="15.9" y="13" width="2.6" height="1.8" rx=".6" fill="rgba(0,0,0,.4)"/><circle cx="7.5" cy="19.2" r="2"/><circle cx="16.5" cy="19.2" r="2"/>',
  hero:'<path d="M12 1.8l3 6.2 6.8.8-5 4.7 1.3 6.8L12 17l-6.1 3.3 1.3-6.8-5-4.7L9 8z"/><path d="M8.5 1.5 12 4l3.5-2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  counter:'<path d="M13.5 2 4.5 13.5h6L9.5 22l10-12h-6.2L14.5 2z"/>',
  through:'<circle cx="5" cy="19" r="2.8"/><path d="M7 16.5C9.5 10.5 13.5 7.5 17.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1.5 4"/><path d="M15 2.8 21.5 5l-3.6 5.6z"/>',
  power:'<circle cx="15" cy="12" r="6.5"/><path d="M15 8.7l2.6 1.9-1 3h-3.2l-1-3z" fill="rgba(0,0,0,.35)"/><path d="M1.5 8h6M1 12h5.5M1.5 16h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  wave:'<path d="M4 21l8-6 8 6M4 14.5l8-6 8 6M4 8l8-6 8 6" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"/>',
  overlap:'<path d="M10 21.5 5.4 10M14 21.5l4.6-11.5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M2.4 3.6 7.9 7.6 2.1 10.4zM21.6 3.6l-5.5 4 5.8 2.8z"/>',
  longball:'<path d="M3 20C6 6 16 4 21 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 3.5"/><circle cx="20" cy="17.5" r="3.3"/><circle cx="4" cy="20" r="2"/>',
  dribble:'<path d="M4 21.5c5.5 0 9-2.6 9-6.2 0-3.4-6.8-3.3-6.8-7C6.2 5 9.4 3 14.5 3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="18.4" cy="3.6" r="2.9"/>',
  tiki:'<circle cx="5" cy="17" r="2.6"/><circle cx="12" cy="6" r="2.6"/><circle cx="19" cy="17" r="2.6"/><path d="M6.5 14.5 10.5 8.5M13.5 8.5l4 6M7.7 17h8.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  press:'<path d="M7.6 8.6C4.2 8.6 2 6.3 2 2.6c1.6 2.1 3.6 2.9 6.2 2.9zM16.4 8.6C19.8 8.6 22 6.3 22 2.6c-1.6 2.1-3.6 2.9-6.2 2.9z"/><path d="M6.4 9.6C4.6 9.9 3 9.3 2.2 8c1.5-.6 3.2-.5 4.4.3zM17.6 9.6c1.8.3 3.4-.3 4.2-1.6-1.5-.6-3.2-.5-4.4.3z"/><path d="M8.2 5.8h7.6c1.3 0 2.3 1 2.3 2.3v3.7c0 1.5-.5 2.9-1.4 3.9l-.9 2.6c-.5 1.9-1.9 3.1-3.8 3.1s-3.3-1.2-3.8-3.1l-.9-2.6c-.9-1-1.4-2.4-1.4-3.9V8.1c0-1.3 1-2.3 2.3-2.3z"/><circle cx="9.4" cy="10.8" r="1.05" fill="rgba(0,0,0,.4)"/><circle cx="14.6" cy="10.8" r="1.05" fill="rgba(0,0,0,.4)"/><ellipse cx="12" cy="18.2" rx="3.1" ry="2.1" fill="rgba(0,0,0,.18)"/><circle cx="10.8" cy="18.3" r=".75" fill="rgba(0,0,0,.45)"/><circle cx="13.2" cy="18.3" r=".75" fill="rgba(0,0,0,.45)"/>',
  wall:'<rect x="2" y="4" width="9.4" height="4.6" rx=".9"/><rect x="12.6" y="4" width="9.4" height="4.6" rx=".9"/><rect x="2" y="9.7" width="4.1" height="4.6" rx=".9"/><rect x="7.3" y="9.7" width="9.4" height="4.6" rx=".9"/><rect x="17.9" y="9.7" width="4.1" height="4.6" rx=".9"/><rect x="2" y="15.4" width="9.4" height="4.6" rx=".9"/><rect x="12.6" y="15.4" width="9.4" height="4.6" rx=".9"/>',
  gk:'<rect x="6" y="11" width="12.5" height="10.5" rx="4"/><rect x="6" y="4.5" width="3" height="9" rx="1.5"/><rect x="9.7" y="2.5" width="3" height="10" rx="1.5"/><rect x="13.4" y="3" width="3" height="10" rx="1.5"/><rect x="16.9" y="5.5" width="2.8" height="8" rx="1.4"/><rect x="1.8" y="10.2" width="7" height="3" rx="1.5" transform="rotate(38 5.3 11.7)"/>',
  slide:'<path d="M1.5 22.2h10M3.2 19.2h4.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".45"/><g transform="translate(0 -0.4) rotate(-45 12 12) translate(12 12) scale(0.94) translate(-12 -12)"><path d="M9.4 1.6 10.6 10" stroke="currentColor" stroke-width="5.4" stroke-linecap="round"/><path d="M10.6 10 10.2 16" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/><path d="M8 12.6h4.4M8 14.2h4.4" stroke="rgba(0,0,0,.3)" stroke-width="1"/><path d="M8 15.4h4.6l1.2 1.3c2.1.2 4.3.7 5.9 1.4.9.4 1.5 1.2 1.5 2.1v.4H8Z"/><path d="M13.6 17.3l.7 1.3M15.7 17.7l.6 1.3" stroke="rgba(0,0,0,.3)" stroke-width=".9" stroke-linecap="round"/><rect x="8.6" y="20.6" width="1.6" height="1.8" rx=".4"/><rect x="12.2" y="20.6" width="1.6" height="1.8" rx=".4"/><rect x="15.8" y="20.6" width="1.6" height="1.8" rx=".4"/><rect x="19" y="20.6" width="1.6" height="1.8" rx=".4"/></g>',
  offside:'<path d="M6 22V2.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 3h13l-3 4.5 3 4.5H7z"/><path d="M2 21h20" stroke="currentColor" stroke-width="2" stroke-dasharray="2.5 2.5"/>',
  foul:'<rect x="7" y="3" width="10" height="15" rx="1.8" transform="rotate(12 12 10.5)"/><path d="M4 21h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  mark:'<circle cx="7.5" cy="7" r="3.3"/><circle cx="16.5" cy="9" r="3.3"/><path d="M2 21c0-4.5 2.5-7 5.5-7s5.5 2.5 5.5 7zM11 21c.3-4 2.4-6.5 5.5-6.5S22 17 22 21z"/>',
  intercept:'<path d="M1.5 12h21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="2 2.8" opacity=".6"/><circle cx="5.2" cy="6.4" r="3" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="5.2" cy="17.6" r="3" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M7.6 8.1 21.8 15.2M7.6 15.9 21.8 8.8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12.4" cy="12" r="1.3" fill="rgba(0,0,0,.35)"/>',
};
// kart maliyeti ve yıldız göstergesi için yıldız şekli
const STAR_PATH='M12 1.6l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.5-6.3 3.5 1.3-7L1.8 9l7.1-.9z';
const STAR=`<svg viewBox="0 0 24 24"><path d="${STAR_PATH}" fill="url(#sg)" stroke="#7a4a00" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const GK_ROLE=['GK',.5,.955,1];
// formasyonlar: kaleci hariç 4 oyuncu [rol, x, y, numara] (y: 1 kendi kalemiz, 0 rakip kale). Son oyuncu santrayı yapan forvet
const FORMATIONS={
  '2-1-1':{desc:'Dengeli: iki bek, bir orta saha, bir forvet',pos:[['DEF',.3,.78,4],['DEF',.7,.78,5],['MID',.5,.62,8],['FWD',.5,.44,9]]},
  '1-2-1':{desc:'Orta saha güçlü: iki kanat orta saha',pos:[['DEF',.5,.8,4],['MID',.24,.62,7],['MID',.76,.62,8],['FWD',.5,.44,9]]},
  '2-2':{desc:'Geniş: iki bek, iki kanat forveti, orta boş',pos:[['DEF',.3,.78,4],['DEF',.7,.78,5],['FWD',.25,.53,11],['FWD',.75,.53,9]]},
  '3-1':{desc:'Savunmacı: üç defans, tek forvet',pos:[['DEF',.2,.77,2],['DEF',.5,.81,4],['DEF',.8,.77,5],['FWD',.5,.5,9]]},
  '1-1-2':{desc:'Hücumcu: iki forvet, tek defans',pos:[['DEF',.5,.8,4],['MID',.5,.65,8],['FWD',.28,.51,11],['FWD',.72,.51,9]]},
};
const FORMATION_KEYS=Object.keys(FORMATIONS);
// taktik: takımın yeri (+ geride, - önde) hücumda (atk) ve savunmada; savunmada defans (defD) ile önündekiler (defF) ayrı.
// runs = derine koşu sıklığı, highPress = rakip kendi kalesine yakınken iki kişi basar
const TACTICS={
  def:{name:'Defansif',desc:'Orta saha ve forvet geri gelir, takım kompakt savunur',atk:.05,defD:.01,defF:.1,runs:.6,highPress:false},
  bal:{name:'Dengeli',desc:'Normal dizilim',atk:0,defD:0,defF:0,runs:1,highPress:false},
  att:{name:'Ofansif',desc:'Hücumda herkes öne çıkar ve önde basar, arkada boşluk kalır',atk:-.05,defD:-.03,defF:-.04,runs:1.4,highPress:true},
};
const TACTIC_KEYS=Object.keys(TACTICS);
const SKIN=['#f5cfa0','#e3a873','#c98652','#8f5a33','#ffe0bd'];
const HAIR=['#2a1a10','#5a3418','#141414','#b8742a','#e0a52a','#e9e1c4','#a8381c'];
const BOOTS=['#1a1f36','#f4f6ff','#ff7a1a','#2fd36b','#ffd23f','#ff5fa8'];
const FD='"Bowlby One SC",Impact,sans-serif',FB='"Baloo 2",sans-serif';
