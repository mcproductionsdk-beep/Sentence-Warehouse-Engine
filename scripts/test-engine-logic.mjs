// Run the actual engine completion logic against a deterministic clock and held
// speech callbacks. Browser layout/input coverage remains in the Playwright suite.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,readdir} from 'node:fs/promises';
const folder=new URL('../engine/',import.meta.url),game=(await readdir(folder)).find(f=>/^(cat|eater|warehouse|invaders)\.js$/.test(f)).slice(0,-3);
let now=0,nextId=0;const tasks=new Map(),elements=new Map(),spoken=[];
const ctx=new Proxy({measureText:t=>({width:String(t).length*10})},{get:(o,k)=>k in o?o[k]:()=>{}});
function element(){return {hidden:false,style:{},dataset:{},children:[],textContent:'',classList:{add(){},remove(){},toggle(){}},append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},setAttribute(){},addEventListener(){},getContext:()=>ctx,querySelector:()=>element(),querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),remove(){},focus(){}}}
const el=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
const document={body:element(),head:element(),hidden:false,createElement:element,getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){},hasFocus:()=>true,activeElement:null};
const sandbox={document,console,URL,Math,Set,Map,Promise,performance:{now:()=>now},matchMedia:()=>({matches:false}),requestAnimationFrame:()=>++nextId,cancelAnimationFrame(){},setTimeout:(fn,ms)=>{tasks.set(++nextId,{fn,at:now+ms});return nextId},clearTimeout:id=>tasks.delete(id),addEventListener(){},removeEventListener(){},SpeechSynthesisUtterance:class{constructor(text){this.text=text}},speechSynthesis:{getVoices:()=>[],cancel(){},speak:u=>spoken.push(u)}};
sandbox.window=sandbox;sandbox.parent=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(await readFile(new URL('lifecycle.js',folder),'utf8'),sandbox);
const fixtures={
 cat:`({life:lifecycle,start:()=>restart(),index:()=>round,complete:()=>{step=examples[round].words.length;render();void finishSentence(examples[round].words.at(-1))},stop:stopCat})`,
 eater:`({life:lifecycle,start:()=>{started=true;restart()},index:()=>transition,complete:()=>{transition=9999;word=words().length;void sayCompletedSentence(words().at(-1),sentences[sentence%sentences.length][1])},stop})`,
 warehouse:`({life:lifecycle,start:()=>start([['I eat bread.','Yo como pan.'],['She drinks water.','Ella bebe agua.']],'es-ES'),index:()=>state?.idx,complete:()=>{const ws=wordsOf(state.target),i=ws.length-1;state.filled=ws.map((w,j)=>j<i?w:false);state.player.carrying=state.words.find(w=>!w.decoy&&w.text===ws[i]);const b=state.slots[i];state.player.x=b.x+b.w/2;state.player.y=b.y+(state.slotShift||0)+b.h/2+85;action()},stop})`,
 invaders:`({life:lifecycle,start:()=>start([['I eat bread.','Yo como pan.'],['She drinks water.','Ella bebe agua.']],'es-ES'),index:()=>idx,complete:()=>{step=sentences[idx].words.length;complete()},stop})`
};
let source=await readFile(new URL(game+'.js',folder),'utf8');const hook='window.logicFixture='+fixtures[game]+';';source=game==='eater'?source.replace(/\}\)\(\);\s*$/,hook+'})();'):source+'\n'+hook;vm.runInContext(source,sandbox);
const f=sandbox.logicFixture;
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
const tick=async ms=>{const end=now+ms;while(true){const task=[...tasks.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!task||task[1].at>end)break;now=task[1].at;tasks.delete(task[0]);task[1].fn();await flush()}now=end;await flush()};
f.start();f.complete();await flush();assert.ok(spoken.length>0,game+' completion requests speech');
f.life.pause();await flush();const before=f.index();spoken.forEach(u=>u.onend?.());await tick(30000);assert.equal(f.index(),before,game+' must not advance while paused');
const count=spoken.length;f.life.resume();await flush();await tick(5000);assert.equal(f.index(),game==='eater'?.85:1,game+' continues after explicit resume');assert.equal(spoken.length,count,game+' must not replay interrupted speech');
f.start();f.complete();await flush();f.start();spoken.forEach(u=>u.onend?.());await tick(30000);assert.equal(f.index(),0,game+' stale completion cannot survive restart');
f.complete();await flush();f.stop();spoken.forEach(u=>u.onend?.());await tick(30000);assert.equal(f.life.active,false);assert.equal(f.life.tasks.size,0);
console.log(game,'actual completion logic: paused cancellation, explicit resume, stale callbacks, restart and stop passed');
