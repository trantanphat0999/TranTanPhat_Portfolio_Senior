import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureItemIds,validateItem,clone,safeUrl} from '../js/admin/data-model.js';
import * as cache from '../js/local-portfolio-cache.js';
function storage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('stable IDs survive reordered and edited drafts',()=>{
  const data=ensureItemIds({items:[{title:'A'},{title:'B'}]});
  const ids=data.items.map(x=>x._id);data.items.reverse();data.items[0].title='Changed';
  assert.deepEqual(ensureItemIds(data).items.map(x=>x._id),ids.reverse());
  assert.deepEqual(ensureItemIds({items:[{title:'A'},{title:'B'}]}).items.map(x=>x._id),ids.reverse());
});
test('new items require meaningful fields and unique modal IDs',()=>{
  assert.throws(()=>validateItem('education',{title:'',issuer:'Google'},[],{newItem:true}));
  assert.throws(()=>validateItem('summary',{title:'',description:''},[],{newItem:true}));
  assert.throws(()=>validateItem('projects',{_id:'new',title:'B',modalId:'existing'},[{_id:'old',modalId:'existing'}],{newItem:true}));
  assert.match(validateItem('projects',{_id:'abc',title:'A'},[],{newItem:true}).modalId,/^project-/);
  assert.equal(safeUrl('javascript:alert(1)'), '');
});
test('pending edits survive server cache refresh and later queue removal is versioned',async()=>{
  globalThis.window={localStorage:storage()};
  cache.queuePendingPortfolioWrite('header',{name:'Pending',_revision:2});
  const first=cache.readPendingPortfolioWrites()[0];
  cache.replaceLocalPortfolioCache({header:{name:'Server',_revision:2}});
  assert.equal((await cache.readLocalPortfolioCache()).header.name,'Pending');
  cache.queuePendingPortfolioWrite('header',{name:'Newer',_revision:2});
  cache.clearPendingPortfolioWrite('header',first.queuedAt);
  assert.equal(cache.readPendingPortfolioWrites().length,1);
});
test('storage failure is observable, not a successful offline save',()=>{
  globalThis.window={localStorage:{getItem:()=>null,setItem:()=>{throw new Error('quota');},removeItem:()=>{}}};
  assert.throws(()=>cache.queuePendingPortfolioWrite('header',{name:'Not saved'}),/unavailable|full/);
});
