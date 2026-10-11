import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyCareer,newRecord,migrateCareer,validateCareer,parsePeriod,careerHealth,confirmedCareerFields,careerPublishIssues,careerAiFacts} from '../js/career/model.js';
import {describePdf,fetchOfficialPdf,validateArtifact} from '../js/cv/artifact.js';
import {publicSnapshot,publishRelease,rollbackRelease} from '../js/cv/releases.js';
import {buildCvFields} from '../js/cv/model.js';
const source=()=>({header:{name:'Owner'},experience:{jobs:[{company:'Company',role:'QA Engineer',period:'Aug 2021 - Present',highlights:[{title:'Processed 200K records within 10 seconds'}]}]},projects:{items:[]},skills:{categories:[]},achievements:{items:[]},education:{certifications:[{title:'ISTQB Certified Tester - Foundation Level',issuer:'Udemy',year:'2025',link:'https://www.udemy.com/certificate/abc/'}]}});
test('migration is repeatable, retains IDs on reordering and never grants verification',()=>{
 const original=source();original.experience.jobs.push({company:'Previous',role:'Intern',period:'2020 - 2021',highlights:[]});
 const first=migrateCareer(original),again=migrateCareer(first.sourceWithIds,first.library);
 assert.equal(again.changes.length,0);assert.deepEqual(again.library,first.library);assert.ok(first.library.experience.every(x=>x.verificationStatus==='unverified'));
 first.sourceWithIds.experience.jobs.reverse();const reordered=migrateCareer(first.sourceWithIds,first.library);assert.deepEqual(reordered.library.experience.map(x=>x.id),first.library.experience.map(x=>x.id));assert.equal(reordered.changes.length,0);
 assert.equal(first.library.credentials[0].kind,'course_completion');assert.deepEqual(first.library.metrics.map(x=>[x.value,x.unit]),[[200000,'records'],[10,'seconds']]);assert.equal(first.library.metrics[0].environment,'');assert.equal(first.library.evidence[0].visibility,'private');assert.ok(!original.experience.jobs[0]._id);
});
test('source changes invalidate confirmation while preserving reviewed typed values',()=>{
 const first=migrateCareer(source());first.library.experience[0].verificationStatus='owner_confirmed';first.library.experience[0].officialTitle='Confirmed QA';first.sourceWithIds.experience.jobs[0].role='Changed source';
 const changed=migrateCareer(first.sourceWithIds,first.library);assert.equal(changed.library.experience.length,1);assert.equal(changed.library.experience[0].verificationStatus,'needs_review');assert.equal(changed.library.experience[0].officialTitle,'Confirmed QA');assert.equal(changed.library.experience[0].evidenceIds.length,2);
});
test('foreign references, external evidence and ambiguous credentials are validated',()=>{
 const lib=migrateCareer(source()).library;lib.claims[0].metricIds.push('missing');assert.throws(()=>validateCareer(lib),/Missing metrics/);lib.claims[0].metricIds.pop();
 lib.experience[0].verificationStatus='externally_verified';assert.throws(()=>validateCareer(lib),/External verification/);const evidence=lib.evidence.find(x=>x.id===lib.experience[0].evidenceIds[0]);evidence.verificationStatus='externally_verified';evidence.reference='https://issuer.example/verify';evidence.verifiedAt='2026-10';assert.throws(()=>validateCareer(lib),/External verification/);evidence.kind='issuer_record';assert.doesNotThrow(()=>validateCareer(lib));
 const unknown=source();unknown.education.certifications[0].link='https://udemy.com.evil.example/course';assert.equal(migrateCareer(unknown).library.credentials[0].kind,'unknown');
});
test('partial dates preserve precision and expiry uses the end of the given interval',()=>{
 assert.deepEqual(parsePeriod('2021-08 - Present'),{startDate:'2021-08',endDate:null,isCurrent:true});
 assert.equal(parsePeriod('11 Oct 2026 - Present').startDate,'2026-10-11');
 const lib=emptyCareer(),credential={...newRecord('credentials'),title:'Certificate',kind:'official_certification',expiresAt:'2026'};lib.credentials.push(credential);
 assert.ok(!careerHealth(lib,'2026-10-11').some(x=>x.message==='Credential has expired.'));assert.ok(careerHealth(lib,'2027-01-01').some(x=>x.message==='Credential has expired.'));
 const job={...newRecord('experience'),employer:'Company',officialTitle:'QA',startDate:'2026-02',endDate:'2026'};lib.experience.push(job);assert.doesNotThrow(()=>validateCareer(lib));job.startDate='2026-02-30';assert.throws(()=>validateCareer(lib),/calendar/);
});
test('typed facts survive legacy ID normalization without acquiring public item fields',async()=>{
 const proposal=migrateCareer(source());proposal.library.experience[0].verificationStatus='owner_confirmed';const input={...proposal.sourceWithIds,'career-data':proposal.library};const fields=await buildCvFields(input);assert.ok(fields.some(x=>x.factId===proposal.library.experience[0].id));assert.ok(!Object.hasOwn(proposal.library.experience[0],'_id'));
});
test('CV uses reviewed facts; publication rejects metric changes and inflated course labels',()=>{
 const lib=migrateCareer(source()).library;for(const type of ['experience','claims','metrics','credentials'])for(const record of lib[type])record.verificationStatus='owner_confirmed';
 const job=lib.experience[0],claim=lib.claims[0],credential=lib.credentials[0],fields=[{key:`${job.sourceKeys[0]}.title`,group:job.sourceKeys[0],kind:'itemTitle',text:'Old title'},{key:`${job.sourceKeys[0]}.date`,group:job.sourceKeys[0],kind:'date',text:'Old date'},{key:claim.sourceKeys[0],kind:'bullet',text:claim.statement},{key:`${credential.sourceKeys[0]}.title`,group:credential.sourceKeys[0],kind:'itemTitle',text:credential.title}];
 fields[2].group=job.sourceKeys[0];
 const confirmed=confirmedCareerFields(fields,lib);assert.equal(confirmed[0].text,'QA Engineer');assert.match(confirmed[3].text,/^Course completion:/);assert.deepEqual(careerPublishIssues(confirmed,lib),[]);assert.equal(confirmed[2].factId,claim.id);
 confirmed[2].text='Processed 200K users within 10 seconds';assert.ok(careerPublishIssues(confirmed,lib).some(x=>x.includes('value/unit')));confirmed[3].text='ISTQB Certified Tester';assert.ok(careerPublishIssues(confirmed,lib).some(x=>x.includes('course completion')));
 confirmed[2].text='Processed 10 records within 200K seconds';assert.ok(careerPublishIssues(confirmed,lib).some(x=>x.includes('value/unit')));
 confirmed[2].text='Processed 200K records over 10 seconds';assert.ok(careerPublishIssues(confirmed,lib).some(x=>x.includes('value/unit')));
 lib.evidence[0].excerpt='PRIVATE_EVIDENCE';lib.profile.legalName='PRIVATE_IDENTITY';const facts=JSON.stringify(careerAiFacts(lib));assert.ok(!facts.includes('PRIVATE_EVIDENCE'));assert.ok(!facts.includes('PRIVATE_IDENTITY'));
});
const snapshot=()=>({version:4,rendererVersion:1,pageCount:1,pageLimit:2,effectiveStyle:{fontFamily:'Roboto',fontSize:10.5,margin:45,lineHeight:1.2,locked:true},fields:[{key:'name',section:'header',kind:'name',text:'Owner',factId:'PRIVATE_ID',factStatus:'owner_confirmed'}],job:'PRIVATE_JD',contextIds:['PRIVATE_CONTEXT']});
const pdf=value=>new Blob([`%PDF-1.7\n${value}\n%%EOF`],{type:'application/pdf'});
function store(){const history=new Map();let current=null,revision=0;return {history,get current(){return current;},async upload(a){return `https://storage.example/${a.path}`;},async verify(){},async read(id){return history.get(id);},async download(){return this.blob;},async activate(release,expected,options){if(expected!==revision)throw new Error('conflict');if(this.failActivate)throw new Error('activation failed');if(options.create)history.set(release.releaseId,structuredClone(release));current={...release,_revision:++revision};return current;}};}
test('release snapshot exposes only public wording and rendering metadata',()=>{
 const clean=publicSnapshot(snapshot());assert.ok(!JSON.stringify(clean).includes('PRIVATE'));assert.ok(!Object.hasOwn(clean.effectiveStyle,'locked'));assert.throws(()=>publicSnapshot({...snapshot(),pageCount:3}),/reviewed/);
});
test('release PDF review rejects page/text failures before uploading',async()=>{
 const s=store();let uploaded=false;s.upload=async()=>{uploaded=true;};s.inspect=async()=>{throw new Error('PDF page count mismatch');};await assert.rejects(publishRelease(s,{snapshot:snapshot(),blob:pdf('invalid')}),/page count/);assert.equal(uploaded,false);assert.equal(s.history.size,0);
});
test('publication requires successful upload, verification and revision activation',async()=>{
 const s=store(),first=await publishRelease(s,{snapshot:snapshot(),blob:pdf('first')});assert.equal(first.data._revision,1);assert.equal(s.history.size,1);
 const original=s.current;s.upload=async()=>{throw new Error('upload failed');};await assert.rejects(publishRelease(s,{snapshot:snapshot(),blob:pdf('failed'),expectedRevision:1}),/upload failed/);assert.equal(s.current,original);
 s.upload=async a=>`https://storage.example/${a.path}`;s.verify=async()=>{throw new Error('integrity');};await assert.rejects(publishRelease(s,{snapshot:snapshot(),blob:pdf('failed'),expectedRevision:1}),/integrity/);assert.equal(s.current,original);
 s.verify=async()=>{};await assert.rejects(publishRelease(s,{snapshot:snapshot(),blob:pdf('stale'),expectedRevision:0}),/conflict/);assert.equal(s.history.size,1);
 let seen;s.activate=async(_release,_revision,options)=>{seen=options;throw new Error('facts changed');};await assert.rejects(publishRelease(s,{snapshot:snapshot(),blob:pdf('stale facts'),expectedCareerRevision:7}),/facts changed/);assert.equal(seen.expectedCareerRevision,7);
});
test('rollback preserves exact PDF bytes and refuses tampered artifacts',async()=>{
 const s=store(),a=pdf('first'),first=await publishRelease(s,{snapshot:snapshot(),blob:a});await publishRelease(s,{snapshot:snapshot(),blob:pdf('second'),expectedRevision:1});s.blob=a;
 const restored=await rollbackRelease(s,first.data.releaseId,2);assert.equal(restored.data._revision,3);assert.equal(restored.data.artifact.hash,first.data.artifact.hash);assert.equal(s.history.size,2);assert.deepEqual(await restored.blob.arrayBuffer(),await a.arrayBuffer());
 s.blob=pdf('TAMPERED');await assert.rejects(rollbackRelease(s,first.data.releaseId,3),/integrity/);assert.equal(s.current._revision,3);
});
test('artifact download validates URL, bounds, bytes and hash without invoking a renderer',async()=>{
 const blob=pdf('immutable'),artifact={...await describePdf(blob),url:'https://storage.example/file.pdf'};const fetched=await fetchOfficialPdf(artifact,{useCache:false,fetcher:async()=>new Response(blob)});assert.deepEqual(await fetched.arrayBuffer(),await blob.arrayBuffer());
 await assert.rejects(fetchOfficialPdf(artifact,{useCache:false,fetcher:async()=>new Response(pdf('tampered'))}),/size|integrity/);await assert.rejects(describePdf(new Blob(['not a PDF'])),/Invalid PDF/);assert.throws(()=>validateArtifact({...artifact,url:'javascript:alert(1)'}),/Unsafe/);assert.throws(()=>validateArtifact({...artifact,path:'other.pdf'}),/descriptor/);
});
