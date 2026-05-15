/**
 * RO:WHAT — Gateway-only client for crab://<hash>.comment prepare/publish flows.
 * RO:WHY — Keeps CrabLink aligned with the strict Omnigate comment DTO after backend .comment routes landed.
 * RO:INTERACTS — CommentPublishFlow.jsx, gatewayClient.js, walletClient.js, svc-gateway /assets/comment/prepare and /assets/comment.
 * RO:INVARIANTS — no fake CIDs; no fake receipts; no direct storage/index/wallet/ledger calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating publish requires caller-supplied paid hold proof; JSON body is sent only to configured svc-gateway.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://comment prepare/hold/publish smoke.
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
        'Content-Type': COMMENT_CONTENT_TYPE,
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
        stableIdempotencyKey(
          'comment-publish',
          proof.txid,
          proof.receipt_hash,
          body.title,
          body.site_context_crab_url,
          body.parent_crab_url,
        ),
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
    if (body.body) headers['x-ron-asset-description'] = body.body.slice(0, 240);
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
        title: body.title || '',
        site: body.site_context_crab_url || '',
        target: body.parent_crab_url || '',
        bytes: measureJsonBytes(body),
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
      throw makeCommentAssetError(
        'Comment asset request requires the configured gateway client.',
        'missing_gateway_client',
      );
    }
  }
}

export function normalizeCommentPrepareRequest(payload = {}) {
  return normalizeStrictCommentRequest(payload, 'comment-prepare');
}

export function normalizeCommentPublishRequest(payload = {}) {
  return normalizeStrictCommentRequest(payload, 'comment-publish');
}

/**
 * Build the exact DTO accepted by Omnigate TextAssetRequest for .comment.
 *
 * Do not include local manifest/debug fields here. The Rust route uses strict
 * JSON and intentionally rejects unknown fields.
 *
 * Accepted fields are:
 * title, body, site_context_crab_url, parent_crab_url,
 * thread_context_crab_url, creator_display, language, comment_kind,
 * visibility, rights_mode, moderation_mode, content_warning, tags,
 * payer_account, owner_passport_subject, client_idempotency_key.
 */
function normalizeStrictCommentRequest(payload = {}, scope = 'comment-prepare') {
  const title = stringValue(payload.title, payload.content?.title, 'Comment').slice(0, 180);
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
    payload.target_crab_url,
    payload.targetCrabUrl,
    payload.target,
    payload.parent,
    payload.relations?.target,
    payload.relations?.parent,
    payload.parent_reference?.crab_url,
    payload.parentReference?.crabUrl,
  );
  const thread = stringValue(
    payload.thread_context_crab_url,
    payload.threadContextCrabUrl,
    payload.thread,
    payload.relations?.thread,
    payload.thread_reference?.crab_url,
    payload.threadReference?.crabUrl,
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
  const commentKind = stringValue(
    payload.comment_kind,
    payload.commentKind,
    payload.text_kind,
    payload.textKind,
    payload.metadata?.comment_kind,
    payload.metadata?.commentKind,
    'reply',
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
    normalizeCommentContentEnvelope({
      title,
      body,
      language,
      commentKind,
      contentWarning,
      tags,
      site,
      parent,
      thread,
    }),
  );
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey(scope, payerAccount, ownerPassport, bytes, title, site, parent),
    scope,
  );

  if (!body) {
    throw makeCommentAssetError('Comment request requires a non-empty body.', 'missing_comment_body');
  }

  if (!site) {
    throw makeCommentAssetError('Comment request requires a site context crab URL.', 'missing_site_connection');
  }

  if (!parent) {
    throw makeCommentAssetError('Comment request requires a parent/target crab URL.', 'missing_comment_target');
  }

  if (!payerAccount) {
    throw makeCommentAssetError('Comment request requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeCommentAssetError('Comment request requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    title,
    body,
    site_context_crab_url: site,
    parent_crab_url: parent,
    thread_context_crab_url: thread || undefined,
    creator_display: creatorDisplay || undefined,
    language,
    comment_kind: commentKind,
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

export function normalizeCommentContentEnvelope({
  title,
  body,
  language,
  commentKind,
  contentWarning,
  tags,
  site,
  parent,
  thread,
}) {
  return stripEmpty({
    schema: 'ron.comment-content.v1',
    kind: 'comment',
    asset_kind: 'comment',
    format: 'text/plain; charset=utf-8',
    title: stringValue(title, 'Comment'),
    body: stringValue(body),
    metadata: stripEmpty({
      comment_kind: stringValue(commentKind, 'reply'),
      language: stringValue(language, 'en'),
      content_warning: stringValue(contentWarning) || undefined,
      tags: normalizeTags(tags),
    }),
    relations: stripEmpty({
      site: stringValue(site),
      target: stringValue(parent),
      parent: stringValue(parent),
      thread: stringValue(thread) || undefined,
    }),
    site_connection: stripEmpty({
      required: true,
      relation: 'comment_on_site',
      crab_url: stringValue(site),
    }),
    parent_reference: stripEmpty({
      relation: 'comment_parent',
      crab_url: stringValue(parent),
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
    source.links?.crab,
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

  const nested =
    objectValue(source.asset) ||
    objectValue(source.comment) ||
    objectValue(source.object) ||
    objectValue(source.manifest) ||
    objectValue(source.storage_upload);

  if (nested) {
    return extractCommentAssetCid(nested);
  }

  const link = stringValue(source.links?.crab);
  return normalizeCid(link);
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

  if (/^crab:\/\/[0-9a-f]{64}\.comment$/i.test(raw)) {
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

function makeCommentAssetError(message, reason = 'comment_asset_client_error') {
  const error = new Error(message);
  error.name = 'CommentAssetClientError';
  error.reason = reason;
  error.code = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}