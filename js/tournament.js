// Turnuva: 32 takım, 8 grup × 4 takım. Grupta herkes 3 maç oynar, ilk iki Son 16'ya çıkar,
// sonra Çeyrek Final, Yarı Final, Final. Senin dışındaki maçlar takım güçlerine göre simüle edilir.
const TEAM_NAMES=[
  ['Kızıl Kartallar','KARTAL'],['Turuncu Fırtına','FIRTINA'],['Altın Aslanlar','ASLAN'],['Mor Şimşek','ŞİMŞEK'],
  ['Gece Kurtları','KURT'],['Pembe Panterler','PANTER'],['Bordo Boğalar','BOĞA'],['Deniz Yıldızı','YILDIZ'],
  ['Kum Fırtınası','KUM'],['Demir Yumruk','DEMİR'],['Volkan Spor','VOLKAN'],['Kar Leoparları','LEOPAR'],
  ['Ateş Böcekleri','BÖCEK'],['Bulut Atlıları','ATLI'],['Kristal Kılıç','KILIÇ'],['Kehribar FK','KEHRİBAR'],
  ['Granit Spor','GRANİT'],['Kızıl Tilki','TİLKİ'],['Mercan Gücü','MERCAN'],['Yakut Spor','YAKUT'],
  ['Dağ Keçileri','KEÇİ'],['Rüzgar Gülü','RÜZGAR'],['Boz Ayılar','AYI'],['Çelik Kanatlar','ÇELİK'],
  ['Zümrüt Ejder','EJDER'],['Kara Şahinler','ŞAHİN'],['Yıldırım FK','YILDIRIM'],['Akıncılar','AKINCI'],
  ['Lav Akıntısı','LAV'],['Safir Spor','SAFİR'],['Kaplan Pençesi','KAPLAN'],
];
// mavi (senin forman) dışındaki forma renkleri
const KITS=['#ff4d5e','#ff8a1f','#ffd23f','#a34dff','#ff5fb0','#8c1c3c','#2a2f45','#f2f2f2','#14b8a6','#c2410c','#e11d48','#94a3b8','#7c3aed','#f59e0b','#be185d','#65a30d'];
const ROUND_NAMES=['SON 16','ÇEYREK FİNAL','YARI FİNAL','FİNAL'];
const GROUP_PAIRS=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]]; // grup içi maç günleri
const GROUP_LETTERS='ABCDEFGH';

// bir forma renginden koyu, açık, şerit ve kaleci renklerini türet
function mixHex(a,b,k){
  const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=p(a),y=p(b);
  return'#'+x.map((v,i)=>Math.round(v+(y[i]-v)*k).toString(16).padStart(2,'0')).join('');
}
function kitFrom(hex){
  const warm=['#ff8a1f','#ffd23f','#f59e0b','#c2410c'].includes(hex);
  const gk=warm?'#9b5cff':'#ffa21f';
  return{color:hex,dark:mixHex(hex,'#000000',.35),light:mixHex(hex,'#ffffff',.55),trim:mixHex(hex,'#000000',.6),gkColor:gk,gkTrim:mixHex(gk,'#000000',.55)};
}
const strStars=s=>Math.max(1,Math.min(5,Math.round((s-.8)/.45*4)+1));

