import {runAi,assertAiCurrent,loadAiSettings} from '../ai/service.js';
import {activeProvider,normalizeSettings} from '../ai/settings.js';
import {contextPicker} from './studio-ui.js';
import {initFormUsability,showFormError} from './usability.js';
/**
 * ADMIN EDIT MODE (internal module)
 * ======================================================
 * NOTE:
 * - This file contains the main Admin Mode implementation.
 * - `js/admin-mode.js` is kept as a thin public entrypoint for backward compatibility.
 */

// ─── STATE ───────────────────────────────────────────────────
import {
  queuePendingPortfolioWrite,
  readPendingPortfolioWrites,
  readLocalPortfolioCache,
  readLocalPortfolioDoc,
  updateLocalPortfolioDoc,
} from '../local-portfolio-cache.js';
import { loadScript } from './load-script.js';
import { clone, ensureItemIds, newId, atPath, validateItem } from './data-model.js';
import { ADMIN_STYLES } from './styles.js';
import { educationLogo } from '../portfolio-media.js';
import { initWorkspace, showWorkspace, toggleWorkspace, mountWorkspaceAI } from './workspace.js';

let isAdminMode = false;
let footerClickCount = 0;
let footerClickTimer = null;
let firebaseApiPromise = null;
let adminFirebaseStatus = 'unknown';

function setAdminFirebaseStatus(status, detail = {}) {
  adminFirebaseStatus = status;
  const dot = document.getElementById('admin-firebase-dot');
  const configDot = document.getElementById('admin-config-firebase-dot');
  const text = document.getElementById('admin-firebase-text');
  const label = status === 'connected'
    ? 'Firebase connected'
    : status === 'syncing'
      ? 'Firebase syncing'
      : 'Firebase disconnected';

  [dot, configDot].filter(Boolean).forEach(statusDot => {
    statusDot.classList.toggle('is-connected', status === 'connected');
    statusDot.classList.toggle('is-syncing', status === 'syncing');
    statusDot.classList.toggle('is-disconnected', status !== 'connected' && status !== 'syncing');
    statusDot.title = detail.error ? `${label}: ${detail.error}` : label;
  });
  if (text) text.textContent = label;
}

async function getFirebaseApi() {
  if (!firebaseApiPromise) {
    firebaseApiPromise = import('../firebase-config.js').catch(err => {
      firebaseApiPromise = null;
      throw err;
    });
  }
  return firebaseApiPromise;
}

async function readPortfolioDoc(docId) {
  try {
    const api = await getFirebaseApi();
    const data = await api.readPortfolioDoc(docId);
    if (api.getFirebaseConnectionStatus) setAdminFirebaseStatus(api.getFirebaseConnectionStatus());
    return ensureItemIds(data || await readLocalPortfolioDoc(docId));
  } catch (err) {
    setAdminFirebaseStatus('disconnected', { error: err.message });
    return ensureItemIds(await readLocalPortfolioDoc(docId));
  }
}

async function writePortfolioDoc(docId, data) {
  const api = await getFirebaseApi();
  const result = await api.writePortfolioDoc(docId, data);
  const status = api.getFirebaseConnectionStatus?.() || 'connected';
  setAdminFirebaseStatus(status);
  if (window._reloadPortfolioMetadata) await window._reloadPortfolioMetadata();
  return result || { synced: status === 'connected', status: status === 'connected' ? 'synced' : 'pending' };
}
function notifySaved(result, action = 'Saved') {
  showToast(result.synced ? `✅ ${action} successfully!` : '⚠️ Saved locally. Pending Firebase sync.', result.synced ? 'success' : 'info');
}

async function readAllPortfolioDocs() {
  try {
    const api = await getFirebaseApi();
    const data = await api.readAllPortfolioDocs();
    if (api.getFirebaseConnectionStatus) setAdminFirebaseStatus(api.getFirebaseConnectionStatus());
    return data;
  } catch (err) {
    setAdminFirebaseStatus('disconnected', { error: err.message });
    return readLocalPortfolioCache();
  }
}

// AI config lives in the admin-only 'admin' collection (never public).
async function readAiConfig() {
  try {
    const api = await getFirebaseApi();
    const data = await api.readAiConfig();
    if (api.getFirebaseConnectionStatus) setAdminFirebaseStatus(api.getFirebaseConnectionStatus());
    return data;
  } catch (err) {
    setAdminFirebaseStatus('disconnected', { error: err.message });
    return null;
  }
}

async function writeAiConfig(data) {
  const api = await getFirebaseApi();
  const result = await api.writeAiConfig(data);
  if (api.getFirebaseConnectionStatus) setAdminFirebaseStatus(api.getFirebaseConnectionStatus());
  return result;
}

// ─── INIT ────────────────────────────────────────────────────
export function initAdminMode() {
  injectStyles();
  injectPasswordModal();
  injectEditModal();
  initFormUsability();
  injectAdminToolbar();
  setAdminFirebaseStatus(window._firebaseConnectionStatus || 'disconnected');
  setupFooterTrigger();
  window.addEventListener('portfolio-firebase-status', (event) => {
    setAdminFirebaseStatus(event.detail?.status || 'unknown', event.detail || {});
  });
  console.log('[Admin] Ready. Click "Admin Login" in footer, use Ctrl+Shift+A, or triple-click footer.');
}

// ─── FOOTER TRIGGER ──────────────────────────────────────────
function setupFooterTrigger() {
  // Method 1: Keyboard shortcut Ctrl+Shift+A
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      if (isAdminMode) deactivateAdminMode();
      else showPasswordModal();
    }
  });

  // Method 2: Click the Admin Login button in footer
  const loginTrigger = document.getElementById('admin-login-trigger');
  if (loginTrigger) {
    loginTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isAdminMode) deactivateAdminMode();
      else showPasswordModal();
    });
  } else {
    console.warn('[Admin] #admin-login-trigger not found in DOM.');
  }

  // Method 3: Triple-click on footer (1200ms window) fallback
  const footer = document.querySelector('footer');
  if (footer) {
    footer.addEventListener('click', () => {
      footerClickCount++;
      clearTimeout(footerClickTimer);
      footerClickTimer = setTimeout(() => { footerClickCount = 0; }, 1200);
      if (footerClickCount >= 3) {
        footerClickCount = 0;
        if (isAdminMode) deactivateAdminMode();
        else showPasswordModal();
      }
    });
  }
}

// ─── PASSWORD MODAL ──────────────────────────────────────────
function showPasswordModal() {
  const overlay = document.getElementById('admin-pw-overlay');
  const input   = document.getElementById('admin-pw-input');
  const err     = document.getElementById('admin-pw-error');
  if (!overlay) {
    console.error('[Admin] Password overlay not found! Make sure initAdminMode() was called.');
    return;
  }
  overlay.classList.add('am-visible');
  input.value = '';
  err.textContent = '';
  setTimeout(() => input.focus(), 100);
}

function hidePasswordModal() {
  document.getElementById('admin-pw-overlay').classList.remove('am-visible');
}

async function checkPassword() {
  const input  = document.getElementById('admin-pw-input');
  const err    = document.getElementById('admin-pw-error');
  const btn    = document.getElementById('admin-pw-submit');

  btn.disabled    = true;
  btn.textContent = 'Signing in…';
  err.textContent = '';

  try {
    const api = await getFirebaseApi();
    await api.adminSignIn(input.value);
    hidePasswordModal();
    activateAdminMode();
  } catch (e) {
    err.textContent = /invalid-credential|wrong-password|user-not-found/.test(e.code || '') ? '❌ Incorrect password. Try again.' : `❌ Sign-in failed: ${e.message}`;
    input.value = '';
    input.focus();
    const box = document.getElementById('admin-pw-box');
    box.classList.add('am-shake');
    setTimeout(() => box.classList.remove('am-shake'), 500);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Login';
  }
}

async function requestPasswordReset() {
  const err  = document.getElementById('admin-pw-error');
  const link = document.getElementById('admin-pw-forgot');

  err.textContent = '';
  err.classList.remove('am-pw-success');
  link.disabled = true;
  const original = link.textContent;
  link.textContent = 'Sending reset email…';

  try {
    const api = await getFirebaseApi();
    const email = await api.adminResetPassword();
    err.textContent = `✅ Password reset link sent to ${email}. Check your inbox (and spam).`;
    err.classList.add('am-pw-success');
  } catch (e) {
    err.classList.remove('am-pw-success');
    err.textContent = `❌ Could not send reset email: ${e.message}`;
  } finally {
    link.disabled = false;
    link.textContent = original;
  }
}

function injectPasswordModal() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="admin-pw-overlay" class="am-overlay">
      <div id="admin-pw-box" class="am-pw-box">
        <div class="am-pw-icon">🔐</div>
        <h2 class="am-pw-title">Admin Mode</h2>
        <p class="am-pw-subtitle">Enter your Firebase Auth password</p>
        <input id="admin-pw-input" class="am-pw-input" type="password"
               placeholder="Password..." autocomplete="off">
        <p id="admin-pw-error" class="am-pw-error"></p>
        <div class="am-pw-btns">
          <button class="am-btn am-btn-ghost" id="admin-pw-cancel">Cancel</button>
          <button class="am-btn am-btn-primary" id="admin-pw-submit">Login</button>
        </div>
        <button type="button" id="admin-pw-forgot" class="am-pw-forgot">Forgot password?</button>
      </div>
    </div>
  `);

  document.getElementById('admin-pw-submit').addEventListener('click', checkPassword);
  document.getElementById('admin-pw-cancel').addEventListener('click', hidePasswordModal);
  document.getElementById('admin-pw-forgot').addEventListener('click', requestPasswordReset);
  document.getElementById('admin-pw-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
    if (e.key === 'Escape') hidePasswordModal();
  });
  document.getElementById('admin-pw-overlay').addEventListener('click', e => {
    if (e.target.id === 'admin-pw-overlay') hidePasswordModal();
  });
}

// ─── ADMIN TOOLBAR ───────────────────────────────────────────
function injectAdminToolbar() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="admin-toolbar" class="am-toolbar am-hidden">
      <div class="am-toolbar-inner">
        <span class="am-toolbar-badge">Portfolio / Admin</span>
        <div class="am-toolbar-actions">
          <button class="am-btn am-btn-sm" id="admin-config-btn">
            <span id="admin-firebase-dot" class="am-firebase-dot is-disconnected" title="Firebase disconnected"></span>
            🤖 Config
          </button>
          <button class="am-btn am-btn-sm am-btn-cv" id="admin-export-cv-btn">CV Studio</button>
          <button class="am-btn am-btn-sm" id="admin-workspace-toggle">Preview site</button>
          <button class="am-btn am-btn-sm" id="admin-export-seed-btn" title="Download the current Firestore data as js/db-seed.js so the offline fallback stays in sync">⬇️ Export Seed</button>
          <button class="am-btn am-btn-sm" id="admin-resolve-sync">Resolve Sync</button>
          <span class="am-toolbar-hint">Click the edit icon on sections to edit</span>
        </div>
        <button class="am-btn am-btn-danger-sm" id="admin-logout">Exit</button>
      </div>
    </div>
  `);
  document.getElementById('admin-resolve-sync').onclick=openSyncResolution;
  document.getElementById('admin-logout').addEventListener('click', deactivateAdminMode);
  document.getElementById('admin-config-btn').addEventListener('click', () => openConfigModal());
  const openCv=async()=>{try{await import('./cv-export.js?v=11');await window.openCVExportModal();}catch(error){showToast(error.message,'error');}};
  document.getElementById('admin-export-cv-btn').addEventListener('click',openCv);
  document.getElementById('admin-export-seed-btn').addEventListener('click', () => exportSeedFromFirestore());
  document.getElementById('admin-workspace-toggle').onclick=toggleWorkspace;
  initWorkspace({edit:openEditModal,add:openAddNewModal,layout:openLayoutEditModal,cv:openCv,config:openConfigModal,sync:openSyncResolution,backup:exportSeedFromFirestore,ai:initGlobalAIWidget,pending:readPendingPortfolioWrites});
}

