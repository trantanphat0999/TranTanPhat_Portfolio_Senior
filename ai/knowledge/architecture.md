## Architecture (high-level)

### Entry point
- `index.html` import ESM:
  - `js/portfolio-loader.js` → renders UI from Firestore
  - `js/admin-mode.js` → admin UI (edit content, add new, reorder, save)

### Data layer
- `js/firebase-config.js`
  - `readPortfolioDoc(docId)`
  - `writePortfolioDoc(docId, data)`
  - `readAllPortfolioDocs()`

### Rendering flow
1. Page loads (static HTML skeleton).
2. Loader pulls Firestore docs → `renderAllSections`.
3. Admin mode (optional) overlays edit controls; save triggers `writePortfolioDoc` then `window._reloadPortfolioSection`.

### Key invariants (do not break)
- DOM anchors: `data-pl="..."` selectors referenced by loader.
- Admin hooks: `window._reloadPortfolioSection`, `window._portfolioData`.
- Project modals: container `#dynamic-modals-container` + `openProjectModal` global compatibility.

