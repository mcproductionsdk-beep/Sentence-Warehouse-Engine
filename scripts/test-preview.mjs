import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from 'node:http';import {chromium,devices} from 'playwright';
const root=new URL('../dist-preview/',import.meta.url),headers=await readFile(new URL('_headers',root),'utf8'),csp=headers.match(/Content-Security-Policy: (.+)/)[1];const files={'/':['index.html','text/html'],'/engine/warehouse.js':['engine/warehouse.js','text/javascript'],'/engine/warehouse.css':['engine/warehouse.css','text/css']};
const server=createServer(async(req,res)=>{const f=files[new URL(req.url,'http://localhost').pathname];if(!f)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':f[1],'Content-Security-Policy':csp});res.end(await readFile(new URL(f[0],root)))});const browser=await chromium.launch();
try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
for(const [name,options] of [['desktop',{viewport:{width:1280,height:800}}],['portrait',devices['Pixel 7']],['narrow portrait',{...devices['Pixel 7'],viewport:{width:360,height:740}}],['landscape',{...devices['Pixel 7'],viewport:{width:844,height:390}}]]){
 const ctx=await browser.newContext(options),errors=[],external=[];await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();external.push(r.request().url());return r.abort()});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.spoken=[];window.speechSynthesis.speak=u=>{spoken.push(u.text);queueMicrotask(()=>u.onend?.())}});await p.goto(origin);await p.getByRole('button',{name:'Play sample',exact:true}).click();
 assert.equal(await p.locator('#notice').evaluate(e=>getComputedStyle(e).position),'absolute');
 assert.deepEqual(await p.locator('.gamebar button').allTextContents(),['PAUSE','RESTART','MAIN MENU','SOUND ON']);assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true);
 assert.ok(await p.locator('.gamebar button').evaluateAll(bs=>{const r=bs.map(b=>b.getBoundingClientRect());return r.every(b=>b.height>=44&&b.top===r[0].top&&b.left>=0&&b.right<=innerWidth)}));
 if(name!=='desktop'){
 assert.equal(await p.locator('#gestureGuide').isVisible(),true);
 assert.equal(await p.locator('[data-key]').count(),0);
 await p.evaluate(()=>{const w=state.words.find(w=>!w.done);Object.assign(state.player,floorPoint(w.x+44,w.y+21))});
 await p.locator('#gestureGuide').tap();assert.ok(await p.evaluate(()=>!!state.player.carrying));
 await p.evaluate(()=>{state.player.x=belt.left+78;state.player.y=belt.top+76});
 await p.locator('#gestureGuide').tap();assert.equal(await p.evaluate(()=>state.player.carrying),null);
 // A tap on empty canvas space uses the worker's reach, not the tap coordinates.
 await p.evaluate(()=>{const w=state.words.find(w=>!w.done&&!w.decoy);Object.assign(state.player,floorPoint(w.x+44,w.y+21))});
 await p.locator('#canvas').tap({position:{x:10,y:10}});
 assert.ok(await p.evaluate(()=>!!state.player.carrying));
 await p.evaluate(()=>{state.player.x=belt.left+78;state.player.y=belt.top+76});
 await p.locator('#canvas').tap({position:{x:10,y:10}});
 assert.equal(await p.evaluate(()=>state.player.carrying),null);
 await p.getByRole('button',{name:'RESTART',exact:true}).click();
 }
 await p.keyboard.down('ArrowRight');await p.waitForTimeout(160);await p.keyboard.up('ArrowRight');assert.ok(await p.evaluate(()=>state.player.x>(mobilePortrait?300:500)));
 await p.getByRole('button',{name:'PAUSE',exact:true}).click();const x=await p.evaluate(()=>state.player.x);await p.keyboard.down('ArrowRight');await p.waitForTimeout(140);await p.keyboard.up('ArrowRight');assert.equal(await p.evaluate(()=>state.player.x),x);await p.locator('.gamebar').getByRole('button',{name:'RESUME',exact:true}).click();
 const deliver=async(text,slot,decoy=false)=>p.evaluate(([text,slot,decoy])=>{const w=state.words.find(w=>!w.done&&w.text===text&&w.decoy===decoy);state.player.x=w.x+51;state.player.y=w.y+23;action();const b=state.slots[slot];state.player.x=b.x+b.w/2;state.player.y=b.y+(state.slotShift||0)+85;action()},[text,slot,decoy]);
 await deliver('pan',2);assert.equal(await p.evaluate(()=>state.filled[2]),'pan');assert.equal(await p.evaluate(()=>state.filled[0]),false);
 await deliver('Yo',1);assert.equal(await p.evaluate(()=>state.mistakes),1);assert.equal(await p.evaluate(()=>state.player.carrying),null);
 await p.evaluate(()=>{const w=state.words.find(w=>!w.done&&!w.decoy);state.player.x=w.x+51;state.player.y=w.y+23;action();state.player.x=35;state.player.y=175;action()});assert.equal(await p.evaluate(()=>state.player.carrying),null);
 await deliver('Yo',0);await deliver('como',1);await p.getByText('SENTENCE COMPLETE!',{exact:true}).waitFor();assert.ok((await p.evaluate(()=>spoken)).includes('Yo como pan.'));await p.waitForFunction(()=>state.idx===1);await p.getByRole('button',{name:'RESTART',exact:true}).click();assert.equal(await p.evaluate(()=>state.idx),0);
 // Complete prompt text is independent of the canvas and never reveals future answers.
 const longPrompt='By the time the teacher arrived, the students had opened their books and started reading.';
 const longWord='Donaudampfschifffahrtsgesellschaft';
 await p.evaluate(([prompt,word])=>start([[prompt,word+' fährt heute.'],['Other','Ein Zug kommt.']], 'de-DE'),[longPrompt,longWord]);
 assert.equal(await p.locator('#prompt').textContent(),longPrompt);
 assert.equal(await p.locator('#completedWords').isVisible(),false);
 assert.ok(await p.locator('#prompt').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 assert.ok(await p.locator('#prompt').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
 await deliver(longWord,0);
 assert.equal(await p.evaluate(()=>state.filled[0]),longWord);
 assert.equal(await p.locator('#completedWords').textContent(),longWord+' ___ ___');
 assert.equal(await p.locator('#completedWords').isVisible(),true);
 assert.ok(await p.locator('#completedWords').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 // Maximum-length input remains available through a bounded keyboard-scrollable panel.
 const maximumPrompt='Read <carefully> & keep every accented letter: æ ø å é ü ñ. '.repeat(20).slice(0,1000);
 await p.evaluate(prompt=>start([[prompt,'Yo como pan.'],['Other','Ella bebe agua.']], 'es-ES'),maximumPrompt);
 assert.equal(await p.locator('#prompt').textContent(),maximumPrompt);
 assert.equal(await p.locator('#completedWords').textContent(),'');
 assert.equal(await p.locator('.sentence-context img').count(),0);
 assert.ok(await p.locator('.sentence-context').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true);
 const beforeRead=await p.evaluate(()=>[state.player.x,state.player.y]);
 await p.locator('.sentence-context').press('ArrowDown');
 assert.deepEqual(await p.evaluate(()=>[state.player.x,state.player.y]),beforeRead);
 await p.getByRole('button',{name:'RESTART',exact:true}).click();
 assert.equal(await p.locator('#prompt').textContent(),maximumPrompt);
 // Boundaries: retain every valid pair; reject incompatible rows before a run.
 assert.deepEqual(await p.evaluate(()=>[0,19,20,21].map(n=>compatibility([['Prompt',Array(n).fill('gato').join(' ')]]).length)),[1,0,0,1]);
 await p.evaluate(()=>start([['Twenty words',Array(20).fill('gato').join(' ')],['Other','Otro gato']], 'es-ES'));assert.equal(await p.evaluate(()=>state.words.length),20);assert.equal(await p.evaluate(()=>new Set(state.words.map(w=>w.x+','+w.y)).size),20);
 assert.equal(await p.evaluate(()=>{for(let i=0;i<250;i++){advanceConveyor(80);const crates=state.words;for(let a=0;a<crates.length;a++)for(let b=a+1;b<crates.length;b++){const x=crates[a],y=crates[b];if(Math.abs(x.x-y.x)<88&&Math.abs(x.y-y.y)<42)return false}}return true}),true);
 const lap=await p.evaluate(()=>{const p=beltPoint(0),q=beltPoint(beltLength);return Math.hypot(p.x-q.x,p.y-q.y)});assert.ok(lap<.01);
 await p.evaluate(()=>{keys.add('arrowleft');keys.add('arrowup')});await p.waitForTimeout(200);await p.evaluate(()=>keys.clear());assert.equal(await p.evaluate(()=>state.player.x>=belt.left+78&&state.player.y>=belt.top+76),true);
 await p.evaluate(()=>start([['Repeated','gato gato'],['Other','otro perro']], 'es-ES'));await deliver('gato',1);await deliver('gato',0);await p.getByText('SENTENCE COMPLETE!',{exact:true}).waitFor();await p.getByRole('button',{name:'RESTART',exact:true}).click();await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>state.idx),0);
 await p.getByRole('button',{name:'SOUND ON',exact:true}).click();assert.equal(await p.locator('#sound').getAttribute('aria-pressed'),'false');await p.getByRole('button',{name:'MAIN MENU',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Play sample',exact:true}).isVisible(),true);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await ctx.close();console.log(name+' passed');
}
}finally{await browser.close();server.close()}
