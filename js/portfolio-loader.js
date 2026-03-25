/**
 * PORTFOLIO LOADER
 * ======================================================
 * Fetches all portfolio data from Firebase Firestore and
 * dynamically renders every section on page load.
 *
 * Sections rendered:
 *   header, summary, experience, skills, projects,
 *   achievements, education, contact
 *
 * Also enhances admin-mode.js with "Add New" buttons
 * for array-based sections when admin mode is active.
 * ======================================================
 */

import { readAllPortfolioDocs, writePortfolioDoc } from './firebase-config.js';

// ─── CACHE ───────────────────────────────────────────────────
export let portfolioData = {};

// ─── INIT ────────────────────────────────────────────────────
export async function initPortfolioLoader() {
  try {
    showLoadingOverlay();
    portfolioData = await readAllPortfolioDocs();

    if (Object.keys(portfolioData).length === 0) {
      console.warn('[Loader] No data found in Firestore. Falling back to static HTML.');
      hideLoadingOverlay();
      return;
    }

    renderAllSections(portfolioData);
    hideLoadingOverlay();
    console.log('[Loader] ✅ Portfolio rendered from Firestore.');

    // Notify admin-mode about fresh data (for Add New buttons)
    window._portfolioData = portfolioData;
    window._reloadPortfolioSection = reloadSection;
  } catch (err) {
    console.error('[Loader] ❌ Failed to load from Firestore:', err);
    hideLoadingOverlay();
  }
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
}

