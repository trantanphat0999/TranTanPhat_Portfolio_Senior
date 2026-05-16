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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
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

// Initialize Firestore
const db = getFirestore(app);
const LAST_UPDATED_EXCLUDED_DOCS = new Set(["metadata", "ai-config"]);
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
      const data = docSnap.data();
      await updateLocalPortfolioDoc(docId, data, { source: "firebase" });
      return data;
    } else {
      console.warn(`[Firebase] Document 'portfolio/${docId}' not found.`);
      return readLocalPortfolioDoc(docId);
    }
  } catch (err) {
    console.error(`[Firebase] Error reading 'portfolio/${docId}'. Using local cache:`, err);
    setFirebaseConnectionStatus("disconnected", { error: err.message });
    return readLocalPortfolioDoc(docId);
  }
}

/**
 * Write (overwrite) a document in the 'portfolio' collection
 * @param {string} docId - Document ID
 * @param {Object} data - Data to write
 */
export async function writePortfolioDoc(docId, data) {
  try {
    await flushPendingPortfolioWrites();
    const docRef = doc(db, "portfolio", docId);
    await setDoc(docRef, data);
    await touchPortfolioLastUpdated(docId);
    await updateLocalPortfolioDoc(docId, data, { source: "firebase" });
    setFirebaseConnectionStatus("connected");
    console.log(`[Firebase] ✅ Wrote 'portfolio/${docId}'`);
  } catch (err) {
    console.error(`[Firebase] Error writing 'portfolio/${docId}'. Saved locally for later sync:`, err);
    await updateLocalPortfolioDoc(docId, data, { source: "local-pending" });
    queuePendingPortfolioWrite(docId, data);
    setFirebaseConnectionStatus("disconnected", { error: err.message });
    console.warn(`[Firebase] Queued 'portfolio/${docId}' to sync when Firebase reconnects.`);
  }
}

/**
 * Update specific fields in a portfolio document (partial update)
 * @param {string} docId - Document ID
 * @param {Object} fields - Fields to update
 */
export async function updatePortfolioDoc(docId, fields) {
  try {
    await flushPendingPortfolioWrites();
    const docRef = doc(db, "portfolio", docId);
    await updateDoc(docRef, fields);
    await touchPortfolioLastUpdated(docId);
    const latest = await readPortfolioDoc(docId);
    await updateLocalPortfolioDoc(docId, { ...(latest || {}), ...fields }, { source: "firebase" });
    setFirebaseConnectionStatus("connected");
    console.log(`[Firebase] ✅ Updated 'portfolio/${docId}'`);
  } catch (err) {
    console.error(`[Firebase] Error updating 'portfolio/${docId}'. Saved locally for later sync:`, err);
    const localDoc = await readLocalPortfolioDoc(docId);
    const merged = { ...(localDoc || {}), ...fields };
    await updateLocalPortfolioDoc(docId, merged, { source: "local-pending" });
    queuePendingPortfolioWrite(docId, merged);
    setFirebaseConnectionStatus("disconnected", { error: err.message });
  }
}

/**
 * Read all documents from the 'portfolio' collection
 * @returns {Promise<Object>} Map of docId → data
 */
export async function readAllPortfolioDocs() {
  try {
    await flushPendingPortfolioWrites();
    const colRef = collection(db, "portfolio");
    const snapshot = await getDocs(colRef);
    const result = {};
    snapshot.forEach((docSnap) => {
      result[docSnap.id] = docSnap.data();
    });
    setFirebaseConnectionStatus("connected");
    if (Object.keys(result).length > 0) {
      replaceLocalPortfolioCache(result, { source: "firebase" });
      return result;
    }
    return readLocalPortfolioCache();
  } catch (err) {
    console.error("[Firebase] Error reading all portfolio docs. Using local cache:", err);
    setFirebaseConnectionStatus("disconnected", { error: err.message });
    return readLocalPortfolioCache();
  }
}

export async function flushPendingPortfolioWrites() {
  const pending = readPendingPortfolioWrites();
  if (pending.length === 0) return;

  setFirebaseConnectionStatus("syncing", { pending: pending.length });
  for (const item of pending) {
    const docRef = doc(db, "portfolio", item.docId);
    await setDoc(docRef, item.data);
    await touchPortfolioLastUpdated(item.docId);
    clearPendingPortfolioWrite(item.docId);
  }
  setFirebaseConnectionStatus("connected", { synced: pending.length });
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    readAllPortfolioDocs().catch(err => {
      setFirebaseConnectionStatus("disconnected", { error: err.message });
    });
  });
}

export { db };
