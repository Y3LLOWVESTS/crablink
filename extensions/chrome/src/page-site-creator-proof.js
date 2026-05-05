/**
 * RO:WHAT — Adds creator @username, reputation/moderator proof chips, and full-width polish to rendered crab:// sites.
 * RO:WHY — NEXT_LEVEL product polish; Concerns: DX/SEC; expose identity/reputation surfaces without inventing backend truth.
 * RO:INTERACTS — page-site-render-mode.js, page.html, developer JSON payloads from svc-gateway/omnigate.
 * RO:INVARIANTS — gateway-only; read-only DOM enhancement; no backend mutation; no fake reputation; no private alt↔main linkage.
 * RO:METRICS — none; displayed scores are backend/manifest/passport fields when present.
 * RO:CONFIG — none.
 * RO:SECURITY — no innerHTML; no script injection; profile navigation only uses explicit crab:// profile URLs or future @username routes.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual crab://<site> creator proof check.
 */

const SITE_SCHEMA = 'omnigate.site-page.v1';

const STYLE_ID = 'crablinkSiteCreatorProofStyles';
const VIEWPORT_ID = 'crablinkSiteViewport';
const FRAME_ID = 'crablinkSiteFullFrame';
const CREATOR_HANDLE_ID = 'crablinkSiteCreatorHandle';
const CREATOR_STATS_ID = 'crablinkSiteCreatorStats';
const CREATOR_REPUTATION_ID = 'crablinkSiteCreatorReputation';
const CREATOR_MODERATOR_ID = 'crablinkSiteCreatorModerator';
const SANDBOX_FIT_STYLE_ID = 'crablinkSiteContentFitStyle';

let scheduled = 0;
let observer = null;

function boot() {
  installStyles();
  scheduleEnhance();

  const root = document.getElementById('pagePanel') || document.body || document.documentElement;
  if (root) {
    observer = new MutationObserver(scheduleEnhance);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  window.addEventListener('resize', scheduleEnhance);
}

function scheduleEnhance() {
  window.clearTimeout(scheduled);
  scheduled = window.setTimeout(enhanceCreatorProof, 80);
}

function enhanceCreatorProof() {
  const payload = readPayload();
  if (!payload || payload.schema !== SITE_SCHEMA) return;

  const viewport = document.getElementById(VIEWPORT_ID);
  if (!viewport) return;

  ensureCreatorChip(viewport, payload);
  ensureCreatorProofCards(viewport, payload);
  bindFramePolish();
  polishFrameContent();
}

function ensureCreatorChip(viewport, payload) {
  const actions = viewport.querySelector('.site-viewport-actions');
  if (!actions) return;

  let chip = viewport.querySelector('.site-creator-chip');

  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'site-creator-chip';

    const label = document.createElement('span');
    label.className = 'site-creator-label';
    label.textContent = 'site creator:';

    const handleButton = document.createElement('button');
    handleButton.id = CREATOR_HANDLE_ID;
    handleButton.type = 'button';
    handleButton.className = 'site-creator-link';

    chip.append(label, handleButton);
    actions.insertBefore(chip, actions.firstChild);
  }

  let handleButton = chip.querySelector(`#${CREATOR_HANDLE_ID}`);
  if (!handleButton) {
    handleButton = document.createElement('button');
    handleButton.id = CREATOR_HANDLE_ID;
    handleButton.type = 'button';
    handleButton.className = 'site-creator-link';
    chip.append(handleButton);
  }

  handleButton.textContent = creatorHandle(payload);
  handleButton.title = creatorProfileCrabUrl(payload)
    ? "Open this creator's read-only passport/profile manifest."
    : 'Read-only passport/profile manifests are planned; no backend profile URL is published yet.';
  handleButton.dataset.crabProfileUrl = creatorProfileCrabUrl(payload);

  if (handleButton.dataset.creatorProofBound !== '1') {
    handleButton.dataset.creatorProofBound = '1';
    handleButton.addEventListener('click', () => openCreatorProfile(readPayload() || payload));
  }

  let stats = chip.querySelector(`#${CREATOR_STATS_ID}`);
  if (!stats) {
    stats = document.createElement('span');
    stats.id = CREATOR_STATS_ID;
    stats.className = 'site-creator-stats';
    chip.append(stats);
  }

  const reputation = ensureScorePill(stats, CREATOR_REPUTATION_ID, 'site-score-pill site-reputation-score');
  reputation.textContent = creatorReputationLabel(payload);
  reputation.title = creatorScoreTitle(payload, 'reputation');

  const moderator = ensureScorePill(stats, CREATOR_MODERATOR_ID, 'site-score-pill site-moderator-score');
  moderator.textContent = creatorModeratorLabel(payload);
  moderator.title = creatorScoreTitle(payload, 'moderator');
}

