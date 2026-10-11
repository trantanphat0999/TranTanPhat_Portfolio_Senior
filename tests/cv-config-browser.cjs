const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const mock=fs.readFileSync('tests/browser-regression.cjs','utf8').match(/const mock=`([\s\S]*?)`;/)[1];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/js/firebase-config.js*',route=>route.fulfill({contentType:'application/javascript',body:mock}));
 const service=fs.readFileSync('js/ai/service.js','utf8').replace('export async function runAi(','async function actualRunAi(').replace('export async function assertAiCurrent(','async function actualAssertAiCurrent(')+`
 export async function runAi({task,input,signal}) {
   if(task!=='cv-plan')throw new Error('Unexpected task');window.__planRequests=(window.__planRequests||0)+1;
   if(window.__planDelay)await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,window.__planDelay);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});
   if(input.feedback)window.__feedbackSeen=input.feedback;
   const operations=window.__planInvalid?[{type:'setStyle',key:'fontSize',value:'8',sourceKeys:[],reason:'invalid'}]:window.__planFeedback&&!input.feedback?[{type:'setStyle',key:'pageLimit',value:'1',sourceKeys:[],reason:'Stress page budget'},{type:'setStyle',key:'fontSize',value:'12.5',sourceKeys:[],reason:'Stress typography'},{type:'setStyle',key:'lineHeight',value:'1.7',sourceKeys:[],reason:'Stress spacing'}]:[{type:'setStyle',key:'fontSize',value:'10.6',sourceKeys:[],reason:'Readable body'},{type:'setContactLabel',key:'contact.linkedin',value:'LinkedIn profile',sourceKeys:[],reason:'Clear label'}];
   return {structured:{summary:'Evidence-based CV plan',assumptions:[],evidenceQuestions:['Confirm benchmark workload.'],operations}};
 }
 export async function assertAiCurrent(){if(window.__planStale)throw new Error('AI settings changed');}
 `;
 await page.route('**/js/ai/service.js*',route=>route.fulfill({contentType:'application/javascript',body:service}));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window._portfolioData);
 const click=s=>page.locator(s).evaluate(e=>e.click());
 await click('#admin-login-trigger');await page.locator('#admin-pw-input').fill('test');await click('#admin-pw-submit');await page.waitForSelector('#admin-workspace:not([hidden])');
 await click('[data-ws-nav="cv"]');await page.waitForFunction(()=>/^\d+ pages?$/.test(document.querySelector('#am-cv-page-count')?.textContent||''));
 await click('#am-cv-recruiter');await page.waitForFunction(()=>!document.getElementById('am-cv-publish').disabled,{timeout:60000});
 assert.equal(await page.locator('#am-cv-font-size').inputValue(),'10.5');assert.equal(await page.locator('#am-cv-margin').inputValue(),'45.35');
 await click('[data-cv-tab="ai"]');await page.locator('#am-cv-job').fill('PRIVATE_VARIANT_JD');await click('[data-cv-tab="publish"]');await page.locator('.cv-advanced').filter({has:page.locator('#am-cv-variant-name')}).locator('summary').first().click();await page.locator('#am-cv-variant-name').fill('QA Automation');await click('#am-cv-variant-save');await page.waitForFunction(()=>window.__privateDocs?.['cv-variants']?.items.length===1);
 assert.equal(await page.evaluate(()=>!!window.__officialCv),false);
 const download=page.waitForEvent('download');await click('#am-cv-variant-export');await(await download).saveAs(path.resolve('test-results/cv-recruiter-config.pdf'));
 await click('[data-cv-tab="format"]');await page.locator('#am-cv-margin').fill('48');await page.locator('#am-cv-margin').dispatchEvent('change');await page.waitForFunction(()=>!document.getElementById('am-cv-publish').disabled);
 await click('#am-cv-undo');await page.waitForFunction(()=>!document.getElementById('am-cv-publish').disabled);assert.equal(await page.locator('#am-cv-margin').inputValue(),'45.35');
 await click('[data-cv-tab="publish"]');await page.locator('#am-cv-variants').selectOption({label:'QA Automation'});await click('#am-cv-variant-load');await page.waitForFunction(()=>!document.getElementById('am-cv-publish').disabled);assert.equal(await page.locator('#am-cv-font-size').inputValue(),'10.5');
 await click('[data-cv-tab="ai"]');await click('#am-cv-plan-btn');await page.waitForSelector('#am-cv-plan-preview');
 await page.locator('[data-plan-operation="1"]').uncheck();await click('#am-cv-plan-preview');await page.waitForFunction(()=>!document.getElementById('am-cv-plan-apply').disabled);
 assert.match(await page.locator('#am-cv-plan-diff').textContent(),/10.6/);await click('#am-cv-plan-apply');await page.waitForFunction(()=>!document.getElementById('am-cv-publish').disabled);assert.equal(await page.locator('#am-cv-font-size').inputValue(),'10.6');
 await click('#am-cv-undo');await page.waitForFunction(()=>!document.getElementById('am-cv-publish').disabled);
 await page.evaluate(()=>window.__planDelay=5000);await click('#am-cv-plan-btn');await page.waitForFunction(()=>window.__planRequests>=2);await page.getByRole('button',{name:'Cancel plan',exact:true}).click();await page.waitForFunction(()=>document.getElementById('am-cv-plan-output').textContent.includes('cancelled'));assert.equal(await page.locator('#am-cv-font-size').inputValue(),'10.5');
 await page.evaluate(()=>{window.__planDelay=0;window.__planInvalid=true;});await click('#am-cv-plan-btn');await page.waitForFunction(()=>document.getElementById('am-cv-plan-output').textContent.includes('between'));assert.equal(await page.locator('#am-cv-font-size').inputValue(),'10.5');
 await page.evaluate(()=>window.__planInvalid=false);await click('#am-cv-plan-btn');await page.waitForSelector('#am-cv-plan-preview');await page.locator('#am-cv-plan-instructions').fill('Changed instructions');await click('#am-cv-plan-preview');await page.waitForTimeout(500);assert.equal(await page.locator('#am-cv-plan-apply').isDisabled(),true);
 await page.evaluate(()=>window.__planFeedback=true);await click('#am-cv-plan-btn');await page.waitForSelector('#am-cv-plan-preview');assert.ok(await page.evaluate(()=>window.__feedbackSeen?.pages>window.__feedbackSeen?.pageLimit));assert.equal(await page.locator('#am-cv-font-size').inputValue(),'10.5');
 await click('#am-cv-publish');await page.waitForFunction(()=>window.__officialCv?.rendererVersion===2);
 const official=await page.evaluate(()=>window.__officialCv);fs.writeFileSync('test-results/cv-recruiter-config-fields.json',JSON.stringify(official.fields));assert.ok(!JSON.stringify(official).includes('PRIVATE_VARIANT_JD'));assert.ok(official.pageCount<=2);
 const adminDownload=page.waitForEvent('download');await click('#am-cv-dl');await(await adminDownload).saveAs(path.resolve('test-results/cv-config-admin.pdf'));
 await click('[data-cv-tab="publish"]');await page.locator('#am-cv-variants').selectOption({label:'QA Automation'});await click('#am-cv-variant-delete');await page.waitForFunction(()=>window.__privateDocs['cv-variants'].items.length===0);assert.equal(await page.evaluate(()=>window.__officialCv.rendererVersion),2);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/cv-config-mobile.png'});
 await click('.am-cv-close');await click('#admin-logout');await click('#export-btn');await page.waitForFunction(()=>!document.getElementById('public-cv-download').disabled);
 const publicDownload=page.waitForEvent('download');await click('#public-cv-download');await(await publicDownload).saveAs(path.resolve('test-results/cv-config-public.pdf'));
 assert.deepEqual(errors,[]);console.log('CV config browser: preset, AI candidate/subset/apply/Undo/cancel/invalid/stale checks, variants, v2 publication, mobile and public export passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
