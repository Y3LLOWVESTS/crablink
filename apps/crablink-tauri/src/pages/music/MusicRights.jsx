/**
 * RO:WHAT — Local rights/access/economics form for the React crab://music workspace.
 * RO:WHY — Keeps licensing, access, and payout draft data page-owned instead of legacy patch scripts.
 * RO:INTERACTS — MusicPage, MusicDraft, MusicLinkedAssets, music.css.
 * RO:INVARIANTS — local policy draft only; no ROC quote; no hold/capture; no fake backend rights confirmation.
 * RO:METRICS — none.
 * RO:CONFIG — draft props passed from MusicPage.
 * RO:SECURITY — no wallet spend authority, no ownership claim beyond local display text.
 * RO:TEST — manual rights form smoke and npm build.
 */

const RIGHTS_OPTIONS = Object.freeze([
  ['creator_owned_original', 'Creator-owned / original'],
  ['band_or_collaboration', 'Band / collaboration'],
  ['licensed_sample_or_cover', 'Licensed sample / cover'],
  ['label_or_publisher_managed', 'Label / publisher managed'],
  ['public_domain_or_traditional', 'Public domain / traditional'],
]);

const LICENSE_OPTIONS = Object.freeze([
  ['all_rights_reserved_local_draft', 'All rights reserved / local draft'],
  ['free_preview_license_future', 'Free preview license later'],
  ['creator_common_future', 'Creator common license later'],
  ['commercial_license_required', 'Commercial license required'],
  ['rights_review_required', 'Rights review required'],
]);

const ACCESS_OPTIONS = Object.freeze([
  ['public_preview', 'Public preview'],
  ['free_stream_future', 'Free stream later'],
  ['paid_stream_future', 'Paid stream later'],
  ['paid_download_future', 'Paid download later'],
  ['members_or_followers', 'Members / followers'],
  ['private_draft', 'Private draft'],
]);

const PAYOUT_OPTIONS = Object.freeze([
  ['creator_wallet_future', 'Creator wallet later'],
  ['split_policy_future', 'Split policy later'],
  ['band_split_future', 'Band split later'],
  ['label_publisher_split_future', 'Label / publisher split later'],
  ['no_payout_local_draft', 'No payout / local draft'],
]);

export default function MusicRights({ draft, onChange }) {
  function updateField(field, value) {
    onChange({
      ...draft,
      [field]: value,
    });
  }

  return (
    <section className="cl-music-subpanel" aria-label="Music rights and access">
      <div className="cl-music-subhead">
        <p className="cl-eyebrow">Rights, access, payout</p>
        <h3>Local policy draft</h3>
        <p>
          This section shapes future manifest fields only. It does not prove ownership, enforce
          licensing, quote ROC, create a hold, or configure payout splits.
        </p>
      </div>

      <div className="cl-music-form">
        <div className="cl-music-two">
          <Field label="Rights mode">
            <select
              value={draft.rightsMode}
              onChange={(event) => updateField('rightsMode', event.target.value)}
            >
              {RIGHTS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="License mode">
            <select
              value={draft.licenseMode}
              onChange={(event) => updateField('licenseMode', event.target.value)}
            >
              {LICENSE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-music-two">
          <Field label="Access mode">
            <select
              value={draft.accessMode}
              onChange={(event) => updateField('accessMode', event.target.value)}
            >
              {ACCESS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payout mode">
            <select
              value={draft.payoutMode}
              onChange={(event) => updateField('payoutMode', event.target.value)}
            >
              {PAYOUT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="cl-music-rights-note">
          <strong>ROC boundary</strong>
          <span>
            Paid music, streams, downloads, split policies, and receipts must be backed by gateway,
            wallet, ledger, accounting, and policy routes later. This draft creates none of them.
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