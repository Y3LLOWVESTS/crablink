/**
 * RO:WHAT — Gateway-only client for crab://<hash>.article prepare/publish flows.
 * RO:WHY — Keeps CrabLink aligned with the strict Omnigate article DTO instead of sending local manifest/debug fields.
 * RO:INTERACTS — ArticlePublishFlow.jsx, gatewayClient.js, walletClient.js, svc-gateway /assets/article/prepare and /assets/article.
 * RO:INVARIANTS — no fake CIDs; no fake receipts; no direct storage/index/wallet/ledger calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating publish requires caller-supplied paid hold proof; JSON body is sent only to configured svc-gateway.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://article prepare/hold/publish smoke.
 */

import { normalizePaidProof } from './assetClient.js';
import { compactIdempotencyKey, stableIdempotencyKey } from './walletClient.js';

const ARTICLE_CONTENT_TYPE = 'application/json; charset=utf-8';
const MAX_TITLE_CHARS = 180;
const MAX_SUBTITLE_CHARS = 220;
const MAX_SUMMARY_CHARS = 1000;

export function createArticleAssetClient(gateway) {
  return new ArticleAssetClient(gateway);
}

export class ArticleAssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async prepareArticle(payload = {}) {
    this.assertGateway();

    const request = normalizeArticlePrepareRequest(payload);

    return this.gateway.request('/assets/article/prepare', {
      method: 'POST',
      body: request,
      label: 'Article prepare',
      mutation: true,
      headers: {
        'Content-Type': ARTICLE_CONTENT_TYPE,
        'Idempotency-Key': request.client_idempotency_key,
      },
      idempotencyKey: request.client_idempotency_key,
    });
  }

  async publishArticle({ request = {}, paidProof = {}, idempotencyKey = '' } = {}) {
    this.assertGateway();

    const body = normalizeArticlePublishRequest(request);
    const proof = normalizePaidProof(paidProof);
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        body.client_idempotency_key ||
        stableIdempotencyKey(
          'article-publish',
          proof.txid,
          proof.receipt_hash,
          body.title,
          body.site_context_crab_url,
        ),
      'article-publish',
    );

    const headers = {
      'Content-Type': ARTICLE_CONTENT_TYPE,
      'Idempotency-Key': idem,
      'x-ron-paid-op': proof.op || 'hold',
      'x-ron-paid-asset': proof.asset || 'roc',
      'x-ron-paid-estimate-minor': proof.amount_minor,
      'x-ron-wallet-txid': proof.txid,
      'x-ron-wallet-receipt-hash': proof.receipt_hash,
      'x-ron-wallet-from': proof.from,
      'x-ron-wallet-to': proof.to,
      'x-ron-asset-kind': 'article',
    };

    if (body.title) headers['x-ron-asset-title'] = body.title;
    if (body.summary) headers['x-ron-asset-description'] = body.summary;
    if (Array.isArray(body.tags) && body.tags.length > 0) {
      headers['x-ron-asset-tags'] = body.tags.join(',');
    }

    const response = await this.gateway.request('/assets/article', {
      method: 'POST',
      body,
      label: 'Article publish',
      mutation: true,
      parseAs: 'json',
      headers,
      idempotencyKey: idem,
    });

    const data = response?.data || response || {};
    const assetUrl = extractArticleAssetUrl(data);
    const assetCid = extractArticleAssetCid(data);

    return {
      ...response,
      request: {
        route: '/assets/article',
        content_type: ARTICLE_CONTENT_TYPE,
        title: body.title,
        site: body.site_context_crab_url || '',
        bytes: measureJsonBytes(normalizeArticleContentEnvelope(body)),
        headers: redactProofHeaders(headers),
        idempotency_key: idem,
      },
      paidProof: proof,
      articleAssetUrl: assetUrl,
      articleAssetCid: assetCid,
    };
  }

  assertGateway() {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw makeArticleAssetError(
        'Article asset request requires the configured gateway client.',
        'missing_gateway_client',
      );
    }
  }
}

export function normalizeArticlePrepareRequest(payload = {}) {
  return normalizeStrictArticleRequest(payload, 'article-prepare');
}

export function normalizeArticlePublishRequest(payload = {}) {
  return normalizeStrictArticleRequest(payload, 'article-publish');
}

/**
 * Build the exact DTO accepted by Omnigate `TextAssetRequest` for articles.
 *
 * Do not add local manifest/debug fields here. The Rust route uses strict JSON
 * and intentionally rejects unknown fields. Accepted fields are:
 *
 * title, subtitle, summary, body, site_context_crab_url,
 * hero_image_crab_url, linked_source_crab_url, creator_display, language,
 * article_kind, visibility, rights_mode, moderation_mode, content_warning,
 * tags, payer_account, owner_passport_subject, client_idempotency_key.
 */
