import {FIELD_TYPES,validateGeneratedIcon,validateSectionFields} from '../portfolio/section-model.js';
import {PLACEMENTS,BLOCK_CV_SECTIONS} from '../portfolio/custom-blocks.js';
import {blockMarkup,sectionIcon} from '../portfolio/custom-renderer.js';
import {escape as e,uuid} from './studio-ui.js';
import {runAi,assertAiCurrent} from '../ai/service.js';

const names={text:'Short text',textarea:'Long text',number:'Number',date:'Date',url:'Link',email:'Email',boolean:'Checkbox',tags:'Tags',select:'Choices'};
export function mountSectionEditor(host,section,{remember,onChange,status,onMove,onDelete}){
 let controller=null,cancelled=false,locked=false,iconResult=null,iconSnapshot='',serial=0;
 const $=selector=>host.querySelector(selector);
 const select=(key,label,values)=>`<label>${label}<select data-section-setting="${key}">${values.map(value=>`<option value="${e(value)}" ${section[key]===value?'selected':''}>${e(value)}</option>`).join('')}</select></label>`;
 host.innerHTML=`<div class="section-editor-heading"><h3>Portfolio section</h3><span>Admin defines fields · AI creates the icon</span></div><label>Section name<input data-section-setting="title" maxlength="200" value="${e(section.title)}"></label><label>Introduction<textarea data-section-setting="body">${e(section.body)}</textarea></label><div class="section-settings">${select('placement','Insert after',PLACEMENTS)}${select('visibility','Visibility',['public','private'])}${select('cvSection','CV source category',BLOCK_CV_SECTIONS)}</div><label class="studio-inline"><input type="checkbox" data-section-setting="showInNav" ${section.showInNav?'checked':''}> Show in portfolio navigation</label><label class="studio-inline"><input type="checkbox" data-section-setting="includeInCv" ${section.includeInCv?'checked':''}> Include fields in CV source</label><section class="section-schema"><h3>Custom fields</h3><p>Choose field names and types. Field IDs remain stable when renamed or reordered.</p><div data-section-fields></div><button data-add-field>Add custom field</button></section><section><h3>Section items</h3><div data-section-items></div><button data-add-section-item>Add section item</button></section><section class="section-icon-studio"><h3>AI icon studio</h3><div data-current-section-icon class="section-icon-sample"></div><label>Icon brief (optional)<textarea data-section-setting="iconBrief" maxlength="2000" placeholder="Describe the symbol or style you want…">${e(section.iconBrief)}</textarea></label><p>AI receives the section name, introduction, field names and brief. Item values are excluded. Review the generated vector before applying.</p><div class="studio-actions"><button data-generate-section-icon>Generate new icon with AI</button><button data-cancel-section-icon hidden>Cancel</button></div><div data-section-icon-proposal hidden></div></section><div class="studio-actions"><button data-section-move="-1">Move up</button><button data-section-move="1">Move down</button><button data-section-hide>${section.status==='inactive'?'Restore visibility':'Hide section'}</button><button data-section-delete>Remove from draft</button></div><h3>Live section preview</h3><div data-section-preview></div><div data-section-errors role="status" aria-live="polite"></div>`;
 function changed(){iconResult=null;$('[data-section-icon-proposal]').hidden=true;onChange();preview();}
 function mutate(action){if(locked||cancelled)return;remember();action();changed();}
 function preview(){
  $('[data-section-preview]').innerHTML=blockMarkup(section);
  $('[data-current-section-icon]').innerHTML=sectionIcon(section)+`<span>${section.generatedIcon?'AI icon applied':'Generate an icon before publishing'}</span>`;
  try{validateSectionFields(section.fields,section.items);$('[data-section-errors]').textContent='';}catch(error){$('[data-section-errors]').textContent=error.message;}
 }
 $('[data-section-errors]').className='studio-warning';
 host.querySelectorAll('[data-section-setting]').forEach(input=>input.oninput=()=>mutate(()=>{section[input.dataset.sectionSetting]=input.type==='checkbox'?input.checked:input.value;}));
 function fields(){
  $('[data-section-fields]').innerHTML=section.fields.map((field,index)=>`<div class="section-field-definition" data-field-id="${e(field.id)}"><label>Field name<input data-schema="label" value="${e(field.label)}" maxlength="120"></label><label>Field type<select data-schema="type">${FIELD_TYPES.map(type=>`<option value="${type}" ${field.type===type?'selected':''}>${names[type]}</option>`).join('')}</select></label><label class="studio-inline"><input type="checkbox" data-schema="required" ${field.required?'checked':''}> Required</label>${field.type==='select'?`<label>Choices (one per line)<textarea data-schema="options">${e((field.options||[]).join('\n'))}</textarea></label>`:''}<div class="studio-actions"><button data-field-move="-1" ${index===0?'disabled':''} aria-label="Move field up">↑</button><button data-field-move="1" ${index===section.fields.length-1?'disabled':''} aria-label="Move field down">↓</button><button data-field-delete>Remove field</button></div></div>`).join('')||'<p>No fields yet. Add fields before entering items.</p>';
 }
 $('[data-section-fields]').oninput=event=>{
  const input=event.target,key=input.dataset.schema,field=section.fields.find(value=>value.id===input.closest('[data-field-id]')?.dataset.fieldId);if(!key||!field)return;
  if(key==='type'&&section.items.some(item=>item.values[field.id]!==undefined&&item.values[field.id]!=='')){
   if(!confirm('Changing this field type clears its values in every item. Undo can restore them.')){input.value=field.type;return;}
  }
  mutate(()=>{field[key]=key==='required'?input.checked:key==='options'?input.value.split('\n').map(value=>value.trim()).filter(Boolean):input.value;if(key==='type'){for(const item of section.items)delete item.values[field.id];field.options=field.type==='select'?['Option 1']:[];}});
  if(key==='type')fields();items();
 };
 $('[data-section-fields]').onclick=event=>{
  const row=event.target.closest('[data-field-id]'),index=section.fields.findIndex(field=>field.id===row?.dataset.fieldId);if(index<0)return;
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-field-delete')){
   const field=section.fields[index];if(section.items.some(item=>item.values[field.id]!==undefined&&item.values[field.id]!=='')&&!confirm('Remove this field and its values from every draft item? Undo is available.'))return;
   mutate(()=>{section.fields.splice(index,1);for(const item of section.items)delete item.values[field.id];});
  }else if(button.hasAttribute('data-field-move')){
   const next=index+Number(button.dataset.fieldMove);if(next<0||next>=section.fields.length)return;mutate(()=>{const [field]=section.fields.splice(index,1);section.fields.splice(next,0,field);});
  }
  fields();items();
 };
 $('[data-add-field]').onclick=()=>{if(section.fields.length>=30){status('Use up to 30 fields.');return;}mutate(()=>section.fields.push({id:uuid(),label:`Field ${section.fields.length+1}`,type:'text',required:false,options:[]}));fields();items();};
 function control(field,item){
  const value=item.values[field.id]??'',attribute=`data-section-value="${e(field.id)}"`;
  let input=field.type==='textarea'?`<textarea ${attribute}>${e(value)}</textarea>`:field.type==='boolean'?`<input type="checkbox" ${attribute} ${value===true?'checked':''}>`:field.type==='select'?`<select ${attribute}><option value="">Choose…</option>${(field.options||[]).map(option=>`<option ${value===option?'selected':''} value="${e(option)}">${e(option)}</option>`).join('')}</select>`:`<input ${attribute} type="${['number','date','url','email'].includes(field.type)?field.type:'text'}" ${field.type==='number'?'step="any"':''} value="${e(value)}" ${field.type==='tags'?'placeholder="Separate tags with commas"':''}>`;
  return `<label ${field.type==='boolean'?'class="studio-inline"':''}>${e(field.label)}${field.required?' *':''}${input}</label>`;
 }
 function items(){
  $('[data-section-items]').innerHTML=section.items.map((item,index)=>`<article class="section-item-editor" data-section-item-id="${e(item.id)}"><h4>Item ${index+1}</h4>${section.fields.map(field=>control(field,item)).join('')}<div class="studio-actions"><button data-item-shift="-1" ${index===0?'disabled':''}>↑</button><button data-item-shift="1" ${index===section.items.length-1?'disabled':''}>↓</button><button data-item-duplicate>Duplicate item</button><button data-section-item-delete>Remove item</button></div></article>`).join('')||'<p>No items yet. Add an item to enter your custom fields.</p>';
  $('[data-add-section-item]').disabled=!section.fields.length;
 }
 $('[data-section-items]').oninput=event=>{const input=event.target,item=section.items.find(item=>item.id===input.closest('[data-section-item-id]')?.dataset.sectionItemId);if(!item||!input.dataset.sectionValue)return;mutate(()=>{item.values[input.dataset.sectionValue]=input.type==='checkbox'?input.checked:input.value;});};
 $('[data-section-items]').onclick=event=>{
  const button=event.target.closest('button'),index=section.items.findIndex(item=>item.id===button?.closest('[data-section-item-id]')?.dataset.sectionItemId);if(!button||index<0)return;
  if(button.hasAttribute('data-section-item-delete'))mutate(()=>section.items.splice(index,1));
  else if(button.hasAttribute('data-item-duplicate')){if(section.items.length>=100){status('Use up to 100 items.');return;}mutate(()=>section.items.splice(index+1,0,{...structuredClone(section.items[index]),id:uuid()}));}
  else if(button.hasAttribute('data-item-shift')){const next=index+Number(button.dataset.itemShift);if(next<0||next>=section.items.length)return;mutate(()=>{const [item]=section.items.splice(index,1);section.items.splice(next,0,item);});}
  items();
 };
 $('[data-add-section-item]').onclick=()=>{if(section.items.length>=100){status('Use up to 100 items.');return;}mutate(()=>section.items.push({id:uuid(),title:'',text:'',url:'',values:{}}));items();};
 host.querySelectorAll('[data-section-move]').forEach(button=>button.onclick=()=>onMove(Number(button.dataset.sectionMove)));
 $('[data-section-hide]').onclick=()=>{mutate(()=>section.status=section.status==='inactive'?'active':'inactive');$('[data-section-hide]').textContent=section.status==='inactive'?'Restore visibility':'Hide section';};
 $('[data-section-delete]').onclick=onDelete;
 $('[data-generate-section-icon]').onclick=async()=>{
  if(controller||locked||cancelled)return;
  if(!section.title.trim()){status('Name the section before generating an icon.');return;}
  const request=++serial;controller=new AbortController();iconSnapshot=JSON.stringify(section);iconResult=null;
  $('[data-generate-section-icon]').disabled=true;$('[data-cancel-section-icon]').hidden=false;$('[data-section-icon-proposal]').hidden=true;status('AI is designing your section icon…');
  try{
   const result=await runAi({task:'icon-create',input:{title:section.title,description:section.body,fields:section.fields.map(({label,type})=>({label,type})),iconBrief:section.iconBrief},contextIds:[],signal:controller.signal});
   if(cancelled||locked||controller.signal.aborted||request!==serial)return;if(JSON.stringify(section)!==iconSnapshot)throw new Error('Section changed during generation. Generate a new icon.');
   const icon=validateGeneratedIcon(result.structured);iconResult=result;
   $('[data-section-icon-proposal]').innerHTML=`<div class="section-icon-sample">${sectionIcon({...section,generatedIcon:icon})}<strong>${e(icon.label)}</strong></div><p>${e(result.structured.reason)}</p><button data-apply-section-icon>Apply reviewed icon</button>`;
   $('[data-section-icon-proposal]').hidden=false;
   $('[data-apply-section-icon]').onclick=async()=>{try{if(cancelled||locked||!iconResult||JSON.stringify(section)!==iconSnapshot)throw new Error('Section changed. Generate a new icon.');await assertAiCurrent(iconResult,[]);if(cancelled||locked||JSON.stringify(section)!==iconSnapshot)throw new Error('Section changed. Generate again.');mutate(()=>section.generatedIcon=icon);status('AI icon applied to draft. Review and publish when ready.');}catch(error){status(error.message);}};
   status('Review the icon, then choose Apply reviewed icon.');
  }catch(error){if(!cancelled)status(error.message);}finally{controller=null;if(!cancelled){$('[data-generate-section-icon]').disabled=locked;$('[data-cancel-section-icon]').hidden=true;}}
 };
 $('[data-cancel-section-icon]').onclick=()=>controller?.abort();
 fields();items();preview();
 function guards(){if(cancelled)return;$('[data-add-section-item]').disabled=locked||!section.fields.length||section.items.length>=100;$('[data-add-field]').disabled=locked||section.fields.length>=30;}
 return {cancel(){cancelled=true;serial++;controller?.abort();},setLocked(value){locked=value;if(value)controller?.abort();guards();}};
}

