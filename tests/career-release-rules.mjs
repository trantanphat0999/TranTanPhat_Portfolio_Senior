import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,deleteDoc,writeBatch} from 'firebase/firestore';
import {ref,uploadBytes,getBytes,getMetadata,deleteObject,listAll} from 'firebase/storage';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const env=await initializeTestEnvironment({projectId:'demo-career-cv',firestore:{host:'127.0.0.1',port:8085,rules:await readFile('firestore.rules','utf8')},storage:{host:'127.0.0.1',port:9195,rules:await readFile('storage.rules','utf8')}});
try{
 const owner=env.authenticatedContext('owner',{email:'trantanphat190999@gmail.com'}),outsider=env.authenticatedContext('outsider',{email:'other@example.com'}),visitor=env.unauthenticatedContext(),db=owner.firestore();
 await assertSucceeds(setDoc(doc(db,'admin','career-data'),{schemaVersion:1,privateEvidence:'PRIVATE'}));
 for(const context of [visitor,outsider]){await assertFails(getDoc(doc(context.firestore(),'admin','career-data')));await assertFails(setDoc(doc(context.firestore(),'admin','career-data'),{}));}
 const hash='a'.repeat(64),id='11111111-1111-4111-a111-111111111111',release={version:4,fields:[],effectiveStyle:{},rendererVersion:2,pageCount:2,pageLimit:2,autoSync:false,releaseVersion:1,releaseId:id,publishedAt:'2026-10-11',contentHash:hash,artifact:{hash,path:`cv-artifacts/${hash}.pdf`,bytes:20,contentType:'application/pdf',url:'https://example.com/file.pdf'},build:{}};
 const batch=writeBatch(db);batch.set(doc(db,'cv-releases',id),release);batch.set(doc(db,'portfolio','cv'),{...release,_revision:1,activatedAt:'now'});await assertSucceeds(batch.commit());
 await assertSucceeds(getDoc(doc(visitor.firestore(),'portfolio','cv')));await assertFails(getDoc(doc(visitor.firestore(),'cv-releases',id)));
 await assertFails(setDoc(doc(db,'cv-releases',id),{...release,pageCount:1}));await assertFails(deleteDoc(doc(db,'cv-releases',id)));await assertFails(deleteDoc(doc(db,'portfolio','cv')));
 await assertFails(setDoc(doc(db,'portfolio','cv'),{version:4,fields:[],_revision:2}));await assertFails(setDoc(doc(db,'portfolio','cv'),{...release,_revision:2,activatedAt:'now',fields:[{text:'tampered'}]}));
 await assertSucceeds(setDoc(doc(db,'portfolio','cv'),{...release,_revision:2,activatedAt:'rollback'}));await assertFails(setDoc(doc(db,'portfolio','cv'),{...release,_revision:2,activatedAt:'stale'}));
 await assertFails(setDoc(doc(db,'cv-releases','22222222-2222-4222-a222-222222222222'),{...release,releaseId:'22222222-2222-4222-a222-222222222222',privateEvidence:'LEAK'}));
 const path=`cv-artifacts/${hash}.pdf`,bytes=new TextEncoder().encode('%PDF-1.7\nimmutable\n%%EOF'),metadata={contentType:'application/pdf',customMetadata:{sha256:hash,visibility:'public'}};
 await assertSucceeds(listAll(ref(owner.storage(),'cv-artifacts')));
 await assert.rejects(getMetadata(ref(owner.storage(),path)),error=>error.code==='storage/object-not-found');
 await assertFails(uploadBytes(ref(visitor.storage(),path),bytes,metadata));await assertFails(uploadBytes(ref(outsider.storage(),path),bytes,metadata));await assertSucceeds(uploadBytes(ref(owner.storage(),path),bytes,metadata));
 await assertSucceeds(getBytes(ref(visitor.storage(),path)));await assertFails(listAll(ref(visitor.storage(),'cv-artifacts')));await assertFails(uploadBytes(ref(owner.storage(),path),bytes,metadata));await assertFails(deleteObject(ref(owner.storage(),path)));
 await assertFails(uploadBytes(ref(owner.storage(),'cv-artifacts/not-a-hash.pdf'),bytes,metadata));await assertFails(uploadBytes(ref(owner.storage(),`cv-artifacts/${'b'.repeat(64)}.pdf`),bytes,{...metadata,contentType:'text/plain'}));
 console.log('Career/release rules: private facts, public pointer, immutable history, CAS revisions, owner-only upload, public get, no listing/overwrite/delete passed.');
}finally{await env.cleanup();}
