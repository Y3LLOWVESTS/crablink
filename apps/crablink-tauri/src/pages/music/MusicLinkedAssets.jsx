/**
 * RO:WHAT — Linked asset form for the React crab://music workspace.
 * RO:WHY — Keeps cover art, lyrics, previews, full audio, stems, and video as explicit manifest references.
 * RO:INTERACTS — MusicPage, MusicDraft, MusicRights, music.css.
 * RO:INVARIANTS — linked assets are references only; lyrics remain separate; no upload, no fake CID, no paid event.
 * RO:METRICS — none.
 * RO:CONFIG — draft props passed from MusicPage.
 * RO:SECURITY — does not dereference or execute crab URLs; stores plain text references only.
 * RO:TEST — manual linked asset form smoke and npm build.
 */

export default function MusicLinkedAssets({ draft, onChange }) {
  function updateField(field, value) {
    onChange({
      ...draft,
      [field]: value,
    });
  }

  return (
    <section className="cl-music-subpanel" aria-label="Linked music assets">
      <div className="cl-music-subhead">
        <p className="cl-eyebrow">Linked assets</p>
        <h3>References, not embedded bytes</h3>
        <p>
          Each linked object should eventually be independently b3-addressed. Lyrics are especially
          important: they stay as a separate typed asset referenced from the music manifest.
        </p>
      </div>

      <div className="cl-music-form">
        <div className="cl-music-two">
          <Field label="Cover image crab URL">
            <input
              value={draft.coverImageCrabUrl}
              onChange={(event) => updateField('coverImageCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.image"
            />
          </Field>

          <Field label="Lyrics crab URL">
            <input
              value={draft.lyricsCrabUrl}
              onChange={(event) => updateField('lyricsCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.lyrics"
            />
          </Field>
        </div>

        <div className="cl-music-two">
          <Field label="Preview audio crab URL">
            <input
              value={draft.audioPreviewCrabUrl}
              onChange={(event) => updateField('audioPreviewCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.music or preview asset"
            />
          </Field>

          <Field label="Full audio crab URL">
            <input
              value={draft.fullAudioCrabUrl}
              onChange={(event) => updateField('fullAudioCrabUrl', event.target.value)}
              placeholder="future backend-confirmed audio asset"
            />
          </Field>
        </div>

        <div className="cl-music-two">
          <Field label="Stem pack crab URL">
            <input
              value={draft.stemPackCrabUrl}
              onChange={(event) => updateField('stemPackCrabUrl', event.target.value)}
              placeholder="future stems / alternate mix asset"
            />
          </Field>

          <Field label="Music video crab URL">
            <input
              value={draft.videoCrabUrl}
              onChange={(event) => updateField('videoCrabUrl', event.target.value)}
              placeholder="crab://<64hex>.video"
            />
          </Field>
        </div>

        <Field label="Site / album page context">
          <input
            value={draft.siteContextCrabUrl}
            onChange={(event) => updateField('siteContextCrabUrl', event.target.value)}
            placeholder="crab://artist-site or crab://album-page"
          />
        </Field>

        <div className="cl-music-linked-note">
          <strong>Manifest rule</strong>
          <span>
            This UI only records references. The storage layer stores bytes by content ID, while
            manifests, ownership, names, payout, and linked asset discovery live upstream.
          </span>
        </div>
      </div>
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