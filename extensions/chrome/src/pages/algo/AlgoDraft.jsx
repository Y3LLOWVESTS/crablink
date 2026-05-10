/**
 * RO:WHAT — Pure props-driven algorithm draft UI for the React-owned crab://algo route.
 * RO:WHY — CrabLink refactor; captures behavior contracts, signals, governance, and sandbox intent without runtime execution.
 * RO:INTERACTS — AlgoPage.jsx, AlgoTransparency.jsx, algoDraftModel.js, shared components, React shell.
 * RO:INVARIANTS — local draft only; no code execution; no ranking; no publication; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — optional local passport labels from app settings only.
 * RO:SECURITY — input strings are inert draft text; executable algorithm paths remain future sandbox-only.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://algo route smoke.
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
import AlgoTransparency from './AlgoTransparency.jsx';
import {
  ALGO_ACCESS_OPTIONS,
  ALGO_AUDIT_OPTIONS,
  ALGO_EXECUTION_OPTIONS,
  ALGO_GOVERNANCE_OPTIONS,
  ALGO_KIND_OPTIONS,
  ALGO_LINKED_ASSET_FIELDS,
  ALGO_PAYOUT_OPTIONS,
  ALGO_RELEASE_OPTIONS,
  ALGO_RIGHTS_OPTIONS,
  ALGO_SANDBOX_OPTIONS,
  ALGO_TRANSPARENCY_OPTIONS,
  ALGO_VIEW_OPTIONS,
  labelFromSnake,
} from './algoDraftModel.js';

export default function AlgoDraft({ app, draftState }) {
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
      title="Algorithm draft"
      className="algo-draft-card"
      actions={
        <SegmentedControl
          options={ALGO_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Algorithm workspace mode"
          size="sm"
        />
      }
    >
      <div className="algo-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://algo</Badge>
        <Badge tone="neutral">No execution</Badge>
        <Badge tone="neutral">Sandbox-first</Badge>
      </div>

      <div className="algo-form-grid">
        <Field label="Algorithm name" help="Human-facing name for the draft algorithm manifest.">
          <TextInput
            value={draft.algorithmName}
            onChange={(event) => updateDraft('algorithmName', event.target.value)}
            placeholder="Creator-first feed ranker"
            maxLength={120}
          />
        </Field>

        <Field
          label="Creator / maintainer display"
          help="Display label only. Backend identity truth must come from svc-gateway later."
        >
          <TextInput
            value={draft.creatorDisplay}
            onChange={(event) => updateDraft('creatorDisplay', event.target.value)}
            placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@maintainer'}
            maxLength={90}
          />
        </Field>

        <Field
          label="Maintainer passport"
          help="Optional future passport subject or @username hint. Not verified here."
        >
          <TextInput
            value={draft.maintainerPassport}
            onChange={(event) => updateDraft('maintainerPassport', event.target.value)}
            placeholder={app?.settings?.passportSubject || '@maintainer'}
            spellCheck={false}
          />
        </Field>

        <Field label="Algorithm kind" help="Planning field only; this route does not run the algorithm.">
          <select
            className="cl-select"
            value={draft.algoKind}
            onChange={(event) => updateDraft('algoKind', event.target.value)}
          >
            {ALGO_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Transparency level" help="How much of the behavior contract is meant to be visible.">
          <select
            className="cl-select"
            value={draft.transparencyLevel}
            onChange={(event) => updateDraft('transparencyLevel', event.target.value)}
          >
            {ALGO_TRANSPARENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Release channel" help="Local draft status only. No approval is claimed.">
          <select
            className="cl-select"
            value={draft.releaseChannel}
            onChange={(event) => updateDraft('releaseChannel', event.target.value)}
          >
            {ALGO_RELEASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Version label" help="Local version note. Real version history must be b3-backed later.">
          <TextInput
            value={draft.versionLabel}
            onChange={(event) => updateDraft('versionLabel', event.target.value)}
            placeholder="v0.1-local"
            spellCheck={false}
          />
        </Field>

        <Field label="Output shape" help="Describe the result shape without running anything.">
          <TextInput
            value={draft.outputShape}
            onChange={(event) => updateDraft('outputShape', event.target.value)}
            placeholder="ordered_content_list"
            spellCheck={false}
          />
        </Field>
      </div>

      <Field label="Purpose" help="Plain-language description of what this algorithm is supposed to do.">
        <TextArea
          value={draft.purpose}
          onChange={(event) => updateDraft('purpose', event.target.value)}
          rows={4}
          placeholder="Explain what this algorithm is for, where it should be used, and what it should never do..."
        />
      </Field>

      <section className="algo-form-section" aria-label="Algorithm behavior contract">
        <div className="algo-form-section-head">
          <div>
            <p className="cl-eyebrow">Behavior contract</p>
            <h3>Signals, exclusions, and goals</h3>
          </div>
          <Badge tone="neutral" uppercase={false}>
            explainability
          </Badge>
        </div>

        <div className="algo-signal-grid">
          <Field
            label="Input signals"
            help="Comma-separated or line-separated signals the algorithm may consider."
          >
            <TextArea
              value={draft.inputSignals}
              onChange={(event) => updateDraft('inputSignals', event.target.value)}
              rows={6}
              placeholder="content freshness, explicit follows, creator reputation..."
            />
          </Field>

          <Field
            label="Excluded signals"
            help="Signals the algorithm must not use. Keep this explicit and privacy-focused."
          >
            <TextArea
              value={draft.excludedSignals}
              onChange={(event) => updateDraft('excludedSignals', event.target.value)}
              rows={6}
              placeholder="private messages, precise location, third-party cookies..."
            />
          </Field>
        </div>

        <Field label="Ranking / curation goal" help="The positive outcome this algorithm is designed to optimize.">
          <TextArea
            value={draft.rankingGoal}
            onChange={(event) => updateDraft('rankingGoal', event.target.value)}
            rows={4}
            placeholder="Example: surface relevant creator content without hidden tracking or engagement traps..."
          />
        </Field>

        <div className="algo-signal-grid">
          <Field label="Fairness notes" help="How this avoids abusive, opaque, or platform-capture behavior.">
            <TextArea
              value={draft.fairnessNotes}
              onChange={(event) => updateDraft('fairnessNotes', event.target.value)}
              rows={5}
              placeholder="Explain fairness, bias, creator visibility, opt-out, or review plans..."
            />
          </Field>

          <Field label="Moderation notes" help="How moderation status, policy, or safety review affects outputs.">
            <TextArea
              value={draft.moderationNotes}
              onChange={(event) => updateDraft('moderationNotes', event.target.value)}
              rows={5}
              placeholder="Explain whether hidden content, blocked tags, or mod review affects ranking..."
            />
          </Field>
        </div>

        <Field label="Evaluation notes" help="Local notes for future reports, test vectors, and audits.">
          <TextArea
            value={draft.evaluationNotes}
            onChange={(event) => updateDraft('evaluationNotes', event.target.value)}
            rows={4}
            placeholder="What should be measured before this is trusted?"
          />
        </Field>
      </section>

      <section className="algo-form-section" aria-label="Algorithm runtime and governance">
        <div className="algo-form-section-head">
          <div>
            <p className="cl-eyebrow">Runtime policy</p>
            <h3>Execution, sandbox, audit, and governance</h3>
          </div>
          <Badge tone="warning" uppercase={false}>
            no runtime active
          </Badge>
        </div>

        <div className="algo-form-grid">
          <Field label="Execution mode" help="This route defaults to manifest-only and does not run code.">
            <select
              className="cl-select"
              value={draft.executionMode}
              onChange={(event) => updateDraft('executionMode', event.target.value)}
            >
              {ALGO_EXECUTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sandbox mode" help="Future runtime must be sandboxed and governed by facet policy.">
            <select
              className="cl-select"
              value={draft.sandboxMode}
              onChange={(event) => updateDraft('sandboxMode', event.target.value)}
            >
              {ALGO_SANDBOX_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Audit mode" help="Planning field only. No signed audit approval exists here.">
            <select
              className="cl-select"
              value={draft.auditMode}
              onChange={(event) => updateDraft('auditMode', event.target.value)}
            >
              {ALGO_AUDIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Governance mode" help="Planning field only. Backend policy review is not active.">
            <select
              className="cl-select"
              value={draft.governanceMode}
              onChange={(event) => updateDraft('governanceMode', event.target.value)}
            >
              {ALGO_GOVERNANCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rights mode" help="Planning field only; no rights policy is enforced here.">
            <select
              className="cl-select"
              value={draft.rightsMode}
              onChange={(event) => updateDraft('rightsMode', event.target.value)}
            >
              {ALGO_RIGHTS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Access mode" help="Planning field only; no backend access gate is active.">
            <select
              className="cl-select"
              value={draft.accessMode}
              onChange={(event) => updateDraft('accessMode', event.target.value)}
            >
              {ALGO_ACCESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payout mode" help="Planning field only. No ROC spend or reward is active here.">
            <select
              className="cl-select"
              value={draft.payoutMode}
              onChange={(event) => updateDraft('payoutMode', event.target.value)}
            >
              {ALGO_PAYOUT_OPTIONS.map((option) => (
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
              placeholder="algo, transparency, feed"
            />
          </Field>
        </div>
      </section>

      <section className="algo-form-section" aria-label="Algorithm linked assets">
        <div className="algo-form-section-head">
          <div>
            <p className="cl-eyebrow">Linked assets</p>
            <h3>Code, facet, policy, audit, and examples</h3>
          </div>
          <Badge tone="neutral" uppercase={false}>
            inert references
          </Badge>
        </div>

        <div className="algo-form-grid">
          {ALGO_LINKED_ASSET_FIELDS.map((item) => (
            <Field key={item.field} label={item.label} help={item.help}>
              <TextInput
                value={draft[item.field]}
                onChange={(event) => updateDraft(item.field, event.target.value)}
                placeholder={placeholderForKind(item.expectedKind)}
                spellCheck={false}
              />
            </Field>
          ))}
        </div>
      </section>

      {viewMode === 'developer' && (
        <div className="algo-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.algo-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="algo-actions">
        <div className="algo-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local algorithm draft</span>
        </div>

        <div className="algo-action-buttons">
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

export function AlgoSidePanel({ draftState }) {
  const { draft, viewMode, stats, manifest, completeness } = draftState;
  const tags = manifest?.metadata?.tags || [];
  const linkedAssets = manifest?.linked_assets || [];

  return (
    <>
      <DraftStatsPanel
        completeness={completeness}
        stats={[
          { label: 'Purpose words', value: stats.purpose_words || 0 },
          { label: 'Input signals', value: stats.input_signals || 0 },
          { label: 'Excluded signals', value: stats.excluded_signals || 0 },
          { label: 'Linked refs', value: stats.linked_asset_count || 0 },
          { label: 'Crab links', value: stats.crab_links || 0 },
          { label: 'Transparency', value: `${stats.transparency_score || 0}%` },
        ]}
        notes={['local draft', 'no execution', 'sandbox-first']}
      />

      <RouteTruthPanel
        routeKind="algo"
        tone="warning"
        title="Algorithm backend inactive"
        copy="This route drafts a transparency contract only. It does not execute code, rank content, mutate feeds, launch a sandbox, mint CIDs, approve policy, or spend ROC."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.algo-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.algorithmName || 'Untitled algorithm'}>
          <AlgoTransparency draft={draft} manifest={manifest} />
        </Card>
      )}

      <Card eyebrow="Facet reminder" title="Runtime safety rule">
        <div className="algo-facet-rule">
          <p>
            <strong>b3hash.code</strong> is only an address. A future runnable primitive also needs
            a facet contract, declared permissions, resource limits, capability checks, and sandbox
            execution.
          </p>
          <div>
            <Badge tone="neutral" uppercase={false}>
              facet.toml
            </Badge>
            <Badge tone="neutral" uppercase={false}>
              svc-sandbox
            </Badge>
            <Badge tone="neutral" uppercase={false}>
              ron-policy
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );
}

export function AlgoSummaryList({ manifest }) {
  const metadata = manifest?.metadata || {};
  const behavior = manifest?.behavior_contract || {};
  const execution = manifest?.execution_policy || {};
  const audit = manifest?.audit_policy || {};

  return (
    <div className="algo-summary-list">
      <SummaryRow label="Kind" value={labelFromSnake(metadata.algo_kind)} />
      <SummaryRow label="Execution" value={labelFromSnake(execution.mode)} />
      <SummaryRow label="Sandbox" value={labelFromSnake(execution.sandbox_mode)} />
      <SummaryRow label="Governance" value={labelFromSnake(audit.governance_mode)} />
      <SummaryRow label="Output" value={behavior.output_shape} />
      <SummaryRow label="Approved" value="No" />
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="algo-summary-row">
      <span>{label}</span>
      <strong>{value || 'Not set'}</strong>
    </div>
  );
}

function placeholderForKind(kind) {
  if (kind === 'facet') {
    return 'crab://<64 lowercase hex>.facet';
  }

  if (kind === 'policy') {
    return 'crab://<64 lowercase hex>.policy';
  }

  if (kind === 'manifest') {
    return 'crab://<64 lowercase hex>.manifest';
  }

  return `crab://<64 lowercase hex>.${kind}`;
}