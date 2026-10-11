import {ensureItemIds,clone,newId} from '../admin/data-model.js';
export const TYPES=['experience','projects','claims','metrics','skills','credentials','evidence'];
export const STATUSES=['unverified','owner_confirmed','externally_verified','needs_review','disputed','expired'];
export const CREDENTIAL_KINDS=['unknown','official_certification','course_completion','badge','academic'];
export const UNITS=['records','seconds','milliseconds','percent','vulnerabilities','people','releases','users','hours','days','other'];
export const FIELDS={
 experience:{employer:'text',officialTitle:'text',displayTitle:'text',startDate:'date',endDate:'date',isCurrent:'boolean',employmentType:'text',promotionHistory:'json',contribution:'text'},
 projects:{title:'text',experienceId:'reference:experience',domain:'text',role:'text',ownership:'text',teamSize:'number',startDate:'date',endDate:'date',technologyIds:'references:skills',claimIds:'references:claims',confidentiality:'enum:public,confidential'},
 claims:{statement:'textarea',claimType:'enum:achievement,responsibility,result',scope:'text',contribution:'textarea',metricIds:'references:metrics'},
 metrics:{value:'number',comparisonOperator:'enum:eq,gte,lte,approx',unit:`enum:${UNITS.join(',')}`,baseline:'number',comparisonValue:'number',measurementPeriod:'text',environment:'text',workload:'text',method:'textarea',statistic:'text',limitations:'textarea'},
 skills:{canonicalName:'text',aliases:'list',category:'text',lastUsedAt:'date',practicalExperience:'textarea',projectIds:'references:projects'},
 credentials:{kind:`enum:${CREDENTIAL_KINDS.join(',')}`,title:'text',issuer:'text',issuedAt:'date',expiresAt:'date',credentialId:'text',verificationUrl:'url'},
 evidence:{title:'text',kind:'enum:portfolio_source,owner_note,issuer_record,benchmark_report,project_document',reference:'url',excerpt:'textarea',contentHash:'text',owner:'text',verifiedAt:'date',retentionPolicy:'text'}
};
const BASE={id:'text',sourceKeys:'list',sourceGroup:'text',sourceSignature:'text',legacyText:'textarea',verificationStatus:`enum:${STATUSES.join(',')}`,evidenceIds:'references:evidence',reviewedAt:'text',reviewedBy:'text',visibility:'enum:private,public'};
const datePattern=/^(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
// Partial dates denote an interval, not an invented exact day.
export function dateBoundary(value,end=false){
 if(!value)return null;if(value.length===10)return value;
 if(value.length===4)return `${value}-${end?'12-31':'01-01'}`;
 const [year,month]=value.split('-').map(Number);return `${value}-${end?String(new Date(Date.UTC(year,month,0)).getUTCDate()):'01'}`;
}
export function displayDate(value){if(!value)return 'Unknown';if(value.length===4)return value;const [year,month,day]=value.split('-');return `${day?Number(day)+' ':''}${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(month)-1]} ${year}`;}
const expired=(value,today)=>Boolean(value&&dateBoundary(value,true)<today);
export const emptyCareer=()=>({schemaVersion:1,_revision:0,profile:{legalName:'',displayName:'',targetRoles:[],timezone:'Asia/Saigon'},...Object.fromEntries(TYPES.map(type=>[type,[]])),migration:{sourceRevisions:{},sourceMap:{}}});
export function newRecord(type){
 if(!TYPES.includes(type))throw new Error('Unknown career record type.');
 const record={id:newId(),sourceKeys:[],sourceGroup:'',sourceSignature:'',legacyText:'',verificationStatus:'unverified',evidenceIds:[],reviewedAt:'',reviewedBy:'',visibility:'private'};
 for(const [key,kind]of Object.entries(FIELDS[type]))record[key]=kind==='boolean'?false:kind==='number'||kind==='date'||kind.startsWith('reference:')?null:kind==='list'||kind==='json'||kind.startsWith('references:')?[]:kind.startsWith('enum:')?kind.slice(5).split(',')[0]:'';
 return record;
}
export function validateCareer(value){
 if(!value||value.schemaVersion!==1||!Number.isInteger(value._revision)||value._revision<0)throw new Error('Unsupported career schema/revision.');
 const allowed=new Set(Object.keys(emptyCareer()));for(const key of Object.keys(value))if(!allowed.has(key))throw new Error(`Unsupported career field: ${key}`);
 const ids=new Set();
 for(const type of TYPES){
  if(!Array.isArray(value[type])||value[type].length>1000)throw new Error(`Invalid ${type} collection.`);
  for(const record of value[type]){
   if(!record||typeof record.id!=='string'||!record.id||record.id.length>150||ids.has(record.id))throw new Error('Record IDs must be unique and persistent.');ids.add(record.id);
   const fields={...BASE,...FIELDS[type]};for(const key of Object.keys(record))if(!Object.hasOwn(fields,key))throw new Error(`Unknown ${type} field: ${key}`);
   for(const [key,kind]of Object.entries(fields)){
    const item=record[key];
    if(kind==='number'){if(item!==null&&(!Number.isFinite(item)||item<0))throw new Error(`${type}.${key} must be a non-negative number or unknown.`);}
    else if(kind==='boolean'){if(typeof item!=='boolean')throw new Error(`Invalid ${key}`);}
    else if(kind==='date'){if(item!==null&&(typeof item!=='string'||!datePattern.test(item)))throw new Error(`${key} needs YYYY, YYYY-MM or YYYY-MM-DD, or unknown.`);if(item?.length===10&&new Date(`${item}T00:00:00Z`).toISOString().slice(0,10)!==item)throw new Error(`Invalid calendar date: ${key}`);}
    else if(kind==='json'){if(!Array.isArray(item)||item.length>100)throw new Error(`Invalid ${key}`);}
    else if(kind==='list'||kind.startsWith('references:')){if(!Array.isArray(item)||item.length>200||item.some(x=>typeof x!=='string'||x.length>200)||new Set(item).size!==item.length)throw new Error(`Invalid list: ${key}`);}
    else if(kind.startsWith('reference:')){if(item!==null&&typeof item!=='string')throw new Error(`Invalid reference: ${key}`);}
    else if(typeof item!=='string'||item.length>(kind==='textarea'?30000:1000))throw new Error(`Invalid ${type}.${key}`);
    if(kind.startsWith('enum:')&&!kind.slice(5).split(',').includes(item))throw new Error(`Invalid ${key}`);
    if(kind==='url'&&item){let url;try{url=new URL(item);}catch{throw new Error(`Invalid URL: ${key}`);}if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error(`Invalid URL: ${key}`);}
   }
   if(type==='experience'){
    if(!record.employer.trim()||!record.officialTitle.trim())throw new Error('Experience needs an employer and official title.');
    if(record.isCurrent&&record.endDate!==null)throw new Error('Current experience cannot have an end date.');
    if(record.startDate&&record.endDate&&dateBoundary(record.startDate)>dateBoundary(record.endDate,true))throw new Error('Experience dates are reversed.');
    for(const promotion of record.promotionHistory)if(!promotion||typeof promotion.title!=='string'||!promotion.title.trim()||!datePattern.test(promotion.startDate||''))throw new Error('Promotions need a title and start date.');
   }
   if(type==='metrics'&&(record.value===null||!UNITS.includes(record.unit)))throw new Error('A metric needs a value and unit.');
   if(type==='projects'&&record.startDate&&record.endDate&&dateBoundary(record.startDate)>dateBoundary(record.endDate,true))throw new Error('Project dates are reversed.');
   if(type==='credentials'&&record.issuedAt&&record.expiresAt&&dateBoundary(record.issuedAt)>dateBoundary(record.expiresAt,true))throw new Error('Credential dates are reversed.');
   if(['owner_confirmed','externally_verified'].includes(record.verificationStatus)&&type!=='evidence'&&!record.evidenceIds.length)throw new Error('Confirmed facts need a source evidence record.');
   if(record.verificationStatus==='externally_verified'&&(type==='evidence'?!(record.reference&&record.verifiedAt&&['issuer_record','benchmark_report','project_document'].includes(record.kind)):!record.evidenceIds.some(id=>value.evidence.some(x=>x.id===id&&x.verificationStatus==='externally_verified'&&x.reference&&x.verifiedAt))))throw new Error('External verification needs reviewed external evidence.');
  }
 }
 for(const type of TYPES)for(const record of value[type])for(const [key,kind]of Object.entries({...BASE,...FIELDS[type]})){
  const target=kind.startsWith('references:')?kind.slice(11):kind.startsWith('reference:')?kind.slice(10):null;if(!target)continue;
  for(const id of Array.isArray(record[key])?record[key]:record[key]?[record[key]]:[])if(!value[target]?.some(x=>x.id===id))throw new Error(`Missing ${target} reference: ${id}`);
 }
 if(!value.profile||Object.keys(value.profile).some(key=>!['legalName','displayName','targetRoles','timezone'].includes(key))||typeof value.profile.displayName!=='string'||typeof value.profile.legalName!=='string'||!Array.isArray(value.profile.targetRoles)||value.profile.targetRoles.length>20||value.profile.targetRoles.some(x=>typeof x!=='string'||x.length>200)||typeof value.profile.timezone!=='string')throw new Error('Invalid career profile.');
 if(!value.migration||typeof value.migration.sourceMap!=='object'||typeof value.migration.sourceRevisions!=='object')throw new Error('Invalid migration metadata.');
 return clone(value);
}
export function parsePeriod(value){
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const parse=text=>{const iso=text?.match(/\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?\b/)?.[0];if(iso)return iso;const year=text?.match(/\b(?:19|20)\d{2}\b/)?.[0];if(!year)return null;const monthName=text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)?.[1]?.toLowerCase(),numeric=text.match(/\b(0?[1-9]|1[0-2])\/(?:19|20)\d{2}/)?.[1];const month=monthName?months.indexOf(monthName)+1:numeric?Number(numeric):null;const day=text.match(/\b(0?[1-9]|[12]\d|3[01])\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?:19|20)\d{2}\b/i)?.[1];return month?`${year}-${String(month).padStart(2,'0')}${day?'-'+String(day).padStart(2,'0'):''}`:year;};
 const parts=String(value||'').split(/\s*(?:–|—|\s-\s|\bto\b)\s*/i),isCurrent=/present|current|hiện tại/i.test(value||'');
 return {startDate:parse(parts[0]),endDate:isCurrent?null:parts.length>1?parse(parts.at(-1)):null,isCurrent};
}
const signature=parts=>JSON.stringify(parts);
export function migrateCareer(source,existing=emptyCareer()){
 const library=validateCareer(existing),data=ensureItemIds(source),changes=[];
 const add=(type,sourceKey,sig,properties,legacyText)=>{
  let record=library[type].find(x=>x.sourceKeys.includes(sourceKey)||x.sourceSignature===sig);
  if(record){if(!record.sourceKeys.includes(sourceKey))record.sourceKeys.push(sourceKey);if(record.legacyText!==legacyText){record.verificationStatus='needs_review';const evidence={...newRecord('evidence'),title:`Updated portfolio source: ${sourceKey}`,kind:'portfolio_source',excerpt:String(legacyText||''),legacyText:String(legacyText||'')};library.evidence.push(evidence);record.evidenceIds.push(evidence.id);record.legacyText=String(legacyText||'');changes.push(`Changed source: ${sourceKey}`);}library.migration.sourceMap[sourceKey]=record.id;return record;}
  const evidence={...newRecord('evidence'),title:`Portfolio source: ${sourceKey}`,kind:'portfolio_source',excerpt:String(legacyText||''),legacyText:String(legacyText||'')};library.evidence.push(evidence);
  record={...newRecord(type),...properties,sourceKeys:[sourceKey],sourceSignature:sig,legacyText:String(legacyText||''),evidenceIds:[evidence.id]};library[type].push(record);library.migration.sourceMap[sourceKey]=record.id;changes.push(`Added ${type}: ${sourceKey}`);return record;
 };
 library.profile.displayName ||= data.header?.name||'';
 for(const job of data.experience?.jobs||[])add('experience',`job.${job._id}`,signature([job.company,job.role,job.period]),{employer:job.company||'',officialTitle:job.role||'',...parsePeriod(job.period)},JSON.stringify(job));
 for(const project of data.projects?.items||[])add('projects',`project.${project._id}`,signature([project.title,project.detailDuration]),{title:project.title||'',role:project.detailRole||'',domain:project.description||'',startDate:parsePeriod(project.detailDuration).startDate,endDate:parsePeriod(project.detailDuration).endDate},JSON.stringify(project));
 for(const category of data.skills?.categories||[])for(const skill of category.skills||[])add('skills',`skill-item.${skill._id}`,signature([category.name,skill.title||skill.name]),{canonicalName:skill.title||skill.name||'',category:category.name||'',sourceGroup:`skill.${category._id}`},JSON.stringify(skill));
 for(const credential of data.education?.certifications||[]){let course=false;try{const host=new URL(credential.link).hostname;course=host==='udemy.com'||host.endsWith('.udemy.com');}catch{}
  add('credentials',`cert.${credential._id}`,signature([credential.title,credential.issuer]),{title:credential.title||'',issuer:credential.issuer||'',kind:course?'course_completion':'unknown',issuedAt:parsePeriod(String(credential.year||'')).startDate,verificationUrl:credential.link||''},JSON.stringify(credential));
 }
 const claim=(key,text,claimType='achievement')=>{
  const record=add('claims',key,signature([text]),{statement:text,claimType},text);
  const definitions=[];
  const records=text.match(/(\d[\d,]*\+?|\d+(?:\.\d+)?\s*[kK])\s*(?:records|bản ghi)/i),seconds=text.match(/(?:within|in|\/|trong)\s*(\d+(?:\.\d+)?)\s*(?:seconds?|s\b|giây)/i);
  if(records){const token=records[1],value=/k/i.test(token)?parseFloat(token)*1000:Number(token.replace(/[^\d.]/g,''));definitions.push({value,unit:'records',comparisonOperator:token.includes('+')?'gte':'eq'});if(seconds)definitions.push({value:Number(seconds[1]),unit:'seconds',comparisonOperator:/within|trong/i.test(seconds[0])?'lte':'eq'});}
  const bugs=text.match(/\b(\d+)\s+(?:security\s+)?vulnerabilit/i);if(bugs)definitions.push({value:Number(bugs[1]),unit:'vulnerabilities',comparisonOperator:'eq'});
  const people=text.match(/(?:mentored|mentoring|trained)\s+(\d+)\s+(?:QA\s+)?(?:members|engineers|people)/i);if(people)definitions.push({value:Number(people[1]),unit:'people',comparisonOperator:'eq'});
  const percent=text.match(/\b(\d+(?:\.\d+)?)%/);if(percent)definitions.push({value:Number(percent[1]),unit:'percent',comparisonOperator:'eq'});
  for(const item of definitions){const metricKey=`${key}.metric.${item.unit}`,metric=add('metrics',metricKey,signature([key,item]),item,text);if(!record.metricIds.includes(metric.id))record.metricIds.push(metric.id);}
  return record;
 };
 for(const achievement of data.achievements?.items||[])claim(`achievement.${achievement._id}`,[achievement.title,achievement.subtitle,achievement.description].filter(Boolean).join(' — '));
 for(const job of data.experience?.jobs||[])for(const highlight of job.highlights||[])claim(`job.${job._id}.highlight.${highlight._id}`,[highlight.title,highlight.desc||highlight.description].filter(Boolean).join(' — '),'responsibility');
 for(const project of data.projects?.items||[])String(project.detailResults||'').split(/\n+/).filter(Boolean).forEach((text,index)=>{const record=claim(`project.${project._id}.impact.${index}`,text,'result'),parent=library.projects.find(x=>x.sourceKeys.includes(`project.${project._id}`));if(parent&&!parent.claimIds.includes(record.id))parent.claimIds.push(record.id);});
 const savedFields=source.cv?.fields||[],plain=value=>String(value||'').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
 for(const field of savedFields){
  let record;
  if(field.group?.startsWith('job.')){const group=savedFields.filter(x=>x.group===field.group),company=group.find(x=>x.kind==='company')?.text,title=group.find(x=>x.kind==='itemTitle')?.text;const matches=library.experience.filter(x=>x.employer===company&&x.officialTitle===title);if(matches.length===1&&['itemTitle','company','date','meta','paragraph'].includes(field.kind))record=matches[0];}
  if(field.group?.startsWith('project.')&&field.kind==='itemTitle'){const matches=library.projects.filter(x=>x.title===field.text);if(matches.length===1)record=matches[0];}
  if(field.group?.startsWith('cert.')&&field.kind==='itemTitle'){const matches=library.credentials.filter(x=>x.verificationUrl&&x.verificationUrl===field.link);if(matches.length===1)record=matches[0];}
  if(field.kind==='bullet'){const matches=library.claims.filter(x=>plain(x.statement)===plain(field.text));if(matches.length===1)record=matches[0];}
  const key=record&&['experience','projects','credentials'].some(type=>library[type].includes(record))?field.group:field.key;
  if(record&&!record.sourceKeys.includes(key))record.sourceKeys.push(key);
 }
 for(const key of ['header','experience','skills','projects','achievements','education'])library.migration.sourceRevisions[key]=Number(source[key]?._revision||0);
 return {library:validateCareer(library),sourceWithIds:data,changes};
}
export function careerHealth(library,today=new Date().toISOString().slice(0,10)){
 validateCareer(library);const issues=[];
 for(const type of TYPES.filter(x=>x!=='evidence'))for(const record of library[type]){
  if(!['owner_confirmed','externally_verified'].includes(record.verificationStatus))issues.push({type,id:record.id,message:`${record.verificationStatus}: review source evidence`});
  if(type==='metrics'&&(!record.method||!record.environment||!record.workload))issues.push({type,id:record.id,message:'Measurement context is incomplete; do not infer workload, concurrency or percentile.'});
  if(type==='credentials'&&(record.kind==='unknown'||expired(record.expiresAt,today)))issues.push({type,id:record.id,message:record.kind==='unknown'?'Credential type is unknown.':'Credential has expired.'});
  if(type==='experience'&&!record.startDate)issues.push({type,id:record.id,message:'Start date is unknown.'});
 }
 return issues;
}
export function recordForField(library,field){
 if(!library)return null;
 const types=TYPES.filter(x=>x!=='evidence'&&x!=='metrics');
 for(const type of types){const record=library[type].find(x=>x.sourceKeys.includes(field.key));if(record)return {type,record};}
 for(const type of ['experience','projects','credentials']){if(type==='experience'&&field.kind==='bullet')continue;const record=library[type].find(x=>x.sourceKeys.includes(field.group));if(record)return {type,record};}
 return null;
}
export function annotateCareerFields(fields,library){
 if(!library)return fields;validateCareer(library);
 return fields.map(field=>{const fact=recordForField(library,field);return fact?{...field,factId:fact.record.id,factStatus:fact.record.verificationStatus,metricIds:fact.record.metricIds||[]}:field;});
}
export function confirmedCareerFields(fields,library){
 return annotateCareerFields(fields,library).map(field=>{
  const fact=recordForField(library,field);if(!fact||!['owner_confirmed','externally_verified'].includes(fact.record.verificationStatus))return field;
  const record=fact.record;
  if(fact.type==='experience'&&field.kind==='itemTitle')return {...field,text:record.officialTitle};
  if(fact.type==='experience'&&field.kind==='company')return {...field,text:record.employer};
  if(fact.type==='experience'&&field.kind==='date'&&record.startDate)return {...field,text:`${displayDate(record.startDate)} - ${record.isCurrent?'Present':displayDate(record.endDate)}`};
  if(fact.type==='credentials'&&field.kind==='itemTitle')return {...field,text:record.kind==='course_completion'?`Course completion: ${record.title.replace(/^ISTQB Certified Tester\s*-\s*/i,'ISTQB ')}`:record.title};
  if(fact.type==='claims')return {...field,text:record.statement};return field;
 });
}
export function careerAiFacts(library){
 if(!library)return null;validateCareer(library);
 return {schemaVersion:1,revision:library._revision,records:TYPES.filter(x=>x!=='evidence').flatMap(type=>library[type].map(record=>({type,id:record.id,sourceKeys:record.sourceKeys,verificationStatus:record.verificationStatus,...Object.fromEntries(Object.keys(FIELDS[type]).map(key=>[key,record[key]]))}))),instruction:'Unverified, expired, disputed or needs_review records are not verified facts. Unknown measurement context must stay unknown. Private evidence excerpts are not included.'};
}
const UNIT_WORDS={records:'records|bản ghi',seconds:'seconds?|s|giây',milliseconds:'milliseconds?|ms',users:'users|người dùng',vulnerabilities:'vulnerabilit(?:y|ies)',people:'members|engineers|people|thành viên',percent:'%|percent',releases:'releases',hours:'hours',days:'days'};
function measurementMatches(text,metric){
 const units=UNIT_WORDS[metric.unit];if(!units)return (text.match(/\b\d[\d,]*(?:\.\d+)?/g)||[]).some(token=>Number(token.replaceAll(',',''))===metric.value);
 const pattern=new RegExp('\\b(\\d[\\d,]*(?:\\.\\d+)?(?:\\s*[kK])?)\\s*(\\+?)\\s*(?:(?:QA|team|staff|security|API|test)\\s+){0,3}(?:'+units+')(?![A-Za-z])','gi');
 return [...text.matchAll(pattern)].some(match=>{
  const token=match[1].replaceAll(' ',''),value=/k/i.test(token)?parseFloat(token)*1000:Number(token.replaceAll(',',''));if(value!==metric.value)return false;
  const before=text.slice(Math.max(0,match.index-35),match.index),after=text.slice(match.index+match[0].length,match.index+match[0].length+20);
  if(metric.comparisonOperator==='gte')return Boolean(match[2]||/(?:at least|over|more than|>=|\u2265)\s*$/i.test(before)||/^\s*or more/i.test(after));
  if(metric.comparisonOperator==='lte')return /(?:within|up to|under|less than|at most|<=|\u2264|trong)\s*$/i.test(before)||/^\s*or less/i.test(after);
  if(metric.comparisonOperator==='approx')return /(?:approximately|about|around|~|\u2248)\s*$/i.test(before);
  return !match[2]&&!/(?:at least|over|more than|within|under|less than|up to|about|approximately|>=|<=|[\u2265\u2264~\u2248])\s*$/i.test(before);
 });
}
export function careerPublishIssues(fields,library){
 if(!library)return [];validateCareer(library);const issues=[];
 for(const field of fields){
  if(library.projects.some(record=>record.confidentiality==='confidential'&&record.sourceKeys.includes(field.group)))issues.push(`Exclude this confidential project or review its public classification: ${field.key}`);
  const fact=recordForField(library,field);
  if(!fact){if(field.key.startsWith('cert.')&&field.kind==='itemTitle'||['bullet','paragraph'].includes(field.kind)&&/\b\d[\d,.+kK]*\s*(?:%|records|users|seconds|vulnerabilit|members|engineers|releases)/i.test(field.text))issues.push(`Link this CV claim to reviewed career facts: ${field.key}`);continue;}
  if(!['owner_confirmed','externally_verified'].includes(fact.record.verificationStatus))issues.push(`Review career fact before publishing: ${field.key}`);
  if(['bullet','paragraph'].includes(field.kind)&&/\b\d[\d,.+kK]*\s*(?:%|records|users|seconds|vulnerabilit|members|engineers|releases)/i.test(field.text)&&fact.type!=='claims')issues.push(`Link this numerical CV statement to a reviewed claim and measurements: ${field.key}`);
  if(fact.type==='projects'&&fact.record.confidentiality==='confidential')issues.push(`Exclude this confidential project or review its public classification: ${field.key}`);
  for(const id of fact.record.metricIds||[]){
   if(!/\d/.test(field.text))continue;
   const metric=library.metrics.find(x=>x.id===id);
   if(!['owner_confirmed','externally_verified'].includes(metric?.verificationStatus))issues.push(`Review measurement before publishing: ${metric?.value} ${metric?.unit}`);
   if(metric&&!measurementMatches(field.text,metric))issues.push(`CV measurement differs from reviewed value/unit: ${field.key}`);
  }
  if(fact.type==='credentials'&&(fact.record.kind==='unknown'||expired(fact.record.expiresAt,new Date().toISOString().slice(0,10))))issues.push(`Credential type or expiry needs review: ${field.key}`);
  if(fact.type==='credentials'&&field.kind==='itemTitle'&&fact.record.kind==='course_completion'&&!/course completion|training|course|khóa học/i.test(field.text))issues.push(`Label this credential as course completion: ${field.key}`);
  if(fact.type==='experience'&&field.kind==='itemTitle'&&field.text!==fact.record.officialTitle)issues.push(`CV title differs from confirmed official title: ${field.key}`);
  if(fact.type==='experience'&&field.kind==='company'&&field.text!==fact.record.employer)issues.push(`CV employer differs from confirmed employer: ${field.key}`);
  if(fact.type==='experience'&&field.kind==='date'){const dates=parsePeriod(field.text);if(dates.startDate!==fact.record.startDate||dates.endDate!==fact.record.endDate||dates.isCurrent!==fact.record.isCurrent)issues.push(`CV dates differ from confirmed timeline: ${field.key}`);}
 }
 return [...new Set(issues)];
}
