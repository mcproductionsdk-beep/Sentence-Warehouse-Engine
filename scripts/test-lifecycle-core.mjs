import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
let now=0,id=0;const pending=new Map(),events={};
const element=()=>({style:{},hidden:false,setAttribute(){},classList:{toggle(){}},append(){}});
const sandbox={performance:{now:()=>now},setTimeout:(fn,ms)=>{pending.set(++id,{fn,at:now+ms});return id},clearTimeout:id=>pending.delete(id),
 document:{createElement:element,body:element(),head:element(),addEventListener:(type,fn)=>events[type]=fn},window:{addEventListener:(type,fn)=>events[type]=fn}};
vm.runInNewContext(await readFile(new URL('../engine/lifecycle.js',import.meta.url),'utf8'),sandbox);
const tick=ms=>{const end=now+ms;while(true){const task=[...pending.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!task||task[1].at>end)break;now=task[1].at;pending.delete(task[0]);task[1].fn()}now=end};
let calls=0,cancelled=0;const life=sandbox.BTSentenceLifecycle.create({canPause:()=>true,label(){},pause(){},resume(){},cancelVoice(){cancelled++}});
life.begin();life.after(()=>calls++,100);tick(40);life.pause();life.pause();tick(1000);assert.equal(calls,0);life.resume();tick(59);assert.equal(calls,0);tick(1);assert.equal(calls,1,'remaining delay retained');
let settled=false;const wait=life.wait(100).then(ok=>{settled=ok?'completed':'cancelled'});const oldGeneration=life.generation;life.begin();await wait;assert.equal(settled,'cancelled');tick(1000);assert.equal(calls,1);assert.equal(await life.checkpoint(oldGeneration),false);
const speech=life.speak('test',{enabled:true,session:{speak:()=>new Promise(()=>{})},locale:'es-ES',rate:1});life.pause();await speech;assert.ok(cancelled>0);const gate=life.checkpoint();life.stop();assert.equal(await gate,false);assert.equal(life.tasks.size,0);assert.equal(pending.size,0);
console.log('Lifecycle timers, idempotent pause, cancellation and stale generations passed');
