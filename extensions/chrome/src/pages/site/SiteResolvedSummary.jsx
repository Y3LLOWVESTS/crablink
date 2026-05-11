/**
 * RO:WHAT — Summary card for gateway-resolved `omnigate.site-page.v1` site DTOs.
 * RO:WHY — Gives named crab:// sites first-class UX instead of a generic JSON blob.
 * RO:INTERACTS — SiteRender, siteClient summary DTOs, shared Card/Badge/Button/CopyButton.
 * RO:INVARIANTS — display-only; no site creation, no wallet mutation, no fake manifest/root proof.
 * RO:METRICS — displays backend correlation ID when present.
 * RO:CONFIG — app.refreshRoute may be supplied by shell context.
 * RO:SECURITY — text-only React rendering; no untrusted HTML injection.
 * RO:TEST — manual crab://<site_name> resolve smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';

export default function SiteResolvedSummary({ app, result }) {
  const summary = result?.summary || {};
  const receiptCount = Array.isArray(summary.receipts) ? summary.receipts.length : 0;
  const warningCount = Array.isArray(summary.warnings) ? summary.warnings.length : 0;

  return (
    <Card
      eyebrow="Resolved site"
      title={summary.title || summary.siteName || 'Resolved site'}
      className="site-resolved-card"
      actions={
        <div className="site-page-actions">
          <CopyButton text={summary.crabUrl} label="Copy crab URL" />
          <Button variant="secondary" onClick={app?.refreshRoute}>
            Refresh
          </Button>
        </div>
      }
    >
      <div className="site-resolved-grid">
        <Fact label="Site" value={summary.crabUrl || 'n/a'} />
        <Fact label="Schema" value={summary.schema || 'not returned'} />
        <Fact label="Manifest CID" value={summary.manifestCid || 'not returned'} monospace />
        <Fact label="Root document" value={summary.rootDocumentCid || 'not returned'} monospace />
        <Fact label="Owner" value={summary.ownerPassport || 'not returned'} />
        <Fact label="Wallet" value={summary.ownerWallet || 'not returned'} />
        <Fact label="Payout" value={summary.payoutMode || 'not returned'} />
        <Fact label="Recipient" value={summary.payoutRecipient || 'not returned'} />
        <Fact label="Receipts" value={String(receiptCount)} />
        <Fact label="Warnings" value={String(warningCount)} />
        <Fact label="Hydration" value={summary.hydrationStatus || summary.status || 'not returned'} />
        <Fact label="Correlation" value={result?.response?.correlationId || 'n/a'} monospace />
      </div>

      {summary.description && <p className="site-resolved-description">{summary.description}</p>}

      {summary.tags?.length > 0 && (
        <div className="site-preview-badges" aria-label="Site tags">
          {summary.tags.map((tag) => (
            <Badge key={tag} tone="neutral" uppercase={false}>
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function Fact({ label, value, monospace = false }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'n/a'}</strong>
    </div>
  );
}