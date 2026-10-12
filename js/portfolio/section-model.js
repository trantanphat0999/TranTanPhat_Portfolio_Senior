import {safeUrl} from '../admin/data-model.js';

export const FIELD_TYPES=['text','textarea','number','date','url','email','boolean','tags','select'];
export function validateGeneratedIcon(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.paths)||value.paths.length<1||value.paths.length>12)throw new Error('Icon needs 1–12 SVG paths.');
 const sizes={M:2,L:2,H:1,V:1,C:6,Q:4,Z:0};
 for(const path of value.paths){
  if(typeof path!=='string'||path.length>800||!/^M[\d\s.,MLHVCQZ-]+$/.test(path))throw new Error('Icon contains unsupported SVG commands.');
  const segments=path.match(/[MLHVCQZ][^MLHVCQZ]*/g)||[];
  for(const segment of segments){
   const tail=segment.slice(1).trim(),numbers=tail?tail.split(/[\s,]+/).map(Number):[];
   if(numbers.length!==sizes[segment[0]]||numbers.some(number=>!Number.isFinite(number)||number<0||number>24))throw new Error('Use explicit SVG commands with coordinates from 0 to 24.');
  }
 }
 return {label:String(value.label||'Section icon').slice(0,120),paths:[...value.paths]};
}
export function validateSectionFields(fields,items){
 if(!Array.isArray(fields)||fields.length>30)throw new Error('Use up to 30 custom fields per section.');
 const ids=new Set();
 for(const field of fields){
  if(!field||!/^[a-zA-Z0-9_-]{8,80}$/.test(field.id)||ids.has(field.id))throw new Error('Custom fields need unique stable IDs.');
  ids.add(field.id);
  if(typeof field.label!=='string'||!field.label.trim()||field.label.length>120||!FIELD_TYPES.includes(field.type)||typeof field.required!=='boolean')throw new Error('Each field needs a name, supported type and required setting.');
  if(field.type==='select'&&(!Array.isArray(field.options)||!field.options.length||field.options.length>30||field.options.some(x=>typeof x!=='string'||!x.trim()||x.length>120)||new Set(field.options).size!==field.options.length))throw new Error(`Add 1–30 unique choices for ${field.label}.`);
 }
 for(const item of items){
  if(!item.values||typeof item.values!=='object'||Array.isArray(item.values))throw new Error('Section items need custom field values.');
  if(Object.keys(item.values).some(key=>!ids.has(key)))throw new Error('An item references a removed or unknown field.');
  for(const field of fields){
   const value=item.values[field.id],empty=value===undefined||value===null||value==='';
   if(field.required&&empty)throw new Error(`${field.label} is required.`);
   if(empty)continue;
   if(field.type==='boolean'){if(typeof value!=='boolean')throw new Error(`${field.label} must be a checkbox value.`);continue;}
   if(typeof value!=='string'||value.length>10000)throw new Error(`${field.label} must be text of at most 10,000 characters.`);
   if(field.required&&!value.trim())throw new Error(`${field.label} is required.`);
   if(field.type==='number'&&(!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)||!Number.isFinite(Number(value))))throw new Error(`${field.label} must be a finite number.`);
   if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw new Error(`${field.label} must be a valid date.`);
   if(field.type==='url'&&!safeUrl(value))throw new Error(`${field.label} must be a safe HTTP(S), mailto or tel link.`);
   if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error(`${field.label} must be an email address.`);
   if(field.type==='select'&&!field.options.includes(value))throw new Error(`${field.label} must match an available choice.`);
  }
 }
 return fields;
}
export function sectionValue(field,value){
 if(value===undefined||value===null||value==='')return '';
 return field.type==='boolean'?(value?'Yes':'No'):String(value);
}
