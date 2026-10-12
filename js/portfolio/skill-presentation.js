const aiCategory=name=>/\bAI\b|artificial intelligence/i.test(String(name||''));
const aiSkill=title=>/\bAI\b|\bChatGPT\b|\bClaude\b|\bGrok\b|\bAgents?\b|\bMCP\b/i.test(String(title||''));
// Presentation only: preserve persisted source structure, IDs and CV keys.
export function partitionSkills(categories=[]){
 const core=[],ai=[];let name='AI & Intelligent Workflows';
 for(const category of categories){
  if(aiCategory(category.name)){if(!ai.length)name=category.name;ai.push(...(category.skills||[]));continue;}
  const skills=[];for(const skill of category.skills||[]){if(aiSkill(skill.title))ai.push(skill);else skills.push(skill);}
  if(skills.length)core.push({...category,skills});
 }
 return {core,ai,name};
}
import {renderIcon} from '../icons.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function aiSkillCardMarkup({ai,name}){
 if(!ai.length)return '';
 return `<article class="ai-skills-card" data-ai-skills-card><div class="ai-skills-heading"><div><div class="ai-skills-eyebrow">INTELLIGENT WORKFLOWS</div><h3>${escape(name)}</h3><p>AI tools, connected workflows and reusable knowledge — grouped together for a clearer view of technical capabilities.</p></div><img class="ai-skills-art" src="image/ai-skills-studio.png" alt="Neural processor connected to a knowledge library, checklist and verification shield" width="1536" height="1024" loading="lazy" decoding="async"></div><div class="ai-skills-items">${ai.map(skill=>`<div class="ai-skills-item"><span>${renderIcon(skill.title,`${skill.icon||'ri-cpu-line'} text-xl`)}</span><div><h4>${escape(skill.title)}</h4><p>${escape(skill.desc)}</p></div></div>`).join('')}</div></article>`;
}
