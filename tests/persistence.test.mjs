import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as cache from '../js/local-portfolio-cache.js';
const values=new Map();
globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},addEventListener(){},dispatchEvent(){}};
globalThis.localStorage=window.localStorage;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
globalThis.__remote=new Map([['portfolio/header',{name:'Initial',_revision:0}]]);
globalThis.__failure=null;
const cacheUrl=new URL('../js/local-portfolio-cache.js',import.meta.url).href;
const raw=await readFile(new URL('../js/firebase-config.js',import.meta.url),'utf8');
const stripped=raw.replace(/import\s+(?:\{[\s\S]*?\}|\*[^;]*?)\s+from\s+["'][^"']+["'];?/g,'').replace(/import\('([^']+)'\)/g,(match,path)=>path.startsWith('./')?`import(${JSON.stringify(new URL('../js/'+path.slice(2),import.meta.url).href)})`:match);
const stubs=`import * as cache from ${JSON.stringify(cacheUrl)};
const {clearAllPendingPortfolioWrites,clearPendingPortfolioWrite,queuePendingPortfolioWrite,readLocalPortfolioCache,readLocalPortfolioDoc,readPendingPortfolioWrites,replaceLocalPortfolioCache,updateLocalPortfolioDoc}=cache;
const initializeApp=()=>({}),getFirestore=()=>({}),getAuth=()=>({currentUser:{email:'trantanphat190999@gmail.com'}}),onAuthStateChanged=()=>{};
const doc=(_db,...parts)=>parts.join('/'),collection=(_db,key)=>key;
const getDoc=async key=>({exists:()=>__remote.has(key),data:()=>structuredClone(__remote.get(key))});
const getDocs=async key=>({forEach:callback=>{for(const [path,data] of __remote)if(path.startsWith(key+'/'))callback({id:path.split('/')[1],data:()=>structuredClone(data)});}});
const setDoc=async(key,data)=>__remote.set(key,structuredClone(data)),updateDoc=()=>{},signInWithEmailAndPassword=()=>{},firebaseSignOut=()=>{},sendPasswordResetEmail=()=>{};
const runTransaction=async(_db,callback)=>{if(__failure)throw Object.assign(new Error(__failure),{code:__failure});const staged=[];const result=await callback({get:getDoc,set:(key,data)=>staged.push([key,structuredClone(data)])});for(const [key,data] of staged)__remote.set(key,data);return result;};
`;
const api=await import('data:text/javascript;base64,'+Buffer.from(stubs+stripped.replace('function releaseStore(){','export function releaseStore(){')).toString('base64'));
test('writes atomically update revision and metadata; stale writes are rejected',async()=>{
  const result=await api.writePortfolioDoc('header',{name:'Saved',_revision:0});
  assert.equal(result.status,'synced');assert.equal(__remote.get('portfolio/header')._revision,1);assert.equal(__remote.get('portfolio/metadata').lastUpdatedSection,'header');
  await assert.rejects(api.writePortfolioDoc('header',{name:'Stale',_revision:0}),/another tab/);
  assert.equal(__remote.get('portfolio/header').name,'Saved');assert.equal(cache.readPendingPortfolioWrites().length,0);
});
test('permission errors are not queued as offline success',async()=>{
  globalThis.__failure='permission-denied';
  await assert.rejects(api.writePortfolioDoc('header',{name:'Rejected',_revision:1}),/permission-denied/);
  assert.equal(cache.readPendingPortfolioWrites().length,0);globalThis.__failure=null;
});
test('offline saves remain durable and reconnect preserves newer mutations',async()=>{
  navigator.onLine=false;
  assert.equal((await api.writePortfolioDoc('header',{name:'Offline',_revision:1})).status,'pending');
  cache.replaceLocalPortfolioCache({header:{name:'Old server',_revision:1}});
  assert.equal((await cache.readLocalPortfolioCache()).header.name,'Offline');
  navigator.onLine=true;
  await api.writePortfolioDoc('header',{name:'Newer',_revision:1});
  assert.equal(__remote.get('portfolio/header').name,'Newer');assert.equal(__remote.get('portfolio/header')._revision,3);assert.equal(cache.readPendingPortfolioWrites().length,0);
});
test('offline conflicts retain the pending copy until an explicit resolution',async()=>{
  navigator.onLine=false;await api.writePortfolioDoc('header',{name:'Queued conflict',_revision:3});navigator.onLine=true;
  __remote.set('portfolio/header',{name:'Other tab',_revision:4});
  await assert.rejects(api.flushPendingPortfolioWrites(),/another tab/);
  assert.equal(cache.readPendingPortfolioWrites().length,1);
  await api.resolvePendingPortfolioWrite('header','overwrite');
  assert.equal(__remote.get('portfolio/header').name,'Queued conflict');assert.equal(__remote.get('portfolio/header')._revision,5);assert.equal(cache.readPendingPortfolioWrites().length,0);
});
test('storage quota failure does not claim an offline save',async()=>{
  navigator.onLine=false;const original=window.localStorage.setItem;window.localStorage.setItem=()=>{throw new Error('quota');};
  await assert.rejects(api.writePortfolioDoc('header',{name:'Not durable',_revision:5}),/unavailable|full/);
  window.localStorage.setItem=original;navigator.onLine=true;
});

