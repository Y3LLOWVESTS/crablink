/**
 * RO:WHAT — Local podcast draft form for the React crab://podcast workspace.
 * RO:WHY — Lets creators shape a future podcast episode/show manifest without touching backend truth.
 * RO:INTERACTS — PodcastPage, podcast.css, future uniform manifest and profile/passport context.
 * RO:INVARIANTS — local form state only; no fake b3 CID; no wallet mutation; no backend publication.
 * RO:METRICS — none.
 * RO:CONFIG — draft props passed from PodcastPage.
 * RO:SECURITY — no HTML rendering from text fields; preview remains plain trusted React text.
 * RO:TEST — manual Builder mode smoke and npm build.
 */

const EPISODE_TYPE_OPTIONS = Object.freeze([
  ['audio_episode', 'Audio episode'],
  ['video_podcast', 'Video podcast'],
  ['live_stream_episode', 'Live-stream-derived episode'],
  ['short_clip', 'Short clip'],
  ['trailer', 'Trailer'],
  ['bonus_episode', 'Bonus episode'],
]);

const SOURCE_OPTIONS = Object.freeze([
  ['audio_upload_future', 'Audio upload later'],
  ['live_stream_capture_future', 'Live stream capture later'],
  ['post_stream_publish_future', 'Post-stream publish later'],
  ['external_reference_review', 'External reference / review'],
  ['local_draft_only', 'Local draft only'],
]);

const EXPLICIT_OPTIONS = Object.freeze([
  ['not_marked', 'Not marked'],
  ['clean', 'Clean'],
  ['explicit', 'Explicit'],
]);

const SCHEDULE_OPTIONS = Object.freeze([
  ['draft_unscheduled', 'Draft / unscheduled'],
  ['scheduled_release_future', 'Scheduled release later'],
  ['published_after_stream_future', 'Publish after stream later'],
  ['evergreen_episode', 'Evergreen episode'],
]);

const ACCESS_OPTIONS = Object.freeze([
  ['public_preview', 'Public preview'],
  ['free_stream_future', 'Free stream later'],
  ['paid_stream_future', 'Paid stream later'],
  ['paid_download_future', 'Paid download later'],
  ['members_or_followers', 'Members / followers'],
  ['private_draft', 'Private draft'],
]);

const RIGHTS_OPTIONS = Object.freeze([
  ['creator_owned_original', 'Creator-owned / original'],
  ['show_network_owned', 'Show / network owned'],
  ['guest_release_required', 'Guest release required'],
  ['licensed_music_or_clips', 'Licensed music / clips'],
  ['rights_review_required', 'Rights review required'],
]);

const PAYOUT_OPTIONS = Object.freeze([
  ['creator_wallet_future', 'Creator wallet later'],
  ['host_split_future', 'Host split later'],
  ['network_split_future', 'Network split later'],
  ['show_guest_split_future', 'Show / guest split later'],
  ['no_payout_local_draft', 'No payout / local draft'],
]);

