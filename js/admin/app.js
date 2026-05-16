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
  readLocalPortfolioCache,
  readLocalPortfolioDoc,
  updateLocalPortfolioDoc,
} from '../local-portfolio-cache.js';

let isAdminMode = false;
const ADMIN_PASSWORD = 'admin1909';
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
    return data || readLocalPortfolioDoc(docId);
  } catch (err) {
    setAdminFirebaseStatus('disconnected', { error: err.message });
    return readLocalPortfolioDoc(docId);
  }
}

async function writePortfolioDoc(docId, data) {
  let result;
  try {
    const api = await getFirebaseApi();
    result = await api.writePortfolioDoc(docId, data);
    if (api.getFirebaseConnectionStatus) setAdminFirebaseStatus(api.getFirebaseConnectionStatus());
  } catch (err) {
    await updateLocalPortfolioDoc(docId, data, { source: 'admin-local-pending' });
    queuePendingPortfolioWrite(docId, data);
    setAdminFirebaseStatus('disconnected', { error: err.message });
  }
  if (docId !== 'metadata' && docId !== 'ai-config' && window._reloadPortfolioMetadata) {
    await window._reloadPortfolioMetadata();
  }
  return result;
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

// ─── INIT ────────────────────────────────────────────────────
export function initAdminMode() {
  injectStyles();
  injectPasswordModal();
  injectEditModal();
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

function checkPassword() {
  const input = document.getElementById('admin-pw-input');
  const err   = document.getElementById('admin-pw-error');
  if (input.value === ADMIN_PASSWORD) {
    hidePasswordModal();
    activateAdminMode();
  } else {
    err.textContent = '❌ Incorrect password. Try again.';
    input.value = '';
    input.focus();
    const box = document.getElementById('admin-pw-box');
    box.classList.add('am-shake');
    setTimeout(() => box.classList.remove('am-shake'), 500);
  }
}

function injectPasswordModal() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="admin-pw-overlay" class="am-overlay">
      <div id="admin-pw-box" class="am-pw-box">
        <div class="am-pw-icon">🔐</div>
        <h2 class="am-pw-title">Admin Mode</h2>
        <p class="am-pw-subtitle">Enter password to enable edit mode</p>
        <input id="admin-pw-input" class="am-pw-input" type="password"
               placeholder="Password..." autocomplete="off">
        <p id="admin-pw-error" class="am-pw-error"></p>
        <div class="am-pw-btns">
          <button class="am-btn am-btn-ghost" id="admin-pw-cancel">Cancel</button>
          <button class="am-btn am-btn-primary" id="admin-pw-submit">Login</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('admin-pw-submit').addEventListener('click', checkPassword);
  document.getElementById('admin-pw-cancel').addEventListener('click', hidePasswordModal);
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
        <span class="am-toolbar-badge">⚡ Admin Mode</span>
        <div class="am-toolbar-actions">
          <button class="am-btn am-btn-sm" id="admin-config-btn">
            <span id="admin-firebase-dot" class="am-firebase-dot is-disconnected" title="Firebase disconnected"></span>
            🤖 Config
          </button>
          <button class="am-btn am-btn-sm am-btn-cv" id="admin-export-cv-btn">📄 Export CV</button>
          <span class="am-toolbar-hint">Click the edit icon on sections to edit</span>
        </div>
        <button class="am-btn am-btn-danger-sm" id="admin-logout">Exit</button>
      </div>
    </div>
  `);
  document.getElementById('admin-logout').addEventListener('click', deactivateAdminMode);
  document.getElementById('admin-config-btn').addEventListener('click', () => openConfigModal());
  document.getElementById('admin-export-cv-btn').addEventListener('click', () => openCVExportModal());
}

// ─── OPEN CONFIG MODAL ───────────────────────────────────────
async function openConfigModal() {
  currentSection = 'config';
  document.getElementById('admin-edit-title').textContent = `🤖 AI Configuration`;
  document.getElementById('admin-edit-body').innerHTML = `<div class="am-loading">⏳ Loading configuration...</div>`;
  document.getElementById('admin-edit-overlay').classList.add('am-visible');

  try {
    currentData = await readPortfolioDoc('ai-config');
    if (!currentData) currentData = {};
    renderForm('config', currentData);
    setupConfigEventListeners(document.getElementById('admin-edit-body'));
  } catch (err) {
    document.getElementById('admin-edit-body').innerHTML =
      `<div class="am-error-msg">❌ Error: ${err.message}</div>`;
  }

  const saveBtn = document.getElementById('admin-edit-save');
  saveBtn.style.display = 'none'; // Hide default save button for config

}

function activateAdminMode() {
  isAdminMode = true;
  document.body.classList.add('admin-mode');
  document.getElementById('admin-toolbar').classList.remove('am-hidden');
  addEditButtons();
  
  // Note: injectAddNewButtons is handled via addEditButtons -> am-edit-menu -> "Add New"
  
  showToast('Admin Mode Enabled', 'success');
  
  // Initialize AI Widget globally
  initGlobalAIWidget();
}

function deactivateAdminMode() {
  isAdminMode = false;
  document.body.classList.remove('admin-mode');
  document.getElementById('admin-toolbar').classList.add('am-hidden');
  removeEditButtons();
  
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

async function openEditModal(section, label) {
  currentSection = section;
  document.getElementById('admin-edit-title').textContent = `✏️ Edit Content: ${label}`;
  document.getElementById('admin-edit-body').innerHTML = `<div class="am-loading">⏳ Loading data...</div>`;
  document.getElementById('admin-edit-overlay').classList.add('am-visible');

  try {
    currentData = await readPortfolioDoc(section);
    if (!currentData) throw new Error('Data could not be loaded');
    renderForm(section, currentData);
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
  if (section === 'config') {
    setupConfigEventListeners(newEditBody);
  }
  
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

    const aiSuggestBtn = e.target.closest('.am-ai-suggest-btn');
    if (aiSuggestBtn) {
      e.preventDefault();
      const field = aiSuggestBtn.getAttribute('data-field') || aiSuggestBtn.getAttribute('data-key-field');
      if (field) openAISuggestionModal(field);
      return;
    }
  });
}

function closeEditModal() {
  document.getElementById('admin-edit-overlay').classList.remove('am-visible');
  currentSection = null;
  currentData = null;
}

// ─── IMAGE UPLOAD HELPER ─────────────────────────────────────
function renderImageUploadField(label, fieldName, currentUrl) {
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
      </div>
    </div>
  `;
}

function attachImageUploadListeners(container) {
  container.querySelectorAll('.am-img-file-input').forEach(fileInput => {
    fileInput.addEventListener('change', function() {
      const file = this.files[0];
      if (!file) return;
      
      const wrap = this.closest('.am-img-upload-box');
      const fieldName = this.dataset.imgField;
      const resultInput = wrap.querySelector(`[data-img-result="${fieldName}"]`);
      let previewEl = wrap.querySelector('.am-img-new-preview');
      
      if (previewEl) previewEl.innerHTML = `<div class="am-loading">⏳ Compressing image...</div>`;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
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
        img.onerror = () => {
          const dataUrl = ev.target.result;
          if (resultInput) resultInput.value = dataUrl;
          if (previewEl) previewEl.innerHTML = `<img src="${dataUrl}" class="am-img-preview" alt="New image"><span class="am-img-preview-label" style="background:#16a34a">New (unsaved)</span>`;
        }
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  });
}

// ─── ADD NEW MODAL ───────────────────────────────────────────
async function openAddNewModal(section, label) {
  currentSection = section;
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
      ${renderImageUploadField('Project Image (Card)', 'image', '')}
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
      <div class="am-form-group"><label>Link (for Certifications)</label><input class="am-input" data-new="link" placeholder="https://..."></div>
      <div class="am-form-group"><label>Color Theme (for Certifications)</label>
        <select class="am-input" data-new="color">
          <option value="primary">Primary (blue)</option>
          <option value="orange">Orange</option>
          <option value="green">Green</option>
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
      <div class="am-form-group"><label>URL</label><input class="am-input" data-new="url" placeholder="https://..."></div>
    `;
    default: return '<p class="am-hint-text">Adding new items is not yet supported for this section.</p>';
  }
}

async function saveNewItem(section) {
  const body    = document.getElementById('admin-edit-body');
  const saveBtn = document.getElementById('admin-edit-save');
  const spinner = document.getElementById('admin-save-spinner');
  const firstInput = body.querySelector('[data-new]');
  if (firstInput && !firstInput.value.trim()) {
    showToast('❌ Please fill in at least the first field.', 'error');
    firstInput.focus(); return;
  }
  saveBtn.disabled = true;
  spinner?.classList.remove('am-hidden');
  const newItem = {};
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
      arrayKey = 'degrees';
      newItem.institution = newItem.issuer;
      newItem.period = newItem.year;
      delete newItem.issuer;
      delete newItem.year;
      delete newItem.link;
      delete newItem.color;
    }
    delete newItem.eduType;
  }
  
  if (section === 'summary') {
    arrayKey = newItem.summaryType;
    delete newItem.summaryType;
  }
  
  if (!arrayKey) { showToast('❌ Not supported.','error'); saveBtn.disabled=false; spinner?.classList.add('am-hidden'); return; }
  try {
    const latest = await readPortfolioDoc(section);
    if (!latest) throw new Error('Data could not be loaded');
    if (!Array.isArray(latest[arrayKey])) latest[arrayKey] = [];
    latest[arrayKey].push(newItem);
    await writePortfolioDoc(section, latest);
    if (window._reloadPortfolioSection) await window._reloadPortfolioSection(section);
    showToast('✅ New item added successfully!', 'success');
    closeEditModal();
  } catch(err) {
    showToast('❌ Error: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    spinner?.classList.add('am-hidden');
  }
}

// ─── LAYOUT EDIT MODAL ───────────────────────────────────────
async function openLayoutEditModal(section, label) {
  currentSection = section;
  document.getElementById('admin-edit-title').textContent = `🏗️ Edit Layout: ${label}`;
  document.getElementById('admin-edit-body').innerHTML = `<div class="am-loading">⏳ Loading data...</div>`;
  document.getElementById('admin-edit-overlay').classList.add('am-visible');

  try {
    currentData = await readPortfolioDoc(section);
    if (!currentData) throw new Error('Data could not be loaded');
    
    let arrayKey = null;
    let items = [];
    if (section === 'experience') { arrayKey = 'jobs'; items = currentData.jobs; }
    else if (section === 'skills') { arrayKey = 'categories'; items = currentData.categories; }
    else if (section === 'projects') { arrayKey = 'items'; items = currentData.items; }
    else if (section === 'achievements') { arrayKey = 'items'; items = currentData.items; }
    else if (section === 'education') { arrayKey = 'certifications'; items = currentData.certifications; }
    else if (section === 'summary') { arrayKey = 'coreExpertise'; items = currentData.coreExpertise; } // simplified
    else if (section === 'contact') { arrayKey = 'socials'; items = currentData.socials; }

    if (!items || !Array.isArray(items) || items.length === 0) {
       document.getElementById('admin-edit-body').innerHTML = `<div class="am-error-msg">No reorderable items found for this section.</div>`;
    } else {
       let listHtml = `<div class="am-form-group"><p class="text-sm text-gray-500 mb-4">Drag and drop items to reorder them. Changes are saved automatically.</p></div>`;
       listHtml += `<div id="am-sortable-list" class="am-sortable-list">`;
       items.forEach((item, index) => {
          const title = item.title || item.company || item.name || `Item ${index+1}`;
          const badge = item.badge ? `<span class="am-badge-inactive ml-2">${item.badge}</span>` : '';
          listHtml += `
            <div class="am-sortable-item" data-index="${index}">
              <i class="ri-draggable text-gray-400 mr-3 text-lg cursor-grab"></i>
              <span class="font-semibold text-gray-700 flex-1">${esc(title)}</span>${badge}
              <button type="button" class="am-delete-btn am-delete-btn-layout ml-3" data-delete-path="${arrayKey}" data-delete-index="${index}"><i class="ri-delete-bin-line"></i> Delete</button>
            </div>
          `;
       });
       listHtml += `</div>`;
       const body = document.getElementById('admin-edit-body');
       body.innerHTML = listHtml;
       
       // Handle delete delegation
       const newBody = body.cloneNode(true);
       body.parentNode.replaceChild(newBody, body);
       newBody.addEventListener('click', (e) => {
         const deleteBtn = e.target.closest('.am-delete-btn-layout');
         if (deleteBtn) {
           e.preventDefault();
           const path = deleteBtn.getAttribute('data-delete-path');
           const idx = parseInt(deleteBtn.getAttribute('data-delete-index'), 10);
           if (path && !isNaN(idx)) window._adminDeleteArrayItemLayout(path, idx);
         }
       });

       const el = document.getElementById('am-sortable-list');
       if (window.Sortable) {
         window.Sortable.create(el, {
           animation: 150,
           ghostClass: 'am-sortable-ghost',
           onEnd: async function (evt) {
             if (evt.oldIndex === evt.newIndex) return;
             
             const btn = document.getElementById('admin-edit-save');
             const spinner = document.getElementById('admin-save-spinner');
             btn.disabled = true;
             spinner?.classList.remove('am-hidden');
             
             try {
               const movedItem = items.splice(evt.oldIndex, 1)[0];
               items.splice(evt.newIndex, 0, movedItem);
               await writePortfolioDoc(currentSection, currentData);
               if (window._reloadPortfolioSection) {
                 await window._reloadPortfolioSection(currentSection);
               }
               showToast('✅ Layout auto-saved!', 'success');
             } catch(err) {
               showToast('❌ Error saving layout: ' + err.message, 'error');
             } finally {
               btn.disabled = false;
               spinner?.classList.add('am-hidden');
             }
           }
         });
       } else {
         document.getElementById('admin-edit-body').innerHTML += `<p class="am-error-msg">SortableJS failed to load. Check internet connection.</p>`;
       }
    }
  } catch (err) {
    document.getElementById('admin-edit-body').innerHTML =
      `<div class="am-error-msg">❌ Error: ${err.message}</div>`;
  }
  
  const saveBtn = document.getElementById('admin-edit-save');
  saveBtn.innerHTML = `<span id="admin-save-spinner" class="am-spinner am-hidden"></span> ✔️ Done`;
  saveBtn.onclick = () => closeEditModal();
}

// ─── ADD/DELETE HELPERS ──────────────────────────────────────
window._adminRestoreProjectItem = function(index) {
  if (currentSection !== 'projects' || currentData == null) return;
  currentData = collectFormData(currentSection);
  const items = currentData.items;
  if (!Array.isArray(items) || items[index] == null) return;
  items[index].status = 'active';
  renderForm(currentSection, currentData);
  showToast('Đang khôi phục... / Restoring...', 'info');
  saveSection(currentSection).catch(err => {
    console.error('Auto-save after restore failed:', err);
  });
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

window._adminDeleteArrayItem = function(path, index) {
  const isProjectSoftDelete = currentSection === 'projects' && path === 'items';
  const confirmMsg = isProjectSoftDelete
    ? 'Hide project from the public page? Data will remain in the database as inactive (can be restored later).'
    : 'Are you sure you want to delete this item?';
  
  showCustomConfirm(confirmMsg, () => {
    if (currentData == null || !currentSection) {
      console.error('[Admin] Delete: missing session data');
      return;
    }

    // Update currentData from the form to keep unsaved typing
    currentData = collectFormData(currentSection);

    // Projects: soft-delete — set status inactive in DB on next Save (no splice)
    if (isProjectSoftDelete) {
      const pathParts = path.split('.');
      let arr = currentData;
      for (let i = 0; i < pathParts.length; i++) {
        if (arr == null) break;
        arr = arr[pathParts[i]];
      }
      if (Array.isArray(arr) && arr[index] != null) {
        arr[index] = { ...arr[index], status: 'inactive' };
      }
      renderForm(currentSection, currentData);
      attachImageUploadListeners(document.getElementById('admin-edit-body'));
      showToast('Đang ẩn... / Hiding...', 'info');
      saveSection(currentSection).catch(err => {
        console.error('Auto-save after hide failed:', err);
      });
      return;
    }

    // Other sections: remove item from array
    const pathParts = path.split('.');
    let arr = currentData;
    for (let i = 0; i < pathParts.length; i++) {
      if (arr == null) break;
      arr = arr[pathParts[i]];
    }

    if (Array.isArray(arr)) {
      arr.splice(index, 1);
    }

    renderForm(currentSection, currentData);
    attachImageUploadListeners(document.getElementById('admin-edit-body'));
    showToast('Đang xóa... / Deleting...', 'info');
    // Auto-save the deletion to Firebase immediately for better UX
    saveSection(currentSection).catch(err => {
      console.error('Auto-save after delete failed:', err);
    });
  });
};

window._adminAddSkillItem = function(catIndex) {
  if (currentData == null || currentSection !== 'skills') return;
  currentData = collectFormData(currentSection);
  if (!Array.isArray(currentData.categories[catIndex].skills)) {
    currentData.categories[catIndex].skills = [];
  }
  currentData.categories[catIndex].skills.push({ title: '', desc: '' });
  renderForm(currentSection, currentData);
  attachImageUploadListeners(document.getElementById('admin-edit-body'));
};

window._adminDeleteArrayItemLayout = function(path, index) {
  const confirmMsg = 'Are you sure you want to delete this item?';
  
  showCustomConfirm(confirmMsg, () => {
    if (currentData == null || !currentSection) return;

    const pathParts = path.split('.');
    let arr = currentData;
    for (let i = 0; i < pathParts.length; i++) {
      if (arr == null) break;
      arr = arr[pathParts[i]];
    }

    if (Array.isArray(arr)) {
      arr.splice(index, 1);
    }

    const btn = document.getElementById('admin-edit-save');
    const spinner = document.getElementById('admin-save-spinner');
    if (btn) btn.disabled = true;
    if (spinner) spinner.classList.remove('am-hidden');
    
    showToast('Đang xóa... / Deleting...', 'info');

    writePortfolioDoc(currentSection, currentData)
      .then(() => {
        if (window._reloadPortfolioSection) return window._reloadPortfolioSection(currentSection);
      })
      .then(() => {
        closeEditModal();
      })
      .catch(err => {
        showToast('❌ Error deleting: ' + err.message, 'error');
        if (btn) btn.disabled = false;
        if (spinner) spinner.classList.add('am-hidden');
      });
  });
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
    ${renderImageUploadField('Profile Photo URL', 'profilePhoto', d.profilePhoto || '')}
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
          <div class="am-form-group am-flex-1"><label>Skill ${si+1}</label>
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
      ${renderImageUploadField('Project Image URL', `items.${i}.image`, proj.image || '')}
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
      <div class="am-form-group"><label>Icon (Remix icon class)</label>
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
      <div class="am-form-group"><label>Color Theme</label>
        <select class="am-input" data-path="certifications.${i}.color">
          <option value="primary" ${cert.color === 'primary' ? 'selected' : ''}>Primary (blue)</option>
          <option value="orange" ${cert.color === 'orange' ? 'selected' : ''}>Orange</option>
          <option value="green" ${cert.color === 'green' ? 'selected' : ''}>Green</option>
        </select>
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
        <div class="am-form-group"><label>URL</label>
          <input class="am-input" data-path="socials.${i}.url" value="${esc(s.url||'')}"></div>
      </div>`).join('')}
  `;
}

// ── CONFIG FORM ──
function renderConfigForm(d) {
  const isConnected = d && d.connectionTested && d.connectionStatus === 'success';
  const decodedApiKey = d?.apiKey ? atob(d.apiKey) : '';
  const isValid = !!(d?.baseUrl && d?.model);
  
  return `
    <div class="am-form-group">
      <h3 class="am-section-label" style="margin-top: 0; border-top: none;">🤖 AI Connection Configuration</h3>
    </div>
    
    <div class="am-form-group">
      <div class="am-firebase-status-card">
        <span id="admin-config-firebase-dot" class="am-firebase-dot ${adminFirebaseStatus === 'connected' ? 'is-connected' : adminFirebaseStatus === 'syncing' ? 'is-syncing' : 'is-disconnected'}"></span>
        <div>
          <div class="am-firebase-status-title">Firebase signal</div>
          <div id="admin-firebase-text" class="am-hint-text">
            ${adminFirebaseStatus === 'connected' ? 'Firebase connected' : adminFirebaseStatus === 'syncing' ? 'Firebase syncing' : 'Firebase disconnected'}
          </div>
        </div>
      </div>
    </div>

    <div class="am-form-group">
      <label>AI Base URL <span style="color: #dc2626;">*</span></label>
      <input class="am-input" data-key="baseUrl" id="ai-base-url-input" value="${esc(d?.baseUrl || '')}" placeholder="https://api.openai.com/v1">
      <p class="am-hint-text">Required field. Must be a valid URL format.</p>
    </div>
    
    <div class="am-form-group">
      <label>API Key</label>
      <div style="position: relative;">
        <input class="am-input" type="password" data-key="apiKey" id="ai-api-key-input" value="${esc(decodedApiKey)}" placeholder="Enter API key" style="padding-right: 40px;">
        <button type="button" id="ai-toggle-pw" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem;" title="Show/Hide Password">
          <i class="ri-eye-off-line"></i>
        </button>
      </div>
      <p class="am-hint-text">Optional field. Will be encrypted when saved.</p>
    </div>
    
    <div class="am-form-group">
      <label>AI Model <span style="color: #dc2626;">*</span></label>
      <input class="am-input" data-key="model" id="ai-model-input" value="${esc(d?.model || '')}" placeholder="gpt-4o-mini">
      <p class="am-hint-text">Required field. E.g., gpt-4o-mini, gpt-4, claude-3-sonnet</p>
    </div>
    
    <div class="am-form-group" style="display: flex; gap: 1rem;">
      <button class="am-btn am-btn-primary" id="ai-save-config" style="flex: 1;" ${!isValid ? 'disabled' : ''}>
        💾 Save Configuration
      </button>
      <button class="am-btn ${isConnected ? 'am-btn-ghost' : 'am-btn-primary'}" id="ai-test-connection" style="flex: 1;" ${!isValid ? 'disabled' : ''}>
        ${isConnected ? '🔄 Re-test' : '🧪 Test'} Connection
      </button>
    </div>
    
    ${isConnected ? `
      <div class="am-form-group">
        <h3 class="am-section-label">💬 AI Chatbox</h3>
        <p class="am-hint-text" style="color: #15803d; font-weight: 600;">
          ✅ AI is connected. The chat widget is now floating at the bottom right of your screen.
        </p>
      </div>
    ` : ''}
  `;
}

// ─── SAVE LOGIC ──────────────────────────────────────────────
async function saveSection(section) {
  const saveBtn = document.getElementById('admin-edit-save');
  const spinner = document.getElementById('admin-save-spinner');
  saveBtn.disabled = true;
  spinner.classList.remove('am-hidden');

  try {
    const updatedData = collectFormData(section);
    await writePortfolioDoc(currentSection, updatedData);
    
    // Trigger real-time UI update if loader is present
    if (window._reloadPortfolioSection) {
      await window._reloadPortfolioSection(currentSection);
    }

    showToast('✅ Saved successfully!', 'success');
    closeEditModal();
  } catch (err) {
    showToast('❌ Error saving: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    spinner.classList.add('am-hidden');
  }
}

function collectFormData(section) {
  const body = document.getElementById('admin-edit-body');
  const data = JSON.parse(JSON.stringify(currentData)); // deep clone

  // Simple key fields (data-key)
  body.querySelectorAll('[data-key]').forEach(el => {
    const key = el.dataset.key;
    let val = el.value;
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
function setupConfigEventListeners(container) {
  const saveBtn = container.querySelector('#ai-save-config');
  const testBtn = container.querySelector('#ai-test-connection');
  const sendBtn = container.querySelector('#ai-send-message');
  const chatInput = container.querySelector('#ai-chat-input');
  
  const togglePwBtn = container.querySelector('#ai-toggle-pw');
  const pwInput = container.querySelector('#ai-api-key-input');
  const baseUrlInput = container.querySelector('#ai-base-url-input');
  const modelInput = container.querySelector('#ai-model-input');
  
  if (togglePwBtn && pwInput) {
    togglePwBtn.addEventListener('click', () => {
      const type = pwInput.getAttribute('type') === 'password' ? 'text' : 'password';
      pwInput.setAttribute('type', type);
      togglePwBtn.innerHTML = type === 'password' ? '<i class="ri-eye-off-line"></i>' : '<i class="ri-eye-line"></i>';
    });
  }

  function checkConfigValidity() {
    const valid = baseUrlInput && baseUrlInput.value.trim() && modelInput && modelInput.value.trim();
    if (saveBtn) saveBtn.disabled = !valid;
    if (testBtn) testBtn.disabled = !valid;
  }
  
  if (baseUrlInput) baseUrlInput.addEventListener('input', checkConfigValidity);
  if (modelInput) modelInput.addEventListener('input', checkConfigValidity);
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveAIConfig());
  }
  
  if (testBtn) {
    testBtn.addEventListener('click', () => testAIConnection());
  }
  
  // Chat widget is now global, no longer in config form
}

// ─── AI CONFIG FUNCTIONS ─────────────────────────────────────
async function saveAIConfig() {
  const saveBtn = document.querySelector('#ai-save-config');
  const testBtn = document.querySelector('#ai-test-connection');
  
  // Collect form data
  const baseUrl = document.querySelector('[data-key="baseUrl"]').value.trim();
  const apiKey = document.querySelector('[data-key="apiKey"]').value;
  const model = document.querySelector('[data-key="model"]').value.trim();
  
  // Validation
  if (!baseUrl) {
    showToast('❌ AI Base URL is required', 'error');
    return;
  }
  
  if (!model) {
    showToast('❌ AI Model is required', 'error');
    return;
  }
  
  // Basic URL validation
  try {
    new URL(baseUrl);
  } catch {
    showToast('❌ AI Base URL must be a valid URL', 'error');
    return;
  }
  
  // Disable buttons
  saveBtn.disabled = true;
  if (testBtn) testBtn.disabled = true;
  saveBtn.innerHTML = '<span class="am-spinner"></span> Saving...';
  
  try {
    const configData = {
      baseUrl,
      apiKey: apiKey ? btoa(apiKey) : '', // Simple base64 encoding (not real encryption)
      model,
      updatedAt: new Date().toISOString()
    };
    
    await writePortfolioDoc('ai-config', configData);
    showToast('✅ AI configuration saved successfully', 'success');
    
    // Update current data
    currentData = configData;
    
  } catch (error) {
    showToast('❌ Failed to save AI configuration: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    if (testBtn) testBtn.disabled = false;
    saveBtn.innerHTML = '💾 Save Configuration';
  }
}

function extractAIContent(result) {
  if (!result) return null;
  if (result.choices && result.choices.length > 0) {
    const c = result.choices[0];
    if (c.message && typeof c.message.content === 'string') return c.message.content;
    if (c.delta && typeof c.delta.content === 'string') return c.delta.content;
    if (typeof c.text === 'string') return c.text;
    return ''; // Return empty string instead of null if we know it's a choices array but missing content
  }
  if (result.message && typeof result.message.content === 'string') {
    return result.message.content;
  }
  if (result.candidates && result.candidates.length > 0) {
    const text = result.candidates[0]?.content?.parts?.[0]?.text;
    if (typeof text === 'string') return text;
    return '';
  }
  if (typeof result.response === 'string') {
    return result.response;
  }
  return null;
}

async function testAIConnection() {
  const testBtn = document.querySelector('#ai-test-connection');
  const saveBtn = document.querySelector('#ai-save-config');
  
  // Collect form data
  const baseUrl = document.querySelector('[data-key="baseUrl"]').value.trim();
  const apiKey = document.querySelector('[data-key="apiKey"]').value;
  const model = document.querySelector('[data-key="model"]').value.trim();
  
  // Validation
  if (!baseUrl || !model) {
    showToast('❌ Please fill in Base URL and Model first', 'error');
    return;
  }
  
  // Disable buttons
  testBtn.disabled = true;
  if (saveBtn) saveBtn.disabled = true;
  testBtn.innerHTML = '<span class="am-spinner"></span> Testing...';
  
  try {
    // Test connection by making a simple API call
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
        stream: false
      })
    });
    
    if (response.ok) {
      const text = await response.text();
      let result;
      let jsonText = text;
      
      // If server forces stream (SSE), extract the first valid JSON chunk to verify connection
      if (text.trim().startsWith('data:')) {
        const match = text.match(/data:\s*(\{.*\})/);
        if (match && match[1]) {
          jsonText = match[1];
        }
      }
      
      try {
        result = JSON.parse(jsonText);
      } catch (e) {
        throw new Error('Invalid JSON from server: ' + text.substring(0, 100));
      }
      
      const content = extractAIContent(result);
      if (content !== null) {
        // Update config with connection status
        const configData = {
          baseUrl,
          apiKey: apiKey ? btoa(apiKey) : '',
          model,
          connectionTested: true,
          connectionStatus: 'success',
          lastTested: new Date().toISOString()
        };
        
        await writePortfolioDoc('ai-config', configData);
        currentData = configData;
        
        showToast('✅ Connection successful! AI Chatbox is now available.', 'success');
        
        // Re-render form to show connection status
        renderForm('config', configData);
        setupConfigEventListeners(document.getElementById('admin-edit-body'));
        
        // Initialize global AI widget
        initGlobalAIWidget(configData);
        
      } else {
        throw new Error('Unrecognized API response format: ' + text.substring(0, 100));
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
  } catch (error) {
    // Update config with failed status
    const configData = {
      baseUrl,
      apiKey: apiKey ? btoa(apiKey) : '',
      model,
      connectionTested: true,
      connectionStatus: 'failed',
      lastTested: new Date().toISOString(),
      lastError: error.message
    };
    
    await writePortfolioDoc('ai-config', configData);
    currentData = configData;
    
    showToast(`❌ Connection failed: ${error.message}`, 'error');
  } finally {
    testBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    testBtn.innerHTML = currentData?.connectionStatus === 'success' ? '🔄 Re-test Connection' : '🧪 Test Connection';
  }
}

// ─── GLOBAL AI WIDGET ────────────────────────────────────────
async function initGlobalAIWidget(configData = null) {
  if (!configData) {
    configData = await readPortfolioDoc('ai-config');
  }
  if (!configData || configData.connectionStatus !== 'success') {
    const existing = document.getElementById('am-global-ai-widget');
    if (existing) existing.remove();
    return;
  }
  
  // Set currentData globally if not already set, so sendGlobalAIMessage can use it
  if (!currentData || !currentData.apiKey) {
    currentData = configData;
  }

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
              <div class="am-chat-text">Hello! I have full access to your portfolio data. Ask me anything!</div>
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
}

async function sendGlobalAIMessage() {
  const widget = document.getElementById('am-global-ai-widget');
  if (!widget) return;
  const chatInput = widget.querySelector('#ai-chat-input');
  const sendBtn = widget.querySelector('#ai-send-message');
  const chatHistory = widget.querySelector('#ai-chat-history');
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Disable input and button
  chatInput.disabled = true;
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="am-spinner"></span>';
  
  // Add user message to chat
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'am-chat-message am-chat-user';
  userMessageDiv.innerHTML = `
    <div class="am-chat-avatar">👤</div>
    <div class="am-chat-content">
      <div class="am-chat-text">${esc(message)}</div>
      <div class="am-chat-time">${new Date().toLocaleTimeString()}</div>
    </div>
  `;
  chatHistory.appendChild(userMessageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  chatInput.value = '';
  
  try {
    // 1. Fetch full portfolio context
    const fullPortfolioData = await readAllPortfolioDocs();
    const systemPrompt = `You are an expert AI assistant for Tran Tan Phat's portfolio. 
You have full access to his portfolio data below. Provide accurate, helpful answers based on this data.
If asked about a specific project, skill, or experience, use the data to provide detailed answers.

--- PORTFOLIO DATA ---
${JSON.stringify(fullPortfolioData, null, 2)}
----------------------`;

    // 2. Fetch API
    const aiConfig = await readPortfolioDoc('ai-config');
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${atob(aiConfig.apiKey)}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        stream: false
      })
    });
    
    if (response.ok) {
      const text = await response.text();
      let result;
      
      if (text.trim().startsWith('data:')) {
        let fullText = '';
        const chunks = text.split('\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]'));
        for (const chunk of chunks) {
          try {
            const parsed = JSON.parse(chunk.replace('data: ', ''));
            const content = extractAIContent(parsed);
            if (content) fullText += content;
          } catch(e) {}
        }
        result = { choices: [{ message: { content: fullText } }] };
      } else {
        result = JSON.parse(text);
      }
      
      const aiResponse = extractAIContent(result) || 'No response';
      
      const aiMessageDiv = document.createElement('div');
      aiMessageDiv.className = 'am-chat-message am-chat-ai';
      aiMessageDiv.innerHTML = `
        <div class="am-chat-avatar">🤖</div>
        <div class="am-chat-content">
          <div class="am-chat-text">${window.marked ? window.marked.parse(aiResponse) : aiResponse.replace(/\n/g, '<br>')}</div>
          <div class="am-chat-time">${new Date().toLocaleTimeString()}</div>
        </div>
      `;
      chatHistory.appendChild(aiMessageDiv);
      chatHistory.scrollTop = chatHistory.scrollHeight;
      
    } else {
      throw new Error(`API Error: ${response.status}`);
    }
  } catch (error) {
    const errorMessageDiv = document.createElement('div');
    errorMessageDiv.className = 'am-chat-message am-chat-error';
    errorMessageDiv.innerHTML = `
      <div class="am-chat-avatar">❌</div>
      <div class="am-chat-content">
        <div class="am-chat-text">Error: ${error.message}</div>
        <div class="am-chat-time">${new Date().toLocaleTimeString()}</div>
      </div>
    `;
    chatHistory.appendChild(errorMessageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="ri-send-plane-fill"></i>';
    chatInput.focus();
  }
}

// ─── STYLES ──────────────────────────────────────────────────
function injectStyles() {
  const css = `
    /* ===== ADMIN MODE OVERLAY ===== */
    .am-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 100000 !important;
      background: rgba(10, 15, 30, 0.80);
      backdrop-filter: blur(6px);
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .am-overlay.am-visible { display: flex; animation: amFadeIn 0.2s ease; }
    @keyframes amFadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ===== PASSWORD BOX ===== */
    .am-pw-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6);
      animation: amSlideUp 0.3s cubic-bezier(.16,1,.3,1);
    }
    @keyframes amSlideUp { from { transform: translateY(30px); opacity:0; } to { transform: translateY(0); opacity:1; } }
    .am-pw-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .am-pw-title { font-family: 'Montserrat', sans-serif; font-size: 1.4rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.3rem; }
    .am-pw-subtitle { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .am-pw-input {
      width: 100%; padding: 0.75rem 1rem; border-radius: 10px;
      border: 2px solid #334155; background: #0f172a; color: #f1f5f9;
      font-size: 1rem; outline: none; transition: border-color 0.2s;
      text-align: center; letter-spacing: 0.15em; font-size: 1.2rem;
    }
    .am-pw-input:focus { border-color: #3b82f6; }
    .am-pw-error { color: #f87171; font-size: 0.85rem; min-height: 1.2em; margin: 0.5rem 0; }
    .am-pw-btns { display: flex; gap: 0.75rem; margin-top: 1rem; }
    .am-shake { animation: amShake 0.4s ease; }
    @keyframes amShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }

    /* ===== BUTTONS ===== */
    .am-btn {
      flex: 1; padding: 0.75rem 1.2rem; border-radius: 10px; border: none;
      font-family: 'Open Sans', sans-serif; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .am-btn-primary { background: linear-gradient(135deg, #2D5B8E, #1e4063); color: white; }
    .am-btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
    .am-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .am-btn-ghost { background: #334155; color: #e2e8f0; }
    .am-btn-ghost:hover { background: #475569; }
    .am-btn-danger-sm {
      padding: 0.4rem 0.9rem; border-radius: 8px; border: none;
      background: #dc2626; color: white; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .am-btn-danger-sm:hover { background: #b91c1c; }

    /* ===== TOOLBAR ===== */
    .am-toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 98000;
      background: linear-gradient(135deg, #1e3a5f, #1e293b);
      border-bottom: 2px solid #2D5B8E;
      padding: 0.6rem 1.5rem;
      box-shadow: 0 4px 20px rgba(45,91,142,0.25);
    }
    .am-toolbar.am-hidden { display: none !important; }
    .am-toolbar-inner { display: flex; align-items: center; gap: 1rem; max-width: 1200px; margin: 0 auto; justify-content: space-between; }
    .am-toolbar-actions { display: flex; align-items: center; gap: 0.75rem; }
    .am-btn-sm {
      padding: 0.4rem 0.9rem; border-radius: 6px; border: none;
      background: rgba(45, 91, 142, 0.1); color: #2D5B8E; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; font-family: 'Open Sans', sans-serif;
    }
    .am-btn-sm:hover { background: rgba(45, 91, 142, 0.2); }
    .am-firebase-dot {
      width: 10px; height: 10px; border-radius: 50%; display: inline-block;
      margin-right: 0.4rem; background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.18);
      vertical-align: middle; flex-shrink: 0;
    }
    .am-firebase-dot.is-connected { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.18); }
    .am-firebase-dot.is-syncing { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.2); }
    .am-firebase-status-card {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem;
      border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;
    }
    .am-firebase-status-card .am-firebase-dot { width: 12px; height: 12px; margin-right: 0; }
    .am-firebase-status-title { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
    .am-toolbar-badge {
      background: #2D5B8E; color: white; padding: 0.3rem 0.9rem;
      border-radius: 999px; font-size: 0.8rem; font-weight: 700; font-family: 'Montserrat', sans-serif;
      white-space: nowrap; animation: amPulse 2s ease-in-out infinite;
    }
    @keyframes amPulse { 0%,100%{box-shadow:0 0 0 0 rgba(45,91,142,0.4)} 50%{box-shadow:0 0 0 6px rgba(45,91,142,0)} }
    .am-toolbar-hint { color: #94a3b8; font-size: 0.85rem; flex: 1; }

    /* ===== EDIT BUTTONS & MENU on sections ===== */
    .am-edit-container {
      position: absolute; top: 1rem; right: 1rem; z-index: 100;
      display: flex; flex-direction: column; align-items: flex-end;
    }
    .am-edit-btn {
      background: #2D5B8E; color: white; border: none; border-radius: 50%;
      width: 40px; height: 40px; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 12px rgba(45,91,142,0.35);
      transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem;
      font-size: 1.2rem; font-family: 'Open Sans', sans-serif;
    }
    .am-edit-btn:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 6px 20px rgba(45,91,142,0.5); background: #1e4063; }
    
    .am-edit-menu {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: white; border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;
      overflow: hidden; min-width: 160px; z-index: 101;
      animation: amSlideDown 0.2s ease;
    }
    @keyframes amSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .am-edit-menu-item {
      display: flex; align-items: center; gap: 0.5rem; width: 100%;
      padding: 0.75rem 1rem; border: none; background: transparent;
      text-align: left; font-size: 0.9rem; font-weight: 600; color: #475569;
      cursor: pointer; transition: background 0.2s; font-family: 'Open Sans', sans-serif;
    }
    .am-edit-menu-item:hover { background: #f1f5f9; color: #1e293b; }
    .am-edit-menu-item:not(:last-child) { border-bottom: 1px solid #f1f5f9; }

    /* ===== SORTABLE LIST ===== */
    .am-sortable-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .am-sortable-item {
      display: flex; align-items: center; padding: 1rem 1.25rem;
      background: white; border: 1px solid #e2e8f0; border-radius: 10px;
      cursor: grab; transition: box-shadow 0.2s, border-color 0.2s;
    }
    .am-sortable-item:active { cursor: grabbing; }
    .am-sortable-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .am-sortable-ghost { opacity: 0.4; background: #f8fafc; border: 2px dashed #94a3b8; }
    .am-edit-btn:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 6px 20px rgba(45,91,142,0.5); background: #1e4063; }

    /* ===== ADD NEW BUTTONS on sections ===== */
    .am-add-btn {
      margin-top: 1rem;
      background: rgba(45, 91, 142, 0.1);
      color: #2D5B8E; border: 2px dashed rgba(45, 91, 142, 0.4); border-radius: 12px;
      padding: 0.75rem 1.5rem; font-size: 0.9rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
      width: 100%; font-family: 'Open Sans', sans-serif;
    }
    .am-add-btn:hover { background: rgba(45, 91, 142, 0.2); border-color: #2D5B8E; }

    /* Adjust body top when toolbar visible */
    .admin-mode { padding-top: 50px !important; }

    /* ===== EDIT MODAL BOX ===== */
    .am-edit-box {
      background: #fff;
      border-radius: 20px;
      width: 100%;
      max-width: 700px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 30px 80px rgba(0,0,0,0.4);
      overflow: hidden;
      animation: amSlideUp 0.3s cubic-bezier(.16,1,.3,1);
    }
    .am-edit-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #1e3a5f, #1e293b);
      color: white; flex-shrink: 0;
    }
    .am-edit-title { font-family: 'Montserrat', sans-serif; font-size: 1.1rem; font-weight: 700; margin: 0; color: white; }
    .am-close-btn {
      background: rgba(255,255,255,0.15); border: none; color: white;
      width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
      font-size: 0.9rem; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .am-close-btn:hover { background: rgba(255,255,255,0.3); }
    .am-edit-body { flex: 1; overflow-y: auto; padding: 1.5rem; background: #f8fafc; }
    .am-edit-footer {
      display: flex; gap: 0.75rem; padding: 1rem 1.5rem;
      background: white; border-top: 1px solid #e2e8f0; flex-shrink: 0;
    }

    /* ===== FORM ELEMENTS ===== */
    .am-form-group { margin-bottom: 1rem; }
    .am-form-group label {
      display: block; font-size: 0.78rem; font-weight: 600; color: #475569;
      text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;
    }
    .am-input, .am-textarea {
      width: 100%; padding: 0.65rem 0.9rem;
      border: 2px solid #e2e8f0; border-radius: 10px;
      font-family: 'Open Sans', sans-serif; font-size: 0.9rem; color: #1e293b;
      background: white; outline: none; transition: border-color 0.2s;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .am-input:focus, .am-textarea:focus { border-color: #2D5B8E; box-shadow: 0 0 0 3px rgba(45,91,142,0.1); }
    .am-textarea { resize: vertical; min-height: 80px; }
    .am-sub-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 1.25rem; margin-bottom: 1rem; border-left: 4px solid #2D5B8E;
    }
    .am-sub-card-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;
      gap: 0.5rem; flex-wrap: wrap;
    }
    .am-sub-card-header .am-sub-label { margin-bottom: 0; flex: 1; min-width: 0; }
    .am-delete-btn {
      background: rgba(220, 38, 38, 0.1); color: #dc2626; border: none; border-radius: 6px;
      padding: 0.3rem 0.6rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.3rem; font-family: 'Open Sans', sans-serif;
    }
    .am-delete-btn:hover { background: #dc2626; color: white; }
    .am-restore-btn {
      background: rgba(34, 197, 94, 0.12); color: #15803d; border: none; border-radius: 6px;
      padding: 0.3rem 0.65rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.3rem; font-family: 'Open Sans', sans-serif;
    }
    .am-restore-btn:hover { background: #15803d; color: white; }
    .am-sub-card-inactive { opacity: 0.88; border-left-color: #94a3b8 !important; background: #f8fafc; }
    .am-badge-inactive {
      display: inline-block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #64748b; background: #e2e8f0; padding: 0.15rem 0.45rem; border-radius: 6px;
      vertical-align: middle;
    }
    .am-sub-label {
      font-weight: 700; color: #1e3a5f; font-size: 0.85rem; margin-bottom: 1rem;
      font-family: 'Montserrat', sans-serif;
    }
    .am-section-label {
      font-weight: 700; color: #475569; font-size: 0.75rem; text-transform: uppercase;
      letter-spacing: 0.08em; padding: 0.5rem 0; margin: 0.75rem 0 0.5rem;
      border-top: 1px solid #e2e8f0;
    }
    .am-skill-row { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; align-items: flex-start; }
    .am-flex-1 { flex: 1; min-width: 0; }
    .am-flex-2 { flex: 2; min-width: 0; }
    .am-loading { text-align: center; padding: 2rem; color: #64748b; font-size: 1rem; }
    .am-error-msg { color: #dc2626; padding: 1rem; text-align: center; }

    /* ===== SPINNER ===== */
    .am-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%;
      animation: amSpin 0.7s linear infinite; display: inline-block;
    }
    .am-hidden { display: none !important; }
    @keyframes amSpin { to { transform: rotate(360deg); } }

    /* ===== TOAST ===== */
    .am-toast-container {
      position: fixed; top: 80px; right: 1.5rem; z-index: 999999;
      display: flex; flex-direction: column; gap: 0.5rem; pointer-events: none;
    }
    .am-toast {
      background: #1e293b; color: white; padding: 0.75rem 1.25rem;
      border-radius: 12px; font-size: 0.9rem; font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      transform: translateX(120%); transition: transform 0.35s cubic-bezier(.16,1,.3,1), opacity 0.35s;
      opacity: 0; max-width: 320px;
    }
    .am-toast-show { transform: translateX(0); opacity: 1; }
    .am-toast-success { border-left: 4px solid #22c55e; }
    .am-toast-error   { border-left: 4px solid #ef4444; }
    .am-toast-info    { border-left: 4px solid #2D5B8E; }
    /* ===== GLOBAL AI WIDGET STYLES ===== */
    .am-global-ai-widget {
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      width: 350px; background: white; border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid #e2e8f0;
      display: flex; flex-direction: column; overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: bottom right;
    }
    .am-global-ai-widget.am-minimized {
      transform: scale(0.6) translateY(20px) translateX(20px);
      height: 60px !important; border-radius: 30px; cursor: pointer;
    }
    .am-global-ai-widget.am-minimized:hover { transform: scale(0.65) translateY(15px) translateX(15px); }
    .am-global-ai-widget.am-hidden { display: none !important; }
    
    .am-ai-widget-header {
      background: linear-gradient(135deg, #1e3a5f, #1e293b); color: white;
      padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;
      cursor: pointer;
    }
    .am-ai-widget-title { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .am-ai-widget-actions button {
      background: transparent; border: none; color: white; font-size: 1.2rem; cursor: pointer; opacity: 0.8; transition: opacity 0.2s;
    }
    .am-ai-widget-actions button:hover { opacity: 1; }
    
    .am-ai-widget-body {
      display: flex; flex-direction: column; height: 400px; background: #f8fafc;
    }
    .am-minimized .am-ai-widget-body { display: none; }
    
    .am-chat-history {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .am-chat-message {
      display: flex; gap: 0.75rem; padding: 0.75rem; border-radius: 8px;
      max-width: 85%;
    }
    .am-chat-user { align-self: flex-end; background: #2D5B8E; color: white; border-bottom-right-radius: 2px; }
    .am-chat-ai { align-self: flex-start; background: white; border: 1px solid #e2e8f0; border-bottom-left-radius: 2px; }
    .am-chat-error { align-self: flex-start; background: #fee2e2; border: 1px solid #fca5a5; }
    .am-chat-avatar {
      width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; flex-shrink: 0;
    }
    .am-chat-content { flex: 1; font-size: 0.9rem; }
    .am-chat-text { margin-bottom: 0.25rem; line-height: 1.5; }
    .am-chat-time { font-size: 0.7rem; opacity: 0.7; }
    
    .am-chat-input-container {
      display: flex; gap: 0.5rem; align-items: flex-end; padding: 0.75rem; background: white; border-top: 1px solid #e2e8f0;
    }
    .am-chat-input-container textarea {
      flex: 1; resize: none; min-height: 44px; max-height: 120px; padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1; border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 0.9rem;
      outline: none; transition: border-color 0.2s;
    }
    .am-chat-input-container textarea:focus { border-color: #2D5B8E; }
    .am-chat-input-container button {
      flex-shrink: 0; height: 44px; width: 44px; border-radius: 8px; border: none;
      background: #2D5B8E; color: white; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.2s; font-size: 1.2rem;
    }
    .am-chat-input-container button:hover:not(:disabled) { background: #1e4063; }
    .am-chat-input-container button:disabled { opacity: 0.6; cursor: not-allowed; }
    .am-img-preview-wrap { position: relative; display: inline-block; margin-bottom: 1rem; }
    .am-img-preview {
      max-width: 140px; max-height: 140px; border-radius: 8px;
      object-fit: cover; border: 2px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .am-img-preview-label {
      position: absolute; top: -8px; right: -8px; background: #3b82f6; color: white;
      font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .am-img-no-preview {
      width: 100px; height: 100px; margin: 0 auto 1rem; border-radius: 8px;
      background: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #94a3b8; font-size: 0.8rem; border: 1px dashed #cbd5e1;
    }
    .am-img-no-preview i { font-size: 2rem; margin-bottom: 0.25rem; }
    .am-img-upload-btn {
      display: inline-flex; align-items: center; gap: 0.5rem; justify-content: center;
      background: white; border: 1px solid #cbd5e1; color: #475569; padding: 0.5rem 1rem;
      border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .am-img-upload-btn:hover { background: #f1f5f9; border-color: #94a3b8; color: #1e293b; }
    .am-img-new-preview { margin-top: 1rem; }
    .am-hint-text { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; font-style: italic; }

    .am-ai-suggest-btn {
      background: rgba(45, 91, 142, 0.1); color: #2D5B8E; border: 1px solid rgba(45, 91, 142, 0.3);
      border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;
      font-family: 'Open Sans', sans-serif;
    }
    .am-ai-suggest-btn:hover { background: rgba(45, 91, 142, 0.2); border-color: #2D5B8E; }

    .am-ai-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
    .am-summary-item { margin-bottom: 0.5rem; color: #475569; font-size: 0.9rem; }
    .am-summary-item:last-child { margin-bottom: 0; }

    /* ===== EXPORT CV BUTTON ===== */
    .am-btn-cv {
      background: linear-gradient(135deg, #16a34a, #15803d) !important;
      color: white !important; border: none !important;
      padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s; font-family: 'Open Sans', sans-serif;
      box-shadow: 0 2px 8px rgba(22,163,74,0.35);
    }
    .am-btn-cv:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(22,163,74,0.45); }

    /* ===== CV EXPORT MODAL ===== */
    .am-cv-export-box {
      background: #fff; border-radius: 20px; width: 100%; max-width: 1100px;
      max-height: 92vh; display: flex; flex-direction: column;
      box-shadow: 0 30px 80px rgba(0,0,0,0.4);
      overflow: hidden; animation: amSlideUp 0.3s cubic-bezier(.16,1,.3,1);
    }
    .am-cv-export-layout {
      display: flex; flex: 1; overflow: hidden; gap: 0;
    }
    .am-cv-preview-panel {
      flex: 1; overflow-y: auto; background: #e8ecf1;
      padding: 1.5rem; display: flex; flex-direction: column; align-items: center;
    }
    .am-cv-ai-panel {
      width: 340px; flex-shrink: 0; background: #1e293b;
      display: flex; flex-direction: column; border-left: 2px solid #2D5B8E;
      overflow: hidden;
    }
    .am-cv-ai-panel-header {
      background: linear-gradient(135deg, #1e3a5f, #1e293b);
      padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .am-cv-ai-panel-title {
      font-family: 'Montserrat', sans-serif; font-size: 0.95rem; font-weight: 700;
      color: white; display: flex; align-items: center; gap: 0.5rem;
    }
    .am-cv-ai-panel-body {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .am-cv-ai-review-btn {
      width: 100%; padding: 0.75rem; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #2D5B8E, #1e4063); color: white;
      font-size: 0.9rem; font-weight: 700; cursor: pointer;
      font-family: 'Open Sans', sans-serif; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    }
    .am-cv-ai-review-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
    .am-cv-ai-review-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .am-cv-review-result {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 0.9rem; font-size: 0.82rem; color: #e2e8f0; line-height: 1.6;
    }
    .am-cv-review-score {
      font-size: 1.8rem; font-weight: 900; text-align: center; margin-bottom: 0.5rem;
      font-family: 'Montserrat', sans-serif;
    }
    .am-cv-review-score.score-high { color: #22c55e; }
    .am-cv-review-score.score-mid  { color: #f59e0b; }
    .am-cv-review-score.score-low  { color: #ef4444; }
    .am-cv-review-item {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.8rem; color: #cbd5e1;
    }
    .am-cv-review-item:last-child { border-bottom: none; }
    .am-cv-review-tag {
      font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 4px;
      flex-shrink: 0; margin-top: 0.1rem;
    }
    .am-cv-tag-good { background: rgba(34,197,94,0.2); color: #22c55e; }
    .am-cv-tag-warn { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .am-cv-tag-fix  { background: rgba(239,68,68,0.2);  color: #ef4444; }
    .am-cv-export-footer {
      display: flex; gap: 0.75rem; padding: 1rem 1.5rem;
      background: white; border-top: 1px solid #e2e8f0; flex-shrink: 0; justify-content: flex-end;
    }
    .am-cv-export-btn {
      padding: 0.7rem 1.75rem; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #16a34a, #15803d); color: white;
      font-size: 0.95rem; font-weight: 700; cursor: pointer;
      font-family: 'Open Sans', sans-serif; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.5rem;
      box-shadow: 0 4px 14px rgba(22,163,74,0.35);
    }
    .am-cv-export-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
    .am-cv-export-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    /* CV Page inside preview */
    #cv-preview-frame {
      width: 860px; background: white; transform-origin: top center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18); border-radius: 4px;
      transform: scale(0.78);
      margin-bottom: -12%;
    }
    @media (max-width: 900px) {
      .am-cv-export-layout { flex-direction: column; }
      .am-cv-ai-panel { width: 100%; height: 280px; border-left: none; border-top: 2px solid #2D5B8E; }
      #cv-preview-frame { width: 100%; transform: scale(1); margin-bottom: 0; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.id = 'admin-mode-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

// ─── AI SUGGESTION MODAL ────────────────────────────────────
async function openAISuggestionModal(field) {
  // Check if AI is configured
  const aiConfig = await readPortfolioDoc('ai-config');
  if (!aiConfig || !aiConfig.connectionTested || aiConfig.connectionStatus !== 'success') {
    showToast('❌ AI is not configured or connection failed. Please configure AI in the Config tab first.', 'error');
    return;
  }

  // Get current content
  const originalTextarea = document.querySelector(`[data-path="${field}"]`) || 
                           document.querySelector(`[data-key="${field}"]`) ||
                           document.querySelector(`[data-new="${field}"]`);
  let currentContent = originalTextarea ? originalTextarea.value : '';
  
  let fieldLabel = field.split('.').pop();
  fieldLabel = fieldLabel.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  // Create modal
  const modalHtml = `
    <div id="ai-suggestion-overlay" class="am-overlay am-visible">
      <div class="am-edit-box" style="max-width: 800px;">
        <div class="am-edit-header">
          <h2 class="am-edit-title">🤖 AI Content Suggestion: ${fieldLabel}</h2>
          <button class="am-close-btn" id="ai-suggestion-close">✕</button>
        </div>
        <div class="am-edit-body">
          <div class="am-form-group">
            <label>Current Content</label>
            <textarea class="am-textarea" id="ai-current-content" rows="6" readonly>${esc(currentContent)}</textarea>
          </div>
          
          <div class="am-form-group">
            <label>Additional Instructions (Optional)</label>
            <textarea class="am-textarea" id="ai-instructions" rows="3" placeholder="E.g: Optimize performance, refactor clean code, improve validation handling, add edge case checking"></textarea>
          </div>
          
          <div class="am-form-group" style="text-align: center;">
            <button class="am-btn am-btn-primary" id="ai-generate-suggestion">
              <span id="ai-generate-spinner" class="am-spinner am-hidden"></span>
              🚀 Generate AI Suggestion
            </button>
          </div>
          
          <div id="ai-suggestion-result" class="am-hidden">
            <hr class="am-divider" style="margin:20px 0;" />
            <div class="am-form-group">
              <label>AI Optimized Content</label>
              <textarea class="am-textarea" id="ai-optimized-content" rows="8"></textarea>
            </div>
            
            <div class="am-form-group">
              <label>AI Summary</label>
              <div id="ai-summary" class="am-ai-summary"></div>
            </div>
            
            <div class="am-form-group" style="display: flex; gap: 1rem;">
              <button class="am-btn am-btn-primary" id="ai-apply-suggestion" style="flex: 1;">
                ✅ Apply Suggestion
              </button>
              <button class="am-btn am-btn-ghost" id="ai-cancel-suggestion" style="flex: 1;">
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Event listeners
  document.getElementById('ai-suggestion-close').addEventListener('click', closeAISuggestionModal);
  document.getElementById('ai-generate-suggestion').addEventListener('click', () => generateAISuggestion(field));
  document.getElementById('ai-apply-suggestion').addEventListener('click', () => applyAISuggestion(field));
  document.getElementById('ai-cancel-suggestion').addEventListener('click', closeAISuggestionModal);
  
  document.getElementById('ai-suggestion-overlay').addEventListener('click', e => {
    if (e.target.id === 'ai-suggestion-overlay') closeAISuggestionModal();
  });
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('ai-suggestion-overlay')) {
      closeAISuggestionModal();
    }
  });
}

function closeAISuggestionModal() {
  const overlay = document.getElementById('ai-suggestion-overlay');
  if (overlay) overlay.remove();
}

async function generateAISuggestion(field) {
  const generateBtn = document.getElementById('ai-generate-suggestion');
  const spinner = document.getElementById('ai-generate-spinner');
  const currentContent = document.getElementById('ai-current-content').value;
  const instructions = document.getElementById('ai-instructions').value.trim();
  
  if (!currentContent.trim()) {
    showToast('❌ No content to optimize', 'error');
    return;
  }
  
  // Disable button
  generateBtn.disabled = true;
  spinner.classList.remove('am-hidden');
  generateBtn.innerHTML = '<span id="ai-generate-spinner" class="am-spinner"></span> Generating...';
  
  try {
    const aiConfig = await readPortfolioDoc('ai-config');
    if (!aiConfig) throw new Error('AI config not found');
    
    const fullPortfolioData = await readAllPortfolioDocs();
    const systemPrompt = `You are an expert copywriter and portfolio optimization assistant.
You have access to Tran Tan Phat's full portfolio context below. Use this context to deeply understand his skills, experience, and projects, and provide highly relevant optimizations.

--- PORTFOLIO CONTEXT ---
${JSON.stringify(fullPortfolioData, null, 2)}
-------------------------`;

    let fieldType = 'content';
    if (field.toLowerCase().includes('overview')) fieldType = 'overview';
    if (field.toLowerCase().includes('responsibilities')) fieldType = 'responsibilities';
    if (field.toLowerCase().includes('description')) fieldType = 'description';
    if (field.toLowerCase().includes('careerobjective')) fieldType = 'career objective';
    
    const prompt = `Please optimize and improve the following ${fieldType}. ${instructions ? `Additional instructions: ${instructions}` : ''}
    
Current content:
${currentContent}

Please provide:
1. The optimized content
2. A brief summary of improvements made (as bullet points)

Format your response as JSON with keys: "optimizedContent" and "summary" (array of strings).`;
    
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${atob(aiConfig.apiKey)}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false
      })
    });
    
    if (response.ok) {
      const text = await response.text();
      let result;
      
      if (text.trim().startsWith('data:')) {
        let fullText = '';
        const chunks = text.split('\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]'));
        for (const chunk of chunks) {
          try {
            const parsed = JSON.parse(chunk.replace('data: ', ''));
            const content = extractAIContent(parsed);
            if (content) fullText += content;
          } catch(e) {}
        }
        result = { choices: [{ message: { content: fullText } }] };
      } else {
        result = JSON.parse(text);
      }
      
      const aiResponse = extractAIContent(result) || '';
      
      // Try to parse JSON response
      let parsedResponse;
      try {
        // Extract JSON from response if wrapped in code blocks
        const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                          aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse;
        parsedResponse = JSON.parse(jsonString);
      } catch (parseError) {
        // Fallback: assume the response is just the optimized content
        parsedResponse = {
          optimizedContent: aiResponse,
          summary: ['Content optimized by AI']
        };
      }
      
      // Show result
      document.getElementById('ai-optimized-content').value = parsedResponse.optimizedContent || '';
      document.getElementById('ai-summary').innerHTML = (parsedResponse.summary || []).map(item => 
        `<div class="am-summary-item">• ${esc(item)}</div>`
      ).join('');
      document.getElementById('ai-suggestion-result').classList.remove('am-hidden');
      
      showToast('✅ AI suggestion generated successfully', 'success');
      
    } else {
      throw new Error(`API Error: ${response.status}`);
    }
    
  } catch (error) {
    showToast(`❌ Failed to generate suggestion: ${error.message}`, 'error');
  } finally {
    generateBtn.disabled = false;
    spinner.classList.add('am-hidden');
    generateBtn.innerHTML = '<span id="ai-generate-spinner" class="am-spinner am-hidden"></span> 🚀 Generate AI Suggestion';
  }
}

function applyAISuggestion(field) {
  if (!window.confirm("Do you want to replace current content with AI optimized version?")) {
    return;
  }

  const optimizedContent = document.getElementById('ai-optimized-content').value;
  
  // Find the original textarea and update it
  const originalTextarea = document.querySelector(`[data-path="${field}"]`) || 
                           document.querySelector(`[data-key="${field}"]`) ||
                           document.querySelector(`[data-new="${field}"]`);
  if (originalTextarea) {
    originalTextarea.value = optimizedContent;
    originalTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  showToast('✅ AI suggestion applied to content', 'success');
  closeAISuggestionModal();
}

// ─── CV EXPORT (lazy-loaded module) ──────────────────────────
import('./cv-export.js').catch(err => console.warn('[Admin] cv-export module failed to load:', err));
