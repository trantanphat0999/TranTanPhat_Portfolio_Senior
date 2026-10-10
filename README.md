![Tran Tan Phat - Senior QA Engineer](image/logo.svg)

# Tran Tan Phat - Senior QA Portfolio

Personal portfolio website for Tran Tan Phat, Senior Quality Assurance Engineer. Built with HTML, prebuilt Tailwind CSS, and Vanilla JavaScript. Uses Firebase Firestore for dynamic content management, an Admin Mode for in-place editing, and a local fallback/cache layer so the UI stays functional when Firebase is unavailable.

## Features

- Single-page portfolio: hero, summary, experience, skills, projects, achievements, education, contact.
- Dynamic data rendering from Firebase Firestore.
- Local fallback/cache:
  - On successful Firebase connection, the latest data is synced into a local cache.
  - When Firebase is unreachable or offline, the UI falls back to the local cache or the bundled seed data in `js/db-seed.js`.
  - When connectivity is restored, the app automatically pulls the latest data from Firebase and refreshes the UI.
- Admin Mode:
  - Log in as admin to edit, add, delete, and reorder content.
  - Saves made while offline are stored locally and queued for sync back to Firebase on reconnect.
  - The Config panel shows a Firebase status dot: green = connected, red = disconnected, yellow = syncing.
- CV export and an AI content assistant inside Admin Mode.

## Tech Stack

- HTML5
- Tailwind CSS compiled with the CLI
- Vanilla JavaScript (ES Modules)
- Firebase Firestore
- Remix Icon
- AOS animation
- SortableJS for drag-to-reorder in Admin Mode
- pdfmake with embedded Unicode fonts for selectable-text CV PDFs
- Node.js local development server

## Project Structure

```text
.
|-- index.html                  # Main portfolio page
|-- package.json                # npm scripts and dependencies
|-- tools/
|   |-- local-server.cjs        # Local static file server
|   |-- seed-firestore.mjs      # Node script for seeding Firestore
|   `-- seed.html               # Browser UI for seeding / inspecting Firebase data
|-- css/
|   `-- styles.css              # All site CSS
|-- js/
|   |-- firebase-config.js      # Firebase setup + local cache sync
|   |-- db-seed.js              # Default seed data and seed functions
|   |-- local-portfolio-cache.js# LocalStorage cache + pending sync queue
|   |-- portfolio-loader.js     # Public loader entrypoint (shim)
|   |-- loader/app.js           # UI rendering from data
|   |-- admin-mode.js           # Public admin entrypoint (shim)
|   |-- admin/                  # Admin Mode implementation (app, cv-export, styles)
|   `-- page/                   # Non-module UI scripts (nav, modals, lightbox, ...)
|-- image/                      # Static images (paths also stored in Firestore data)
|-- cv/                         # CV export output files
`-- docs/                       # Project docs + AI context / knowledge base
    |-- AI_CONTEXT.md
    `-- ai/
```

## Running Locally

Requires Node.js installed on your machine.

For a quick start on Windows, double-click `start-local-server.bat`.
The server runs at `http://127.0.0.1:5173/`; press `Ctrl+C` to stop it.

```bash
npm install
npm start
```

Open your browser at:

```text
http://127.0.0.1:5173/
```

If port `5173` is already in use, change the port in the `start` script inside `package.json`, or run the server directly:

```bash
node tools/local-server.cjs 5174 127.0.0.1
```

## Firebase

The Firebase configuration lives in:

```text
js/firebase-config.js
```

Main Firestore collection:

```text
portfolio
```

Each document represents one section:

```text
header
summary
experience
skills
projects
achievements
education
contact
metadata
ai-config
```

## Seeding Data to Firebase

To seed the default content:

1. Start the local server with `npm start`.
2. Open:

```text
http://127.0.0.1:5173/tools/seed.html
```

3. Use the seed buttons in the UI, or open DevTools Console and run:

```js
import('/js/db-seed.js').then(m => m.seedAll())
```

`js/db-seed.js` also serves as the bundled fallback data. When Firebase is unreachable and no local cache exists, the app reads from this file so the UI always has content to display.

## Data Sync Flow

1. On page load, `readAllPortfolioDocs()` is called from `js/firebase-config.js`.
2. If Firebase is connected:
   - Fetch the latest data from Firestore.
   - Save it to the local cache.
   - Render the UI.
