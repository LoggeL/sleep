import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './core.js';
test('wake target yields chronological bedtimes with separate sleep and buffer',()=>{
 const rows=core.calculate({mode:'wake',time:'07:00',date:'2026-11-03',buffer:15,cycle:90},new Date('2026-11-02T12:00:00+01:00'));
 assert.deepEqual(rows.map(r=>r.cycles),[6,5,4,3]);
 assert.equal(rows[0].bed.toISOString(),'2026-11-02T20:45:00.000Z');
 assert.equal(rows[1].sleepMinutes,450); assert.equal(rows[1].bedMinutes,465);
});
test('bed and now modes cross midnight using elapsed minutes',()=>{
 const s={mode:'bed',time:'23:00',date:'2026-11-02',buffer:15,cycle:90};
 const rows=core.calculate(s); assert.deepEqual(rows.map(r=>r.cycles),[3,4,5,6]);
 assert.equal(rows[1].wake.toISOString(),'2026-11-03T04:15:00.000Z');
 const now=new Date('2026-11-02T23:59:00+01:00');
 assert.equal(+core.calculate({...s,mode:'now'},now)[0].bed,+now);
});

test('invalid inputs and nonexistent DST wall times rejected',()=>{
 const good={mode:'wake',date:'2026-11-03',time:'07:00',buffer:15,cycle:90};
 for(const bad of [{time:'24:00'},{time:'<img>'},{date:'2026-02-30'},{cycle:69},{cycle:121},{buffer:-1},{buffer:61},{mode:'bad'},{date:'2026-03-29',time:'02:30'}]) assert.throws(()=>core.calculate({...good,...bad}));
});

test('share codec validates all input and preserves exact date',()=>{
 const s={mode:'bed',date:'2026-11-03',time:'23:36',buffer:20,cycle:95};
 assert.deepEqual(core.parseHash(core.shareHash(s)),s);
 assert.equal(core.parseHash('#mode=bed&time=%3Cscript%3E'),null);
 assert.equal(core.parseHash('#v=1&mode=wake&date=2026-11-03&time=07:00&buffer=15&cycle=999'),null);
 assert.equal(core.parseHash('#sleep=36',new Date('2026-11-02T12:00:00+01:00')).time,'00:36');
});

test('calendar exports UTC instants and escapes untrusted text',()=>{
 const r=core.calculate({mode:'bed',date:'2026-10-24',time:'23:00',buffer:15,cycle:90})[3];
 const ics=core.calendar(r,'Nacht, ruhig; gut\nEND:VEVENT',new Date('2026-01-01T00:00:00Z'));
 assert.match(ics,/DTSTART:20261024T210000Z/);assert.match(ics,/DTEND:20261025T061500Z/);
 assert.ok(ics.includes('SUMMARY:Nacht\\, ruhig\\; gut\\nEND:VEVENT'));
 assert.equal(ics.split('\r\n').filter(l=>l==='END:VEVENT').length,1);
});
test('spring DST elapsed sleep is not wall-clock subtraction',()=>{
 const r=core.calculate({mode:'bed',date:'2026-03-28',time:'23:00',buffer:15,cycle:90})[3];
 assert.equal(r.wake.getHours(),9); assert.equal((r.wake-r.sleep)/60000,540);
});
test('fall repeated hour picks earlier occurrence, sleep duration remains exact',()=>{
 const r=core.calculate({mode:'wake',date:'2026-10-25',time:'02:30',buffer:15,cycle:90})[0];
 assert.equal(r.wake.toISOString(),'2026-10-25T00:30:00.000Z');assert.equal((r.wake-r.sleep)/60000,540);
});

test('local preferences reject malformed storage and never restore stale dates',()=>{
 const fallback={mode:'wake',time:'07:00',date:'2026-11-03',buffer:15,cycle:90};
 assert.deepEqual(core.preferences('{oops',fallback),fallback);
 assert.deepEqual(core.preferences('{"mode":"hack","time":"07:00","buffer":15,"cycle":90}',fallback),fallback);
 assert.equal(core.preferences('{"mode":"bed","time":"23:00","date":"2020-01-01","buffer":10,"cycle":95}',fallback).date,fallback.date);
});
test('countdown uses absolute time and marks past bedtimes',()=>{
 assert.equal(core.countdown(new Date(1000),new Date(61000)),'Seit 1 Min. vorbei');
 assert.equal(core.countdown(new Date(7261000),new Date(1000)),'Noch 2 Std. 1 Min.');
});
