/**
 * RO:WHAT — Gateway-only client for crab://<hash>.post prepare/publish flows.
 * RO:WHY — Keeps CrabLink aligned with the strict Omnigate post DTO instead of sending local manifest/debug fields.
 * RO:INTERACTS — PostPublishFlow.jsx, gatewayClient.js, walletClient.js, svc-gateway /assets/post/prepare and /assets/post.
 * RO:INVARIANTS — no fake CIDs; no fake receipts; no direct storage/index/wallet/ledger calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating publish requires caller-supplied paid hold proof; JSON body is sent only to configured svc-gateway.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://post prepare/hold/publish smoke.
 */

import { normalizePaidProof } from './assetClient.js';
import { compactIdempotencyKey, stableIdempotencyKey } from './walletClient.js';

const POST_CONTENT_TYPE = 'application/json; charset=utf-8';

export function createPostAssetClient(gateway) {
  return new PostAssetClient(gateway);
}

export class PostAssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async preparePost(payload = {}) {
    this.assertGateway();

    const request = normalizePostPrepareRequest(payload);

    return this.gateway.request('/assets/post/prepare', {
      method: 'POST',
      body: request,
      label: 'Post prepare',
      mutation: true,
      headers: {
        'Content-Type': POST_CONTENT_TYPE,
        'Idempotency-Key': request.client_idempotency_key,
      },
      idempotencyKey: request.client_idempotency_key,
    });
  }

  async publishPost({ request = {}, paidProof = {}, idempotencyKey = '' } = {}) {
    this.assertGateway();

    const body = normalizePostPublishRequest(request);
    const proof = normalizePaidProof(paidProof);
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        body.client_idempotency_key ||
        stableIdempotencyKey(
          'post-publish',
          proof.txid,
          proof.receipt_hash,
          body.title,
          body.site_context_crab_url,
        ),
      'post-publish',
    );

    const headers = {
      'Content-Type': POST_CONTENT_TYPE,
      'Idempotency-Key': idem,
      'x-ron-paid-op': proof.op || 'hold',
      'x-ron-paid-asset': proof.asset || 'roc',
      'x-ron-paid-estimate-minor': proof.amount_minor,
      'x-ron-wallet-txid': proof.txid,
      'x-ron-wallet-receipt-hash': proof.receipt_hash,
      'x-ron-wallet-from': proof.from,
      'x-ron-wallet-to': proof.to,
      'x-ron-asset-kind': 'post',
    };

    if (body.title) headers['x-ron-asset-title'] = body.title;
    if (body.body) headers['x-ron-asset-description'] = body.body.slice(0, 240);
    if (Array.isArray(body.tags) && body.tags.length > 0) {
      headers['x-ron-asset-tags'] = body.tags.join(',');
    }

    const response = await this.gateway.request('/assets/post', {
      method: 'POST',
      body,
      label: 'Post publish',
      mutation: true,
      parseAs: 'json',
      headers,
      idempotencyKey: idem,
    });

    const data = response?.data || response || {};
    const assetUrl = extractPostAssetUrl(data);
    const assetCid = extractPostAssetCid(data);

    return {
      ...response,
      request: {
        route: '/assets/post',
        content_type: POST_CONTENT_TYPE,
        title: body.title,
        site: body.site_context_crab_url || '',
        bytes: measureJsonBytes(body),
        headers: redactProofHeaders(headers),
        idempotency_key: idem,
      },
      paidProof: proof,
      postAssetUrl: assetUrl,
      postAssetCid: assetCid,
    };
  }

  assertGateway() {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw makePostAssetError(
        'Post asset request requires the configured gateway client.',
        'missing_gateway_client',
      );
    }
  }
}

export function normalizePostPrepareRequest(payload = {}) {
  return normalizeStrictPostRequest(payload, 'post-prepare');
}

export function normalizePostPublishRequest(payload = {}) {
  return normalizeStrictPostRequest(payload, 'post-publish');
}

/**
 * Build the exact DTO accepted by Omnigate `PostAssetRequest`.
 *
 * Do not add local manifest/debug fields here. The Rust route uses strict JSON
 * and intentionally rejects unknown fields. Accepted fields are:
 *
 * title, body, site_context_crab_url, parent_crab_url, creator_display,
 * language, post_kind, visibility, rights_mode, moderation_mode,
 * content_warning, tags, payer_account, owner_passport_subject,
 * client_idempotency_key.
 */
