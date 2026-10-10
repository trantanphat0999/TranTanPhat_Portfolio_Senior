import { graphic } from '../icons.js';

// Decorate legacy markup and newly opened admin controls without changing
// their classes, click handlers or the icon names stored in portfolio data.
function decorate(icon){
  const legacy=[...icon.classList].find(name=>/^ri-[a-z0-9-]+-(line|fill)$/.test(name));
  if(!legacy)return;
  let label=icon.dataset.iconLabel||'';
  if(!label){
    const nav=icon.closest('.nav-link[data-target]');
    const skill=icon.closest('.skill-mini');
    const tag=icon.closest('[data-pl="heroTags"] > span');
    if(nav)label=nav.dataset.target;
    else if(skill)label=skill.querySelector('h4')?.textContent||'';
    else if(tag)label=tag.textContent;
    else if(icon.closest('#zalo-btn'))label='Zalo';
  }
  const brands=icon.dataset.iconMode!=='concept';
  const signature=`${legacy}|${label}|${brands}`;
  if(icon.dataset.iconSignature===signature&&icon.classList.contains('portfolio-icon-host'))return;
  icon.dataset.iconSignature=signature;
  icon.classList.add('portfolio-icon-host');icon.setAttribute('aria-hidden','true');
  icon.innerHTML=graphic(label,legacy,{brands});
}
function scan(root){
  if(root instanceof Element&&root.matches('i[class*="ri-"]'))decorate(root);
  root.querySelectorAll?.('i[class*="ri-"]').forEach(decorate);
}
scan(document);
const pending=new Set();let scheduled=false;
function flush(){scheduled=false;for(const root of pending)if(root.isConnected)scan(root);pending.clear();}
new MutationObserver(records=>{
  for(const record of records){
    if(record.type==='attributes')pending.add(record.target);
    else for(const node of record.addedNodes)if(node.nodeType===1&&node.namespaceURI!=='http://www.w3.org/2000/svg')pending.add(node);
  }
  if(pending.size&&!scheduled){scheduled=true;requestAnimationFrame(flush);}
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-icon-label','data-icon-mode']});
