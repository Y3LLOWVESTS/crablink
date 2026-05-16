/**
 * RO:WHAT — Text primitive readiness dashboard for post/comment/article.
 * RO:WHY — NEXT_LEVEL requires paid post/comment/article proofs before QuickChain can responsibly begin.
 * RO:INTERACTS — localCatalog, recentReceipts, post/comment/article route owners, app navigation.
 * RO:INVARIANTS — display-only; no fake CIDs; no fake receipts; no wallet mutation; no chain logic.
 * RO:METRICS — none.
 * RO:CONFIG — reads local display proof caches only.
 * RO:SECURITY — no private keys, tokens, spend authority, internal-service calls, or arbitrary crab code execution.
 * RO:TEST — crab://text after opening/publishing/importing post/comment/article assets; verify counts, routes, and copy summary.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import Field from '../../shared/components/Field.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import {
  readLocalCatalog,
  subscribeLocalCatalog,
  writeLocalCatalogEntries,
} from '../../shared/catalog/localCatalog.js';
import {
  readRecentReceipts,
  subscribeRecentReceipts,
} from '../../shared/receipts/recentReceipts.js';
import './text.css';

const EMPTY_CATALOG = Object.freeze({
  schema: 'crablink.local-catalog.v1',
  generatedAt: '',
  profiles: [],
  sites: [],
  assets: [],
  all: [],
});

const TEXT_KINDS = Object.freeze(['post', 'comment', 'article']);

const BACKEND_TEXT_ROUTES = Object.freeze([
  {
    kind: 'post',
    prepareRoute: '/assets/post/prepare',
    publishRoute: '/assets/post',
    omnigateTest: 'cargo test -p omnigate --test text_asset_publish',
  },
  {
    kind: 'comment',
    prepareRoute: '/assets/comment/prepare',
    publishRoute: '/assets/comment',
    omnigateTest: 'cargo test -p omnigate --test comment_asset_publish',
  },
  {
    kind: 'article',
    prepareRoute: '/assets/article/prepare',
    publishRoute: '/assets/article',
    omnigateTest: 'cargo test -p omnigate --test article_asset_publish',
  },
]);

const PRIMITIVES = Object.freeze([
  {
    kind: 'post',
    route: 'crab://post',
    title: 'Post',
    phase: 'backend-wired / proof visible when opened or imported',
    required: 'site context',
    prepareRoute: '/assets/post/prepare',
    publishRoute: '/assets/post',
    summary:
      'Short/social text asset. It remains its own b3-backed object while the site stores a reference.',
    next:
      'Open or import a real crab://<hash>.post from the publish smoke so Library records local display proof.',
  },
  {
    kind: 'comment',
    route: 'crab://comment',
    title: 'Comment',
    phase: 'backend-wired / proof visible when opened or imported',
    required: 'site context + parent target',
    prepareRoute: '/assets/comment/prepare',
    publishRoute: '/assets/comment',
    summary:
      'Comment asset with parent post/comment relationship plus site/thread context.',
    next:
      'Open or import a real crab://<hash>.comment after the parent route resolves honestly.',
  },
  {
    kind: 'article',
    route: 'crab://article',
    title: 'Article',
    phase: 'backend-wired / proof visible when opened or imported',
    required: 'site context + long-form body',
    prepareRoute: '/assets/article/prepare',
    publishRoute: '/assets/article',
    summary:
      'Long-form article asset with title, body, optional hero image, provenance, and payout policy.',
    next:
      'Open or import a real crab://<hash>.article, then keep it covered by repeatable smoke.',
  },
]);

const SAMPLE_IMPORT = `Fresh text URLs:
  post:    crab://9cc5319d0e41a760b90592278fba1fd55b7ff82069bfc865b11311baea02f819.post
  comment: crab://a398906bf17baae32895632f2a64640928507703f80499f237d488189325cc88.comment
  article: crab://827eaa017d85235efce172bbc90b9d0bd589b62f6fb6fe795e7ecf71e5ae2af3.article`;

export default function TextPrimitiveReadinessPage({ app }) {
  const [catalog, setCatalog] = useState(() => safeReadCatalog());
  const [receipts, setReceipts] = useState(() => safeReadReceipts());
  const [copyState, setCopyState] = useState('');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null);

  useEffect(() => subscribeLocalCatalog(setCatalog), []);
  useEffect(() => subscribeRecentReceipts(setReceipts), []);

  const proof = useMemo(
    () =>
      buildTextProof({
        catalog,
        receipts,
      }),
    [catalog, receipts],
  );

  const allReady = proof.counts.post > 0 && proof.counts.comment > 0 && proof.counts.article > 0;
  const provenCount = Number(proof.counts.post > 0) + Number(proof.counts.comment > 0) + Number(proof.counts.article > 0);
  const percent = Math.round((provenCount / 3) * 100);

  async function copyReadinessSummary() {
    const lines = [
      'CrabLink text primitive readiness',
      '',
      `Post proofs: ${proof.counts.post}`,
      `Comment proofs: ${proof.counts.comment}`,
      `Article proofs: ${proof.counts.article}`,
      `Receipts touching text assets: ${proof.textReceiptCount}`,
      `Readiness: ${percent}%`,
      '',
      'Current proof routes:',
      ...proof.textAssets.map((item) => `- ${item.kind}: ${item.crabUrl || item.cid || item.title}`),
      '',
      'Truth boundary:',
      'This is local display proof only. Backend publish/resolve receipts and ledger replay remain authoritative.',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyState('Copied text primitive readiness summary');
    } catch (_error) {
      setCopyState('Clipboard unavailable');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  function importSmokeProof() {
    const entries = entriesFromSmokeText(importText);

    if (entries.length === 0) {
      setImportResult({
        ok: false,
        message: 'No valid crab://<64hex>.post/comment/article URLs found.',
        entries: [],
      });
      return;
    }

    const written = writeLocalCatalogEntries(entries);
    setCatalog(safeReadCatalog());

    setImportResult({
      ok: true,
      message: `Imported ${entries.length} text proof ${entries.length === 1 ? 'entry' : 'entries'} into local display catalog.`,
      entries,
      writtenCount: Array.isArray(written) ? written.length : 0,
    });
  }

  function loadSampleImport() {
    setImportText(SAMPLE_IMPORT);
    setImportResult(null);
  }

  return (
    <section className="cl-page text-page">
      <PageHeader
        eyebrow="Text primitive readiness"
        title="Post, Comment, Article"
        copy="Track local display evidence for the three backend-wired, site-attached text primitives. Backend routes publish the assets; this page only remembers proof the browser has opened or imported."
        meta={
          <>
            <Badge tone={allReady ? 'success' : 'warning'}>{allReady ? 'text proof complete' : 'text proof open'}</Badge>
            <Badge tone="neutral">gateway-only</Badge>
            <Badge tone="info">pre-QuickChain</Badge>
          </>
        }
        actions={
          <div className="text-header-actions">
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://library')}>
              Open Library
            </Button>
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://quickchain')}>
              Open QuickChain
            </Button>
            <Button variant="ghost" onClick={copyReadinessSummary}>
              Copy summary
            </Button>
          </div>
        }
      />

      {copyState && <p className="text-copy-state">{copyState}</p>}

      <section className="text-progress-grid" aria-label="Text primitive progress">
        <ProgressCard label="Readiness" value={`${percent}%`} detail={`${provenCount} of 3 text primitives visible in local proof memory`} tone={allReady ? 'success' : 'warning'} />
        <ProgressCard label="Posts" value={String(proof.counts.post)} detail="Published/opened/imported .post entries remembered locally" tone={proof.counts.post > 0 ? 'success' : 'neutral'} />
        <ProgressCard label="Comments" value={String(proof.counts.comment)} detail="Published/opened/imported .comment entries remembered locally" tone={proof.counts.comment > 0 ? 'success' : 'neutral'} />
        <ProgressCard label="Articles" value={String(proof.counts.article)} detail="Published/opened/imported .article entries remembered locally" tone={proof.counts.article > 0 ? 'success' : 'neutral'} />
      </section>

      <TruthBoundary
        tone={allReady ? 'success' : 'warning'}
        title={allReady ? 'Text primitive local proof is visible' : 'Text primitive local proof is still incomplete'}
        copy={
          allReady
            ? 'CrabLink can see local display entries for post, comment, and article. The next backend gates are paid content views, ledger replay, accounting snapshots, and rewarder plans.'
            : 'This page only counts real local evidence from opened typed routes, local catalog entries, or imported terminal smoke output. It does not mint assets, create CIDs, or pretend a proof happened before a real typed URL exists.'
        }
      />

      <section className="text-primitive-grid" aria-label="Text primitive cards">
        {PRIMITIVES.map((primitive) => (
          <PrimitiveCard
            key={primitive.kind}
            primitive={primitive}
            proof={proof.byKind[primitive.kind]}
            app={app}
          />
        ))}
      </section>

      <Card
        eyebrow="Terminal smoke import"
        title="Import fresh text publish proof"
        actions={
          <div className="text-card-actions">
            <Button variant="secondary" onClick={loadSampleImport}>
              Load latest sample
            </Button>
            <Button variant="primary" onClick={importSmokeProof}>
              Import proof
            </Button>
          </div>
        }
      >
        <p>
          Paste the “Fresh text URLs” section from <code>scripts/smoke-text-assets-local.sh</code>, or paste the
          contents of <code>dist/text-asset-smoke/last-text-assets.env</code>. CrabLink will store only a
          display-only local catalog entry for each typed URL.
        </p>

        <Field
          label="Smoke output or env file"
          help="Accepted: crab://<64hex>.post, crab://<64hex>.comment, crab://<64hex>.article. No backend mutation happens here."
        >
          <TextArea
            rows={7}
            value={importText}
            onChange={(event) => {
              setImportText(event.target.value);
              setImportResult(null);
            }}
            placeholder={SAMPLE_IMPORT}
            spellCheck={false}
          />
        </Field>

        {importResult && (
          <div className="text-fact-grid" role="status" aria-live="polite">
            <TextFact label="Import status" value={importResult.ok ? 'imported' : 'not imported'} />
            <TextFact label="Message" value={importResult.message} />
            <TextFact label="Entries found" value={String(importResult.entries?.length || 0)} />
            <TextFact label="Truth boundary" value="local display cache only" />
          </div>
        )}

        {importResult?.entries?.length > 0 && (
          <div className="text-proof-card-grid">
            {importResult.entries.map((item) => (
              <TextProofCard key={`import:${item.crabUrl}`} item={item} app={app} />
            ))}
          </div>
        )}
      </Card>

      <section className="text-next-grid" aria-label="Recommended next steps">
        <Card eyebrow="Current stack proof order" title="Text publish proof is now repeatable">
          <ol className="text-ordered-list">
            <li>Run <code>CRABLINK_GREEN_RUN_TEXT_PUBLISH=1 bash scripts/green-gate-local.sh</code>.</li>
            <li>Import the fresh post/comment/article URLs here or open each typed URL directly.</li>
            <li>Confirm <code>crab://text</code> shows 3/3 local proof.</li>
            <li>Confirm <code>crab://library</code> shows the text assets under Text assets.</li>
            <li>Keep <code>crab://quickchain</code> locked until replay/accounting/rewarder gates are real.</li>
          </ol>
        </Card>

        <Card eyebrow="Backend route contract" title="Expected public gateway paths">
          <ul className="text-ordered-list">
            {BACKEND_TEXT_ROUTES.map((route) => (
              <li key={route.kind}>
                <code>{route.prepareRoute}</code> → <code>{route.publishRoute}</code> · {route.omnigateTest}
              </li>
            ))}
          </ul>
        </Card>

        <Card eyebrow="Still not QuickChain" title="Frontend proof is not enough">
          <ul className="text-ordered-list">
            <li>Backend must return canonical <code>crab://&lt;hash&gt;.&lt;kind&gt;</code> URLs.</li>
            <li>Paid content view route shape is still a separate NEXT_LEVEL gate.</li>
            <li>Ledger replay and accounting snapshots remain separate backend gates.</li>
            <li>Rewarder payout plans must be deterministic before chain work starts.</li>
          </ul>
        </Card>
      </section>

      <section className="text-proof-list" aria-label="Current text proof entries">
        <header>
          <div>
            <p className="cl-eyebrow">Current local proof</p>
            <h2>Text asset entries</h2>
            <p>These entries come from the local display catalog and receipt cache.</p>
          </div>
          <Badge tone={proof.textAssets.length ? 'success' : 'warning'}>{proof.textAssets.length} entries</Badge>
        </header>

        {proof.textAssets.length === 0 ? (
          <Card eyebrow="No text assets yet" title="Open or import fresh text assets">
            <p>
              Use the terminal smoke to publish text assets, then either paste the fresh URLs into the importer above or open each typed URL directly.
            </p>
            <div className="text-card-actions">
              <Button variant="secondary" onClick={() => app?.navigate?.('crab://post')}>
                Open post
              </Button>
              <Button variant="secondary" onClick={() => app?.navigate?.('crab://comment')}>
                Open comment
              </Button>
              <Button variant="secondary" onClick={() => app?.navigate?.('crab://article')}>
                Open article
              </Button>
            </div>
          </Card>
        ) : (
          <div className="text-proof-card-grid">
            {proof.textAssets.map((item, index) => (
              <TextProofCard key={`${item.kind}:${item.crabUrl}:${item.cid}:${index}`} item={item} app={app} />
            ))}
          </div>
        )}
      </section>

      <details className="text-dev-json">
        <summary>Developer text readiness JSON</summary>
        <JsonPreview
          label="Text primitive readiness"
          data={{
            schema: 'crablink.text-primitives-readiness.v1',
            generated_at: new Date().toISOString(),
            readiness_percent: percent,
            counts: proof.counts,
            receipt_count: proof.textReceiptCount,
            backend_routes: BACKEND_TEXT_ROUTES,
            primitives: PRIMITIVES,
            text_assets: proof.textAssets,
            text_receipts: proof.textReceipts,
            truth_boundary:
              'Local display cache only. This page does not prove backend publication, ownership, wallet mutation, ledger replay, accounting snapshots, rewarder payouts, or QuickChain readiness by itself.',
          }}
        />
      </details>
    </section>
  );
}

function ProgressCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`text-progress-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function PrimitiveCard({ primitive, proof, app }) {
  const count = proof?.length || 0;
  const latest = proof?.[0] || null;
  const isProven = count > 0;

  return (
    <article className={`text-primitive-card is-${isProven ? 'proven' : 'open'}`}>
      <header>
        <div>
          <span>{primitive.phase}</span>
          <strong>{primitive.title}</strong>
        </div>
        <Badge tone={isProven ? 'success' : 'warning'}>{isProven ? 'local proof visible' : 'open'}</Badge>
      </header>

      <p>{primitive.summary}</p>

      <div className="text-fact-grid">
        <TextFact label="Required" value={primitive.required} />
        <TextFact label="Prepare" value={primitive.prepareRoute} monospace />
        <TextFact label="Publish" value={primitive.publishRoute} monospace />
        <TextFact label="Proof count" value={String(count)} />
        <TextFact label="Latest route" value={latest?.crabUrl || 'not returned'} monospace />
        <TextFact label="Next" value={primitive.next} />
      </div>

      <footer className="text-card-actions">
        <Button variant="primary" onClick={() => app?.navigate?.(primitive.route)}>
          Open workspace
        </Button>
        {latest?.crabUrl && (
          <Button variant="secondary" onClick={() => app?.navigate?.(latest.crabUrl)}>
            Open latest
          </Button>
        )}
        <CopyButton text={latest?.crabUrl || primitive.route} label="Copy route" />
      </footer>
    </article>
  );
}

function TextProofCard({ item, app }) {
  const route = item.crabUrl || '';
  const proof = item.receiptHash || item.txid || item.cid || item.manifestCid || item.rootDocumentCid || '';

  return (
    <article className="text-proof-card">
      <header>
        <div>
          <span>{item.kind}</span>
          <strong>{item.title || route || proof || 'Text asset'}</strong>
        </div>
        <Badge tone="info">{item.status || item.source || 'local display'}</Badge>
      </header>

      <div className="text-fact-grid">
        <TextFact label="Route" value={route || 'not returned'} monospace />
        <TextFact label="CID" value={item.cid || item.manifestCid || item.rootDocumentCid || 'not returned'} monospace />
        <TextFact label="Source" value={item.source || 'local catalog'} />
        <TextFact label="Created" value={formatTimestamp(item.createdAt || item.created_at || item.storedAt)} />
      </div>

      <footer className="text-card-actions">
        <Button variant="primary" onClick={() => app?.navigate?.(route)} disabled={!route || !app?.navigate}>
          Open
        </Button>
        <CopyButton text={route} label="Copy route" disabled={!route} />
        <CopyButton text={proof} label="Copy proof" disabled={!proof} />
      </footer>
    </article>
  );
}

function TextFact({ label, value, monospace = false }) {
  const clean = String(value || '').trim();

  return (
    <div className="text-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={clean}>
        {clean || 'n/a'}
      </strong>
    </div>
  );
}

function buildTextProof({ catalog = EMPTY_CATALOG, receipts = [] }) {
  const assets = [
    ...safeArray(catalog.assets),
    ...safeArray(catalog.all).filter((item) => isTextKind(normalizeKind(item.kind, item))),
  ];

  const normalizedAssets = dedupeEntries(assets.map(normalizeCatalogItem)).filter((item) => isTextKind(item.kind));
  const textReceipts = safeArray(receipts).filter((receipt) => {
    const text = [
      receipt.kind,
      receipt.action,
      receipt.title,
      receipt.crabUrl,
      receipt.manifestCid,
      receipt.rootDocumentCid,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return TEXT_KINDS.some((kind) => text.includes(kind));
  });

  const byKind = {
    post: sortByTime(normalizedAssets.filter((item) => item.kind === 'post')),
    comment: sortByTime(normalizedAssets.filter((item) => item.kind === 'comment')),
    article: sortByTime(normalizedAssets.filter((item) => item.kind === 'article')),
  };

  return {
    textAssets: sortByTime(normalizedAssets),
    textReceipts,
    textReceiptCount: textReceipts.length,
    byKind,
    counts: {
      post: byKind.post.length,
      comment: byKind.comment.length,
      article: byKind.article.length,
      all: normalizedAssets.length,
    },
  };
}

function entriesFromSmokeText(value) {
  const text = String(value || '');
  const matches = [...text.matchAll(/crab:\/\/([0-9a-f]{64})\.(post|comment|article)\b/gi)];
  const byKind = new Map();

  for (const match of matches) {
    const hash = String(match[1] || '').toLowerCase();
    const kind = String(match[2] || '').toLowerCase();

    if (!hash || !kind) {
      continue;
    }

    const crabUrl = `crab://${hash}.${kind}`;

    byKind.set(kind, {
      schema: 'crablink.local-catalog-entry.v1',
      kind,
      crabUrl,
      title: `${labelFromKind(kind)} asset`,
      status: 'gateway-published text smoke import',
      detail: `b3:${hash}`,
      source: 'text_smoke_import',
      cid: `b3:${hash}`,
      hash,
      createdAt: new Date().toISOString(),
      raw: {
        kind,
        crab_url: crabUrl,
        cid: `b3:${hash}`,
        source: 'text_smoke_import',
        proof_note:
          'Imported from terminal smoke output or last-text-assets.env. The terminal smoke performed backend publish/resolve/raw-read; this browser entry is display-only memory.',
        truth_boundary:
          'This local catalog entry is not authorization, wallet truth, ledger truth, ownership truth, or a backend public catalog.',
      },
    });
  }

  return TEXT_KINDS.map((kind) => byKind.get(kind)).filter(Boolean);
}

function normalizeCatalogItem(item = {}) {
  const kind = normalizeKind(item.kind, item);

  return {
    kind,
    title: item.title || item.name || item.crabUrl || item.cid || `${kind} entry`,
    crabUrl: item.crabUrl || item.crab_url || '',
    cid: item.cid || '',
    manifestCid: item.manifestCid || item.manifest_cid || '',
    rootDocumentCid: item.rootDocumentCid || item.root_document_cid || '',
    receiptHash: item.receiptHash || item.receipt_hash || '',
    txid: item.txid || '',
    status: item.status || 'local display cache',
    detail: item.detail || '',
    source: item.source || 'local_catalog',
    createdAt: item.createdAt || item.created_at || item.updatedAt || item.updated_at || '',
    raw: item.raw || item,
  };
}

function normalizeKind(kind, item = {}) {
  const clean = String(kind || '').trim().toLowerCase();
  const crabUrl = String(item.crabUrl || item.crab_url || '').trim().toLowerCase();

  for (const textKind of TEXT_KINDS) {
    if (clean === textKind || new RegExp(`\\.${textKind}$`, 'i').test(crabUrl)) {
      return textKind;
    }
  }

  return clean || 'asset';
}

function isTextKind(kind) {
  return TEXT_KINDS.includes(kind);
}

function dedupeEntries(items) {
  const out = [];
  const seen = new Set();

  for (const item of items) {
    const key = [item.kind, item.crabUrl, item.cid, item.manifestCid, item.txid, item.receiptHash]
      .filter(Boolean)
      .join('|');

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(item);
  }

  return out;
}

function safeReadCatalog() {
  try {
    return readLocalCatalog() || EMPTY_CATALOG;
  } catch (_error) {
    return EMPTY_CATALOG;
  }
}

function safeReadReceipts() {
  try {
    return readRecentReceipts() || [];
  } catch (_error) {
    return [];
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sortByTime(items = []) {
  return safeArray(items)
    .slice()
    .sort((a, b) => timestampForSort(b) - timestampForSort(a));
}

function timestampForSort(value) {
  const raw = String(value?.createdAt || value?.created_at || value?.storedAt || '').trim();

  if (!raw) {
    return 0;
  }

  if (/^[0-9]+$/.test(raw)) {
    const n = Number(raw);
    return n > 10_000_000_000 ? n : n * 1000;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTimestamp(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return 'not returned';
  }

  const parsed = Date.parse(raw);

  if (!Number.isFinite(parsed)) {
    return raw;
  }

  return new Date(parsed).toLocaleString();
}

function labelFromKind(kind) {
  return String(kind || 'asset')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}