// İlk maçta duruma göre çıkan ipuçları; bir kez tamamlanınca bir daha gösterilmez
const Tutorial=(()=>{
  let done=false;
  try{done=localStorage.getItem('ta-tutorial')==='1';}catch(e){}
  let active=false,step=0,shown=false,t=0,gap=0,played=false;
  const canPlay=type=>teams[0].hand.some(k=>CARDS[k].type===type&&teams[0].stars>=CARDS[k].cost);
  const steps=[
    {when:()=>true,max:5,
     text:'Yıldızlar zamanla dolar; top kapınca ve kurtarışta bonus yıldız kazanırsın. Kartın köşesindeki yıldız, bedelini gösterir.'},
    {when:()=>attacking(teams[0])&&canPlay('atk'),until:()=>played,max:9,
     text:'Top sende! Parlayan <span class="t-atk">HÜCUM</span> kartlarından birini oyna.'},
    {when:()=>attacking(teams[1])&&canPlay('def'),until:()=>played,max:9,
     text:'Rakip topu aldı. Parlayan <span class="t-def">SAVUNMA</span> kartlarından birini dene.'},
    {when:()=>true,max:5,
     text:'Aktif kartların süresi sağ köşede, rakibin son kartları sol üstte görünür.'},
  ];
  function show(html){const el=$('tip');el.innerHTML=html;el.hidden=false;}
  function hide(){const el=$('tip');if(el)el.hidden=true;}
  function finish(){active=false;hide();done=true;try{localStorage.setItem('ta-tutorial','1');}catch(e){}}
  return{
    begin(){active=!done;step=0;shown=false;gap=1.5;hide();},
    reset(){done=false;try{localStorage.removeItem('ta-tutorial');}catch(e){}},
    hide,
    onCard(){played=true;},
    update(dt){
      if(!active||state!=='play')return;
      const s=steps[step];
      if(!shown){
        gap-=dt;
        if(gap<=0&&s.when()){show(s.text);shown=true;t=0;played=false;}
        return;
      }
      t+=dt;
      if((s.until&&s.until())||t>=s.max){
        hide();shown=false;gap=1.2;step++;
        if(step>=steps.length)finish();
      }
    },
  };
})();
