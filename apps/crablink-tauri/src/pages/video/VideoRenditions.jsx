/**
 * RO:WHAT — Rendition and linked-media editor for the React crab://video local draft workspace.
 * RO:WHY — Models the future video rendition graph while keeping every byte object independently content-addressed.
 * RO:INTERACTS — VideoPage local draft state, future renditionGroups and linkedAssets manifest helpers.
 * RO:INVARIANTS — references only; no fetch, upload, decompression, streaming, range serving, or CID minting.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — trusted local form UI only; crab URLs are stored as draft strings, not executed.
 * RO:TEST — manual rendition form smoke for crab://video.
 */

const RENDITION_ROWS = Object.freeze([
  {
    field: 'sourceMasterVideoCrabUrl',
    role: 'Source/master',
    kind: '.video',
    description: 'Original or highest-quality future source object.',
  },
  {
    field: 'desktopRenditionCrabUrl',
    role: 'Desktop',
    kind: '.video',
    description: 'Full web playback rendition for desktop/laptop displays.',
  },
  {
    field: 'mobileRenditionCrabUrl',
    role: 'Mobile',
    kind: '.video',
    description: 'Smaller or vertical-friendly rendition for phones.',
  },
  {
    field: 'lowBandwidthRenditionCrabUrl',
    role: 'Low bandwidth',
    kind: '.video',
    description: 'Reduced bitrate rendition for slow connections.',
  },
  {
    field: 'audioOnlyRenditionCrabUrl',
    role: 'Audio only',
    kind: '.music / .audio',
    description: 'Audio-only object for podcast-like listening or low-bandwidth use.',
  },
]);

const LINKED_ROWS = Object.freeze([
  {
    field: 'posterImageCrabUrl',
    role: 'Poster image',
    kind: '.image',
    description: 'Large cover/poster image. This should remain a canonical image asset.',
  },
  {
    field: 'thumbnailImageCrabUrl',
    role: 'Thumbnail image',
    kind: '.image',
    description: 'Small preview image for feeds, cards, and search.',
  },
  {
    field: 'trailerVideoCrabUrl',
    role: 'Trailer / preview',
    kind: '.video',
    description: 'Short trailer or preview clip.',
  },
  {
    field: 'captionsCrabUrl',
    role: 'Captions',
    kind: '.dub / future captions',
    description: 'Caption/subtitle reference. Future .dub assets can cover scripts, captions, or localization.',
  },
  {
    field: 'dubCrabUrl',
    role: 'Dub / localization',
    kind: '.dub',
    description: 'Future separately addressed dub/localization asset.',
  },
  {
    field: 'transcriptCrabUrl',
    role: 'Transcript',
    kind: '.article / transcript',
    description: 'Future transcript object for search, accessibility, and rights boundaries.',
  },
]);

export default function VideoRenditions({ draft, setDraft, stats }) {
  function updateField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <section className="cl-video-panel cl-video-renditions">
      <div className="cl-video-section-head">
        <div>
          <p className="cl-eyebrow">Renditions</p>
          <h2>Video rendition graph</h2>
        </div>
        <span>{stats.renditionCount} video renditions linked</span>
      </div>

      <p className="cl-video-muted">
        Each real rendition should eventually be an immutable b3-backed object with its own typed
        crab URL. This editor only records future references.
      </p>

      <div className="cl-video-rendition-list">
        {RENDITION_ROWS.map((row) => (
          <RenditionRow
            key={row.field}
            row={row}
            value={draft[row.field]}
            onChange={(value) => updateField(row.field, value)}
          />
        ))}
      </div>

      <div className="cl-video-section-head cl-video-linked-head">
        <div>
          <p className="cl-eyebrow">Linked assets</p>
          <h2>Poster, trailer, captions, dubs</h2>
        </div>
        <span>{stats.linkedAssetCount} total references</span>
      </div>

      <div className="cl-video-rendition-list">
        {LINKED_ROWS.map((row) => (
          <RenditionRow
            key={row.field}
            row={row}
            value={draft[row.field]}
            onChange={(value) => updateField(row.field, value)}
          />
        ))}
      </div>

      <div className="cl-video-rendition-note">
        <strong>Canonical asset rule</strong>
        <span>
          Poster art, thumbnails, covers, and still images stay as <code>.image</code> assets.
          Captions and dubs should remain independently addressable instead of being buried inside
          the video manifest.
        </span>
      </div>
    </section>
  );
}

function RenditionRow({ row, value, onChange }) {
  const filled = Boolean(String(value || '').trim());

  return (
    <label className={`cl-video-rendition-row ${filled ? 'is-filled' : ''}`}>
      <span className="cl-video-rendition-meta">
        <strong>{row.role}</strong>
        <small>{row.kind}</small>
        <em>{row.description}</em>
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`crab://<hash>${row.kind === '.image' ? '.image' : '.video'}`}
        spellCheck="false"
      />
    </label>
  );
}