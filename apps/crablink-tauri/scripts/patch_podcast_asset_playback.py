#!/usr/bin/env python3
# RO:WHAT — Patch paid .podcast asset pages so they show paywall + receipt-gated audio player.
# RO:WHY — Podcast minting works, but AssetHydratedView/AssetContentViewAccess still only handled music audio playback.
# RO:INVARIANTS — no fake unlock; no silent ROC spend; player appears only after backend content_view receipt.
# RO:TEST — npm run build; open crab://<hash>.podcast as wallet B; quote/pay; confirm audio player appears.

from pathlib import Path

ASSET = Path("src/pages/asset/AssetHydratedView.jsx")
ACCESS = Path("src/pages/asset/AssetContentViewAccess.jsx")


def load(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"missing file: {path}")
    return path.read_text()


def save(path: Path, text: str) -> None:
    path.write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            print(f"skip {label}: already patched")
            return text
        raise SystemExit(f"{label}: expected marker not found")

    print(f"patch {label}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# AssetContentViewAccess.jsx
# ---------------------------------------------------------------------------

access = load(ACCESS)

access = replace_once(
    access,
    "const PAYABLE_KINDS = new Set(['article', 'post', 'comment', 'image', 'video', 'music', 'stream']);",
    "const PAYABLE_KINDS = new Set(['article', 'post', 'comment', 'image', 'video', 'music', 'podcast', 'stream']);",
    "AssetContentViewAccess PAYABLE_KINDS",
)

if "  podcast: {\n    noun: 'podcast'," not in access:
    music_copy = """  music: {
    noun: 'music',
    bodyName: 'music playback',
    payTitle: 'Pay to listen to this music',
    paidTitle: 'Music view paid and unlocked',
    badge: 'music content_view',
    unavailableTitle: 'Paid music listening is not available yet',
    unavailableCopy:
      'The asset resolved, but the backend quote/pay route did not return a usable content_view proof. CrabLink will not unlock music playback from local state.',
    unlockedTitle: 'Backend receipt unlocked this music view',
    unlockedCopy:
      'Music playback below is unlocked only after svc-gateway returned wallet receipt metadata for content_view. Local receipt memory is display-only.',
    lockedCopy:
      'CrabLink does not direct-call wallet or ledger, does not adjust local balances, and does not show music bytes until a backend content_view receipt is returned.',
  },
"""

    podcast_copy = music_copy + """  podcast: {
    noun: 'podcast',
    bodyName: 'podcast playback',
    payTitle: 'Pay to listen to this podcast',
    paidTitle: 'Podcast view paid and unlocked',
    badge: 'podcast content_view',
    unavailableTitle: 'Paid podcast listening is not available yet',
    unavailableCopy:
      'The asset resolved, but the backend quote/pay route did not return a usable content_view proof. CrabLink will not unlock podcast playback from local state.',
    unlockedTitle: 'Backend receipt unlocked this podcast view',
    unlockedCopy:
      'Podcast playback below is unlocked only after svc-gateway returned wallet receipt metadata for content_view. Local receipt memory is display-only.',
    lockedCopy:
      'CrabLink does not direct-call wallet or ledger, does not adjust local balances, and does not show podcast audio bytes until a backend content_view receipt is returned.',
  },
"""

    access = replace_once(
        access,
        music_copy,
        podcast_copy,
        "AssetContentViewAccess podcast copy",
    )
else:
    print("skip AssetContentViewAccess podcast copy: already patched")

save(ACCESS, access)


# ---------------------------------------------------------------------------
# AssetHydratedView.jsx
# ---------------------------------------------------------------------------

asset = load(ASSET)

asset = replace_once(
    asset,
    "const MEDIA_PREVIEW_KINDS = new Set(['image', 'video', 'music']);",
    "const MEDIA_PREVIEW_KINDS = new Set(['image', 'video', 'music', 'podcast']);",
    "AssetHydratedView MEDIA_PREVIEW_KINDS",
)

asset = replace_once(
    asset,
    "const PAID_CONTENT_VIEW_KINDS = new Set(['article', 'post', 'comment', 'image', 'video', 'music', 'stream']);",
    "const PAID_CONTENT_VIEW_KINDS = new Set(['article', 'post', 'comment', 'image', 'video', 'music', 'podcast', 'stream']);",
    "AssetHydratedView PAID_CONTENT_VIEW_KINDS",
)

asset = replace_once(
    asset,
    "  const canPreviewMusic = summary.isMusicRoute && (!requiresPaidContentView || contentViewAccess.canView);\n  const canPreviewMedia = summary.isMediaPreviewRoute && (!requiresPaidContentView || contentViewAccess.canView);",
    """  const canPreviewMusic = summary.isMusicRoute && (!requiresPaidContentView || contentViewAccess.canView);
  const canPreviewPodcast = summary.isPodcastRoute && (!requiresPaidContentView || contentViewAccess.canView);
  const canPreviewAudio = summary.isMusicRoute
    ? canPreviewMusic
    : summary.isPodcastRoute
      ? canPreviewPodcast
      : false;
  const audioKindName = summary.isPodcastRoute ? 'Podcast' : 'Music';
  const audioKindLower = audioKindName.toLowerCase();
  const audioPlaybackNoun = summary.isPodcastRoute ? 'podcast episode' : 'music asset';
  const canPreviewMedia = summary.isMediaPreviewRoute && (!requiresPaidContentView || contentViewAccess.canView);""",
    "AssetHydratedView audio preview state",
)

asset = replace_once(
    asset,
    "    isMusicRoute: kind === 'music',\n    isMediaPreviewRoute: MEDIA_PREVIEW_KINDS.has(kind),",
    "    isMusicRoute: kind === 'music',\n    isPodcastRoute: kind === 'podcast',\n    isMediaPreviewRoute: MEDIA_PREVIEW_KINDS.has(kind),",
    "AssetHydratedView podcast summary flag",
)

asset = replace_once(
    asset,
    "              music_preview_locked: summary.isMusicRoute && !canPreviewMusic,\n",
    "              music_preview_locked: summary.isMusicRoute && !canPreviewMusic,\n              podcast_preview_locked: summary.isPodcastRoute && !canPreviewPodcast,\n",
    "AssetHydratedView developer podcast preview flag",
)

old_card_start = '      {summary.isMusicRoute && (\n        <Card\n          eyebrow="Playback"\n          title="Music playback"'
new_card_already = "{(summary.isMusicRoute || summary.isPodcastRoute) && ("

if new_card_already in asset:
    print("skip AssetHydratedView shared music/podcast audio card: already patched")
else:
    start = asset.find(old_card_start)
    if start == -1:
        raise SystemExit("AssetHydratedView music playback card start marker not found")

    end_marker = '\n\n      <section className="asset-detail-grid" aria-label="Asset details">'
    end = asset.find(end_marker, start)
    if end == -1:
        raise SystemExit("AssetHydratedView music playback card end marker not found")

    new_card = """      {(summary.isMusicRoute || summary.isPodcastRoute) && (
        <Card
          eyebrow="Playback"
          title={`${audioKindName} playback`}
          className="asset-preview-card"
          actions={
            <div className="asset-copy-actions">
              <Button variant="secondary" onClick={reloadPreview} disabled={!canPreviewAudio || previewSources.length === 0}>
                Reload audio
              </Button>
              <Button variant="secondary" onClick={openPreviewSource} disabled={!canPreviewAudio || !previewSource?.url}>
                Open source
              </Button>
            </div>
          }
        >
          {canPreviewAudio && previewSource && imagePreviewOk ? (
            <div className="asset-audio-preview-shell">
              <audio
                src={previewUrl}
                controls
                preload="metadata"
                onError={handlePreviewError}
              >
                Your browser/WebView cannot play this gateway {audioKindLower} asset.
              </audio>
            </div>
          ) : (
            <div className="asset-preview-empty">
              <strong>
                {canPreviewAudio
                  ? `${audioKindName} bytes were not previewable from the gateway.`
                  : `${audioKindName} playback is locked until paid.`}
              </strong>
              <span>
                {canPreviewAudio
                  ? `The asset hydrated successfully, but the ${audioKindLower} byte route did not load inside the player. Try Open source, check gateway /o support, or confirm the local dev storage still contains this object.`
                  : `The ${audioPlaybackNoun} metadata is visible, but CrabLink will not fetch or play audio bytes until the backend returns a paid content_view receipt.`}
              </span>
            </div>
          )}

          <div className="asset-preview-source-strip" aria-label={`${audioKindName} preview source`}>
            <div>
              <span>Current source</span>
              <strong>{canPreviewAudio ? previewSource?.label || 'No source' : 'Locked'}</strong>
            </div>
            <div>
              <span>Source URL</span>
              <strong>{canPreviewAudio ? previewSource?.url || 'n/a' : 'Hidden until paid'}</strong>
            </div>
            <div>
              <span>Preview mode</span>
              <strong>{canPreviewAudio ? 'gateway audio bytes' : 'paid view gate'}</strong>
            </div>
          </div>

          {summary.isPodcastRoute && (
            <TruthBoundary
              tone={canPreviewAudio ? 'success' : 'warning'}
              title={canPreviewAudio ? 'Backend receipt unlocked this podcast episode' : 'Podcast audio is still gated'}
              copy={
                canPreviewAudio
                  ? 'This podcast player appears only after the backend content_view path returned a paid receipt. Local receipt memory is display-only and cannot unlock playback by itself.'
                  : 'Podcast metadata can be displayed before payment, but CrabLink will not reveal or fetch the audio source until a backend receipt unlocks this content view.'
              }
            />
          )}

          {canPreviewAudio && failedPreviewSources.length > 0 && (
            <details className="asset-preview-fallbacks">
              <summary>Failed audio player attempts</summary>
              {failedPreviewSources.map((source, index) => (
                <div key={`${source.key}:${index}`}>
                  <span>{source.label}</span>
                  <strong>{source.url}</strong>
                </div>
              ))}
            </details>
          )}
        </Card>
      )}"""

    asset = asset[:start] + new_card + asset[end:]
    print("patch AssetHydratedView shared music/podcast audio card")

save(ASSET, asset)

print("patched podcast asset paywall/playback frontend")
