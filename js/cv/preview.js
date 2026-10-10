import {safeUrl} from '../admin/data-model.js';

let library;
async function pdfLibrary(){
  if(!library)library=import('../../vendor/pdf.min.mjs').then(value=>{
    value.GlobalWorkerOptions.workerSrc=new URL('../../vendor/pdf.worker.min.mjs',import.meta.url).href;
    return value;
  }).catch(error=>{library=null;throw error;});
  return library;
}

// Render the exported PDF bytes themselves; never a separate HTML CV template.
export class CvPdfPreview {
  constructor(host){this.host=host;this.serial=0;this.document=null;this.tasks=[];this.zoom='fit';}
  clear(){
    this.serial++;this.tasks.forEach(task=>task.cancel());this.tasks=[];
    this.loading?.destroy().catch(()=>{});this.loading=null;
    this.document=null;
    this.host.replaceChildren();this.host.removeAttribute('data-pages');
  }
  async load(blob){
    this.clear();const token=this.serial;
    const pdf=await pdfLibrary(),data=new Uint8Array(await blob.arrayBuffer());
    if(token!==this.serial)return;
    const loading=this.loading=pdf.getDocument({data,isEvalSupported:false});
    const pdfDocument=await loading.promise;
    if(token!==this.serial){await loading.destroy();return;}
    this.document=pdfDocument;await this.render();
  }
  async render(zoom=this.zoom){
    this.zoom=zoom;if(!this.document||!this.host.clientWidth)return;
    const pdfDocument=this.document,token=++this.serial;
    this.tasks.forEach(task=>task.cancel());this.tasks=[];this.host.replaceChildren();
    try{
      for(let number=1;number<=pdfDocument.numPages;number++){
        const page=await pdfDocument.getPage(number);if(token!==this.serial)return;
        const base=page.getViewport({scale:1});
        const scale=zoom==='fit'?Math.min(this.host.clientWidth-24,840)/base.width:Number(zoom)/100;
        const viewport=page.getViewport({scale:Math.max(.2,scale)}),density=Math.min(window.devicePixelRatio||1,2);
        const section=document.createElement('article');section.className='cv-pdf-page';section.setAttribute('aria-label',`PDF page ${number} of ${pdfDocument.numPages}`);
        const label=document.createElement('p');label.className='cv-pdf-page-label';label.textContent=`PAGE ${number} / ${pdfDocument.numPages}`;
        const sheet=document.createElement('div');sheet.className='cv-pdf-sheet';sheet.style.width=`${viewport.width}px`;sheet.style.height=`${viewport.height}px`;
        const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',`CV page ${number}`);
        canvas.width=Math.ceil(viewport.width*density);canvas.height=Math.ceil(viewport.height*density);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
        sheet.appendChild(canvas);section.append(label,sheet);this.host.appendChild(section);
        const task=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:density===1?null:[density,0,0,density,0,0]});this.tasks.push(task);await task.promise;
        if(token!==this.serial)return;
        const [text,annotations]=await Promise.all([page.getTextContent(),page.getAnnotations()]);
        if(token!==this.serial)return;
        const accessible=document.createElement('div');accessible.className='cv-pdf-accessible';accessible.textContent=text.items.map(item=>item.str).join(' ');section.appendChild(accessible);
        for(const annotation of annotations){
          const href=safeUrl(annotation.url);if(!href||!annotation.rect)continue;
          const [a,b,c,d,e,f]=viewport.transform,[x0,y0,x1,y1]=annotation.rect;
          const rectangle=[a*x0+c*y0+e,b*x0+d*y0+f,a*x1+c*y1+e,b*x1+d*y1+f],link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',`Open ${href}`);
          Object.assign(link.style,{position:'absolute',left:`${Math.min(rectangle[0],rectangle[2])}px`,top:`${Math.min(rectangle[1],rectangle[3])}px`,width:`${Math.abs(rectangle[2]-rectangle[0])}px`,height:`${Math.abs(rectangle[3]-rectangle[1])}px`});sheet.appendChild(link);
        }
      }
      if(token===this.serial)this.host.dataset.pages=String(pdfDocument.numPages);
    }catch(error){if(token===this.serial&&error.name!=='RenderingCancelledException')throw error;}
  }
}
