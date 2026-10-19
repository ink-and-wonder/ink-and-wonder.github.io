import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {startTrafficCounting} from '../dist/traffic.js';

test('traffic totals stay private; the public function only increments the server day',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
  await db.exec(fs.readFileSync(new URL('../supabase/traffic.sql',import.meta.url),'utf8'));
  await db.exec(`set role anon;set request.headers='{"origin":"https://ink-and-wonder.github.io"}';select public.record_site_pageview();select public.record_site_pageview();`);
  for(const table of ['site_traffic_daily','site_traffic_dashboard'])await assert.rejects(db.query('select * from public.'+table),/permission denied/);
  await assert.rejects(db.query('delete from public.site_traffic_daily'),/permission denied/);
  await db.exec(`set request.headers='{"origin":"https://another-site.invalid"}';select public.record_site_pageview();reset role;`);
  const counts=await db.query('select * from public.site_traffic_daily');assert.equal(counts.rows.length,1);assert.equal(Number(counts.rows[0].page_views),2);
  const fields=(await db.query("select column_name from information_schema.columns where table_name='site_traffic_daily' order by ordinal_position")).rows.map(r=>r.column_name);
  assert.deepEqual(fields,['day','page_views']);
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from public.site_traffic_dashboard'),/permission denied/);
  await db.exec('reset role;set role service_role');const totals=(await db.query('select * from public.site_traffic_dashboard')).rows[0];
  for(const key of ['today','last_7_days','last_30_days','all_time'])assert.equal(Number(totals[key]),2);
 }finally{await db.close();}
});

const config={supabaseUrl:'https://project.supabase.co',publishableKey:'sb_publishable_public_key'};
function environment(){const doc=new EventTarget();doc.hidden=false;return {config,win:{location:{origin:'https://ink-and-wonder.github.io',pathname:'/'}},doc,nav:{},storage:{getItem:()=>null}};}
test('one visible page load sends only an anonymous increment and never a login token',async()=>{
 const env=environment(),calls=[];env.doc.hidden=true;
 startTrafficCounting({...env,send:(...args)=>{calls.push(args);return Promise.resolve({ok:true});}});
 await Promise.resolve();assert.equal(calls.length,0);
 env.doc.hidden=false;env.doc.dispatchEvent(new Event('visibilitychange'));env.doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();
 assert.equal(calls.length,1);const [url,options]=calls[0];
 assert.match(url,/\/rpc\/record_site_pageview$/);assert.equal(options.body,'{}');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.headers.Authorization,undefined);
});
test('privacy preferences, previews and offline errors do not track or disrupt the game',async()=>{
 const cases=[e=>e.nav.globalPrivacyControl=true,e=>e.nav.doNotTrack='1',e=>e.storage.getItem=()=> '1',e=>e.win.location.origin='http://localhost:4173',e=>e.win.location.pathname='/play.html'];
 for(const modify of cases){const e=environment();modify(e);let calls=0;startTrafficCounting({...e,send:()=>{calls++;}});await Promise.resolve();assert.equal(calls,0);}
 startTrafficCounting({...environment(),send:()=>Promise.reject(new Error('offline'))});await Promise.resolve();await Promise.resolve();
});