function normalizeStrictArticleRequest(payload = {}, scope = 'article-prepare') {
  const title = stringValue(payload.title, payload.content?.title).slice(0, MAX_TITLE_CHARS);
  const subtitle = stringValue(payload.subtitle, payload.content?.subtitle).slice(0, MAX_SUBTITLE_CHARS);
  const summary = stringValue(payload.summary, payload.description, payload.content?.summary).slice(0, MAX_SUMMARY_CHARS);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(
    payload.site_context_crab_url,
    payload.siteContextCrabUrl,
    payload.site,
    payload.relations?.site,
    payload.site_connection?.crab_url,
    payload.siteConnection?.crabUrl,
  );
  const heroImage = stringValue(
    payload.hero_image_crab_url,
    payload.heroImageCrabUrl,
    payload.hero_image,
    payload.heroImage,
    payload.relations?.hero_image,
    payload.relations?.heroImage,
  );
  const source = stringValue(
    payload.linked_source_crab_url,
    payload.linkedSourceCrabUrl,
    payload.source,
    payload.relations?.source,
  );
  const creatorDisplay = stringValue(payload.creator_display, payload.creatorDisplay);
  const language = stringValue(payload.language, payload.metadata?.language, 'en');
  const articleKind = stringValue(
    payload.article_kind,
    payload.articleKind,
    payload.metadata?.article_kind,
    payload.metadata?.articleKind,
    'essay',
  );
  const visibility = stringValue(payload.visibility, payload.metadata?.visibility, 'public_preview');
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
  const tags = normalizeTags(payload.tags || payload.metadata?.tags);
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey(scope, payerAccount, ownerPassport, title, site, measureJsonBytes({ title, body, site })),
    scope,
  );

  if (!title) {
    throw makeArticleAssetError('Article request requires a non-empty title.', 'missing_article_title');
  }

  if (!body) {
    throw makeArticleAssetError('Article request requires a non-empty body.', 'missing_article_body');
  }

  if (!site) {
    throw makeArticleAssetError('Article request requires a site context crab URL.', 'missing_site_connection');
  }

  if (!payerAccount) {
    throw makeArticleAssetError('Article request requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeArticleAssetError('Article request requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    title,
    subtitle: subtitle || undefined,
    summary: summary || undefined,
    body,
    site_context_crab_url: site,
    hero_image_crab_url: heroImage || undefined,
    linked_source_crab_url: source || undefined,
    creator_display: creatorDisplay || undefined,
    language,
    article_kind: articleKind,
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

export function normalizeArticleContentEnvelope(payload = {}) {
  const title = stringValue(payload.title, payload.content?.title);
  const subtitle = stringValue(payload.subtitle, payload.content?.subtitle);
  const summary = stringValue(payload.summary, payload.description, payload.content?.summary);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(payload.site_context_crab_url, payload.siteContextCrabUrl, payload.site, payload.relations?.site);
  const heroImage = stringValue(
    payload.hero_image_crab_url,
    payload.heroImageCrabUrl,
    payload.hero_image,
    payload.heroImage,
    payload.relations?.hero_image,
    payload.relations?.heroImage,
  );
  const source = stringValue(payload.linked_source_crab_url, payload.linkedSourceCrabUrl, payload.source, payload.relations?.source);

  return stripEmpty({
    schema: 'ron.article-content.v1',
    kind: 'article',
    asset_kind: 'article',
    format: 'text/markdown; charset=utf-8',
    title,
    subtitle: subtitle || undefined,
    summary: summary || undefined,
    body,
    metadata: stripEmpty({
      article_kind: stringValue(payload.article_kind, payload.articleKind, payload.metadata?.article_kind, payload.metadata?.articleKind, 'essay'),
      language: stringValue(payload.language, payload.metadata?.language, 'en'),
      visibility: stringValue(payload.visibility, payload.metadata?.visibility, 'public_preview'),
      rights_mode: stringValue(payload.rights_mode, payload.rightsMode, payload.metadata?.rights_mode, 'creator_owned_original'),
      moderation_mode: stringValue(payload.moderation_mode, payload.moderationMode, payload.metadata?.moderation_mode, 'site_policy_or_creator_default'),
      content_warning: stringValue(payload.content_warning, payload.contentWarning, payload.metadata?.content_warning) || undefined,
      tags: normalizeTags(payload.tags || payload.metadata?.tags),
    }),
    relations: stripEmpty({
      site,
      hero_image: heroImage || undefined,
      source: source || undefined,
    }),
  });
}

export function measureJsonBytes(value) {
  const json = JSON.stringify(value || {});

  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length;
  }

  try {
    return new Blob([json], { type: ARTICLE_CONTENT_TYPE }).size;
  } catch (_error) {
    return json.length;
  }
}

export function extractArticleAssetUrl(data = {}) {
  const source = unwrapData(data);
  const direct = stringValue(
    source.crab_url,
    source.crabUrl,
    source.asset_url,
    source.assetUrl,
    source.article_url,
    source.articleUrl,
    source.url,
  );

  if (/^crab:\/\/[0-9a-f]{64}\.article$/i.test(direct)) {
    return direct.toLowerCase();
  }

  const cid = extractArticleAssetCid(source);

  if (cid?.startsWith('b3:')) {
    return `crab://${cid.slice(3)}.article`;
  }

  return '';
}

export function extractArticleAssetCid(data = {}) {
  const source = unwrapData(data);
  const direct = stringValue(
    source.cid,
    source.content_id,
    source.contentId,
    source.article_cid,
    source.articleCid,
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
    objectValue(source.article) ||
    objectValue(source.object) ||
    objectValue(source.manifest);

  if (nested) {
    return extractArticleAssetCid(nested);
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
      .slice(0, 32);
  }

  return String(value || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 32);
}

function normalizeCid(value) {
  const hash = String(value || '')
    .trim()
    .replace(/^b3:/i, '')
    .toLowerCase();

  return /^[0-9a-f]{64}$/.test(hash) ? `b3:${hash}` : '';
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

function makeArticleAssetError(message, reason = 'article_asset_client_error') {
  const error = new Error(message);
  error.name = 'ArticleAssetClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}