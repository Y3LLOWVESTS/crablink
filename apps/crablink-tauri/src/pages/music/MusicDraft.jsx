/**
 * RO:WHAT — Local music metadata form for the React crab://music workspace.
 * RO:WHY — Lets creators shape a future music asset manifest without touching backend truth.
 * RO:INTERACTS — MusicPage, music.css, MusicLinkedAssets, MusicRights.
 * RO:INVARIANTS — local form state only; no fake b3 CID; no wallet mutation; lyrics remain linked separately.
 * RO:METRICS — none.
 * RO:CONFIG — draft props passed from MusicPage.
 * RO:SECURITY — no HTML rendering from text fields; preview remains plain trusted React text.
 * RO:TEST — manual Builder mode smoke and npm build.
 */

const RELEASE_OPTIONS = Object.freeze([
  ['single', 'Single'],
  ['track', 'Track'],
  ['ep', 'EP'],
  ['album_track', 'Album track'],
  ['demo', 'Demo'],
  ['live_recording', 'Live recording'],
  ['podcast_theme', 'Podcast / stream theme'],
]);

const EXPLICIT_OPTIONS = Object.freeze([
  ['not_marked', 'Not marked'],
  ['clean', 'Clean'],
  ['explicit', 'Explicit'],
  ['instrumental', 'Instrumental'],
]);

export default function MusicDraft({ draft, onChange, stats }) {
  function updateField(field, value) {
    onChange({
      ...draft,
      [field]: value,
    });
  }

  return (
    <section className="cl-music-subpanel" aria-label="Music metadata">
      <div className="cl-music-subhead">
        <p className="cl-eyebrow">Metadata</p>
        <h3>Track details</h3>
      </div>

      <form className="cl-music-form" onSubmit={(event) => event.preventDefault()}>
        <div className="cl-music-two">
          <Field label="Track / song title">
            <input
              value={draft.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Example: Dusty Onion Blues"
              maxLength={180}
            />
          </Field>

          <Field label="Artist / creator display">
            <input
              value={draft.artistDisplay}
              onChange={(event) => updateField('artistDisplay', event.target.value)}
              placeholder="artist name or @username"
              maxLength={100}
            />
          </Field>
        </div>

        <div className="cl-music-two">
          <Field label="Album / collection">
            <input
              value={draft.albumTitle}
              onChange={(event) => updateField('albumTitle', event.target.value)}
              placeholder="optional album title"
              maxLength={180}
            />
          </Field>

          <Field label="Release type">
            <select
              value={draft.releaseType}
              onChange={(event) => updateField('releaseType', event.target.value)}
            >
              {RELEASE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-music-two">
          <Field label="Genre">
            <input
              value={draft.genre}
              onChange={(event) => updateField('genre', event.target.value)}
              placeholder="independent, rock, ambient, folk..."
              maxLength={80}
            />
          </Field>

          <Field label="Mood">
            <input
              value={draft.mood}
              onChange={(event) => updateField('mood', event.target.value)}
              placeholder="uplifting, dark, chill..."
              maxLength={80}
            />
          </Field>
        </div>

        <div className="cl-music-four">
          <Field label="Duration">
            <input
              value={draft.duration}
              onChange={(event) => updateField('duration', event.target.value)}
              placeholder="3:45"
              maxLength={16}
            />
          </Field>

          <Field label="BPM">
            <input
              value={draft.bpm}
              onChange={(event) => updateField('bpm', event.target.value)}
              placeholder="120"
              maxLength={12}
            />
          </Field>

          <Field label="Key">
            <input
              value={draft.keySignature}
              onChange={(event) => updateField('keySignature', event.target.value)}
              placeholder="A minor"
              maxLength={24}
            />
          </Field>

          <Field label="Rating">
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

        <div className="cl-music-two">
          <Field label="Language">
            <input
              value={draft.language}
              onChange={(event) => updateField('language', event.target.value)}
              placeholder="en"
              maxLength={16}
            />
          </Field>

          <Field label="Tags">
            <input
              value={draft.tags}
              onChange={(event) => updateField('tags', event.target.value)}
              placeholder="music, independent, demo"
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Short description that can appear on asset pages, profiles, feeds, or music catalogues..."
            rows={4}
            maxLength={1200}
          />
        </Field>

        <Field label="Track notes">
          <textarea
            value={draft.trackNotes}
            onChange={(event) => updateField('trackNotes', event.target.value)}
            placeholder="Credits, production notes, instrumentation, inspiration, or local draft notes..."
            rows={4}
          />
        </Field>

        <div className="cl-music-builder-note">
          <strong>Builder note</strong>
          <span>
            {stats.tags.length} tags · {stats.linkedAssetCount} linked asset references. This route
            intentionally stops at local manifest design until backend music publication routes
            exist.
          </span>
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="cl-music-field">
      <span>{label}</span>
      {children}
    </label>
  );
}