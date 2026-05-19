/**
 * RO:WHAT — Gateway-only site client for React CrabLink named-site read and launch flows.
 * RO:WHY — Moves `omnigate.site-page.v1` and static site launch into React parity without crossing service boundaries.
 * RO:INTERACTS — gatewayClient, walletClient, SitePage, SiteLaunchFlow, SiteRender, SiteManifestDrawer.
 * RO:INVARIANTS — no fake site pointer; no direct index/storage/wallet/ledger calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured GatewayClient base URL, timeout, passport, wallet, bearer token.
 * RO:SECURITY — read-only resolve plus explicit confirmed mutation helpers only.
 * RO:TEST — React crab://<site_name> smoke; React crab://site prepare/hold/create smoke.
 */

import {
  crabImageUrlToCid,
  makeCrabSiteUrl,
  normalizeB3Cid,
  normalizeSiteName,
  parseTypedAssetBody,
} from '../utils/crabUrl.js';

const ROOT_ROUTE_KEYS = Object.freeze(['/', 'index', 'index.html', '/index.html']);
const MAX_IDEMPOTENCY_KEY_BYTES = 64;

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

export class SiteMutationError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Site mutation failed.'));
    this.name = 'SiteMutationError';
    this.reason = details.reason || 'site_mutation_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = String(details.correlationId || '');
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

    this.assertGateway('Site resolution');

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

    this.assertGateway('Root document fetch');

    return this.gateway.request(`/o/${cid}`, {
      label: 'Site root document',
      parseAs: 'text',
      headers: {
        Accept: 'text/html,text/plain,application/octet-stream,*/*',
      },
    });
  }

  async prepareSite(payload = {}, options = {}) {
    this.assertGateway('Site prepare');

    const request = normalizeSitePrepareRequest(payload);
    const idempotencyKey = options.idempotencyKey || request.client_idempotency_key;

    return this.gateway.request('/sites/prepare', {
      method: 'POST',
      body: request,
      label: 'Site prepare',
      mutation: true,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      idempotencyKey,
    });
  }

  async createSite(payload = {}, options = {}) {
    this.assertGateway('Site create');

    if (options.confirmed !== true) {
      throw new SiteMutationError('Site create requires explicit caller confirmation.', {
        reason: 'confirmation_required',
        retryable: false,
      });
    }

    const normalized = normalizeSiteCreateRequest(payload);
    const request = strictSiteCreateBody(normalized);

    const proof = options.paidProof ? normalizeSitePaidProof(options.paidProof) : null;
    const idempotencyKey =
      options.idempotencyKey ||
      payload.client_idempotency_key ||
      payload.idempotency_key ||
      stableSiteIdempotencyKey('site-create', request.site_name, request.root_document_cid, proof?.txid || '');

    const headers = {
      'Idempotency-Key': compactIdempotencyKey(idempotencyKey),
    };

    if (proof) {
      headers['x-ron-paid-op'] = proof.op || 'hold';
      headers['x-ron-paid-asset'] = proof.asset || 'roc';
      headers['x-ron-paid-estimate-minor'] = proof.amount_minor;
      headers['x-ron-wallet-txid'] = proof.txid;
      headers['x-ron-wallet-receipt-hash'] = proof.receipt_hash;
      headers['x-ron-wallet-from'] = proof.from;
      headers['x-ron-wallet-to'] = proof.to;
    }

    return this.gateway.request('/sites', {
      method: 'POST',
      body: request,
      label: 'Site create',
      mutation: true,
      headers,
      idempotencyKey: headers['Idempotency-Key'],
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

  assertGateway(label = 'Site request') {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw new SiteMutationError(`${label} requires the configured gateway client.`, {
        reason: 'missing_gateway_client',
        retryable: false,
      });
    }
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

export function normalizeSiteCid(value) {
  return cidFromAny(value);
}

export function normalizeSitePrepareRequest(payload = {}) {
  const siteName = normalizeSiteName(payload.site_name || payload.siteName || payload.name);
  const fallbackBytes = normalizePositiveInteger(
    payload.file_bytes ||
      payload.fileBytes ||
      payload.bytes ||
      payload.total_bytes ||
      payload.totalBytes,
  );
  const fallbackPath = stringValue(payload.file_path, payload.filePath, 'index.html');
  const files = normalizePrepareFiles(payload.files, fallbackPath, fallbackBytes);
  const totalFileBytes = files.reduce((sum, file) => sum + Number(file.bytes || 0), 0);
  const payerAccount = stringValue(payload.payer_account, payload.payerAccount, payload.owner_wallet_account);
  const ownerPassport = stringValue(payload.owner_passport_subject, payload.ownerPassportSubject);
  const ownerWallet = stringValue(payload.owner_wallet_account, payload.ownerWalletAccount, payerAccount);
  const title = stringValue(payload.title);
  const description = stringValue(payload.description);
  const idem = stringValue(
    payload.client_idempotency_key,
    payload.idempotency_key,
    stableSiteIdempotencyKey('site-prepare', siteName, totalFileBytes, title),
  );

  if (!siteName) {
    throw new SiteMutationError('Site prepare requires a safe site_name.', {
      reason: 'invalid_site_name',
      retryable: false,
    });
  }

  if (!totalFileBytes || totalFileBytes < 1) {
    throw new SiteMutationError('Site prepare requires a non-empty root document byte count.', {
      reason: 'invalid_root_bytes',
      retryable: false,
    });
  }

  if (!payerAccount) {
    throw new SiteMutationError('Site prepare requires a payer_account.', {
      reason: 'missing_payer_account',
      retryable: false,
    });
  }

  if (!ownerPassport) {
    throw new SiteMutationError('Site prepare requires an owner_passport_subject.', {
      reason: 'missing_owner_passport_subject',
      retryable: false,
    });
  }

  return stripEmpty({
    site_name: siteName,
    files,
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    owner_wallet_account: ownerWallet,
    title,
    description,
    client_idempotency_key: compactIdempotencyKey(idem),
  });
}

export function normalizeSiteCreateRequest(payload = {}) {
  const siteName = normalizeSiteName(payload.site_name || payload.siteName || payload.name);
  const rootDocumentCid = normalizeSiteCid(
    payload.root_document_cid ||
      payload.rootDocumentCid ||
      payload.root_cid ||
      payload.rootCid,
  );
  const ownerPassport = stringValue(payload.owner_passport_subject, payload.ownerPassportSubject);
  const ownerWallet = stringValue(payload.owner_wallet_account, payload.ownerWalletAccount);
  const title = stringValue(payload.title);
  const description = stringValue(payload.description);
  const routeMap = normalizeCidMap(payload.route_map || payload.routeMap, {
    '/': rootDocumentCid,
  });
  const assetMap = normalizeCidMap(payload.asset_map || payload.assetMap, {
    'index.html': rootDocumentCid,
  });

  if (!siteName) {
    throw new SiteMutationError('Site create requires a safe site_name.', {
      reason: 'invalid_site_name',
      retryable: false,
    });
  }

  if (!rootDocumentCid) {
    throw new SiteMutationError('Site create requires a canonical root_document_cid.', {
      reason: 'invalid_root_document_cid',
      retryable: false,
    });
  }

  if (!ownerPassport) {
    throw new SiteMutationError('Site create requires an owner_passport_subject.', {
      reason: 'missing_owner_passport_subject',
      retryable: false,
    });
  }

  if (!ownerWallet) {
    throw new SiteMutationError('Site create requires an owner_wallet_account.', {
      reason: 'missing_owner_wallet_account',
      retryable: false,
    });
  }

  return strictSiteCreateBody({
    site_name: siteName,
    root_document_cid: rootDocumentCid,
    owner_passport_subject: ownerPassport,
    owner_wallet_account: ownerWallet,
    title,
    description,
    route_map: routeMap,
    asset_map: assetMap,
  });
}

export function normalizeSitePaidProof(proof = {}) {
  const object = proof?.walletHold && typeof proof.walletHold === 'object' ? proof.walletHold : proof;
  const txid = stringValue(object.txid, object.tx_id, object.hold_id, object.holdId, object.receipt?.txid);
  const receiptHash = stringValue(
    object.receipt_hash,
    object.receiptHash,
    object.wallet_receipt_hash,
    object.walletReceiptHash,
    object.receipt?.hash,
    object.receipt?.receipt_hash,
  );
  const from = stringValue(object.from, object.payer, object.payer_account, object.wallet_from);
  const to = stringValue(object.to, object.escrow, object.escrow_account, object.wallet_to);
  const amountMinor = normalizePositiveInteger(
    object.amount_minor ||
      object.amountMinor ||
      object.held_minor ||
      object.heldMinor ||
      object.amount ||
      object.estimate_minor,
  );
  const asset = stringValue(object.asset, 'roc').toLowerCase();
  const op = stringValue(object.op, object.operation, 'hold').toLowerCase();

  if (!txid) {
    throw new SiteMutationError('Site create paid proof is missing txid.', {
      reason: 'missing_paid_txid',
      retryable: false,
      data: proof,
    });
  }

  if (!receiptHash) {
    throw new SiteMutationError('Site create paid proof is missing receipt_hash.', {
      reason: 'missing_paid_receipt_hash',
      retryable: false,
      data: proof,
    });
  }

  if (!from || !to) {
    throw new SiteMutationError('Site create paid proof is missing payer or escrow account.', {
      reason: 'missing_paid_accounts',
      retryable: false,
      data: proof,
    });
  }

  if (!amountMinor) {
    throw new SiteMutationError('Site create paid proof is missing amount_minor.', {
      reason: 'missing_paid_amount',
      retryable: false,
      data: proof,
    });
  }

  return Object.freeze({
    txid,
    receipt_hash: receiptHash,
    from,
    to,
    amount_minor: amountMinor,
    asset,
    op,
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
  const metadata = firstObject(manifest.metadata, site.metadata, page.metadata, object.metadata);
  const owner = firstObject(manifest.owner, site.owner, page.owner, object.owner);
  const payout = firstObject(manifest.payout, site.payout, page.payout, object.payout);
  const storage = firstObject(manifest.storage, site.storage, page.storage, object.storage);
  const rootDocument = firstObject(object.root_document, object.rootDocument, page.root_document, site.root_document);
  const links = firstObject(object.links, page.links, site.links, manifest.links);
  const routeMap = shallowObject(
    manifest.route_map ||
      manifest.routeMap ||
      site.route_map ||
      site.routeMap ||
      page.route_map ||
      page.routeMap ||
      object.route_map ||
      object.routeMap,
  );
  const assetMap = shallowObject(
    manifest.asset_map ||
      manifest.assetMap ||
      site.asset_map ||
      site.assetMap ||
      page.asset_map ||
      page.assetMap ||
      object.asset_map ||
      object.assetMap,
  );
  const receipts = firstArray(object.receipts, page.receipts, site.receipts, manifest.receipts);
  const warnings = firstArray(object.warnings, page.warnings, site.warnings, manifest.warnings);

  const siteName = stringValue(
    object.site_name,
    object.siteName,
    page.site_name,
    site.site_name,
    manifest.site_name,
    target.siteName,
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

export function summarizeSiteCreateData(data = {}) {
  const object = firstObject(data);
  const links = firstObject(object.links);
  const manifest = firstObject(object.manifest);
  const indexPointer = firstObject(object.index_pointer, object.indexPointer);
  const owner = firstObject(object.owner);
  const payout = firstObject(object.payout);

  const siteName = stringValue(object.site_name, object.siteName, object.name);
  const rootDocumentCid = normalizeSiteCid(object.root_document_cid || object.rootDocumentCid);
  const manifestCid = normalizeSiteCid(manifest.manifest_cid || manifest.manifestCid || object.manifest_cid);
  const crabUrl = stringValue(links.crab, object.crab_url, siteName ? `crab://${siteName}` : '');

  return Object.freeze({
    schema: stringValue(object.schema, ''),
    siteName,
    crabUrl,
    rootDocumentCid,
    manifestCid,
    manifestStatus: stringValue(manifest.status, ''),
    indexPointerStatus: stringValue(indexPointer.status, ''),
    ownerPassport: stringValue(owner.passport_subject, ''),
    ownerWallet: stringValue(owner.wallet_account, ''),
    payoutMode: stringValue(payout.default_action, ''),
    payoutRecipient: stringValue(payout.recipient_account, ''),
    warnings: firstArray(object.warnings),
  });
}

export function stableSiteIdempotencyKey(scope, ...parts) {
  return compactIdempotencyKey(
    ['crablink-react', scope, ...parts]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(':'),
  );
}

function strictSiteCreateBody(value = {}) {
  const body = {
    site_name: value.site_name,
    root_document_cid: value.root_document_cid,
    owner_passport_subject: value.owner_passport_subject,
    owner_wallet_account: value.owner_wallet_account,
    title: value.title,
    description: value.description,
    route_map: value.route_map,
    asset_map: value.asset_map,
  };

  return stripEmpty(body);
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

function normalizeCidMap(value, required = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const out = {};

  for (const [key, child] of Object.entries(source)) {
    const cid = normalizeSiteCid(child);
    if (cid) {
      out[String(key)] = cid;
    }
  }

  for (const [key, child] of Object.entries(required)) {
    const cid = normalizeSiteCid(child);
    if (cid) {
      out[String(key)] = cid;
    }
  }

  return out;
}

function normalizePrepareFiles(files, fallbackPath, fallbackBytes) {
  if (Array.isArray(files) && files.length > 0) {
    return files
      .map((file, index) => {
        const child = file && typeof file === 'object' ? file : {};
        const path = stringValue(child.path, child.file_path, child.filePath, index === 0 ? 'index.html' : `asset-${index}`);
        const bytes = normalizePositiveInteger(child.bytes || child.file_bytes || child.fileBytes || child.size || child.size_bytes);

        return bytes
          ? {
              path,
              bytes: Number(bytes),
            }
          : null;
      })
      .filter(Boolean);
  }

  const bytes = normalizePositiveInteger(fallbackBytes);

  return bytes
    ? [
        {
          path: stringValue(fallbackPath, 'index.html'),
          bytes: Number(bytes),
        },
      ]
    : [];
}

function normalizePositiveInteger(value) {
  const raw = String(value ?? '').trim();

  if (/^[0-9]+$/.test(raw) && raw !== '0') {
    return raw;
  }

  const n = Number(raw);
  if (Number.isSafeInteger(n) && n > 0) {
    return String(n);
  }

  return '';
}

function stripEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      return true;
    }),
  );
}

function compactIdempotencyKey(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const prefix = 'crablink-site';
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - prefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${prefix}:${hash}:${suffix}` : `${prefix}:${hash}`;
}

function fnv1aHex(value) {
  let hash = 0x811c9dc5;
  const text = String(value || '');

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}