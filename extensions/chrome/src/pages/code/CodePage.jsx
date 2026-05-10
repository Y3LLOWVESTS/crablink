/**
 * RO:WHAT — Route owner for the React crab://code local code primitive workspace.
 * RO:WHY — CrabLink refactor; models code primitive manifests and facet contracts without executing code.
 * RO:INTERACTS — CodeDraft, CodeFacet, FacetContractPreview, useCreatorDraft, app router, future svc-sandbox/policy/facet routes.
 * RO:INVARIANTS — local draft only; no arbitrary code execution; no sandbox launch; no fake b3 CID; no ROC mutation.
 * RO:METRICS — none; future code/facet execution must be sandbox/accounting/policy observable.
 * RO:CONFIG — route props only; future runtime/policy configs come from backend contracts.
 * RO:SECURITY — CrabLink renders this page only; executable primitives require facet.toml, policy, capabilities, limits, and sandbox.
 * RO:TEST — npm run build; check-react-lane; manual crab://code route smoke in light and dark mode.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import CodeDraft, { CodeSidePanel } from './CodeDraft.jsx';
import {
  DEFAULT_CODE_DRAFT,
  buildCodeManifestDraft,
  getCodeCompleteness,
  statsForCodeDraft,
} from './codeDraftModel.js';
import './code.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Address is not execution',
    copy:
      'A crab://<hash>.code primitive is only an address. CrabLink must never fetch and execute arbitrary code from a page route.',
  },
  {
    title: 'Facet contract first',
    copy:
      'Runnable code needs a facet.toml contract declaring permissions, routes, actions, limits, and required capabilities.',
  },
  {
    title: 'Sandbox and policy own runtime',
    copy:
      'Future execution belongs behind svc-sandbox and ron-policy. CrabLink is a renderer/launcher, not an unsafe executor.',
  },
]);

export default function CodePage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildCodeManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_CODE_DRAFT,
    buildManifest,
    buildStats: statsForCodeDraft,
    getCompleteness: getCodeCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://code"
      title="Code Primitive Studio"
      copy="Draft code primitive and facet contract manifests for future safe reusable components. This React route is local-only and does not fetch, compile, eval, instantiate, sandbox, publish, or execute code."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'No execution', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<CodeSidePanel draftState={draftState} />}
      className="code-page"
    >
      <RouteTruthPanel
        routeKind="code"
        tone="info"
        title="Code route truth boundary"
        allowed={[
          'local primitive drafting',
          'facet contract preview',
          'permission planning',
          'manifest JSON preview',
        ]}
        blocked={[
          'no code bytes fetched',
          'no eval or compile',
          'no WASM instantiation',
          'no sandbox launch',
          'no capability issuance',
          'no b3 CID minted',
          'no manifest CID minted',
          'no ROC hold/capture/release',
        ]}
      />

      <CodeDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}