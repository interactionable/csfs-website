/**
 * Creative Systems & Futures (CSFS) — Frontend Application
 * Connects to Google Apps Script JSON API, renders 4 hash-routed views,
 * drives a reactive Three.js GLSL shader field + GSAP choreography,
 * and powers an interactive multi-layer project relationship force graph.
 */

const CONFIG = {
  // Paste your deployed Google Apps Script Web App URL here (or pass ?api=URL in the browser address bar)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyTZOwNlNMcZVXyiZhRX4TZ6m0GUylgUZJVuGxwxwdsxDxiOUXeiUoAxwUjgoSmYqoG/exec',
  STORAGE_KEY: 'csfs_studio_data_v1'
};

// Default studio dataset (renders immediately while live Apps Script data syncs)
const FALLBACK_DATA = {
  landing: {
    title: 'Creative Systems & Futures',
    tagline: 'Bridging artistic production, systems thinking, and applied futures research.',
    about: 'The Creative Systems & Futures studio is the Faculty of Information and Communication Studies’ platform for artistic and speculative research. It advances practice-led inquiry as a method for investigating complex social, technological, and ecological systems—positioning creative production not as peripheral cultural output but as a mode of systems research.',
    unit_url: 'https://fics.upou.edu.ph',
    contact_email: 'fics@upou.edu.ph',
    logo_url: ''
  },
  clusters: [
    {
      cluster_id: 'cl_eess',
      name: 'Embodied Ecologies & Speculative Systems',
      short_name: 'EESS',
      facilitator: 'Diego S. Maranan',
      keywords: ['embodiment', 'ecological systems', 'artscience', 'futures literacy', 'speculative design', 'bio-art', 'regenerative design'],
      description: 'Embodied Ecologies & Speculative Systems (EESS) integrates complexity science, technology design, and somatic perspectives to explore human–nonhuman entanglements, embodied cognition, and multiscalar ecological systems.',
      accent_hex: '#7ee0b8',
      thumbnail_url: ''
    },
    {
      cluster_id: 'cl_gmdc',
      name: 'Gender, Media & Digital Cultures',
      short_name: 'GMDC',
      facilitator: 'Alice Sarmiento',
      keywords: ['feminist/queer media', 'postcolonial critique', 'platform cultures', 'algorithmic desire', 'digital intimacy'],
      description: 'Gender, Media & Digital Cultures examines platform ecologies, algorithmic mediation, and intersectional digital identities through critical and artistic research.',
      accent_hex: '#f59eb8',
      thumbnail_url: ''
    },
    {
      cluster_id: 'cl_nat',
      name: 'Narrative, Aesthetics & Transmedia',
      short_name: 'NAT',
      facilitator: 'Benny Agapito',
      keywords: ['narrative aesthetics', 'film & television', 'transmedia storytelling', 'AR/XR', 'immersive media', 'worldbuilding'],
      description: 'Narrative, Aesthetics & Transmedia explores speculative storytelling, experimental film, interactive narrative, and worldbuilding as tools for reimagining communicative futures.',
      accent_hex: '#8ba6ff',
      thumbnail_url: ''
    },
    {
      cluster_id: 'cl_dcsi',
      name: 'Design, Communication & Social Innovation',
      short_name: 'DCSI',
      facilitator: 'Ruth Rodriguez',
      keywords: ['communication design', 'media arts', 'participatory futures', 'UI/UX', 'service design', 'social innovation'],
      description: 'Design, Communication & Social Innovation advances practice-led design research in participatory futures, and communication-driven transformation, particularly in industry and community contexts.',
      accent_hex: '#f6c177',
      thumbnail_url: ''
    }
  ],
  projects: [
    {
      project_id: 'bukas_lab',
      project_name: 'Bukas Lab',
      start_date: '2022-01-01',
      end_date: 'Ongoing',
      brief_description: 'The Bukas Lab is a physical space and collaboration platform operated by the UP Open University (UPOU) Faculty of Information and Communication Studies, in partnership with Space Ecologies Art and Design (SEADS) and Curiosity.',
      display_order: 1,
      thumbnail_url: '',
      external_url: 'https://bukas.upou.edu.ph',
      cluster_ids: ['cl_eess', 'cl_dcsi'],
      related_projects: [],
      leads: [
        { member_name: 'Diego S. Maranan', profile_url: 'https://fics.upou.edu.ph/diego-maranan/', role: 'Lead' }
      ],
      members: [
        { member_name: 'Aleana Beato', profile_url: '', role: 'Junior/Undergraduate' },
        { member_name: 'Shari San Pablo', profile_url: 'https://fics.upou.edu.ph/faculty-prev/shari-eunice-t-san-pablo/', role: 'Co-Lead' }
      ]
    }
  ],
  members: [
    { member_name: 'Diego S. Maranan', profile_url: 'https://fics.upou.edu.ph/diego-maranan/', role: 'Lead', cluster_ids: ['cl_eess'], thumbnail_url: '' },
    { member_name: 'Shari San Pablo', profile_url: 'https://fics.upou.edu.ph/faculty-prev/shari-eunice-t-san-pablo/', role: 'Co-Lead', cluster_ids: ['cl_eess'], thumbnail_url: '' },
    { member_name: 'Alice Sarmiento', profile_url: '', role: 'Senior', cluster_ids: ['cl_gmdc'], thumbnail_url: '' },
    { member_name: 'Benny Agapito', profile_url: '', role: 'Senior', cluster_ids: ['cl_nat'], thumbnail_url: '' },
    { member_name: 'Ruth Rodriguez', profile_url: '', role: 'Senior', cluster_ids: ['cl_dcsi'], thumbnail_url: '' },
    { member_name: 'Aleana Beato', profile_url: '', role: 'Junior/Undergraduate', cluster_ids: ['cl_eess'], thumbnail_url: '' }
  ]
};

const DEFAULT_CLUSTER_PALETTE = ['#7ee0b8', '#f59eb8', '#8ba6ff', '#f6c177', '#b497ff'];

// Application State
const state = {
  data: structuredClone(FALLBACK_DATA),
  activeRoute: 'landing',
  projectClusterFilter: 'all',
  projectStatusFilter: 'all',
  memberClusterFilter: 'all',
  projectViewMode: 'grid', // 'grid' | 'graph'
  graphShowEdges: true,
  graphEdgeTypes: {
    related: true,
    team: true,
    cluster: true
  },
  shaderTargetColor: new THREE.Color('#7ee0b8'),
  shaderTargetEnergy: 0.45,
  lenis: null
};

/* ==========================================================================
   1. Data Normalization & Google Apps Script Sync
   ========================================================================== */

function getApiUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('api') || CONFIG.APPS_SCRIPT_URL;
}

function normalizeAssetUrl(url) {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return '';
  const driveMatch = rawUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  return driveMatch ? `https://lh3.googleusercontent.com/d/${driveMatch[1]}` : rawUrl;
}

