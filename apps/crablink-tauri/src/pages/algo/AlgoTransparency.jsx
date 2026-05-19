/**
 * RO:WHAT — Safe transparency preview for a local crab://algo draft.
 * RO:WHY — CrabLink refactor; explains algorithm behavior without executing code or ranking content.
 * RO:INTERACTS — AlgoDraft.jsx, algoDraftModel.js, shared Badge/Card styling.
 * RO:INVARIANTS — preview only; no runtime; no sandbox launch; no network fetch; no ranking mutation.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — renders inert text only; linked crab URLs are displayed as references, not executed.
 * RO:TEST — npm run build; manual crab://algo builder/developer smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import { labelFromSnake } from './algoDraftModel.js';
import { AlgoSummaryList } from './AlgoDraft.jsx';

export default function AlgoTransparency({ draft, manifest }) {
  const metadata = manifest?.metadata || {};
  const behavior = manifest?.behavior_contract || {};
  const execution = manifest?.execution_policy || {};
  const linkedAssets = manifest?.linked_assets || [];
  const tags = metadata.tags || [];

  return (
    <article className="algo-preview" aria-label="Safe algorithm transparency preview">
      <section className="algo-preview-hero">
        <div>
          <p className="algo-preview-owner">
            {cleanText(draft.creatorDisplay) || 'Unverified maintainer'} ·{' '}
            {labelFromSnake(draft.algoKind)}
          </p>
          <h3>{cleanText(draft.algorithmName) || 'Your algorithm name'}</h3>
          <p>
            {cleanText(draft.purpose) ||
              'Describe what this algorithm does and why users should trust it.'}
          </p>
        </div>

        <Badge tone="warning" uppercase={false}>
          No runtime
        </Badge>
      </section>

      <div className="algo-preview-tags">
        <Badge tone="neutral" uppercase={false}>
          {labelFromSnake(draft.transparencyLevel)}
        </Badge>
        <Badge tone="neutral" uppercase={false}>
          {labelFromSnake(draft.releaseChannel)}
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

      <AlgoSummaryList manifest={manifest} />

      <section className="algo-signal-preview" aria-label="Algorithm signal preview">
        <SignalColumn
          title="Allowed input signals"
          items={behavior.input_signals || []}
          empty="No allowed signals described yet."
        />
        <SignalColumn
          title="Excluded signals"
          items={behavior.excluded_signals || []}
          empty="No excluded signals described yet."
        />
      </section>

      <section className="algo-goal-card" aria-label="Algorithm goal and review notes">
        <h3>Goal and review notes</h3>
        <PreviewBlock label="Ranking goal" value={behavior.ranking_goal} />
        <PreviewBlock label="Fairness notes" value={behavior.fairness_notes} />
        <PreviewBlock label="Moderation notes" value={behavior.moderation_notes} />
        <PreviewBlock label="Evaluation notes" value={behavior.evaluation_notes} />
      </section>

      <section className="algo-linked-list" aria-label="Algorithm linked references">
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
          <p>No linked code, facet, policy, audit, or example references yet.</p>
        )}
      </section>

      <section className="algo-safety-list" aria-label="Algorithm safety contract">
        <h3>Safety contract</h3>
        <ul>
          <li>crab://algo previews behavior and transparency only.</li>
          <li>Source code references are inert text in this route.</li>
          <li>No code is loaded, interpreted, ranked, evaluated, or executed.</li>
          <li>Future runtime requires facet.toml, capability policy, resource limits, and sandboxing.</li>
          <li>
            Current execution state:{' '}
            <strong>{execution.executes_in_crablink_shell ? 'unsafe' : 'not executing'}</strong>.
          </li>
        </ul>
      </section>
    </article>
  );
}

function SignalColumn({ title, items, empty }) {
  return (
    <div className="algo-signal-column">
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
    </div>
  );
}

function PreviewBlock({ label, value }) {
  return (
    <div className="algo-preview-block">
      <span>{label}</span>
      <p>{value || 'Not described yet.'}</p>
    </div>
  );
}

function cleanText(value) {
  return String(value || '').trim();
}