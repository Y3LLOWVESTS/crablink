/**
 * RO:WHAT — Gateway-only client for future crab://<hash>.comment publish flows.
 * RO:WHY — Lets CrabLink wire the comment page to the same prepare → hold → publish shape proven by image/site/post without pretending backend support exists.
 * RO:INTERACTS — CommentPublishFlow.jsx, gatewayClient.js, walletClient.js, future svc-gateway /assets/comment routes.
 * RO:INVARIANTS — no fake CIDs; no fake receipts; no direct storage/index/wallet/ledger calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating publish requires caller-supplied paid hold proof; JSON body is sent only to configured svc-gateway.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://comment prepare/hold/publish smoke after backend routes exist.
 */

import { normalizePaidProof } from './assetClient.js';
import { compactIdempotencyKey, stableIdempotencyKey } from './walletClient.js';

const COMMENT_CONTENT_TYPE = 'application/json; charset=utf-8';

export function createCommentAssetClient(gateway) {
  return new CommentAssetClient(gateway);
}

export class CommentAssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async prepareComment(payload = {}) {
    this.assertGateway();

    const request = normalizeCommentPrepareRequest(payload);

    return this.gateway.request('/assets/comment/prepare', {
      method: 'POST',
      body: request,
      label: 'Comment prepare',
      mutation: true,
      headers: {
        'Idempotency-Key': request.client_idempotency_key,
      },
      idempotencyKey: request.client_idempotency_key,
    });
  }

  async publishComment({ request = {}, paidProof = {}, idempotencyKey = '' } = {}) {
    this.assertGateway();

    const body = normalizeCommentPublishRequest(request);
    const proof = normalizePaidProof(paidProof);
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        body.client_idempotency_key ||
        stableIdempotencyKey('comment-publish', proof.txid, proof.receipt_hash, body.title, body.relations?.target),
      'comment-publish',
    );

    const headers = {
      'Content-Type': COMMENT_CONTENT_TYPE,
      'Idempotency-Key': idem,
      'x-ron-paid-op': proof.op || 'hold',
      'x-ron-paid-asset': proof.asset || 'roc',
      'x-ron-paid-estimate-minor': proof.amount_minor,
      'x-ron-wallet-txid': proof.txid,
      'x-ron-wallet-receipt-hash': proof.receipt_hash,
      'x-ron-wallet-from': proof.from,
      'x-ron-wallet-to': proof.to,
      'x-ron-asset-kind': 'comment',
    };

    if (body.title) headers['x-ron-asset-title'] = body.title;
    if (body.summary) headers['x-ron-asset-description'] = body.summary;
    if (Array.isArray(body.tags) && body.tags.length > 0) {
      headers['x-ron-asset-tags'] = body.tags.join(',');
    }

    const response = await this.gateway.request('/assets/comment', {
      method: 'POST',
      body,
      label: 'Comment publish',
      mutation: true,
      parseAs: 'json',
      headers,
      idempotencyKey: idem,
    });

    const data = response?.data || response || {};
    const assetUrl = extractCommentAssetUrl(data);
    const assetCid = extractCommentAssetCid(data);

    return {
      ...response,
      request: {
        route: '/assets/comment',
        content_type: COMMENT_CONTENT_TYPE,
        title: body.title,
        site: body.relations?.site || '',
        target: body.relations?.target || '',
        bytes: body.bytes || measureJsonBytes(body.content),
        headers: redactProofHeaders(headers),
        idempotency_key: idem,
      },
      paidProof: proof,
      commentAssetUrl: assetUrl,
      commentAssetCid: assetCid,
    };
  }

  assertGateway() {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw makeCommentAssetError('Comment asset request requires the configured gateway client.', 'missing_gateway_client');
    }
  }
}

export function normalizeCommentPrepareRequest(payload = {}) {
  const title = stringValue(payload.title, 'Untitled comment').slice(0, 160);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(payload.site_context_crab_url, payload.siteContextCrabUrl, payload.site, payload.relations?.site);
  const target = stringValue(
    payload.parent_crab_url,
    payload.parentCrabUrl,
    payload.target_crab_url,
    payload.targetCrabUrl,
    payload.target,
    payload.parent,
    payload.relations?.target,
    payload.relations?.parent,
  );
  const thread = stringValue(payload.thread_context_crab_url, payload.threadContextCrabUrl, payload.thread, payload.relations?.thread);
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
  const content = normalizeCommentContentEnvelope({
    title,
    body,
    language: payload.language,
    commentKind: payload.comment_kind || payload.commentKind,
    contentWarning: payload.content_warning || payload.contentWarning,
    tags,
    site,
    target,
    thread,
  });
  const bytes = normalizePositiveInteger(payload.bytes, payload.content_bytes, payload.contentBytes) || String(measureJsonBytes(content));
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('comment-prepare', payerAccount, ownerPassport, bytes, title, site, target),
    'comment-prepare',
  );

  if (!body) {
    throw makeCommentAssetError('Comment prepare requires a non-empty body.', 'missing_comment_body');
  }

  if (!site) {
    throw makeCommentAssetError('Comment prepare requires a site context crab URL.', 'missing_site_connection');
  }

  if (!target) {
    throw makeCommentAssetError('Comment prepare requires a parent post/comment crab URL.', 'missing_comment_target');
  }

  if (!payerAccount) {
    throw makeCommentAssetError('Comment prepare requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeCommentAssetError('Comment prepare requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    schema: 'crablink.comment-prepare.v1',
    asset_kind: 'comment',
    bytes: Number(bytes),
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    content_type: COMMENT_CONTENT_TYPE,
    title,
    body_preview: body.slice(0, 280),
    tags,
    site_context_crab_url: site,
    target_crab_url: target,
    parent_crab_url: target,
    thread_context_crab_url: thread || undefined,
    relations: stripEmpty({
      site,
      target,
      parent: target,
      thread: thread || undefined,
    }),
    client_idempotency_key: idempotency,
  });
}

