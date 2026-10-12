const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=fs.readFileSync('tests/browser-regression.cjs','utf8').match(/const mock=`([\s\S]*?)`;/)[1];
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.route('**/js/firebase-config.js*',route=>route.fulfill({contentType:'application/javascript',body:base}));
  let mode='good',release;
  await page.route('https://section-ai.example/**',async route=>{
   requests.push(route.request().postDataJSON());if(mode==='hold')await new Promise(resolve=>release=resolve);
   const result={label:'Research notebook',reason:'Open notebook with evidence lines.',paths:mode==='invalid'?['<script>alert(1)</script>']:['M 4 3 L 20 3 L 20 21 L 4 21 Z','M 8 8 L 16 8','M 8 12 L 16 12','M 8 16 L 13 16']};
   await route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]})});
  });
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window._portfolioData);
  await page.locator('#admin-login-trigger').evaluate(el=>el.click());await page.locator('#admin-pw-input').fill('test');await page.locator('#admin-pw-submit').click();
  await page.locator('[data-ws-nav=content]').click();await page.locator('[data-content-tab=blocks]').click();
  const builder=page.locator('#ws-content-builder');await page.locator('#ws-add-section').click();
  await builder.locator('[data-section-setting=title]').fill('Research & papers');await builder.locator('[data-section-setting=body]').fill('Reviewed research and publications.');await builder.locator('[data-section-setting=placement]').selectOption('projects');
  const fields={};
  for(const [type,label]of [['text','Paper'],['textarea','Abstract'],['url','Evidence'],['number','Year'],['date','Published'],['email','Author email'],['boolean','Peer reviewed'],['tags','Topics'],['select','Category']]){
   await builder.locator('[data-add-field]').click();const row=builder.locator('[data-field-id]').last();fields[type]=await row.getAttribute('data-field-id');
   await row.locator('[data-schema=label]').fill(label);await row.locator('[data-schema=type]').selectOption(type);
   if(type==='text')await row.locator('[data-schema=required]').check();if(type==='select')await row.locator('[data-schema=options]').fill('Study\nArticle');
  }
  await builder.locator('[data-add-section-item]').click();
  const values={text:'API reliability study',textarea:'ADMIN_ITEM_PRIVATE_SENTINEL until publish',url:'https://example.com/research',number:'2026',date:'2026-10-12',email:'author@example.com',tags:'QA, Reliability',select:'Study'};
  for(const [type,value]of Object.entries(values)){const input=builder.locator(`[data-section-value="${fields[type]}"]`);if(type==='select')await input.selectOption(value);else await input.fill(value);}
  await builder.locator(`[data-section-value="${fields.boolean}"]`).check();
  await builder.locator('[data-section-setting=includeInCv]').check();await builder.locator('[data-section-setting=iconBrief]').fill('A clear notebook symbol');
  await builder.locator('[data-save]').click();await page.waitForFunction(()=>window.__privateDocs?.['custom-blocks']?._revision===1);
  assert.equal(await page.locator('[data-dynamic-section]').count(),0);
  await builder.locator('[data-publish]').click();await page.waitForFunction(()=>document.querySelector('#ws-content-builder [data-status]').textContent.includes('AI icon'));
  assert.equal(await page.evaluate(()=>window.__docs['custom-blocks']?._revision||0),0);
  await page.evaluate(()=>window.__aiConfig={connectionStatus:'success',baseUrl:'https://section-ai.example/v1',apiKey:btoa('fixture'),model:'test'});
  mode='hold';await builder.locator('[data-generate-section-icon]').click();await page.waitForFunction(()=>document.querySelector('[data-cancel-section-icon]')?.hidden===false);
  for(let i=0;!release&&i<100;i++)await page.waitForTimeout(20);assert.ok(release);
  await builder.locator('[data-section-setting=title]').fill('Research & publications');release();release=null;
  await page.waitForFunction(()=>document.querySelector('#ws-content-builder [data-status]').textContent.includes('changed during'));
  assert.equal(await builder.locator('[data-apply-section-icon]').count(),0);
  mode='invalid';await builder.locator('[data-generate-section-icon]').click();await page.waitForFunction(()=>document.querySelector('#ws-content-builder [data-status]').textContent.includes('unsupported SVG'));
  mode='good';await builder.locator('[data-generate-section-icon]').click();await builder.locator('[data-apply-section-icon]').waitFor();
  assert.equal(await page.evaluate(()=>window.__docs['custom-blocks']?._revision||0),0);
  assert.ok(requests.every(request=>!JSON.stringify(request).includes('ADMIN_ITEM_PRIVATE_SENTINEL')));
  await builder.locator('[data-apply-section-icon]').click();await page.waitForFunction(()=>document.querySelector('[data-current-section-icon]').textContent.includes('applied'));
  await builder.locator(`[data-section-value="${fields.text}"]`).fill('');await builder.locator('[data-publish]').click();await page.waitForFunction(()=>document.querySelector('#ws-content-builder [data-status]').textContent.includes('required'));
  await builder.locator(`[data-section-value="${fields.text}"]`).fill('API reliability study');await builder.locator('[data-publish]').click();await page.waitForFunction(()=>window.__docs['custom-blocks']?._revision===1);
  const published=await page.evaluate(()=>window.__docs['custom-blocks'].blocks[0]),id=published.id;
  assert.equal(published.kind,'section');assert.equal(published.fields.length,9);assert.equal(published.iconBrief,undefined);
  assert.equal(await page.locator('[data-dynamic-section]').count(),1);assert.equal(await page.locator('[data-dynamic-nav]').count(),1);
  await page.locator('[data-content-tab=sections]').click();await page.locator('#ws-search').fill('Research & publications');
  assert.match(await page.locator('#ws-content-results').textContent(),/^1 \/ 9/);await page.locator(`[data-ws-custom-section="${id}"]`).click();
  await builder.locator('[data-section-setting=title]').waitFor();
  const cvFields=await page.evaluate(async()=>{const {customCvFields}=await import('/js/portfolio/custom-blocks.js');return customCvFields(window.__docs['custom-blocks']);});assert.equal(cvFields.length,11);
  const fieldRow=builder.locator(`[data-field-id="${fields.text}"]`);await fieldRow.locator('[data-schema=label]').fill('Publication');await builder.locator('[data-publish]').click();await page.waitForFunction(()=>window.__docs['custom-blocks']?._revision===2);
  assert.equal(await page.evaluate(()=>window.__docs['custom-blocks'].blocks[0].items[0].values[Object.keys(window.__docs['custom-blocks'].blocks[0].items[0].values)[0]]),'API reliability study');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/custom-section-admin-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/custom-section-admin.png'});
  await page.locator('#ws-view-site').click();await page.evaluate(()=>{const original=window.portfolioScroll.to;window.portfolioScroll.to=function(value){window.__sectionScroll=value;return original.call(this,value);};});
  await page.locator(`[data-dynamic-nav="${id}"]`).click();await page.waitForFunction(()=>Number.isFinite(window.__sectionScroll));
  await page.waitForFunction(()=>document.querySelector('[data-dynamic-nav]')?.classList.contains('active'));
  await page.screenshot({path:'test-results/custom-section-public.png'});
  await page.setViewportSize({width:390,height:844});await page.locator(`[data-dynamic-nav="${id}"]`).click();
  await page.waitForFunction(()=>{const target=document.querySelector('[data-dynamic-section]'),nav=document.querySelector('body>nav');return target&&target.getBoundingClientRect().top>=nav.getBoundingClientRect().bottom-2&&target.getBoundingClientRect().top<nav.getBoundingClientRect().bottom+30;});
  await page.waitForFunction(()=>document.querySelector('[data-dynamic-nav]')?.classList.contains('active'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/custom-section-public-mobile.png'});
  await page.evaluate(()=>window._adminNavigate('content'));await builder.locator('[data-section-hide]').click();await builder.locator('[data-publish]').click();await page.waitForFunction(()=>window.__docs['custom-blocks']?._revision===3);
  assert.equal(await page.locator('[data-dynamic-section],[data-dynamic-nav]').count(),0);
  await builder.locator('[data-section-hide]').click();await builder.locator('[data-section-setting=visibility]').selectOption('private');await builder.locator('[data-publish]').click();await page.waitForFunction(()=>window.__docs['custom-blocks']?._revision===4);
  assert.equal(await page.evaluate(()=>window.__docs['custom-blocks'].blocks.length),0);
  await builder.locator('[data-new-section]').click();await builder.locator('[data-section-setting=title]').fill('Draft B');await builder.locator('[data-restore]').click();
  await page.waitForFunction(()=>document.querySelector('[data-section-setting=title]')?.value==='Research & publications');
  await page.locator('#admin-logout').click();assert.equal(await builder.locator('[data-section-setting]').count(),0);
  assert.deepEqual(errors,[]);console.log('Custom sections: nine field types, private draft, icon generation/stale/invalid/review, validation, publish, stable field rename, CV source, dynamic nav, hide/private/restore/logout and mobile passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
