const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mock=fs.readFileSync('tests/browser-regression.cjs','utf8').match(/const mock=`([\s\S]*?)`;/)[1];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/js/firebase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window._portfolioData);
 const click=s=>page.locator(s).evaluate(e=>e.click());
 await page.evaluate(()=>{window.__docs.header.name='Trần Tấn Phát';window.__docs.summary.overview='SYNC_SOURCE_V1 Trần Tấn Phát';window.__docs.cv={version:2,fields:[{key:'name',text:'STALE_SNAPSHOT'}]};});
 assert.equal(await page.locator('header [data-export-cv], #copy-email-btn').count(),0);
 const footerFonts=await page.evaluate(()=>['#export-btn','[data-pl="lastUpdated"]'].map(selector=>{const s=getComputedStyle(document.querySelector(selector));return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight];}));
 assert.deepEqual(footerFonts[0],footerFonts[1]);
 await click('#export-btn');await page.waitForFunction(()=>!document.getElementById('public-cv-download').disabled);
 const save=async(file)=>{const download=page.waitForEvent('download');await click('#public-cv-download');await(await download).saveAs(path.resolve('test-results/'+file));};
 await save('cv-current.pdf');await click('#public-cv-close');
 // Publish a rewrite against v1; a later portfolio edit must invalidate it.
 await page.evaluate(()=>{window.__docs.cv={version:3,overrides:{summary:'STALE_CUSTOM'},origins:{summary:'SYNC_SOURCE_V1 Trần Tấn Phát'},style:{fontSize:10.5,lineHeight:1.2,pageLimit:0}};window.__docs.summary.overview='SYNC_SOURCE_V2 Trần Tấn Phát';window.__docs.projects.items[0].detailResults='SYNC_NEW_PROJECT_RESULT';});
 await click('#export-btn');await page.waitForFunction(()=>!document.getElementById('public-cv-download').disabled);await save('cv-synchronized.pdf');
 assert.equal(await page.locator('#public-cv-dialog select').count(),0);
 assert.match(await page.locator('#public-cv-status').textContent(),/^\d+ pages? /);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/public-cv-mobile.png'});await page.keyboard.press('Escape');assert.equal(await page.locator('#public-cv-dialog').count(),0);
 await page.setViewportSize({width:1440,height:1000});
 await click('#admin-login-trigger');await page.locator('#admin-pw-input').fill('test');await click('#admin-pw-submit');await page.waitForFunction(()=>document.body.classList.contains('admin-mode'));
 await click('#admin-export-cv-btn');await page.waitForFunction(()=>/^\d+ pages?$/.test(document.querySelector('#am-cv-page-count')?.textContent||''));
 await click('#am-cv-application');await page.waitForFunction(()=>!document.getElementById('am-cv-dl').disabled);
 assert.equal(await page.locator('#am-cv-limit').inputValue(),'2');
 await click('#am-cv-toggle-editor');
 await page.locator('[data-cv-key="summary"]').fill('REWRITE_BEFORE_SYNC');assert.equal(await page.locator('#am-cv-publish').isDisabled(),true);
 await page.evaluate(()=>{window.__docs.summary.overview='SYNC_ADMIN_SOURCE Trần Tấn Phát';window.dispatchEvent(new CustomEvent('portfolio-content-changed',{detail:{sectionId:'summary'}}));});
 assert.match(await page.locator('[data-cv-key="summary"]').textContent(),/REWRITE_BEFORE_SYNC/);assert.equal(await page.locator('#am-cv-source-warning').isVisible(),true);
 await page.locator('#am-cv-limit').selectOption('1');await page.waitForFunction(()=>/^\d+ pages?$/.test(document.getElementById('am-cv-page-count').textContent));
 assert.equal(await page.locator('#am-cv-dl').isDisabled(),true);assert.equal(await page.locator('#am-cv-publish').isDisabled(),true);
 await click('#am-cv-save-draft');await click('.am-cv-close');
 // Export the owner-selected application preset and actual 1/2/3 page fixtures.
 const result=await page.evaluate(async()=>{
   const m=await import('/js/cv/model.js'),pdf=await import('/js/cv/pdf.js');
   const all=await m.buildCvFields(window.__docs),selection=m.applicationSelection(all),app=m.selectedFields(all,selection);
   const output=await pdf.createCvPdf(app,{pageLimit:2});
   async function bytes(result){return Array.from(new Uint8Array(await result.blob.arrayBuffer()));}
   const seed=(await import('/js/db-seed.js')).getSeedPortfolioData(),seedFields=await m.buildCvFields(seed);
   const readyFields=m.selectedFields(seedFields,m.applicationSelection(seedFields)),ready=await pdf.createCvPdf(readyFields,{pageLimit:2});
   const variants=[];
   for(const limit of [1,2,3]){
     // Each fixture occupies exactly the chosen page count at readable sizing.
     const fields=[{key:'name',section:'Header',kind:'name',text:'Trần Tấn Phát'},{key:'contact.email',section:'Header',kind:'contact',text:'phat@example.test',link:'mailto:phat@example.test'},...Array.from({length:limit*7},(_,i)=>({key:`p${i}`,section:'Professional Experience',kind:'paragraph',text:`MARKER_${i} `+'Verified QA testing results and automation delivery. '.repeat(14)}))];
     const result=await pdf.createCvPdf(fields,{pageLimit:limit});
     variants.push({limit,pages:result.pages,fits:result.fits,bytes:await bytes(result)});
   }
   const long=[{key:'name',section:'Header',kind:'name',text:'Trần Tấn Phát'},{key:'long',section:'Professional Experience',kind:'bullet',text:'LONG_BULLET_START '+'Kiểm thử phần mềm chất lượng. '.repeat(500)+' LONG_BULLET_END'}];
   const longPdf=await pdf.createCvPdf(long);
   const oversized=[{key:'name',section:'Header',kind:'name',text:'Trần Tấn Phát'}, {key:'cert.title',group:'cert',section:'Certifications',kind:'itemTitle',text:'CERT_LONG_START '+'Verified testing course. '.repeat(200)+' CERT_LONG_END',link:'https://example.test'}, {key:'cert.meta',group:'cert',section:'Certifications',kind:'meta',text:'Provider - 2026'}];
   const oversizedPdf=await pdf.createCvPdf(oversized);
   const summary=await import('/js/cv/public-summary.js');
   const stressSource=structuredClone(seed);
   stressSource.summary.overview='Senior QA engineer with automation and leadership experience. '.repeat(100);
   stressSource.experience.jobs=Array.from({length:30},(_,i)=>({...structuredClone(seed.experience.jobs[0]),_id:`stress-${i}`,description:'Delivered automation and test strategy. '.repeat(100),highlights:Array.from({length:10},(_,j)=>({_id:`h-${j}`,title:'Reduced failures by 40%',desc:'Automated QA delivery. '.repeat(100)}))}));
   const stress=await summary.createPublicCvPdf(await m.buildCvFields(stressSource),{pageLimit:4,fontSize:12.5,lineHeight:1.7});
   return {appPages:output.pages,appFits:output.fits,bytes:await bytes(output),fields:app.map(x=>x.text),ready:{pages:ready.pages,fits:ready.fits,bytes:await bytes(ready),fields:readyFields.map(x=>x.text)},variants,long:await bytes(longPdf),oversized:await bytes(oversizedPdf),stress:{pages:stress.pages,level:stress.summaryLevel,fields:stress.fields.map(x=>x.text),bytes:await bytes(stress)}};
 });
 fs.writeFileSync('test-results/cv-application.pdf',Buffer.from(result.bytes));fs.writeFileSync('test-results/application-fields.json',JSON.stringify(result.fields));
 fs.writeFileSync('test-results/cv-long-bullet.pdf',Buffer.from(result.long));
 fs.writeFileSync('test-results/cv-long-certificate.pdf',Buffer.from(result.oversized));
 fs.writeFileSync('test-results/cv-ready.pdf',Buffer.from(result.ready.bytes));fs.writeFileSync('test-results/ready-fields.json',JSON.stringify(result.ready.fields));
 fs.writeFileSync('test-results/cv-public-stress.pdf',Buffer.from(result.stress.bytes));fs.writeFileSync('test-results/public-stress-fields.json',JSON.stringify(result.stress.fields));
 assert.ok(result.stress.pages<=2);assert.ok(result.stress.level>0,'Long content must trigger further summarization');
 console.log('Public stress CV:',result.stress.pages,'pages; summary tier:',result.stress.level);
 assert.ok(result.appFits);assert.ok(result.ready.fits,`Original portfolio application CV: ${result.ready.pages} pages`);
 for(const variant of result.variants){fs.writeFileSync(`test-results/cv-${variant.limit}-page.pdf`,Buffer.from(variant.bytes));assert.ok(variant.fits,JSON.stringify({limit:variant.limit,pages:variant.pages}));assert.equal(variant.pages,variant.limit);}
 console.log('Application selection:',result.appPages,'pages; fits 2-page limit:',result.appFits,'; page variants:',result.variants.map(x=>[x.limit,x.pages]));
 assert.deepEqual(errors,[]);await browser.close();console.log('CV synchronization, public preview, page limit and long-bullet regression passed.');
})().catch(error=>{console.error(error);process.exit(1);});
