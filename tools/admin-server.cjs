const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomBytes,timingSafeEqual}=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.ttf':'font/ttf'};
const failure=(message,code='invalid-request',status=400)=>Object.assign(new Error(message),{code,status});

async function createAdminServer(options={}){
  const [{verifyOwnerToken},{SecretVault},cli,httpAdapters,settings,tasks]=await Promise.all([import('./ai-bridge/auth.mjs'),import('./ai-bridge/vault.mjs'),import('./ai-bridge/claude.mjs'),import('../js/ai/adapters/http.js'),import('../js/ai/settings.js'),import('../js/ai/tasks.js')]);
  const port=options.port??5180,apiOnly=!!options.apiOnly;
  // Local pages plus the published portfolio, so Admin Mode on GitHub Pages can use this machine's Claude CLI.
  const origins=new Set(options.origins||[`http://127.0.0.1:${port}`,`http://localhost:${port}`,'http://127.0.0.1:5173','http://localhost:5173','https://trantanphat0999.github.io']);
  const allowedHosts=new Set(options.allowedHosts||[`127.0.0.1:${port}`,`localhost:${port}`]);
  const verify=options.verifyAuth||((token)=>verifyOwnerToken(token,{projectId:process.env.PORTFOLIO_FIREBASE_PROJECT||'portfolio-project-9770e',ownerEmail:process.env.PORTFOLIO_OWNER_EMAIL||'trantanphat190999@gmail.com'}));
  const vault=options.vault||new SecretVault();
  // The service binds to 127.0.0.1, checks Host and Origin, and verifies the owner's Firebase token on every
  // request; a pairing code is an optional extra factor (PORTFOLIO_REQUIRE_PAIRING=1).
  const requirePairing=!apiOnly&&(options.requirePairing??process.env.PORTFOLIO_REQUIRE_PAIRING==='1');
  const pairingCode=options.pairingCode||String(Number.parseInt(randomBytes(4).toString('hex'),16)%100000000).padStart(8,'0');
  const pairExpires=Date.now()+24*60*60*1000,sessions=new Map(),jobs=new Map(),queue=[];
  const fetcher=options.fetcher||fetch,inspect=options.inspectClaude||cli.inspectClaude;
  let running=0,closed=false;
  function json(res,status,value,origin){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin&&origins.has(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})});res.end(JSON.stringify(value));}
  async function body(req){
    if(!/^application\/json\b/.test(req.headers['content-type']||''))throw failure('Send JSON request data.');
    let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>256000)throw failure('The AI request is too large.','payload-too-large',413);chunks.push(chunk);}
    try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw failure('Invalid JSON request.');}
  }
  async function authenticate(req,paired=true){
    const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)throw failure('Sign in as Admin first.','unauthenticated',401);
    let owner;try{owner=await verify(token);}catch{throw failure('Admin authentication failed. Sign in again.','unauthenticated',401);}
    if(requirePairing&&paired){const session=sessions.get(req.headers['x-portfolio-pair']);if(!session||session.uid!==owner.uid||session.expires<Date.now())throw failure('Pair this browser with the local AI service in Settings.','not-paired',403);}
    return owner;
  }
  function providerInput(input){
    const id=input.provider,config=settings.providerDefaults(id);for(const key of ['model','baseUrl','timeoutMs','structured','secretVersion','effort'])if(Object.hasOwn(input.config||{},key))config[key]=input.config[key];
    if(config.credentialMode==='legacy')config.credentialMode='server';
    settings.validateProvider(id,config);
    return {id,config};
  }
  async function runProvider(id,config,messages,task,signal){
    if(id==='claude'){
      if(apiOnly)throw failure('Claude CLI is available only through the local AI service.','local-only',400);
      return (options.claudeCompletion||cli.claudeCompletion)(config,messages,{task,signal,inspect});
    }
    const entry=await vault.get(id);
    if(config.secretVersion&&entry?.version!==config.secretVersion)throw failure('Provider credentials changed. Check and test the connection again.','stale-config',409);
    const credential={...config,key:entry?.key||''};
    return id==='openai'?httpAdapters.openaiCompletion(credential,messages,{schema:tasks.TASK_SCHEMAS[task],task,signal,fetcher}):httpAdapters.customCompletion(credential,messages,{signal,fetcher});
  }
  function pump(){
    while(!closed&&running<2&&queue.length){const job=queue.shift();if(job.controller.signal.aborted)continue;running++;job.status='running';job.startedAt=Date.now();
      const timeout=setTimeout(()=>job.controller.abort('timeout'),job.config.timeoutMs);
      runProvider(job.provider,job.config,job.messages,job.task,job.controller.signal).then(result=>{
        if(job.controller.signal.aborted)throw failure('AI request cancelled.','cancelled',499);
        const structured=tasks.isTextTask(job.task)?null:tasks.parseStructured(result.text,job.task);
        job.result={text:result.text,structured,provider:job.provider,model:result.model,resolvedModel:result.resolvedModel||'',usage:result.usage||null,serviceMs:Date.now()-job.startedAt};job.status='completed';
      }).catch(error=>{job.status=job.controller.signal.aborted?'cancelled':'failed';job.error={code:job.controller.signal.reason==='timeout'?'timeout':error.code||'provider-error',message:job.controller.signal.aborted?'AI request cancelled or timed out.':error.message};})
      .finally(()=>{clearTimeout(timeout);job.finishedAt=Date.now();job.messages=[];running--;pump();});
    }
  }
  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    try{
      if(!apiOnly&&!allowedHosts.has(req.headers.host))throw failure('Unexpected service host.','forbidden-host',403);
      const url=new URL(req.url,'http://service.local');
      if(url.pathname.startsWith('/api/admin-ai/')){
        // Health is public metadata: readable from any origin so the admin UI can tell
        // "service offline" apart from "this origin is not allowed".
        if(req.method==='GET'&&url.pathname==='/api/admin-ai/health'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})});res.end(JSON.stringify({service:'portfolio-ai',version:1,requiresPair:requirePairing,originAllowed:!origin||origins.has(origin)}));return;}
        if(origin&&!origins.has(origin))throw failure('This browser origin is not allowed.','forbidden-origin',403);
        if(req.method==='OPTIONS'){if(!origin)throw failure('Missing browser origin.');res.writeHead(204,{'Access-Control-Allow-Origin':origin,Vary:'Origin','Access-Control-Allow-Headers':'Authorization,Content-Type,X-Portfolio-Pair','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Max-Age':'600',...(req.headers['access-control-request-private-network']==='true'?{'Access-Control-Allow-Private-Network':'true'}:{})});res.end();return;}
        // Browsers omit Origin on same-origin GETs (e.g. job polling from a page this service serves);
        // Sec-Fetch-Site is set by the browser itself and cannot be changed by page scripts.
        const sameOrigin=!origin&&!apiOnly&&req.headers['sec-fetch-site']==='same-origin';
        if(!origin&&!sameOrigin)throw failure('A browser origin is required.','forbidden-origin',403);
        if(req.method==='POST'&&url.pathname==='/api/admin-ai/pair'){
          const owner=await authenticate(req,false),input=await body(req),candidate=Buffer.from(String(input.code||'')),expected=Buffer.from(pairingCode);
          if(Date.now()>pairExpires||candidate.length!==expected.length||!timingSafeEqual(candidate,expected))throw failure('The pairing code is incorrect or expired.','not-paired',403);
          const token=randomBytes(32).toString('hex'),expires=Date.now()+30*60*1000;sessions.set(token,{uid:owner.uid,expires});json(res,200,{token,expires},origin);return;
        }
        const owner=await authenticate(req);
        if(req.method==='POST'&&url.pathname==='/api/admin-ai/credential'){
          const input=await body(req);json(res,200,await vault.save(input.provider,input.key),origin);return;
        }
        if(req.method==='POST'&&url.pathname==='/api/admin-ai/probe'){
          const input=await body(req);if(!Object.hasOwn(settings.PROVIDERS,input.provider))throw failure('Unknown provider.');
          if(input.provider==='claude'){
            if(apiOnly){json(res,200,{installed:false,compatible:false,authenticated:false,localOnly:true},origin);return;}
            let result;try{result=await inspect({refresh:true});}catch(error){json(res,200,{installed:false,compatible:false,authenticated:false,error:error.message},origin);return;}
            json(res,200,{installed:result.installed,version:result.version,compatible:result.compatible,missingFlags:result.missingFlags||[],authenticated:result.authenticated,authMethod:result.authMethod||'',subscription:result.subscription||'',models:result.models||[]},origin);
          }else json(res,200,{serviceReady:true,...await vault.status(input.provider)},origin);
          return;
        }
        if(req.method==='POST'&&url.pathname==='/api/admin-ai/models'){
          const {id,config}=providerInput(await body(req));let models;
          if(id==='claude'){if(apiOnly)throw failure('Use the local service for Claude.');models=(await inspect()).models;}
          else{const entry=await vault.get(id);if(!entry?.key&&id==='openai')throw failure('Add an OpenAI API key first.','not-authenticated',401);const value=await httpAdapters.providerJson(`${config.baseUrl.replace(/\/$/,'')}/models`,{headers:entry?.key?{Authorization:`Bearer ${entry.key}`}:{},signal:AbortSignal.timeout(15000)},fetcher);models=(value.data||[]).map(item=>item.id).filter(id=>typeof id==='string'&&!/embed|audio|transcrib|tts|whisper|image|dall|sora|moderation/i.test(id));}
          json(res,200,{models:[...new Set(models)].slice(0,150)},origin);return;
        }
        if(req.method==='POST'&&url.pathname==='/api/admin-ai/jobs'){
          if(queue.length>=10)throw failure('The AI service queue is full. Try again later.','busy',429);
          const input=await body(req),{id,config}=providerInput(input);
          if(!tasks.TASKS.includes(input.task))throw failure('Unsupported AI task.');
          if(!Array.isArray(input.messages)||input.messages.length>30||input.messages.some(message=>!['system','user','assistant'].includes(message.role)||typeof message.content!=='string'||message.content.length>160000))throw failure('Invalid AI messages.');
          // Connection checks ignore client messages so a test can never carry portfolio data.
          const messages=input.task==='connection-test'?[{role:'user',content:'Return JSON {"ok":true}.'}]:input.task==='connection-echo'?[{role:'system',content:tasks.taskInstructions('connection-echo')},{role:'user',content:'Connection check.'}]:input.messages;
          const requestId=randomBytes(16).toString('hex'),job={requestId,uid:owner.uid,provider:id,config,task:input.task,messages,controller:new AbortController(),status:'queued',createdAt:Date.now()};
          jobs.set(requestId,job);queue.push(job);pump();json(res,202,{requestId,status:job.status},origin);return;
        }
        const match=url.pathname.match(/^\/api\/admin-ai\/jobs\/([a-f0-9]{32})$/);
        if(match){const job=jobs.get(match[1]);if(!job||job.uid!==owner.uid)throw failure('AI job not found.','not-found',404);
          if(req.method==='DELETE'){job.controller.abort('cancelled');if(job.status==='queued'){job.status='cancelled';job.finishedAt=Date.now();job.messages=[];}json(res,200,{status:'cancelled'},origin);return;}
          if(req.method==='GET'){json(res,200,{requestId:job.requestId,status:job.status,...(job.result?{result:job.result}:{}),...(job.error?{error:job.error}:{})},origin);return;}
        }
        throw failure('AI endpoint not found.','not-found',404);
      }
      if(apiOnly)throw failure('Not found.','not-found',404);
      if(!['GET','HEAD'].includes(req.method))throw failure('Method not allowed.','method-not-allowed',405);
      let relative;try{relative=decodeURIComponent(url.pathname);}catch{throw failure('Invalid file path.');}
      if(relative==='/')relative='/index.html';
      const file=path.resolve(ROOT,`.${relative}`);
      if(!file.startsWith(ROOT+path.sep)||relative.split('/').some(part=>part.startsWith('.')||part==='node_modules'))throw failure('Forbidden file.','forbidden-file',403);
      let data;try{const real=await fs.realpath(file);if(!real.startsWith(ROOT+path.sep))throw failure('Forbidden file.','forbidden-file',403);data=await fs.readFile(real);}catch(error){if(error.status)throw error;throw failure('Not found.','not-found',404);}
      // Tell the admin page that this origin is the AI service, whatever port it runs on.
      if(relative==='/index.html')data=Buffer.from(data.toString('utf8').replace('<head>','<head>\n<meta name="portfolio-ai-service" content="same-origin">'));
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){json(res,error.status||500,{error:{code:error.code||'service-error',message:error.message||'AI service failed.'}},origin);}
  });
  const cleanup=setInterval(()=>{const now=Date.now();for(const [key,value]of sessions)if(value.expires<now)sessions.delete(key);for(const [key,value]of jobs)if(value.finishedAt&&now-value.finishedAt>300000){value.messages=[];jobs.delete(key);}},30000);cleanup.unref();
  server.on('close',()=>{closed=true;clearInterval(cleanup);for(const job of jobs.values())job.controller.abort('shutdown');});
  return {server,pairingCode,requirePairing,jobs,inspect};
}
module.exports={createAdminServer};
if(require.main===module){
  const port=Number(process.env.PORT||process.argv.slice(2).find(value=>/^\d+$/.test(value))||5180),apiOnly=process.argv.includes('--api-only');
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
  const origins=process.env.PORTFOLIO_ALLOWED_ORIGINS?.split(',').map(value=>value.trim()).filter(Boolean);
  if(apiOnly&&!origins?.length){console.error('Set PORTFOLIO_ALLOWED_ORIGINS for the API-only service.');process.exitCode=1;}
  else createAdminServer({port,apiOnly,origins}).then(({server,pairingCode,requirePairing,inspect})=>server.listen(port,apiOnly?'0.0.0.0':'127.0.0.1',()=>{console.log(`Portfolio Admin: http://127.0.0.1:${port}`);if(requirePairing)console.log(`AI pairing code: ${pairingCode} (enter in Admin Settings)`);
    if(!apiOnly)inspect({refresh:true}).then(cli=>console.log(cli.installed&&cli.compatible&&cli.authenticated?`Claude CLI ready: ${cli.version} (${cli.authMethod||'signed in'}). Keep this window open while using AI.`:!cli.compatible?`Claude CLI ${cli.version} is missing ${cli.missingFlags.join(', ')}. Run: claude update`:'Claude CLI is not signed in. Run: claude auth login'),error=>console.log(`Claude CLI not available: ${error.message}`));})).catch(error=>{console.error(error.message);process.exitCode=1;});
}
