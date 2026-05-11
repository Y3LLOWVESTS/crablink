/**
 * RO:WHAT — Asset API client for React CrabLink typed b3/crab asset views and explicit image publishing.
 * RO:WHY — Centralizes asset resolve, prepare, and upload calls through svc-gateway while preserving explicit ROC-gated actions.
 * RO:INTERACTS — gatewayClient, AssetPage, AssetResolver, AssetHydratedView, ImagePublishFlow.
 * RO:INVARIANTS — no fake b3 CIDs; no fake receipts; no direct storage/index/omnigate/wallet calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating upload requires caller-supplied paid hold proof; raw image body is sent only to svc-gateway.
 * RO:TEST — React route smoke with crab://<hash>.image, b3:<hash>, and crab://image prepare/hold/upload.
 */

const HEX_64_RE = /^[0-9a-f]{64}$/;
const ASSET_KIND_RE = /^[a-z][a-z0-9_-]{0,31}$/;

export function createAssetClient(gateway) {
  return new AssetClient(gateway);
}

export class AssetResolveError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Asset resolution failed.'));
    this.name = 'AssetResolveError';
    this.problemCode = details.problemCode || 'asset_resolve_failed';
    this.reason = details.reason || this.problemCode;
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.title = details.title || titleForProblem(this.problemCode);
    this.copy = details.copy || copyForProblem(this.problemCode);
    this.remediation = details.remediation || remediationForProblem(this.problemCode);
    this.target = details.target || null;
    this.attempts = Array.isArray(details.attempts) ? details.attempts : [];
    this.primaryError = details.primaryError || null;
    this.fallbackError = details.fallbackError || null;
    this.data = details.data || null;
    this.correlationId = details.correlationId || correlationFromAttempts(this.attempts);
  }
}

export class AssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  async resolveRoute(route) {
    let target;

    try {
      target = normalizeAssetRoute(route);
    } catch (error) {
      throw makeAssetResolveError({
        problemCode: error?.problemCode || 'invalid_asset_route',
        target: null,
        attempts: [],
        primaryError: error,
        fallbackError: null,
      });
    }

    this.assertGateway('Asset resolution');

    const attempts = [];
    let primaryError = null;

    try {
      const response = await this.gateway.resolveCrab(target.assetUrl);

      attempts.push(successAttempt('/crab/resolve', response));
      validateAssetPageResponse(response?.data, {
        route: '/crab/resolve',
        target,
        response,
      });

      return buildResolvedAsset({
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
      const response = await this.gateway.getB3Asset(target.hash, target.assetKind);

      attempts.push(successAttempt(`/b3/${target.hash}.${target.assetKind}`, response));
      validateAssetPageResponse(response?.data, {
        route: `/b3/${target.hash}.${target.assetKind}`,
        target,
        response,
      });

      return buildResolvedAsset({
        target,
        response,
        data: response.data,
        source: 'b3_asset',
        attempts,
      });
    } catch (fallbackError) {
      attempts.push(errorAttempt(`/b3/${target.hash}.${target.assetKind}`, fallbackError));

      throw makeAssetResolveError({
        target,
        attempts,
        primaryError,
        fallbackError,
      });
    }
  }

  async prepareImageAsset(payload = {}, options = {}) {
    this.assertGateway('Image prepare');

    const body = normalizeImagePreparePayload(payload);
    const idempotencyKey = String(
      options.idempotencyKey ||
        body.client_idempotency_key ||
        stableClientKey('image-prepare', body.title, body.bytes, body.content_type),
    ).trim();

    return this.gateway.request('/assets/image/prepare', {
      method: 'POST',
      body,
      label: 'Image prepare',
      headers: {
        'idempotency-key': idempotencyKey,
      },
    });
  }

  async uploadImageAsset({
    file,
    title = '',
    description = '',
    tags = [],
    paidProof = null,
    idempotencyKey = '',
  } = {}) {
    this.assertGateway('Image upload');

    if (!isBlobLike(file)) {
      throw assetMutationError('Image upload requires the selected File/Blob bytes.', 'missing_image_file');
    }

    const proof = normalizePaidProof(paidProof);
    const idem = String(
      idempotencyKey ||
        proof.idem ||
        stableClientKey('image-upload', file.name, file.size, proof.txid),
    ).trim();

    return this.gateway.request('/assets/image', {
      method: 'POST',
      body: file,
      label: 'Image upload',
      headers: imageUploadHeaders({
        file,
        title,
        description,
        tags,
        paidProof: proof,
        idempotencyKey: idem,
      }),
    });
  }

  gatewayB3Url(hash, assetKind = 'image') {
    const target = normalizeAssetTarget({
      hash,
      assetKind,
    });

    if (!this.gateway?.url) {
      return '';
    }

    return this.gateway.url(`/b3/${target.hash}.${target.assetKind}`);
  }

  gatewayObjectUrl(hash, assetKind = 'image') {
    const target = normalizeAssetTarget({
      hash,
      assetKind,
    });

    if (!this.gateway?.url) {
      return '';
    }

    return this.gateway.url(`/o/${target.cid}`);
  }

  previewSources(hash, assetKind = 'image') {
    const target = normalizeAssetTarget({
      hash,
      assetKind,
    });

    const sources = [
      {
        key: 'raw-object',
        label: 'Raw object bytes',
        description: 'Gateway raw object route, used for the real image preview when the object exists.',
        url: this.gatewayObjectUrl(target.hash, target.assetKind),
      },
      {
        key: 'typed-b3',
        label: 'Typed b3 route',
        description: 'Typed asset route fallback. Some stacks return JSON here, so this may not render as an image.',
        url: this.gatewayB3Url(target.hash, target.assetKind),
      },
    ].filter((source) => source.url);

    return Object.freeze(sources.map((source) => Object.freeze(source)));
  }

  assertGateway(label = 'Asset request') {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw new AssetResolveError(`${label} requires the configured gateway client.`, {
        problemCode: 'gateway_unconfigured',
        reason: 'missing_gateway_client',
        retryable: false,
        target: null,
        attempts: [],
      });
    }
  }
}

