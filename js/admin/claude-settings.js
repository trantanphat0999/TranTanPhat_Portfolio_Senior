import {providerDefaults,providerReady,settingsFingerprint,validateProvider,CLAUDE_MODELS,CLAUDE_EFFORTS} from '../ai/settings.js';
import {serviceHealth,serviceBase,pairingState,pairService,probeProvider,testProvider,readLocalClaude,writeLocalClaude,LOCAL_SERVICE} from '../ai/service.js';
import {escape as e} from './studio-ui.js';

// ─── CLAUDE CLI PANEL ───────────────────────────────────────
// Claude CLI runs on this computer, so there is nothing to "connect": the panel detects the
// local service, the CLI install and its login by itself, and one button tests + activates.
// The activation is stored in this browser (see readLocalClaude), never in Firestore.
const PRESETS=[
  {key:'fast',icon:'ri-flashlight-line',label:'Fast',model:'haiku',effort:'low',text:'Quick chat and rewrites'},
  {key:'balanced',icon:'ri-scales-3-line',label:'Balanced',model:'sonnet',effort:'medium',text:'Recommended for CV and content'},
  {key:'best',icon:'ri-brain-line',label:'Best quality',model:'opus',effort:'high',text:'Deep JD analysis, slower'},
];
const ROWS=[['service','Local AI service'],['cli','Claude Code installed'],['login','Signed in to Claude']];
const MARK={ok:'ri-checkbox-circle-fill',bad:'ri-error-warning-fill',wait:'ri-loader-4-line',idle:'ri-checkbox-blank-circle-line'};
const ICONS={running:'⏳',pass:'✅',fail:'❌',cancelled:'⏹️'};
const STYLE=`.cl{display:grid;gap:16px}.cl-hero{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;padding:18px;border-radius:11px;background:radial-gradient(ellipse at top right,#2d4a6e,transparent 70%),#152a42;border:1px solid #33507a}.cl-hero h3{margin:0 0 6px;font-size:16px}.cl-hero p{margin:0;font-size:12px;color:#b9cde6;max-width:640px;line-height:1.55}
.cl-status{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:0;padding:0;list-style:none}.cl-status li{display:grid;grid-template-columns:22px 1fr;gap:8px;padding:12px;border-radius:9px;border:1px solid #2c405a;background:#132033;font-size:12px}.cl-status i{font-size:18px;line-height:1}.cl-status strong{display:block;font-size:12.5px;margin-bottom:3px}.cl-status small{color:#9fb6d3;overflow-wrap:anywhere}
.cl-status li[data-state=ok]{border-color:#2f6b4f}.cl-status li[data-state=ok] i{color:#7fd8a6}.cl-status li[data-state=bad]{border-color:#8a4a5a;background:#2a1820}.cl-status li[data-state=bad] i{color:#ff9fb0}.cl-status li[data-state=wait] i{color:#9cc6f5;animation:cl-spin 1s linear infinite}.cl-status li[data-state=idle] i{color:#5d7493}@keyframes cl-spin{to{transform:rotate(360deg)}}
.cl-cmd{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.cl-cmd code{font-size:13px!important;padding:7px 11px!important}#admin-workspace .cl-cmd button{padding:5px 10px;font-size:11px}
.cl-presets{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}#admin-workspace .cl-presets button{display:grid;gap:4px;text-align:left;padding:13px;border-radius:10px}#admin-workspace .cl-presets button[aria-checked=true]{border-color:#a9cef9;background:#294566}.cl-presets strong{font-size:13px;display:flex;gap:7px;align-items:center}.cl-presets small{font-size:11px;color:#9fb6d3}.cl-presets em{font-style:normal;font-size:11px;color:#c8d9ee}
.cl-label{font-size:12px;color:#c8d9ee;margin:0}`;