function ensureScorePill(parent, id, className) {
  let pill = parent.querySelector(`#${id}`);
  if (pill) return pill;

  pill = document.createElement('span');
  pill.id = id;
  pill.className = className;
  parent.append(pill);
  return pill;
}

function ensureCreatorProofCards(viewport, payload) {
  const grid = viewport.querySelector('#crablinkSiteProofGrid');
  if (!grid) return;

  upsertProofCard(grid, 'creator-profile', 'Creator profile', creatorProfileCrabUrl(payload) || 'not published yet');
  upsertProofCard(grid, 'reputation-score', 'Reputation score', creatorRawReputationScore(payload) || 'not published yet');
  upsertProofCard(grid, 'moderator-score', 'Moderator score', creatorRawModeratorScore(payload) || 'not published yet');
}

function upsertProofCard(grid, key, label, value) {
  let card = grid.querySelector(`[data-crablink-proof-key="${key}"]`);

  if (!card) {
    card = document.createElement('article');
    card.className = 'site-proof-card site-creator-proof-card';
    card.dataset.crablinkProofKey = key;

    const term = document.createElement('span');
    term.className = 'site-proof-term';

    const body = document.createElement('strong');
    body.className = 'site-proof-value';

    card.append(term, body);
    grid.append(card);
  }

  const term = card.querySelector('.site-proof-term') || card.querySelector('span');
  const body = card.querySelector('.site-proof-value') || card.querySelector('strong');

  if (term) term.textContent = label;
  if (body) body.textContent = clean(value) || '—';
}

function bindFramePolish() {
  const frame = document.getElementById(FRAME_ID);
  if (!frame || frame.dataset.creatorProofFrameBound === '1') return;

  frame.dataset.creatorProofFrameBound = '1';
  frame.addEventListener('load', () => {
    window.setTimeout(polishFrameContent, 40);
    window.setTimeout(polishFrameContent, 240);
  });
}

function polishFrameContent() {
  const frame = document.getElementById(FRAME_ID);
  if (!frame) return;

  frame.style.width = '100%';
  frame.style.maxWidth = 'none';

  let doc = null;
  try {
    doc = frame.contentDocument || frame.contentWindow?.document || null;
  } catch {
    return;
  }

  if (!doc?.documentElement || doc.getElementById(SANDBOX_FIT_STYLE_ID)) return;

  const style = doc.createElement('style');
  style.id = SANDBOX_FIT_STYLE_ID;
  style.textContent = [
    'html { width: 100%; min-width: 100%; }',
    'body { width: 100%; min-width: 100%; margin: 0; }',
    'img.crab-embedded-image { max-width: 100%; height: auto; }'
  ].join('\n');

  const target = doc.head || doc.documentElement;
  target.append(style);
}

