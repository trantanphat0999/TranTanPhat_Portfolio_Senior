/** CV EXPORT MODULE - ATS PDF format matching TranTanPhat_QualityAssurance.pdf */
let _cvData = null;

async function _load() {
  if (_cvData) return _cvData;
  const api = await import('../firebase-config.js');
  const keys = ['header', 'summary', 'experience', 'skills', 'projects', 'education', 'contact'];
  const vals = await Promise.all(keys.map((k) => api.readPortfolioDoc(k).catch(() => ({}))));
  _cvData = {};
  keys.forEach((k, i) => (_cvData[k] = vals[i] || {}));
  return _cvData;
}

function _e(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _plain(s) {
  return _e(String(s || '').replace(/\s+/g, ' ').trim());
}

function _listFromText(text, max = 12) {
  return String(text || '')
    .split(/\n|(?<=\.)\s+(?=[A-Z])/)
    .map((line) => line.replace(new RegExp(`^[\\s\\-*${String.fromCharCode(8226)}]+`), '').trim())
    .filter(Boolean)
    .slice(0, max);
}

function _splitBlocks(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function _dateSortValue(period) {
  const s = String(period || '').toLowerCase();
  if (s.includes('present')) return 999999;
  const m = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*(20\d{2})/g);
  if (!m) return 0;
  const last = m[m.length - 1].match(/(20\d{2})/);
  return last ? Number(last[1]) : 0;
}

function _socialUrl(contact, name, fallback) {
  const socials = contact.socials || [];
  return (socials.find((s) => new RegExp(name, 'i').test(s.name || '')) || {}).url || fallback || '';
}

function _skillName(skill) {
  return skill.title || skill.name || skill;
}

function _skillDesc(skill) {
  return skill.desc || skill.description || '';
}

function _displayUrl(url) {
  return String(url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function _keywordText(text, max = 12) {
  return String(text || '')
    .split(/,|\n|;|\. /)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, max)
    .join(', ');
}

function _renderSection(title, body) {
  if (!body) return '';
  return `<section class="cv-section"><h2>${_e(title)}</h2>${body}</section>`;
}

function _renderBullets(items) {
  const lis = (items || []).filter(Boolean).map((item) => `<li>${_plain(item)}</li>`).join('');
  return lis ? `<ul>${lis}</ul>` : '';
}

function _loadScript(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (existing.dataset.loaded === 'true') resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function _ensureJsPDF() {
  if (window.jspdf?.jsPDF || window.jsPDF) return window.jspdf?.jsPDF || window.jsPDF;
  await _loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'am-jspdf-cdn');
  const JsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!JsPDF) throw new Error('jsPDF could not be initialized.');
  return JsPDF;
}

function _cvModel(d) {
  const h = d.header || {};
  const s = d.summary || {};
  const c = d.contact || {};
  const name = h.name || 'Tran Tan Phat';
  const role = h.title || h.role || 'Senior Quality Assurance Engineer';
  const email = c.email || h.email || 'trantanphat190999@gmail.com';
  const phone = c.phone || h.phone || '0971817167';
  const location = c.location || h.location || 'Ho Chi Minh City, Vietnam';
  const linkedin = _socialUrl(c, 'linkedin', h.linkedin || 'linkedin.com/in/tran-tan-phat-52631b261');
  const github = _socialUrl(c, 'github', h.github || '');
  const summary =
    'Senior QA Engineer with 4+ years of experience building API automation, performance testing, security testing, and release validation practices for business-critical systems. Strongest value: turning manual, repetitive QA work into reliable automation, reducing regression time, improving production confidence, and mentoring QA members to work with clearer strategy and stronger ownership. Career direction: grow into a QA Lead / Quality Engineering Lead role focused on scalable automation, AI-assisted QA, CI/CD quality gates, and cross-team quality culture.';

  return {
    name,
    role,
    contactsTop: [location, email, phone].filter(Boolean),
    contactsBottom: [linkedin ? _displayUrl(linkedin) : '', github ? _displayUrl(github) : ''].filter(Boolean),
    contacts: [location, email, phone, linkedin ? _displayUrl(linkedin) : '', github ? _displayUrl(github) : ''].filter(Boolean),
    summary,
    achievements: [
      '80% API automation coverage across microservice-based systems',
      'Regression cycle reduced from 3 days to 6 hours',
      '60%+ validation time reduction for PDF/Excel and API workflows',
      '9+ successful production releases with strong deployment validation',
      '40% productivity improvement through AI-assisted QA workflows',
    ],
    skills: [
      ['Testing', 'Functional, Regression, Smoke, Sanity, E2E, Exploratory, UAT'],
      ['API Automation', 'Postman, Newman, REST API, Microservices, JavaScript Assertions'],
      ['Performance', 'JMeter, Load Test, Stress Test, Benchmark, Bottleneck Analysis'],
      ['Security', 'OWASP ZAP, XSS, SQL Injection, Authentication / Authorization Checks'],
      ['CI/CD & Tools', 'GitHub Actions, Windows Scheduler, Jira, Git, Chrome DevTools, Docker'],
      ['Data & Backend', 'SQL Server, Data Validation, Large Dataset Processing, PDF/Excel Inputs'],
      ['Process', 'Test Strategy, Test Plan, Defect Triage, Release QA, Deployment Validation'],
      ['AI & Leadership', 'ChatGPT, Claude, Gemini, Grok, Prompt Engineering, QA Mentorship'],
    ],
    education: (d.education.degrees || []).map((deg) => ({
      title: deg.title || '',
      institution: deg.institution || '',
      period: deg.period || '',
      description: deg.description || '',
    })),
    jobs: (d.experience.jobs || [])
      .slice()
      .sort((a, b) => _dateSortValue(b.period) - _dateSortValue(a.period))
      .map((job) => {
        const isSenior = /silicon/i.test(job.company || '') || /senior|quality assurance engineer/i.test(job.role || job.badge || '');
        const highlights = (job.highlights || job.items || []).map((x) => `${x.title}: ${x.desc}`);
        const bullets = isSenior
          ? [
              'API Automation: Postman, Newman, GitHub Actions, 50+ microservices, 80% automation coverage',
              'Regression Optimization: reduced cycle from 3 days to 6 hours through automated suites',
              'Performance Engineering: JMeter load/stress testing, benchmark validation, 200K+ records processing',
              'Security Testing: OWASP ZAP, vulnerability detection, risk tracking, pre-release validation',
              'Release QA: smoke testing, deployment checklist, UAT/Production support, zero critical release issues',
              'Leadership: mentored 5 QA members on API automation, AI workflows, estimation, and QA standards',
            ]
          : ['Foundation: test case design, manual execution, Jira bug reporting, Agile daily stand-ups'];
        return {
          role: job.role || job.badge || '',
          company: job.company || '',
          period: job.period || '',
          location: job.location || 'Ho Chi Minh City, Vietnam - On-site',
          bullets: bullets.length ? bullets : highlights.slice(0, 3),
        };
      }),
    languages: ['English'],
    certifications: (d.education.certifications || []).map((cert) => ({
      title: cert.title || '',
      issuer: [cert.credentialNote, cert.issuer].filter(Boolean).join(' by '),
      year: cert.year || '',
    })),
    projects: [
      {
        title: 'CRM System',
        period: 'Silicon Stack | 2025',
        purpose: 'Automotive CRM for post-sale customer data, service reminders, marketing campaigns, and customer activity tracking.',
        tech: 'OWASP ZAP, JMeter, Selenium, Docker, Postman, Jira.',
        impact: 'Led security checks, load testing, API/UI validation, and release smoke tests to reduce launch risk.',
      },
      {
        title: 'Promotion Claim Automation',
        period: 'Kraft Heinz | 2024',
        purpose: 'Automates invoice extraction from PDF/Excel, validates business calculations, and syncs claim data to Kraft Heinz systems.',
        tech: 'Postman, JavaScript, SQL Server, PDF/Excel parsers, Jira, Chrome DevTools.',
        impact: 'Built API regression coverage, validated complex file formats, reduced validation time by 60%+, and supported 9 production releases.',
      },
      {
        title: 'Stuck Claim',
        period: 'Kraft Heinz | 2024',
        purpose: 'High-volume claim processing for AU/NZ markets, matching promo and claim lines across 100K+ daily records.',
        tech: 'Postman, SQL Server, Excel, Jira, Agile/Scrum.',
        impact: 'Owned E2E test coverage, data validation, performance checks, client clarification, sprint demo support, and release QA.',
      },
      {
        title: 'Time Keeper',
        period: 'Silicon Stack | 2022 - 2023',
        purpose: 'Internal time tracking platform for work logs, approvals, dashboards, reports, and Jira task integration.',
        tech: 'Jira, SQL, Chrome DevTools, Excel, Agile/Scrum.',
        impact: 'Designed test cases, executed functional/UAT testing, tracked defects, prepared daily reports, and supported successful launch.',
      },
      {
        title: 'Communication Hub',
        period: 'Silicon Stack | 2025',
        purpose: 'AI-driven communication platform for chatbot support, booking flows, workflow automation, and customer interaction analytics.',
        tech: 'n8n, AI chatbot, Postman, Jira, ChatGPT, Claude, Chrome DevTools.',
        impact: 'Created chatbot flow tests, API checks for n8n workflows, AI-assisted scenarios, defect tracking, and demo readiness validation.',
      },
    ],
  };
}

function _cvHTML(d) {
  const m = _cvModel(d);

  const education = m.education
    .map(
      (deg) => `<div class="cv-row">
        <div>
          <div class="cv-title">${_plain(deg.title)}</div>
          <div>${_plain(deg.institution)}</div>
          ${deg.description ? `<div class="cv-sub">Major: ${_plain(deg.description)}</div>` : ''}
        </div>
        <div class="cv-date">${_plain(deg.period)}</div>
      </div>`
    )
    .join('');

  const jobs = m.jobs
    .map((job) => {
      return `<div class="cv-item">
        <div class="cv-row tight">
          <div>
            <div class="cv-title">${_plain(job.role || job.badge)}</div>
            <div class="cv-title small">${_plain(job.company)}</div>
          </div>
          <div class="cv-date">${_plain(job.period)}</div>
        </div>
        <div class="cv-location">${_plain(job.location || 'Ho Chi Minh City, Vietnam - On-site')}</div>
        <div class="cv-label">SOFTWARE TESTING EXPERIENCE</div>
        ${_renderBullets(job.bullets)}
      </div>`;
    })
    .join('');

  const skillRows = m.skills
    .map(([key, value]) => `<div class="cv-skill"><strong>${_plain(key)}:</strong> ${_plain(value)}</div>`)
    .join('');

  const achievements = _renderBullets(m.achievements);

  const certifications = m.certifications
    .map((cert) => {
      return `<div class="cv-row cert">
        <div>${_plain(cert.title)}${cert.issuer ? ` by ${_plain(cert.issuer)}` : ''}</div>
        <div class="cv-date">${_plain(cert.year)}</div>
      </div>`;
    })
    .join('');

  const projects = m.projects
    .map((p) => {
      return `<div class="cv-project">
        <div class="cv-row tight">
          <div class="cv-title">${_plain(p.title)}</div>
          <div class="cv-date">${_plain(p.period)}</div>
        </div>
        <p><strong>Purpose:</strong> ${_plain(p.purpose)}</p>
        <p><strong>Tech:</strong> ${_plain(p.tech)}</p>
        <p><strong>My impact:</strong> ${_plain(p.impact)}</p>
      </div>`;
    })
    .join('');

  return `<div class="cv-page">
    <style>
      .cv-page{width:210mm;min-height:297mm;background:#fff;color:#202a36;font-family:Arial,'Helvetica Neue',sans-serif;font-size:10.2pt;line-height:1.32;padding:10mm 11mm 12mm;box-sizing:border-box;}
      .cv-page *{box-sizing:border-box;}
      .cv-header{text-align:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1.4px solid #202a36;}
      .cv-header h1{font-size:18pt;line-height:1.05;margin:0 0 1px;font-weight:800;color:#202a36;}
      .cv-role{font-size:9.4pt;font-weight:800;color:#202a36;margin-bottom:4px;}
      .cv-contact{display:block;font-size:7.8pt;color:#5f6b7a;line-height:1.35;max-width:176mm;margin:0 auto;}
      .cv-contact-line{display:flex;justify-content:center;gap:0 8px;}
      .cv-contact span{white-space:nowrap;}
      .cv-contact-line span:not(:last-child)::after{content:"|";margin-left:8px;color:#9aa4b2;}
      .cv-contact a{color:#5f6b7a;text-decoration:none;}
      .cv-summary{margin:7px 0 8px;text-align:left;}
      .cv-section{break-inside:auto;margin-top:8px;}
      .cv-section h2{font-size:10.6pt;line-height:1.2;margin:0 0 5px;padding-bottom:3px;border-bottom:1.2px solid #202a36;color:#202a36;font-weight:800;text-transform:uppercase;letter-spacing:0;}
      .cv-row{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin:0 0 4px;}
      .cv-row.tight{margin-bottom:1px;}
      .cv-title{font-weight:800;color:#202a36;}
      .cv-title.small{font-size:10.2pt;margin-top:2px;}
      .cv-date{font-weight:800;white-space:nowrap;text-align:right;color:#202a36;}
      .cv-location{text-align:right;font-weight:800;margin-top:-2px;margin-bottom:2px;color:#5f6b7a;font-size:9.4pt;}
      .cv-sub{margin-left:12px;margin-top:4px;}
      .cv-label{font-weight:800;margin-top:5px;text-transform:uppercase;}
      .cv-item,.cv-project{break-inside:avoid;margin-bottom:7px;}
      p{margin:0 0 5px;}
      ul{margin:2px 0 5px 18px;padding:0;}
      li{margin:0 0 2px;padding-left:2px;}
      strong{font-weight:800;color:#202a36;}
      .cv-skill{margin:0 0 3px;}
      .cv-skill strong{display:inline;font-weight:800;}
      .cv-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;}
      .cert{break-inside:avoid;margin-bottom:4px;}
      .cert>div:first-child{flex:1;min-width:0;}
      @media print{.cv-page{width:210mm;min-height:297mm;padding:10mm 10.5mm 12mm;}.cv-section,.cv-item,.cv-project{break-inside:avoid;}}
    </style>
    <header class="cv-header">
      <h1>${_plain(m.name)}</h1>
      <div class="cv-role">${_plain(m.role)}</div>
      <div class="cv-contact">
        <div class="cv-contact-line">${m.contactsTop.map((item) => `<span>${_plain(item)}</span>`).join('')}</div>
        <div class="cv-contact-line">${m.contactsBottom.map((item) => `<span>${_plain(item)}</span>`).join('')}</div>
      </div>
    </header>
    <p class="cv-summary">${_plain(m.summary)}</p>
    ${_renderSection('Technical Skills', `<div class="cv-grid">${skillRows}</div>`)}
    ${_renderSection('Work Experience', jobs)}
    ${_renderSection('Selected Achievements', achievements)}
    ${_renderSection('Projects', projects)}
    ${_renderSection('Education', education)}
    ${_renderSection('Certifications', certifications)}
  </div>`;
}

window.openCVExportModal = async function () {
  _cvData = null;
  if (document.getElementById('am-cv-overlay')) return;
  _injectModalStyles();
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="am-cv-overlay" class="am-overlay am-visible">
      <div class="am-cv-modal">
        <div class="am-edit-header">
          <h2 class="am-edit-title">Export CV - Tran Tan Phat</h2>
          <button class="am-close-btn" onclick="document.getElementById('am-cv-overlay').remove()">x</button>
        </div>
        <div class="am-cv-body">
          <div id="am-cv-left">
            <div id="am-cv-frame"><div class="am-cv-loading">Loading...</div></div>
          </div>
          <div class="am-cv-tools">
            <div class="am-cv-tools-head">
              <div class="am-cv-tools-title">AI Assistant</div>
              <div class="am-cv-tools-sub">Review or optimize your CV before exporting.</div>
            </div>
            <div class="am-cv-tools-content">
              <button id="am-cv-rev-btn" onclick="window._cvReview()">AI Review CV</button>
              <button id="am-cv-opt-btn" onclick="window._cvOptimize()">AI Optimize CV</button>
              <div id="am-cv-ai-out"></div>
            </div>
            <div class="am-cv-tools-foot">
              <button id="am-cv-dl" onclick="window._cvDownload()">Download PDF</button>
              <button class="am-cv-close" onclick="document.getElementById('am-cv-overlay').remove()">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>`
  );

  try {
    const d = await _load();
    document.getElementById('am-cv-frame').innerHTML = _cvHTML(d);
  } catch (e) {
    document.getElementById('am-cv-frame').innerHTML = `<div style="padding:2rem;color:red;">${_e(e.message)}</div>`;
  }
};

window._cvDownload = async function () {
  const btn = document.getElementById('am-cv-dl');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  try {
    const JsPDF = await _ensureJsPDF();
    const d = await _load();
    _downloadCvWithJsPdf(JsPDF, _cvModel(d));
    window._adminShowToast('CV exported successfully!', 'success');
  } catch (err) {
    window._adminShowToast('Export failed: ' + err.message, 'error');
    console.error('[CV Export]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download PDF';
  }
};

function _downloadCvWithJsPdf(JsPDF, m) {
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = 210;
  const pageH = 297;
  const marginX = 11;
  const marginTop = 10;
  const marginBottom = 11;
  const contentW = pageW - marginX * 2;
  const rightX = pageW - marginX;
  const color = [32, 42, 54];
  const muted = [95, 107, 122];
  let y = marginTop;

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const lineH = (size, factor = 1.34) => size * 0.3528 * factor;
  const setFont = (size, style = 'normal', c = color) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(c[0], c[1], c[2]);
  };
  const ensure = (height = 8) => {
    if (y + height <= pageH - marginBottom) return;
    doc.addPage();
    y = marginTop;
  };
  const textWidth = (text, size, style = 'normal') => {
    setFont(size, style);
    return doc.getTextWidth(clean(text));
  };
  const wrap = (text, width, size = 10.5, style = 'normal') => {
    setFont(size, style);
    return doc.splitTextToSize(clean(text), width);
  };
  const drawCenteredLines = (lines, size, style = 'normal', c = color, gap = 1) => {
    setFont(size, style, c);
    const h = lineH(size);
    lines.forEach((line) => {
      ensure(h);
      doc.text(line, pageW / 2, y, { align: 'center' });
      y += h + gap;
    });
  };
  const drawParagraph = (text, opts = {}) => {
    const size = opts.size || 10.5;
    const style = opts.style || 'normal';
    const indent = opts.indent || 0;
    const maxW = opts.width || contentW - indent;
    const lines = wrap(text, maxW, size, style);
    const h = lineH(size);
    ensure(lines.length * h);
    setFont(size, style, opts.color || color);
    doc.text(lines, marginX + indent, y);
    y += lines.length * h + (opts.after ?? 1);
  };
  const drawSection = (title) => {
    y += 2;
    ensure(8);
    setFont(10.6, 'bold');
    doc.text(String(title || '').toUpperCase(), marginX, y);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.32);
    doc.line(marginX, y + 1.7, rightX, y + 1.7);
    y += 5.2;
  };
  const drawBullets = (items, indent = 4) => {
    const bullet = String.fromCharCode(8226);
    (items || []).filter(Boolean).forEach((item) => {
      const size = 10;
      const bulletW = 4;
      const lines = wrap(clean(item), contentW - indent - bulletW, size);
      const h = lineH(size, 1.28);
      ensure(lines.length * h);
      setFont(size);
      doc.text(bullet, marginX + indent, y);
      doc.text(lines, marginX + indent + bulletW, y);
      y += lines.length * h + 0.4;
    });
    y += 1;
  };
  const drawLabel = (label) => {
    ensure(5);
    setFont(10.2, 'bold');
    doc.text(String(label || '').toUpperCase(), marginX + 3, y);
    y += lineH(10.2, 1.15);
  };
  const drawSkill = (keyword, description) => {
    const size = 9.8;
    const key = `${clean(keyword)}:`;
    const desc = clean(description);
    const keyW = textWidth(key + ' ', size, 'bold');
    const descLines = desc ? wrap(desc, contentW - keyW, size) : [''];
    const h = lineH(size, 1.22);
    ensure(descLines.length * h);
    setFont(size, 'bold');
    doc.text(key, marginX, y);
    if (desc) {
      setFont(size);
      doc.text(descLines, marginX + keyW, y);
    }
    y += descLines.length * h + 0.6;
  };
  const drawTwoColumnKeywords = (rows) => {
    const colGap = 8;
    const colW = (contentW - colGap) / 2;
    const startX = marginX;
    let leftY = y;
    let rightY = y;
    (rows || []).forEach(([key, value], index) => {
      const x = index % 2 === 0 ? startX : startX + colW + colGap;
      const oldY = y;
      y = index % 2 === 0 ? leftY : rightY;
      const keyText = `${clean(key)}:`;
      const size = 9.7;
      const keyW = textWidth(keyText + ' ', size, 'bold');
      const lines = wrap(value, colW - keyW, size);
      const h = lineH(size, 1.22);
      ensure(lines.length * h);
      setFont(size, 'bold');
      doc.text(keyText, x, y);
      setFont(size);
      doc.text(lines, x + keyW, y);
      y += lines.length * h + 0.8;
      if (index % 2 === 0) leftY = y;
      else rightY = y;
      y = oldY;
    });
    y = Math.max(leftY, rightY) + 1;
  };
  const drawChips = (items) => {
    const size = 8.8;
    const padX = 2.2;
    const gap = 2.2;
    const h = 5.2;
    let x = marginX + 2;
    ensure(h);
    (items || []).filter(Boolean).forEach((item) => {
      const label = clean(item);
      const w = textWidth(label, size, 'bold') + padX * 2;
      if (x + w > rightX) {
        x = marginX + 2;
        y += h;
        ensure(h);
      }
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x, y - 3.4, w, 4.4, 0.8, 0.8);
      setFont(size, 'bold');
      doc.text(label, x + padX, y);
      x += w + gap;
    });
    y += h;
  };
  const drawRowTitle = (left, right, size = 10.5) => {
    const rightText = clean(right);
    const rightW = rightText ? textWidth(rightText, size, 'bold') + 8 : 0;
    const leftLines = wrap(left, contentW - rightW - 2, size, 'bold');
    const h = lineH(size, 1.08);
    ensure(leftLines.length * h);
    setFont(size, 'bold');
    doc.text(leftLines, marginX + 2, y);
    if (rightText) doc.text(rightText, rightX, y, { align: 'right' });
    y += leftLines.length * h;
  };
  const drawRowText = (left, right, size = 10) => {
    const rightText = clean(right);
    const rightW = rightText ? textWidth(rightText, size, 'normal') + 8 : 0;
    const leftLines = wrap(left, contentW - rightW - 2, size);
    const h = lineH(size, 1.08);
    ensure(leftLines.length * h);
    setFont(size);
    doc.text(leftLines, marginX + 2, y);
    if (rightText) doc.text(rightText, rightX, y, { align: 'right' });
    y += leftLines.length * h;
  };
  const drawLabeledText = (label, text) => {
    const size = 9.8;
    const prefix = `${label}:`;
    const prefixW = textWidth(prefix + ' ', size, 'bold');
    const lines = wrap(text, contentW - 5 - prefixW, size);
    const h = lineH(size, 1.24);
    ensure(lines.length * h);
    setFont(size, 'bold');
    doc.text(prefix, marginX + 3, y);
    setFont(size);
    doc.text(lines, marginX + 3 + prefixW, y);
    y += lines.length * h + 0.5;
  };

  setFont(18, 'bold');
  doc.text(clean(m.name), pageW / 2, y, { align: 'center' });
  y += lineH(18, 1.02);
  drawCenteredLines([clean(m.role)], 9.4, 'bold', color, 0);
  drawCenteredLines([m.contactsTop.join(' | ')], 7.8, 'normal', muted, 0);
  drawCenteredLines([m.contactsBottom.join(' | ')], 7.8, 'normal', muted, 0);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.35);
  doc.line(marginX, y + 1, rightX, y + 1);
  y += 5.5;

  drawParagraph(m.summary, { size: 10.2, after: 2 });

  drawSection('Technical Skills');
  drawTwoColumnKeywords(m.skills);

  drawSection('Work Experience');
  m.jobs.forEach((job) => {
    drawRowTitle(job.role, job.period);
    drawRowTitle(job.company, job.location, 10.2);
    drawLabel('Software Testing Experience');
    drawBullets(job.bullets);
  });

  drawSection('Selected Achievements');
  drawBullets(m.achievements);

  drawSection('Projects');
  m.projects.forEach((project) => {
    drawRowTitle(project.title, project.period, 10.2);
    drawLabeledText('Purpose', project.purpose);
    drawLabeledText('Tech', project.tech);
    drawLabeledText('My impact', project.impact);
    y += 1.2;
  });

  drawSection('Education');
  m.education.forEach((edu) => {
    drawRowTitle(edu.title, edu.period);
    drawParagraph(edu.institution, { size: 10.1, indent: 2, after: 0 });
    if (edu.description) drawParagraph(`Major: ${edu.description}`, { size: 9.9, indent: 5, after: 2 });
  });

  drawSection('Certifications');
  m.certifications.forEach((cert) => {
    const left = `${cert.title}${cert.issuer ? ` by ${cert.issuer}` : ''}`;
    drawRowText(left, cert.year, 10);
  });

  doc.save(`CV_TranTanPhat_SeniorQA_${new Date().toISOString().slice(0, 10)}.pdf`);
}

window._cvReview = async function () {
  const btn = document.getElementById('am-cv-rev-btn');
  const out = document.getElementById('am-cv-ai-out');
  btn.disabled = true;
  btn.textContent = 'Reviewing...';
  out.innerHTML = '';
  try {
    const api = await import('../firebase-config.js');
    const cfg = await api.readPortfolioDoc('ai-config');
    if (!cfg || cfg.connectionStatus !== 'success') throw new Error('AI not configured. Set up in Config panel.');
    const txt = (document.getElementById('am-cv-frame') || {}).innerText || '';
    const prompt = `You are a senior IT recruiter. Review this Senior QA Engineer CV.
Return ONLY valid JSON (no markdown code blocks):
{"score":<0-100>,"summary":"<2 sentences>","items":[{"type":"good|warn|fix","text":"<feedback>"}]}
Provide 8-12 items. Be specific and actionable in English.
CV:\n---\n${txt.substring(0, 5000)}\n---`;
    const r = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${atob(cfg.apiKey)}` },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.3, stream: false }),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    let js = await r.text();
    try {
      js = JSON.parse(js).choices[0].message.content;
    } catch (e) {}
    const m = js.match(/```(?:json)?\s*([\s\S]*?)```/) || js.match(/(\{[\s\S]*\})/);
    const p = JSON.parse(m ? m[1] || m[0] : js);
    const sc = parseInt(p.score) || 0;
    const cl = sc >= 75 ? '#22c55e' : sc >= 50 ? '#f59e0b' : '#ef4444';
    const rows = (p.items || [])
      .map((it) => {
        const tc = it.type === 'good' ? '#22c55e' : it.type === 'warn' ? '#f59e0b' : '#ef4444';
        const tl = it.type === 'good' ? 'GOOD' : it.type === 'warn' ? 'IMPROVE' : 'FIX';
        return `<div class="am-cv-review-row"><span style="background:${tc}22;color:${tc};">${tl}</span><p>${_e(it.text)}</p></div>`;
      })
      .join('');
    out.innerHTML = `<div class="am-cv-review"><div style="color:${cl};" class="am-cv-score">${sc}/100</div><div class="am-cv-review-summary">${_e(p.summary || '')}</div>${rows}</div>`;
  } catch (e) {
    out.innerHTML = `<div class="am-cv-error">${_e(e.message)}</div>`;
  }
  btn.disabled = false;
  btn.textContent = 'AI Review CV';
};

