/**
 * RO:WHAT — Not-found page for unsupported or malformed CrabLink routes.
 * RO:WHY — App Integration; Concerns: DX/SEC; fails safely without falling into legacy DOM rescue behavior.
 * RO:INTERACTS — router.js, App.jsx, shared components.
 * RO:INVARIANTS — no backend mutation; no fake asset/site truth; route failure stays explicit.
 * RO:METRICS — none.
 * RO:CONFIG — route prop from App.
 * RO:SECURITY — renders text only; no untrusted HTML.
 * RO:TEST — manually enter malformed routes and verify safe failure.
 */

import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import './notFound.css';

export default function NotFoundPage({ route, app }) {
  return (
    <section className="cl-page not-found-page">
      <PageHeader
        eyebrow="Not found"
        title="CrabLink route not recognized"
        copy="This route does not currently map to a built-in CrabLink page owner."
        actions={
          <Button onClick={app?.goHome}>
            Go Home
          </Button>
        }
      />

      <TruthBoundary
        tone="warning"
        title="No backend lookup was performed by this page"
        copy="This is a frontend route selection failure only. It does not create a site, asset, wallet action, receipt, or CID."
      />

      <Card title="Route details">
        <JsonPreview label="Route state" data={route || {}} initiallyOpen />
      </Card>
    </section>
  );
}