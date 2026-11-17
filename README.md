# Creative Systems & Futures (CSFS) — Website

A zero-build-step, GPU-accelerated research studio brochure site powered by **Google Sheets + Google Apps Script** on the backend and **HTML/CSS/Vanilla JS + Three.js + GSAP + Lenis** on the frontend.

## Quick Start

1. **Test immediately with your live Apps Script endpoint**
   Open `index.html` in a browser with `?api=` appended to the URL:
   `index.html?api=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`

2. **Configure permanently for hosting (GitHub Pages / Netlify / Cloudflare Pages)**
   Open `app.js` and paste your Web App URL into `CONFIG.APPS_SCRIPT_URL` at line 8:
   ```js
   const CONFIG = {
     APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
     STORAGE_KEY: 'csfs_studio_data_v1'
   };
   ```

3. **Deploy for free**
   Push `index.html`, `style.css`, and `app.js` to a GitHub repository and enable **Settings > Pages > Deploy from branch (`main`)**.

## Google Sheet Notes
- **Landing tab:** Make sure Column A header is `key` (e.g., `title`, `tagline`, `about`, `unit_url`, `contact_email`) and Column B header is `value`.
- **Projects tab:** Make sure the tab is named `Projects` (or `2026_11_CSFS_projects`) so `Code.gs` includes all project rows.
- **Clusters & Members tabs:** Use `cluster_id` slugs (`cl_eess`, `cl_gmdc`, `cl_nat`, `cl_dcsi`) in multi-select dropdown chips to cross-link members and projects across clusters.
