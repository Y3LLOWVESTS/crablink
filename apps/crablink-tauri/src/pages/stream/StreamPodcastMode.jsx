/**
 * RO:WHAT — Feature-gated stream plus podcast companion draft UI.
 * RO:WHY — Preserves the stream→podcast product idea without claiming backend capture/publishing exists.
 * RO:INTERACTS — StreamPage, StreamDraft, stream.css, future podcast/stream publish contracts.
 * RO:INVARIANTS — local draft only; no audio capture; no transcript generation; no podcast b3 output claim.
 * RO:METRICS — none.
 * RO:CONFIG — draft props passed from StreamPage.
 * RO:SECURITY — no recording permission, microphone access, ingest secret, or wallet authority is requested here.
 * RO:TEST — manual stream podcast companion smoke and npm build.
 */

const PODCAST_MODE_OPTIONS = Object.freeze([
  ['disabled', 'Disabled'],
  ['record_as_podcast_future', 'Record as podcast later'],
  ['extract_audio_future', 'Extract audio later'],
  ['publish_after_stream_future', 'Publish after stream later'],
  ['manual_episode_link_future', 'Manual episode link later'],
]);

export default function StreamPodcastMode({ draft, onChange }) {
  const enabled = draft.podcastMode !== 'disabled';

  function updateField(field, value) {
    onChange({
      ...draft,
      [field]: value,
    });
  }

  return (
    <section className="cl-stream-subpanel cl-stream-podcast-mode" aria-label="Stream podcast mode">
      <div className="cl-stream-subhead">
        <p className="cl-eyebrow">Stream + podcast</p>
        <h3>Companion output draft</h3>
        <p>
          This models the future “stream plus podcast” workflow. It does not capture audio, create a
          podcast asset, generate a transcript, or publish after the stream.
        </p>
      </div>

      <div className="cl-stream-form">
        <Field label="Podcast companion mode">
          <select
            value={draft.podcastMode}
            onChange={(event) => updateField('podcastMode', event.target.value)}
          >
            {PODCAST_MODE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        {enabled ? (
          <>
            <div className="cl-stream-two">
              <Field label="Podcast title">
                <input
                  value={draft.podcastTitle}
                  onChange={(event) => updateField('podcastTitle', event.target.value)}
                  placeholder="Optional title for future podcast output"
                  maxLength={180}
                />
              </Field>

              <Field label="Podcast output crab URL">
                <input
                  value={draft.podcastOutputCrabUrl}
                  onChange={(event) => updateField('podcastOutputCrabUrl', event.target.value)}
                  placeholder="future backend-confirmed podcast asset"
                />
              </Field>
            </div>

            <Field label="Podcast description">
              <textarea
                value={draft.podcastDescription}
                onChange={(event) => updateField('podcastDescription', event.target.value)}
                placeholder="Describe how this stream could become a podcast episode later..."
                rows={4}
              />
            </Field>

            <Field label="Podcast transcript crab URL">
              <input
                value={draft.podcastTranscriptCrabUrl}
                onChange={(event) => updateField('podcastTranscriptCrabUrl', event.target.value)}
                placeholder="future transcript asset"
              />
            </Field>
          </>
        ) : (
          <div className="cl-stream-podcast-disabled">
            <strong>Podcast mode disabled</strong>
            <span>
              The stream manifest will still include an explicit disabled companion section so
              future backend code can distinguish “not configured” from “forgotten.”
            </span>
          </div>
        )}

        <div className="cl-stream-podcast-note">
          <strong>Truth boundary</strong>
          <span>
            Podcast companion mode is a product draft only. A real implementation must use backend
            stream recording policy, storage, manifest creation, wallet confirmation if paid, and
            explicit user consent.
          </span>
        </div>
      </div>
    </section>
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