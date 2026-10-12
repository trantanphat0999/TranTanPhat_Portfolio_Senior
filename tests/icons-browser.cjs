const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const mock=fs.readFileSync('tests/browser-regression.cjs','utf8').match(/const mock=`([\s\S]*?)`;/)[1];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/js/firebase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/remixicon/**',r=>r.abort());
  await page.route('https://unpkg.com/**',r=>r.abort());
  await page.route('https://cdn.jsdelivr.net/npm/@emailjs/**',r=>r.abort());
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window._portfolioData);
  const click=s=>page.locator(s).evaluate(e=>e.click());
  await page.waitForFunction(()=>document.querySelector('header [data-pl="heroTags"] [data-brand="postman"]')?.complete);
  const skills=page.locator('[data-pl="skillsCategories"]');
  assert.equal(await skills.locator('[data-brand="githubactions"]').count(),1);
  assert.equal(await skills.locator('[data-brand="github"]').count(),0);
  // Jira appears in both the existing tool skill and the Jira MCP workflow.
  for(const key of ['postman','jmeter','zap','akaat','javascript','sqlserver','jira','githubactions','scheduler','chatgpt','claude','grok','n8n'])assert.equal(await skills.locator(`[data-brand="${key}"]`).count(),key==='jira'?2:1,key);
  assert.deepEqual(await skills.locator('.portfolio-icon-cluster [data-brand]').evaluateAll(imgs=>imgs.map(img=>img.dataset.brand)),['chatgpt','claude','grok']);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.locator('#skills').scrollIntoViewIfNeeded();
   await page.locator('#skills').screenshot({path:`test-results/icons-skills-${width}.png`,style:'nav{visibility:hidden}'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  const unloaded=await page.locator('.portfolio-brand-mark').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.decode()));return imgs.filter(img=>!img.naturalWidth).map(img=>img.src);});
  assert.deepEqual(unloaded,[]);
  const missing=await page.locator('i[class*="ri-"]').evaluateAll(icons=>icons.filter(i=>/ri-[a-z0-9-]+-(line|fill)/.test(i.className)&&!i.querySelector('svg,img')).map(i=>i.className));
  assert.deepEqual(missing,[]);
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight-innerHeight,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('#back-to-top [data-symbol="up"]'));
  await click('#back-to-top');await page.waitForFunction(()=>scrollY<2);
  await page.waitForFunction(()=>document.querySelector('#back-to-top [data-symbol="down"]'));
  await click('#admin-login-trigger');await page.locator('#admin-pw-input').fill('test');await click('#admin-pw-submit');await page.waitForFunction(()=>document.body.classList.contains('admin-mode'));
  await page.locator('#admin-login-trigger').evaluate(el=>el.blur());
  await click('#skills-edit-btn');await click('#skills-edit-btn-container [data-action="content"]');
  await page.waitForFunction(()=>document.querySelector('#admin-edit-body .portfolio-icon-svg'));
  assert.equal(await page.locator('#admin-edit-body .portfolio-icon-host').evaluateAll(icons=>icons.every(icon=>getComputedStyle(icon,'::before').content==='none')),true);
  await click('#admin-edit-cancel');
  execFileSync(process.execPath,['tools/preview-icons.cjs']);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5173/test-results/icon-gallery.html',{waitUntil:'load'});
  await page.screenshot({path:'test-results/icon-gallery.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Icons verified with remote icon fonts blocked; all local brand assets, dynamic admin controls, direction changes and desktop/mobile layouts passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
