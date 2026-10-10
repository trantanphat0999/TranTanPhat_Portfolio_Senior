import { summarizePublicCv } from './public-summary.js';
import { createCvPdf } from './pdf.js';

export function cvChanges(before, after) {
  const next = new Map(after.map(field => [field.key, field]));
  return before.flatMap(field => {
    const value = next.get(field.key);
    if (!value) return [{key:field.key, section:field.section, before:field.text, after:'', action:'exclude'}];
    if (field.text !== value.text) return [{key:field.key, section:field.section, before:field.text, after:value.text, action:'shorten'}];
    return [];
  });
}

// Fit is an Admin proposal. It never changes portfolio data or published CVs.
// Custom wording is preserved; the owner can shorten it manually or with AI.
export async function fitCv(fields, style, cancelled = () => false) {
  const initial = await createCvPdf(fields, style);
  if (cancelled()) return null;
  if (initial.fits) return {...initial, fields, changes:[], originalPages:initial.pages};
  for (let level = 0; level <= 3; level++) {
    if (cancelled()) return null;
    const compact = summarizePublicCv(fields, level).map(field => {
      const original = fields.find(value => value.key === field.key);
      return original&&(original.custom||['name','role','contact','date','company','itemTitle','meta'].includes(original.kind)) ? {...field, text:original.text} : field;
    });
    const result = await createCvPdf(compact, style);
    if (cancelled()) return null;
    if (result.fits) return {...result, fields:compact, changes:cvChanges(fields, compact), originalPages:initial.pages};
  }
  return {...initial, fields, changes:[], originalPages:initial.pages};
}
