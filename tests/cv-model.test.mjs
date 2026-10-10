import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCvFields, applyOverrides, staleOverrides, selectedFields, applicationSelection } from '../js/cv/model.js';
import { getSeedPortfolioData } from '../js/db-seed.js';
import { ensureItemIds } from '../js/admin/data-model.js';

test('CV reads current portfolio directly and retains stable keys through edits, additions and deletion',async()=>{
  const source=ensureItemIds(getSeedPortfolioData());
  source.header.name='Trần Tấn Phát';source.summary.overview='Current summary';
  const first=await buildCvFields(source);
  assert.equal(first.find(x=>x.key==='summary').text,'Current summary');
  assert.match(first.find(x=>x.key.startsWith('job.')&&x.kind==='date').text,/Present/);
  source.projects.items[0].detailResults='UPDATED_RESULT';
  source.projects.items[0].detailResponsibilities='UPDATED_RESPONSIBILITY';
  source.education.certifications[0].title='UPDATED_CERTIFICATE';
  source.experience.jobs.reverse();
  const second=await buildCvFields(source);
  assert.ok(second.some(x=>x.text==='UPDATED_RESULT'));
  assert.ok(second.some(x=>x.text==='UPDATED_RESPONSIBILITY'));
  assert.ok(second.some(x=>x.text==='UPDATED_CERTIFICATE'));
  assert.deepEqual(first.filter(x=>x.key.startsWith('job.')).map(x=>x.key),second.filter(x=>x.key.startsWith('job.')).map(x=>x.key));
  source.education.certifications.splice(0,1);
  assert.ok(!(await buildCvFields(source)).some(x=>x.text==='UPDATED_CERTIFICATE'));
  source.projects.items[0].status='inactive';
  assert.ok(!(await buildCvFields(source)).some(x=>x.text==='UPDATED_RESULT'));
});
test('Custom CV text is invalidated when its portfolio source changes',()=>{
  const fields=[{key:'summary',text:'New source',kind:'summary'}];
  const overrides={summary:'Old custom'}, origins={summary:'Old source'};
  assert.deepEqual(staleOverrides(fields,overrides,origins),['summary']);
  assert.equal(applyOverrides(fields,overrides,origins)[0].text,'New source');
  assert.equal(applyOverrides(fields,overrides,{summary:'New source'})[0].text,'Old custom');
});
test('Experience is sorted by ending month within the same year',async()=>{
  const source=getSeedPortfolioData();
  source.experience.jobs=[{_id:'early',role:'Earlier',period:'Jan 2024 - Mar 2024'},{_id:'later',role:'Later',period:'Apr 2024 - Nov 2024'}];
  const fields=await buildCvFields(source);
  assert.equal(fields.find(x=>x.key.startsWith('job.')&&x.kind==='itemTitle').text,'Later');
});
test('CV selection is explicit, does not mutate portfolio, and does not orphan excluded record titles',async()=>{
  const source=getSeedPortfolioData(),before=JSON.stringify(source),fields=await buildCvFields(source);
  const selection=applicationSelection(fields),selected=selectedFields(fields,selection);
  assert.ok(selected.length<fields.length);
  assert.equal(JSON.stringify(source),before);
  assert.equal(new Set(selected.filter(x=>x.key.startsWith('cert.')).map(x=>x.group)).size,6);
  const title=selected.find(x=>x.kind==='itemTitle');
  assert.ok(!selectedFields(fields,{excluded:[title.key]}).some(x=>x.group===title.group));
});
