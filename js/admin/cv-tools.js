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

const KEY='portfolio.cvDraft.v2';
let state=null,generation=0,url=null,saved='',busy=false,timer,controller=null,preview=null;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const notify=(message,type='info')=>window._adminShowToast?.(message,type);
const fields=()=>selectedFields(applyOverrides(state.fields,state.overrides,{}),state);
const draft=()=>({version:4,fields:state.fields,overrides:state.overrides,excluded:state.excluded,concise:state.concise,style:state.style,job:state.job,contextIds:state.contextIds,baseCvRevision:state.baseCvRevision});
const signature=()=>JSON.stringify({fields:fields(),style:state.style,job:state.job,contextIds:state.contextIds});
const documentSignature=()=>JSON.stringify({fields:fields(),style:state.style});
const dirty=()=>state&&JSON.stringify(draft())!==saved;
function status(text){if($('am-cv-draft-status'))$('am-cv-draft-status').textContent=text;}
function releasePreview(){preview?.clear();if(url)URL.revokeObjectURL(url);url=null;$('am-cv-pdf-preview')?.removeAttribute('src');if($('am-cv-open'))$('am-cv-open').hidden=true;}
function displayPreview(){if(!url||!preview)return;preview.render($('am-cv-zoom')?.value||'fit').catch(error=>notify(error.message,'error'));}
function actions(){
  if(!state)return;
  const ready=!!state.pdf?.fits&&!state.pending&&!busy;
  $('am-cv-dl').disabled=!ready;
  $('am-cv-publish').disabled=!ready;
  $('am-cv-dl').textContent=state.officialSignature===documentSignature()?'Download PDF':'Save & download PDF';
  for(const id of ['am-cv-rev-btn','am-cv-opt-btn','am-cv-jd-btn'])$(id).disabled=!state.pdf||!!state.pending||busy;
  $('am-cv-undo').disabled=busy||!state.undo.length;
}
function invalidatePreview(){
  generation++;if(state){state.pdf=null;state.pending=null;}
  releasePreview();if($('am-cv-fit'))$('am-cv-fit').hidden=true;
  if($('am-cv-page-count'))$('am-cv-page-count').textContent='Updating…';
  if($('am-cv-preview-message')){$('am-cv-preview-message').hidden=false;$('am-cv-preview-message').textContent='Preparing a preview for your selected page count…';}
  actions();
}
function close(force=false){
  if(busy&&!force){notify('Wait for the current operation, or cancel AI first.');return false;}
  if(!force&&dirty()&&!confirm('Discard unsaved CV changes? Save a draft to keep them.'))return false;
  generation++;clearTimeout(timer);controller?.abort();controller=null;busy=false;releasePreview();state=null;
  $('am-cv-overlay')?.remove();window._adminLeaveCv?.();return true;
}
window._cvClose=close;
window._cvHasUnsaved=()=>!!state&&(dirty()||busy);
function remember(){state.undo.push(clone(draft()));if(state.undo.length>15)state.undo.shift();}
function change(message='Unsaved CV changes',delay=250){invalidatePreview();status(message);clearTimeout(timer);timer=setTimeout(renderPdf,delay);}
function restore(value){
  state.fields=value.fields||state.fields;state.overrides=value.overrides||{};state.excluded=value.excluded||[];state.concise=!!value.concise;
  state.style={...defaultCvStyle(),...value.style};delete state.style.locked;
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
    return `<section class="cv-section"><h3>${esc(section)} <small>${rows.length} fields</small></h3>${rows.map(field=>`<div class="am-cv-field ${state.excluded.includes(field.key)?'cv-excluded':''}"><label><input type="checkbox" data-include="${esc(field.key)}" ${state.excluded.includes(field.key)?'':'checked'} ${['name','role'].includes(field.key)?'disabled':''}> ${esc(field.kind)} <small>${field.custom?'Custom wording':'Source content'}</small></label><div contenteditable="plaintext-only" role="textbox" aria-label="${esc(field.key)}" data-cv-key="${esc(field.key)}" spellcheck="false">${esc(field.text)}</div>${field.custom?`<button type="button" data-relink="${esc(field.key)}">Restore source text</button>`:''}</div>`).join('')}</section>`;
  }).join('')||'<p>No matching CV fields.</p>';
  box.onchange=event=>{const key=event.target.dataset.include;if(!key||busy)return;remember();state.excluded=state.excluded.filter(value=>value!==key);if(!event.target.checked)state.excluded.push(key);change();};
  box.oninput=event=>{const element=event.target.closest('[data-cv-key]');if(!element)return;remember();state.overrides[element.dataset.cvKey]=element.innerText;change('Unsaved wording changes',600);};
  box.onclick=event=>{const button=event.target.closest('[data-relink]');if(!button||busy)return;remember();delete state.overrides[button.dataset.relink];editor();change();};
}
function syncControls(){
  for(const [key,id] of [['fontSize','font-size'],['lineHeight','line-height']]){$(`am-cv-${id}`).value=state.style[key];$(`am-cv-${id}-value`).textContent=Number(state.style[key]).toFixed(key==='fontSize'?1:2);}
  $('am-cv-font').value=state.style.fontFamily;$('am-cv-limit').value=state.style.pageLimit||0;
  $('am-cv-target').textContent=state.style.pageLimit?`Target: ${state.style.pageLimit} pages`:'Target: all content';
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
  const current=state,token=++generation,input=validateCvFields(fields()),style=clone(state.style);
  state.pdf=null;state.pending=null;actions();releasePreview();
  $('am-cv-page-count').textContent='Fitting…';$('am-cv-preview-message').hidden=false;
  $('am-cv-preview-message').textContent=style.pageLimit?`Fitting selected content to at most ${style.pageLimit} pages…`:'Generating full CV…';
  try{
    const result=await fitCv(input,style,()=>token!==generation||state!==current);
    if(!result||token!==generation||state!==current)return;
    state.pdf=result;state.pending=result.changes.length?result:null;
    $('am-cv-page-count').textContent=`${result.pages} page${result.pages===1?'':'s'}`;
    const review=reviewCv(result.fields,result,style);
    $('am-cv-analysis').textContent=[review.format,`${review.words} words · ${result.fields.length} included fields`,...review.messages].join('\n\n');
    $('am-cv-preview-state').textContent=result.changes.length?'FIT PROPOSAL':result.fits?'VERIFIED PDF':'NEEDS SHORTENING';
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
function controls(){return `
  <section class="cv-control-block"><label class="am-cv-control"><span>Page target</span><select id="am-cv-limit"><option value="0">Full CV · all selected content</option><option value="1">1 page</option><option value="2">2 pages · recommended</option><option value="3">3 pages</option><option value="4">4 pages</option></select></label><p>Changing the target creates a fitted proposal when the content is too long. Review what changes before applying.</p><div class="am-cv-page-meter"><span>Verified PDF</span><strong id="am-cv-page-count">Loading…</strong></div></section>
  <nav class="cv-tabs" role="tablist" aria-label="CV tools"><button data-cv-tab="format" role="tab" aria-selected="true">Format</button><button data-cv-tab="content" role="tab" aria-selected="false">Content</button><button data-cv-tab="ai" role="tab" aria-selected="false">AI / JD</button></nav>
  <section data-cv-panel="format"><h3>Typography</h3><label class="am-cv-control"><span>Font</span><select id="am-cv-font"><option value="Roboto">Roboto · sans serif</option><option value="NotoSerif">Noto Serif</option></select></label><label class="am-cv-control"><span>Body size <b id="am-cv-font-size-value"></b></span><input id="am-cv-font-size" type="range" min="10" max="12.5" step="0.1"></label><label class="am-cv-control"><span>Line height <b id="am-cv-line-height-value"></b></span><input id="am-cv-line-height" type="range" min="1.12" max="1.7" step="0.01"></label><h3>Document checks</h3><div id="am-cv-analysis" role="status"></div></section>
  <section data-cv-panel="content" hidden><h3>Build your CV</h3><label class="am-cv-control"><span>Find a field</span><input id="am-cv-search" type="search" placeholder="Search wording or section"></label><p>Toggle fields and edit wording on the left. Portfolio content is preserved.</p><button id="am-cv-application">Use application selection</button><button id="am-cv-reset">Reset to current portfolio</button><button id="am-cv-refresh-source">Refresh source content</button></section>
  <section data-cv-panel="ai" hidden><h3>Target a role</h3><label class="am-cv-control"><span>Job description · private</span><textarea id="am-cv-job" rows="7" placeholder="Paste the JD to review evidence and improve wording"></textarea></label><p>Review offers guidance. Optimize proposes wording changes for you to approve.</p><div id="am-cv-provider" class="studio-status"></div><div id="am-cv-ai-context"></div><button id="am-cv-jd-btn">Analyze JD evidence</button><button id="am-cv-rev-btn">Review CV against JD</button><button id="am-cv-opt-btn">Optimize wording</button><button id="am-cv-cancel-ai" hidden>Cancel AI request</button><div id="am-cv-ai-out" role="status" aria-live="polite"></div></section>
  <section class="cv-control-block cv-draft-actions"><h3>Draft recovery</h3><button id="am-cv-save-draft">Save draft</button><button id="am-cv-restore-draft">Restore saved draft</button></section>`;}

export async function openCVExportModal(){
  window._adminSelectCv?.();
  if($('am-cv-overlay')){displayPreview();return;}injectCvStyles();
  const host=$('ws-cv-panel');if(!host)throw new Error('Open Admin workspace before CV Studio.');
  host.insertAdjacentHTML('beforeend',`<section id="am-cv-overlay" class="cv-workspace-page" aria-label="CV Studio"><div class="am-cv-modal"><header class="cv-studio-header"><div><span class="cv-eyebrow">PORTFOLIO / CV STUDIO</span><h2>Make your next move.</h2><p>One official CV. The same document everywhere.</p></div><button id="am-cv-close" aria-label="Leave CV Studio">← Overview</button></header><div class="cv-studio-toolbar"><div><span id="am-cv-target">Target: 2 pages</span><span id="am-cv-preview-state">LOADING</span></div><div><label class="cv-zoom-control">Zoom <select id="am-cv-zoom" aria-label="PDF preview zoom"><option value="fit">Fit width</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option><option value="200">200%</option></select></label><button id="am-cv-inspector-toggle">Hide tools</button><button id="am-cv-toggle-editor">Edit content / preview</button><button id="am-cv-undo" disabled>Undo</button><a id="am-cv-open" hidden target="_blank" rel="noopener">Open PDF ↗</a></div></div><div class="am-cv-body"><div class="cv-preview-column"><div id="am-cv-source-warning" hidden><span>Portfolio changed. Your CV wording has been preserved.</span><button id="am-cv-review-source">Review current source</button></div><div id="am-cv-fit" hidden></div><div id="am-cv-left"><div id="am-cv-preview-message" role="status">Loading CV…</div><div id="am-cv-pdf-preview" role="region" aria-label="CV PDF preview"></div><div id="am-cv-editor" hidden></div></div></div><aside class="am-cv-tools">${controls()}</aside></div><footer class="cv-studio-footer"><div><strong id="am-cv-draft-status">Loading official CV…</strong><p>Only saved official changes update the public download.</p></div><div><button class="am-cv-close">Close draft</button><button id="am-cv-publish" disabled>Save official CV</button><button id="am-cv-dl" disabled>Save & download PDF</button></div></footer></div></section>`);
  const token=++generation;preview=new CvPdfPreview($('am-cv-pdf-preview'));
  $('am-cv-zoom').onchange=displayPreview;
  $('am-cv-inspector-toggle').onclick=()=>{const hidden=$('am-cv-overlay').classList.toggle('cv-inspector-hidden');$('am-cv-inspector-toggle').textContent=hidden?'Show tools':'Hide tools';displayPreview();};
  $('am-cv-close').onclick=()=>window._adminNavigate?.('overview');document.querySelector('.am-cv-close').onclick=()=>close();
  try{
    const api=await import('../firebase-config.js');
    const [source,official]=await Promise.all([loadCvSource(),api.readOfficialCv()]);
    const linked=await buildCvFields(source);if(token!==generation)return;
    state={fields:linked,overrides:{},excluded:[],concise:false,style:{...defaultCvStyle(),pageLimit:2},job:'',contextIds:[],query:'',baseCvRevision:official?._revision||0,undo:[],pdf:null,pending:null,officialSignature:null};
    if(official?.version===4){
      const resolved=await resolvePublicCv({cv:official}),keys=new Set(resolved.fields.map(field=>field.key));
      // Keep the saved order and retain missing records; new source fields start excluded.
      state.fields=[...resolved.fields.map(field=>({...linked.find(value=>value.key===field.key),...field})),...linked.filter(field=>!keys.has(field.key))];
      state.excluded=state.fields.filter(field=>!keys.has(field.key)).map(field=>field.key);
      state.style={...defaultCvStyle(),...official.effectiveStyle};
      state.officialSignature=documentSignature();
    }else if(official?.version===3){
      Object.assign(state,{overrides:official.overrides||{},excluded:official.excluded||[],concise:!!official.concise,style:{...state.style,...official.style}});
    }
    saved=JSON.stringify(draft());editor();syncControls();status(official?.version===4?`Official CV · version ${state.baseCvRevision}`:official?'Legacy CV loaded · review and save the official snapshot':'Create your first official CV');
    const tabs=[...document.querySelectorAll('[data-cv-tab]')];
    tabs.forEach(button=>{
      const name=button.dataset.cvTab;button.id=`cv-tab-${name}`;button.setAttribute('aria-controls',`cv-panel-${name}`);button.tabIndex=name==='format'?0:-1;
      const panel=document.querySelector(`[data-cv-panel="${name}"]`);panel.id=`cv-panel-${name}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
      button.onclick=()=>tab(name);
      button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=tabs.indexOf(button),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();};
    });
    for(const [key,id] of [['fontFamily','font'],['fontSize','font-size'],['lineHeight','line-height']])$(`am-cv-${id}`).oninput=event=>window._cvUpdateStyle(key,event.target.value);
    $('am-cv-limit').onchange=event=>window._cvUpdateStyle('pageLimit',event.target.value);
    $('am-cv-job').oninput=event=>{state.job=event.target.value;status('Unsaved private JD');actions();};
    $('am-cv-search').oninput=event=>{state.query=event.target.value;editor();};
    $('am-cv-toggle-editor').onclick=()=>tab($('am-cv-editor').hidden?'content':'format');
    $('am-cv-undo').onclick=()=>{if(!busy&&state.undo.length){const previous=state.undo.pop();restore(previous);status('Previous CV changes restored');}};
    $('am-cv-application').onclick=()=>{if(busy)return;remember();Object.assign(state,applicationSelection(state.fields));state.style.pageLimit=2;editor();syncControls();change('Application selection applied. Review selected content.');};
    $('am-cv-reset').onclick=async()=>{if(busy||!confirm('Reset CV text and selection to the current portfolio? You can undo this change.'))return;const current=state;const fresh=await buildCvFields(await loadCvSource());if(state!==current)return;remember();state.fields=fresh;state.overrides={};state.excluded=[];state.concise=false;editor();change('CV reset to current portfolio');};
    $('am-cv-refresh-source').onclick=refreshSource;$('am-cv-review-source').onclick=()=>{tab('content');refreshSource();};
    $('am-cv-save-draft').onclick=saveDraft;
    $('am-cv-restore-draft').onclick=async()=>{
      if(busy||dirty()&&!confirm('Replace unsaved changes with the saved draft?'))return;
      try{let local;try{local=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}const remote=await api.readCvDraft().catch(()=>null);if(!state)return;const value=local&&(!remote||local.savedAt>remote.savedAt)?local:remote;if(!value)throw new Error('No saved draft is available.');remember();restore(value);}catch(error){notify(error.message,'error');}
    };
    $('am-cv-dl').onclick=window._cvDownload;$('am-cv-publish').onclick=()=>publish(false);
    const aiSettings=await loadAiSettings();if(!state)return;state.contextIds=aiSettings.defaultContextIds||[];const provider=activeProvider(aiSettings);$('am-cv-provider').textContent=`${provider.label} / ${provider.config.model||'Select model in Settings'} / ${provider.ready?'Ready':'Needs connection test'}`;await contextPicker($('am-cv-ai-context'),{ids:state.contextIds,onChange:ids=>{state.contextIds=ids;status('Unsaved private context selection');}});
    saved=JSON.stringify(draft());
    $('am-cv-jd-btn').onclick=()=>ai('jd');
    $('am-cv-rev-btn').onclick=()=>ai('review');$('am-cv-opt-btn').onclick=()=>ai('optimize');$('am-cv-cancel-ai').onclick=()=>controller?.abort();
    await renderPdf();
  }catch(error){if(token!==generation)return;notify(error.message,'error');$('am-cv-preview-message').textContent=error.message;status('CV unavailable. Close and retry.');}
}
async function refreshSource(){
  if(!state||busy)return;const current=state;
  try{const fresh=await buildCvFields(await loadCvSource());if(state!==current)return;remember();
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
  try{const api=await import('../firebase-config.js');await api.writeCvDraft(value);if(state===current&&JSON.stringify(draft())===text){saved=text;status('Private draft synced · official CV unchanged');}}catch(error){notify(`Cloud draft unavailable: ${error.message}. Check the draft status.`,'info');}
}
window._cvUpdateStyle=(key,value)=>{
  if(!state||busy)return;remember();
  if(key==='fontFamily')state.style.fontFamily=value==='NotoSerif'?'NotoSerif':'Roboto';
  else if(key==='pageLimit')state.style.pageLimit=[1,2,3,4].includes(Number(value))?Number(value):0;
  else state.style[key]=Math.max(key==='fontSize'?10:1.12,Math.min(key==='fontSize'?12.5:1.7,Number(value)||defaultCvStyle()[key]));
  delete state.style.locked;syncControls();change();
};
function lock(locked){
  document.querySelectorAll('#am-cv-overlay input,#am-cv-overlay select,#am-cv-overlay textarea').forEach(element=>element.disabled=locked||['name','role'].includes(element.dataset.include));
  document.querySelectorAll('[data-cv-key]').forEach(element=>element.contentEditable=locked?'false':'plaintext-only');
}
async function publish(download=false){
  if(busy||!state?.pdf?.fits||state.pending)return;
  const current=state,result=state.pdf,input=fields(),style=clone(state.style),before=signature();
  busy=true;lock(true);actions();status('Saving official CV…');
  try{
    const snapshot=await officialCvSnapshot(input,result,style,state.baseCvRevision);
    if(state!==current||signature()!==before)throw new Error('CV changed while preparing the save. Review the latest preview.');
    const api=await import('../firebase-config.js');const response=await api.writeOfficialCv(snapshot);
    if(!response.synced)throw new Error('The official CV was not synced. Save a draft and retry online.');
    if(state!==current)return;
    state.baseCvRevision=response.data._revision;state.officialSignature=documentSignature();saved=JSON.stringify(draft());
    status(`Official CV saved · version ${state.baseCvRevision} · public download updated`);
    window.dispatchEvent(new CustomEvent('cv-published-changed',{detail:{revision:state.baseCvRevision}}));
    if(download)downloadPdf(result.blob,'CV_TranTanPhat_SeniorQA.pdf');
    notify('Official CV saved. Public and Admin use the same document.','success');
  }catch(error){if(state===current){status('Official CV unchanged · save failed');notify(error.message,'error');}}
  finally{if(state===current){busy=false;lock(false);actions();}}
}
window._cvDownload=async()=>{
  if(busy||!state?.pdf?.fits||state.pending)return;
  if(state.officialSignature!==documentSignature()){await publish(true);return;}
  downloadPdf(state.pdf.blob,'CV_TranTanPhat_SeniorQA.pdf');
};
async function ai(mode){
  if(busy||!state?.pdf||state.pending)return;
  busy=true;actions();const current=state,input=fields(),snapshot=signature(),output=$('am-cv-ai-out');
  output.textContent='Reviewing your CV…';$('am-cv-cancel-ai').hidden=false;
  controller=new AbortController();const activeController=controller;const provider=activeProvider(await loadAiSettings());if(state===current)$('am-cv-provider').textContent=`${provider.label} / ${provider.config.model}`;
  try{
    if(mode==='jd'&&!state.job.trim())throw new Error('Paste a target job description first.');
    const contextIds=[...state.contextIds],result=await runAi({task:mode==='review'?'cv-review':mode==='jd'?'jd-analysis':'cv-optimize',input:{fields:input,portfolioFields:state.fields,pageLimit:state.style.pageLimit||'auto',analysis:reviewCv(input,state.pdf,state.style),jobDescription:state.job},contextIds,signal:activeController.signal}),parsed=result.structured;
    if(state!==current||snapshot!==signature())throw new Error('CV, format or JD changed during the request. Run AI again.');
    if(mode==='jd'){const keys=new Set(state.fields.map(f=>f.key));output.innerHTML=`<p>${esc(parsed.summary)}</p><table><thead><tr><th>Requirement</th><th>Evidence</th><th>Source</th></tr></thead><tbody>${parsed.requirements.map(item=>{const evidence=item.sourceKeys.filter(key=>keys.has(key)),label=item.status==='matched'&&!evidence.length?'unknown':item.status;return `<tr><td>${esc(item.requirement)}</td><td>${esc(label)} / ${esc(item.reason)}</td><td>${evidence.map(esc).join(', ')}</td></tr>`;}).join('')}</tbody></table>`;return;}
    if(mode==='review'){if(typeof parsed.summary!=='string'||!Array.isArray(parsed.items))throw new Error('Invalid AI review response.');output.textContent=[parsed.summary,...parsed.items.filter(item=>typeof item.text==='string').map(item=>item.text)].join('\n\n');return;}
    if(!Array.isArray(parsed.suggestions))throw new Error('Invalid AI suggestions.');
    const seen=new Set(),proposals=parsed.suggestions.filter(item=>{if(!input.some(field=>field.key===item.key)||typeof item.text!=='string'||!item.text.trim()||item.text.length>10000||seen.has(item.key))return false;seen.add(item.key);return true;});
    if(!proposals.length){output.textContent='No valid wording changes were proposed.';return;}
    output.innerHTML=proposals.map((item,index)=>`<article class="cv-ai-proposal"><label><input type="checkbox" data-proposal="${index}"> ${esc(item.key)}</label><small>Current</small><p>${esc(input.find(field=>field.key===item.key).text)}</p><small>Proposed</small><p class="cv-after">${esc(item.text)}</p>${item.reason?`<p>${esc(item.reason)}</p>`:''}</article>`).join('')+'<button id="am-cv-apply-proposals" class="cv-primary">Apply selected suggestions</button>';
    $('am-cv-apply-proposals').onclick=async()=>{
      if(busy)return;busy=true;actions();
      try{await assertAiCurrent(result,contextIds);if(state!==current||snapshot!==signature())throw new Error('CV or JD changed. Generate new suggestions.');const chosen=[...output.querySelectorAll('[data-proposal]:checked')];if(!chosen.length)throw new Error('Select at least one suggestion.');remember();chosen.forEach(box=>{const item=proposals[Number(box.dataset.proposal)];state.overrides[item.key]=item.text;});editor();change('AI changes applied. Verify pages and save official CV.');output.textContent='Selected suggestions applied. Undo is available.';}
      catch(error){notify(error.message,'error');}finally{if(state===current){busy=false;actions();}}
    };
  }catch(error){if(state===current&&output.isConnected)output.textContent=error.name==='AbortError'?'AI request cancelled or timed out. Your CV is unchanged.':error.message;}
  finally{if(controller===activeController)controller=null;if(state===current){busy=false;$('am-cv-cancel-ai').hidden=true;actions();}}
}
window.openCVExportModal=openCVExportModal;window._cvReview=()=>ai('review');window._cvOptimize=()=>ai('optimize');
window.addEventListener('beforeunload',event=>{if(dirty()||busy){event.preventDefault();event.returnValue='';}});
window.addEventListener('portfolio-auth-state',event=>{
  if(!event.detail.signedIn&&state){try{localStorage.setItem(KEY,JSON.stringify({...draft(),savedAt:new Date().toISOString()}));}catch{notify('Draft recovery failed: local storage unavailable.','error');}close(true);}
});
window.addEventListener('portfolio-content-changed',()=>{if(state){$('am-cv-source-warning').hidden=false;status('Portfolio changed · saved CV and custom wording preserved');}});
window.addEventListener('storage',event=>{if(state&&event.key==='portfolio.officialCv.v4')status('Official CV may have changed in another tab. Saving checks your original revision.');});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(displayPreview,200);});

window.addEventListener('portfolio-ai-settings-changed',async()=>{if(!state)return;const current=state,provider=activeProvider(await loadAiSettings());if(state===current)$('am-cv-provider').textContent=`${provider.label} / ${provider.config.model} / ${provider.ready?'Ready':'Needs test'}`;});
