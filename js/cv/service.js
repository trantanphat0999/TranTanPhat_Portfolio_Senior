import { SOURCE_KEYS, buildCvFields, applyOverrides, staleOverrides, selectedFields, validateCvFields } from './model.js';
import { getSeedPortfolioData } from '../db-seed.js';
import {normalizeStyle} from './config.js';

export const defaultCvStyle = () => ({fontFamily:'Roboto',fontSize:10.5,lineHeight:1.2,pageLimit:0});
export async function loadCvSource() {
  const api=await import('../firebase-config.js');
  const source={...getSeedPortfolioData(),...window._portfolioData};
  // Read at export time, including configuration, rather than trust a snapshot
  // cached when the page was opened. Existing API supplies offline fallback.
  const keys=[...SOURCE_KEYS,'cv'];
  const results=await Promise.allSettled(keys.map(key=>api.readPortfolioDoc(key)));
  results.forEach((result,i)=>{if(result.status==='fulfilled'&&result.value!=null)source[keys[i]]=result.value;});
  return source;
}
export async function resolvePublicCv(source) {
  if(source.cv?.version===4) {
    const fields=validateCvFields(source.cv.fields);
    if(![1,2].includes(source.cv.rendererVersion))throw new Error('Unsupported CV renderer version.');
    const style={...defaultCvStyle(),...source.cv.effectiveStyle,rendererVersion:source.cv.rendererVersion,locked:true};
    if(style.rendererVersion===2)normalizeStyle(style);
    return {linked:fields,fields,style,stale:[],revision:source.cv._revision||0};
  }
  const linked=await buildCvFields(source), config=source.cv?.version===3?source.cv:{};
  const stale=staleOverrides(linked,config.overrides,config.origins);
  const overrides={...config.overrides};stale.forEach(key=>delete overrides[key]);
  return {linked,fields:validateCvFields(selectedFields(applyOverrides(linked,overrides,config.origins),config)),style:{...defaultCvStyle(),...config.style},stale};
}
export function reviewCv(fields,result,style={}) {
  const messages=[];
  const words=fields.reduce((n,x)=>n+x.text.split(/\s+/).filter(Boolean).length,0);
  if(!fields.some(x=>x.key==='contact.email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.text)))messages.push('Add a valid contact email.');
  if(!fields.some(x=>x.key.startsWith('job.')&&x.kind==='itemTitle'))messages.push('Professional experience is missing.');
  const summary=fields.find(x=>x.key==='summary');
  if(summary?.text.split(/\s+/).length>100)messages.push('Summary exceeds 100 words; consider 3–5 focused lines.');
  if(fields.some(x=>x.kind==='bullet'&&x.text.split(/\s+/).length>65))messages.push('Some bullets are long; shorten them while retaining the action, context and result.');
  if(fields.some(x=>x.key.startsWith('job.')&&x.kind==='date'&&!x.text))messages.push('Some jobs have no dates.');
  if(fields.some(x=>x.key.startsWith('cert.')&&/ISTQB/i.test(x.text)&&!/course completion|training|preparation/i.test(x.text)))messages.push('Verify ISTQB-labelled credentials: distinguish course completion from an official certification.');
  if(fields.some(x=>/all .*paths|entirely|comprehensive coverage|remediated/i.test(x.text)))messages.push('Confirm absolute coverage claims and distinguish QA findings from developer remediation.');
  if(summary&&fields.some(x=>x.key.startsWith('job.')&&x.kind==='paragraph'&&x.text.includes('specializ')))messages.push('Avoid repeating the summary in the current role; lead with actions and outcomes.');
  if(fields.some(x=>/4\+ years/i.test(x.text))&&fields.some(x=>x.kind==='date'&&/Aug 2021.*Present/i.test(x.text)))messages.push('Review the experience duration against the current date; do not update it without confirming continuous employment.');
  if(result&&!result.fits)messages.push(`Content needs ${result.pages} pages; the selected limit is ${result.pageLimit}. Choose a larger limit, select CV content or use AI to condense wording.`);
  if(result?.pages>2)messages.push('For this Senior QA application, consider a focused 2-page CV; keep the full version as a detailed reference.');
  return {words,pages:result?.pages||0,messages,format:`A4 · ${result?.effectiveStyle?.fontSize||style.fontSize||10.5} pt · line height ${result?.effectiveStyle?.lineHeight||style.lineHeight||1.2} · ${((result?.effectiveStyle?.margin||45.35)*25.4/72).toFixed(1)} mm margins · single column`};
}

export async function cvFingerprint(fields, style) {
  const payload=JSON.stringify({fields:fields.map(({key,section,kind,text,group,link})=>({key,section,kind,text,group,link})),style});
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));
  return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

export async function officialCvSnapshot(fields, result, requestedStyle, expectedRevision=0) {
  if(!result?.fits)throw new Error('The PDF must fit the selected page count before saving.');
  const clean=validateCvFields(fields).map(field=>Object.fromEntries(Object.entries(field).filter(([key,value])=>['key','section','kind','text','group','link'].includes(key)&&value!==undefined)));
  const rendererVersion=requestedStyle.rendererVersion===2?2:1;
  const effectiveStyle=rendererVersion===2?normalizeStyle({...result.effectiveStyle,pageLimit:result.pageLimit}):{fontFamily:requestedStyle.fontFamily,fontSize:result.effectiveStyle.fontSize,lineHeight:result.effectiveStyle.lineHeight,margin:result.effectiveStyle.margin,pageLimit:result.pageLimit};
  delete effectiveStyle.locked;
  return {version:4,_revision:expectedRevision,fields:clean,requestedStyle:{...requestedStyle},effectiveStyle,pageCount:result.pages,pageLimit:result.pageLimit,contentHash:await cvFingerprint(clean,effectiveStyle),rendererVersion,autoSync:false,publishedAt:new Date().toISOString()};
}

export async function loadOfficialCv() {
  const api=await import('../firebase-config.js');
  return api.readOfficialCv();
}
