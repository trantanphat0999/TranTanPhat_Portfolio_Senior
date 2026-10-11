import {normalizeConfig} from './config.js';
const compact=value=>String(value).normalize('NFKC').replace(/[\s\u00ad\u200b]/g,'').replace(/[–—−]/g,'-');
export async function inspectCvPdf(blob,fields,style={}) {
  const pdf=await import('../../vendor/pdf.min.mjs');pdf.GlobalWorkerOptions.workerSrc=new URL('../../vendor/pdf.worker.min.mjs',import.meta.url).href;
  const loading=pdf.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false}),document=await loading.promise;
  const issues=[],pages=[],config=normalizeConfig(style.renderConfig);let body='';
  try{
    for(let number=1;number<=document.numPages;number++){
      const page=await document.getPage(number),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
      const items=content.items.filter(x=>typeof x.str==='string'&&x.str.trim()),main=items.filter(x=>x.transform[5]>36);
      if(Math.abs(viewport.width-595.28)>1||Math.abs(viewport.height-841.89)>1)issues.push(`Page ${number} is not A4.`);
      if(!main.length)issues.push(`Page ${number} is blank.`);
      for(const item of main){
        const [a,b,c,d,x,y]=item.transform,size=Math.hypot(c,d)||Math.hypot(a,b);
        if(x<34||x+item.width>viewport.width-34||y<34||y>viewport.height-30)issues.push(`Text outside safe bounds on page ${number}: ${item.str.slice(0,45)}`);
        if(size<9.9)issues.push(`Small body text on page ${number}.`);
      }
      const last=main.at(-1)?.str||'',headings=new Set(fields.filter(x=>x.section!=='Header').map(x=>(config.headingLabels[x.section]||x.section).toUpperCase()));
      if(headings.has(last))issues.push(`Orphan section heading on page ${number}.`);
      const text=main.map(x=>x.str).join(' ');body+=text+' ';pages.push({number,text,items:main.length});
    }
    const normalized=compact(body);
    if(body.includes('\uFFFD'))issues.push('PDF text contains replacement characters.');
    let cursor=0;
    for(const field of fields.filter(x=>x.text?.trim())){
      const expected=compact(config.contactLabels[field.key]||field.text.replace(field.kind==='contact'?/^https?:\/\//:/^$/,'')),index=normalized.indexOf(expected,cursor);
      if(index<0)issues.push(`Missing or reordered PDF text: ${field.key}`);else cursor=index+expected.length;
    }
    return {passed:!issues.length,pages:document.numPages,issues:[...new Set(issues)],pageDetails:pages};
  }finally{await loading.destroy();}
}
