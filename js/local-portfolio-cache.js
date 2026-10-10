const CACHE_KEY = 'portfolio.localCache.v1';
const PENDING_WRITES_KEY = 'portfolio.pendingWrites.v1';

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function canUseStorage() {
  try {
    const key = '__portfolio_storage_test__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readJson(key, fallback) {
  if (typeof window === 'undefined' || !canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const value=raw?JSON.parse(raw):fallback;
    if(key===CACHE_KEY&&value&&typeof value==='object')delete value['ai-config'];
    return value;
  } catch (err) {
    console.warn(`[LocalCache] Failed to read ${key}:`, err);
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined' || !canUseStorage()) throw Object.assign(new Error('Local storage is unavailable; changes have not been saved.'), {code:'storage-error'});
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    throw Object.assign(new Error('Local storage is full or unavailable; changes have not been saved.'), {code:'storage-error', cause:err});
  }
}

export async function getBundledSeedDocs() {
  try {
    const seed = await import('./db-seed.js');
    if (typeof seed.getSeedPortfolioData === 'function') {
      return seed.getSeedPortfolioData();
    }
    return clone(seed.PORTFOLIO_SEED_DOCS || {});
  } catch (err) {
    console.warn('[LocalCache] Bundled seed unavailable:', err);
    return {};
  }
}

export async function readLocalPortfolioCache() {
  const bundled = await getBundledSeedDocs();
  const cached = readJson(CACHE_KEY, {});
  return {
    ...clone(bundled),
    ...clone(cached),
    ...Object.fromEntries(readPendingPortfolioWrites().map(item => [item.docId, clone(item.data)])),
  };
}

export async function readLocalPortfolioDoc(docId) {
  const docs = await readLocalPortfolioCache();
  return docs[docId] || null;
}

export function replaceLocalPortfolioCache(docs, meta = {}) {
  const next = { ...clone(docs), ...Object.fromEntries(readPendingPortfolioWrites().map(item => [item.docId, clone(item.data)])) };
  next.__localSync = {
    source: meta.source || 'firebase',
    syncedAt: new Date().toISOString(),
  };
  writeJson(CACHE_KEY, next);
  return next;
}

export async function updateLocalPortfolioDoc(docId, data, meta = {}) {
  const current = await readLocalPortfolioCache();
  current[docId] = clone(data);
  current.__localSync = {
    source: meta.source || 'local',
    syncedAt: new Date().toISOString(),
    lastDocId: docId,
  };
  writeJson(CACHE_KEY, current);
  return current[docId];
}

export function readPendingPortfolioWrites() {
  return readJson(PENDING_WRITES_KEY, []);
}

export function queuePendingPortfolioWrite(docId, data) {
  const pending = readPendingPortfolioWrites();
  const withoutSameDoc = pending.filter(item => item.docId !== docId);
  withoutSameDoc.push({
    docId,
    data: clone(data),
    queuedAt: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    expectedRevision: Number(data._revision || 0),
  });
  writeJson(PENDING_WRITES_KEY, withoutSameDoc);
  return withoutSameDoc;
}

export function clearPendingPortfolioWrite(docId, queuedAt) {
  const pending = readPendingPortfolioWrites().filter(item => item.docId !== docId || (queuedAt && item.queuedAt !== queuedAt));
  writeJson(PENDING_WRITES_KEY, pending);
  return pending;
}

export function clearAllPendingPortfolioWrites() {
  writeJson(PENDING_WRITES_KEY, []);
}
