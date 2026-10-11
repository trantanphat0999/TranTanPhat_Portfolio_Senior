import {runAi,assertAiCurrent,loadAiSettings} from '../ai/service.js';
import {activeProvider} from '../ai/settings.js';
import {contextPicker} from './studio-ui.js';
import { buildCvFields, applyOverrides, selectedFields, validateCvFields, applicationSelection } from '../cv/model.js';
import { createCvPdf, downloadPdf } from '../cv/pdf.js';
import { fitCv } from '../cv/fit.js';
import { CvPdfPreview } from '../cv/preview.js';
import { defaultCvStyle, loadCvSource, resolvePublicCv, reviewCv, officialCvSnapshot } from '../cv/service.js';
import { injectCvStyles } from './cv-styles.js';
import { clone } from './data-model.js';
import {defaultConfig,normalizeConfig,normalizeStyle,STYLE_BOUNDS,validateIdentity} from '../cv/config.js';
import {candidateFields,applyProposal,proposalDiff} from '../cv/proposal.js';
import {recruiterDraft} from '../cv/recruiter.js';
import {inspectCvPdf} from '../cv/quality.js';
import {careerAiFacts,careerHealth,careerPublishIssues} from '../career/model.js';
import {fetchOfficialPdf} from '../cv/artifact.js';
import {rendererFingerprint} from '../cv/releases.js';

