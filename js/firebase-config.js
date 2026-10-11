// ============================================================
//  FIREBASE CONFIGURATION
//  Project: Portfolio Project (portfolio-project-9770e)
//
//  ⚠️  ACTION REQUIRED:
//  Paste your Firebase config values below.
//  Go to: Firebase Console → Project Settings → Your Apps
//  → Web App "Tran Tan Phat - Portfolio" → SDK setup → Config
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  clearAllPendingPortfolioWrites,
  clearPendingPortfolioWrite,
  queuePendingPortfolioWrite,
  readLocalPortfolioCache,
  readLocalPortfolioDoc,
  readPendingPortfolioWrites,
  replaceLocalPortfolioCache,
  updateLocalPortfolioDoc,
} from "./local-portfolio-cache.js";

// ─── YOUR FIREBASE CONFIG ───────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDuksDvEQzHnFKPYtR5OKMkO075aBsD5ug",
  authDomain: "portfolio-project-9770e.firebaseapp.com",
  projectId: "portfolio-project-9770e",
  storageBucket: "portfolio-project-9770e.firebasestorage.app",
  messagingSenderId: "253360544517",
  appId: "1:253360544517:web:ceb74e4822c15cb89f756c",
  measurementId: "G-36GVT837J9",
};
// ────────────────────────────────────────────────────────────

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore & Auth
const db = getFirestore(app);
const auth = getAuth(app);
const LAST_UPDATED_EXCLUDED_DOCS = new Set(["metadata", "ai-config"]);

// Admin email — must match the user created in Firebase Console → Authentication
const ADMIN_EMAIL = "trantanphat190999@gmail.com";

export async function adminSignIn(password) {
  const userCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
  return userCred.user;
}

export async function adminSignOut() {
  await firebaseSignOut(auth);
}

/**
 * Send a password-reset email to the admin account.
 * Firebase delivers a reset link to ADMIN_EMAIL's inbox.
 */
export async function adminResetPassword() {
  await sendPasswordResetEmail(auth, ADMIN_EMAIL);
  return ADMIN_EMAIL;
}

/** The admin account email (for display, e.g. "reset link sent to …"). */
export function getAdminEmail() {
  return ADMIN_EMAIL;
}

export function getAdminUser() {
  return auth.currentUser;
}
let firebaseConnectionStatus = "unknown";

function setFirebaseConnectionStatus(status, detail = {}) {
  firebaseConnectionStatus = status;
  if (typeof window !== "undefined") {
    window._firebaseConnectionStatus = status;
    window.dispatchEvent(new CustomEvent("portfolio-firebase-status", {
      detail: { status, ...detail },
    }));
  }
}

export function getFirebaseConnectionStatus() {
  return firebaseConnectionStatus;
}

/**
 * Distinguish "we can't reach Firestore" (a real connection problem) from
 * "Firestore answered but refused" (permission/auth). A permission-denied
 * response proves we ARE connected, so it must NOT flip the app to
 * "disconnected" — otherwise an admin-only doc (e.g. admin/ai-config) being
 * blocked would falsely report the whole backend as down.
 */
function isConnectivityError(err) {
  const code = err && err.code ? String(err.code).toLowerCase() : "";
  if (code.includes("permission-denied") || code.includes("unauthenticated")) return false;
  return /unavailable|deadline-exceeded|network-request-failed|offline/.test(code);
}

