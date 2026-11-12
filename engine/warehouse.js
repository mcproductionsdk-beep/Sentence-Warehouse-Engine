'use strict';const E=id=>document.getElementById(id),c=E('canvas').getContext('2d'),keys=new Set();const mobilePortrait=matchMedia('(pointer:coarse) and (max-width:700px) and (orientation:portrait)').matches;const W=mobilePortrait?600:1000,H=mobilePortrait?900:600,context=c;E('canvas').width=W;E('canvas').height=H;
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};function drawText(t,x,y,color='#fff',size=16){c.fillStyle=color;c.font='bold '+size+'px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(t,x,y)}
let voices=[],state=null,raf=0,last=0,source=null,sound=true,shellSession=null;let pausedMode='running';
const lifecycle=BTSentenceLifecycle.create({
 canPause:()=>!!state&&['running','transition'].includes(state.mode),
 label:on=>{E('pause').textContent=on?'RESUME':'PAUSE';E('pause').setAttribute('aria-pressed',String(on))},
 cancelVoice:()=>{shellSession?.cancel();window.speechSynthesis?.cancel()},
 pause:()=>{pausedMode=state.mode;state.mode='paused';keys.clear();clearMobileTouch();cancelAnimationFrame(raf);raf=0},
 resume:()=>{state.mode=pausedMode;keys.clear();clearMobileTouch();last=performance.now();if(state.mode==='running'&&!raf)raf=requestAnimationFrame(tick)}
});const timers=lifecycle.tasks;
function later(fn,ms){return lifecycle.after(fn,ms)}
function voiceFor(lang){voices=window.speechSynthesis?.getVoices()||[];return voices.find(v=>v.lang===lang)||voices.find(v=>v.lang.split('-')[0]===lang.split('-')[0])||null}
function speak(text){return lifecycle.speak(text,{enabled:sound,session:shellSession,locale:state?.lang||'es-ES',rate:.88})}
function stopSpeech(){lifecycle.cancelSpeech()}
function compatibility(pairs){return pairs.flatMap((pair,i)=>{const n=wordsOf(pair[1]).length;return n<1||n>20?[{row:i+1,count:n,reason:n<1?'No playable words':'More than 20 words'}]:[]})}
function wordsOf(t){return (t.match(/[^\s]+/gu)||[]).map(w=>w.replace(/^[.,!?;:¡¿"“”()]+|[.,!?;:¡¿"“”()]+$/gu,'')).filter(Boolean)}function layout(n){if(mobilePortrait){const max=4,gap=5,width=70,height=38,arr=[];for(let i=0;i<n;i++){let row=Math.floor(i/max),count=Math.min(max,n-row*max),left=(W-(count*width+(count-1)*gap))/2;arr.push({x:left+(i%max)*(width+gap),y:400+row*42,w:width,h:height})}return arr}const max=8;const rows=Math.ceil(n/max),per=Math.min(max,n);const gap=7,width=Math.min(120,(570-(per-1)*gap)/per),height=54;const arr=[];for(let i=0;i<n;i++){let row=Math.floor(i/max),count=Math.min(max,n-row*max),left=500-(count*width+(count-1)*gap)/2;arr.push({x:left+(i%max)*(width+gap),y:349+row*64,w:width,h:height})}return arr}
const belt={left:65,right:W-65,top:mobilePortrait?105:95,bottom:H-55,r:55};
const beltStraightX=belt.right-belt.left-2*belt.r,beltStraightY=belt.bottom-belt.top-2*belt.r;
const beltLength=2*(beltStraightX+beltStraightY)+2*Math.PI*belt.r;
function beltPoint(distance){
 let d=((distance%beltLength)+beltLength)%beltLength;
 const segments=[
  [beltStraightX,t=>({x:belt.left+belt.r+t,y:belt.top,angle:0})],
  [Math.PI*belt.r/2,t=>({x:belt.right-belt.r+Math.sin(t/belt.r)*belt.r,y:belt.top+belt.r-Math.cos(t/belt.r)*belt.r,angle:t/belt.r})],
  [beltStraightY,t=>({x:belt.right,y:belt.top+belt.r+t,angle:Math.PI/2})],
  [Math.PI*belt.r/2,t=>({x:belt.right-belt.r+Math.cos(t/belt.r)*belt.r,y:belt.bottom-belt.r+Math.sin(t/belt.r)*belt.r,angle:Math.PI/2+t/belt.r})],
  [beltStraightX,t=>({x:belt.right-belt.r-t,y:belt.bottom,angle:Math.PI})],
  [Math.PI*belt.r/2,t=>({x:belt.left+belt.r-Math.sin(t/belt.r)*belt.r,y:belt.bottom-belt.r+Math.cos(t/belt.r)*belt.r,angle:Math.PI+t/belt.r})],
  [beltStraightY,t=>({x:belt.left,y:belt.bottom-belt.r-t,angle:Math.PI*1.5})],
  [Math.PI*belt.r/2,t=>({x:belt.left+belt.r-Math.cos(t/belt.r)*belt.r,y:belt.top+belt.r-Math.sin(t/belt.r)*belt.r,angle:Math.PI*1.5+t/belt.r})]
 ];
 for(const [length,point] of segments){if(d<=length)return point(d);d-=length}return segments[0][1](0);
}
function placeConveyorWords(s){
 const count=s.words.length;
 s.words.forEach((w,i)=>{const p=beltPoint(i*beltLength/count+s.beltOffset);w.x=p.x-44;w.y=p.y-21});
}
function advanceConveyor(dt){state.beltOffset=(state.beltOffset+28*dt/1000)%beltLength;placeConveyorWords(state)}
function spawn(n){return Array.from({length:n},(_,i)=>{const p=beltPoint(i*beltLength/n);return {x:p.x-44,y:p.y-21}})}
function floorPoint(x,y){return {x:Math.max(belt.left+78,Math.min(belt.right-78,x)),y:Math.max(belt.top+76,Math.min(belt.bottom-64,y))}}
function start(pairs,lang){const issues=compatibility(pairs);if(issues.length){E('error').textContent=issues.map(x=>'Row '+x.row+': '+x.reason+' ('+x.count+').').join(' ');return false}E('error').textContent='';stop();E('pause').textContent='PAUSE';source={pairs:pairs.map(x=>[...x]),lang};state={pairs:source.pairs,lang,idx:0,mistakes:0,elapsed:0,player:{x:mobilePortrait?300:500,y:mobilePortrait?650:520,walking:false,step:0,facing:'up',carrying:null},mode:'running',words:[],slots:[],filled:[],prompt:'',target:''};lifecycle.begin();E('menu').hidden=true;E('game').hidden=false;E('overlay').hidden=true;nextSentence();last=performance.now();raf=requestAnimationFrame(tick)}function nextSentence(){const s=state;if(s.idx>=s.pairs.length){finish();return}const [en,target]=s.pairs[s.idx];const words=wordsOf(target);s.prompt=en;s.target=target;E('prompt').textContent=en;s.slots=layout(words.length);s.filled=words.map(()=>false);const extras=distractorsFor(s,words);const crates=shuffle(words.map((text,i)=>({id:i,text,decoy:false,done:false})).concat(extras.map((text,i)=>({id:words.length+i,text,decoy:true,done:false}))));s.beltOffset=0;const places=spawn(crates.length);s.words=crates.map((w,i)=>({...w,x:places[i]?.x??55+(i%7)*142,y:places[i]?.y??186}));s.player.x=mobilePortrait?300:500;s.player.y=mobilePortrait?650:510;s.player.carrying=null;E('notice').textContent='';render()}
// Target-language distractors: prefer words from other sentences in the selected set,
// then supplement with a small locale-specific bank. Never use English prompt words.
const DISTRACTOR_BANK={
'es-ES':['perro','gatos','ayer','mañana','rápido','grande','escuela','nosotros','juegan','bonito','comemos','verde','siempre'],
'de-DE':['Hund','Katzen','gestern','morgen','schnell','groß','Schule','wir','spielen','schön','essen','grün','immer'],
'da-DK':['hund','katte','i går','i morgen','hurtigt','stor','skole','vi','leger','smuk','spiser','grøn','altid'],
'fr-FR':['chien','chats','hier','demain','vite','grand','école','nous','jouent','joli','mangeons','vert','toujours'],
'it-IT':['cane','gatti','ieri','domani','veloce','grande','scuola','noi','giocano','bello','mangiamo','verde','sempre']
};
function distractorsFor(s,correct){
 const key=t=>t.normalize('NFC').toLocaleLowerCase(s.lang);
 const excluded=new Set(correct.map(key)),used=new Set();
 const candidates=shuffle(s.pairs.flatMap((pair,i)=>i===s.idx?[]:wordsOf(pair[1])))
  .concat(shuffle(DISTRACTOR_BANK[s.lang]||[]));
 const count=Math.min(4,Math.max(2,Math.ceil(correct.length/3)),Math.max(0,20-correct.length));
 const result=[];if(count===0)return result;
 for(const text of candidates){
  const k=key(text);
  if(excluded.has(k)||used.has(k))continue;
  used.add(k);result.push(text);
  if(result.length>=count)break;
 }
 return result;
}
function nearestWord(){const p=state.player;let best=null,dist=116;for(const w of state.words){if(w.done)continue;let d=Math.hypot(p.x-(w.x+44),p.y-(w.y+21));if(d<dist){dist=d;best=w}}return best}function slotNear(){
 // Delivery is based on the carried crate, not the worker's feet.
 // The crate is drawn 110px above the worker, 110x50px wide.
 const p=state.player,box={x:p.x-55,y:p.y-110,w:110,h:50};
 const reach=mobilePortrait?32:19;let best=-1,bestDistance=Infinity;
 for(let i=0;i<state.slots.length;i++){
  if(state.filled[i])continue;
  const b=state.slots[i],x=b.x,y=b.y+(state.slotShift||0);
  // Expanded slot rectangle: forgiving even when only the box edge touches.
  const dx=Math.max(x-reach-(box.x+box.w),box.x-(x+b.w+reach),0);
  const dy=Math.max(y-reach-(box.y+box.h),box.y-(y+b.h+reach),0);
  if(dx>0||dy>0)continue;
  const d=Math.hypot(box.x+box.w/2-(x+b.w/2),box.y+box.h/2-(y+b.h/2));
  if(d<bestDistance){bestDistance=d;best=i}
 }
 return best;
}function action(){if(!state||state.mode!=='running')return;const s=state,p=s.player;if(!p.carrying){let w=nearestWord();if(!w){E('notice').textContent='Move closer to a word crate to pick it up.';return}p.carrying=w;speak(w.text);E('notice').textContent='Carrying '+w.text+' — walk to any empty sentence slot and press SPACE.';return}const slot=slotNear();if(slot<0){p.carrying=null;placeConveyorWords(s);E('notice').textContent='Word returned to an open space on the conveyor.';return}const targetWords=wordsOf(s.target);if(!p.carrying.decoy&&targetWords[slot].normalize('NFC').toLocaleLowerCase(s.lang)===p.carrying.text.normalize('NFC').toLocaleLowerCase(s.lang)){const w=p.carrying;w.done=true;s.filled[slot]=w.text;p.carrying=null;if(!s.filled.every(Boolean))speak(w.text);E('notice').textContent='✓ Correct! '+s.filled.filter(Boolean).length+'/'+s.filled.length+' words placed.';if(s.filled.every(Boolean)){
 s.mode='transition';E('notice').textContent='✓ SENTENCE COMPLETE!';
 render();const panel=E('overlay');panel.replaceChildren();
 const title=document.createElement('h2');title.textContent='SENTENCE COMPLETE!';
 const phrase=document.createElement('p');phrase.textContent=s.target;phrase.style.cssText='font-size:clamp(22px,4vw,40px);color:#6ee7b7;line-height:1.35;margin:16px;text-align:center';
 panel.append(title,phrase);panel.hidden=false;
 let advanced=false;const advance=()=>{if(advanced||state!==s||s.mode!=='transition')return;advanced=true;panel.hidden=true;s.idx++;s.mode='running';nextSentence();last=performance.now();if(!raf)raf=requestAnimationFrame(tick)};
 const generation=lifecycle.generation;void speak(s.target).then(async()=>{if(await lifecycle.checkpoint(generation)&&state===s)later(advance,sound?750:1800)});
}}else{const wasDecoy=p.carrying.decoy;s.mistakes++;s.nopeUntil=s.elapsed+850;p.carrying=null;E('notice').textContent=wasDecoy?'NOPE! That is a distraction word.':'NOPE! Wrong position. The word returned to its crate.'}render()}
function pause(){lifecycle.toggle()}function showOverlay(title,desc,buttons){let o=E('overlay');o.replaceChildren();let h=document.createElement('h2');h.textContent=title;let p=document.createElement('p');p.textContent=desc;o.append(h,p);for(const [label,fn] of buttons){let b=document.createElement('button');b.textContent=label;b.onclick=fn;o.append(b)}o.hidden=false}function finish(){state.mode='finished';cancelAnimationFrame(raf);raf=0;stopSpeech();showOverlay('WAREHOUSE COMPLETE!',state.pairs.length+' sentences · '+state.mistakes+' mistakes · '+Math.floor(state.elapsed/1000)+' seconds',[['REPLAY',()=>start(source.pairs,source.lang)],['MENU',back]])}function stop(){lifecycle.stop();clearMobileTouch();if(raf)cancelAnimationFrame(raf);raf=0;keys.clear();stopSpeech();state=null}function back(){if(shellSession){stop();shellSession.menu();return}stop();E('game').hidden=true;E('menu').hidden=false}function tick(now){raf=0;const s=state;if(!s||s.mode!=='running')return;const dt=Math.min(80,Math.max(0,now-last));last=now;s.elapsed+=dt;let dx=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0),dy=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);let p=s.player;p.walking=!!(dx||dy);if(p.walking){p.step+=dt;if(Math.abs(dx)>Math.abs(dy))p.facing=dx>0?'right':'left';else p.facing=dy>0?'down':'up'}let m=Math.hypot(dx,dy)||1;Object.assign(p,floorPoint(p.x+dx/m*245*dt/1000,p.y+dy/m*245*dt/1000));advanceConveyor(dt);render();raf=requestAnimationFrame(tick)}
function drawWarehouse(){
 rect(0,0,W,H,'#12243d');
 for(let y=100;y<H;y+=42){c.strokeStyle='#1d334c';c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
 c.save();
 c.beginPath();c.roundRect(belt.left,belt.top,belt.right-belt.left,belt.bottom-belt.top,belt.r);
 c.strokeStyle='#07111f';c.lineWidth=88;c.stroke();
 c.strokeStyle='#e0a749';c.lineWidth=78;c.setLineDash([10,10]);c.stroke();c.setLineDash([]);
 c.strokeStyle='#668096';c.lineWidth=68;c.stroke();c.strokeStyle='#283848';c.lineWidth=58;c.stroke();
 // Rollers and moving tread follow the same rounded route as the boxes.
 for(let distance=0;distance<beltLength;distance+=24){const p=beltPoint(distance+(state?.beltOffset||0));c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.strokeStyle='#516271';c.lineWidth=3;c.beginPath();c.moveTo(0,-26);c.lineTo(0,26);c.stroke();c.restore()}
 for(let distance=0;distance<beltLength;distance+=180){const p=beltPoint(distance);rect(p.x-5,p.y+28,10,16,'#162330');rect(p.x-8,p.y+40,16,4,'#64758a')}
 c.restore();
}
function label(text,x,y,w,h){rect(x,y,w,h,'#10283f');rect(x+2,y+2,w-4,h-4,'#203c56');const size=Math.max(10,Math.min(17,Math.floor((w-10)*1.65/Math.max(1,[...text].length))));drawText(text,x+w/2,y+h/2,'#ffffff',size)}
function cardboardBox(text,x,y,w,h){
 const side=7,top=10;
 c.save();
 rect(x+3,y+4,w,h,'#071323');
 // Light top flaps, broad front face and a darker folded right side.
 rect(x,y,w,h,'#714522');
 rect(x+1,y+1,w-side-1,top,'#d8aa68');
 rect(x+1,y+top,w-side-1,h-top-1,'#b47c3e');
 c.fillStyle='#8a582d';c.beginPath();c.moveTo(x+w-side,y+top);c.lineTo(x+w,y+1);c.lineTo(x+w,y+h-side);c.lineTo(x+w-side,y+h);c.closePath();c.fill();
 c.strokeStyle='#94622f';c.lineWidth=1;
 c.beginPath();c.moveTo(x+2,y+1);c.lineTo(x+10,y+top);c.lineTo(x+w-side-1,y+top);c.moveTo(x+w-side-9,y+1);c.lineTo(x+w-side,y+top);c.moveTo(x+(w-side)/2,y+1);c.lineTo(x+(w-side)/2,y+top);c.stroke();
 // Packing tape bridges the lid seam and folds down the front.
 const tapeX=x+Math.floor((w-side)/2)-5;
 rect(tapeX,y+1,10,top+5,'#ead09b');
 rect(tapeX,y+h-6,10,5,'#cfad72');
 rect(x+3,y+top+2,w-side-6,2,'#c89553');
 // Cream shipping sticker with a dark, high-contrast word.
 const lx=x+4,ly=y+top+3,lw=w-side-8,lh=h-top-7;
 rect(lx+1,ly+1,lw,lh,'#8b602f');
 rect(lx,ly,lw,lh,'#fff2d4');
 const size=Math.max(10,Math.min(22,Math.floor((lw-5)*1.65/Math.max(1,[...text].length))));
 drawText(text,lx+lw/2,ly+lh/2,'#263245',size);
 c.restore();
}
function crate(w){cardboardBox(w.text,w.x,w.y,88,42)}
// Keep the full learning text in readable DOM text, independent of canvas scale.
// The extra answer readout appears only when a filled slot has a long word.
function renderCompletedWords(s){
 const readout=E('completedWords');
 const longWord=s.filled.some((word,i)=>word&&[...word].length>(mobilePortrait?12:Math.max(4,Math.floor(s.slots[i].w/9))));
 const text=longWord?s.filled.map(word=>word||'___').join(' '):'';
 if(readout.textContent!==text)readout.textContent=text;
 readout.hidden=!longWord;
}
function assembly(s){if(mobilePortrait){const count=s.slots.length,rows=Math.ceil(count/4),top=375,height=45+rows*42;rect(130,top,340,height,'#c99340');rect(137,top+7,326,height-14,'#18334f');drawText('BUILD THE SENTENCE',300,top+18,'#64d8ff',14);s.slots.forEach((b,i)=>{rect(b.x-2,b.y-2,b.w+4,b.h+4,s.filled[i]?'#60d9a9':'#63baff');rect(b.x,b.y,b.w,b.h,s.filled[i]?'#145345':'#10243b');drawText(''+(i+1),b.x+b.w/2,b.y+9,'#83d8ff',10);drawText(s.filled[i]||'___',b.x+b.w/2,b.y+27,s.filled[i]?'#c5ffe0':'#bed6ec',Math.min(19,b.w/Math.max(3,(s.filled[i]||'___').length)*1.6))});s.slotShift=0;return}const count=s.slots.length,rows=Math.ceil(count/8),height=128+Math.max(0,rows-1)*64,top=280-(rows-1)*25;rect(179,top,642,height,'#c99340');rect(186,top+7,628,height-14,'#18334f');drawText('SENTENCE ASSEMBLY ZONE',500,top+43,'#64d8ff',20);s.slots.forEach((b,i)=>{let yy=b.y+(top-280);rect(b.x-2,yy-2,b.w+4,b.h+4,s.filled[i]?'#60d9a9':'#63baff');rect(b.x,yy,b.w,b.h,s.filled[i]?'#145345':'#10243b');drawText(''+(i+1),b.x+b.w/2,yy+9,'#83d8ff',10);drawText(s.filled[i]||'___',b.x+b.w/2,yy+33,s.filled[i]?'#c5ffe0':'#bed6ec',Math.min(22,b.w/Math.max(3,(s.filled[i]||'___').length)*1.7))});s.slotShift=top-280}
function render(){let s=state;if(!s)return;renderCompletedWords(s);if(mobilePortrait){drawWarehouse();drawText('CARRY WORDS TO BUILD THE SENTENCE',300,25,'#5adfff',17);drawText('SENTENCE '+(s.idx+1)+'/'+s.pairs.length+'  TIME '+Math.floor(s.elapsed/1000)+'s  ERRORS '+s.mistakes,300,60,'#ffe18a',15);assembly(s);for(const w of s.words)if(!w.done&&s.player.carrying!==w)crate(w);drawWorker(s.player);if(s.nopeUntil>s.elapsed){rect(130,450,340,95,'#22070bdc');drawText('NOPE!',300,495,'#ff465e',54)}E('hud').textContent='WORDS '+s.filled.filter(Boolean).length+'/'+s.filled.length+' · TAP TO PICK / PLACE';return}drawWarehouse();rect(0,0,1000,50,'#071629');drawText('CARRY WORDS TO BUILD THE SENTENCE',250,31,'#5adfff',17);drawText('SENTENCE '+(s.idx+1)+'/'+s.pairs.length+'     TIME '+Math.floor(s.elapsed/1000)+'s     MISTAKES '+s.mistakes,735,33,'#ffe18a',15);assembly(s);for(const w of s.words)if(!w.done&&s.player.carrying!==w)crate(w);drawWorker(s.player);if(s.nopeUntil>s.elapsed){c.save();rect(340,278,320,120,'#22070bdc');c.strokeStyle='#ff465e';c.lineWidth=5;c.strokeRect(340,278,320,120);drawText('NOPE!',500,338,'#ff465e',62);c.restore()}E('hud').textContent='WORDS '+s.filled.filter(Boolean).length+'/'+s.filled.length+' · SPACE TO PICK / PLACE'}
function drawWorker(s){
 const c=context,phase=s.walking?Math.floor(s.step/90)%4:0,bob=s.walking?[0,2,0,-2][phase]:0;
 const back=s.facing==='up',side=s.facing==='left'||s.facing==='right';
 c.save();c.translate(Math.round(s.x),Math.round(s.y)+bob);
 if(s.facing==='left')c.scale(-1,1);
 const px=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x*3,y*3,w*3,h*3)};
 rect(-22,29,44,5,'#07122288');
 const stride=s.walking?[0,2,0,-2][phase]:0;
 px(-6+stride,7,5,4,'#17283a');px(2-stride,7,5,4,'#17283a');
 px(-6+stride,10,6,2,'#384e62');px(1-stride,10,6,2,'#384e62');
 px(-7,-6,14,14,'#192a39');px(-6,-5,12,12,'#ff981f');
 px(-2,-5,4,12,'#ffdd4d');px(-6,3,12,2,'#dce4e8');
 px(-7,5,14,2,'#243b52');
 px(-6,-17,12,12,'#1b2938');px(-5,-16,10,10,back?'#4b3227':'#d69a72');
 if(!back){px(-3,-13,2,2,'#162638');px(2,-13,2,2,'#162638');px(-1,-10,2,1,'#8b543b')}
 px(-7,-20,14,5,'#19293a');px(-6,-21,12,5,'#f2b919');px(-7,-18,14,2,'#ffd849');px(-4,-22,8,2,'#ffd849');
 if(s.carrying){
   // Arms extend upwards to support a real cargo box, with its label always facing the viewer.
   px(-10,-15,3,12,'#ff981f');px(7,-15,3,12,'#ff981f');
   px(-10,-18,3,4,'#d69a72');px(7,-18,3,4,'#d69a72');
   // Keep cargo drawing outside the mirrored sprite coordinate system.
   c.restore();
   const x=Math.round(s.x)-55,y=Math.round(s.y)+bob-110;
   cardboardBox(s.carrying.text,x,y,110,50);
   return;
 }
 px(-10,-3,3,9,'#ff981f');px(7,-3,3,9,'#ff981f');
 px(-10,4,3,3,'#d69a72');px(7,4,3,3,'#d69a72');
 c.restore();
}

