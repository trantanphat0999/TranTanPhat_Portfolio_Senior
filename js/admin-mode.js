/**
 * ADMIN EDIT MODE
 * ======================================================
 * Trigger  : Triple-click the footer copyright text
 * Password : admin1909
 * Features :
 *   - Password-gated admin mode
 *   - Edit buttons (✏️) on every section
 *   - Popup with smart forms per section
 *   - Save → Firebase Firestore
 *   - Cancel / ESC / backdrop click → discard
 *   - Toast notifications for save feedback
 * ======================================================
 */

import { readPortfolioDoc, writePortfolioDoc } from './firebase-config.js';

// ─── STATE ───────────────────────────────────────────────────
let isAdminMode = false;
const ADMIN_PASSWORD = 'admin1909';
let footerClickCount = 0;
let footerClickTimer = null;

// ─── INIT ────────────────────────────────────────────────────
export function initAdminMode() {
  injectStyles();
  injectPasswordModal();
  injectEditModal();
  injectAdminToolbar();
  setupFooterTrigger();
  console.log('[Admin] Ready. Triple-click footer copyright to activate.');
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
        <span class="am-toolbar-hint">Click the edit icon on sections to edit</span>
        <button class="am-btn am-btn-danger-sm" id="admin-logout">Exit</button>
      </div>
    </div>
  `);
  document.getElementById('admin-logout').addEventListener('click', deactivateAdminMode);
}

// ─── ACTIVATE / DEACTIVATE ───────────────────────────────────
function activateAdminMode() {
  isAdminMode = true;
  document.body.classList.add('admin-mode');
  document.getElementById('admin-toolbar').classList.remove('am-hidden');
      addEditButtons();
      
      // Integrate with portfolio-loader for "Add New" buttons
      import('./portfolio-loader.js').then(loader => {
        if (loader.setupAddNewButtons) loader.setupAddNewButtons();
      }).catch(err => console.warn('portfolio-loader.js not found or error', err));
      
      showToast('✅ Admin Mode Enabled', 'success');
}

function deactivateAdminMode() {
  isAdminMode = false;
  document.body.classList.remove('admin-mode');
  document.getElementById('admin-toolbar').classList.add('am-hidden');
  removeEditButtons();
  
  // Remove "Add New" buttons
  import('./portfolio-loader.js').then(loader => {
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
    let menuHtml = `
      <button class="am-edit-menu-item" data-action="content">
        <i class="ri-edit-2-line text-primary"></i> Edit Content
      </button>
    `;
    if (hasLayout) {
      menuHtml += `
        <button class="am-edit-menu-item" data-action="layout">
          <i class="ri-drag-move-2-line text-primary"></i> Edit Layout
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
      if (actionBtn.dataset.action === 'content') {
        openEditModal(section, label);
      } else if (actionBtn.dataset.action === 'layout') {
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
  document.getElementById('admin-edit-title').textContent = `✏️ Edit: ${label}`;
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
  saveBtn.innerHTML = `
    <span id="admin-save-spinner" class="am-spinner am-hidden"></span>
    💾 Save Changes
  `;
  saveBtn.onclick = () => saveSection(section);

  // Robust Event Delegation for dynamic buttons inside the modal body
  const editBody = document.getElementById('admin-edit-body');
  // Remove old listener if exists to prevent duplicates (by cloning)
  const newEditBody = editBody.cloneNode(true);
  editBody.parentNode.replaceChild(newEditBody, editBody);
  
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
  });
}

function closeEditModal() {
  document.getElementById('admin-edit-overlay').classList.remove('am-visible');
  currentSection = null;
  currentData = null;
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
            </div>
          `;
       });
       listHtml += `</div>`;
       document.getElementById('admin-edit-body').innerHTML = listHtml;
       
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
    showToast('Đang xóa... / Deleting...', 'info');
    // Auto-save the deletion to Firebase immediately for better UX
    saveSection(currentSection).catch(err => {
      console.error('Auto-save after delete failed:', err);
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
    case 'contact':      body.innerHTML = renderContactForm(data); break;
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
    <div class="am-form-group"><label>Tagline / Description</label>
      <textarea class="am-textarea" data-key="tagline" rows="4">${esc(d.tagline)}</textarea></div>
    <div class="am-form-group"><label>Hero Tags (comma-separated)</label>
      <input class="am-input" data-key="heroTags" value="${esc((d.heroTags||[]).join(', '))}"></div>
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
      <div class="am-form-group"><label>Description</label>
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
      <div class="am-form-group"><label>Description</label>
        <textarea class="am-textarea" data-path="leadership.${i}.description" rows="3">${esc(item.description)}</textarea></div>
    </div>`).join('');

  return `
    <div class="am-form-group"><label>Overview</label>
      <textarea class="am-textarea" data-key="overview" rows="4">${esc(d.overview)}</textarea></div>
    <div class="am-form-group"><label>Career Objective</label>
      <textarea class="am-textarea" data-key="careerObjective" rows="3">${esc(d.careerObjective)}</textarea></div>
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
      <div class="am-form-group"><label>Job Description</label>
        <textarea class="am-textarea" data-path="jobs.${i}.description" rows="5">${esc(job.description)}</textarea></div>
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
      <div class="am-form-group"><label>Short Description (card)</label>
        <textarea class="am-textarea" data-path="items.${i}.description" rows="3">${esc(proj.description)}</textarea></div>
      <div class="am-form-group"><label>Tags (comma-separated)</label>
        <input class="am-input am-tags-input" data-path="items.${i}.tags" value="${esc((proj.tags || []).join(', '))}"></div>
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
      <div class="am-form-group"><label>Description</label>
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
      <div class="am-form-group"><label>Description</label>
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

  return data;
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

// ─── UTILITY ─────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

// ─── STYLES ──────────────────────────────────────────────────
function injectStyles() {
  const css = `
    /* ===== ADMIN MODE OVERLAY ===== */
    .am-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99000;
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
    .am-toolbar-inner { display: flex; align-items: center; gap: 1rem; max-width: 1200px; margin: 0 auto; }
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
      position: fixed; top: 80px; right: 1.5rem; z-index: 99999;
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

    /* ===== RESPONSIVE ===== */
    @media (max-width: 640px) {
      .am-edit-box { max-height: 95vh; border-radius: 16px 16px 0 0; }
      .am-pw-box { padding: 2rem 1.5rem; }
      .am-skill-row { flex-direction: column; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.id = 'admin-mode-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}
