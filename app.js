import {calculate,dateKey,shareHash,parseHash,calendar,preferences,countdown} from './core.js';
const $=id=>document.getElementById(id);
const fmt=d=>new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(d);
const full=d=>new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
const duration=n=>`${Math.floor(n/60)} h${n%60?' '+n%60+' min':''}`;
const nextDate=(time)=>{const d=new Date();if(new Date(`${dateKey(d)}T${time}`)<=d)d.setDate(d.getDate()+1);return dateKey(d);};
const defaults={mode:'wake',time:'07:00',date:nextDate('07:00'),buffer:15,cycle:90};
let saved=null;try{saved=localStorage.getItem('nachtplan:preferences');}catch{}
let state=parseHash(location.hash)||preferences(saved,defaults);
if(!location.hash)state.date=nextDate(state.time);
let rows=[],selected=readPick(),calculatedNow=new Date(),toastTimer;
function readPick(){const n=Number(new URLSearchParams(location.hash.slice(1)).get('pick'));return [3,4,5,6].includes(n)?n:5;}
const day=d=>dateKey(d)===dateKey(new Date())?'Heute':(()=>{const n=new Date();n.setDate(n.getDate()+1);return dateKey(d)===dateKey(n)?'Morgen':full(d);})();
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function sync(){
 for(const key of ['time','date','buffer','cycle'])$(key).value=state[key];
 for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));
 $('time-label').textContent=state.mode==='wake'?'Ich möchte aufstehen um':'Ich gehe ins Bett um';
 $('time-fields').hidden=state.mode==='now';$('time').disabled=state.mode==='now';$('date').disabled=state.mode==='now';$('now-note').hidden=state.mode!=='now';
 $('cycle-value').textContent=state.cycle+' Min.';
 $('timezone').textContent='Gerätezeitzone: '+(Intl.DateTimeFormat().resolvedOptions().timeZone||'lokal');
}
function read(){return {mode:state.mode,time:$('time').value,date:$('date').value,buffer:Number($('buffer').value),cycle:Number($('cycle').value)};}
function persist(){try{const {mode,time,buffer,cycle}=state;localStorage.setItem('nachtplan:preferences',JSON.stringify({mode,time,buffer,cycle}));}catch{}}
function draw(){
 const focused=document.activeElement?.dataset.cycles;
 $('options').replaceChildren();
 for(const r of rows){
  const t=state.mode==='wake'?r.bed:r.wake;
  const b=document.createElement('button');b.type='button';b.className='option';b.dataset.cycles=r.cycles;b.setAttribute('aria-pressed',String(r.cycles===selected));
  // Only values produced by validated numeric/date calculations enter this template.
  b.innerHTML=`<span class="clock">${fmt(t)}<span class="day">${day(t)}</span></span><span><span class="duration">${duration(r.sleepMinutes)} Schlaf</span><span class="cycles">≈ ${r.cycles} Zyklen · ${duration(r.bedMinutes)} im Bett</span>${t<new Date()?' <span class="past">Bereits vorbei</span>':''}</span><span class="option-right">${r.sleepMinutes>=420&&r.sleepMinutes<=540?'<span class="badge">7–9 h</span>':''}<span class="radio" aria-hidden="true"></span></span>`;
  b.addEventListener('click',()=>{selected=r.cycles;draw();});$('options').append(b);
 }
 $('results-title').textContent=state.mode==='wake'?'Zeit, ins Bett zu gehen.':'Zeit, wieder aufzuwachen.';
 const anchor=state.mode==='wake'?rows[0].wake:rows[0].bed;
 $('results-subtitle').textContent=(state.mode==='wake'?'Aufstehen: ':'Ins Bett: ')+full(anchor)+' · '+fmt(anchor)+' Uhr';
 $('selection').hidden=false;
 const r=rows.find(r=>r.cycles===selected)||rows[0];
 $('bed-time').textContent=fmt(r.bed);$('wake-time').textContent=fmt(r.wake);
 $('bed-date').textContent=full(r.bed);$('wake-date').textContent=full(r.wake);
 $('sleep-total').textContent=duration(r.sleepMinutes);
 $('bed-total').textContent=duration(r.bedMinutes)+' im Bett = '+duration(r.sleepMinutes)+' Schlaf + '+state.buffer+' Min. Einschlafzeit';
 $('cycle-visual').replaceChildren(...Array.from({length:r.cycles},()=>document.createElement('i')));
 tick();
 if(focused)document.querySelector(`[data-cycles="${focused}"]`)?.focus({preventScroll:true});
}
function tick(){if(!rows.length)return;const r=rows.find(r=>r.cycles===selected)||rows[0];$('countdown').textContent=countdown(state.mode==='wake'?r.bed:r.wake)+(state.mode==='wake'?' · bis ins Bett':' · bis zum Aufstehen');}
function compute({save=false}={}){
 try{
  const candidate=read();const instant=new Date();rows=calculate(candidate,instant);state=candidate;calculatedNow=instant;
  $('error').hidden=true;$('options').hidden=false;$('calendar').disabled=false;$('share').disabled=false;
  if(!rows.some(r=>r.cycles===selected))selected=5;
  draw();if(save)persist();return true;
 }catch(e){$('error').textContent=e.message;$('error').hidden=false;$('options').hidden=true;$('selection').hidden=true;$('calendar').disabled=true;$('share').disabled=true;rows=[];return false;}
}
$('plan-form').addEventListener('submit',e=>{e.preventDefault();if(compute({save:true}))toast('Dein Nachtplan ist aktualisiert.');});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>{
 state={...read(),mode:b.dataset.mode};
 if(state.mode==='bed'){state.time='23:00';state.date=nextDate(state.time);}else if(state.mode==='wake'){state.time='07:00';state.date=nextDate(state.time);}else{state.date=dateKey(new Date());state.time=fmt(new Date());}
 sync();compute({save:true});
});
for(const id of ['time','date','buffer','cycle'])$(id).addEventListener('change',()=>{if($('plan-form').checkValidity())compute({save:true});});
$('cycle').addEventListener('input',()=>{$('cycle-value').textContent=$('cycle').value+' Min.';});
$('calendar').addEventListener('click',()=>{
 const r=rows.find(r=>r.cycles===selected)||rows[0];if(!r)return;
 const blob=new Blob([calendar(r)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='nachtplan-'+dateKey(r.bed)+'.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Kalenderdatei gespeichert. Bitte Wecker separat stellen.');
});
$('share').addEventListener('click',async()=>{
 // Freeze “now” as an explicit bedtime so the same plan can be reopened.
 const s=state.mode==='now'?{...state,mode:'bed',date:dateKey(calculatedNow),time:fmt(calculatedNow)}:state;
 const url=location.origin+location.pathname+shareHash(s)+'&pick='+selected;
 try{await navigator.clipboard.writeText(url);toast('Link kopiert. Zeiten gelten in der Gerätezeitzone.');}catch{window.prompt('Diesen Link kopieren (Gerätezeitzone beachten):',url);}
});
window.addEventListener('hashchange',()=>{const s=parseHash(location.hash);if(s){state=s;selected=readPick();sync();compute();}else if(location.hash)toast('Ungültiger Plan-Link. Dein aktueller Plan bleibt unverändert.');});
$('privacy').addEventListener('click',()=>$('privacy-dialog').showModal());$('close-privacy').addEventListener('click',()=>$('privacy-dialog').close());
$('clear').addEventListener('click',()=>{try{localStorage.removeItem('nachtplan:preferences');toast('Lokale Einstellungen gelöscht.');}catch{toast('Browserspeicher nicht verfügbar.');}});
sync();compute();if(location.hash&&!parseHash(location.hash))toast('Ungültiger Plan-Link. Standard-Einstellungen geladen.');
setInterval(()=>{if(state.mode==='now'&&document.visibilityState==='visible'&&Date.now()-calculatedNow>=60000&&!['INPUT','SUMMARY'].includes(document.activeElement?.tagName)&&$('plan-form').checkValidity())compute();else tick();},1000);
