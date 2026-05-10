/**
 * RO:WHAT — Local stream setup form for the React crab://stream workspace.
 * RO:WHY — Lets creators shape a future stream manifest without touching backend truth.
 * RO:INTERACTS — StreamPage, StreamPodcastMode, stream.css, future stream/session APIs.
 * RO:INVARIANTS — local form state only; no fake endpoint; no fake b3 CID; no wallet mutation; no backend publication.
 * RO:METRICS — none.
 * RO:CONFIG — draft props passed from StreamPage.
 * RO:SECURITY — no stream keys, ingest tokens, private URLs, or spend authority are collected here.
 * RO:TEST — manual Builder mode smoke and npm build.
 */

const STREAM_KIND_OPTIONS = Object.freeze([
  ['live_video', 'Live video'],
  ['live_audio', 'Live audio'],
  ['screen_share', 'Screen share'],
  ['premiere', 'Premiere'],
  ['watch_party', 'Watch party'],
  ['creator_event', 'Creator event'],
]);

const SCHEDULE_OPTIONS = Object.freeze([
  ['draft_unscheduled', 'Draft / unscheduled'],
  ['scheduled_future', 'Scheduled later'],
  ['go_live_now_future', 'Go live later'],
  ['recurring_show_future', 'Recurring show later'],
  ['premiere_window_future', 'Premiere window later'],
]);

const SOURCE_OPTIONS = Object.freeze([
  ['future_stream_endpoint', 'Future stream endpoint'],
  ['browser_capture_future', 'Browser capture later'],
  ['external_encoder_future', 'External encoder later'],
  ['mobile_capture_future', 'Mobile capture later'],
  ['local_draft_only', 'Local draft only'],
]);

const INGEST_OPTIONS = Object.freeze([
  ['future_gateway_ingest', 'Gateway ingest later'],
  ['future_edge_ingest', 'Edge ingest later'],
  ['external_ingest_review', 'External ingest / review'],
  ['none_local_draft', 'None / local draft'],
]);

const ACCESS_OPTIONS = Object.freeze([
  ['public_preview', 'Public preview'],
  ['free_live_future', 'Free live later'],
  ['paid_stream_future', 'Paid stream later'],
  ['ticketed_live_future', 'Ticketed live later'],
  ['members_or_followers', 'Members / followers'],
  ['private_rehearsal', 'Private rehearsal'],
]);

const CHAT_OPTIONS = Object.freeze([
  ['chat_enabled_future', 'Chat enabled later'],
  ['chat_disabled', 'Chat disabled'],
  ['followers_only_future', 'Followers only later'],
  ['members_only_future', 'Members only later'],
  ['moderated_chat_future', 'Moderated chat later'],
]);

const MODERATION_OPTIONS = Object.freeze([
  ['site_policy_or_creator_default', 'Site policy or creator default'],
  ['creator_only', 'Creator only'],
  ['site_moderators', 'Site moderators'],
  ['slow_mode_future', 'Slow mode later'],
  ['approval_required_future', 'Approval required later'],
]);

const REPLAY_OPTIONS = Object.freeze([
  ['replay_asset_future', 'Replay asset later'],
  ['no_replay', 'No replay'],
  ['private_replay_future', 'Private replay later'],
  ['clips_only_future', 'Clips only later'],
]);

const RIGHTS_OPTIONS = Object.freeze([
  ['creator_owned_original', 'Creator-owned / original'],
  ['licensed_media_review_required', 'Licensed media review required'],
  ['event_organizer_owned', 'Event organizer owned'],
  ['collaboration_or_guest_release', 'Collaboration / guest release'],
  ['rights_review_required', 'Rights review required'],
]);

const PAYOUT_OPTIONS = Object.freeze([
  ['creator_wallet_future', 'Creator wallet later'],
  ['split_policy_future', 'Split policy later'],
  ['host_guest_split_future', 'Host / guest split later'],
  ['site_split_future', 'Site split later'],
  ['no_payout_local_draft', 'No payout / local draft'],
]);

