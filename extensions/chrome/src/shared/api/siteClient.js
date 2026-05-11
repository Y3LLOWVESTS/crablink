/**
 * RO:WHAT — Gateway-only site client for React CrabLink named-site views.
 * RO:WHY — Moves `omnigate.site-page.v1` into read-only React site parity without crossing service boundaries.
 * RO:INTERACTS — gatewayClient, SitePage, SiteRender, SiteManifestDrawer, SiteCreatorProof, crabUrl helpers.
 * RO:INVARIANTS — no fake site pointer; no direct index/storage/wallet/ledger calls; no silent ROC spend; no site mutation here.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured GatewayClient base URL, timeout, passport, wallet, bearer token.
 * RO:SECURITY — read-only resolve/render only; untrusted root bytes are rendered only by sandboxed callers.
 * RO:TEST — React crab://<site_name> smoke; legacy site create/open smoke remains protected.
 */

import {
  crabImageUrlToCid,
  makeCrabSiteUrl,
  normalizeB3Cid,
  normalizeSiteName,
  parseTypedAssetBody,
} from '../utils/crabUrl.js';

const ROOT_ROUTE_KEYS = Object.freeze(['/', 'index', 'index.html', '/index.html']);

export function createSiteClient(gateway) {
  return new SiteClient(gateway);
}

export class SiteResolveError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Site resolution failed.'));
    this.name = 'SiteResolveError';
    this.reason = details.reason || 'site_resolve_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.target = details.target || null;
    this.attempts = Array.isArray(details.attempts) ? details.attempts : [];
    this.primaryError = details.primaryError || null;
    this.fallbackError = details.fallbackError || null;
    this.data = details.data || null;
    this.correlationId = String(details.correlationId || correlationFromAttempts(this.attempts) || '');
  }
}

export class SiteClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async resolveSite(siteNameOrUrl) {
    const target = normalizeSiteTarget(siteNameOrUrl);

    if (!this.gateway) {
      throw new SiteResolveError('Site resolution requires the configured gateway client.', {
        reason: 'missing_gateway_client',
        retryable: false,
        target,
      });
    }

    const attempts = [];
    let primaryError = null;

    try {
      const response = await this.gateway.resolveCrab(target.crabUrl);
      attempts.push(successAttempt('/crab/resolve', response));
      validateSiteResponse(response?.data, response);

      return buildResolvedSite({
        target,
        response,
        data: response.data,
        source: 'crab_resolve',
        attempts,
      });
    } catch (error) {
      primaryError = error;
      attempts.push(errorAttempt('/crab/resolve', error));
    }

    try {
      const route = `/sites/${encodeURIComponent(target.siteName)}`;
      const response = await this.gateway.request(route, {
        label: 'Site lookup',
      });

      attempts.push(successAttempt(route, response));
      validateSiteResponse(response?.data, response);

      return buildResolvedSite({
        target,
        response,
        data: response.data,
        source: 'site_lookup',
        attempts,
      });
    } catch (fallbackError) {
      attempts.push(errorAttempt(`/sites/${target.siteName}`, fallbackError));

      throw new SiteResolveError(
        fallbackError?.message ||
          primaryError?.message ||
          `Unable to resolve ${target.crabUrl} through the configured gateway.`,
        {
          reason: reasonForFailure(primaryError, fallbackError),
          status: bestStatus(attempts, fallbackError, primaryError),
          retryable: Boolean(
            fallbackError?.retryable ||
              primaryError?.retryable ||
              attempts.some((attempt) => attempt.retryable),
          ),
          target,
          attempts,
          primaryError,
          fallbackError,
          data: fallbackError?.data || primaryError?.data || null,
        },
      );
    }
  }

  async fetchRootDocument(rootDocumentCid) {
    const cid = normalizeSiteCid(rootDocumentCid);

    if (!cid) {
      throw new SiteResolveError('Root document fetch requires a b3:<hash> content ID.', {
        reason: 'invalid_root_document_cid',
        retryable: false,
      });
    }

    if (!this.gateway) {
      throw new SiteResolveError('Root document fetch requires the configured gateway client.', {
        reason: 'missing_gateway_client',
        retryable: false,
      });
    }

    return this.gateway.request(`/o/${cid}`, {
      label: 'Site root document',
      parseAs: 'text',
      headers: {
        Accept: 'text/html,text/plain,application/octet-stream,*/*',
      },
    });
  }

  rootDocumentUrl(rootDocumentCid) {
    const cid = normalizeSiteCid(rootDocumentCid);

    if (!cid || !this.gateway?.url) {
      return '';
    }

    return this.gateway.url(`/o/${cid}`);
  }

  objectUrlFromCid(cid) {
    return this.rootDocumentUrl(cid);
  }

  objectUrlFromCrabImage(crabUrl) {
    const cid = crabImageUrlToCid(crabUrl);
    return cid ? this.rootDocumentUrl(cid) : '';
  }
}

