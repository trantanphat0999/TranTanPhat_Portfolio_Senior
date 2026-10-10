import {normalizeSettings,PROVIDERS,providerReady,CLAUDE_MODELS,CLAUDE_EFFORTS} from '../ai/settings.js';
import {mountClaudePanel} from './claude-settings.js';
import {loadAiSettings,loadSharedAiSettings,readLocalClaude,writeLocalClaude,pairService,saveCredential,probeProvider,listModels,testProvider,describeProbe,serviceHealth,serviceBase,pairingState,isLoopback,LOCAL_SERVICE} from '../ai/service.js';
import {escape as e,studioStyles,contextPicker} from './studio-ui.js';
let loading;

// ─── AI PROVIDER SETTINGS ───────────────────────────────────
// Four guided steps: provider → connect (service, pairing, credential) → model → test & activate.
// The service is checked automatically so problems show up before the user runs a test.
const PROVIDER_INFO={
  claude:{icon:'ri-terminal-box-line',text:'Runs on this computer with your Claude Code login. No API key, no Firebase setup.'},
  openai:{icon:'ri-key-2-line',text:'OpenAI Responses API with a key stored only on the AI service.'},
  custom:{icon:'ri-plug-line',text:'Any OpenAI-compatible /chat/completions endpoint.'},
};
const MODEL_HINTS={sonnet:'balanced',opus:'most capable',haiku:'fastest',fable:'newest'};
const ICONS={running:'⏳',pass:'✅',fail:'❌',cancelled:'⏹️'};
const RULES_FIX='Firestore denies access to the private admin/* collection, so OpenAI/Custom settings cannot be loaded or saved (Claude CLI does not need this). Deploy the rules once with <code>firebase deploy --only firestore:rules,firestore:indexes</code>, then reload this page.';
const STYLE=`.aip{display:grid;gap:16px}.aip h2{margin:0 0 4px;font-size:18px}.aip-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.aip-head p,.aip-lead{margin:0;color:#9fb6d3;font-size:12px}
.aip-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font:600 11px system-ui;border:1px solid #405977;background:#14253a;color:#c8d9ee;white-space:nowrap}.aip-pill::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor}
.aip-pill[data-tone=ok]{color:#7fd8a6;border-color:#2f6b4f;background:#13291f}.aip-pill[data-tone=warn]{color:#e7c391;border-color:#7a5f33;background:#2a2214}.aip-pill[data-tone=bad]{color:#ff9fb0;border-color:#8a4a5a;background:#2a1820}.aip-pill[data-tone=busy]{color:#9cc6f5}
.aip-alert{padding:12px 14px;border-radius:9px;border:1px solid #7a5f33;background:#2a2214;color:#f1d7ac;font-size:12px;line-height:1.6}.aip code{background:#0d1726;padding:1px 6px;border-radius:5px;color:#e4ecf8;font-size:11px}
.aip-step{display:grid;grid-template-columns:28px minmax(0,1fr);gap:14px;padding:18px;border:1px solid #2c405a;border-radius:11px;background:#132033}.aip-num{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 12px system-ui;background:#203149;color:#bcd3f0;border:1px solid #3a506c}
.aip-step[data-state=done] .aip-num{background:#1f4a35;border-color:#2f6b4f;color:#bff0d4}.aip-step[data-state=blocked] .aip-num{background:#4a2330;border-color:#8a4a5a;color:#ffd3dc}
.aip-step h3{margin:2px 0 0;font-size:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}.aip-body{display:grid;gap:12px;min-width:0}
.aip-providers{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}#admin-workspace .aip-providers button{display:grid;gap:5px;text-align:left;padding:14px;border-radius:10px}#admin-workspace .aip-providers button[aria-checked=true]{border-color:#a9cef9;background:#294566}.aip-providers strong{font-size:13px;display:flex;gap:7px;align-items:center}.aip-providers small{color:#9fb6d3;font-size:11px;line-height:1.45}
.aip-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.aip-row>input,.aip-row>select{flex:1;min-width:180px}.aip-field{display:grid;gap:6px;font-size:12px;color:#c8d9ee}.aip-meta{font-size:12px;color:#9fb6d3;overflow-wrap:anywhere;margin:0}.aip-meta:empty{display:none}.aip-meta[data-tone=ok]{color:#7fd8a6}.aip-meta[data-tone=bad]{color:#ff9fb0}
.aip-help{font-size:12px;color:#c8d9ee;line-height:1.6;padding:12px 14px;border-radius:9px;background:#0f1b2b;border:1px dashed #5a6f8c}.aip-help ol{margin:6px 0 4px;padding-left:20px;list-style:decimal}
.aip-chips{display:flex;gap:6px;flex-wrap:wrap}#admin-workspace .aip-chips button{padding:5px 11px;border-radius:999px;font-size:12px}#admin-workspace .aip-chips button[aria-pressed=true]{border-color:#a9cef9;background:#294566}.aip-chips small{color:#9fb6d3;margin-left:4px}
.aip-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.aip details summary{cursor:pointer;font-size:12px;color:#9fb6d3}.aip details[open] summary{margin-bottom:10px}
.studio-checks{display:grid;gap:6px;margin:0;padding:0;list-style:none;font:12px system-ui}.studio-checks:empty{display:none}.studio-checks li{display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:start;padding:8px 10px;border:1px solid #33496a;border-radius:7px;background:#101d30;color:#dce8f8}.studio-checks li[data-status=pass]{border-color:#2f6b4f}.studio-checks li[data-status=fail],.studio-checks li[data-status=cancelled]{border-color:#8a4a5a;background:#2a1820}.studio-checks small{display:block;color:#9fb6d3;overflow-wrap:anywhere}.studio-checks em{font-style:normal;color:#8ea6c4}
@media(max-width:700px){.aip-step{grid-template-columns:1fr}.aip-num{display:none}}`;
const permissionDenied=error=>error?.code==='permission-denied'||/insufficient permissions|permission/i.test(error?.message||'');