// ─── EXPORT SEED (Firestore → js/db-seed.js) ─────────────────
// Canonical public sections, in render order. `metadata`, `ai-config`
// and internal `__*` keys are intentionally excluded from the seed.
const SEED_SECTION_ORDER = [
  'header', 'summary', 'experience', 'skills',
  'projects', 'achievements', 'education', 'contact',
];

function buildSeedDocs(allDocs) {
  const isPublicSection = (key) =>
    (SEED_SECTION_ORDER.includes(key)||['cv','custom-blocks'].includes(key));

  const ordered = {};
  SEED_SECTION_ORDER.forEach((key) => {
    if (allDocs[key]) ordered[key] = allDocs[key];
  });
  // Preserve any additional public sections not in the canonical list.
  Object.keys(allDocs)
    .filter((key) => isPublicSection(key) && !(key in ordered))
    .forEach((key) => { ordered[key] = allDocs[key]; });
  return ordered;
}

function buildSeedFileContent(seedDocs, stamp) {
  const json = JSON.stringify(seedDocs, null, 2);
  const seeders = Object.keys(seedDocs)
    .map((key) => `export const seed${key.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join('')} = () => writeSeedDoc(${JSON.stringify(key)}, PORTFOLIO_SEED_DOCS[${JSON.stringify(key)}]);`)
    .join('\n');

  return `/**
 * DB SEED SCRIPT — AUTO-GENERATED
 * =====================================================
 * Generated from live Firestore data on ${stamp}
 * via Admin Mode → "⬇️ Export Seed".
 *
 * This file is the offline / first-load fallback for the portfolio.
 * To regenerate: open the site, enter Admin Mode, click "Export Seed",
 * then replace js/db-seed.js with the downloaded file and commit it.
 * =====================================================
 */

export const PORTFOLIO_SEED_DOCS = ${json};

export function getSeedPortfolioData() {
  return JSON.parse(JSON.stringify(PORTFOLIO_SEED_DOCS));
}

async function writeSeedDoc(docId, data) {
  const { writePortfolioDoc } = await import("./firebase-config.js");
  return writePortfolioDoc(docId, data);
}

export async function seedAll() {
  console.log("🚀 [Seed] Starting to seed portfolio data to Firestore...");
  const docs = getSeedPortfolioData();
  for (const [docId, data] of Object.entries(docs)) {
    try {
      await writeSeedDoc(docId, data);
      console.log(\`  ✅ Seeded: portfolio/\${docId}\`);
    } catch (err) {
      console.error(\`  ❌ Failed: portfolio/\${docId}\`, err);
    }
  }
  console.log("🎉 [Seed] Seed complete! All portfolio data is now in Firestore.");
}

${seeders}
`;
}

function downloadTextFile(filename, content, mime = 'text/javascript') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportSeedFromFirestore() {
  const btn = document.getElementById('admin-export-seed-btn');
  const original = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Exporting...'; }
  try {
    const allDocs = await readAllPortfolioDocs();
    const seedDocs = buildSeedDocs(allDocs || {});
    const sectionCount = Object.keys(seedDocs).length;
    if (sectionCount === 0) {
      showToast('⚠️ No portfolio data found to export.', 'error');
      return;
    }
    const stamp = new Date().toISOString();
    const content = buildSeedFileContent(seedDocs, stamp);
    downloadTextFile('db-seed.js', content);
    showToast(`✅ Exported ${sectionCount} sections → db-seed.js. Replace js/db-seed.js and commit.`, 'success');
  } catch (err) {
    console.error('[Admin] Export seed failed:', err);
    showToast('❌ Export failed: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = original; }
  }
}

// ─── OPEN CONFIG MODAL ───────────────────────────────────────
async function openConfigModal(){window._adminNavigate?.('settings');}

function activateAdminMode() {
  isAdminMode = true;
  document.getElementById('admin-edit-save').disabled=false;
  document.body.classList.add('admin-mode');
  document.getElementById('admin-toolbar').classList.remove('am-hidden');
  addEditButtons();
  showWorkspace(true);
  
  // Note: injectAddNewButtons is handled via addEditButtons -> am-edit-menu -> "Add New"
  
  showToast('Admin Mode Enabled', 'success');
  
  // Initialize AI Widget globally
  initGlobalAIWidget();
}

function deactivateAdminMode(force = false) {
  if(force!==true&&mutationBusy){showToast('Please wait for the current save.','info');return;}
  if(force!==true&&isDirty()&&!window.confirm('Discard unsaved Admin edits and exit?'))return;
  if(window._cvClose&&window._cvClose(force===true)===false)return;
  if(force===true){modalSession++;document.getElementById('admin-edit-save').disabled=true;}
  else closeEditModal(true);
  isAdminMode = false;
  document.body.classList.remove('admin-mode');
  showWorkspace(false);
  document.getElementById('am-global-ai-widget')?._controller?.abort();closeAISuggestionModal();
  document.getElementById('am-global-ai-widget')?.remove();
  document.getElementById('admin-toolbar').classList.add('am-hidden');
  removeEditButtons();
  getFirebaseApi().then(api => api.adminSignOut()).catch(() => {});
  
  // Remove "Add New" buttons
  import('../portfolio-loader.js').then(loader => {
    if (loader.removeAddNewButtons) loader.removeAddNewButtons();
  }).catch(() => {});
  
  showToast('Admin Mode Disabled', 'info');
}

// ─── EDIT BUTTONS ────────────────────────────────────────────
const SECTIONS = [
  { id: 'header-edit-btn',       targetEl: 'header',        section: 'header',       label: 'Header' },
  { id: 'summary-edit-btn',      targetEl: '#summary',      section: 'summary',      label: 'Summary' },
  { id: 'experience-edit-btn',   targetEl: '#experience',   section: 'experience',   label: 'Experience' },
  { id: 'skills-edit-btn',       targetEl: '#skills',       section: 'skills',       label: 'Skills' },
  { id: 'projects-edit-btn',     targetEl: '#projects',     section: 'projects',     label: 'Projects' },
  { id: 'achievements-edit-btn', targetEl: '#achievements', section: 'achievements', label: 'Achievements' },
  { id: 'education-edit-btn',    targetEl: '#education',    section: 'education',    label: 'Education' },
  { id: 'contact-edit-btn',      targetEl: '#contact',      section: 'contact',      label: 'Contact' },
];

function addEditButtons() {
  SECTIONS.forEach(({ id, targetEl, section, label }) => {
    const el = document.querySelector(targetEl);
    if (!el) return;
    
    // Create wrapper for dropdown positioning
    const container = document.createElement('div');
    container.className = 'am-edit-container';
    container.id = id + '-container';

    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'am-edit-btn';
    btn.title = `Edit ${label}`;
    btn.setAttribute('aria-label', `Edit ${label}`);
    btn.innerHTML = `<i class="ri-pencil-line"></i>`;

    const menu = document.createElement('div');
    menu.className = 'am-edit-menu am-hidden';
    
    const hasLayout = ['summary', 'experience', 'skills', 'projects', 'achievements', 'education', 'contact'].includes(section);
    const hasAddNew = ['summary', 'experience', 'skills', 'projects', 'achievements', 'education', 'contact'].includes(section);
    let menuHtml = '';
    if (hasAddNew) {
      menuHtml += `
        <button class="am-edit-menu-item" data-action="add">
          <i class="ri-add-circle-line" style="color:#16a34a"></i> Add New
        </button>
      `;
    }
    menuHtml += `
      <button class="am-edit-menu-item" data-action="content">
        <i class="ri-edit-2-line" style="color:#2D5B8E"></i> Edit Content
      </button>
    `;
    if (hasLayout) {
      menuHtml += `
        <button class="am-edit-menu-item" data-action="layout">
          <i class="ri-drag-move-2-line" style="color:#7c3aed"></i> Edit Layout
        </button>
      `;
    }
    menu.innerHTML = menuHtml;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.am-edit-menu').forEach(m => {
        if (m !== menu) m.classList.add('am-hidden');
      });
      menu.classList.toggle('am-hidden');
    });

    menu.addEventListener('click', (e) => {
      e.stopPropagation();
      const actionBtn = e.target.closest('.am-edit-menu-item');
      if (!actionBtn) return;
      menu.classList.add('am-hidden');
      const act = actionBtn.dataset.action;
      if (act === 'add') {
        openAddNewModal(section, label);
      } else if (act === 'content') {
        openEditModal(section, label);
      } else if (act === 'layout') {
        openLayoutEditModal(section, label);
      }
    });

    container.appendChild(btn);
    container.appendChild(menu);

    el.style.position = 'relative';
    el.appendChild(container);
  });
  
  document.addEventListener('click', window._closeAllEditMenus);
}

window._closeAllEditMenus = function() {
  document.querySelectorAll('.am-edit-menu').forEach(m => m.classList.add('am-hidden'));
};

function removeEditButtons() {
  document.removeEventListener('click', window._closeAllEditMenus);
  SECTIONS.forEach(({ id }) => {
    const container = document.getElementById(id + '-container');
    if (container) container.remove();
  });
}

// ─── EDIT MODAL ──────────────────────────────────────────────
function injectEditModal() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="admin-edit-overlay" class="am-overlay">
      <div id="admin-edit-box" class="am-edit-box">
        <div class="am-edit-header">
          <h2 id="admin-edit-title" class="am-edit-title">Edit</h2>
          <button class="am-close-btn" id="admin-edit-close">✕</button>
        </div>
        <div id="admin-edit-body" class="am-edit-body"></div>
        <div class="am-edit-footer">
          <button class="am-btn am-btn-ghost" id="admin-edit-cancel">Cancel</button>
          <button class="am-btn am-btn-primary" id="admin-edit-save">
            <span id="admin-save-spinner" class="am-spinner am-hidden"></span>
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('admin-edit-close').addEventListener('click', closeEditModal);
  document.getElementById('admin-edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('admin-edit-overlay').addEventListener('click', e => {
    if (e.target.id === 'admin-edit-overlay') closeEditModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('admin-edit-overlay').classList.contains('am-visible')) {
      closeEditModal();
    }
  });
}

let currentSection = null;
let currentData = null;
let baselineData = null;
let modalSession = 0;
let modalMode = 'content';
let mutationBusy = false;
let layoutPath = '';
let draftUndo = [];
function resetModal(section, mode) {
  if (mutationBusy) throw new Error('Please wait for the current save.');
  currentSection = section; currentData = null; baselineData = null; modalMode = mode; draftUndo = [];
  modalSession++;
  const button = document.getElementById('admin-edit-save');
  button.style.display = ''; button.disabled = false;
  button.innerHTML = '<span id="admin-save-spinner" class="am-spinner am-hidden"></span> 💾 Save Changes';
  return modalSession;
}
function isDirty() {
  if (['layout','config'].includes(modalMode) || !currentSection) return false;
  if (modalMode === 'add') return [...document.querySelectorAll('#admin-edit-body input[data-new], #admin-edit-body textarea[data-new], #admin-edit-body input[data-img-result]')].some(el => el.value !== el.defaultValue);
  return baselineData && JSON.stringify(collectFormData(currentSection)) !== JSON.stringify(baselineData);
}
function bindBodyActions(body) {
  body.addEventListener('click', event => {
    const button = event.target.closest('.am-ai-suggest-btn');
    if (button) { event.preventDefault(); openAISuggestionModal(button.dataset.field || button.dataset.keyField); }
  });
}
window.addEventListener('beforeunload', event => { if (isDirty() || mutationBusy) { event.preventDefault(); event.returnValue = ''; } });

