// Ses efektleri: hepsi Web Audio ile anlık sentezlenir, ses dosyası yok
const Sfx=(()=>{
  let ac=null,master=null,noiseBuf=null,muted=false;
  try{muted=localStorage.getItem('ta-muted')==='1';}catch(e){}

  // ilk kullanıcı tıklamasında çağrılır (tarayıcılar sesi ancak etkileşimden sonra açar)
  function init(){
    if(ac){wake();return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    ac=new AC();if(ac.state==='suspended')ac.resume();
    master=ac.createGain();master.gain.value=muted?0:Settings.get('sfx');master.connect(ac.destination);
    noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
  // ses motoru ilk dokunuşta oluşur ve bir an sonra çalışmaya başlar; o arada istenen sesler (ör. santra düdüğü) atılmaz, motor açılınca çalar
  let held=false; // oyun duraklatıldı: bu sırada istenen sesler birikip sonradan çalmasın
  // pil: ses kapalıyken ya da maç dışında (menü, maç sonu) birkaç saniye ses çalmayınca ses motoru uyutulur.
  // maç sırasında uyutulmaz: iPhone dokunuş olmadan uyanmasına izin vermeyebilir, oyun sessiz kalırdı
  let lastUse=0;
  const inMatch=()=>typeof state!=='undefined'&&(state==='play'||state==='goal'||state==='coach');
  // iPhone arka plandan dönünce motor 'interrupted' durumunda kalabilir: çalışmıyorsa her durumda uyandır
  function wake(){lastUse=performance.now();if(ac&&!held&&!muted&&ac.state!=='running'&&ac.state!=='closed'){const r=ac.resume();if(r&&r.catch)r.catch(()=>{});}}
  setInterval(()=>{if(ac&&ac.state==='running'&&(muted||!inMatch()&&performance.now()-lastUse>3000))ac.suspend();},1000);
  const ok=()=>{if(!ac||ac.state==='closed'||held||muted)return false;wake();return true;};
  // tarayıcılar sesi ancak kullanıcı etkileşiminden sonra açar: ekrana ilk dokunuşta ses açılsın
  for(const ev of ['pointerdown','touchend','keydown'])addEventListener(ev,()=>init(),{capture:true,passive:true});
  // ses aç/kapa anında uygulanır (yavaş geçiş olsaydı açıp kapatırken çalan sesler yarım duyulurdu)
  function applyVolume(){if(master){master.gain.cancelScheduledValues(ac.currentTime);master.gain.setValueAtTime(muted?0:Settings.get('sfx'),ac.currentTime);}}

  function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec);}
  function tone(f,dur,{type='sine',vol=.3,to=null,at=0,attack=.005}={}){
    if(!ok())return;const t=ac.currentTime+at,o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
    env(g,t,attack,vol,dur);o.connect(g).connect(master);o.start(t);o.stop(t+attack+dur+.05);
  }
  function noise(dur,{type='bandpass',freq=1000,q=1,vol=.3,at=0,attack=.003}={}){
    if(!ok())return;const t=ac.currentTime+at,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    s.buffer=noiseBuf;f.type=type;f.frequency.value=freq;f.Q.value=q;
    env(g,t,attack,vol,dur);s.connect(f).connect(g).connect(master);s.start(t,Math.random());s.stop(t+attack+dur+.05);
  }
  function whistle(dur=.28,at=0){
    if(!ok())return;const t=ac.currentTime+at,o=ac.createOscillator(),l=ac.createOscillator(),lg=ac.createGain(),g=ac.createGain();
    o.type='triangle';o.frequency.value=2900;l.frequency.value=32;lg.gain.value=120;
    l.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.16,t+.02);g.gain.setValueAtTime(.16,t+dur-.04);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g).connect(master);o.start(t);l.start(t);o.stop(t+dur+.05);l.stop(t+dur+.05);
  }
  return{
    init,
    get muted(){return muted;},
    toggleMute(){
      muted=!muted;try{localStorage.setItem('ta-muted',muted?'1':'0');}catch(e){}
      applyVolume();if(muted){if(ac&&ac.state==='running')ac.suspend();}else wake();
      return muted;
    },
    applyVolume,
    suspend(){held=true;if(ac&&ac.state==='running')ac.suspend();},
    resume(){held=false;wake();},
    pass(){tone(170,.09,{to:60,vol:.35});noise(.03,{type:'highpass',freq:2500,vol:.08});},
    shot(power){
      if(power){tone(110,.45,{to:30,vol:.6});noise(.35,{type:'lowpass',freq:900,vol:.35});noise(.12,{type:'highpass',freq:3000,vol:.12});}
      else{tone(200,.13,{to:55,vol:.5});noise(.06,{type:'highpass',freq:2000,vol:.14});}
    },
    tackle(){tone(120,.1,{to:70,vol:.35});noise(.08,{freq:420,q:1.2,vol:.25});},
    save(){noise(.07,{freq:1400,q:1.5,vol:.35});tone(260,.1,{to:120,vol:.2});},
    whistle(){whistle(.3);},
    whistleEnd(){whistle(.22);whistle(.22,.32);whistle(.7,.64);},
    goal(){
      whistle(.5);
      [523,659,784,1047].forEach((f,i)=>tone(f,.25,{type:'square',vol:.06,at:.1+i*.09}));
    },
    card(type){
      const notes=type==='atk'?[523,659,784]:[392,494,587];
      notes.forEach((f,i)=>tone(f,.16,{type:'triangle',vol:.16,at:i*.05}));
    },
    oppCard(){tone(330,.12,{type:'triangle',vol:.1});tone(247,.18,{type:'triangle',vol:.1,at:.07});},
    ready(){tone(1180,.06,{vol:.07});},
    deny(){tone(140,.12,{type:'square',vol:.06});},
    overtime(){[440,554,659,880].forEach((f,i)=>tone(f,.2,{type:'sawtooth',vol:.05,at:i*.12}));whistle(.4,.5);},
    slam(){tone(95,.2,{to:38,vol:.45});noise(.12,{type:'lowpass',freq:700,vol:.22});},
    click(){tone(700,.04,{vol:.08});},
  };
})();
