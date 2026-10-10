# Project Context: Tran Tan Phat - Portfolio

> For the authoritative file map, data flow, commands, and gotchas, see
> **[`CLAUDE.md`](CLAUDE.md)**. This file is a short orientation.

## Overview
Interactive portfolio for a Senior QA Engineer. A **static site** (no build step,
deploys to GitHub Pages) that loads its content at runtime from **Firebase Firestore**,
with a client-side **Admin Mode** for content management and custom CSS animations.

## Tech Stack
- **Frontend**: HTML5 + Vanilla JavaScript (ES modules). No frameworks.
- **Styling**: Tailwind CSS via Play CDN (config inline in `index.html`) + custom CSS.
- **UI libs (CDN)**: AOS (scroll animations), Remix Icon.
- **Backend/DB**: **Firebase Firestore only** (no Realtime Database), via `js/firebase-config.js`.
  Firebase SDK is loaded from the gstatic CDN — **not** from npm.
- **Other (CDN)**: EmailJS (contact form), marked (AI markdown), **jsPDF** (CV export).

## Directory Structure
- `index.html` — main entry point: semantic HTML only + inline Tailwind config. ~1410 lines.
- `css/styles.css` — all site CSS (extracted from index.html).
- `tools/seed.html` — one-off tool to push `js/db-seed.js` data into Firestore.
- `js/`
  - `firebase-config.js` — Firestore/Auth init + helpers + connection status + offline queue.
  - `portfolio-loader.js`, `admin-mode.js` — **thin re-export shims** (do not edit here).
  - `loader/app.js` — **real** public render logic (targets `data-pl` DOM anchors).
  - `admin/app.js` — **real** Admin Mode (auth, edit forms, AI widget).
  - `admin/styles.js` — admin CSS (`ADMIN_STYLES`, injected at runtime).
  - `admin/cv-export.js` — CV A4 preview + jsPDF export.
  - `local-portfolio-cache.js` — localStorage cache + pending-write queue.
  - `db-seed.js` — offline fallback data (auto-generated via Admin → Export Seed).
  - `page/*.js` — classic (non-module) UI scripts loaded `defer` (navigation, lightbox,
    project-modal, contact-form, cv-pdf, profile-modal, back-to-top).
- `image/` — static assets. `cv/` — CV HTML. `tools/` — local dev server.
- `firestore.rules`, `firestore.indexes.json` — Firestore security & indexes.
- `node_modules/` — **unused at runtime**, gitignored.

## Data Flow (summary)
1. Static HTML loads with a spinner.
2. `js/loader/app.js` reads the `portfolio` collection (5s timeout) and renders sections
   into `data-pl` anchors. Falls back to localStorage cache, then bundled `db-seed.js`.
3. Auto-refresh every 60s (paused during Admin Mode).
4. Admin edits → `writePortfolioDoc()` (whole-doc write) → re-render that section.

## Best Practices for AI Agents
- **Edit the real files** (`js/loader/app.js`, `js/admin/app.js`), not the shims.
- Don't rename `data-pl` anchors / IDs without updating `js/loader/app.js`.
- Keep it vanilla JS; no frameworks unless explicitly asked.
- Escape user data in `innerHTML` (`h()` in loader, `esc()` in admin).
- Firestore rules only take effect after `firebase deploy --only firestore:rules`.
- See `CLAUDE.md` and `.cursorrules` for full conventions.