function normalizePayload(raw) {
  if (!raw || typeof raw !== 'object') return structuredClone(FALLBACK_DATA);

  // Merge landing safely (handles logo_url aliases, reversed key/value rows, and about_short)
  const landing = { ...FALLBACK_DATA.landing };
  const logoKeys = [
    'logo_url', 'logo', 'csfs_logo', 'csfs_logo_url',
    'site_logo', 'site_logo_url', 'brand_logo', 'logo_image', 'logo_image_url', 'url_for_logo'
  ];
  const validLandingKeys = ['title', 'tagline', 'about', 'about_short', 'unit_url', 'contact_email', ...logoKeys];

  if (raw.landing && typeof raw.landing === 'object') {
    Object.entries(raw.landing).forEach(([k, v]) => {
      const key = String(k || '').trim();
      const val = String(v || '').trim();
      const keyLower = key.toLowerCase();
      const valLower = val.toLowerCase();

      if (validLandingKeys.includes(keyLower) && val) {
        const targetKey = keyLower === 'about_short' ? 'about' : (logoKeys.includes(keyLower) ? 'logo_url' : keyLower);
        landing[targetKey] = targetKey === 'logo_url' ? normalizeAssetUrl(val) : val;
      } else if (validLandingKeys.includes(valLower) && key) {
        const targetKey = valLower === 'about_short' ? 'about' : (logoKeys.includes(valLower) ? 'logo_url' : valLower);
        landing[targetKey] = targetKey === 'logo_url' ? normalizeAssetUrl(key) : key;
      }
    });
  }
  if (landing.unit_url && !/^https?:\/\//i.test(landing.unit_url)) {
    landing.unit_url = FALLBACK_DATA.landing.unit_url;
  }

  // Normalize members first so we can resolve facilitator & project slugs
  const members = Array.isArray(raw.members) && raw.members.length
    ? raw.members.map(m => ({
        member_name: String(m.member_name || '').trim(),
        profile_url: String(m.profile_url || '').trim(),
        role: String(m.role || 'Member').trim(),
        cluster_ids: Array.isArray(m.cluster_ids) ? m.cluster_ids : [],
        thumbnail_url: normalizeAssetUrl(m.thumbnail_url || m.photo_url || m.avatar_url || '')
      }))
    : structuredClone(FALLBACK_DATA.members);

  // Build slug -> member map
  const slugToMember = {};
  members.forEach(m => {
    const clean = m.member_name.toLowerCase().replace(/\s+[a-z]\.\s+/g, ' ');
    const slugUnderscore = clean.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const slugCompact = clean.replace(/[^a-z0-9]+/g, '');
    slugToMember[slugUnderscore] = m;
    slugToMember[slugCompact] = m;
    slugToMember[m.member_name.toLowerCase()] = m;
  });

  // Normalize clusters (including thumbnail_url and comma-separated facilitators)
  const rawClusters = Array.isArray(raw.clusters) && raw.clusters.length
    ? raw.clusters
    : FALLBACK_DATA.clusters;

  const clusters = rawClusters.map((c, idx) => {
    const name = String(c.name || '').trim();
    const id = String(c.cluster_id || `cl_${idx}`).trim();
    const generatedShort = name
      .split(/[\s,&]+/)
      .filter(w => w.length > 2 && w[0] === w[0].toUpperCase())
      .map(w => w[0])
      .join('') || `C${idx + 1}`;

    const facTokens = String(c.facilitator || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const facilitators = facTokens.map(token => {
      const compactToken = token.toLowerCase().replace(/[^a-z0-9]+/g, '');
      const match = slugToMember[token.toLowerCase()] || slugToMember[compactToken];
      if (match) {
        if (!match.cluster_ids.includes(id)) match.cluster_ids.push(id);
        return { member_name: match.member_name, profile_url: match.profile_url };
      }
      const prettyName = token.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
      return { member_name: prettyName, profile_url: '' };
    });

    return {
      cluster_id: id,
      name,
      short_name: String(c.short_name || '').trim() || generatedShort,
      facilitator: facilitators.map(f => f.member_name).join(', '),
      facilitators,
      keywords: Array.isArray(c.keywords) ? c.keywords : [],
      description: String(c.description || '').trim(),
      accent_hex: String(c.accent_hex || '').trim() || DEFAULT_CLUSTER_PALETTE[idx % DEFAULT_CLUSTER_PALETTE.length],
      thumbnail_url: normalizeAssetUrl(c.thumbnail_url || '')
    };
  });

  // Resolve person slugs (e.g., "benny_agapito" -> "Benny Agapito" + profile URL)
  const resolveProjectPerson = (entry) => {
    const rawName = typeof entry === 'string' ? entry.trim() : String(entry?.member_name || '').trim();
    if (!rawName) return null;
    const compact = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const match = slugToMember[rawName.toLowerCase()] || slugToMember[compact];
    if (match) {
      return {
        member_name: match.member_name,
        profile_url: entry?.profile_url || match.profile_url,
        role: entry?.role || match.role
      };
    }
    return {
      member_name: rawName.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
      profile_url: entry?.profile_url || '',
      role: entry?.role || ''
    };
  };

  // Normalize projects (including project_id and related_projects)
  const rawProjectsList = Array.isArray(raw.projects) && raw.projects.length
    ? raw.projects
    : FALLBACK_DATA.projects;

  const projects = rawProjectsList.map(p => {
    const relatedRaw = Array.isArray(p.related_projects)
      ? p.related_projects
      : String(p.related_projects || '').split(',').map(s => s.trim()).filter(Boolean);

    return {
      project_id: String(p.project_id || p.id || p.slug || '').trim(),
      project_name: String(p.project_name || '').trim(),
      start_date: String(p.start_date || '').trim(),
      end_date: String(p.end_date || '').trim(),
      brief_description: String(p.brief_description || '').trim(),
      display_order: Number(p.display_order) || 999,
      thumbnail_url: normalizeAssetUrl(p.thumbnail_url || ''),
      external_url: String(p.external_url || '').trim(),
      cluster_ids: Array.isArray(p.cluster_ids) ? p.cluster_ids : [],
      leads: Array.isArray(p.leads) ? p.leads.map(resolveProjectPerson).filter(Boolean) : [],
      members: Array.isArray(p.members) ? p.members.map(resolveProjectPerson).filter(Boolean) : [],
      related_projects: relatedRaw.map(item =>
        typeof item === 'string' ? item.trim() : String(item?.project_name || item?.name || '').trim()
      ).filter(Boolean)
    };
  }).sort((a, b) => a.display_order - b.display_order);

  return { landing, clusters, projects, members };
}

async function syncData() {
  const statusDot = document.getElementById('sync-dot');
  const statusText = document.getElementById('sync-status');

  try {
    const cached = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (cached) {
      state.data = normalizePayload(JSON.parse(cached));
      renderAll();
    }
  } catch (_) {}

  const apiUrl = getApiUrl();
  if (!apiUrl) {
    statusText.textContent = 'DEMO ARCHIVE';
    return;
  }

  try {
    statusDot.classList.add('is-syncing');
    statusText.textContent = 'SYNCING SHEET...';
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(json));
    state.data = normalizePayload(json);
    renderAll();
    statusText.textContent = 'LIVE SHEET SYNCED';
  } catch (err) {
    console.warn('Apps Script fetch failed, using cached/fallback data:', err);
    statusText.textContent = 'CACHED ARCHIVE';
  } finally {
    statusDot.classList.remove('is-syncing');
  }
}

/* ==========================================================================
   2. Procedural Generative Artwork Fallback for Missing Thumbnails
   ========================================================================== */

