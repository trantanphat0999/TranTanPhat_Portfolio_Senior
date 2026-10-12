import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfig,normalizeStyle} from '../js/cv/config.js';
import {parseStructured} from '../js/ai/tasks.js';
import {validatePreparation,preparationBinding,preparationHash,preparationOptions,validateJd,savedPreparation,preparationMarkdown} from '../js/cv/jd-preparation.js';
const fields=[{key:'name',kind:'name',section:'Header',text:'An QA'},{key:'role',kind:'role',section:'Header',text:'QA Engineer'},{key:'contact.email',kind:'contact',section:'Header',text:'an@example.com'},{key:'summary',kind:'summary',section:'Header',text:'Postman API automation and CI/CD. Mentored 5 QA engineers.'}];
const draft=()=>({fields:structuredClone(fields),config:normalizeConfig(),style:normalizeStyle(),overrides:{},excluded:[],job:'Senior QA: Postman API automation and CI/CD required; Kubernetes preferred. Mentor engineers.',contextIds:[]});
function packet(){return {summary:'Prioritize API automation; prepare an honest Kubernetes gap answer.',keywords:[{id:'api',keyword:'Postman API automation',requirement:'API automation experience',priority:'must_have',status:'matched',sourceKeys:['summary'],reason:'CV names Postman.'},{id:'k8s',keyword:'Kubernetes',requirement:'Preferred infrastructure skill',priority:'preferred',status:'gap',sourceKeys:[],reason:'No evidence supplied.'}],suggestions:[{key:'summary',text:'Postman API automation and CI/CD experience; mentored 5 QA engineers.',sourceKeys:['summary'],keywordIds:['api'],reason:'Lead with supported requirements.'}],questions:[{id:'q1',category:'technical',question:'How do you structure API automation?',keywordIds:['api'],answerType:'evidence',answer:'I use Postman API automation and CI/CD, and mentor 5 QA engineers.',talkingPoints:['Postman API automation','CI/CD workflows'],followUps:['How do you prioritize regression coverage?'],sourceKeys:['summary'],caution:'Personalize with an actual project example.'},{id:'q2',category:'gap',question:'How would you approach Kubernetes?',keywordIds:['k8s'],answerType:'hypothetical',answer:'I would first map the service deployment and learn how health checks affect test reliability.',talkingPoints:['Be explicit about the gap','Study deployment basics'],followUps:['What would you validate first?'],sourceKeys:[],caution:'This is a proposed approach, not past Kubernetes experience.'},{id:'q3',category:'behavioral',question:'Tell us about mentoring engineers.',keywordIds:['api'],answerType:'evidence',answer:'I mentored 5 QA engineers on Postman API automation.',talkingPoints:['Use only a real example'],followUps:['What did you learn?'],sourceKeys:['summary'],caution:'Choose a verified example; no invented result.'}],studyPlan:['Review the API automation examples in the CV.','Study Kubernetes deployment concepts without claiming experience.']};}
const validate=value=>validatePreparation(value,{draft:draft(),evidence:fields,options:{answerLanguage:'vi',questionCount:8}});
test('JD validation and preparation settings reject empty, overly long and unsupported inputs',()=>{
  assert.throws(()=>validateJd('QA'),/30/);assert.throws(()=>validateJd('x'.repeat(30001)),/30.000/);assert.throws(()=>preparationOptions({questionCount:200}));assert.throws(()=>preparationOptions({answerLanguage:'de'}));assert.deepEqual(preparationOptions(),{answerLanguage:'vi',questionCount:12});
});
test('a grounded JD pack retains source links and does not modify the CV',()=>{
  const original=draft(),before=structuredClone(original),value=packet();const result=validatePreparation(value,{draft:original,evidence:fields,options:{questionCount:8}});
  assert.equal(result.packet.suggestions.length,1);assert.equal(result.packet.questions.length,3);assert.deepEqual(original,before);assert.deepEqual(value,packet());assert.equal(result.packet.keywords[1].status,'gap');
});
test('invented JD keywords, foreign evidence and dangling requirement references are rejected',()=>{
  const bad=packet();bad.keywords[0].keyword='Python';assert.throws(()=>validate(bad),/không có trong JD/);
  const wrong=packet();wrong.questions[0].sourceKeys=['missing'];assert.throws(()=>validate(wrong),/không tồn tại/);
  const unlinked=packet();unlinked.questions[1].keywordIds=['foreign'];assert.throws(()=>validate(unlinked),/không bám/);
});
test('unsupported matched claims become unknown and unsafe rewrites are excluded with reasons',()=>{
  const value=packet();value.keywords[0].sourceKeys=[];
  value.suggestions.push({key:'role',text:'Lead QA',sourceKeys:['summary'],keywordIds:['api'],reason:'Seniority inflation'});
  value.suggestions.push({key:'summary',text:'Mentored 50 engineers with Python.',sourceKeys:['summary'],keywordIds:['api'],reason:'Invented'});
  const result=validate(value);assert.equal(result.packet.keywords[0].status,'unknown');assert.equal(result.packet.suggestions.length,1);assert.equal(result.warnings.length,3);
});
test('personal experience answers require source evidence; hypothetical answers require clear labeling',()=>{
  const noSource=packet();noSource.questions[0].sourceKeys=[];assert.throws(()=>validate(noSource),/phải có nguồn/);
  const noCaution=packet();noCaution.questions[1].caution='';assert.throws(()=>validate(noCaution),/giả định/);
  const inflated=packet();inflated.questions[0].answer='I mentored 50 engineers.';assert.throws(()=>validate(inflated),/numerical claim/);
  const invented=packet();invented.questions[0].answer='I implemented Kubernetes production automation.';assert.throws(()=>validate(invented),/technology claim/);
});
test('question IDs, counts and answer structure are bounded',()=>{
  const duplicate=packet();duplicate.questions[1].id='q1';assert.throws(()=>validate(duplicate),/Câu hỏi/);
  const tooMany=packet();tooMany.questions=Array.from({length:9},(_,i)=>({...packet().questions[1],id:'q'+i}));assert.throws(()=>validate(tooMany),/giới hạn/);
  const empty=packet();empty.questions[0].talkingPoints=[];assert.throws(()=>validate(empty),/chưa đầy đủ/);
});
test('structured task rejects unsupported actions or extra output fields',()=>{
  assert.deepEqual(parseStructured(JSON.stringify(packet()),'jd-preparation'),packet());
  assert.throws(()=>parseStructured(JSON.stringify({...packet(),publish:true}),'jd-preparation'),/not supported/);
  const bad=packet();bad.questions[0].answerType='fiction';assert.throws(()=>parseStructured(JSON.stringify(bad),'jd-preparation'),/unsupported choice/);
});
test('binding detects JD, CV, context and career changes while excluding study progress',async()=>{
  const base=draft(),hash=await preparationHash(preparationBinding(base,1));base.preparation={studiedIds:['q1']};assert.equal(await preparationHash(preparationBinding(base,1)),hash);
  for(const change of [value=>value.job+=' Changed',value=>value.overrides.summary='Changed CV',value=>value.contextIds=['context-1'],value=>value.style.fontSize=11]){const edited=structuredClone(base);change(edited);assert.notEqual(await preparationHash(preparationBinding(edited,1)),hash);}
  assert.notEqual(await preparationHash(preparationBinding(base,2)),hash);
});
test('private pack roundtrip preserves answers/progress; Markdown export labels hypothetical answers and stale data',()=>{
  const pack={version:1,id:'saved-pack',...validate(packet()),evidence:fields,before:fields,options:preparationOptions({questionCount:8}),basis:'a'.repeat(64),sourceHash:'b'.repeat(64),aiMeta:{},contextIds:[],careerRevision:0,generatedAt:'2026-10-12T10:00:00Z',jobDescription:draft().job,provider:'custom',model:'test',studiedIds:['q1','q1','unknown']};
  const restored=savedPreparation(JSON.parse(JSON.stringify(pack)));assert.deepEqual(restored.studiedIds,['q1']);assert.equal(restored.packet.questions[0].answer,pack.packet.questions[0].answer);
  const md=preparationMarkdown(restored,{stale:true});assert.match(md,/JD \/ CV \/ nguồn dữ liệu đã thay đổi/);assert.match(md,/Phương án giả định/);assert.match(md,/JD nguồn/);assert.match(md,/mentored 5/);
});
