export const MAX_PDF_BYTES=10*1024*1024;
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function describePdf(blob){
 if(!blob||blob.size<8||blob.size>MAX_PDF_BYTES)throw new Error('PDF artifact must be between 8 bytes and 10 MiB.');
 const bytes=await blob.arrayBuffer();if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('Invalid PDF artifact.');
 const hash=await sha256(bytes);return {hash,bytes:blob.size,contentType:'application/pdf',path:`cv-artifacts/${hash}.pdf`};
}
export function validateArtifact(artifact){
 if(!artifact||!/^[a-f0-9]{64}$/.test(artifact.hash)||artifact.path!==`cv-artifacts/${artifact.hash}.pdf`||!Number.isInteger(artifact.bytes)||artifact.bytes<8||artifact.bytes>MAX_PDF_BYTES||artifact.contentType!=='application/pdf')throw new Error('Invalid official PDF artifact descriptor.');
 if(typeof artifact.url!=='string')throw new Error('Missing artifact URL.');
 const origin=globalThis.location?.origin||'http://127.0.0.1:5173';let url;try{url=new URL(artifact.url,origin);}catch{throw new Error('Invalid artifact URL.');}
 if(url.username||url.password||url.hash||!(url.protocol==='https:'||url.origin===origin&&['http:','https:'].includes(url.protocol)))throw new Error('Unsafe artifact URL.');
 return artifact;
}
async function database(){
 if(typeof indexedDB==='undefined')return null;
 return new Promise((resolve,reject)=>{const request=indexedDB.open('portfolio.cvArtifacts.v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('pdfs');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
export async function cachePdf(hash,blob){
 try{if((await describePdf(blob)).hash!==hash)throw new Error('PDF cache hash mismatch.');const db=await database();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('pdfs','readwrite');tx.objectStore('pdfs').put(blob,hash);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();}catch(error){console.warn('[CV] PDF device cache unavailable:',error.message);}
}
async function cachedPdf(hash){
 try{const db=await database();if(!db)return null;const blob=await new Promise((resolve,reject)=>{const request=db.transaction('pdfs').objectStore('pdfs').get(hash);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});db.close();return blob;}catch{return null;}
}
export async function fetchOfficialPdf(artifact,{fetcher=fetch,useCache=true,signal}={}){
 validateArtifact(artifact);
 let blob=useCache?await cachedPdf(artifact.hash):null;
 if(blob){try{const descriptor=await describePdf(blob);if(descriptor.hash===artifact.hash&&descriptor.bytes===artifact.bytes)return blob;}catch{}blob=null;}
 const response=await fetcher(artifact.url,{credentials:'omit',signal:signal||AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Official PDF artifact could not be downloaded. Retry when connected.');
 const contentLength=Number(response.headers.get('content-length')||0);if(contentLength>MAX_PDF_BYTES)throw new Error('Official PDF artifact is too large.');
 const reader=response.body?.getReader();
 if(reader){let size=0;const chunks=[];try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>artifact.bytes||size>MAX_PDF_BYTES){await reader.cancel();throw new Error('PDF artifact size mismatch.');}chunks.push(item.value);}}finally{reader.releaseLock();}blob=new Blob(chunks,{type:'application/pdf'});}else blob=await response.blob();
 const descriptor=await describePdf(blob);if(descriptor.hash!==artifact.hash||descriptor.bytes!==artifact.bytes)throw new Error('Official PDF integrity check failed. The published CV was not changed.');
 if(useCache)await cachePdf(artifact.hash,blob);return blob;
}
