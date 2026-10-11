/* Independent PDF.js extraction for cross-checking legacy PyMuPDF punctuation. */
const {chromium}=require('playwright');const fs=require('node:fs');const crypto=require('node:crypto');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();await page.route('**/__pdf-check.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>PDF verification</title>'}));await page.goto('http://127.0.0.1:5173/__pdf-check.html');
  for(const filename of fs.readdirSync('test-results').filter(name=>/^cv-.*\.pdf$/.test(name))){
   const text=await page.evaluate(async filename=>{
    const pdf=await import('/vendor/pdf.min.mjs');pdf.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.mjs';
    const loading=pdf.getDocument({url:'/test-results/'+filename,isEvalSupported:false}),document=await loading.promise;let text='';
    try{for(let i=1;i<=document.numPages;i++){const page=await document.getPage(i),content=await page.getTextContent();text+=content.items.filter(x=>x.transform?.[5]>36).map(x=>x.str||'').join(' ')+' ';}}finally{await loading.destroy();}return text;
   },filename);
   const hash=crypto.createHash('sha256').update(fs.readFileSync('test-results/'+filename)).digest('hex');
   fs.writeFileSync('test-results/'+filename+'.text.json',JSON.stringify({hash,text}));
  }
  console.log('PDF.js extracted all CV fixtures for independent text verification.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
