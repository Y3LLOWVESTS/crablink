/**
 * RO:WHAT — Local audio duration probe for crab://make draft audio files.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps async audio metadata probing out of MakePage.
 * RO:INTERACTS — MakePage.jsx, local object URLs from makeLinkedMediaModel.js.
 * RO:INVARIANTS — local browser probe only; no upload; no b3; no receipts; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — timeoutMs only.
 * RO:SECURITY — object URL stays local to the WebView; no native path exposure.
 * RO:TEST — npm run build; manual add local audio file smoke.
 */

export function probeLocalAudioDurationMs(objectUrl, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!objectUrl || typeof Audio === 'undefined') {
      resolve(0);
      return;
    }

    const audio = new Audio();
    let done = false;
    let timer = null;

    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load?.();

      if (timer) {
        window.clearTimeout(timer);
      }
    };

    const finish = (value) => {
      if (done) {
        return;
      }

      done = true;
      cleanup();
      resolve(value);
    };

    timer = window.setTimeout(() => finish(0), timeoutMs);

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const durationSeconds = Number(audio.duration || 0);
      const durationMs = Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.round(durationSeconds * 1000)
        : 0;

      finish(durationMs);
    };
    audio.onerror = () => finish(0);
    audio.src = objectUrl;
  });
}
