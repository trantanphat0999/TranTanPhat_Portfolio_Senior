/**
 * PORTFOLIO LOADER (internal module)
 * ======================================================
 * NOTE:
 * - This file contains the main loader implementation.
 * - `js/portfolio-loader.js` is kept as a thin public entrypoint for backward compatibility.
 */

// ─── CACHE ───────────────────────────────────────────────────
export let portfolioData = {};

import { readLocalPortfolioCache } from '../local-portfolio-cache.js';

let firebaseApiPromise = null;
let firebaseRefreshTimer = null;

async function getFirebaseApi() {
  if (!firebaseApiPromise) {
    firebaseApiPromise = import('../firebase-config.js').catch(err => {
      firebaseApiPromise = null;
      throw err;
    });
  }
  return firebaseApiPromise;
}

async function readAllPortfolioDocsSafe() {
  try {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firebase load timeout')), 5000);
    });
    const { readAllPortfolioDocs } = await Promise.race([getFirebaseApi(), timeout]);
    return await Promise.race([readAllPortfolioDocs(), timeout]);
  } catch (err) {
    console.warn('[Loader] Firebase unavailable. Using local portfolio cache.', err);
    return readLocalPortfolioCache();
  }
}

// ─── INIT ────────────────────────────────────────────────────
export async function initPortfolioLoader() {
  try {
    showLoadingOverlay();
    portfolioData = await readAllPortfolioDocsSafe();

    if (Object.keys(portfolioData).filter(key => !key.startsWith('__')).length === 0) {
      console.warn('[Loader] No data found in Firestore. Falling back to static HTML.');
      ensureStaticProjectModals();
      hideLoadingOverlay();
      return;
    }

    // Auto-migrate disabled: was causing infinite reload loops when detailOverview is missing.
    // To seed data, open seed.html directly.

    renderAllSections(portfolioData);
    hideLoadingOverlay();
    console.log('[Loader] ✅ Portfolio rendered from Firestore.');

    // Notify admin-mode about fresh data (for Add New buttons)
    window._portfolioData = portfolioData;
    window._reloadPortfolioSection = reloadSection;
    window._reloadPortfolioMetadata = reloadMetadata;
    startFirebaseRefreshLoop();
  } catch (err) {
    console.error('[Loader] ❌ Failed to load from Firestore:', err);
    hideLoadingOverlay();
  }
}

async function refreshFromFirebase() {
  try {
    const { readAllPortfolioDocs, getFirebaseConnectionStatus } = await getFirebaseApi();
    const fresh = await readAllPortfolioDocs();
    const status = typeof getFirebaseConnectionStatus === 'function'
      ? getFirebaseConnectionStatus()
      : 'unknown';
    if (status !== 'connected' || Object.keys(fresh || {}).filter(key => !key.startsWith('__')).length === 0) return;

    portfolioData = fresh;
    window._portfolioData = portfolioData;
    renderAllSections(portfolioData);
    console.log('[Loader] Portfolio cache refreshed from Firebase.');
  } catch (err) {
    console.warn('[Loader] Firebase refresh skipped:', err);
  }
}

function startFirebaseRefreshLoop() {
  if (firebaseRefreshTimer) return;
  window.addEventListener('online', refreshFromFirebase);
  window.addEventListener('focus', refreshFromFirebase);
  firebaseRefreshTimer = window.setInterval(refreshFromFirebase, 60000);
}

// ─── LOADING OVERLAY ─────────────────────────────────────────
function showLoadingOverlay() {
  const el = document.createElement('div');
  el.id = 'pl-loading';
  el.innerHTML = `
    <div style="
      position:fixed; inset:0; z-index:90000;
      background:rgba(255,255,255,0.92);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:1rem; font-family:'Open Sans',sans-serif;
    ">
      <div style="
        width:40px; height:40px; border:4px solid #e2e8f0;
        border-top-color:#2D5B8E; border-radius:50%;
        animation:plSpin 0.7s linear infinite;
      "></div>
      <p style="color:#4B5563; font-size:0.95rem;">Loading data from Firestore...</p>
    </div>
    <style>@keyframes plSpin{to{transform:rotate(360deg)}}</style>
  `;
  document.body.appendChild(el);
}

