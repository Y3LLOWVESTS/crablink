/**
 * RO:WHAT — Local paid-interval pricing controls for stream drafts.
 * RO:WHY — Models the “pay ROC every X minutes” stream product contract before backend payment routes exist.
 * RO:INTERACTS — StreamPage, streamDraftModel, future /streams/:id/access/quote and /pay routes.
 * RO:INVARIANTS — integer ROC only; manual renew only; no auto-pay; no wallet mutation; no fake receipt/access window.
 * RO:METRICS — none.
 * RO:CONFIG — local draft values only.
 * RO:SECURITY — does not collect capabilities, keys, or spend authority; recipient is a display/planning field only.
 * RO:TEST — manual pricing form smoke and manifest JSON review.
 */

const PRICE_PRESETS = Object.freeze(['1', '5', '10', '25']);
const INTERVAL_PRESETS = Object.freeze(['1', '5', '10', '30']);

export default function StreamPricingPanel({ draft, onChange, pricing }) {
  function updateField(field, value) {
    onChange({
      ...draft,
      [field]: cleanIntegerInput(value),
    });
  }

  function updateTextField(field, value) {
    onChange({
      ...draft,
      [field]: value,
    });
  }

  return (
    <section className="cl-stream-subpanel cl-stream-pricing-panel" aria-label="Stream pricing policy">
      <div className="cl-stream-subhead">
        <p className="cl-eyebrow">ROC interval access</p>
        <h3>Manual paid stream window</h3>
        <p>
          First proof should be explicit renewal: the viewer pays, receives a backend access window,
          and must click again to extend. No hidden recurring spend or stored spend authority.
        </p>
      </div>

      <div className="cl-stream-pricing-hero">
        <strong>{pricing.summary}</strong>
        <span>stream_watch_interval · manual renew · backend not wired</span>
      </div>

      <div className="cl-stream-two">
        <Field label="Price in ROC">
          <input
            type="number"
            min="1"
            step="1"
            value={draft.priceRoc}
            onChange={(event) => updateField('priceRoc', event.target.value)}
          />
        </Field>

        <Field label="Interval minutes">
          <input
            type="number"
            min="1"
            step="1"
            value={draft.intervalMinutes}
            onChange={(event) => updateField('intervalMinutes', event.target.value)}
          />
        </Field>
      </div>

      <div className="cl-stream-preset-row" aria-label="Pricing presets">
        <span>Price presets</span>
        {PRICE_PRESETS.map((price) => (
          <button key={price} type="button" onClick={() => updateField('priceRoc', price)}>
            {price} ROC
          </button>
        ))}
      </div>

      <div className="cl-stream-preset-row" aria-label="Interval presets">
        <span>Interval presets</span>
        {INTERVAL_PRESETS.map((minutes) => (
          <button key={minutes} type="button" onClick={() => updateField('intervalMinutes', minutes)}>
            {minutes} min
          </button>
        ))}
      </div>

      <div className="cl-stream-four">
        <Field label="Grace seconds">
          <input
            type="number"
            min="0"
            step="1"
            value={draft.graceSeconds}
            onChange={(event) => updateField('graceSeconds', event.target.value)}
          />
        </Field>

        <Field label="Free preview seconds">
          <input
            type="number"
            min="0"
            step="1"
            value={draft.freePreviewSeconds}
            onChange={(event) => updateField('freePreviewSeconds', event.target.value)}
          />
        </Field>

        <Field label="Renew prompt seconds">
          <input
            type="number"
            min="0"
            step="1"
            value={draft.renewPromptSeconds}
            onChange={(event) => updateField('renewPromptSeconds', event.target.value)}
          />
        </Field>

        <Field label="Recipient account">
          <input
            value={draft.creatorWalletAccount}
            onChange={(event) => updateTextField('creatorWalletAccount', event.target.value)}
            placeholder="backend wallet account later"
            maxLength={120}
          />
        </Field>
      </div>

      <div className="cl-stream-truth-box">
        <strong>Payment boundary</strong>
        <p>
          This panel only drafts the policy. Viewer unlock must later come from backend stream access
          receipt with paid_until. Cache, preview state, or local JSON cannot unlock paid stream video.
        </p>
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

function cleanIntegerInput(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}