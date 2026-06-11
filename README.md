![Tran Tan Phat - Senior QA Engineer](image/logo.svg)

# Tran Tan Phat - Senior QA Portfolio

Personal portfolio website for Tran Tan Phat, Senior Quality Assurance Engineer. Built with HTML, Tailwind CSS (CDN), and Vanilla JavaScript. Uses Firebase Firestore for dynamic content management, an Admin Mode for in-place editing, and a local fallback/cache layer so the UI stays functional when Firebase is unavailable.

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
- Tailwind CSS via CDN
- Vanilla JavaScript (ES Modules)
- Firebase Firestore
- Remix Icon
- AOS animation
- SortableJS for drag-to-reorder in Admin Mode
- `html2pdf.js` for CV export
- Node.js local development server

## Project Structure

```text
.
|-- index.html                  # Main portfolio page
|-- seed.html                   # UI for seeding / inspecting Firebase data
|-- package.json                # npm scripts and dependencies
|-- tools/
|   `-- local-server.cjs        # Local static file server
|-- js/
|   |-- firebase-config.js      # Firebase setup + local cache sync
|   |-- db-seed.js              # Default seed data and seed functions
|   |-- local-portfolio-cache.js# LocalStorage cache + pending sync queue
|   |-- portfolio-loader.js     # Public loader entrypoint
|   |-- loader/app.js           # UI rendering from data
|   |-- admin-mode.js           # Public admin entrypoint
|   `-- admin/app.js            # Admin Mode implementation
|-- image/                      # Static images and assets
|-- cv/                         # CV export output files
`-- ai/                         # AI project context / knowledge base
```

## Running Locally

Requires Node.js installed on your machine.

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
http://127.0.0.1:5173/seed.html
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

The admin password is configured in `js/admin/app.js`. Keep this file private and do not expose the password in public repositories.

Inside the Admin toolbar, the Config button shows a Firebase status dot:

- **Green**: Firebase connected.
- **Red**: Firebase disconnected.
- **Yellow**: Syncing pending writes.

## Development Notes

- Do not arbitrarily rename `data-pl="..."` selectors in `index.html` — the loader uses these anchors to render content.
- When adding a new section, update the seed data, the loader renderer, and the admin form accordingly.
- Local images should be placed in `image/` and referenced with relative paths such as `image/example.png`.
- `localStorage` is a client-side fallback cache only; it does not replace Firestore as the source of truth when online.
