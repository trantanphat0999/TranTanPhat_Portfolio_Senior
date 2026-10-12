const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const JSZip=require('jszip');
const pdfmake=require('pdfmake/build/pdfmake.js');
pdfmake.vfs=require('pdfmake/build/vfs_fonts.js');
const source='Nguyễn An\nProduct Designer\nStudio One\n2024 – Present\nProduct design and research\nFigma\nan@example.com';
const fixtureText='Nguyen An Product Designer at Studio One. Product design and research. an@example.com';
const originalMock=fs.readFileSync(path.join(__dirname,'browser-regression.cjs'),'utf8').match(/const mock=`([\s\S]*?)`;/)[1];
const mock=originalMock+`
import {createProfileRepository} from './portfolio/profile-repository.js';
export const profileRepository=createProfileRepository({assertOwner:()=>{if(!window.__user)throw new Error('owner');},fallback:()=>window.__docs,pending:()=>window.__pending||[],get:async ref=>clone((ref.collection==='portfolio'?window.__docs:window.__privateDocs||{})[ref.id]||null),transaction:async callback=>{const writes=[];const result=await callback({get:async ref=>clone((ref.collection==='portfolio'?window.__docs:window.__privateDocs||{})[ref.id]||null),set:(ref,data)=>writes.push([ref,clone(data)]),delete:ref=>writes.push([ref,null])});if(window.__profileFailure)throw new Error('Simulated connection failure');window.__privateDocs||={};for(const [ref,data]of writes){const target=ref.collection==='portfolio'?window.__docs:window.__privateDocs;if(data===null)delete target[ref.id];else target[ref.id]=data;}return result;},committed:async data=>window.dispatchEvent(new CustomEvent('portfolio-profile-activated',{detail:{data}}))});
`;
(async()=>{
 fs.mkdirSync('test-results',{recursive:true});
 const {emptyPortfolio}=await import('../js/portfolio/profile-model.js');
 const data=emptyPortfolio();data.header={...data.header,name:'Nguyễn An',title:'Product Designer',email:'an@example.com'};data.summary.overview='Product design and research';data.projects.items=[{title:'Product design and research',description:'Product design and research',tags:['Figma']}];
 let mode='valid';
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.route('**/js/firebase-config.js*',route=>route.fulfill({contentType:'application/javascript',body:mock}));
  await page.route('https://ai.example.test/**',async route=>{
   if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,700));
   const output=structuredClone(data);if(mode==='invented')output.summary.overview='Invented world-class story';
   const request=route.request().postDataJSON();if(request.messages[1].content.includes('"mode":"optimize"'))output.summary.overview='Creates thoughtful product experiences grounded in design and research.';
   await route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify({portfolioJson:JSON.stringify(output),industry:'Product design',visualTheme:'design',summary:'Designer portfolio',warnings:['CV chưa có số điện thoại.'],generatedFields:output.summary.overview===data.summary.overview?[]:['summary.overview']})}}]})});
  });
  await page.goto(process.env.PORTFOLIO_TEST_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window._portfolioData);
  await page.locator('#admin-login-trigger').evaluate(el=>el.click());await page.locator('#admin-pw-input').fill('test');await page.locator('#admin-pw-submit').click();await page.waitForSelector('#admin-workspace:not([hidden])');
  await page.evaluate(()=>window.__aiConfig={connectionStatus:'success',baseUrl:'https://ai.example.test',apiKey:btoa('test'),model:'test'});
  await page.locator('#ws-fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.locator('#ws-fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  await page.locator('[data-ws-nav="import"]').click();await page.waitForSelector('#import-file');
  await page.locator('[data-ws-nav="content"]').click();await page.waitForFunction(()=>document.querySelector('#ws-content-builder [data-publish]'));await page.locator('[data-ws-nav="import"]').click();
  // Extract actual PDF, DOCX and Markdown bytes using the deployed parsers.
  const pdf=Buffer.from(await new Promise(resolve=>pdfmake.createPdf({content:fixtureText}).getBuffer(resolve)));
  const zip=new JSZip();zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');zip.file('word/document.xml',`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${fixtureText}</w:t></w:r></w:p></w:body></w:document>`);
  for(const file of [{name:'cv.pdf',mimeType:'application/pdf',buffer:pdf},{name:'cv.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await zip.generateAsync({type:'nodebuffer'})},{name:'cv.md',mimeType:'text/markdown',buffer:Buffer.from(source)}]){
   await page.locator('#import-file').setInputFiles(file);await page.waitForFunction(()=>!document.getElementById('import-source').disabled);assert.match(await page.locator('#import-source').inputValue(),/Product Designer/);
  }
  await page.locator('#import-file').setInputFiles({name:'bad.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid')});await page.waitForFunction(()=>!document.getElementById('import-source').disabled);assert.match(await page.locator('#import-status').textContent(),/không hợp lệ/);
  await page.locator('#import-source').fill(source);await page.locator('#import-profile-name').fill('Designer original');
  mode='invented';await page.locator('#import-analyze').click();await page.waitForFunction(()=>!document.getElementById('import-analyze').disabled);assert.match(await page.locator('#import-status').textContent(),/đổi hoặc thêm/);assert.equal(await page.locator('#import-review').isVisible(),false);
  mode='valid';await page.locator('#import-analyze').click();await page.waitForSelector('#import-review:not([hidden])');assert.equal(await page.locator('#import-save').isDisabled(),true);
  await page.locator('#import-draft-save').click();await page.waitForFunction(()=>document.getElementById('import-status').textContent.includes('Đã lưu nháp'));
  await page.screenshot({path:'test-results/import-cv-desktop.png'});
  await page.locator('#import-reviewed').check();await page.locator('#import-save').click();await page.waitForFunction(()=>document.getElementById('import-status').textContent.includes('Đã lưu “'));
  assert.equal(await page.evaluate(()=>window.__docs.header.name),'Tran Tan Phat');
  await page.locator('[data-ws-nav="profiles"]').click();await page.waitForSelector('[data-profile-id]');const originalId=await page.locator('[data-profile-id]').first().getAttribute('data-profile-id');await page.locator('[data-profile-id]').first().click();await page.waitForSelector('#profiles-reviewed');
  const before=await page.evaluate(()=>structuredClone(window.__docs));await page.locator('#profiles-reviewed').check();await page.locator('#profiles-activate').click();await page.waitForFunction(()=>window.__docs.header.name==='Nguyễn An');
  assert.equal(await page.evaluate(()=>window._portfolioData.header.name),'Nguyễn An');assert.equal(await page.locator('#avatar-img').getAttribute('src').then(x=>x.startsWith('data:image/svg+xml')),true);assert.equal(await page.locator('[data-pl="projectsGrid"] img').first().getAttribute('src').then(x=>x.startsWith('data:image/svg+xml')),true);
  assert.equal(await page.locator('#profiles-delete').isDisabled(),true);assert.equal(await page.locator('[data-profile-id]').count(),2);
  await page.locator('#profiles-reviewed').check();assert.equal(await page.locator('#profiles-activate').isDisabled(),true);
  assert.equal(await page.locator('#ws-content-builder [data-publish]').isDisabled(),true);
  const backupId=await page.locator('[data-profile-id]').first().getAttribute('data-profile-id');await page.locator(`[data-profile-id="${backupId}"]`).click();await page.waitForFunction(()=>document.getElementById('profiles-detail').textContent.includes('trước khi chuyển'));
  await page.locator('#profiles-reviewed').check();await page.locator('#profiles-activate').click();await page.waitForFunction(()=>window.__docs.header.name==='Tran Tan Phat');assert.equal(await page.evaluate(()=>window.__docs.header.avatar),before.header.avatar);
  // A stale preview must not overwrite an intervening edit.
  await page.locator(`[data-profile-id="${originalId}"]`).click();await page.waitForFunction(()=>document.getElementById('profiles-detail').textContent.includes('Designer original'));await page.evaluate(()=>window.__docs.header._revision++);await page.locator('#profiles-reviewed').check();await page.locator('#profiles-activate').click();await page.waitForFunction(()=>document.getElementById('profiles-status').textContent.includes('đã thay đổi'));assert.equal(await page.evaluate(()=>window.__docs.header.name),'Tran Tan Phat');
  // Failed commit preserves the old profile and permits an explicit retry.
  await page.locator(`[data-profile-id="${originalId}"]`).click();await page.waitForFunction(()=>document.getElementById('profiles-status').textContent.includes('Review nội dung'));await page.evaluate(()=>window.__profileFailure=true);await page.locator('#profiles-reviewed').check();await page.locator('#profiles-activate').click();await page.waitForFunction(()=>document.getElementById('profiles-status').textContent.includes('Simulated'));assert.equal(await page.evaluate(()=>window.__docs.header.name),'Tran Tan Phat');await page.evaluate(()=>window.__profileFailure=false);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/profile-library-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-ws-nav="import"]').click();await page.locator('#import-draft-restore').click();await page.waitForSelector('#import-review:not([hidden])');assert.equal(await page.locator('#import-save').isDisabled(),true);
  await page.locator('[name="import-mode"][value="optimize"]').check();await page.locator('#import-analyze').click();await page.waitForSelector('#import-review:not([hidden])');assert.ok(await page.locator('.profile-generated').count());await page.locator('#import-profile-name').fill('Designer optimized');await page.locator('#import-reviewed').check();await page.screenshot({path:'test-results/import-cv-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#import-save').click();await page.waitForFunction(()=>document.getElementById('import-status').textContent.includes('Đã lưu “'));
  mode='delay';await page.locator('#import-analyze').click();await page.locator('#import-cancel').click();await page.waitForFunction(()=>!document.getElementById('import-analyze').disabled);assert.equal(await page.locator('#import-review').isVisible(),false);
  // Existing editing is truly fullscreen, searchable, accessible and validates inline.
  await page.locator('[data-ws-nav="content"]').click();await page.locator('#ws-sections [data-ws-section="header"][data-ws-operation="edit"]').click();await page.waitForSelector('[data-key="name"]');assert.ok(await page.locator('#admin-edit-box').evaluate(el=>Math.abs(el.getBoundingClientRect().height-innerHeight)<2));await page.locator('[data-key="email"]').fill('bad-email');await page.locator('#admin-edit-save').click();await page.waitForSelector('#admin-form-errors:not([hidden])');assert.equal(await page.locator('[data-key="email"]').getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'email');
  await page.locator('#admin-form-filter').fill('phone');assert.ok(await page.locator('.am-form-group[hidden]').count());await page.locator('#admin-edit-cancel').click();
  assert.deepEqual(errors,[]);console.log('Profile import browser: PDF/DOCX/MD, original/optimize, review, draft, archives, switching, stale/failure, media and fullscreen/mobile passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
