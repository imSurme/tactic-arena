// Parçacıklar, uçan yazılar, bildirimler
function burst(x,y,c,n,s){for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),v=rnd(.3,1)*s;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.3,.6),t:0,c,s:rnd(1.5,3)});}}
function ring(x,y,c){parts.push({x,y,vx:0,vy:0,life:.55,t:0,c,ring:true});}
// aynı yerde az önce çıkan bir yazı varsa (kurtarış + yıldız ödülü gibi) yenisi onun üstüne dizilir, üst üste binmez
function floatText(x,y,text,c){
  const step=y<FY+30?14:-14; // üst kalede yazı ekrandan taşmasın diye aşağı dizilir
  for(let moved=true;moved;){moved=false;for(const f of floats)if(Math.abs(f.x-x)<40&&Math.abs(f.y-y)<13){y=f.y+step;moved=true;}}
  floats.push({x,y,text,c,t:0,life:1});
}
function updateFx(dt){
  updateRefFx(dt);
  for(const p of parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy*=.95;}
  parts=parts.filter(p=>p.t<p.life);
  for(const f of floats){f.t+=dt;f.y-=22*dt;}floats=floats.filter(f=>f.t<f.life);
  for(const b of banners)b.t+=dt;banners=banners.filter(b=>b.t<b.life);
  shake=RM||!Settings.get('shake')?0:Math.max(0,shake-dt*30);
}

