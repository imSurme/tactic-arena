// Matematik ve koordinat yardımcıları
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const toW=(t,nx,ny)=>t.id===0?{x:FX+nx*FW,y:FY+ny*FH}:{x:FX+(1-nx)*FW,y:FY+(1-ny)*FH};
const toN=(t,x,y)=>{const nx=(x-FX)/FW,ny=(y-FY)/FH;return t.id===0?{x:nx,y:ny}:{x:1-nx,y:1-ny};};
const oppGoal=t=>({x:CX,y:t.id===0?FY:FY+FH});
const ownGoal=t=>({x:CX,y:t.id===0?FY+FH:FY});
const dirY=t=>t.id===0?-1:1;
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1;const k=clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1);return Math.hypot(px-ax-dx*k,py-ay-dy*k);}

