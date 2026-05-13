/**
 * RO:WHAT — Gateway-only client for future crab://<hash>.post publish flows.
 * RO:WHY — Lets CrabLink wire the post page to the same prepare → hold → publish shape proven by image/site without pretending backend support exists.
 * RO:INTERACTS — PostPublishFlow.jsx, gatewayClient.js, walletClient.js, future svc-gateway /assets/post routes.
 * RO:INVARIANTS — no fake CIDs; no fake receipts; no direct storage/index/wallet/ledger calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating publish requires caller-supplied paid hold proof; JSON body is sent only to configured svc-gateway.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://post prepare/hold/publish smoke after backend routes exist.
 */

import { normalizePaidProof } from './assetClient.js';
import { compactIdempotencyKey, stableIdempotencyKey } from './walletClient.js';

const MAX_IDEMPOTENCY_KEY_BYTES = 64;
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
        stableIdempotencyKey('post-publish', proof.txid, proof.receipt_hash, body.title, body.relations?.site),
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
    if (body.summary) headers['x-ron-asset-description'] = body.summary;
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
        site: body.relations?.site || '',
        bytes: body.bytes || measureJsonBytes(body.content),
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
      throw makePostAssetError('Post asset request requires the configured gateway client.', 'missing_gateway_client');
    }
  }
}

export function normalizePostPrepareRequest(payload = {}) {
  const title = stringValue(payload.title, 'Untitled post').slice(0, 160);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(payload.site_context_crab_url, payload.siteContextCrabUrl, payload.site, payload.relations?.site);
  const parent = stringValue(payload.parent_crab_url, payload.parentCrabUrl, payload.parent, payload.relations?.parent);
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
    payload.passport,
    payload.passportSubject,
  );
  const tags = normalizeTags(payload.tags);
  const content = normalizePostContentEnvelope({
    title,
    body,
    language: payload.language,
    postKind: payload.post_kind || payload.postKind,
    contentWarning: payload.content_warning || payload.contentWarning,
    tags,
    site,
    parent,
  });
  const bytes = normalizePositiveInteger(payload.bytes, payload.content_bytes, payload.contentBytes) || String(measureJsonBytes(content));
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('post-prepare', payerAccount, ownerPassport, bytes, title, site),
    'post-prepare',
  );

  if (!body) {
    throw makePostAssetError('Post prepare requires a non-empty body.', 'missing_post_body');
  }

  if (!site) {
    throw makePostAssetError('Post prepare requires a site connection crab URL.', 'missing_site_connection');
  }

  if (!payerAccount) {
    throw makePostAssetError('Post prepare requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makePostAssetError('Post prepare requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    schema: 'crablink.post-prepare.v1',
    asset_kind: 'post',
    bytes: Number(bytes),
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    content_type: POST_CONTENT_TYPE,
    title,
    body_preview: body.slice(0, 280),
    tags,
    site_context_crab_url: site,
    parent_crab_url: parent || undefined,
    relations: stripEmpty({
      site,
      parent: parent || undefined,
    }),
    client_idempotency_key: idempotency,
  });
}

export function normalizePostPublishRequest(payload = {}) {
  const title = stringValue(payload.title, payload.content?.title, 'Untitled post').slice(0, 160);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(payload.site_context_crab_url, payload.siteContextCrabUrl, payload.site, payload.relations?.site);
  const parent = stringValue(payload.parent_crab_url, payload.parentCrabUrl, payload.parent, payload.relations?.parent);
  const payerAccount = stringValue(payload.payer_account, payload.payerAccount, payload.wallet_account, payload.walletAccount, payload.from);
  const ownerPassport = stringValue(payload.owner_passport_subject, payload.ownerPassportSubject, payload.passportSubject, payload.passport);
  const tags = normalizeTags(payload.tags || payload.metadata?.tags);
  const language = stringValue(payload.language, payload.metadata?.language, 'en');
  const postKind = stringValue(payload.post_kind, payload.postKind, payload.metadata?.post_kind, payload.metadata?.postKind, 'short_text');
  const contentWarning = stringValue(payload.content_warning, payload.contentWarning, payload.metadata?.content_warning, payload.metadata?.contentWarning);
  const content = normalizePostContentEnvelope({
    title,
    body,
    language,
    postKind,
    contentWarning,
    tags,
    site,
    parent,
  });
  const bytes = Number(normalizePositiveInteger(payload.bytes, payload.content_bytes, payload.contentBytes) || measureJsonBytes(content));
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('post-publish', payerAccount, ownerPassport, bytes, title, site),
    'post-publish',
  );

  if (!body) {
    throw makePostAssetError('Post publish requires a non-empty body.', 'missing_post_body');
  }

  if (!site) {
    throw makePostAssetError('Post publish requires a site connection crab URL.', 'missing_site_connection');
  }

  if (!payerAccount) {
    throw makePostAssetError('Post publish requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makePostAssetError('Post publish requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    schema: 'crablink.post-publish-request.v1',
    asset_kind: 'post',
    content_type: POST_CONTENT_TYPE,
    bytes,
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    title,
    summary: stringValue(payload.summary, payload.description, payload.manifest_draft?.metadata?.body_preview),
    body,
    tags,
    metadata: stripEmpty({
      post_kind: postKind,
      language,
      content_warning: contentWarning || undefined,
      body_preview: body.slice(0, 280),
    }),
    relations: stripEmpty({
      site,
      parent: parent || undefined,
    }),
    site_context_crab_url: site,
    parent_crab_url: parent || undefined,
    content,
    manifest_hint: payload.manifest_hint || payload.manifestDraft || payload.manifest_draft || undefined,
    client_idempotency_key: idempotency,
  });
}

export function normalizePostContentEnvelope({ title, body, language, postKind, contentWarning, tags, site, parent }) {
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

  const nested = objectValue(source.asset) || objectValue(source.post) || objectValue(source.object) || objectValue(source.manifest);

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
    return value.map((tag) => String(tag || '').trim().replace(/^#/, '')).filter(Boolean).slice(0, 24);
  }

  return String(value || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 24);
}

function normalizeCid(value) {
  const hash = String(value || '')
    .trim()
    .replace(/^b3:/i, '')
    .toLowerCase();

  return /^[0-9a-f]{64}$/.test(hash) ? `b3:${hash}` : '';
}

function normalizePositiveInteger(...values) {
  for (const value of values) {
    const raw = String(value ?? '').trim();

    if (/^[0-9]+$/.test(raw) && raw !== '0') {
      return raw;
    }

    const n = Number(raw);
    if (Number.isSafeInteger(n) && n > 0) {
      return String(n);
    }
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
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      if (Array.isArray(child) && child.length === 0) return false;
      return true;
    }),
  );
}

function makePostAssetError(message, reason = 'post_asset_client_error') {
  const error = new Error(message);
  error.name = 'PostAssetClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}