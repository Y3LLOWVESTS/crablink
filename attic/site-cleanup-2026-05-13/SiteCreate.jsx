/**
 * RO:WHAT — Local site metadata/manifest form for crab://site.
 * RO:WHY — Gives the React site route a useful builder without performing paid site mutation.
 * RO:INTERACTS — SitePage, siteDraftModel, shared Field/TextInput/TextArea/SegmentedControl components.
 * RO:INVARIANTS — local draft only; no fake site pointer; no wallet hold; no /sites mutation.
 * RO:METRICS — none.
 * RO:CONFIG — app settings can prefill display-only passport/wallet labels.
 * RO:SECURITY — no direct internal service calls; no private keys; no stored spend authority.
 * RO:TEST — manual crab://site builder/developer route smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import SegmentedControl from '../../shared/components/SegmentedControl.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  SITE_ACCESS_OPTIONS,
  SITE_HOSTING_OPTIONS,
  SITE_PAYOUT_OPTIONS,
  SITE_POLICY_OPTIONS,
  SITE_VIEW_OPTIONS,
  labelFromSnake,
} from './siteDraftModel.js';

export default function SiteCreate({ app, draftState }) {
  const {
    draft,
    updateDraft,
    viewMode,
    setViewMode,
    completeness,
  } = draftState;

  function updateField(key) {
    return (event) => updateDraft(key, event.target.value);
  }

  return (
    <Card
      eyebrow="Local builder"
      title="Site manifest draft"
      className="site-create-card"
      actions={
        <SegmentedControl
          options={SITE_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Site workspace mode"
          size="sm"
        />
      }
    >
      <div className="site-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://site</Badge>
        <Badge tone="neutral">No /sites mutation</Badge>
        <Badge tone="neutral">No ROC hold</Badge>
      </div>

      <div className="site-form-grid">
        <Field label="Site name" help="Human pointer only until backend launch creates the real site pointer.">
          <TextInput
            value={draft.siteName}
            onChange={updateField('siteName')}
            placeholder="my-crab-site"
            spellCheck={false}
            maxLength={80}
          />
        </Field>

        <Field label="Title">
          <TextInput
            value={draft.title}
            onChange={updateField('title')}
            placeholder="My CrabLink Site"
            maxLength={140}
          />
        </Field>

        <Field label="Creator display" help="Display label only. Backend owner proof comes later.">
          <TextInput
            value={draft.creatorDisplay}
            onChange={updateField('creatorDisplay')}
            placeholder={app?.settings?.handle || '@creator'}
            maxLength={90}
          />
        </Field>

        <Field label="Owner passport hint">
          <TextInput
            value={draft.ownerPassport}
            onChange={updateField('ownerPassport')}
            placeholder={app?.settings?.passportSubject || 'passport label'}
            spellCheck={false}
          />
        </Field>

        <Field label="Owner wallet hint">
          <TextInput
            value={draft.ownerWallet}
            onChange={updateField('ownerWallet')}
            placeholder={app?.settings?.walletAccount || 'wallet label'}
            spellCheck={false}
          />
        </Field>

        <Field label="Root document CID hint" help="Optional b3:<hash>. Do not paste an image asset URL here.">
          <TextInput
            value={draft.rootDocumentCid}
            onChange={updateField('rootDocumentCid')}
            placeholder="b3:<64 lowercase hex>"
            spellCheck={false}
          />
        </Field>
      </div>

      <Field label="Description" help="Public-facing site description for the future site manifest.">
        <TextArea
          value={draft.description}
          onChange={updateField('description')}
          placeholder="Describe the site, its purpose, and what visitors should expect."
          rows={3}
          maxLength={1000}
        />
      </Field>

      <div className="site-policy-grid">
        <Field label="Hosting mode">
          <select value={draft.hostingMode} onChange={updateField('hostingMode')}>
            {SITE_HOSTING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Access mode">
          <select value={draft.accessMode} onChange={updateField('accessMode')}>
            {SITE_ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Render policy">
          <select value={draft.renderPolicy} onChange={updateField('renderPolicy')}>
            {SITE_POLICY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Payout mode">
          <select value={draft.payoutMode} onChange={updateField('payoutMode')}>
            {SITE_PAYOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="site-form-grid">
        <Field label="Tags" help="Comma-separated local tags.">
          <TextInput
            value={draft.tags}
            onChange={updateField('tags')}
            placeholder="site, creator"
          />
        </Field>

        <Field label="Moderation policy">
          <TextInput
            value={draft.moderationPolicy}
            onChange={updateField('moderationPolicy')}
            placeholder="site_owner_policy_future"
            spellCheck={false}
          />
        </Field>
      </div>

      <Field label="Provenance note" help="Local notes only. Backend proof comes later.">
        <TextArea
          value={draft.provenanceNote}
          onChange={updateField('provenanceNote')}
          placeholder="Why this site exists, who created it, and what assets it references."
          rows={3}
        />
      </Field>

      <div className="site-create-footer">
        <div>
          <strong>{completeness}% complete</strong>
          <span>
            Current render policy: {labelFromSnake(draft.renderPolicy)}
          </span>
        </div>

        <button type="button" className="site-disabled-action" disabled>
          /sites/prepare later
        </button>
      </div>
    </Card>
  );
}