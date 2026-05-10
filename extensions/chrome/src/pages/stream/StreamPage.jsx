/**
 * RO:WHAT — Route owner for the React crab://stream local creator workspace.
 * RO:WHY — CrabLink refactor; migrates live stream setup before backend stream/session/publish flows exist.
 * RO:INTERACTS — StreamDraft, StreamPodcastMode, JsonPreview, app router, shared shell, future uniform manifest model.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake stream endpoint; no ROC mutation; no backend publication claim.
 * RO:METRICS — none; future stream/prepare routes must use gateway client metrics/correlation IDs.
 * RO:CONFIG — route props only; future settings/passport context may prefill creator labels.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; check-react-lane; manual crab://stream route smoke.
 */

import { useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StreamDraft from './StreamDraft.jsx';
import StreamPodcastMode from './StreamPodcastMode.jsx';
import './stream.css';

const INITIAL_DRAFT = Object.freeze({
  title: '',
  channelDisplay: '',
  hostDisplay: '',
  description: '',
  streamNotes: '',
  streamKind: 'live_video',
  category: 'independent',
  language: 'en',
  scheduleMode: 'draft_unscheduled',
  startWindow: '',
  timezone: 'local',
  durationGoal: '',
  sourceMode: 'future_stream_endpoint',
  ingestMode: 'future_gateway_ingest',
  accessMode: 'public_preview',
  replayMode: 'replay_asset_future',
  chatMode: 'chat_enabled_future',
  moderationMode: 'site_policy_or_creator_default',
  rightsMode: 'creator_owned_original',
  payoutMode: 'creator_wallet_future',
  coverImageCrabUrl: '',
  posterImageCrabUrl: '',
  trailerVideoCrabUrl: '',
  replayVideoCrabUrl: '',
  siteContextCrabUrl: '',
  podcastMode: 'disabled',
  podcastTitle: '',
  podcastDescription: '',
  podcastOutputCrabUrl: '',
  podcastTranscriptCrabUrl: '',
  tags: 'stream, demo',
  contentWarning: '',
});

export default function StreamPage({ route }) {
  const [draft, setDraft] = useState({ ...INITIAL_DRAFT });
  const [viewMode, setViewMode] = useState('builder');
  const [copyState, setCopyState] = useState('');

  const stats = useMemo(() => buildStreamStats(draft), [draft]);
  const manifest = useMemo(() => buildStreamManifest(draft, stats, route), [draft, stats, route]);

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
    <section className="cl-stream-page" aria-labelledby="cl-stream-title">
      <header className="cl-stream-hero">
        <div>
          <p className="cl-eyebrow">crab://stream</p>
          <h1 id="cl-stream-title">Stream Workspace</h1>
          <p>
            Draft live stream assets that can later connect to ingest endpoints, access policy,
            chat/moderation rules, replay assets, podcast outputs, and creator payout routing. This
            React route is local-only and does not start or publish a stream.
          </p>
        </div>

        <aside className="cl-stream-route-card" aria-label="Route owner">
          <span>Route owner</span>
          <strong>StreamPage.jsx</strong>
          <small>React lane · local draft</small>
        </aside>
      </header>

      <div className="cl-stream-principles" aria-label="Stream asset principles">
        <article>
          <strong>Live session as asset</strong>
          <span>Streams should become manifest-backed events with references to replay outputs.</span>
        </article>
        <article>
          <strong>Moderation-aware</strong>
          <span>Chat, access, and moderation policies must be explicit before real publishing.</span>
        </article>
        <article>
          <strong>Podcast companion</strong>
          <span>A stream may later generate or link a podcast output without pretending it exists now.</span>
        </article>
      </div>

      <div className="cl-stream-layout">
        <main className="cl-stream-main">
          <div className="cl-stream-panel">
            <div className="cl-stream-panel-head">
              <div>
                <p className="cl-eyebrow">Local creator draft</p>
                <h2>Stream setup draft</h2>
                <p>
                  Compose a future stream manifest. The JSON preview is useful for design and
                  backend contract review, but it is not backend truth.
                </p>
              </div>

              <div className="cl-stream-toggle" role="group" aria-label="View mode">
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
              <div className="cl-stream-builder-stack">
                <StreamDraft draft={draft} onChange={setDraft} stats={stats} />
                <StreamPodcastMode draft={draft} onChange={setDraft} />
              </div>
            ) : (
              <JsonPreview label="Local stream manifest JSON" data={manifest} initiallyOpen />
            )}

            <div className="cl-stream-actions">
              <button type="button" className="cl-stream-primary" onClick={copyManifest}>
                Copy local manifest JSON
              </button>
              <button type="button" onClick={clearDraft}>
                Clear local draft
              </button>
              {copyState ? <span role="status">{copyState}</span> : null}
            </div>
          </div>
        </main>

        <aside className="cl-stream-side">
          <section className="cl-stream-panel cl-stream-stats">
            <p className="cl-eyebrow">Draft stats</p>
            <div className="cl-stream-stat-grid">
              <Stat label="Tags" value={stats.tags.length} />
              <Stat label="Links" value={stats.linkedAssetCount} />
              <Stat label="Access" value={labelFromSnake(draft.accessMode)} />
              <Stat label="Podcast" value={labelFromSnake(draft.podcastMode)} />
            </div>

            <div className="cl-stream-truth-box">
              <strong>Truth boundary</strong>
              <p>
                This is local UI state only. It does not create a content ID, manifest ID, receipt,
                stream endpoint, ingest session, index pointer, publication, hold, capture, release,
                replay, podcast output, or paid access event.
              </p>
            </div>
          </section>

          <section className="cl-stream-panel cl-stream-preview" aria-label="Stream preview">
            <p className="cl-eyebrow">Preview</p>

            <div className="cl-stream-cover">
              {draft.posterImageCrabUrl.trim() || draft.coverImageCrabUrl.trim() ? (
                <>
                  <span>Visual reference</span>
                  <strong>{draft.posterImageCrabUrl.trim() || draft.coverImageCrabUrl.trim()}</strong>
                </>
              ) : (
                <>
                  <span>Poster / cover</span>
                  <strong>No image linked</strong>
                </>
              )}
            </div>

            <h2>{draft.title.trim() || 'Untitled stream'}</h2>
            <p className="cl-stream-preview-meta">
              {draft.channelDisplay.trim() || 'Unknown channel'} ·{' '}
              {draft.hostDisplay.trim() || 'Unknown host'} · {labelFromSnake(draft.streamKind)}
            </p>

            <article>
              {draft.description.trim() ? (
                <p>{draft.description.trim()}</p>
              ) : (
                <p>Your stream description will appear here.</p>
              )}

              {draft.streamNotes.trim() ? <p>{draft.streamNotes.trim()}</p> : null}
            </article>

            <div className="cl-stream-link-list">
              <span>Schedule: {labelFromSnake(draft.scheduleMode)}</span>
              <span>Start: {draft.startWindow.trim() || 'not scheduled'}</span>
              <span>Replay: {draft.replayVideoCrabUrl.trim() || 'not linked'}</span>
              <span>Podcast mode: {labelFromSnake(draft.podcastMode)}</span>
            </div>

            <div className="cl-stream-tags">
              {stats.tags.length ? (
                stats.tags.map((tag) => <span key={tag}>{tag}</span>)
              ) : (
                <span>No tags</span>
              )}
            </div>
          </section>

          <section className="cl-stream-panel cl-stream-route-debug" aria-label="Route debug">
            <p className="cl-eyebrow">Route debug</p>
            <dl>
              <div>
                <dt>Route kind</dt>
                <dd>{route?.kind || 'stream'}</dd>
              </div>
              <div>
                <dt>Route type</dt>
                <dd>{route?.routeType || 'builtin'}</dd>
              </div>
              <div>
                <dt>Normalized</dt>
                <dd>{route?.normalizedInput || 'crab://stream'}</dd>
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
    <div className="cl-stream-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildStreamStats(draft) {
  const tagList = String(draft.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const linkedAssetCount = [
    draft.coverImageCrabUrl,
    draft.posterImageCrabUrl,
    draft.trailerVideoCrabUrl,
    draft.replayVideoCrabUrl,
    draft.siteContextCrabUrl,
    draft.podcastOutputCrabUrl,
    draft.podcastTranscriptCrabUrl,
  ].filter((value) => String(value || '').trim()).length;

  return {
    tags: tagList,
    linkedAssetCount,
  };
}