3. If Firebase is disconnected:
   - Use the local cache stored in `localStorage`.
   - If no cache exists, fall back to the bundled seed data in `js/db-seed.js`.
4. Admin saves while offline:
   - Data is written to the local cache.
   - The write is added to a pending queue.
   - When Firebase reconnects, the queue is flushed to Firestore.

## Admin Mode

To open Admin Mode:

- Click **Admin Login** in the footer.
- Or use the keyboard shortcut `Ctrl + Shift + A`.
- Or triple-click the footer.

Admin login uses Firebase Authentication. Create the owner account in Firebase Authentication; the password is never stored in source code. Deploy `firestore.rules` before publishing the site.

Inside the Admin toolbar, the Config button shows a Firebase status dot:

- **Green**: Firebase connected.
- **Red**: Firebase disconnected.
- **Yellow**: Syncing pending writes.

## Development Notes

- Do not arbitrarily rename `data-pl="..."` selectors in `index.html` — the loader uses these anchors to render content.
- When adding a new section, update the seed data, the loader renderer, and the admin form accordingly.
- Local images should be placed in `image/` and referenced with relative paths such as `image/example.png`.
- `localStorage` is a client-side fallback cache only; it does not replace Firestore as the source of truth when online.

## Build and verification

```bash
npm install
npm run build
npm test
# Start npm start in a second terminal before:
npm run test:browser
# Optional PDF text/link verification (requires PyMuPDF):
npm run test:pdf
```

Generated `css/tailwind.css` and `vendor/` are committed for static hosting; the public portfolio needs no Node server; AI providers use the optional protected backend. Rebuild when HTML/JS Tailwind classes change. Firebase stays loaded from its official CDN.

## Admin workspace, AI and official CV

- Admin opens a full workspace with Overview, Content, CV Studio, AI Assistant and Settings. CV Studio is a full page with PDF zoom and draft-preserving navigation.
- The official CV is an approved version 4 snapshot. Public and Admin exports preserve the same text, selected fields, links, layout and page count. Portfolio edits and private JD/context do not replace the saved CV.
- A page target uses a fitted proposal with a before/after diff. Apply it before saving. An over-limit result cannot be saved or exported. Auto retains selected content without a page target.
- Content keeps existing CRUD/layout tools and adds a custom block builder with icons, public/CV previews, private drafts, explicit publish, hide/restore and Undo.
- Private context documents support AI writing and per-task selection. Private content and credentials are excluded from public data and seed exports.
- AI providers and models are shared across Chat, Content and CV. OpenAI API, Claude CLI and Custom API have separate installation checks, model catalogs and real connection tests. Changing configuration invalidates its previous test. **Test real connection** runs a step-by-step check (service reachable → admin sign-in/pairing → CLI installed & signed in / credential → structured JSON reply → plain-text reply) and shows which step failed.
- **Claude CLI** has its own panel (Settings → AI providers → Claude CLI): start `npm run admin:local`, keep it open, and the panel detects the service, the Claude Code install and its login automatically; pick Fast / Balanced / Best and click **Test & activate**. The activation is stored in this browser (no Firestore rules or API key needed) and works from `127.0.0.1:5173`, `127.0.0.1:5180` or the GitHub Pages site. No pairing code by default; set `PORTFOLIO_REQUIRE_PAIRING=1` to require one.
- Claude CLI uses the Claude Code login of the machine running `npm run admin:local` (`claude auth login`, no API key). Requests replace Claude Code's default agent prompt with the task prompt (~5k fewer input tokens per call), and an optional **Effort** (`low` = fastest) is passed to the CLI.
- Start `npm run admin:local` or `start-admin-workspace.bat` for the local AI backend. Visit `http://127.0.0.1:5180`, sign in, pair the browser using the terminal code, choose/test a provider and save its settings.
- Static hosting continues to serve the portfolio. New OpenAI/Custom API connections need the protected backend; Claude needs the local bridge. `Dockerfile.ai` provides an API-only hosted option.
- Writes use revisions. Public official CV and custom-block publication require online sync; private/device drafts preserve work during an outage. Existing section edits retain the pending-sync resolution workflow.

See [Admin AI Studio implementation and setup](docs/ADMIN_AI_STUDIO_IMPLEMENTATION.md) for completed scope, usage, verification and hosted setup. See [CV synchronization review](docs/CV_DESIGN_REVIEW.md) for the CV design.
