const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createAdminServer}=require('../tools/admin-server.cjs');
const mock=fs.readFileSync(path.join(__dirname,'browser-regression.cjs'),'utf8').match(/const mock=`([\s\S]*?)`;/)[1];
// Claude CLI panel: self-detection (service offline → running, signed out → signed in),
// preset, one-click activation stored on this device, chat through Claude, and turn off.
(async()=>{
 let authenticated=false;const calls=[];
 const {server}=await createAdminServer({port:5198,verifyAuth:async()=>({uid:'owner'}),
  inspectClaude:async()=>({binary:'claude',installed:true,compatible:true,missingFlags:[],authenticated,version:'9.9.9 (Claude Code)',authMethod:'claude.ai',subscription:'team',models:['sonnet','opus','haiku','fable']}),
  claudeCompletion:async(config,messages,{task})=>{calls.push({task,model:config.model,effort:config.effort});return {text:task==='connection-test'?'{"ok":true}':task==='connection-echo'?'PORTFOLIO_AI_PONG':'CLAUDE_CHAT_REPLY',model:config.model,resolvedModel:`claude-${config.model}-test`,usage:{inputTokens:600,outputTokens:20}};}});
 await new Promise(resolve=>server.listen(5198,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/firebase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window._portfolioData);
  await page.evaluate(()=>localStorage.removeItem('portfolio.claudeLocal'));
  await page.locator('#admin-login-trigger').evaluate(e=>e.click());await page.locator('#admin-pw-input').fill('test');await page.locator('#admin-pw-submit').click();
  await page.locator('[data-ws-nav=settings]').click();
  // Claude CLI is the default with nothing saved, and it has no Connect/pairing steps.
  await page.waitForSelector('#claude-status');assert.equal(await page.locator('[data-provider=claude]').getAttribute('aria-checked'),'true');assert.equal(await page.locator('#studio-api-steps').isHidden(),true);
  const row=key=>page.locator(`[data-row=${key}]`).getAttribute('data-state');
  assert.equal(await page.locator('[data-preset=balanced]').getAttribute('aria-checked'),'true');await page.locator('#claude-advanced').evaluate(node=>{node.open=true;});await page.locator('#claude-bridge').fill('http://127.0.0.1:5199');
  await page.waitForFunction(()=>document.querySelector('[data-row=service]')?.dataset.state==='bad');assert.match(await page.locator('#claude-fix').textContent(),/npm run admin:local/);
  await page.locator('#claude-bridge').fill('http://127.0.0.1:5198');
  await page.waitForFunction(()=>document.querySelector('[data-row=login]')?.dataset.state==='bad');assert.equal(await row('service'),'ok');assert.equal(await row('cli'),'ok');assert.match(await page.locator('#claude-fix').textContent(),/claude auth login/);assert.equal(await page.locator('#claude-pair').isHidden(),true);
  authenticated=true;await page.waitForFunction(()=>document.querySelector('[data-row=login]')?.dataset.state==='ok',null,{timeout:15000});assert.equal(await page.locator('#claude-fix').isHidden(),true);
  await page.locator('[data-preset=fast]').click();assert.equal(await page.locator('#claude-model').inputValue(),'haiku');
  await page.locator('#claude-activate').click();await page.waitForFunction(()=>document.getElementById('claude-message').textContent.includes('is active'),null,{timeout:20000});
  assert.deepEqual(await page.locator('#claude-checks li').evaluateAll(items=>items.map(item=>item.dataset.status)),['pass','pass','pass','pass','pass']);
  assert.ok(calls.every(call=>call.model==='haiku'&&call.effort==='low'));
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('portfolio.claudeLocal')));assert.equal(stored.active,true);assert.equal(stored.config.test.status,'success');
  assert.equal(await page.evaluate(()=>window.__aiConfig||null),null,'Claude activation must not need Firestore');
  await page.waitForFunction(()=>document.getElementById('studio-summary').textContent.includes('this computer'));assert.match(await page.locator('#claude-active').textContent(),/Active/);
  // Changing the preset marks unsaved changes; the stored activation stays usable.
  await page.locator('[data-preset=best]').click();assert.match(await page.locator('#claude-active').textContent(),/unsaved/);await page.locator('[data-preset=fast]').click();
  await page.locator('#claude-chat').click();await page.waitForSelector('#ai-chat-input');await page.locator('#ai-chat-input').fill('Summarize my QA experience');await page.locator('#ai-send-message').click();
  await page.waitForFunction(()=>document.getElementById('ai-chat-history').textContent.includes('CLAUDE_CHAT_REPLY'),null,{timeout:20000});assert.match(await page.locator('.am-chat-meta').last().textContent(),/claude-haiku-test/);
  assert.ok(calls.some(call=>call.task==='chat'));
  await page.locator('[data-ws-nav=settings]').click();await page.locator('#claude-off').click();await page.waitForFunction(()=>!localStorage.getItem('portfolio.claudeLocal'));assert.match(await page.locator('#claude-active').textContent(),/Not active/);
  // Admin opened from the AI service itself (npm run admin:local): same-origin job polling sends no
  // Origin header, and the page must find the service on its own port without a URL override.
  const own=await browser.newPage({viewport:{width:1400,height:950}});own.on('pageerror',e=>errors.push(e.message));
  await own.route('**/js/firebase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
  await own.goto('http://127.0.0.1:5198/',{waitUntil:'domcontentloaded'});await own.waitForFunction(()=>window._portfolioData);await own.evaluate(()=>localStorage.removeItem('portfolio.claudeLocal'));
  await own.locator('#admin-login-trigger').evaluate(e=>e.click());await own.locator('#admin-pw-input').fill('test');await own.locator('#admin-pw-submit').click();await own.locator('[data-ws-nav=settings]').click();
  await own.waitForFunction(()=>document.querySelector('[data-row=login]')?.dataset.state==='ok',null,{timeout:15000});assert.match(await own.locator('[data-row=service]').textContent(),/127\.0\.0\.1:5198/);
  await own.locator('#claude-activate').click();await own.waitForFunction(()=>/is active|Failed/.test(document.getElementById('claude-message').textContent),null,{timeout:20000});assert.match(await own.locator('#claude-message').textContent(),/is active/);
  await own.locator('#claude-chat').click();await own.waitForSelector('#ai-chat-input');await own.locator('#ai-chat-input').fill('Same-origin chat');await own.locator('#ai-send-message').click();
  await own.waitForFunction(()=>document.getElementById('ai-chat-history').textContent.includes('CLAUDE_CHAT_REPLY'),null,{timeout:20000});
  assert.deepEqual(errors,[]);
  console.log('Claude CLI panel: auto-detection, sign-in detection, preset, local activation without Firestore, chat, turn off and same-origin admin:local passed.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
