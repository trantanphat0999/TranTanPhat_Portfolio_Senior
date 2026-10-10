/**
 * Seeds Firestore using Firebase CLI OAuth credentials (local dev only).
 * Usage: node tools/seed-firestore.mjs [all|education]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectId = 'portfolio-project-9770e';
const scope = (process.argv[2] || 'all').toLowerCase();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readFirebaseCliTokens() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  const tokens = config?.tokens;
  if (!tokens?.access_token) {
    throw new Error('Firebase CLI is not logged in. Run: firebase login');
  }
  if (Date.now() >= Number(tokens.expires_at || 0)) {
    throw new Error('Firebase CLI token expired. Run: firebase login --reauth');
  }
  return tokens.access_token;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, nested] of Object.entries(value)) {
      fields[key] = toFirestoreValue(nested);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreDocument(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

async function loadSeedDocs() {
  const seedPath = path.join(root, 'js', 'db-seed.js');
  const mod = await import(pathToFileURL(seedPath).href);
  if (typeof mod.getSeedPortfolioData === 'function') {
    return mod.getSeedPortfolioData();
  }
  return mod.PORTFOLIO_SEED_DOCS || {};
}

async function writeDocument(accessToken, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/portfolio/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toFirestoreDocument(data)),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed portfolio/${docId} (${res.status}): ${body.slice(0, 240)}`);
  }
}

async function main() {
  const accessToken = readFirebaseCliTokens();
  const docs = await loadSeedDocs();
  const entries = scope === 'education'
    ? [['education', docs.education]]
    : Object.entries(docs);

  if (entries.some(([, data]) => !data)) {
    throw new Error(`Missing seed data for scope "${scope}".`);
  }

  console.log(`Seeding ${entries.length} document(s) to portfolio/* ...`);
  for (const [docId, data] of entries) {
    await writeDocument(accessToken, docId, data);
    console.log(`  OK portfolio/${docId}`);
  }

  await writeDocument(accessToken, 'metadata', {
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedSection: scope === 'education' ? 'education' : 'seed-all',
  });

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
