import { getSeedPortfolioData } from './db-seed.js';

// Apply only the new QA content, preserving unrelated owner edits and item IDs.
export function mergeQaContent(current) {
  const next = structuredClone(current);
  const seed = getSeedPortfolioData();
  for (const key of ['header', 'summary', 'experience', 'skills', 'projects']) {
    if (!next[key]) next[key] = structuredClone(seed[key]);
  }
  next.header.tagline = seed.header.tagline;
  next.summary.overview = seed.summary.overview;
  next.summary.careerObjective = seed.summary.careerObjective;
  for (const key of ['coreExpertise', 'leadership']) {
    next.summary[key] = seed.summary[key].map(item => {
      const previous = current.summary?.[key]?.find(x => x.title === item.title);
      return { ...previous, ...structuredClone(item) };
    });
  }
  const job = next.experience.jobs?.find(x => x.company === 'Silicon Stack');
  if (job) {
    job.description = seed.experience.jobs[1].description;
    for (const title of ['API Automation', 'AI-Powered QA']) {
      const highlight = job.highlights?.find(x => x.title === title);
      if (highlight) highlight.desc = seed.experience.jobs[1].highlights.find(x => x.title === title).desc;
    }
  }
  next.skills.categories ||= [];
  const category = seed.skills.categories[0];
  if (!next.skills.categories.some(x => x.name === category.name)) next.skills.categories.unshift(category);
  const postman = next.skills.categories.find(x => x.name === 'Automation Tools')?.skills?.find(x => ['Postman Tool', 'Postman, Postman CLI & Newman'].includes(x.title));
  if (postman) Object.assign(postman, seed.skills.categories.find(x => x.name === 'Automation Tools').skills[0]);
  next.projects.items ||= [];
  // Existing projects, including hidden ones, stay under the owner's control.
  for (const project of [...seed.projects.items.slice(0, 2)].reverse()) {
    const existing = next.projects.items.find(x => x.id === project.id || x.modalId === project.id);
    if (existing) {
      existing.image = project.image;
      existing.cardImage = project.cardImage;
    } else next.projects.items.unshift(project);
  }
  return next;
}

export async function applyQaContentUpdate() {
  const { readAllPortfolioDocs, writePortfolioDoc } = await import('./firebase-config.js');
  const current = await readAllPortfolioDocs();
  const next = mergeQaContent(current);
  const results = [];
  for (const key of ['header', 'summary', 'experience', 'skills', 'projects']) {
    const result = await writePortfolioDoc(key, next[key]);
    results.push({ section: key, synced: result.synced });
  }
  console.table(results);
  return results;
}
