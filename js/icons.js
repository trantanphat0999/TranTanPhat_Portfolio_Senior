// Product marks retain their source colors. Functional icons share a 24 px
// grid, rounded ends and a 1.8 px stroke; they never imitate a product logo.
export const BRANDS = {
  postman:{name:'Postman',file:'postman.svg',match:/\bpostman\b/i},
  jmeter:{name:'Apache JMeter',file:'jmeter.png',match:/\bjmeter\b/i},
  zap:{name:'ZAP',file:'zap.png',match:/\b(?:owasp\s+)?zap\b/i},
  akaat:{name:'akaAT Studio',file:'akaat.png',match:/\bakaat\b/i},
  javascript:{name:'JavaScript',file:'javascript.svg',match:/\bjavascript\b/i},
  sqlserver:{name:'Microsoft SQL Server',file:'sqlserver.svg',match:/\bsql\s*server\b/i},
  jira:{name:'Jira',file:'jira.svg',match:/\bjira\b/i},
  githubactions:{name:'GitHub Actions',file:'githubactions.svg',match:/\bgithub\s+actions\b/i},
  github:{name:'GitHub',file:'github.svg',match:/\bgithub\b(?!\s+actions)/i},
  scheduler:{name:'Windows Task Scheduler',file:'task-scheduler.png',match:/\b(?:windows|task)\s+scheduler\b/i},
  chatgpt:{name:'ChatGPT',file:'chatgpt.svg',match:/\bchatgpt\b/i},
  claude:{name:'Claude',file:'claude.svg',match:/\bclaude\b/i},
  grok:{name:'Grok',file:'grok.svg',match:/\bgrok\b/i},
  n8n:{name:'n8n',file:'n8n.svg',match:/\bn8n\b/i},
  selenium:{name:'Selenium',file:'selenium.svg',match:/\bselenium\b/i},
  docker:{name:'Docker',file:'docker.svg',match:/\bdocker\b/i},
  excel:{name:'Microsoft Excel',file:'excel.svg',match:/\bexcel\b/i},
  chrome:{name:'Google Chrome',file:'chrome.svg',match:/\bchrome(?:\s+devtools)?\b/i},
  linkedin:{name:'LinkedIn',file:'linkedin.svg',match:/\blinkedin\b/i},
  facebook:{name:'Facebook',file:'facebook-circle.png',match:/\bfacebook\b/i},
  tiktok:{name:'TikTok',file:'tiktok.svg',match:/\btiktok\b/i},
  zalo:{name:'Zalo',file:'zalo.webp',match:/\bzalo\b/i},
};