test('official CV bypasses pending writes and refuses offline publication',async()=>{
  const official={version:4,_revision:1,fields:[{key:'name',text:'Official owner'}]};
  __remote.set('portfolio/cv',official);
  cache.queuePendingPortfolioWrite('cv',{version:4,_revision:1,fields:[{key:'name',text:'Pending draft'}]});
  assert.equal((await api.readOfficialCv()).fields[0].text,'Official owner');
  await assert.rejects(api.writeOfficialCv({...official}),/previous CV sync/);
  cache.clearPendingPortfolioWrite('cv');
  navigator.onLine=false;
  await assert.rejects(api.writeOfficialCv({...official}),/offline/);
  assert.equal(cache.readPendingPortfolioWrites().length,0);
  assert.equal(__remote.get('portfolio/cv').fields[0].text,'Official owner');
  navigator.onLine=true;
  const saved=await api.writeOfficialCv({...official,fields:[{key:'name',text:'Updated official'}]});
  assert.equal(saved.data._revision,2);assert.equal(saved.synced,true);
  await assert.rejects(api.writeOfficialCv({...official}),/another tab/);
});


test('private documents use online revisions and never enter the public cache or pending queue',async()=>{
 navigator.onLine=true;const result=await api.writeAdminDoc('context-library',{version:1,_revision:0,items:[{id:'context-1',text:'PRIVATE_EVIDENCE'}]});assert.equal(result.data._revision,1);assert.equal((await api.readAdminDoc('context-library')).items[0].text,'PRIVATE_EVIDENCE');await assert.rejects(api.writeAdminDoc('context-library',{_revision:0,items:[]}),/another tab/);assert.ok(!JSON.stringify(await cache.readLocalPortfolioCache()).includes('PRIVATE_EVIDENCE'));navigator.onLine=false;await assert.rejects(api.writeAdminDoc('context-library',result.data),/Offline/);navigator.onLine=true;assert.equal(cache.readPendingPortfolioWrites().length,0);
});

test('career migration commits private facts and IDs atomically; rejects changed source or stale facts',async()=>{
 const {migrateCareer}=await import('../js/career/model.js');const source={header:{name:'Owner'},experience:{jobs:[{company:'Company',role:'QA',period:'2021 - Present',highlights:[]}]},skills:{categories:[]},projects:{items:[]},achievements:{items:[]},education:{certifications:[]}};
 for(const [key,value] of Object.entries(source))__remote.set('portfolio/'+key,structuredClone(value));
 __remote.delete('admin/career-data');const proposal=migrateCareer(source);const saved=await api.commitCareerMigration(source,proposal.library);assert.equal(saved.data._revision,1);assert.ok(__remote.get('portfolio/experience').jobs[0]._id);assert.equal(__remote.get('portfolio/experience').jobs[0].role,'QA');assert.ok(!JSON.stringify(await cache.readLocalPortfolioCache()).includes('evidenceIds'));
 await assert.rejects(api.commitCareerMigration(source,proposal.library),/Career data changed/);
 const current=Object.fromEntries(Object.keys(source).map(key=>[key,structuredClone(__remote.get('portfolio/'+key))])),fresh=migrateCareer(current,saved.data);__remote.get('portfolio/experience').jobs[0].role='Concurrent edit';await assert.rejects(api.commitCareerMigration(current,fresh.library),/Source changed/);assert.equal(__remote.get('admin/career-data')._revision,1);
});
test('a frozen official pointer cannot be replaced by legacy save paths',async()=>{
 __remote.set('portfolio/cv',{releaseVersion:1,_revision:5,artifact:{hash:'frozen'}});await assert.rejects(api.writeOfficialCv({version:4,_revision:5}),/frozen/);await assert.rejects(api.writePortfolioDoc('cv',{version:4,_revision:5}),/frozen/);assert.equal(__remote.get('portfolio/cv')._revision,5);
});
test('release activation rejects changed facts and CV revision; history stays immutable on rollback',async()=>{
 const {emptyCareer}=await import('../js/career/model.js');__remote.set('admin/career-data',{...emptyCareer(),_revision:2});__remote.set('portfolio/cv',{_revision:1});const store=api.releaseStore(),id='11111111-1111-4111-a111-111111111111',release={releaseVersion:1,releaseId:id,fields:[{key:'name',text:'Owner'}],artifact:{hash:'a'.repeat(64)}};
 await assert.rejects(store.activate(release,1,{create:true,expectedCareerRevision:1}),/facts changed/);assert.ok(!__remote.has('cv-releases/'+id));assert.equal(__remote.get('portfolio/cv')._revision,1);
 const saved=await store.activate(release,1,{create:true,expectedCareerRevision:2});assert.equal(saved._revision,2);const history=structuredClone(__remote.get('cv-releases/'+id));await assert.rejects(store.activate(release,1,{create:false}),/Official CV changed/);await store.activate(release,2,{create:false});assert.deepEqual(__remote.get('cv-releases/'+id),history);assert.equal(__remote.get('portfolio/cv')._revision,3);
});
