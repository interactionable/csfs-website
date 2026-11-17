# Creative Systems & Futures (CSFS) — Website

A zero-build-step, GPU-accelerated research studio brochure site powered by **Google Sheets + Google Apps Script** on the backend and **HTML/CSS/Vanilla JS + Three.js + GSAP + Lenis** on the frontend.

## Quick Start

1. **Configure your Apps Script URL**
   Open `app.js` and paste your Web App URL into `CONFIG.APPS_SCRIPT_URL` at line 8:
   ```js
   const CONFIG = {
     APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
     STORAGE_KEY: 'csfs_studio_data_v1'
   };
   ```

2. **Deploy updates to GitHub Pages**
   ```bash
   git add .
   git commit -m "Add cluster thumbnail_url visuals"
   git push
   ```
