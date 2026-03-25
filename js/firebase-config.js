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
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.warn(`[Firebase] Document 'portfolio/${docId}' not found.`);
      return null;
    }
  } catch (err) {
    console.error(`[Firebase] Error reading 'portfolio/${docId}':`, err);
    return null;
  }
}

/**
 * Write (overwrite) a document in the 'portfolio' collection
 * @param {string} docId - Document ID
 * @param {Object} data - Data to write
 */
export async function writePortfolioDoc(docId, data) {
  try {
    const docRef = doc(db, "portfolio", docId);
    await setDoc(docRef, data);
    console.log(`[Firebase] ✅ Wrote 'portfolio/${docId}'`);
  } catch (err) {
    console.error(`[Firebase] Error writing 'portfolio/${docId}':`, err);
    throw err;
  }
}

/**
 * Update specific fields in a portfolio document (partial update)
 * @param {string} docId - Document ID
 * @param {Object} fields - Fields to update
 */
export async function updatePortfolioDoc(docId, fields) {
  try {
    const docRef = doc(db, "portfolio", docId);
    await updateDoc(docRef, fields);
    console.log(`[Firebase] ✅ Updated 'portfolio/${docId}'`);
  } catch (err) {
    console.error(`[Firebase] Error updating 'portfolio/${docId}':`, err);
    throw err;
  }
}

/**
 * Read all documents from the 'portfolio' collection
 * @returns {Promise<Object>} Map of docId → data
 */
export async function readAllPortfolioDocs() {
  try {
    const colRef = collection(db, "portfolio");
    const snapshot = await getDocs(colRef);
    const result = {};
    snapshot.forEach((docSnap) => {
      result[docSnap.id] = docSnap.data();
    });
    return result;
  } catch (err) {
    console.error("[Firebase] Error reading all portfolio docs:", err);
    return {};
  }
}

export { db };
