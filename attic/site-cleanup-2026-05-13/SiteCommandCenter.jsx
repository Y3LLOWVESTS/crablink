/**
 * RO:WHAT — Above-the-fold command center for the React crab://site workspace.
 * RO:WHY — Makes the paid site flow visibly guided instead of hiding the important path deep down the page.
 * RO:INTERACTS — SitePage.jsx, siteDraftModel stats, SiteLaunchFlow, SiteRootUpload, SiteRender.
 * RO:INVARIANTS — display/jump helper only; no backend calls; no wallet mutation; no fake b3/root/receipt truth.
 * RO:METRICS — none.
 * RO:CONFIG — reads local draft stats and app settings for display-only readiness hints.
 * RO:SECURITY — no secrets; no direct service calls; never claims backend publication.
 * RO:TEST — manual crab://site route smoke and jump-button smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import StatChip from '../../shared/components/StatChip.jsx';

export default function SiteCommandCenter({ app, draftState }) {
  const draft = draftState?.draft || {};
  const stats = draftState?.stats || {};
  const settings = app?.settings || {};
  const siteUrl = draft.siteName ? `crab://${draft.siteName}` : 'crab://<site-name>';
  const hasPassport = Boolean(settings.passportSubject || draft.ownerPassport);
  const hasWallet = Boolean(settings.walletAccount || draft.ownerWallet);
  const hasRootHtml = Number(stats.rootHtmlBytes || 0) > 0;
  const hasRootCid = Boolean(stats.hasRootCidHint);
  const guardOk = stats.rootGuard?.ok !== false;
  const readyForPrepare = Boolean(draft.siteName && hasPassport && hasWallet && hasRootHtml && guardOk);
  const readyForCreate = readyForPrepare && hasRootCid;

  const steps = [
    {
      id: 'draft',
      label: 'Draft',
      complete: Boolean(draft.siteName && draft.title && hasRootHtml),
      detail: draft.siteName ? siteUrl : 'choose a site name',
    },
    {
      id: 'prepare',
      label: 'Prepare',
      complete: readyForPrepare,
      detail: readyForPrepare ? '/sites/prepare ready' : 'needs passport, wallet, and root HTML',
    },
    {
      id: 'hold',
      label: 'Hold',
      complete: false,
      detail: 'explicit ROC hold in launch flow',
    },
    {
      id: 'root',
      label: 'Root CID',
      complete: hasRootCid,
      detail: hasRootCid ? 'backend root CID present' : 'store root HTML after hold',
    },
    {
      id: 'create',
      label: 'Create',
      complete: readyForCreate,
      detail: readyForCreate ? '/sites create can be attempted' : 'needs hold proof + root CID',
    },
  ];

  const nextAction = getNextAction({
    draft,
    hasPassport,
    hasWallet,
    hasRootHtml,
    hasRootCid,
    guardOk,
    readyForPrepare,
    readyForCreate,
  });

  return (
    <Card
      eyebrow="Command center"
      title="Launch this site in four explicit steps"
      className="site-command-card"
      actions={
        <div className="site-page-actions">
          <Badge tone={readyForCreate ? 'success' : readyForPrepare ? 'info' : 'warning'}>
            {readyForCreate ? 'create-ready' : readyForPrepare ? 'prepare-ready' : 'needs setup'}
          </Badge>
          <CopyButton text={siteUrl} label="Copy site URL" disabled={!draft.siteName} />
        </div>
      }
    >
      <div className="site-command-hero">
        <div>
          <p className="site-command-route">{siteUrl}</p>
          <p className="site-panel-note">
            The site is still local until the launch flow completes. Prepare estimates the action, Hold creates the wallet
            proof, Store Root HTML returns the real b3 root CID, and Create writes the named site pointer.
          </p>
        </div>

        <div className="site-command-next">
          <span>Next action</span>
          <strong>{nextAction.title}</strong>
          <small>{nextAction.detail}</small>
        </div>
      </div>

      <div className="site-command-steps" aria-label="Site launch checklist">
        {steps.map((step, index) => (
          <div key={step.id} className={`site-command-step ${step.complete ? 'is-complete' : ''}`}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </div>
        ))}
      </div>

      <div className="site-command-stats">
        <StatChip label="Root HTML" value={formatBytes(stats.rootHtmlBytes || 0)} help="Local root document bytes" tone={hasRootHtml ? 'success' : 'warning'} />
        <StatChip label="Root CID" value={hasRootCid ? 'present' : 'missing'} help={stats.rootGuard?.reason || 'Backend root CID appears after Store Root HTML'} tone={hasRootCid ? 'success' : 'warning'} />
        <StatChip label="Passport" value={hasPassport ? 'ready' : 'missing'} help="Display-only identity hint used for launch request" tone={hasPassport ? 'success' : 'warning'} />
        <StatChip label="Wallet" value={hasWallet ? 'ready' : 'missing'} help="Gateway-backed wallet account used for explicit hold" tone={hasWallet ? 'success' : 'warning'} />
      </div>

      <div className="site-command-actions">
        <Button variant="secondary" onClick={() => scrollToId('site-root-document')}>
          Edit Root HTML
        </Button>
        <Button variant="secondary" onClick={() => scrollToId('site-preview')}>
          Preview Site
        </Button>
        <Button variant="primary" onClick={() => scrollToId('site-launch-flow')}>
          Open Launch Flow
        </Button>
      </div>
    </Card>
  );
}

function getNextAction({
  draft,
  hasPassport,
  hasWallet,
  hasRootHtml,
  hasRootCid,
  guardOk,
  readyForPrepare,
  readyForCreate,
}) {
  if (!draft.siteName) {
    return {
      title: 'Choose a site name',
      detail: 'The backend pointer needs a human crab:// name.',
    };
  }

  if (!hasPassport || !hasWallet) {
    return {
      title: 'Confirm identity and wallet hints',
      detail: 'CrabLink can display hints, but backend truth comes from the gateway.',
    };
  }

  if (!hasRootHtml) {
    return {
      title: 'Add or import root HTML',
      detail: 'A site root is HTML/document bytes, not an image CID.',
    };
  }

  if (!guardOk) {
    return {
      title: 'Fix the root guard',
      detail: 'The current root document hint is not safe for launch.',
    };
  }

  if (!readyForPrepare) {
    return {
      title: 'Finish the local draft',
      detail: 'Complete the required launch inputs before preparing.',
    };
  }

  if (!hasRootCid) {
    return {
      title: 'Prepare, hold, then store root HTML',
      detail: 'Store Root HTML will auto-fill the backend b3 root CID.',
    };
  }

  if (readyForCreate) {
    return {
      title: 'Create the site pointer',
      detail: 'Use Launch Flow Step 4 after hold proof is ready.',
    };
  }

  return {
    title: 'Open Launch Flow',
    detail: 'Follow the explicit prepare → hold → store root → create sequence.',
  };
}

function scrollToId(id) {
  const target = document.getElementById(id);

  if (target?.scrollIntoView) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}