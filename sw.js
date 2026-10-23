// Çevrimdışı oyun: oyun dosyaları telefona kaydedilir, internet yokken de açılır.
// İnternet varken her dosya önce sunucudan taze alınır (güncellemeler hemen gelir), alınamazsa kayıtlı kopya kullanılır.
const CACHE='ta-offline';
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];
const NET_WAIT=4000; // ağ bu kadar sürede cevap vermezse kayıtlı kopya açılır

// kurulumda index.html'in yüklediği her dosyayı kaydet (liste elle tutulmaz, sayfadan okunur)
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    const res=await fetch('index.html',{cache:'no-cache'});
    const html=await res.clone().text();
    await c.put('index.html',res.clone());await c.put('./',res);
    const urls=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(u=>!/^(https?:|data:|#)/.test(u));
    for(const u of ['icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png'])if(!urls.includes(u))urls.push(u);
    await Promise.all(urls.map(u=>fetch(u,{cache:'no-cache'}).then(r=>{if(r.ok)return c.put(u,r);}).catch(()=>{})));
    // yazı tipleri: ilk açılışta sayfa onları service worker'dan önce indirir, kendiliğinden kaydedilmez.
    // stil dosyası ve içindeki font dosyaları burada indirilip kaydedilir, yoksa çevrimdışında yedek font görünür.
    const fontCss=[...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&'));
    await Promise.all(fontCss.map(async u=>{
      try{
        const r=await fetch(u,{mode:'cors'});if(!r.ok)return;
        const css=await r.clone().text();await c.put(u,r);
        const files=[...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m=>m[1]))];
        await Promise.all(files.map(f=>fetch(f,{mode:'cors'}).then(fr=>{if(fr.ok)return c.put(f,fr);}).catch(()=>{})));
      }catch(e){}
    }));
    self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(FONT_HOSTS.includes(url.hostname)){e.respondWith(fromCacheFirst(req));return;}
  if(url.origin!==location.origin)return; // arkadaş maçı sunucuları vb. dokunulmadan geçer
  e.respondWith(fromNetworkFirst(req));
});
// yazı tipleri değişmez: kayıtlıysa oradan, değilse indirip kaydet
async function fromCacheFirst(req){
  const hit=await caches.match(req,{ignoreVary:true});if(hit)return hit; // Google yanıtları Sec-Fetch-* ile Vary döner, eşleşmeyi bozmasın
  const res=await fetch(req);
  if(res.ok||res.type==='opaque'){const c=await caches.open(CACHE);c.put(req,res.clone());}
  return res;
}
async function fromNetworkFirst(req){
  const c=await caches.open(CACHE);
  const cached=()=>c.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?c.match('index.html'):undefined));
  const key=req.mode==='navigate'?'index.html':req; // ?oda=KOD gibi linkler ayrı ayrı birikmesin
  const net=fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok)c.put(key,res.clone());return res;});
  // ağ yavaşsa kayıtlı kopyayla aç; ağ hiç yoksa kayıtlı kopya, o da yoksa hata
  const slow=new Promise(r=>setTimeout(r,NET_WAIT)).then(cached);
  try{
    const first=await Promise.race([net,slow]);
    if(first)return first;
    return await net;
  }catch(err){
    const hit=await cached();if(hit)return hit;
    throw err;
  }
}
