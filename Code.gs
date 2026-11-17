/**
 * Creative Systems & Futures (CSFS) — JSON API Endpoint
 * Reads Site_Config/Landing, Clusters, Projects, and Members tabs
 * with case-insensitive tab & column matching and flexible key-value parsing.
 */

const TAB_ALIASES = {
  projects: ['Projects', 'CSFS_projects', 'CSFS Projects', '2026_11_CSFS_projects'],
  members:  ['Members', 'CSFS_members', '2026_11_Members'],
  clusters: ['Clusters', 'CSFS_clusters', '2026_11_Clusters'],
  landing:  ['Site_Config', 'Landing', 'Overview', 'Config']
};

const KNOWN_LANDING_KEYS = [
  'title', 'hero_title',
  'tagline', 'hero_tagline',
  'about', 'about_short', 'description', 'overview',
  'unit_url', 'website_url',
  'contact_email', 'email'
];

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();

  const projectsSheet = getSheetByAliases_(ss, TAB_ALIASES.projects);
  const membersSheet  = getSheetByAliases_(ss, TAB_ALIASES.members);
  const clustersSheet = getSheetByAliases_(ss, TAB_ALIASES.clusters);
  const landingSheet  = getSheetByAliases_(ss, TAB_ALIASES.landing);

  const rawProjects = sheetToObjects_(projectsSheet, tz);
  const rawMembers  = sheetToObjects_(membersSheet, tz);
  const rawClusters = sheetToObjects_(clustersSheet, tz);
  const landing     = parseLandingSheet_(landingSheet);

  // 1. Normalize Members (including thumbnail_url)
  const memberMap = {};
  const members = rawMembers
    .map(m => {
      const name = firstNonEmpty_(m, ['member_name', 'name', 'full_name', 'member']);
      if (!name) return null;

      const profileUrl   = firstNonEmpty_(m, ['url_for_more_information', 'profile_url', 'url', 'link', 'website', 'linkedin']);
      const role         = firstNonEmpty_(m, ['membership_type_status', 'role', 'role_tier', 'status', 'position', 'type']);
      const clusterRaw   = firstNonEmpty_(m, ['clusters', 'cluster', 'cluster_id', 'cluster_ids', 'affiliated_clusters', 'cluster_assignment', 'cluster_assignments']);
      const thumbnailUrl = firstNonEmpty_(m, ['thumbnail_url', 'url_for_thumbnail_image', 'thumbnail', 'photo_url', 'avatar_url', 'image_url', 'image']);
      const clusterIds   = parseChipList_(clusterRaw);

      const normalized = {
        member_name: name,
        profile_url: profileUrl,
        role: role,
        cluster_ids: clusterIds,
        thumbnail_url: thumbnailUrl
      };

      memberMap[name.toLowerCase()] = normalized;
      const withoutMiddleInitial = name.replace(/\s+[A-Z]\.\s+/g, ' ').toLowerCase();
      if (!memberMap[withoutMiddleInitial]) {
        memberMap[withoutMiddleInitial] = normalized;
      }

      return normalized;
    })
    .filter(Boolean);

  // 2. Normalize Projects (including related_projects)
  const resolvePerson = (name) => {
    const key = name.toLowerCase();
    const withoutMiddle = name.replace(/\s+[A-Z]\.\s+/g, ' ').toLowerCase();
    const match = memberMap[key] || memberMap[withoutMiddle];
    return match
      ? { member_name: match.member_name, profile_url: match.profile_url, role: match.role }
      : { member_name: name, profile_url: '', role: '' };
  };

  const projects = rawProjects
    .map(p => {
      const projectName = firstNonEmpty_(p, [
        'project_name', 'name', 'title', 'project', 'project_title', 'initiative', 'initiative_name'
      ]);
      if (!projectName) return null;

      const startDate   = firstNonEmpty_(p, ['start_date', 'start', 'date_started']);
      const endDate     = firstNonEmpty_(p, ['end_date', 'end', 'date_ended']);
      const statusText  = firstNonEmpty_(p, ['status', 'project_status']);
      const description = firstNonEmpty_(p, ['brief_description', 'description', 'summary', 'about', 'abstract']);
      const orderRaw    = firstNonEmpty_(p, ['display_order', 'order', 'sort_order', 'priority']);
      const thumbUrl    = firstNonEmpty_(p, ['url_for_thumbnail_image', 'thumbnail_url', 'thumbnail', 'image_url', 'image', 'cover_url']);
      const externalUrl = firstNonEmpty_(p, ['external_url_for_full_project_details', 'external_url', 'url', 'link', 'project_url', 'website']);
      const leadsRaw    = firstNonEmpty_(p, ['name_of_lead_investigator', 'lead_investigators', 'lead_investigator', 'leads', 'lead', 'pi']);
      const membersRaw  = firstNonEmpty_(p, ['members', 'team', 'team_members', 'collaborators']);
      const clustersRaw = firstNonEmpty_(p, ['clusters', 'cluster', 'cluster_id', 'cluster_ids', 'affiliated_clusters']);
      const relatedRaw  = firstNonEmpty_(p, ['related_projects', 'related_project', 'related', 'linked_projects']);

      const orderVal = Number(orderRaw);

      return {
        project_name: projectName,
        start_date: startDate,
        end_date: endDate || statusText,
        brief_description: description,
        display_order: Number.isFinite(orderVal) && orderRaw !== '' ? orderVal : 999,
        thumbnail_url: thumbUrl,
        external_url: externalUrl,
        cluster_ids: parseChipList_(clustersRaw),
        leads: parseChipList_(leadsRaw).map(resolvePerson),
        members: parseChipList_(membersRaw).map(resolvePerson),
        related_projects: parseChipList_(relatedRaw)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.display_order - b.display_order);

  // 3. Normalize Clusters (including thumbnail_url)
  const clusters = rawClusters
    .map(c => {
      const clusterId = firstNonEmpty_(c, ['cluster_id', 'id', 'slug']);
      const name      = firstNonEmpty_(c, ['name', 'cluster_name', 'title']);
      if (!clusterId && !name) return null;

      return {
        cluster_id: clusterId,
        name: name,
        short_name: firstNonEmpty_(c, ['short_name', 'acronym', 'code']),
        facilitator: firstNonEmpty_(c, ['facilitator', 'facilitators', 'lead', 'cluster_lead']),
        keywords: parseChipList_(firstNonEmpty_(c, ['keywords', 'tags', 'topics'])),
        description: firstNonEmpty_(c, ['description', 'summary', 'about']),
        accent_hex: firstNonEmpty_(c, ['accent_hex', 'color', 'accent_color', 'hex']),
        thumbnail_url: firstNonEmpty_(c, ['thumbnail_url', 'url_for_thumbnail_image', 'thumbnail', 'image_url', 'image', 'cover_url'])
      };
    })
    .filter(Boolean);

  const payload = {
    updated_at: new Date().toISOString(),
    landing,
    clusters,
    projects,
    members,
    _debug: {
      all_tabs_in_sheet: ss.getSheets().map(s => s.getName()),
      matched_tabs: {
        landing:  landingSheet  ? landingSheet.getName()  : null,
        clusters: clustersSheet ? clustersSheet.getName() : null,
        projects: projectsSheet ? projectsSheet.getName() : null,
        members:  membersSheet  ? membersSheet.getName()  : null
      },
      detected_headers: {
        projects: getNormalizedHeaders_(projectsSheet),
        members:  getNormalizedHeaders_(membersSheet),
        clusters: getNormalizedHeaders_(clustersSheet)
      }
    }
  };

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function firstNonEmpty_(obj, candidateKeys) {
  for (let i = 0; i < candidateKeys.length; i++) {
    const val = obj[candidateKeys[i]];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function getSheetByAliases_(ss, candidateNames) {
  const sheets = ss.getSheets();
  const normalizedCandidates = candidateNames.map(n => n.trim().toLowerCase());

  for (let i = 0; i < normalizedCandidates.length; i++) {
    const target = normalizedCandidates[i];
    const found = sheets.find(s => s.getName().trim().toLowerCase() === target);
    if (found) return found;
  }
  return null;
}

function parseLandingSheet_(sheet) {
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  const config = {};

  rows.forEach((row, idx) => {
    const colA = String(row[0] ?? '').trim();
    const colB = String(row[1] ?? '').trim();
    if (!colA && !colB) return;

    if (idx === 0 && ['key', 'field', 'setting', 'parameter'].includes(colA.toLowerCase())) {
      return;
    }

    if (KNOWN_LANDING_KEYS.includes(colB.toLowerCase()) && !KNOWN_LANDING_KEYS.includes(colA.toLowerCase())) {
      config[colB.toLowerCase()] = colA;
    } else {
      config[colA.toLowerCase()] = colB;
    }
  });

  if (config.about_short && !config.about) {
    config.about = config.about_short;
  }

  return config;
}

function getNormalizedHeaders_(sheet) {
  if (!sheet) return [];
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  const row1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return row1.map(h =>
    String(h)
      .trim()
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

function sheetToObjects_(sheet, tz) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = getNormalizedHeaders_(sheet);

  return data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((key, idx) => {
        if (!key) return;
        const val = row[idx];
        obj[key] = (val instanceof Date)
          ? Utilities.formatDate(val, tz, 'yyyy-MM-dd')
          : val;
      });
      return obj;
    });
}

function parseChipList_(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