// Reload a single section (called after add/edit/delete)
export async function reloadSection(sectionId) {
  const { readPortfolioDoc } = await import('./firebase-config.js');
  const data = await readPortfolioDoc(sectionId);
  if (!data) return;
  portfolioData[sectionId] = data;
  window._portfolioData = portfolioData;
  renderAllSections({ [sectionId]: data });
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

  container.innerHTML = visible.map((proj, i) => `
    <div class="project-card project-card-hscroll bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100/90 hover:shadow-2xl hover:border-primary/25 transition-all duration-300 cursor-pointer flex flex-col flex-shrink-0 w-[min(92vw,380px)] min-w-[min(92vw,380px)] sm:w-[420px] sm:min-w-[420px] lg:w-[440px] lg:min-w-[440px] group"
         onclick="openProjectModal('${h(proj.modalId || proj.id || 'project'+i)}')">
      <div class="relative h-52 sm:h-56 bg-gray-100 overflow-hidden">
        ${proj.image
          ? `<img src="${h(proj.image)}" alt="${h(proj.title)}" class="w-full h-full object-cover object-top"/>`
          : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
               <i class="${h(proj.imageIcon || 'ri-code-box-line')} text-7xl text-primary/30"></i>
             </div>`}
        <div class="absolute top-4 left-4 z-10 ${h(proj.badgeColor || 'bg-primary')} text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md">${h(proj.badge || '')}</div>
      </div>
      <div class="p-6 sm:p-7 min-w-0 flex flex-col flex-1">
        <h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words leading-snug line-clamp-2">${h(proj.title)}</h3>
        <p class="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3 break-words">${h(proj.description)}</p>
        <div class="flex flex-wrap gap-1 mb-4 min-h-10">
          ${(proj.tags || []).map(tag => `<span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">${h(tag)}</span>`).join('')}
        </div>
        <button
          class="view-project-btn w-full py-2 bg-primary text-white rounded !rounded-button hover:bg-primary/90 transition-colors mt-auto"
          data-project="${h(proj.modalId || proj.id || 'project'+i)}">
          View Details
        </button>
      </div>
    </div>`).join('');
}

// ─── ACHIEVEMENTS ────────────────────────────────────────────
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
      <div class="flex items-center gap-4 p-4 bg-white rounded-xl border border-${h(cert.color || 'primary')}/20 hover:border-${h(cert.color || 'primary')}/50 hover:shadow-md transition-all group">
        <div class="w-10 h-10 bg-${h(cert.color || 'primary')}/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-${h(cert.color || 'primary')}/20 transition-colors">
          <i class="ri-award-line text-${h(cert.color || 'primary')} text-xl"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 text-sm truncate">${h(cert.title)}</p>
          <p class="text-gray-500 text-xs">${h(cert.issuer)} · ${h(cert.year || '')}</p>
        </div>
        ${cert.link ? `<a href="${h(cert.link)}" target="_blank" rel="noopener" class="text-${h(cert.color || 'primary')} hover:text-primary/70 flex-shrink-0">
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

// ─── ADD NEW FEATURE ─────────────────────────────────────────
// Called by admin-mode.js when admin mode is activated
export function setupAddNewButtons() {
  const ADD_NEW_SECTIONS = [
    { section: 'experience',   arrayKey: 'jobs',          label: 'Add Job' },
    { section: 'skills',       arrayKey: 'categories',    label: 'Add Category' },
    { section: 'projects',     arrayKey: 'items',         label: 'Add Project' },
    { section: 'achievements', arrayKey: 'items',         label: 'Add Achievement' },
    { section: 'education',    arrayKey: 'certifications',label: 'Add Certification' },
  ];

  ADD_NEW_SECTIONS.forEach(({ section, arrayKey, label }) => {
    const sectionEl = document.querySelector(`#${section}`);
    if (!sectionEl) return;

    // Avoid duplicates
    if (sectionEl.querySelector('.am-add-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'am-add-btn';
    btn.innerHTML = `➕ ${label}`;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openAddNewModal(section, arrayKey, label);
    });
    sectionEl.appendChild(btn);
  });
}

export function removeAddNewButtons() {
  document.querySelectorAll('.am-add-btn').forEach(btn => btn.remove());
}

// ─── ADD NEW MODAL ───────────────────────────────────────────
function openAddNewModal(section, arrayKey, label) {
  const overlay = document.getElementById('admin-edit-overlay');
  const titleEl = document.getElementById('admin-edit-title');
  const body    = document.getElementById('admin-edit-body');
  const saveBtn = document.getElementById('admin-edit-save');

  titleEl.textContent = `➕ Add New: ${label}`;
  body.innerHTML = renderNewItemForm(section, arrayKey);
  overlay.classList.add('am-visible');

  saveBtn.onclick = () => saveNewItem(section, arrayKey);
}

function renderNewItemForm(section, arrayKey) {
  switch (section) {
    case 'experience': return `
      <div class="am-form-group"><label>Company Name</label><input class="am-input" data-new="company" placeholder="E.g: Google"></div>
      <div class="am-form-group"><label>Role / Position</label><input class="am-input" data-new="role" placeholder="E.g: QA Engineer"></div>
      <div class="am-form-group"><label>Badge</label><input class="am-input" data-new="badge" placeholder="E.g: Senior QA"></div>
      <div class="am-form-group"><label>Period</label><input class="am-input" data-new="period" placeholder="E.g: Jan 2024 - Present"></div>
      <div class="am-form-group"><label>Job Description</label><textarea class="am-textarea" data-new="description" rows="4" placeholder="Describe role & responsibilities..."></textarea></div>
    `;
    case 'skills': return `
      <div class="am-form-group"><label>Category Name</label><input class="am-input" data-new="name" placeholder="E.g: Cloud Testing"></div>
      <div class="am-form-group"><label>Icon (remix icon class)</label><input class="am-input" data-new="icon" placeholder="E.g: ri-cloud-line" value="ri-tools-line"></div>
      <p class="text-xs text-gray-500 mb-3">Add skills to the category after creating via Edit.</p>
    `;
    case 'projects': return `
      <div class="am-form-group"><label>Project Name</label><input class="am-input" data-new="title" placeholder="E.g: My New Project"></div>
      <div class="am-form-group"><label>Badge</label><input class="am-input" data-new="badge" placeholder="E.g: FinTech"></div>
      <div class="am-form-group"><label>Badge Color (Tailwind class)</label><input class="am-input" data-new="badgeColor" value="bg-primary" placeholder="bg-primary / bg-yellow-500"></div>
      <div class="am-form-group"><label>Description</label><textarea class="am-textarea" data-new="description" rows="3" placeholder="Brief project description..."></textarea></div>
      <div class="am-form-group"><label>Tags (comma-separated)</label><input class="am-input am-tags-input" data-new="tags" placeholder="E.g: Postman, Jira, API"></div>
      <div class="am-form-group"><label>Modal ID (unique, no spaces)</label><input class="am-input" data-new="modalId" placeholder="E.g: projectNew1"></div>
    `;
    case 'achievements': return `
      <div class="am-form-group"><label>Title</label><input class="am-input" data-new="title" placeholder="E.g: Best QA Award"></div>
      <div class="am-form-group"><label>Subtitle</label><input class="am-input" data-new="subtitle" placeholder="E.g: Annual Recognition"></div>
      <div class="am-form-group"><label>Description</label><textarea class="am-textarea" data-new="description" rows="3" placeholder="Achievement description..."></textarea></div>
      <div class="am-form-group"><label>Icon (remix icon class)</label><input class="am-input" data-new="icon" value="ri-star-fill" placeholder="ri-star-fill"></div>
      <div class="am-form-group"><label>Theme Color</label>
        <select class="am-input" data-new="color">
          <option value="yellow">yellow</option>
          <option value="blue">blue</option>
          <option value="green">green</option>
          <option value="purple">purple</option>
          <option value="teal">teal</option>
          <option value="primary">primary</option>
        </select>
      </div>
    `;
    case 'education': return `
      <div class="am-form-group"><label>Certification Name</label><input class="am-input" data-new="title" placeholder="E.g: AWS Certified"></div>
      <div class="am-form-group"><label>Issuer</label><input class="am-input" data-new="issuer" placeholder="E.g: Amazon"></div>
      <div class="am-form-group"><label>Year</label><input class="am-input" data-new="year" placeholder="E.g: 2025"></div>
      <div class="am-form-group"><label>Certification Link (leave empty if none)</label><input class="am-input" data-new="link" placeholder="https://..."></div>
      <div class="am-form-group"><label>Color</label>
        <select class="am-input" data-new="color">
          <option value="primary">primary (blue)</option>
          <option value="orange">orange</option>
          <option value="green">green</option>
        </select>
      </div>
    `;
    default: return '<p class="text-gray-500">Adding new items is not supported for this section.</p>';
  }
}

async function saveNewItem(section, arrayKey) {
  const body    = document.getElementById('admin-edit-body');
  const saveBtn = document.getElementById('admin-edit-save');
  const spinner = document.getElementById('admin-save-spinner');

  saveBtn.disabled = true;
  spinner?.classList.remove('am-hidden');

  // Collect new item fields
  const newItem = {};
  body.querySelectorAll('[data-new]').forEach(el => {
    const key = el.dataset.new;
    let val = el.value.trim();
    if (el.classList.contains('am-tags-input')) {
      val = val.split(',').map(t => t.trim()).filter(Boolean);
    }
    newItem[key] = val;
  });

  // Build color classes for achievements
  if (section === 'achievements' && newItem.color) {
    const c = newItem.color;
    const colorMap = {
      yellow: { borderClass:'border-yellow-200', iconBgClass:'bg-yellow-100', iconTextClass:'text-yellow-600', subtitleClass:'text-yellow-600', cornerBgClass:'bg-yellow-50', cornerIconClass:'ri-trophy-fill text-yellow-400' },
      blue:   { borderClass:'border-blue-200',   iconBgClass:'bg-blue-100',   iconTextClass:'text-blue-600',   subtitleClass:'text-blue-600',   cornerBgClass:'bg-blue-50',   cornerIconClass:'ri-star-fill text-blue-400' },
      green:  { borderClass:'border-green-200',  iconBgClass:'bg-green-100',  iconTextClass:'text-green-600',  subtitleClass:'text-green-600',  cornerBgClass:'bg-green-50',  cornerIconClass:'ri-leaf-fill text-green-400' },
      purple: { borderClass:'border-purple-200', iconBgClass:'bg-purple-100', iconTextClass:'text-purple-600', subtitleClass:'text-purple-600', cornerBgClass:'bg-purple-50', cornerIconClass:'ri-sparkling-2-fill text-purple-400' },
      teal:   { borderClass:'border-teal-200',   iconBgClass:'bg-teal-100',   iconTextClass:'text-teal-600',   subtitleClass:'text-teal-600',   cornerBgClass:'bg-teal-50',   cornerIconClass:'ri-shield-check-fill text-teal-400' },
      primary:{ borderClass:'border-primary/20', iconBgClass:'bg-primary/10', iconTextClass:'text-primary',    subtitleClass:'text-primary',    cornerBgClass:'bg-primary/5', cornerIconClass:'ri-team-fill text-primary/40' },
    };
    Object.assign(newItem, colorMap[c] || colorMap.primary);
  }

  // For skills new category, add empty skills array
  if (section === 'skills') {
    newItem.skills = [];
  }

  try {
    // Fetch latest data
    const { readPortfolioDoc } = await import('./firebase-config.js');
    const latest = await readPortfolioDoc(section);
    if (!latest) throw new Error('Data could not be loaded');

    if (!Array.isArray(latest[arrayKey])) latest[arrayKey] = [];
    if (section === 'projects') {
      newItem.status = 'active';
    }
    latest[arrayKey].push(newItem);

    await writePortfolioDoc(section, latest);
    portfolioData[section] = latest;
    window._portfolioData = latest;

    renderAllSections({ [section]: latest });

    // Show success toast via admin-mode
    if (window._adminShowToast) window._adminShowToast('✅ Successfully added new item!', 'success');

    document.getElementById('admin-edit-overlay').classList.remove('am-visible');
  } catch (err) {
    if (window._adminShowToast) window._adminShowToast('❌ Error: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    spinner?.classList.add('am-hidden');
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

window.openProjectModal = function(projectId) {
  const modal = document.getElementById(projectId + '-modal');
  if (modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  } else {
    console.warn('Project Modal not found:', projectId);
  }
};
