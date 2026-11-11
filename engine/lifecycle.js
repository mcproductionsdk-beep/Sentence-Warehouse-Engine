/* Sentence lifecycle v1. Identical vendored adapter utility in all four engines.
 * Source: Educational-Games/platform/sentence-lifecycle.js. No runtime fetches.
 */
'use strict';
globalThis.BTSentenceLifecycle = Object.freeze({
 create(options) {
  let active=false, paused=false, generation=0, interruptions=0, speech=null;
  const tasks=new Set(), gates=new Set();
  const shade=document.createElement('div');
  shade.hidden=true;shade.textContent='PAUSED';shade.setAttribute('role','status');
  shade.style.cssText='position:fixed;inset:0;z-index:9999;background:#081322b8;color:#a5f3fc;align-items:center;justify-content:center;font:bold clamp(28px,6vw,48px) monospace;pointer-events:none';
  document.body.append(shade);
  const style=document.createElement('style');
  style.textContent='.sentence-paused *{animation-play-state:paused!important}';document.head.append(style);
  function display(){shade.hidden=!paused;shade.style.display=paused?'flex':'none';document.body.classList.toggle('sentence-paused',paused);options.label(paused)}
  function cancelSpeech(){interruptions++;speech?.();options.cancelVoice()}
  function schedule(task){task.started=performance.now();task.id=setTimeout(()=>{tasks.delete(task);task.id=null;task.fn()},task.remaining)}
  function after(fn,ms,onCancel=()=>{}){
   const task={fn,remaining:Math.max(0,ms),id:null,started:0,cancel(){if(!tasks.delete(task))return;clearTimeout(task.id);onCancel()}};
   if(!active){onCancel();return task}tasks.add(task);if(!paused)schedule(task);return task;
  }
  function clearTimers(){for(const task of [...tasks])task.cancel()}
  function stop(){active=false;generation++;paused=false;clearTimers();for(const resolve of gates)resolve(false);gates.clear();cancelSpeech();display()}
  function begin(){stop();active=true}
  function pause(){
   if(!active||paused||!options.canPause())return;
   paused=true;interruptions++;
   for(const task of tasks){if(task.id!==null){clearTimeout(task.id);task.id=null;task.remaining=Math.max(0,task.remaining-(performance.now()-task.started))}}
   options.pause();cancelSpeech();display();
  }
  function resume(){
   if(!active||!paused)return;paused=false;options.resume();display();
   for(const task of tasks)schedule(task);
   for(const resolve of gates)resolve(true);gates.clear();
  }
  function checkpoint(token=generation){if(!active||token!==generation)return Promise.resolve(false);if(!paused)return Promise.resolve(true);return new Promise(resolve=>gates.add(ok=>resolve(ok&&active&&token===generation)))}
  function speak(text,{enabled,session,locale,rate}){
   if(!active||paused||!enabled||!text)return Promise.resolve();
   speech?.();options.cancelVoice();
   return new Promise(resolve=>{
    let settled=false,watchdog;
    const finish=()=>{if(settled)return;settled=true;clearTimeout(watchdog);if(speech===finish)speech=null;resolve()};speech=finish;
    watchdog=setTimeout(()=>{if(speech===finish){options.cancelVoice();finish()}},Math.min(20000,Math.max(5000,text.length*160)));
    if(session){void Promise.resolve(session.speak(text)).then(finish,finish);return}
    try{
     if(!globalThis.speechSynthesis){finish();return}
     const utterance=new SpeechSynthesisUtterance(text);utterance.lang=locale;utterance.rate=rate;
     const voices=speechSynthesis.getVoices(),language=locale.toLowerCase();
     const voice=voices.find(v=>v.lang.toLowerCase()===language)||voices.find(v=>v.lang.toLowerCase().startsWith(language.slice(0,2)));if(voice)utterance.voice=voice;
     utterance.onend=finish;utterance.onerror=finish;speechSynthesis.speak(utterance);
    }catch{finish()}
   });
  }
  // The launcher owns embedded focus loss; iframe focus handoffs also emit blur.
  window.addEventListener('blur',()=>{if(window.parent!==window)return;setTimeout(()=>{if(document.hidden||!document.hasFocus())pause()},0)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
  window.addEventListener('pagehide',stop);
  return Object.freeze({begin,stop,pause,resume,toggle(){paused?resume():pause()},after,clearTimers,checkpoint,cancelSpeech,speak,tasks,
   wait(ms){return new Promise(resolve=>after(()=>resolve(true),ms,()=>resolve(false)))},
   get paused(){return paused},get active(){return active},get generation(){return generation},get interruptions(){return interruptions}});
 }
});