export function mountClaudePanel(host,{initial}={}){
  if(!document.getElementById('claude-panel-style')){const style=document.createElement('style');style.id='claude-panel-style';style.textContent=STYLE;document.head.append(style);}
  const local=readLocalClaude();
  // Start from the device activation, else a previously tested shared config, else the Balanced preset.
  let draft={...providerDefaults('claude'),model:'sonnet',effort:'medium',...(initial?.test?initial:{}),...(local?.config||{})};
  let rows={service:{state:'wait',text:'Looking for the service…'},cli:{state:'idle',text:'Waiting for the service'},login:{state:'idle',text:'Waiting for the service'}};
  let fix='',seq=0,timer,busy=false,running=false,controller,lastOk=false;
  host.innerHTML=`<div class="cl">
   <div class="cl-hero"><div><h3>Claude CLI on this computer</h3><p>AI requests run through <code>claude</code> on this machine with your Claude Code subscription. No API key and no Firebase setup: everything is detected automatically and the activation is saved in this browser.</p></div><span id="claude-active" class="aip-pill"></span></div>
   <ul id="claude-status" class="cl-status" aria-label="Claude CLI status"></ul>
   <div id="claude-fix" class="aip-help" hidden></div>
   <div id="claude-pair" class="aip-field" hidden><label for="claude-pair-code">This service requires a pairing code</label><div class="aip-row"><input id="claude-pair-code" inputmode="numeric" maxlength="8" placeholder="8-digit code printed in the service window" autocomplete="off"><button type="button" id="claude-pair-btn">Pair</button></div></div>
   <p class="cl-label">Speed / quality</p>
   <div id="claude-presets" class="cl-presets" role="radiogroup" aria-label="Claude preset">${PRESETS.map(preset=>`<button type="button" role="radio" data-preset="${preset.key}" aria-checked="false"><strong><i class="${preset.icon}" aria-hidden="true"></i>${preset.label}</strong><em>${preset.model} · ${preset.effort} effort</em><small>${preset.text}</small></button>`).join('')}</div>
   <details id="claude-advanced"><summary>Advanced: model, effort, timeout, service URL</summary><div class="aip-grid2">
    <div class="aip-field"><label for="claude-model">Model</label><input id="claude-model" list="claude-model-list" autocomplete="off"><datalist id="claude-model-list">${CLAUDE_MODELS.map(model=>`<option value="${model}"></option>`).join('')}</datalist></div>
    <div class="aip-field"><label for="claude-effort">Effort</label><select id="claude-effort"><option value="">CLI default</option>${CLAUDE_EFFORTS.map(level=>`<option value="${level}">${level}</option>`).join('')}</select></div>
    <div class="aip-field"><label for="claude-timeout">Timeout (seconds)</label><input id="claude-timeout" type="number" min="5" max="180"></div>
    <div class="aip-field"><label for="claude-bridge">Service URL</label><input id="claude-bridge" placeholder="${e(LOCAL_SERVICE)} (default)" autocomplete="off"></div>
   </div></details>
   <div class="aip-row"><button type="button" id="claude-activate" class="ws-primary">Test & activate Claude CLI</button><button type="button" id="claude-cancel" hidden>Cancel</button><button type="button" id="claude-chat" hidden>Open AI Assistant</button><button type="button" id="claude-off" hidden>Turn off</button></div>
   <ol id="claude-checks" class="studio-checks" aria-label="Activation test steps"></ol>
   <p id="claude-message" class="studio-status" role="status"></p></div>`;
  const $=id=>host.querySelector('#claude-'+id);
  const message=text=>{$('message').textContent=text;};

  // ─── RENDER ───
  function drawStatus(){
    $('status').innerHTML=ROWS.map(([key,label])=>`<li data-row="${key}" data-state="${rows[key].state}"><i class="${MARK[rows[key].state]}" aria-hidden="true"></i><div><strong>${label}</strong><small>${e(rows[key].text)}</small></div></li>`).join('');
    $('fix').hidden=!fix;$('fix').innerHTML=fix;
  }
  function drawDraft(){
    const preset=PRESETS.find(item=>item.model===draft.model&&item.effort===(draft.effort||''));
    host.querySelectorAll('[data-preset]').forEach(node=>node.setAttribute('aria-checked',String(node.dataset.preset===preset?.key)));
    if(!preset)$('advanced').open=true;
    $('model').value=draft.model;$('effort').value=draft.effort||'';$('timeout').value=draft.timeoutMs/1000;$('bridge').value=draft.bridgeUrl||'';
  }
  function drawActive(){
    const current=readLocalClaude(),active=!!current&&providerReady('claude',current.config),changed=active&&settingsFingerprint('claude',{...current.config,...draft,test:undefined})!==current.config.test.fingerprint;
    const pill=$('active');pill.textContent=!active?'Not active':changed?'Active · unsaved changes':`Active · ${current.config.test.resolvedModel||current.config.model}`;pill.dataset.tone=!active?'warn':changed?'warn':'ok';
    $('off').hidden=!current;$('chat').hidden=!active;
    $('activate').textContent=active&&!changed?'Test again':active?'Test & apply changes':'Test & activate Claude CLI';
  }
  const drawChecks=list=>{$('checks').innerHTML=(list||[]).map(check=>`<li data-check="${e(check.key)}" data-status="${e(check.status)}"><span aria-hidden="true">${ICONS[check.status]||'•'}</span><div>${e(check.label)}${check.detail?`<small>${e(check.detail)}</small>`:''}</div><em>${check.status==='running'?'…':`${Number(check.ms)||0} ms`}</em></li>`).join('');};
  const command=(text,label)=>`<div class="cl-cmd"><code>${e(text)}</code><button type="button" data-copy="${e(text)}">Copy</button>${label?`<span>${label}</span>`:''}</div>`;

  // ─── AUTOMATIC DETECTION ───
  async function check(){
    const current=++seq;clearTimeout(timer);const base=serviceBase(draft);
    if(!lastOk){rows.service={state:'wait',text:`Looking for ${base}…`};drawStatus();}
    let service;
    try{service=await serviceHealth(draft);}
    catch(error){
      if(current!==seq)return;lastOk=false;
      rows={service:{state:'bad',text:error.code==='forbidden-origin'?'Running, but it rejects this page':'Not running'},cli:{state:'idle',text:'Waiting for the service'},login:{state:'idle',text:'Waiting for the service'}};
      fix=error.code==='forbidden-origin'?`<strong>${e(error.message)}</strong><br>Stop the service window and start it again so it picks up the current settings:${command('npm run admin:local')}`
        :error.code==='service-offline'?`<strong>Start the local AI service</strong> in the project folder and keep its window open:${command('npm run admin:local','or double-click start-admin-workspace.bat')}<small>This page checks again every few seconds. <code>npm start</code> serves only the website; Claude needs this service.</small>`
        :`<strong>${e(error.message)}</strong>`;
      $('pair').hidden=true;drawStatus();schedule(4000);return;
    }
    if(current!==seq)return;
    rows.service={state:'ok',text:`Running at ${base}`};
    const pair=pairingState(draft);$('pair').hidden=!(pair.required&&!pair.paired);
    if(pair.required&&!pair.paired){rows.cli=rows.login={state:'idle',text:'Waiting for pairing'};fix='';drawStatus();return;}
    let probe;
    try{probe=await probeProvider('claude',draft);}
    catch(error){if(current!==seq)return;rows.cli=rows.login={state:'bad',text:'Could not ask the service'};fix=`<strong>${e(error.message)}</strong>`;lastOk=false;drawStatus();schedule(8000);return;}
    if(current!==seq)return;
    rows.cli=probe.installed&&probe.compatible?{state:'ok',text:probe.version}:{state:'bad',text:probe.installed?`${probe.version} is too old`:'Not found on this computer'};
    rows.login=!(probe.installed&&probe.compatible)?{state:'idle',text:'Waiting for Claude Code'}:probe.authenticated?{state:'ok',text:[probe.authMethod,probe.subscription].filter(Boolean).join(' · ')||'Signed in'}:{state:'bad',text:'Not signed in'};
    fix=!probe.installed?`<strong>Install Claude Code</strong>, then restart the AI service:${command('npm i -g @anthropic-ai/claude-code')}`
      :!probe.compatible?`<strong>Update Claude Code</strong> (missing ${e((probe.missingFlags||[]).join(', '))}):${command('claude update')}`
      :!probe.authenticated?`<strong>Sign in to Claude</strong> in any terminal on this computer:${command('claude auth login')}<small>This page detects the login automatically.</small>`:'';
    lastOk=!fix;drawStatus();if(!lastOk)schedule(6000);
  }
  // Re-check only while the panel is visible and nothing else is running.
  function schedule(ms){clearTimeout(timer);timer=setTimeout(()=>{if(!host.isConnected||!running)return;if(busy||document.hidden||host.offsetParent===null){schedule(ms);return;}check();},ms);}

  // ─── EDITING ───
  function edited(){draft={...draft,model:$('model').value.trim(),effort:$('effort').value,timeoutMs:Number($('timeout').value)*1000};drawDraft();drawActive();}
  $('presets').onclick=event=>{const node=event.target.closest('[data-preset]');if(!node||busy)return;const preset=PRESETS.find(item=>item.key===node.dataset.preset);draft={...draft,model:preset.model,effort:preset.effort};drawDraft();drawActive();};
  for(const id of ['model','timeout'])$(id).oninput=edited;
  $('effort').onchange=edited;
  $('bridge').oninput=()=>{draft={...draft,bridgeUrl:$('bridge').value.trim()};lastOk=false;drawActive();clearTimeout(timer);timer=setTimeout(check,600);};
  host.addEventListener('click',event=>{const copy=event.target.closest('[data-copy]');if(!copy)return;navigator.clipboard?.writeText(copy.dataset.copy).then(()=>{copy.textContent='Copied';setTimeout(()=>{copy.textContent='Copy';},1500);},()=>{});});

  // ─── ACTIONS ───
  async function work(action){if(busy)return;busy=true;host.querySelectorAll('button').forEach(node=>{if(node.id!=='claude-cancel')node.disabled=true;});try{await action();}catch(error){message(error.message);}finally{busy=false;host.querySelectorAll('button').forEach(node=>{node.disabled=false;});drawActive();}}
  $('pair-btn').onclick=()=>work(async()=>{const code=$('pair-code').value.trim();if(!/^\d{8}$/.test(code))throw new Error('Enter the 8-digit pairing code.');await pairService(draft,code);$('pair-code').value='';message('Browser paired.');await check();});
  $('cancel').onclick=()=>controller?.abort();
  $('activate').onclick=()=>work(async()=>{
    const config={...draft};delete config.test;validateProvider('claude',config);
    controller=new AbortController();$('cancel').hidden=false;drawChecks([]);message('Testing Claude CLI with a JSON and a text request…');
    try{
      const test=await testProvider('claude',config,{signal:controller.signal,onStep:drawChecks});
      writeLocalClaude({...config,test});draft={...config};
      message(`Claude CLI is active for Chat, CV Studio and Content on this computer · ${test.resolvedModel||config.model}.`);
    }catch(error){
      const failed=error.checks?.find(item=>item.status!=='pass');if(failed&&failed.key!=='json'&&failed.key!=='text'){lastOk=false;check();}
      throw failed?new Error(`${failed.status==='cancelled'?'Cancelled':'Failed'} at "${failed.label}": ${error.message}`):error;
    }finally{controller=null;$('cancel').hidden=true;}
  });
  $('off').onclick=()=>work(async()=>{writeLocalClaude(null);drawChecks([]);message('Claude CLI turned off on this computer. AI tools now use the shared provider settings.');});
  $('chat').onclick=()=>window._adminNavigate?.('ai');
  const onChange=()=>{if(!host.isConnected){window.removeEventListener('portfolio-ai-settings-changed',onChange);return;}drawActive();};
  window.addEventListener('portfolio-ai-settings-changed',onChange);

  drawStatus();drawDraft();drawActive();
  const saved=readLocalClaude();if(saved&&providerReady('claude',saved.config))drawChecks(saved.config.test.checks);
  return {
    resume(){if(running)return;running=true;check();},
    pause(){running=false;clearTimeout(timer);seq++;},
  };
}