function markup(){
  const step=(n,key,title,body)=>`<section class="aip-step" data-step="${key}"><span class="aip-num" aria-hidden="true">${n}</span><div class="aip-body"><h3>${title}</h3>${body}</div></section>`;
  return `<article class="ws-card aip studio-form"><header class="aip-head"><div><h2>AI provider</h2><p>One tested provider powers Chat, CV Studio and Content. Credentials never leave the AI service.</p></div><span id="studio-summary" class="aip-pill">Loading…</span></header>
  <div id="studio-storage-alert" class="aip-alert" role="alert" hidden></div>
  ${step(1,'provider','Choose a provider',`<div id="studio-provider" class="aip-providers" role="radiogroup" aria-label="AI provider">${Object.entries(PROVIDERS).map(([key,label])=>`<button type="button" role="radio" data-provider="${key}" aria-checked="false"><strong><i class="${PROVIDER_INFO[key].icon}" aria-hidden="true"></i>${e(label)}</strong><small>${e(PROVIDER_INFO[key].text)}</small></button>`).join('')}</div>`)}
  <div id="studio-claude-host" hidden></div>
  <div id="studio-api-steps" class="aip">
  ${step(2,'connect','Connect <span id="studio-service-pill" class="aip-pill" data-tone="busy">Checking…</span>',`
   <div class="aip-field"><label for="studio-bridge">AI service URL</label><div class="aip-row"><input id="studio-bridge" placeholder="${e(LOCAL_SERVICE)}" autocomplete="off"><button type="button" id="studio-retry">Retry</button></div><p id="studio-service-meta" class="aip-meta"></p></div>
   <div id="studio-service-help" class="aip-help" hidden></div>
   <div id="studio-pair-block" class="aip-field" hidden><label for="studio-pair">Pairing code</label><div class="aip-row" id="studio-pair-row"><input id="studio-pair" inputmode="numeric" maxlength="8" placeholder="8-digit code printed in the AI service terminal" autocomplete="off"><button type="button" id="studio-pair-btn">Pair browser</button></div><p id="studio-pair-state" class="aip-meta"></p></div>
   <div class="aip-field" id="studio-endpoint-label"><label for="studio-endpoint">Custom API base URL</label><input id="studio-endpoint" placeholder="https://your-api/v1"></div>
   <div class="aip-field" id="studio-key-label"><label for="studio-key">API key</label><div class="aip-row"><input id="studio-key" type="password" autocomplete="off" placeholder="Stored only on the AI service"><button type="button" id="studio-key-btn">Save key</button></div></div>
   <div class="aip-row" id="studio-probe-row"><button type="button" id="studio-probe">Check credential</button><p id="studio-probe-result" class="aip-meta"></p></div>`)}
  ${step(3,'model','Pick a model',`
   <div class="aip-field"><label for="studio-model">Model ID</label><div class="aip-row"><input id="studio-model" list="studio-model-catalog" placeholder="Choose below or enter a model ID"><button type="button" id="studio-models">Load model catalog</button></div><datalist id="studio-model-catalog"></datalist><div id="studio-chips" class="aip-chips"></div></div>
   <div class="aip-grid2"><div class="aip-field" id="studio-effort-label"><label for="studio-effort">Effort</label><select id="studio-effort"><option value="">CLI default</option>${CLAUDE_EFFORTS.map(level=>`<option value="${level}">${level}${level==='low'?' · fastest, cheapest':''}</option>`).join('')}</select></div>
   <div class="aip-field"><label for="studio-timeout">Timeout (seconds)</label><input id="studio-timeout" type="number" min="5" max="180"></div></div>`)}
  ${step(4,'test','Test & activate',`<p class="aip-lead">The test checks every layer (service, sign-in, provider, a JSON reply and a text reply) without sending portfolio data.</p>
   <div class="aip-row"><button type="button" id="studio-test" class="ws-primary">Test real connection</button><button type="button" id="studio-cancel" hidden>Cancel test</button><button type="button" id="studio-save">Save & use across system</button><button type="button" id="studio-reload">Reload saved settings</button></div>
   <ol id="studio-checks" class="studio-checks" aria-label="Connection test steps"></ol><div id="studio-ai-status" class="studio-status" role="status"></div>`)}
  </div></article>
  <article class="ws-card aip studio-form" style="margin-top:18px"><h2>Default AI context</h2><p class="aip-lead">Private context added to every AI request unless a tool picks its own. Manage entries in the Context library tab.</p><div id="studio-default-context"></div><div class="aip-row"><button type="button" id="studio-save-defaults">Save default context</button></div></article>`;
}

