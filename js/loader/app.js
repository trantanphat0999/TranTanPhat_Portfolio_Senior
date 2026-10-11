import {renderCustomBlocks} from '../portfolio/custom-renderer.js';
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
import { educationLogo, projectCardImage, profilePhotoAssets } from '../portfolio-media.js';
import { getSeedPortfolioData } from '../db-seed.js';
import { renderIcon } from '../icons.js';

// ─── SCHEMA ──────────────────────────────────────────────────
// Bump when the shape of portfolio documents changes. Used only for
// diagnostics: validatePortfolioData() logs (non-fatally) when expected
// sections are missing so drift between Firestore and the bundled seed
// surfaces in the console instead of silently breaking a section.
export const SCHEMA_VERSION = 1;

const EXPECTED_SECTIONS = ['header', 'summary', 'experience', 'skills', 'projects', 'achievements', 'education', 'contact'];
const EXPERIENCE_BASE_YEAR = 2022;
const EXPERIENCE_BASE_VALUE = 4;

function getExperienceYears(date = new Date()) {
  return Math.max(EXPERIENCE_BASE_VALUE, date.getFullYear() - EXPERIENCE_BASE_YEAR);
}

function formatExperienceLabel() {
  return `${getExperienceYears()}+ Years in QA Engineering`;
}

function withDynamicExperience(text) {
  return String(text || '')
    .replace(/\b\d+\+\s*Years in QA Engineering\b/gi, formatExperienceLabel())
    .replace(/\b\d+\+\s*years\b/gi, `${getExperienceYears()}+ years`);
}

function applyDynamicExperienceToStaticHtml() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return /\b\d+\+\s*(?:years|Years in QA Engineering)\b/.test(node.nodeValue || '')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    node.nodeValue = withDynamicExperience(node.nodeValue);
  });
}

function validatePortfolioData(data) {
  if (!data || typeof data !== 'object') {
    console.warn('[Loader] Portfolio data is empty or invalid.');
    return;
  }
  const present = Object.keys(data).filter(key => !key.startsWith('__'));
  const missing = EXPECTED_SECTIONS.filter(section => !(section in data));
  if (missing.length) {
    console.warn(`[Loader] Missing portfolio sections: ${missing.join(', ')}. ` +
      'The bundled seed (js/db-seed.js) may be out of date — use Admin → Export Seed to refresh it.');
  }
  EXPECTED_SECTIONS.filter(section => section in data).forEach(section => {
    if (typeof data[section] !== 'object' || data[section] === null) {
      console.warn(`[Loader] Section "${section}" has an unexpected shape (expected object).`);
    }
  });
  return { schemaVersion: SCHEMA_VERSION, present, missing };
}