// Portrait touch controls: drag to steer; tap nearby cargo/slot to pick up or deliver.
const mobileTouch={active:false,x:0,y:0,originX:0,originY:0};
function mobilePoint(e){const r=E('canvas').getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function clearMobileTouch(){mobileTouch.active=false;for(const k of ['arrowleft','arrowright','arrowup','arrowdown'])keys.delete(k)}
if(matchMedia('(pointer:coarse)').matches){for(const canvas of [E('canvas'),E('gestureGuide')]){
canvas.addEventListener('pointerdown',e=>{if(E('game').hidden||state?.mode!=='running')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=mobilePoint(e);Object.assign(mobileTouch,{active:true,x:p.x,y:p.y,originX:p.x,originY:p.y});},{passive:false});
canvas.addEventListener('pointermove',e=>{if(!mobileTouch.active)return;e.preventDefault();const p=mobilePoint(e);mobileTouch.x=p.x;mobileTouch.y=p.y;const dx=p.x-mobileTouch.originX,dy=p.y-mobileTouch.originY;clearMobileTouchKeys();if(Math.hypot(dx,dy)>14){if(Math.abs(dx)>9)keys.add(dx>0?'arrowright':'arrowleft');if(Math.abs(dy)>9)keys.add(dy>0?'arrowdown':'arrowup')}},{passive:false});
canvas.addEventListener('pointerup',e=>{if(!mobileTouch.active)return;const p=mobilePoint(e),travel=Math.hypot(p.x-mobileTouch.originX,p.y-mobileTouch.originY);clearMobileTouch();if(travel<20&&state?.mode==='running'){
 action();render();
}},{passive:false});
for(const ev of ['pointercancel','lostpointercapture'])canvas.addEventListener(ev,clearMobileTouch);
}}
function clearMobileTouchKeys(){for(const k of ['arrowleft','arrowright','arrowup','arrowdown'])keys.delete(k)}
window.addEventListener('keydown',e=>{if(E('game').hidden||e.target?.closest?.('.sentence-context')||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;let k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state?.mode==='running')keys.add(k);if(k===' '&&!e.repeat)action();if(k==='p'&&!e.repeat)pause()});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));for(let b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(b.dataset.key);b.setPointerCapture(e.pointerId)});for(let ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key))}E('pause').onclick=pause;E('restart').onclick=()=>{if(source)start(source.pairs,source.lang)};E('back').onclick=back;E('play').onclick=()=>start([['I eat bread.','Yo como pan.'],['She drinks water.','Ella bebe agua.']], 'es-ES');E('sound').onclick=()=>{sound=!sound;E('sound').textContent=sound?'SOUND ON':'SOUND OFF';E('sound').setAttribute('aria-pressed',String(sound));shellSession?.sound(sound);if(!sound)stopSpeech()};
window.addEventListener('pagehide',stop,{once:true});

