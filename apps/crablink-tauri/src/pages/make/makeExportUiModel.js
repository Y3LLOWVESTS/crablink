/**
 * RO:WHAT — Local Make export UI helper model.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePage focused on route orchestration.
 * RO:INTERACTS — MakePage.jsx, MakeHandoffCard.jsx, makeExportClient.js.
 * RO:INVARIANTS — UI/export guard state only; no minting; no wallet/ledger mutation; no fake b3/receipt truth.
 * RO:METRICS — none.
 * RO:CONFIG — local export status labels, redacted handle display, and stale browser-audio export guard.
 * RO:SECURITY — rejects stale/non-video browser blobs before handoff; no secrets, capabilities, balances, or spend authority.
 * RO:TEST — npm run build; manual crab://make approved-sequence export/handoff smoke.
 */

export function assertMakeExportClipsAreVideoBlobs(exportClips = []) {
  for (const [index, clip] of (exportClips || []).entries()) {
    const label = clip?.name || clip?.id || `clip ${index + 1}`;
    const kind = String(clip?.kind || clip?.sourceMode || '').toLowerCase();
    const blob = clip?.blob;
    const mimeType = String(clip?.mimeType || clip?.type || blob?.type || '').toLowerCase();

    if (clip?.mixedAudio) {
      throw new Error(
        `Blocked stale browser audio-mix export blob for ${label}. Remove the audio lane or reload crab://make; audio mixing must use the Rust/FFmpeg bounded audio-track path.`,
      );
    }

    if (kind.includes('audio') || mimeType.startsWith('audio/')) {
      throw new Error(`Blocked non-video Make export item: ${label}. Audio files must travel through the dedicated Rust/FFmpeg audio-track path, not as video clips.`);
    }

    if (!(blob instanceof Blob) || blob.size <= 0) {
      throw new Error(`Make export item ${label} is missing a valid local video blob.`);
    }
  }
}

export function createMakeExportUiState(status = 'idle', patch = {}) {
  return {
    status,
    progressPercent: status === 'ready' ? 100 : 0,
    detail: '',
    session: null,
    result: null,
    handoff: null,
    error: null,
    ...patch,
  };
}

export function makeExportStatusLabel(status) {
  if (status === 'ready') return 'MP4 ready';
  if (status === 'exporting') return 'Exporting MP4';
  if (status === 'error') return 'Export failed';
  return 'Not exported';
}

export function shortMakeHandle(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (raw.length <= 34) {
    return raw;
  }

  return `${raw.slice(0, 18)}…${raw.slice(-10)}`;
}
