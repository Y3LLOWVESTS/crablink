/**
 * RO:WHAT — Pure props-driven ad campaign draft UI for the React-owned crab://ad route.
 * RO:WHY — CrabLink refactor; reuses shared creator workspace components while keeping ad behavior local and honest.
 * RO:INTERACTS — AdPage.jsx, AdCreativePreview.jsx, adDraftModel.js, shared components, React shell.
 * RO:INVARIANTS — local draft only; no fake campaign publication; no tracking; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — optional local passport labels from app settings only.
 * RO:SECURITY — no arbitrary scripts, popups, pixels, external network fetches, fingerprinting, or wallet authority.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://ad route smoke.
 */

import ActionBar from '../../shared/components/ActionBar.jsx';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import DraftStatsPanel from '../../shared/components/DraftStatsPanel.jsx';
import Field from '../../shared/components/Field.jsx';
import ManifestPreviewPanel from '../../shared/components/ManifestPreviewPanel.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import SegmentedControl from '../../shared/components/SegmentedControl.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import AdCreativePreview from './AdCreativePreview.jsx';
import {
  AD_AUDIENCE_OPTIONS,
  AD_CAMPAIGN_KIND_OPTIONS,
  AD_CONTENT_POLICY_OPTIONS,
  AD_CREATIVE_KIND_OPTIONS,
  AD_DEVICE_OPTIONS,
  AD_FREQUENCY_OPTIONS,
  AD_PACING_OPTIONS,
  AD_PAYOUT_OPTIONS,
  AD_PLACEMENT_OPTIONS,
  AD_REVIEW_OPTIONS,
  AD_SCHEDULE_OPTIONS,
  AD_VIEW_OPTIONS,
  labelFromSnake,
} from './adDraftModel.js';