const KEY='portfolio.cvDraft.v2';
let state=null,generation=0,url=null,saved='',busy=false,timer,controller=null,preview=null;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const notify=(message,type='info')=>window._adminShowToast?.(message,type);
const accessIssues=new Map();
function friendlyError(error){
 if(error?.code==='permission-denied'||/insufficient permissions|permission.denied/i.test(error?.message||''))return 'Firebase denied this request. Sign in as the portfolio owner and deploy the current Firestore rules to portfolio-project-9770e. Your CV has not been changed.';
 return error?.message||'The service is unavailable. Retry when connected.';
}
function accessNotice(feature,error){accessIssues.set(feature,friendlyError(error));drawAccessNotice();}
function drawAccessNotice(){
 const host=$('am-cv-access-notice');if(!host)return;host.hidden=!accessIssues.size;
 host.innerHTML=accessIssues.size?`<div><strong>Some workspace services need attention</strong><p>${esc([...accessIssues.keys()].join(' · '))}</p>${[...new Set(accessIssues.values())].map(message=>`<p>${esc(message)}</p>`).join('')}</div><button id="am-cv-retry-access">Retry connection</button>`:'';
 if($('am-cv-retry-access'))$('am-cv-retry-access').onclick=retryAccess;
}
async function retryAccess(){
 if(busy)return;if(accessIssues.has('CV Studio')){close(true);await openCVExportModal();return;}if(!state)return;const current=state;busy=true;actions();accessIssues.clear();
 try{
  const api=await import('../firebase-config.js');
  try{const career=await api.readCareerData();if(state!==current)return;const changed=Number(career?._revision||0)!==Number(state.career?._revision||0);state.career=career;state.careerUnavailable=false;if(changed){sourceEpoch++;$('am-cv-source-warning').hidden=false;}}catch(error){state.careerUnavailable=true;accessNotice('Career facts',error);}
  await loadVariants().catch(error=>accessNotice('Private versions',error));await loadReleaseHistory().catch(error=>accessNotice('Release history',error));
  try{const settings=await loadAiSettings(),provider=activeProvider(settings);if(state===current)$('am-cv-provider').textContent=`${provider.label} / ${provider.config.model||'Select model in Settings'}`;}catch(error){accessNotice('AI settings',error);}
  if(state===current){drawAccessNotice();status(accessIssues.size?'Preview available; resolve the connection notice before publishing.':'Workspace reconnected. Review the current draft before publishing.');}
 }finally{if(state===current){busy=false;actions();}}
}
const fields=()=>candidateFields(state);
const draft=()=>({version:4,config:state.config,fields:state.fields,overrides:state.overrides,excluded:state.excluded,concise:state.concise,style:state.style,job:state.job,contextIds:state.contextIds,baseCvRevision:state.baseCvRevision});
let sourceEpoch=0;
const signature=()=>JSON.stringify({draft:draft(),sourceEpoch,portfolio:window._portfolioData,careerRevision:state.career?._revision||0});
const renderStyle=()=>({...state.style,...(state.style.rendererVersion===2?{renderConfig:state.config}:{})});
const documentSignature=()=>JSON.stringify({fields:fields(),style:renderStyle()});
const dirty=()=>state&&JSON.stringify(draft())!==saved;
function status(text){if($('am-cv-draft-status'))$('am-cv-draft-status').textContent=text;}
function releasePreview(){preview?.clear();if(url)URL.revokeObjectURL(url);url=null;$('am-cv-pdf-preview')?.removeAttribute('src');if($('am-cv-open'))$('am-cv-open').hidden=true;}
function displayPreview(){if(!url||!preview)return;preview.render($('am-cv-zoom')?.value||'fit').catch(error=>notify(error.message,'error'));}
function actions(){
  if(!state)return;
  const ready=!!state.pdf?.fits&&!state.pending&&!busy&&state.quality?.passed!==false;
  $('am-cv-dl').disabled=!ready||(state.careerUnavailable&&state.officialSignature!==documentSignature());
  $('am-cv-publish').disabled=!ready||state.careerUnavailable;
  $('am-cv-dl').textContent=state.officialSignature===documentSignature()?'Download PDF':'Save & download PDF';
  for(const id of ['am-cv-rev-btn','am-cv-opt-btn','am-cv-jd-btn','am-cv-plan-btn'])$(id).disabled=!state.pdf||!!state.pending||busy;
  $('am-cv-undo').disabled=busy||!state.undo.length;
}
function invalidatePreview(){
  generation++;if(state){state.pdf=null;state.pending=null;state.quality=null;}
  releasePreview();if($('am-cv-fit'))$('am-cv-fit').hidden=true;
  if($('am-cv-page-count'))$('am-cv-page-count').textContent='Updating…';
  if($('am-cv-preview-message')){$('am-cv-preview-message').hidden=false;$('am-cv-preview-message').textContent='Preparing a preview for your selected page count…';}
  actions();
}
function close(force=false){
  if(busy&&!force){notify('Wait for the current operation, or cancel AI first.');return false;}
  if(!force&&dirty()&&!confirm('Discard unsaved CV changes? Save a draft to keep them.'))return false;
  generation++;clearTimeout(timer);controller?.abort();controller=null;busy=false;releasePreview();state?.planPreview?.clear();state=null;
  $('am-cv-overlay')?.remove();window._adminLeaveCv?.();return true;
}
window._cvClose=close;
window._cvHasUnsaved=()=>!!state&&(dirty()||busy);
function remember(){state.undo.push(clone(draft()));if(state.undo.length>15)state.undo.shift();}
function change(message='Unsaved CV changes',delay=250){invalidatePreview();status(message);clearTimeout(timer);timer=setTimeout(renderPdf,delay);}
function restore(value){
  const nextStyle={...defaultCvStyle(),...value.style},nextConfig=normalizeConfig(value.config||nextStyle.renderConfig);
  if(nextStyle.rendererVersion===2)normalizeStyle(nextStyle);
  validateCvFields(value.fields||state.fields);
  state.fields=value.fields||state.fields;state.overrides=value.overrides||{};state.excluded=value.excluded||[];state.concise=!!value.concise;
  state.style=nextStyle;state.config=nextConfig;delete state.style.locked;
  state.job=value.job||'';state.contextIds=value.contextIds||[];contextPicker($('am-cv-ai-context'),{ids:state.contextIds,onChange:ids=>{state.contextIds=ids;status('Private context selection changed.');}});
  if(Number.isFinite(value.baseCvRevision))state.baseCvRevision=value.baseCvRevision;
  $('am-cv-job').value=state.job;editor();syncControls();change('Draft restored. Review before saving as official.');
}
function editor(){
  const box=$('am-cv-editor');if(!box||!state)return;
  const values=applyOverrides(state.fields,state.overrides,{}),query=state.query.toLowerCase();
  const sections=[...new Set(values.map(field=>field.section))];
  box.innerHTML=sections.map(section=>{
    const rows=values.filter(field=>field.section===section&&(!query||`${field.key} ${field.text}`.toLowerCase().includes(query)));
    if(!rows.length)return '';
    return `<section class="cv-section"><h3>${esc(section)} <small>${rows.length} fields</small></h3>${rows.map(field=>`<div class="am-cv-field ${state.excluded.includes(field.key)?'cv-excluded':''}"><label><input type="checkbox" data-include="${esc(field.key)}" ${state.excluded.includes(field.key)?'':'checked'} ${['name','role','contact.email'].includes(field.key)?'disabled':''}> ${esc(field.kind)} <small>${field.custom?'Custom wording':'Source content'}</small></label><div contenteditable="plaintext-only" role="textbox" aria-label="${esc(field.key)}" data-cv-key="${esc(field.key)}" spellcheck="false">${esc(field.text)}</div>${field.custom?`<button type="button" data-relink="${esc(field.key)}">Restore source text</button>`:''}</div>`).join('')}</section>`;
  }).join('')||'<p>No matching CV fields.</p>';
  box.onchange=event=>{const key=event.target.dataset.include;if(!key||busy)return;remember();state.excluded=state.excluded.filter(value=>value!==key);if(!event.target.checked)state.excluded.push(key);change();};
  box.oninput=event=>{const element=event.target.closest('[data-cv-key]');if(!element)return;remember();state.overrides[element.dataset.cvKey]=element.innerText;change('Unsaved wording changes',600);};
  box.onclick=event=>{const button=event.target.closest('[data-relink]');if(!button||busy)return;remember();delete state.overrides[button.dataset.relink];editor();change();};
}
function syncControls(){
  for(const [key,id] of [['fontSize','font-size'],['lineHeight','line-height']]){$(`am-cv-${id}`).value=state.style[key];$(`am-cv-${id}-value`).textContent=Number(state.style[key]).toFixed(key==='fontSize'?1:2);}
  $('am-cv-font').value=state.style.fontFamily;$('am-cv-limit').value=state.style.pageLimit||0;
  $('am-cv-target').textContent=state.style.pageLimit?`Target: ${state.style.pageLimit} pages`:'Target: all content';
  for(const key of ['margin','sectionSpacing','itemSpacing','bulletSpacing','headerAlignment','datePlacement'])if($(`am-cv-${key}`))$(`am-cv-${key}`).value=state.style[key]??({margin:45.35,sectionSpacing:9,itemSpacing:6,bulletSpacing:2,headerAlignment:'center',datePlacement:'stacked'}[key]);
  configEditor();
}
function showChanges(result){
  const box=$('am-cv-fit');box.hidden=!result.changes.length;
  if(!result.changes.length)return;
  box.innerHTML=`<div class="cv-fit-title"><strong>Review fit: ${result.originalPages} → ${result.pages} pages</strong><span>${result.changes.length} changes</span></div><p>The PDF shows a fitted proposal. Apply these changes before saving. Your original wording remains available with Undo.</p><details><summary>See shortened and excluded content</summary>${result.changes.map(item=>`<article><b>${esc(item.section)} · ${esc(item.action)}</b><p>${esc(item.before)}</p>${item.after?`<p class="cv-after">${esc(item.after)}</p>`:'<small>Excluded from this CV only</small>'}</article>`).join('')}</details><button id="am-cv-apply-fit" class="cv-primary">Apply fitted version</button>`;
  $('am-cv-apply-fit').onclick=()=>{
    if(!state?.pending||busy)return;
    remember();const included=new Set(result.fields.map(field=>field.key));
    state.excluded=state.fields.filter(field=>!included.has(field.key)).map(field=>field.key);
    result.fields.forEach(field=>{const original=state.fields.find(value=>value.key===field.key);if(original&&field.text!==original.text)state.overrides[field.key]=field.text;});
    state.concise=false;state.style={...state.style,...result.effectiveStyle};delete state.style.locked;
    state.pending=null;editor();syncControls();change('Fitted version applied. Save official CV to update public download.');
  };
}
async function renderPdf(){
  if(!state)return;
  const current=state,token=++generation,input=validateCvFields(fields()),style=clone(renderStyle());
  state.pdf=null;state.pending=null;actions();releasePreview();
  $('am-cv-page-count').textContent='Fitting…';$('am-cv-preview-message').hidden=false;
  $('am-cv-preview-message').textContent=style.pageLimit?`Fitting selected content to at most ${style.pageLimit} pages…`:'Generating full CV…';
  try{
    const result=state.officialArtifact&&state.officialSignature===documentSignature()?{blob:await fetchOfficialPdf(state.officialArtifact),pages:state.officialPages,pageLimit:style.pageLimit,fits:true,fields:input,changes:[],originalPages:state.officialPages,effectiveStyle:style}:await fitCv(input,style,()=>token!==generation||state!==current);
    if(!result||token!==generation||state!==current)return;
    state.pdf=result;state.pending=result.changes.length?result:null;
    if(style.rendererVersion===2){
      validateIdentity(result.fields);state.quality=await inspectCvPdf(result.blob,result.fields,style);
      if(token!==generation||state!==current)return;
    }
    $('am-cv-page-count').textContent=`${result.pages} page${result.pages===1?'':'s'}`;
    const review=reviewCv(result.fields,result,style);
    $('am-cv-analysis').textContent=[review.format,`${review.words} words · ${result.fields.length} included fields`,...review.messages,...(state.quality?.issues||[])].join('\n\n');
    if(state.career)$('am-cv-analysis').textContent+=`\n\nCareer facts: ${careerHealth(state.career).length} review items. Imported facts stay unverified until reviewed.`;
    $('am-cv-preview-state').textContent=state.quality?.passed===false?'PDF CHECK FAILED':result.changes.length?'FIT PROPOSAL':result.fits?'VERIFIED PDF':'NEEDS SHORTENING';
    showChanges(result);
    if(result.fits){
      url=URL.createObjectURL(result.blob);$('am-cv-preview-message').hidden=true;
      $('am-cv-open').href=url;$('am-cv-open').hidden=false;
      try{await preview.load(result.blob);}catch(error){if(token===generation&&state===current){$('am-cv-preview-message').hidden=false;$('am-cv-preview-message').textContent='Inline preview could not load. Use Open PDF to review the exact exported document.';}}
      if(token!==generation||state!==current)return;
    }else{
      $('am-cv-preview-message').textContent=`The selected wording still needs ${result.pages} pages. The ${result.pageLimit}-page preview is not ready. Shorten custom text with AI or edit your selection; no content has been cropped.`;
    }
    actions();
  }catch(error){if(token===generation&&state===current){$('am-cv-page-count').textContent='Unavailable';$('am-cv-preview-message').textContent=error.message;notify(error.message,'error');actions();}}
}
function tab(name){
  document.querySelectorAll('[data-cv-tab]').forEach(button=>{const selected=button.dataset.cvTab===name;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
  document.querySelectorAll('[data-cv-panel]').forEach(panel=>panel.hidden=panel.dataset.cvPanel!==name);
  if(name==='content'){$('am-cv-editor').hidden=false;$('am-cv-pdf-preview').hidden=true;$('am-cv-preview-message').hidden=true;}
  else{$('am-cv-editor').hidden=true;$('am-cv-pdf-preview').hidden=false;$('am-cv-preview-message').hidden=!!state?.pdf?.fits;displayPreview();}
}
function configEditor(){
  const host=$('am-cv-order');if(!host||!state)return;
  const sections=[...new Set(candidateFields({...state,excluded:[]}).map(x=>x.section))].filter(x=>x!=='Header');
  host.innerHTML=sections.map(section=>`<div class="cv-order-row"><input aria-label="Heading ${esc(section)}" data-heading="${esc(section)}" value="${esc(state.config.headingLabels[section]||section)}"><button data-section="${esc(section)}" data-direction="-1" aria-label="Move ${esc(section)} up">↑</button><button data-section="${esc(section)}" data-direction="1" aria-label="Move ${esc(section)} down">↓</button></div>`).join('');
  const groups=[...new Set(candidateFields({...state,excluded:[]}).filter(x=>x.kind==='itemTitle').map(x=>x.group))];
  host.innerHTML+=groups.map(group=>{const title=state.fields.find(x=>x.group===group&&x.kind==='itemTitle');return `<div class="cv-order-row"><span>${esc(title.text)}</span><button data-group="${esc(group)}" data-direction="-1" aria-label="Move ${esc(title.text)} up">↑</button><button data-group="${esc(group)}" data-direction="1" aria-label="Move ${esc(title.text)} down">↓</button></div>`;}).join('');
  host.onclick=event=>{
    const button=event.target.closest('[data-direction]');if(!button||busy)return;
    const section=button.dataset.section,group=button.dataset.group,key=section?'sectionOrder':'groupOrder';
    const order=section?sections:groups.filter(id=>state.fields.find(x=>x.group===id)?.section===state.fields.find(x=>x.group===group)?.section),index=order.indexOf(section||group),to=index+Number(button.dataset.direction);if(to<0||to>=order.length)return;
    [order[index],order[to]]=[order[to],order[index]];remember();state.config[key]=section?order:[...state.config.groupOrder.filter(x=>!order.includes(x)),...order];state.style.rendererVersion=2;syncControls();change('CV order updated');
  };
  host.onchange=event=>{if(!event.target.dataset.heading||busy)return;try{const config=normalizeConfig({...state.config,headingLabels:{...state.config.headingLabels,[event.target.dataset.heading]:event.target.value}});remember();state.config=config;state.style.rendererVersion=2;change('Heading updated');}catch(error){notify(error.message,'error');syncControls();}};
  for(const key of ['linkedin','github'])if($(`am-cv-label-${key}`))$(`am-cv-label-${key}`).value=state.config.contactLabels[`contact.${key}`]||'';
}
function controls(){return `
  <nav class="cv-tabs" role="tablist" aria-label="CV tools">${[['content','Content'],['format','Layout'],['ai','AI assist'],['publish','Review']].map(([key,label],index)=>`<button data-cv-tab="${key}" role="tab" aria-selected="${key==='format'}"><small>${index+1}</small>${label}</button>`).join('')}</nav>
  <section data-cv-panel="content" hidden><div class="cv-step-heading"><span>STEP 1 OF 4</span><h3>Choose your content</h3><p>Select the fields to include and edit their wording in the document.</p></div><label class="am-cv-control"><span>Find a field</span><input id="am-cv-search" type="search" placeholder="Search wording or section"></label><p>Toggle fields and edit wording on the left. Portfolio content is preserved.</p><button id="am-cv-application">Select application essentials</button><button id="am-cv-reset">Reset to current portfolio</button><button id="am-cv-refresh-source">Refresh source content</button><div class="cv-inline-actions"><button data-cv-go="format">Next: layout</button></div></section>
  <section data-cv-panel="format"><div class="cv-step-heading"><span>STEP 2 OF 4</span><h3>Make it easy to read</h3><p>Start with the recommended layout, then adjust the essentials.</p></div><button id="am-cv-recruiter">Use Senior QA preset</button><p>A focused layout for Senior QA roles. Review the suggested wording before saving.</p><section class="cv-control-block"><label class="am-cv-control"><span>Page target</span><select id="am-cv-limit"><option value="0">Full CV · all selected content</option><option value="1">1 page</option><option value="2">2 pages · recommended</option><option value="3">3 pages</option><option value="4">4 pages</option></select></label><p>If the content is too long, review a fitted proposal before applying.</p></section><h3>Typography</h3><label class="am-cv-control"><span>Font</span><select id="am-cv-font"><option value="Roboto">Roboto · sans serif</option><option value="NotoSerif">Noto Serif</option></select></label><label class="am-cv-control"><span>Body size <b id="am-cv-font-size-value"></b></span><input id="am-cv-font-size" type="range" min="10" max="12.5" step="0.1"></label><label class="am-cv-control"><span>Line height <b id="am-cv-line-height-value"></b></span><input id="am-cv-line-height" type="range" min="1.12" max="1.7" step="0.01"></label><label class="am-cv-control"><span>Page margins (pt)</span><input id="am-cv-margin" type="number" min="${STYLE_BOUNDS.margin[0]}" max="${STYLE_BOUNDS.margin[1]}" step="0.1"></label><details class="cv-advanced"><summary>Advanced layout</summary>${['sectionSpacing','itemSpacing','bulletSpacing'].map(key=>`<label class="am-cv-control"><span>${({margin:'Margins (pt)',sectionSpacing:'Section spacing',itemSpacing:'Item spacing',bulletSpacing:'Bullet spacing'})[key]}</span><input id="am-cv-${key}" type="number" min="${STYLE_BOUNDS[key][0]}" max="${STYLE_BOUNDS[key][1]}" step="0.1"></label>`).join('')}<label class="am-cv-control"><span>Header alignment</span><select id="am-cv-headerAlignment"><option value="center">Center</option><option value="left">Left</option></select></label><label class="am-cv-control"><span>Dates</span><select id="am-cv-datePlacement"><option value="stacked">Separate line</option><option value="inline">Beside title</option></select></label><details><summary>Section and item order</summary><div id="am-cv-order"></div></details>${['linkedin','github'].map(key=>`<label class="am-cv-control"><span>${key} display label</span><input id="am-cv-label-${key}" maxlength="100" placeholder="Full URL"></label>`).join('')}</details><button data-cv-go="publish">Next: review & publish</button></section>
  <section data-cv-panel="ai" hidden><div class="cv-step-heading"><span>STEP 3 OF 4</span><h3>Tailor to a role</h3><p>AI proposes changes. You choose what to apply.</p></div><label class="am-cv-control"><span>Job description · private</span><textarea id="am-cv-job" rows="7" placeholder="Paste the JD to review evidence and improve wording"></textarea></label><p>Review offers guidance. Optimize proposes wording changes for you to approve.</p><div id="am-cv-provider" class="studio-status"></div><div id="am-cv-ai-context"></div><button id="am-cv-jd-btn">Analyze JD evidence</button><button id="am-cv-rev-btn">Review CV against JD</button><button id="am-cv-opt-btn">Optimize wording</button><button id="am-cv-cancel-ai" hidden>Cancel AI request</button><div id="am-cv-ai-out" role="status" aria-live="polite"></div><section class="cv-control-block"><h3>Plan with AI</h3><label class="am-cv-control"><span>Your instructions</span><textarea id="am-cv-plan-instructions" rows="3" placeholder="Prioritize API automation, shorten internship, keep 2 pages and at least 10.5 pt"></textarea></label><button id="am-cv-plan-btn">Plan content & layout</button><p>Review a measured PDF candidate and select changes before applying.</p><div id="am-cv-plan-output" aria-live="polite"></div></section></section>
  <section data-cv-panel="publish" hidden><div class="cv-step-heading"><span>STEP 4 OF 4</span><h3>Review before publishing</h3><p>Check the PDF and the notes below. Save official CV updates the public download.</p></div><div id="am-cv-analysis" role="status"></div><details class="cv-advanced"><summary>Private versions</summary><section class="cv-control-block"><h3>Private CV variants</h3><label class="am-cv-control"><span>Name</span><input id="am-cv-variant-name" maxlength="100" placeholder="Senior QA — API automation"></label><button id="am-cv-variant-save">Save private variant</button><select id="am-cv-variants" aria-label="Saved CV variants"><option value="">Select variant</option></select><button id="am-cv-variant-load">Load variant</button><button id="am-cv-variant-export">Download draft PDF</button><button id="am-cv-variant-delete">Delete variant</button><p>Private variants preserve the JD and config. Save official CV to use the current variant for public downloads.</p></section></details><details class="cv-advanced"><summary>Published versions & rollback</summary><section class="cv-control-block"><h3>Official release history</h3><p>Published PDFs retain their exact bytes when the renderer changes. Rollback activates a previous verified file.</p><button id="am-cv-history-refresh">Refresh history</button><div id="am-cv-history"></div></section></details></section>
  <section class="cv-control-block cv-draft-actions"><h3>Draft recovery</h3><button id="am-cv-save-draft">Save draft</button><button id="am-cv-restore-draft">Restore saved draft</button></section>`;}

export async function openCVExportModal(){
  window._adminSelectCv?.();
  if($('am-cv-overlay')){displayPreview();return;}injectCvStyles();
  const host=$('ws-cv-panel');if(!host)throw new Error('Open Admin workspace before CV Studio.');
  host.insertAdjacentHTML('beforeend',`<section id="am-cv-overlay" class="cv-workspace-page" aria-label="CV Studio"><div class="am-cv-modal"><header class="cv-studio-header"><div><span class="cv-eyebrow">PORTFOLIO / CV STUDIO</span><h2>Build your next CV.</h2><p>Edit content, choose a layout, then review and publish.</p></div><button id="am-cv-close" aria-label="Leave CV Studio">← Overview</button></header><div class="cv-studio-toolbar"><div><span id="am-cv-target">Target: 2 pages</span><span id="am-cv-preview-state">LOADING</span><strong id="am-cv-page-count" class="cv-page-count">Loading...</strong></div><div><label class="cv-zoom-control">Zoom <select id="am-cv-zoom" aria-label="PDF preview zoom"><option value="fit">Fit width</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option><option value="200">200%</option></select></label><button id="am-cv-inspector-toggle">Hide tools</button><button id="am-cv-toggle-editor">Edit content / preview</button><button id="am-cv-undo" disabled>Undo</button><a id="am-cv-open" hidden target="_blank" rel="noopener">Open PDF ↗</a></div></div><div id="am-cv-access-notice" role="status" hidden></div><div class="am-cv-body"><div class="cv-preview-column"><div id="am-cv-source-warning" hidden><span>Portfolio changed. Your CV wording has been preserved.</span><button id="am-cv-review-source">Review current source</button></div><div id="am-cv-fit" hidden></div><div id="am-cv-left"><div id="am-cv-preview-message" role="status">Loading CV…</div><div id="am-cv-pdf-preview" role="region" aria-label="CV PDF preview"></div><div id="am-cv-editor" hidden></div></div></div><aside class="am-cv-tools">${controls()}</aside></div><footer class="cv-studio-footer"><div><strong id="am-cv-draft-status">Loading official CV…</strong><p>Only saved official changes update the public download.</p></div><div><button class="am-cv-close">Close draft</button><button id="am-cv-publish" disabled>Save official CV</button><button id="am-cv-dl" disabled>Save & download PDF</button></div></footer></div></section>`);
  accessIssues.clear();const token=++generation;preview=new CvPdfPreview($('am-cv-pdf-preview'));
  $('am-cv-zoom').onchange=displayPreview;
  $('am-cv-inspector-toggle').onclick=()=>{const hidden=$('am-cv-overlay').classList.toggle('cv-inspector-hidden');$('am-cv-inspector-toggle').textContent=hidden?'Show tools':'Hide tools';displayPreview();};
  $('am-cv-close').onclick=()=>window._adminNavigate?.('overview');document.querySelector('.am-cv-close').onclick=()=>close();
  try{
    const api=await import('../firebase-config.js');
    const [source,official]=await Promise.all([loadCvSource(),api.readOfficialCv()]);
    let career=null,careerError=null;try{career=await api.readCareerData();}catch(error){careerError=error;}if(career)source['career-data']=career;
    const linked=await buildCvFields(source);if(token!==generation)return;
    state={fields:linked,config:defaultConfig(),overrides:{},excluded:[],concise:false,style:{...defaultCvStyle(),pageLimit:2},job:'',contextIds:[],query:'',baseCvRevision:official?._revision||0,undo:[],pdf:null,pending:null,officialSignature:null};
    state.career=career;state.careerUnavailable=!!careerError;if(careerError)accessNotice('Career facts',careerError);state.officialArtifact=official?.releaseVersion===1?official.artifact:null;state.officialPages=official?.pageCount;
    const cloudDraft=await api.readCvDraft().catch(()=>null);if(token!==generation)return;state.cloudDraftRevision=cloudDraft?._revision||0;
    if(official?.version===4){
      const resolved=await resolvePublicCv({cv:official}),keys=new Set(resolved.fields.map(field=>field.key));
      // Keep the saved order and retain missing records; new source fields start excluded.
      state.fields=[...resolved.fields.map(field=>({...linked.find(value=>value.key===field.key),...field})),...linked.filter(field=>!keys.has(field.key))];
      state.excluded=state.fields.filter(field=>!keys.has(field.key)).map(field=>field.key);
      state.style={...defaultCvStyle(),...official.effectiveStyle,rendererVersion:official.rendererVersion};state.config=normalizeConfig(official.effectiveStyle.renderConfig);
      state.officialSignature=documentSignature();
    }else if(official?.version===3){
      Object.assign(state,{overrides:official.overrides||{},excluded:official.excluded||[],concise:!!official.concise,style:{...state.style,...official.style}});
    }
    saved=JSON.stringify(draft());editor();syncControls();status(official?.version===4?`Official CV · version ${state.baseCvRevision}`:official?'Legacy CV loaded · review and save the official snapshot':'Create your first official CV');
    document.querySelectorAll('[data-cv-go]').forEach(button=>button.onclick=()=>tab(button.dataset.cvGo));
    const tabs=[...document.querySelectorAll('[data-cv-tab]')];
    tabs.forEach(button=>{
      const name=button.dataset.cvTab;button.id=`cv-tab-${name}`;button.setAttribute('aria-controls',`cv-panel-${name}`);button.tabIndex=name==='format'?0:-1;
      const panel=document.querySelector(`[data-cv-panel="${name}"]`);panel.id=`cv-panel-${name}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
      button.onclick=()=>tab(name);
      button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=tabs.indexOf(button),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();};
    });
    for(const [key,id] of [['fontFamily','font'],['fontSize','font-size'],['lineHeight','line-height']])$(`am-cv-${id}`).oninput=event=>window._cvUpdateStyle(key,event.target.value);
    $('am-cv-limit').onchange=event=>window._cvUpdateStyle('pageLimit',event.target.value);
    for(const key of ['margin','sectionSpacing','itemSpacing','bulletSpacing','headerAlignment','datePlacement'])$(`am-cv-${key}`).onchange=event=>window._cvUpdateStyle(key,event.target.value);
    for(const key of ['linkedin','github'])$(`am-cv-label-${key}`).onchange=event=>{if(busy)return;remember();if(event.target.value.trim())state.config.contactLabels[`contact.${key}`]=event.target.value.trim();else delete state.config.contactLabels[`contact.${key}`];state.style.rendererVersion=2;change('Contact label updated');};
    $('am-cv-recruiter').onclick=()=>{if(busy)return;const next=recruiterDraft(draft());remember();restore(next);status('Senior QA preset applied. Review wording, evidence and PDF; Undo is available.');};
    $('am-cv-plan-btn').onclick=planCv;
    $('am-cv-variant-save').onclick=()=>variantAction('save');$('am-cv-variant-load').onclick=()=>variantAction('load');$('am-cv-variant-delete').onclick=()=>variantAction('delete');
    $('am-cv-variant-export').onclick=()=>{if(!busy&&state.pdf?.fits&&!state.pending&&state.quality?.passed!==false)downloadPdf(state.pdf.blob,'CV_Private_Draft.pdf');};
    await loadVariants().catch(error=>accessNotice('Private versions',error));
    $('am-cv-history-refresh').onclick=()=>loadReleaseHistory().catch(error=>notify(error.message,'error'));await loadReleaseHistory().catch(error=>{$('am-cv-history').textContent='Release history could not load.';accessNotice('Release history',error);});
    $('am-cv-job').oninput=event=>{state.job=event.target.value;status('Unsaved private JD');actions();};
    $('am-cv-search').oninput=event=>{state.query=event.target.value;editor();};
    $('am-cv-toggle-editor').onclick=()=>tab($('am-cv-editor').hidden?'content':'format');
    $('am-cv-undo').onclick=()=>{if(!busy&&state.undo.length){const previous=state.undo.pop();previous.baseCvRevision=state.baseCvRevision;restore(previous);status('Previous CV changes restored');}};
    $('am-cv-application').onclick=()=>{if(busy)return;remember();Object.assign(state,applicationSelection(state.fields));state.style.pageLimit=2;editor();syncControls();change('Application selection applied. Review selected content.');};
    $('am-cv-reset').onclick=async()=>{if(busy||!confirm('Reset CV text and selection to the current portfolio? You can undo this change.'))return;const current=state;const evidence=await currentEvidence(true);if(state!==current)return;remember();state.career=evidence.career;state.careerUnavailable=false;state.fields=evidence.fields;state.overrides={};state.excluded=[];state.concise=false;editor();change('CV reset to current portfolio');};
    $('am-cv-refresh-source').onclick=refreshSource;$('am-cv-review-source').onclick=()=>{tab('content');refreshSource();};
    $('am-cv-save-draft').onclick=saveDraft;
    $('am-cv-restore-draft').onclick=async()=>{
      if(busy||dirty()&&!confirm('Replace unsaved changes with the saved draft?'))return;
      try{let local;try{local=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}const remote=await api.readCvDraft().catch(()=>null);if(!state)return;if(remote)state.cloudDraftRevision=remote._revision||0;const value=local&&(!remote||local.savedAt>remote.savedAt)?local:remote;if(!value)throw new Error('No saved draft is available.');remember();restore({...value,baseCvRevision:state.baseCvRevision});}catch(error){notify(error.message,'error');}
    };
    $('am-cv-dl').onclick=window._cvDownload;$('am-cv-publish').onclick=()=>publish(false);
    const aiSettings=await loadAiSettings().catch(error=>{accessNotice('AI settings',error);return null;});if(!state)return;state.contextIds=aiSettings?.defaultContextIds||[];const provider=activeProvider(aiSettings);$('am-cv-provider').textContent=`${provider.label} / ${provider.config.model||'Select model in Settings'} / ${provider.ready?'Ready':'Needs connection test'}`;await contextPicker($('am-cv-ai-context'),{ids:state.contextIds,onChange:ids=>{state.contextIds=ids;status('Unsaved private context selection');}});
    saved=JSON.stringify(draft());
    $('am-cv-jd-btn').onclick=()=>ai('jd');
    $('am-cv-rev-btn').onclick=()=>ai('review');$('am-cv-opt-btn').onclick=()=>ai('optimize');$('am-cv-cancel-ai').onclick=()=>controller?.abort();
    await renderPdf();
  }catch(error){if(token!==generation)return;notify(error.message,'error');$('am-cv-preview-message').textContent='CV could not load. '+friendlyError(error);$('am-cv-preview-state').textContent='UNAVAILABLE';accessNotice('CV Studio',error);status('CV unavailable. Close and retry.');}
}
async function refreshSource(){
  if(!state||busy)return;const current=state;
  try{const source=await loadCvSource(),api=await import('../firebase-config.js'),career=await api.readCareerData();if(career)source['career-data']=career;const fresh=await buildCvFields(source);if(state!==current)return;remember();state.career=career;state.careerUnavailable=false;
    // Preserve every existing displayed text while making updated source available via Restore source text.
    const selected=fields(),byKey=new Map(selected.map(field=>[field.key,field.text]));
    const existing=new Set(state.fields.map(field=>field.key));
    state.fields=[...fresh,...state.fields.filter(field=>!fresh.some(value=>value.key===field.key))];
    state.fields.forEach(field=>{if(byKey.has(field.key)&&byKey.get(field.key)!==field.text)state.overrides[field.key]=byKey.get(field.key);if(!existing.has(field.key))state.excluded.push(field.key);});
    $('am-cv-source-warning').hidden=true;editor();change('Source refreshed. Existing CV wording preserved; restore a field to accept new text.');
  }catch(error){notify(error.message,'error');}
}
async function saveDraft(){
  if(!state||busy)return;const current=state,value={...clone(draft()),savedAt:new Date().toISOString()},text=JSON.stringify(draft());
  try{localStorage.setItem(KEY,JSON.stringify(value));saved=text;status('Draft saved on this device');}catch(error){notify('Could not save on this device. Trying private cloud storage.','info');}
  try{const api=await import('../firebase-config.js');const response=await api.writeCvDraft({...value,_revision:state.cloudDraftRevision||0});if(state===current){state.cloudDraftRevision=response.data?._revision??state.cloudDraftRevision;if(JSON.stringify(draft())===text){saved=text;status('Private draft synced · official CV unchanged');}}}catch(error){notify(`Cloud draft unavailable: ${error.message}. Check the draft status.`,'info');}
}
window._cvUpdateStyle=(key,value)=>{
  if(!state||busy)return;
  if(['margin','sectionSpacing','itemSpacing','bulletSpacing','headerAlignment','datePlacement'].includes(key)||state.style.rendererVersion===2){
    try{const numeric=Object.hasOwn(STYLE_BOUNDS,key)||key==='pageLimit';const style=normalizeStyle({...state.style,[key]:numeric?Number(value):value,rendererVersion:2});remember();state.style=style;delete state.style.locked;syncControls();change();}catch(error){notify(error.message,'error');syncControls();}return;
  }
  remember();
  if(key==='fontFamily')state.style.fontFamily=value==='NotoSerif'?'NotoSerif':'Roboto';
  else if(key==='pageLimit')state.style.pageLimit=[1,2,3,4].includes(Number(value))?Number(value):0;
  else state.style[key]=Math.max(key==='fontSize'?10:1.12,Math.min(key==='fontSize'?12.5:1.7,Number(value)||defaultCvStyle()[key]));
  delete state.style.locked;syncControls();change();
};
function lock(locked){
  document.querySelectorAll('#am-cv-overlay input,#am-cv-overlay select,#am-cv-overlay textarea').forEach(element=>element.disabled=locked||['name','role','contact.email'].includes(element.dataset.include));
  document.querySelectorAll('[data-cv-key]').forEach(element=>element.contentEditable=locked?'false':'plaintext-only');
}
async function publish(download=false){
  if(busy||!state?.pdf?.fits||state.pending||state.quality?.passed===false||state.careerUnavailable)return;
  const current=state,result=state.pdf,input=fields(),style=clone(renderStyle()),before=signature();
  busy=true;lock(true);actions();status('Saving official CV…');
  try{
    const api=await import('../firebase-config.js'),career=await api.readCareerData(),issues=careerPublishIssues(input,career);
    if(issues.length)throw new Error(issues.slice(0,4).join('\n'));
    const quality=await inspectCvPdf(result.blob,input,style);if(!quality.passed)throw new Error(quality.issues.join('\n'));
    const snapshot=await officialCvSnapshot(input,result,style,state.baseCvRevision);
    if(state!==current||signature()!==before)throw new Error('CV changed while preparing the save. Review the latest preview.');
    const fingerprint=await rendererFingerprint(style.fontFamily);const response=await api.publishCvRelease(snapshot,result.blob,fingerprint,Number(career?._revision||0));
    if(!response.synced)throw new Error('The official CV was not synced. Save a draft and retry online.');
    if(state!==current)return;
    state.baseCvRevision=response.data._revision;state.officialSignature=documentSignature();saved=JSON.stringify(draft());
    state.officialArtifact=response.data.artifact;state.officialPages=response.data.pageCount;await loadReleaseHistory().catch(error=>{$('am-cv-history').textContent=`Release saved; history could not reload: ${error.message}`;});
    status(`Official CV saved · version ${state.baseCvRevision} · public download updated`);
    window.dispatchEvent(new CustomEvent('cv-published-changed',{detail:{revision:state.baseCvRevision}}));
    if(download)downloadPdf(result.blob,'CV_TranTanPhat_SeniorQA.pdf');
    notify('Official CV saved. Public and Admin use the same document.','success');
  }catch(error){if(state===current){status('Official CV unchanged · save failed');accessNotice('Publishing',error);notify(friendlyError(error),'error');}}
  finally{if(state===current){busy=false;lock(false);actions();}}
}
window._cvDownload=async()=>{
  if(busy||!state?.pdf?.fits||state.pending||state.quality?.passed===false)return;
  if(state.officialSignature!==documentSignature()){await publish(true);return;}
  downloadPdf(state.officialArtifact?await fetchOfficialPdf(state.officialArtifact):state.pdf.blob,'CV_TranTanPhat_SeniorQA.pdf');
};
async function ai(mode){
  if(busy||!state?.pdf||state.pending)return;
  busy=true;actions();const current=state,input=fields(),snapshot=signature(),output=$('am-cv-ai-out');
  output.textContent='Reviewing your CV…';$('am-cv-cancel-ai').hidden=false;
  controller=new AbortController();const activeController=controller;
  try{
    await assertCareerCurrent(state.career?._revision||0);
    const provider=activeProvider(await loadAiSettings());if(state===current)$('am-cv-provider').textContent=`${provider.label} / ${provider.config.model}`;
    if(mode==='jd'&&!state.job.trim())throw new Error('Paste a target job description first.');
    const contextIds=[...state.contextIds],result=await runAi({task:mode==='review'?'cv-review':mode==='jd'?'jd-analysis':'cv-optimize',input:{fields:input,portfolioFields:state.fields,careerFacts:careerAiFacts(state.career),pageLimit:state.style.pageLimit||'auto',analysis:reviewCv(input,state.pdf,state.style),jobDescription:state.job},contextIds,signal:activeController.signal}),parsed=result.structured;
    if(state!==current||snapshot!==signature())throw new Error('CV, format or JD changed during the request. Run AI again.');
    if(mode==='jd'){const keys=new Set(state.fields.map(f=>f.key));output.innerHTML=`<p>${esc(parsed.summary)}</p><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Source</th></tr></thead><tbody>${parsed.requirements.map(item=>{const evidence=item.sourceKeys.filter(key=>keys.has(key)),label=item.status==='matched'&&!evidence.length?'unknown':item.status;return `<tr><td>${esc(item.requirement)}</td><td>${esc(label)} / ${esc(item.reason)}</td><td>${evidence.map(esc).join(', ')}</td></tr>`;}).join('')}</tbody></table>`;return;}
    if(mode==='review'){if(typeof parsed.summary!=='string'||!Array.isArray(parsed.items))throw new Error('Invalid AI review response.');output.textContent=[parsed.summary,...parsed.items.filter(item=>typeof item.text==='string').map(item=>item.text)].join('\n\n');return;}
    if(!Array.isArray(parsed.suggestions))throw new Error('Invalid AI suggestions.');
    const seen=new Set(),proposals=parsed.suggestions.filter(item=>{if(!input.some(field=>field.key===item.key)||typeof item.text!=='string'||!item.text.trim()||item.text.length>10000||seen.has(item.key))return false;seen.add(item.key);return true;});
    if(!proposals.length){output.textContent='No valid wording changes were proposed.';return;}
    output.innerHTML=proposals.map((item,index)=>`<article class="cv-ai-proposal"><label><input type="checkbox" data-proposal="${index}"> ${esc(item.key)}</label><small>Current</small><p>${esc(input.find(field=>field.key===item.key).text)}</p><small>Proposed</small><p class="cv-after">${esc(item.text)}</p>${item.reason?`<p>${esc(item.reason)}</p>`:''}</article>`).join('')+'<button id="am-cv-apply-proposals" class="cv-primary">Apply selected suggestions</button>';
    $('am-cv-apply-proposals').onclick=async()=>{
      if(busy)return;busy=true;actions();
      try{await assertAiCurrent(result,contextIds);await assertCareerCurrent(state.career?._revision||0);if(state!==current||snapshot!==signature())throw new Error('CV or JD changed. Generate new suggestions.');const chosen=[...output.querySelectorAll('[data-proposal]:checked')];if(!chosen.length)throw new Error('Select at least one suggestion.');const operations=chosen.map(box=>{const item=proposals[Number(box.dataset.proposal)];return {type:'rewriteField',key:item.key,value:item.text,sourceKeys:[item.key]};});const next=applyProposal(draft(),operations,input);remember();restore(next);output.textContent='Selected suggestions applied. Undo is available.';}
      catch(error){notify(error.message,'error');}finally{if(state===current){busy=false;actions();}}
    };
  }catch(error){if(state===current&&output.isConnected)output.textContent=error.name==='AbortError'?'AI request cancelled or timed out. Your CV is unchanged.':error.message;}
  finally{if(controller===activeController)controller=null;if(state===current){busy=false;$('am-cv-cancel-ai').hidden=true;actions();}}
}
async function assertCareerCurrent(revision){const api=await import('../firebase-config.js');const career=await api.readCareerData();if(Number(career?._revision||0)!==revision)throw new Error('Career facts changed. Refresh CV source before using AI.');}
async function currentEvidence(withCareer=false){const source=await loadCvSource(),api=await import('../firebase-config.js'),career=await api.readCareerData();if(career)source['career-data']=career;const fields=await buildCvFields(source);return withCareer?{fields,career}:fields;}
async function loadReleaseHistory(){
 const current=state;if(!current)return;const api=await import('../firebase-config.js'),items=await api.readCvReleaseHistory();if(state!==current)return;
 $('am-cv-history').innerHTML=items.map(item=>`<article><p>${esc(item.publishedAt)} · ${item.pageCount} pages · ${esc(item.artifact.hash.slice(0,12))}</p><button data-release-open="${esc(item.releaseId)}">Download this release</button><button data-release-rollback="${esc(item.releaseId)}">Activate this release</button></article>`).join('')||'<p>No immutable releases yet. Save the official CV to freeze its reviewed PDF.</p>';
 $('am-cv-history').onclick=async event=>{
  const button=event.target.closest('[data-release-open],[data-release-rollback]');if(!button||busy)return;const id=button.dataset.releaseOpen||button.dataset.releaseRollback,item=items.find(x=>x.releaseId===id);if(!item)return;
  busy=true;lock(true);actions();
  try{
   if(button.dataset.releaseOpen){downloadPdf(await fetchOfficialPdf(item.artifact),'CV_Official_Release.pdf');return;}
   const response=await api.rollbackCvRelease(id,state.baseCvRevision);if(state!==current)return;
   remember();state.baseCvRevision=response.data._revision;for(const item of state.undo)item.baseCvRevision=state.baseCvRevision;state.officialArtifact=response.data.artifact;state.officialPages=response.data.pageCount;
   restore({fields:response.data.fields,overrides:{},excluded:[],concise:false,config:response.data.effectiveStyle.renderConfig,style:{...response.data.effectiveStyle,rendererVersion:response.data.rendererVersion},job:state.job,contextIds:state.contextIds,baseCvRevision:state.baseCvRevision});
   state.officialSignature=documentSignature();saved=JSON.stringify(draft());window.dispatchEvent(new CustomEvent('cv-published-changed'));status('Previous official release activated. Its original PDF bytes are preserved.');await loadReleaseHistory();
  }catch(error){notify(error.message,'error');}finally{if(state===current){busy=false;lock(false);actions();}}
 };
}
async function loadVariants(){
  const current=state;if(!current)return;
  const api=await import('../firebase-config.js'),document=await api.readAdminDoc('cv-variants');
  if(state!==current)return;state.variants=document||{_revision:0,items:[]};
  $('am-cv-variants').innerHTML='<option value="">Select variant</option>'+state.variants.items.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
}
async function variantAction(action){
  if(!state||busy)return;const current=state;busy=true;actions();
  try{
    const api=await import('../firebase-config.js'),document=clone(state.variants||{_revision:0,items:[]}),id=$('am-cv-variants').value;
    if(action==='load'){
      const item=document.items.find(x=>x.id===id);if(!item)throw new Error('Select a saved variant.');
      remember();restore({...item.draft,baseCvRevision:state.baseCvRevision});status('Private variant loaded. Review before saving official CV.');return;
    }
    if(action==='save'){
      const name=$('am-cv-variant-name').value.trim();if(!name)throw new Error('Enter a variant name.');
      if(document.items.length>=30)throw new Error('Keep at most 30 private variants.');
      document.items.push({id:crypto.randomUUID(),name,draft:clone(draft()),savedAt:new Date().toISOString()});
    }else{if(!document.items.some(x=>x.id===id))throw new Error('Select a variant to delete.');document.items=document.items.filter(x=>x.id!==id);}
    await api.writeAdminDoc('cv-variants',document);if(state===current){await loadVariants();status('Private variants synced · official CV unchanged');}
  }catch(error){notify(error.message,'error');}finally{if(state===current){busy=false;actions();}}
}
async function planCv(){
  if(busy||!state?.pdf||state.pending)return;
  const current=state,base=clone(draft()),snapshot=signature(),output=$('am-cv-plan-output'),instructions=$('am-cv-plan-instructions').value,contextIds=[...state.contextIds];
  busy=true;actions();controller=new AbortController();const activeController=controller,deadline=setTimeout(()=>activeController.abort(),120000);$('am-cv-cancel-ai').hidden=false;
  output.textContent='Planning content and layout…';
  const cancel=document.createElement('button');cancel.textContent='Cancel plan';cancel.onclick=()=>activeController.abort();output.append(cancel);let candidatePreview;
  try{
    await assertCareerCurrent(state.career?._revision||0);
    const evidence=await currentEvidence(),sourceHash=JSON.stringify(evidence);
    let result,candidate,rendered,quality,feedback=null;
    for(let attempt=0;attempt<3;attempt++){
      if(activeController.signal.aborted)throw new DOMException('Cancelled','AbortError');
      result=await runAi({task:'cv-plan',input:{portfolioFields:evidence,careerFacts:careerAiFacts(state.career),fields:candidateFields(base),config:base.config,style:base.style,jobDescription:base.job,instructions,feedback,analysis:reviewCv(fields(),state.pdf,state.style)},contextIds,signal:activeController.signal});
      if(state!==current||snapshot!==signature()||instructions!==$('am-cv-plan-instructions').value)throw new Error('CV, source, instructions or JD changed. Generate a new plan.');
      candidate=applyProposal(base,result.structured.operations,evidence);
      const style={...candidate.style,renderConfig:candidate.config};
      rendered=await createCvPdf(candidateFields(candidate),style);quality=await inspectCvPdf(rendered.blob,candidateFields(candidate),style);
      if(activeController.signal.aborted)throw new DOMException('Cancelled','AbortError');
      if(rendered.fits&&quality.passed)break;
      feedback={attempt:attempt+1,pages:rendered.pages,pageLimit:rendered.pageLimit,issues:quality.issues,previousOperations:result.structured.operations,instruction:'Return a complete replacement proposal against the original config. Preserve typography requested by the user; shorten/select relevant content first.'};
      output.textContent=`Candidate needs adjustment (${rendered.pages} pages). Refining ${attempt+1}/2…`;
      output.append(cancel);
    }
    if(state!==current||snapshot!==signature())throw new Error('CV changed. Generate a new plan.');
    const proposal=result.structured;
    output.innerHTML=`<p>${esc(proposal.summary)}</p>${[...proposal.assumptions,...proposal.evidenceQuestions].map(x=>`<p>${esc(x)}</p>`).join('')}<p>Measured: ${rendered.pages} pages · ${quality.passed?'PDF checks passed':'PDF checks need attention'}</p>${proposal.operations.map((op,index)=>`<article class="cv-ai-proposal"><label><input type="checkbox" data-plan-operation="${index}" checked> ${esc(op.type)} · ${esc(op.key)}</label><p>${esc(op.value)}</p><p>${esc(op.reason)}</p><small>Evidence: ${op.sourceKeys.map(esc).join(', ')||'Layout / selection'}</small></article>`).join('')}<button id="am-cv-plan-preview">Preview selected changes</button><button id="am-cv-plan-apply" disabled>Apply reviewed changes</button><p id="am-cv-plan-status"></p><div id="am-cv-plan-diff"></div><div id="am-cv-plan-pdf" class="cv-candidate-preview"></div>`;
    const chosen=()=>proposal.operations.filter((_,index)=>output.querySelector(`[data-plan-operation="${index}"]`)?.checked);
    let reviewed=null;
    async function checkCurrent(){
      await assertAiCurrent(result,contextIds);
      if(state!==current||snapshot!==signature()||instructions!==$('am-cv-plan-instructions').value)throw new Error('CV, JD, instructions or source changed. Generate a new plan.');
      await assertCareerCurrent(state.career?._revision||0);if(JSON.stringify(await currentEvidence())!==sourceHash)throw new Error('Portfolio evidence changed. Generate a new plan.');
    }
    async function previewSelected(){
      if(busy)return;busy=true;actions();const selection=JSON.stringify(chosen());$('am-cv-plan-apply').disabled=true;
      try{
        await checkCurrent();const next=applyProposal(base,chosen(),evidence),style={...next.style,renderConfig:next.config},pdf=await createCvPdf(candidateFields(next),style),report=await inspectCvPdf(pdf.blob,candidateFields(next),style);
        await checkCurrent();if(selection!==JSON.stringify(chosen()))throw new Error('Selection changed during preview. Preview again.');
        reviewed={next,selection,pdf,report};
        $('am-cv-plan-status').textContent=`${pdf.pages} pages · ${pdf.fits&&report.passed?'Ready to apply':[...report.issues,...(!pdf.fits?['Exceeds page target']:[])].join('; ')}`;
        $('am-cv-plan-diff').innerHTML=proposalDiff(base,next).map(x=>`<article class="cv-ai-proposal"><b>${esc(x.key)}</b><small>Before</small><p>${esc(x.before)}</p><small>After</small><p>${esc(x.after)}</p></article>`).join('');
        candidatePreview?.clear();candidatePreview=new CvPdfPreview($('am-cv-plan-pdf'));state.planPreview=candidatePreview;await candidatePreview.load(pdf.blob);
        $('am-cv-plan-apply').disabled=!pdf.fits||!report.passed;
      }catch(error){if(state===current)notify(error.message,'error');}finally{if(state===current){busy=false;actions();}}
    }
    output.onchange=()=>{reviewed=null;$('am-cv-plan-apply').disabled=true;candidatePreview?.clear();};
    $('am-cv-plan-preview').onclick=previewSelected;
    $('am-cv-plan-apply').onclick=async()=>{
      if(busy||!reviewed||!reviewed.pdf.fits||!reviewed.report.passed)return;busy=true;actions();
      try{await checkCurrent();if(reviewed.selection!==JSON.stringify(chosen()))throw new Error('Preview the selected changes again.');remember();restore(reviewed.next);candidatePreview?.clear();output.textContent='Reviewed content and layout applied. Undo is available.';}
      catch(error){notify(error.message,'error');}finally{if(state===current){busy=false;actions();}}
    };
  }catch(error){if(state===current)output.textContent=error.name==='AbortError'?'Plan cancelled. Your draft is unchanged.':error.message;}
  finally{clearTimeout(deadline);if(controller===activeController)controller=null;if(state===current){busy=false;$('am-cv-cancel-ai').hidden=true;actions();}}
}
window.openCVExportModal=openCVExportModal;window._cvReview=()=>ai('review');window._cvOptimize=()=>ai('optimize');
window.addEventListener('beforeunload',event=>{if(dirty()||busy){event.preventDefault();event.returnValue='';}});
window.addEventListener('portfolio-auth-state',event=>{
  if(!event.detail.signedIn&&state){try{localStorage.setItem(KEY,JSON.stringify({...draft(),savedAt:new Date().toISOString()}));}catch{notify('Draft recovery failed: local storage unavailable.','error');}close(true);}
});
window.addEventListener('portfolio-content-changed',()=>{sourceEpoch++;if(state){$('am-cv-source-warning').hidden=false;status('Portfolio changed · saved CV and custom wording preserved');}});
window.addEventListener('career-data-changed',()=>{sourceEpoch++;if(state){$('am-cv-source-warning').hidden=false;status('Career facts changed. Refresh source before preparing a new CV.');}});
window.addEventListener('storage',event=>{if(state&&event.key==='portfolio.officialCv.v4')status('Official CV may have changed in another tab. Saving checks your original revision.');});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(displayPreview,200);});

window.addEventListener('portfolio-ai-settings-changed',async()=>{if(!state)return;const current=state,provider=activeProvider(await loadAiSettings());if(state===current)$('am-cv-provider').textContent=`${provider.label} / ${provider.config.model} / ${provider.ready?'Ready':'Needs test'}`;});
