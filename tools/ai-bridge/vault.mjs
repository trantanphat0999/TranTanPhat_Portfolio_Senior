import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
export class SecretVault{
  constructor(file=path.join(process.env.LOCALAPPDATA||os.homedir(),'PortfolioStudio','ai-providers.json')){this.file=path.resolve(file);this.chain=Promise.resolve();}
  async read(){try{return JSON.parse(await fs.readFile(this.file,'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw new Error('AI credential storage could not be read.');}}
  async get(id){const entry=(await this.read())[id];if(entry)return entry;const key=id==='openai'?process.env.OPENAI_API_KEY:id==='custom'?process.env.PORTFOLIO_CUSTOM_API_KEY:null;return key?{key,version:createHash('sha256').update(key).digest('hex').slice(0,16)}:null;}
  async status(id){const entry=await this.get(id);return {hasKey:!!entry?.key,secretVersion:entry?.version||''};}
  async save(id,key){
    if(!['openai','custom'].includes(id)||typeof key!=='string'||key.length>5000||/[\r\n]/.test(key))throw new Error('Invalid provider credential.');
    const job=this.chain.then(async()=>{const value=await this.read();if(key)value[id]={key,version:randomUUID()};else delete value[id];await fs.mkdir(path.dirname(this.file),{recursive:true});const temporary=`${this.file}.${randomUUID()}.tmp`;await fs.writeFile(temporary,JSON.stringify(value),{mode:0o600});await fs.rename(temporary,this.file);return this.status(id);});
    this.chain=job.catch(()=>{});return job;
  }
}