export const SYMBOLS = {
  api:'<rect x="2" y="7" width="6" height="10" rx="2"/><rect x="16" y="7" width="6" height="10" rx="2"/><path d="M8 10h8m-3-3 3 3-3 3M16 14H8m3-3-3 3 3 3"/>',
  performance:'<path d="M4 19a9 9 0 1 1 16 0H4Z"/><path d="m12 14 5-6M5 13h1m12 0h1M12 5v1"/><circle cx="12" cy="14" r="1.5"/>',
  security:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  testing:'<path d="M9 3h6m-5 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 14h8"/><path d="m9 17 2 2 4-4"/>',
  functional:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 10 2 2 5-5M8 17h8"/>',
  manual:'<path d="M5 3h10v5M5 3v18h7M8 7h3M8 11h2m3 10-2-6a1.5 1.5 0 0 1 2-2l1 2V9a1.5 1.5 0 0 1 3 0v6l2-1 2 2-1 5"/>',
  document:'<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h5"/>',
  ui:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01m2 6 6 3-3 1-1 3-2-7Z"/>',
  automation:'<rect x="2" y="9" width="5" height="6" rx="1.5"/><rect x="17" y="3" width="5" height="6" rx="1.5"/><rect x="17" y="15" width="5" height="6" rx="1.5"/><path d="M7 12h4V6h6m-6 6v6h6"/>',
  cicd:'<path d="M8 5h9a4 4 0 0 1 4 4v2M16 19H7a4 4 0 0 1-4-4v-2m14-5 4 3 2-4M7 16l-4-3-2 4"/><rect x="2" y="2" width="6" height="6" rx="1.5"/><rect x="16" y="16" width="6" height="6" rx="1.5"/>',
  ai:'<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3m-13-3 2 2 4-5"/>',
  mentorship:'<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="17" r="2"/><circle cx="19" cy="17" r="2"/><path d="M8 12v-1a4 4 0 0 1 8 0v1M3 22h4m10 0h4M12 12v2m-5 0h10"/>',
  bug:'<rect x="7" y="7" width="10" height="14" rx="5"/><path d="M9 7V4h6v3M4 10h3m10 0h3M3 15h4m10 0h4M4 20l3-2m10 0 3 2M12 7v14"/>',
  code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  tools:'<path d="m14 5 5-3-1 6-4 2-8 10-3-3 9-9-1-4 3 1Z"/><path d="m15 15 5 5m-4-5 2-2M4 3l4 4"/>',
  agile:'<path d="M5 7a8 8 0 0 1 14 0m0 10a8 8 0 0 1-14 0M5 3v4h4m10 14v-4h-4"/><path d="m9 12 2 2 4-4"/>',
  education:'<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v6c4 3 8 3 12 0v-6M22 9v8"/>',
  certificate:'<rect x="3" y="3" width="18" height="15" rx="2"/><path d="M7 7h10M7 11h4m5 6-2 5-2-2-2 2-2-5"/><circle cx="12" cy="15" r="3"/>',
  award:'<path d="M7 3h10v7a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v6m-4 0h8"/>',
  achievement:'<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9m-6-4 1.5 1.5L14 6"/>',
  summary:'<path d="M4 4h16v16H4V4Zm4 4h8m-8 4h8m-8 4h5"/>',
  projects:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V3h8v3M3 12h18m-11 0v3h4v-3"/>',
  building:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M10 21v-6h4v6"/>',
  remote:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  location:'<path d="M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 1 1 14 0Z"/><circle cx="12" cy="9" r="2.5"/>',
  email:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  phone:'<path d="m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3-1 4C9 22 2 15 3 4l4-1Z"/>',
  contact:'<path d="M3 4h18v13H9l-6 4V4Z"/><path d="M7 8h10M7 12h7"/>',
  user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  heart:'<path d="M12 21 3 12C-3 5 8-2 12 6c4-8 15-1 9 6l-9 9Z"/>',
  cake:'<path d="M4 12h16v9H4v-9Zm0 4c2 2 4-2 6 0s4-2 6 0 2-2 4 0M8 12V8m8 4V8m-4 4V6"/><path d="M12 2v1M8 4v1m8-1v1"/>',
  flag:'<path d="M5 22V3h14l-3 4 3 4H5"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
  leaf:'<path d="M20 3C6 2 1 9 5 16s17 3 15-13ZM4 21 16 9"/>',
  up:'<path d="M12 21V3M5 10l7-7 7 7"/>',
  down:'<path d="M12 3v18m-7-7 7 7 7-7"/>',
  left:'<path d="M21 12H3m7-7-7 7 7 7"/>',
  right:'<path d="M3 12h18m-7-7 7 7-7 7"/>',
  swap:'<path d="M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4"/>',
  external:'<path d="M14 3h7v7m0-7L10 14M10 4H3v17h17v-7"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  checked:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/>',
  close:'<path d="m5 5 14 14M19 5 5 19"/>',
  add:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  edit:'<path d="m4 16 12-12 4 4L8 20l-5 1 1-5Zm10-10 4 4"/>',
  delete:'<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  upload:'<path d="M5 17a5 5 0 0 1 0-10 7 7 0 0 1 14-1 5 5 0 0 1 0 11M12 21V10m-4 4 4-4 4 4"/>',
  cloud:'<path d="M6 19a5 5 0 0 1-1-10 7 7 0 0 1 14-1 5.5 5.5 0 0 1-1 11H6Z"/>',
  restart:'<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="m3 3 18 18M9 5a12 12 0 0 1 3 0c6 0 10 7 10 7l-3 4M6 7l-4 5s4 7 10 7c1 0 2 0 3-1"/>',
  link:'<path d="M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2M14 11a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2"/>',
  send:'<path d="m2 3 20 9-20 9 4-9-4-9Zm4 9h16"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
  warning:'<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
  loader:'<path d="M21 12a9 9 0 1 1-9-9"/>',
  drag:'<circle cx="8" cy="5" r="1"/><circle cx="16" cy="5" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
  folder:'<path d="M3 7V5h6l2 2h10v13H3V7Z"/>',
  settings:'<path d="m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/>',
  subtract:'<path d="M5 12h14"/>',
};

