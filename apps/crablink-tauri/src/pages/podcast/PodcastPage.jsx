/**
 * RO:WHAT — Route owner for the React crab://podcast creator workspace.
 * RO:WHY — Combines Podcast Studio, metadata drafting, rights attestation, and explicit paid minting.
 * RO:INTERACTS — PodcastDraft, PodcastStudio, PodcastOwnershipDisclaimer, PodcastPublishFlow, JsonPreview, app router.
 * RO:INVARIANTS — no fake b3 CID; no fake receipt; no silent ROC spend; local recording is not backend stream truth.
 * RO:METRICS — local audio meter only; publish/prepare routes use gateway client metrics/correlation IDs.
 * RO:CONFIG — route props plus app settings for gateway/passport/wallet labels.
 * RO:SECURITY — mic starts by explicit user action; no file paths in manifest; no arbitrary crab code execution.
 * RO:TEST — npm run build; manual crab://podcast file upload, mic record, attestation, prepare/hold/upload smoke.
 */

import { useCallback, useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PodcastDraft from './PodcastDraft.jsx';
import PodcastOwnershipDisclaimer, {
  DEFAULT_PODCAST_OWNERSHIP_ATTESTATION,
  buildPodcastOwnershipAttestationManifest,
  isPodcastOwnershipAttestationReady,
} from './PodcastOwnershipDisclaimer.jsx';
import PodcastPublishFlow from './PodcastPublishFlow.jsx';
import PodcastStudio from './PodcastStudio.jsx';
import './podcast.css';

const INITIAL_DRAFT = Object.freeze({
  title: '',
  showTitle: '',
  hostDisplay: '',
  cohosts: '',
  description: '',
  episodeNotes: '',
  transcriptSummary: '',
  episodeType: 'audio_episode',
  sourceMode: 'audio_upload_future',
  language: 'en',
  category: 'independent',
  duration: '',
  season: '',
  episodeNumber: '',
  explicitRating: 'not_marked',
  coverImageCrabUrl: '',
  audioCrabUrl: '',
  liveStreamCrabUrl: '',
  transcriptCrabUrl: '',
  clipCrabUrl: '',
  siteContextCrabUrl: '',
  scheduleMode: 'draft_unscheduled',
  releaseDate: '',
  accessMode: 'public_preview',
  rightsMode: 'creator_owned_original',
  payoutMode: 'creator_wallet_future',
  tags: 'podcast, demo',
  contentWarning: '',
});

export default function PodcastPage({ app, route }) {
  const [draft, setDraft] = useState({ ...INITIAL_DRAFT });
  const [viewMode, setViewMode] = useState('studio');
  const [copyState, setCopyState] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [audioMeta, setAudioMeta] = useState(null);
  const [studioState, setStudioState] = useState(null);
  const [ownershipAttestation, setOwnershipAttestation] = useState({
    ...DEFAULT_PODCAST_OWNERSHIP_ATTESTATION,
  });

  const attestationReady = isPodcastOwnershipAttestationReady(ownershipAttestation);
  const attestationManifest = useMemo(
    () => buildPodcastOwnershipAttestationManifest(ownershipAttestation),
    [ownershipAttestation],
  );

  const patchDraft = useCallback((patch = {}) => {
    setDraft((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const handleAudioFileChange = useCallback(
    (file, meta) => {
      setAudioFile(file || null);
      setAudioMeta(meta || null);

      if (meta?.durationLabel && !draft.duration) {
        patchDraft({
          duration: meta.durationLabel,
        });
      }
    },
    [draft.duration, patchDraft],
  );

  const handleStudioStateChange = useCallback((state) => {
    setStudioState(state || null);
  }, []);

  const stats = useMemo(
    () => buildPodcastStats(draft, audioMeta, studioState, ownershipAttestation),
    [draft, audioMeta, studioState, ownershipAttestation],
  );

  const manifest = useMemo(
    () => buildPodcastManifest(draft, stats, route, audioMeta, studioState, attestationManifest),
    [draft, stats, route, audioMeta, studioState, attestationManifest],
  );

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
    setAudioFile(null);
    setAudioMeta(null);
    setOwnershipAttestation({ ...DEFAULT_PODCAST_OWNERSHIP_ATTESTATION });
    setCopyState('Local draft cleared');
    window.setTimeout(() => setCopyState(''), 1800);
  }

  const onAir = Boolean(studioState?.onAir);

  return (
    <section className="cl-podcast-page cl-podcast-page-compact" aria-label="Podcast Studio">
      <div className="cl-podcast-layout">
        <main className="cl-podcast-main">
          <div className="cl-podcast-panel">
            <div className="cl-podcast-panel-head">
              <div>
                <p className="cl-eyebrow">Creator workspace</p>
                <h2>Episode builder</h2>
                <p>
                  Start with studio audio, then complete metadata, rights confirmation, and the paid
                  upload flow. Cover art remains a crab:// image reference.
                </p>
              </div>

              <div className="cl-podcast-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={viewMode === 'studio' ? 'is-active' : ''}
                  onClick={() => setViewMode('studio')}
                >
                  Studio
                </button>
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

            {viewMode === 'studio' ? (
              <div className="cl-podcast-builder-stack">
                <PodcastStudio
                  draft={draft}
                  onAudioFileChange={handleAudioFileChange}
                  onStudioStateChange={handleStudioStateChange}
                  onDraftPatch={patchDraft}
                />
                <PodcastDraft draft={draft} onChange={setDraft} stats={stats} />
                <PodcastOwnershipDisclaimer
                  draft={draft}
                  audioMeta={audioMeta}
                  attestation={ownershipAttestation}
                  onChange={setOwnershipAttestation}
                />
                <PodcastPublishFlow
                  app={app}
                  draft={draft}
                  selectedFile={audioFile}
                  fileFacts={audioMeta}
                  attestationReady={attestationReady}
                  legalAttestation={attestationManifest}
                />
              </div>
            ) : null}

            {viewMode === 'builder' ? (
              <PodcastDraft draft={draft} onChange={setDraft} stats={stats} />
            ) : null}

            {viewMode === 'developer' ? (
              <JsonPreview label="Local podcast manifest JSON" data={manifest} initiallyOpen />
            ) : null}

            <div className="cl-podcast-actions">
              <button type="button" className="cl-podcast-primary" onClick={copyManifest}>
                Copy local manifest JSON
              </button>
              <button type="button" onClick={clearDraft}>
                Clear local draft
              </button>
              {copyState ? <span role="status">{copyState}</span> : null}
            </div>
          </div>
        </main>

        <aside className="cl-podcast-side">
          <section className="cl-podcast-panel cl-podcast-stats">
            <p className="cl-eyebrow">Studio stats</p>
            <div className="cl-podcast-stat-grid">
              <Stat label="Tags" value={stats.tags.length} />
              <Stat label="Links" value={stats.linkedAssetCount} />
              <Stat label="Audio" value={stats.audioStatus} />
              <Stat label="Rights" value={attestationReady ? 'Ready' : 'Required'} />
            </div>

            <div className="cl-podcast-truth-box">
              <strong>Truth boundary</strong>
              <p>
                Local recording and preview do not create a content ID, receipt, index pointer,
                publication, paid access event, wallet mutation, or backend stream session.
              </p>
            </div>
          </section>

          <section className="cl-podcast-panel cl-podcast-preview" aria-label="Podcast preview">
            <p className="cl-eyebrow">Preview</p>

            <div className={`cl-podcast-cover ${onAir ? 'is-on-air' : ''}`}>
              {onAir ? (
                <>
                  <span>Recording state</span>
                  <strong>ON AIR</strong>
                </>
              ) : draft.coverImageCrabUrl.trim() ? (
                <>
                  <span>Cover image reference</span>
                  <strong>{draft.coverImageCrabUrl.trim()}</strong>
                </>
              ) : (
                <>
                  <span>Cover image</span>
                  <strong>No image linked</strong>
                </>
              )}
            </div>

            <h2>{draft.title.trim() || 'Untitled podcast episode'}</h2>
            <p className="cl-podcast-preview-meta">
              {draft.showTitle.trim() || 'Unknown show'} ·{' '}
              {draft.hostDisplay.trim() || 'Unknown host'} · {labelFromSnake(draft.episodeType)}
            </p>

            <article>
              {draft.description.trim() ? (
                <p>{draft.description.trim()}</p>
              ) : (
                <p>Your podcast description will appear here.</p>
              )}

              {draft.episodeNotes.trim() ? <p>{draft.episodeNotes.trim()}</p> : null}
            </article>

            <div className="cl-podcast-link-list">
              <span>Local audio: {audioMeta ? `${audioMeta.name} · ${audioMeta.sizeLabel}` : 'not loaded'}</span>
              <span>Audio asset: {draft.audioCrabUrl.trim() || 'not linked yet'}</span>
              <span>Live stream source: {draft.liveStreamCrabUrl.trim() || 'not linked'}</span>
              <span>Transcript: {draft.transcriptCrabUrl.trim() || 'not linked'}</span>
              <span>Clip / preview: {draft.clipCrabUrl.trim() || 'not linked'}</span>
              <span>Rights gate: {attestationReady ? 'attested locally' : 'required before mint'}</span>
            </div>

            <div className="cl-podcast-tags">
              {stats.tags.length ? (
                stats.tags.map((tag) => <span key={tag}>{tag}</span>)
              ) : (
                <span>No tags</span>
              )}
            </div>
          </section>

          <section className="cl-podcast-panel cl-podcast-route-debug" aria-label="Route debug">
            <p className="cl-eyebrow">Route debug</p>
            <dl>
              <div>
                <dt>Route kind</dt>
                <dd>{route?.kind || 'podcast'}</dd>
              </div>
              <div>
                <dt>Route type</dt>
                <dd>{route?.routeType || 'builtin'}</dd>
              </div>
              <div>
                <dt>Normalized</dt>
                <dd>{route?.normalizedInput || 'crab://podcast'}</dd>
              </div>
              <div>
                <dt>Audio file</dt>
                <dd>{audioMeta?.name || 'none'}</dd>
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
    <div className="cl-podcast-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildPodcastStats(draft, audioMeta, studioState, ownershipAttestation) {
  const tagList = String(draft.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const linkedAssetCount = [
    draft.coverImageCrabUrl,
    draft.audioCrabUrl,
    draft.liveStreamCrabUrl,
    draft.transcriptCrabUrl,
    draft.clipCrabUrl,
    draft.siteContextCrabUrl,
  ].filter((value) => String(value || '').trim()).length;

  return {
    tags: tagList,
    linkedAssetCount,
    audioStatus: audioMeta
      ? audioMeta.source === 'recording'
        ? 'Recorded'
        : 'Selected'
      : 'Missing',
    onAir: Boolean(studioState?.onAir),
    micState: studioState?.micState || 'idle',
    recordingState: studioState?.recordingState || 'idle',
    rightsAttested: isPodcastOwnershipAttestationReady(ownershipAttestation),
  };
}

function buildPodcastManifest(draft, stats, route, audioMeta, studioState, legalAttestation) {
  const title = draft.title.trim();
  const showTitle = draft.showTitle.trim();
  const hostDisplay = draft.hostDisplay.trim();
  const coverImage = draft.coverImageCrabUrl.trim();
  const audio = draft.audioCrabUrl.trim();
  const liveStream = draft.liveStreamCrabUrl.trim();
  const transcript = draft.transcriptCrabUrl.trim();
  const clip = draft.clipCrabUrl.trim();
  const siteContext = draft.siteContextCrabUrl.trim();

  return {
    schema: 'crablink.local.podcast-studio-draft.v2',
    status: 'local_studio_draft_until_uploaded',
    route: {
      owner: 'PodcastPage.jsx',
      source_route: route?.normalizedInput || 'crab://podcast',
      route_kind: route?.kind || 'podcast',
    },
    asset: {
      kind: 'podcast',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
    },
    metadata: {
      title,
      show_title: showTitle,
      host_display: hostDisplay,
      cohosts: draft.cohosts
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
      episode_type: draft.episodeType,
      source_mode: draft.sourceMode,
      language: draft.language,
      category: draft.category,
      duration: draft.duration.trim() || audioMeta?.durationLabel || null,
      season: draft.season.trim() || null,
      episode_number: draft.episodeNumber.trim() || null,
      explicit_rating: draft.explicitRating,
      schedule_mode: draft.scheduleMode,
      release_date: draft.releaseDate.trim() || null,
      tags: stats.tags,
      description: draft.description.trim(),
      episode_notes: draft.episodeNotes.trim(),
      transcript_summary: draft.transcriptSummary.trim(),
      content_warning: draft.contentWarning.trim() || null,
    },
    local_studio: {
      audio_loaded: Boolean(audioMeta),
      audio_source: audioMeta?.source || null,
      file_name_display: audioMeta?.name || null,
      content_type: audioMeta?.type || null,
      size_bytes: audioMeta?.size || null,
      duration_label: audioMeta?.durationLabel || null,
      on_air: Boolean(studioState?.onAir),
      mic_state: studioState?.micState || 'idle',
      recording_state: studioState?.recordingState || 'idle',
      processing: {
        preamp_db: studioState?.controls?.preampDb ?? null,
        input_gain_percent: studioState?.controls?.inputGain ?? null,
        noise_gate_enabled: Boolean(studioState?.controls?.noiseGateEnabled),
        noise_gate_threshold_db: studioState?.controls?.noiseGateThresholdDb ?? null,
        noise_gate_reduction_percent: studioState?.controls?.noiseGateReduction ?? null,
        voice_leveler_enabled: Boolean(studioState?.controls?.voiceLevelerEnabled),
        monitor_enabled: Boolean(studioState?.controls?.monitorEnabled),
      },
      stores_file_path: false,
      object_url_in_manifest: false,
      backend_uploaded: false,
    },
    linked_assets: {
      cover_image_crab_url: coverImage || null,
      cover_image_upload_from_podcast_page: false,
      audio_crab_url: audio || null,
      live_stream_crab_url: liveStream || null,
      transcript_crab_url: transcript || null,
      clip_crab_url: clip || null,
      site_context_crab_url: siteContext || null,
      alternates: [],
      renditions: [],
    },
    ownership: {
      creator_display: hostDisplay,
      passport_subject_label: '',
      wallet_account_label: '',
      backend_confirmed: false,
      legal_attestation: legalAttestation,
    },
    rights_policy: {
      rights_mode: draft.rightsMode,
      legal_attestation_required_before_publish: true,
      legal_attestation_accepted: Boolean(legalAttestation.accepted),
      guest_permission_attested: Boolean(legalAttestation.confirmations?.guest_permissions),
      backend_confirmed: false,
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
      created_by: 'CrabLink React podcast studio',
      source: 'crab://podcast workspace',
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
      upload_backend_confirmed: false,
      stream_backend_confirmed: false,
      recording_is_backend_stream: false,
      rights_backend_confirmed: false,
      guest_release_backend_verified: false,
      cover_art_upload_from_podcast_page: false,
      cover_art_reference_only: true,
    },
  };
}

function labelFromSnake(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}