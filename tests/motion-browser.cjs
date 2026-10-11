const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const mock=fs.readFileSync('tests/browser-regression.cjs','utf8').match(/const mock=`([\s\S]*?)`;/)[1];
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/js/firebase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:mock}));
    await page.route('https://cdn.jsdelivr.net/npm/@emailjs/**',r=>r.abort());
    await page.goto(process.env.PORTFOLIO_TEST_URL||'http://127.0.0.1:5173/',{waitUntil:'load'});
    await page.waitForFunction(()=>window._portfolioData&&document.documentElement.classList.contains('hero-motion-active'));
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-reveal]')].every(el=>el.classList.contains('is-revealed')));
    await page.locator('#avatar-img').evaluate(img=>img.decode());
    assert.match(await page.locator('#avatar-img').evaluate(img=>img.currentSrc),/avatar-(320|640)\.webp$/);
    assert.equal(await page.locator('.project-detail-image[src]').count(),0,'Hidden project images wait for opening');
    assert.equal(await page.evaluate(()=>!!window.AOS),false);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('nav')).backdropFilter),'none');
    await page.mouse.move(100,400);await page.mouse.wheel(0,480);
    await page.waitForFunction(()=>scrollY>=470);await page.waitForTimeout(150);
    const down=await page.evaluate(()=>scrollY);
    await page.mouse.wheel(0,-240);await page.waitForFunction(y=>scrollY<y-200,down);
    // Native nested scrolling must not steer the document.
    await page.evaluate(()=>{const panel=document.createElement('div');panel.id='motion-nested';panel.style.cssText='position:fixed;inset:100px auto auto 100px;width:240px;height:160px;overflow:auto;z-index:99999;background:white';panel.innerHTML='<div style="height:1200px">Nested scroll</div>';document.body.append(panel);});
    await page.waitForTimeout(150);const before=await page.evaluate(()=>scrollY);
    await page.mouse.move(150,150);await page.mouse.wheel(0,200);
    await page.waitForFunction(()=>document.getElementById('motion-nested').scrollTop>100);
    assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<2);
    await page.locator('#motion-nested').evaluate(el=>el.remove());
    // Ambient loops pause outside the hero without restarting entrance effects.
    await page.evaluate(()=>scrollTo({top:4000,behavior:'instant'}));
    await page.waitForFunction(()=>!document.documentElement.classList.contains('hero-motion-active'));
    assert.equal(await page.locator('.aurora-blob-1').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.waitForFunction(()=>document.documentElement.classList.contains('hero-motion-active'));
    assert.equal(await page.locator('[data-reveal]:not(.is-revealed)').count(),0);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('hero-motion-active')),false);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(()=>document.documentElement.classList.contains('hero-motion-active'));
    // An explicit smooth navigation is interrupted by a physical wheel gesture.
    await page.locator('.nav-link[data-target="contact"]').evaluate(el=>el.click());
    await page.waitForTimeout(80);await page.mouse.move(80,350);await page.mouse.wheel(0,-120);
    await page.waitForTimeout(200);const interrupted=await page.evaluate(()=>scrollY);
    await page.waitForTimeout(300);
    assert.ok(Math.abs(await page.evaluate(()=>scrollY)-interrupted)<3,'No accumulated JS target after interruption');
    // Refresh of one section preserves unrelated DOM and horizontal scroll state.
    await page.evaluate(()=>{window.__keptProject=document.querySelector('.project-card');window.__keptExperience=document.querySelector('[data-pl="experienceJobs"]')||document.querySelector('#experience');document.querySelector('.projects-scroll').scrollTo({left:300,behavior:'instant'});window.__docs.contact.email='motion-refresh@example.test';window.dispatchEvent(new Event('focus'));});
    await page.waitForFunction(()=>window._portfolioData.contact.email==='motion-refresh@example.test');
    assert.equal(await page.locator('[data-pl="contact-email"]').textContent(),'motion-refresh@example.test');
    assert.equal(await page.evaluate(()=>window.__keptProject===document.querySelector('.project-card')),true);
    assert.equal(await page.evaluate(()=>window.__keptExperience.isConnected),true);
    assert.ok(await page.locator('.projects-scroll').evaluate(el=>el.scrollLeft)>=290);
    await page.evaluate(()=>{window.__docs.projects.items[0].description+=' Updated case study.';window.dispatchEvent(new Event('focus'));});
    await page.waitForFunction(()=>window._portfolioData.projects.items[0].description.endsWith(' Updated case study.'));
    assert.ok(await page.locator('.projects-scroll').evaluate(el=>el.scrollLeft)>=290,'Changed projects retain carousel position');
    // A changed earlier section should preserve the section the visitor reads.
    await page.evaluate(()=>scrollTo({top:document.getElementById('projects').getBoundingClientRect().top+scrollY+120,behavior:'instant'}));
    await page.waitForTimeout(200);
    const readingTop=await page.locator('#projects').evaluate(el=>el.getBoundingClientRect().top);
    await page.evaluate(()=>{window.__docs.summary.overview+=' '+('Additional reviewed experience. '.repeat(60));window.dispatchEvent(new Event('focus'));});
    await page.waitForFunction(()=>window._portfolioData.summary.overview.includes('Additional reviewed experience.'));
    assert.ok(Math.abs(await page.locator('#projects').evaluate(el=>el.getBoundingClientRect().top)-readingTop)<3,'Reading anchor survives earlier section growth');
    // An owner replacement must clear both WebP and JPEG responsive sources.
    await page.evaluate(()=>{window.__docs.header.profilePhoto='image/SS1.png';window.__docs.header.avatar='image/SS1.png';window._reloadPortfolioSection('header');});
    await page.waitForFunction(()=>document.getElementById('avatar-img').getAttribute('src')==='image/SS1.png');
    assert.equal(await page.locator('#avatar-img').getAttribute('srcset'),null);
    assert.equal(await page.locator('#avatar-img').evaluate(el=>el.closest('picture').querySelector('source').getAttribute('srcset')),null);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!document.documentElement.classList.contains('hero-motion-active'));
    await page.locator('.nav-link[data-target="education"]').evaluate(el=>el.click());
    await page.waitForFunction(()=>Math.abs(document.getElementById('education').getBoundingClientRect().top-document.querySelector('nav').offsetHeight-12)<3);
    await page.waitForFunction(()=>document.querySelector('.nav-link.active')?.dataset.target==='education');
    assert.deepEqual(errors,[]);
    console.log('Native wheel/reversal/nested scroll, interruptible navigation, motion lifecycle, responsive owner images and selective refresh passed.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
