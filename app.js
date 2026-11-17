/**
 * Creative Systems & Futures (CSFS) — Frontend Application
 * Connects to Google Apps Script JSON API, renders 4 hash-routed views,
 * and drives a reactive Three.js GLSL shader field + GSAP choreography.
 */

const CONFIG = {
  // Paste your deployed Google Apps Script Web App URL here (or pass ?api=URL in the browser address bar)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyTZOwNlNMcZVXyiZhRX4TZ6mOGUylgUZJVuGxwxwdsxDxiOUXeiUoAxwUjgoSmYqoG/exec',
  STORAGE_KEY: 'csfs_studio_data_v1'
};

// Default studio dataset (renders immediately while live Apps Script data syncs)
const FALLBACK_DATA = {
  landing: {
    title: 'YOOBOOO YOOO YOOHOO Creative Systems & Futures',
    tagline: 'Bridging artistic production, systems thinking, and applied futures research.',
    about: 'The Creative Systems & Futures studio is the Faculty of Information and Communication Studies’ platform for artistic and speculative research. It advances practice-led inquiry as a method for investigating complex social, technological, and ecological systems—positioning creative production not as peripheral cultural output but as a mode of systems research.',
    unit_url: 'https://fics.upou.edu.ph',
    contact_email: 'fics@upou.edu.ph'
  },
  clusters: [
    {
      cluster_id: 'cl_eess',
      name: 'Embodied Ecologies & Speculative Systems',
      short_name: 'EESS',
      facilitator: 'Diego S. Maranan',
      keywords: ['embodiment', 'ecological systems', 'artscience', 'futures literacy', 'speculative design', 'bio-art', 'regenerative design'],
      description: 'Embodied Ecologies & Speculative Systems (EESS) integrates complexity science, technology design, and somatic perspectives to explore human–nonhuman entanglements, embodied cognition, and multiscalar ecological systems.',
      accent_hex: '#7ee0b8'
    },
    {
      cluster_id: 'cl_gmdc',
      name: 'Gender, Media & Digital Cultures',
      short_name: 'GMDC',
      facilitator: 'Alice Sarmiento',
      keywords: ['feminist/queer media', 'postcolonial critique', 'platform cultures', 'algorithmic desire', 'digital intimacy'],
      description: 'Gender, Media & Digital Cultures examines platform ecologies, algorithmic mediation, and intersectional digital identities through critical and artistic research.',
      accent_hex: '#f59eb8'
    },
    {
      cluster_id: 'cl_nat',
      name: 'Narrative, Aesthetics & Transmedia',
      short_name: 'NAT',
      facilitator: 'Benny Agapito',
      keywords: ['narrative aesthetics', 'film & television', 'transmedia storytelling', 'AR/XR', 'immersive media', 'worldbuilding'],
      description: 'Narrative, Aesthetics & Transmedia explores speculative storytelling, experimental film, interactive narrative, and worldbuilding as tools for reimagining communicative futures.',
      accent_hex: '#8ba6ff'
    },
    {
      cluster_id: 'cl_dcsi',
      name: 'Design, Communication & Social Innovation',
      short_name: 'DCSI',
      facilitator: 'Ruth Rodriguez',
      keywords: ['communication design', 'media arts', 'participatory futures', 'UI/UX', 'service design', 'social innovation'],
      description: 'Design, Communication & Social Innovation advances practice-led design research in participatory futures, and communication-driven transformation, particularly in industry and community contexts.',
      accent_hex: '#f6c177'
    }
  ],
  projects: [
    {
      project_name: 'Bukas Lab',
      start_date: '2022-01-01',
      end_date: 'Ongoing',
      brief_description: 'The Bukas Lab is a physical space and collaboration platform operated by the UP Open University (UPOU) Faculty of Information and Communication Studies, in partnership with Space Ecologies Art and Design (SEADS) and Curiosity.',
      display_order: 1,
      thumbnail_url: '',
      external_url: 'https://bukas.upou.edu.ph',
      cluster_ids: ['cl_eess', 'cl_dcsi'],
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
    { member_name: 'Diego S. Maranan', profile_url: 'https://fics.upou.edu.ph/diego-maranan/', role: 'Lead', cluster_ids: ['cl_eess'] },
    { member_name: 'Shari San Pablo', profile_url: 'https://fics.upou.edu.ph/faculty-prev/shari-eunice-t-san-pablo/', role: 'Co-Lead', cluster_ids: ['cl_eess'] },
    { member_name: 'Alice Sarmiento', profile_url: '', role: 'Senior', cluster_ids: ['cl_gmdc'] },
    { member_name: 'Benny Agapito', profile_url: '', role: 'Senior', cluster_ids: ['cl_nat'] },
    { member_name: 'Ruth Rodriguez', profile_url: '', role: 'Senior', cluster_ids: ['cl_dcsi'] },
    { member_name: 'Aleana Beato', profile_url: '', role: 'Junior/Undergraduate', cluster_ids: ['cl_eess'] }
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
  shaderTargetColor: new THREE.Color('#7ee0b8'),
  shaderTargetEnergy: 0.45
};

/* ==========================================================================
   1. Data Normalization & Google Apps Script Sync
   ========================================================================== */

function getApiUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('api') || CONFIG.APPS_SCRIPT_URL;
}

function normalizePayload(raw) {
  if (!raw || typeof raw !== 'object') return structuredClone(FALLBACK_DATA);

  // Merge landing safely (handles accidental reversed key/value rows in Sheets)
  const landing = { ...FALLBACK_DATA.landing };
  if (raw.landing && typeof raw.landing === 'object') {
    Object.entries(raw.landing).forEach(([k, v]) => {
      const key = String(k || '').trim();
      const val = String(v || '').trim();
      if (['title', 'tagline', 'about', 'unit_url', 'contact_email'].includes(key) && val) {
        landing[key] = val;
      } else if (['title', 'tagline', 'about', 'unit_url', 'contact_email'].includes(val) && key) {
        landing[val] = key;
      }
    });
  }

  // Normalize members first so we can resolve facilitator slugs
  const members = Array.isArray(raw.members) && raw.members.length
    ? raw.members.map(m => ({
        member_name: String(m.member_name || '').trim(),
        profile_url: String(m.profile_url || '').trim(),
        role: String(m.role || 'Member').trim(),
        cluster_ids: Array.isArray(m.cluster_ids) ? m.cluster_ids : []
      }))
    : structuredClone(FALLBACK_DATA.members);

  // Build slug -> member map ("diego_maranan" -> Diego S. Maranan)
  const slugToMember = {};
  members.forEach(m => {
    const clean = m.member_name.toLowerCase().replace(/\s+[a-z]\.\s+/g, ' ');
    const slug = clean.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    slugToMember[slug] = m;
    slugToMember[m.member_name.toLowerCase()] = m;
  });

  // Normalize clusters (auto-generates short_name, accent_hex, and resolves facilitator names)
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

    const facRaw = String(c.facilitator || '').trim();
    const facMatch = slugToMember[facRaw.toLowerCase()];
    const facilitatorName = facMatch
      ? facMatch.member_name
      : facRaw.replace(/_/g, ' ').replace(/\w/g, ch => ch.toUpperCase());

    // Ensure facilitator is also associated with this cluster in memory if cluster_ids were empty
    if (facMatch && !facMatch.cluster_ids.includes(id)) {
      facMatch.cluster_ids.push(id);
    }

    return {
      cluster_id: id,
      name,
      short_name: String(c.short_name || '').trim() || generatedShort,
      facilitator: facilitatorName,
      facilitator_url: facMatch ? facMatch.profile_url : '',
      keywords: Array.isArray(c.keywords) ? c.keywords : [],
      description: String(c.description || '').trim(),
      accent_hex: String(c.accent_hex || '').trim() || DEFAULT_CLUSTER_PALETTE[idx % DEFAULT_CLUSTER_PALETTE.length]
    };
  });

  // Use live projects if populated, otherwise preserve fallback sample so the UI is never blank
  const projects = Array.isArray(raw.projects) && raw.projects.length
    ? raw.projects.map(p => ({
        project_name: String(p.project_name || '').trim(),
        start_date: String(p.start_date || '').trim(),
        end_date: String(p.end_date || '').trim(),
        brief_description: String(p.brief_description || '').trim(),
        display_order: Number(p.display_order) || 999,
        thumbnail_url: String(p.thumbnail_url || '').trim(),
        external_url: String(p.external_url || '').trim(),
        cluster_ids: Array.isArray(p.cluster_ids) ? p.cluster_ids : [],
        leads: Array.isArray(p.leads) ? p.leads : [],
        members: Array.isArray(p.members) ? p.members : []
      })).sort((a, b) => a.display_order - b.display_order)
    : structuredClone(FALLBACK_DATA.projects);

  return { landing, clusters, projects, members };
}