function generateProceduralCover(seedText, accentHex = '#7ee0b8') {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = seedText.charCodeAt(i) + ((hash << 5) - hash);
  }
  const cx1 = 180 + (Math.abs(hash) % 240);
  const cy1 = 90 + (Math.abs(hash >> 3) % 140);
  const cx2 = 360 + (Math.abs(hash >> 5) % 220);
  const cy2 = 160 + (Math.abs(hash >> 7) % 140);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
      <defs>
        <radialGradient id="g1" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#0b0d13" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="g2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#8ba6ff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#0b0d13" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="#0d1017"/>
      <circle cx="${cx1}" cy="${cy1}" r="260" fill="url(#g1)"/>
      <circle cx="${cx2}" cy="${cy2}" r="240" fill="url(#g2)"/>
      <g stroke="rgba(255,255,255,0.08)" stroke-width="1" fill="none">
        <circle cx="400" cy="250" r="95"/>
        <circle cx="400" cy="250" r="165"/>
        <circle cx="400" cy="250" r="235"/>
        <line x1="120" y1="250" x2="680" y2="250"/>
        <line x1="400" y1="40" x2="400" y2="460"/>
      </g>
      <text x="36" y="462" fill="rgba(255,255,255,0.45)" font-family="monospace" font-size="14" letter-spacing="3">
        CSFS // ${escapeHtml(seedText.toUpperCase())}
      </text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ==========================================================================
   3. Rendering Views
   ========================================================================== */

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findProjectByRef(ref) {
  const raw = String(ref || '').trim().toLowerCase();
  if (!raw) return null;
  const compact = raw.replace(/[^a-z0-9]+/g, '');
  if (!compact) return null;

  // 1. Exact match against project_id or project_name (raw or alphanumeric slug)
  const exactMatch = state.data.projects.find(p => {
    const pid = String(p.project_id || '').trim().toLowerCase();
    const title = p.project_name.toLowerCase();
    return (
      (pid && (pid === raw || pid.replace(/[^a-z0-9]+/g, '') === compact)) ||
      title === raw ||
      title.replace(/[^a-z0-9]+/g, '') === compact
    );
  });
  if (exactMatch) return exactMatch;

  // 2. Year-stripped match (e.g. "wearable_futures2022" -> "Wearable Futures")
  const compactNoYear = compact.replace(/(19|20)\d{2}/g, '');
  if (compactNoYear.length >= 4) {
    const yearStrippedMatch = state.data.projects.find(p => {
      const titleCompact = p.project_name.toLowerCase().replace(/[^a-z0-9]+/g, '');
      return titleCompact === compactNoYear || titleCompact.replace(/(19|20)\d{2}/g, '') === compactNoYear;
    });
    if (yearStrippedMatch) return yearStrippedMatch;
  }

  // 3. Stemmed prefix match (e.g. "emergingfuturist2022" / "theemergingfuturist2022" -> "Emerging Futurists Residency 2022")
  const refYear = (compact.match(/(19|20)\d{2}/) || [])[0] || '';
  const baseStemmed = compactNoYear.replace(/^the/, '').replace(/s$/, '');
  if (baseStemmed.length >= 6) {
    const fuzzyMatch = state.data.projects.find(p => {
      const title = p.project_name.toLowerCase();
      const titleCompact = title.replace(/[^a-z0-9]+/g, '');
      const titleYear = (titleCompact.match(/(19|20)\d{2}/) || [])[0] || '';
      if (refYear && titleYear && refYear !== titleYear) return false;

      const stemmedTitle = (title.match(/[a-z]+/g) || [])
        .filter(w => w !== 'the')
        .map(w => (w.length > 4 ? w.replace(/s$/, '') : w))
        .join('');

      return stemmedTitle.startsWith(baseStemmed) || baseStemmed.startsWith(stemmedTitle);
    });
    if (fuzzyMatch) return fuzzyMatch;
  }

  return null;
}