export function normalizeAssetRoute(route) {
  const params = route?.params || {};

  return normalizeAssetTarget({
    hash: params.hash,
    assetKind: params.assetKind,
    assetUrl: params.assetUrl || route?.normalizedInput,
    cid: params.cid,
  });
}

export function normalizeAssetTarget({ hash, assetKind = 'image', assetUrl = '', cid = '' } = {}) {
  const safeHash = String(hash || '').trim().toLowerCase();
  const safeKind = String(assetKind || 'image').trim().toLowerCase();
  const safeCid = String(cid || `b3:${safeHash}`).trim().toLowerCase();
  const safeAssetUrl = String(assetUrl || `crab://${safeHash}.${safeKind}`).trim();

  if (!HEX_64_RE.test(safeHash)) {
    throw targetError('Asset route requires a canonical 64-character lowercase b3 hash.', {
      problemCode: 'invalid_asset_hash',
      reason: 'invalid_hash',
    });
  }

  if (!ASSET_KIND_RE.test(safeKind)) {
    throw targetError('Asset route has an unsupported asset kind suffix.', {
      problemCode: 'unsupported_kind',
      reason: 'unsupported_asset_kind',
    });
  }

  return Object.freeze({
    hash: safeHash,
    assetKind: safeKind,
    cid: safeCid.startsWith('b3:') ? safeCid : `b3:${safeHash}`,
    assetUrl: safeAssetUrl.startsWith('crab://') ? safeAssetUrl : `crab://${safeHash}.${safeKind}`,
  });
}

export function normalizeAssetResolveProblem(error) {
  if (error instanceof AssetResolveError) {
    return {
      name: error.name,
      title: error.title,
      copy: error.copy,
      message: error.message,
      problemCode: error.problemCode,
      reason: error.reason,
      status: error.status,
      retryable: error.retryable,
      remediation: error.remediation,
      target: error.target,
      attempts: error.attempts,
      correlationId: error.correlationId,
      data: error.data,
    };
  }

  const attempts = Array.isArray(error?.attempts) ? error.attempts : [];
  const problemCode = classifyProblem({
    attempts,
    primaryError: error?.primaryError || error,
    fallbackError: error?.fallbackError || null,
  });

  return {
    name: String(error?.name || 'Error'),
    title: titleForProblem(problemCode),
    copy: copyForProblem(problemCode),
    message: String(error?.message || error || 'Asset resolution failed.'),
    problemCode,
    reason: String(error?.reason || problemCode),
    status: Number(error?.status || error?.fallbackError?.status || error?.primaryError?.status || 0),
    retryable: Boolean(error?.retryable || error?.fallbackError?.retryable || error?.primaryError?.retryable),
    remediation: remediationForProblem(problemCode),
    target: error?.target || null,
    attempts,
    correlationId: String(
      error?.correlationId ||
        error?.fallbackError?.correlationId ||
        error?.primaryError?.correlationId ||
        correlationFromAttempts(attempts) ||
        '',
    ),
    data: error?.data || error?.fallbackError?.data || error?.primaryError?.data || null,
  };
}