async function openEditModal(section, label) {
  const session = resetModal(section, 'content');
  document.getElementById('admin-edit-title').textContent = `✏️ Edit Content: ${label}`;
  document.getElementById('admin-edit-body').innerHTML = `<div class="am-loading">⏳ Loading data...</div>`;
  document.getElementById('admin-edit-overlay').classList.add('am-visible');

  try {
    const loaded = await readPortfolioDoc(section);
    if (session !== modalSession) return;
    if(section==='education')loaded.degrees?.forEach(degree=>{degree.logo=educationLogo(degree);});
    currentData = loaded; baselineData = clone(loaded);
    if (!currentData) throw new Error('Data could not be loaded');
    renderForm(section, currentData);
    baselineData=collectFormData(section);
  } catch (err) {
    document.getElementById('admin-edit-body').innerHTML =
      `<div class="am-error-msg">❌ Error: ${err.message}</div>`;
  }

  const saveBtn = document.getElementById('admin-edit-save');
  if (section === 'config') {
    // For config section, hide the default save button and use custom buttons
    saveBtn.style.display = 'none';
  } else {
    saveBtn.style.display = '';
    saveBtn.innerHTML = `
      <span id="admin-save-spinner" class="am-spinner am-hidden"></span>
      💾 Save Changes
    `;
    saveBtn.onclick = () => saveSection(section);
  }

  // Robust Event Delegation for dynamic buttons inside the modal body
  const editBody = document.getElementById('admin-edit-body');
  // Remove old listener if exists to prevent duplicates (by cloning)
  const newEditBody = editBody.cloneNode(true);
  editBody.parentNode.replaceChild(newEditBody, editBody);
  attachImageUploadListeners(newEditBody);
  
  // Special handling for config section
  if (section === 'config') { window._adminNavigate?.('settings'); return; }
  
  newEditBody.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.am-delete-btn');
    if (deleteBtn) {
      e.preventDefault();
      const path = deleteBtn.getAttribute('data-delete-path');
      const idx = parseInt(deleteBtn.getAttribute('data-delete-index'), 10);
      if (path && !isNaN(idx)) window._adminDeleteArrayItem(path, idx);
      return;
    }

    const restoreBtn = e.target.closest('.am-restore-btn');
    if (restoreBtn) {
      e.preventDefault();
      const idx = parseInt(restoreBtn.getAttribute('data-restore-index'), 10);
      if (!isNaN(idx)) window._adminRestoreProjectItem(idx);
      return;
    }

    const addSkillBtn = e.target.closest('.am-add-skill-btn');
    if (addSkillBtn) {
      e.preventDefault();
      const catIdx = parseInt(addSkillBtn.getAttribute('data-cat-index'), 10);
      if (!isNaN(catIdx)) window._adminAddSkillItem(catIdx);
      return;
    }

    const addHighlightBtn = e.target.closest('.am-add-highlight-btn');
    if (addHighlightBtn) {
      e.preventDefault();
      const jobIdx = parseInt(addHighlightBtn.getAttribute('data-job-index'), 10);
      if (!isNaN(jobIdx)) window._adminAddHighlightItem(jobIdx);
      return;
    }

    const aiSuggestBtn = e.target.closest('.am-ai-suggest-btn');
    if (aiSuggestBtn) {
      e.preventDefault();
      const field = aiSuggestBtn.getAttribute('data-field') || aiSuggestBtn.getAttribute('data-key-field');
      if (field) openAISuggestionModal(field);
      return;
    }
  });
}

function closeEditModal(force = false) {
  if (mutationBusy) return;
  if (force !== true && isDirty() && !window.confirm('Discard unsaved changes?')) return;
  modalSession++;
  document.getElementById('admin-edit-overlay').classList.remove('am-visible');
  currentSection = null;
  currentData = null;
}

// ─── IMAGE UPLOAD HELPER ─────────────────────────────────────
function renderImageUploadField(label, fieldName, currentUrl, {removable=false}={}) {
  const preview = currentUrl
    ? `<div class="am-img-preview-wrap"><img src="${esc(currentUrl)}" class="am-img-preview" alt="current"><span class="am-img-preview-label">Current</span></div>`
    : `<div class="am-img-no-preview"><i class="ri-image-2-line"></i><span>No image set</span></div>`;
  return `
    <div class="am-form-group">
      <label>${label}</label>
      <div class="am-img-upload-box">
        ${preview}
        <label class="am-img-upload-btn">
          <i class="ri-upload-cloud-2-line"></i> Choose / Upload Image
          <input type="file" accept="image/*" class="am-img-file-input am-hidden" data-img-field="${fieldName}">
        </label>
        <p class="am-hint-text" style="margin-top:0.4rem;">Or paste URL:</p>
        <input class="am-input" data-img-result="${fieldName}" placeholder="https://... or leave blank" value="${esc(currentUrl)}">
        <div class="am-img-new-preview"></div>
        ${removable ? '<button type="button" class="am-btn am-btn-ghost am-img-remove">Remove logo</button>' : ''}
      </div>
    </div>
  `;
}

function attachImageUploadListeners(container) {
  container.querySelectorAll('.am-img-remove').forEach(button=>{
    button.addEventListener('click',()=>{
      const wrap=button.closest('.am-img-upload-box');
      wrap._imageToken=(wrap._imageToken||0)+1;
      const result=wrap.querySelector('[data-img-result]');
      result.value='';result.dispatchEvent(new Event('input',{bubbles:true}));
      wrap.querySelector('input[type="file"]').value='';
      wrap.querySelector('.am-img-preview-wrap')?.remove();
      wrap.querySelector('.am-img-new-preview').textContent='Logo removed (unsaved)';
    });
  });
  container.querySelectorAll('.am-img-file-input').forEach(fileInput => {
    fileInput.addEventListener('change', function() {
      const file = this.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type) || file.size > 10 * 1024 * 1024) { showToast('Choose an image under 10 MB.', 'error'); this.value=''; return; }
      
      const wrap = this.closest('.am-img-upload-box');
      const token=wrap._imageToken=(wrap._imageToken||0)+1;
      const fieldName = this.dataset.imgField;
      const resultInput = wrap.querySelector(`[data-img-result="${fieldName}"]`);
      let previewEl = wrap.querySelector('.am-img-new-preview');
      
      if (previewEl) previewEl.innerHTML = `<div class="am-loading">⏳ Compressing image...</div>`;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          if(token!==wrap._imageToken)return;
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800; // max dimension

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to webp for better size reduction (or jpeg fallback)
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          
          if (resultInput) resultInput.value = dataUrl;
          if (previewEl) previewEl.innerHTML = `<img src="${dataUrl}" class="am-img-preview" alt="New image"><span class="am-img-preview-label" style="background:#16a34a">New (unsaved)</span>`;
        };
        img.onerror = () => { if(previewEl)previewEl.textContent='Image could not be decoded.';showToast('Image could not be decoded; choose another file.','error'); };
        img.src = ev.target.result;
      };
      reader.onerror=()=>showToast('Image could not be read.','error');
      reader.readAsDataURL(file);
    });
  });
}

// ─── ADD NEW MODAL ───────────────────────────────────────────
async function openAddNewModal(section, label) {
  resetModal(section, 'add');
  document.getElementById('admin-edit-title').textContent = `➕ Add New: ${label}`;
  const body = document.getElementById('admin-edit-body');
  body.innerHTML = renderAddNewForm(section);
  document.getElementById('admin-edit-overlay').classList.add('am-visible');

  const saveBtn = document.getElementById('admin-edit-save');
  saveBtn.innerHTML = `<span id="admin-save-spinner" class="am-spinner am-hidden"></span> ➕ Add Item`;
  saveBtn.onclick = () => saveNewItem(section);

  const newBody = body.cloneNode(true);
  body.parentNode.replaceChild(newBody, body);
  attachImageUploadListeners(newBody);
  bindBodyActions(newBody);
  const educationType=newBody.querySelector('[data-new="eduType"]');
  if(educationType)educationType.addEventListener('change',()=>{
    newBody.querySelector('.am-degree-logo').hidden=educationType.value!=='degree';
  });
}

function renderAddNewForm(section) {
  switch (section) {
    case 'experience': return `
      <div class="am-form-group"><label>Company Name</label><input class="am-input" data-new="company" placeholder="E.g: Google"></div>
      <div class="am-form-group"><label>Role / Position</label><input class="am-input" data-new="role" placeholder="E.g: QA Engineer"></div>
      <div class="am-form-group"><label>Badge</label><input class="am-input" data-new="badge" placeholder="E.g: Senior QA"></div>
      <div class="am-form-group"><label>Period</label><input class="am-input" data-new="period" placeholder="E.g: Jan 2024 - Present"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Job Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-new="description" rows="4" placeholder="Describe role & responsibilities..."></textarea></div>
      ${renderImageUploadField('Company Logo', 'logo', '')}
    `;
    case 'skills': return `
      <div class="am-form-group"><label>Category Name</label><input class="am-input" data-new="name" placeholder="E.g: Cloud Testing"></div>
      <div class="am-form-group"><label>Icon (Remix icon class)</label><input class="am-input" data-new="icon" placeholder="E.g: ri-cloud-line" value="ri-tools-line"></div>
      <p class="am-hint-text">Add individual skills via Edit Content after creating the category.</p>
    `;
    case 'projects': return `
      <div class="am-form-group"><label>Project Name</label><input class="am-input" data-new="title" placeholder="E.g: My New Project"></div>
      <div class="am-form-group"><label>Badge</label><input class="am-input" data-new="badge" placeholder="E.g: FinTech"></div>
      <div class="am-form-group"><label>Badge Color (Tailwind class)</label><input class="am-input" data-new="badgeColor" value="bg-primary" placeholder="bg-primary / bg-yellow-500"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Short Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-new="description" rows="3" placeholder="Brief project description..."></textarea></div>
      <div class="am-form-group"><label>Tags (comma-separated)</label><input class="am-input am-tags-input" data-new="tags" placeholder="E.g: Postman, Jira, API"></div>
      <div class="am-form-group"><label>Modal ID (unique, no spaces)</label><input class="am-input" data-new="modalId" placeholder="E.g: projectNew1"></div>
      ${renderImageUploadField('Project Detail Image (shown in View)', 'image', '')}
      <p class="am-hint-text">SiliconStack and Kraft Heinz cards use their company artwork. This image appears in the project details.</p>
      <div class="am-form-group"><label>Fallback Icon (Remix class, used when no image)</label><input class="am-input" data-new="imageIcon" placeholder="ri-code-box-line"></div>
      <hr class="am-divider" style="margin:20px 0; border:0; border-top:1px dashed #ccc;" />
      <div class="am-sub-label" style="margin-bottom:10px; font-weight:bold; color:#1e293b;"><i class="ri-article-line"></i> Modal Detail Content</div>
      <div class="am-form-group"><label>Duration</label><input class="am-input" data-new="detailDuration" placeholder="E.g: Jan 2025 - Present"></div>
      <div class="am-form-group"><label>Client</label><input class="am-input" data-new="detailClient" placeholder="E.g: Internal Product"></div>
      <div class="am-form-group"><label>Role</label><input class="am-input" data-new="detailRole" placeholder="E.g: Senior QA"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Overview (Paragraphs)</span>
          <button type="button" class="am-ai-suggest-btn" data-field="detailOverview">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-new="detailOverview" rows="4" placeholder="Detailed description of the project..."></textarea></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Responsibilities (1 bullet per line)</span>
          <button type="button" class="am-ai-suggest-btn" data-field="detailResponsibilities">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-new="detailResponsibilities" rows="4" placeholder="Analyzed requirements...&#10;Executed tests..."></textarea></div>
      <div class="am-form-group"><label>Technologies (Comma separated)</label><input class="am-input am-tags-input" data-new="detailTechnologies" placeholder="E.g: Selenium, Docker, Postman"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Results & Achievements (1 bullet per line)</span>
          <button type="button" class="am-ai-suggest-btn" data-field="detailResults">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-new="detailResults" rows="3" placeholder="Improved efficiency by 30%...&#10;Detected 12 critical bugs..."></textarea></div>
    `;
    case 'achievements': return `
      <div class="am-form-group"><label>Title</label><input class="am-input" data-new="title" placeholder="E.g: Best QA Award"></div>
      <div class="am-form-group"><label>Subtitle</label><input class="am-input" data-new="subtitle" placeholder="E.g: Annual Recognition"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-new="description" rows="3" placeholder="Achievement description..."></textarea></div>
      <div class="am-form-group"><label>Icon (Remix icon class)</label><input class="am-input" data-new="icon" value="ri-star-fill"></div>
      <div class="am-form-group"><label>Theme Color</label>
        <select class="am-input" data-new="color">
          <option value="yellow">Yellow 🏆</option><option value="blue">Blue ⭐</option>
          <option value="green">Green 🌿</option><option value="purple">Purple ✨</option>
          <option value="teal">Teal 🛡️</option><option value="primary">Primary</option>
        </select>
      </div>
    `;
    case 'education': return `
      <div class="am-form-group"><label>Type</label>
        <select class="am-input" data-new="eduType">
          <option value="certification">Certification</option>
          <option value="degree">Degree</option>
        </select>
      </div>
      <div class="am-form-group"><label>Name / Title</label><input class="am-input" data-new="title" placeholder="E.g: AWS Certified / B.S. Computer Science"></div>
      <div class="am-form-group"><label>Issuer / Institution</label><input class="am-input" data-new="issuer" placeholder="E.g: Amazon / VNU"></div>
      <div class="am-form-group"><label>Year / Period</label><input class="am-input" data-new="year" placeholder="E.g: 2025 / 2018-2022"></div>
      <div class="am-degree-logo" hidden>${renderImageUploadField('Institution Logo', 'logo', '', {removable:true})}</div>
      <div class="am-form-group"><label>Link (for Certifications)</label><input class="am-input" data-new="link" placeholder="https://..."></div>
      <div class="am-form-group"><label>Credential Note (optional, for Certifications)</label><input class="am-input" data-new="credentialNote" placeholder="E.g: Credential ID / extra note"></div>
      <div class="am-form-group"><label>Certification Group</label>
        <select class="am-input" data-new="group">
          <option value="google">Google</option>
          <option value="anthropic">Anthropic</option>
          <option value="udemy">Udemy</option>
          <option value="other">Other</option>
        </select>
      </div>
    `;
    case 'summary': return `
      <div class="am-form-group"><label>Type</label>
        <select class="am-input" data-new="summaryType">
          <option value="coreExpertise">Core Expertise</option>
          <option value="leadership">Leadership & Innovation</option>
        </select>
      </div>
      <div class="am-form-group"><label>Title</label><input class="am-input" data-new="title" placeholder="E.g: Strategic Leadership"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-new="description" rows="3" placeholder="Describe your expertise..."></textarea></div>
    `;
    case 'contact': return `
      <div class="am-form-group"><label>Social Network Name</label><input class="am-input" data-new="name" placeholder="E.g: LinkedIn"></div>
      <div class="am-form-group"><label>Icon (Remix icon class)</label><input class="am-input" data-new="icon" placeholder="E.g: ri-linkedin-fill" value="ri-link-line"></div>
      <div class="am-form-group"><label>URL</label><input class="am-input" data-new="url" placeholder="https://..."></div>
    `;
    default: return '<p class="am-hint-text">Adding new items is not yet supported for this section.</p>';
  }
}