async function syncData() {
  const statusDot = document.getElementById('sync-dot');
  const statusText = document.getElementById('sync-status');

  // 1. Hydrate from localStorage immediately if cached
  try {
    const cached = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (cached) {
      state.data = normalizePayload(JSON.parse(cached));
      renderAll();
    }
  } catch (_) {}

  // 2. Fetch live Google Apps Script endpoint if configured
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

  document.getElementById('hero-tagline').textContent = landing.tagline;
  document.getElementById('hero-about').textContent = landing.about;
  document.getElementById('footer-unit-link').href = landing.unit_url;
  document.getElementById('footer-email-link').href = `mailto:${landing.contact_email}`;

  // 4-Cluster Interactive Strip
  const clustersContainer = document.getElementById('landing-clusters');
  clustersContainer.innerHTML = clusters.map((c, idx) => `
    <a href="#/clusters"
       class="cluster-mini-card"
       style="--card-accent: ${escapeHtml(c.accent_hex)}"
       data-accent="${escapeHtml(c.accent_hex)}"
       data-cursor="CLUSTER">
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
    </a>
  `).join('');

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

    return `
      <article class="cluster-detail-card"
               style="--card-accent: ${escapeHtml(c.accent_hex)}"
               data-accent="${escapeHtml(c.accent_hex)}">
        <div class="cluster-detail-grid">
          <div>
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
              <span class="mono meta-block-label">CLUSTER FACILITATOR</span>
              <div class="pill-list">
                ${c.facilitator
                  ? renderPersonPill({ member_name: c.facilitator, profile_url: c.facilitator_url })
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

function renderProjectsView() {
  const { clusters, projects } = state.data;

  // Cluster filter pills
  const filterContainer = document.getElementById('project-cluster-filters');
  filterContainer.innerHTML = [
    `<button class="filter-pill ${state.projectClusterFilter === 'all' ? 'is-active' : ''}" data-pcluster="all">All Clusters</button>`,
    ...clusters.map(c => `
      <button class="filter-pill ${state.projectClusterFilter === c.cluster_id ? 'is-active' : ''}" data-pcluster="${escapeHtml(c.cluster_id)}">
        ${escapeHtml(c.short_name)}
      </button>
    `)
  ].join('');

  // Filter projects
  const filtered = projects.filter(p => {
    const matchCluster = state.projectClusterFilter === 'all' || p.cluster_ids.includes(state.projectClusterFilter);
    const isOngoing = String(p.end_date).toLowerCase() === 'ongoing' || !p.end_date;
    const matchStatus =
      state.projectStatusFilter === 'all' ||
      (state.projectStatusFilter === 'ongoing' && isOngoing) ||
      (state.projectStatusFilter === 'completed' && !isOngoing);
    return matchCluster && matchStatus;
  });

  const listEl = document.getElementById('projects-list');
  listEl.innerHTML = filtered.length
    ? filtered.map(renderProjectCard).join('')
    : `<div class="empty-state">No projects match the selected filters yet.</div>`;
}

function renderMembersView() {
  const { clusters, members } = state.data;

  // Filter bar
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

  // Group by role hierarchy
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
              const chips = m.cluster_ids.map(cid => {
                const cl = getClusterById(cid);
                return cl
                  ? `<span class="cluster-chip" style="--chip-color:${escapeHtml(cl.accent_hex)}">${escapeHtml(cl.short_name)}</span>`
                  : '';
              }).join('');

              const inner = `
                <div class="member-top">
                  <div>
                    <h3 class="member-name">${escapeHtml(m.member_name)}</h3>
                    <span class="member-role">${escapeHtml(m.role)}</span>
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
      <div style="margin-bottom: 2rem;">
        <span class="mono meta-block-label">PROJECT TEAM</span>
        <div class="pill-list">${project.members.map(renderPersonPill).join('')}</div>
      </div>
    ` : ''}
    ${project.external_url ? `
      <a href="${escapeHtml(project.external_url)}" target="_blank" rel="noopener" class="btn btn-primary">
        Open Full Project Website ↗
      </a>
    ` : ''}
  `;

  const drawer = document.getElementById('project-drawer');
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeProjectDrawer() {
  const drawer = document.getElementById('project-drawer');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
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

  // Update active nav pills
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('is-active', link.dataset.route === target);
  });

  // Shift WebGL shader palette
  const theme = ROUTE_THEME[target];
  setAccentTheme(theme.color, theme.energy);

  const views = document.querySelectorAll('.page-view');
  const nextView = document.getElementById(`view-${target}`);

  if (instant || typeof gsap === 'undefined') {
    views.forEach(v => {
      v.hidden = v !== nextView;
      v.classList.toggle('is-active', v === nextView);
    });
    window.scrollTo(0, 0);
    return;
  }

  const currentView = Array.from(views).find(v => !v.hidden);
  if (currentView === nextView) return;

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

    // Smooth 2D value noise
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

      // Subtle topographic contour rings
      float contour = smoothstep(0.03, 0.0, abs(fract(field * 6.0) - 0.5));

      vec3 baseBg = vec3(0.031, 0.035, 0.047);
      vec3 col = mix(baseBg, uSecondary * 0.42, smoothstep(0.25, 0.85, field));
      col = mix(col, uAccent * 0.36, smoothstep(0.48, 0.92, q.x + mousePull));
      col += uAccent * contour * 0.045;

      // Soft vignette
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

  // Delegated clicks & hovers
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
  });

  // Hovering a cluster card shifts the live WebGL accent color
  document.addEventListener('pointerover', (e) => {
    const accentCard = e.target.closest('[data-accent]');
    if (accentCard && accentCard.dataset.accent) {
      setAccentTheme(accentCard.dataset.accent, 0.72);
    }
  });

  // Drawer close handlers
  document.getElementById('drawer-close').addEventListener('click', closeProjectDrawer);
  document.getElementById('project-drawer').addEventListener('click', (e) => {
    if (e.target.id === 'project-drawer') closeProjectDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProjectDrawer();
  });

  // Initialize Lenis smooth scroll if available
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
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
  renderAll();
  const initialHash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  navigateToRoute(initialHash || 'landing', true);

  window.addEventListener('hashchange', handleHashChange);
  initWebGLBackdrop();
  initCursorAndInteractions();
  syncData();
});
