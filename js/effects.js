// Parçacıklar, uçan yazılar, bildirimler
function burst(x,y,c,n,s){for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),v=rnd(.3,1)*s;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.3,.6),t:0,c,s:rnd(1.5,3)});}}
function ring(x,y,c){parts.push({x,y,vx:0,vy:0,life:.55,t:0,c,ring:true});}
// uçan yazı: (x,y) oyun konumu, up ekranda ne kadar yukarıda durduğu (ekran yatay da olsa dikey de olsa yukarı kayar)
// aynı yerde az önce çıkan bir yazı varsa (kurtarış + yıldız ödülü gibi) yenisi onun üstüne dizilir, üst üste binmez
function floatText(x,y,text,c,up=0){
  const v=f=>(landscape?f.x:f.y)-f.up,h=f=>landscape?-f.y:f.x; // ekrandaki dikey ve yatay konum
  const me={x,y,up},base=landscape?x:y;
  const step=v(me)<(landscape?FX:FY)+30?14:-14; // ekranın üstüne yakınsa yazı taşmasın diye aşağı dizilir
  for(let moved=true;moved;){moved=false;for(const f of floats)if(Math.abs(h(f)-h(me))<40&&Math.abs(v(f)-v(me))<13){me.up=base-(v(f)+step);moved=true;}}
  floats.push({x,y,up:me.up,text,c,t:0,life:1});
}
const floatAbove=(x,y,d,text,c)=>floatText(x,y,text,c,d); // oyun konumunun ekranda d piksel üstünde
function updateFx(dt){
  updateRefFx(dt);
  for(const p of parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy*=.95;}
  parts=parts.filter(p=>p.t<p.life);
  for(const f of floats){f.t+=dt;f.up+=22*dt;}floats=floats.filter(f=>f.t<f.life);
  for(const b of banners)b.t+=dt;banners=banners.filter(b=>b.t<b.life);
  shake=RM||!Settings.get('shake')?0:Math.max(0,shake-dt*30);
}

