import {importX509,jwtVerify} from 'jose';
let certificates=null,expires=0;
async function firebaseKey(header){
  if(!certificates||Date.now()>expires){
    const response=await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Firebase signing certificates could not be loaded.');
    certificates=await response.json();expires=Date.now()+Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300)*1000;
  }
  if(!Object.hasOwn(certificates,header.kid))throw new Error('Unknown Firebase signing key.');
  return importX509(certificates[header.kid],'RS256');
}
export async function verifyOwnerToken(token,{projectId='portfolio-project-9770e',ownerEmail='trantanphat190999@gmail.com',keyResolver=firebaseKey}={}){
  const {payload}=await jwtVerify(token,keyResolver,{algorithms:['RS256'],issuer:`https://securetoken.google.com/${projectId}`,audience:projectId,requiredClaims:['exp','iat','sub','auth_time']});
  const now=Math.floor(Date.now()/1000);
  if(!payload.sub||payload.sub.length>128||payload.email!==ownerEmail||payload.iat>now||!Number.isFinite(payload.auth_time)||payload.auth_time>now)throw new Error('This service is restricted to the portfolio owner.');
  return {uid:payload.sub,email:payload.email};
}
