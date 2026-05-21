/**
 * RO:WHAT — Route owner for the React crab://music creator workspace.
 * RO:WHY — Adds bounded music-lite minting while preserving gateway/wallet/backend truth boundaries.
 * RO:INTERACTS — MusicDraft, MusicLocalPlaybackPreview, MusicPublishFlow, MusicOwnershipDisclaimer, MusicLinkedAssets, MusicRights, JsonPreview.
 * RO:INVARIANTS — no fake b3 CID; no fake receipt; no silent ROC spend; cover art is referenced by crab URL only.
 * RO:METRICS — none; publish/prepare routes use gateway client metrics/correlation IDs.
 * RO:CONFIG — route props and app settings for gateway/passport/wallet labels.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; manual crab://music route smoke.
 */

import { useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import MusicDraft from './MusicDraft.jsx';
import MusicLinkedAssets from './MusicLinkedAssets.jsx';
import MusicLocalPlaybackPreview from './MusicLocalPlaybackPreview.jsx';
import MusicOwnershipDisclaimer, {
  DEFAULT_MUSIC_OWNERSHIP_ATTESTATION,
  buildMusicOwnershipAttestationManifest,
  isMusicOwnershipAttestationReady,
} from './MusicOwnershipDisclaimer.jsx';
import MusicPublishFlow from './MusicPublishFlow.jsx';
import MusicRights from './MusicRights.jsx';
import './music.css';

const INITIAL_DRAFT = Object.freeze({
  title: '',
  artistDisplay: '',
  albumTitle: '',
  description: '',
  trackNotes: '',
  releaseType: 'single',
  language: 'en',
  genre: 'independent',
  mood: 'unspecified',
  duration: '',
  bpm: '',
  keySignature: '',
  explicitRating: 'not_marked',
  coverImageCrabUrl: '',
  lyricsCrabUrl: '',
  audioPreviewCrabUrl: '',
  fullAudioCrabUrl: '',
  stemPackCrabUrl: '',
  videoCrabUrl: '',
  siteContextCrabUrl: '',
  rightsMode: 'creator_owned_original',
  licenseMode: 'all_rights_reserved_local_draft',
  accessMode: 'public_preview',
  payoutMode: 'creator_wallet_future',
  tags: 'music, demo',
});

export default function MusicPage({ app, route }) {
  const [draft, setDraft] = useState({ ...INITIAL_DRAFT });
  const [viewMode, setViewMode] = useState('builder');
  const [copyState, setCopyState] = useState('');
  const [localAudioMeta, setLocalAudioMeta] = useState(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [localPreviewResetKey, setLocalPreviewResetKey] = useState(0);
  const [ownershipAttestation, setOwnershipAttestation] = useState({
    ...DEFAULT_MUSIC_OWNERSHIP_ATTESTATION,
  });

  const ownershipReady = isMusicOwnershipAttestationReady(ownershipAttestation);

  const stats = useMemo(
    () => buildMusicStats(draft, localAudioMeta, ownershipAttestation),
    [draft, localAudioMeta, ownershipAttestation],
  );

  const manifest = useMemo(
    () => buildMusicManifest(draft, stats, route, localAudioMeta, ownershipAttestation),
    [draft, stats, route, localAudioMeta, ownershipAttestation],
  );

  function updateDraftField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function copyManifest() {
    const json = JSON.stringify(manifest, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setCopyState('Copied local manifest JSON');
    } catch (_error) {
      setCopyState('Clipboard unavailable in this browser context');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  function clearDraft() {
    setDraft({ ...INITIAL_DRAFT });
    setLocalAudioMeta(null);
    setSelectedAudioFile(null);
    setOwnershipAttestation({ ...DEFAULT_MUSIC_OWNERSHIP_ATTESTATION });
    setLocalPreviewResetKey((value) => value + 1);
    setCopyState('Local draft cleared');
    window.setTimeout(() => setCopyState(''), 1800);
  }

  return (
    <section className="cl-music-page" aria-labelledby="cl-music-title">
      <header className="cl-music-hero">
        <div>
          <p className="cl-eyebrow">crab://music</p>
          <h1 id="cl-music-title">Music Release Workspace</h1>
          <p>
            Draft music releases, preview a local track, confirm rights, and mint bounded music-lite
            uploads through an explicit prepare → ROC hold → upload flow. Cover art is a referenced
            crab:// image asset only; this page does not upload cover-art bytes.
          </p>
        </div>

        <aside className="cl-music-route-card" aria-label="Route owner">
          <span>Route owner</span>
          <strong>MusicPage.jsx</strong>
          <small>React lane · explicit mint · no silent spend</small>
        </aside>
      </header>

      <div className="cl-music-principles" aria-label="Music asset principles">
        <article>
          <strong>Audio is minted</strong>
          <span>Only the selected audio file is uploaded through the bounded paid music-lite path.</span>
        </article>
        <article>
          <strong>Cover art is referenced</strong>
          <span>Use a crab:// image link for cover art. Music minting does not upload image bytes.</span>
        </article>
        <article>
          <strong>Paid listening stays backend-gated</strong>
          <span>Listeners must unlock playback through backend content_view receipts, not cache state.</span>
        </article>
      </div>

      <div className="cl-music-layout">
        <main className="cl-music-main">
          <div className="cl-music-panel">
            <div className="cl-music-panel-head">
              <div>
                <p className="cl-eyebrow">Creator mint flow</p>
                <h2>Music release draft</h2>
                <p>
                  Compose metadata, reference optional cover art by crab URL, complete rights
                  confirmation, then explicitly prepare, hold ROC, and upload the selected audio file.
                </p>
              </div>

              <div className="cl-music-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={viewMode === 'builder' ? 'is-active' : ''}
                  onClick={() => setViewMode('builder')}
                >
                  Builder
                </button>
                <button
                  type="button"
                  className={viewMode === 'developer' ? 'is-active' : ''}
                  onClick={() => setViewMode('developer')}
                >
                  Developer
                </button>
              </div>
            </div>

            {viewMode === 'builder' ? (
              <div className="cl-music-builder-stack">
                <MusicLocalPlaybackPreview
                  key={localPreviewResetKey}
                  draft={draft}
                  updateDraft={updateDraftField}
                  onPreviewMetaChange={setLocalAudioMeta}
                  onFileChange={setSelectedAudioFile}
                />
                <MusicDraft draft={draft} onChange={setDraft} stats={stats} />
                <MusicLinkedAssets draft={draft} onChange={setDraft} />
                <MusicRights draft={draft} onChange={setDraft} />
                <MusicOwnershipDisclaimer
                  draft={draft}
                  localAudioMeta={localAudioMeta}
                  attestation={ownershipAttestation}
                  onChange={setOwnershipAttestation}
                />
                <MusicPublishFlow
                  app={app}
                  draft={draft}
                  selectedFile={selectedAudioFile}
                  fileFacts={localAudioMeta}
                  ownershipReady={ownershipReady}
                  legalAttestation={buildMusicOwnershipAttestationManifest(ownershipAttestation)}
                />
              </div>
            ) : (
              <JsonPreview label="Local music manifest JSON" data={manifest} initiallyOpen />
            )}

            <div className="cl-music-actions">
              <button type="button" className="cl-music-primary" onClick={copyManifest}>
                Copy local manifest JSON
              </button>
              <button type="button" onClick={clearDraft}>
                Clear local draft
              </button>
              {copyState ? <span role="status">{copyState}</span> : null}
            </div>
          </div>
        </main>

        <aside className="cl-music-side">
          <section className="cl-music-panel cl-music-stats">
            <p className="cl-eyebrow">Draft readiness</p>
            <div className="cl-music-readiness-meter" aria-label="Local draft readiness">
              <strong>{stats.readinessPercent}%</strong>
              <span>local draft completeness</span>
              <div>
                <i style={{ width: `${stats.readinessPercent}%` }} />
              </div>
            </div>

            <div className="cl-music-stat-grid">
              <Stat label="Tags" value={stats.tags.length} />
              <Stat label="Links" value={stats.linkedAssetCount} />
              <Stat label="Local audio" value={stats.localAudioSelected ? 'Loaded' : 'Not selected'} />
              <Stat label="Legal gate" value={stats.ownershipAttested ? 'Attested' : 'Required'} />
              <Stat label="Access" value={labelFromSnake(draft.accessMode)} />
              <Stat label="Publish" value={selectedAudioFile ? 'Ready path' : 'Choose audio'} />
            </div>

            <div className="cl-music-truth-box">
              <strong>Truth boundary</strong>
              <p>
                CrabLink prepares intent and sends explicit requests. Backend routes create content
                IDs, receipts, index pointers, and paid view proof. Local state does not unlock paid music.
              </p>
            </div>
          </section>

          <section className="cl-music-panel cl-music-preview" aria-label="Music preview">
            <p className="cl-eyebrow">Release preview</p>

            <div className="cl-music-cover">
              {draft.coverImageCrabUrl.trim() ? (
                <>
                  <span>Cover image reference</span>
                  <strong>{draft.coverImageCrabUrl.trim()}</strong>
                </>
              ) : (
                <>
                  <span>Cover image</span>
                  <strong>No crab:// image linked</strong>
                </>
              )}
            </div>

            <h2>{draft.title.trim() || 'Untitled track'}</h2>
            <p className="cl-music-preview-meta">
              {draft.artistDisplay.trim() || 'Unknown artist'} · {labelFromSnake(draft.releaseType)}
              {draft.duration.trim() ? ` · ${draft.duration.trim()}` : ''}
            </p>

            <article>
              {draft.description.trim() ? (
                <p>{draft.description.trim()}</p>
              ) : (
                <p>Your music description will appear here.</p>
              )}

              {draft.trackNotes.trim() ? <p>{draft.trackNotes.trim()}</p> : null}
            </article>

            <div className="cl-music-link-list">
              <span>Local audio: {localAudioMeta?.name || 'not selected'}</span>
              <span>Cover art reference: {draft.coverImageCrabUrl.trim() || 'not linked'}</span>
              <span>Lyrics: {draft.lyricsCrabUrl.trim() || 'not linked'}</span>
              <span>Preview audio ref: {draft.audioPreviewCrabUrl.trim() || 'not linked'}</span>
              <span>Full audio ref: {draft.fullAudioCrabUrl.trim() || 'not linked'}</span>
              <span>Rights gate: {ownershipReady ? 'attested locally' : 'required before mint'}</span>
            </div>

            <div className="cl-music-tags">
              {stats.tags.length ? (
                stats.tags.map((tag) => <span key={tag}>{tag}</span>)
              ) : (
                <span>No tags</span>
              )}
            </div>
          </section>

          <section className="cl-music-panel cl-music-local-summary" aria-label="Local audio summary">
            <p className="cl-eyebrow">Audio preview facts</p>
            <dl>
              <div>
                <dt>File</dt>
                <dd>{localAudioMeta?.name || 'not selected'}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{localAudioMeta?.durationLabel || draft.duration || 'not inspected'}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{stats.localAudioSizeLabel}</dd>
              </div>
              <div>
                <dt>Cover art</dt>
                <dd>{draft.coverImageCrabUrl ? 'crab reference only' : 'not linked'}</dd>
              </div>
              <div>
                <dt>Rights</dt>
                <dd>{ownershipReady ? 'local attestation complete' : 'not confirmed'}</dd>
              </div>
            </dl>
          </section>

          <section className="cl-music-panel cl-music-route-debug" aria-label="Route debug">
            <p className="cl-eyebrow">Route debug</p>
            <dl>
              <div>
                <dt>Route kind</dt>
                <dd>{route?.kind || 'music'}</dd>
              </div>
              <div>
                <dt>Route type</dt>
                <dd>{route?.routeType || 'builtin'}</dd>
              </div>
              <div>
                <dt>Normalized</dt>
                <dd>{route?.normalizedInput || 'crab://music'}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="cl-music-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildMusicStats(draft, localAudioMeta, ownershipAttestation) {
  const tagList = String(draft.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const linkedAssetCount = [
    draft.coverImageCrabUrl,
    draft.lyricsCrabUrl,
    draft.audioPreviewCrabUrl,
    draft.fullAudioCrabUrl,
    draft.stemPackCrabUrl,
    draft.videoCrabUrl,
    draft.siteContextCrabUrl,
  ].filter((value) => String(value || '').trim()).length;

  const localAudioSelected = Boolean(localAudioMeta?.name);
  const ownershipAttested = isMusicOwnershipAttestationReady(ownershipAttestation);
  const hasLinkedAudio = Boolean(
    String(draft.audioPreviewCrabUrl || '').trim() || String(draft.fullAudioCrabUrl || '').trim(),
  );

  const readinessChecks = [
    Boolean(String(draft.title || '').trim()),
    Boolean(String(draft.artistDisplay || '').trim()),
    Boolean(String(draft.description || '').trim()),
    Boolean(String(draft.coverImageCrabUrl || '').trim()),
    Boolean(String(draft.duration || '').trim() || localAudioMeta?.durationLabel),
    Boolean(localAudioSelected || hasLinkedAudio),
    Boolean(String(draft.rightsMode || '').trim()),
    Boolean(String(draft.accessMode || '').trim()),
    ownershipAttested,
  ];

  const readinessPercent = Math.round(
    (readinessChecks.filter(Boolean).length / readinessChecks.length) * 100,
  );

  return {
    tags: tagList,
    linkedAssetCount,
    localAudioSelected,
    ownershipAttested,
    localAudioSizeLabel: localAudioMeta?.size ? formatBytes(localAudioMeta.size) : 'not selected',
    readinessPercent,
  };
}

function buildMusicManifest(draft, stats, route, localAudioMeta, ownershipAttestation) {
  const title = draft.title.trim();
  const artistDisplay = draft.artistDisplay.trim();
  const albumTitle = draft.albumTitle.trim();
  const coverImage = draft.coverImageCrabUrl.trim();
  const lyrics = draft.lyricsCrabUrl.trim();
  const audioPreview = draft.audioPreviewCrabUrl.trim();
  const fullAudio = draft.fullAudioCrabUrl.trim();
  const stems = draft.stemPackCrabUrl.trim();
  const video = draft.videoCrabUrl.trim();
  const siteContext = draft.siteContextCrabUrl.trim();

  const legalAttestation = buildMusicOwnershipAttestationManifest(ownershipAttestation);

  return {
    schema: 'crablink.local.music-draft.v1',
    status: 'local_draft_until_uploaded',
    route: {
      owner: 'MusicPage.jsx',
      source_route: route?.normalizedInput || 'crab://music',
      route_kind: route?.kind || 'music',
    },
    asset: {
      kind: 'music',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
    },
    metadata: {
      title,
      artist_display: artistDisplay,
      album_title: albumTitle || null,
      release_type: draft.releaseType,
      language: draft.language,
      genre: draft.genre,
      mood: draft.mood,
      duration: draft.duration.trim() || localAudioMeta?.durationLabel || null,
      bpm: draft.bpm.trim() || null,
      key_signature: draft.keySignature.trim() || null,
      explicit_rating: draft.explicitRating,
      tags: stats.tags,
      description: draft.description.trim(),
      track_notes: draft.trackNotes.trim(),
    },
    local_preview: {
      enabled_in_ui: Boolean(localAudioMeta?.name),
      file_name_in_manifest: false,
      object_url_in_manifest: false,
      bytes_in_manifest: false,
      duration_may_be_applied_to_metadata: true,
    },
    linked_assets: {
      cover_image_crab_url: coverImage || null,
      cover_image_upload_from_music_page: false,
      lyrics_crab_url: lyrics || null,
      audio_preview_crab_url: audioPreview || null,
      full_audio_crab_url: fullAudio || null,
      stem_pack_crab_url: stems || null,
      video_crab_url: video || null,
      site_context_crab_url: siteContext || null,
      renditions: [],
      alternates: [],
    },
    ownership: {
      creator_display: artistDisplay,
      passport_subject_label: '',
      wallet_account_label: '',
      backend_confirmed: false,
      legal_attestation: legalAttestation,
    },
    rights_policy: {
      rights_mode: draft.rightsMode,
      license_mode: draft.licenseMode,
      lyrics_are_separate_asset: true,
      backend_confirmed: false,
      legal_attestation_required_before_publish: true,
      legal_attestation_accepted: Boolean(legalAttestation.accepted),
    },
    access_policy: {
      mode: draft.accessMode,
      paid_access: draft.accessMode === 'paid_stream_future' || draft.accessMode === 'paid_download_future',
      roc_price_units: null,
    },
    economics: {
      payout_mode: draft.payoutMode,
      split_policy_ref: null,
      backend_confirmed: false,
    },
    provenance: {
      created_by: 'CrabLink React music workspace',
      source: 'crab://music workspace',
      version: 3,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_only_until_upload: true,
      creates_content_id_locally: false,
      creates_manifest_id_locally: false,
      creates_index_pointer_locally: false,
      charges_roc_locally: false,
      wallet_mutation_from_react: false,
      rights_backend_confirmed: false,
      ownership_attestation_backend_verified: false,
      cover_art_upload_from_music_page: false,
      cover_art_reference_only: true,
      local_audio_preview_is_publication: false,
      local_audio_preview_unlocks_paid_content: false,
    },
  };
}

function labelFromSnake(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unitIndex]}`;
}