async function touchPortfolioLastUpdated(docId) {
  if (LAST_UPDATED_EXCLUDED_DOCS.has(docId)) return;

  const metadataRef = doc(db, "portfolio", "metadata");
  await setDoc(metadataRef, {
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedSection: docId,
  }, { merge: true });
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────

/**
 * Read a document from the 'portfolio' collection
 * @param {string} docId - Document ID (e.g. 'header', 'summary', etc.)
 * @returns {Promise<Object|null>} Document data or null
 */
export async function readPortfolioDoc(docId) {
  try {
    const docRef = doc(db, "portfolio", docId);
    const docSnap = await getDoc(docRef);
    setFirebaseConnectionStatus("connected");
    if (docSnap.exists()) {
      const pending=readPendingPortfolioWrites().find(item=>item.docId===docId);
      if(pending)return pending.data;
      const data = docSnap.data();
      try { await updateLocalPortfolioDoc(docId, data, { source: "firebase" }); } catch(err) { console.warn('[Cache]',err.message); }
      return data;
    } else {
      console.warn(`[Firebase] Document 'portfolio/${docId}' not found.`);
      return readLocalPortfolioDoc(docId);
    }
  } catch (err) {
    console.error(`[Firebase] Error reading 'portfolio/${docId}'. Using local cache:`, err);
    if (isConnectivityError(err)) setFirebaseConnectionStatus("disconnected", { error: err.message });
    return readLocalPortfolioDoc(docId);
  }
}

/**
 * Write (overwrite) a document in the 'portfolio' collection
 * @param {string} docId - Document ID
 * @param {Object} data - Data to write
 */
let writeChain=Promise.resolve();
// Official CV reads bypass pending writes and the source/seed fallback.
const OFFICIAL_CV_CACHE='portfolio.officialCv.v4';
function cacheOfficialCv(value) {
  try{localStorage.setItem(OFFICIAL_CV_CACHE,JSON.stringify(value));}catch{}
}
export async function readOfficialCv() {
  try {
    const snapshot=await getDoc(doc(db,'portfolio','cv'));
    const value=snapshot.exists()?snapshot.data():null;
    cacheOfficialCv(value);
    return value;
  } catch(error) {
    if(!isConnectivityError(error))throw error;
    try{return JSON.parse(localStorage.getItem(OFFICIAL_CV_CACHE)||'null');}catch{return null;}
  }
}
export async function writeOfficialCv(value) {
  return serialized(async()=>{
    requireAdmin();
    if(!navigator.onLine)throw new Error('You are offline. Save a draft; the official CV has not changed.');
    if(readPendingPortfolioWrites().some(item=>item.docId==='cv'))throw new Error('Resolve the previous CV sync before saving the official CV.');
    const saved=await commitDocument('cv',value,Number(value._revision||0));
    cacheOfficialCv(saved);
    await updateLocalPortfolioDoc('cv',saved,{source:'firebase'}).catch(()=>{});
    return {synced:true,data:saved};
  });
}
export async function readCareerData(){return readAdminDoc('career-data');}
export async function writeCareerData(value){
 const {validateCareer}=await import('./career/model.js');validateCareer(value);
 const clean=JSON.parse(JSON.stringify(value)),previous=await readCareerData();stampCareerReviews(clean,previous);
 return writeAdminDoc('career-data',clean);
}
function stampCareerReviews(value,previous){
 const user=getAdminUser(),now=new Date().toISOString(),content=record=>JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key])=>!['reviewedBy','reviewedAt'].includes(key))));
 for(const type of ['experience','projects','claims','metrics','skills','credentials','evidence'])for(const record of value[type])if(['owner_confirmed','externally_verified'].includes(record.verificationStatus)){const old=previous?.[type]?.find(item=>item.id===record.id);if(!old||content(record)!==content(old)||!old.reviewedAt){record.reviewedBy=user?.uid||user?.email||'';record.reviewedAt=now;}else{record.reviewedBy=old.reviewedBy;record.reviewedAt=old.reviewedAt;}}
}
export async function commitCareerMigration(source,library){
 return serialized(async()=>{
  requireAdmin();if(!navigator.onLine)throw new Error('Offline. Keep the private migration draft and retry online.');
  const {ensureItemIds}=await import('./admin/data-model.js'),{validateCareer}=await import('./career/model.js');const clean=validateCareer(library),withIds=ensureItemIds(source);
  const keys=['header','experience','skills','projects','achievements','education'];validatePayload(clean);
  if(readPendingPortfolioWrites().some(item=>keys.includes(item.docId)))throw new Error('Resolve pending source writes before persisting IDs.');
  const saved=await runTransaction(db,async transaction=>{
   const snapshots=await Promise.all([transaction.get(doc(db,'admin','career-data')),...keys.map(key=>transaction.get(doc(db,'portfolio',key)))]);
   const careerRevision=Number(snapshots[0].exists()?snapshots[0].data()._revision||0:0);if(careerRevision!==clean._revision)throw new Error('Career data changed in another tab. Reload before migrating.');
   const stripIds=value=>Array.isArray(value)?value.map(stripIds):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='_id').sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stripIds(item)])):value;
   keys.forEach((key,index)=>{const snapshot=snapshots[index+1],current=snapshot.exists()?snapshot.data():{},revision=Number(current._revision||0);if(revision!==Number(source[key]?._revision||0)||JSON.stringify(stripIds(current))!==JSON.stringify(stripIds(source[key]||{})))throw new Error(`Source changed: ${key}. Import the current portfolio again.`);validatePayload(withIds[key]||{});});
   const backup={version:1,createdAt:new Date().toISOString(),career:snapshots[0].exists()?snapshots[0].data():null,source:Object.fromEntries(keys.map((key,index)=>[key,snapshots[index+1].exists()?snapshots[index+1].data():{}]))};validatePayload(backup);
   const next={...clean,_revision:careerRevision+1};stampCareerReviews(next,backup.career);
   keys.forEach((key,index)=>{const current=snapshots[index+1].exists()?snapshots[index+1].data():{};if(JSON.stringify(current)!==JSON.stringify(withIds[key]||{})){const value={...withIds[key],_revision:Number(current._revision||0)+1};transaction.set(doc(db,'portfolio',key),value);next.migration.sourceRevisions[key]=value._revision;}});
   transaction.set(doc(db,'admin','career-migration-backup'),backup);transaction.set(doc(db,'admin','career-data'),next);transaction.set(doc(db,'portfolio','metadata'),{lastUpdatedAt:new Date().toISOString(),lastUpdatedSection:'career-migration'},{merge:true});return next;
  });
  const refreshed=await Promise.allSettled(keys.map(key=>getDoc(doc(db,'portfolio',key))));for(let index=0;index<keys.length;index++){const result=refreshed[index];if(result.status==='fulfilled'&&result.value.exists())await updateLocalPortfolioDoc(keys[index],result.value.data(),{source:'firebase'}).catch(()=>{});}
  return {synced:true,data:saved};
 });
}
async function artifactStorage(){
 const sdk=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');return {sdk,storage:sdk.getStorage(app)};
}
function storageSetupError(error){
 if(['storage/bucket-not-found','storage/project-not-found'].includes(error?.code))return new Error('PDF publishing needs a Firebase Storage bucket. Create or connect the project bucket, update storageBucket in js/firebase-config.js, then deploy storage.rules and configure CORS. Your official CV has not changed.');
 if(error?.code==='storage/unauthorized')return new Error('Firebase Storage denied the PDF upload. Sign in as the owner and deploy storage.rules to the configured bucket. Your official CV has not changed.');
 return error;
}
function releaseStore(){return {
 async inspect(release,blob){const {inspectCvPdf}=await import('./cv/quality.js');const report=await inspectCvPdf(blob,release.fields,release.effectiveStyle);if(!report.passed||report.pages!==release.pageCount)throw new Error(`PDF release failed review: ${report.issues.join('; ')||'Page count mismatch'}`);},
 async upload(artifact,blob){
  requireAdmin();const {sdk,storage}=await artifactStorage(),target=sdk.ref(storage,artifact.path);let exists=false;
  try{await sdk.list(sdk.ref(storage,'cv-artifacts'),{maxResults:1});}catch(error){throw storageSetupError(error.code==='storage/object-not-found'?{code:'storage/bucket-not-found'}:error);}
  try{await sdk.getMetadata(target);exists=true;}catch(error){if(error.code!=='storage/object-not-found')throw storageSetupError(error);}
  if(!exists)await sdk.uploadBytes(target,blob,{contentType:'application/pdf',cacheControl:'public,max-age=31536000,immutable',customMetadata:{sha256:artifact.hash,visibility:'public'}});
  return sdk.getDownloadURL(target);
 },
 async verify(artifact){const {sdk,storage}=await artifactStorage(),{describePdf}=await import('./cv/artifact.js');const bytes=await sdk.getBytes(sdk.ref(storage,artifact.path),10*1024*1024);const actual=await describePdf(new Blob([bytes],{type:'application/pdf'}));if(actual.hash!==artifact.hash||actual.bytes!==artifact.bytes)throw new Error('Uploaded PDF failed integrity validation.');},
 async read(id){requireAdmin();if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid release ID.');const snapshot=await getDoc(doc(db,'cv-releases',id));return snapshot.exists()?snapshot.data():null;},
 async activate(release,expectedRevision,{create,expectedCareerRevision}){
  requireAdmin();if(!navigator.onLine)throw new Error('Offline. The official CV has not changed.');validatePayload(release);
  const {careerPublishIssues}=await import('./career/model.js');
  if(readPendingPortfolioWrites().some(item=>item.docId==='cv'))throw new Error('Resolve the previous CV sync before publication.');
  const saved=await runTransaction(db,async transaction=>{
   const target=doc(db,'portfolio','cv'),history=doc(db,'cv-releases',release.releaseId),current=await transaction.get(target),old=await transaction.get(history);
   const revision=Number(current.exists()?current.data()._revision||0:0);if(revision!==expectedRevision)throw new Error('Official CV changed in another tab. Reopen CV Studio before publishing.');
   if(create){const facts=await transaction.get(doc(db,'admin','career-data'));if(Number(facts.exists()?facts.data()._revision||0:0)!==expectedCareerRevision)throw new Error('Career facts changed during publication. Refresh CV source and review again.');const issues=careerPublishIssues(release.fields,facts.exists()?facts.data():null);if(issues.length)throw new Error(issues.slice(0,4).join('\n'));}
   if(create&&old.exists())throw new Error('Release IDs are immutable.');if(!create&&(!old.exists()||old.data().artifact.hash!==release.artifact.hash))throw new Error('Rollback release changed or was removed.');
   const next={...release,_revision:revision+1,activatedAt:new Date().toISOString()};
   if(create)transaction.set(history,release);transaction.set(target,next);
   transaction.set(doc(db,'cv-release-events',crypto.randomUUID()),{releaseId:release.releaseId,revision:next._revision,action:create?'publish':'rollback',at:next.activatedAt,actor:auth.currentUser.uid||auth.currentUser.email,...(create?{factRevision:expectedCareerRevision}:{})});
   transaction.set(doc(db,'portfolio','metadata'),{lastUpdatedAt:next.activatedAt,lastUpdatedSection:'cv'},{merge:true});return next;
  });
  cacheOfficialCv(saved);await updateLocalPortfolioDoc('cv',saved,{source:'firebase'}).catch(()=>{});return saved;
 }
};}
export async function publishCvRelease(snapshot,blob,fingerprint={},expectedCareerRevision=0){
 requireAdmin();if(!navigator.onLine)throw new Error('You are offline. Save a draft; the official CV has not changed.');
 const {publishRelease}=await import('./cv/releases.js');return serialized(()=>publishRelease(releaseStore(),{snapshot,blob,expectedRevision:Number(snapshot._revision||0),expectedCareerRevision,fingerprint}));
}
export async function readCvReleaseHistory(){
 requireAdmin();const {query,orderBy,limit}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
 const snapshots=await getDocs(query(collection(db,'cv-releases'),orderBy('publishedAt','desc'),limit(50))),items=[];snapshots.forEach(snapshot=>items.push(snapshot.data()));return items;
}
export async function rollbackCvRelease(id,expectedRevision){
 requireAdmin();if(!navigator.onLine)throw new Error('Offline. Rollback has not been applied.');
 const {rollbackRelease}=await import('./cv/releases.js');return serialized(()=>rollbackRelease(releaseStore(),id,expectedRevision));
}
export async function writeCustomBlocks(value){return serialized(async()=>{requireAdmin();if(!navigator.onLine)throw new Error('Offline. Save a private draft and publish when connected.');const {validateBlocks}=await import('./portfolio/custom-blocks.js');validateBlocks(value.blocks);if(value.blocks.some(b=>b.visibility==='private'))throw new Error('Private blocks cannot be published.');const saved=await commitDocument('custom-blocks',value,Number(value._revision||0));await updateLocalPortfolioDoc('custom-blocks',saved,{source:'firebase'}).catch(()=>{});return {synced:true,data:saved};});}
export async function readCvDraft() {
  requireAdmin();
  const snapshot=await getDoc(doc(db,'admin','cv-draft'));
  return snapshot.exists()?snapshot.data():null;
}
export async function writeCvDraft(value) {
  return writeAdminDoc('cv-draft',value);
}
function serialized(task) { const result=writeChain.then(task);writeChain=result.catch(()=>{});return result; }
function requireAdmin() { if(auth.currentUser?.email!==ADMIN_EMAIL)throw Object.assign(new Error('Your admin session has expired. Sign in again.'),{code:'unauthenticated'}); }
function validatePayload(data) { if(new TextEncoder().encode(JSON.stringify(data)).length>900000)throw Object.assign(new Error('This section is too large. Use image URLs or smaller uploads before saving.'),{code:'payload-too-large'}); }
async function commitDocument(docId,data,expectedRevision=Number(data._revision||0)) {
  requireAdmin();validatePayload(data);
  const ref=doc(db,'portfolio',docId);
  const saved=await runTransaction(db,async transaction=>{
    const snapshot=await transaction.get(ref);
    if(docId==='cv'&&snapshot.exists()&&snapshot.data().releaseVersion===1)throw new Error('This official CV is frozen. Publish a reviewed PDF release through CV Studio.');
    const revision=Number(snapshot.exists()?snapshot.data()._revision||0:0);
    if(revision!==expectedRevision)throw Object.assign(new Error('This section changed in another tab. Reopen it and apply your edits to the latest version.'),{code:'conflict'});
    const next={...data,_revision:revision+1};transaction.set(ref,next);
    if(!LAST_UPDATED_EXCLUDED_DOCS.has(docId))transaction.set(doc(db,'portfolio','metadata'),{lastUpdatedAt:new Date().toISOString(),lastUpdatedSection:docId},{merge:true});
    return next;
  });
  return saved;
}
async function saveDocument(docId,data) {
  requireAdmin();validatePayload(data);
  const ownPending=readPendingPortfolioWrites().find(item=>item.docId===docId);
  if(readPendingPortfolioWrites().length && navigator.onLine){await flushPendingPortfolioWrites();if(ownPending&&!readPendingPortfolioWrites().some(item=>item.docId===docId))data._revision=Number((await readLocalPortfolioDoc(docId))._revision||0);}
  const previous=readPendingPortfolioWrites().find(item=>item.docId===docId);
  if(previous && previous.status==='conflict')throw Object.assign(new Error('Resolve the pending conflict before saving this section.'),{code:'conflict'});
  const next={...data};
  if(previous)next._revision=previous.expectedRevision;
  try {
    if(!navigator.onLine)throw Object.assign(new Error('Offline'),{code:'offline'});
    const saved=await commitDocument(docId,next);
    data._revision=saved._revision;
    try{await updateLocalPortfolioDoc(docId,saved,{source:'firebase'});}catch(error){console.warn('[Cache] Remote save succeeded:',error.message);}
    setFirebaseConnectionStatus('connected');return {synced:true,status:'synced',data:saved};
  } catch(error) {
    if(!isConnectivityError(error))throw error;
    // A failed durable queue must never be reported as a saved offline change.
    queuePendingPortfolioWrite(docId,next);
    try{await updateLocalPortfolioDoc(docId,next,{source:'local-pending'});}catch(error){console.warn('[Cache] Durable queue saved:',error.message);}
    setFirebaseConnectionStatus('disconnected');return {synced:false,status:'pending',data:next};
  }
}
export function writePortfolioDoc(docId,data) { return serialized(()=>saveDocument(docId,data)); }
export async function updatePortfolioDoc(docId,fields) {
  return serialized(async()=>saveDocument(docId,{...await readPortfolioDoc(docId),...fields}));
}

/**
 * Read all documents from the 'portfolio' collection
 * @returns {Promise<Object>} Map of docId → data
 */
export async function readAllPortfolioDocs() {
  try { await flushPendingPortfolioWrites(); } catch(error) { console.warn('[Firebase] Pending sync:',error.message); }
  // Rules are not filters: individually read only whitelisted public documents.
  const keys=['header','summary','experience','skills','projects','achievements','education','contact','metadata','cv','custom-blocks'];
  try {
    const snapshots=await Promise.all(keys.map(key=>getDoc(doc(db,'portfolio',key))));
    const result={};snapshots.forEach((snapshot,index)=>{if(snapshot.exists())result[keys[index]]=snapshot.data();});
    setFirebaseConnectionStatus('connected');
    if(Object.keys(result).length){
      try{replaceLocalPortfolioCache(result,{source:'firebase'});}catch(error){console.warn('[Cache]',error.message);}
      return {...result,...Object.fromEntries(readPendingPortfolioWrites().map(item=>[item.docId,item.data]))};
    }
    return readLocalPortfolioCache();
  } catch(error) {
    if(isConnectivityError(error))setFirebaseConnectionStatus('disconnected',{error:error.message});
    console.warn('[Firebase] Public read fallback:',error.message);return readLocalPortfolioCache();
  }
}

/**
 * Read the private AI config document from the admin-only 'admin' collection.
 * Kept out of the public 'portfolio' collection so the AI API key is never
 * exposed to unauthenticated visitors (Firestore rules restrict it to admin).
 * @returns {Promise<Object|null>}
 */
export async function readAiConfig() {
  try {
    const docRef = doc(db, "admin", "ai-config");
    const docSnap = await getDoc(docRef);
    setFirebaseConnectionStatus("connected");
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    // A permission error here just means the admin/* rules aren't deployed yet
    // (or the user isn't the admin) — it does NOT mean Firestore is down.
    console.warn("[Firebase] Could not read 'admin/ai-config':", err);
    if (isConnectivityError(err)) setFirebaseConnectionStatus("disconnected", { error: err.message });
    return null;
  }
}

/**
 * Write the private AI config document to the admin-only 'admin' collection.
 * @param {Object} data
 */
export async function writeAiConfig(data) {
  if(data.version===2)return writeAdminDoc('ai-config',data);
  const docRef = doc(db, "admin", "ai-config");
  await setDoc(docRef, data);
  setFirebaseConnectionStatus("connected");
  console.log("[Firebase] ✅ Wrote 'admin/ai-config'");
}

export async function readAdminDoc(docId){
  requireAdmin();if(!/^[a-z][a-z0-9.-]{0,80}$/.test(docId))throw new Error('Invalid private document ID.');
  const snapshot=await getDoc(doc(db,'admin',docId));return snapshot.exists()?snapshot.data():null;
}
export async function writeAdminDoc(docId,data){
  requireAdmin();validatePayload(data);if(!/^[a-z][a-z0-9.-]{0,80}$/.test(docId))throw new Error('Invalid private document ID.');
  if(!navigator.onLine)throw Object.assign(new Error('Offline. Save a device draft and retry when connected.'),{code:'offline'});
  const saved=await runTransaction(db,async transaction=>{const ref=doc(db,'admin',docId),snapshot=await transaction.get(ref),revision=Number(snapshot.exists()?snapshot.data()._revision||0:0);if(revision!==Number(data._revision||0))throw Object.assign(new Error('This private document changed in another tab. Reload before saving.'),{code:'conflict'});const next={...data,_revision:revision+1};transaction.set(ref,next);return next;});
  return {synced:true,data:saved};
}

let flushPromise=null;
export function flushPendingPortfolioWrites() {
  if(flushPromise)return flushPromise;
  flushPromise=flushQueue().finally(()=>{flushPromise=null;});return flushPromise;
}
async function flushQueue() {
  const pending=readPendingPortfolioWrites();
  if(!pending.length||!auth.currentUser||!navigator.onLine)return;
  requireAdmin();setFirebaseConnectionStatus('syncing',{pending:pending.length});
  for(const item of pending){
    try {
      const saved=await commitDocument(item.docId,item.data,item.expectedRevision ?? Number(item.data._revision||0));
      clearPendingPortfolioWrite(item.docId,item.queuedAt);
      try{await updateLocalPortfolioDoc(item.docId,saved,{source:'firebase'});}catch(error){console.warn('[Cache]',error.message);}
    }catch(error){
      setFirebaseConnectionStatus(isConnectivityError(error)?'disconnected':'connected',{error:error.message});
      window.dispatchEvent(new CustomEvent('portfolio-sync-error',{detail:{docId:item.docId,code:error.code,message:error.message}}));
      throw error;
    }
  }
  setFirebaseConnectionStatus('connected',{synced:pending.length});
}
// Keep Firebase auth and the admin UI in agreement without persisting UI-only authorization.
onAuthStateChanged(auth,user=>window.dispatchEvent(new CustomEvent('portfolio-auth-state',{detail:{signedIn:!!user,email:user?.email||null}})));

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    readAllPortfolioDocs().catch(err => {
      setFirebaseConnectionStatus("disconnected", { error: err.message });
    });
  });

  // Console diagnostics: run `_portfolioFirebaseDiag()` to inspect the
  // connection status / signed-in admin / queued offline writes, or
  // `_portfolioClearPending()` to drop stuck queued writes.
  window._portfolioFirebaseDiag = () => {
    const info = {
      status: firebaseConnectionStatus,
      adminSignedIn: auth.currentUser ? auth.currentUser.email : null,
      pendingWrites: readPendingPortfolioWrites(),
    };
    console.log("[Firebase Diag]", info);
    return info;
  };
  window._portfolioClearPending = () => {
    clearAllPendingPortfolioWrites();
    console.log("[Firebase Diag] Cleared all queued pending writes.");
  };
}

export { db, auth };

export async function resolvePendingPortfolioWrite(docId, action) {
  requireAdmin();const pending=readPendingPortfolioWrites().find(item=>item.docId===docId);if(!pending)return;
  const snapshot=await getDoc(doc(db,'portfolio',docId));const remote=snapshot.exists()?snapshot.data():{};
  if(action==='discard'){clearPendingPortfolioWrite(docId,pending.queuedAt);await updateLocalPortfolioDoc(docId,remote,{source:'firebase'});return {synced:true};}
  if(action!=='overwrite')throw new Error('Invalid resolution action.');
  const saved=await commitDocument(docId,{...pending.data,_revision:remote._revision||0},Number(remote._revision||0));
  clearPendingPortfolioWrite(docId,pending.queuedAt);await updateLocalPortfolioDoc(docId,saved,{source:'firebase'});return {synced:true};
}