function buildStreamManifest(draft, stats, route) {
  const title = draft.title.trim();
  const channelDisplay = draft.channelDisplay.trim();
  const hostDisplay = draft.hostDisplay.trim();
  const coverImage = draft.coverImageCrabUrl.trim();
  const posterImage = draft.posterImageCrabUrl.trim();
  const trailerVideo = draft.trailerVideoCrabUrl.trim();
  const replayVideo = draft.replayVideoCrabUrl.trim();
  const siteContext = draft.siteContextCrabUrl.trim();
  const podcastOutput = draft.podcastOutputCrabUrl.trim();
  const podcastTranscript = draft.podcastTranscriptCrabUrl.trim();

  return {
    schema: 'crablink.local.stream-draft.v1',
    status: 'local_draft_only',
    route: {
      owner: 'StreamPage.jsx',
      source_route: route?.normalizedInput || 'crab://stream',
      route_kind: route?.kind || 'stream',
    },
    asset: {
      kind: 'stream',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
    },
    metadata: {
      title,
      channel_display: channelDisplay,
      host_display: hostDisplay,
      stream_kind: draft.streamKind,
      category: draft.category,
      language: draft.language,
      duration_goal: draft.durationGoal.trim() || null,
      tags: stats.tags,
      description: draft.description.trim(),
      stream_notes: draft.streamNotes.trim(),
      content_warning: draft.contentWarning.trim() || null,
    },
    schedule: {
      mode: draft.scheduleMode,
      start_window: draft.startWindow.trim() || null,
      timezone: draft.timezone.trim() || 'local',
      backend_confirmed: false,
    },
    stream_plan: {
      source_mode: draft.sourceMode,
      ingest_mode: draft.ingestMode,
      stream_endpoint: null,
      ingest_token: null,
      backend_confirmed: false,
    },
    linked_assets: {
      cover_image_crab_url: coverImage || null,
      poster_image_crab_url: posterImage || null,
      trailer_video_crab_url: trailerVideo || null,
      replay_video_crab_url: replayVideo || null,
      site_context_crab_url: siteContext || null,
      alternates: [],
      renditions: [],
    },
    chat_policy: {
      mode: draft.chatMode,
      backend_confirmed: false,
    },
    moderation: {
      mode: draft.moderationMode,
      backend_confirmed: false,
    },
    replay_policy: {
      mode: draft.replayMode,
      replay_video_crab_url: replayVideo || null,
      backend_confirmed: false,
    },
    podcast_companion: {
      mode: draft.podcastMode,
      title: draft.podcastTitle.trim(),
      description: draft.podcastDescription.trim(),
      podcast_output_crab_url: podcastOutput || null,
      podcast_transcript_crab_url: podcastTranscript || null,
      backend_confirmed: false,
    },
    ownership: {
      creator_display: hostDisplay || channelDisplay,
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
      paid_access: draft.accessMode === 'paid_stream_future' || draft.accessMode === 'ticketed_live_future',
      roc_price_minor: null,
    },
    economics: {
      payout_mode: draft.payoutMode,
      split_policy_ref: null,
      backend_confirmed: false,
    },
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://stream workspace',
      version: 1,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_only: true,
      creates_content_id: false,
      creates_manifest_id: false,
      creates_index_pointer: false,
      creates_stream_endpoint: false,
      creates_ingest_session: false,
      publishes_to_gateway: false,
      charges_roc: false,
      wallet_mutation: false,
      replay_backend_confirmed: false,
      podcast_backend_confirmed: false,
    },
  };
}

function labelFromSnake(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}