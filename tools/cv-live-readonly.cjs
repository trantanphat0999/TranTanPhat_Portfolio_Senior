/* Optional smoke check: reads the deployed content; blocks server mutations. */
const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>/\/(?:Commit|Write)\b|signInWithPassword|sendOobCode/.test(route.request().url())?route.abort():route.continue());
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(7000);
 const result=await page.evaluate(async()=>{
   const service=await import('/js/cv/service.js'),summary=await import('/js/cv/public-summary.js');
   const source=await service.loadCvSource(),resolved=await service.resolvePublicCv(source);
   const result=await summary.createPublicCvPdf(resolved.fields,resolved.style),selected=result.fields;
   return {name:source.header.name,report:service.reviewCv(selected,result),fits:result.fits,fields:selected.map(x=>x.text),bytes:Array.from(new Uint8Array(await result.blob.arrayBuffer()))};
 });
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/cv-live-application.pdf',Buffer.from(result.bytes));fs.writeFileSync('test-results/live-application-fields.json',JSON.stringify(result.fields));
 console.log(JSON.stringify({name:result.name,report:result.report,fits:result.fits,pageErrors:errors},null,2));
 await page.screenshot({path:'test-results/live-cv-upgrade-desktop.png'});await browser.close();
 if(errors.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exit(1);});