const aliases={
  'file-text':'document','file-user':'document',folder:'folder',settings:'settings',refresh:'restart',pulse:'performance','download-cloud':'cloud','arrow-right-up':'external',
  'code-s-slash':'code','code-box':'code','speed-up':'performance',speed:'performance','bar-chart':'performance','bar-chart-box':'performance',dashboard:'performance',
  shield:'security','shield-check':'security',plug:'api',robot:'automation','git-branch':'cicd',cpu:'ai','sparkling':'ai',sparkles:'ai','chat-ai':'ai',
  team:'mentorship',group:'mentorship','user-star':'mentorship','file-list':'document',article:'document',layout:'ui',macbook:'ui',function:'functional',
  'graduation-cap':'education',award:'certificate',medal:'achievement',trophy:'award',briefcase:'projects',global:'remote','map-pin':'location',mail:'email',
  message:'contact',men:'user',flashlight:'agile','arrow-up':'up','arrow-down':'down','arrow-up-s':'up','arrow-down-s':'down','arrow-left':'left','arrow-right':'right',
  'arrow-left-right':'swap','arrow-right-circle':'right','external-link':'external','checkbox-circle':'checked',checkbox:'checked','add-circle':'add','delete-bin':'delete',
  pencil:'edit','upload-cloud':'upload','eye-off':'eyeoff','send-plane':'send',time:'clock','error-warning':'warning','drag-move':'drag',
};
const brandClasses={github:'github',linkedin:'linkedin',facebook:'facebook',tiktok:'tiktok',javascript:'javascript'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function legacyName(icon){return String(icon||'').match(/\bri-([a-z0-9-]+)-(?:line|fill)\b/)?.[1]?.replace(/-\d+$/,'')||'';}
export function brandsForLabel(label){return Object.entries(BRANDS).filter(([,brand])=>brand.match.test(label||'')).map(([key])=>key);}
export function semanticIcon(label,fallback='ri-tools-line'){
  const value=String(label||'');
  const section={summary:'summary',experience:'projects',skills:'tools',projects:'projects',achievements:'achievement',education:'education',contact:'contact'}[value.toLowerCase().trim()];
  if(section)return section;
  if(/\bAPI\b|RESTful/i.test(value))return 'api';
  if(/performance|benchmark|non.functional|load.*test/i.test(value))return 'performance';
  if(/security|incident|release quality/i.test(value))return 'security';
  if(/manual/i.test(value))return 'manual';
  if(/UI\s*testing|visual|cross.browser/i.test(value))return 'ui';
  if(/functional|regression|smoke|sanity/i.test(value))return 'functional';
  if(/test.*(?:document|case|plan|guide)|document|\bPDF\b/i.test(value))return 'document';
  if(/\bSQL\b|database/i.test(value))return 'database';
  if(/CI\/CD|pipeline/i.test(value))return 'cicd';
  if(/mentor|leadership|team/i.test(value))return 'mentorship';
  if(/\bAI\b|prompt|innovation/i.test(value))return 'ai';
  if(/agile|scrum/i.test(value))return 'agile';
  if(/bug|defect/i.test(value))return 'bug';
  if(/automat|workflow/i.test(value))return 'automation';
  if(/testing skills|test.*strategy/i.test(value))return 'testing';
  const name=legacyName(fallback);
  return aliases[name]||(SYMBOLS[name]?name:'tools');
}
export function graphic(label='',fallback='ri-tools-line',{brands=true}={}){
  let matches=brands?brandsForLabel(label):[];
  if(brands&&!matches.length){const brand=brandClasses[legacyName(fallback)];if(brand)matches=[brand];}
  if(matches.length){
    const images=matches.map(key=>`<img class="portfolio-brand-mark" src="image/tools/${BRANDS[key].file}" alt="" title="${escape(BRANDS[key].name)}" width="24" height="24" decoding="async" data-brand="${key}">`).join('');
    return matches.length>1?`<span class="portfolio-icon-cluster">${images}</span>`:images;
  }
  const name=semanticIcon(label,fallback);
  return `<svg class="portfolio-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-symbol="${name}">${SYMBOLS[name]}</svg>`;
}
export function renderIcon(label='',fallback='ri-tools-line',options={}){
  return `<i class="${escape(fallback)} portfolio-icon-host" data-icon-label="${escape(label)}"${options.brands===false?' data-icon-mode="concept"':''} aria-hidden="true">${graphic(label,fallback,options)}</i>`;
}
