import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,devices} from 'playwright';
const root=new URL('../dist-preview/',import.meta.url);
const game=(await readdir(new URL('engine/',root))).find(f=>/^(cat|eater|warehouse|invaders)\.js$/.test(f)).slice(0,-3);
const hooks={
 cat:`window.lifecycleFixture={life:lifecycle,snapshot:()=>({round,step,pos,busy}),complete:()=>{step=examples[round].words.length;render();void finishSentence(examples[round].words.at(-1))},index:()=>round};`,
 eater:`window.lifecycleFixture={life:lifecycle,snapshot:()=>({x:player.x,y:player.y,word,sentence,transition,lives}),complete:()=>{transition=9999;word=words().length;void sayCompletedSentence(words().at(-1),sentences[sentence%sentences.length][1])},index:()=>sentence};`,
 warehouse:`window.lifecycleFixture={life:lifecycle,snapshot:()=>({x:state?.player.x,y:state?.player.y,elapsed:state?.elapsed,offset:state?.beltOffset,idx:state?.idx}),complete:()=>{const ws=wordsOf(state.target),i=ws.length-1;state.filled=ws.map((w,j)=>j<i?w:false);state.words.forEach(w=>w.done=false);state.player.carrying=state.words.find(w=>!w.decoy&&w.text===ws[i]);const b=state.slots[i];state.player.x=b.x+b.w/2;state.player.y=b.y+(state.slotShift||0)+b.h/2+85;action()},index:()=>state?.idx};`,
 invaders:`window.lifecycleFixture={life:lifecycle,snapshot:()=>({idx,step,shipX,artTime,particles:JSON.stringify(particles)}),complete:()=>{step=sentences[idx].words.length;complete()},index:()=>idx};`
};
const csp=(await readFile(new URL('_headers',root),'utf8')).match(/Content-Security-Policy: (.+)/)[1];
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(!['/','/engine/lifecycle.js',`/engine/${game}.js`,`/engine/${game}.css`,'/engine/sentence-session.mjs','/engine/build-id.mjs'].includes(path))return res.writeHead(404).end();
 try{let body=await readFile(new URL(path==='/'?'index.html':path.slice(1),root),'utf8');
  if(path===`/engine/${game}.js`)body=game==='eater'?body.replace(/\}\)\(\);\s*$/,hooks[game]+'})();'):body+'\n'+hooks[game];
  res.writeHead(200,{'Content-Type':path==='/'?'text/html':path.endsWith('.css')?'text/css':'text/javascript','Content-Security-Policy':csp});res.end(body);
 }catch(error){res.writeHead(500).end(String(error))}
});
const browser=await chromium.launch();
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 for(const [label,options] of [['desktop',{viewport:{width:1280,height:800}}],['portrait',devices['Pixel 7']],['landscape',{...devices['Pixel 7'],viewport:{width:844,height:390}}]]){
  const ctx=await browser.newContext(options),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.speechCalls=[];window.cancelCount=0;speechSynthesis.getVoices=()=>[];speechSynthesis.cancel=()=>window.cancelCount++;speechSynthesis.speak=u=>window.speechCalls.push(u)});
  await page.goto(url);await page.locator('#play').click();
  await page.locator('#pause').click();assert.equal(await page.evaluate(()=>lifecycleFixture.life.paused),true);
  const frozen=await page.evaluate(()=>lifecycleFixture.snapshot());await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate(()=>lifecycleFixture.snapshot()),frozen,'simulation frozen');
  const other=await ctx.newPage();await other.bringToFront();await page.bringToFront();await other.close();
  assert.equal(await page.evaluate(()=>lifecycleFixture.life.paused),true,'focus does not resume');
  await page.locator('#pause').click();assert.equal(await page.evaluate(()=>lifecycleFixture.life.paused),false);
  // Actual browser focus loss pauses; no dispatch-only substitute.
  const background=await ctx.newPage();await background.bringToFront();
  await page.waitForFunction(()=>lifecycleFixture.life.paused);await page.bringToFront();await background.close();
  assert.equal(await page.evaluate(()=>lifecycleFixture.life.paused),true);
  await page.locator('#restart').click();assert.equal(await page.evaluate(()=>lifecycleFixture.life.paused),false);
  // Completion speech is deliberately left pending, as on a slow device.
  await page.evaluate(()=>lifecycleFixture.complete());await page.waitForFunction(()=>speechCalls.length>0);
  const beforeCancel=await page.evaluate(()=>cancelCount),index=await page.evaluate(()=>lifecycleFixture.index());
  await page.locator('#pause').click();assert.ok(await page.evaluate(()=>cancelCount)>beforeCancel);
  await page.evaluate(()=>speechCalls.forEach(u=>u.onend?.()));
  await page.waitForTimeout(1900);assert.equal(await page.evaluate(()=>lifecycleFixture.index()),index,'completion cannot advance while paused');
  const calls=await page.evaluate(()=>speechCalls.length);
  await page.locator('#pause').click();await page.waitForFunction(i=>lifecycleFixture.index()!==i,index,{timeout:6500});
  assert.equal(await page.evaluate(()=>speechCalls.length),calls,'interrupted pronunciation does not replay on resume');
  await page.locator('#restart').click();await page.evaluate(()=>{speechCalls.length=0;lifecycleFixture.complete()});
  await page.waitForFunction(()=>speechCalls.length>0);await page.locator('#restart').click();
  await page.evaluate(()=>speechCalls.forEach(u=>u.onend?.()));await page.waitForTimeout(1900);
  assert.equal(await page.evaluate(()=>lifecycleFixture.index()),0,'restart invalidates stale completion');
  await page.evaluate(()=>{speechCalls.length=0;lifecycleFixture.complete()});await page.waitForFunction(()=>speechCalls.length>0);
  await page.locator('#sound').click();await page.evaluate(()=>speechCalls.forEach(u=>u.onend?.()));
  const count=await page.evaluate(()=>speechCalls.length);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>speechCalls.length),count,'mute prevents queued speech');
  await page.locator(game==='cat'?'#menu':game==='eater'?'#menuReturn':game==='warehouse'?'#back':'#backMenu').click();
  assert.equal(await page.evaluate(()=>lifecycleFixture.life.active),false);await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(()=>lifecycleFixture.life.tasks.size),0);assert.deepEqual(errors,[]);
  console.log(game,label,'pause, focus, completion, stale speech, restart, mute and menu passed');await ctx.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
