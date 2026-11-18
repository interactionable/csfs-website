# Creative Systems & Futures (CSFS) — Website

A zero-build-step, GPU-accelerated research studio brochure site powered by **Google Sheets + Google Apps Script** on the backend and **HTML/CSS/Vanilla JS + Three.js + GSAP + Lenis** on the frontend.

## Quick Start

1. **Configure your Apps Script URL**
   Open `app.js` and verify `CONFIG.APPS_SCRIPT_URL` at line 9 points to your deployed Google Apps Script Web App URL.

2. **Deploy updates to GitHub Pages**
   ```bash
   git add index.html style.css app.js
   git commit -m "Add Grid/Graph toggle and multi-layer project relationship graph"
   git push
   ```
