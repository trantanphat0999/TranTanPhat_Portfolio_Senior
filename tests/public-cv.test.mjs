import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCvFields, applyOverrides } from '../js/cv/model.js';
import { summarizePublicCv } from '../js/cv/public-summary.js';
import { definition } from '../js/cv/pdf.js';
import { getSeedPortfolioData } from '../js/db-seed.js';

test('Public summary retains core sections and contact links without mutating source',async()=>{
  const fields=await buildCvFields(getSeedPortfolioData()),before=JSON.stringify(fields);
  const summary=summarizePublicCv(fields);
  for(const key of ['name','role','contact.email','contact.phone']){
    assert.equal(summary.find(x=>x.key===key).text,fields.find(x=>x.key===key).text);
    assert.equal(summary.find(x=>x.key===key).link,fields.find(x=>x.key===key).link);
  }
  for(const section of ['Professional Experience','Technical Skills','Key Projects','Education','Certifications'])assert.ok(summary.some(x=>x.section===section));
  assert.equal(JSON.stringify(fields),before);
  assert.ok(summary.length<fields.length);
  const compact=summarizePublicCv(fields,3);
  assert.ok(compact.reduce((n,x)=>n+x.text.length,0)<summary.reduce((n,x)=>n+x.text.length,0));
});

test('Summary uses valid published wording and prioritizes measurable job outcomes',async()=>{
  const fields=await buildCvFields(getSeedPortfolioData());
  const customized=applyOverrides(fields,{summary:'Published summary'}, {summary:fields.find(x=>x.key==='summary').text});
  assert.equal(summarizePublicCv(customized).find(x=>x.key==='summary').text,'Published summary');
  const group=fields.find(x=>x.key.startsWith('job.')).group;
  const fixture=fields.filter(x=>x.group!==group||x.kind!=='bullet');
  fixture.push({key:group+'.generic',group,section:'Professional Experience',kind:'bullet',text:'Reviewed tests.'},
    {key:group+'.measured',group,section:'Professional Experience',kind:'bullet',text:'Reduced regressions by 40%.'});
  const compact=summarizePublicCv(fixture,3);
  assert.ok(compact.some(x=>x.key===group+'.measured'));
  assert.ok(!compact.some(x=>x.key===group+'.generic'));
});

test('PDF centers identity and contact rows while retaining left aligned body content',async()=>{
  const doc=definition(summarizePublicCv(await buildCvFields(getSeedPortfolioData())));
  assert.equal(doc.content[0].alignment,'center');
  assert.equal(doc.content[1].alignment,'center');
  for(const node of doc.content.slice(2,4))assert.equal(node.alignment,'center');
  assert.equal(doc.content.find(x=>x.text&&typeof x.text==='string'&&x.margin?.[1]===7).alignment,undefined);
});