export default function StreamDraft({ draft, onChange, stats }) {
  function updateField(field, value) {
    onChange({
      ...draft,
      [field]: value,
    });
  }

  return (
    <form className="cl-stream-form" onSubmit={(event) => event.preventDefault()}>
      <section className="cl-stream-subpanel" aria-label="Stream metadata">
        <div className="cl-stream-subhead">
          <p className="cl-eyebrow">Metadata</p>
          <h3>Stream details</h3>
        </div>

        <div className="cl-stream-two">
          <Field label="Stream title">
            <input
              value={draft.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Example: Crab web launch stream"
              maxLength={180}
            />
          </Field>

          <Field label="Channel display">
            <input
              value={draft.channelDisplay}
              onChange={(event) => updateField('channelDisplay', event.target.value)}
              placeholder="channel name or @username"
              maxLength={120}
            />
          </Field>
        </div>

        <div className="cl-stream-two">
          <Field label="Host display">
            <input
              value={draft.hostDisplay}
              onChange={(event) => updateField('hostDisplay', event.target.value)}
              placeholder="host name or @username"
              maxLength={120}
            />
          </Field>

          <Field label="Stream type">
            <select
              value={draft.streamKind}
              onChange={(event) => updateField('streamKind', event.target.value)}
            >
              {STREAM_KIND_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-stream-four">
          <Field label="Category">
            <input
              value={draft.category}
              onChange={(event) => updateField('category', event.target.value)}
              placeholder="gaming, music, tech..."
              maxLength={80}
            />
          </Field>

          <Field label="Language">
            <input
              value={draft.language}
              onChange={(event) => updateField('language', event.target.value)}
              placeholder="en"
              maxLength={16}
            />
          </Field>

          <Field label="Duration goal">
            <input
              value={draft.durationGoal}
              onChange={(event) => updateField('durationGoal', event.target.value)}
              placeholder="1h 30m"
              maxLength={40}
            />
          </Field>

          <Field label="Timezone">
            <input
              value={draft.timezone}
              onChange={(event) => updateField('timezone', event.target.value)}
              placeholder="local"
              maxLength={64}
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Short stream description for feeds, channel pages, profile catalogues, or stream listings..."
            rows={4}
            maxLength={1400}
          />
        </Field>

        <Field label="Stream notes">
          <textarea
            value={draft.streamNotes}
            onChange={(event) => updateField('streamNotes', event.target.value)}
            placeholder="Topics, guests, run of show, equipment notes, sponsor notes, or local draft notes..."
            rows={4}
          />
        </Field>
      </section>

      <section className="cl-stream-subpanel" aria-label="Schedule and source">
        <div className="cl-stream-subhead">
          <p className="cl-eyebrow">Schedule and source</p>
          <h3>No real endpoint yet</h3>
          <p>
            This draft does not create a stream endpoint, ingest token, recording session, or replay.
          </p>
        </div>

        <div className="cl-stream-two">
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

          <Field label="Start window">
            <input
              value={draft.startWindow}
              onChange={(event) => updateField('startWindow', event.target.value)}
              placeholder="optional date/time window"
              maxLength={100}
            />
          </Field>
        </div>

        <div className="cl-stream-two">
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

          <Field label="Ingest mode">
            <select
              value={draft.ingestMode}
              onChange={(event) => updateField('ingestMode', event.target.value)}
            >
              {INGEST_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="cl-stream-subpanel" aria-label="Linked stream assets">
        <div className="cl-stream-subhead">
          <p className="cl-eyebrow">Linked assets</p>
          <h3>References, not embedded bytes</h3>
        </div>

        <div className="cl-stream-two">
          <Field label="Cover image crab URL">
            <input
              value={draft.coverImageCrabUrl}
              onChange={(event) => updateField('coverImageCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.image"
            />
          </Field>

          <Field label="Poster image crab URL">
            <input
              value={draft.posterImageCrabUrl}
              onChange={(event) => updateField('posterImageCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.image"
            />
          </Field>
        </div>

        <div className="cl-stream-two">
          <Field label="Trailer video crab URL">
            <input
              value={draft.trailerVideoCrabUrl}
              onChange={(event) => updateField('trailerVideoCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.video"
            />
          </Field>

          <Field label="Replay video crab URL">
            <input
              value={draft.replayVideoCrabUrl}
              onChange={(event) => updateField('replayVideoCrabUrl', event.target.value)}
              placeholder="future backend-confirmed replay asset"
            />
          </Field>
        </div>

        <Field label="Site / channel context">
          <input
            value={draft.siteContextCrabUrl}
            onChange={(event) => updateField('siteContextCrabUrl', event.target.value)}
            placeholder="crab://channel-site"
          />
        </Field>
      </section>

      <section className="cl-stream-subpanel" aria-label="Access and moderation">
        <div className="cl-stream-subhead">
          <p className="cl-eyebrow">Access, chat, moderation</p>
          <h3>Local policy draft</h3>
        </div>

        <div className="cl-stream-two">
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

          <Field label="Replay mode">
            <select
              value={draft.replayMode}
              onChange={(event) => updateField('replayMode', event.target.value)}
            >
              {REPLAY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-stream-two">
          <Field label="Chat mode">
            <select
              value={draft.chatMode}
              onChange={(event) => updateField('chatMode', event.target.value)}
            >
              {CHAT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moderation mode">
            <select
              value={draft.moderationMode}
              onChange={(event) => updateField('moderationMode', event.target.value)}
            >
              {MODERATION_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-stream-two">
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
        </div>

        <div className="cl-stream-two">
          <Field label="Tags">
            <input
              value={draft.tags}
              onChange={(event) => updateField('tags', event.target.value)}
              placeholder="stream, live, creator"
            />
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

        <div className="cl-stream-builder-note">
          <strong>Builder note</strong>
          <span>
            {stats.tags.length} tags · {stats.linkedAssetCount} linked references. This route
            intentionally stops at local manifest design until backend stream/session routes exist.
          </span>
        </div>
      </section>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="cl-stream-field">
      <span>{label}</span>
      {children}
    </label>
  );
}