import {customCvFields} from '../portfolio/custom-blocks.js';
import { ensureItemIds, clone, safeUrl } from '../admin/data-model.js';

const text = value => String(value ?? '').trim();
const lines = value => (Array.isArray(value) ? value : text(value).split(/\n+/)).map(text).filter(Boolean);
const join = (...values) => values.map(text).filter(Boolean).join(' — ');
const firstSentence = value => text(value).match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || text(value);
export const SOURCE_KEYS = ['header','summary','experience','skills','projects','achievements','education','contact','custom-blocks'];
export const CV_SECTIONS = ['Professional Experience','Technical Skills','Key Projects','Selected Achievements','Quality Engineering Highlights','Education','Certifications'];
function dateRank(period) {
  if (/present|current|hiện tại/i.test(period || '')) return Infinity;
  const years = text(period).match(/(?:19|20)\d{2}/g);
  if(!years)return 0;
  const end=text(period).split(/\s+(?:-|–|—|to|đến)\s+/i).at(-1);
  const monthName=end.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)?.[1]?.toLowerCase();
  const month=monthName?['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthName)+1:Number(end.match(/\b(0?[1-9]|1[0-2])\/(?:19|20)\d{2}/)?.[1]||0);
  return Number(years.at(-1))*12+month;
}
// The portfolio is the only content source. The archived HTML is never used as
// an invisible substitute; stable keys follow records through reordering.
export async function buildCvFields(source) {
  const data = ensureItemIds(clone(source)), fields = [];
  function active(value) {
    if(Array.isArray(value))return value.filter(x=>x?.status!=='inactive').map(active);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,active(item)]));
    return value;
  }
  Object.keys(data).forEach(key=>data[key]=active(data[key]));
  const add = (key,section,kind,value,extra={}) => fields.push({key,section,kind,text:text(value),...extra});
  const h=data.header||{}, c=data.contact||{}, s=data.summary||{};
  add('name','Header','name',h.name);
  add('role','Header','role',h.title);
  [['location',h.location||c.location],['email',h.email||c.email],['phone',h.phone||c.phone],
    ['linkedin',h.linkedin||c.socials?.find(x=>/linkedin/i.test(x.name))?.url],
    ['github',h.github||c.socials?.find(x=>/github/i.test(x.name))?.url]].forEach(([key,value])=>
    add(`contact.${key}`,'Header','contact',value,{link:key==='email'?safeUrl(`mailto:${value}`):key==='phone'?safeUrl(`tel:${value}`):safeUrl(value)}));
  add('summary','Header','summary',s.overview||h.tagline);
  if(s.careerObjective)add('objective','Header','paragraph',s.careerObjective,{optional:true});
  [...data.experience?.jobs||[]].sort((a,b)=>dateRank(b.period)-dateRank(a.period)).forEach(job=>{
    const group=`job.${job._id}`, section=CV_SECTIONS[0];
    add(`${group}.role`,section,'itemTitle',job.role,{group});
    add(`${group}.date`,section,'date',job.period,{group});
    add(`${group}.company`,section,'company',job.company,{group});
    add(`${group}.location`,section,'meta',job.location,{group});
    add(`${group}.description`,section,'paragraph',job.description,{group,brief:firstSentence(job.description)});
    (job.highlights||[]).forEach(x=>add(`${group}.highlight.${x._id}`,section,'bullet',join(x.title,x.desc||x.description),{group}));
  });
  (data.skills?.categories||[]).forEach(x=>add(`skill.${x._id}`,CV_SECTIONS[1],'skill',`${x.name}: ${(x.skills||[]).map(y=>join(y.title||y.name,y.desc||y.description)).join('; ')}`,{brief:`${x.name}: ${(x.skills||[]).map(y=>text(y.title||y.name)).filter(Boolean).join(', ')}`}));
  (data.projects?.items||[]).forEach(project=>{
    const group=`project.${project._id}`, section=CV_SECTIONS[2];
    add(`${group}.title`,section,'itemTitle',project.title,{group});
    add(`${group}.date`,section,'date',project.detailDuration,{group});
    add(`${group}.role`,section,'meta',join(project.detailRole,project.detailClient),{group});
    add(`${group}.domain`,section,'paragraph',project.detailOverview||project.description,{group,brief:firstSentence(project.description||project.detailOverview).replace(/\.{3}$/,'.')});
    const technologies=lines(project.detailTechnologies||project.tags).join(', ');
    add(`${group}.tech`,section,'paragraph',technologies?`Technologies: ${technologies}`:'',{group,brief:technologies?`Technologies: ${technologies.replace(/\s*\([^)]*\)/g,'')}`:''});
    lines(project.detailResults).forEach((value,i)=>add(`${group}.impact.${i}`,section,'bullet',value,{group}));
    lines(project.detailResponsibilities).forEach((value,i)=>add(`${group}.responsibility.${i}`,section,'bullet',value,{group,optional:true}));
  });
  (data.achievements?.items||[]).forEach(x=>add(`achievement.${x._id}`,CV_SECTIONS[3],'bullet',join(x.title,x.subtitle,x.description)));
  [...s.coreExpertise||[],...s.leadership||[]].forEach(x=>add(`strength.${x._id}`,CV_SECTIONS[4],'bullet',join(x.title,x.description),{optional:true}));
  (data.education?.degrees||[]).forEach(degree=>{
    const group=`degree.${degree._id}`,section=CV_SECTIONS[5];
    add(`${group}.title`,section,'itemTitle',degree.title,{group});
    add(`${group}.date`,section,'date',degree.period,{group});
    add(`${group}.institution`,section,'company',degree.institution,{group});
    add(`${group}.description`,section,'paragraph',degree.description,{group});
  });
  (data.education?.certifications||[]).forEach(cert=>{
    const group=`cert.${cert._id}`,section=CV_SECTIONS[6];
    add(`${group}.title`,section,'itemTitle',cert.title,{group,link:safeUrl(cert.link)});
    add(`${group}.meta`,section,'meta',join(cert.issuer,cert.year,cert.credentialNote),{group});
  });
  return fields.concat(customCvFields(data['custom-blocks']));
}
export function applyOverrides(fields, overrides={}, origins={}) {
  return fields.map(field=>{
    // A custom rewrite is valid only for the exact source text it was based on.
    // Legacy drafts with no origin are restored locally but never auto-published.
    const custom=Object.hasOwn(overrides,field.key)&&(!Object.hasOwn(origins,field.key)||origins[field.key]===field.text);
    const result={...field,text:custom?String(overrides[field.key]):field.text,custom};
    if(field.key==='contact.email')result.link=safeUrl(`mailto:${result.text}`);
    else if(field.key==='contact.phone')result.link=safeUrl(`tel:${result.text}`);
    else if(['contact.linkedin','contact.github'].includes(field.key))result.link=safeUrl(result.text);
    return result;
  });
}
export function staleOverrides(fields,overrides={},origins={}) {
  const byKey=new Map(fields.map(x=>[x.key,x.text]));
  return Object.keys(overrides).filter(key=>!byKey.has(key)||origins[key]!==byKey.get(key));
}
export function selectedFields(fields,config={}) {
  const excluded=new Set(config.excluded||[]);
  const hiddenGroups=new Set(fields.filter(x=>x.kind==='itemTitle'&&excluded.has(x.key)).map(x=>x.group));
  return fields.filter(x=>!excluded.has(x.key)&&!hiddenGroups.has(x.group)).map(x=>({...x,text:config.concise&&!x.custom&&x.brief?x.brief:x.text}));
}
// Explicit owner action, never applied to the portfolio itself.
export function applicationSelection(fields) {
  const certs=fields.filter(x=>x.key.startsWith('cert.')&&x.kind==='itemTitle').sort((a,b)=>Number(/ISTQB|test|quality|automation/i.test(b.text))-Number(/ISTQB|test|quality|automation/i.test(a.text))).map(x=>x.group);
  const projects=[...new Set(fields.filter(x=>x.key.startsWith('project.')).map(x=>x.group))];
  const achievements=fields.filter(x=>x.key.startsWith('achievement.')).map(x=>x.key);
  return {concise:true,excluded:fields.filter(x=>x.optional||
    (x.key.startsWith('achievement.')&&achievements.indexOf(x.key)>=3)||
    (x.group?.startsWith('cert.')&&certs.indexOf(x.group)>=6)||
    (x.group?.startsWith('project.')&&(projects.indexOf(x.group)>=3||/\.impact\.[1-9]\d*$/.test(x.key)))
  ).map(x=>x.key)};
}
export function validateCvFields(fields) {
  if(!Array.isArray(fields)||!fields.length||!fields.some(x=>x.key==='name'&&text(x.text)))throw new Error('CV must contain a name.');
  return clone(fields);
}
