/**
 * RO:WHAT — Gateway-only site client for React CrabLink site views.
 * RO:WHY — Preserves proven site prepare/create/open flow behind one client boundary while React migrates safely.
 * RO:INTERACTS — gatewayClient, SitePage, SiteRender, SiteManifestDrawer, SiteCreatorProof.
 * RO:INVARIANTS — no fake site pointer; no direct index/storage calls; no silent ROC spend; paid mutation remains disabled here.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured GatewayClient base URL and timeout.
 * RO:SECURITY — read-only resolve/render only in this React batch; no wallet/ledger/storage/index bypass.
 * RO:TEST — React crab://site and crab://<site_name> smoke; legacy site create/open smoke remains protected.
 */

export function createSiteClient(gateway) {
  return new SiteClient(gateway);
}

export class SiteClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  async resolveSite(siteNameOrUrl) {
    const target = normalizeSiteTarget(siteNameOrUrl);

    if (!this.gateway) {
      throw new Error('Site resolution requires the configured gateway client.');
    }

    const attempts = [];

    try {
      const response = await this.gateway.resolveCrab(target.crabUrl);
      attempts.push({
        method: 'GET',
        route: '/crab/resolve',
        ok: true,
        status: response.status,
        correlationId: response.correlationId,
      });

      return buildResolvedSite({
        target,
        response,
        data: response.data,
        source: 'crab_resolve',
        attempts,
      });
    } catch (error) {
      attempts.push(errorAttempt('/crab/resolve', error));

      try {
        const response = await this.gateway.request(`/sites/${encodeURIComponent(target.siteName)}`, {
          label: 'Site lookup',
        });

        attempts.push({
          method: 'GET',
          route: `/sites/${target.siteName}`,
          ok: true,
          status: response.status,
          correlationId: response.correlationId,
        });

        return buildResolvedSite({
          target,
          response,
          data: response.data,
          source: 'site_lookup',
          attempts,
        });
      } catch (fallbackError) {
        attempts.push(errorAttempt(`/sites/${target.siteName}`, fallbackError));

        const finalError = new Error(
          fallbackError?.message ||
            error?.message ||
            `Unable to resolve ${target.crabUrl} through the configured gateway.`,
        );

        finalError.name = 'SiteResolveError';
        finalError.target = target;
        finalError.attempts = attempts;
        finalError.primaryError = error;
        finalError.fallbackError = fallbackError;
        throw finalError;
      }
    }
  }

  async fetchRootDocument(rootDocumentCid) {
    const cid = normalizeCid(rootDocumentCid);

    if (!cid) {
      throw new Error('Root document fetch requires a b3:<hash> content ID.');
    }

    if (!this.gateway) {
      throw new Error('Root document fetch requires the configured gateway client.');
    }

    return this.gateway.request(`/o/${cid}`, {
      label: 'Site root document',
      parseAs: 'text',
      headers: {
        Accept: 'text/html,text/plain,application/octet-stream,*/*',
      },
    });
  }
}

export function normalizeSiteTarget(value) {
  const raw = String(value || '').trim();
  const body = raw.startsWith('crab://') ? raw.slice('crab://'.length) : raw;
  const clean = body.split(/[?#]/)[0].replace(/^\/+/, '').trim();
  const siteName = clean || 'site';

  return Object.freeze({
    siteName,
    crabUrl: `crab://${siteName}`,
  });
}

export function summarizeSiteData(data, target = {}) {
  const object = data && typeof data === 'object' ? data : {};
  const manifest = firstObject(object.manifest, object.site_manifest, object.page?.manifest, object.site?.manifest);
  const links = firstObject(object.links, manifest.links, object.site?.links);
  const owner = firstObject(object.owner, object.creator, manifest.owner, manifest.creator, object.site?.owner);
  const economics = firstObject(object.economics, manifest.economics, object.payout, manifest.payout);
  const routeMap = firstObject(object.route_map, object.routeMap, manifest.route_map, manifest.routeMap);
  const assetMap = firstObject(object.asset_map, object.assetMap, manifest.asset_map, manifest.assetMap);
  const receipts = firstArray(object.receipts, manifest.receipts, object.wallet_receipts, object.proofs);

  const siteName = stringValue(
    object.site_name,
    object.siteName,
    object.name,
    manifest.site_name,
    manifest.name,
    target.siteName,
    '',
  );

  const rootDocumentCid = normalizeCid(
    stringValue(
      object.root_document_cid,
      object.rootDocumentCid,
      object.root_cid,
      object.rootCid,
      manifest.root_document_cid,
      manifest.rootDocumentCid,
      manifest.root_cid,
      manifest.rootCid,
      routeMap['/'],
      routeMap.index,
      '',
    ),
  );

  return {
    schema: stringValue(object.schema, manifest.schema, ''),
    siteName,
    crabUrl: stringValue(links.crab, object.crab_url, object.crabUrl, target.crabUrl, siteName ? `crab://${siteName}` : ''),
    title: stringValue(object.title, manifest.title, object.site?.title, siteName || 'Untitled site'),
    description: stringValue(object.description, manifest.description, object.site?.description, ''),
    ownerPassport: stringValue(
      owner.passport,
      owner.owner_passport_subject,
      owner.ownerPassport,
      object.owner_passport_subject,
      manifest.owner_passport_subject,
      '',
    ),
    ownerWallet: stringValue(
      owner.wallet,
      owner.wallet_account,
      owner.walletAccount,
      economics.payout_account,
      object.owner_wallet,
      '',
    ),
    payoutMode: stringValue(economics.mode, economics.payout_mode, economics.default_action, object.payout_mode, ''),
    manifestCid: normalizeCid(stringValue(object.manifest_cid, object.manifestCid, manifest.cid, '')),
    rootDocumentCid,
    routeMap,
    assetMap,
    receipts,
    hydrationStatus: stringValue(object.hydration_status, object.hydrationStatus, manifest.hydration_status, ''),
    status: stringValue(object.status, manifest.status, ''),
  };
}

function buildResolvedSite({ target, response, data, source, attempts }) {
  return Object.freeze({
    ok: true,
    source,
    target,
    response: Object.freeze({
      status: response?.status || 0,
      route: response?.route || '',
      correlationId: response?.correlationId || '',
    }),
    summary: summarizeSiteData(data, target),
    data,
    attempts: Object.freeze(attempts.map((attempt) => Object.freeze({ ...attempt }))),
    resolvedAt: new Date().toISOString(),
  });
}

function errorAttempt(route, error) {
  return {
    method: 'GET',
    route,
    ok: false,
    status: Number(error?.status || 0),
    reason: String(error?.reason || error?.name || 'request_failed'),
    message: String(error?.message || 'Gateway request failed.'),
    correlationId: String(error?.correlationId || ''),
    retryable: Boolean(error?.retryable),
  };
}

function normalizeCid(value) {
  const clean = String(value || '').trim().toLowerCase();
  const hash = clean.startsWith('b3:') ? clean.slice(3) : clean;

  if (/^[0-9a-f]{64}$/.test(hash)) {
    return `b3:${hash}`;
  }

  return '';
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();

    if (safe) {
      return safe;
    }
  }

  return '';
}