async function saveNewItem(section) {
  if(!isAdminMode){showToast('Sign in again to save this draft.','error');return;}
  const session=modalSession;
  const body    = document.getElementById('admin-edit-body');
  const saveBtn = document.getElementById('admin-edit-save');
  const spinner = document.getElementById('admin-save-spinner');
  const firstInput = body.querySelector('input[data-new], textarea[data-new]');
  if (firstInput && !firstInput.value.trim()) {
    showToast('❌ Please fill in at least the first field.', 'error');
    firstInput.focus(); return;
  }
  saveBtn.disabled = true;
  mutationBusy=true;
  spinner?.classList.remove('am-hidden');
  const newItem = { _id: newId() };
  body.querySelectorAll('[data-new]').forEach(el => {
    const key = el.dataset.new;
    let val = el.value.trim();
    if (el.classList.contains('am-tags-input')) val = val.split(',').map(t => t.trim()).filter(Boolean);
    newItem[key] = val;
  });
  // Image field
  body.querySelectorAll('[data-img-result]').forEach(el => {
    if (el.value) newItem[el.dataset.imgResult] = el.value;
  });
  if (section === 'achievements' && newItem.color) {
    const colorMap = {
      yellow:{borderClass:'border-yellow-200',iconBgClass:'bg-yellow-100',iconTextClass:'text-yellow-600',subtitleClass:'text-yellow-600',cornerBgClass:'bg-yellow-50',cornerIconClass:'ri-trophy-fill text-yellow-400'},
      blue:{borderClass:'border-blue-200',iconBgClass:'bg-blue-100',iconTextClass:'text-blue-600',subtitleClass:'text-blue-600',cornerBgClass:'bg-blue-50',cornerIconClass:'ri-star-fill text-blue-400'},
      green:{borderClass:'border-green-200',iconBgClass:'bg-green-100',iconTextClass:'text-green-600',subtitleClass:'text-green-600',cornerBgClass:'bg-green-50',cornerIconClass:'ri-leaf-fill text-green-400'},
      purple:{borderClass:'border-purple-200',iconBgClass:'bg-purple-100',iconTextClass:'text-purple-600',subtitleClass:'text-purple-600',cornerBgClass:'bg-purple-50',cornerIconClass:'ri-sparkling-2-fill text-purple-400'},
      teal:{borderClass:'border-teal-200',iconBgClass:'bg-teal-100',iconTextClass:'text-teal-600',subtitleClass:'text-teal-600',cornerBgClass:'bg-teal-50',cornerIconClass:'ri-shield-check-fill text-teal-400'},
      primary:{borderClass:'border-primary/20',iconBgClass:'bg-primary/10',iconTextClass:'text-primary',subtitleClass:'text-primary',cornerBgClass:'bg-primary/5',cornerIconClass:'ri-team-fill text-primary/40'},
    };
    Object.assign(newItem, colorMap[newItem.color] || colorMap.primary);
  }
  if (section === 'skills') newItem.skills = [];
  if (section === 'projects') newItem.status = 'active';
  
  let arrayKeyMap = {experience:'jobs',skills:'categories',projects:'items',achievements:'items',education:'certifications',contact:'socials'};
  let arrayKey = arrayKeyMap[section];
  
  if (section === 'education') {
    if (newItem.eduType === 'degree') {
      newItem.logo=body.querySelector('[data-img-result="logo"]').value.trim();
      arrayKey = 'degrees';
      newItem.institution = newItem.issuer;
      newItem.period = newItem.year;
      delete newItem.issuer;
      delete newItem.year;
      delete newItem.link;
      delete newItem.credentialNote;
    } else delete newItem.logo;
    delete newItem.eduType;
  }
  
  if (section === 'summary') {
    arrayKey = newItem.summaryType;
    delete newItem.summaryType;
  }
  
  if (!arrayKey) { showToast('❌ Not supported.','error'); mutationBusy=false;saveBtn.disabled=false; spinner?.classList.add('am-hidden'); return; }
  try {
    const latest = await readPortfolioDoc(section);
    if (!latest) throw new Error('Data could not be loaded');
    if (!Array.isArray(latest[arrayKey])) latest[arrayKey] = [];
    validateItem(section, newItem, latest[arrayKey], {newItem:true});
    if(session!==modalSession)return;
    latest[arrayKey].push(newItem);
    const result = await writePortfolioDoc(section, latest);
    if (window._reloadPortfolioSection) await window._reloadPortfolioSection(section);
    notifySaved(result, 'Added');
    mutationBusy=false;
    if(session===modalSession)closeEditModal(true);
  } catch(err) {
    showFormError(err.message);
    showToast('❌ Error: ' + err.message, 'error');
  } finally {
    mutationBusy=false;
    saveBtn.disabled = false;
    spinner?.classList.add('am-hidden');
  }
}

