/**
 * RO:WHAT — Structured problem page for CrabLink route and future gateway errors.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; gives failures a consistent safe renderer.
 * RO:INTERACTS — router.js, future gateway clients, shared components.
 * RO:INVARIANTS — display only supplied problem data; no fake success; no secret leakage.
 * RO:METRICS — none yet.
 * RO:CONFIG — route/problem props.
 * RO:SECURITY — text/JSON rendering only; no untrusted HTML.
 * RO:TEST — manually route to crab://problem and inspect displayed problem JSON.
 */

import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import './problem.css';

export default function ProblemPage({ route, app }) {
  const problem = route?.params?.problem || {
    schema: 'crablink.problem.frontend.v1',
    title: 'Problem route',
    detail: 'No specific problem payload was provided.',
    route,
  };

  return (
    <section className="cl-page problem-page">
      <PageHeader
        eyebrow="Problem"
        title={problem.title || 'CrabLink problem'}
        copy={problem.detail || 'A structured problem was provided to the CrabLink shell.'}
        actions={
          <Button variant="secondary" onClick={app?.goHome}>
            Go Home
          </Button>
        }
      />

      <TruthBoundary
        tone="danger"
        title="Failure is explicit"
        copy="CrabLink should show degraded, denied, missing, or malformed states clearly instead of pretending a route succeeded."
      />

      <Card title="Problem JSON">
        <JsonPreview label="Problem payload" data={problem} initiallyOpen />
      </Card>
    </section>
  );
}