window._cvOptimize = async function () {
  const btn = document.getElementById('am-cv-opt-btn');
  const out = document.getElementById('am-cv-ai-out');
  btn.disabled = true;
  btn.textContent = 'Optimizing...';
  out.innerHTML = '';
  try {
    const api = await import('../firebase-config.js');
    const cfg = await api.readPortfolioDoc('ai-config');
    if (!cfg || cfg.connectionStatus !== 'success') throw new Error('AI not configured.');
    const d = await _load();
    const h = d.header || {};
    const exp = d.experience || {};
    const prompt = `You are a professional CV writer for senior IT/QA engineering roles.
Rewrite and optimize this data for maximum ATS compatibility and recruiter impact.
Return ONLY valid JSON (no markdown):
{"summary":"<optimized 3-4 sentence summary>","jobs":[{"description":"<bullet points, one per line>"}]}

Data:
Role: ${_e(h.role || h.title || 'Senior QA Engineer')}
Summary: ${_e(h.careerObjective || h.summary || h.tagline || '')}
Jobs: ${JSON.stringify((exp.jobs || []).map((j, i) => ({ i, desc: (j.description || '').substring(0, 300) })))}`;
    const r = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${atob(cfg.apiKey)}` },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 1800, temperature: 0.5, stream: false }),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    let js = await r.text();
    try {
      js = JSON.parse(js).choices[0].message.content;
    } catch (e) {}
    const m = js.match(/```(?:json)?\s*([\s\S]*?)```/) || js.match(/(\{[\s\S]*\})/);
    const opt = JSON.parse(m ? m[1] || m[0] : js);
    if (opt.summary) d.summary.overview = opt.summary;
    if (opt.jobs) opt.jobs.forEach((oj, i) => {
      if (d.experience.jobs && d.experience.jobs[i]) d.experience.jobs[i].description = oj.description;
    });
    document.getElementById('am-cv-frame').innerHTML = _cvHTML(d);
    out.innerHTML = `<div class="am-cv-ok">CV optimized. Preview updated and ready to export.</div>`;
  } catch (e) {
    out.innerHTML = `<div class="am-cv-error">${_e(e.message)}</div>`;
  }
  btn.disabled = false;
  btn.textContent = 'AI Optimize CV';
};

function _injectModalStyles() {
  if (document.getElementById('am-cv-modal-style')) return;
  const s = document.createElement('style');
  s.id = 'am-cv-modal-style';
  s.textContent = `
    .am-btn-cv{background:linear-gradient(135deg,#16a34a,#15803d)!important;color:#fff!important;border:none!important;padding:0.4rem 0.9rem;border-radius:8px;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.2s;font-family:'Open Sans',sans-serif;box-shadow:0 2px 8px rgba(22,163,74,0.35);}
    .am-btn-cv:hover{filter:brightness(1.1);transform:translateY(-1px);}
    .am-cv-modal{background:#fff;border-radius:18px;width:100%;max-width:1180px;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,0.45);overflow:hidden;animation:amSlideUp 0.3s cubic-bezier(.16,1,.3,1);}
    .am-cv-body{display:flex;flex:1;overflow:hidden;min-height:0;}
    #am-cv-left{flex:1;overflow:auto;background:#d9dee6;padding:1.25rem;display:flex;justify-content:center;align-items:flex-start;}
    #am-cv-frame{width:210mm;min-height:297mm;background:#fff;box-shadow:0 6px 28px rgba(0,0,0,0.18);transform:scale(0.74);transform-origin:top center;margin-bottom:-77mm;}
    .am-cv-loading{padding:2rem;text-align:center;color:#64748b;}
    .am-cv-tools{width:300px;flex-shrink:0;background:#1e293b;display:flex;flex-direction:column;border-left:2px solid #2D5B8E;overflow:hidden;}
    .am-cv-tools-head{padding:1rem;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;}
    .am-cv-tools-title{font-family:Montserrat,sans-serif;font-weight:700;color:#fff;font-size:0.95rem;margin-bottom:3px;}
    .am-cv-tools-sub{color:#94a3b8;font-size:0.74rem;}
    .am-cv-tools-content{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;}
    .am-cv-tools button{width:100%;padding:0.65rem;border-radius:10px;border:none;color:#fff;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Open Sans',sans-serif;}
    #am-cv-rev-btn{background:linear-gradient(135deg,#2D5B8E,#1e4063);}
    #am-cv-opt-btn{background:linear-gradient(135deg,#7c3aed,#5b21b6);}
    #am-cv-dl{background:linear-gradient(135deg,#16a34a,#15803d);box-shadow:0 4px 12px rgba(22,163,74,0.35);}
    .am-cv-close{background:transparent!important;color:#94a3b8!important;border:1px solid rgba(255,255,255,0.15)!important;font-weight:500!important;}
    .am-cv-tools-foot{padding:1rem;border-top:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0;}
    .am-cv-review{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;}
    .am-cv-score{font-size:1.5rem;font-weight:900;text-align:center;margin-bottom:4px;}
    .am-cv-review-summary{color:#94a3b8;font-size:0.74rem;text-align:center;margin-bottom:8px;}
    .am-cv-review-row{display:flex;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
    .am-cv-review-row span{font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:3px;flex-shrink:0;margin-top:2px;}
    .am-cv-review-row p{font-size:0.78rem;color:#cbd5e1;margin:0;}
    .am-cv-error{color:#f87171;font-size:0.8rem;}
    .am-cv-ok{background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:10px;color:#c4b5fd;font-size:0.78rem;}
    @media (max-width: 900px){.am-cv-body{flex-direction:column;}.am-cv-tools{width:100%;height:280px;border-left:none;border-top:2px solid #2D5B8E;}#am-cv-frame{transform:scale(0.55);margin-bottom:-135mm;}}
  `;
  document.head.appendChild(s);
}