// ─── LAYOUT EDIT MODAL ───────────────────────────────────────
function layoutGroups(section, data) {
  const groups = {summary:[['coreExpertise','Core Expertise'],['leadership','Leadership']], education:[['degrees','Degrees'],['certifications','Certifications']], skills:[['categories','Categories']], experience:[['jobs','Jobs']], projects:[['items','Projects']], achievements:[['items','Achievements']], contact:[['socials','Social Links']]}[section] || [];
  if (section === 'skills') (data.categories || []).forEach((x,i) => groups.push([`categories.${i}.skills`, `Skills: ${x.name}`]));
  if (section === 'experience') (data.jobs || []).forEach((x,i) => groups.push([`jobs.${i}.highlights`, `Highlights: ${x.company}`]));
  if (section === 'education') {
    const order = ['google','anthropic','udemy','other'];
    return groups.filter(x => x[0] !== 'certifications').concat(order.map(group => [`certifications:${group}`, `Certificates: ${group}`]));
  }
  return groups;
}
function layoutItems() {
  if (layoutPath.startsWith('certifications:')) return (currentData.certifications || []).filter(x => (x.group || (/google/i.test(x.issuer || '') ? 'google' : /anthropic/i.test(x.issuer || '') ? 'anthropic' : /udemy/i.test(x.issuer || '') ? 'udemy' : 'other')) === layoutPath.split(':')[1]);
  return atPath(currentData, layoutPath) || [];
}
function renderLayout() {
  const body = document.getElementById('admin-edit-body');
  const groups = layoutGroups(currentSection, currentData);
  body.innerHTML = `<label>Item group <select id="am-layout-group" class="am-input">${groups.map(([path,label]) => `<option value="${esc(path)}" ${path === layoutPath ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><p>Move items to reorder. Changes save automatically. Projects can be hidden and restored.</p><div id="am-sortable-list">${layoutItems().map((item,index) => `<div class="am-sortable-item" data-item-id="${esc(item._id)}"><i class="ri-draggable"></i><span class="flex-1">${esc(item.title || item.name || item.company || 'Item')}${item.status === 'inactive' ? ' (hidden)' : ''}</span><button type="button" data-move="-1" data-id="${esc(item._id)}" aria-label="Move up" ${index===0?'disabled':''}>↑</button><button type="button" data-move="1" data-id="${esc(item._id)}" aria-label="Move down" ${index===layoutItems().length-1?'disabled':''}>↓</button><button type="button" class="am-delete-btn-layout" data-id="${esc(item._id)}">${currentSection==='projects' ? item.status==='inactive'?'Restore':'Hide' : 'Delete'}</button></div>`).join('')}</div><button type="button" id="am-layout-undo" ${draftUndo.length?'':'disabled'}>Undo last change</button>`;
  body.querySelector('#am-layout-group').onchange = e => { layoutPath=e.target.value; renderLayout(); };
  body.querySelector('#am-layout-undo').onclick = () => commitLayout(() => { const saved=draftUndo.pop(); if(saved) currentData=saved; }, false);
  body.querySelectorAll('[data-move]').forEach(button => button.onclick = () => commitLayout(() => moveLayoutItem(button.dataset.id, Number(button.dataset.move))));
  body.querySelectorAll('.am-delete-btn-layout').forEach(button => button.onclick = () => {
    showCustomConfirm(currentSection === 'projects' ? 'Change project visibility?' : 'Delete this item? You can undo this change.', () => commitLayout(() => {
      const items=layoutItems(); const item=items.find(x=>x._id===button.dataset.id);
      if (!item) throw new Error('Item no longer exists. Reopen this editor.');
      if(currentSection==='projects') item.status=item.status==='inactive'?'active':'inactive';
      else { const arr=layoutPath.startsWith('certifications:')?currentData.certifications:atPath(currentData,layoutPath); arr.splice(arr.findIndex(x=>x._id===item._id),1); }
    }));
  });
  const list=body.querySelector('#am-sortable-list');
  if(window.Sortable) window.Sortable.create(list,{animation:150,handle:'.ri-draggable',onEnd:evt=>{
    if(evt.oldIndex===evt.newIndex)return;
    const ids=[...list.children].map(x=>x.dataset.itemId);
    commitLayout(()=>applyLayoutOrder(ids));
  }});
}
function applyLayoutOrder(ids) {
  const items=layoutItems(); const sorted=ids.map(id=>items.find(x=>x._id===id));
  if(sorted.some(x=>!x)||new Set(ids).size!==items.length)throw new Error('Invalid order.');
  if(layoutPath.startsWith('certifications:')) { const set=new Set(ids); let i=0; currentData.certifications=currentData.certifications.map(x=>set.has(x._id)?sorted[i++]:x); }
  else { const arr=atPath(currentData,layoutPath); arr.splice(0,arr.length,...sorted); }
}
function moveLayoutItem(id, direction) {
  const ids=layoutItems().map(x=>x._id); const index=ids.indexOf(id); const target=index+direction;
  if(index<0||target<0||target>=ids.length)return;
  [ids[index],ids[target]]=[ids[target],ids[index]]; applyLayoutOrder(ids);
}
async function commitLayout(change, remember=true) {
  if(mutationBusy||!isAdminMode)return;
  const section=currentSection, session=modalSession, before=clone(currentData), undoBefore=clone(draftUndo);
  mutationBusy=true; document.getElementById('admin-edit-save').disabled=true;
  document.getElementById('admin-edit-body').style.pointerEvents='none';
  try {
    change();
    currentData._revision=Number(before._revision||0);
    const result=await writePortfolioDoc(section,clone(currentData));
    if(session!==modalSession)return;
    if(remember)draftUndo.push(before);
    currentData=await readPortfolioDoc(section); baselineData=clone(currentData);
    if(window._reloadPortfolioSection)await window._reloadPortfolioSection(section);
    notifySaved(result,'Layout saved');
  } catch(err) { currentData=before;draftUndo=undoBefore; showToast(err.message,'error'); }
  finally { mutationBusy=false; document.getElementById('admin-edit-save').disabled=false; document.getElementById('admin-edit-body').style.pointerEvents=''; if(session===modalSession)renderLayout(); }
}
async function openLayoutEditModal(section,label) {
  const session=resetModal(section,'layout');
  document.getElementById('admin-edit-title').textContent=`Edit Layout: ${label}`;
  document.getElementById('admin-edit-body').innerHTML='<p>Loading...</p>';
  document.getElementById('admin-edit-overlay').classList.add('am-visible');
  const button=document.getElementById('admin-edit-save');button.innerHTML='Done';button.onclick=()=>closeEditModal(true);
  try { const data=await readPortfolioDoc(section); if(session!==modalSession)return;currentData=data;baselineData=clone(data);layoutPath=layoutGroups(section,data)[0]?.[0]||'';renderLayout();if(!window.Sortable)loadScript('https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js').then(()=>{if(session===modalSession&&!mutationBusy)renderLayout();}).catch(()=>showToast('Drag and drop is unavailable. Use the Move Up/Down buttons.','info')); }
  catch(err){if(session===modalSession)document.getElementById('admin-edit-body').textContent=err.message;}
}

// ─── ADD/DELETE HELPERS ──────────────────────────────────────
window._adminRestoreProjectItem = function(index) {
  if(currentSection!=='projects'||!currentData)return;
  currentData=collectFormData(currentSection);draftUndo.push(clone(currentData));
  currentData.items[index].status='active';renderForm(currentSection,currentData);
  attachImageUploadListeners(document.getElementById('admin-edit-body'));
  showToast('Restored in draft. Save Changes to apply.','info');
};

function showCustomConfirm(msg, callback) {
  let overlay = document.getElementById('am-confirm-overlay');
  if (!overlay) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="am-confirm-overlay" class="am-overlay am-visible" style="z-index: 999999;">
        <div class="am-pw-box" style="padding: 2.5rem 2rem;">
          <div class="am-pw-icon" style="color: #ef4444;"><i class="ri-error-warning-line"></i></div>
          <h2 class="am-pw-title" style="font-size: 1.25rem;">Confirm Action</h2>
          <p id="am-confirm-msg" class="am-pw-subtitle" style="margin-bottom: 2rem; color: #cbd5e1; font-size: 0.95rem;"></p>
          <div class="am-pw-btns">
            <button class="am-btn am-btn-ghost" id="am-confirm-cancel">Cancel</button>
            <button class="am-btn" id="am-confirm-ok" style="background: #dc2626; color: white;">Yes, exactly</button>
          </div>
        </div>
      </div>
    `);
    overlay = document.getElementById('am-confirm-overlay');
  } else {
    overlay.classList.add('am-visible');
  }
  
  document.getElementById('am-confirm-msg').textContent = msg;
  
  const cancelBtn = document.getElementById('am-confirm-cancel');
  const okBtn = document.getElementById('am-confirm-ok');
  
  // Clone nodes to override old listeners safely
  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  
  newCancel.addEventListener('click', () => {
    overlay.classList.remove('am-visible');
  });
  
  newOk.addEventListener('click', () => {
    overlay.classList.remove('am-visible');
    if (callback) callback();
  });
}

window._adminDeleteArrayItem = function(path,index) {
  const session=modalSession;
  const itemId=atPath(currentData,path)?.[index]?._id;
  showCustomConfirm(currentSection==='projects'?'Hide this project? Save Changes to apply.':'Delete this item from the draft? Save Changes to apply.',()=>{
    if(session!==modalSession||!currentData)return;
    currentData=collectFormData(currentSection);draftUndo.push(clone(currentData));
    const array=atPath(currentData,path), target=array?.findIndex(x=>x._id===itemId);
    if(target<0)return;
    if(currentSection==='projects'&&path==='items')array[target].status='inactive';else array.splice(target,1);
    renderForm(currentSection,currentData);attachImageUploadListeners(document.getElementById('admin-edit-body'));
    showToast('Draft changed. Save Changes to apply, or Cancel to discard.','info');
  });
};
window._adminAddSkillItem = function(catIndex) {
  if (currentData == null || currentSection !== 'skills') return;
  currentData = collectFormData(currentSection);
  if (!Array.isArray(currentData.categories[catIndex].skills)) {
    currentData.categories[catIndex].skills = [];
  }
  currentData.categories[catIndex].skills.push({ _id:newId(), title: '', desc: '', icon: 'ri-checkbox-line' });
  renderForm(currentSection, currentData);
  attachImageUploadListeners(document.getElementById('admin-edit-body'));
};

window._adminAddHighlightItem = function(jobIndex) {
  if (currentData == null || currentSection !== 'experience') return;
  currentData = collectFormData(currentSection);
  if (!currentData.jobs || currentData.jobs[jobIndex] == null) return;
  if (!Array.isArray(currentData.jobs[jobIndex].highlights)) {
    currentData.jobs[jobIndex].highlights = [];
  }
  currentData.jobs[jobIndex].highlights.push({ _id:newId(), icon: 'ri-check-line', title: '', desc: '' });
  renderForm(currentSection, currentData);
  attachImageUploadListeners(document.getElementById('admin-edit-body'));
};

// ─── FORM RENDERERS ──────────────────────────────────────────
function renderForm(section, data) {
  const body = document.getElementById('admin-edit-body');
  switch (section) {
    case 'header':       body.innerHTML = renderHeaderForm(data); break;
    case 'summary':      body.innerHTML = renderSummaryForm(data); break;
    case 'experience':   body.innerHTML = renderExperienceForm(data); break;
    case 'skills':       body.innerHTML = renderSkillsForm(data); break;
    case 'projects':     body.innerHTML = renderProjectsForm(data); break;
    case 'achievements': body.innerHTML = renderAchievementsForm(data); break;
    case 'education':    body.innerHTML = renderEducationForm(data); break;
    case 'contact':      body.innerHTML = renderContactForm(data); break;
    case 'config':       body.innerHTML = renderConfigForm(data); break;
    default:             body.innerHTML = '<p>This section does not support editing yet.</p>';
  }
  if (draftUndo.length && modalMode === 'content') { const undo=document.createElement('button');undo.type='button';undo.textContent='Undo last draft change';undo.onclick=()=>{currentData=draftUndo.pop();renderForm(section,currentData);attachImageUploadListeners(body);};body.prepend(undo); }
}

// ── HEADER FORM ──
function renderHeaderForm(d) {
  return `
    <div class="am-form-group"><label>Full Name</label>
      <input class="am-input" data-key="name" value="${esc(d.name)}"></div>
    <div class="am-form-group"><label>Job Title</label>
      <input class="am-input" data-key="title" value="${esc(d.title)}"></div>
    <div class="am-form-group"><label>Experience</label>
      <input class="am-input" data-key="experience" value="${esc(d.experience)}"></div>
    <div class="am-form-group"><label>Location</label>
      <input class="am-input" data-key="location" value="${esc(d.location)}"></div>
    <div class="am-form-group"><label>Email</label>
      <input class="am-input" data-key="email" value="${esc(d.email)}"></div>
    <div class="am-form-group"><label>Phone Number</label>
      <input class="am-input" data-key="phone" value="${esc(d.phone)}"></div>
    <div class="am-form-group"><label>Availability</label>
      <input class="am-input" data-key="availability" value="${esc(d.availability)}"></div>
    <div class="am-form-group"><label>LinkedIn URL</label>
      <input class="am-input" data-key="linkedin" value="${esc(d.linkedin || '')}" placeholder="https://linkedin.com/in/..."></div>
    <div class="am-form-group"><label>GitHub URL</label>
      <input class="am-input" data-key="github" value="${esc(d.github || '')}" placeholder="https://github.com/..."></div>
    <div class="am-form-group">
      <label style="display: flex; justify-content: space-between; align-items: center;">
        <span>Tagline / Description</span>
        <button type="button" class="am-ai-suggest-btn" data-key-field="tagline">
          <i class="ri-sparkles-line"></i> AI Suggest
        </button>
      </label>
      <textarea class="am-textarea" data-key="tagline" rows="4">${esc(d.tagline)}</textarea></div>
    <div class="am-form-group"><label>Hero Tags (comma-separated)</label>
      <input class="am-input" data-key="heroTags" value="${esc((d.heroTags||[]).join(', '))}"></div>
    ${renderImageUploadField('Profile Photo URL', 'profilePhoto', d.profilePhoto || d.avatar || '')}
    <div class="am-form-group"><label>Open to work</label><select class="am-input" data-key="openToWork"><option value="true" ${d.openToWork!==false?'selected':''}>Yes</option><option value="false" ${d.openToWork===false?'selected':''}>No</option></select></div>
    ${Object.entries({gender:'Male',dob:'January 19, 1999',hometown:'Binh Tan, Ho Chi Minh City, Vietnam',hobbies:'Exploring new technologies, reading tech blogs, gaming, photography',strengths:'Detail-oriented, fast learner, analytical mindset, strong collaborator',weaknesses:'Perfectionist — sometimes spends too long perfecting edge cases'}).map(([key,value])=>`<div class="am-form-group"><label>Profile: ${esc(key)}</label><input class="am-input" data-path="profileDetails.${key}" value="${esc(d.profileDetails?.[key]??value)}"></div>`).join('')}
  `;
}

