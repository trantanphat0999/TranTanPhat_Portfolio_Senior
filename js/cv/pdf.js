import { safeUrl } from '../admin/data-model.js';
import {normalizeConfig,normalizeStyle} from './config.js';
let libraryPromise;
function script(src) {
  return new Promise((resolve,reject)=>{
    const element=document.createElement('script');element.src=src;
    element.onload=resolve;element.onerror=()=>{element.remove();reject(new Error('PDF library could not load. Please retry.'));};
    document.head.appendChild(element);
  });
}
export async function ensurePdf() {
  if(!libraryPromise)libraryPromise=(async()=>{
    if(!window.pdfMake)await script('vendor/pdfmake.min.js');
    await script('vendor/vfs_fonts.js');
    window.pdfMake.addFonts({Roboto:{normal:'Roboto-Regular.ttf',bold:'Roboto-Medium.ttf',italics:'Roboto-Italic.ttf',bolditalics:'Roboto-MediumItalic.ttf'},NotoSerif:{normal:'NotoSerif-Regular.ttf',bold:'NotoSerif-Bold.ttf',italics:'NotoSerif-Italic.ttf',bolditalics:'NotoSerif-BoldItalic.ttf'}});
    return window.pdfMake;
  })().catch(error=>{libraryPromise=null;throw error;});
  return libraryPromise;
}
export function legacyDefinition(fields, style={}) {
  fields=fields.filter(field=>String(field.text||'').trim());
  const size=Math.max(10,Math.min(12.5,Number(style.fontSize)||10.5));
  const lineHeight=Math.max(1.12,Math.min(1.7,Number(style.lineHeight)||1.2));
  const margin=Math.max(36,Number(style.margin)||45.35);
  const content=[];
  let section='';
  for(let i=0;i<fields.length;i++){
    const field=fields[i];
    if(field.section!==section){
      section=field.section;
      if(section!=='Header'){content.push({text:section.toUpperCase(),style:'section',headlineLevel:1});content.push({canvas:[{type:'line',x1:0,y1:0,x2:595.28-margin*2,y2:0,lineWidth:0.6,lineColor:'#64748b'}],margin:[0,0,0,5]});}
    }
    if(field.kind==='contact'){
      const contacts=[field];while(fields[i+1]?.kind==='contact')contacts.push(fields[++i]);
      for(const row of [contacts.slice(0,3),contacts.slice(3)].map(row=>row.filter(x=>x.text))){const values=[];row.forEach((contact,j)=>{if(j)values.push({text:'   |   '});const part={text:contact.text.replace(/^https?:\/\//,'')};if(safeUrl(contact.link))part.link=safeUrl(contact.link);values.push(part);});if(values.length)content.push({text:values,fontSize:10,alignment:'center',margin:[0,0,0,2]});}
      continue;
    }
    if(!field.text)continue;
    const node={text:field.text,margin:[0,0,0,3],link:safeUrl(field.link)};
    if(!node.link)delete node.link;
    if(field.kind==='name')Object.assign(node,{fontSize:22,bold:true,alignment:'center',margin:[0,0,0,3]});
    else if(field.kind==='role')Object.assign(node,{fontSize:11,bold:true,alignment:'center',margin:[0,0,0,4]});
    else if(field.kind==='contact')Object.assign(node,{fontSize:8.3,alignment:'center',color:'#475569',margin:[0,0,0,1]});
    else if(field.kind==='summary')Object.assign(node,{margin:[0,7,0,6]});
    else if(field.kind==='itemTitle'){
      Object.assign(node,{bold:true,margin:[0,0,0,2]});
      if(section==='Certifications'&&fields[i+1]?.kind==='meta'&&fields[i+1].group===field.group){
        const meta=fields[++i];
        content.push({text:[{text:field.text,bold:true,...(node.link?{link:node.link}:{})},{text:meta.text?` | ${meta.text}`:'',color:'#475569'}],margin:[0,4,0,3]});continue;
      }
      const opening=[];
      if(fields[i+1]?.kind==='date'&&fields[i+1].group===field.group){const date=fields[++i];opening.push(node);if(date.text)opening.push({text:date.text,fontSize:10,color:'#475569',margin:[0,0,0,2]});}
      else opening.push(node);
      while(['company','meta'].includes(fields[i+1]?.kind)&&fields[i+1].group===field.group){const next=fields[++i];if(next.text)opening.push({text:next.text,bold:next.kind==='company',fontSize:next.kind==='meta'?10:size,color:'#475569',margin:[0,0,0,3]});}
      const next=fields[i+1];
      if(next&&next.group===field.group&&['bullet','paragraph'].includes(next.kind)&&next.text.length<300){i++;opening.push(next.kind==='bullet'?{ul:[next.text],margin:[0,0,0,3]}:{text:next.text,margin:[0,0,0,3]});}
      content.push({stack:opening,unbreakable:opening.reduce((n,x)=>n+(typeof x.text==='string'?x.text.length:0),0)<600,headlineLevel:2,margin:[0,6,0,2]});continue;
    }
    else if(field.kind==='bullet'){
      const bullets=[{text:field.text,margin:[0,0,0,2]}];
      while(fields[i+1]?.kind==='bullet'&&fields[i+1].section===section&&fields[i+1].group===field.group)bullets.push({text:fields[++i].text,margin:[0,0,0,2]});
      content.push({ul:bullets,margin:[0,0,0,3]});continue;
    }
    else if(field.kind==='skill'){
      const rows=[node];while(fields[i+1]?.kind==='skill'&&fields[i+1].section===section)rows.push({text:fields[++i].text,margin:[0,0,0,4]});
      content.push(...rows);continue;
    }
    else if(field.kind==='company')Object.assign(node,{bold:true,color:'#334155'});
    else if(field.kind==='meta'||field.kind==='date')Object.assign(node,{fontSize:10,color:'#475569'});
    content.push(node);
  }
  // Bind section heading + rule to the first real content block. Native
  // unbreakable stacks are more reliable than pageBreakBefore for nested nodes.
  const paginated=[];
  for(let index=0;index<content.length;index++){
    const heading=content[index];
    if(heading.headlineLevel!==1){paginated.push(heading);continue;}
    const rule=content[++index], first=content[++index];
    if(!first){paginated.push(heading,rule);continue;}
    const cleanHeading={...heading};delete cleanHeading.headlineLevel;
    let opening=first,continuation=null;
    if(first.stack&&first.unbreakable===false){
      const child=first.stack[0],value=typeof child.text==='string'?child.text:'';
      const cut=value.length>400?(value.lastIndexOf(' ',400)>0?value.lastIndexOf(' ',400):400):value.length;
      opening={...child,text:value.slice(0,cut)};
      continuation={stack:[...(cut<value.length?[{...child,text:value.slice(cut)}]:[]),...first.stack.slice(1)],margin:first.margin};
    }
    else if(Array.isArray(first.text)&&first.text.reduce((n,x)=>n+(x.text?.length||0),0)>500){
      const part=first.text[0],cut=part.text.lastIndexOf(' ',400)>0?part.text.lastIndexOf(' ',400):Math.min(400,part.text.length);
      opening={...first,text:[{...part,text:part.text.slice(0,cut)}]};
      continuation={...first,text:[...(cut<part.text.length?[{...part,text:part.text.slice(cut)}]:[]),...first.text.slice(1)]};
    }
    else if(first.ul?.length){
      const item=first.ul[0], value=typeof item==='string'?item:item.text;
      if(value.length>500){const cut=value.lastIndexOf(' ',400);if(cut>0){opening={text:value.slice(0,cut),margin:first.margin};continuation={ul:[typeof item==='string'?value.slice(cut):{...item,text:value.slice(cut)},...first.ul.slice(1)],margin:first.margin};}}
      else if(first.ul.length>1){opening={...first,ul:[item]};continuation={...first,ul:first.ul.slice(1)};}
    }
    else if(first.table?.body?.length>1){opening={...first,table:{...first.table,body:[first.table.body[0]]}};continuation={...first,table:{...first.table,body:first.table.body.slice(1)}};}
    else if(typeof first.text==='string'&&first.text.length>600){const cut=first.text.lastIndexOf(' ',500);if(cut>0){opening={...first,text:first.text.slice(0,cut)};continuation={...first,text:first.text.slice(cut)};}}
    paginated.push({stack:[cleanHeading,rule,opening],unbreakable:true});
    if(continuation)paginated.push(continuation);
  }
  return {
    pageSize:'A4',pageMargins:[margin,margin,margin,margin],
    defaultStyle:{font:style.fontFamily==='NotoSerif'?'NotoSerif':'Roboto',fontSize:size,lineHeight,color:'#0f172a'},
    styles:{section:{fontSize:11.5,bold:true,margin:[0,9,0,5]}},
    content:paginated,
    footer:(page,pages)=>({text:`${fields.find(x=>x.key==='name')?.text||''}  |  ${page} / ${pages}`,alignment:'right',fontSize:9,color:'#64748b',margin:[margin,12,margin,0]}),
    info:{title:`CV - ${fields.find(x=>x.key==='name')?.text||''}`,author:fields.find(x=>x.key==='name')?.text||''},
  };
}
export function definition(fields,style={}) {
  if(style.rendererVersion!==2)return legacyDefinition(fields,style);
  const effective=normalizeStyle(style),config=normalizeConfig(style.renderConfig);
  const display=fields.map(field=>({...field,text:(config.contactLabels[field.key]||field.text).replace(/[–—−]/g,'-')}));
  const document=legacyDefinition(display,effective);
  document.styles.section.margin=[0,effective.sectionSpacing,0,5];
  document.styles.section.fontSize=Math.max(11.5,effective.fontSize+.5);
  function tune(nodes){
    for(const node of nodes){
      if(node.fontSize===10)node.fontSize=effective.fontSize;
      if(node.style==='section'){const original=Object.keys(config.headingLabels).find(key=>key.toUpperCase()===node.text);if(original)node.text=config.headingLabels[original].toUpperCase();}
      if(node.stack){
        if(node.headlineLevel===2){
          node.margin=[0,effective.itemSpacing,0,2];
          if(effective.datePlacement==='inline'&&node.stack[1]?.fontSize===10&&node.stack[1]?.color==='#475569'){
            const title=node.stack.shift(),date=node.stack.shift();node.stack.unshift({text:[{text:title.text,bold:true},{text:`  |  ${date.text}`,bold:false,color:'#475569'}],margin:[0,0,0,2]});
          }
        }
        tune(node.stack);
      }
      if(node.ul)for(const bullet of node.ul)if(typeof bullet==='object')bullet.margin=[0,0,0,effective.bulletSpacing];
      if(node.alignment==='center'&&effective.headerAlignment==='left')node.alignment='left';
    }
  }
  tune(document.content);
  // Keep short experience/project records together, including any section heading.
  // Long records remain breakable so a large paragraph cannot create blank pages.
  const titles=fields.filter(x=>x.kind==='itemTitle'&&/^(job|project)\./.test(x.group||'')).map(x=>x.text.replace(/[–—−]/g,'-'));
  const strings=node=>[...(typeof node.text==='string'?[node.text]:Array.isArray(node.text)?node.text.map(x=>x.text||''):[]),...(node.stack||[]).flatMap(strings),...(node.ul||[]).flatMap(x=>typeof x==='string'?[x]:strings(x))];
  const startsRecord=node=>strings(node).some(value=>titles.includes(value));
  const startsSection=node=>node.style==='section'||node.stack?.some(startsSection);
  const grouped=[];
  for(let index=0;index<document.content.length;index++){
    const node=document.content[index];if(!startsRecord(node)){grouped.push(node);continue;}
    const record=[node];let end=index+1;
    while(end<document.content.length&&!startsRecord(document.content[end])&&!startsSection(document.content[end]))record.push(document.content[end++]);
    if(record.flatMap(strings).join('').length<=1400){grouped.push({stack:record,unbreakable:true});index=end-1;}else grouped.push(node);
  }
  document.content=grouped;return document;
}
async function render(fields,style) {
  const pdf=await ensurePdf();
  if(style?.fontFamily==='NotoSerif'&&!window.notoVfs)await script('vendor/noto_vfs.js');
  pdf.addVirtualFileSystem({...window.vfs,...window.notoVfs});
  const doc=pdf.createPdf(definition(fields,style));
  const buffer=await new Promise((resolve,reject)=>{
    try{
      const stream=doc.getStream({}),chunks=[];
      stream.on('data',chunk=>chunks.push(chunk));stream.on('error',reject);
      stream.on('end',()=>{const result=new Uint8Array(chunks.reduce((size,chunk)=>size+chunk.length,0));let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}resolve(result);});stream.end();
    }catch(error){reject(error);}
  });
  const binary=new TextDecoder('latin1').decode(buffer);
  const pages=(binary.match(/\/Type\s*\/Page\b/g)||[]).length;
  if(!pages||binary.slice(0,4)!=='%PDF')throw new Error('The PDF could not be validated. Please retry.');
  return {blob:new Blob([buffer],{type:'application/pdf'}),pages};
}
export async function createCvPdf(fields,style={}) {
  const effective=style.rendererVersion===2?normalizeStyle(style):{...style,fontSize:Math.max(10,Math.min(12.5,Number(style.fontSize)||10.5)),lineHeight:Math.max(1.12,Math.min(1.7,Number(style.lineHeight)||1.2)),margin:Math.max(36.85,Math.min(56.7,Number(style.margin)||45.35))};
  const limit=[1,2,3,4].includes(Number(style.pageLimit))?Number(style.pageLimit):0;
  let result=await render(fields,effective);
  if(style.rendererVersion!==2&&!style.locked&&limit&&result.pages>limit){
    // Fit spacing and margins first. Never crop text or shrink below 10 pt.
    Object.assign(effective,{margin:36.85,lineHeight:1.12,fontSize:10});
    result=await render(fields,effective);
  }
  return {...result,effectiveStyle:effective,pageLimit:limit,fits:!limit||result.pages<=limit};
}
export function downloadPdf(blob,filename='CV_TranTanPhat_SeniorQA.pdf') {
  const url=URL.createObjectURL(blob), anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
