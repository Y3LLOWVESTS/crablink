/**
 * RO:WHAT — Builder form for the React crab://code local code primitive workspace.
 * RO:WHY — Captures code primitive metadata and linked assets while preserving no-execution safety.
 * RO:INTERACTS — CodePage local draft state, CodeFacet, FacetContractPreview, shared creator components.
 * RO:INVARIANTS — form state is local only; no code fetch, no eval, no runtime launch, no publication, no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — crab URLs are inert draft strings; executable code remains future sandbox-only.
 * RO:TEST — npm run build; check-react-lane; manual form smoke for crab://code.
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
import CodeFacet from './CodeFacet.jsx';
import FacetContractPreview from './FacetContractPreview.jsx';
import {
  CODE_ACCESS_OPTIONS,
  CODE_KIND_OPTIONS,
  CODE_LANGUAGE_OPTIONS,
  CODE_LINKED_ASSET_FIELDS,
  CODE_PAYOUT_OPTIONS,
  CODE_REVIEW_OPTIONS,
  CODE_RIGHTS_OPTIONS,
  CODE_RUNTIME_OPTIONS,
  CODE_SOURCE_OPTIONS,
  CODE_VIEW_OPTIONS,
  labelFromSnake,
} from './codeDraftModel.js';

export default function CodeDraft({ app, draftState }) {
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
      title="Code primitive draft"
      className="code-draft-card"
      actions={
        <SegmentedControl
          options={CODE_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Code workspace mode"
          size="sm"
        />
      }
    >
      <div className="code-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://code</Badge>
        <Badge tone="neutral">No execution</Badge>
        <Badge tone="neutral">Facet required</Badge>
      </div>

      <div className="code-form-grid">
        <Field label="Primitive name" help="Human-facing name for this local code primitive draft.">
          <TextInput
            value={draft.primitiveName}
            onChange={(event) => updateDraft('primitiveName', event.target.value)}
            placeholder="Safe comment embed renderer"
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

        <Field label="Code kind" help="Planning field only. This route does not execute code.">
          <select
            className="cl-select"
            value={draft.codeKind}
            onChange={(event) => updateDraft('codeKind', event.target.value)}
          >
            {CODE_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Declared runtime" help="Future runtime declaration only; not active in CrabLink.">
          <select
            className="cl-select"
            value={draft.declaredRuntime}
            onChange={(event) => updateDraft('declaredRuntime', event.target.value)}
          >
            {CODE_RUNTIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Language" help="Source language hint only. No parser/compiler runs here.">
          <select
            className="cl-select"
            value={draft.language}
            onChange={(event) => updateDraft('language', event.target.value)}
          >
            {CODE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Source visibility" help="Planning field only. No source code is fetched here.">
          <select
            className="cl-select"
            value={draft.sourceVisibility}
            onChange={(event) => updateDraft('sourceVisibility', event.target.value)}
          >
            {CODE_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Review mode" help="No review approval is claimed by this local route.">
          <select
            className="cl-select"
            value={draft.reviewMode}
            onChange={(event) => updateDraft('reviewMode', event.target.value)}
          >
            {CODE_REVIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Description"
        help="Plain-language purpose, usage, and safety notes. No code is executed from this text."
      >
        <TextArea
          value={draft.description}
          onChange={(event) => updateDraft('description', event.target.value)}
          rows={5}
          placeholder="Describe what this primitive is for, what it renders, and what it must never do..."
        />
      </Field>

      <section className="code-form-section" aria-label="Code linked assets">
        <div className="code-form-section-head">
          <div>
            <p className="cl-eyebrow">Linked assets</p>
            <h3>Code bytes, facet, docs, tests, audits, and examples</h3>
          </div>
          <Badge tone="neutral" uppercase={false}>
            inert references
          </Badge>
        </div>

        <div className="code-form-grid">
          {CODE_LINKED_ASSET_FIELDS.map((item) => (
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

        <div className="code-builder-note">
          <strong>Builder note</strong>
          <span>
            Linked code and facet references are inert text in this React route. CrabLink must not
            fetch, compile, eval, instantiate, or execute them from this page.
          </span>
        </div>
      </section>

      <CodeFacet draft={draft} updateDraft={updateDraft} stats={draftState.stats} />

      <section className="code-form-section" aria-label="Code rights and access">
        <div className="code-form-section-head">
          <div>
            <p className="cl-eyebrow">Rights and access</p>
            <h3>Draft policy labels</h3>
          </div>
          <Badge tone="warning" uppercase={false}>
            backend inactive
          </Badge>
        </div>

        <div className="code-form-grid">
          <Field label="Rights mode" help="Planning field only; no rights policy is enforced here.">
            <select
              className="cl-select"
              value={draft.rightsMode}
              onChange={(event) => updateDraft('rightsMode', event.target.value)}
            >
              {CODE_RIGHTS_OPTIONS.map((option) => (
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
              {CODE_ACCESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payout mode" help="Planning field only. No ROC spend or reward is active.">
            <select
              className="cl-select"
              value={draft.payoutMode}
              onChange={(event) => updateDraft('payoutMode', event.target.value)}
            >
              {CODE_PAYOUT_OPTIONS.map((option) => (
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
              placeholder="code, facet, primitive"
            />
          </Field>
        </div>
      </section>

      {viewMode === 'developer' && (
        <div className="code-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.code-primitive-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="code-actions">
        <div className="code-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local code primitive draft</span>
        </div>

        <div className="code-action-buttons">
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

export function CodeSidePanel({ draftState }) {
  const { draft, viewMode, stats, manifest, completeness } = draftState;
  const tags = manifest?.metadata?.tags || [];
  const linkedAssets = manifest?.linked_assets || [];

  return (
    <>
      <DraftStatsPanel
        completeness={completeness}
        stats={[
          { label: 'Description words', value: stats.description_words || 0 },
          { label: 'Allowed actions', value: stats.allowed_actions_count || 0 },
          { label: 'Denied actions', value: stats.denied_actions_count || 0 },
          { label: 'Capabilities', value: stats.required_capabilities_count || 0 },
          { label: 'Linked refs', value: stats.linked_asset_count || 0 },
          { label: 'Safety', value: `${stats.safety_score || 0}%` },
        ]}
        notes={['local draft', 'no execution', 'deny-by-default']}
      />

      <RouteTruthPanel
        routeKind="code"
        tone="warning"
        title="Code backend inactive"
        copy="This route drafts a code primitive contract only. It does not fetch code bytes, eval source, instantiate WASM, launch a sandbox, issue capabilities, publish manifests, or spend ROC."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.code-primitive-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.primitiveName || 'Untitled code primitive'}>
          <FacetContractPreview draft={draft} manifest={manifest} stats={stats} />
        </Card>
      )}

      <Card eyebrow="Safety model" title="The facet rule">
        <div className="code-facet-rule">
          <p>
            <strong>b3hash.code</strong> is the address, <strong>facet.toml</strong> is the
            contract, <strong>svc-sandbox</strong> is the cage, <strong>ron-policy</strong> is the
            judge, and CrabLink is only the renderer/launcher.
          </p>
          <div>
            <Badge tone="neutral" uppercase={false}>
              no eval
            </Badge>
            <Badge tone="neutral" uppercase={false}>
              no WASM instantiate
            </Badge>
            <Badge tone="neutral" uppercase={false}>
              no wallet access
            </Badge>
          </div>
        </div>
      </Card>
    </>
  );
}

function placeholderForKind(kind) {
  if (kind === 'facet') {
    return 'crab://<64 lowercase hex>.facet';
  }

  if (kind === 'manifest') {
    return 'crab://<64 lowercase hex>.manifest';
  }

  if (kind === 'site_or_article') {
    return 'crab://example-site or crab://<64 lowercase hex>.article';
  }

  return `crab://<64 lowercase hex>.${kind}`;
}

export function CodeSummaryList({ manifest }) {
  const metadata = manifest?.metadata || {};
  const execution = manifest?.execution_policy || {};
  const permissions = manifest?.permissions || {};
  const limits = manifest?.limits || {};

  return (
    <div className="code-summary-list">
      <SummaryRow label="Kind" value={labelFromSnake(metadata.code_kind)} />
      <SummaryRow label="Runtime" value={labelFromSnake(metadata.declared_runtime)} />
      <SummaryRow label="Execution" value={labelFromSnake(execution.execution_mode)} />
      <SummaryRow label="Sandbox" value={labelFromSnake(execution.sandbox_mode)} />
      <SummaryRow label="Network" value={labelFromSnake(permissions.network)} />
      <SummaryRow label="Wallet" value={labelFromSnake(permissions.wallet)} />
      <SummaryRow label="Memory" value={`${limits.memory_mb || 0} MB`} />
      <SummaryRow label="CPU" value={`${limits.cpu_ms || 0} ms`} />
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="code-summary-row">
      <span>{label}</span>
      <strong>{value || 'Not set'}</strong>
    </div>
  );
}