/**
 * RO:WHAT — Facet contract editor for the React crab://code local workspace.
 * RO:WHY — Captures runtime permissions, capabilities, routes/actions, and resource limits before any future execution.
 * RO:INTERACTS — CodeDraft.jsx, codeDraftModel.js, FacetContractPreview.jsx.
 * RO:INVARIANTS — local draft only; no capability issuance, sandbox launch, policy eval, code execution, or wallet access.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — deny-by-default model; all permission fields are draft declarations only.
 * RO:TEST — npm run build; manual facet form smoke for crab://code.
 */

import Badge from '../../shared/components/Badge.jsx';
import Field from '../../shared/components/Field.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  CODE_EXECUTION_OPTIONS,
  CODE_NETWORK_OPTIONS,
  CODE_POLICY_OPTIONS,
  CODE_PROFILE_OPTIONS,
  CODE_SANDBOX_OPTIONS,
  CODE_STORAGE_OPTIONS,
  CODE_WALLET_OPTIONS,
} from './codeDraftModel.js';

export default function CodeFacet({ draft, updateDraft, stats }) {
  return (
    <section className="code-form-section" aria-label="Facet contract">
      <div className="code-form-section-head">
        <div>
          <p className="cl-eyebrow">Facet contract</p>
          <h3>Permissions, capabilities, actions, and limits</h3>
        </div>
        <Badge tone="warning" uppercase={false}>
          deny by default
        </Badge>
      </div>

      <div className="code-form-grid">
        <Field label="Execution mode" help="This route does not execute code in any mode.">
          <select
            className="cl-select"
            value={draft.executionMode}
            onChange={(event) => updateDraft('executionMode', event.target.value)}
          >
            {CODE_EXECUTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sandbox mode" help="Future runtime requires sandbox and policy gates.">
          <select
            className="cl-select"
            value={draft.sandboxMode}
            onChange={(event) => updateDraft('sandboxMode', event.target.value)}
          >
            {CODE_SANDBOX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Policy mode" help="Default posture should remain deny-by-default.">
          <select
            className="cl-select"
            value={draft.policyMode}
            onChange={(event) => updateDraft('policyMode', event.target.value)}
          >
            {CODE_POLICY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Network permission" help="No external network by default.">
          <select
            className="cl-select"
            value={draft.networkPolicy}
            onChange={(event) => updateDraft('networkPolicy', event.target.value)}
          >
            {CODE_NETWORK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Storage permission" help="No storage access by default.">
          <select
            className="cl-select"
            value={draft.storagePolicy}
            onChange={(event) => updateDraft('storagePolicy', event.target.value)}
          >
            {CODE_STORAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Wallet permission" help="No wallet access by default. No silent spend ever.">
          <select
            className="cl-select"
            value={draft.walletPolicy}
            onChange={(event) => updateDraft('walletPolicy', event.target.value)}
          >
            {CODE_WALLET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Profile permission" help="Private profile/alt mappings must not be exposed.">
          <select
            className="cl-select"
            value={draft.profilePolicy}
            onChange={(event) => updateDraft('profilePolicy', event.target.value)}
          >
            {CODE_PROFILE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Required capabilities" help="Comma-separated future capability labels.">
          <TextInput
            value={draft.requiredCapabilities}
            onChange={(event) => updateDraft('requiredCapabilities', event.target.value)}
            placeholder="code:read, facet:preview"
            spellCheck={false}
          />
        </Field>
      </div>

      <div className="code-signal-grid">
        <Field label="Allowed routes" help="Comma-separated declared routes. Planning field only.">
          <TextArea
            value={draft.allowedRoutes}
            onChange={(event) => updateDraft('allowedRoutes', event.target.value)}
            rows={4}
            placeholder="render, preview"
          />
        </Field>

        <Field label="Allowed actions" help="Comma-separated declared actions. Planning field only.">
          <TextArea
            value={draft.allowedActions}
            onChange={(event) => updateDraft('allowedActions', event.target.value)}
            rows={4}
            placeholder="render_static_ui"
          />
        </Field>

        <Field label="Denied actions" help="Keep dangerous actions explicit.">
          <TextArea
            value={draft.deniedActions}
            onChange={(event) => updateDraft('deniedActions', event.target.value)}
            rows={5}
            placeholder="eval, wallet_spend, fetch_external_network"
          />
        </Field>

        <div className="code-facet-stats">
          <div>
            <span>Allowed routes</span>
            <strong>{stats.allowed_routes_count || 0}</strong>
          </div>
          <div>
            <span>Allowed actions</span>
            <strong>{stats.allowed_actions_count || 0}</strong>
          </div>
          <div>
            <span>Denied actions</span>
            <strong>{stats.denied_actions_count || 0}</strong>
          </div>
          <div>
            <span>Capabilities</span>
            <strong>{stats.required_capabilities_count || 0}</strong>
          </div>
        </div>
      </div>

      <div className="code-form-grid code-form-grid-compact">
        <Field label="Memory limit MB" help="Future resource limit. Parsed as integer.">
          <TextInput
            inputMode="numeric"
            value={draft.memoryLimitMb}
            onChange={(event) => updateDraft('memoryLimitMb', event.target.value.replace(/[^\d]/g, ''))}
            placeholder="64"
            spellCheck={false}
          />
        </Field>

        <Field label="CPU limit ms" help="Future resource limit. Parsed as integer.">
          <TextInput
            inputMode="numeric"
            value={draft.cpuLimitMs}
            onChange={(event) => updateDraft('cpuLimitMs', event.target.value.replace(/[^\d]/g, ''))}
            placeholder="250"
            spellCheck={false}
          />
        </Field>

        <Field label="Output limit KB" help="Future output cap. Parsed as integer.">
          <TextInput
            inputMode="numeric"
            value={draft.outputLimitKb}
            onChange={(event) => updateDraft('outputLimitKb', event.target.value.replace(/[^\d]/g, ''))}
            placeholder="256"
            spellCheck={false}
          />
        </Field>

        <Field label="Request limit" help="Zero means no outbound requests in this draft posture.">
          <TextInput
            inputMode="numeric"
            value={draft.requestLimit}
            onChange={(event) => updateDraft('requestLimit', event.target.value.replace(/[^\d]/g, ''))}
            placeholder="0"
            spellCheck={false}
          />
        </Field>
      </div>

      <div className="code-builder-note">
        <strong>Facet rule</strong>
        <span>
          The default posture is deny-by-default with no network, no wallet access, no private
          profile access, and no execution until policy and sandbox gates exist.
        </span>
      </div>
    </section>
  );
}