export default function AdCampaignDraft({ app, draftState }) {
  const {
    draft,
    updateDraft,
    clearDraft,
    viewMode,
    setViewMode,
    manifest,
    manifestJson,
    completeness,
  } = draftState;

  return (
    <Card
      eyebrow="Local builder"
      title="Ad campaign draft"
      className="ad-draft-card"
      actions={
        <SegmentedControl
          options={AD_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Ad workspace mode"
          size="sm"
        />
      }
    >
      <div className="ad-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://ad</Badge>
        <Badge tone="neutral">No tracking</Badge>
        <Badge tone="neutral">No spend</Badge>
      </div>

      <div className="ad-form-grid">
        <Field label="Campaign name" help="Internal campaign label for this local draft.">
          <TextInput
            value={draft.campaignName}
            onChange={(event) => updateDraft('campaignName', event.target.value)}
            placeholder="Example: CrabLink creator launch"
          />
        </Field>

        <Field
          label="Sponsor display"
          help="Display label only. Backend sponsor identity must be confirmed later."
        >
          <TextInput
            value={draft.sponsorDisplay}
            onChange={(event) => updateDraft('sponsorDisplay', event.target.value)}
            placeholder={app?.settings?.handle || 'Sponsor name'}
          />
        </Field>

        <Field
          label="Sponsor passport"
          help="Optional future passport subject or @username hint. Not verified here."
        >
          <TextInput
            value={draft.sponsorPassport}
            onChange={(event) => updateDraft('sponsorPassport', event.target.value)}
            placeholder={app?.settings?.passportSubject || '@sponsor'}
            spellCheck={false}
          />
        </Field>

        <Field label="Campaign kind" help="Planning field only; no svc-ads campaign is created here.">
          <select
            className="cl-select"
            value={draft.campaignKind}
            onChange={(event) => updateDraft('campaignKind', event.target.value)}
          >
            {AD_CAMPAIGN_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Creative kind" help="Native creative format. No script/iframe creative is allowed.">
          <select
            className="cl-select"
            value={draft.creativeKind}
            onChange={(event) => updateDraft('creativeKind', event.target.value)}
          >
            {AD_CREATIVE_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Placement" help="The product direction is one standardized, clearly labeled header slot.">
          <select
            className="cl-select"
            value={draft.placement}
            onChange={(event) => updateDraft('placement', event.target.value)}
          >
            {AD_PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <section className="ad-form-section" aria-label="Ad creative">
        <div className="ad-form-section-head">
          <div>
            <p className="cl-eyebrow">Creative</p>
            <h3>Native campaign card</h3>
          </div>
          <Badge tone="neutral" uppercase={false}>
            no external fetch
          </Badge>
        </div>

        <div className="ad-form-grid">
          <Field label="Headline" help="Keep it concise. This previews inside the native header card.">
            <TextInput
              value={draft.headline}
              onChange={(event) => updateDraft('headline', event.target.value)}
              placeholder="Build on the crab:// creator web"
              maxLength={90}
            />
          </Field>

          <Field label="Call to action" help="Button text only. This route does not open the destination.">
            <TextInput
              value={draft.callToAction}
              onChange={(event) => updateDraft('callToAction', event.target.value)}
              placeholder="Learn more"
              maxLength={40}
            />
          </Field>

          <Field
            label="Destination crab URL"
            help="Destination remains inert text in this draft. Future clicks must be policy/accounting gated."
          >
            <TextInput
              value={draft.destinationCrabUrl}
              onChange={(event) => updateDraft('destinationCrabUrl', event.target.value)}
              placeholder="crab://example-site"
              spellCheck={false}
            />
          </Field>

          <Field
            label="Creative image crab URL"
            help="Future creative art should be a normal .image asset. No separate ad-image kind."
          >
            <TextInput
              value={draft.creativeImageCrabUrl}
              onChange={(event) => updateDraft('creativeImageCrabUrl', event.target.value)}
              placeholder="crab://<64 lowercase hex>.image"
              spellCheck={false}
            />
          </Field>

          <Field label="Disclaimer label" help="The ad must stay clearly labeled.">
            <TextInput
              value={draft.disclaimer}
              onChange={(event) => updateDraft('disclaimer', event.target.value)}
              placeholder="Sponsored"
              maxLength={32}
            />
          </Field>

          <Field label="Device mode" help="Responsive planning only. No device fingerprinting.">
            <select
              className="cl-select"
              value={draft.deviceMode}
              onChange={(event) => updateDraft('deviceMode', event.target.value)}
            >
              {AD_DEVICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Body copy" help="Plain text only. No HTML, iframe, script, tracking pixel, or autoplay.">
          <TextArea
            value={draft.body}
            onChange={(event) => updateDraft('body', event.target.value)}
            rows={4}
            placeholder="Explain the sponsor, creator tool, or campaign in a privacy-preserving way..."
          />
        </Field>
      </section>

      <section className="ad-form-section" aria-label="Campaign policy">
        <div className="ad-form-section-head">
          <div>
            <p className="cl-eyebrow">Policy</p>
            <h3>Review, schedule, audience, and payout intent</h3>
          </div>
          <Badge tone="warning" uppercase={false}>
            backend inactive
          </Badge>
        </div>

        <div className="ad-form-grid">
          <Field label="Schedule mode" help="Planning field only; this route does not schedule campaigns.">
            <select
              className="cl-select"
              value={draft.scheduleMode}
              onChange={(event) => updateDraft('scheduleMode', event.target.value)}
            >
              {AD_SCHEDULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Start date" help="Optional local note. Not validated against backend time.">
            <TextInput
              type="date"
              value={draft.startDate}
              onChange={(event) => updateDraft('startDate', event.target.value)}
            />
          </Field>

          <Field label="End date" help="Optional local note. Not validated against backend time.">
            <TextInput
              type="date"
              value={draft.endDate}
              onChange={(event) => updateDraft('endDate', event.target.value)}
            />
          </Field>

          <Field label="Review mode" help="CrabLink ad campaigns should be policy-reviewed before serving.">
            <select
              className="cl-select"
              value={draft.reviewMode}
              onChange={(event) => updateDraft('reviewMode', event.target.value)}
            >
              {AD_REVIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Audience mode" help="Use contextual intent only. No personal tracking is active here.">
            <select
              className="cl-select"
              value={draft.audienceMode}
              onChange={(event) => updateDraft('audienceMode', event.target.value)}
            >
              {AD_AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Content policy" help="Local policy label only. No review result is claimed.">
            <select
              className="cl-select"
              value={draft.contentPolicy}
              onChange={(event) => updateDraft('contentPolicy', event.target.value)}
            >
              {AD_CONTENT_POLICY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Budget minor units" help="Integer planning field only; no wallet hold or spend occurs.">
            <TextInput
              inputMode="numeric"
              value={draft.budgetMinor}
              onChange={(event) => updateDraft('budgetMinor', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              spellCheck={false}
            />
          </Field>

          <Field label="Budget asset" help="Future economics should use integer minor units.">
            <select
              className="cl-select"
              value={draft.budgetAsset}
              onChange={(event) => updateDraft('budgetAsset', event.target.value)}
            >
              <option value="roc">ROC</option>
              <option value="future_policy_asset">Future policy asset</option>
            </select>
          </Field>

          <Field label="Pacing mode" help="Planning field only. No campaign delivery is active.">
            <select
              className="cl-select"
              value={draft.pacingMode}
              onChange={(event) => updateDraft('pacingMode', event.target.value)}
            >
              {AD_PACING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payout mode" help="Planning field only. No payout or reward is active.">
            <select
              className="cl-select"
              value={draft.payoutMode}
              onChange={(event) => updateDraft('payoutMode', event.target.value)}
            >
              {AD_PAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Frequency mode" help="Future caps must be privacy-preserving. No fingerprinting.">
            <select
              className="cl-select"
              value={draft.frequencyMode}
              onChange={(event) => updateDraft('frequencyMode', event.target.value)}
            >
              {AD_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tags" help="Comma-separated draft tags. These are not indexed here.">
            <TextInput
              value={draft.tags}
              onChange={(event) => updateDraft('tags', event.target.value)}
              placeholder="ad, campaign, creator"
            />
          </Field>
        </div>

        <Field
          label="Targeting notes"
          help="Plain notes only. Do not include personal identifiers or tracking instructions."
        >
          <TextArea
            value={draft.targetingNotes}
            onChange={(event) => updateDraft('targetingNotes', event.target.value)}
            rows={4}
            placeholder="Example: Show on creator-tool pages or site categories, without user tracking..."
          />
        </Field>
      </section>

      {viewMode === 'developer' && (
        <div className="ad-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.ad-campaign-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="ad-actions">
        <div className="ad-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local campaign draft</span>
        </div>

        <div className="ad-action-buttons">
          <CopyButton
            text={manifestJson}
            label="Copy manifest JSON"
            successLabel="Manifest copied"
            errorLabel="Copy unavailable"
            variant="secondary"
          />
          <Button variant="secondary" onClick={clearDraft}>
            Clear draft
          </Button>
        </div>
      </ActionBar>
    </Card>
  );
}

export function AdSidePanel({ draftState }) {
  const { draft, viewMode, stats, manifest, completeness } = draftState;
  const tags = manifest?.metadata?.tags || [];
  const linkedAssets = manifest?.linked_assets || [];

  return (
    <>
      <DraftStatsPanel
        completeness={completeness}
        stats={[
          { label: 'Headline chars', value: stats.headline_characters || 0 },
          { label: 'Body words', value: stats.body_words || 0 },
          { label: 'Tags', value: tags.length },
          { label: 'Crab links', value: stats.crab_links || 0 },
          { label: 'Linked refs', value: linkedAssets.length },
          { label: 'Budget minor', value: stats.budget_minor || 0 },
        ]}
        notes={['local draft', 'no tracking', 'no spend']}
      />

      <RouteTruthPanel
        routeKind="ad"
        tone="warning"
        title="Ad backend inactive"
        copy="This route drafts a campaign contract only. It does not serve ads, record impressions, record clicks, spend ROC, approve policy, run trackers, or publish a campaign."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.ad-campaign-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.campaignName || 'Untitled campaign'}>
          <AdCreativePreview draft={draft} manifest={manifest} />
        </Card>
      )}
    </>
  );
}

export function AdSummaryList({ manifest }) {
  const placement = manifest?.placement_policy || {};
  const review = manifest?.review_policy || {};
  const audience = manifest?.audience_policy || {};
  const economics = manifest?.economics || {};

  return (
    <div className="ad-summary-list">
      <SummaryRow label="Placement" value={labelFromSnake(placement.placement)} />
      <SummaryRow label="Review" value={labelFromSnake(review.mode)} />
      <SummaryRow label="Audience" value={labelFromSnake(audience.mode)} />
      <SummaryRow label="Budget" value={formatBudget(economics.budget_minor, economics.budget_asset)} />
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="ad-summary-row">
      <span>{label}</span>
      <strong>{value || 'Not set'}</strong>
    </div>
  );
}

function formatBudget(amount, asset) {
  if (amount === null || amount === undefined) {
    return 'No spend';
  }

  return `${amount} ${String(asset || 'roc').toUpperCase()} minor`;
}