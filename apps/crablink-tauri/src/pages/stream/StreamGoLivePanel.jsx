/**
 * RO:WHAT — Human-first Go Live guide for CrabLink Tauri Creator Studio.
 * RO:WHY — Gives creators one clear path without hiding or replacing the existing explicit paid publish/session controls.
 * RO:INTERACTS — StreamPage, StreamPublishFlow, StreamSessionPanel, local preview, clipboard.
 * RO:INVARIANTS — no silent ROC spend; no fake live state; no fake receipt; no backend mutation from this guide.
 * RO:METRICS — none directly; backend route metrics remain inside publish/session panels.
 * RO:CONFIG — reads draft/pricing/published stream display state only.
 * RO:SECURITY — copies public crab:// stream link only; does not store secrets, stream keys, receipts, or spend authority.
 * RO:TEST — npm run build; manual Start preview → Publish descriptor → Go live controls → Copy stream link smoke.
 */

const STREAM_ID_KEYS = Object.freeze([
  'streamId',
  'stream_id',
  'id',
]);

const STREAM_URL_KEYS = Object.freeze([
  'streamUrl',
  'stream_url',
  'crabUrl',
  'crab_url',
  'assetCrabUrl',
  'asset_crab_url',
]);

export default function StreamGoLivePanel({
  draft,
  pricing,
  previewState,
  publishedStream,
  onShowPreview,
  onOpenPublishControls,
  onOpenSessionControls,
  onOpenSetup,
  onOpenDeveloper,
}) {
  const previewActive = previewState?.status === 'previewing';
  const streamInfo = extractPublishedStreamInfo(publishedStream);
  const hasPublishedDescriptor = Boolean(streamInfo.streamId || streamInfo.streamUrl);
  const titleReady = Boolean(cleanString(draft?.title));
  const priceReady = Boolean(pricing?.summary || cleanString(draft?.priceRoc));
  const canCopyLink = Boolean(streamInfo.streamUrl);

  const steps = [
    {
      key: 'preview',
      label: 'Start preview',
      detail: previewActive ? previewState?.label || 'Local preview is active.' : 'Turn on camera, screen, or scene preview first.',
      done: previewActive,
      actionLabel: previewActive ? 'Preview active' : 'Show preview',
      onClick: onShowPreview,
      disabled: previewActive,
    },
    {
      key: 'access',
      label: 'Set access',
      detail: priceReady ? pricing?.summary || `${draft?.priceRoc || '5'} ROC access drafted.` : 'Choose the ROC access settings.',
      done: priceReady,
      actionLabel: 'Edit access',
      onClick: onOpenSetup,
      disabled: false,
    },
    {
      key: 'publish',
      label: 'Publish descriptor',
      detail: hasPublishedDescriptor
        ? streamInfo.streamId
          ? `Descriptor returned ${streamInfo.streamId}.`
          : 'Descriptor has a public crab:// stream link.'
        : 'Use the explicit prepare → ROC hold → publish controls.',
      done: hasPublishedDescriptor,
      actionLabel: hasPublishedDescriptor ? 'Descriptor ready' : 'Open publish controls',
      onClick: onOpenPublishControls,
      disabled: hasPublishedDescriptor,
    },
    {
      key: 'live',
      label: 'Go live',
      detail: hasPublishedDescriptor
        ? 'Start backend stream-lite session and frame loop from the session controls.'
        : 'Publish the descriptor before starting backend stream-lite.',
      done: false,
      actionLabel: 'Open live controls',
      onClick: onOpenSessionControls,
      disabled: !hasPublishedDescriptor,
    },
  ];

  async function copyStreamLink() {
    if (!streamInfo.streamUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(streamInfo.streamUrl);
    } catch (_error) {
      // Clipboard failure is non-authoritative UI state only.
    }
  }

  return (
    <section className="cl-stream-panel cl-stream-go-live-panel" aria-label="Go live guide">
      <div className="cl-stream-go-live-hero">
        <div>
          <p className="cl-eyebrow">Go live</p>
          <h2>{hasPublishedDescriptor ? 'Ready for stream-lite launch' : 'Preview. Publish. Launch.'}</h2>
          <p>
            This guide keeps the creator path simple while the existing controls preserve explicit
            ROC confirmation, backend descriptor truth, and bounded stream-lite publishing.
          </p>
        </div>

        <div className={`cl-stream-live-orb ${hasPublishedDescriptor ? 'is-ready' : previewActive ? 'is-preview' : ''}`}>
          <span>{hasPublishedDescriptor ? 'READY' : previewActive ? 'PREVIEW' : 'LOCAL'}</span>
        </div>
      </div>

      <div className="cl-stream-go-live-summary">
        <Fact label="Title" value={titleReady ? draft.title : 'Not named yet'} tone={titleReady ? 'good' : 'warn'} />
        <Fact label="Access" value={pricing?.summary || `${draft?.priceRoc || '5'} ROC draft`} tone={priceReady ? 'good' : 'idle'} />
        <Fact label="Stream ID" value={streamInfo.streamId || 'backend required'} tone={streamInfo.streamId ? 'good' : 'idle'} />
      </div>

      <ol className="cl-stream-go-live-steps">
        {steps.map((step, index) => (
          <li key={step.key} className={step.done ? 'is-done' : ''}>
            <span className="cl-stream-go-live-step-index">{step.done ? '✓' : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
            <button type="button" onClick={step.onClick} disabled={step.disabled}>
              {step.actionLabel}
            </button>
          </li>
        ))}
      </ol>

      <div className="cl-stream-go-live-actions">
        <button
          type="button"
          className="cl-stream-primary"
          onClick={onOpenSessionControls}
          disabled={!hasPublishedDescriptor}
        >
          {hasPublishedDescriptor ? 'Open Go Live controls' : 'Publish descriptor first'}
        </button>

        <button type="button" onClick={copyStreamLink} disabled={!canCopyLink}>
          Copy stream link
        </button>

        <button type="button" onClick={onOpenDeveloper}>
          Developer details
        </button>
      </div>

      <p className="cl-stream-go-live-boundary">
        No hidden payment happens here. Descriptor publishing still uses the explicit ROC hold flow,
        and live frames still publish through the backend stream-lite session controls.
      </p>
    </section>
  );
}

function Fact({ label, value, tone = 'idle' }) {
  return (
    <div className={`cl-stream-go-live-fact is-${tone}`}>
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function extractPublishedStreamInfo(value) {
  const raw = objectValue(value);
  const nested = objectValue(raw.raw || raw.data || raw.response || raw.asset || raw.stream || raw.result);

  return {
    streamId: pickString(raw, nested, STREAM_ID_KEYS),
    streamUrl: pickString(raw, nested, STREAM_URL_KEYS),
  };
}

function pickString(primary, secondary, keys) {
  for (const key of keys) {
    const fromPrimary = cleanString(primary?.[key]);

    if (fromPrimary) {
      return fromPrimary;
    }

    const fromSecondary = cleanString(secondary?.[key]);

    if (fromSecondary) {
      return fromSecondary;
    }
  }

  return '';
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanString(value) {
  return String(value ?? '').trim();
}