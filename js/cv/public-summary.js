import { applicationSelection, selectedFields, validateCvFields } from './model.js';
import { createCvPdf } from './pdf.js';

// Extract source wording only; never invent claims or modify portfolio content.
function excerpt(value, maximum) {
  const text=String(value||'').replace(/\s+/g,' ').trim();
  if(text.length<=maximum)return text;
  const opening=text.slice(0,maximum-1);
  const sentence=Math.max(opening.lastIndexOf('. '),opening.lastIndexOf('; '));
  if(sentence>=maximum*.55)return opening.slice(0,sentence+1);
  const boundary=opening.lastIndexOf(' ');
  return opening.slice(0,boundary>maximum*.55?boundary:opening.length).trimEnd()+'…';
}

export function summarizePublicCv(fields, level=0) {
  const tier=Math.max(0,Math.min(3,level));
  const limits=[
    {job:6,project:3,cert:6,degree:3,bullets:4,skills:8,achievements:3,detail:420,summary:700},
    {job:5,project:2,cert:4,degree:2,bullets:3,skills:7,achievements:2,detail:300,summary:500},
    {job:4,project:2,cert:3,degree:2,bullets:2,skills:6,achievements:2,detail:220,summary:380},
    {job:3,project:1,cert:2,degree:1,bullets:1,skills:4,achievements:1,detail:130,summary:250},
  ][tier];
  const concise=selectedFields(fields,applicationSelection(fields));
  const groups={};
  for(const field of concise){
    if(!field.group)continue;
    const type=field.group.split('.')[0];
    groups[type]??=[];
    if(!groups[type].includes(field.group))groups[type].push(field.group);
  }
  // Prefer measurable outcomes, preserving source order for equal scores.
  const rankedBullets=new Map();
  for(const group of Object.values(groups).flat()){
    rankedBullets.set(group,concise.filter(x=>x.group===group&&x.kind==='bullet')
      .sort((a,b)=>Number(/\d|reduc|improv|deliver|automat/i.test(b.text))-Number(/\d|reduc|improv|deliver|automat/i.test(a.text)))
      .slice(0,limits.bullets).map(x=>x.key));
  }
  let skills=0,achievements=0;
  return validateCvFields(concise.filter(field=>{
    const type=field.group?.split('.')[0];
    if(type&&limits[type]!==undefined&&groups[type].indexOf(field.group)>=limits[type])return false;
    if(field.kind==='bullet'&&field.group&&!rankedBullets.get(field.group).includes(field.key))return false;
    if(field.kind==='skill'&&++skills>limits.skills)return false;
    if(field.key.startsWith('achievement.')&&++achievements>limits.achievements)return false;
    return Boolean(field.text?.trim());
  }).map(field=>({...field,text:excerpt(
    !field.custom&&field.brief?field.brief:field.text,
    field.key==='summary'?limits.summary:field.kind==='name'?120:field.kind==='contact'?180:limits.detail
  )})));
}

export async function createPublicCvPdf(fields, style={}, isCancelled=()=>false) {
  for(let level=0;level<=3;level++){
    if(isCancelled())return null;
    const summary=summarizePublicCv(fields,level);
    const result=await createCvPdf(summary,{...style,pageLimit:2});
    if(isCancelled())return null;
    if(result.fits)return {...result,fields:summary,summaryLevel:level};
  }
  throw new Error('The CV could not be fitted into two pages');
}