export async function mountProviders(host){
 if(loading||host.dataset.mounted)return;loading=true;studioStyles();
 if(!document.getElementById('studio-provider-style')){const style=document.createElement('style');style.id='studio-provider-style';style.textContent=STYLE;document.head.append(style);}
 try{
  const api=await import('../firebase-config.js');
  // readAiConfig swallows errors, so probe the private collection directly to surface missing rules.
  const [loaded,stored]=await Promise.all([loadAiSettings(),api.readAdminDoc('ai-config').then(doc=>({doc}),error=>({error}))]),storageError=stored.error;
  // Claude CLI is the default whenever nothing usable is saved in Firestore.
  let settings=loaded,saved=structuredClone(loaded),id=loaded.localClaude||storageError||!stored.doc?'claude':settings.activeProvider,claudePanel,busy=false,epoch=0,testController,checkSeq=0,checkTimer,service={state:'checking'},probe={state:'idle'},catalogModels=[];
  if(!document.body.classList.contains('admin-mode'))return;
  host.dataset.mounted='true';host.innerHTML=markup();
  const $=s=>host.querySelector('#studio-'+s),cfg=()=>settings.providers[id],legacy=()=>id==='custom'&&cfg().credentialMode==='legacy';
  function status(text){if($('ai-status'))$('ai-status').textContent=text;}
  function tone(node,text,value){if(!node)return;node.textContent=text;if(value)node.dataset.tone=value;else delete node.dataset.tone;}
  claudePanel=mountClaudePanel($('claude-host'),{initial:settings.providers.claude});
  if(storageError){$('storage-alert').innerHTML=permissionDenied(storageError)?RULES_FIX:`AI settings could not be loaded: ${e(storageError.message)}`;}

  // ─── RENDER ───
  function drawChecks(list){if($('checks'))$('checks').innerHTML=(list||[]).map(check=>`<li data-check="${e(check.key)}" data-status="${e(check.status)}"><span aria-hidden="true">${ICONS[check.status]||'•'}</span><div>${e(check.label)}${check.detail?`<small>${e(check.detail)}</small>`:''}</div><em>${check.status==='running'?'…':`${Number(check.ms)||0} ms`}</em></li>`).join('');}
  function drawChips(){
   const models=id==='claude'?CLAUDE_MODELS:catalogModels.slice(0,12),current=$('model').value.trim();
   $('model-catalog').innerHTML=(id==='claude'?CLAUDE_MODELS:catalogModels).map(model=>`<option value="${e(model)}"></option>`).join('');
   $('chips').innerHTML=models.map(model=>`<button type="button" data-model="${e(model)}" aria-pressed="${model===current}">${e(model)}${id==='claude'&&MODEL_HINTS[model]?`<small>${MODEL_HINTS[model]}</small>`:''}</button>`).join('');
  }
  function drawSummary(){
   const active=saved.providers[saved.activeProvider],ready=providerReady(saved.activeProvider,active);
   const unavailable=!saved.localClaude&&(storageError||!stored.doc),where=saved.localClaude?' (this computer)':'';
   tone($('summary'),ready?`Active: ${PROVIDERS[saved.activeProvider]}${where} · ${active.test.resolvedModel||active.model}`:unavailable?'No active AI provider':`${PROVIDERS[saved.activeProvider]} · not tested`,ready?'ok':unavailable?'bad':'warn');
  }
  function drawSteps(){
   const ready=providerReady(id,cfg()),pair=pairingState(cfg()),connected=legacy()||(service.state==='ok'&&(!pair.required||pair.paired)&&probe.state!=='bad');
   const state={provider:'done',connect:connected&&probe.state==='ok'||legacy()?'done':service.state==='bad'||probe.state==='bad'?'blocked':'',model:cfg().model?'done':'',test:ready?'done':''};
   host.querySelectorAll('.aip-step').forEach(node=>{if(state[node.dataset.step])node.dataset.state=state[node.dataset.step];else delete node.dataset.state;});
   // The primary action follows the flow: test first, then save.
   $('test').classList.toggle('ws-primary',!ready);$('save').classList.toggle('ws-primary',ready);
  }
  function drawService(){
   const c=cfg(),base=serviceBase(c),pair=pairingState(c),help=$('service-help');
   $('bridge').placeholder=`${base} (default)`;
   if(legacy()){tone($('service-pill'),'Direct from browser','warn');tone($('service-meta'),'Legacy configuration: requests go from the browser to the endpoint. Save a key on the AI service to switch to the secure mode.');help.hidden=true;$('pair-block').hidden=true;drawSteps();return;}
   if(service.state==='checking'){tone($('service-pill'),'Checking…','busy');tone($('service-meta'),`Looking for the AI service at ${base}`);}
   else if(service.state==='ok'){tone($('service-pill'),pair.required&&!pair.paired?'Needs pairing':'Connected',pair.required&&!pair.paired?'warn':'ok');tone($('service-meta'),`${base} · ${isLoopback(base)?'local service':'hosted API'}${service.value.requiresPair?' · pairing required':''}`);}
   else tone($('service-pill'),service.error.code==='forbidden-origin'?'Origin blocked':service.error.code==='service-offline'?'Offline':'Unavailable','bad');
   help.hidden=service.state!=='bad';
   if(service.state==='bad'){tone($('service-meta'),'');help.innerHTML=service.error.code==='service-offline'&&/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(`${base}/`)
    ?`<strong>The AI service is not running at ${e(base)}.</strong><ol><li>Open a terminal in the project folder.</li><li>Run <code>npm run admin:local</code> (or double-click <code>start-admin-workspace.bat</code>).</li><li>Keep it open, copy the 8-digit pairing code it prints, then click <strong>Retry</strong>.</li></ol>Tip: <code>npm start</code> only serves the website; the AI service is a separate process. You can also open the admin at <code>${e(LOCAL_SERVICE)}</code>.`
    :`<strong>${e(service.error.message)}</strong>`;}
   $('pair-block').hidden=!(service.state==='ok'&&pair.required);$('probe-row').hidden=service.state==='bad';$('pair-row').hidden=pair.paired;
   tone($('pair-state'),pair.paired?`Browser paired · expires in ${Math.max(1,Math.round((pair.expires-Date.now())/60000))} min`:'Enter the code printed when the AI service started.',pair.paired?'ok':null);
   drawSteps();
  }
  function drawProbe(){tone($('probe-result'),probe.state==='idle'?'':probe.text,probe.state==='ok'?'ok':probe.state==='bad'?'bad':null);drawSteps();}
  function draw(){
   const c=cfg(),claude=id==='claude';
   host.querySelectorAll('[data-provider]').forEach(node=>node.setAttribute('aria-checked',String(node.dataset.provider===id)));
   // Claude CLI has its own self-detecting panel; the Connect/Model/Test steps are for HTTP providers.
   host.querySelector('[data-step=provider] .aip-num').hidden=claude;$('claude-host').hidden=!claude;$('api-steps').hidden=claude;$('storage-alert').hidden=claude||!storageError;
   drawSummary();if(claude){clearTimeout(checkTimer);checkSeq++;claudePanel.resume();return;}claudePanel.pause();
   $('bridge').value=c.bridgeUrl;$('endpoint').value=c.baseUrl;$('model').value=c.model;$('effort').value=c.effort||'';$('timeout').value=c.timeoutMs/1000;$('key').value='';
   $('endpoint-label').hidden=id!=='custom';$('key-label').hidden=claude;$('effort-label').hidden=!claude;$('models').hidden=claude;$('probe').textContent=claude?'Check Claude CLI':'Check credential';
   catalogModels=[];probe={state:'idle'};drawChips();drawProbe();
   const ready=providerReady(id,c);drawChecks(ready?c.test.checks:[]);status(ready?`Ready · ${c.test.resolvedModel||c.model} · tested ${new Date(c.test.testedAt).toLocaleString()}`:'Not tested yet. Saving does not mark a provider Ready; run the test first.');
   drawSummary();drawService();
  }

  // ─── AUTOMATIC CONNECTION CHECK ───
  async function runProbe(){
   const c=cfg(),provider=id,result=await probeProvider(provider,c);
   if(provider!==id)return result;
   if(result.secretVersion&&c.secretVersion!==result.secretVersion){c.secretVersion=result.secretVersion;delete c.test;}
   try{probe={state:'ok',text:describeProbe(provider,result)};}catch(error){probe={state:'bad',text:error.message};}
   drawProbe();return result;
  }
  async function checkConnection(){
   const seq=++checkSeq,c=cfg();clearTimeout(checkTimer);
   if(id==='claude')return;
   if(legacy()){drawService();return;}
   service={state:'checking'};drawService();
   try{const value=await serviceHealth(c);if(seq!==checkSeq)return;service={state:'ok',value};}
   catch(error){if(seq!==checkSeq)return;service={state:'bad',error};probe={state:'idle'};drawProbe();}
   drawService();
   const pair=pairingState(c);
   if(service.state==='ok'&&(!pair.required||pair.paired)&&!busy){try{await runProbe();}catch(error){if(seq===checkSeq){probe={state:'bad',text:error.message};drawProbe();}}}
  }
  const scheduleCheck=()=>{clearTimeout(checkTimer);checkTimer=setTimeout(checkConnection,600);};

  // ─── EDITING ───
  function edited(){
   epoch++;const c=cfg();Object.assign(c,{bridgeUrl:$('bridge').value.trim(),model:$('model').value.trim(),timeoutMs:Number($('timeout').value)*1000});
   if(id==='custom')c.baseUrl=$('endpoint').value.trim();if(id==='claude')c.effort=$('effort').value;
   const ready=providerReady(id,c);drawChecks(ready?c.test.checks:[]);drawChips();drawSteps();status(ready?'Ready':'Settings changed · test connection again.');
  }
  for(const field of ['endpoint','model','timeout'])$(field).oninput=edited;
  $('bridge').oninput=()=>{edited();scheduleCheck();};
  $('effort').onchange=edited;
  $('chips').onclick=event=>{const chip=event.target.closest('[data-model]');if(!chip||busy)return;$('model').value=chip.dataset.model;edited();};
  host.querySelectorAll('[data-provider]').forEach(node=>node.onclick=()=>{if(busy||node.dataset.provider===id)return;epoch++;id=node.dataset.provider;draw();checkConnection();});
  $('provider').onkeydown=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const keys=Object.keys(PROVIDERS),next=keys[(keys.indexOf(id)+(['ArrowRight','ArrowDown'].includes(event.key)?1:keys.length-1))%keys.length];host.querySelector(`[data-provider="${next}"]`).click();host.querySelector(`[data-provider="${next}"]`).focus();};

  // ─── ACTIONS ───
  async function work(action){if(busy)return;busy=true;const version=epoch,provider=id;host.querySelectorAll('button').forEach(b=>b.disabled=true);$('cancel').disabled=false;status('Working…');try{await action(version,provider);}catch(error){status(permissionDenied(error)?'Firestore rules for admin/* are not deployed. Run firebase deploy --only firestore:rules,firestore:indexes.':error.message);}finally{busy=false;host.querySelectorAll('button').forEach(b=>b.disabled=false);drawSteps();}}
  $('retry').onclick=()=>checkConnection();
  $('pair').onkeydown=event=>{if(event.key==='Enter')$('pair-btn').click();};
  $('pair-btn').onclick=()=>work(async()=>{const code=$('pair').value.trim();if(!/^\d{8}$/.test(code))throw new Error('Enter the 8-digit pairing code shown in the AI service terminal.');await pairService(cfg(),code);$('pair').value='';drawService();status('Browser paired with the local AI service.');try{await runProbe();}catch{}});
  $('key-btn').onclick=()=>work(async()=>{const key=$('key').value;if(!key)throw new Error('Enter an API key.');const result=await saveCredential(id,cfg(),key);Object.assign(cfg(),{credentialMode:'server',secretVersion:result.version||result.secretVersion||'',apiKey:''});delete cfg().test;epoch++;$('key').value='';drawService();status('Key saved on the AI service. Test the connection before use.');});
  $('probe').onclick=()=>work(async()=>{await serviceHealth(cfg());const result=await runProbe();status(describeProbe(id,result));});
  $('models').onclick=()=>work(async(version)=>{const result=await listModels(id,cfg());if(version!==epoch)throw new Error('Configuration changed. Load models again.');catalogModels=(result.models||[]).map(model=>typeof model==='string'?model:model.id);drawChips();status(`${catalogModels.length} model IDs loaded. Select one, then test its text and JSON capability.`);});
  $('cancel').onclick=()=>testController?.abort();
  $('test').onclick=()=>work(async(version,provider)=>{delete cfg().test;testController=new AbortController();$('cancel').hidden=false;drawChecks([]);drawSteps();
   try{const test=await testProvider(provider,{...cfg()},{signal:testController.signal,onStep:list=>{if(version===epoch&&provider===id)drawChecks(list);}});if(version!==epoch||provider!==id)throw new Error('Configuration changed during test. Test again.');cfg().test=test;status(`Connection passed · ${test.resolvedModel||cfg().model} · ${test.latencyMs} ms. Save to activate.`);}
   catch(error){const failed=error.checks?.find(check=>check.status!=='pass');if(failed?.key==='service'){service={state:'bad',error};drawService();}throw failed?new Error(`${failed.status==='cancelled'?'Cancelled':'Failed'} at "${failed.label}": ${error.message}`):error;}
   finally{testController=null;if($('cancel'))$('cancel').hidden=true;}});
  $('save').onclick=()=>work(async()=>{settings.activeProvider=id;const result=await api.writeAiConfig(settings);if(!result?.synced)throw new Error('Settings were not synced.');settings=normalizeSettings(result.data);saved=normalizeSettings(result.data);if(readLocalClaude())writeLocalClaude(null);else window.dispatchEvent(new CustomEvent('portfolio-ai-settings-changed'));drawSummary();status(providerReady(id,cfg())?'Saved · active provider is Ready across the system.':'Saved · provider needs a successful connection test before use.');});
  let defaultPicker=await contextPicker($('default-context'),{ids:settings.defaultContextIds});
  $('save-defaults').onclick=()=>work(async()=>{const latest=await loadSharedAiSettings();latest.defaultContextIds=defaultPicker.ids();const result=await api.writeAiConfig(latest);settings._revision=result.data._revision;settings.defaultContextIds=result.data.defaultContextIds;window.dispatchEvent(new CustomEvent('portfolio-ai-settings-changed'));status('Default context selection saved.');});
  $('reload').onclick=()=>work(async()=>{settings=await loadAiSettings();saved=structuredClone(settings);id=settings.activeProvider;epoch++;draw();defaultPicker=await contextPicker($('default-context'),{ids:settings.defaultContextIds});});
  window.addEventListener('portfolio-ai-settings-changed',async function refresh(){if(!host.isConnected){window.removeEventListener('portfolio-ai-settings-changed',refresh);return;}saved=await loadAiSettings();drawSummary();});
  draw();checkConnection();
 }catch(error){host.textContent=error.message;}finally{loading=false;}
}
