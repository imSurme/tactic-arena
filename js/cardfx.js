// Kart oynama efekti: kart elden (rakipte sahanın üstünden) sahaya uçar, yere çarpar, şok dalgası yayılır.
// Kartın etkisi çarpma anında başlar (cards.js'deki bekleyen kartlar).
const CardFx=(()=>{
  const canAnimate=()=>typeof Element!=='undefined'&&!!Element.prototype.animate;
  // oyun koordinatını #field içindeki piksele çevir
  const toPx=(x,y)=>w2s(x,y);
  // kartın sahada düşeceği nokta: hedefli kartlar topa, kaleci kartı kaleciye, diğerleri takımın ortasına
  function landing(t,k){
    if(['slide','foul','press','through','longball','intercept','offside'].includes(k)){
      const o=ball.owner;return o?{x:o.x,y:o.y}:{x:ball.x,y:ball.y};
    }
    if(k==='gk'){const g=t.players[0];return{x:g.x,y:g.y};}
    const outs=t.players.filter(p=>p.role!=='GK');
    return{x:outs.reduce((a,p)=>a+p.x,0)/outs.length,y:outs.reduce((a,p)=>a+p.y,0)/outs.length};
  }
  function impact(t,k,at){
    const c=CARDS[k],field=$('field'),p=toPx(at.x,at.y);
    // şok dalgası
    const ringEl=document.createElement('div');ringEl.className='cf-ring';
    ringEl.style.cssText=`left:${p.x}px;top:${p.y}px;--col:${c.col}`;
    field.appendChild(ringEl);
    if(canAnimate()&&!RM){
      ringEl.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scale(2.6)',opacity:0}],{duration:520,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>ringEl.remove();
    }else setTimeout(()=>ringEl.remove(),600);
    burst(at.x,at.y,c.col,16,140);ring(at.x,at.y,c.col);shake=Math.max(shake,3);
    Sfx.slam();
  }
  return{
    // from: elden oynanan kartın ekran dikdörtgeni (rakip için null)
    play(t,k,from){
      const at=landing(t,k);
      if(!canAnimate()||RM||!$('field')){impact(t,k,at);return;}
      const field=$('field'),fr=field.getBoundingClientRect(),to=toPx(at.x,at.y);
      const fly=document.createElement('div');fly.className='cf-fly';
      fly.innerHTML=cardHTML(k,-1);
      const w=from?from.width:64;
      let sx,sy;
      if(from){sx=from.left-fr.left+from.width/2;sy=from.top-fr.top+from.height/2;}
      else{sx=to.x;sy=-60;} // rakip kartı sahanın üstünden düşer
      fly.style.cssText=`width:${w}px;left:${sx}px;top:${sy}px`;
      field.appendChild(fly);
      const dx=to.x-sx,dy=to.y-sy,tilt=t.id===0?-10:10;
      fly.animate([
        {transform:'translate(-50%,-50%) scale(1) rotate(0deg)',opacity:1},
        {transform:`translate(calc(-50% + ${dx*.45}px),calc(-50% + ${dy*.45-50}px)) scale(1.3) rotate(${tilt}deg)`,opacity:1,offset:.45},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.75) rotate(${-tilt/2}deg)`,opacity:1,offset:.85},
        {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.3) rotate(0deg)`,opacity:0},
      ],{duration:560,easing:'cubic-bezier(.35,.6,.35,1)'}).onfinish=()=>fly.remove();
    },
    impact,
    landing,
  };
})();
