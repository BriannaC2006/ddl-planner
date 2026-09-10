import test from 'node:test';
import assert from 'node:assert/strict';
import {generateOccurrences,createSeries,updateSeries,deleteOccurrences,duplicateNextWeek} from '../lib/recurrence.ts';
import {completeAssignment,restoreAssignment} from '../lib/completion.ts';
const a={id:'a',title:'Friday HW',courseId:'c',dueDate:new Date(2027,0,1,17).toISOString(),priority:'High',estimatedMinutes:120,type:'Homework',progress:0,status:'Not Started',createdAt:'2026-09-09T00:00:00Z',updatedAt:'2026-09-09T00:00:00Z'};
const rule={frequency:'weekly',unit:'week',interval:1,weekdays:[5],count:6};
const data=()=>createSeries({courses:[{id:'c',name:'Math'}],assignments:[]},a,rule,'series');
const clock=new Date(2026,8,9);
test('six independent Fridays, stable persisted identities and workload',()=>{
 const d=data();assert.equal(d.assignments.length,6);assert.equal(new Set(d.assignments.map(a=>a.id)).size,6);
 d.assignments.forEach(a=>{assert.equal(new Date(a.dueDate).getDay(),5);assert.equal(new Date(a.dueDate).getHours(),17)});
 d.assignments[0]=completeAssignment(d.assignments[0]);assert(d.assignments.slice(1).every(a=>a.status==='Not Started'));
 assert.equal(d.assignments.filter(a=>a.status!=='Completed').reduce((n,a)=>n+a.estimatedMinutes,0),600);
 const restored=restoreAssignment(d.assignments[0]);assert.equal(restored.progress,0);assert.equal(restored.recurrenceSeriesId,'series');
 assert.deepEqual(JSON.parse(JSON.stringify(d)),JSON.parse(JSON.stringify(JSON.parse(JSON.stringify(d)))));
});
test('one exception stays connected; future content edit leaves earlier records byte-for-byte unchanged',()=>{
 let d=data();d.assignments[0]=completeAssignment(d.assignments[0]);
 d=updateSeries(d,{...d.assignments[1],title:'Exception',progress:20,status:'In Progress'},'one',rule,clock);
 assert.equal(d.assignments[1].recurrenceException,true);assert.equal(d.assignments[2].title,'Friday HW');
 const before=JSON.stringify(d.assignments.slice(0,2));d=updateSeries(d,{...d.assignments[2],title:'New future title',priority:'Low'},'future',rule,clock);
 assert.equal(JSON.stringify(d.assignments.slice(0,2)),before);assert(d.assignments.slice(2).every(a=>a.title==='New future title'));
});
test('future schedule edit splits series; completed and historical progress survives whole-series edits',()=>{
 let d=data();d.assignments[0]=completeAssignment(d.assignments[0]);const past=JSON.stringify(d.assignments.slice(0,2));
 d=updateSeries(d,{...d.assignments[2],dueDate:new Date(2027,0,16,18).toISOString()},'future',{...rule,weekdays:[6],count:4},clock);
 assert.equal(JSON.stringify(d.assignments.slice(0,2)),past);assert.equal(d.assignments.length,6);assert.equal(new Date(d.assignments[2].dueDate).getDay(),6);
 let x=data();x.assignments[0]=completeAssignment(x.assignments[0]);x.assignments[1].progress=20;x.assignments[1].status='In Progress';
 x=updateSeries(x,{...x.assignments[2],dueDate:new Date(2027,0,16,18).toISOString()},'all',{...rule,weekdays:[6]},new Date(2027,0,10));
 assert.equal(x.assignments.find(a=>a.id==='series:0').status,'Completed');assert.equal(x.assignments.find(a=>a.id==='series:1').progress,20);
});
test('single and future deletion do not resurrect after rule edits or reload',()=>{
 let d=data();d=deleteOccurrences(d,d.assignments[1],'one');assert.equal(d.assignments.length,5);
 d=updateSeries(d,{...d.assignments[0],dueDate:new Date(2027,0,2,17).toISOString()},'all',{...rule,weekdays:[6]},clock);
 assert.equal(d.assignments.length,5);assert(!d.assignments.some(a=>a.id==='series:1'));
 d=deleteOccurrences(d,d.assignments.find(a=>a.occurrenceIndex===3),'future');assert.equal(d.assignments.length,2);
 assert.equal(JSON.parse(JSON.stringify(d)).assignments.length,2);
 d=deleteOccurrences(d,d.assignments[0],'all');assert.equal(d.assignments.length,0);assert.equal(d.recurrenceSeries.length,0);
});
test('multiple weekdays, alternate weeks, leap year, year rollover, DST wall time',()=>{
 const multi=generateOccurrences(new Date(2027,0,4,17).toISOString(),{...rule,weekdays:[2,4],count:6});
 assert.deepEqual(multi.map(d=>new Date(d).getDay()),[2,4,2,4,2,4]);
 const leap=generateOccurrences(new Date(2028,1,28,17).toISOString(),{frequency:'daily',unit:'day',interval:1,weekdays:[],count:3});assert.equal(new Date(leap[1]).getDate(),29);assert.equal(new Date(leap[2]).getMonth(),2);
 const year=generateOccurrences(new Date(2027,11,31,17).toISOString(),{...rule,unit:'day',interval:1,count:2});assert.equal(new Date(year[1]).getFullYear(),2028);
 const dst=generateOccurrences(new Date(2027,2,7,17).toISOString(),{...rule,weekdays:[0],count:3});assert(dst.every(d=>new Date(d).getHours()===17));
 const bi=generateOccurrences(a.dueDate,{...rule,interval:2,count:2});assert.equal(new Date(bi[1]).getDate(),15);
});
test('bounded validation and end date before next matching day',()=>{
 assert.throws(()=>generateOccurrences(a.dueDate,{...rule,count:0}));assert.throws(()=>generateOccurrences(a.dueDate,{...rule,count:1000}));
 assert.throws(()=>generateOccurrences(a.dueDate,{...rule,count:undefined,endDate:'2026-12-31'}));
 assert.throws(()=>generateOccurrences(a.dueDate,{...rule,weekdays:[1],count:undefined,endDate:'2027-01-02'}));
 assert.equal(generateOccurrences(a.dueDate,{...rule,count:undefined,endDate:'2027-01-08'}).length,2);
});
test('duplicate is normal independent next local week; legacy data remains valid',()=>{
 const original=completeAssignment(data().assignments[0]);const copy=duplicateNextWeek(original,'copy');assert.equal(copy.status,'Not Started');assert.equal(copy.progress,0);assert.equal(copy.recurrenceSeriesId,undefined);assert.equal(copy.completedAt,undefined);assert.equal(new Date(copy.dueDate).getDate(),8);
 assert.equal(copy.title,original.title);assert.equal(copy.estimatedMinutes,original.estimatedMinutes);
 const legacy={courses:[],assignments:[a]};assert.equal(updateSeries(legacy,{...a,title:'Legacy edit'},'one',undefined).assignments[0].title,'Legacy edit');
});
test('conversion preserves existing completion; a second edit after splitting cannot duplicate protected occurrences',()=>{
 const completed=completeAssignment(a);let d=createSeries({courses:[{id:'c',name:'Math'}],assignments:[completed]},completed,rule,'convert');assert.equal(d.assignments[0].id,'a');assert.equal(d.assignments[0].completedAt,completed.completedAt);assert(d.assignments.slice(1).every(x=>x.progress===0));
 d=data();d.assignments[3]=completeAssignment(d.assignments[3]);const futureRule={...rule,count:4,weekdays:[6]};d=updateSeries(d,{...d.assignments[2],dueDate:new Date(2027,0,16,17).toISOString()},'future',futureRule,clock);
 const future=d.assignments.find(x=>x.title==='Friday HW'&&x.recurrenceSeriesId!=='series');
 d=updateSeries(d,{...future,dueDate:new Date(2027,0,17,17).toISOString()},'all',{...futureRule,weekdays:[0]},clock);
 assert.equal(d.assignments.length,6);assert.equal(new Set(d.assignments.map(x=>x.id)).size,6);assert.equal(d.assignments.filter(x=>x.status==='Completed').length,1);
 const original=d.assignments.find(x=>x.id==='series:0');const earlierRule=d.recurrenceSeries.find(s=>s.id==='series').rule;
 d=updateSeries(d,{...original,title:'Earlier only'},'all',earlierRule,clock);assert.equal(d.assignments.length,6);
});
test('bulk completion captures each occurrence own previous progress',()=>{
 let d=data();d.assignments[1]={...d.assignments[1],status:'In Progress',progress:20};d=updateSeries(d,completeAssignment(d.assignments[0]),'all',rule,clock);assert.equal(d.assignments[1].previousProgress,20);assert.equal(restoreAssignment(d.assignments[1]).progress,20);
});