const Tour=(()=>{
  let T=null;
  try{T=JSON.parse(localStorage.getItem('ta-tour'));}catch(e){}
  const save=()=>{try{localStorage.setItem('ta-tour',JSON.stringify(T));}catch(e){}};

  // Poisson dağılımından gol sayısı
  function goals(l){let k=0,p=Math.exp(-l),s=p,u=Math.random();while(u>s&&k<9){k++;p*=l/k;s+=p;}return k;}
  function simMatch(a,b,knockout){
    const sa=T.teams[a].str,sb=T.teams[b].str;
    const r={ga:goals(1.35*Math.pow(sa/sb,1.5)),gb:goals(1.35*Math.pow(sb/sa,1.5)),et:false};
    if(r.ga===r.gb){r.et=true;if(Math.random()<sa/(sa+sb))r.ga++;else r.gb++;} // altın gollü uzatma
    return r;
  }
  const winner=m=>m.ga>m.gb?m.a:m.b;
  function table(g){
    const rows=T.groups[g].map(id=>({id,O:0,G:0,M:0,AG:0,YG:0,P:0}));
    const row=id=>rows.find(r=>r.id===id);
    for(const r of T.groupResults.filter(r=>r.g===g)){
      const A=row(r.a),B=row(r.b);
      A.O++;B.O++;A.AG+=r.ga;A.YG+=r.gb;B.AG+=r.gb;B.YG+=r.ga;
      if(r.ga>r.gb){A.G++;B.M++;A.P+=3;}else{B.G++;A.M++;B.P+=3;}
    }
    return rows.sort((x,y)=>y.P-x.P||(y.AG-y.YG)-(x.AG-x.YG)||y.AG-x.AG||T.teams[y.id].str-T.teams[x.id].str);
  }
  // bir eleme turunu oynat; myResult verilirse senin maçın o sonuçla yazılır
  function playRound(myResult){
    const round=T.rounds[T.round];
    for(const m of round){
      if(m.ga!==null)continue;
      Object.assign(m,(m.a===0||m.b===0)&&myResult?(m.a===0?myResult:{ga:myResult.gb,gb:myResult.ga,et:myResult.et}):simMatch(m.a,m.b,true));
    }
    if(T.round<3){
      const next=[];for(let i=0;i<round.length;i+=2)next.push({a:winner(round[i]),b:winner(round[i+1]),ga:null,gb:null,et:false});
      T.rounds.push(next);T.round++;
    }else T.champion=winner(round[0]);
  }
  // kalan bütün turları oynat (elendiysen şampiyonu göstermek için)
  function finishAll(){while(T.champion===undefined||T.champion===null){playRound(null);}}
  function startKnockout(){
    const W=g=>table(g)[0].id,Rn=g=>table(g)[1].id,r16=[];
    for(let g=0;g<8;g+=2){r16.push({a:W(g),b:Rn(g+1)});r16.push({a:W(g+1),b:Rn(g)});}
    T.rounds=[r16.map(m=>({...m,ga:null,gb:null,et:false}))];T.round=0;T.stage='ko';
  }
  return{
    get data(){return T;},
    active:()=>!!T&&!T.finished,
    table,winner,strStars,
    create(){
      // güçlere göre 4 torba; sen A grubundasın
      const others=shuffle(TEAM_NAMES.map(([name,short],i)=>({name,short,kit:kitFrom(KITS[i%KITS.length]),str:+rnd(.82,1.25).toFixed(2)})));
      others.sort((a,b)=>b.str-a.str);
      const teams=[{name:'Mavi Yıldızlar (Sen)',short:'SEN',kit:null,str:1,me:true},...others];
      const pots=[[0,...shuffle([1,2,3,4,5,6,7])],shuffle([8,9,10,11,12,13,14,15]),shuffle([16,17,18,19,20,21,22,23]),shuffle([24,25,26,27,28,29,30,31])];
      const groups=[...Array(8)].map((_,g)=>pots.map(p=>p[g]));
      T={teams,groups,groupResults:[],md:0,stage:'group',rounds:[],round:0,out:null,champion:null,finished:false};
      save();
    },
    clear(){T=null;try{localStorage.removeItem('ta-tour');}catch(e){}},
    // sıradaki maçın: rakip, aşama adı, eleme maçı mı
    next(){
      if(!T||T.out||T.champion!==null)return null;
      if(T.stage==='group'){
        const pair=GROUP_PAIRS[T.md].find(p=>p.includes(0)),opp=T.groups[0][pair[0]===0?pair[1]:pair[0]];
        return{opp:T.teams[opp],oppId:opp,label:'GRUP A · '+(T.md+1)+'. MAÇ',knockout:false};
      }
      const m=T.rounds[T.round].find(m=>m.a===0||m.b===0),opp=m.a===0?m.b:m.a;
      return{opp:T.teams[opp],oppId:opp,label:ROUND_NAMES[T.round],knockout:true};
    },
    // senin maçının sonucunu kaydet, aynı günün diğer maçlarını simüle et
    // et: maç altın gollü uzatmada bitti
    record(ga,gb,et){
      if(T.stage==='group'){
        for(let g=0;g<8;g++)for(const [i,j] of GROUP_PAIRS[T.md]){
          const a=T.groups[g][i],b=T.groups[g][j];
          const r=a===0?{ga,gb,et}:b===0?{ga:gb,gb:ga,et}:simMatch(a,b,false);
          T.groupResults.push({g,a,b,ga:r.ga,gb:r.gb,et:!!r.et});
        }
        T.md++;
        if(T.md===3){
          const pos=table(0).findIndex(r=>r.id===0);
          startKnockout();
          if(pos>1){T.out='GRUP AŞAMASI';finishAll();}
        }
      }else{
        const roundName=ROUND_NAMES[T.round];
        playRound({ga,gb,et:!!et});
        const won=ga>gb;
        if(!won){T.out=roundName;finishAll();}
      }
      if(T.out||T.champion!==null)T.finished=true;
      save();
    },
  };
})();

