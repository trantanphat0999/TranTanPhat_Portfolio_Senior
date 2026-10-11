/* Read-only official CV review: no authentication or database mutations. */
const {chromium}=require('playwright');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/*',route=>/\/(?:Commit|Write)\b|signInWithPassword|sendOobCode/.test(route.request().url())?route.abort():route.continue());
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   const service=await import('/js/cv/service.js'),{recruiterDraft}=await import('/js/cv/recruiter.js'),{candidateFields}=await import('/js/cv/proposal.js'),{createCvPdf}=await import('/js/cv/pdf.js'),{inspectCvPdf}=await import('/js/cv/quality.js');
   const official=await service.loadOfficialCv();if(!official)throw new Error('No official CV is available.');
   const source=await service.resolvePublicCv(official.version===4?{cv:official}:{...await service.loadCvSource(),cv:official});
   const draft=recruiterDraft({fields:source.fields,overrides:{},excluded:[],style:source.style}),fields=candidateFields(draft),style={...draft.style,renderConfig:draft.config};
   const pdf=await createCvPdf(fields,style),quality=await inspectCvPdf(pdf.blob,fields,style);
   if(!pdf.fits||!quality.passed)throw new Error(JSON.stringify({pages:pdf.pages,issues:quality.issues}));
   const snapshot=await service.officialCvSnapshot(fields,pdf,style,official._revision||0);
   return {draft,snapshot,quality,review:service.reviewCv(fields,pdf,style),bytes:Array.from(new Uint8Array(await pdf.blob.arrayBuffer()))};
  });
  fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('cv/CV_TranTanPhat_SeniorQA_Reviewed.pdf',Buffer.from(result.bytes));delete result.bytes;
  fs.writeFileSync('cv/CV_TranTanPhat_SeniorQA_Reviewed.json',JSON.stringify(result.snapshot,null,2));
  fs.writeFileSync('test-results/cv-recruiter-reviewed-draft.json',JSON.stringify(result.draft,null,2));
  fs.writeFileSync('test-results/cv-recruiter-reviewed-report.json',JSON.stringify({quality:result.quality,review:result.review},null,2));
  console.log(JSON.stringify({review:result.review,quality:{passed:result.quality.passed,pages:result.quality.pages,issues:result.quality.issues}},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