export function normalizeImagePreparePayload(payload = {}) {
  const bytes = positiveInteger(payload.bytes);
  const contentType = stringValue(payload.content_type, payload.contentType, 'image/png');
  const title = stringValue(payload.title);
  const description = stringValue(payload.description);
  const tags = normalizeTags(payload.tags);

  if (!bytes) {
    throw assetMutationError('Image prepare requires a positive byte count.', 'missing_image_bytes');
  }

  return stripUndefined({
    bytes,
    payer_account: stringValue(payload.payer_account, payload.payerAccount),
    owner_passport_subject: stringValue(
      payload.owner_passport_subject,
      payload.ownerPassportSubject,
      payload.owner_passport,
    ),
    content_type: contentType,
    title: title || undefined,
    description: description || undefined,
    tags,
    client_idempotency_key: stringValue(
      payload.client_idempotency_key,
      payload.clientIdempotencyKey,
      stableClientKey('image-prepare', title, bytes, contentType),
    ),
  });
}

export function normalizePaidProof(value = {}) {
  const proof = value && typeof value === 'object' ? value : {};

  const normalized = {
    txid: stringValue(proof.txid, proof.tx_id, proof.hold_id, proof.id),
    receipt_hash: stringValue(proof.receipt_hash, proof.receiptHash, proof.hash),
    from: stringValue(proof.from, proof.payer, proof.payer_account),
    to: stringValue(proof.to, proof.escrow, proof.escrow_account),
    amount_minor: stringValue(proof.amount_minor, proof.amountMinor, proof.estimate_minor),
    asset: stringValue(proof.asset, 'roc').toLowerCase(),
    op: stringValue(proof.op, 'hold').toLowerCase(),
    idem: stringValue(proof.idem, proof.idempotency_key, proof.idempotencyKey),
  };

  if (
    !normalized.txid ||
    !normalized.receipt_hash ||
    !normalized.from ||
    !normalized.to ||
    !/^[0-9]+$/.test(normalized.amount_minor) ||
    normalized.amount_minor === '0'
  ) {
    throw assetMutationError(
      'Image upload requires a wallet hold proof with txid, receipt_hash, payer, escrow, and positive amount.',
      'missing_paid_hold_proof',
    );
  }

  return Object.freeze(normalized);
}

export function extractImageAssetUrl(data = {}) {
  const object = data && typeof data === 'object' ? data : {};

  return stringValue(
    object.crab_url,
    object.crabUrl,
    object.asset_crab_url,
    object.assetCrabUrl,
    object.links?.crab,
    object.asset?.crab_url,
    object.asset?.crabUrl,
    object.result?.crab_url,
    object.result?.crabUrl,
  );
}

export function extractImageAssetCid(data = {}) {
  const object = data && typeof data === 'object' ? data : {};

  return stringValue(
    object.asset_cid,
    object.assetCid,
    object.cid,
    object.asset?.cid,
    object.asset?.asset_cid,
    object.result?.asset_cid,
  );
}

function imageUploadHeaders({ file, title, description, tags, paidProof, idempotencyKey }) {
  return stripUndefined({
    'Content-Type': stringValue(file?.type, 'image/png'),
    'idempotency-key': idempotencyKey,
    'x-ron-paid-op': paidProof.op || 'hold',
    'x-ron-paid-asset': paidProof.asset || 'roc',
    'x-ron-paid-estimate-minor': paidProof.amount_minor,
    'x-ron-wallet-txid': paidProof.txid,
    'x-ron-wallet-receipt-hash': paidProof.receipt_hash,
    'x-ron-wallet-from': paidProof.from,
    'x-ron-wallet-to': paidProof.to,
    'x-ron-asset-title': stringValue(title),
    'x-ron-asset-description': stringValue(description),
    'x-ron-asset-tags': normalizeTags(tags).join(','),
  });
}

function validateAssetPageResponse(data, context) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    const error = new Error('Gateway returned a malformed asset response instead of an asset page JSON object.');
    error.name = 'AssetMalformedResponseError';
    error.problemCode = 'malformed_response';
    error.reason = 'malformed_response';
    error.status = Number(context?.response?.status || 0);
    error.retryable = false;
    error.data = data ?? null;
    error.correlationId = String(context?.response?.correlationId || '');
    throw error;
  }
}

