import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfig,normalizeStyle,arrangeFields} from '../js/cv/config.js';
import {applyProposal,candidateFields} from '../js/cv/proposal.js';
import {recruiterDraft} from '../js/cv/recruiter.js';
import {officialCvSnapshot,resolvePublicCv} from '../js/cv/service.js';
import {definition,legacyDefinition} from '../js/cv/pdf.js';
import {parseStructured} from '../js/ai/tasks.js';
const fields=[{key:'name',kind:'name',section:'Header',text:'Phat Tran'},{key:'role',kind:'role',section:'Header',text:'Senior QA Engineer'},{key:'contact.email',kind:'contact',section:'Header',text:'qa@example.test'},
{key:'summary',kind:'summary',section:'Header',text:'API test automation and performance testing with CI/CD workflows.'},
{key:'job.1.role',kind:'itemTitle',group:'job.1',section:'Professional Experience',text:'QA Engineer'},
{key:'job.1.date',kind:'date',group:'job.1',section:'Professional Experience',text:'2021 - Present'},
{key:'job.1.company',kind:'company',group:'job.1',section:'Professional Experience',text:'Company Ltd'},
{key:'job.1.bullet',kind:'bullet',group:'job.1',section:'Professional Experience',text:'Mentored 5 team members using Postman.'},
{key:'cert.1.title',kind:'itemTitle',group:'cert.1',section:'Certifications',text:'ISTQB Certified Tester - Finance Testing',link:'https://www.udemy.com/certificate/test'}];
const draft=()=>({fields:structuredClone(fields),overrides:{},excluded:[],config:normalizeConfig(),style:normalizeStyle()});
const op=(type,key,value,sourceKeys=[])=>({type,key,value,sourceKeys,reason:'Relevant to target role'});
test('Config rejects unknown keys, unsafe bounds and duplicate order; preserves coherent field groups',()=>{
 assert.throws(()=>normalizeConfig({sectionOrder:['Skills','Skills']}));assert.throws(()=>normalizeConfig({configVersion:9}));
 for(const style of [{fontSize:9},{margin:20},{fontFamily:'remote'},{css:'body{}'},{lineHeight:NaN}])assert.throws(()=>normalizeStyle(style));
 const order=arrangeFields(fields,{sectionOrder:['Certifications','Professional Experience']});assert.equal(order[4].key,'cert.1.title');assert.deepEqual(order.slice(5).map(x=>x.key),fields.slice(4,8).map(x=>x.key));
});
test('AI config operations apply atomically and protect identity, employer, date, numbers and technologies',()=>{
 const original=draft(),before=structuredClone(original);
 const changed=applyProposal(original,[op('setStyle','fontSize','11'),op('rewriteField','job.1.bullet','Mentored 5 team members.',['job.1.bullet'])]);
 assert.equal(changed.style.fontSize,11);assert.equal(changed.overrides['job.1.bullet'],'Mentored 5 team members.');assert.deepEqual(original,before);
 for(const operations of [[op('setIncluded','name','false')],[op('setIncluded','job.1.date','false')],[op('rewriteField','job.1.bullet','Mentored 50 team members.',['job.1.bullet'])],[op('rewriteField','job.1.bullet','Implemented Python automation.',['job.1.bullet'])],[op('rewriteField','role','Lead Engineer',['role'])],[op('setStyle','fontSize','8')],[op('setStyle','fontSize','11'),op('setStyle','fontSize','12')]])assert.throws(()=>applyProposal(original,operations));
 assert.deepEqual(original,before);
 const excluded=applyProposal(original,[op('setIncluded','job.1.role','false')]);assert.ok(!candidateFields(excluded).some(x=>x.group==='job.1'));
});
test('Recruiter preset retains facts and distinguishes Udemy training without overwriting custom wording',()=>{
 const original=draft();original.overrides.summary='Owner approved summary';const next=recruiterDraft(original);
 assert.equal(next.overrides.summary,'Owner approved summary');assert.match(next.overrides['cert.1.title'],/^Course completion:/);assert.ok(!next.overrides['cert.1.title'].includes('Certified Tester'));
 assert.equal(next.style.fontSize,10.5);assert.deepEqual(original.excluded,[]);
});
test('Renderer v1 remains unchanged; v2 snapshot preserves labels and spacing with private data excluded',async()=>{
 assert.equal(JSON.stringify(definition(fields,{})),JSON.stringify(legacyDefinition(fields,{})));assert.deepEqual(definition(fields,{}).footer(1,2),legacyDefinition(fields,{}).footer(1,2));
 const style=normalizeStyle({renderConfig:normalizeConfig({headingLabels:{Certifications:'Training'},contactLabels:{}}),sectionSpacing:12});
 const snapshot=await officialCvSnapshot(fields,{fits:true,pages:2,pageLimit:2,effectiveStyle:style},style,3);
 assert.equal(snapshot.rendererVersion,2);const resolved=await resolvePublicCv({cv:snapshot});assert.equal(resolved.style.renderConfig.headingLabels.Certifications,'Training');assert.equal(resolved.style.sectionSpacing,12);assert.equal(snapshot.job,undefined);
});
test('Structured cv-plan requires operations from the explicit allowlist',()=>{
 const value={summary:'Plan',assumptions:[],evidenceQuestions:[],operations:[op('setStyle','fontSize','11')]};
 assert.deepEqual(parseStructured(JSON.stringify(value),'cv-plan'),value);
 value.operations[0].type='execute';assert.throws(()=>parseStructured(JSON.stringify(value),'cv-plan'));
});
