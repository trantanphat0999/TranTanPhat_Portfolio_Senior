export function httpError(status){const message=({400:'The model or request format is not supported.',401:'The provider credential is invalid or missing.',403:'This account cannot access the selected model.',404:'The endpoint or model was not found.',429:'The provider rate limit or quota was reached.'})[status]||`AI provider request failed (${status}).`;return Object.assign(new Error(message),{code:({401:'not-authenticated',403:'model-access',429:'quota'})[status]||'provider-error',status});}
export async function boundedText(response,maxBytes=2000000){
  if(!response.body)return '';
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Object.assign(new Error('AI provider output exceeded the allowed size.'),{code:'output-too-large'});}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
function parseJson(text){try{return JSON.parse(text);}catch{throw Object.assign(new Error('AI provider returned invalid JSON.'),{code:'invalid-output'});}}
export async function providerJson(url,options,fetcher=fetch){const response=await fetcher(url,options);if(!response.ok)throw httpError(response.status);return parseJson(await boundedText(response));}
export function extractChatContent(value){
  const content=value?.choices?.[0]?.message?.content??value?.choices?.[0]?.delta?.content??value?.response??value?.message?.content;
  if(Array.isArray(content))return content.map(item=>item.text||'').join('');
  return typeof content==='string'?content:'';
}
export async function customCompletion(config,messages,{signal,task,fetcher=fetch}={}){
  const response=await fetcher(`${config.baseUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',...(config.key?{Authorization:`Bearer ${config.key}`}:{})},signal,body:JSON.stringify({model:config.model,messages,max_tokens:['portfolio-import','jd-preparation'].includes(task)?16000:4000,temperature:.3,stream:false})});
  if(!response.ok)throw httpError(response.status);
  const raw=await boundedText(response);let text='';
  if(raw.trim().startsWith('data:')){for(const line of raw.split('\n'))if(line.startsWith('data:')&&!line.includes('[DONE]')){try{text+=extractChatContent(JSON.parse(line.slice(5).trim()));}catch{}}}
  else text=extractChatContent(parseJson(raw));
  if(!text.trim())throw Object.assign(new Error('The provider returned an empty response.'),{code:'invalid-output'});
  return {text,model:config.model};
}
export async function openaiCompletion(config,messages,{schema,task,signal,fetcher=fetch}={}){
  if(!config.key)throw Object.assign(new Error('Add an OpenAI API key to the AI service first.'),{code:'not-authenticated'});
  const body={model:config.model,input:messages,max_output_tokens:task==='connection-test'?1024:['portfolio-import','jd-preparation'].includes(task)?16000:6000,store:false};
  if(schema)body.text={format:{type:'json_schema',name:task.replaceAll('-','_'),schema,strict:true}};
  const value=await providerJson('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.key}`},signal,body:JSON.stringify(body)},fetcher);
  const content=(value.output||[]).flatMap(item=>item.content||[]);
  if(content.some(item=>item.type==='refusal'))throw Object.assign(new Error('The model declined this request. Edit the input and try again.'),{code:'refusal'});
  if(value.status&&value.status!=='completed')throw Object.assign(new Error('The provider response was incomplete. Reduce the input or change the model.'),{code:'incomplete-output'});
  const text=content.filter(item=>item.type==='output_text').map(item=>item.text).join('')||value.output_text||'';
  if(!text.trim())throw Object.assign(new Error('The provider returned no text.'),{code:'invalid-output'});
  return {text,model:value.model||config.model,usage:value.usage||null};
}