export function normalizeCommentPublishRequest(payload = {}) {
  const title = stringValue(payload.title, payload.content?.title, 'Untitled comment').slice(0, 160);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(payload.site_context_crab_url, payload.siteContextCrabUrl, payload.site, payload.relations?.site);
  const target = stringValue(
    payload.parent_crab_url,
    payload.parentCrabUrl,
    payload.target_crab_url,
    payload.targetCrabUrl,
    payload.target,
    payload.parent,
    payload.relations?.target,
    payload.relations?.parent,
  );
  const thread = stringValue(payload.thread_context_crab_url, payload.threadContextCrabUrl, payload.thread, payload.relations?.thread);
  const payerAccount = stringValue(payload.payer_account, payload.payerAccount, payload.wallet_account, payload.walletAccount, payload.from);
  const ownerPassport = stringValue(payload.owner_passport_subject, payload.ownerPassportSubject, payload.passportSubject, payload.passport);
  const tags = normalizeTags(payload.tags || payload.metadata?.tags);
  const language = stringValue(payload.language, payload.metadata?.language, 'en');
  const commentKind = stringValue(payload.comment_kind, payload.commentKind, payload.metadata?.comment_kind, payload.metadata?.commentKind, 'reply');
  const contentWarning = stringValue(payload.content_warning, payload.contentWarning, payload.metadata?.content_warning, payload.metadata?.contentWarning);
  const content = normalizeCommentContentEnvelope({
    title,
    body,
    language,
    commentKind,
    contentWarning,
    tags,
    site,
    target,
    thread,
  });
  const bytes = Number(normalizePositiveInteger(payload.bytes, payload.content_bytes, payload.contentBytes) || measureJsonBytes(content));
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('comment-publish', payerAccount, ownerPassport, bytes, title, site, target),
    'comment-publish',
  );

  if (!body) {
    throw makeCommentAssetError('Comment publish requires a non-empty body.', 'missing_comment_body');
  }

  if (!site) {
    throw makeCommentAssetError('Comment publish requires a site context crab URL.', 'missing_site_connection');
  }

  if (!target) {
    throw makeCommentAssetError('Comment publish requires a parent post/comment crab URL.', 'missing_comment_target');
  }

  if (!payerAccount) {
    throw makeCommentAssetError('Comment publish requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeCommentAssetError('Comment publish requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    schema: 'crablink.comment-publish-request.v1',
    asset_kind: 'comment',
    content_type: COMMENT_CONTENT_TYPE,
    bytes,
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    title,
    summary: stringValue(payload.summary, payload.description, payload.manifest_draft?.metadata?.body_preview),
    body,
    tags,
    metadata: stripEmpty({
      comment_kind: commentKind,
      language,
      content_warning: contentWarning || undefined,
      body_preview: body.slice(0, 280),
    }),
    relations: stripEmpty({
      site,
      target,
      parent: target,
      thread: thread || undefined,
    }),
    site_context_crab_url: site,
    target_crab_url: target,
    parent_crab_url: target,
    thread_context_crab_url: thread || undefined,
    content,
    manifest_hint: payload.manifest_hint || payload.manifestDraft || payload.manifest_draft || undefined,
    client_idempotency_key: idempotency,
  });
}

export function normalizeCommentContentEnvelope({ title, body, language, commentKind, contentWarning, tags, site, target, thread }) {
  return stripEmpty({
    schema: 'ron.text-asset.v1',
    kind: 'comment',
    format: 'text/plain; charset=utf-8',
    title: stringValue(title, 'Untitled comment'),
    body: stringValue(body),
    metadata: stripEmpty({
      comment_kind: stringValue(commentKind, 'reply'),
      language: stringValue(language, 'en'),
      content_warning: stringValue(contentWarning) || undefined,
      tags: normalizeTags(tags),
    }),
    relations: stripEmpty({
      site: stringValue(site),
      target: stringValue(target),
      parent: stringValue(target),
      thread: stringValue(thread) || undefined,
    }),
  });
}

export function measureJsonBytes(value) {
  const json = JSON.stringify(value || {});

  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length;
  }

  try {
    return new Blob([json], { type: COMMENT_CONTENT_TYPE }).size;
  } catch (_error) {
    return json.length;
  }
}

export function extractCommentAssetUrl(data = {}) {
  const source = unwrapData(data);
  const direct = stringValue(
    source.crab_url,
    source.crabUrl,
    source.asset_url,
    source.assetUrl,
    source.comment_url,
    source.commentUrl,
    source.url,
  );

  if (/^crab:\/\/[0-9a-f]{64}\.comment$/i.test(direct)) {
    return direct.toLowerCase();
  }

  const cid = extractCommentAssetCid(source);

  if (cid?.startsWith('b3:')) {
    return `crab://${cid.slice(3)}.comment`;
  }

  return '';
}

export function extractCommentAssetCid(data = {}) {
  const source = unwrapData(data);
  const direct = stringValue(
    source.cid,
    source.content_id,
    source.contentId,
    source.comment_cid,
    source.commentCid,
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

  const nested = objectValue(source.asset) || objectValue(source.comment) || objectValue(source.object) || objectValue(source.manifest);

  if (nested) {
    return extractCommentAssetCid(nested);
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

function makeCommentAssetError(message, reason = 'comment_asset_client_error') {
  const error = new Error(message);
  error.name = 'CommentAssetClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}