export const SECTION_EDITOR_CSS=`#admin-workspace .studio-form label.studio-inline{display:flex;align-items:center;gap:10px}#admin-workspace .studio-form input[type=checkbox]{width:18px;height:18px;min-height:18px;padding:0;flex-shrink:0}#ws-content-builder>.ws-card>.studio-columns{margin-top:22px}#ws-content-builder [data-list] button[aria-pressed=true]{background:#294566;border-color:#a9cef9}.section-editor-heading{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.section-editor-heading span{font-size:11px;color:#aac0db}.section-settings{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.section-schema,.section-icon-studio{padding:18px;border:1px solid #405977;border-radius:12px}.section-field-definition{display:grid;grid-template-columns:minmax(0,1fr) minmax(140px,.7fr);gap:12px;padding:14px 0;border-top:1px solid #405977}.section-field-definition .studio-actions,.section-field-definition>label:has(textarea){grid-column:1/-1}.section-item-editor{display:grid;gap:14px;padding:20px;border:1px solid #405977;border-radius:12px;margin-bottom:16px}.section-item-editor h4{font-weight:700}.section-icon-sample{display:flex;gap:14px;align-items:center;padding:16px;background:#102139;border-radius:12px}.section-icon-sample svg{width:48px;height:48px;color:#b8d5fc;flex-shrink:0}[data-section-icon-proposal]{margin-top:14px;border:1px solid #609ac6;border-radius:12px;padding:16px}[data-section-preview]{background:#f8fafc;color:#223851;border-radius:12px}[data-section-preview] h3{color:#223851!important}[data-section-preview] .portfolio-custom-block p{color:#334155!important}[data-section-preview] .custom-section-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px}[data-section-preview] .custom-section-item{padding:16px;border:1px solid #cbd5e1;border-radius:10px}[data-section-preview] dd{overflow-wrap:anywhere;white-space:pre-wrap;margin-bottom:12px}[data-section-preview] dt{font-size:12px;font-weight:700;color:#64748b}@media(max-width:700px){.section-field-definition{grid-template-columns:1fr}.section-field-definition>*{grid-column:1!important}.section-schema,.section-icon-studio{padding:14px}}`;
