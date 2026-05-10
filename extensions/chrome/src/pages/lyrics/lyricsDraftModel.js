/**
 * RO:WHAT — Local draft model helpers for crab://lyrics.
 * RO:WHY — CrabLink refactor; separates route-owned manifest/stat logic from React rendering.
 * RO:INTERACTS — LyricsPage.jsx, LyricsDraft.jsx, useCreatorDraft.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no publication; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — optional app settings labels are display-only and supplied by caller.
 * RO:SECURITY — does not call backend services or render user text as HTML.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://lyrics route smoke.
 */

export const DEFAULT_LYRICS_DRAFT = Object.freeze({
  title: '',
  linkedMusicCrabUrl: '',
  authorDisplay: '',
  language: 'en',
  rightsMode: 'creator_owned',
  accessMode: 'free_preview',
  tags: '',
  body: '',
});

export const LYRICS_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const LYRICS_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned', label: 'Creator-owned / original' },
  { value: 'licensed', label: 'Licensed / permissioned' },
  { value: 'public_domain', label: 'Public domain' },
  { value: 'unknown_or_unverified', label: 'Unknown / unverified' },
]);

export const LYRICS_ACCESS_OPTIONS = Object.freeze([
  { value: 'free_preview', label: 'Free preview' },
  { value: 'paid_access_later', label: 'Paid access later' },
  { value: 'owner_only_draft', label: 'Owner-only draft' },
  { value: 'rights_review_needed', label: 'Rights review needed' },
]);

export function buildLyricsManifestDraft(draft, { app = null, route = null } = {}) {
  const safeDraft = {
    ...DEFAULT_LYRICS_DRAFT,
    ...(draft || {}),
  };

  const tags = parseTags(safeDraft.tags);
  const title = safeDraft.title.trim();
  const linkedMusicCrabUrl = safeDraft.linkedMusicCrabUrl.trim();
  const creatorLabel =
    safeDraft.authorDisplay.trim() ||
    app?.settings?.handle ||
    app?.settings?.passportSubject ||
    '';

  return {
    schema: 'crablink.local.lyrics-draft.v1',
    status: 'local_draft_only',
    route: {
      requested_url: route?.rawInput || 'crab://lyrics',
      normalized_url: route?.normalizedInput || 'crab://lyrics',
      route_kind: route?.kind || 'lyrics',
    },
    asset: {
      kind: 'lyrics',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
    },
    metadata: {
      language: safeDraft.language.trim() || 'en',
      tags,
      body_preview: safeDraft.body.slice(0, 240),
      stats: lyricStats(safeDraft.body),
    },
    ownership: {
      creator_display: creatorLabel,
      passport_subject_label: app?.settings?.passportSubject || '',
      wallet_account_label: app?.settings?.walletAccount || '',
      backend_confirmed: false,
    },
    linked_assets: {
      music_or_song: linkedMusicCrabUrl || null,
    },
    rights_policy: {
      mode: safeDraft.rightsMode,
      note: 'Local planning field only until backend lyrics contracts exist.',
    },
    access_policy: {
      mode: safeDraft.accessMode,
      paid_access_active: false,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_draft_only: true,
      assigns_b3_cid: false,
      assigns_manifest_cid: false,
      publishes_asset: false,
      writes_index_pointer: false,
      performs_paid_action: false,
      backend_route_claimed: false,
    },
  };
}

export function lyricStats(body) {
  const text = String(body || '');
  const trimmed = text.trim();

  return {
    characters: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    lines: text ? text.split(/\r\n|\r|\n/).length : 0,
  };
}

export function statsForLyricsDraft(draft) {
  return lyricStats(draft?.body || '');
}

export function getLyricsCompleteness(draft) {
  const safeDraft = {
    ...DEFAULT_LYRICS_DRAFT,
    ...(draft || {}),
  };

  const checks = [
    safeDraft.title.trim(),
    safeDraft.authorDisplay.trim(),
    safeDraft.language.trim(),
    safeDraft.rightsMode,
    safeDraft.accessMode,
    safeDraft.body.trim(),
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}