function openCreatorProfile(payload) {
  const target = creatorProfileCrabUrl(payload);

  if (!target) {
    setStatus('Read-only passport/profile manifests are planned; this site has not published a profile URL yet.');
    return;
  }

  const input = document.getElementById('addressInput');
  const form = document.getElementById('addressForm');

  if (!input || !form) {
    setStatus(`Creator profile available: ${target}`);
    return;
  }

  input.value = target;
  setStatus(`Opening creator profile ${target}…`);

  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit();
    return;
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function readPayload() {
  const raw = clean(document.getElementById('developerJson')?.textContent || '');
  if (!raw || raw === '{}') return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function creatorHandle(payload) {
  const raw = clean(
    pickFirst(
      payload.creator?.username,
      payload.creator?.handle,
      payload.owner?.username,
      payload.owner?.handle,
      payload.passport?.username,
      payload.passport?.handle,
      payload.public_profile?.username,
      payload.public_profile?.handle,
      payload.publicProfile?.username,
      payload.publicProfile?.handle,
      payload.owner_username,
      payload.owner_handle,
      payload.creator_username,
      payload.creator_handle
    )
  );

  return normalizeHandle(raw || '@username');
}

function creatorProfileCrabUrl(payload) {
  const explicit = clean(
    pickFirst(
      payload.creator?.crab_url,
      payload.creator?.crabUrl,
      payload.creator?.profile_crab_url,
      payload.creator?.profileCrabUrl,
      payload.owner?.crab_url,
      payload.owner?.crabUrl,
      payload.owner?.profile_crab_url,
      payload.owner?.profileCrabUrl,
      payload.passport?.profile_crab_url,
      payload.passport?.profileCrabUrl,
      payload.public_profile?.crab_url,
      payload.public_profile?.crabUrl,
      payload.publicProfile?.crabUrl,
      payload.creator_crab_url,
      payload.creator_profile_crab_url,
      payload.owner_crab_url,
      payload.owner_profile_crab_url
    )
  );

  if (explicit) return explicit;

  const handle = creatorHandle(payload);
  if (!handle || handle === '@username') return '';

  return `crab://${handle}`;
}

function creatorRawReputationScore(payload) {
  return clean(
    pickFirst(
      payload.creator?.reputation_score,
      payload.creator?.reputationScore,
      payload.creator?.reputation?.score,
      payload.owner?.reputation_score,
      payload.owner?.reputationScore,
      payload.owner?.reputation?.score,
      payload.passport?.reputation_score,
      payload.passport?.reputationScore,
      payload.public_profile?.reputation_score,
      payload.public_profile?.reputationScore,
      payload.publicProfile?.reputationScore,
      payload.reputation_score,
      payload.reputationScore
    )
  );
}

function creatorRawModeratorScore(payload) {
  return clean(
    pickFirst(
      payload.creator?.moderator_score,
      payload.creator?.moderatorScore,
      payload.creator?.moderation_score,
      payload.creator?.moderationScore,
      payload.creator?.moderation?.score,
      payload.owner?.moderator_score,
      payload.owner?.moderatorScore,
      payload.owner?.moderation_score,
      payload.owner?.moderationScore,
      payload.owner?.moderation?.score,
      payload.passport?.moderator_score,
      payload.passport?.moderatorScore,
      payload.public_profile?.moderator_score,
      payload.public_profile?.moderatorScore,
      payload.publicProfile?.moderatorScore,
      payload.moderator_score,
      payload.moderatorScore,
      payload.moderation_score,
      payload.moderationScore
    )
  );
}

function creatorReputationLabel(payload) {
  const score = creatorRawReputationScore(payload);
  return score ? `rep ${score}` : 'rep —';
}

function creatorModeratorLabel(payload) {
  const score = creatorRawModeratorScore(payload);
  return score ? `mod ${score}` : 'mod —';
}

function creatorScoreTitle(payload, kind) {
  const score = kind === 'moderator' ? creatorRawModeratorScore(payload) : creatorRawReputationScore(payload);
  if (score) return `${kind} score published by backend manifest/passport metadata.`;
  return `${kind} score not published by backend yet; CrabLink will not invent reputation truth.`;
}

function normalizeHandle(value) {
  const raw = clean(value).replace(/^@+/, '');
  if (!raw || raw === 'username') return '@username';
  if (raw.startsWith('passport:')) return '@username';

  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');

  return safe ? `@${safe}` : '@username';
}

function pickFirst(...values) {
  for (const value of values) {
    if (value === 0) return '0';
    if (value === false) return 'false';
    if (value !== undefined && value !== null && clean(value) !== '') return value;
  }

  return '';
}

function setStatus(message) {
  const status = document.getElementById('crablinkSiteViewportStatus');
  if (status) status.textContent = message;

  const footer = document.getElementById('footerStatus');
  if (footer) footer.textContent = message;
}

function clean(value) {
  return String(value ?? '').trim();
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.crablink-site-full-view-mode .site-creator-chip {
      max-width: min(780px, 100%) !important;
    }

    body.crablink-site-full-view-mode .site-creator-stats {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      min-width: 0 !important;
    }

    body.crablink-site-full-view-mode .site-score-pill {
      display: inline-flex !important;
      align-items: center !important;
      min-height: 24px !important;
      padding: 0 8px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(148, 163, 184, 0.24) !important;
      background: rgba(15, 23, 42, 0.48) !important;
      color: #cbd5e1 !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      letter-spacing: 0.01em !important;
      white-space: nowrap !important;
    }

    body.crablink-site-full-view-mode .site-reputation-score {
      border-color: rgba(56, 189, 248, 0.30) !important;
      color: #bae6fd !important;
    }

    body.crablink-site-full-view-mode .site-moderator-score {
      border-color: rgba(196, 181, 253, 0.30) !important;
      color: #ddd6fe !important;
    }

    body.crablink-site-full-view-mode .site-creator-proof-card {
      border-color: rgba(74, 222, 128, 0.20) !important;
      background: rgba(6, 78, 59, 0.16) !important;
    }

    body.crablink-site-full-view-mode #crablinkSiteFullFrame {
      width: 100% !important;
      max-width: none !important;
    }

    @media (max-width: 980px) {
      body.crablink-site-full-view-mode .site-creator-chip {
        align-items: flex-start !important;
        border-radius: 18px !important;
        flex-wrap: wrap !important;
        padding: 8px 10px !important;
        white-space: normal !important;
      }
    }
  `;

  document.head.append(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}