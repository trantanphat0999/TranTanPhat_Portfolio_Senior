import {normalizeSettings,activeProvider,settingsFingerprint,validateProvider} from './settings.js';
import {TASKS,taskInstructions,parseStructured,isTextTask,ECHO_TOKEN} from './tasks.js';
import {customCompletion} from './adapters/http.js';

const pairs=new Map(),health=new Map(),activeRequests=new Set();let authEpoch=0;
const clone=value=>JSON.parse(JSON.stringify(value));
// ─── LOCAL CLAUDE CLI ───────────────────────────────────────
// Claude CLI only runs on this computer, so its activation lives in this browser
// (localStorage) and never depends on Firestore rules or sync.
const LOCAL_CLAUDE_KEY='portfolio.claudeLocal';
export function readLocalClaude(){try{const value=JSON.parse(localStorage.getItem(LOCAL_CLAUDE_KEY)||'null');return value?.active&&value.config&&typeof value.config==='object'?value:null;}catch{return null;}}
export function writeLocalClaude(config){
  try{if(config)localStorage.setItem(LOCAL_CLAUDE_KEY,JSON.stringify({active:true,config,updatedAt:new Date().toISOString()}));else localStorage.removeItem(LOCAL_CLAUDE_KEY);}
  catch(error){throw new Error(`This browser blocked local storage, so Claude CLI cannot be activated here (${error.message}).`);}
  window.dispatchEvent(new CustomEvent('portfolio-ai-settings-changed'));
}
export function withLocalClaude(value){const settings=normalizeSettings(value),local=readLocalClaude();if(local){settings.providers.claude={...settings.providers.claude,...local.config};settings.activeProvider='claude';settings.localClaude=true;}return settings;}
export async function loadSharedAiSettings(){const api=await import('../firebase-config.js');return normalizeSettings(await api.readAiConfig());}
export async function loadAiSettings(){return withLocalClaude(await loadSharedAiSettings());}
// Without an explicit URL the page talks to itself when served by admin:local (5180),
// otherwise to the default local service.
export const LOCAL_SERVICE='http://127.0.0.1:5180';
const servedByService=()=>!!document.querySelector('meta[name="portfolio-ai-service"]')||((location.hostname==='127.0.0.1'||location.hostname==='localhost')&&location.port==='5180');
export function serviceBase(config){return String(config.bridgeUrl||(servedByService()?location.origin:LOCAL_SERVICE)).replace(/\/$/,'');}
async function ownerToken(){const api=await import('../firebase-config.js'),user=api.getAdminUser();if(!user?.getIdToken)throw new Error('Sign in as Admin before using the AI service.');return user.getIdToken();}
export async function serviceHealth(config){
  const base=serviceBase(config);let response,value=null;
  try{response=await fetch(`${base}/api/admin-ai/health`,{signal:AbortSignal.timeout(5000)});}
  catch(error){
    health.delete(base);
    const blocked=location.protocol==='https:'&&base.startsWith('http:')&&!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(base);
    throw Object.assign(new Error(error.name==='TimeoutError'?`The AI service at ${base} did not respond within 5 seconds.`:blocked?`This HTTPS page cannot call the HTTP service ${base}. Use an HTTPS service URL.`:`No AI service is running at ${base}. Start it with npm run admin:local, then retry.`),{code:'service-offline',base});
  }
  try{value=await response.json();}catch{}
  if(!response.ok||value?.service!=='portfolio-ai'||value.version!==1){health.delete(base);throw Object.assign(new Error(`${base} answered, but it is not a compatible Portfolio AI service.`),{code:'service-incompatible',base});}
  if(value.originAllowed===false){health.delete(base);throw Object.assign(new Error(`The AI service at ${base} does not accept requests from ${location.origin}. Open the admin at ${base}/ or add this origin to PORTFOLIO_ALLOWED_ORIGINS.`),{code:'forbidden-origin',base});}
  health.set(base,value);return value;
}
function storedPair(base){let pair=pairs.get(base);if(!pair){try{pair=JSON.parse(sessionStorage.getItem(`portfolio.aiPair:${base}`)||'null');}catch{}}return pair;}
// Pairing state from the last successful health check (no network request).
export const isLoopback=base=>/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base);
export function pairingState(config){const base=serviceBase(config),status=health.get(base),pair=storedPair(base);return {checked:!!status,required:!!status?.requiresPair,paired:!!pair&&pair.expires>Date.now(),expires:pair?.expires||0};}
async function headers(config){
  const base=serviceBase(config),status=health.get(base)||await serviceHealth(config);
  const token=await ownerToken(),pair=storedPair(base);
  if(status.requiresPair&&(!pair||pair.expires<Date.now()))throw Object.assign(new Error('Enter the pairing code printed by npm run admin:local in Settings.'),{code:'not-paired'});
  return {'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(status.requiresPair?{'X-Portfolio-Pair':pair.token}:{})};
}
async function request(config,route,{method='POST',input,signal,preparedHeaders}={}){
  const response=await fetch(`${serviceBase(config)}/api/admin-ai/${route}`,{method,headers:preparedHeaders||await headers(config),...(input===undefined?{}:{body:JSON.stringify(input)}),signal});
  const value=await response.json();if(!response.ok)throw Object.assign(new Error(value.error?.message||'AI service request failed.'),{code:value.error?.code||'service-error'});return value;
}
export async function pairService(config,code){
  await serviceHealth(config);const response=await fetch(`${serviceBase(config)}/api/admin-ai/pair`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await ownerToken()}`},body:JSON.stringify({code})});
  const value=await response.json();if(!response.ok)throw new Error(value.error?.message||'Pairing failed.');const base=serviceBase(config);pairs.set(base,value);sessionStorage.setItem(`portfolio.aiPair:${base}`,JSON.stringify(value));return value;
}
export async function saveCredential(id,config,key){return request(config,'credential',{input:{provider:id,key}});}
export async function probeProvider(id,config){return request(config,'probe',{input:{provider:id}});}
export async function listModels(id,config){return request(config,'models',{input:{provider:id,config:{...config,model:config.model||'catalog'}}});}

async function bridgeCompletion(id,config,task,messages,signal){
  const preparedHeaders=await headers(config);
  const job=await request(config,'jobs',{input:{provider:id,config,task,messages},signal,preparedHeaders});
  const cancel=()=>{request(config,`jobs/${job.requestId}`,{method:'DELETE',preparedHeaders}).catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted)cancel();
  try{
    while(true){
      if(signal?.aborted)throw new DOMException('AI request cancelled.','AbortError');
      const value=await request(config,`jobs/${job.requestId}`,{method:'GET',signal,preparedHeaders});
      if(value.status==='completed')return value.result;
      if(['failed','cancelled'].includes(value.status))throw Object.assign(new Error(value.error?.message||'AI request cancelled.'),{code:value.error?.code||'cancelled'});
      await new Promise((resolve,reject)=>{const timeout=setTimeout(done,350);function done(){signal?.removeEventListener('abort',abort);resolve();}function abort(){clearTimeout(timeout);signal?.removeEventListener('abort',abort);reject(new DOMException('AI request cancelled.','AbortError'));}signal?.addEventListener('abort',abort,{once:true});});
    }
  }finally{signal?.removeEventListener('abort',cancel);}
}
export async function selectedContext(ids){
  if(!ids?.length)return {items:[],fingerprint:'[]'};
  const api=await import('../firebase-config.js'),document=await api.readAdminDoc('context-library');
  const items=(document?.items||[]).filter(item=>item.enabled!==false&&ids.includes(item.id));
  if(items.length!==new Set(ids).size)throw new Error('Some selected contexts were removed or disabled. Update your context selection.');
  return {items:items.map(({id,title,text,purpose,revision})=>({id,title,text,purpose,revision})),fingerprint:JSON.stringify(items.map(item=>[item.id,item.revision]))};
}
export async function runAi({task,input,contextIds,signal,settingsOverride}){
  if(!TASKS.includes(task))throw new Error('Unsupported AI task.');
  const session=authEpoch;
  const settings=clone(settingsOverride||await loadAiSettings()),{id,config,ready}=activeProvider(settings);
  if(!task.startsWith('connection-')&&!ready)throw new Error('Choose and test the active provider/model in AI Settings first.');
  validateProvider(id,config);
  const contexts=await selectedContext(contextIds??settings.defaultContextIds),fingerprint=settingsFingerprint(id,config);
  if(session!==authEpoch)throw new Error('Admin session changed. Generate again.');
  const messages=task==='chat'&&input.messages?[{role:'system',content:taskInstructions(task)},...input.messages.slice(-20),{role:'system',content:JSON.stringify({portfolio:input.portfolio,contexts:contexts.items})}]:[{role:'system',content:taskInstructions(task)},{role:'user',content:JSON.stringify({...input,contexts:contexts.items})}];
  const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timeout=setTimeout(()=>controller.abort('timeout'),config.timeoutMs);
  activeRequests.add(controller);if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  try{
    const result=id==='custom'&&config.credentialMode==='legacy'?await customCompletion({...config,key:atob(config.apiKey||'')},messages,{signal:controller.signal}):await bridgeCompletion(id,config,task,messages,controller.signal);
    if(session!==authEpoch)throw new Error('Admin session changed. Generate again.');
    const structured=isTextTask(task)?null:result.structured||parseStructured(result.text,task);
    if(!settingsOverride){const current=activeProvider(await loadAiSettings());if(current.id!==id||settingsFingerprint(id,current.config)!==fingerprint)throw new Error('AI provider or model changed. Generate a new response.');}
    if((await selectedContext(contextIds??settings.defaultContextIds)).fingerprint!==contexts.fingerprint)throw new Error('Selected AI context changed. Generate a new response.');
    if(controller.signal.aborted)throw new DOMException('AI request cancelled.','AbortError');
    return {...result,structured,provider:id,model:result.model||config.model,fingerprint,contextFingerprint:contexts.fingerprint};
  }catch(error){if(controller.signal.aborted)throw Object.assign(new Error(controller.signal.reason==='timeout'?'AI request timed out.':'AI request cancelled.'),{name:'AbortError',code:controller.signal.reason==='timeout'?'timeout':'cancelled'});throw error;}
  finally{activeRequests.delete(controller);clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
// ─── CONNECTION TEST ────────────────────────────────────────
// Checks every layer in order (service → admin access → provider → JSON call →
// text call) and reports each step, so a failure names the layer that broke.
export function describeProbe(id,probe){
  if(id==='claude'){
    if(probe.localOnly)throw new Error('Claude CLI runs only through the local AI service (npm run admin:local), not a hosted backend.');
    if(!probe.installed)throw new Error(probe.error||'Claude CLI not found. Install Claude Code (npm i -g @anthropic-ai/claude-code) or set PORTFOLIO_CLAUDE_EXE, then restart the AI service.');
    if(!probe.compatible)throw new Error(`Claude CLI ${probe.version||''} is missing ${(probe.missingFlags||[]).join(', ')||'required flags'}. Run claude update.`);
    if(!probe.authenticated)throw new Error('Claude CLI is not signed in. Run claude auth login on the machine running the AI service.');
    return `${probe.version} · signed in${probe.authMethod?` via ${probe.authMethod}`:''}${probe.subscription?` (${probe.subscription})`:''}`;
  }
  if(id==='openai'&&!probe.hasKey)throw new Error('No OpenAI API key on the AI service. Save a key first.');
  return probe.hasKey?'API key stored on the AI service':'No API key stored (endpoint without auth)';
}
const usageText=result=>{const usage=result.usage||{},parts=[];if(usage.inputTokens||usage.outputTokens)parts.push(`${usage.inputTokens||0}→${usage.outputTokens||0} tokens`);if(Number.isFinite(usage.costUsd)&&usage.costUsd>0)parts.push(`$${usage.costUsd.toFixed(4)}`);return parts.length?` · ${parts.join(' · ')}`:'';};
export async function testProvider(id,config,{signal,onStep}={}){
  const settings=normalizeSettings({version:2,activeProvider:id,providers:{[id]:config}}),checks=[];
  const report=()=>onStep?.(clone(checks));
  async function step(key,label,action){
    const check={key,label,status:'running',detail:'',ms:0},started=performance.now();checks.push(check);report();
    try{const value=await action();check.status='pass';check.detail=typeof value==='string'?value:value?.detail||'';return value;}
    catch(error){check.status=error.name==='AbortError'?'cancelled':'fail';check.detail=error.message;error.checks=clone(checks);throw error;}
    finally{check.ms=Math.round(performance.now()-started);report();}
  }
  const call=task=>runAi({task,input:{},contextIds:[],signal,settingsOverride:settings});
  if(!(id==='custom'&&settings.providers.custom.credentialMode==='legacy')){
    await step('service','AI service reachable',async()=>{const value=await serviceHealth(config);const base=serviceBase(config);return `${base} · ${isLoopback(base)?'local service on this computer':'hosted API'}`;});
    const probe=await step('access',health.get(serviceBase(config))?.requiresPair?'Admin sign-in & pairing accepted':'Admin sign-in accepted',async()=>({probe:await probeProvider(id,config),detail:'Firebase owner token verified'}));
    await step('provider',id==='claude'?'Claude CLI installed & signed in':'Provider credential',async()=>{
      const detail=describeProbe(id,probe.probe);
      if(config.secretVersion&&probe.probe.secretVersion!==config.secretVersion)throw new Error('The key on the AI service changed. Click "Check installation / credential", then test again.');
      return detail;
    });
  }
  const json=await step('json',`Structured JSON reply from ${config.model}`,async()=>{const result=await call('connection-test');if(result.structured?.ok!==true)throw new Error('The model did not return the expected JSON {"ok":true}.');return {result,detail:`${result.resolvedModel||result.model}${usageText(result)}`};});
  await step('text','Plain-text reply',async()=>{const result=await call('connection-echo');if(!String(result.text).includes(ECHO_TOKEN))throw new Error('The model replied, but not with the expected test phrase.');return `${usageText(result).replace(/^ · /,'')||'ok'}`;});
  const jsonCheck=checks.find(check=>check.key==='json');
  return {status:'success',fingerprint:settingsFingerprint(id,config),testedAt:new Date().toISOString(),latencyMs:jsonCheck.ms,capabilities:['text','json'],model:json.result.model||config.model,resolvedModel:json.result.resolvedModel||'',checks:checks.map(({key,label,status,detail,ms})=>({key,label,status,detail,ms}))};
}
export async function assertAiCurrent(result,contextIds){const settings=await loadAiSettings(),current=activeProvider(settings);if(current.id!==result.provider||settingsFingerprint(current.id,current.config)!==result.fingerprint||(await selectedContext(contextIds??settings.defaultContextIds)).fingerprint!==result.contextFingerprint)throw new Error('AI configuration or context changed. Generate a new suggestion.');}
if(typeof window!=='undefined')window.addEventListener('portfolio-auth-state',event=>{if(!event.detail.signedIn){authEpoch++;for(const controller of activeRequests)controller.abort('session-ended');activeRequests.clear();pairs.clear();health.clear();try{for(let index=sessionStorage.length-1;index>=0;index--){const key=sessionStorage.key(index);if(key?.startsWith('portfolio.aiPair:'))sessionStorage.removeItem(key);}}catch{}}});
