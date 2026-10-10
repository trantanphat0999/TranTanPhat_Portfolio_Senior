import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePublicCv,officialCvSnapshot} from '../js/cv/service.js';
import {cvChanges} from '../js/cv/fit.js';

const fields=[{key:'name',section:'Header',kind:'name',text:'Trần Tấn Phát'},{key:'summary',section:'Header',kind:'summary',text:'Owner-approved AI wording',custom:true,brief:'Must not replace custom wording'}];
const style={fontFamily:'Roboto',fontSize:10.5,lineHeight:1.2,pageLimit:2};
test('Official snapshot preserves approved wording and effective style after portfolio changes',async()=>{
  const result={fits:true,pages:2,pageLimit:2,effectiveStyle:{...style,fontSize:10,lineHeight:1.12,margin:36.85}};
  const snapshot=await officialCvSnapshot(fields,result,style,7);
  const resolved=await resolvePublicCv({cv:snapshot,summary:{overview:'Changed source'},header:{name:'Different name'}});
  assert.deepEqual(resolved.fields.map(value=>value.text),fields.map(value=>value.text));
  assert.equal(resolved.style.fontSize,10);assert.equal(resolved.style.margin,36.85);assert.equal(resolved.style.locked,true);
  assert.equal(snapshot._revision,7);assert.equal(snapshot.pageCount,2);assert.equal(snapshot.autoSync,false);
  assert.equal(snapshot.fields[1].brief,undefined);assert.equal(snapshot.fields[1].custom,undefined);
});
test('Official snapshot cannot save a PDF exceeding the target and hashes links/order/style',async()=>{
  await assert.rejects(officialCvSnapshot(fields,{fits:false},style),/must fit/);
  const result={fits:true,pages:1,pageLimit:2,effectiveStyle:{...style,margin:45.35}};
  const first=await officialCvSnapshot(fields,result,style);
  const same=await officialCvSnapshot(fields,result,style,20);
  assert.equal(first.contentHash,same.contentHash);
  const changed=await officialCvSnapshot([...fields,{key:'contact.email',section:'Header',kind:'contact',text:'phat@example.test',link:'mailto:phat@example.test'}],result,style);
  assert.notEqual(first.contentHash,changed.contentHash);
});
test('Fit diff reports every excluded/shortened field without mutating its inputs',()=>{
  const before=structuredClone(fields),after=[fields[0],{...fields[1],text:'Shorter'}];
  assert.deepEqual(cvChanges(fields,after),[{key:'summary',section:'Header',before:'Owner-approved AI wording',after:'Shorter',action:'shorten'}]);
  assert.equal(cvChanges(fields,[fields[0]])[0].action,'exclude');
  assert.deepEqual(fields,before);
});
