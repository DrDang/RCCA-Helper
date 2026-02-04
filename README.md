# RCCA Helper

Root Cause Corrective Action tool featuring interactive D3 fault tree visualization, integrated RAIL (Rolling Action Item List) tracking, and evidence-based status workflows. Designed for facilitator-led RCCA meetings.

Works fully offline on Mac and Windows.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Run the app:
   ```
   npm run dev
   ```
3. Open http://localhost:3000

## Build for Production

```
npm run build
```

The output is written to the `dist/` directory as static files (HTML, JS, CSS).

Preview the production build locally:

```
npm run preview
```

## Deploy

The production build produces a static site in `dist/`. Deploy it to any static hosting provider:

- **GitHub Pages / Netlify / Vercel** — point the build command to `npm run build` and the publish directory to `dist/`.
- **Self-hosted** — copy the `dist/` folder to any web server (Nginx, Apache, S3, etc.). No server-side runtime is required.
- **Offline/local use** — open `dist/index.html` directly in a browser, or serve it with any local HTTP server (e.g., `npx serve dist`).

## Features

- Interactive fault tree visualization (D3.js) with zoom and pan
- Create, edit, and delete cause nodes with confirmation dialogs
- Status tracking: Pending, Active, Ruled Out, Confirmed
- RAIL (Rolling Action Item List) for tracking corrective actions
- Evidence-based notes with ruling-out policy enforcement
- Multi-tree support — manage multiple investigations in one session
- Auto-save to localStorage with JSON export/import
