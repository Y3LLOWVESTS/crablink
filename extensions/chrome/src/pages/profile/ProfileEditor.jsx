/**
 * RO:WHAT — Local profile editor for the React crab://profile route.
 * RO:WHY — Provides profile UX parity/polish while deferring backend profile publication.
 * RO:INTERACTS — profileDraftModel, shared Field/TextInput/TextArea/SegmentedControl components.
 * RO:INVARIANTS — local profile draft only; no backend publish; no fake username claim; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — app settings are display hints only.
 * RO:SECURITY — no private keys, no seed phrases, no alt linkage.
 * RO:TEST — edit fields in crab://profile React preview.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import SegmentedControl from '../../shared/components/SegmentedControl.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  PROFILE_ALT_POLICY_OPTIONS,
  PROFILE_DISCOVERY_OPTIONS,
  PROFILE_STATUS_OPTIONS,
  PROFILE_VIEW_OPTIONS,
} from './profileDraftModel.js';

export default function ProfileEditor({ app, draftState }) {
  const { draft, updateDraft, clearDraft, viewMode, setViewMode, manifest, completeness } = draftState;

  function updateField(key) {
    return (event) => updateDraft(key, event.target.value);
  }

  return (
    <section id="profile-editor" className="profile-editor-anchor">
      <Card
        eyebrow="Editor"
        title="Profile editor"
        className="profile-editor-card"
        actions={
          <SegmentedControl
            options={PROFILE_VIEW_OPTIONS}
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="Profile workspace mode"
            size="sm"
          />
        }
      >
        <div className="profile-editor-intro">
          <Badge tone="warning">Local only</Badge>
          <Badge tone="neutral">crab://profile</Badge>
          <Badge tone="neutral">No username claim</Badge>
          <Badge tone="neutral">No backend publish</Badge>
        </div>

        <section className="profile-fieldset" aria-label="Profile identity fields">
          <div className="profile-fieldset-head">
            <span>Identity</span>
            <strong>Public display draft</strong>
          </div>

          <div className="profile-form-grid">
            <Field label="Display name" help="Visible local profile name. Not backend-confirmed.">
              <TextInput
                value={draft.displayName}
                onChange={updateField('displayName')}
                placeholder="Skinnycrabby"
                maxLength={90}
              />
            </Field>

            <Field label="@username hint" help="Local display hint only until backend reservation exists.">
              <TextInput
                value={draft.handle}
                onChange={updateField('handle')}
                placeholder="@skinnycrabby"
                spellCheck={false}
                maxLength={48}
              />
            </Field>

            <Field label="Owner passport hint" help="Display label only. Not a credential or backend proof.">
              <TextInput
                value={draft.ownerPassport}
                onChange={updateField('ownerPassport')}
                placeholder={app?.settings?.passportSubject || 'passport label'}
                spellCheck={false}
              />
            </Field>

            <Field label="Wallet account hint" help="Display label only. No wallet authority is stored here.">
              <TextInput
                value={draft.walletAccount}
                onChange={updateField('walletAccount')}
                placeholder={app?.settings?.walletAccount || 'wallet label'}
                spellCheck={false}
              />
            </Field>

            <Field label="Tagline">
              <TextInput
                value={draft.tagline}
                onChange={updateField('tagline')}
                placeholder="CrabLink creator profile draft"
                maxLength={140}
              />
            </Field>

            <Field label="Location label" help="Optional public display text.">
              <TextInput
                value={draft.locationLabel}
                onChange={updateField('locationLabel')}
                placeholder="optional"
                maxLength={90}
              />
            </Field>
          </div>

          <Field label="Bio" help="Local profile bio. Public backend profile publication is future work.">
            <TextArea
              value={draft.bio}
              onChange={updateField('bio')}
              placeholder="Tell people what this profile is about."
              rows={4}
              maxLength={1000}
            />
          </Field>
        </section>

        <section className="profile-fieldset" aria-label="Profile media fields">
          <div className="profile-fieldset-head">
            <span>Media</span>
            <strong>Image asset references</strong>
          </div>

          <div className="profile-form-grid">
            <Field label="Avatar .image URL" help="Use crab://<64 lowercase hex>.image. Preview only.">
              <TextInput
                value={draft.avatarCrabUrl}
                onChange={updateField('avatarCrabUrl')}
                placeholder="crab://<64 lowercase hex>.image"
                spellCheck={false}
              />
            </Field>

            <Field label="Banner .image URL" help="Future banner reference. Preview is not required yet.">
              <TextInput
                value={draft.bannerCrabUrl}
                onChange={updateField('bannerCrabUrl')}
                placeholder="crab://<64 lowercase hex>.image"
                spellCheck={false}
              />
            </Field>
          </div>
        </section>

        <section className="profile-fieldset" aria-label="Profile discovery fields">
          <div className="profile-fieldset-head">
            <span>Discovery</span>
            <strong>Profile catalogues and visibility</strong>
          </div>

          <div className="profile-form-grid">
            <Field label="Website crab URL">
              <TextInput
                value={draft.websiteCrabUrl}
                onChange={updateField('websiteCrabUrl')}
                placeholder="crab://your-site"
                spellCheck={false}
              />
            </Field>

            <Field label="Profile tags">
              <TextInput value={draft.tags} onChange={updateField('tags')} placeholder="creator, crablink" />
            </Field>

            <Field label="Profile status">
              <select value={draft.profileStatus} onChange={updateField('profileStatus')}>
                {PROFILE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Discovery mode">
              <select value={draft.discoveryMode} onChange={updateField('discoveryMode')}>
                {PROFILE_DISCOVERY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Asset catalogue crab URL">
              <TextInput
                value={draft.assetCatalogCrabUrl}
                onChange={updateField('assetCatalogCrabUrl')}
                placeholder="future crab:// profile asset list"
                spellCheck={false}
              />
            </Field>

            <Field label="Site catalogue crab URL">
              <TextInput
                value={draft.siteCatalogCrabUrl}
                onChange={updateField('siteCatalogCrabUrl')}
                placeholder="future crab:// profile site list"
                spellCheck={false}
              />
            </Field>
          </div>
        </section>

        <section className="profile-fieldset" aria-label="Profile trust and privacy fields">
          <div className="profile-fieldset-head">
            <span>Trust</span>
            <strong>Privacy, reputation, and moderation boundaries</strong>
          </div>

          <div className="profile-form-grid">
            <Field label="Alt privacy mode">
              <select value={draft.altPolicyMode} onChange={updateField('altPolicyMode')}>
                {PROFILE_ALT_POLICY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reputation note">
              <TextInput
                value={draft.reputationNote}
                onChange={updateField('reputationNote')}
                placeholder="Not backend confirmed"
                maxLength={160}
              />
            </Field>

            <Field label="Moderation note">
              <TextInput
                value={draft.moderationNote}
                onChange={updateField('moderationNote')}
                placeholder="Not backend confirmed"
                maxLength={160}
              />
            </Field>
          </div>
        </section>

        <div className="profile-editor-actions">
          <div>
            <strong>{completeness}% complete</strong>
            <span>Local profile draft completeness</span>
          </div>

          <div className="profile-editor-buttons">
            <Button variant="secondary" onClick={clearDraft}>
              Clear draft
            </Button>
            <Button variant="primary" disabled title="Backend profile publication is future work.">
              Publish profile later
            </Button>
          </div>
        </div>

        {viewMode === 'developer' && (
          <JsonPreview label="Developer profile manifest" data={manifest} initiallyOpen />
        )}
      </Card>
    </section>
  );
}