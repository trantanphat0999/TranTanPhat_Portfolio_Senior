import {normalizeBlock} from './custom-blocks.js';
import {SYMBOLS} from '../icons.js';
import {safeUrl} from '../admin/data-model.js';
import {validateGeneratedIcon,validateSectionFields,sectionValue} from './section-model.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sectionIcon(block){
 let paths=SYMBOLS[block.iconId]||SYMBOLS.tools;
 if(block.generatedIcon){try{paths=validateGeneratedIcon(block.generatedIcon).paths.map(path=>`<path d="${e(path)}"/>`).join('');}catch{}}
 return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
function customField(field,value){
 const text=sectionValue(field,value);if(!text)return '';
 let content=e(text).replace(/\n/g,'<br>');
 if(field.type==='url'&&safeUrl(text))content=`<a href="${e(safeUrl(text))}" target="_blank" rel="noopener noreferrer">${e(text)}</a>`;
 if(field.type==='email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))content=`<a href="mailto:${e(text)}">${e(text)}</a>`;
 if(field.type==='tags')content=text.split(',').map(tag=>tag.trim()).filter(Boolean).map(tag=>`<span class="custom-section-tag">${e(tag)}</span>`).join('');
 return `<div class="custom-section-field"><dt>${e(field.label)}</dt><dd>${content}</dd></div>`;
}
export function blockMarkup(raw,{heading=true}={}){
 const b=normalizeBlock(raw),icon=sectionIcon(b);
 const item=i=>`${i.title?`<strong>${e(i.title)}</strong> `:''}${e(i.text)}${safeUrl(i.url)?` <a href="${e(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">${e(i.url)}</a>`:''}`;
 const content=b.kind==='section'?`<div class="custom-section-grid">${b.items.map(i=>`<article class="custom-section-item" data-section-item="${e(i.id)}"><dl>${b.fields.map(field=>customField(field,i.values[field.id])).join('')}</dl></article>`).join('')}</div>`:b.items.length?(b.type==='cards'?`<div class="custom-card-grid">${b.items.map(i=>`<article>${item(i)}</article>`).join('')}</div>`:b.type==='key-value'?`<dl>${b.items.map(i=>`<dt>${e(i.title)}</dt><dd>${e(i.text)}</dd>`).join('')}</dl>`:`<ul>${b.items.map(i=>`<li>${item(i)}</li>`).join('')}</ul>`):'';
 return `<article class="portfolio-custom-block" data-block-id="${e(b.id)}">${heading?`<h3>${icon} ${e(b.title)}</h3>`:''}${b.body?`<p>${e(b.body).replace(/\n/g,'<br>')}</p>`:''}${content}</article>`;
}
const STYLE=`.portfolio-custom-block{padding:24px;margin:20px 0;border:1px solid #64748b44;border-radius:14px}.portfolio-custom-block h3{display:flex;align-items:center;gap:10px;font-size:20px}.portfolio-custom-block p,.portfolio-custom-block li{line-height:1.7;overflow-wrap:anywhere}.portfolio-custom-block ul{padding-left:20px;list-style:disc}.portfolio-custom-block a{text-decoration:underline}.custom-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}.custom-card-grid article{padding:16px;border:1px solid #64748b44;border-radius:10px}.portfolio-custom-block dt{font-weight:700}.portfolio-custom-block dd{margin:0 0 12px}
.portfolio-dynamic-section{margin-bottom:80px;scroll-margin-top:100px}.portfolio-dynamic-heading{display:flex;align-items:center;gap:12px;margin-bottom:24px}.portfolio-dynamic-heading>span{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#2d5b8e15;color:#2d5b8e;flex-shrink:0}.portfolio-dynamic-heading h2{font-size:30px;font-weight:700;overflow-wrap:anywhere;color:#1f2937}.portfolio-dynamic-section>.portfolio-custom-block{margin:0;background:#fff}.custom-section-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:18px;margin-top:16px}.custom-section-item{border:1px solid #64748b33;border-radius:12px;padding:20px;min-width:0}.custom-section-field{margin-bottom:14px}.custom-section-field:last-child{margin-bottom:0}.custom-section-field dt{font-size:12px;color:#64748b;margin-bottom:5px}.custom-section-field dd{font-size:14px;line-height:1.8;margin:0;overflow-wrap:anywhere}.custom-section-tag{display:inline-block;padding:3px 9px;background:#2d5b8e12;border-radius:16px;margin:3px;font-size:12px}.portfolio-custom-block svg{flex-shrink:0}
@media(max-width:700px){.portfolio-dynamic-heading h2{font-size:24px}.portfolio-custom-block{padding:16px}.custom-section-item{padding:16px}}`;
export function renderCustomBlocks(documentData){
 document.querySelectorAll('[data-custom-host],[data-dynamic-section],[data-dynamic-nav]').forEach(x=>x.remove());
 if(!document.getElementById('custom-block-style')){const style=document.createElement('style');style.id='custom-block-style';style.textContent=STYLE;document.head.append(style);}
 const sectionAnchors=new Map(),navAnchors=new Map();
 for(const raw of documentData?.blocks||[]){
  let b;try{b=normalizeBlock(raw);if(b.kind==='section')validateSectionFields(b.fields,b.items);}catch{continue;}
  if(b.visibility==='private'||b.status==='inactive'||!/^[a-zA-Z0-9_-]{8,80}$/.test(b.id))continue;
  const section=document.getElementById(b.placement);if(!section)continue;
  if(b.kind==='section'){
   const id=`portfolio-section-${b.id}`,node=document.createElement('section');node.id=id;node.dataset.dynamicSection=b.id;node.className='portfolio-dynamic-section';node.setAttribute('aria-labelledby',`${id}-heading`);
   node.innerHTML=`<div class="portfolio-dynamic-heading"><span>${sectionIcon(b)}</span><h2 id="${e(id)}-heading">${e(b.title)}</h2></div>${blockMarkup(b,{heading:false})}`;
   const anchor=sectionAnchors.get(b.placement)||section;anchor.after(node);sectionAnchors.set(b.placement,node);
   if(b.showInNav){
    const navAnchor=navAnchors.get(b.placement)||document.querySelector(`nav .nav-link[data-target="${b.placement}"]`);
    if(navAnchor){const button=document.createElement('button');button.type='button';button.className=navAnchor.className;button.classList.remove('active');button.dataset.dynamicNav=b.id;button.dataset.target=id;button.innerHTML=sectionIcon(b)+`<span>${e(b.title)}</span>`;navAnchor.after(button);navAnchors.set(b.placement,button);}
   }
  }else{
   let host=section.querySelector('[data-custom-host]');if(!host){host=document.createElement('div');host.dataset.customHost=b.placement;host.className='max-w-6xl mx-auto px-6';section.append(host);}host.insertAdjacentHTML('beforeend',blockMarkup(b));
  }
 }
 window.dispatchEvent(new Event('portfolio:render'));
}
