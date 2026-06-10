/**
 * RO:WHAT — Browser-local file helpers for crab://make clips and generated ids.
 * RO:WHY — App Integration; Concerns: DX/RES; keeps MakePage focused on route orchestration instead of DOM/object-URL utilities.
 * RO:INTERACTS — MakePage local clip recording/download flow and browser object URL lifecycle.
 * RO:INVARIANTS — local helper only; no backend truth; no b3 minting; no receipt creation; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — browser document, URL, crypto, Date, and Math APIs only.
 * RO:SECURITY — does not store secrets, private paths, capabilities, balances, receipts, or ownership truth.
 * RO:TEST — npm run build; manual crab://make record-stop-download smoke.
 */

export function downloadClip(clip) {
  if (!clip?.objectUrl) {
    return;
  }

  const link = document.createElement('a');
  link.href = clip.objectUrl;
  link.download = clip.name || 'crablink-make-clip.webm';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function revokeClipUrls(clips) {
  for (const clip of clips || []) {
    if (clip?.objectUrl) {
      try {
        URL.revokeObjectURL(clip.objectUrl);
      } catch (_error) {
        // Ignore object URL cleanup failure.
      }
    }
  }
}

export function buildClipName({ draft, index, mimeType }) {
  const base = String(draft.title || 'crablink-make-clip')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'crablink-make-clip';
  const ext = String(mimeType || '').includes('mp4') ? 'mp4' : 'webm';

  return `${base}-${String(index).padStart(2, '0')}.${ext}`;
}

export function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
