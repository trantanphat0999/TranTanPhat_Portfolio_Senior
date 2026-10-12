import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyPortfolio,validatePortfolio,validateOriginal,importProposal,PROFILE_SECTIONS} from '../js/portfolio/profile-model.js';
import {createProfileRepository} from '../js/portfolio/profile-repository.js';
import {applyProfileVisuals,illustrationSvg} from '../js/portfolio/profile-visuals.js';
import {parseStructured} from '../js/ai/tasks.js';
import {getSeedPortfolioData} from '../js/db-seed.js';
import {extractCvFile,inspectDocxBuffer,MAX_CV_BYTES} from '../js/admin/cv-import-file.js';

const source='Nguyễn An\nProduct Designer\nStudio One\n2024 – Present\nProduct design and research\nFigma\nan@example.com';
function portfolio(){const data=emptyPortfolio();data.header={...data.header,name:'Nguyễn An',title:'Product Designer',email:'an@example.com'};data.summary.overview='Product design and research';return data;}
const output=data=>({portfolioJson:JSON.stringify(data),industry:'Product design',visualTheme:'design',summary:'Ready for review',warnings:[],generatedFields:[]});
test('file validation rejects oversized, unsupported, malformed and cancelled inputs before parsing',async()=>{
  await assert.rejects(extractCvFile({name:'cv.pdf',size:MAX_CV_BYTES+1}),/10 MB/);
  await assert.rejects(extractCvFile({name:'cv.exe',size:20}),/Chỉ hỗ trợ/);
  assert.throws(()=>inspectDocxBuffer(new ArrayBuffer(30)),/không hợp lệ/);
  const controller=new AbortController();controller.abort();await assert.rejects(extractCvFile({name:'cv.md',size:20},{signal:controller.signal}),{name:'AbortError'});
});
function store(){
  const seed=getSeedPortfolioData();seed['custom-blocks']={version:1,blocks:[]};seed.metadata={layout:['header','summary'],_revision:0};seed.cv={version:4,releaseVersion:1,artifact:{hash:'frozen'}};
  const remote=new Map(Object.entries(seed).map(([key,value])=>['portfolio/'+key,structuredClone(value)]));let fail=false,queue=[],owner=true;
  const key=ref=>ref.collection+'/'+ref.id;
  const repository=createProfileRepository({assertOwner:()=>{if(!owner)throw new Error('owner');},pending:()=>queue,fallback:()=>seed,get:async ref=>structuredClone(remote.get(key(ref))||null),transaction:async callback=>{const writes=[];const result=await callback({get:async ref=>structuredClone(remote.get(key(ref))||null),set:(ref,value)=>writes.push([key(ref),structuredClone(value)]),delete:ref=>writes.push([key(ref),null])});if(fail)throw new Error('connection failed');for(const [path,value]of writes){if(value===null)remote.delete(path);else remote.set(path,value);}return result;}});
  return {repository,remote,setFail:value=>fail=value,setQueue:value=>queue=value,setOwner:value=>owner=value,current:()=>Object.fromEntries([...remote].filter(([key])=>key.startsWith('portfolio/')).map(([key,value])=>[key.slice(10),structuredClone(value)]))};
}
test('original mode keeps Unicode excerpts and rejects rewording, inferred facts, unsafe URLs and omitted sections',()=>{
  const result=importProposal(output(portfolio()),source,'original');assert.equal(result.data.header.name,'Nguyễn An');
  const changed=portfolio();changed.summary.overview='World-class Product design and research';assert.throws(()=>importProposal(output(changed),source,'original'),/đổi hoặc thêm/);
  changed.summary.overview='';changed.header.linkedin='javascript:alert(1)';assert.throws(()=>validatePortfolio(changed),/Link/);
  const missing=portfolio();delete missing.experience;assert.throws(()=>validatePortfolio(missing),/section experience/);
});
test('optimize rewrites descriptive fields but rejects invented employers and preserves input',()=>{
  const data=portfolio();data.summary.overview='Designs thoughtful experiences using research.';const original=structuredClone(data);const result=importProposal(output(data),source,'optimize');assert.deepEqual(data,original);assert.equal(result.data.summary.overview,data.summary.overview);assert.ok(result.analysis.generatedFields.includes('summary.overview'));
  data.experience.jobs=[{company:'Invented employer',role:'Product Designer',period:'2024 – Present',highlights:[]}];assert.throws(()=>importProposal(output(data),source,'optimize'),/suy đoán/);
});
test('structured import schema rejects extra keys and unsupported visual themes',()=>{
  assert.throws(()=>parseStructured(JSON.stringify({...output(portfolio()),extra:'x'}),'portfolio-import'),/not supported/);
  assert.throws(()=>parseStructured(JSON.stringify({...output(portfolio()),visualTheme:'<script>'}),'portfolio-import'),/unsupported choice/);
});
test('original retains source lines missed by AI as a reviewed supplemental block',()=>{
  const result=importProposal(output(portfolio()),source,'original'),blocks=result.data['custom-blocks'].blocks;
  assert.equal(blocks.length,1);assert.match(blocks[0].body,/Studio One/);assert.match(blocks[0].body,/2024 – Present/);assert.match(blocks[0].body,/Figma/);validateOriginal(result.data,source);
  blocks[0].body+='\nInvented achievement';assert.throws(()=>validateOriginal(result.data,source),/đã thay đổi/);
});
test('activation archives every section, media, custom layout and frozen CV; restoring preserves original content',async()=>{
  const s=store(),before=s.current(),profile=await s.repository.save({name:'Designer',data:applyProfileVisuals(portfolio(),{visualTheme:'design',industry:'Design'})});
  const switched=await s.repository.activate(profile.id,before),backup=await s.repository.read(switched.backupId);
  assert.deepEqual(backup.data,before);assert.equal(s.current().header.name,'Nguyễn An');assert.deepEqual(s.current().cv,before.cv);
  await s.repository.activate(backup.id,s.current());
  const restored=s.current();for(const section of PROFILE_SECTIONS.filter(x=>x!=='metadata')){const old=structuredClone(before[section]),next=structuredClone(restored[section]);delete old._revision;delete next._revision;assert.deepEqual(next,old);}
  assert.deepEqual(restored.metadata.layout,before.metadata.layout);assert.equal(restored.header.avatar,before.header.avatar);
});
test('stale preview, failed commit, pending queue and session loss cannot change public data',async()=>{
  const s=store(),profile=await s.repository.save({name:'Designer',data:portfolio()}),expected=s.current();
  s.remote.get('portfolio/header')._revision=1;let before=s.current();await assert.rejects(s.repository.activate(profile.id,expected),/đã thay đổi/);assert.deepEqual(s.current(),before);
  s.setFail(true);await assert.rejects(s.repository.activate(profile.id,before),/connection failed/);assert.deepEqual(s.current(),before);s.setFail(false);
  s.setQueue([{}]);await assert.rejects(s.repository.activate(profile.id,before),/đang chờ/);s.setQueue([]);s.setOwner(false);await assert.rejects(s.repository.list(),/owner/);
});
test('edits to an active named profile are retained when it is selected again',async()=>{
  const s=store(),designer=await s.repository.save({name:'Designer',data:portfolio()}),qa=await s.repository.save({name:'QA',data:s.current()});
  await s.repository.activate(designer.id,s.current());
  Object.assign(s.remote.get('portfolio/summary'),{overview:'Admin reviewed wording',_revision:2});
  await s.repository.activate(qa.id,s.current());
  assert.equal((await s.repository.read(designer.id)).data.summary.overview,'Admin reviewed wording');
  await s.repository.activate(designer.id,s.current());assert.equal(s.current().summary.overview,'Admin reviewed wording');
});
test('active profile cannot be deleted; explicit deletion removes only selected archive, never shared images',async()=>{
  const s=store(),profile=await s.repository.save({name:'Designer',data:portfolio()}),result=await s.repository.activate(profile.id,s.current());
  await assert.rejects(s.repository.remove(profile.id),/đang dùng/);const before=s.current();await s.repository.rename(result.backupId,'QA backup');assert.equal((await s.repository.read(result.backupId)).name,'QA backup');
  await s.repository.remove(result.backupId);await assert.rejects(s.repository.read(result.backupId),/đã bị xóa/);assert.deepEqual(s.current(),before);
});
test('snapshot preserves official CV and generated visuals keep uploaded media; SVG uses only allowlisted themes',async()=>{
  const s=store(),saved=await s.repository.save({name:'Current',data:s.current()});assert.deepEqual((await s.repository.read(saved.id)).data.cv,s.current().cv);
  const data=portfolio();data.projects.items=[{title:'Project',image:'image/CRM.png'},{title:'New'}];applyProfileVisuals(data,{visualTheme:'design',industry:'Design'});assert.equal(data.projects.items[0].image,'image/CRM.png');assert.equal(data.projects.items[0].generatedVisual,undefined);assert.equal(data.projects.items[1].generatedVisual.theme,'design');assert.ok(!illustrationSvg('<script>').includes('<script>'));assert.equal(validateOriginal(portfolio(),source).header.name,'Nguyễn An');
});
