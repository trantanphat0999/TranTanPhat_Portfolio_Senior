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
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`[LocalCache] Failed to read ${key}:`, err);
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined' || !canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[LocalCache] Failed to write ${key}:`, err);
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
  };
}

export async function readLocalPortfolioDoc(docId) {
  const docs = await readLocalPortfolioCache();
  return docs[docId] || null;
}

export function replaceLocalPortfolioCache(docs, meta = {}) {
  const next = clone(docs);
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
    queuedAt: new Date().toISOString(),
  });
  writeJson(PENDING_WRITES_KEY, withoutSameDoc);
  return withoutSameDoc;
}

export function clearPendingPortfolioWrite(docId) {
  const pending = readPendingPortfolioWrites().filter(item => item.docId !== docId);
  writeJson(PENDING_WRITES_KEY, pending);
  return pending;
}

export function clearAllPendingPortfolioWrites() {
  writeJson(PENDING_WRITES_KEY, []);
}
