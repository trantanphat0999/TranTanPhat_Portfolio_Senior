import {mountImportStudio,mountProfileLibrary} from './profile-studio.js';
import {ADMIN_USABILITY_CSS} from './usability.js';
import {WORKSPACE_DESIGN_CSS} from './workspace-design.js';
import {sectionIcon} from '../portfolio/custom-renderer.js';
import {mountThemeStudio} from './theme-studio.js';
import {activeProvider} from '../ai/settings.js';
import {mountProviders} from './provider-settings.js';
import {mountContexts} from './context-library.js';
import {mountContentBuilder} from './content-builder.js';
import {studioStyles} from './studio-ui.js';
import {mountCareerLibrary} from './career-library.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sections=[
  ['header','Identity & contact','Name, role, social links and introduction','user-3'],
  ['summary','Professional summary','Expertise, leadership and career direction','file-text'],
  ['experience','Experience','Roles, companies and measurable outcomes','briefcase'],
  ['skills','Technical skills','Categories, tools and capabilities','code-box'],
  ['projects','Projects','Case studies, responsibilities and results','folder-3'],
  ['achievements','Achievements','Recognition and quality engineering highlights','award'],
  ['education','Education & certifications','Qualifications and verified credentials','graduation-cap'],
  ['contact','Contact channels','Email, social profiles and availability','mail'],
];
let hooks,active='overview',visible=false,publicHash=location.hash.startsWith('#admin/')?'':location.hash;
const $=id=>document.getElementById(id);
function count(key,data){const section=data?.[key]||{};return key==='header'?Number(!!section.name):key==='experience'?section.jobs?.length||0:key==='skills'?section.categories?.length||0:key==='education'?(section.degrees?.length||0)+(section.certifications?.length||0):key==='contact'?section.socials?.length||0:key==='summary'?(section.coreExpertise?.length||0)+(section.leadership?.length||0):section.items?.length||0;}
export function initWorkspace(actions){
  hooks=actions;studioStyles();
  const style=document.createElement('style');style.textContent=WORKSPACE_CSS+ADMIN_USABILITY_CSS+WORKSPACE_DESIGN_CSS;document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend',`<div id="admin-workspace" hidden><aside class="ws-sidebar"><div class="ws-brand"><span>TP</span><div>Portfolio Studio<small>ADMIN WORKSPACE</small></div></div><div class="ws-nav-label">WORKSPACE</div><nav aria-label="Admin workspace">${[['overview','Overview','dashboard'],['content','Content','layout-2'],['import','Import CV','upload-cloud-2'],['profiles','Portfolio library','stack'],['cv','CV Studio','file-user'],['ai','AI Assistant','sparkling'],['settings','Settings & sync','settings-3']].map(([key,label,icon])=>`<button data-ws-nav="${key}" ${key==='overview'?'aria-current="page"':''}><i class="ri-${icon}-line" aria-hidden="true"></i>${label}${key==='cv'?'<span class="ws-new">CV</span>':''}</button>`).join('')}</nav><div class="ws-sidebar-bottom"><div class="ws-owner">Tran Tan Phat<small>Portfolio owner</small></div><button id="ws-view-site"><i class="ri-external-link-line"></i> Preview portfolio</button><p>Ctrl + Shift + A to exit</p></div></aside><main class="ws-main"><header class="ws-top"><div><span class="ws-breadcrumb">WORKSPACE / </span><strong id="ws-location">Overview</strong></div><div class="ws-live"><span id="ws-status-dot"></span><span id="ws-status">Checking connection</span><button id="ws-refresh" title="Refresh workspace data" aria-label="Refresh workspace data"><i class="ri-refresh-line"></i></button></div></header><div class="ws-content"><section id="ws-overview"><div class="ws-heading"><div><span class="ws-eyebrow">YOUR NEXT CHAPTER</span><h1>A portfolio that works for you.</h1><p>Keep your story current. Build a focused CV. Publish with confidence.</p></div><button class="ws-primary" data-ws-action="cv">Open CV Studio <i class="ri-arrow-right-line"></i></button></div><div id="ws-metrics" class="ws-metrics"></div><div class="ws-grid"><article class="ws-card ws-feature"><span class="ws-eyebrow">ONE CV, EVERYWHERE</span><h2>From your experience<br>to your next opportunity.</h2><p>Review your CV, tailor it to a job description and save the exact document visitors download.</p><div class="ws-feature-tags"><span>Verified page count</span><span>AI suggestions</span><span>Shared official CV</span></div><button class="ws-primary" data-ws-action="cv">Build your CV <i class="ri-arrow-right-line"></i></button></article><article class="ws-card"><div class="ws-card-heading"><h2>Workspace health</h2><i class="ri-pulse-line"></i></div><div id="ws-health"></div><button data-ws-action="settings">Manage settings & sync <i class="ri-arrow-right-line"></i></button></article></div><div class="ws-section-heading"><h2>Your content</h2><button data-ws-action="content">Manage all sections →</button></div><div id="ws-shortcuts" class="ws-shortcuts"></div></section><section id="ws-content-panel" hidden><div class="ws-heading"><div><span class="ws-eyebrow">CONTENT LIBRARY</span><h1>Tell your story clearly.</h1><p>Edit, add and arrange content in each portfolio section.</p></div></div><div class="ws-search"><i class="ri-search-line"></i><input id="ws-search" type="search" placeholder="Find a section or search its content" aria-label="Search portfolio content"></div><div id="ws-sections" class="ws-section-list"></div></section><section id="ws-cv-panel" hidden><div class="ws-heading"><div><span class="ws-eyebrow">CV STUDIO</span><h1>One document. Every opportunity.</h1><p>Your official CV is the same in Admin and on the public portfolio.</p></div></div><article class="ws-card ws-feature"><h2>Build, review and publish.</h2><p>Select a page target, review fitted content and use AI to improve your wording for a role. The saved PDF keeps its text, layout and page count.</p><button class="ws-primary" data-ws-action="cv">Launch CV Studio →</button></article></section><section id="ws-ai-panel" hidden><div class="ws-heading"><div><span class="ws-eyebrow">AI ASSISTANT</span><h1>A second pair of eyes.</h1><p>Explore your portfolio with AI. Use CV Studio for changes you can review and apply.</p></div><button data-ws-action="config">Configure AI</button></div><div id="ws-ai-empty" class="ws-card"><i class="ri-sparkling-line"></i><h2>Connect your AI provider</h2><p>Save and test your connection in Settings to start a conversation.</p><button class="ws-primary" data-ws-action="config">Set up AI connection →</button></div><div id="ws-ai-host"></div></section><section id="ws-settings-panel" hidden><div class="ws-heading"><div><span class="ws-eyebrow">SETTINGS & DATA</span><h1>Stay in control.</h1><p>Manage your AI connection, recover pending changes and keep a portable backup.</p></div></div><div class="ws-settings-grid"><article class="ws-card"><i class="ri-sparkling-line"></i><h2>AI connection</h2><p>Configure a compatible API endpoint and model. Test the connection before using review or optimization.</p><button class="ws-primary" data-ws-action="config">Configure AI →</button></article><article class="ws-card"><i class="ri-refresh-line"></i><h2>Sync & conflicts</h2><p id="ws-pending-detail">Checking pending writes…</p><button data-ws-action="sync">Review pending changes →</button></article><article class="ws-card"><i class="ri-download-cloud-2-line"></i><h2>Public data backup</h2><p>Export portfolio content and the official CV as a seed file. Private JD and AI credentials are excluded.</p><button data-ws-action="backup">Export portfolio seed →</button></article><article class="ws-card"><i class="ri-file-user-line"></i><h2>Official CV</h2><p id="ws-cv-detail">Checking official CV…</p><button data-ws-action="cv">Manage CV →</button></article></div></section><p id="ws-feedback" role="status" aria-live="polite"></p></div></main></div>`);
  document.querySelector('#admin-workspace .ws-content').insertAdjacentHTML('beforeend','<section id="ws-import-panel" hidden></section><section id="ws-profiles-panel" hidden></section>');
  $('ws-metrics').insertAdjacentHTML('afterend','<div id="ws-next-actions" class="ws-task-list" aria-label="Suggested next actions"></div>');
  $('ws-sections').insertAdjacentHTML('beforebegin','<div id="ws-content-results" role="status" aria-live="polite"></div>');
  document.querySelectorAll('[data-ws-nav]').forEach(button=>{
    button.setAttribute('aria-label',button.textContent.trim());button.title=button.textContent.trim();
    [...button.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim()).forEach(node=>{const label=document.createElement('span');label.className='ws-nav-text';node.replaceWith(label);label.appendChild(node);});
  });
  $('ws-location').parentElement.insertAdjacentHTML('afterbegin','<button id="ws-sidebar-toggle" aria-label="Collapse navigation" aria-expanded="true" title="More space for your work"><i class="ri-side-bar-line" aria-hidden="true"></i></button>');
  function sidebar(collapsed){$('admin-workspace').classList.toggle('ws-sidebar-collapsed',collapsed);$('ws-sidebar-toggle').setAttribute('aria-expanded',String(!collapsed));$('ws-sidebar-toggle').setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');}
  try{sidebar(localStorage.getItem('portfolio.admin.sidebarCollapsed')==='true');}catch{}
  $('ws-sidebar-toggle').onclick=()=>{const collapsed=!$('admin-workspace').classList.contains('ws-sidebar-collapsed');sidebar(collapsed);try{localStorage.setItem('portfolio.admin.sidebarCollapsed',String(collapsed));}catch{}window.dispatchEvent(new Event('resize'));};
  $('admin-workspace').addEventListener('click',event=>{const button=event.target.closest('[data-health-action]');if(button)action(button.dataset.healthAction);});
  $('ws-settings-panel').insertAdjacentHTML('beforeend','<div id="ws-provider-settings"></div><div id="ws-context-library" style="margin-top:24px"></div>');
  $('ws-settings-panel').insertAdjacentHTML('beforeend','<div id="ws-theme-studio" hidden></div>');
  $('ws-content-panel').insertAdjacentHTML('beforeend','<div id="ws-content-builder" style="margin-top:24px"></div>');
  $('ws-content-panel').insertAdjacentHTML('beforeend','<div id="ws-career-library" style="margin-top:24px" hidden></div>');
  const dataGrid=$('ws-settings-panel').querySelector('.ws-settings-grid');dataGrid.id='ws-data-settings';
  dataGrid.insertAdjacentHTML('afterbegin', '<article class="ws-card"><i class="ri-cpu-line"></i><h2>AI workflow &amp; API automation</h2><p>Add the new QA case studies and skills, and update your introduction, summary and current experience.</p><button class="ws-primary" id="ws-apply-qa-content">Apply QA content update</button><p id="ws-qa-content-status" role="status" aria-live="polite"></p></article>');
  $('ws-apply-qa-content').onclick=async()=>{
    const button=$('ws-apply-qa-content'),status=$('ws-qa-content-status');
    button.disabled=true;status.textContent='Updating QA content…';
    try{
      const {applyQaContentUpdate}=await import('../qa-content-update.js');
      const results=await applyQaContentUpdate();
      for(const {section} of results)await window._reloadPortfolioSection?.(section);
      await window._reloadPortfolioMetadata?.();
      status.textContent=results.every(result=>result.synced)?'QA content updated. Choose Preview portfolio to view it.':'Saved locally. Reconnect and resolve pending changes to finish syncing.';
      refreshWorkspace();
    }catch(error){status.textContent=`Update incomplete: ${error.message}. Resolve the issue and retry.`;}
    finally{button.disabled=false;}
  };
  $('ws-settings-panel').querySelector('.ws-heading').insertAdjacentHTML('afterend','<div class="studio-tabs" role="tablist" aria-label="Settings pages"><button data-settings-tab="providers" role="tab" aria-selected="true">AI providers</button><button data-settings-tab="contexts" role="tab" aria-selected="false">Context library</button><button data-settings-tab="data" role="tab" aria-selected="false">Data & sync</button></div>');
  document.querySelector('[data-settings-tab="data"]').insertAdjacentHTML('beforebegin','<button data-settings-tab="appearance" role="tab" aria-selected="false">Appearance</button>');
  function settingsTab(key){for(const [name,id]of [['providers','ws-provider-settings'],['contexts','ws-context-library'],['appearance','ws-theme-studio'],['data','ws-data-settings']])$(id).hidden=name!==key;if(key==='appearance')mountOnce($('ws-theme-studio'),mountThemeStudio);document.querySelectorAll('[data-settings-tab]').forEach(b=>{const selected=b.dataset.settingsTab===key;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});$('ws-content-panel').parentElement.scrollTop=0;}
  document.querySelectorAll('[data-settings-tab]').forEach(b=>b.onclick=()=>settingsTab(b.dataset.settingsTab));settingsTab('providers');
  $('ws-content-panel').querySelector('.ws-heading').insertAdjacentHTML('afterend','<div class="studio-tabs" role="tablist" aria-label="Content pages"><button data-content-tab="sections" role="tab" aria-selected="true">Portfolio sections</button><button data-content-tab="blocks" role="tab" aria-selected="false">Custom blocks</button></div>');
  document.querySelector('[aria-label="Content pages"]').insertAdjacentHTML('beforeend','<button data-content-tab="facts" role="tab" aria-selected="false">Facts & evidence</button>');
  document.querySelector('[data-content-tab="blocks"]').textContent='Custom sections & blocks';
  function contentTab(key){$('ws-search').parentElement.hidden=key!=='sections';$('ws-sections').hidden=key!=='sections';$('ws-content-results').hidden=key!=='sections';$('ws-content-builder').hidden=key!=='blocks';$('ws-career-library').hidden=key!=='facts';if(key==='facts')mountOnce($('ws-career-library'),mountCareerLibrary);document.querySelectorAll('[data-content-tab]').forEach(b=>{const selected=b.dataset.contentTab===key;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});$('ws-content-panel').parentElement.scrollTop=0;}
  $('ws-content-panel').querySelector('.ws-heading').insertAdjacentHTML('beforeend','<button id="ws-add-section" class="ws-primary">Add portfolio section</button>');
  async function openCustomSection(id){
    contentTab('blocks');await mountOnce($('ws-content-builder'),mountContentBuilder);
    const button=id?$('ws-content-builder').querySelector(`[data-id="${CSS.escape(id)}"]`):$('ws-content-builder').querySelector('[data-new-section]');
    button?.click();
  }
  $('ws-add-section').onclick=()=>openCustomSection();
  $('ws-sections').addEventListener('click',event=>{const button=event.target.closest('[data-ws-custom-section]');if(button)openCustomSection(button.dataset.wsCustomSection);});
  document.querySelectorAll('[data-content-tab]').forEach(b=>b.onclick=()=>contentTab(b.dataset.contentTab));contentTab('sections');
  for(const selector of ['[data-settings-tab]','[data-content-tab]']){const buttons=[...document.querySelectorAll(selector)];buttons.forEach(button=>{
    const key=button.dataset.settingsTab||button.dataset.contentTab,id=button.dataset.settingsTab?{providers:'ws-provider-settings',contexts:'ws-context-library',appearance:'ws-theme-studio',data:'ws-data-settings'}[key]:{sections:'ws-sections',blocks:'ws-content-builder',facts:'ws-career-library'}[key];
    button.id=`ws-tab-${key}`;button.setAttribute('aria-controls',id);$(id).setAttribute('role','tabpanel');$(id).setAttribute('aria-labelledby',button.id);
    const original=button.onclick;button.onclick=()=>{original();buttons.forEach(item=>item.tabIndex=item===button?0:-1);};button.tabIndex=button.getAttribute('aria-selected')==='true'?0:-1;
    button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=buttons.indexOf(button),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();};
  });}
  window._adminNavigate=key=>{showWorkspace(true);select(key);if(key==='settings')settingsTab('providers');};
  window.addEventListener('hashchange',()=>{const match=location.hash.match(/^#admin\/(overview|content|import|profiles|cv|ai|settings)$/);if(match&&document.body.classList.contains('admin-mode')){showWorkspace(true);select(match[1],true,false);}else if(!match&&document.body.classList.contains('admin-mode')){publicHash=location.hash;showWorkspace(false);}});
  window.addEventListener('portfolio-ai-settings-changed',()=>{hooks.ai();refreshWorkspace();});
  document.querySelectorAll('[data-ws-nav]').forEach(button=>button.onclick=()=>select(button.dataset.wsNav));
  document.querySelectorAll('[data-ws-action]').forEach(button=>button.onclick=()=>action(button.dataset.wsAction));
  $('ws-view-site').onclick=()=>showWorkspace(false);
  $('ws-overview').querySelector('.ws-heading button').textContent='Import a new CV →';
  $('ws-overview').querySelector('.ws-heading button').onclick=()=>select('import');
  $('ws-refresh').onclick=refreshWorkspace;
  $('ws-location').insertAdjacentHTML('afterend','<button id="ws-fullscreen" aria-label="Toggle browser fullscreen">Toàn màn hình</button>');
  $('ws-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){$('ws-feedback').textContent='Trình duyệt chưa hỗ trợ fullscreen: '+error.message;}};
  document.addEventListener('fullscreenchange',()=>{$('ws-fullscreen').textContent=document.fullscreenElement?'Thoát toàn màn hình':'Toàn màn hình';$('ws-fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));});
  window.addEventListener('portfolio-profile-activated',()=>refreshWorkspace());
  $('ws-search').oninput=renderContent;
  window._adminSelectCv=()=>{showWorkspace(true);select('cv',false);};
  window._adminLeaveCv=()=>select('overview',false);
  $('admin-workspace').addEventListener('click',event=>{
    const button=event.target.closest('[data-ws-section]');if(!button)return;
    const section=sections.find(value=>value[0]===button.dataset.wsSection);
    hooks[button.dataset.wsOperation](section[0],section[1]);
  });
  window.addEventListener('portfolio-firebase-status',refreshStatus);
  window.addEventListener('portfolio-content-changed',()=>{if(visible)refreshWorkspace();});
  window.addEventListener('cv-published-changed',()=>{if(visible)refreshWorkspace();});
}
const pendingMounts=new WeakMap();
let refreshSerial=0;
function mountOnce(host,fn){if(host.dataset.mounted)return Promise.resolve();if(pendingMounts.has(host))return pendingMounts.get(host);const pending=fn(host).catch(error=>{if($('ws-feedback'))$('ws-feedback').textContent=error.message;}).finally(()=>pendingMounts.delete(host));pendingMounts.set(host,pending);return pending;}
function action(key){if(key==='cv')hooks.cv();else if(key==='config')window._adminNavigate('settings');else if(key==='sync')hooks.sync();else if(key==='backup')hooks.backup();else select(key);}
function select(key,launch=true,route=true){
  if(!document.body.classList.contains('admin-mode')||!['overview','content','import','profiles','cv','ai','settings'].includes(key))return;
  if(route&&location.hash!==`#admin/${key}`)history.pushState(null,'',`#admin/${key}`);
  active=key;document.querySelectorAll('[data-ws-nav]').forEach(button=>{if(button.dataset.wsNav===key)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  document.querySelector(`[data-ws-nav="${key}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});
  for(const [name,id] of [['overview','ws-overview'],['content','ws-content-panel'],['import','ws-import-panel'],['profiles','ws-profiles-panel'],['cv','ws-cv-panel'],['ai','ws-ai-panel'],['settings','ws-settings-panel']])$(id).hidden=name!==key;
  $('ws-location').textContent=({overview:'Overview',content:'Content',import:'Import CV',profiles:'Portfolio library',cv:'CV Studio',ai:'AI Assistant',settings:'Settings & sync'})[key];
  $('ws-feedback').textContent='';$('ws-content-panel').parentElement.scrollTop=0;
  const heading=$('ws-'+key+'-panel')?.querySelector('h1')||$('ws-overview').querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  if(key==='settings'){mountOnce($('ws-provider-settings'),mountProviders);mountOnce($('ws-context-library'),mountContexts);}
  if(key==='import')mountOnce($('ws-import-panel'),mountImportStudio);
  if(key==='profiles')mountProfileLibrary($('ws-profiles-panel')).catch(error=>{$('ws-feedback').textContent=error.message;});
  if(key==='content')mountOnce($('ws-content-builder'),mountContentBuilder);
  if(key==='cv'&&launch)hooks.cv();if(key==='ai')hooks.ai();
}
export function showWorkspace(show=true){
  if(show&&!document.body.classList.contains('admin-mode'))return;
  visible=show;$('admin-workspace').hidden=!show;document.body.classList.toggle('admin-workspace-open',show);
  const button=$('admin-workspace-toggle');if(button)button.textContent=show?'Preview site':'Workspace';
  if(show){const route=location.hash.match(/^#admin\/(overview|content|import|profiles|cv|ai|settings)$/)?.[1];if(route&&route!==active)select(route);else if(!route)history.replaceState(null,'',`#admin/${active}`);refreshWorkspace();if(active==='ai')hooks.ai();if(active==='profiles')mountProfileLibrary($('ws-profiles-panel')).catch(error=>{$('ws-feedback').textContent=error.message;});}
}
export function toggleWorkspace(){showWorkspace(!visible);}
export function mountWorkspaceAI(widget){
  if(!widget)return;
  $('ws-ai-empty').hidden=true;$('ws-ai-host').appendChild(widget);widget.classList.remove('am-minimized');
}
function refreshStatus(){
  const connected=window._firebaseConnectionStatus||'unknown';
  $('ws-status').textContent=connected==='connected'?'Connected':connected==='syncing'?'Syncing changes':connected==='disconnected'?'Offline / cached data':'Checking connection';
  $('ws-status-dot').className=connected;
}
function renderContent(){
  const query=$('ws-search').value.trim().toLowerCase(),data=window._portfolioData||{};
  const rows=sections.filter(([key,label,description])=>`${label} ${description} ${JSON.stringify(data[key]||{})}`.toLowerCase().includes(query));
  const custom=(data['custom-blocks']?.blocks||[]).filter(block=>block.kind==='section'&&block.visibility!=='private'),customRows=custom.filter(block=>JSON.stringify(block).toLowerCase().includes(query));
  if($('ws-content-results'))$('ws-content-results').textContent=`${rows.length+customRows.length} / ${sections.length+custom.length} sections${query?' match your search':''}`;
  $('ws-sections').innerHTML=rows.map(([key,label,description,icon])=>`<article class="ws-section-row"><div class="ws-section-icon"><i class="ri-${icon}-line"></i></div><div class="ws-section-copy"><h2>${label}</h2><p>${description}</p></div><span class="ws-count">${count(key,data)} ${key==='header'?'profile':'items'}</span><div class="ws-row-actions"><button data-ws-section="${key}" data-ws-operation="edit">Edit</button>${key!=='header'?`<button data-ws-section="${key}" data-ws-operation="add" title="Add to ${label}" aria-label="Add to ${label}">+</button><button data-ws-section="${key}" data-ws-operation="layout" title="Arrange ${label}" aria-label="Arrange ${label}"><i class="ri-drag-move-2-line"></i></button>`:''}</div></article>`).join('')||'<article class="ws-card">No matching sections. Try another search.</article>';
  if(customRows.length){
    if(!rows.length)$('ws-sections').replaceChildren();
    $('ws-sections').insertAdjacentHTML('beforeend',customRows.map(block=>`<article class="ws-section-row"><div class="ws-section-icon">${sectionIcon(block)}</div><div class="ws-section-copy"><h2>${escape(block.title)}</h2><p>Custom section ? ${(block.fields||[]).length} fields${block.status==='inactive'?' ? hidden':''}</p></div><span class="ws-count">${block.items?.length||0} items</span><div class="ws-row-actions"><button data-ws-custom-section="${escape(block.id)}">Edit section</button></div></article>`).join(''));
  }

}
export async function refreshWorkspace(){
  if(!$('admin-workspace'))return;
  const serial=++refreshSerial;
  refreshStatus();renderContent();
  const data=window._portfolioData||{},pending=hooks.pending();
  $('ws-metrics').innerHTML=[[String(sections.length+(data['custom-blocks']?.blocks||[]).filter(block=>block.kind==='section'&&block.visibility!=='private').length).padStart(2,'0'),'Portfolio sections','layout-2'],[String(count('projects',data)).padStart(2,'0'),'Project records','folder-3'],[String(count('education',data)).padStart(2,'0'),'Qualifications','award'],[String(pending.length).padStart(2,'0'),'Pending changes','refresh']].map(([value,label,icon])=>`<article><div><i class="ri-${icon}-line"></i><span>${label}</span></div><strong>${value}</strong></article>`).join('');
  $('ws-shortcuts').innerHTML=sections.slice(0,4).map(([key,label,description,icon])=>`<button data-ws-section="${key}" data-ws-operation="edit"><i class="ri-${icon}-line"></i><span>${label}</span><i class="ri-arrow-right-up-line"></i></button>`).join('');
  $('ws-pending-detail').textContent=pending.length?`${pending.length} pending change(s). Review conflicts before retrying sync.`:'No pending writes on this device.';
  try{
    const api=await import('../firebase-config.js');const [cv,ai]=await Promise.all([api.readOfficialCv(),import('../ai/service.js').then(service=>service.loadAiSettings()).catch(()=>null)]);
    if(serial!==refreshSerial||!document.body.classList.contains('admin-mode'))return;
    window._firebaseConnectionStatus=api.getFirebaseConnectionStatus();refreshStatus();
    const provider=activeProvider(ai);
    const cvLabel=cv?.version===4?`Version ${cv._revision||0} · ${cv.pageCount} pages`:'Not yet saved as an official snapshot';
    $('ws-cv-detail').textContent=cvLabel;
    $('ws-health').innerHTML=[['Official CV',cvLabel,cv?.version===4,'cv','Review'],['AI assistant',provider.ready?`${provider.label} / ${provider.config.model} / tested`:'Connection not tested',provider.ready,'config','Configure'],['Local sync queue',pending.length?`${pending.length} pending writes`:'No pending writes on this device',!pending.length,'sync','Review']].map(([label,value,ok,key,button])=>`<div class="ws-health-row"><span class="ws-health-icon ${ok?'is-ok':''}"><i class="ri-${ok?'check':'subtract'}-line"></i></span><div><strong>${label}</strong><small>${escape(value)}</small></div><button data-health-action="${key}" aria-label="${button} ${label}">${button}</button></div>`).join('');
    $('ws-ai-empty').hidden=provider.ready;
    const tasks=[pending.length?['sync','refresh',`${pending.length} changes waiting`,'Resolve the sync queue before publishing.']:['content','layout-2','Review portfolio content','Keep experience, projects and contact details current.'],cv?.version===4?['cv','file-user','Review official CV',cvLabel]:['cv','file-user','Create an official CV','Choose content, verify the PDF and publish.'],provider.ready?['ai','sparkling','Prepare for a target role','Review wording and job requirements with AI.']:['config','sparkling','Connect your AI provider','Save and test a connection to enable AI assistance.']];
    $('ws-next-actions').innerHTML=tasks.map(([key,icon,title,detail])=>`<button class="ws-task" data-health-action="${key}"><i class="ri-${icon}-line" aria-hidden="true"></i><span><strong>${escape(title)}</strong><small>${escape(detail)}</small></span></button>`).join('');
  }catch(error){if(serial===refreshSerial)$('ws-feedback').textContent=`Workspace status unavailable: ${error.message}`;}
}
const WORKSPACE_CSS=`
#admin-workspace{position:fixed;inset:64px 0 0;z-index:99980;display:grid;grid-template-columns:230px minmax(0,1fr);background:#0f1928;color:#e4ecf8;font:14px/1.55 system-ui,sans-serif}
#admin-workspace[hidden],#admin-workspace [hidden]{display:none!important}
#admin-workspace .ws-content:has(#ws-cv-panel:not([hidden]) #am-cv-overlay){padding:0;overflow:hidden}
#ws-cv-panel:has(#am-cv-overlay){height:100%;max-width:none!important}
#ws-cv-panel:has(#am-cv-overlay)>.ws-heading,#ws-cv-panel:has(#am-cv-overlay)>.ws-card{display:none}
#admin-workspace *{box-sizing:border-box}body.admin-workspace-open{overflow:hidden}
#admin-workspace button{font:inherit;color:inherit;background:#203149;border:1px solid #354963;border-radius:8px;padding:9px 14px;cursor:pointer}
#admin-workspace button:hover{background:#304762}#admin-workspace :focus-visible{outline:3px solid #a8ccff;outline-offset:3px}
.ws-sidebar{display:flex;flex-direction:column;padding:28px 18px 18px;background:#111e30;border-right:1px solid #2b3c52;min-height:0;overflow:auto}
.ws-brand{display:flex;gap:12px;align-items:center;font-size:16px;font-weight:700;letter-spacing:-.4px;margin-bottom:38px}.ws-brand>span{background:#b5d3f9;color:#183354;font-size:14px;border-radius:10px;padding:11px 10px;letter-spacing:0}.ws-brand small{display:block;color:#96abc7;font-size:9px;letter-spacing:1.3px;margin-top:4px}
.ws-nav-label{font-size:9px;letter-spacing:1.6px;color:#899eb8;margin:0 12px 12px}.ws-sidebar nav{display:grid;gap:6px}
#admin-workspace .ws-sidebar nav button{border:1px solid transparent;background:transparent;display:flex;align-items:center;gap:12px;text-align:left;color:#aebdd2;padding:11px 12px;font-size:13px}
#admin-workspace .ws-sidebar nav button[aria-current]{background:#243d5c;color:#eff6ff;border-color:#375777}.ws-sidebar nav i{font-size:18px}.ws-new{font-size:8px;margin-left:auto;border:1px solid #577291;border-radius:4px;padding:1px 4px}
.ws-sidebar-bottom{margin-top:auto;padding-top:32px}.ws-owner{font-size:13px;font-weight:650;border-top:1px solid #2b3c52;padding:18px 10px}.ws-owner small{display:block;color:#93a9c4;font-size:11px;font-weight:400;margin-top:4px}#admin-workspace .ws-sidebar-bottom button{width:100%;font-size:12px;background:transparent;text-align:left}.ws-sidebar-bottom p{font-size:10px;color:#93a9c4;padding:0 10px}
.ws-main{display:flex;flex-direction:column;min-height:0;min-width:0}.ws-top{height:64px;flex-shrink:0;padding:0 34px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2b3c52;background:#111c2c;font-size:12px}.ws-breadcrumb{font-size:9px;letter-spacing:1px;color:#93a9c4}.ws-top strong{font-weight:550}.ws-live{display:flex;gap:8px;align-items:center;font-size:11px;color:#b5c5da}.ws-live>span:first-child{width:7px;height:7px;background:#ceab6d;border-radius:50%}.ws-live .connected{background:#8edbb8!important}#admin-workspace .ws-live button{border:0;background:transparent;padding:6px;font-size:16px}
.ws-content{overflow:auto;padding:38px 38px 50px;flex:1;min-height:0}.ws-content>section{max-width:1200px;margin:0 auto}
.ws-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:30px}.ws-eyebrow{font-size:9px;letter-spacing:2px;color:#9ebcde;font-weight:700}#admin-workspace h1{font-size:30px;letter-spacing:-1px;line-height:1.25;font-weight:650;color:#f2f6ff;margin:9px 0 10px}#admin-workspace p{color:#a7bad3;font-size:13px;line-height:1.8;margin:8px 0 16px}#admin-workspace h2{font-size:16px;color:#edf3ff;font-weight:650;margin:0 0 8px}#admin-workspace .ws-primary{background:#bbd6fb;border-color:#bbd6fb;color:#173153;font-weight:650;font-size:12px;white-space:nowrap}#admin-workspace .ws-primary:hover{background:#d4e6ff}
.ws-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:24px}.ws-metrics article{padding:19px 22px;background:#162437;border:1px solid #2c3f58;border-radius:10px}.ws-metrics article>div{display:flex;align-items:center;gap:9px;color:#aabed8;font-size:11px}.ws-metrics i{font-size:17px;color:#8fb5e4}.ws-metrics strong{font-size:30px;font-weight:550;letter-spacing:-1px;display:block;margin-top:12px;color:#edf5ff}
.ws-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:22px}.ws-card{border:1px solid #2c405a;background:#162437;padding:26px;border-radius:12px;min-width:0}.ws-feature{background:radial-gradient(ellipse at top right,#294665,transparent 70%),#192c44;padding:32px}.ws-feature h2{font-size:25px!important;line-height:1.4;letter-spacing:-.6px;margin:14px 0!important}.ws-feature p{max-width:450px}.ws-feature-tags{display:flex;gap:6px;flex-wrap:wrap;margin:20px 0 24px}.ws-feature-tags span{font-size:10px;color:#c5d9f2;border:1px solid #446080;border-radius:5px;padding:4px 8px}.ws-card-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.ws-card-heading i{color:#9bbfe8;font-size:20px}.ws-health-row{display:flex;align-items:center;gap:13px;padding:15px 0;border-bottom:1px solid #2c405a}.ws-health-icon{border-radius:50%;background:#3d3d34;color:#d6bc83;padding:3px 5px;line-height:1}.ws-health-icon.is-ok{background:#233e3a;color:#a5dfc6}.ws-health-row strong{display:block;font-size:12px;font-weight:600}.ws-health-row small{display:block;font-size:11px;color:#aabed8;margin-top:3px}.ws-card>button{margin-top:18px}
.ws-section-heading{display:flex;justify-content:space-between;align-items:center;gap:14px;margin:32px 0 16px}#admin-workspace .ws-section-heading button{font-size:11px;border:0;background:none;padding:0;color:#c1d9fa}.ws-shortcuts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}#admin-workspace .ws-shortcuts button{padding:17px 14px;display:flex;align-items:center;gap:10px;font-size:11px;background:#162437}.ws-shortcuts button i:first-child{font-size:18px;color:#9abbE6}.ws-shortcuts button i:last-child{margin-left:auto;color:#9ab1cf}
.ws-search{display:flex;align-items:center;gap:12px;background:#142236;border:1px solid #3b506b;border-radius:9px;padding:10px 15px;margin-bottom:22px;max-width:550px}.ws-search i{color:#a3bbd8}.ws-search input{font:inherit;background:transparent;border:0;color:#f2f6ff;width:100%;outline:0;font-size:12px}.ws-search input::placeholder{color:#91a8c4}
.ws-section-list{border:1px solid #2c405a;border-radius:12px;overflow:hidden}.ws-section-row{display:flex;align-items:center;gap:18px;padding:21px 24px;border-bottom:1px solid #2c405a;background:#162437}.ws-section-row:last-child{border-bottom:0}.ws-section-icon{background:#243c59;color:#b7d4f8;padding:9px 12px;font-size:22px;border-radius:9px}.ws-section-copy{flex:1;min-width:0}.ws-section-copy h2{font-size:14px!important;margin:0!important}.ws-section-copy p{margin:4px 0 0!important;font-size:11px!important}.ws-count{color:#a9bed9;font-size:10px;min-width:62px}.ws-row-actions{display:flex;gap:6px}#admin-workspace .ws-row-actions button{padding:7px 11px;font-size:12px}
.ws-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.ws-settings-grid .ws-card>i,#ws-ai-empty>i{font-size:26px;color:#a7c9f5;display:block;margin-bottom:15px}#ws-feedback{max-width:1200px;margin:20px auto;font-size:12px;color:#ebcba2}
#ws-ai-host #am-global-ai-widget{position:static;width:100%;height:520px;max-height:65dvh;transform:none;border:1px solid #3a506c;border-radius:12px;display:flex;flex-direction:column;box-shadow:none}#ws-ai-host .am-ai-widget-body{display:flex!important;flex:1;min-height:0}#ws-ai-host .am-chat-history{flex:1;min-height:0}#ws-ai-host #am-ai-widget-toggle{pointer-events:none}#ws-ai-host .am-ai-widget-actions{display:none}#ws-ai-host .am-chat-text{overflow-wrap:anywhere}
#ws-ai-host .am-ai-widget-body{background:#111e30;color:#e4ecf8}#ws-ai-host .am-chat-ai{background:#20354f;color:#e4ecf8;border-color:#405977}#ws-ai-host .am-chat-user{background:#315b88;color:#fff}#ws-ai-host .am-chat-error{background:#462b35;color:#ffdae1;border-color:#895567}#ws-ai-host .am-chat-input-container{background:#14253a;border-color:#405977}#ws-ai-host .am-chat-input-container textarea{min-width:0;background:#101d30;color:#e4ecf8;border-color:#49617f}#ws-ai-host .am-ai-widget-title{font:600 13px system-ui;overflow-wrap:anywhere}#am-cv-ai-out table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px}#am-cv-ai-out th,#am-cv-ai-out td{padding:9px;text-align:left;vertical-align:top;overflow-wrap:anywhere;border-bottom:1px solid #49617f}
body.admin-mode .am-toolbar{height:64px;padding:0 20px;background:#0c1726;border-bottom:1px solid #2b3c52;box-shadow:none}body.admin-mode .am-toolbar-inner{height:64px;max-width:none;gap:12px}.am-toolbar-badge{font:650 14px system-ui!important;background:transparent!important;color:#e5efff!important;white-space:nowrap}.am-toolbar-hint{display:none}body.admin-mode .am-toolbar-actions{gap:8px;margin-left:auto}body.admin-mode .am-toolbar .am-btn{flex:none;white-space:nowrap;font:500 11px system-ui;border-radius:7px;color:#d9e8fa}body.admin-mode #admin-logout{background:#273349;border:1px solid #49566b;padding:9px 14px}.am-toolbar #admin-export-seed-btn,.am-toolbar #admin-resolve-sync{display:none}body.admin-mode #admin-export-cv-btn{background:#29466a!important;color:#e4efff!important;border:1px solid #4d6c92!important}.am-toolbar #admin-workspace-toggle{background:#172d46;border:1px solid #395575;color:#d7e6fa}
#admin-edit-overlay .am-edit-box{width:min(960px,100%);max-width:960px;border-radius:14px;border:1px solid #4c617a}#admin-edit-overlay .am-edit-header{padding:20px 26px;background:#15263d}#admin-edit-overlay .am-edit-title{font:650 18px system-ui;color:#f0f6ff}#admin-edit-overlay .am-edit-body{padding:28px;background:#f4f7fb;color:#223851}#admin-edit-overlay .am-input,#admin-edit-overlay .am-textarea{background:#fff;color:#223851;border:1px solid #b9c9dc;border-radius:8px;padding:11px 13px;font:13px/1.6 system-ui}#admin-edit-overlay .am-form-group label{font:600 12px system-ui;color:#304863}#admin-edit-overlay .am-edit-footer{padding:15px 26px;background:#eaf0f8;border-top:1px solid #c7d5e5}#admin-edit-overlay .am-edit-footer .am-btn-primary{background:#25496f;border:1px solid #25496f}#admin-edit-overlay .am-edit-footer .am-btn-ghost{color:#354d69;border-color:#a9bed5;background:transparent}
@media(max-width:1100px){#admin-workspace{grid-template-columns:195px minmax(0,1fr)}.ws-content{padding:28px 24px}.ws-heading{align-items:flex-start;flex-direction:column}.ws-shortcuts{grid-template-columns:1fr 1fr}.ws-metrics article{padding:16px}.ws-grid{grid-template-columns:1fr}}
@media(max-width:700px){#admin-workspace{inset:64px 0 0;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}.ws-sidebar{min-width:0;padding:10px 12px;border-right:0;border-bottom:1px solid #2b3c52;overflow:hidden}.ws-brand,.ws-sidebar-bottom,.ws-nav-label{display:none}.ws-sidebar nav{display:flex;overflow:auto;gap:4px}#admin-workspace .ws-sidebar nav button{white-space:nowrap;padding:8px;font-size:11px;gap:6px}.ws-sidebar nav i{font-size:15px}.ws-new{display:none}.ws-top{height:46px;padding:0 16px}.ws-breadcrumb{display:none}.ws-content{padding:24px 16px}#admin-workspace h1{font-size:25px}.ws-heading{gap:14px;margin-bottom:24px}.ws-metrics{grid-template-columns:1fr 1fr;gap:10px}.ws-metrics strong{font-size:25px}.ws-metrics article>div{font-size:10px}.ws-feature{padding:22px}.ws-feature h2{font-size:23px!important}.ws-card{padding:22px}.ws-settings-grid{grid-template-columns:1fr}.ws-section-row{padding:15px 12px;gap:10px;flex-wrap:wrap}.ws-section-icon{padding:7px 9px;font-size:18px}.ws-count{min-width:0}.ws-section-copy p{display:none}.ws-row-actions{margin-left:auto}body.admin-mode .am-toolbar{padding:0 10px}.am-toolbar-badge{font-size:11px!important}.am-toolbar #admin-config-btn{display:none}body.admin-mode .am-toolbar-actions{gap:5px}body.admin-mode .am-toolbar .am-btn{padding:7px;font-size:10px}.am-toolbar-inner{justify-content:space-between}.ws-live{font-size:10px}#admin-edit-overlay{padding:0}#admin-edit-overlay .am-edit-box{max-height:100dvh;height:100dvh;border-radius:0}#admin-edit-overlay .am-edit-header,#admin-edit-overlay .am-edit-body{padding:18px}#admin-edit-overlay .am-edit-footer{padding:14px 18px}}
`;

window.addEventListener('portfolio-auth-state',event=>{if(!event.detail.signedIn){if(location.hash.startsWith('#admin/'))history.replaceState(null,'',location.pathname+location.search+publicHash);for(const id of ['ws-provider-settings','ws-context-library','ws-content-builder']){const host=$(id);if(host){host.replaceChildren();delete host.dataset.mounted;}}}});
