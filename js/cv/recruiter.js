import {defaultConfig} from './config.js';
// Source-derived editorial preset. It never adds a result, title or credential.
export function recruiterDraft(draft) {
  const next=JSON.parse(JSON.stringify(draft));next.overrides={...next.overrides};next.excluded=[...next.excluded];next.concise=false;
  next.config={...defaultConfig(),preset:'senior-qa',targetRole:'Senior QA Engineer',sectionOrder:['Professional Experience','Selected Achievements','Technical Skills','Key Projects','Education','Certifications'],contactLabels:{'contact.linkedin':'LinkedIn','contact.github':'GitHub / Portfolio'},headingLabels:{Certifications:'Certifications & Training'}};
  next.style={...next.style,rendererVersion:2,fontSize:10.5,lineHeight:1.2,margin:45.35,pageLimit:2,sectionSpacing:9,itemSpacing:5,bulletSpacing:2,datePlacement:'inline'};delete next.style.locked;
  const hide=field=>{if(!next.excluded.includes(field.key))next.excluded.push(field.key);};
  const rewrite=(field,value)=>{if(!Object.hasOwn(next.overrides,field.key))next.overrides[field.key]=value;};
  for(const field of next.fields){
    if(field.optional)hide(field);
    if(field.key==='summary'&&/API test automation/i.test(field.text)&&/performance/i.test(field.text)&&/CI\/CD/i.test(field.text))rewrite(field,'Quality Assurance Engineer focused on API test automation, performance testing, and CI/CD workflows. Experience with enterprise software testing and AI-assisted QA workflows.');
    if(field.group?.startsWith('job.')){
      const group=next.fields.filter(x=>x.group===field.group),intern=group.some(x=>x.kind==='itemTitle'&&/intern/i.test(x.text));
      if(field.kind==='paragraph')hide(field);
      if(intern&&field.kind==='bullet'&&group.filter(x=>x.kind==='bullet').indexOf(field)>=2)hide(field);
      if(field.kind==='bullet'&&/API Automation.*Postman.*GitHub Actions/.test(field.text))rewrite(field,'Built a Postman API testing workflow integrated with GitHub Actions.');
      if(field.kind==='bullet'&&/Performance Testing.*JMeter/.test(field.text))rewrite(field,'Executed JMeter load and stress tests to validate system performance.');
      if(field.kind==='bullet'&&/AI-Powered QA.*Prompt engineering/.test(field.text))rewrite(field,'Used prompt engineering and AI-assisted workflows for QA tasks.');
      if(field.kind==='bullet'&&/Mentored 5 members/.test(field.text))rewrite(field,'Mentored 5 QA team members across Middle, Junior, and Fresher levels.');
    }
    if(field.kind==='skill')rewrite(field,(field.brief||field.text).replace(/\b Tool\b/g,'').replace(/Jmeter/g,'JMeter').replace(/Test Document/g,'Test planning & documentation').replace(/Jira - Project Management And Issue Tracking(?: Tool)?/g,'Jira').replace(/GitHub Actions - CI\/CD Automation/g,'GitHub Actions').replace(/Windows Scheduler - Automation Scheduling/g,'Windows Task Scheduler').replace(/Programming Languages: JavaScript, Database [—-] SQL \/ SQL Server/g,'Languages & Databases: JavaScript, SQL / SQL Server').replace(/n8n - Workflow Automation/g,'n8n'));
    if(field.group?.startsWith('project.')&&field.kind==='paragraph')rewrite(field,field.brief||field.text.split(/\n\n/)[0].match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||field.text);
    if(field.group?.startsWith('project.')&&/\.impact\.[1-9]\d*$/.test(field.key))hide(field);
    if(field.group?.startsWith('cert.')&&field.kind==='itemTitle'){
      let course=false;try{const host=new URL(field.link).hostname;course=host==='udemy.com'||host.endsWith('.udemy.com');}catch{}
      if(course&&/ISTQB/i.test(field.text)&&!/^Course completion:/i.test(field.text))rewrite(field,`Course completion: ${field.text.replace(/^ISTQB Certified Tester\s*-\s*/i,'ISTQB ').replace(/\s*\(Vietnamese\)/g,'')}`);
      if(/Educator|Vibe Coding/i.test(field.text))hide(field);
    }
    if(field.key.startsWith('achievement.')){
      if(/CI\/CD Pipeline/.test(field.text)&&/GitHub Actions/.test(field.text))rewrite(field,'Automated scheduled API test runs, report generation, and delivery to the support team with GitHub Actions.');
      if(/Performance Benchmark/.test(field.text)&&/200,000/.test(field.text))rewrite(field,'Collaborated with Backend, Database, and DevOps teams on JMeter load and stress testing; the system handled 200,000+ records within 2 seconds in the reported benchmark.');
      if(/Bug Hunter 2025/.test(field.text))rewrite(field,'Received the Bug Hunter 2025 annual recognition award for defect detection and quality assurance contributions.');
    }
    if(field.kind==='bullet'&&/all AI chatbot conversation paths/.test(field.text))rewrite(field,'Tested AI chatbot conversation paths, including fallback, escalation, and edge case scenarios.');
    if(field.kind==='bullet'&&/Identified and remediated 12 security vulnerabilities/.test(field.text))rewrite(field,'Identified 12 security vulnerabilities before launch.');
    if(field.key.startsWith('degree.')&&field.kind==='paragraph')hide(field);
  }
  const projects=[...new Set(next.fields.filter(x=>x.group?.startsWith('project.')).map(x=>x.group))];
  next.fields.filter(x=>x.kind==='itemTitle'&&x.group?.startsWith('project.')&&projects.indexOf(x.group)>=2).forEach(hide);
  const achievements=next.fields.filter(x=>x.key.startsWith('achievement.'));achievements.slice(3).forEach(hide);
  const certificates=next.fields.filter(x=>x.kind==='itemTitle'&&x.group?.startsWith('cert.')).sort((a,b)=>Number(/ISTQB|test|quality|automation/i.test(b.text))-Number(/ISTQB|test|quality|automation/i.test(a.text)));
  certificates.slice(4).forEach(hide);
  return next;
}