// ---------- turnuva ekranı ----------
const teamChip=(t,me)=>`<span class="tchip" style="--k:${t.kit?t.kit.color:'var(--home)'}"></span>${me?'<b>'+t.short+'</b>':t.name}`;
function groupTableHTML(g,compact){
  const T=Tour.data,rows=Tour.table(g);
  return`<table class="ttable${compact?' compact':''}"><thead><tr><th></th><th class="tl">GRUP ${GROUP_LETTERS[g]}</th><th>O</th><th>G</th><th>M</th><th>AV</th><th>P</th></tr></thead><tbody>${
    rows.map((r,i)=>`<tr class="${i<2?'q':''}${r.id===0?' me':''}"><td>${i+1}</td><td class="tl">${teamChip(T.teams[r.id],r.id===0)}</td><td>${r.O}</td><td>${r.G}</td><td>${r.M}</td><td>${r.AG-r.YG>0?'+':''}${r.AG-r.YG}</td><td><b>${r.P}</b></td></tr>`).join('')
  }</tbody></table>`;
}
function koRoundHTML(ri){
  const T=Tour.data,round=T.rounds[ri];
  const side=(id,goals,et,won)=>`<span class="kt${won?' w':''}${id===0?' me':''}">${teamChip(T.teams[id],id===0)}</span><span class="ks">${et&&won?'<small>uz.</small>':''}${goals===null?'':goals}</span>`;
  return`<div class="kround"><div class="ktitle">${ROUND_NAMES[ri]}</div>${round.map(m=>{
    const played=m.ga!==null,w=played?Tour.winner(m):-1;
    return`<div class="kmatch${m.a===0||m.b===0?' mine':''}"><div class="krow">${side(m.a,m.ga,m.et,w===m.a)}</div><div class="krow">${side(m.b,m.gb,m.et,w===m.b)}</div></div>`;
  }).join('')}</div>`;
}
function showTournament(){
  if(!Tour.data){Tour.create();}
  const T=Tour.data,nx=Tour.next();
  let body='',head='',buttons='';
  if(T.finished){
    const champ=T.teams[T.champion];
    head=T.champion===0
      ?`<div class="trophy">🏆</div><h2 style="color:var(--gold)">ŞAMPİYON!</h2><p>Turnuvayı kazandın. 7 maçta kupayı kaldırdın.</p>`
      :`<h2>ELENDİN</h2><p>${T.out==='GRUP AŞAMASI'?'Gruptan çıkamadın.':T.out+' turunda elendin.'} Şampiyon: <b>${champ.name}</b></p>`;
    buttons=`<button class="cta" id="go">YENİ TURNUVA</button><button class="link" id="menu">Ana menü</button>`;
  }else{
    const o=nx.opp;
    head=`<h2>${nx.label}</h2>
<div class="vs"><div class="vt">${teamChip(T.teams[0],true)}</div><span class="vsx">VS</span><div class="vt">${teamChip(o,false)}<small>Güç ${'★'.repeat(strStars(o.str))}${'☆'.repeat(5-strStars(o.str))}</small></div></div>
<p class="tip">${nx.knockout?'Eleme maçı: kaybeden turnuvaya veda eder. ':''}Berabere biterse altın gollü uzatma.</p>`;
    buttons=`<button class="cta" id="go">MAÇA ÇIK</button><button class="link" id="menu">Ana menü</button><button class="link danger" id="quit">Turnuvayı bırak</button>`;
  }
  if(T.stage==='group'&&!T.finished)body=groupTableHTML(0)+`<details class="others"><summary>Diğer gruplar</summary><div class="ogrid">${[1,2,3,4,5,6,7].map(g=>groupTableHTML(g,true)).join('')}</div></details>`;
  else{
    const last=T.finished?T.rounds.length-1:T.round;
    body=`<div class="bracket">${[...Array(last+1).keys()].reverse().map(koRoundHTML).join('')}</div><details class="others"><summary>Grup A sonuç tablosu</summary>${groupTableHTML(0)}</details>`;
  }
  showOverlay(head+body+buttons,{
    go:T.finished?()=>{Tour.create();showTournament();}:startTourMatch,
    menu:showMenu,
    quit:()=>{
      const q=$('quit');
      if(q.dataset.sure){Tour.clear();showMenu();}
      else{q.dataset.sure='1';q.textContent='Emin misin? Tekrar dokun, turnuva silinir';}
    },
  });
  $('obox').classList.add('wide');
}
function startTourMatch(){
  const nx=Tour.next();
  matchCtx={tour:true,knockout:nx.knockout,label:nx.label};matchOpp=nx.opp;
  start();
}
// maç sonunda turnuvaya işle ve sonucu göster
function tourAfterMatch(a,b){
  const nx=Tour.next();
  Tour.record(a,b,overtime);
  const T=Tour.data,won=a>b;
  const title=T.champion===0?['ŞAMPİYON!','var(--gold)']:won?['KAZANDIN!','var(--gold)']:['KAYBETTİN','var(--away-l)'];
  const note=T.champion===0?'Kupa senin!':T.out?(T.out==='GRUP AŞAMASI'?'Gruptan çıkamadın, turnuva bitti.':T.out+' turunda elendin.'):
    T.stage==='ko'&&nx.knockout===false?'Gruptan çıktın! Sıradaki: '+ROUND_NAMES[0]+'.':won&&nx.knockout?'Tur atladın! Sıradaki: '+ROUND_NAMES[T.round]+'.':'Turnuva devam ediyor.';
  showOverlay(`<div class="tip">${nx.label}</div><h2 style="color:${title[1]}">${title[0]}</h2><div class="big"><span style="color:var(--home-l)">${a}</span> – <span style="color:var(--away-l)">${b}</span></div>${overtime?'<p class="tip">Uzatmada altın gol</p>':''}<p>${note}</p>${statsHTML(stats,0)}<button class="cta" id="go">DEVAM</button>`,{go:showTournament});
  $('obox').classList.add('wide','end');
}
