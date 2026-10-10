export const clone = value => JSON.parse(JSON.stringify(value ?? {}));
export const newId = () => globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function ensureItemIds(data) {
  const result = clone(data);
  function visit(value, path = '') {
    if (Array.isArray(value)) value.forEach((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        if (!item._id) {
          const text = `${path}:${index}:${item.id || item.title || item.name || item.company || ''}`;
          let hash = 2166136261;
          for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
          item._id = `legacy-${(hash >>> 0).toString(36)}`;
        }
        visit(item, `${path}.${item._id}`);
      }
    });
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => visit(item, `${path}.${key}`));
  }
  visit(result);
  return result;
}
export function atPath(data, path) { return path.split('.').reduce((value, key) => value?.[key], data); }
export function safeUrl(value, {image = false} = {}) {
  if (!value) return '';
  const text = String(value).trim();
  if (image && (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(text) || /^(image\/|\.\/image\/)/.test(text))) return text;
  try { const url = new URL(text); return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? text : ''; } catch { return ''; }
}
export function validateItem(section, item, siblings = [], {newItem = false, original} = {}) {
  const fields = {experience:['company','role','period'],skills:['name'],projects:['title'],achievements:['title'],education:item.institution!==undefined?['title','institution','period']:['title','issuer'],summary:['title','description'],contact:['name']}[section] || [];
  for (const field of fields) if ((newItem || String(original?.[field]||'').trim()) && !String(item[field] || '').trim()) throw new Error(`${field} is required.`);
  for (const field of ['url','link','linkedin','github']) if (item[field] && !safeUrl(item[field])) throw new Error(`Invalid ${field}. Use an http(s), mailto or tel URL.`);
  if (item.image && !safeUrl(item.image, {image:true})) throw new Error('Invalid image URL.');
  if (item.logo && !safeUrl(item.logo, {image:true})) throw new Error('Invalid logo URL.');
  if (section === 'contact' && newItem && !item.isZalo && !safeUrl(item.url)) throw new Error('A valid URL is required.');
  if (section === 'projects') {
    if (!item.modalId) item.modalId = `project-${item._id || newId()}`;
    if (!/^[a-zA-Z0-9_-]+$/.test(item.modalId)) throw new Error('Modal ID must contain only letters, numbers, hyphens or underscores.');
    if (siblings.some(other => other !== item && other._id !== item._id && (other.modalId || other.id) === item.modalId)) throw new Error('Modal ID is already in use.');
  }
  return item;
}