export function normalizeSiteTarget(value) {
  const raw = String(value || '').trim();
  const siteName = normalizeSiteName(raw) || normalizeSiteName(raw.replace(/^crab:\/\//i, ''));

  if (!siteName) {
    throw new SiteResolveError('Named site routes require a safe crab://<site_name> pointer.', {
      reason: 'invalid_site_name',
      retryable: false,
      target: {
        siteName: '',
        crabUrl: raw,
      },
    });
  }

  return Object.freeze({
    siteName,
    crabUrl: makeCrabSiteUrl(siteName),
  });
}

export function summarizeSiteData(data, target = {}) {
  const object = firstObject(data);
  const page = firstObject(object.page, object.site_page, object.result);
  const site = firstObject(object.site, page.site);
  const manifest = firstObject(
    object.manifest,
    object.site_manifest,
    page.manifest,
    site.manifest,
  );
  const metadata = firstObject(
    object.metadata,
    object.meta,
    page.metadata,
    site.metadata,
    manifest.metadata,
    manifest.meta,
  );
  const links = firstObject(object.links, page.links, site.links, manifest.links);
  const owner = firstObject(object.owner, object.creator, page.owner, site.owner, manifest.owner, manifest.creator);
  const payout = firstObject(object.payout, object.economics, page.payout, site.payout, manifest.payout, manifest.economics);
  const routeMap = shallowObject(firstObject(object.route_map, object.routeMap, page.route_map, site.route_map, manifest.route_map, manifest.routeMap));
  const assetMap = shallowObject(firstObject(object.asset_map, object.assetMap, page.asset_map, site.asset_map, manifest.asset_map, manifest.assetMap));
  const rootDocument = firstObject(object.root_document, object.rootDocument, page.root_document, site.root_document, manifest.root_document, manifest.rootDocument);
  const storage = firstObject(object.storage, page.storage, site.storage, manifest.storage);
  const warnings = firstArray(object.warnings, page.warnings, manifest.warnings);
  const receipts = firstArray(object.receipts, page.receipts, manifest.receipts, object.wallet_receipts, object.proofs);

  const siteName = stringValue(
    object.site_name,
    object.siteName,
    object.name,
    page.site_name,
    site.site_name,
    site.name,
    metadata.site_name,
    manifest.site_name,
    manifest.name,
    target.siteName,
    '',
  );

  const rootDocumentCid = firstCid(
    object.root_document_cid,
    object.rootDocumentCid,
    object.root_cid,
    object.rootCid,
    rootDocument.cid,
    rootDocument.content_id,
    rootDocument.contentId,
    rootDocument.b3,
    page.root_document_cid,
    site.root_document_cid,
    manifest.root_document_cid,
    manifest.rootDocumentCid,
    manifest.root_cid,
    manifest.rootCid,
    storage.root_document_cid,
    rootFromMap(routeMap),
    rootFromMap(assetMap),
  );

  const manifestCid = firstCid(
    object.manifest_cid,
    object.manifestCid,
    page.manifest_cid,
    site.manifest_cid,
    manifest.manifest_cid,
    manifest.manifestCid,
    manifest.cid,
    manifest.content_id,
    links.manifest_raw,
    links.manifestRaw,
  );

  return Object.freeze({
    schema: stringValue(object.schema, object.type, page.schema, manifest.schema, ''),
    siteName,
    crabUrl: stringValue(links.crab, object.crab_url, object.crabUrl, page.crab_url, target.crabUrl, siteName ? `crab://${siteName}` : ''),
    resolvePath: stringValue(links.resolve, object.resolve, page.resolve, ''),
    title: stringValue(metadata.title, object.title, page.title, site.title, manifest.title, siteName || 'Untitled site'),
    description: stringValue(metadata.description, object.description, page.description, site.description, manifest.description, ''),
    tags: parseTags(metadata.tags || object.tags || page.tags || manifest.tags),
    ownerPassport: stringValue(
      owner.passport_subject,
      owner.passport,
      owner.owner_passport_subject,
      owner.ownerPassport,
      object.owner_passport_subject,
      manifest.owner_passport_subject,
      '',
    ),
    ownerWallet: stringValue(
      owner.wallet_account,
      owner.wallet,
      owner.walletAccount,
      object.owner_wallet,
      object.wallet_account,
      manifest.wallet_account,
      '',
    ),
    payoutMode: stringValue(payout.default_action, payout.mode, payout.payout_mode, object.payout_mode, ''),
    payoutRecipient: stringValue(payout.recipient_account, payout.payout_account, payout.wallet_account, ''),
    manifestCid,
    manifestStatus: stringValue(manifest.status, object.manifest_status, page.manifest_status, ''),
    rootDocumentCid,
    routeMap,
    assetMap,
    receipts,
    warnings,
    hydrationStatus: stringValue(
      object.hydration_status,
      object.hydrationStatus,
      manifest.hydration_status,
      manifest.hydrationStatus,
      '',
    ),
    status: stringValue(object.status, page.status, site.status, manifest.status, ''),
    createdAt: stringValue(object.created_at, object.createdAt, manifest.created_at, ''),
    updatedAt: stringValue(object.updated_at, object.updatedAt, manifest.updated_at, ''),
  });
}

export function normalizeSiteCid(value) {
  return cidFromAny(value);
}

function validateSiteResponse(data, response) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SiteResolveError('Gateway returned a malformed site response instead of a site JSON object.', {
      reason: 'malformed_site_response',
      status: Number(response?.status || 0),
      retryable: false,
      data: data ?? null,
      correlationId: String(response?.correlationId || ''),
    });
  }
}

