import {normalizeConfig,normalizeStyle,arrangeFields,validateIdentity,STYLE_BOUNDS} from './config.js';
import {selectedFields,applyOverrides} from './model.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const immutable=field=>['name','role','contact','date','company','itemTitle','meta'].includes(field.kind);
export function validateEvidenceText(value,source){
  const numbers=value.match(/\d+(?:[.,]\d+)*(?:\+|%)?/g)||[];
  if(numbers.some(number=>!source.includes(number)))throw new Error('New numerical claim requires source evidence.');
  if(/certified|certification/i.test(value)&&!/certified|certification/i.test(source))throw new Error('New credential claim requires evidence.');
  for(const technology of ['Python','Java','Playwright','Cypress','Selenium','Docker','Kubernetes','JMeter','Postman','ISTQB','AWS','Azure','SQL','n8n']){
    const pattern=new RegExp(`\\b${technology}\\b`,'i');if(pattern.test(value)&&!pattern.test(source))throw new Error(`New technology claim needs evidence: ${technology}`);
  }
}
export function candidateFields(draft) {
  return arrangeFields(selectedFields(applyOverrides(draft.fields,draft.overrides,{}),draft),draft.config);
}
// Apply only to a clone. A bad operation rejects the entire transaction.
export function applyProposal(draft, operations, evidence=draft.fields) {
  if(!Array.isArray(operations)||operations.length>100)throw new Error('Invalid proposal operations.');
  const next=clone(draft),config=normalizeConfig(next.config),seen=new Set();next.config=config;next.overrides??={};next.excluded??=[];
  for(const operation of operations){
    const {type,key,value,sourceKeys=[]}=operation,token=`${type}:${key}`;
    if(seen.has(token))throw new Error('Conflicting duplicate operation.');seen.add(token);
    if(typeof key!=='string'||typeof value!=='string'||!Array.isArray(sourceKeys))throw new Error('Invalid operation.');
    const field=next.fields.find(x=>x.key===key);
    if(type==='rewriteField'){
      if(!field||immutable(field)||!value.trim()||value.length>10000)throw new Error(`This field cannot be rewritten by AI: ${key}`);
      if(!sourceKeys.length||sourceKeys.some(id=>!evidence.some(x=>x.key===id)))throw new Error('Rewrite needs valid source evidence.');
      const source=sourceKeys.map(id=>evidence.find(x=>x.key===id).text).join(' ');
      validateEvidenceText(value,source);
      next.overrides[key]=value;
    }else if(type==='setIncluded'){
      if(!field||!['true','false'].includes(value))throw new Error('Invalid include operation.');
      if(['name','role','contact.email'].includes(key)&&value==='false')throw new Error('Required identity cannot be excluded.');
      next.excluded=next.excluded.filter(x=>x!==key);if(value==='false')next.excluded.push(key);
      if(value==='true'&&field.group){const title=next.fields.find(x=>x.group===field.group&&x.kind==='itemTitle');if(title)next.excluded=next.excluded.filter(x=>x!==title.key);}
    }else if(type==='setStyle'){
      if(![...Object.keys(STYLE_BOUNDS),'fontFamily','pageLimit','headerAlignment','datePlacement'].includes(key))throw new Error('Unsupported style operation.');
      next.style={...next.style,[key]:Object.hasOwn(STYLE_BOUNDS,key)||key==='pageLimit'?Number(value):value,rendererVersion:2};
    }else if(type==='reorderSections'||type==='reorderGroups'){
      const order=JSON.parse(value),allowed=new Set(type==='reorderSections'?next.fields.filter(x=>x.section!=='Header').map(x=>x.section):next.fields.filter(x=>x.kind==='itemTitle'&&x.group).map(x=>x.group));
      if(!Array.isArray(order)||order.some(x=>!allowed.has(x)))throw new Error('Unknown order target.');
      config[type==='reorderSections'?'sectionOrder':'groupOrder']=order;
    }else if(type==='setContactLabel'||type==='setHeadingLabel'){
      if(type==='setContactLabel'&&(!field||field.kind!=='contact'||['contact.email','contact.phone','contact.location'].includes(key)))throw new Error('Only URL contact labels may be shortened.');
      if(type==='setHeadingLabel'&&(key==='Header'||!next.fields.some(x=>x.section===key)))throw new Error('Unknown section.');
      config[type==='setContactLabel'?'contactLabels':'headingLabels'][key]=value;
    }else throw new Error('Unsupported CV operation.');
  }
  next.config=normalizeConfig(config);next.style=normalizeStyle({...next.style,rendererVersion:2});delete next.style.locked;
  const selected=candidateFields(next);validateIdentity(selected);
  for(const field of selected.filter(x=>x.group?.startsWith('job.')&&x.kind==='itemTitle')){
    const group=selected.filter(x=>x.group===field.group);
    if(!group.some(x=>x.kind==='date'&&x.text.trim())||!group.some(x=>x.kind==='company'&&x.text.trim()))throw new Error('Experience must retain dates and employer.');
  }
  return next;
}
export function proposalDiff(before, after) {
  const old=candidateFields(before),next=candidateFields(after),oldKeys=new Set(old.map(x=>x.key)),newKeys=new Set(next.map(x=>x.key));
  const changes=[];
  for(const field of before.fields){
    const a=old.find(x=>x.key===field.key),b=next.find(x=>x.key===field.key);
    if(oldKeys.has(field.key)!==newKeys.has(field.key)||a?.text!==b?.text)changes.push({key:field.key,before:a?.text||'(excluded)',after:b?.text||'(excluded)'});
  }
  for(const key of ['config','style'])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))changes.push({key,before:JSON.stringify(before[key]||{}),after:JSON.stringify(after[key])});
  return changes;
}
