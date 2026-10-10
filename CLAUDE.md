# CLAUDE.md

Guidance for AI agents (Claude Code, Cursor, etc.) working in this repo.
**This file is the canonical source of truth** — if `.cursorrules` or `AI_CONTEXT.md`
disagree with this file, trust this file.

## What this is

Interactive portfolio for **Tran Tan Phat, Senior QA Engineer**. A **static site**
(no build step, deploys to GitHub Pages) whose content is loaded at runtime from
**Firebase Firestore**, with a client-side **Admin Mode** for editing content.

## Tech stack

- **Vanilla JS (ES modules) + semantic HTML5**. No frameworks (React/Vue/Angular).
- **Tailwind CSS via Play CDN** (`cdn.tailwindcss.com`) — config is inline in `index.html`
  (`primary: #4B5563`, `secondary: #9CA3AF`). ⚠️ Not a production build; see Gotchas.
- **Firebase** (Firestore + Auth) loaded from the **gstatic CDN**, not from npm.
- Libraries via CDN: **AOS** (scroll animations), **Remix Icon** (`ri-*`), **EmailJS**
  (contact form), **marked** (render AI markdown), **jsPDF** (CV export, lazy-loaded).

## Run it

```bash
npm start          # → node tools/local-server.cjs 5173 127.0.0.1
                   # → http://127.0.0.1:5173/
```
`tools/local-server.cjs` is a tiny static file server using only Node core modules.
There is **no npm dependency needed at runtime** — `node_modules/` is unused and gitignored.

- `tools/seed.html` — one-off tool to push `js/db-seed.js` data into Firestore.

## Where the code actually lives  ⚠️ read this before editing

`js/portfolio-loader.js` and `js/admin-mode.js` are **thin re-export shims**.
The real implementations are:

| Concern | Real file | Notes |
|---|---|---|
| Public render | [`js/loader/app.js`](js/loader/app.js) | ~860 lines. Renders all sections from Firestore into DOM. |
| Admin Mode | [`js/admin/app.js`](js/admin/app.js) | ~2440 lines (auth + forms + AI widget). |
| Admin CSS | [`js/admin/styles.js`](js/admin/styles.js) | `ADMIN_STYLES` string injected once by `injectStyles()`. |
| CV export | [`js/admin/cv-export.js`](js/admin/cv-export.js) | Builds A4 preview + jsPDF download. |
| Firebase API | [`js/firebase-config.js`](js/firebase-config.js) | Firestore/Auth helpers, connection status, offline queue. |
| Offline cache | [`js/local-portfolio-cache.js`](js/local-portfolio-cache.js) | localStorage cache + pending-write queue. |
| Seed / fallback | [`js/db-seed.js`](js/db-seed.js) | Bundled fallback data. **Auto-generated** — see Seed sync. |
| Markup | [`index.html`](index.html) | ~1410 lines of HTML only. |
| Page styles | [`css/styles.css`](css/styles.css) | All site CSS (extracted from index.html). |
| Page scripts | [`js/page/*.js`](js/page/) | Non-module UI scripts, loaded `defer` in document order: `navigation`, `back-to-top`, `project-modal` (defines `window.openProjectModal`), `contact-form`, `lightbox` (defines `_lb`), `cv-pdf`, `profile-modal`. |

## Data model & flow

Firestore collection **`portfolio`** — one doc per section:
`header, summary, experience, skills, projects, achievements, education, contact`
(+ `metadata` for last-updated). AI config lives in a **separate** admin-only
collection: **`admin/ai-config`** (never public).

Read path (3-layer fallback, in `js/local-portfolio-cache.js`):
```
Firestore (source of truth)  >  localStorage cache  >  js/db-seed.js (bundled)
```
1. `initPortfolioLoader()` reads all docs (5s timeout) → `renderAllSections()`.
2. Auto-refresh every 60s + on focus/online — **paused while Admin Mode is active**
   so it can't clobber in-progress edits.
3. Admin saves via `writePortfolioDoc(docId, data)` (whole-doc `setDoc`), then
   `window._reloadPortfolioSection(docId)` re-renders just that section.

## Admin Mode

- Trigger: **Ctrl+Shift+A**, the footer "Admin Login" button, or triple-click the footer.
- Auth is **real Firebase Auth** — email is fixed (`trantanphat190999@gmail.com` in
  `firebase-config.js`), the typed value is the password. The client `isAdminMode`
  flag is cosmetic; real enforcement is Firestore rules.

## Security — Firestore rules

[`firestore.rules`](firestore.rules): `portfolio/*` is public-read, admin-write;
`admin/*` is admin-only. `isAdmin()` matches the admin email.
⚠️ **Rules only apply after deploy**: `firebase deploy --only firestore:rules,firestore:indexes`.

## Key invariants — DO NOT break

- **DOM anchors**: loader targets `data-pl="..."` attributes in `index.html`. Don't
  rename these (or matching IDs) without updating `js/loader/app.js`.
- **Admin hooks on window**: `_portfolioData`, `_reloadPortfolioSection`,
  `_reloadPortfolioMetadata`, `openProjectModal`.
- **Escape all user data** rendered via `innerHTML`: use `h()` in the loader and
  `esc()` in admin. (Exception already flagged: AI markdown output is not sanitized.)
- When you add a field to a section's data, also add its **Admin form input** in
  `js/admin/app.js` so it stays editable.

## Seed ↔ Firestore sync

`js/db-seed.js` is the offline fallback and drifts from live data when the admin edits
content. **Don't hand-edit it** for content changes — instead: Admin Mode →
**"⬇️ Export Seed"** downloads a fresh `db-seed.js` from live Firestore; replace the
file and commit. `SCHEMA_VERSION` + `validatePortfolioData()` in the loader log a
console warning when sections drift.

## Gotchas

- **Tailwind Play CDN** is dev-only (compiles in-browser, console warning, FOUC).
  A real deploy should build static CSS with the Tailwind CLI.
- **`marked` CDN is unpinned** (`npm/marked/marked.min.js`) — can change under you.
- `firebase-config.js` `apiKey` is committed — that's normal for Firebase web (not a
  secret); access control lives entirely in Firestore rules.
- `js/page/*.js` are classic (non-module) scripts sharing globals via `window`/`var`
  and loaded with `defer`, so they run after DOM parse in document order. Keep that
  order if adding cross-dependencies (e.g. `project-modal` uses `_lb` at click time).
- `js/admin/app.js` is still large (~2440 lines); a further split of its logic
  (auth / forms / ai) is a good next step but needs a smoke test first (no automated
  tests exist yet).

## Conventions

- Concise, direct changes; match surrounding vanilla-JS style.
- Wrap Firebase calls in `try/catch`; log with context (`console.error('[Area] ...', err)`).
- Section comment banners use the `// ─── TITLE ───` style already in the files.
