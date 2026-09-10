import test from 'node:test';
import assert from 'node:assert/strict';
import {t,getLanguage,setLanguage,initializeLanguage,LANGUAGE_KEY} from '../lib/i18n.ts';
import {dateLabel,relativeDate} from '../lib/dates.ts';
const entries=new Map([['ddl-planner-v1','original user data']]);
globalThis.localStorage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};
globalThis.document={documentElement:{lang:''}};
test('language defaults to Chinese, persists English separately, translates dates without touching planner content',()=>{
 initializeLanguage();assert.equal(getLanguage(),'zh-CN');assert.equal(t('添加作业'),'添加作业');
 const now=new Date(2027,0,1,10),due=new Date(2027,0,4,17).toISOString();assert.equal(relativeDate(due,now),'还有 3 天');
 setLanguage('en');assert.equal(t('添加作业'),'Add Assignment');assert.equal(t('每周'),'Weekly');assert.equal(t('Completed'),'Completed');assert.equal(t('已完成「{0}」',{'0':'Problem Set 3'}),'Completed “Problem Set 3”');
 assert.equal(relativeDate(due,now),'3 days left');assert.match(dateLabel(due),/Jan/);assert.equal(entries.get(LANGUAGE_KEY),'en');
 initializeLanguage();assert.equal(getLanguage(),'en');assert.equal(entries.get('ddl-planner-v1'),'original user data');
 setLanguage('zh-CN');assert.equal(t('每周'),'每周');assert.match(dateLabel(due),/月/);assert.equal(entries.get('ddl-planner-v1'),'original user data');
});
