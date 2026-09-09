import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completeAssignment,restoreAssignment,changeStatus,COMPLETION_DELAY} from '../lib/completion.ts';
import {storage,STORAGE_KEY} from '../lib/storage.ts';
import {filterAssignments} from '../lib/assignment-filters.ts';
const old={id:'legacy-id',title:'Physics Homework 3',description:'Keep this note',courseId:'physics',dueDate:'2026-09-12T23:59:00.000Z',priority:'High',estimatedMinutes:120,type:'Homework',status:'In Progress',progress:40,createdAt:'2026-08-01T12:00:00.000Z',updatedAt:'2026-08-02T12:00:00.000Z'};
const now='2026-09-08T14:00:00.000Z';
const course={id:'physics',name:'Physics',code:'PHYS 51',color:'#123456',createdAt:old.createdAt};
const filters={status:'all',course:'all',priority:'all',search:'',sort:'Deadline'};
test('completion preserves identity, content, previous state and progress; restoration survives JSON round trip',()=>{
 const done=completeAssignment(old,now);
 assert.equal(done.id,old.id);assert.equal(done.title,old.title);assert.equal(done.description,old.description);assert.equal(done.dueDate,old.dueDate);
 assert.equal(done.status,'Completed');assert.equal(done.progress,100);assert.equal(done.previousStatus,'In Progress');assert.equal(done.previousProgress,40);assert.equal(done.completedAt,now);
 const restored=restoreAssignment(JSON.parse(JSON.stringify(done)),now);
 assert.equal(restored.status,'In Progress');assert.equal(restored.progress,40);assert.equal(restored.completedAt,undefined);
 assert.equal(old.status,'In Progress');assert.equal(old.progress,40);
 assert.equal(completeAssignment(done,now),done);
 assert.deepEqual(restoreAssignment(completeAssignment(restored,now),now),restored);
});
test('old completed records restore safely without optional fields or fabricated completion date',()=>{
 const legacy={...old,status:'Completed',progress:100};
 assert.equal(restoreAssignment(legacy).status,'Not Started');assert.equal(restoreAssignment(legacy).progress,0);assert.equal(legacy.completedAt,undefined);
});
test('status editor shares completion metadata and restores prior progress',()=>{
 const done=changeStatus(old,'Completed');assert.equal(done.previousStatus,'In Progress');assert.equal(done.previousProgress,40);
 const restored=changeStatus(done,'In Progress');assert.equal(restored.progress,40);assert.equal(restored.completedAt,undefined);
 const initial={...old,status:'Not Started',progress:0};assert.equal(restoreAssignment(completeAssignment(initial)).status,'Not Started');
});
test('existing localStorage payload is loaded without migration loss or key changes',()=>{
 let raw=JSON.stringify({courses:[course],assignments:[old,{...old,id:'legacy-completed',status:'Completed',progress:100}],extra:'preserved'});
 const original=raw;let writes=0;
 globalThis.localStorage={getItem:key=>{assert.equal(key,'ddl-planner-v1');return raw},setItem:(key,value)=>{assert.equal(key,'ddl-planner-v1');raw=value;writes++}};
 const loaded=storage.load();assert.equal(STORAGE_KEY,'ddl-planner-v1');assert.equal(raw,original);assert.equal(writes,0);assert.deepEqual(loaded.assignments[0],old);
 storage.save({...loaded,assignments:loaded.assignments.map(a=>a.id===old.id?completeAssignment(a,now):a)});
 const reloaded=storage.load();assert.equal(reloaded.assignments.length,2);assert.deepEqual(reloaded.courses,[course]);assert.equal(reloaded.extra,'preserved');assert.equal(reloaded.assignments[1].completedAt,undefined);assert.equal(restoreAssignment(reloaded.assignments[0]).progress,40);
});
test('completed tasks remain searchable by title, course name and course code',()=>{
 const done=completeAssignment(old,now);const active={...old,id:'another',title:'数学作业',courseId:'math'};
 for(const search of ['Physics Homework','physics','PHYS 51'])assert.deepEqual(filterAssignments([active,done],[course],{...filters,status:'Completed',search}),[done]);
 assert.deepEqual(filterAssignments([done],[course],{...filters,status:'active'}),[]);
 assert.deepEqual(filterAssignments([restoreAssignment(done)],[course],{...filters,status:'In Progress',course:'physics',priority:'High'}).map(a=>a.id),[old.id]);
 assert.deepEqual(filterAssignments([done],[course],{...filters,search:'不存在'}),[]);
});
test('sort options order deadline, priority and creation time',()=>{
 const a={...old,id:'a',priority:'Low',dueDate:'2026-10-01',createdAt:'2026-09-02'};const b={...old,id:'b',priority:'High',dueDate:'2026-09-01',createdAt:'2026-09-01'};
 assert.deepEqual(filterAssignments([a,b],[course],filters).map(a=>a.id),['b','a']);
 assert.deepEqual(filterAssignments([a,b],[course],{...filters,sort:'Priority'}).map(a=>a.id),['b','a']);
 assert.deepEqual(filterAssignments([a,b],[course],{...filters,sort:'Recently created'}).map(a=>a.id),['a','b']);
 assert.ok(COMPLETION_DELAY>=300&&COMPLETION_DELAY<=500);
});