function hideLoadingOverlay() {
  const el = document.getElementById('pl-loading');
  if (el) el.remove();
}

// ─── RENDER ALL ──────────────────────────────────────────────
function renderAllSections(data) {
  if (data.header)       renderHeader(data.header);
  if (data.summary)      renderSummary(data.summary);
  if (data.experience)   renderExperience(data.experience);
  if (data.skills)       renderSkills(data.skills);
  if (data.projects)     renderProjects(data.projects);
  if (data.achievements) renderAchievements(data.achievements);
  if (data.education)    renderEducation(data.education);
  if (data.contact)      renderContact(data.contact);
  if (data.metadata)     renderMetadata(data.metadata);
}

// Reload a single section (called after add/edit/delete)
export async function reloadSection(sectionId) {
  let data = null;
  try {
    const { readPortfolioDoc } = await getFirebaseApi();
    data = await readPortfolioDoc(sectionId);
  } catch (err) {
    console.warn(`[Loader] Firebase unavailable while reloading ${sectionId}. Using local cache.`, err);
    const local = await readLocalPortfolioCache();
    data = local[sectionId];
  }
  if (!data) return;
  portfolioData[sectionId] = data;
  window._portfolioData = portfolioData;
  renderAllSections({ [sectionId]: data });
}

export async function reloadMetadata() {
  let data = null;
  try {
    const { readPortfolioDoc } = await getFirebaseApi();
    data = await readPortfolioDoc('metadata');
  } catch (err) {
    console.warn('[Loader] Firebase unavailable while reloading metadata. Using local cache.', err);
    const local = await readLocalPortfolioCache();
    data = local.metadata;
  }
  if (!data) return;
  portfolioData.metadata = data;
  window._portfolioData = portfolioData;
  renderMetadata(data);
}