function buildResolvedAsset({ target, response, data, source, attempts }) {
  return Object.freeze({
    ok: true,
    source,
    target,
    response: Object.freeze({
      status: response?.status || 0,
      route: response?.route || '',
      correlationId: response?.correlationId || '',
    }),
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
    message: 'Gateway returned an asset response.',
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
    reason: String(error?.reason || error?.problemCode || error?.name || 'request_failed'),
    message: String(error?.message || 'Gateway request failed.'),
    correlationId: String(error?.correlationId || ''),
    retryable: Boolean(error?.retryable),
  };
}

function makeAssetResolveError({ target, attempts, primaryError, fallbackError, problemCode = '' }) {
  const classified = problemCode || classifyProblem({ attempts, primaryError, fallbackError });
  const status = bestStatus(attempts, fallbackError, primaryError);
  const retryable = Boolean(
    fallbackError?.retryable ||
      primaryError?.retryable ||
      attempts.some((attempt) => attempt.retryable),
  );

  const message =
    messageForProblem(classified, target) ||
    fallbackError?.message ||
    primaryError?.message ||
    `Unable to resolve ${target?.assetUrl || 'this asset'} through the configured gateway.`;

  return new AssetResolveError(message, {
    problemCode: classified,
    reason: reasonForProblem(classified, fallbackError, primaryError),
    status,
    retryable,
    target,
    attempts,
    primaryError,
    fallbackError,
    data: fallbackError?.data || primaryError?.data || null,
    correlationId: correlationFromAttempts(attempts),
  });
}

function classifyProblem({ attempts = [], primaryError = null, fallbackError = null }) {
  const all = [
    ...(Array.isArray(attempts) ? attempts : []),
    primaryError,
    fallbackError,
  ].filter(Boolean);

  if (all.some((item) => item?.problemCode === 'invalid_asset_hash' || item?.reason === 'invalid_hash')) {
    return 'invalid_asset_hash';
  }

  if (
    all.some((item) =>
      includesAny(reasonText(item), [
        'unsupported_asset_kind',
        'unsupported_kind',
        'invalid_asset_kind',
        'unknown_asset_kind',
      ]),
    )
  ) {
    return 'unsupported_kind';
  }

  if (all.some((item) => item?.problemCode === 'malformed_response' || item?.reason === 'malformed_response')) {
    return 'malformed_response';
  }

  if (
    all.some((item) =>
      includesAny(reasonText(item), ['policy', 'forbidden', 'denied', 'capability', 'unauthorized']),
    ) ||
    all.some((item) => Number(item?.status || 0) === 401 || Number(item?.status || 0) === 403)
  ) {
    return 'policy_denied';
  }

  if (attempts.length > 0 && attempts.every((attempt) => Number(attempt.status || 0) === 404)) {
    return 'asset_not_found';
  }

  if (all.some((item) => Number(item?.status || 0) === 404)) {
    return 'asset_not_found';
  }

  if (
    attempts.length > 0 &&
    attempts.every((attempt) => Number(attempt.status || 0) === 0) &&
    attempts.some((attempt) => includesAny(reasonText(attempt), ['network_error', 'timeout', 'failed to fetch']))
  ) {
    return 'gateway_unreachable';
  }

  if (all.some((item) => Number(item?.status || 0) >= 500)) {
    return 'gateway_upstream_unavailable';
  }

  if (all.some((item) => includesAny(reasonText(item), ['network_error', 'timeout', 'aborterror']))) {
    return 'gateway_unreachable';
  }

  return 'asset_resolve_failed';
}

function titleForProblem(problemCode) {
  const titles = {
    gateway_unconfigured: 'Gateway is not configured',
    gateway_unreachable: 'Gateway unreachable',
    gateway_upstream_unavailable: 'Gateway or upstream unavailable',
    asset_not_found: 'Asset not found',
    policy_denied: 'Policy denied this asset',
    unsupported_kind: 'Unsupported asset kind',
    invalid_asset_hash: 'Invalid asset hash',
    invalid_asset_route: 'Invalid asset route',
    malformed_response: 'Malformed asset response',
    asset_resolve_failed: 'Asset could not be resolved',
  };

  return titles[problemCode] || titles.asset_resolve_failed;
}

function copyForProblem(problemCode) {
  const copies = {
    gateway_unconfigured:
      'CrabLink does not have a gateway client for this route. Check the gateway settings before resolving typed assets.',
    gateway_unreachable:
      'CrabLink could not reach the configured gateway before the request failed or timed out.',
    gateway_upstream_unavailable:
      'The gateway answered, but one of the backend services needed for asset hydration appears unavailable.',
    asset_not_found:
      'The gateway could not find a manifest, object, or hydrated asset page for this canonical typed asset route.',
    policy_denied:
      'The gateway or policy layer refused this asset request. CrabLink will not bypass that decision.',
    unsupported_kind:
      'This typed crab asset suffix is not supported by the current gateway/parser contract.',
    invalid_asset_hash:
      'Typed asset routes require a canonical 64-character lowercase BLAKE3 hash.',
    invalid_asset_route:
      'The route could not be normalized into a safe typed crab asset target.',
    malformed_response:
      'The gateway returned data, but it was not the expected asset page JSON object.',
    asset_resolve_failed:
      'The gateway did not return a hydrated asset response. CrabLink shows the failure instead of inventing local asset truth.',
  };

  return copies[problemCode] || copies.asset_resolve_failed;
}

function remediationForProblem(problemCode) {
  const remediations = {
    gateway_unconfigured: 'Open settings and confirm the gateway URL points at svc-gateway.',
    gateway_unreachable:
      'Start the local RustyOnions stack, confirm /healthz and /readyz, then retry this route.',
    gateway_upstream_unavailable:
      'Check svc-gateway, omnigate, svc-index, and svc-storage readiness, then retry.',
    asset_not_found:
      'Confirm the asset exists in the current local stack or republish/regenerate the dev asset.',
    policy_denied:
      'Use an identity/capability that is allowed by policy, or treat this as a real denial.',
    unsupported_kind:
      'Use a supported asset suffix such as .image, or wait for backend support for this kind.',
    invalid_asset_hash:
      'Use crab://<64 lowercase hex>.<kind> or b3:<64 lowercase hex>.',
    invalid_asset_route:
      'Check the address bar value and retry with a canonical crab:// typed asset URL.',
    malformed_response:
      'Check the gateway route contract. This route should return an asset-page JSON object, not raw bytes or HTML.',
    asset_resolve_failed:
      'Retry after checking gateway readiness. The route debug panel keeps the exact attempts visible.',
  };

  return remediations[problemCode] || remediations.asset_resolve_failed;
}

function messageForProblem(problemCode, target) {
  const assetUrl = target?.assetUrl || 'this typed asset';

  if (problemCode === 'asset_not_found') {
    return `${assetUrl} was not found by the configured gateway.`;
  }

  if (problemCode === 'policy_denied') {
    return `${assetUrl} was denied by gateway or policy checks.`;
  }

  if (problemCode === 'gateway_unreachable') {
    return `CrabLink could not reach the configured gateway while resolving ${assetUrl}.`;
  }

  if (problemCode === 'unsupported_kind') {
    return `${target?.assetKind || 'This asset kind'} is not supported by the current route contract.`;
  }

  return '';
}

function reasonForProblem(problemCode, fallbackError, primaryError) {
  return String(
    fallbackError?.reason ||
      fallbackError?.problemCode ||
      primaryError?.reason ||
      primaryError?.problemCode ||
      problemCode,
  );
}

function bestStatus(attempts = [], fallbackError = null, primaryError = null) {
  const fallbackStatus = Number(fallbackError?.status || 0);
  const primaryStatus = Number(primaryError?.status || 0);

  if (fallbackStatus) {
    return fallbackStatus;
  }

  if (primaryStatus) {
    return primaryStatus;
  }

  const lastAttempt = attempts
    .slice()
    .reverse()
    .find((attempt) => Number(attempt?.status || 0));

  return Number(lastAttempt?.status || 0);
}

function correlationFromAttempts(attempts = []) {
  const attempt = attempts
    .slice()
    .reverse()
    .find((item) => String(item?.correlationId || '').trim());

  return String(attempt?.correlationId || '');
}

function reasonText(item) {
  return `${item?.problemCode || ''} ${item?.reason || ''} ${item?.name || ''} ${item?.message || ''}`.toLowerCase();
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function targetError(message, details = {}) {
  const error = new Error(message);
  error.name = 'AssetTargetError';
  error.problemCode = details.problemCode || 'invalid_asset_route';
  error.reason = details.reason || error.problemCode;
  error.retryable = false;
  return error;
}

function assetMutationError(message, reason) {
  const error = new Error(String(message || 'Asset mutation failed.'));
  error.name = 'AssetMutationError';
  error.reason = reason || 'asset_mutation_failed';
  error.status = 0;
  error.retryable = false;
  return error;
}

function isBlobLike(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.size === 'number' &&
      typeof value.type === 'string' &&
      (typeof Blob === 'undefined' || value instanceof Blob),
  );
}

function positiveInteger(value) {
  const n = Number(value);

  if (!Number.isSafeInteger(n) || n <= 0) {
    return 0;
  }

  return n;
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 24);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
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

function stripUndefined(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => child !== undefined && child !== null && child !== ''),
  );
}

function stableClientKey(...parts) {
  const clean = parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(':')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9:_./-]+/g, '-')
    .slice(0, 180);

  return `crablink-react:${clean || Date.now()}`;
}