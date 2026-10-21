// Oyuncu ayarları: zorluk, maç süresi, ses seviyeleri, ekran sarsıntısı (tarayıcıda saklanır)
const Settings=(()=>{
  const DEFAULTS={difficulty:'normal',length:180,sfx:.8,shake:true};
  // rakip zorluğu: skill = rakibin top kapma ve pas arası çarpanı, think = kart oynama aralığı çarpanı
  const DIFF={
    easy:{name:'Kolay',skill:.7,think:1.5,desc:'Rakip daha az top kapar, daha seyrek kart oynar'},
    normal:{name:'Normal',skill:1,think:1,desc:'Dengeli rakip'},
    hard:{name:'Zor',skill:1.3,think:.7,desc:'Rakip sert basar, sık kart oynar'},
  };
  const LENGTHS=[120,180,240];
  let s={...DEFAULTS};
  try{Object.assign(s,JSON.parse(localStorage.getItem('ta-settings'))||{});}catch(e){}
  if(!DIFF[s.difficulty])s.difficulty=DEFAULTS.difficulty;
  if(!LENGTHS.includes(s.length))s.length=DEFAULTS.length;
  const save=()=>{try{localStorage.setItem('ta-settings',JSON.stringify(s));}catch(e){}};
  return{
    DIFF,LENGTHS,
    get:k=>s[k],
    set(k,v){s[k]=v;save();},
    diff:()=>DIFF[s.difficulty],
  };
})();
