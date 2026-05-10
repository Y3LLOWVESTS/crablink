/**
 * RO:WHAT — Route owner for the React crab://podcast local creator workspace.
 * RO:WHY — CrabLink refactor; migrates podcast episode/show drafting before paid audio/stream publishing flows.
 * RO:INTERACTS — PodcastDraft, JsonPreview, app router, shared shell, future uniform manifest model.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC mutation; no backend publication claim.
 * RO:METRICS — none; future publish/prepare routes must use gateway client metrics/correlation IDs.
 * RO:CONFIG — route props only; future settings/passport context may prefill creator labels.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; check-react-lane; manual crab://podcast route smoke.
 */

import { useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PodcastDraft from './PodcastDraft.jsx';
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

export default function PodcastPage({ route }) {
  const [draft, setDraft] = useState({ ...INITIAL_DRAFT });
  const [viewMode, setViewMode] = useState('builder');
  const [copyState, setCopyState] = useState('');

  const stats = useMemo(() => buildPodcastStats(draft), [draft]);
  const manifest = useMemo(() => buildPodcastManifest(draft, stats, route), [draft, stats, route]);

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
    setCopyState('Local draft cleared');
    window.setTimeout(() => setCopyState(''), 1800);
  }

  return (
    <section className="cl-podcast-page" aria-labelledby="cl-podcast-title">
      <header className="cl-podcast-hero">
        <div>
          <p className="cl-eyebrow">crab://podcast</p>
          <h1 id="cl-podcast-title">Podcast Workspace</h1>
          <p>
            Draft standalone podcast episode or show assets that can later link to audio, live
            stream sources, transcripts, clips, cover images, rights policy, and payout routing.
            This React route is local-only and does not publish anything yet.
          </p>
        </div>

        <aside className="cl-podcast-route-card" aria-label="Route owner">
          <span>Route owner</span>
          <strong>PodcastPage.jsx</strong>
          <small>React lane · local draft</small>
        </aside>
      </header>

      <div className="cl-podcast-principles" aria-label="Podcast asset principles">
        <article>
          <strong>Episode as asset</strong>
          <span>Podcast episodes should become b3-addressed assets with manifest-backed metadata.</span>
        </article>
        <article>
          <strong>Stream compatible</strong>
          <span>Episodes may be audio uploads, live-stream-derived, or post-stream published.</span>
        </article>
        <article>
          <strong>Linked media</strong>
          <span>Audio, transcripts, clips, covers, and show pages stay as explicit asset references.</span>
        </article>
      </div>

      <div className="cl-podcast-layout">
        <main className="cl-podcast-main">
          <div className="cl-podcast-panel">
            <div className="cl-podcast-panel-head">
              <div>
                <p className="cl-eyebrow">Local creator draft</p>
                <h2>Podcast asset draft</h2>
                <p>
                  Compose a future podcast manifest. The JSON preview is useful for design and
                  backend contract review, but it is not backend truth.
                </p>
              </div>

              <div className="cl-podcast-toggle" role="group" aria-label="View mode">
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
              <PodcastDraft draft={draft} onChange={setDraft} stats={stats} />
            ) : (
              <JsonPreview label="Local podcast manifest JSON" data={manifest} initiallyOpen />
            )}

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
            <p className="cl-eyebrow">Draft stats</p>
            <div className="cl-podcast-stat-grid">
              <Stat label="Tags" value={stats.tags.length} />
              <Stat label="Links" value={stats.linkedAssetCount} />
              <Stat label="Source" value={labelFromSnake(draft.sourceMode)} />
              <Stat label="Access" value={labelFromSnake(draft.accessMode)} />
            </div>

            <div className="cl-podcast-truth-box">
              <strong>Truth boundary</strong>
              <p>
                This is local UI state only. It does not create a content ID, manifest ID, receipt,
                index pointer, publication, upload, hold, capture, release, or paid access event.
              </p>
            </div>
          </section>

          <section className="cl-podcast-panel cl-podcast-preview" aria-label="Podcast preview">
            <p className="cl-eyebrow">Preview</p>

            <div className="cl-podcast-cover">
              {draft.coverImageCrabUrl.trim() ? (
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
              <span>Audio: {draft.audioCrabUrl.trim() || 'not linked'}</span>
              <span>Live stream source: {draft.liveStreamCrabUrl.trim() || 'not linked'}</span>
              <span>Transcript: {draft.transcriptCrabUrl.trim() || 'not linked'}</span>
              <span>Clip / preview: {draft.clipCrabUrl.trim() || 'not linked'}</span>
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

function buildPodcastStats(draft) {
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
  };
}

function buildPodcastManifest(draft, stats, route) {
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
    schema: 'crablink.local.podcast-draft.v1',
    status: 'local_draft_only',
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
      duration: draft.duration.trim() || null,
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
    linked_assets: {
      cover_image_crab_url: coverImage || null,
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
    },
    rights_policy: {
      rights_mode: draft.rightsMode,
      backend_confirmed: false,
    },
    access_policy: {
      mode: draft.accessMode,
      paid_access: draft.accessMode === 'paid_stream_future' || draft.accessMode === 'paid_download_future',
      roc_price_minor: null,
    },
    economics: {
      payout_mode: draft.payoutMode,
      split_policy_ref: null,
      backend_confirmed: false,
    },
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://podcast workspace',
      version: 1,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_only: true,
      creates_content_id: false,
      creates_manifest_id: false,
      creates_index_pointer: false,
      publishes_to_gateway: false,
      charges_roc: false,
      wallet_mutation: false,
      upload_backend_confirmed: false,
      stream_backend_confirmed: false,
      rights_backend_confirmed: false,
    },
  };
}

function labelFromSnake(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}