// ── SUMMARY FORM ──
function renderSummaryForm(d) {
  const expertise = (d.coreExpertise||[]).map((item, i) => `
    <div class="am-sub-card">
      <div class="am-sub-card-header">
        <div class="am-sub-label">🔹 Item ${i+1}</div>
        <button type="button" class="am-delete-btn" data-delete-path="coreExpertise" data-delete-index="${i}"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
      <div class="am-form-group"><label>Title</label>
        <input class="am-input" data-path="coreExpertise.${i}.title" value="${esc(item.title)}"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="coreExpertise.${i}.description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="coreExpertise.${i}.description" rows="3">${esc(item.description)}</textarea></div>
    </div>`).join('');

  const leadership = (d.leadership||[]).map((item, i) => `
    <div class="am-sub-card">
      <div class="am-sub-card-header">
        <div class="am-sub-label">🔹 Item ${i+1}</div>
        <button type="button" class="am-delete-btn" data-delete-path="leadership" data-delete-index="${i}"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
      <div class="am-form-group"><label>Title</label>
        <input class="am-input" data-path="leadership.${i}.title" value="${esc(item.title)}"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="leadership.${i}.description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="leadership.${i}.description" rows="3">${esc(item.description)}</textarea></div>
    </div>`).join('');

  return `
    <div class="am-form-group">
      <label style="display: flex; justify-content: space-between; align-items: center;">
        <span>Overview</span>
        <button type="button" class="am-ai-suggest-btn" data-key-field="overview">
          <i class="ri-sparkles-line"></i> AI Suggest
        </button>
      </label>
      <textarea class="am-textarea" data-key="overview" rows="4">${esc(d.overview)}</textarea>
    </div>
    <div class="am-form-group">
      <label style="display: flex; justify-content: space-between; align-items: center;">
        <span>Career Objective</span>
        <button type="button" class="am-ai-suggest-btn" data-key-field="careerObjective">
          <i class="ri-sparkles-line"></i> AI Suggest
        </button>
      </label>
      <textarea class="am-textarea" data-key="careerObjective" rows="3">${esc(d.careerObjective)}</textarea>
    </div>
    <div class="am-section-label">Core Expertise</div>
    ${expertise}
    <div class="am-section-label">Leadership & Innovation</div>
    ${leadership}
  `;
}

// ── EXPERIENCE FORM ──
function renderExperienceForm(d) {
  return (d.jobs||[]).map((job, i) => `
    <div class="am-sub-card">
      <div class="am-sub-card-header">
        <div class="am-sub-label">🏢 Company ${i+1}</div>
        <button type="button" class="am-delete-btn" data-delete-path="jobs" data-delete-index="${i}"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
      <div class="am-form-group"><label>Company Name</label>
        <input class="am-input" data-path="jobs.${i}.company" value="${esc(job.company)}"></div>
      <div class="am-form-group"><label>Role/Position</label>
        <input class="am-input" data-path="jobs.${i}.role" value="${esc(job.role)}"></div>
      <div class="am-form-group"><label>Badge</label>
        <input class="am-input" data-path="jobs.${i}.badge" value="${esc(job.badge)}"></div>
      <div class="am-form-group"><label>Period</label>
        <input class="am-input" data-path="jobs.${i}.period" value="${esc(job.period)}"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Job Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="jobs.${i}.description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="jobs.${i}.description" rows="5">${esc(job.description)}</textarea>
      </div>
      ${renderImageUploadField('Company Logo URL', `jobs.${i}.logo`, job.logo || '')}
      <hr class="am-divider" style="margin:20px 0; border:0; border-top:1px dashed #ccc;" />
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div class="am-sub-label" style="font-weight:bold; color:#1e293b;"><i class="ri-medal-line"></i> Highlights (benefit grid)</div>
        <button type="button" class="am-add-highlight-btn" data-job-index="${i}" style="background:none; border:none; color:#2563eb; cursor:pointer; font-weight:600;"><i class="ri-add-circle-line"></i> Add Highlight</button>
      </div>
      ${(job.highlights||[]).map((hl, hi) => `
        <div class="am-skill-row">
          <div class="am-form-group" style="flex:0 0 150px;"><label>Icon ${hi+1}</label>
            <input class="am-input" data-path="jobs.${i}.highlights.${hi}.icon" value="${esc(hl.icon || '')}" placeholder="ri-check-line"></div>
          <div class="am-form-group am-flex-1"><label>Title</label>
            <input class="am-input" data-path="jobs.${i}.highlights.${hi}.title" value="${esc(hl.title)}"></div>
          <div class="am-form-group am-flex-2"><label>Description</label>
            <input class="am-input" data-path="jobs.${i}.highlights.${hi}.desc" value="${esc(hl.desc)}"></div>
          <button type="button" class="am-delete-btn" style="margin-top: 1.5rem; height: 38px;" tabindex="-1" title="Delete Highlight" data-delete-path="jobs.${i}.highlights" data-delete-index="${hi}"><i class="ri-delete-bin-line"></i></button>
        </div>`).join('')}
    </div>`).join('');
}

// ── SKILLS FORM ──
function renderSkillsForm(d) {
  return (d.categories||[]).map((cat, ci) => `
    <div class="am-sub-card">
      <div class="am-sub-card-header">
        <div class="am-sub-label">✨ Category ${ci+1}</div>
        <button type="button" class="am-delete-btn" data-delete-path="categories" data-delete-index="${ci}"><i class="ri-delete-bin-line"></i> Delete Category</button>
      </div>
      <div class="am-form-group"><label>Category Name</label>
        <input class="am-input" data-path="categories.${ci}.name" value="${esc(cat.name)}"></div>
      <div class="am-form-group"><label>Icon (Remix icon class)</label>
        <input class="am-input" data-path="categories.${ci}.icon" value="${esc(cat.icon)}"></div>
      <hr class="am-divider" style="margin:20px 0; border:0; border-top:1px dashed #ccc;" />
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div class="am-sub-label" style="font-weight:bold; color:#1e293b;"><i class="ri-tools-line"></i> Skills</div>
        <button type="button" class="am-add-skill-btn" data-cat-index="${ci}" style="background:none; border:none; color:#2563eb; cursor:pointer; font-weight:600;"><i class="ri-add-circle-line"></i> Add Skill</button>
      </div>
      ${(cat.skills||[]).map((sk, si) => `
        <div class="am-skill-row">
          <div class="am-form-group" style="flex:0 0 150px;"><label>Skill ${si+1} Icon</label>
            <input class="am-input" data-path="categories.${ci}.skills.${si}.icon" value="${esc(sk.icon || '')}" placeholder="ri-checkbox-line"></div>
          <div class="am-form-group am-flex-1"><label>Title</label>
            <input class="am-input" data-path="categories.${ci}.skills.${si}.title" value="${esc(sk.title)}"></div>
          <div class="am-form-group am-flex-2"><label>Description</label>
            <input class="am-input" data-path="categories.${ci}.skills.${si}.desc" value="${esc(sk.desc)}"></div>
          <button type="button" class="am-delete-btn" style="margin-top: 1.5rem; height: 38px;" tabindex="-1" title="Delete Skill" data-delete-path="categories.${ci}.skills" data-delete-index="${si}"><i class="ri-delete-bin-line"></i></button>
        </div>`).join('')}
    </div>`).join('');
}

// ── PROJECTS FORM ──
function renderProjectsForm(d) {
  return (d.items || []).map((proj, i) => {
    const inactive = proj.status === 'inactive';
    const headerActions = inactive
      ? `<button type="button" class="am-restore-btn" data-restore-index="${i}"><i class="ri-restart-line"></i> Restore Visibility</button>`
      : `<button type="button" class="am-delete-btn" data-delete-path="items" data-delete-index="${i}"><i class="ri-eye-off-line"></i> Hide from page</button>`;
    return `
    <div class="am-sub-card${inactive ? ' am-sub-card-inactive' : ''}">
      <div class="am-sub-card-header">
        <div class="am-sub-label">🚀 Project ${i + 1}${inactive ? ' <span class="am-badge-inactive">inactive</span>' : ''}</div>
        ${headerActions}
      </div>
      <div class="am-form-group"><label>Project Name</label>
        <input class="am-input" data-path="items.${i}.title" value="${esc(proj.title)}"></div>
      <div class="am-form-group"><label>Badge (top-left label)</label>
        <input class="am-input" data-path="items.${i}.badge" value="${esc(proj.badge)}"></div>
      <div class="am-form-group"><label>Badge Color (Tailwind class)</label>
        <input class="am-input" data-path="items.${i}.badgeColor" value="${esc(proj.badgeColor || 'bg-primary')}" placeholder="bg-primary / bg-yellow-500"></div>
      <div class="am-form-group"><label>Modal ID (unique, no spaces)</label>
        <input class="am-input" data-path="items.${i}.modalId" value="${esc(proj.modalId)}" placeholder="E.g: project1"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Short Description (card)</span>
          <button type="button" class="am-ai-suggest-btn" data-field="items.${i}.description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="items.${i}.description" rows="3">${esc(proj.description)}</textarea></div>
      <div class="am-form-group"><label>Tags (comma-separated)</label>
        <input class="am-input am-tags-input" data-path="items.${i}.tags" value="${esc((proj.tags || []).join(', '))}"></div>
      ${renderImageUploadField('Project Detail Image (shown in View)', `items.${i}.image`, proj.image || '')}
      <p class="am-hint-text">SiliconStack and Kraft Heinz cards use their company artwork. This image appears in the project details.</p>
      <div class="am-form-group"><label>Fallback Icon (Remix class, used when no image)</label>
        <input class="am-input" data-path="items.${i}.imageIcon" value="${esc(proj.imageIcon || '')}" placeholder="ri-code-box-line"></div>
      <hr class="am-divider" style="margin:20px 0; border:0; border-top:1px dashed #ccc;" />
      <div class="am-sub-label" style="margin-bottom:10px; font-weight:bold; color:#1e293b;"><i class="ri-article-line"></i> Modal Detail Content</div>
      <div class="am-form-group"><label>Duration</label>
        <input class="am-input" data-path="items.${i}.detailDuration" value="${esc(proj.detailDuration)}"></div>
      <div class="am-form-group"><label>Client</label>
        <input class="am-input" data-path="items.${i}.detailClient" value="${esc(proj.detailClient)}"></div>
      <div class="am-form-group"><label>Role</label>
        <input class="am-input" data-path="items.${i}.detailRole" value="${esc(proj.detailRole)}"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Overview (Separate paragraphs with newlines)</span>
          <button type="button" class="am-ai-suggest-btn" data-field="items.${i}.detailOverview" data-project-index="${i}">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="items.${i}.detailOverview" rows="4">${esc(proj.detailOverview)}</textarea>
      </div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Responsibilities (1 bullet per line)</span>
          <button type="button" class="am-ai-suggest-btn" data-field="items.${i}.detailResponsibilities" data-project-index="${i}">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="items.${i}.detailResponsibilities" rows="4">${esc(proj.detailResponsibilities)}</textarea>
      </div>
      <div class="am-form-group"><label>Technologies (Comma separated)</label>
        <input class="am-input am-tags-input" data-path="items.${i}.detailTechnologies" value="${esc(proj.detailTechnologies)}"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Results & Achievements (1 bullet per line)</span>
          <button type="button" class="am-ai-suggest-btn" data-field="items.${i}.detailResults">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="items.${i}.detailResults" rows="3">${esc(proj.detailResults)}</textarea></div>
    </div>`;
  }).join('');
}