let firebaseApiPromise = null;
let firebaseRefreshTimer = null;
let refreshInFlight = false;

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
    const cached=await readLocalPortfolioCache();
    if(Object.keys(cached).length)renderAllSections(cached);
    portfolioData = await readAllPortfolioDocsSafe();

    if (Object.keys(portfolioData).filter(key => !key.startsWith('__')).length === 0) {
      console.warn('[Loader] No data found in Firestore. Falling back to static HTML.');
      applyDynamicExperienceToStaticHtml();
      ensureStaticProjectModals();
      hideLoadingOverlay();
      return;
    }

    // Auto-migrate disabled: was causing infinite reload loops when detailOverview is missing.
    // To seed data, open tools/seed.html directly.

    validatePortfolioData(portfolioData);
    renderAllSections(portfolioData,cached);
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
  if(refreshInFlight)return;
  // Don't clobber the admin's in-progress edits: while Admin Mode is active
  // (or an edit modal is open) the admin drives re-renders manually via
  // reloadSection() after each save. Auto-refresh resumes on exit.
  if (typeof document !== 'undefined') {
    const adminActive = document.body?.classList.contains('admin-mode');
    const editOpen = document.getElementById('admin-edit-overlay')?.classList.contains('am-visible');
    if (document.hidden || adminActive || editOpen || document.querySelector('.modal[style*="block"], .lb-open, .pm-open')) return;
  }
  refreshInFlight=true;
  try {
    const { readAllPortfolioDocs, getFirebaseConnectionStatus } = await getFirebaseApi();
    const fresh = await readAllPortfolioDocs();
    const status = typeof getFirebaseConnectionStatus === 'function'
      ? getFirebaseConnectionStatus()
      : 'unknown';
    if (status !== 'connected' || Object.keys(fresh || {}).filter(key => !key.startsWith('__')).length === 0) return;

    if(JSON.stringify(portfolioData)===JSON.stringify(fresh))return;
    // Keep the same reading anchor when an earlier section changes height.
    const anchor=[...document.querySelectorAll('main section[id],body > section[id]')]
      .find(section=>section.getBoundingClientRect().bottom>0);
    const anchorTop=anchor?.getBoundingClientRect().top;
    const previous=portfolioData;
    portfolioData = fresh;
    window._portfolioData = portfolioData;
    renderAllSections(portfolioData,previous);
    if(anchor?.isConnected&&Number.isFinite(anchorTop)){
      const delta=anchor.getBoundingClientRect().top-anchorTop;
      if(Math.abs(delta)>1)window.scrollTo({top:scrollY+delta,behavior:'instant'});
    }
    console.log('[Loader] Portfolio cache refreshed from Firebase.');
  } catch (err) {
    console.warn('[Loader] Firebase refresh skipped:', err);
  } finally {
    refreshInFlight=false;
  }
}

function startFirebaseRefreshLoop() {
  if (firebaseRefreshTimer) return;
  window.addEventListener('online', refreshFromFirebase);
  window.addEventListener('focus', refreshFromFirebase);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFromFirebase();});
  firebaseRefreshTimer = window.setInterval(refreshFromFirebase, 60000);
}

// ─── LOADING OVERLAY ─────────────────────────────────────────
function showLoadingOverlay() {
  // Read the bundled/cache content immediately; network refresh never blocks the page.
}

function hideLoadingOverlay() {
  const el = document.getElementById('pl-loading');
  if (el) el.remove();
}