function renderRelatedProjectPill(ref) {
  const target = findProjectByRef(ref);
  if (target) {
    return `<button type="button" class="person-pill related-project-pill" data-open-project="${escapeHtml(target.project_name)}" data-cursor="PROJECT">${escapeHtml(target.project_name)} ↗</button>`;
  }
  const prettyLabel = String(ref || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/\b\w/g, ch => ch.toUpperCase());
  return `<span class="person-pill">${escapeHtml(prettyLabel)}</span>`;
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getClusterById(id) {
  return state.data.clusters.find(c => c.cluster_id === id || c.short_name.toLowerCase() === String(id).toLowerCase());
}

function renderPersonPill(person) {
  const name = escapeHtml(person.member_name);
  if (person.profile_url) {
    return `<a href="${escapeHtml(person.profile_url)}" target="_blank" rel="noopener" class="person-pill" data-cursor="PROFILE">${name} ↗</a>`;
  }
  return `<span class="person-pill">${name}</span>`;
}

function renderLanding() {
  const { landing, clusters, projects } = state.data;

  // Update header logo if configured in Site_Config
  const brandLogoEl = document.getElementById('brand-logo');
  const brandMarkEl = document.getElementById('brand-mark');
  if (brandLogoEl && brandMarkEl) {
    if (landing.logo_url) {
      brandLogoEl.onerror = () => {
        brandLogoEl.hidden = true;
        brandMarkEl.hidden = false;
      };
      brandLogoEl.src = landing.logo_url;
      brandLogoEl.hidden = false;
      brandMarkEl.hidden = true;
    } else {
      brandLogoEl.hidden = true;
      brandMarkEl.hidden = false;
    }
  }

  if (landing.title) {
    const heroTitleEl = document.getElementById('hero-title');
    if (landing.title.includes('&')) {
      const [before, after] = landing.title.split('&');
      heroTitleEl.innerHTML = `${escapeHtml(before.trim())} <br /><em>&amp; ${escapeHtml(after.trim())}</em> Studio`;
    } else {
      heroTitleEl.textContent = landing.title;
    }
    const footerBrand = document.querySelector('.footer-brand');
    if (footerBrand) footerBrand.textContent = landing.title;
  }

  document.getElementById('hero-tagline').textContent = landing.tagline;
  document.getElementById('hero-about').textContent = landing.about;
  document.getElementById('footer-unit-link').href = landing.unit_url;
  document.getElementById('footer-email-link').href = `mailto:${landing.contact_email}`;

  // 4-Cluster Interactive Strip (with thumbnail_url support)
  const clustersContainer = document.getElementById('landing-clusters');
  clustersContainer.innerHTML = clusters.map((c, idx) => {
    const fallbackImg = generateProceduralCover(c.short_name || c.name, c.accent_hex);
    const imgSrc = c.thumbnail_url || fallbackImg;
    return `
      <a href="#/clusters"
         class="cluster-mini-card"
         style="--card-accent: ${escapeHtml(c.accent_hex)}"
         data-accent="${escapeHtml(c.accent_hex)}"
         data-cursor="CLUSTER">
        <div class="cluster-mini-media">
          <img src="${escapeHtml(imgSrc)}"
               alt="${escapeHtml(c.name)}"
               loading="lazy"
               onerror="this.onerror=null;this.src='${fallbackImg}';" />
        </div>
        <div class="cluster-mini-body">
          <div>
            <div class="cluster-mini-top">
              <span class="mono">0${idx + 1} · ${escapeHtml(c.short_name)}</span>
              <span class="cluster-swatch"></span>
            </div>
            <h3 class="cluster-mini-title">${escapeHtml(c.name)}</h3>
            <p class="cluster-mini-desc">${escapeHtml(c.description)}</p>
          </div>
          <div class="cluster-mini-foot">
            <span>Lead: ${escapeHtml(c.facilitator || 'TBA')}</span>
            <span class="mono">→</span>
          </div>
        </div>
      </a>
    `;
  }).join('');

  // Featured Projects (top 3 by display_order)
  const featured = projects.slice(0, 3);
  document.getElementById('landing-projects').innerHTML = featured.map(renderProjectCard).join('');
}

function renderClustersView() {
  const { clusters, projects, members } = state.data;
  const container = document.getElementById('clusters-list');

  container.innerHTML = clusters.map((c, idx) => {
    const clusterProjects = projects.filter(p => p.cluster_ids.includes(c.cluster_id));
    const clusterMembers = members.filter(m => m.cluster_ids.includes(c.cluster_id));
    const fallbackImg = generateProceduralCover(c.short_name || c.name, c.accent_hex);
    const imgSrc = c.thumbnail_url || fallbackImg;

    return `
      <article class="cluster-detail-card"
               style="--card-accent: ${escapeHtml(c.accent_hex)}"
               data-accent="${escapeHtml(c.accent_hex)}">
        <div class="cluster-detail-grid">
          <div>
            <div class="cluster-detail-media">
              <img src="${escapeHtml(imgSrc)}"
                   alt="${escapeHtml(c.name)}"
                   loading="lazy"
                   onerror="this.onerror=null;this.src='${fallbackImg}';" />
            </div>
            <div class="cluster-badge mono">
              <span class="cluster-swatch"></span>
              <span>CLUSTER 0${idx + 1} · ${escapeHtml(c.short_name)}</span>
            </div>
            <h2 class="cluster-detail-title">${escapeHtml(c.name)}</h2>
            <p class="cluster-detail-desc">${escapeHtml(c.description)}</p>
            ${c.keywords.length ? `
              <div class="keyword-list">
                ${c.keywords.map(kw => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join('')}
              </div>
            ` : ''}
          </div>

          <div class="cluster-sidebar">
            <div>
              <span class="mono meta-block-label">CLUSTER FACILITATOR(S)</span>
              <div class="pill-list">
                ${c.facilitators && c.facilitators.length
                  ? c.facilitators.map(renderPersonPill).join('')
                  : '<span class="person-pill">TBA</span>'}
              </div>
            </div>

            <div>
              <span class="mono meta-block-label">AFFILIATED MEMBERS (${clusterMembers.length})</span>
              <div class="pill-list">
                ${clusterMembers.length
                  ? clusterMembers.map(renderPersonPill).join('')
                  : '<span class="keyword-tag">Directory updating</span>'}
              </div>
            </div>

            <div>
              <span class="mono meta-block-label">INITIATIVES (${clusterProjects.length})</span>
              <div class="pill-list">
                ${clusterProjects.length
                  ? clusterProjects.map(p => `
                      <button class="person-pill" data-open-project="${escapeHtml(p.project_name)}" data-cursor="INSPECT">
                        ${escapeHtml(p.project_name)} ↗
                      </button>
                    `).join('')
                  : '<a href="#/projects" class="keyword-tag">Explore studio projects →</a>'}
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderProjectCard(p) {
  const primaryCluster = p.cluster_ids.length ? getClusterById(p.cluster_ids[0]) : null;
  const accent = primaryCluster ? primaryCluster.accent_hex : '#7ee0b8';
  const fallbackImg = generateProceduralCover(p.project_name, accent);
  const imgSrc = p.thumbnail_url || fallbackImg;
  const dateLabel = [p.start_date, p.end_date].filter(Boolean).join(' — ') || 'Active';

  const clusterChips = p.cluster_ids.map(cid => {
    const cl = getClusterById(cid);
    const label = cl ? cl.short_name : cid;
    const color = cl ? cl.accent_hex : '#7ee0b8';
    return `<span class="cluster-chip" style="--chip-color: ${escapeHtml(color)}">${escapeHtml(label)}</span>`;
  }).join('');

  return `
    <article class="project-card" data-accent="${escapeHtml(accent)}">
      <div class="project-media" data-open-project="${escapeHtml(p.project_name)}" data-cursor="DETAILS">
        <img src="${escapeHtml(imgSrc)}"
             alt="${escapeHtml(p.project_name)}"
             loading="lazy"
             onerror="this.onerror=null;this.src='${fallbackImg}';" />
        <span class="project-status-badge mono">${escapeHtml(dateLabel)}</span>
      </div>

      <div class="project-body">
        ${clusterChips ? `<div class="project-clusters">${clusterChips}</div>` : ''}
        <h3 class="project-title">${escapeHtml(p.project_name)}</h3>
        <p class="project-desc">${escapeHtml(p.brief_description)}</p>

        <div class="project-people">
          ${p.leads.length ? `
            <div class="people-row">
              <span class="people-label">LEAD</span>
              ${p.leads.map(renderPersonPill).join('')}
            </div>
          ` : ''}
          ${p.members.length ? `
            <div class="people-row">
              <span class="people-label">TEAM</span>
              ${p.members.map(renderPersonPill).join('')}
            </div>
          ` : ''}
          ${p.related_projects && p.related_projects.length ? `
            <div class="people-row">
              <span class="people-label">RELATED</span>
              ${p.related_projects.map(renderRelatedProjectPill).join('')}
            </div>
          ` : ''}
        </div>

        <div class="project-actions">
          <button class="text-link mono" data-open-project="${escapeHtml(p.project_name)}">QUICK VIEW</button>
          ${p.external_url ? `
            <a href="${escapeHtml(p.external_url)}" target="_blank" rel="noopener" class="btn btn-ghost" data-cursor="LAUNCH">
              Visit Site ↗
            </a>
          ` : ''}
        </div>
      </div>
    </article>
  `;
}

function getFilteredProjects() {
  return state.data.projects.filter(p => {
    const matchCluster = state.projectClusterFilter === 'all' || p.cluster_ids.includes(state.projectClusterFilter);
    const isOngoing = String(p.end_date).toLowerCase() === 'ongoing' || !p.end_date;
    const matchStatus =
      state.projectStatusFilter === 'all' ||
      (state.projectStatusFilter === 'ongoing' && isOngoing) ||
      (state.projectStatusFilter === 'completed' && !isOngoing);
    return matchCluster && matchStatus;
  });
}

function setProjectsViewMode(mode) {
  state.projectViewMode = mode === 'graph' ? 'graph' : 'grid';
  const isGraph = state.projectViewMode === 'graph';

  document.querySelectorAll('[data-pview]').forEach(btn => {
    const active = btn.dataset.pview === state.projectViewMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const gridEl = document.getElementById('projects-list');
  const graphWrap = document.getElementById('projects-graph-wrapper');
  if (gridEl) gridEl.hidden = isGraph;
  if (graphWrap) graphWrap.hidden = !isGraph;

  if (isGraph && window.projectGraph) {
    requestAnimationFrame(() => {
      window.projectGraph.resize();
      window.projectGraph.rebuild(getFilteredProjects());
    });
  }
}

function renderProjectsView() {
  const { clusters } = state.data;

  const filterContainer = document.getElementById('project-cluster-filters');
  filterContainer.innerHTML = [
    `<button class="filter-pill ${state.projectClusterFilter === 'all' ? 'is-active' : ''}" data-pcluster="all">All Clusters</button>`,
    ...clusters.map(c => `
      <button class="filter-pill ${state.projectClusterFilter === c.cluster_id ? 'is-active' : ''}" data-pcluster="${escapeHtml(c.cluster_id)}">
        ${escapeHtml(c.short_name)}
      </button>
    `)
  ].join('');

  const filtered = getFilteredProjects();

  const listEl = document.getElementById('projects-list');
  listEl.innerHTML = filtered.length
    ? filtered.map(renderProjectCard).join('')
    : `<div class="empty-state">No projects match the selected filters yet.</div>`;

  if (window.projectGraph) {
    window.projectGraph.rebuild(filtered);
  }
}

function renderMembersView() {
  const { clusters, members } = state.data;

  const filterContainer = document.getElementById('member-cluster-filters');
  filterContainer.innerHTML = [
    `<button class="filter-pill ${state.memberClusterFilter === 'all' ? 'is-active' : ''}" data-mcluster="all">All Members (${members.length})</button>`,
    ...clusters.map(c => `
      <button class="filter-pill ${state.memberClusterFilter === c.cluster_id ? 'is-active' : ''}" data-mcluster="${escapeHtml(c.cluster_id)}">
        ${escapeHtml(c.short_name)}
      </button>
    `)
  ].join('');

  const filtered = members.filter(m =>
    state.memberClusterFilter === 'all' || m.cluster_ids.includes(state.memberClusterFilter)
  );

  const roleOrder = ['Lead', 'Co-Lead', 'Senior', 'Associate', 'Affiliate', 'Junior/Undergraduate'];
  const groups = {};
  filtered.forEach(m => {
    const role = m.role || 'Member';
    if (!groups[role]) groups[role] = [];
    groups[role].push(m);
  });

  const sortedRoles = Object.keys(groups).sort((a, b) => {
    const ia = roleOrder.indexOf(a);
    const ib = roleOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const dirEl = document.getElementById('members-list');
  dirEl.innerHTML = sortedRoles.length
    ? sortedRoles.map(role => `
        <section class="role-group">
          <h2 class="role-group-title">${escapeHtml(role)} (${groups[role].length})</h2>
          <div class="members-grid">
            ${groups[role].map(m => {
              const primaryCluster = m.cluster_ids.length ? getClusterById(m.cluster_ids[0]) : null;
              const ringColor = primaryCluster ? primaryCluster.accent_hex : 'var(--accent)';
              const initials = escapeHtml(getInitials(m.member_name));
              const chips = m.cluster_ids.map(cid => {
                const cl = getClusterById(cid);
                return cl
                  ? `<span class="cluster-chip" style="--chip-color:${escapeHtml(cl.accent_hex)}">${escapeHtml(cl.short_name)}</span>`
                  : '';
              }).join('');

              const avatarHtml = m.thumbnail_url
                ? `<div class="member-avatar" style="--avatar-accent:${escapeHtml(ringColor)}">
                     <img src="${escapeHtml(m.thumbnail_url)}"
                          alt="${escapeHtml(m.member_name)}"
                          loading="lazy"
                          onerror="this.parentElement.innerHTML='<span class=\'member-avatar-initials\'>${initials}</span>';" />
                   </div>`
                : `<div class="member-avatar is-fallback" style="--avatar-accent:${escapeHtml(ringColor)}">
                     <span class="member-avatar-initials">${initials}</span>
                   </div>`;

              const inner = `
                <div class="member-top">
                  <div class="member-identity">
                    ${avatarHtml}
                    <div>
                      <h3 class="member-name">${escapeHtml(m.member_name)}</h3>
                      <span class="member-role">${escapeHtml(m.role)}</span>
                    </div>
                  </div>
                  ${m.profile_url ? '<span class="member-arrow">↗</span>' : ''}
                </div>
                ${chips ? `<div class="member-clusters">${chips}</div>` : ''}
              `;

              return m.profile_url
                ? `<a href="${escapeHtml(m.profile_url)}" target="_blank" rel="noopener" class="member-card" data-cursor="PROFILE">${inner}</a>`
                : `<div class="member-card">${inner}</div>`;
            }).join('')}
          </div>
        </section>
      `).join('')
    : `<div class="empty-state">No members found for this cluster filter.</div>`;
}

function renderAll() {
  renderLanding();
  renderClustersView();
  renderProjectsView();
  renderMembersView();
}

/* ==========================================================================
   4. Project Quick-View Drawer
   ========================================================================== */

function openProjectDrawer(projectName) {
  const project = state.data.projects.find(p => p.project_name === projectName);
  if (!project) return;

  const primaryCluster = project.cluster_ids.length ? getClusterById(project.cluster_ids[0]) : null;
  const accent = primaryCluster ? primaryCluster.accent_hex : '#7ee0b8';
  const fallbackImg = generateProceduralCover(project.project_name, accent);
  const imgSrc = project.thumbnail_url || fallbackImg;
  const dateLabel = [project.start_date, project.end_date].filter(Boolean).join(' — ');

  document.getElementById('drawer-content').innerHTML = `
    <img class="drawer-cover"
         src="${escapeHtml(imgSrc)}"
         alt="${escapeHtml(project.project_name)}"
         onerror="this.onerror=null;this.src='${fallbackImg}';" />
    <div class="mono" style="color: var(--accent); margin-bottom: 0.5rem;">${escapeHtml(dateLabel)}</div>
    <h2 id="drawer-title" class="page-title" style="font-size: 2.5rem; margin-bottom: 1rem;">
      ${escapeHtml(project.project_name)}
    </h2>
    <p style="color: var(--text-muted); line-height: 1.75; margin-bottom: 1.75rem;">
      ${escapeHtml(project.brief_description)}
    </p>
    ${project.leads.length ? `
      <div style="margin-bottom: 1.25rem;">
        <span class="mono meta-block-label">LEAD INVESTIGATOR(S)</span>
        <div class="pill-list">${project.leads.map(renderPersonPill).join('')}</div>
      </div>
    ` : ''}
    ${project.members.length ? `
      <div style="margin-bottom: 1.5rem;">
        <span class="mono meta-block-label">PROJECT TEAM</span>
        <div class="pill-list">${project.members.map(renderPersonPill).join('')}</div>
      </div>
    ` : ''}
    ${project.related_projects && project.related_projects.length ? `
      <div style="margin-bottom: 2rem;">
        <span class="mono meta-block-label">RELATED PROJECTS</span>
        <div class="pill-list">${project.related_projects.map(renderRelatedProjectPill).join('')}</div>
      </div>
    ` : ''}
    ${project.external_url ? `
      <a href="${escapeHtml(project.external_url)}" target="_blank" rel="noopener" class="btn btn-primary">
        Open Full Project Website ↗
      </a>
    ` : ''}
  `;

  const drawer = document.getElementById('project-drawer');
  const panel = drawer.querySelector('.drawer-panel');
  if (panel) panel.scrollTop = 0;
  document.documentElement.classList.add('has-drawer-open');
  document.body.classList.add('has-drawer-open');
  if (state.lenis) state.lenis.stop();
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeProjectDrawer() {
  const drawer = document.getElementById('project-drawer');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('has-drawer-open');
  document.body.classList.remove('has-drawer-open');
  if (state.lenis) state.lenis.start();
}

/* ==========================================================================
   5. Hash Router & GSAP View Transitions
   ========================================================================== */

const ROUTE_THEME = {
  landing:  { color: '#7ee0b8', energy: 0.45 },
  clusters: { color: '#8ba6ff', energy: 0.72 },
  projects: { color: '#f6c177', energy: 0.60 },
  members:  { color: '#f59eb8', energy: 0.50 }
};

function navigateToRoute(routeName, instant = false) {
  const validRoutes = ['landing', 'clusters', 'projects', 'members'];
  const target = validRoutes.includes(routeName) ? routeName : 'landing';
  state.activeRoute = target;

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('is-active', link.dataset.route === target);
  });

  const theme = ROUTE_THEME[target];
  setAccentTheme(theme.color, theme.energy);

  const views = document.querySelectorAll('.page-view');
  const nextView = document.getElementById(`view-${target}`);

  const syncGraphOnEnter = () => {
    if (target === 'projects' && state.projectViewMode === 'graph' && window.projectGraph) {
      requestAnimationFrame(() => {
        window.projectGraph.resize();
        window.projectGraph.rebuild(getFilteredProjects());
      });
    }
  };

  if (instant || typeof gsap === 'undefined') {
    views.forEach(v => {
      v.hidden = v !== nextView;
      v.classList.toggle('is-active', v === nextView);
    });
    window.scrollTo(0, 0);
    syncGraphOnEnter();
    return;
  }

  const currentView = Array.from(views).find(v => !v.hidden);
  if (currentView === nextView) {
    syncGraphOnEnter();
    return;
  }

  gsap.to(currentView, {
    opacity: 0,
    y: -14,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      views.forEach(v => { v.hidden = true; v.classList.remove('is-active'); });
      nextView.hidden = false;
      nextView.classList.add('is-active');
      window.scrollTo(0, 0);
      syncGraphOnEnter();
      gsap.fromTo(nextView,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
      );
    }
  });
}

function handleHashChange() {
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  navigateToRoute(hash || 'landing');
}

function setAccentTheme(hexColor, energy = 0.55) {
  if (!hexColor) return;
  document.documentElement.style.setProperty('--accent', hexColor);
  state.shaderTargetColor.set(hexColor);
  state.shaderTargetEnergy = energy;
}

/* ==========================================================================
   6. Interactive Three.js GLSL Organic Field Backdrop
   ========================================================================== */

function initWebGLBackdrop() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uAccent: { value: new THREE.Color('#7ee0b8') },
    uSecondary: { value: new THREE.Color('#3b4d9b') },
    uEnergy: { value: 0.45 }
  };

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform vec3 uAccent;
    uniform vec3 uSecondary;
    uniform float uEnergy;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
      vec2 uv = vUv * aspect;
      vec2 mouse = uMouse * aspect;

      float distMouse = length(uv - mouse);
      float mousePull = smoothstep(0.65, 0.0, distMouse) * 0.25;

      float t = uTime * (0.14 + uEnergy * 0.12);
      vec2 q = vec2(
        fbm(uv * 1.45 + vec2(t, -t * 0.6)),
        fbm(uv * 1.45 + vec2(-t * 0.7, t * 0.8))
      );
      float field = fbm(uv * 1.8 + q * 2.1 - mousePull);

      float contour = smoothstep(0.03, 0.0, abs(fract(field * 6.0) - 0.5));

      vec3 baseBg = vec3(0.031, 0.035, 0.047);
      vec3 col = mix(baseBg, uSecondary * 0.42, smoothstep(0.25, 0.85, field));
      col = mix(col, uAccent * 0.36, smoothstep(0.48, 0.92, q.x + mousePull));
      col += uAccent * contour * 0.045;

      float vig = smoothstep(1.35, 0.25, length(vUv - 0.5));
      gl_FragColor = vec4(col * vig, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);

  const targetMouse = new THREE.Vector2(0.5, 0.5);
  window.addEventListener('pointermove', (e) => {
    targetMouse.x = e.clientX / window.innerWidth;
    targetMouse.y = 1.0 - (e.clientY / window.innerHeight);
  }, { passive: true });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!prefersReduced) {
      uniforms.uTime.value += clock.getDelta();
    }
    uniforms.uMouse.value.lerp(targetMouse, 0.06);
    uniforms.uAccent.value.lerp(state.shaderTargetColor, 0.04);
    uniforms.uEnergy.value += (state.shaderTargetEnergy - uniforms.uEnergy.value) * 0.04;
    renderer.render(scene, camera);
  }
  animate();
}

/* ==========================================================================
   6B. Interactive Force-Directed Project Relationship Graph
   ========================================================================== */

function initProjectGraph() {
  const canvas = document.getElementById('projects-graph-canvas');
  const stage = document.getElementById('projects-graph-stage');
  const tooltip = document.getElementById('projects-graph-tooltip');
  if (!canvas || !stage) return;

  const ctx = canvas.getContext('2d');
  const savedPositions = new Map(); // Preserves coordinates across filter/edge toggles

  const graph = {
    width: 900,
    height: 620,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    nodes: [],
    allEdges: [],
    visibleEdges: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    hoveredNode: null,
    draggedNode: null,
    isPanning: false,
    dragStartScreen: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 },
    pointerDownScreen: { x: 0, y: 0 },
    alpha: 1,

    resize() {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.width = rect.width;
      this.height = rect.height;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(this.width * this.dpr);
      canvas.height = Math.round(this.height * this.dpr);
    },

    screenToWorld(sx, sy) {
      return {
        x: (sx - this.width / 2 - this.panX) / this.zoom + this.width / 2,
        y: (sy - this.height / 2 - this.panY) / this.zoom + this.height / 2
      };
    },

    getProjectPeople(project) {
      const map = new Map();
      [...(project.leads || []), ...(project.members || [])].forEach(person => {
        const name = String(person?.member_name || '').trim();
        if (name) map.set(name.toLowerCase(), name);
      });
      return map;
    },

    rebuild(projectsList) {
      const projects = Array.isArray(projectsList) ? projectsList : [];
      const byName = new Map(projects.map(p => [p.project_name, p]));

      // Build all potential edges across the 3 relationship layers
      const rawEdges = [];
      const relatedPairs = new Set();

      // 1. Related Projects edges (directed where specified)
      projects.forEach(src => {
        (src.related_projects || []).forEach(ref => {
          const target = findProjectByRef(ref);
          if (!target || target.project_name === src.project_name || !byName.has(target.project_name)) return;

          const pairKey = [src.project_name, target.project_name].sort().join('||');
          if (relatedPairs.has(pairKey)) return;
          relatedPairs.add(pairKey);

          const reverseLinked = (target.related_projects || []).some(r => {
            const rev = findProjectByRef(r);
            return rev && rev.project_name === src.project_name;
          });

          rawEdges.push({
            source: src.project_name,
            target: target.project_name,
            type: 'related',
            bidirectional: reverseLinked,
            color: '#7ee0b8',
            label: 'Related Project'
          });
        });
      });

      // 2. Shared Team Members & 3. Shared Clusters edges
      for (let i = 0; i < projects.length; i++) {
        const a = projects[i];
        const peopleA = this.getProjectPeople(a);
        const clustersA = new Set(a.cluster_ids || []);

        for (let j = i + 1; j < projects.length; j++) {
          const b = projects[j];

          // Shared Team Members
          const peopleB = this.getProjectPeople(b);
          const sharedPeople = [];
          peopleA.forEach((displayName, key) => {
            if (peopleB.has(key)) sharedPeople.push(displayName);
          });

          if (sharedPeople.length > 0) {
            rawEdges.push({
              source: a.project_name,
              target: b.project_name,
              type: 'team',
              sharedPeople,
              weight: sharedPeople.length,
              color: '#f59eb8',
              label: `Shared Team: ${sharedPeople.join(', ')}`
            });
          }

          // Shared Clusters
          const sharedClusterObjs = (b.cluster_ids || [])
            .filter(cid => clustersA.has(cid))
            .map(cid => getClusterById(cid))
            .filter(Boolean);

          if (sharedClusterObjs.length > 0) {
            const names = sharedClusterObjs.map(c => c.short_name).join(' · ');
            rawEdges.push({
              source: a.project_name,
              target: b.project_name,
              type: 'cluster',
              sharedClusters: sharedClusterObjs,
              weight: sharedClusterObjs.length,
              color: sharedClusterObjs[0].accent_hex || '#8ba6ff',
              label: `Cluster: ${names}`
            });
          }
        }
      }

      this.allEdges = rawEdges;

      // Update edge count badges in toolbar
      const counts = { related: 0, team: 0, cluster: 0 };
      rawEdges.forEach(e => {
        if (counts[e.type] !== undefined) counts[e.type]++;
      });
      Object.entries(counts).forEach(([type, count]) => {
        const el = document.getElementById(`edge-count-${type}`);
        if (el) el.textContent = count;
      });

      // Create / preserve nodes
      const cx = this.width / 2;
      const cy = this.height / 2;
      const spread = Math.min(this.width, this.height) * 0.3;

      this.nodes = projects.map((project, idx) => {
        const existing = savedPositions.get(project.project_name);
        const angle = (idx / Math.max(projects.length, 1)) * Math.PI * 2;
        const primaryCluster = project.cluster_ids?.length ? getClusterById(project.cluster_ids[0]) : null;
        const accent = primaryCluster ? primaryCluster.accent_hex : '#7ee0b8';
        const isOngoing = String(project.end_date).toLowerCase() === 'ongoing' || !project.end_date;

        return {
          id: project.project_name,
          project,
          accent,
          isOngoing,
          x: existing ? existing.x : cx + Math.cos(angle) * spread * (0.65 + (idx % 3) * 0.2),
          y: existing ? existing.y : cy + Math.sin(angle) * spread * (0.65 + (idx % 3) * 0.2),
          vx: 0,
          vy: 0,
          radius: 11,
          degree: 0
        };
      });

      this.refreshVisibleEdges(true);
    },

    refreshVisibleEdges(reheat = false) {
      if (!state.graphShowEdges) {
        this.visibleEdges = [];
      } else {
        this.visibleEdges = this.allEdges.filter(e => Boolean(state.graphEdgeTypes[e.type]));
      }

      // Group parallel edges between the same pair of nodes so curves fan out cleanly
      const pairBuckets = new Map();
      this.visibleEdges.forEach(edge => {
        const key = [edge.source, edge.target].sort().join('||');
        if (!pairBuckets.has(key)) pairBuckets.set(key, []);
        pairBuckets.get(key).push(edge);
      });

      pairBuckets.forEach(bucket => {
        bucket.forEach((edge, idx) => {
          const centeredIndex = idx - (bucket.length - 1) / 2;
          edge.curveOffset = centeredIndex * 22;
        });
      });

      // Recalculate node degrees and radii based on active connections
      const degMap = new Map(this.nodes.map(n => [n.id, 0]));
      this.visibleEdges.forEach(e => {
        degMap.set(e.source, (degMap.get(e.source) || 0) + 1);
        degMap.set(e.target, (degMap.get(e.target) || 0) + 1);
      });

      this.nodes.forEach(n => {
        n.degree = degMap.get(n.id) || 0;
        n.radius = Math.min(10 + n.degree * 1.45, 24);
      });

      if (reheat) this.alpha = Math.max(this.alpha, 0.55);
    },

    relayout() {
      const cx = this.width / 2;
      const cy = this.height / 2;
      const spread = Math.min(this.width, this.height) * 0.28;

      this.nodes.forEach((n, idx) => {
        const angle = (idx / Math.max(this.nodes.length, 1)) * Math.PI * 2 + Math.random() * 0.4;
        n.x = cx + Math.cos(angle) * spread;
        n.y = cy + Math.sin(angle) * spread;
        n.vx = 0;
        n.vy = 0;
      });
      this.alpha = 1;
    },

    fitView() {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
    },

    stepForces() {
      if (this.alpha < 0.005 || this.nodes.length === 0) return;

      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
      const repulsion = 3600;
      const springK = 0.022;
      const targetDist = 145;
      const gravity = 0.014;
      const damping = 0.84;
      const cx = this.width / 2;
      const cy = this.height / 2;

      // Node-node repulsion
      for (let i = 0; i < this.nodes.length; i++) {
        const a = this.nodes[i];
        for (let j = i + 1; j < this.nodes.length; j++) {
          const b = this.nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = Math.max(dx * dx + dy * dy, 120);
          const dist = Math.sqrt(distSq);
          const force = (repulsion / distSq) * this.alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (a !== this.draggedNode) { a.vx -= fx; a.vy -= fy; }
          if (b !== this.draggedNode) { b.vx += fx; b.vy += fy; }
        }
      }

      // Spring attraction along active edges
      this.visibleEdges.forEach(edge => {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) return;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const desired = edge.type === 'related' ? targetDist * 0.85 : targetDist;
        const force = (dist - desired) * springK * this.alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (a !== this.draggedNode) { a.vx += fx; a.vy += fy; }
        if (b !== this.draggedNode) { b.vx -= fx; b.vy -= fy; }
      });

      // Center gravity & integration
      const pad = 44;
      this.nodes.forEach(n => {
        if (n === this.draggedNode) {
          savedPositions.set(n.id, { x: n.x, y: n.y });
          return;
        }
        n.vx += (cx - n.x) * gravity * this.alpha;
        n.vy += (cy - n.y) * gravity * this.alpha;
        n.vx *= damping;
        n.vy *= damping;

        n.x = Math.max(pad, Math.min(this.width - pad, n.x + n.vx));
        n.y = Math.max(pad, Math.min(this.height - pad, n.y + n.vy));
        savedPositions.set(n.id, { x: n.x, y: n.y });
      });

      this.alpha *= 0.985;
    },

    updateTooltip(screenX, screenY) {
      if (!this.hoveredNode || this.draggedNode) {
        tooltip.hidden = true;
        return;
      }

      const node = this.hoveredNode;
      const p = node.project;
      const clusters = (p.cluster_ids || [])
        .map(cid => getClusterById(cid)?.short_name || cid)
        .join(' · ');

      const connectedEdges = this.visibleEdges.filter(
        e => e.source === node.id || e.target === node.id
      );

      tooltip.innerHTML = `
        <div class="graph-tooltip-title">${escapeHtml(p.project_name)}</div>
        <div class="graph-tooltip-meta">
          ${clusters ? `<div>${escapeHtml(clusters)} · ${escapeHtml(p.end_date || 'Ongoing')}</div>` : ''}
          <div>${node.degree} visible connection${node.degree === 1 ? '' : 's'}</div>
        </div>
        ${connectedEdges.length ? `
          <div class="graph-tooltip-links">
            ${connectedEdges.slice(0, 4).map(e => {
              const other = e.source === node.id ? e.target : e.source;
              return `<div>→ ${escapeHtml(other)} <span style="opacity:0.7">(${escapeHtml(e.label)})</span></div>`;
            }).join('')}
            ${connectedEdges.length > 4 ? `<div>+ ${connectedEdges.length - 4} more</div>` : ''}
          </div>
        ` : ''}
      `;

      tooltip.hidden = false;
      const left = Math.min(screenX + 16, this.width - 305);
      const top = Math.min(screenY + 16, this.height - 150);
      tooltip.style.left = `${Math.max(12, left)}px`;
      tooltip.style.top = `${Math.max(12, top)}px`;
    },

    draw() {
      if (state.activeRoute !== 'projects' || state.projectViewMode !== 'graph') return;

      this.stepForces();

      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      ctx.clearRect(0, 0, this.width, this.height);

      // Subtle architectural grid dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
      const step = 36;
      for (let gx = step / 2; gx < this.width; gx += step) {
        for (let gy = step / 2; gy < this.height; gy += step) {
          ctx.fillRect(gx, gy, 1.2, 1.2);
        }
      }

      ctx.save();
      ctx.translate(this.width / 2 + this.panX, this.height / 2 + this.panY);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.width / 2, -this.height / 2);

      const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
      const hoveredId = this.hoveredNode ? this.hoveredNode.id : null;
      const connectedIds = new Set();

      if (hoveredId) {
        connectedIds.add(hoveredId);
        this.visibleEdges.forEach(e => {
          if (e.source === hoveredId) connectedIds.add(e.target);
          if (e.target === hoveredId) connectedIds.add(e.source);
        });
      }

      // Draw Edges
      this.visibleEdges.forEach(edge => {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) return;

        const isHighlighted = !hoveredId || edge.source === hoveredId || edge.target === hoveredId;

        // Use canonical node order for normal vector so parallel edges fan cleanly regardless of direction
        const [c1, c2] = a.id < b.id ? [a, b] : [b, a];
        const cdx = c2.x - c1.x;
        const cdy = c2.y - c1.y;
        const clen = Math.max(Math.hypot(cdx, cdy), 1);
        const nx = -cdy / clen;
        const ny = cdx / clen;

        const midX = (a.x + b.x) / 2 + nx * (edge.curveOffset || 0);
        const midY = (a.y + b.y) / 2 + ny * (edge.curveOffset || 0);

        ctx.save();
        ctx.globalAlpha = hoveredId ? (isHighlighted ? 0.92 : 0.08) : 0.48;
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = isHighlighted && hoveredId
          ? 2.2
          : (edge.weight ? Math.min(1.2 + edge.weight * 0.45, 2.8) : 1.4);

        if (edge.type === 'related') {
          ctx.setLineDash([6, 5]);
        } else if (edge.type === 'team') {
          ctx.setLineDash([2, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(midX, midY, b.x, b.y);
        ctx.stroke();

        // Directional arrow(s) for Related Projects
        if (edge.type === 'related') {
          ctx.setLineDash([]);
          const drawArrowHead = (fromX, fromY, targetNode) => {
            const angle = Math.atan2(targetNode.y - fromY, targetNode.x - fromX);
            const tipX = targetNode.x - Math.cos(angle) * (targetNode.radius + 5);
            const tipY = targetNode.y - Math.sin(angle) * (targetNode.radius + 5);
            const arrowLen = 7;

            ctx.fillStyle = edge.color;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - arrowLen * Math.cos(angle - 0.42), tipY - arrowLen * Math.sin(angle - 0.42));
            ctx.lineTo(tipX - arrowLen * Math.cos(angle + 0.42), tipY - arrowLen * Math.sin(angle + 0.42));
            ctx.closePath();
            ctx.fill();
          };

          drawArrowHead(midX, midY, b);
          if (edge.bidirectional) {
            drawArrowHead(midX, midY, a);
          }
        }

        ctx.restore();
      });

      // Draw Nodes
      this.nodes.forEach(node => {
        const isHovered = hoveredId === node.id;
        const isNeighbor = !hoveredId || connectedIds.has(node.id);

        ctx.save();
        ctx.globalAlpha = isNeighbor ? 1 : 0.18;

        // Ongoing outer halo
        if (node.isOngoing) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = node.accent;
          ctx.globalAlpha = isNeighbor ? 0.28 : 0.06;
          ctx.lineWidth = 1.25;
          ctx.stroke();
          ctx.globalAlpha = isNeighbor ? 1 : 0.18;
        }

        // Node body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? node.accent : '#131722';
        ctx.fill();
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeStyle = node.accent;
        ctx.stroke();

        // Project label
        ctx.font = isHovered
          ? '600 12px "Plus Jakarta Sans", sans-serif'
          : '500 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(242, 239, 233, 0.88)';
        ctx.fillText(node.project.project_name, node.x, node.y + node.radius + 8);

        ctx.restore();
      });

      ctx.restore();
      ctx.restore();
    }
  };

  // Pointer & Wheel Interactions
  canvas.addEventListener('pointerdown', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = graph.screenToWorld(sx, sy);

    graph.pointerDownScreen = { x: sx, y: sy };
    canvas.setPointerCapture(e.pointerId);

    // Hit-test nodes (reverse order so top-most node wins)
    for (let i = graph.nodes.length - 1; i >= 0; i--) {
      const n = graph.nodes[i];
      if (Math.hypot(world.x - n.x, world.y - n.y) <= n.radius + 6) {
        graph.draggedNode = n;
        canvas.classList.add('is-dragging');
        return;
      }
    }

    graph.isPanning = true;
    graph.dragStartScreen = { x: sx, y: sy };
    graph.panStart = { x: graph.panX, y: graph.panY };
    canvas.classList.add('is-dragging');
  });

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = graph.screenToWorld(sx, sy);

    if (graph.draggedNode) {
      graph.draggedNode.x = world.x;
      graph.draggedNode.y = world.y;
      graph.draggedNode.vx = 0;
      graph.draggedNode.vy = 0;
      savedPositions.set(graph.draggedNode.id, { x: world.x, y: world.y });
      graph.alpha = Math.max(graph.alpha, 0.15);
      tooltip.hidden = true;
      return;
    }

    if (graph.isPanning) {
      graph.panX = graph.panStart.x + (sx - graph.dragStartScreen.x);
      graph.panY = graph.panStart.y + (sy - graph.dragStartScreen.y);
      tooltip.hidden = true;
      return;
    }

    // Hover detection
    let hit = null;
    for (let i = graph.nodes.length - 1; i >= 0; i--) {
      const n = graph.nodes[i];
      if (Math.hypot(world.x - n.x, world.y - n.y) <= n.radius + 6) {
        hit = n;
        break;
      }
    }

    if (hit !== graph.hoveredNode) {
      graph.hoveredNode = hit;
      canvas.classList.toggle('is-pointer', Boolean(hit));
      if (hit) setAccentTheme(hit.accent, 0.72);
    }

    graph.updateTooltip(sx, sy);
  });

  canvas.addEventListener('pointerup', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const moved = Math.hypot(sx - graph.pointerDownScreen.x, sy - graph.pointerDownScreen.y);

    if (graph.draggedNode && moved < 5) {
      openProjectDrawer(graph.draggedNode.id);
    }

    graph.draggedNode = null;
    graph.isPanning = false;
    canvas.classList.remove('is-dragging');
  });

  canvas.addEventListener('pointerleave', () => {
    if (!graph.draggedNode && !graph.isPanning) {
      graph.hoveredNode = null;
      tooltip.hidden = true;
      canvas.classList.remove('is-pointer');
    }
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    graph.zoom = Math.max(0.35, Math.min(2.6, graph.zoom * factor));
  }, { passive: false });

  window.addEventListener('resize', () => {
    if (state.activeRoute === 'projects' && state.projectViewMode === 'graph') {
      graph.resize();
    }
  });

  function animateGraph() {
    requestAnimationFrame(animateGraph);
    graph.draw();
  }
  animateGraph();

  window.projectGraph = graph;
}

/* ==========================================================================
   7. Custom Cursor, Smooth Scroll (Lenis) & Event Delegation
   ========================================================================== */

function initCursorAndInteractions() {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const label = document.getElementById('cursor-label');

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;

    const interactive = e.target.closest('[data-cursor], a, button');
    if (interactive) {
      ring.classList.add('is-expanded');
      label.textContent = interactive.dataset.cursor || '';
    } else {
      ring.classList.remove('is-expanded');
      label.textContent = '';
    }
  }, { passive: true });

  function tickCursor() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(tickCursor);
  }
  tickCursor();

  document.addEventListener('click', (e) => {
    const projectBtn = e.target.closest('[data-open-project]');
    if (projectBtn) {
      openProjectDrawer(projectBtn.dataset.openProject);
      return;
    }

    const pClusterBtn = e.target.closest('[data-pcluster]');
    if (pClusterBtn) {
      state.projectClusterFilter = pClusterBtn.dataset.pcluster;
      renderProjectsView();
      return;
    }

    const pStatusBtn = e.target.closest('[data-status]');
    if (pStatusBtn) {
      state.projectStatusFilter = pStatusBtn.dataset.status;
      document.querySelectorAll('[data-status]').forEach(b =>
        b.classList.toggle('is-active', b === pStatusBtn)
      );
      renderProjectsView();
      return;
    }

    const mClusterBtn = e.target.closest('[data-mcluster]');
    if (mClusterBtn) {
      state.memberClusterFilter = mClusterBtn.dataset.mcluster;
      renderMembersView();
      return;
    }

    // Grid / Graph view toggle
    const pViewBtn = e.target.closest('[data-pview]');
    if (pViewBtn) {
      setProjectsViewMode(pViewBtn.dataset.pview);
      return;
    }

    // Master Connections On/Off toggle
    const toggleAllBtn = e.target.closest('#graph-toggle-all-edges');
    if (toggleAllBtn) {
      state.graphShowEdges = !state.graphShowEdges;
      toggleAllBtn.classList.toggle('is-active', state.graphShowEdges);
      toggleAllBtn.setAttribute('aria-pressed', String(state.graphShowEdges));
      toggleAllBtn.innerHTML = `<span class="edge-master-indicator"></span> Connections: ${state.graphShowEdges ? 'ON' : 'OFF'}`;

      const group = document.getElementById('graph-edge-toggles');
      if (group) group.classList.toggle('is-disabled', !state.graphShowEdges);

      if (window.projectGraph) window.projectGraph.refreshVisibleEdges(true);
      return;
    }

    // Individual Edge Type toggles (Related / Team / Clusters)
    const edgeTypeBtn = e.target.closest('[data-edge-type]');
    if (edgeTypeBtn) {
      const type = edgeTypeBtn.dataset.edgeType;
      state.graphEdgeTypes[type] = !state.graphEdgeTypes[type];
      edgeTypeBtn.classList.toggle('is-active', state.graphEdgeTypes[type]);
      edgeTypeBtn.setAttribute('aria-pressed', String(state.graphEdgeTypes[type]));

      if (window.projectGraph) window.projectGraph.refreshVisibleEdges(true);
      return;
    }

    // Graph viewport buttons
    if (e.target.closest('#graph-zoom-in') && window.projectGraph) {
      window.projectGraph.zoom = Math.min(2.6, window.projectGraph.zoom * 1.2);
      return;
    }
    if (e.target.closest('#graph-zoom-out') && window.projectGraph) {
      window.projectGraph.zoom = Math.max(0.35, window.projectGraph.zoom * 0.82);
      return;
    }
    if (e.target.closest('#graph-zoom-reset') && window.projectGraph) {
      window.projectGraph.fitView();
      return;
    }
    if (e.target.closest('#graph-relayout') && window.projectGraph) {
      window.projectGraph.relayout();
      return;
    }
  });

  document.addEventListener('pointerover', (e) => {
    const accentCard = e.target.closest('[data-accent]');
    if (accentCard && accentCard.dataset.accent) {
      setAccentTheme(accentCard.dataset.accent, 0.72);
    }
  });

  document.getElementById('drawer-close').addEventListener('click', closeProjectDrawer);
  document.getElementById('project-drawer').addEventListener('click', (e) => {
    if (e.target.id === 'project-drawer') closeProjectDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProjectDrawer();
  });

  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    state.lenis = lenis;
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
}

/* ==========================================================================
   8. Bootstrap
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initProjectGraph();
  renderAll();
  const initialHash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  navigateToRoute(initialHash || 'landing', true);

  window.addEventListener('hashchange', handleHashChange);
  initWebGLBackdrop();
  initCursorAndInteractions();
  syncData();
});
