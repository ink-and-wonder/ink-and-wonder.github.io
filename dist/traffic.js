// Only a fixed aggregate increment is sent. No account/session identifiers.
export const TRAFFIC_OPT_OUT_KEY='ink-wonder:traffic-opt-out';
export function trafficOptedOut(storage){try{return storage?.getItem(TRAFFIC_OPT_OUT_KEY)==='1';}catch{return false;}}
export function startTrafficCounting({config,win=globalThis.window,doc=globalThis.document,nav=globalThis.navigator,storage,send=globalThis.fetch}={}){
 if(storage===undefined)try{storage=win?.localStorage;}catch{storage=null;}
 let sent=false;
 const allowed=()=>win?.location?.origin==='https://ink-and-wonder.github.io' && ['/', '/index.html'].includes(win.location.pathname)
   && !trafficOptedOut(storage) && !nav?.globalPrivacyControl && nav?.doNotTrack!=='1' && win.doNotTrack!=='1';
 if(!config?.supabaseUrl||!config?.publishableKey?.startsWith('sb_publishable_')||!allowed()||!send)return ()=>{};
 const record=()=>{
  if(sent||doc?.hidden||!allowed())return;
  sent=true;doc?.removeEventListener('visibilitychange',record);
  const options={method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:'{}',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true};
  if(globalThis.AbortSignal?.timeout)options.signal=AbortSignal.timeout(5000);
  // No retries: an ambiguous network failure must not double-count a page.
  Promise.resolve().then(()=>send(config.supabaseUrl+'/rest/v1/rpc/record_site_pageview',options)).catch(()=>{});
 };
 if(doc?.hidden)doc.addEventListener('visibilitychange',record);else record();
 return ()=>doc?.removeEventListener('visibilitychange',record);
}
