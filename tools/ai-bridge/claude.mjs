import {spawn,execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {TASK_SCHEMAS} from '../../js/ai/tasks.js';
import {CLAUDE_MODELS,CLAUDE_EFFORTS} from '../../js/ai/settings.js';

export function stopProcessTree(child){
  if(!child?.pid||child.exitCode!==null)return;
  if(process.platform==='win32')execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});
  else{try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}
}
export function runProcess(executable,args,{input='',signal,timeoutMs=10000,cwd,maxOutput=2000000}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(Object.assign(new Error('AI request cancelled.'),{name:'AbortError',code:'cancelled'}));return;}
    const child=spawn(executable,args,{cwd,windowsHide:true,shell:false,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
    let output='',errorText='',settled=false,termination;
    const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve(result);};
    const terminate=error=>{if(termination)return;termination=error;stopProcessTree(child);};
    const abort=()=>terminate(Object.assign(new Error('AI request cancelled.'),{name:'AbortError',code:'cancelled'}));
    const timer=setTimeout(()=>terminate(Object.assign(new Error('Claude CLI timed out.'),{code:'timeout'})),timeoutMs);
    signal?.addEventListener('abort',abort,{once:true});
    child.on('error',()=>finish(Object.assign(new Error('Claude CLI could not start. Check installation.'),{code:'not-installed'})));
    child.stdout.on('data',value=>{if(termination)return;output+=value;if(Buffer.byteLength(output)>maxOutput)terminate(Object.assign(new Error('Claude output exceeded the allowed size.'),{code:'output-too-large'}));});
    child.stderr.on('data',value=>{errorText=(errorText+value).slice(-10000);});
    child.on('close',code=>finish(termination,{code,output,errorText}));
    child.stdin.on('error',()=>{});child.stdin.end(input);
  });
}
export async function findClaude(){
  const names=process.platform==='win32'?['claude.exe',path.join('node_modules','@anthropic-ai','claude-code','bin','claude.exe')]:['claude'];
  const candidates=process.env.PORTFOLIO_CLAUDE_EXE?[process.env.PORTFOLIO_CLAUDE_EXE]:[];
  for(const directory of (process.env.PATH||'').split(path.delimiter).filter(Boolean))for(const name of names)candidates.push(path.join(directory,name));
  for(const candidate of candidates){try{const file=await fs.realpath(candidate);if((await fs.stat(file)).isFile()&&(process.platform!=='win32'||file.endsWith('.exe')))return file;}catch{}}
  throw Object.assign(new Error('Claude CLI is not installed or no native executable was found.'),{code:'not-installed'});
}

// ─── INSPECTION ─────────────────────────────────────────────
// Only a fully usable CLI is cached (for a short time), so logging in or
// updating Claude Code is picked up by the next request without a restart.
export const REQUIRED_FLAGS=['--restricted','--safe-mode','--tools','--strict-mcp-config','--no-session-persistence','--json-schema','--system-prompt-file'];
const INSPECTION_TTL=5*60*1000;
let inspection,inspectedAt=0;
export async function inspectClaude({executable,refresh=false,processRunner=runProcess}={}){
  if(inspection&&!refresh&&!executable&&Date.now()-inspectedAt<INSPECTION_TTL)return inspection;
  const binary=executable||await findClaude();
  const [version,help,auth]=await Promise.all([processRunner(binary,['--version']),processRunner(binary,['--help']),processRunner(binary,['auth','status','--json'])]);
  // --system-prompt-file is accepted but not always listed in --help; it shares the --system-prompt prefix.
  const missingFlags=REQUIRED_FLAGS.filter(flag=>!help.output.includes(flag==='--system-prompt-file'?'--system-prompt':flag));
  let account={};try{account=JSON.parse(auth.output)||{};}catch{}
  const result={binary,installed:version.code===0,version:version.output.trim().slice(0,80),compatible:!missingFlags.length,missingFlags,authenticated:account.loggedIn===true,
    authMethod:String(account.authMethod||'').slice(0,40),subscription:String(account.subscriptionType||'').slice(0,40),models:[...CLAUDE_MODELS],efforts:[...CLAUDE_EFFORTS]};
  if(!executable){const usable=result.installed&&result.compatible&&result.authenticated;inspection=usable?result:null;inspectedAt=usable?Date.now():0;}
  return result;
}

