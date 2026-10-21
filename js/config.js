// Sabitler: saha ölçüleri, tempo, kartlar, ikonlar, roller, renkler
const W=360,H=560,FX=20,FY=30,FW=320,FH=500,CX=FX+FW/2,CY=FY+FH/2,GW=96;
const MATCH=180,FAST_TIME=60;          // 3 dk maç, son 60 sn 2x yıldız
const STAR_MAX=10,STAR_REGEN=1/3,STAR_START=5;  // yıldız: kart oynama parası (3 sn'de 1)
const DECK_SIZE=8;
// tempo: oyuncu ve top hızları, top kapma ve pas arası olasılıkları
const TEMPO={
  run:54,            // oyuncu koşu hızı (px/sn)
  friction:1.0,      // topun yavaşlama katsayısı
  passMin:145,passMax:285,
  shot:[320,380],powerShot:500,shotRange:240,
  tackle:.15,tackleCd:1.2,grace:.8,  // top kapma şansı, deneme arası, topu yeni alana dokunulmaz süre
  intercept:.18,interceptMaxSpeed:320,
  think:[.35,.55],   // top sürenin karar verme aralığı
};
// oyun içi yıldız ödülleri
const REWARD={tackle:.3,intercept:.3,save:.6,tiki:.15,foulComp:1};
const DEBUG=typeof location!=='undefined'&&location.hash==='#debug';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CARDS={
  counter:{name:'Kontra Atak',short:'KONTRA',type:'atk',cost:3,desc:'6 sn hız, öne çık',c1:'#ffd36b',c2:'#ff6a00',col:'#ffb52e'},
  through:{name:'Ara Pas',short:'ARA PAS',type:'atk',cost:2,desc:'Forvete derin pas',c1:'#7dffb0',c2:'#0f9b6c',col:'#43e97b'},
  power:{name:'Güçlü Şut',short:'BOMBA',type:'atk',cost:3,desc:'Uzaktan sert şut',c1:'#ff9ad0',c2:'#c2187a',col:'#ff6fbf'},
  wave:{name:'Hücum Dalgası',short:'DALGA',type:'atk',cost:5,desc:'7 sn herkes ileri',c1:'#ffb27a',c2:'#d9431e',col:'#ff8a4d'},
  overlap:{name:'Kanat Bindirme',short:'BİNDİRME',type:'atk',cost:3,desc:'Bekler kanattan hücuma',c1:'#ffe27a',c2:'#c98a00',col:'#ffd23f'},
  longball:{name:'Uzun Top',short:'UZUN TOP',type:'atk',cost:2,desc:'Havadan savunma arkasına',c1:'#9ff0ff',c2:'#1b88b5',col:'#6fe3ff'},
  dribble:{name:'Çalım Ustası',short:'ÇALIM',type:'atk',cost:3,desc:'6 sn top kaptırmaz',c1:'#ffc2f2',c2:'#a1309a',col:'#ff9ae8'},
  tiki:{name:'Tiki-Taka',short:'TİKİ-TAKA',type:'atk',cost:4,desc:'8 sn kısa, güvenli pas',c1:'#c3ff9e',c2:'#3e9a20',col:'#9cf26a'},
  press:{name:'Önde Baskı',short:'BASKI',type:'def',cost:3,desc:'2 oyuncu topa basar',c1:'#b18cff',c2:'#5a2fd0',col:'#a77bff'},
  wall:{name:'Savunma Duvarı',short:'DUVAR',type:'def',cost:4,desc:'7 sn geriye yaslan',c1:'#8fd3ff',c2:'#2a5bd0',col:'#5cb8ff'},
  gk:{name:'Kaleci Refleksi',short:'KALECİ',type:'def',cost:2,desc:'10 sn süper kurtarış',c1:'#8ff5e6',c2:'#118a8c',col:'#3fe0d0'},
  slide:{name:'Kayan Müdahale',short:'KAYMA',type:'def',cost:2,desc:'Kayarak topa dalar',c1:'#d4f78a',c2:'#4c9a1f',col:'#b4e85a'},
  offside:{name:'Ofsayt Tuzağı',short:'OFSAYT',type:'def',cost:3,desc:'Hat çıkar, ofsayt yakalar',c1:'#fff3a0',c2:'#b58b00',col:'#ffe14d'},
  foul:{name:'Taktik Faul',short:'FAUL',type:'def',cost:2,desc:'Atağı kes, savunmaya dizil',c1:'#ffa3a3',c2:'#b3122b',col:'#ff6b7a'},
  mark:{name:'Adam Adama',short:'MARKAJ',type:'def',cost:3,desc:'7 sn sıkı markaj',c1:'#a6c8ff',c2:'#28408f',col:'#7fa8ff'},
  intercept:{name:'Pas Arası',short:'PAS ARASI',type:'def',cost:2,desc:'6 sn pasları keser',c1:'#b9fff0',c2:'#14806a',col:'#5cf0cf'},
};
const DUR={counter:6,press:6,through:6,power:8,wall:7,gk:10,wave:7,overlap:7,longball:6,dribble:6,tiki:8,offside:6,foul:5,mark:7,intercept:6};
const DEFAULT_DECK=['counter','through','power','wave','press','wall','gk','slide'];
const ICONS={
  counter:'<path d="M13.5 2 4.5 13.5h6L9.5 22l10-12h-6.2L14.5 2z"/>',
  through:'<circle cx="5" cy="19" r="2.8"/><path d="M7 16.5C9.5 10.5 13.5 7.5 17.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1.5 4"/><path d="M15 2.8 21.5 5l-3.6 5.6z"/>',
  power:'<circle cx="15" cy="12" r="6.5"/><path d="M15 8.7l2.6 1.9-1 3h-3.2l-1-3z" fill="rgba(0,0,0,.35)"/><path d="M1.5 8h6M1 12h5.5M1.5 16h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  wave:'<path d="M4 21l8-6 8 6M4 14.5l8-6 8 6M4 8l8-6 8 6" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"/>',
  overlap:'<path d="M5 21V9" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M1.5 11 5 5.5 8.5 11z"/><path d="M12 21c0-7 3-10 8-12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M17 5.5l5.5 2.5-4.2 4.3z"/>',
  longball:'<path d="M3 20C6 6 16 4 21 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 3.5"/><circle cx="20" cy="17.5" r="3.3"/><circle cx="4" cy="20" r="2"/>',
  dribble:'<circle cx="17" cy="17" r="4.2"/><path d="M3 4c4 0 4 5 8 5s4-5 8-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M3 11c3 0 3 3 6 3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  tiki:'<circle cx="5" cy="17" r="2.6"/><circle cx="12" cy="6" r="2.6"/><circle cx="19" cy="17" r="2.6"/><path d="M6.5 14.5 10.5 8.5M13.5 8.5l4 6M7.7 17h8.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  press:'<path d="M12 1.8c.9 3.8 5.8 6.2 5.8 11.6A5.8 5.8 0 0 1 6.2 13.4c0-2.7 1.4-4.4 2.5-6.3.5 1.7 1.3 2.7 2.4 3.3.7-2.7 1-5.8.9-8.6z"/>',
  wall:'<path d="M12 2.2 20.5 5.4v6.2c0 5.2-3.5 9.1-8.5 10.9-5-1.8-8.5-5.7-8.5-10.9V5.4z"/><path d="M12 6.5v11.5M7.5 10h9" stroke="rgba(0,0,0,.25)" stroke-width="2.2"/>',
  gk:'<rect x="6" y="11" width="12.5" height="10.5" rx="4"/><rect x="6" y="4.5" width="3" height="9" rx="1.5"/><rect x="9.7" y="2.5" width="3" height="10" rx="1.5"/><rect x="13.4" y="3" width="3" height="10" rx="1.5"/><rect x="16.9" y="5.5" width="2.8" height="8" rx="1.4"/><rect x="1.8" y="10.2" width="7" height="3" rx="1.5" transform="rotate(38 5.3 11.7)"/>',
  slide:'<path d="M2.5 14.5c3.2 0 5.5-1.2 7.4-3.4l3.1-4 3.3 1-1 4c2.2 1.1 4.3 1.6 6.4 1.6v3.8H4.6a2.1 2.1 0 0 1-2.1-2.1z"/><path d="M2 21h20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 3"/>',
  offside:'<path d="M6 22V2.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 3h13l-3 4.5 3 4.5H7z"/><path d="M2 21h20" stroke="currentColor" stroke-width="2" stroke-dasharray="2.5 2.5"/>',
  foul:'<rect x="7" y="3" width="10" height="15" rx="1.8" transform="rotate(12 12 10.5)"/><path d="M4 21h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  mark:'<circle cx="7.5" cy="7" r="3.3"/><circle cx="16.5" cy="9" r="3.3"/><path d="M2 21c0-4.5 2.5-7 5.5-7s5.5 2.5 5.5 7zM11 21c.3-4 2.4-6.5 5.5-6.5S22 17 22 21z"/>',
  intercept:'<path d="M2 12h20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 3"/><path d="M12 3a9 9 0 0 1 0 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="12" r="3.5"/>',
};
// kart maliyeti ve yıldız göstergesi için yıldız şekli
const STAR_PATH='M12 1.6l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.5-6.3 3.5 1.3-7L1.8 9l7.1-.9z';
const STAR=`<svg viewBox="0 0 24 24"><path d="${STAR_PATH}" fill="url(#sg)" stroke="#7a4a00" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const ROLES=[['GK',.5,.955,1],['DEF',.3,.78,4],['DEF',.7,.78,5],['MID',.5,.62,8],['FWD',.5,.44,9]];
const SKIN=['#f5cfa0','#e3a873','#c98652','#8f5a33','#ffe0bd'];
const HAIR=['#2a1a10','#5a3418','#141414','#b8742a','#f0cf6e'];
const FD='"Bowlby One SC",Impact,sans-serif',FB='"Baloo 2",sans-serif';
