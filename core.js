export function calculate(s,now=new Date()) {
 const target=validate(s);
 return [3,4,5,6].map(cycles=>{
  const sleepMinutes=cycles*s.cycle,bedMinutes=sleepMinutes+s.buffer;
  const bed=s.mode==='wake'?new Date(+target-bedMinutes*60000):new Date(s.mode==='now'?now:target);
  const wake=s.mode==='wake'?target:new Date(+bed+bedMinutes*60000);
  return {cycles,sleepMinutes,bedMinutes,bed,wake,sleep:new Date(+bed+s.buffer*60000)};
 }).sort((a,b)=>a.bed-b.bed);
}

export function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function validate(s){
 if(!['wake','bed','now'].includes(s.mode)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)||!/^20\d{2}-\d{2}-\d{2}$/.test(s.date)||!Number.isInteger(s.cycle)||s.cycle<70||s.cycle>120||!Number.isInteger(s.buffer)||s.buffer<0||s.buffer>60) throw new Error('Bitte gültige Zeiten und Einstellungen wählen.');
 const d=new Date(`${s.date}T${s.time}:00`);
 if(!Number.isFinite(+d)||dateKey(d)!==s.date||d.getHours()!==Number(s.time.slice(0,2))||d.getMinutes()!==Number(s.time.slice(3))) throw new Error('Diese lokale Uhrzeit existiert nicht. Bitte Datum oder Uhrzeit ändern (Zeitumstellung).');
 return d;
}

export function shareHash(s){validate(s);return '#'+new URLSearchParams({v:'1',mode:s.mode,date:s.date,time:s.time,buffer:s.buffer,cycle:s.cycle});}
export function parseHash(hash,now=new Date()){
 try{
  const p=new URLSearchParams(hash.replace(/^#/,''));
  if(/^#sleep=\d{1,4}$/.test(hash)){
   const n=Number(p.get('sleep')); if(n>1439)return null;
   const time=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
   const d=new Date(now);if(new Date(`${dateKey(d)}T${time}`)<=now)d.setDate(d.getDate()+1);
   return {mode:'bed',time,date:dateKey(d),buffer:15,cycle:90};
  }
  if(p.get('v')!=='1'||!p.has('buffer')||!p.has('cycle'))return null;
  const s={mode:p.get('mode'),date:p.get('date'),time:p.get('time'),buffer:Number(p.get('buffer')),cycle:Number(p.get('cycle'))};
  validate(s);return s;
 }catch{return null;}
}

export function calendar(r,title='Nachtplan – Zeit im Bett',now=new Date()){
 const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const escape=s=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nachtplan//Sleep planner//DE','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${+r.bed}-${r.cycles}@sleep.logge.top`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(r.bed)}`,`DTEND:${stamp(r.wake)}`,`SUMMARY:${escape(title)}`,`DESCRIPTION:${escape(`Ungefähre Planung: ${r.sleepMinutes} Minuten Schlaf und ${r.bedMinutes-r.sleepMinutes} Minuten Einschlafzeit. Kein Wecker oder medizinischer Rat.`)}`,'END:VEVENT','END:VCALENDAR'];
 return lines.map(line=>{let out='',bytes=0;for(const ch of line){const n=new TextEncoder().encode(ch).length;if(bytes+n>75){out+='\r\n ';bytes=1;}out+=ch;bytes+=n;}return out;}).join('\r\n')+'\r\n';
}

export function preferences(raw,fallback){try{const p=JSON.parse(raw);const s={mode:p.mode,time:p.time,buffer:p.buffer,cycle:p.cycle,date:fallback.date};validate(s);return s;}catch{return {...fallback};}}
export function countdown(target,now=new Date()){
 const delta=target-now,n=Math.ceil(Math.abs(delta)/60000),h=Math.floor(n/60),m=n%60;
 const duration=h?`${h} Std. ${m} Min.`:`${n} Min.`;
 return delta<0?`Seit ${duration} vorbei`:`Noch ${duration}`;
}
