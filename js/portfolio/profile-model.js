import {clone, ensureItemIds, safeUrl} from '../admin/data-model.js';

export const PROFILE_SECTIONS=['header','summary','experience','skills','projects','achievements','education','contact','custom-blocks','metadata'];
export const emptyPortfolio=()=>({header:{name:'',title:'',tagline:'',email:'',phone:'',location:'',avatar:'',heroTags:[],experience:'',availability:'',linkedin:'',github:'',openToWork:false},summary:{overview:'',coreExpertise:[],leadership:[],careerObjective:''},experience:{jobs:[]},skills:{categories:[]},projects:{items:[]},achievements:{items:[]},education:{degrees:[],certifications:[]},contact:{email:'',phone:'',location:'',socials:[]},'custom-blocks':{version:1,blocks:[]},metadata:{}});
export const normalizedText=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
export function validateSource(text){
  if(typeof text!=='string'||text.trim().length<20)throw new Error('CV chưa có đủ văn bản. PDF scan cần được OCR trước khi nhập.');
  if(text.length>60000)throw new Error('CV vượt quá 60.000 ký tự. Hãy rút gọn hoặc chia file; nội dung không bị cắt ngầm.');
  return text;
}
export function validatePortfolio(value){
  if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Portfolio phải là một object.');
  const data=clone(value);
  for(const key of PROFILE_SECTIONS)if(!data[key]||Array.isArray(data[key])||typeof data[key]!=='object')throw new Error(`Thiếu section ${key}.`);
  const lists={summary:['coreExpertise','leadership'],experience:['jobs'],skills:['categories'],projects:['items'],achievements:['items'],education:['degrees','certifications'],contact:['socials'],'custom-blocks':['blocks']};
  for(const [section,keys]of Object.entries(lists))for(const key of keys)if(!Array.isArray(data[section][key])||data[section][key].length>200)throw new Error(`${section}.${key} phải là danh sách tối đa 200 mục.`);
  if(typeof data.header.name!=='string'||!data.header.name.trim())throw new Error('Họ tên là bắt buộc.');
  for(const key of ['name','title','email','phone','location','tagline','experience','availability','avatar','profilePhoto','linkedin','github'])if(data.header[key]!==undefined&&typeof data.header[key]!=='string')throw new Error(`header.${key} phải là văn bản.`);
  if(data.header.heroTags!==undefined&&(!Array.isArray(data.header.heroTags)||data.header.heroTags.some(x=>typeof x!=='string')))throw new Error('Hero tags phải là danh sách văn bản.');
  for(const [section,keys]of Object.entries(lists))for(const key of keys)for(const item of data[section][key])if(!item||Array.isArray(item)||typeof item!=='object')throw new Error(`Mỗi mục ${section}.${key} phải là một object.`);
  function visit(node,path='',depth=0){
    if(depth>12)throw new Error('Dữ liệu lồng quá sâu.');
    if(Array.isArray(node)){if(node.length>200)throw new Error('Danh sách quá dài.');node.forEach((item,i)=>visit(item,`${path}.${i}`,depth+1));return;}
    if(node&&typeof node==='object')for(const [key,item]of Object.entries(node)){
      if(['__proto__','constructor','prototype'].includes(key))throw new Error('Dữ liệu chứa khóa không hợp lệ.');
      if(['email'].includes(key)&&item&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))throw new Error(`Email không hợp lệ tại ${path}.${key}.`);
      if(['url','link','linkedin','github'].includes(key)&&item&&!safeUrl(item))throw new Error(`Link không hợp lệ tại ${path}.${key}.`);
      if(['image','cardImage','logo','avatar','profilePhoto'].includes(key)&&item&&!safeUrl(item,{image:true}))throw new Error(`Ảnh không hợp lệ tại ${path}.${key}.`);
      if(['icon','imageIcon'].includes(key)&&item&&!/^ri-[a-z0-9-]+$/.test(item))throw new Error(`Icon không hợp lệ tại ${path}.${key}.`);
      visit(item,`${path}.${key}`,depth+1);
    }else if(node!==null&&!['string','boolean','number'].includes(typeof node))throw new Error(`Giá trị không hợp lệ tại ${path}.`);
  }
  visit(data);
  for(const job of data.experience.jobs)if(!Array.isArray(job.highlights||[])||(job.highlights||[]).some(x=>!x||typeof x!=='object'))throw new Error('Highlights phải là danh sách object.');
  for(const category of data.skills.categories)if(!Array.isArray(category.skills)||category.skills.some(x=>!x||typeof x!=='object'))throw new Error('Skills phải là danh sách object.');
  for(const project of data.projects.items)if(project.tags!==undefined&&(!Array.isArray(project.tags)||project.tags.some(x=>typeof x!=='string')))throw new Error('Project tags phải là danh sách văn bản.');
  const modalIds=new Set();
  data.projects.items.forEach((item,i)=>{item.modalId||=`profile-project-${i}`;if(!/^[a-zA-Z0-9_-]+$/.test(item.modalId)||modalIds.has(item.modalId))throw new Error('Project modal ID không hợp lệ hoặc bị trùng.');modalIds.add(item.modalId);});
  return ensureItemIds(Object.fromEntries(PROFILE_SECTIONS.map(key=>[key,data[key]])));
}
export function leafFields(value,path=''){
  if(typeof value==='string')return value?[{path,text:value}]:[];
  if(!value||typeof value!=='object')return [];
  return Object.entries(value).flatMap(([key,item])=>key.startsWith('_')?[]:leafFields(item,path?`${path}.${key}`:key));
}
// Original mode is enforced in code: every content string must be an exact
// excerpt (apart from whitespace from the PDF/Word extractor).
export function validateOriginal(data,source){
  const text=normalizedText(source);
  for(const field of leafFields(data)){
    if(/\.(icon|imageIcon|modalId)$/.test(field.path)||field.path.startsWith('metadata.'))continue;
    if(/^custom-blocks\.blocks\.\d+\.(id|iconId|type|placement|status|title)$/.test(field.path))continue;
    if(/^custom-blocks\.blocks\.\d+\.body$/.test(field.path)){
      if(field.text.split('\n').filter(x=>x.trim()).some(line=>!text.includes(normalizedText(line))))throw new Error('Nội dung CV bổ sung đã thay đổi so với nguồn.');
      continue;
    }
    if(!text.includes(normalizedText(field.text)))throw new Error(`Import nguyên bản đã đổi hoặc thêm nội dung tại ${field.path}. Hãy phân tích lại hoặc dùng optimize.`);
  }
  return data;
}
export function importProposal(result,source,mode){
  validateSource(source);
  const raw=JSON.parse(result.portfolioJson),data=validatePortfolio({...emptyPortfolio(),...raw,'custom-blocks':{version:1,blocks:[]},metadata:{}});
  if(mode==='original'){
    validateOriginal(data,source);
    const mapped=leafFields(data).filter(field=>!/(icon|modalId)$/.test(field.path)).map(field=>normalizedText(field.text)).filter(Boolean).sort((a,b)=>b.length-a.length);
    const unmapped=source.split(/\r?\n/).filter(line=>{
      let remaining=normalizedText(line);if(!remaining)return false;
      for(const excerpt of mapped){if(excerpt.includes(remaining))return false;remaining=remaining.split(excerpt).join(' ');}
      return remaining.replace(/[^\p{L}\p{N}]/gu,'').length>=3;
    });
    // Exact source lines that AI did not place are retained visibly as a
    // supplemental block, rather than silently disappearing from original mode.
    if(unmapped.length){
      data['custom-blocks'].blocks.push({id:crypto.randomUUID(),title:'Nội dung CV bổ sung',type:'text',body:unmapped.join('\n'),items:[],iconId:'tools',placement:'summary',status:'active',includeInCv:false});
      result={...result,warnings:[...result.warnings,`${unmapped.length} dòng nguồn chưa được phân loại đầy đủ. Đã giữ nguyên trong Nội dung CV bổ sung để bạn review.`]};
    }
  }
  if(mode==='optimize'){
    const sourceText=normalizedText(source);
    // Protect identity, chronology and named qualifications even in optimize.
    const facts=/^(header\.(name|title|email|phone|location|linkedin|github)|contact\.(email|phone|location)|experience\.jobs\.\d+\.(company|role|period)|skills\.categories\.\d+\.skills\.\d+\.title|education\.(degrees|certifications)\.\d+\.(title|institution|issuer|period|year|link)|projects\.items\.\d+\.(title|detailDuration|detailClient|detailRole))$/;
    for(const field of leafFields(data))if(facts.test(field.path)&&!sourceText.includes(normalizedText(field.text)))throw new Error(`AI đã đổi hoặc suy đoán dữ kiện tại ${field.path}. Hãy phân tích lại.`);
  }
  if(!Array.isArray(result.generatedFields)||!Array.isArray(result.warnings))throw new Error('Thiếu thông tin review của AI.');
  if(!['technology','design','business','health','education','general'].includes(result.visualTheme))throw new Error('Chủ đề hình ảnh không hợp lệ.');
  const fields=leafFields(data),paths=new Set(fields.map(field=>field.path));
  const generatedFields=mode==='optimize'?[...new Set([...result.generatedFields.filter(path=>paths.has(path)),...fields.filter(field=>!normalizedText(source).includes(normalizedText(field.text))&&!field.path.startsWith('metadata.')&&!/\.(icon|imageIcon|modalId)$/.test(field.path)).map(field=>field.path)])]:[];
  return {data,analysis:{industry:result.industry,visualTheme:result.visualTheme,summary:result.summary,warnings:result.warnings,generatedFields},source:{text:source,mode}};
}
export function profileSummary(data){return `${data.header?.title||'Chưa có chức danh'} · ${data.experience?.jobs?.length||0} công việc · ${data.projects?.items?.length||0} dự án`;}
