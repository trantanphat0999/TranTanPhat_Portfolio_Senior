const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const mock=fs.readFileSync(path.join(__dirname,'browser-regression.cjs'),'utf8').match(/const mock=`([\s\S]*?)`;/)[1];
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1460,height:960},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/js/firebase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
  await page.goto(process.env.PORTFOLIO_TEST_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window._portfolioData);
  const click=s=>page.locator(s).click();
  const ready=()=>page.waitForFunction(()=>document.getElementById('am-cv-publish')?.disabled===false);
  await page.locator('#admin-login-trigger').evaluate(e=>e.click());await page.locator('#admin-pw-input').fill('test');await click('#admin-pw-submit');
  await page.waitForSelector('#admin-workspace:not([hidden])');
  await page.waitForFunction(()=>document.getElementById('ws-health').textContent.includes('Official CV'));
  await page.screenshot({path:'test-results/admin-workspace-redesign.png'});
  await click('[data-ws-nav="content"]');await page.locator('#ws-search').fill('certifications');
  assert.equal(await page.locator('.ws-section-row').count(),1);
  await click('[data-ws-section="education"][data-ws-operation="edit"]');await page.waitForSelector('[data-path="certifications.0.title"]');
  await page.locator('#admin-edit-close').click();await page.locator('#ws-search').fill('');assert.equal(await page.locator('.ws-section-row').count(),8);
  await click('[data-ws-nav="cv"]');await page.waitForSelector('#am-cv-apply-fit');
  assert.equal(await page.locator('#am-cv-limit').inputValue(),'2');
  assert.match(await page.locator('#am-cv-page-count').textContent(),/^[12] pages?$/);
  assert.equal(await page.locator('#am-cv-publish').isDisabled(),true);
  assert.equal(await page.locator('#am-cv-overlay').evaluate(e=>e.classList.contains('am-overlay')||e.getAttribute('role')==='dialog'),false);
  assert.ok(await page.locator('#am-cv-overlay').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.getElementById('ws-cv-panel').getBoundingClientRect();return Math.abs(a.width-b.width)<2&&Math.abs(a.height-b.height)<2;}));
  await page.waitForFunction(()=>document.getElementById('am-cv-pdf-preview').dataset.pages==='2');
  assert.equal(await page.locator('#am-cv-pdf-preview canvas').count(),2);
  await page.screenshot({path:'test-results/admin-cv-redesign.png'});
  await click('#am-cv-apply-fit');await ready();
  await click('[data-cv-tab="ai"]');await page.locator('#am-cv-job').fill('PRIVATE_JD: Senior QA automation and mentoring');
  await click('#am-cv-save-draft');await page.waitForFunction(()=>!!window.__cvDraft);
  await click('[data-ws-nav="content"]');await click('[data-ws-nav="cv"]');
  assert.match(await page.locator('#am-cv-job').inputValue(),/PRIVATE_JD/);
  const before=await page.evaluate(()=>JSON.stringify(window.__docs.summary));
  await click('[data-cv-tab="content"]');await page.locator('[data-cv-key="summary"]').fill('OFFICIAL_AI_WORDING Trần Tấn Phát. Delivered factual QA automation and mentoring.');
  await ready();assert.equal(await page.evaluate(()=>JSON.stringify(window.__docs.summary)),before);
  await click('[data-cv-tab="format"]');await page.locator('#am-cv-limit').selectOption('1');
  await page.waitForFunction(()=>/^\d+ pages?$/.test(document.getElementById('am-cv-page-count').textContent));
  if(await page.locator('#am-cv-apply-fit').isVisible()){assert.equal(await page.locator('#am-cv-page-count').textContent(),'1 page');await click('#am-cv-apply-fit');await ready();}
  else {assert.equal(await page.locator('#am-cv-pdf-preview').getAttribute('src'),null);assert.equal(await page.locator('#am-cv-publish').isDisabled(),true);}
  await click('#am-cv-undo');await ready();
  await page.locator('#am-cv-limit').selectOption('2');await ready();
  await page.evaluate(()=>window.__status='disconnected');await click('#am-cv-publish');
  await page.waitForFunction(()=>document.getElementById('am-cv-draft-status').textContent.includes('save failed'));
  assert.equal(await page.evaluate(()=>!!window.__officialCv),false);
  await page.evaluate(()=>window.__status='connected');
  const adminDownload=page.waitForEvent('download');await click('#am-cv-dl');await(await adminDownload).saveAs(path.resolve('test-results/cv-admin-official.pdf'));
  await page.waitForFunction(()=>window.__docs.cv?.version===4);
  const cv=await page.evaluate(()=>window.__docs.cv);assert.ok(cv.pageCount<=2);assert.ok(cv.fields.some(f=>f.text.includes('OFFICIAL_AI_WORDING')));assert.ok(!JSON.stringify(cv).includes('PRIVATE_JD'));assert.equal(cv.autoSync,false);
  fs.writeFileSync('test-results/cv-official-fields.json',JSON.stringify(cv.fields.map(f=>f.text)));
  const hash=cv.contentHash;
  await page.evaluate(()=>{window.__docs.summary.overview='NEW_SOURCE_SHOULD_NOT_REPLACE_OFFICIAL';window.dispatchEvent(new CustomEvent('portfolio-content-changed',{detail:{sectionId:'summary'}}));});
  assert.equal(await page.locator('#am-cv-source-warning').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.__officialCv.contentHash),hash);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);
  await page.waitForFunction(()=>document.getElementById('am-cv-pdf-preview').dataset.pages==='2');
  assert.ok(await page.locator('.ws-main').evaluate(e=>e.getBoundingClientRect().width<=innerWidth));
  assert.ok(await page.locator('#am-cv-pdf-preview canvas').first().evaluate(e=>e.getBoundingClientRect().right<=innerWidth));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(await page.locator('#am-cv-dl').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
  await page.screenshot({path:'test-results/admin-cv-redesign-mobile.png'});
  await click('.am-cv-close');await page.screenshot({path:'test-results/admin-workspace-redesign-mobile.png'});
  await click('#admin-logout');await page.locator('#export-btn').evaluate(e=>e.click());
  await page.waitForFunction(()=>!document.getElementById('public-cv-download').disabled);
  const publicDownload=page.waitForEvent('download');await click('#public-cv-download');await(await publicDownload).saveAs(path.resolve('test-results/cv-public-official.pdf'));
  assert.match(await page.locator('#public-cv-status').textContent(),/official version 1/);
  await click('#public-cv-close');
  // Old device drafts cannot replace an official CV automatically.
  await page.setViewportSize({width:1460,height:960});await page.locator('#admin-login-trigger').evaluate(e=>e.click());await page.locator('#admin-pw-input').fill('test');await click('#admin-pw-submit');await click('#admin-export-cv-btn');await ready();
  assert.match(await page.locator('[data-cv-key="summary"]').textContent(),/OFFICIAL_AI_WORDING/);
  assert.equal(await page.locator('#am-cv-job').inputValue(),'');
  // Shared AI suggestions are applied explicitly; altered JD invalidates in-flight output.
  await page.evaluate(()=>window.__aiConfig={connectionStatus:'success',baseUrl:'https://ai.example.test',apiKey:btoa('test'),model:'test'});
  let release;let requestReceived;
  await page.route('https://ai.example.test/**',async route=>{
    requestReceived=route.request().postDataJSON();
    await new Promise(resolve=>release=resolve);
    await route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'Review complete',items:[{text:'Checked evidence'}]})}}]})});
  });
  await click('[data-cv-tab="ai"]');await click('#am-cv-rev-btn');
  await page.waitForFunction(()=>document.getElementById('am-cv-cancel-ai').hidden===false);
  for(let i=0;!release&&i<100;i++)await page.waitForTimeout(20);
  assert.ok(release);await page.locator('#am-cv-job').fill('CHANGED_JD');release();
  await page.waitForFunction(()=>document.getElementById('am-cv-ai-out').textContent.includes('changed during'));
  assert.ok(requestReceived.messages[1].content.includes('portfolioFields'));
  await page.unroute('https://ai.example.test/**');
  await page.route('https://ai.example.test/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify({suggestions:[{key:'summary',text:'APPROVED_NEW_WORDING Trần Tấn Phát',reason:'Concise evidence'},{key:'unknown.key',text:'Do not apply'}]})}}]})}));
  await click('#am-cv-opt-btn');await page.waitForSelector('#am-cv-apply-proposals');
  assert.equal(await page.locator('[data-proposal]').count(),1);
  await page.locator('[data-proposal="0"]').check();await click('#am-cv-apply-proposals');await ready();
  assert.match(await page.locator('[data-cv-key="summary"]').textContent(),/APPROVED_NEW_WORDING/);
  await click('#am-cv-undo');await ready();assert.match(await page.locator('[data-cv-key="summary"]').textContent(),/OFFICIAL_AI_WORDING/);
  // A concurrent official edit rejects the stale draft revision.
  await page.evaluate(()=>{window.__docs.cv._revision++;window.__officialCv._revision++;});
  await click('#am-cv-publish');await page.waitForFunction(()=>document.getElementById('am-cv-draft-status').textContent.includes('save failed'));
  assert.equal(await page.evaluate(()=>window.__docs.cv._revision),2);
  assert.deepEqual(errors,[]);
  console.log('Workspace/CV redesign: full page, verified page target, explicit fit, draft recovery, AI stale/undo, offline/conflict, privacy and official exports passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});