function formatLastUpdated(value) {
  if (!value) return 'Mar 22, 2026';

  const raw = typeof value.toDate === 'function' ? value.toDate() : value;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function renderMetadata(d) {
  const text = `Last Updated: ${formatLastUpdated(d.lastUpdatedAt)}`;
  document.querySelectorAll('[data-pl="lastUpdated"]').forEach(el => {
    el.textContent = text;
  });
}

// ─── HEADER ──────────────────────────────────────────────────
function renderHeader(d) {
  // Name
  const nameEls = document.querySelectorAll('[data-pl="name"]');
  nameEls.forEach(el => el.textContent = d.name || '');

  // Title
  document.querySelectorAll('[data-pl="title"]').forEach(el => el.textContent = d.title || '');

  // Tagline / bio paragraph
  const taglineEl = document.querySelector('[data-pl="tagline"]');
  if (taglineEl) taglineEl.textContent = d.tagline || '';

  // Contact meta items
  const locationEl = document.querySelector('[data-pl="location"]');
  if (locationEl) locationEl.textContent = d.location || '';

  const experienceEl = document.querySelector('[data-pl="experience"]');
  if (experienceEl) experienceEl.textContent = d.experience || '';

  const availabilityEl = document.querySelector('[data-pl="availability"]');
  if (availabilityEl) availabilityEl.textContent = d.availability || '';

  // Email links
  document.querySelectorAll('[data-pl="email"]').forEach(el => {
    el.textContent = d.email || '';
    if (el.tagName === 'A') el.href = `mailto:${d.email}`;
  });

  // Phone links
  document.querySelectorAll('[data-pl="phone"]').forEach(el => {
    el.textContent = d.phone || '';
    if (el.tagName === 'A') el.href = `tel:${d.phone}`;
  });

  // Social links
  if (d.linkedin) {
    document.querySelectorAll('[data-pl="linkedin"]').forEach(el => el.href = d.linkedin);
  }
  if (d.github) {
    document.querySelectorAll('[data-pl="github"]').forEach(el => el.href = d.github);
  }

  // Hero tags container
  const tagsContainer = document.querySelector('[data-pl="heroTags"]');
  if (tagsContainer && d.heroTags) {
    tagsContainer.innerHTML = d.heroTags.map(tag =>
      `<span class="skill-pill px-4 py-2 bg-white text-primary rounded-full text-sm font-medium border border-primary/20 cursor-default shadow-sm">${h(tag)}</span>`
    ).join('');
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────
function renderSummary(d) {
  // Overview paragraph
  const overviewEl = document.querySelector('[data-pl="overview"]');
  if (overviewEl) overviewEl.textContent = d.overview || '';

  // Career Objective
  const objEl = document.querySelector('[data-pl="careerObjective"]');
  if (objEl) objEl.textContent = d.careerObjective || '';

  // Core Expertise list
  const expertiseList = document.querySelector('[data-pl="coreExpertise"]');
  if (expertiseList && d.coreExpertise) {
    expertiseList.innerHTML = d.coreExpertise.map(item => `
      <li class="flex items-start gap-2">
        <i class="ri-checkbox-circle-line text-primary mt-1 flex-shrink-0"></i>
        <span>
          <span class="font-semibold text-primary">${h(item.title)}:</span>
          ${h(item.description)}
        </span>
      </li>`).join('');
  }

  // Leadership list
  const leadershipList = document.querySelector('[data-pl="leadership"]');
  if (leadershipList && d.leadership) {
    leadershipList.innerHTML = d.leadership.map(item => `
      <li class="flex items-start gap-2">
        <i class="ri-checkbox-circle-line text-primary mt-1 flex-shrink-0"></i>
        <span>
          <span class="font-semibold text-primary">${h(item.title)}:</span>
          ${h(item.description)}
        </span>
      </li>`).join('');
  }
}

// ─── EXPERIENCE ──────────────────────────────────────────────
function renderExperience(d) {
  const container = document.querySelector('[data-pl="experienceJobs"]');
  if (!container || !d.jobs) return;

  container.innerHTML = d.jobs.map((job) => `
    <div class="flex-1 bg-gradient-to-br from-primary/5 to-white rounded-xl p-6 flex flex-col items-center shadow-md hover:shadow-xl transition-all border border-primary/10">
      <div class="group w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 overflow-hidden border-4 border-primary/20 transition-all duration-300 hover:border-primary hover:scale-105 hover:shadow-2xl">
        ${job.logo
          ? `<img src="${h(job.logo)}" alt="${h(job.company)} Logo" class="object-contain w-16 h-16 transition-all duration-300 group-hover:scale-110"/>`
          : `<i class="ri-building-line text-4xl text-primary/50"></i>`}
      </div>
      <h4 class="text-xl font-bold text-gray-900 mb-1">${h(job.company)}</h4>
      <p class="text-gray-500 mb-2">${h(job.period)}</p>
      <div class="px-4 py-1.5 bg-primary/10 text-primary rounded-full inline-block text-sm mb-4 font-semibold">${h(job.badge)}</div>
      <h3 class="text-lg font-bold text-primary mb-2">${h(job.role)}</h3>
      <p class="text-gray-700 mb-6 leading-relaxed text-center">${h(job.description)}</p>
      ${job.highlights ? `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
          ${job.highlights.map(hl => `
            <div class="flex items-start gap-3 bg-gray-50 p-3 rounded-lg shadow-sm min-w-0">
              <div class="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="${h(hl.icon)} text-primary"></i>
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-gray-900 text-sm break-words">${h(hl.title)}</div>
                <div class="text-gray-600 text-xs break-words">${h(hl.desc)}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div>`).join('');
}

// ─── SKILLS ──────────────────────────────────────────────────
function renderSkills(d) {
  const container = document.querySelector('[data-pl="skillsCategories"]');
  if (!container || !d.categories) return;

  container.innerHTML = d.categories.map(cat => `
    <div class="skills-category-card relative rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_40px_-12px_rgba(45,91,142,0.12)] transition-shadow duration-300 overflow-hidden min-w-0">
      <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-primary to-primary/40" aria-hidden="true"></div>
      <div class="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 pl-1 min-w-0">
        <div class="w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex-shrink-0 ring-1 ring-primary/10">
          <i class="${h(cat.icon || 'ri-tools-line')} text-2xl"></i>
        </div>
        <h3 class="text-lg sm:text-xl font-bold text-gray-900 tracking-tight break-words leading-snug min-w-0">${h(cat.name)}</h3>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-1">
        ${(cat.skills || []).map(sk => `
          <div class="skill-mini flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.06)] hover:shadow-md hover:border-primary/25 transition-all duration-200 group min-w-0">
            <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/12 to-primary/5 text-primary ring-1 ring-primary/10 transition-colors flex-shrink-0">
              <i class="${h(sk.icon || 'ri-checkbox-line')} text-xl"></i>
            </div>
            <div class="min-w-0 flex-1 pt-0.5">
              <h4 class="font-semibold text-gray-900 text-sm sm:text-base break-words">${h(sk.title)}</h4>
              <p class="text-sm text-gray-600 mt-1 leading-relaxed break-words">${h(sk.desc)}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

// ─── PROJECTS ────────────────────────────────────────────────
function isProjectActive(proj) {
  return proj.status !== 'inactive';
}

function getProjectCardImage(proj) {
  const id = String(proj.id || proj.modalId || '').toLowerCase();
  const title = String(proj.title || '').toLowerCase();
  const isOutsource = id === 'project1'
    || id === 'project2'
    || title.includes('promotion claim automation')
    || title.includes('stuck claim');

  return isOutsource ? 'image/KraftHeinz.webp' : 'image/SS1.png';
}

function renderProjectModalHtml(proj) {
  const modalId = proj.modalId || proj.id;
  const imageHtml = proj.image
    ? `<img src="${h(proj.image)}" alt="${h(proj.title)}" class="w-full h-auto rounded">`
    : `<i class="${h(proj.imageIcon || 'ri-code-box-line')} text-indigo-300" style="font-size:6rem;"></i>`;

  const safeMap = (str, renderFn) => str ? String(str).split('\n').map(s => s.trim()).filter(Boolean).map(renderFn).join('') : '';

  const bulletLi = (icon, text) => `
    <li class="flex items-start gap-2">
      <div class="w-5 h-5 flex items-center justify-center text-primary mt-1">
        <i class="${icon}"></i>
      </div>
      <span class="text-gray-700">${h(text)}</span>
    </li>
  `;

  const responsibilitiesHtml = safeMap(proj.detailResponsibilities, text => bulletLi('ri-check-line', text));
  const resultsHtml = safeMap(proj.detailResults, text => bulletLi('ri-arrow-right-circle-line', text));

  const techs = proj.detailTechnologies ? String(proj.detailTechnologies).split(',').map(s => s.trim()).filter(Boolean) : (proj.tags || []);
  const techsHtml = techs.map(t => `<span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">${h(t)}</span>`).join('');

  const overviewHtml = proj.detailOverview 
    ? String(proj.detailOverview).split('\n\n').filter(p => p.trim()).map(p => `<p class="text-gray-700 mb-4">${h(p)}</p>`).join('')
    : `<p class="text-gray-700 mb-4">${h(proj.description || '')}</p>`;

  return `
  <div id="${h(modalId)}-modal" class="modal">
    <div class="modal-content max-w-4xl mx-auto my-12 bg-white rounded shadow-xl p-8" style="position:relative;">
      <button class="modal-close-btn close-modal" title="Close" aria-label="Close modal">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div class="admin-edit-wrapper hidden mb-6">
        <button class="admin-edit-modal-detail-btn px-4 py-2 bg-amber-500 text-white rounded font-semibold hover:bg-amber-600 transition-colors shadow-sm inline-flex items-center gap-2" data-edit-project="${h(proj.id)}">
          <i class="ri-edit-2-line"></i> Edit Detail Content
        </button>
      </div>

      <div class="mb-6">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">${h(proj.title)}</h3>
        ${imageHtml}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <h4 class="font-semibold text-gray-800 mb-2">Project Duration</h4>
          <p class="text-gray-600">${h(proj.detailDuration || 'TBD')}</p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-800 mb-2">Client</h4>
          <p class="text-gray-600">${h(proj.detailClient || 'TBD')}</p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-800 mb-2">Role</h4>
          <p class="text-gray-600">${h(proj.detailRole || 'TBD')}</p>
        </div>
      </div>
      <div class="mb-6">
        <h4 class="font-semibold text-gray-800 mb-3">Project Overview</h4>
        ${overviewHtml}
      </div>
      ${responsibilitiesHtml ? `
      <div class="mb-6">
        <h4 class="font-semibold text-gray-800 mb-3">Key Responsibilities</h4>
        <ul class="space-y-2">
          ${responsibilitiesHtml}
        </ul>
      </div>` : ''}
      <div class="mb-6">
        <h4 class="font-semibold text-gray-800 mb-3">Technologies Used</h4>
        <div class="flex flex-wrap gap-2">
          ${techsHtml}
        </div>
      </div>
      ${resultsHtml ? `
      <div>
        <h4 class="font-semibold text-gray-800 mb-3">Results & Achievements</h4>
        <ul class="space-y-2">
          ${resultsHtml}
        </ul>
      </div>` : ''}
    </div>
  </div>`;
}

function renderProjects(d) {
  const container = document.querySelector('[data-pl="projectsGrid"]');
  if (!container || !d.items) return;

  const visible = d.items.filter(isProjectActive);
  if (visible.length === 0) {
    container.innerHTML = `
      <div class="w-full max-w-2xl mx-auto flex-shrink-0 text-center text-gray-500 py-14 px-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50/80">
        No projects to display. Add new projects via Admin Panel or restore inactive ones.
      </div>`;
    return;
  }

  container.innerHTML = visible.map((proj, i) => {
    const modalId = h(proj.modalId || proj.id || 'project'+i);
    const cardImage = getProjectCardImage(proj);
    const imgHtml = `<img
          src="${h(cardImage)}"
          alt="${h(proj.title)}"
          class="w-full h-full object-cover object-center"
        />`;

    return `
    <div class="project-card project-card-hscroll bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100/90 hover:shadow-2xl hover:border-primary/25 transition-all duration-300 flex flex-col flex-shrink-0 w-[min(92vw,380px)] min-w-[min(92vw,380px)] sm:w-[420px] sm:min-w-[420px] lg:w-[440px] lg:min-w-[440px] group">
      <div class="relative h-52 sm:h-56 bg-gray-100 overflow-hidden">
        ${imgHtml}
        <div class="absolute top-4 left-4 z-10 ${h(proj.badgeColor || 'bg-primary')} text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md">${h(proj.badge || '')}</div>
      </div>
      <div class="p-6 sm:p-7 min-w-0 flex flex-col flex-1">
        <h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words leading-snug line-clamp-2">${h(proj.title)}</h3>
        <p class="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3 break-words">${h(proj.description)}</p>
        <div class="flex flex-wrap gap-1.5 mb-4 min-h-10 items-start content-start">
          ${(proj.tags || []).flatMap(tag => String(tag).split(',')).map(t => t.trim()).filter(Boolean).map(tag =>
            `<span class="inline-flex items-center whitespace-nowrap text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-medium leading-5">${h(tag)}</span>`
          ).join('')}
        </div>
        <button
          class="view-project-btn w-full py-2 bg-primary text-white rounded !rounded-button hover:bg-primary/90 transition-colors mt-auto"
          data-project="${modalId}">
          View Details
        </button>
      </div>
    </div>`;
  }).join('');

  // ── Inject modals into the designated container ──────────────────────
  const modalsContainer = document.getElementById('dynamic-modals-container');
  if (modalsContainer) {
    modalsContainer.innerHTML = visible.map(proj => renderProjectModalHtml(proj)).join('');

    // Inject CSS for admin-edit-wrapper if not present
    if (!document.getElementById('admin-edit-modal-style')) {
      const st = document.createElement('style');
      st.id = 'admin-edit-modal-style';
      st.textContent = `body.admin-mode .admin-edit-wrapper { display: block !important; }`;
      document.head.appendChild(st);
    }
  } else {
    // Fallback: append modals directly to body
    console.warn('[Loader] #dynamic-modals-container not found, appending modals to body.');
    const fallback = document.createElement('div');
    fallback.id = 'dynamic-modals-container';
    fallback.innerHTML = visible.map(proj => renderProjectModalHtml(proj)).join('');
    document.body.appendChild(fallback);
  }
  // NOTE: Modal open/close is handled entirely by event delegation in index.html
  // (#project-modal-script). No onclick assignment needed here.
}

// ─── ACHIEVEMENTS ────────────────────────────────────────────
function ensureStaticProjectModals() {
  const modalsContainer = document.getElementById('dynamic-modals-container');
  if (!modalsContainer || modalsContainer.children.length > 0) return;

  const staticProjects = Array.from(document.querySelectorAll('.view-project-btn[data-project]'))
    .map((btn, i) => {
      const card = btn.closest('.project-card') || btn.closest('[class*="project-card"]');
      const titleEl = card ? card.querySelector('h3') : null;
      const descEl = card ? card.querySelector('p') : null;
      const imgEl = card ? card.querySelector('img') : null;
      const tags = card
        ? Array.from(card.querySelectorAll('span'))
            .map(el => el.textContent.trim())
            .filter(Boolean)
        : [];

      return {
        id: btn.getAttribute('data-project') || `project${i + 1}`,
        modalId: btn.getAttribute('data-project') || `project${i + 1}`,
        title: titleEl ? titleEl.textContent.trim() : `Project ${i + 1}`,
        description: descEl ? descEl.textContent.trim() : '',
        image: imgEl ? imgEl.getAttribute('src') : '',
        detailDuration: 'See project summary',
        detailClient: 'Portfolio project',
        detailRole: 'Quality Assurance',
        detailOverview: descEl ? descEl.textContent.trim() : '',
        detailTechnologies: tags.join(', ')
      };
    });

  if (staticProjects.length === 0) return;
  modalsContainer.innerHTML = staticProjects.map(proj => renderProjectModalHtml(proj)).join('');
  console.info('[Loader] Static project modals initialized.');
}

function renderAchievements(d) {
  const container = document.querySelector('[data-pl="achievementsGrid"]');
  if (!container || !d.items) return;

  container.innerHTML = d.items.map(item => `
    <div class="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all border ${h(item.borderClass || 'border-gray-200')} relative overflow-hidden group">
      <div class="absolute top-0 right-0 w-20 h-20 ${h(item.cornerBgClass || 'bg-gray-50')} rounded-bl-3xl flex items-end justify-start p-2">
        <i class="${h(item.cornerIconClass || 'ri-star-fill text-gray-300')} text-xl"></i>
      </div>
      <div class="flex items-start gap-4 mb-4">
        <div class="w-12 h-12 ${h(item.iconBgClass || 'bg-gray-100')} rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="${h(item.icon || 'ri-star-fill')} text-xl ${h(item.iconTextClass || 'text-gray-600')}"></i>
        </div>
        <div>
          <h3 class="font-bold text-gray-900 text-lg">${h(item.title)}</h3>
          <p class="text-sm font-semibold ${h(item.subtitleClass || 'text-gray-500')}">${h(item.subtitle || '')}</p>
        </div>
      </div>
      <p class="text-gray-600 text-sm leading-relaxed">${h(item.description)}</p>
    </div>`).join('');
}

// ─── EDUCATION ───────────────────────────────────────────────
function renderEducation(d) {
  const degreeContainer = document.querySelector('[data-pl="educationDegrees"]');
  if (degreeContainer && d.degrees) {
    degreeContainer.innerHTML = d.degrees.map(deg => `
      <div class="flex gap-6 items-start">
        <div class="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
          <i class="ri-graduation-cap-line text-2xl text-primary"></i>
        </div>
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-900 mb-1">${h(deg.title)}</h3>
          <p class="text-primary font-semibold mb-1">${h(deg.institution)}</p>
          <p class="text-gray-500 text-sm mb-2">${h(deg.period)}</p>
          <p class="text-gray-700 text-sm leading-relaxed">${h(deg.description)}</p>
        </div>
      </div>`).join('');
  }

  const certContainer = document.querySelector('[data-pl="educationCerts"]');
  if (certContainer && d.certifications) {
    certContainer.innerHTML = d.certifications.map(cert => `
      <div class="flex items-start gap-4 p-4 bg-white rounded-xl border border-${h(cert.color || 'primary')}/20 hover:border-${h(cert.color || 'primary')}/50 hover:shadow-md transition-all group">
        <div class="w-10 h-10 bg-${h(cert.color || 'primary')}/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-${h(cert.color || 'primary')}/20 transition-colors">
          <i class="ri-award-line text-${h(cert.color || 'primary')} text-xl"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 text-sm leading-snug break-words">${h(cert.title)}</p>
          <p class="text-gray-500 text-xs">${h(cert.issuer)} · ${h(cert.year || '')}</p>
        </div>
        ${cert.link ? `<a href="${h(cert.link)}" target="_blank" rel="noopener noreferrer" aria-label="View ${h(cert.title)} certificate" class="text-${h(cert.color || 'primary')} hover:text-primary/70 flex-shrink-0">
          <i class="ri-external-link-line text-lg"></i></a>` : ''}
      </div>`).join('');
  }
}

// ─── CONTACT ─────────────────────────────────────────────────
function renderContact(d) {
  // Contact info
  document.querySelectorAll('[data-pl="contact-email"]').forEach(el => {
    el.textContent = d.email || '';
    if (el.tagName === 'A') el.href = `mailto:${d.email}`;
  });
  document.querySelectorAll('[data-pl="contact-phone"]').forEach(el => {
    el.textContent = d.phone || '';
    if (el.tagName === 'A') el.href = `tel:${d.phone}`;
  });
  document.querySelectorAll('[data-pl="contact-location"]').forEach(el => {
    el.textContent = d.location || '';
  });

  // Social links
  const socialsContainer = document.querySelector('[data-pl="contactSocials"]');
  if (socialsContainer && d.socials) {
    // Preserve existing Zalo button so the QR click listener bound in index.html keeps working.
    const zaloBtnEl = socialsContainer.querySelector('#zalo-btn');

    const otherSocials = d.socials.filter(s => !(s && (s.isZalo || s.name === 'Zalo')));

    const iconsHtml = otherSocials.map(s => `
      <a
        href="${h(s.url || '#')}"
        target="_blank"
        rel="noopener"
        aria-label="${h(s.name || 'Social')}"
        class="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full text-primary hover:bg-primary hover:text-white transition-colors">
        <i class="${h(s.icon || 'ri-link-line')} text-xl"></i>
      </a>`).join('');

    // Clear and re-render only the non-Zalo socials.
    socialsContainer.innerHTML = iconsHtml;

    // Re-attach the existing zalo button (keeps event listener).
    if (zaloBtnEl) {
      socialsContainer.appendChild(zaloBtnEl);
      return;
    }

    // Fallback: if zalo-btn is missing for some reason, recreate it and (best-effort) bind using _lb.
    const zalo = d.socials.find(s => s && (s.isZalo || s.name === 'Zalo'));
    if (zalo) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'zalo-btn';
      btn.className =
        'w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer';
      btn.setAttribute('aria-label', 'Zalo QR Code');
      btn.innerHTML = `<i class="${h(zalo.icon || 'ri-message-3-fill')} text-xl"></i>`;
      socialsContainer.appendChild(btn);

      // _lb is defined globally in index.html (lightbox helper).
      if (typeof _lb !== 'undefined' && _lb && typeof _lb.open === 'function') {
        btn.addEventListener('click', function () {
          _lb.open('image/qrzalo.jpg', 'Quét mã QR để kết bạn Zalo 📱', 'Zalo QR Code');
        });
      }
    }
  }
}


// ─── HTML ESCAPE ─────────────────────────────────────────────
function h(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

// openProjectModal is defined globally in index.html via event delegation.
// This stub ensures backward compatibility if any code calls it directly before DOM loads.
if (typeof window.openProjectModal !== 'function') {
  window.openProjectModal = function(projectId) {
    const modal = document.getElementById(projectId + '-modal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else {
      console.warn('[Loader] Project Modal not found:', projectId);
    }
  };
}

// `admin-mode.js` expects these hooks (best-effort)
export function setupAddNewButtons() {
  // Existing implementation lived in the old file; keeping a noop here for safety.
  // If needed later, we can implement it as a proper module under `js/loader/`.
}

export function removeAddNewButtons() {
  // noop
}