// ── ACHIEVEMENTS FORM ──
function renderAchievementsForm(d) {
  return (d.items||[]).map((item, i) => `
    <div class="am-sub-card">
      <div class="am-sub-card-header">
        <div class="am-sub-label">🏆 Achievement ${i+1}</div>
        <button type="button" class="am-delete-btn" data-delete-path="items" data-delete-index="${i}"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
      <div class="am-form-group"><label>Title</label>
        <input class="am-input" data-path="items.${i}.title" value="${esc(item.title)}"></div>
      <div class="am-form-group"><label>Subtitle</label>
        <input class="am-input" data-path="items.${i}.subtitle" value="${esc(item.subtitle)}"></div>
      <div class="am-form-group"><label>Main Icon (Remix icon class)</label>
        <input class="am-input" data-path="items.${i}.icon" value="${esc(item.icon || 'ri-star-fill')}"></div>
      <div class="am-form-group"><label>Corner Icon (Remix icon class)</label>
        <input class="am-input" data-path="items.${i}.cornerIconClass" value="${esc(item.cornerIconClass || 'ri-star-fill text-yellow-400')}"></div>
      <div class="am-form-group"><label>Theme Color (Re-apply classes)</label>
        <select class="am-input" data-achievement-color="items.${i}">
          <option value="">Keep Current Styles</option>
          <option value="yellow">Yellow 🏆</option><option value="blue">Blue ⭐</option>
          <option value="green">Green 🌿</option><option value="purple">Purple ✨</option>
          <option value="teal">Teal 🛡️</option><option value="primary">Primary</option>
        </select>
      </div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="items.${i}.description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="items.${i}.description" rows="3">${esc(item.description)}</textarea></div>
    </div>`).join('');
}

// ── EDUCATION FORM ──
function renderEducationForm(d) {
  const degrees = (d.degrees||[]).map((deg, i) => `
    <div class="am-sub-card">
      <div class="am-sub-card-header">
        <div class="am-sub-label">🎓 Degree ${i+1}</div>
        <button type="button" class="am-delete-btn" data-delete-path="degrees" data-delete-index="${i}"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
      <div class="am-form-group"><label>Degree Name</label>
        <input class="am-input" data-path="degrees.${i}.title" value="${esc(deg.title)}"></div>
      <div class="am-form-group"><label>Institution</label>
        <input class="am-input" data-path="degrees.${i}.institution" value="${esc(deg.institution)}"></div>
      ${renderImageUploadField('Institution Logo', `degrees.${i}.logo`, educationLogo(deg), {removable:true})}
      <div class="am-form-group"><label>Period</label>
        <input class="am-input" data-path="degrees.${i}.period" value="${esc(deg.period)}"></div>
      <div class="am-form-group">
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Description</span>
          <button type="button" class="am-ai-suggest-btn" data-field="degrees.${i}.description">
            <i class="ri-sparkles-line"></i> AI Suggest
          </button>
        </label>
        <textarea class="am-textarea" data-path="degrees.${i}.description" rows="2">${esc(deg.description)}</textarea></div>
    </div>`).join('');

  const certs = (d.certifications||[]).map((cert, i) => `
    <div class="am-sub-card">
      <div class="am-sub-card-header">
        <div class="am-sub-label">📜 Certification ${i+1}</div>
        <button type="button" class="am-delete-btn" data-delete-path="certifications" data-delete-index="${i}"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
      <div class="am-form-group"><label>Certification Name</label>
        <input class="am-input" data-path="certifications.${i}.title" value="${esc(cert.title)}"></div>
      <div class="am-form-group"><label>Issuer</label>
        <input class="am-input" data-path="certifications.${i}.issuer" value="${esc(cert.issuer)}"></div>
      <div class="am-form-group"><label>Year</label>
        <input class="am-input" data-path="certifications.${i}.year" value="${esc(cert.year)}"></div>
      <div class="am-form-group"><label>Certification Link</label>
        <input class="am-input" data-path="certifications.${i}.link" value="${esc(cert.link||'')}"></div>
      <div class="am-form-group"><label>Credential Note (optional)</label>
        <input class="am-input" data-path="certifications.${i}.credentialNote" value="${esc(cert.credentialNote||'')}" placeholder="E.g: Credential ID / extra note"></div>
      <div class="am-form-group"><label>Certification Group</label>
        <select class="am-input" data-path="certifications.${i}.group">
          <option value="google" ${cert.group === 'google' ? 'selected' : ''}>Google</option>
          <option value="anthropic" ${cert.group === 'anthropic' ? 'selected' : ''}>Anthropic</option>
          <option value="udemy" ${cert.group === 'udemy' ? 'selected' : ''}>Udemy</option>
          <option value="other" ${(!cert.group || cert.group === 'other') ? 'selected' : ''}>Other</option>
        </select>
        <p class="am-hint-text">Group controls the card theme/section. Auto-detected from issuer name if left as Other.</p>
      </div>
    </div>`).join('');

  return `
    <div class="am-section-label">Degrees</div>${degrees}
    <div class="am-section-label">Certifications</div>${certs}`;
}

// ── CONTACT FORM ──
function renderContactForm(d) {
  return `
    <div class="am-form-group"><label>Email</label>
      <input class="am-input" data-key="email" value="${esc(d.email)}"></div>
    <div class="am-form-group"><label>Phone Number</label>
      <input class="am-input" data-key="phone" value="${esc(d.phone)}"></div>
    <div class="am-form-group"><label>Location</label>
      <input class="am-input" data-key="location" value="${esc(d.location)}"></div>
    <div class="am-section-label">Social Networks</div>
    ${(d.socials||[]).map((s, i) => `
      <div class="am-sub-card">
        <div class="am-sub-card-header">
          <div class="am-sub-label">${esc(s.name)}</div>
          <button type="button" class="am-delete-btn" data-delete-path="socials" data-delete-index="${i}"><i class="ri-delete-bin-line"></i> Delete</button>
        </div>
        <div class="am-form-group"><label>Name</label>
          <input class="am-input" data-path="socials.${i}.name" value="${esc(s.name||'')}"></div>
        <div class="am-form-group"><label>Icon (Remix icon class)</label>
          <input class="am-input" data-path="socials.${i}.icon" value="${esc(s.icon||'')}" placeholder="ri-linkedin-fill"></div>
        <div class="am-form-group"><label>URL</label>
          <input class="am-input" data-path="socials.${i}.url" value="${esc(s.url||'')}"></div>
      </div>`).join('')}
  `;
}

// ── CONFIG FORM ──
function renderConfigForm(){return '<p>Manage AI providers in Workspace Settings.</p>';}

async function saveSection(section) {
  if(mutationBusy||!isAdminMode)return;
  const session=modalSession, saveBtn=document.getElementById('admin-edit-save');
  mutationBusy=true;saveBtn.disabled=true;
  try {
    const updatedData=collectFormData(section);
    for(const key of ['items','jobs','categories','degrees','certifications','socials','coreExpertise','leadership']) {
      if(Array.isArray(updatedData[key]))updatedData[key].forEach(item=>{const original=baselineData?.[key]?.find(x=>x._id===item._id);validateItem(section,item,updatedData[key],{newItem:!original,original});});
    }
    if(section==='header'){
      for(const key of ['name','title'])if(!String(updatedData[key]||'').trim())throw new Error(`${key} is required.`);
      if(updatedData.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedData.email))throw new Error('Enter a valid email address.');
    }
    for(const [parentKey,childKey] of [['categories','skills'],['jobs','highlights']])for(const parent of updatedData[parentKey]||[]){
      const originalParent=baselineData?.[parentKey]?.find(x=>x._id===parent._id);
      for(const child of parent[childKey]||[]){const old=originalParent?.[childKey]?.find(x=>x._id===child._id);if((!old||old.title)&&!String(child.title||'').trim())throw new Error('New or edited skills/highlights require a title.');}
    }
    const result=await writePortfolioDoc(section,updatedData);
    if(window._reloadPortfolioSection)await window._reloadPortfolioSection(section);
    if(session===modalSession){notifySaved(result);baselineData=clone(updatedData);mutationBusy=false;closeEditModal(true);}
  }catch(err){showFormError(err.message);showToast(err.message,'error');}
  finally{mutationBusy=false;saveBtn.disabled=!isAdminMode;}
}

function collectFormData(section) {
  const body = document.getElementById('admin-edit-body');
  const data = JSON.parse(JSON.stringify(currentData)); // deep clone

  // Simple key fields (data-key)
  body.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    let val = el.value;
    if(key==='openToWork')val=el.value==='true';
    if (key === 'heroTags') {
      val = val.split(',').map(t => t.trim()).filter(Boolean);
    }
    data[key] = val;
  });

  // Nested path fields (data-path like "jobs.0.company")
  body.querySelectorAll('[data-path]').forEach(el => {
    const path = el.dataset.path.split('.');
    let val = el.value;
    // Tags fields: convert comma-separated string to array
    if (el.classList.contains('am-tags-input')) {
      val = val.split(',').map(t => t.trim()).filter(Boolean);
    }
    setNestedValue(data, path, val);
  });

  // Image result fields
  body.querySelectorAll('[data-img-result]').forEach(el => {
    let val = el.value;
    if (val !== undefined) {
      const fieldPath = el.dataset.imgResult;
      if (fieldPath.includes('.')) {
        setNestedValue(data, fieldPath.split('.'), val);
      } else {
        data[fieldPath] = val;
      }
    }
  });

  if (section === 'achievements') {
    body.querySelectorAll('[data-achievement-color]').forEach(el => {
      const val = el.value;
      if (val) {
        const path = el.dataset.achievementColor.split('.');
        let targetObj = data;
        path.forEach(p => targetObj = targetObj[p]);
        
        const colorMap = {
          yellow:{borderClass:'border-yellow-200',iconBgClass:'bg-yellow-100',iconTextClass:'text-yellow-600',subtitleClass:'text-yellow-600',cornerBgClass:'bg-yellow-50',cornerIconClass:'ri-trophy-fill text-yellow-400'},
          blue:{borderClass:'border-blue-200',iconBgClass:'bg-blue-100',iconTextClass:'text-blue-600',subtitleClass:'text-blue-600',cornerBgClass:'bg-blue-50',cornerIconClass:'ri-star-fill text-blue-400'},
          green:{borderClass:'border-green-200',iconBgClass:'bg-green-100',iconTextClass:'text-green-600',subtitleClass:'text-green-600',cornerBgClass:'bg-green-50',cornerIconClass:'ri-leaf-fill text-green-400'},
          purple:{borderClass:'border-purple-200',iconBgClass:'bg-purple-100',iconTextClass:'text-purple-600',subtitleClass:'text-purple-600',cornerBgClass:'bg-purple-50',cornerIconClass:'ri-sparkling-2-fill text-purple-400'},
          teal:{borderClass:'border-teal-200',iconBgClass:'bg-teal-100',iconTextClass:'text-teal-600',subtitleClass:'text-teal-600',cornerBgClass:'bg-teal-50',cornerIconClass:'ri-shield-check-fill text-teal-400'},
          primary:{borderClass:'border-primary/20',iconBgClass:'bg-primary/10',iconTextClass:'text-primary',subtitleClass:'text-primary',cornerBgClass:'bg-primary/5',cornerIconClass:'ri-team-fill text-primary/40'},
        };
        Object.assign(targetObj, colorMap[val]);
      }
    });
  }

  return data;
}

// ─── HTML ESCAPE ─────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function setNestedValue(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = isNaN(path[i]) ? path[i] : parseInt(path[i]);
    if (cur[key] === undefined) cur[key] = isNaN(path[i+1]) ? {} : [];
    cur = cur[key];
  }
  const lastKey = isNaN(path[path.length-1]) ? path[path.length-1] : parseInt(path[path.length-1]);
  cur[lastKey] = value;
}

