import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AtelierMusic} from '../dist/music.js';
test('music waits for a gesture, schedules gently, and stops on mute or hidden tab',()=>{
 const old={AudioContext:globalThis.AudioContext,document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const notes=[];let callbacks=new Map(),id=0,enabled=true;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
 globalThis.document={hidden:false};globalThis.setTimeout=f=>(callbacks.set(++id,f),id);globalThis.clearTimeout=i=>callbacks.delete(i);
 globalThis.AudioContext=class {currentTime=0;destination={};resume(){return Promise.resolve();}createGain(){return {gain:param(),connect(){},disconnect(){}};}createOscillator(){const o={frequency:param(),connect(){return {connect(){}}},start(){},stop(){o.stopped=true;},disconnect(){}};notes.push(o);return o;}};
 try {
  const music=new AtelierMusic(()=>enabled);music.sync();assert.equal(notes.length,0);
  music.start();assert.ok(notes.length>0);assert.equal(callbacks.size,1);
  enabled=false;music.sync();assert.equal(callbacks.size,0);assert.ok(notes.every(n=>n.stopped));
  enabled=true;music.sync();assert.equal(callbacks.size,1);
  document.hidden=true;music.sync();assert.equal(callbacks.size,0);
 }finally{Object.assign(globalThis,old);}
});
