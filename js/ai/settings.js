export const PROVIDERS = {openai:'OpenAI API',claude:'Claude CLI',custom:'Custom API'};
export const CLAUDE_MODELS = ['sonnet','opus','haiku','fable'];
export const CLAUDE_EFFORTS = ['low','medium','high','xhigh','max'];
export const providerDefaults = id => ({model:id==='claude'?'sonnet':'',effort:'',baseUrl:id==='openai'?'https://api.openai.com/v1':'',bridgeUrl:'',credentialMode:'server',secretVersion:'',timeoutMs:90000,structured:true});
export function settingsFingerprint(id, config) {
  // effort is appended only when set so configs tested before it existed stay Ready.
  const source=JSON.stringify([id,config.model,config.baseUrl,config.bridgeUrl,config.credentialMode,config.secretVersion,config.apiKey||'',config.timeoutMs,config.structured,...(config.effort?[config.effort]:[])]);
  let hash=2166136261;for(const character of source)hash=Math.imul(hash^character.charCodeAt(0),16777619);
  return (hash>>>0).toString(16).padStart(8,'0');
}
export function normalizeSettings(value) {
  const providers=Object.fromEntries(Object.keys(PROVIDERS).map(id=>[id,{...providerDefaults(id),...value?.providers?.[id]}]));
  if(value?.version!==2&&value?.baseUrl){
    providers.custom={...providers.custom,baseUrl:value.baseUrl,model:value.model||'',apiKey:value.apiKey||'',credentialMode:'legacy',structured:false};
    if(value.connectionStatus==='success'&&value.connectionTested!==false)providers.custom.test={status:'success',fingerprint:settingsFingerprint('custom',providers.custom),testedAt:value.lastTested||value.updatedAt||'',capabilities:['text','json']};
  }
  return {version:2,_revision:Number(value?._revision||0),activeProvider:Object.hasOwn(PROVIDERS,value?.activeProvider)?value.activeProvider:'custom',providers,defaultContextIds:Array.isArray(value?.defaultContextIds)?value.defaultContextIds:[],updatedAt:value?.updatedAt||''};
}
export function providerReady(id, config) {
  return !!config?.model&&config.test?.status==='success'&&config.test.fingerprint===settingsFingerprint(id,config);
}
export function activeProvider(settings) {
  const normalized=normalizeSettings(settings),id=normalized.activeProvider;
  return {id,config:normalized.providers[id],ready:providerReady(id,normalized.providers[id]),label:PROVIDERS[id]};
}
export function validateProvider(id, value) {
  if(!Object.hasOwn(PROVIDERS,id))throw new Error('Unknown AI provider.');
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,149}$/.test(value.model||''))throw new Error('Choose a valid model ID.');
  if(id==='openai'&&value.baseUrl!=='https://api.openai.com/v1')throw new Error('OpenAI uses https://api.openai.com/v1. Use Custom API for other endpoints.');
  if(id==='custom'){const url=new URL(value.baseUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('Use a valid API base URL without credentials, query or fragment.');}
  if(value.bridgeUrl){const url=new URL(value.bridgeUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('Use a valid AI service URL.');}
  if(value.effort&&(id!=='claude'||!CLAUDE_EFFORTS.includes(value.effort)))throw new Error('Effort must be low, medium, high, xhigh or max (Claude CLI only).');
  if(!Number.isFinite(Number(value.timeoutMs))||value.timeoutMs<5000||value.timeoutMs>180000)throw new Error('Timeout must be between 5 and 180 seconds.');
  return value;
}
