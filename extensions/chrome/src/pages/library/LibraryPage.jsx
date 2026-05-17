/**
 * RO:WHAT — Local CrabLink Library page for profiles, sites, assets, receipts, and text primitive proof.
 * RO:WHY — NEXT_LEVEL DX layer; makes profile/site/image/post/comment/article/receipt proof visible before QuickChain work.
 * RO:INTERACTS — localCatalog.js, recentReceipts.js, app navigation, CopyButton, JsonPreview.
 * RO:INVARIANTS — display-only; no backend catalog claim; no ownership proof; no wallet mutation; no fake receipts.
 * RO:METRICS — none.
 * RO:CONFIG — reads local display caches and route context only.
 * RO:SECURITY — no keys, tokens, spend authority, private alt mapping, chain logic, or direct service calls.
 * RO:TEST — crab://library after profile/site/image/post/comment/article/site_visit activity; verify tabs/open/copy/grouping.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import {
  clearLocalCatalogCache,
  dispatchLocalCatalogChanged,
  readLocalCatalog,
  subscribeLocalCatalog,
} from '../../shared/catalog/localCatalog.js';
import {
  clearRecentReceiptCache,
  dispatchReceiptsChanged,
  readRecentReceipts,
  subscribeRecentReceipts,
} from '../../shared/receipts/recentReceipts.js';
import './library.css';

const EMPTY_CATALOG = Object.freeze({
  schema: 'crablink.local-catalog.v1',
  generatedAt: '',
  profiles: [],
  sites: [],
  assets: [],
  all: [],
});

const TEXT_KINDS = Object.freeze(['post', 'comment', 'article']);
const TEXT_KIND_SET = new Set(TEXT_KINDS);
const MANIFEST_KINDS = new Set(['manifest', 'root']);
const IMAGE_LIKE_KIND = 'image';

const TABS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'sites', label: 'Sites' },
  { id: 'images', label: 'Images' },
  { id: 'text', label: 'Text assets' },
  { id: 'posts', label: 'Posts' },
  { id: 'comments', label: 'Comments' },
  { id: 'articles', label: 'Articles' },
  { id: 'manifests', label: 'Manifests / roots' },
  { id: 'otherAssets', label: 'Other assets' },
  { id: 'receipts', label: 'Receipts' },
]);

export default function LibraryPage({ app }) {
  const [catalog, setCatalog] = useState(() => safeReadCatalog());
  const [receipts, setReceipts] = useState(() => safeReadReceipts());
  const [activeTab, setActiveTab] = useState('all');
  const [filter, setFilter] = useState('');
  const [copyState, setCopyState] = useState('');

  useEffect(() => subscribeLocalCatalog(setCatalog), []);
  useEffect(() => subscribeRecentReceipts(setReceipts), []);

  const library = useMemo(
    () =>
      buildLibrary({
        catalog,
        receipts,
        filter,
      }),
    [catalog, receipts, filter],
  );

  const activeItems = library.tabs[activeTab] || library.tabs.all;
  const textReady = library.counts.post > 0 && library.counts.comment > 0 && library.counts.article > 0;

  function refreshLibrary() {
    dispatchLocalCatalogChanged();
    dispatchReceiptsChanged();
    setCatalog(safeReadCatalog());
    setReceipts(safeReadReceipts());
  }

  function clearDisplayCaches() {
    clearLocalCatalogCache();
    clearRecentReceiptCache();
    refreshLibrary();
  }

  async function copyLibrarySummary() {
    const lines = [
      'CrabLink local library display cache',
      '',
      `Profiles: ${library.counts.profiles}`,
      `Sites: ${library.counts.sites}`,
      `Images: ${library.counts.images}`,
      `Text assets: ${library.counts.text}`,
      `Posts: ${library.counts.post}`,
      `Comments: ${library.counts.comment}`,
      `Articles: ${library.counts.article}`,
      `Manifests/roots: ${library.counts.manifests}`,
      `Other assets: ${library.counts.otherAssets}`,
      `Receipts: ${library.counts.receipts}`,
      `Generated: ${catalog?.generatedAt || catalog?.generated_at || 'not returned'}`,
      '',
      'Text primitive pre-QuickChain proof:',
      textReady
        ? 'post/comment/article all visible in local proof memory'
        : 'post/comment/article proof is still incomplete in local proof memory',
      '',
      'Routes / proofs:',
      ...library.tabs.all
        .map((item) => item.crabUrl || item.route || item.receiptHash || item.txid || '')
        .filter(Boolean)
        .map((value) => `- ${value}`),
      '',
      'Truth boundary:',
      'Local display cache only. Not backend ownership, not wallet/ledger truth, not authorization.',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyState('Copied library summary');
    } catch (_error) {
      setCopyState('Clipboard unavailable');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  return (
    <section className="cl-page library-page">
      <PageHeader
        eyebrow="CrabLink Library"
        title="My CrabLink Library"
        copy="Profiles, sites, assets, and receipts remembered by this browser from backend-confirmed responses and local display caches."
        meta={
          <>
            <Badge tone="success">display cache</Badge>
            <Badge tone="neutral">gateway-derived entries</Badge>
            <Badge tone={textReady ? 'success' : 'warning'}>
              {textReady ? 'text proof ready' : 'text proof open'}
            </Badge>
          </>
        }
        actions={
          <div className="cl-library-header-actions">
            <Button variant="secondary" onClick={refreshLibrary}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://text')}>
              Text proof
            </Button>
            <Button variant="ghost" onClick={copyLibrarySummary}>
              Copy summary
            </Button>
          </div>
        }
      />

      {copyState && <p className="cl-library-copy-state">{copyState}</p>}

      <section className="cl-library-stat-grid" aria-label="Library counters">
        <LibraryStat label="Profiles" value={library.counts.profiles} detail="backend-confirmed public profile display memory" />
        <LibraryStat label="Sites" value={library.counts.sites} detail="named crab:// sites seen by this browser" />
        <LibraryStat label="Images" value={library.counts.images} detail="typed .image assets seen or published" />
        <LibraryStat label="Text assets" value={library.counts.text} detail={`${library.counts.post} post · ${library.counts.comment} comment · ${library.counts.article} article`} />
        <LibraryStat label="Receipts" value={library.counts.receipts} detail="recent backend-returned receipt display memory" />
      </section>

      <TruthBoundary
        tone={textReady ? 'success' : 'warning'}
        title={textReady ? 'Library sees post/comment/article proof' : 'Library text proof still open'}
        copy={
          textReady
            ? 'The library can see at least one post, comment, and article in local display memory. This supports the NEXT_LEVEL proof path but does not unlock QuickChain by itself.'
            : 'Open or import fresh typed text URLs so the library can show post/comment/article local proof. Backend publication, receipts, and ledger replay remain separate truth.'
        }
      />

      <section className="cl-library-proof-grid" aria-label="Library proof groups">
        <ProofGroup
          title="Profiles"
          count={library.counts.profiles}
          route="crab://profile"
          tab="profiles"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          app={app}
        />
        <ProofGroup
          title="Sites"
          count={library.counts.sites}
          route="crab://site"
          tab="sites"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          app={app}
        />
        <ProofGroup
          title="Images"
          count={library.counts.images}
          route="crab://image"
          tab="images"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          app={app}
        />
        <ProofGroup
          title="Posts"
          count={library.counts.post}
          route="crab://post"
          tab="posts"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          app={app}
        />
        <ProofGroup
          title="Comments"
          count={library.counts.comment}
          route="crab://comment"
          tab="comments"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          app={app}
        />
        <ProofGroup
          title="Articles"
          count={library.counts.article}
          route="crab://article"
          tab="articles"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          app={app}
        />
      </section>

      <Card className="cl-library-toolbar" eyebrow="Browse local memory" title="Filter and group">
        <div className="cl-library-toolbar-grid">
          <label className="cl-library-search">
            <span>Search local catalog</span>
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search crab URL, title, kind, CID, txid, source..."
            />
          </label>

          <div className="cl-library-toolbar-actions">
            <Button variant="secondary" onClick={() => setFilter('')}>
              Clear filter
            </Button>
            <Button variant="ghost" onClick={clearDisplayCaches}>
              Clear display caches
            </Button>
          </div>
        </div>

        <div className="cl-library-tabs" role="tablist" aria-label="Library tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === activeTab ? 'is-active' : ''}
              aria-pressed={tab.id === activeTab}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <strong>{library.countsByTab[tab.id] || 0}</strong>
            </button>
          ))}
        </div>
      </Card>

      {activeTab === 'all' ? (
        <LibraryOverview library={library} app={app} filter={filter} />
      ) : activeTab === 'text' ? (
        <TextAssetSection library={library} app={app} filter={filter} />
      ) : (
        <section className="cl-library-list" aria-label={`${activeTab} entries`}>
          {activeItems.length === 0 ? (
            <EmptyLibraryState activeTab={activeTab} filter={filter} app={app} />
          ) : (
            activeItems.map((item, index) => (
              <LibraryCard
                key={`${item.type}:${item.kind}:${item.crabUrl || item.route || item.txid || index}`}
                item={item}
                app={app}
              />
            ))
          )}
        </section>
      )}

      <details className="cl-library-dev-json">
        <summary>Developer library JSON</summary>
        <JsonPreview
          label="Local library"
          data={{
            schema: 'crablink.library.v1',
            generated_at: new Date().toISOString(),
            active_tab: activeTab,
            filter,
            counts: library.counts,
            counts_by_tab: library.countsByTab,
            text_ready: textReady,
            catalog,
            receipts,
            normalized: {
              profiles: library.profiles,
              sites: library.sites,
              images: library.images,
              text: library.textAssets,
              posts: library.posts,
              comments: library.comments,
              articles: library.articles,
              manifests: library.manifests,
              other_assets: library.otherAssets,
              receipts: library.receipts,
            },
            truth_boundary:
              'Browser-local display cache only. Not a backend public catalog, ownership index, wallet/ledger truth, or authorization source.',
          }}
        />
      </details>
    </section>
  );
}

function LibraryStat({ label, value, detail }) {
  return (
    <article className="cl-library-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ProofGroup({ title, count, route, tab, activeTab, setActiveTab, app }) {
  const isActive = activeTab === tab;

  return (
    <article className={`cl-library-proof-group ${isActive ? 'is-active' : ''}`}>
      <header>
        <div>
          <span>{title}</span>
          <strong>{count}</strong>
        </div>
        <Badge tone={count > 0 ? 'success' : 'warning'}>{count > 0 ? 'visible' : 'open'}</Badge>
      </header>

      <div className="cl-library-proof-actions">
        <Button variant="secondary" onClick={() => setActiveTab(tab)}>
          Show
        </Button>
        <Button variant="ghost" onClick={() => app?.navigate?.(route)}>
          Open
        </Button>
      </div>
    </article>
  );
}

function LibraryOverview({ library, app, filter }) {
  const sections = [
    {
      id: 'profiles',
      title: 'Profiles',
      items: library.tabs.profiles,
      copy: 'Backend-confirmed public profile display memory.',
    },
    {
      id: 'sites',
      title: 'Sites',
      items: library.tabs.sites,
      copy: 'Named crab:// site pages resolved or visited in this browser.',
    },
    {
      id: 'images',
      title: 'Images',
      items: library.tabs.images,
      copy: 'Typed .image assets opened, published, or remembered locally.',
    },
    {
      id: 'text',
      title: 'Text assets',
      items: library.tabs.text,
      copy: 'Typed .post, .comment, and .article proof entries.',
    },
    {
      id: 'receipts',
      title: 'Receipts',
      items: library.tabs.receipts,
      copy: 'Recent backend-returned wallet/payment receipt display memory.',
    },
  ];

  return (
    <section className="cl-library-section-stack" aria-label="Library overview">
      {sections.map((section) => (
        <LibrarySection
          key={section.id}
          title={section.title}
          copy={section.copy}
          items={section.items}
          app={app}
          emptyCopy={filter ? 'No entries in this section match the filter.' : `No ${section.title.toLowerCase()} entries yet.`}
        />
      ))}
    </section>
  );
}

function TextAssetSection({ library, app, filter }) {
  return (
    <section className="cl-library-section-stack" aria-label="Text asset groups">
      <Card
        eyebrow="Text primitive proof"
        title="Posts, Comments, Articles"
        actions={
          <div className="cl-library-card-actions">
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://text')}>
              Open text proof
            </Button>
            <Button variant="ghost" onClick={() => app?.navigate?.('crab://quickchain')}>
              QuickChain gate
            </Button>
          </div>
        }
      >
        <p className="cl-library-section-copy">
          Text assets are b3-backed published primitives. This browser only displays local proof memory from
          opened/imported typed URLs; backend publication and receipts remain authoritative.
        </p>

        <div className="cl-library-text-readiness">
          <ReadinessPill label="Post" count={library.counts.post} />
          <ReadinessPill label="Comment" count={library.counts.comment} />
          <ReadinessPill label="Article" count={library.counts.article} />
        </div>
      </Card>

      <LibrarySection
        title="Posts"
        copy="Short/social text assets attached to site context."
        items={library.tabs.posts}
        app={app}
        emptyCopy={filter ? 'No posts match this filter.' : 'No local post entries yet. Open or import a fresh .post URL.'}
      />

      <LibrarySection
        title="Comments"
        copy="Comment assets attached to a site and parent target."
        items={library.tabs.comments}
        app={app}
        emptyCopy={filter ? 'No comments match this filter.' : 'No local comment entries yet. Open or import a fresh .comment URL.'}
      />

      <LibrarySection
        title="Articles"
        copy="Long-form text assets attached to site context."
        items={library.tabs.articles}
        app={app}
        emptyCopy={filter ? 'No articles match this filter.' : 'No local article entries yet. Open or import a fresh .article URL.'}
      />
    </section>
  );
}

function LibrarySection({ title, copy, items, app, emptyCopy }) {
  return (
    <section className="cl-library-section" aria-label={title}>
      <header className="cl-library-section-head">
        <div>
          <p className="cl-eyebrow">{title}</p>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <Badge tone={items.length > 0 ? 'success' : 'warning'}>{items.length} entries</Badge>
      </header>

      {items.length === 0 ? (
        <Card className="cl-library-empty" eyebrow="No entries" title={`No ${title.toLowerCase()}`}>
          <p>{emptyCopy}</p>
        </Card>
      ) : (
        <div className="cl-library-list">
          {items.map((item, index) => (
            <LibraryCard
              key={`${item.type}:${item.kind}:${item.crabUrl || item.route || item.txid || index}`}
              item={item}
              app={app}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReadinessPill({ label, count }) {
  return (
    <div className={`cl-library-readiness-pill ${count > 0 ? 'is-ready' : 'is-open'}`}>
      <span>{label}</span>
      <strong>{count}</strong>
      <em>{count > 0 ? 'visible' : 'open'}</em>
    </div>
  );
}

function LibraryCard({ item, app }) {
  const route = item.crabUrl || item.route || '';
  const proof = item.receiptHash || item.txid || item.cid || item.manifestCid || item.rootDocumentCid || '';
  const canOpen = Boolean(route && app?.navigate);
  const kind = item.kind || item.type || 'entry';

  function openItem() {
    if (canOpen) {
      app.navigate(route);
    }
  }

  return (
    <article className={`cl-library-card is-${kind}`}>
      <header>
        <div>
          <span>{labelForType(item.type, item.kind)}</span>
          <strong>{item.title || item.name || route || proof || 'Local entry'}</strong>
        </div>
        <Badge tone={badgeToneForKind(kind)}>
          {item.status || item.action || item.source || 'local display'}
        </Badge>
      </header>

      <div className="cl-library-card-main">
        <LibraryFact label="Route" value={route || 'not returned'} monospace />
        <LibraryFact label="Detail" value={item.detail || item.action || item.source || 'local display cache'} />
        <LibraryFact label="CID" value={item.cid || item.manifestCid || item.rootDocumentCid || 'not returned'} monospace />
        <LibraryFact label="Proof" value={item.receiptHash || item.txid || 'not returned'} monospace />
        <LibraryFact label="Source" value={item.source || 'local library'} />
        <LibraryFact label="Created / seen" value={formatTimestamp(item.createdAt || item.created_at || item.storedAt)} />
      </div>

      <footer className="cl-library-card-actions">
        <Button variant="primary" onClick={openItem} disabled={!canOpen}>
          Open
        </Button>
        <CopyButton text={route} label="Copy route" disabled={!route} />
        <CopyButton text={proof} label="Copy proof" disabled={!proof} />
      </footer>
    </article>
  );
}

function LibraryFact({ label, value, monospace = false }) {
  const clean = String(value || '').trim();

  return (
    <div className="cl-library-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={clean}>
        {clean || 'n/a'}
      </strong>
    </div>
  );
}

function EmptyLibraryState({ activeTab, filter, app }) {
  const copy = filter ? 'No local display entries match this filter.' : emptyCopyForTab(activeTab);

  return (
    <Card className="cl-library-empty" eyebrow="No entries" title={`No ${tabLabel(activeTab)} entries`}>
      <p>{copy}</p>

      {activeTab === 'text' && (
        <div className="cl-library-card-actions">
          <Button variant="secondary" onClick={() => app?.navigate?.('crab://text')}>
            Open text proof
          </Button>
          <Button variant="ghost" onClick={() => app?.navigate?.('crab://post')}>
            Post workspace
          </Button>
          <Button variant="ghost" onClick={() => app?.navigate?.('crab://comment')}>
            Comment workspace
          </Button>
          <Button variant="ghost" onClick={() => app?.navigate?.('crab://article')}>
            Article workspace
          </Button>
        </div>
      )}

      {activeTab === 'images' && (
        <div className="cl-library-card-actions">
          <Button variant="secondary" onClick={() => app?.navigate?.('crab://image')}>
            Open image
          </Button>
        </div>
      )}
    </Card>
  );
}

function buildLibrary({ catalog = EMPTY_CATALOG, receipts = [], filter = '' }) {
  const profileItems = normalizeCatalogItems(catalog.profiles, 'profile');
  const siteItems = normalizeCatalogItems(catalog.sites, 'site');

  const assetItems = dedupeItems([
    ...normalizeCatalogItems(catalog.assets, 'asset'),
    ...normalizeCatalogItems(catalog.all, 'asset').filter((item) => item.type === 'asset' || isTypedAssetKind(item.kind)),
  ]);

  const receiptItems = normalizeReceipts(receipts);
  const allItems = dedupeItems([...profileItems, ...siteItems, ...assetItems, ...receiptItems]);
  const filteredAll = applyFilter(allItems, filter);

  const profiles = filteredAll.filter((item) => item.type === 'profile');
  const sites = filteredAll.filter((item) => item.type === 'site');
  const images = filteredAll.filter((item) => item.type === 'asset' && item.kind === IMAGE_LIKE_KIND);
  const textAssets = filteredAll.filter((item) => item.type === 'asset' && TEXT_KIND_SET.has(item.kind));
  const posts = textAssets.filter((item) => item.kind === 'post');
  const comments = textAssets.filter((item) => item.kind === 'comment');
  const articles = textAssets.filter((item) => item.kind === 'article');
  const manifests = filteredAll.filter((item) => item.type === 'asset' && MANIFEST_KINDS.has(item.kind));
  const otherAssets = filteredAll.filter(
    (item) =>
      item.type === 'asset' &&
      item.kind !== IMAGE_LIKE_KIND &&
      !TEXT_KIND_SET.has(item.kind) &&
      !MANIFEST_KINDS.has(item.kind),
  );
  const normalizedReceipts = filteredAll.filter((item) => item.type === 'receipt');

  const tabs = {
    all: filteredAll,
    profiles,
    sites,
    images,
    text: textAssets,
    posts,
    comments,
    articles,
    manifests,
    otherAssets,
    receipts: normalizedReceipts,
  };

  const counts = {
    all: filteredAll.length,
    profiles: profiles.length,
    sites: sites.length,
    images: images.length,
    text: textAssets.length,
    post: posts.length,
    comment: comments.length,
    article: articles.length,
    manifests: manifests.length,
    otherAssets: otherAssets.length,
    receipts: normalizedReceipts.length,
  };

  return {
    tabs,
    counts,
    countsByTab: {
      all: counts.all,
      profiles: counts.profiles,
      sites: counts.sites,
      images: counts.images,
      text: counts.text,
      posts: counts.post,
      comments: counts.comment,
      articles: counts.article,
      manifests: counts.manifests,
      otherAssets: counts.otherAssets,
      receipts: counts.receipts,
    },
    profiles,
    sites,
    images,
    textAssets,
    posts,
    comments,
    articles,
    manifests,
    otherAssets,
    receipts: normalizedReceipts,
  };
}

function normalizeCatalogItems(items, fallbackType) {
  return safeArray(items)
    .map((item) => normalizeCatalogItem(item, fallbackType))
    .filter(Boolean)
    .sort(sortNewestFirst);
}

function normalizeCatalogItem(item = {}, fallbackType = 'asset') {
  const crabUrl = stringValue(item.crabUrl, item.crab_url, item.url, item.route);
  const kind = normalizeKind(item.kind, item, fallbackType);
  const type = normalizeType(item.type, kind, fallbackType, crabUrl);

  if (!crabUrl && !item.cid && !item.manifestCid && !item.rootDocumentCid && !item.title && !item.name) {
    return null;
  }

  return {
    schema: item.schema || 'crablink.local-catalog-entry.v1',
    type,
    kind,
    title: item.title || item.name || titleFromKind(kind, type),
    crabUrl,
    route: item.route || crabUrl,
    cid: cleanCid(item.cid || item.contentId || item.content_id || item.detail),
    manifestCid: cleanCid(item.manifestCid || item.manifest_cid),
    rootDocumentCid: cleanCid(item.rootDocumentCid || item.root_document_cid),
    receiptHash: item.receiptHash || item.receipt_hash || '',
    txid: item.txid || '',
    status: item.status || 'local display cache',
    detail: item.detail || detailFromItem(item, kind, type),
    source: item.source || 'local_catalog',
    createdAt: item.createdAt || item.created_at || item.updatedAt || item.updated_at || item.storedAt || '',
    raw: item.raw || item,
  };
}

function normalizeReceipts(receipts = []) {
  return safeArray(receipts)
    .map((item) => {
      const action = stringValue(item.action, item.kind, item.receipt_kind, 'receipt');
      const route = stringValue(item.crabUrl, item.crab_url, item.route, item.site, item.target);
      const txid = stringValue(item.txid, item.transaction_id, item.transactionId);
      const receiptHash = stringValue(item.receiptHash, item.receipt_hash, item.hash);
      const amount = stringValue(item.amount, item.amount_minor, item.amountMinor);
      const payer = stringValue(item.payer, item.from, item.payer_account, item.payerAccount);
      const recipient = stringValue(item.recipient, item.to, item.recipient_account, item.recipientAccount);

      return {
        schema: item.schema || 'crablink.local-receipt-entry.v1',
        type: 'receipt',
        kind: normalizeKind(action, item, 'receipt') || 'receipt',
        title: item.title || labelForReceipt(action, route),
        crabUrl: route,
        route,
        cid: cleanCid(item.cid || item.content_id || item.contentId),
        manifestCid: cleanCid(item.manifestCid || item.manifest_cid),
        rootDocumentCid: cleanCid(item.rootDocumentCid || item.root_document_cid),
        receiptHash,
        txid,
        action,
        status: item.status || 'backend receipt display cache',
        detail: [amount ? `${amount} ROC` : '', payer && recipient ? `${payer} → ${recipient}` : '']
          .filter(Boolean)
          .join(' · '),
        source: item.source || 'recent_receipts',
        createdAt: item.createdAt || item.created_at || item.storedAt || item.paidAt || '',
        raw: item.raw || item,
      };
    })
    .filter((item) => item.txid || item.receiptHash || item.crabUrl || item.title)
    .sort(sortNewestFirst);
}

function normalizeType(type, kind, fallbackType, crabUrl) {
  const clean = String(type || '').trim().toLowerCase();

  if (clean === 'profile' || clean === 'site' || clean === 'asset' || clean === 'receipt') {
    return clean;
  }

  if (String(crabUrl || '').startsWith('crab://@')) {
    return 'profile';
  }

  if (kind === 'site') {
    return 'site';
  }

  if (fallbackType === 'profile' || fallbackType === 'site' || fallbackType === 'receipt') {
    return fallbackType;
  }

  return 'asset';
}

function normalizeKind(kind, item = {}, fallbackType = 'asset') {
  const clean = String(kind || '').trim().toLowerCase();
  const crabUrl = String(item.crabUrl || item.crab_url || item.url || item.route || '').trim().toLowerCase();

  if (crabUrl.startsWith('crab://@')) {
    return 'profile';
  }

  const typedMatch = crabUrl.match(/^crab:\/\/[0-9a-f]{64}\.([a-z][a-z0-9_-]{1,31})$/i);
  if (typedMatch?.[1]) {
    return typedMatch[1].toLowerCase();
  }

  if (clean) {
    if (clean === 'root_document' || clean === 'root-document' || clean === 'rootdocument') {
      return 'root';
    }

    return clean;
  }

  if (fallbackType === 'profile' || fallbackType === 'site' || fallbackType === 'receipt') {
    return fallbackType;
  }

  return 'asset';
}

function isTypedAssetKind(kind) {
  return kind === IMAGE_LIKE_KIND || TEXT_KIND_SET.has(kind) || MANIFEST_KINDS.has(kind) || kind === 'asset';
}

function applyFilter(items, filter) {
  const needle = String(filter || '').trim().toLowerCase();

  if (!needle) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [
      item.type,
      item.kind,
      item.title,
      item.name,
      item.crabUrl,
      item.route,
      item.cid,
      item.manifestCid,
      item.rootDocumentCid,
      item.receiptHash,
      item.txid,
      item.status,
      item.detail,
      item.source,
      item.action,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
}

function dedupeItems(items) {
  const out = [];
  const seen = new Set();

  for (const item of safeArray(items)) {
    if (!item) {
      continue;
    }

    const key = [
      item.type,
      item.kind,
      item.crabUrl || item.route,
      item.cid,
      item.manifestCid,
      item.rootDocumentCid,
      item.receiptHash,
      item.txid,
      item.title,
    ]
      .filter(Boolean)
      .join('|');

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(item);
  }

  return out.sort(sortNewestFirst);
}

function sortNewestFirst(a, b) {
  return timestampForSort(b) - timestampForSort(a);
}

function titleFromKind(kind, type) {
  if (type === 'profile') {
    return 'Profile';
  }

  if (type === 'site') {
    return 'Site';
  }

  if (type === 'receipt') {
    return 'Receipt';
  }

  return `${labelFromKind(kind || 'asset')} asset`;
}

function detailFromItem(item, kind, type) {
  if (type === 'profile') {
    return item.detail || item.source || 'public profile display cache';
  }

  if (type === 'site') {
    return item.detail || item.source || 'site display cache';
  }

  if (TEXT_KIND_SET.has(kind)) {
    return item.detail || 'gateway-published text primitive';
  }

  if (kind === IMAGE_LIKE_KIND) {
    return item.detail || 'image asset';
  }

  return item.detail || item.source || 'local display cache';
}

function labelForType(type, kind) {
  if (type === 'profile') {
    return 'Profile';
  }

  if (type === 'site') {
    return 'Site';
  }

  if (type === 'receipt') {
    return 'Receipt';
  }

  if (kind === IMAGE_LIKE_KIND) {
    return 'Image';
  }

  if (TEXT_KIND_SET.has(kind)) {
    return labelFromKind(kind);
  }

  if (MANIFEST_KINDS.has(kind)) {
    return labelFromKind(kind);
  }

  return labelFromKind(kind || type || 'entry');
}

function labelForReceipt(action, route) {
  const clean = String(action || '').replace(/[_-]+/g, ' ').trim();

  if (clean) {
    return `${labelFromKind(clean)}${route ? `: ${route}` : ''}`;
  }

  return route ? `Receipt: ${route}` : 'Receipt';
}

function badgeToneForKind(kind) {
  if (kind === 'receipt') {
    return 'success';
  }

  if (kind === 'profile' || kind === 'site') {
    return 'info';
  }

  if (kind === IMAGE_LIKE_KIND || TEXT_KIND_SET.has(kind)) {
    return 'success';
  }

  if (MANIFEST_KINDS.has(kind)) {
    return 'neutral';
  }

  return 'warning';
}

function emptyCopyForTab(tab) {
  switch (tab) {
    case 'profiles':
      return 'No public profiles are remembered locally yet.';
    case 'sites':
      return 'No named sites are remembered locally yet.';
    case 'images':
      return 'No typed .image assets are remembered locally yet.';
    case 'text':
      return 'No .post, .comment, or .article entries are remembered locally yet.';
    case 'posts':
      return 'No .post entries are remembered locally yet.';
    case 'comments':
      return 'No .comment entries are remembered locally yet.';
    case 'articles':
      return 'No .article entries are remembered locally yet.';
    case 'manifests':
      return 'No manifest or root-document entries are remembered locally yet.';
    case 'otherAssets':
      return 'No other asset kinds are remembered locally yet.';
    case 'receipts':
      return 'No recent receipts are remembered locally yet.';
    case 'all':
    default:
      return 'No local display entries yet.';
  }
}

function tabLabel(tab) {
  const found = TABS.find((item) => item.id === tab);
  return found?.label || tab || 'library';
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

function stringValue(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();

    if (clean) {
      return clean;
    }
  }

  return '';
}

function cleanCid(value) {
  const clean = String(value || '').trim().toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(clean)) {
    return clean;
  }

  if (/^[0-9a-f]{64}$/.test(clean)) {
    return `b3:${clean}`;
  }

  const match = clean.match(/b3:[0-9a-f]{64}/);
  return match?.[0] || '';
}

function timestampForSort(value) {
  const raw = String(value?.createdAt || value?.created_at || value?.storedAt || value || '').trim();

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
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}