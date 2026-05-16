/**
 * RO:WHAT — Local My Sites / My Assets / Profiles panel for the CrabLink passport drawer.
 * RO:WHY — Gives users a visible local memory of recently seen/published CrabLink things.
 * RO:INTERACTS — PassportDrawer, localCatalog.js, CopyButton, JsonPreview, navigation.
 * RO:INVARIANTS — display-only; no backend catalogue claim; no ownership proof; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — receives catalog from caller.
 * RO:SECURITY — renders public URLs/metadata only; no secrets, tokens, private alts, or spend authority.
 * RO:TEST — open drawer after paid site visit/profile claim/image visits and confirm lists populate.
 */

import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import {
  clearLocalCatalogCache,
  dispatchLocalCatalogChanged,
} from '../../shared/catalog/localCatalog.js';

export default function LocalCatalogPanel({
  catalog,
  navigation = null,
  onRefresh = null,
}) {
  const safeCatalog = catalog || {
    profiles: [],
    sites: [],
    assets: [],
    all: [],
  };

  const profiles = Array.isArray(safeCatalog.profiles) ? safeCatalog.profiles : [];
  const sites = Array.isArray(safeCatalog.sites) ? safeCatalog.sites : [];
  const assets = Array.isArray(safeCatalog.assets) ? safeCatalog.assets : [];
  const total = profiles.length + sites.length + assets.length;

  function refreshCatalog() {
    dispatchLocalCatalogChanged();
    onRefresh?.();
  }

  function clearCatalog() {
    clearLocalCatalogCache();
    onRefresh?.();
  }

  return (
    <section className="cl-passport-truth" aria-label="Local CrabLink catalog">
      <header className="cl-drawer-panel-head">
        <div>
          <strong>My local CrabLink catalog</strong>
          <p>
            Local browser memory from profile reads, receipts, resolved sites, and typed crab:// asset visits.
            It is not a backend catalogue, ownership index, or publication proof.
          </p>
        </div>
        <span className="cl-local-count-pill">{total}</span>
      </header>

      <div className="cl-passport-actions">
        <button type="button" onClick={refreshCatalog}>
          Refresh catalog
        </button>
        <button type="button" onClick={clearCatalog}>
          Clear pinned entries
        </button>
      </div>

      {total === 0 && (
        <div className="cl-passport-empty-state">
          <strong>No local catalog entries yet</strong>
          <span>
            Visit a site, claim/read a public profile, publish an image, or open typed crab:// assets to populate
            local display memory.
          </span>
        </div>
      )}

      {profiles.length > 0 && (
        <CatalogSection
          title="Profiles"
          emptyLabel="No local profile entries"
          items={profiles}
          navigation={navigation}
        />
      )}

      {sites.length > 0 && (
        <CatalogSection
          title="My Sites / seen sites"
          emptyLabel="No local site entries"
          items={sites}
          navigation={navigation}
        />
      )}

      {assets.length > 0 && (
        <CatalogSection
          title="My Assets / seen assets"
          emptyLabel="No local asset entries"
          items={assets}
          navigation={navigation}
        />
      )}

      {total > 0 && (
        <JsonPreview
          label="Local catalog proof"
          data={{
            generated_at: safeCatalog.generatedAt || '',
            profiles,
            sites,
            assets,
            truth_boundary:
              'Local catalog is browser memory only. Backend public catalog/index/ownership truth must come later from gateway-backed routes.',
          }}
        />
      )}
    </section>
  );
}

function CatalogSection({ title, emptyLabel, items = [], navigation = null }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className="cl-local-catalog-section" aria-label={title}>
      <header className="cl-local-catalog-section-head">
        <strong>{title}</strong>
        <span>{safeItems.length}</span>
      </header>

      {!safeItems.length && (
        <div className="cl-passport-empty-state">
          <span>{emptyLabel}</span>
        </div>
      )}

      {safeItems.length > 0 && (
        <div className="cl-receipt-list">
          {safeItems.slice(0, 10).map((item, index) => (
            <CatalogCard
              key={`${item.kind || 'entry'}:${item.crabUrl || item.cid || index}:${item.source || index}`}
              item={item}
              navigation={navigation}
            />
          ))}
        </div>
      )}

      {safeItems.length > 10 && (
        <p className="cl-local-catalog-overflow">
          Showing 10 of {safeItems.length} local entries. The full local cache is available in developer JSON below.
        </p>
      )}
    </section>
  );
}

function CatalogCard({ item, navigation }) {
  const crabUrl = String(item.crabUrl || item.crab_url || '').trim();
  const cid = String(item.cid || item.manifestCid || item.manifest_cid || item.rootDocumentCid || item.root_document_cid || '').trim();
  const title = String(item.title || item.name || crabUrl || cid || 'Local catalog entry').trim();
  const canNavigate = typeof navigation?.navigate === 'function' && crabUrl.startsWith('crab://');

  function openItem() {
    if (canNavigate) {
      navigation.navigate(crabUrl);
    }
  }

  return (
    <article className="cl-receipt-card cl-local-catalog-card">
      <header>
        <div>
          <span>{item.kind || 'entry'}</span>
          <strong title={title}>{title}</strong>
        </div>
        <CopyButton text={crabUrl || cid || ''} label="Copy" disabled={!crabUrl && !cid} />
      </header>

      <dl className="cl-proof-grid">
        <CatalogFact label="URL" value={crabUrl || 'not returned'} monospace />
        <CatalogFact label="Status" value={item.status || 'local display cache'} />
        <CatalogFact label="Detail" value={item.detail || cid || 'not returned'} monospace={Boolean(cid && !item.detail)} />
        <CatalogFact label="CID" value={cid || 'not returned'} monospace />
        <CatalogFact label="Source" value={item.source || 'local_catalog'} />
        <CatalogFact label="Created/seen" value={formatTimestamp(item.createdAt || item.created_at)} />
      </dl>

      <div className="cl-passport-actions">
        <button type="button" onClick={openItem} disabled={!canNavigate}>
          Open
        </button>
        <CopyButton text={crabUrl || ''} label="Copy URL" disabled={!crabUrl} />
      </div>
    </article>
  );
}

function CatalogFact({ label, value, monospace = false }) {
  const cleanValue = String(value || '').trim();

  return (
    <div className="cl-proof-row">
      <dt>{label}</dt>
      <dd
        className={`cl-proof-value ${monospace ? 'is-monospace' : ''}`}
        title={cleanValue}
      >
        {cleanValue || 'n/a'}
      </dd>
    </div>
  );
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