function buildResolvedSite({ target, response, data, source, attempts }) {
  return Object.freeze({
    ok: true,
    source,
    target,
    response: Object.freeze({
      status: Number(response?.status || 0),
      route: response?.route || '',
      correlationId: response?.correlationId || '',
    }),
    summary: summarizeSiteData(data, target),
    data,
    attempts: Object.freeze(attempts.map((attempt) => Object.freeze({ ...attempt }))),
    resolvedAt: new Date().toISOString(),
  });
}

function successAttempt(route, response) {
  return {
    method: 'GET',
    route,
    ok: true,
    status: Number(response?.status || 0),
    reason: 'ok',
    message: 'Gateway returned a site response.',
    correlationId: String(response?.correlationId || ''),
    retryable: false,
  };
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

function reasonForFailure(primaryError, fallbackError) {
  return String(
    fallbackError?.reason ||
      primaryError?.reason ||
      fallbackError?.name ||
      primaryError?.name ||
      'site_resolve_failed',
  );
}

function bestStatus(attempts, fallbackError, primaryError) {
  const reversed = [...attempts].reverse();
  const attempt = reversed.find((item) => item.status);
  return Number(attempt?.status || fallbackError?.status || primaryError?.status || 0);
}

function correlationFromAttempts(attempts) {
  const reversed = [...(attempts || [])].reverse();
  return String(reversed.find((attempt) => attempt.correlationId)?.correlationId || '');
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
}

function shallowObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.freeze({ ...value });
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

function firstCid(...values) {
  for (const value of values) {
    const cid = cidFromAny(value);

    if (cid) {
      return cid;
    }
  }

  return '';
}

function rootFromMap(map) {
  for (const key of ROOT_ROUTE_KEYS) {
    const value = map?.[key];
    const cid = cidFromAny(value);

    if (cid) {
      return cid;
    }
  }

  return '';
}

function cidFromAny(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  const typed = parseTypedAssetBody(raw);
  if (typed?.cid) {
    return typed.cid;
  }

  const withoutGatewayPath = raw
    .replace(/^https?:\/\/[^/]+\/o\//i, '')
    .replace(/^https?:\/\/[^/]+\/b3\//i, '')
    .replace(/^\/o\//i, '')
    .replace(/^\/b3\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/\.[a-z][a-z0-9_-]{0,31}$/i, '');

  return normalizeB3Cid(withoutGatewayPath);
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 24);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
}