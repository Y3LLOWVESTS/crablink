/**
 * RO:WHAT — CrabLink React home dashboard for route smoke testing, local catalog proof, and migration status.
 * RO:WHY — App Integration; Concerns: DX/SEC; gives the React lane a safe control room after protected-route proofs.
 * RO:INTERACTS — HomeQuickActions, localCatalog, recentReceipts, shared PageHeader/Card/TruthBoundary components.
 * RO:INVARIANTS — navigation/display only; no fake backend truth; no paid action; no wallet mutation; no CID creation.
 * RO:METRICS — none.
 * RO:CONFIG — route context from App and extension settings.
 * RO:SECURITY — reads public local display caches only; no private keys, tokens, alt mappings, or spend authority.
 * RO:TEST — manual crab://home smoke after profile/site/image/receipt activity in light/dark mode.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import {
  readLocalCatalog,
  subscribeLocalCatalog,
} from '../../shared/catalog/localCatalog.js';
import {
  readRecentReceipts,
  subscribeRecentReceipts,
} from '../../shared/receipts/recentReceipts.js';
import HomeQuickActions from './HomeQuickActions.jsx';
import './home.css';

const FALLBACK_PROOF_SITE = 'crab://ron7';
const FALLBACK_PROOF_REACT_IMAGE =
  'crab://ad1e9bef7834d7a37fde676abdf095c33c59de8e3d667fe99b5f091e6444e8d1.image';
const PROOF_PROFILE = 'crab://profile';

const EMPTY_CATALOG = Object.freeze({
  schema: 'crablink.local-catalog.v1',
  generatedAt: '',
  profiles: [],
  sites: [],
  assets: [],
  all: [],
});

export default function HomePage({ app }) {
  const settings = app?.settings || {};
  const gatewayUrl = settings.gatewayUrl || settings.baseUrl || 'http://127.0.0.1:8090';
  const passport = settings.passportSubject || 'not configured';
  const wallet = settings.walletAccount || 'not configured';

  const [catalog, setCatalog] = useState(() => safeReadCatalog());
  const [receipts, setReceipts] = useState(() => safeReadReceipts());

  useEffect(() => subscribeLocalCatalog(setCatalog), []);
  useEffect(() => subscribeRecentReceipts(setReceipts), []);

  const proof = useMemo(
    () => buildHomeProof({
      catalog,
      receipts,
    }),
    [catalog, receipts],
  );

  const proofSite = proof.site?.crabUrl || FALLBACK_PROOF_SITE;
  const proofImage = proof.image?.crabUrl || FALLBACK_PROOF_REACT_IMAGE;
  const proofProfile = proof.profile?.crabUrl || PROOF_PROFILE;

  return (
    <section className="cl-page home-page">
      <PageHeader
        eyebrow="CrabLink React lane"
        title="Route Smoke Dashboard"
        copy="Use this page as the control room for testing built-in crab:// routes, reviewing local proof memory, and keeping backend truth separate from local display caches."
        meta={
          <>
            <Badge tone="success">React-primary</Badge>
            <Badge tone="neutral">gateway-only</Badge>
            <Badge tone="info">local proof cache</Badge>
          </>
        }
      />

      <section className="cl-home-hero-grid" aria-label="React lane status">
        <StatusCard
          eyebrow="Local catalog"
          title="Profiles"
          value={String(proof.counts.profiles)}
          tone={proof.counts.profiles > 0 ? 'success' : 'info'}
          copy="Backend-confirmed or local display profile entries discovered from the public profile cache and safe local catalog scans."
        />

        <StatusCard
          eyebrow="Local catalog"
          title="Sites"
          value={String(proof.counts.sites)}
          tone={proof.counts.sites > 0 ? 'success' : 'info'}
          copy="Named site entries discovered from site visits, site creation, receipts, or local display memory."
        />

        <StatusCard
          eyebrow="Local catalog"
          title="Assets"
          value={String(proof.counts.assets)}
          tone={proof.counts.assets > 0 ? 'success' : 'info'}
          copy="Typed crab assets discovered from image creation, asset routes, receipts, and local display memory."
        />
      </section>

      <TruthBoundary
        tone="info"
        title="Local proof memory, not backend authority"
        copy="The home dashboard reads CrabLink local display caches. It can help you reopen recently proven profiles, sites, assets, and receipts, but it does not prove ownership, authorize spending, mutate wallets, or replace gateway/ledger truth."
      />

      <section className="cl-home-proof-grid" aria-label="Current local proof anchors">
        <ProofCard
          eyebrow="Profile proof"
          title={proof.profile?.title || 'Profile route'}
          route={proofProfile}
          status={proof.profile?.status || 'route available'}
          detail={proof.profile?.detail || 'Profile workspace / backend-confirmed profile cache when available'}
          tone={proof.profile ? 'success' : 'info'}
          app={app}
        />

        <ProofCard
          eyebrow="Site proof"
          title={proof.site?.title || 'Named site proof'}
          route={proofSite}
          status={proof.site?.status || 'fallback proof route'}
          detail={proof.site?.detail || 'Open a paid or recently created site to refresh this local proof anchor'}
          tone={proof.site ? 'success' : 'warning'}
          app={app}
        />

        <ProofCard
          eyebrow="Image asset proof"
          title={proof.image?.title || 'Typed image asset'}
          route={proofImage}
          status={proof.image?.status || 'fallback proof route'}
          detail={proof.image?.detail || 'Create or open an image asset to refresh this local proof anchor'}
          tone={proof.image ? 'success' : 'warning'}
          app={app}
        />

        <ProofCard
          eyebrow="Latest receipt"
          title={proof.receipt?.title || 'No receipt cached yet'}
          route={proof.receipt?.crabUrl || ''}
          status={proof.receipt?.receiptHash ? 'receipt-backed display cache' : 'receipt cache empty'}
          detail={receiptDetail(proof.receipt)}
          copyText={proof.receipt?.receiptHash || proof.receipt?.txid || ''}
          tone={proof.receipt ? 'success' : 'info'}
          app={app}
        />
      </section>

      <section className="cl-home-context-grid" aria-label="Current local context">
        <Card eyebrow="Local context" title="Passport / wallet display">
          <div className="cl-home-context-list">
            <ContextRow label="Gateway" value={gatewayUrl} />
            <ContextRow label="Passport" value={passport} />
            <ContextRow label="Wallet" value={wallet} />
            <ContextRow label="Profile" value={proofProfile} />
          </div>
          <p className="cl-home-muted">
            These values are local CrabLink context hints unless the gateway returns confirmed identity,
            wallet, profile, reputation, moderation, or publication truth.
          </p>
        </Card>

        <Card eyebrow="Local proof summary" title="What CrabLink remembers">
          <div className="cl-home-context-list">
            <ContextRow label="Profiles" value={String(proof.counts.profiles)} />
            <ContextRow label="Sites" value={String(proof.counts.sites)} />
            <ContextRow label="Assets" value={String(proof.counts.assets)} />
            <ContextRow label="Receipts" value={String(receipts.length)} />
            <ContextRow label="Generated" value={formatTimestamp(catalog?.generatedAt)} />
          </div>
          <p className="cl-home-muted">
            The passport drawer remains the detailed catalog/receipt view. Home now gives you quick proof anchors
            and counts after image, site, and profile work.
          </p>
        </Card>
      </section>

      <HomeQuickActions app={app} proofSite={proofSite} proofImage={proofImage} />

      <section className="cl-home-bottom-grid" aria-label="Testing and next work">
        <Card eyebrow="Recent local proof" title="Newest catalog entries">
          <p>
            These are safe local display entries from the catalog scanner and explicit write paths. Open them to
            regression-test route ownership quickly.
          </p>

          <div className="cl-home-next-list">
            {proof.recentCatalog.length > 0 ? (
              proof.recentCatalog.slice(0, 8).map((item, index) => (
                <span key={`${item.kind}:${item.crabUrl}:${index}`} title={item.crabUrl}>
                  {item.kind}: {shortLabel(item.title || item.crabUrl)}
                </span>
              ))
            ) : (
              <span>No local catalog entries yet</span>
            )}
          </div>
        </Card>

        <Card eyebrow="Manual smoke sequence" title="Route switching regression check">
          <p>
            After every route batch, use this sequence to confirm the previous page disappears before
            the next one appears and no old DOM patch leaks into the new route owner.
          </p>

          <ol className="cl-home-smoke-list">
            <li>{proofSite} → crab://site → crab://profile → crab://home</li>
            <li>crab://image → newest .image proof → crab://home</li>
            <li>crab://article → crab://post → crab://comment → crab://lyrics</li>
            <li>crab://video → crab://stream → crab://podcast → crab://music</li>
            <li>crab://ad → crab://algo → crab://code → crab://game</li>
          </ol>
        </Card>
      </section>
    </section>
  );
}

function StatusCard({ eyebrow, title, value, copy, tone = 'neutral' }) {
  return (
    <article className={`cl-home-status-card is-${tone}`}>
      <p className="cl-eyebrow">{eyebrow}</p>
      <div>
        <strong>{value}</strong>
        <h2>{title}</h2>
      </div>
      <p>{copy}</p>
    </article>
  );
}

function ProofCard({
  eyebrow,
  title,
  route,
  status,
  detail,
  copyText = '',
  tone = 'neutral',
  app,
}) {
  const hasRoute = Boolean(route);

  function openRoute() {
    if (hasRoute) {
      app?.navigate?.(route);
    }
  }

  return (
    <article className={`cl-home-proof-card is-${tone}`}>
      <div className="cl-home-proof-head">
        <div>
          <span>{eyebrow}</span>
          <strong>{title || 'Proof item'}</strong>
        </div>
        <Badge tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'neutral'}>
          {status || 'local display'}
        </Badge>
      </div>

      {route && (
        <div className="cl-home-route-proof">
          <span>Route</span>
          <code>{route}</code>
        </div>
      )}

      <p>{detail || 'Local display memory only.'}</p>

      <div className="cl-home-proof-actions">
        {hasRoute && (
          <Button variant="primary" size="sm" onClick={openRoute}>
            Open
          </Button>
        )}
        {hasRoute && <CopyButton text={route} label="Copy URL" />}
        {copyText && <CopyButton text={copyText} label="Copy proof" />}
      </div>
    </article>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="cl-home-context-row">
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function buildHomeProof({ catalog = EMPTY_CATALOG, receipts = [] }) {
  const profiles = safeArray(catalog.profiles);
  const sites = safeArray(catalog.sites);
  const assets = safeArray(catalog.assets);
  const all = safeArray(catalog.all);
  const safeReceipts = safeArray(receipts);

  const sortedCatalog = all.length
    ? sortByTime(all)
    : sortByTime([...profiles, ...sites, ...assets]);

  const image =
    sortByTime(assets).find((item) => item.kind === 'image' || /\.image$/i.test(item.crabUrl || '')) || null;

  const site =
    sortByTime(sites).find((item) => /^crab:\/\/[^@][^/]+$/i.test(item.crabUrl || '')) ||
    sortByTime(sites)[0] ||
    null;

  const profile =
    sortByTime(profiles).find((item) => /^crab:\/\/@/i.test(item.crabUrl || '') || /\.profile$/i.test(item.crabUrl || '')) ||
    sortByTime(profiles)[0] ||
    null;

  const receipt = sortByTime(safeReceipts)[0] || null;

  return {
    counts: {
      profiles: profiles.length,
      sites: sites.length,
      assets: assets.length,
      all: sortedCatalog.length,
      receipts: safeReceipts.length,
    },
    profile,
    site,
    image,
    receipt,
    recentCatalog: sortedCatalog,
  };
}

function sortByTime(items = []) {
  return safeArray(items)
    .slice()
    .sort((a, b) => timestampForSort(b) - timestampForSort(a));
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

function timestampForSort(value) {
  const raw = String(value?.createdAt || value?.created_at || value?.generatedAt || '').trim();

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

function receiptDetail(receipt) {
  if (!receipt) {
    return 'Pay a site visit or publish a paid asset to populate local receipt proof.';
  }

  const amount = receipt.amountMinor
    ? `${receipt.amountMinor} ${String(receipt.asset || 'roc').toUpperCase()}`
    : 'amount not returned';
  const proof = receipt.receiptHash || receipt.txid || 'proof not returned';

  return `${amount} · ${proof}`;
}

function formatTimestamp(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return 'not generated yet';
  }

  const parsed = Date.parse(raw);

  if (!Number.isFinite(parsed)) {
    return raw;
  }

  return new Date(parsed).toLocaleString();
}

function shortLabel(value) {
  const text = String(value || '').trim();

  if (text.length <= 28) {
    return text || 'entry';
  }

  return `${text.slice(0, 25)}…`;
}