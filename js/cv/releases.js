import {describePdf,validateArtifact,fetchOfficialPdf,cachePdf} from './artifact.js';
import {cvFingerprint} from './service.js';
import {validateCvFields} from './model.js';
import {normalizeStyle} from './config.js';
export function publicSnapshot(snapshot){
 if(snapshot?.version!==4||![1,2].includes(snapshot.rendererVersion)||!Number.isInteger(snapshot.pageCount)||snapshot.pageCount<1||snapshot.pageCount>100||!Number.isInteger(snapshot.pageLimit)||snapshot.pageLimit<0||snapshot.pageLimit>4||snapshot.pageLimit&&snapshot.pageCount>snapshot.pageLimit)throw new Error('A reviewed official snapshot is required.');
 const fields=validateCvFields(snapshot.fields).map(field=>Object.fromEntries(Object.entries(field).filter(([key,value])=>['key','section','kind','text','group','link'].includes(key)&&value!==undefined)));
 const effectiveStyle=snapshot.rendererVersion===2?normalizeStyle(snapshot.effectiveStyle):Object.fromEntries(['fontFamily','fontSize','lineHeight','margin','pageLimit'].filter(key=>snapshot.effectiveStyle?.[key]!==undefined).map(key=>[key,snapshot.effectiveStyle[key]]));
 delete effectiveStyle.locked;
 return {version:4,fields,effectiveStyle,rendererVersion:snapshot.rendererVersion,pageCount:snapshot.pageCount,pageLimit:snapshot.pageLimit,autoSync:false};
}
export async function prepareRelease(snapshot,blob,fingerprint={}){
 const clean=publicSnapshot(snapshot),artifact=await describePdf(blob),releaseId=crypto.randomUUID(),publishedAt=new Date().toISOString();
 const build=Object.fromEntries(['rendererHash','pdfLibraryHash','fontHash'].filter(key=>typeof fingerprint[key]==='string'&&/^[a-f0-9]{64}$/.test(fingerprint[key])).map(key=>[key,fingerprint[key]]));
 return {...clean,releaseVersion:1,releaseId,publishedAt,contentHash:await cvFingerprint(clean.fields,clean.effectiveStyle),artifact,build};
}
// Storage upload is outside the transaction. Only a successful CAS activates it.
export async function publishRelease(store,{snapshot,blob,expectedRevision=0,expectedCareerRevision=0,fingerprint={}}){
 const release=await prepareRelease(snapshot,blob,fingerprint);
 if(store.inspect)await store.inspect(release,blob);
 const url=await store.upload(release.artifact,blob);release.artifact.url=url;validateArtifact(release.artifact);
 await store.verify(release.artifact,blob);
 const saved=await store.activate(release,expectedRevision,{create:true,expectedCareerRevision});
 await cachePdf(release.artifact.hash,blob);return {synced:true,data:saved};
}
export async function rollbackRelease(store,releaseId,expectedRevision){
 const release=await store.read(releaseId);if(!release)throw new Error('This release is unavailable.');
 if(release.releaseVersion!==1||release.releaseId!==releaseId)throw new Error('Invalid release history record.');
 publicSnapshot(release);validateArtifact(release.artifact);
 const blob=store.download?await store.download(release.artifact):await fetchOfficialPdf(release.artifact,{useCache:false});
 const actual=await describePdf(blob);if(actual.hash!==release.artifact.hash||actual.bytes!==release.artifact.bytes)throw new Error('Rollback artifact integrity check failed.');
 const saved=await store.activate(release,expectedRevision,{create:false});await cachePdf(release.artifact.hash,blob);return {synced:true,data:saved,blob};
}
export async function rendererFingerprint(fontFamily='Roboto'){
 const {sha256}=await import('./artifact.js');
 const read=async path=>{const response=await fetch(path,{cache:'no-cache'});if(!response.ok)throw new Error(`CV build fingerprint unavailable: ${path}`);return response.arrayBuffer();};
 const names=fontFamily==='NotoSerif'?['NotoSerif-Regular.ttf','NotoSerif-Bold.ttf','NotoSerif-Italic.ttf','NotoSerif-BoldItalic.ttf']:['Roboto-Regular.ttf','Roboto-Medium.ttf','Roboto-Italic.ttf','Roboto-MediumItalic.ttf'];
 const [renderer,library,...fonts]=await Promise.all([read('js/cv/pdf.js'),read('vendor/pdfmake.min.js'),...names.map(name=>read(`vendor/fonts/${name}`))]);
 const fontBytes=new Uint8Array(fonts.reduce((total,bytes)=>total+bytes.byteLength,0));let offset=0;for(const bytes of fonts){fontBytes.set(new Uint8Array(bytes),offset);offset+=bytes.byteLength;}
 return {rendererHash:await sha256(renderer),pdfLibraryHash:await sha256(library),fontHash:await sha256(fontBytes)};
}
