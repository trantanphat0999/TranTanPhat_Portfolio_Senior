# Project Context: Tran Tan Phat - Portfolio

## Overview
This is a modern, interactive portfolio website for a Senior Quality Assurance Engineer. It showcases professional experience, skills, projects, and certifications. The site features dynamic content loading via Firebase, an Admin UI for content management, and custom CSS animations for a premium user experience.

## Tech Stack
- **Frontend Core**: HTML5, Vanilla JavaScript
- **Styling**: Tailwind CSS (loaded via CDN), Custom CSS (Animations, Layouts, CSS Variables)
- **UI/UX Libraries**: AOS (Animate On Scroll) for scroll animations, Remix Icon for icons
- **Backend & Database**: Firebase (Firestore/Realtime Database) used for dynamic data storage and retrieval. Setup is handled via `firebase-config.js`.
- **Additional Tools**: 
  - `html2pdf.js`: To generate/export the portfolio as a PDF document.
  - `EmailJS`: For the contact form.

## Directory Structure
- `index.html`: The main entry point of the project. Contains the semantic HTML structure (Hero, Experience, Projects, Skills, Contact), embedded CSS styles (`<style>`), and basic Tailwind configuration.
- `seed.html`: A secondary page, likely historically used alongside `db-seed.js` for importing or exporting seed data.
- `js/`: JavaScript logic layer containing dynamic loading and admin behavior.
  - `firebase-config.js`: Firebase initialization script. Connects the frontend to the Cloud database.
  - `portfolio-loader.js`: The central data rendering script. It fetches portfolio content from Firebase and dynamically inserts it into the `index.html` DOM. It also handles core interactions like modals and lightboxes.
  - `admin-mode.js`: Logic powering the Admin Dashboard UI. This file manages authentication constraints, content editing (add/update/delete arrays), and UI syncing capabilities in the frontend without requiring a backend server.
  - `db-seed.js`: Script to seed initial data schemas into the database. Important for understanding the expected structure of data objects in Firestore.
- `css/`: (If applicable) Exclusively used for extended styling not covered by Tailwind or the main `<style>` block in `index.html`.
- `image/`: Contains all static graphical assets (avatars, backgrounds, icons, project thumbnails).
- `cv/`: Storage for downloadable resume documents (PDF, Docx).
- `package.json`: Manages dev dependencies, such as `jsdom`, potentially for scraping or running headless tests.

## Data Flow & Architecture
1. **Initial Load**: `index.html` loads all structural components and spinner while waiting for data.
2. **Data Fetch**: `portfolio-loader.js` invokes Firebase listeners via `firebase-config.js` to pull down the latest user details, experiences, etc.
3. **Render**: The fetched data elements are mapped over template strings and injected into the appropriate sections in `index.html`.
4. **Admin Actions**: If an Admin is authenticated, `admin-mode.js` enables inline editing. Changes made via the UI are pushed to Firebase and the UI dynamically refreshes to reflect changes.

## Best Practices for AI Agents working on this Repo
- Be extremely mindful of the `index.html` structure. Because data injected via `portfolio-loader.js` targets very specific DOM selectors (`id` or `data-*` attributes), do not unexpectedly change IDs or Class names.
- Always implement clean, vanilla JS solutions to maintain the lightweight nature of the site. Avoid introducing standard frameworks like React or Vue unless explicitly told to restructure the entire project.
- Check `.cursorrules` or `.agent/workflows/project_rules.md` (the designated AI Rules Agent) for specific boundaries on styling, QA patterns, and integration steps.