if(window.parent!==window){
 E('play').hidden=true;E('menu').hidden=true;
 let origin;try{origin=new URL(document.referrer).origin}catch{}
 if(/^https:\/\/(?:[a-z0-9-]+\.)?bt-vocabulary-platform-staging\.pages\.dev$/.test(origin)){
  const protocol='bt-sentence-warehouse/1';let sessionId,sequence=0,pending;
  const send=(type,data={})=>window.parent.postMessage({protocol,sessionId,type,...data},origin);
  function settle(){if(pending){clearTimeout(pending.timer);pending.resolve();pending=null}}
  function receive(event){
   const d=event.data;if(event.source!==window.parent||event.origin!==origin||d?.protocol!==protocol)return;
   if(!sessionId&&d.type==='INIT'&&/^[\w-]{24,64}$/.test(d.sessionId)){
    const {pairs,language}=d.set??{};
    if(!['es-ES','de-DE','da-DK','fr-FR','it-IT'].includes(language)||typeof d.soundOn!=='boolean'||!Array.isArray(pairs)||pairs.length<2||pairs.length>100||pairs.some(p=>!Array.isArray(p)||p.length!==2||p.some(t=>typeof t!=='string'||!t.trim()||t.length>1000))||compatibility(pairs).length)return;
    sessionId=d.sessionId;
    shellSession={
     speak(text){settle();if(!sound)return Promise.resolve();return new Promise(resolve=>{const id=++sequence;pending={id,resolve,timer:setTimeout(settle,Math.min(20000,Math.max(5000,text.length*160)))};send('SPEAK',{id,text})})},
     cancel(){settle();send('CANCEL')},sound(soundOn){if(!soundOn)settle();send('SOUND',{soundOn})},menu(){settle();send('MENU')}
    };
    sound=d.soundOn;E('sound').textContent=sound?'SOUND ON':'SOUND OFF';E('sound').setAttribute('aria-pressed',String(sound));
    start(pairs,language);send('STARTED');
   }else if(sessionId&&d.sessionId===sessionId&&d.type==='PAUSE'){lifecycle.pause();}else if(sessionId&&d.sessionId===sessionId&&d.type==='SPOKEN'&&d.id===pending?.id)settle();
  }
  window.addEventListener('message',receive);
  window.addEventListener('pagehide',()=>{settle();window.removeEventListener('message',receive)},{once:true});
  void import('./build-id.mjs').then(({default:buildId})=>send('READY',{buildId}));
 }
}
