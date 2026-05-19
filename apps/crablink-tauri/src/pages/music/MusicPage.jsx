/**
 * RO:WHAT — Route owner for the React crab://music local creator workspace.
 * RO:WHY — CrabLink refactor; migrates the music/song asset primitive before paid media upload flows.
 * RO:INTERACTS — MusicDraft, MusicLinkedAssets, MusicRights, JsonPreview, app router, shared shell.
 * RO:INVARIANTS — local draft only; no fake b3 CID; lyrics remain a separate linked asset; no ROC mutation.
 * RO:METRICS — none; future publish/prepare routes must use gateway client metrics/correlation IDs.
 * RO:CONFIG — route props only; future settings/passport context may prefill creator labels.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; check-react-lane; manual crab://music route smoke.
 */

import { useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import MusicDraft from './MusicDraft.jsx';
import MusicLinkedAssets from './MusicLinkedAssets.jsx';
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

export default function MusicPage({ route }) {
  const [draft, setDraft] = useState({ ...INITIAL_DRAFT });
  const [viewMode, setViewMode] = useState('builder');
  const [copyState, setCopyState] = useState('');

  const stats = useMemo(() => buildMusicStats(draft), [draft]);
  const manifest = useMemo(() => buildMusicManifest(draft, stats, route), [draft, stats, route]);

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
    <section className="cl-music-page" aria-labelledby="cl-music-title">
      <header className="cl-music-hero">
        <div>
          <p className="cl-eyebrow">crab://music</p>
          <h1 id="cl-music-title">Music Workspace</h1>
          <p>
            Draft standalone music/song assets that can later link to lyrics, cover art, previews,
            videos, stems, rights policy, and payout routing. This React route is local-only and
            does not publish anything yet.
          </p>
        </div>

        <aside className="cl-music-route-card" aria-label="Route owner">
          <span>Route owner</span>
          <strong>MusicPage.jsx</strong>
          <small>React lane · local draft</small>
        </aside>
      </header>

      <div className="cl-music-principles" aria-label="Music asset principles">
        <article>
          <strong>Music as asset</strong>
          <span>Music should become its own b3-addressed asset with manifest-backed metadata.</span>
        </article>
        <article>
          <strong>Lyrics stay separate</strong>
          <span>Lyrics should be linked as their own typed asset, not embedded into the song.</span>
        </article>
        <article>
          <strong>Rights-aware</strong>
          <span>Licensing, payout, access, versions, and receipts belong in the manifest.</span>
        </article>
      </div>

      <div className="cl-music-layout">
        <main className="cl-music-main">
          <div className="cl-music-panel">
            <div className="cl-music-panel-head">
              <div>
                <p className="cl-eyebrow">Local creator draft</p>
                <h2>Music asset draft</h2>
                <p>
                  Compose a future music manifest. The JSON preview is useful for design and
                  backend contract review, but it is not backend truth.
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
                <MusicDraft draft={draft} onChange={setDraft} stats={stats} />
                <MusicLinkedAssets draft={draft} onChange={setDraft} />
                <MusicRights draft={draft} onChange={setDraft} />
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
            <p className="cl-eyebrow">Draft stats</p>
            <div className="cl-music-stat-grid">
              <Stat label="Tags" value={stats.tags.length} />
              <Stat label="Links" value={stats.linkedAssetCount} />
              <Stat label="Rights" value={labelFromSnake(draft.rightsMode)} />
              <Stat label="Access" value={labelFromSnake(draft.accessMode)} />
            </div>

            <div className="cl-music-truth-box">
              <strong>Truth boundary</strong>
              <p>
                This is local UI state only. It does not create a content ID, manifest ID, receipt,
                index pointer, publication, hold, capture, release, stream, or paid access event.
              </p>
            </div>
          </section>

          <section className="cl-music-panel cl-music-preview" aria-label="Music preview">
            <p className="cl-eyebrow">Preview</p>

            <div className="cl-music-cover">
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
              <span>Lyrics: {draft.lyricsCrabUrl.trim() || 'not linked'}</span>
              <span>Preview audio: {draft.audioPreviewCrabUrl.trim() || 'not linked'}</span>
              <span>Full audio: {draft.fullAudioCrabUrl.trim() || 'not linked'}</span>
            </div>

            <div className="cl-music-tags">
              {stats.tags.length ? (
                stats.tags.map((tag) => <span key={tag}>{tag}</span>)
              ) : (
                <span>No tags</span>
              )}
            </div>
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

function buildMusicStats(draft) {
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

  return {
    tags: tagList,
    linkedAssetCount,
  };
}

function buildMusicManifest(draft, stats, route) {
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

  return {
    schema: 'crablink.local.music-draft.v1',
    status: 'local_draft_only',
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
      duration: draft.duration.trim() || null,
      bpm: draft.bpm.trim() || null,
      key_signature: draft.keySignature.trim() || null,
      explicit_rating: draft.explicitRating,
      tags: stats.tags,
      description: draft.description.trim(),
      track_notes: draft.trackNotes.trim(),
    },
    linked_assets: {
      cover_image_crab_url: coverImage || null,
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
    },
    rights_policy: {
      rights_mode: draft.rightsMode,
      license_mode: draft.licenseMode,
      lyrics_are_separate_asset: true,
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
      source: 'crab://music workspace',
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