// ─── TOAST NOTIFICATION ──────────────────────────────────────
window._adminShowToast = function showToast(msg, type = 'info') {
  let container = document.getElementById('am-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'am-toast-container';
    container.className = 'am-toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `am-toast am-toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  // Animate in
  requestAnimationFrame(() => toast.classList.add('am-toast-show'));
  setTimeout(() => {
    toast.classList.remove('am-toast-show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Keep the old function signature internally too
function showToast(msg, type) {
  window._adminShowToast(msg, type);
}

// ─── CONFIG EVENT LISTENERS ──────────────────────────────────
async function initGlobalAIWidget(configData = null) {
  if (!configData) {
    // Includes a Claude CLI activation stored on this device.
    configData = await loadAiSettings().catch(() => null);
  }
  if (!activeProvider(normalizeSettings(configData)).ready) {
    const existing = document.getElementById('am-global-ai-widget');
    if (existing){existing._controller?.abort();existing.remove();}
    return;
  }
  
  if(!isAdminMode)return;

  let widget = document.getElementById('am-global-ai-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'am-global-ai-widget';
    widget.className = 'am-global-ai-widget am-minimized';
    widget.innerHTML = `
      <div class="am-ai-widget-header" id="am-ai-widget-toggle">
        <div class="am-ai-widget-title">✨ AI Assistant</div>
        <div class="am-ai-widget-actions">
          <button id="am-ai-widget-icon"><i class="ri-arrow-up-s-line"></i></button>
        </div>
      </div>
      <div class="am-ai-widget-body">
        <div id="ai-chat-history" class="am-chat-history">
          <div class="am-chat-message am-chat-ai">
            <div class="am-chat-avatar">🤖</div>
            <div class="am-chat-content">
              <div class="am-chat-text">Ask about your experience, projects or skills. Suggestions here do not change your portfolio. Use CV Studio to review and apply CV improvements.</div>
            </div>
          </div>
        </div>
        <div class="am-chat-input-container">
          <textarea id="ai-chat-input" placeholder="Ask AI anything..." rows="1"></textarea>
          <button id="ai-send-message" title="Send"><i class="ri-send-plane-fill"></i></button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    // Event Listeners
    const toggleBtn = widget.querySelector('#am-ai-widget-toggle');
    const icon = widget.querySelector('#am-ai-widget-icon i');
    const sendBtn = widget.querySelector('#ai-send-message');
    const chatInput = widget.querySelector('#ai-chat-input');

    toggleBtn.addEventListener('click', () => {
      widget.classList.toggle('am-minimized');
      icon.className = widget.classList.contains('am-minimized') ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line';
      if (!widget.classList.contains('am-minimized')) chatInput.focus();
    });

    sendBtn.addEventListener('click', () => sendGlobalAIMessage());
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendGlobalAIMessage();
      }
    });
  }
  mountWorkspaceAI(widget);
  if(!widget.querySelector('[data-chat-context]')){const host=document.createElement('div');host.dataset.chatContext='true';host.style.padding='10px';widget.querySelector('.am-ai-widget-body').prepend(host);widget._contextPicker=await contextPicker(host);if(!isAdminMode||!widget.isConnected)return;const cancel=document.createElement('button');cancel.textContent='Cancel response';cancel.onclick=()=>widget._controller?.abort();host.append(cancel);}
  const provider=activeProvider(normalizeSettings(configData));widget.querySelector('.am-ai-widget-title').textContent=`AI Assistant / ${provider.label} / ${provider.config.model}`;

}

async function sendGlobalAIMessage(){
 const widget=document.getElementById('am-global-ai-widget');if(!widget||widget._controller)return;
 const input=widget.querySelector('#ai-chat-input'),button=widget.querySelector('#ai-send-message'),history=widget.querySelector('#ai-chat-history'),message=input.value.trim();if(!message)return;
 const append=(text,kind)=>{const node=document.createElement('div');node.className=`am-chat-message am-chat-${kind}`;node.innerHTML=`<div class="am-chat-content"><div class="am-chat-text">${esc(text).replace(/\n/g,'<br>')}</div></div>`;history.append(node);history.scrollTop=history.scrollHeight;};
 const controller=new AbortController(),started=performance.now();widget._controller=controller;input.disabled=true;button.disabled=true;append(message,'user');input.value='';widget._history??=[];
 try{const portfolio=await readAllPortfolioDocs(),result=await runAi({task:'chat',input:{messages:[...widget._history,{role:'user',content:message}],portfolio},contextIds:widget._contextPicker?.ids(),signal:controller.signal});if(!isAdminMode||!widget.isConnected)return;if(JSON.stringify(await readAllPortfolioDocs())!==JSON.stringify(portfolio))throw new Error('Portfolio changed during the request. Retry with current content.');append(result.text,'ai');const usage=result.usage||{},meta=document.createElement('small');meta.className='am-chat-meta';meta.textContent=[result.resolvedModel||result.model,`${((performance.now()-started)/1000).toFixed(1)}s`,usage.outputTokens?`${usage.inputTokens||0}→${usage.outputTokens} tokens`:''].filter(Boolean).join(' · ');history.lastElementChild.querySelector('.am-chat-content').append(meta);widget._history=[...widget._history,{role:'user',content:message},{role:'assistant',content:result.text}].slice(-20);}
 catch(error){if(widget.isConnected){append(error.message,'error');const retry=document.createElement('button');retry.textContent='Retry this message';retry.onclick=()=>{if(widget._controller)return;input.value=message;sendGlobalAIMessage();retry.remove();};history.lastElementChild.append(retry);}}finally{widget._controller=null;input.disabled=false;button.disabled=false;}
}

function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.id = 'admin-mode-styles';
  styleEl.textContent = ADMIN_STYLES;
  document.head.appendChild(styleEl);
}

// ─── AI SUGGESTION MODAL ────────────────────────────────────
let suggestionState;
async function openAISuggestionModal(field){
 if(!activeProvider(await loadAiSettings()).ready){showToast('Choose and test your AI provider in Settings first.','error');return;}
 closeAISuggestionModal();const input=[...document.querySelectorAll('[data-path],[data-key],[data-new]')].find(x=>[x.dataset.path,x.dataset.key,x.dataset.new].includes(field));if(!input)return;
 const original=input.value,session=modalSession;
 document.body.insertAdjacentHTML('beforeend',`<div id="ai-suggestion-overlay" class="am-overlay am-visible"><div class="am-edit-box" style="max-width:800px"><div class="am-edit-header"><h2 class="am-edit-title">AI content suggestions</h2><button id="ai-suggestion-close" class="am-close-btn" aria-label="Close">?</button></div><div class="am-edit-body"><div class="am-form-group"><label>Current wording</label><textarea class="am-textarea" id="ai-current-content" readonly>${esc(original)}</textarea></div><div class="am-form-group"><label>Instructions / facts for new content</label><textarea class="am-textarea" id="ai-instructions"></textarea></div><select id="ai-writing-action" class="am-input"><option value="improve">Improve</option><option value="concise">Concise</option><option value="bullets">Bullets</option><option value="translate">Translate to Vietnamese</option><option value="write">Write from source facts</option></select><div id="ai-field-context"></div><button class="am-btn am-btn-primary" id="ai-generate-suggestion">Generate suggestion</button><button class="am-btn am-btn-ghost" id="ai-stop-suggestion" hidden>Cancel request</button><div id="ai-suggestion-result" class="am-hidden"><label>Proposed wording</label><textarea id="ai-optimized-content" class="am-textarea" rows="8"></textarea><div id="ai-summary"></div><button class="am-btn am-btn-primary" id="ai-apply-suggestion">Apply to draft</button><button class="am-btn am-btn-ghost" id="ai-cancel-suggestion">Close</button></div><p id="ai-suggestion-status" role="status"></p></div></div></div>`);
 const overlay=document.getElementById('ai-suggestion-overlay');suggestionState={input,original,session,field,overlay,picker:await contextPicker(document.getElementById('ai-field-context'))};
 document.getElementById('ai-suggestion-close').onclick=closeAISuggestionModal;document.getElementById('ai-cancel-suggestion').onclick=closeAISuggestionModal;
 document.getElementById('ai-generate-suggestion').onclick=generateAISuggestion;document.getElementById('ai-apply-suggestion').onclick=applyAISuggestion;document.getElementById('ai-stop-suggestion').onclick=()=>suggestionState?.controller?.abort();
}
function closeAISuggestionModal(){suggestionState?.controller?.abort();document.getElementById('ai-suggestion-overlay')?.remove();suggestionState=null;}
async function generateAISuggestion(){
 const current=suggestionState;if(!current||current.controller)return;const button=document.getElementById('ai-generate-suggestion'),status=document.getElementById('ai-suggestion-status'),controller=new AbortController();current.controller=controller;button.disabled=true;document.getElementById('ai-stop-suggestion').hidden=false;document.getElementById('ai-suggestion-result').classList.add('am-hidden');status.textContent='Generating?';
 try{current.contextIds=current.picker.ids();current.result=await runAi({task:document.getElementById('ai-writing-action').value==='write'?'content-write':'content-rewrite',input:{field:current.field,original:current.original,instructions:document.getElementById('ai-instructions').value,action:document.getElementById('ai-writing-action').value,portfolio:await readAllPortfolioDocs()},contextIds:current.contextIds,signal:controller.signal});if(suggestionState!==current||modalSession!==current.session||current.input.value!==current.original||!current.input.isConnected)throw new Error('Content form changed. Generate a new suggestion.');document.getElementById('ai-optimized-content').value=current.result.structured.optimizedContent;document.getElementById('ai-summary').textContent=current.result.structured.summary.join('\n');document.getElementById('ai-suggestion-result').classList.remove('am-hidden');status.textContent=`${current.result.provider} ? ${current.result.model} ? review before applying`;}
 catch(error){if(current.overlay.isConnected)status.textContent=error.message;}finally{current.controller=null;button.disabled=false;if(current.overlay.isConnected)document.getElementById('ai-stop-suggestion').hidden=true;}
}
async function applyAISuggestion(){const current=suggestionState;if(!current?.result)return;try{if(modalSession!==current.session||!current.input.isConnected||current.input.value!==current.original||JSON.stringify(current.picker.ids())!==JSON.stringify(current.contextIds))throw new Error('Content or context selection changed. Generate again.');await assertAiCurrent(current.result,current.contextIds);if(suggestionState!==current||!isAdminMode)return;current.input.value=document.getElementById('ai-optimized-content').value;current.input.dispatchEvent(new Event('input',{bubbles:true}));closeAISuggestionModal();showToast('Suggestion applied to draft. Save the form to publish.','success');}catch(error){showToast(error.message,'error');}}
window.addEventListener('portfolio-auth-state',event=>{if(!event.detail.signedIn){document.getElementById('am-global-ai-widget')?._controller?.abort();closeAISuggestionModal();}});

window.addEventListener('portfolio-sync-error',event=>showToast(event.detail.message+' Use Resolve Sync in the toolbar.','error'));

function openSyncResolution(){
  resetModal('sync','layout');const items=readPendingPortfolioWrites();
  document.getElementById('admin-edit-title').textContent='Pending sync / conflicts';
  const body=document.getElementById('admin-edit-body');body.innerHTML='<p>Export a backup before discarding or overwriting pending changes. Overwrite replaces the server section with your queued version.</p><button id="am-sync-backup">Download pending backup</button>'+items.map(item=>`<div><strong>${esc(item.docId)}</strong><button data-resolve="discard" data-section="${esc(item.docId)}">Use server version</button><button data-resolve="overwrite" data-section="${esc(item.docId)}">Overwrite with queued version</button></div>`).join('')+(items.length?'':'<p>No pending changes.</p>');
  body.querySelector('#am-sync-backup').onclick=()=>downloadTextFile('portfolio-pending-backup.json',JSON.stringify(items,null,2),'application/json');
  body.querySelectorAll('[data-resolve]').forEach(button=>button.onclick=()=>showCustomConfirm('Apply this conflict resolution? Download a backup first.',async()=>{
    try{mutationBusy=true;const api=await getFirebaseApi();await api.resolvePendingPortfolioWrite(button.dataset.section,button.dataset.resolve);if(window._reloadPortfolioSection)await window._reloadPortfolioSection(button.dataset.section);mutationBusy=false;openSyncResolution();}
    catch(error){showToast(error.message,'error');}finally{mutationBusy=false;}
  }));
  const save=document.getElementById('admin-edit-save');save.innerHTML='Done';save.onclick=()=>closeEditModal(true);document.getElementById('admin-edit-overlay').classList.add('am-visible');
}
window.addEventListener('portfolio-auth-state',event=>{if(!event.detail.signedIn&&isAdminMode){showToast('Admin session ended. Sign in again before saving.','error');deactivateAdminMode(true);}});