// ─── COMPLETION ─────────────────────────────────────────────
export function claudeArguments(model,task,{effort,systemPromptFile}={}){
  const args=['-p','--model',model,'--output-format','json','--restricted','--safe-mode','--tools','','--disallowedTools','mcp__*','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--no-session-persistence','--max-turns','2'];
  // Replacing Claude Code's default agent prompt cuts ~5k input tokens per request.
  if(systemPromptFile)args.push('--system-prompt-file',systemPromptFile);
  if(effort&&CLAUDE_EFFORTS.includes(effort))args.push('--effort',effort);
  if(TASK_SCHEMAS[task])args.push('--json-schema',JSON.stringify(TASK_SCHEMAS[task]));
  return args;
}
// System messages become the system prompt; the rest is sent on stdin. The minimal
// fallback keeps Claude Code's large default agent prompt out of every request.
export const DEFAULT_SYSTEM_PROMPT='You are a precise assistant. Follow the instructions in the user message exactly.';
export function claudePrompt(messages){
  const system=messages.filter(message=>message.role==='system').map(message=>message.content).join('\n\n')||DEFAULT_SYSTEM_PROMPT;
  const turns=messages.filter(message=>message.role!=='system');
  const input=turns.length===1&&turns[0].role==='user'?turns[0].content:turns.map(message=>`${message.role.toUpperCase()}:\n${message.content}`).join('\n\n');
  return {system,input};
}
export function claudeFailure(value,errorText=''){
  const details=`${value?.result||''} ${value?.terminal_reason||''} ${errorText}`;
  const reason=String(value?.result||'').replace(/\s+/g,' ').trim().slice(0,300);
  const [code,message]=/unrecognized_model|selected model|model.*(not exist|not found|access)/i.test(details)?['model-access',reason||'The selected Claude model is not available for this account.']
    :/auth|log.?in|credential/i.test(details)?['not-authenticated','Claude authentication failed. Run claude auth login on this machine.']
    :/rate|quota|usage limit|overloaded/i.test(details)?['quota','Claude quota or rate limit was reached. Try again later or pick another model.']
    :/max.?turns/i.test(details)?['incomplete-output','Claude stopped before finishing. Reduce the input and retry.']
    :['provider-error',reason?`Claude could not complete this request: ${reason}`:'Claude could not complete this request.'];
  return Object.assign(new Error(message),{code});
}
function usageSummary(value){
  const usage=value.usage||{},model=Object.keys(value.modelUsage||{})[0]||'';
  return {inputTokens:(usage.input_tokens||0)+(usage.cache_read_input_tokens||0)+(usage.cache_creation_input_tokens||0),outputTokens:usage.output_tokens||0,
    costUsd:Number.isFinite(value.total_cost_usd)?value.total_cost_usd:null,durationMs:Number.isFinite(value.duration_ms)?value.duration_ms:null,resolvedModel:model.slice(0,100)};
}
export async function claudeCompletion(config,messages,{task,signal,inspect=inspectClaude,processRunner=runProcess}={}){
  const cli=await inspect();
  if(cli.installed===false)throw Object.assign(new Error('Claude CLI is not installed. Install Claude Code, then test again.'),{code:'not-installed'});
  if(!cli.compatible)throw Object.assign(new Error('Claude CLI lacks the isolation/schema flags required by this application. Update Claude Code.'),{code:'incompatible-version'});
  if(!cli.authenticated)throw Object.assign(new Error('Sign in using claude auth login on this machine, then test again.'),{code:'not-authenticated'});
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'portfolio-ai-'));
  try{
    const {system,input}=claudePrompt(messages),systemPromptFile=path.join(temporary,'system-prompt.txt');
    await fs.writeFile(systemPromptFile,system,{encoding:'utf8',mode:0o600});
    const result=await processRunner(cli.binary,claudeArguments(config.model,task,{effort:config.effort,systemPromptFile}),{cwd:temporary,input,signal,timeoutMs:config.timeoutMs});
    let value;try{value=JSON.parse(result.output);}catch{throw result.code!==0?claudeFailure(null,result.errorText):Object.assign(new Error('Claude CLI returned invalid JSON.'),{code:'invalid-output'});}
    if(result.code!==0||value.is_error)throw claudeFailure(value,result.errorText);
    const text=value.structured_output?JSON.stringify(value.structured_output):value.result;
    if(typeof text!=='string'||!text.trim())throw Object.assign(new Error('Claude returned no response.'),{code:'invalid-output'});
    const usage=usageSummary(value);
    return {text,model:config.model,resolvedModel:usage.resolvedModel,usage};
  }finally{
    const absolute=path.resolve(temporary),root=path.resolve(os.tmpdir())+path.sep;
    if(absolute.startsWith(root)&&path.basename(absolute).startsWith('portfolio-ai-'))await fs.rm(absolute,{recursive:true,force:true});
  }
}
