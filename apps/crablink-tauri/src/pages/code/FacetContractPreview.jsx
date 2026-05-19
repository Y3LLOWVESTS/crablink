/**
 * RO:WHAT — Safe facet contract preview for a local crab://code draft.
 * RO:WHY — Shows the future facet.toml shape without granting permissions or executing code.
 * RO:INTERACTS — CodeDraft.jsx, CodeFacet.jsx, codeDraftModel.js, shared Badge styling.
 * RO:INVARIANTS — preview only; no code fetch; no sandbox launch; no policy eval; no capability issuance.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — renders inert text only; linked crab URLs are references, not executable inputs.
 * RO:TEST — npm run build; manual crab://code builder/developer smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import { buildFacetToml, labelFromSnake } from './codeDraftModel.js';
import { CodeSummaryList } from './CodeDraft.jsx';

export default function FacetContractPreview({ draft, manifest, stats }) {
  const metadata = manifest?.metadata || {};
  const execution = manifest?.execution_policy || {};
  const linkedAssets = manifest?.linked_assets || [];
  const facetToml = manifest?.facet_contract?.preview_text || buildFacetToml(draft, stats);
  const tags = metadata.tags || [];

  return (
    <article className="code-preview" aria-label="Safe code primitive preview">
      <section className="code-preview-hero">
        <div>
          <p className="code-preview-owner">
            {cleanText(draft.creatorDisplay) || 'Unverified maintainer'} ·{' '}
            {labelFromSnake(draft.codeKind)}
          </p>
          <h3>{cleanText(draft.primitiveName) || 'Your code primitive name'}</h3>
          <p>
            {cleanText(draft.description) ||
              'Describe what this primitive renders and what permissions it must not have.'}
          </p>
        </div>

        <Badge tone="warning" uppercase={false}>
          No execution
        </Badge>
      </section>

      <div className="code-preview-tags">
        <Badge tone="neutral" uppercase={false}>
          {labelFromSnake(draft.declaredRuntime)}
        </Badge>
        <Badge tone="neutral" uppercase={false}>
          {labelFromSnake(execution.policy_mode)}
        </Badge>
        {tags.length > 0 ? (
          tags.map((tag) => (
            <Badge key={tag} tone="neutral" uppercase={false}>
              {tag}
            </Badge>
          ))
        ) : (
          <Badge tone="neutral">No tags yet</Badge>
        )}
      </div>

      <CodeSummaryList manifest={manifest} />

      <section className="code-token-section" aria-label="Facet routes and actions">
        <TokenList title="Allowed routes" items={stats.allowedRoutes || []} empty="No allowed routes described yet." />
        <TokenList title="Allowed actions" items={stats.allowedActions || []} empty="No allowed actions described yet." />
        <TokenList title="Denied actions" items={stats.deniedActions || []} empty="No denied actions described yet." />
        <TokenList
          title="Required capabilities"
          items={stats.requiredCapabilities || []}
          empty="No required capabilities described yet."
        />
      </section>

      <section className="code-linked-list" aria-label="Code linked references">
        <h3>Linked references</h3>
        {linkedAssets.length > 0 ? (
          <div>
            {linkedAssets.map((item) => (
              <span key={`${item.role}-${item.crab_url}`}>
                {labelFromSnake(item.role)} · {item.expected_kind}
              </span>
            ))}
          </div>
        ) : (
          <p>No linked code, facet, docs, tests, audits, or examples yet.</p>
        )}
      </section>

      <section className="code-toml-section" aria-label="Facet TOML preview">
        <h3>facet.toml preview</h3>
        <pre className="code-toml-preview">{facetToml}</pre>
      </section>

      <section className="code-safety-list" aria-label="Code safety contract">
        <h3>Safety contract</h3>
        <ul>
          <li>crab://code previews code and facet metadata only.</li>
          <li>Code byte references are inert text in this route.</li>
          <li>No source is fetched, compiled, evaled, interpreted, or executed.</li>
          <li>No WASM module is instantiated by CrabLink from this route.</li>
          <li>Future runtime requires facet.toml, capabilities, policy, resource limits, and sandboxing.</li>
        </ul>
      </section>
    </article>
  );
}

function TokenList({ title, items, empty }) {
  return (
    <section className="code-token-list">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <div>
          {items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function cleanText(value) {
  return String(value || '').trim();
}