export default function PodcastDraft({ draft, onChange, stats }) {
  function updateField(field, value) {
    onChange({
      ...draft,
      [field]: value,
    });
  }

  return (
    <form className="cl-podcast-form" onSubmit={(event) => event.preventDefault()}>
      <section className="cl-podcast-subpanel" aria-label="Podcast metadata">
        <div className="cl-podcast-subhead">
          <p className="cl-eyebrow">Metadata</p>
          <h3>Episode details</h3>
        </div>

        <div className="cl-podcast-two">
          <Field label="Episode title">
            <input
              value={draft.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Example: Building the crab web"
              maxLength={180}
            />
          </Field>

          <Field label="Show title">
            <input
              value={draft.showTitle}
              onChange={(event) => updateField('showTitle', event.target.value)}
              placeholder="show / podcast name"
              maxLength={180}
            />
          </Field>
        </div>

        <div className="cl-podcast-two">
          <Field label="Host display">
            <input
              value={draft.hostDisplay}
              onChange={(event) => updateField('hostDisplay', event.target.value)}
              placeholder="host name or @username"
              maxLength={100}
            />
          </Field>

          <Field label="Co-hosts / guests">
            <input
              value={draft.cohosts}
              onChange={(event) => updateField('cohosts', event.target.value)}
              placeholder="comma-separated names"
              maxLength={240}
            />
          </Field>
        </div>

        <div className="cl-podcast-two">
          <Field label="Episode type">
            <select
              value={draft.episodeType}
              onChange={(event) => updateField('episodeType', event.target.value)}
            >
              {EPISODE_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Source mode">
            <select
              value={draft.sourceMode}
              onChange={(event) => updateField('sourceMode', event.target.value)}
            >
              {SOURCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-podcast-four">
          <Field label="Language">
            <input
              value={draft.language}
              onChange={(event) => updateField('language', event.target.value)}
              placeholder="en"
              maxLength={16}
            />
          </Field>

          <Field label="Category">
            <input
              value={draft.category}
              onChange={(event) => updateField('category', event.target.value)}
              placeholder="news, comedy, tech..."
              maxLength={80}
            />
          </Field>

          <Field label="Season">
            <input
              value={draft.season}
              onChange={(event) => updateField('season', event.target.value)}
              placeholder="1"
              maxLength={12}
            />
          </Field>

          <Field label="Episode #">
            <input
              value={draft.episodeNumber}
              onChange={(event) => updateField('episodeNumber', event.target.value)}
              placeholder="1"
              maxLength={12}
            />
          </Field>
        </div>

        <div className="cl-podcast-two">
          <Field label="Duration">
            <input
              value={draft.duration}
              onChange={(event) => updateField('duration', event.target.value)}
              placeholder="48:00"
              maxLength={24}
            />
          </Field>

          <Field label="Explicit rating">
            <select
              value={draft.explicitRating}
              onChange={(event) => updateField('explicitRating', event.target.value)}
            >
              {EXPLICIT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Short episode description for feeds, profiles, show pages, or asset pages..."
            rows={4}
            maxLength={1400}
          />
        </Field>

        <Field label="Episode notes">
          <textarea
            value={draft.episodeNotes}
            onChange={(event) => updateField('episodeNotes', event.target.value)}
            placeholder="Guest notes, topics, chapters, links, credits, sponsors, or local draft notes..."
            rows={4}
          />
        </Field>

        <Field label="Transcript summary">
          <textarea
            value={draft.transcriptSummary}
            onChange={(event) => updateField('transcriptSummary', event.target.value)}
            placeholder="Optional transcript summary. The full transcript should be a linked asset later."
            rows={3}
          />
        </Field>
      </section>

      <section className="cl-podcast-subpanel" aria-label="Linked podcast assets">
        <div className="cl-podcast-subhead">
          <p className="cl-eyebrow">Linked assets</p>
          <h3>References, not embedded bytes</h3>
          <p>
            Audio, stream captures, cover images, transcripts, and clips should eventually be
            independently b3-addressed and referenced from this manifest.
          </p>
        </div>

        <div className="cl-podcast-two">
          <Field label="Cover image crab URL">
            <input
              value={draft.coverImageCrabUrl}
              onChange={(event) => updateField('coverImageCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.image"
            />
          </Field>

          <Field label="Audio crab URL">
            <input
              value={draft.audioCrabUrl}
              onChange={(event) => updateField('audioCrabUrl', event.target.value)}
              placeholder="future backend-confirmed audio asset"
            />
          </Field>
        </div>

        <div className="cl-podcast-two">
          <Field label="Live stream crab URL">
            <input
              value={draft.liveStreamCrabUrl}
              onChange={(event) => updateField('liveStreamCrabUrl', event.target.value)}
              placeholder="crab://stream or future stream asset"
            />
          </Field>

          <Field label="Transcript crab URL">
            <input
              value={draft.transcriptCrabUrl}
              onChange={(event) => updateField('transcriptCrabUrl', event.target.value)}
              placeholder="future transcript asset"
            />
          </Field>
        </div>

        <div className="cl-podcast-two">
          <Field label="Clip / preview crab URL">
            <input
              value={draft.clipCrabUrl}
              onChange={(event) => updateField('clipCrabUrl', event.target.value)}
              placeholder="future short clip asset"
            />
          </Field>

          <Field label="Show / site context">
            <input
              value={draft.siteContextCrabUrl}
              onChange={(event) => updateField('siteContextCrabUrl', event.target.value)}
              placeholder="crab://show-site"
            />
          </Field>
        </div>
      </section>

      <section className="cl-podcast-subpanel" aria-label="Podcast rights and access">
        <div className="cl-podcast-subhead">
          <p className="cl-eyebrow">Rights, access, payout</p>
          <h3>Local policy draft</h3>
        </div>

        <div className="cl-podcast-two">
          <Field label="Schedule mode">
            <select
              value={draft.scheduleMode}
              onChange={(event) => updateField('scheduleMode', event.target.value)}
            >
              {SCHEDULE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Release date / window">
            <input
              value={draft.releaseDate}
              onChange={(event) => updateField('releaseDate', event.target.value)}
              placeholder="optional"
              maxLength={80}
            />
          </Field>
        </div>

        <div className="cl-podcast-two">
          <Field label="Access mode">
            <select
              value={draft.accessMode}
              onChange={(event) => updateField('accessMode', event.target.value)}
            >
              {ACCESS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rights mode">
            <select
              value={draft.rightsMode}
              onChange={(event) => updateField('rightsMode', event.target.value)}
            >
              {RIGHTS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-podcast-two">
          <Field label="Payout mode">
            <select
              value={draft.payoutMode}
              onChange={(event) => updateField('payoutMode', event.target.value)}
            >
              {PAYOUT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Content warning">
            <input
              value={draft.contentWarning}
              onChange={(event) => updateField('contentWarning', event.target.value)}
              placeholder="optional"
              maxLength={120}
            />
          </Field>
        </div>

        <Field label="Tags">
          <input
            value={draft.tags}
            onChange={(event) => updateField('tags', event.target.value)}
            placeholder="podcast, episode, interview"
          />
        </Field>

        <div className="cl-podcast-builder-note">
          <strong>Builder note</strong>
          <span>
            {stats.tags.length} tags · {stats.linkedAssetCount} linked references. This route
            intentionally stops at local manifest design until backend podcast publication routes
            exist.
          </span>
        </div>
      </section>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="cl-podcast-field">
      <span>{label}</span>
      {children}
    </label>
  );
}