// ─── RENDER ALL ──────────────────────────────────────────────
function renderAllSections(data,previous=null) {
  const renderers={header:renderHeader,summary:renderSummary,experience:renderExperience,skills:renderSkills,
    projects:renderProjects,achievements:renderAchievements,education:renderEducation,contact:renderContact,
    metadata:renderMetadata,'custom-blocks':value=>renderCustomBlocks(value)};
  for(const [key,render] of Object.entries(renderers)){
    if(!Object.hasOwn(data,key))continue;
    if(previous&&JSON.stringify(data[key])===JSON.stringify(previous[key]))continue;
    if(data[key]||key==='custom-blocks'){
      const carousel=key==='projects'?document.querySelector('.projects-scroll'):null;
      const left=carousel?.scrollLeft;
      render(data[key]);
      if(carousel&&Number.isFinite(left))carousel.scrollTo({left,behavior:'instant'});
    }
  }
  window.dispatchEvent(new CustomEvent('portfolio:render'));
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
  window.dispatchEvent(new CustomEvent('portfolio-content-changed',{detail:{sectionId}}));
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
  if (taglineEl) taglineEl.textContent = d.tagline || "";

  // Contact meta items
  const locationEl = document.querySelector('[data-pl="location"]');
  if (locationEl) locationEl.textContent = d.location || '';

  const experienceEl = document.querySelector('[data-pl="experience"]');
  if (experienceEl) experienceEl.textContent = d.experience || formatExperienceLabel();

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

  // Profile photo (avatar in hero + profile modal)
  if (d.profilePhoto || d.avatar) {
    const assets=profilePhotoAssets(d.profilePhoto || d.avatar);
    document.querySelectorAll('#avatar-img, #pm-avatar-img').forEach(el => {
      if(el.getAttribute('src')!==assets.src)el.src=assets.src;
      if(assets.srcset)el.setAttribute('srcset',assets.srcset);else el.removeAttribute('srcset');
      const source=el.closest('picture')?.querySelector('source');
      if(source){if(assets.webp)source.setAttribute('srcset',assets.webp);else source.removeAttribute('srcset');}
    });
  }

  window._profileDetails={name:d.name,...d.profileDetails};
  const status=document.querySelector('.hero-status'); if(status)status.hidden=d.openToWork===false;
  // Hero tags container
  const tagsContainer = document.querySelector('[data-pl="heroTags"]');
  if (tagsContainer && d.heroTags) {
    tagsContainer.innerHTML = d.heroTags.map(tag =>
      `<span>${renderIcon(tag,heroTagIcon(tag))}${h(tag)}</span>`
    ).join('');
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────
function heroTagIcon(tag) {
  const value = String(tag || '').toLowerCase();
  if (value.includes('api')) return 'ri-code-s-slash-line';
  if (value.includes('performance')) return 'ri-speed-up-line';
  if (value.includes('security')) return 'ri-shield-check-line';
  if (value.includes('postman')) return 'ri-send-plane-line';
  if (value.includes('jmeter')) return 'ri-dashboard-3-line';
  if (value.includes('ai')) return 'ri-sparkling-2-line';
  if (value.includes('ci') || value.includes('cd')) return 'ri-git-branch-line';
  if (value.includes('mentor')) return 'ri-team-line';
  return 'ri-checkbox-circle-line';
}

function renderSummary(d) {
  // Overview paragraph
  const overviewEl = document.querySelector('[data-pl="overview"]');
  if (overviewEl) overviewEl.textContent = withDynamicExperience(d.overview);

  // Career Objective
  const objEl = document.querySelector('[data-pl="careerObjective"]');
  if (objEl) objEl.textContent = withDynamicExperience(d.careerObjective);

  // Core Expertise list
  const expertiseList = document.querySelector('[data-pl="coreExpertise"]');
  if (expertiseList && d.coreExpertise) {
    expertiseList.innerHTML = d.coreExpertise.map(item => `
      <li class="flex items-start gap-2">
        ${renderIcon(item.title,'ri-checkbox-circle-line text-primary mt-1 flex-shrink-0',{brands:false})}
        <span>
          <span class="font-semibold text-primary">${h(item.title)}:</span>
          ${h(withDynamicExperience(item.description))}
        </span>
      </li>`).join('');
  }

  // Leadership list
  const leadershipList = document.querySelector('[data-pl="leadership"]');
  if (leadershipList && d.leadership) {
    leadershipList.innerHTML = d.leadership.map(item => `
      <li class="flex items-start gap-2">
        ${renderIcon(item.title,'ri-checkbox-circle-line text-primary mt-1 flex-shrink-0',{brands:false})}
        <span>
          <span class="font-semibold text-primary">${h(item.title)}:</span>
          ${h(withDynamicExperience(item.description))}
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
      <p class="text-gray-700 mb-6 leading-relaxed text-center">${h(withDynamicExperience(job.description))}</p>
      ${job.highlights ? `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
          ${job.highlights.map(hl => `
            <div class="flex items-start gap-3 bg-gray-50 p-3 rounded-lg shadow-sm min-w-0">
              <div class="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                ${renderIcon(hl.title,`${hl.icon||'ri-checkbox-line'} text-primary`)}
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
          ${renderIcon(cat.name,`${cat.icon||'ri-tools-line'} text-2xl`,{brands:false})}
        </div>
        <h3 class="text-lg sm:text-xl font-bold text-gray-900 tracking-tight break-words leading-snug min-w-0">${h(cat.name)}</h3>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-1">
        ${(cat.skills || []).map(sk => `
          <div class="skill-mini flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.06)] hover:shadow-md hover:border-primary/25 transition-all duration-200 group min-w-0">
            <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/12 to-primary/5 text-primary ring-1 ring-primary/10 transition-colors flex-shrink-0">
              ${renderIcon(sk.title,`${sk.icon||'ri-checkbox-line'} text-xl`)}
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
  const explicit = projectCardImage(proj);
  if (explicit) return explicit;
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
    ? `<img data-project-src="${h(proj.image)}" decoding="async" width="1200" height="800" alt="${h(proj.title)}" class="project-detail-image w-full h-auto rounded" style="aspect-ratio:3/2;object-fit:contain;background:#f4f4f5">`
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
  const techsHtml = techs.map(t => `<span class="project-tool-tag px-3 py-1 bg-gray-100 text-gray-700 rounded-full">${renderIcon(t)}${h(t)}</span>`).join('');

  const overviewHtml = proj.detailOverview 
    ? String(proj.detailOverview).split('\n\n').filter(p => p.trim()).map(p => `<p class="text-gray-700 mb-4">${h(p)}</p>`).join('')
    : `<p class="text-gray-700 mb-4">${h(proj.description || '')}</p>`;

  return `
  <div id="${h(modalId)}-modal" class="modal" role="dialog" aria-modal="true" aria-label="${h(proj.title)}">
    <div class="modal-content max-w-4xl mx-auto my-12 bg-white rounded shadow-xl p-8" style="position:relative;">
      <button class="modal-close-btn close-modal" title="Close" aria-label="Close modal">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

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
    // Company artwork belongs on the card; the project image stays in its modal.
    const cardImage = getProjectCardImage(proj);
    const imgHtml = `<img
          src="${h(cardImage)}"
          alt="${h(proj.title)}" loading="lazy" decoding="async"
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
      <div class="project-tool-tags flex flex-wrap gap-1.5 mb-4 min-h-10 items-start content-start">
          ${(proj.tags || []).flatMap(tag => String(tag).split(',')).map(t => t.trim()).filter(Boolean).map(tag =>
            `<span class="inline-flex items-center whitespace-nowrap text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-medium leading-5">${renderIcon(tag)}${h(tag)}</span>`
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

  const seedProjects = getSeedPortfolioData().projects.items;
  const staticProjects = Array.from(document.querySelectorAll('.view-project-btn[data-project]'))
    .map((btn, i) => {
      const seed = seedProjects.find(project => (project.modalId || project.id) === btn.dataset.project);
      if (seed) return seed;
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

  const toneByIndex = ['award', 'performance', 'cicd', 'ai', 'mentorship', 'quality'];
  const resolveAchievementTone = (item, index) => {
    const raw = String(item.color || '').toLowerCase();
    const title = String(item.title || '').toLowerCase();
    if (raw === 'yellow' || title.includes('bug hunter') || title.includes('award')) return 'award';
    if (raw === 'blue' || title.includes('performance') || title.includes('benchmark')) return 'performance';
    if (raw === 'green' || title.includes('ci/cd') || title.includes('pipeline')) return 'cicd';
    if (raw === 'purple' || title.includes('ai')) return 'ai';
    if (raw === 'teal' || title.includes('incident') || title.includes('release')) return 'quality';
    if (raw === 'primary' || title.includes('mentor') || title.includes('team')) return 'mentorship';
    return toneByIndex[index % toneByIndex.length];
  };

  container.innerHTML = d.items.map((item, index) => `
    <div class="achievement-card section-card bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all border ${h(item.borderClass || 'border-gray-200')} relative overflow-hidden group" data-achievement-tone="${h(resolveAchievementTone(item, index))}">
      <div class="absolute top-0 right-0 w-20 h-20 ${h(item.cornerBgClass || 'bg-gray-50')} rounded-bl-3xl flex items-end justify-start p-2">
        <i class="${h(item.cornerIconClass || 'ri-star-fill text-gray-300')} text-xl"></i>
      </div>
      <div class="flex items-start gap-4 mb-4">
        <div class="w-12 h-12 ${h(item.iconBgClass || 'bg-gray-100')} rounded-xl flex items-center justify-center flex-shrink-0">
          ${renderIcon(item.title,`${item.icon||'ri-star-fill'} text-xl ${item.iconTextClass||'text-gray-600'}`,{brands:false})}
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
const CERT_GROUP_ORDER = ['google', 'anthropic', 'udemy', 'other'];

const CERT_GROUP_META = {
  google: {
    label: 'Google',
    logo: 'image/google-logo.png',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    cardBorder: 'border-blue-100',
    cardHoverBorder: 'hover:border-blue-300',
    accent: 'bg-blue-400',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    chipBg: 'bg-blue-50',
    chipText: 'text-blue-700',
    linkText: 'text-blue-500 hover:text-blue-700',
  },
  anthropic: {
    label: 'Anthropic',
    logo: 'image/anthropic-logo.svg',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    cardBorder: 'border-orange-100',
    cardHoverBorder: 'hover:border-orange-300',
    accent: 'bg-orange-400',
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-600',
    chipBg: 'bg-orange-50',
    chipText: 'text-orange-700',
    linkText: 'text-orange-500 hover:text-orange-700',
  },
  udemy: {
    label: 'Udemy',
    logo: 'image/udemy-logo.svg',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    cardBorder: 'border-purple-100',
    cardHoverBorder: 'hover:border-purple-300',
    accent: 'bg-purple-400',
    iconBg: 'bg-purple-50',
    iconText: 'text-purple-600',
    chipBg: 'bg-purple-50',
    chipText: 'text-purple-700',
    linkText: 'text-purple-500 hover:text-purple-700',
  },
  other: {
    label: 'Other Certifications',
    icon: 'ri-medal-fill',
    gradient: 'from-gray-500 to-gray-600',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    cardBorder: 'border-gray-200',
    cardHoverBorder: 'hover:border-gray-400',
    accent: 'bg-gray-400',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    chipBg: 'bg-gray-100',
    chipText: 'text-gray-600',
    linkText: 'text-gray-500 hover:text-gray-700',
  },
};

function resolveCertGroup(cert) {
  const issuer = String(cert.issuer || '').toLowerCase();
  if (issuer.includes('udemy')) return 'udemy';
  if (issuer.includes('google')) return 'google';
  if (issuer.includes('anthropic')) return 'anthropic';
  if (cert.group && CERT_GROUP_META[cert.group]) return cert.group;
  return 'other';
}

function renderCertCard(cert, meta) {
  return `
    <div class="relative flex items-start gap-3 p-4 pl-5 bg-white rounded-xl border ${meta.cardBorder} ${meta.cardHoverBorder} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden">
      <span class="absolute left-0 top-0 bottom-0 w-1 ${meta.accent} opacity-70 group-hover:opacity-100 transition-opacity"></span>
      <div class="w-10 h-10 ${meta.iconBg} rounded-lg flex items-center justify-center flex-shrink-0">
        <i class="ri-award-fill ${meta.iconText} text-lg"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 text-sm leading-snug break-words">${h(cert.title)}</p>
        <p class="text-gray-500 text-xs mt-1">${h(cert.issuer || '')}</p>
        ${cert.credentialNote ? `<p class="text-gray-400 text-xs mt-0.5">${h(cert.credentialNote)}</p>` : ''}
        ${cert.year ? `<span class="inline-block mt-2 text-[11px] font-semibold ${meta.chipBg} ${meta.chipText} px-2 py-0.5 rounded-full">${h(cert.year)}</span>` : ''}
      </div>
      ${cert.link ? `<a href="${h(cert.link)}" target="_blank" rel="noopener noreferrer" aria-label="View ${h(cert.title)} certificate" class="${meta.linkText} flex-shrink-0 mt-0.5 transition-colors">
        <i class="ri-external-link-line text-lg"></i></a>` : ''}
    </div>`;
}

function renderCertGroup(groupKey, certs) {
  const meta = CERT_GROUP_META[groupKey];
  if (!meta || !certs.length) return '';

  const sorted = [...certs].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  return `
    <div class="cert-group" data-cert-provider="${h(groupKey)}">
      <div class="flex items-center gap-3 mb-4">
        ${meta.logo ? `<h4 class="cert-provider-brand flex-1"><img class="cert-provider-logo" src="${h(meta.logo)}" alt="${h(meta.label)}" width="120" height="36" loading="lazy" decoding="async"></h4>` : `
        <div class="w-10 h-10 bg-gradient-to-br ${meta.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <i class="${meta.icon} text-white text-lg" aria-hidden="true"></i>
        </div>
        <h4 class="text-base font-bold text-gray-800 flex-1">${h(meta.label)}</h4>`}
        <span class="text-xs ${meta.badgeBg} ${meta.badgeText} px-2.5 py-1 rounded-full font-semibold">${sorted.length}</span>
      </div>
      <div class="grid sm:grid-cols-2 gap-3">${sorted.map(cert => renderCertCard(cert, meta)).join('')}</div>
    </div>`;
}

function renderEducation(d) {
  const degreeContainer = document.querySelector('[data-pl="educationDegrees"]');
  if (degreeContainer && d.degrees) {
    degreeContainer.innerHTML = d.degrees.map(deg => `
      <div class="education-degree">
        <div class="education-logo${educationLogo(deg) ? ' has-logo' : ''}">
          ${educationLogo(deg) ? `<img src="${h(educationLogo(deg))}" alt="${h(deg.institution)} logo" width="88" height="88" loading="lazy" decoding="async">` : '<i class="ri-graduation-cap-line text-2xl text-primary" aria-hidden="true"></i>'}
        </div>
        <div class="education-degree-content">
          <h3 class="text-xl font-bold text-gray-900 mb-1">${h(deg.title)}</h3>
          <p class="text-primary font-semibold mb-1">${h(deg.institution)}</p>
          <p class="text-gray-500 text-sm mb-2">${h(deg.period)}</p>
          <p class="text-gray-700 text-sm leading-relaxed">${h(deg.description)}</p>
        </div>
      </div>`).join('');
  }

  const certContainer = document.querySelector('[data-pl="educationCerts"]');
  if (certContainer && d.certifications) {
    const grouped = CERT_GROUP_ORDER.reduce((acc, key) => {
      acc[key] = [];
      return acc;
    }, {});

    d.certifications.forEach(cert => {
      grouped[resolveCertGroup(cert)].push(cert);
    });

    certContainer.innerHTML = CERT_GROUP_ORDER
      .map(key => renderCertGroup(key, grouped[key]))
      .filter(Boolean)
      .join('');
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

    socialsContainer.replaceChildren();
    for(const social of d.socials){
      if(social.isZalo||social.name==='Zalo'){
        const button=zaloBtnEl||document.createElement('button');button.type='button';button.id='zalo-btn';
        button.className='w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer';
        button.setAttribute('aria-label','Zalo QR Code');button.innerHTML=renderIcon('Zalo',`${social.icon||'ri-message-3-fill'} text-xl`);
        if(!zaloBtnEl)button.onclick=()=>window._lb?.open('image/qrzalo.jpg','Quét mã QR để kết bạn Zalo 📱','Zalo QR Code');
        socialsContainer.appendChild(button);
      }else{
        const anchor=document.createElement('a');anchor.href=social.url||'#';anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.setAttribute('aria-label',social.name||'Social');
        anchor.className='w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full text-primary hover:bg-primary hover:text-white transition-colors';anchor.innerHTML=renderIcon(social.name,`${social.icon||'ri-link-line'} text-xl`);socialsContainer.appendChild(anchor);
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