function normalizeStrictPostRequest(payload = {}, scope = 'post-prepare') {
  const title = stringValue(payload.title, payload.content?.title, 'Untitled post').slice(0, 180);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(
    payload.site_context_crab_url,
    payload.siteContextCrabUrl,
    payload.site,
    payload.relations?.site,
    payload.site_connection?.crab_url,
    payload.siteConnection?.crabUrl,
  );
  const parent = stringValue(
    payload.parent_crab_url,
    payload.parentCrabUrl,
    payload.parent,
    payload.relations?.parent,
    payload.parent_reference?.crab_url,
    payload.parentReference?.crabUrl,
  );
  const payerAccount = stringValue(
    payload.payer_account,
    payload.payerAccount,
    payload.wallet_account,
    payload.walletAccount,
    payload.from,
  );
  const ownerPassport = stringValue(
    payload.owner_passport_subject,
    payload.ownerPassportSubject,
    payload.passportSubject,
    payload.passport,
  );
  const creatorDisplay = stringValue(
    payload.creator_display,
    payload.creatorDisplay,
    payload.creator,
    payload.author,
  );
  const language = stringValue(payload.language, payload.metadata?.language, 'en');
  const postKind = stringValue(
    payload.post_kind,
    payload.postKind,
    payload.metadata?.post_kind,
    payload.metadata?.postKind,
    'short_text',
  );
  const visibility = stringValue(
    payload.visibility,
    payload.metadata?.visibility,
    'public_preview',
  );
  const rightsMode = stringValue(
    payload.rights_mode,
    payload.rightsMode,
    payload.metadata?.rights_mode,
    payload.metadata?.rightsMode,
    'creator_owned_original',
  );
  const moderationMode = stringValue(
    payload.moderation_mode,
    payload.moderationMode,
    payload.metadata?.moderation_mode,
    payload.metadata?.moderationMode,
    'site_policy_or_creator_default',
  );
  const contentWarning = stringValue(
    payload.content_warning,
    payload.contentWarning,
    payload.metadata?.content_warning,
    payload.metadata?.contentWarning,
  );
  const tags = normalizeTags(payload.tags || payload.metadata?.tags);
  const bytes = measureJsonBytes(
    normalizePostContentEnvelope({
      title,
      body,
      language,
      postKind,
      contentWarning,
      tags,
      site,
      parent,
    }),
  );
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey(scope, payerAccount, ownerPassport, bytes, title, site),
    scope,
  );

  if (!body) {
    throw makePostAssetError('Post request requires a non-empty body.', 'missing_post_body');
  }

  if (!site) {
    throw makePostAssetError('Post request requires a site connection crab URL.', 'missing_site_connection');
  }

  if (!payerAccount) {
    throw makePostAssetError('Post request requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makePostAssetError('Post request requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    title,
    body,
    site_context_crab_url: site,
    parent_crab_url: parent || undefined,
    creator_display: creatorDisplay || undefined,
    language,
    post_kind: postKind,
    visibility,
    rights_mode: rightsMode,
    moderation_mode: moderationMode,
    content_warning: contentWarning || undefined,
    tags,
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    client_idempotency_key: idempotency,
  });
}

export function normalizePostContentEnvelope({
  title,
  body,
  language,
  postKind,
  contentWarning,
  tags,
  site,
  parent,
}) {
  return stripEmpty({
    schema: 'ron.text-asset.v1',
    kind: 'post',
    format: 'text/plain; charset=utf-8',
    title: stringValue(title, 'Untitled post'),
    body: stringValue(body),
    metadata: stripEmpty({
      post_kind: stringValue(postKind, 'short_text'),
      language: stringValue(language, 'en'),
      content_warning: stringValue(contentWarning) || undefined,
      tags: normalizeTags(tags),
    }),
    relations: stripEmpty({
      site: stringValue(site),
      parent: stringValue(parent) || undefined,
    }),
  });
}

export function measureJsonBytes(value) {
  const json = JSON.stringify(value || {});

  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length;
  }

  try {
    return new Blob([json], { type: POST_CONTENT_TYPE }).size;
  } catch (_error) {
    return json.length;
  }
}

export function extractPostAssetUrl(data = {}) {
  const source = unwrapData(data);
  const direct = stringValue(
    source.crab_url,
    source.crabUrl,
    source.asset_url,
    source.assetUrl,
    source.post_url,
    source.postUrl,
    source.url,
    source.links?.crab,
  );

  if (/^crab:\/\/[0-9a-f]{64}\.post$/i.test(direct)) {
    return direct.toLowerCase();
  }

  const cid = extractPostAssetCid(source);

  if (cid?.startsWith('b3:')) {
    return `crab://${cid.slice(3)}.post`;
  }

  return '';
}

export function extractPostAssetCid(data = {}) {
  const source = unwrapData(data);
  const direct = stringValue(
    source.cid,
    source.content_id,
    source.contentId,
    source.post_cid,
    source.postCid,
    source.asset_cid,
    source.assetCid,
    source.b3,
    source.hash,
    source.digest,
  );
  const normalized = normalizeCid(direct);

  if (normalized) {
    return normalized;
  }

  const nested =
    objectValue(source.asset) ||
    objectValue(source.post) ||
    objectValue(source.object) ||
    objectValue(source.manifest) ||
    objectValue(source.storage_upload);

  if (nested) {
    return extractPostAssetCid(nested);
  }

  return '';
}

function unwrapData(data = {}) {
  return data?.data && typeof data.data === 'object' ? data.data : data || {};
}

function redactProofHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => {
      if (key.toLowerCase().includes('receipt') || key.toLowerCase().includes('txid')) {
        const raw = String(value || '');
        return [key, raw.length > 16 ? `${raw.slice(0, 8)}…${raw.slice(-6)}` : raw];
      }

      return [key, value];
    }),
  );
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag || '').trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 24);
  }

  return String(value || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeCid(value) {
  const raw = stringValue(value);

  if (/^b3:[0-9a-f]{64}$/i.test(raw)) {
    return raw.toLowerCase();
  }

  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return `b3:${raw.toLowerCase()}`;
  }

  if (/^crab:\/\/[0-9a-f]{64}\.post$/i.test(raw)) {
    return `b3:${raw.slice('crab://'.length, 'crab://'.length + 64).toLowerCase()}`;
  }

  return '';
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
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

function stripEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null || child === '') {
        return false;
      }

      if (Array.isArray(child)) {
        return child.length > 0;
      }

      if (child && typeof child === 'object') {
        return Object.keys(child).length > 0;
      }

      return true;
    }),
  );
}

function makePostAssetError(message, code = 'post_asset_error') {
  const error = new Error(message);
  error.code = code;
  error.kind = code;
  return error;
}