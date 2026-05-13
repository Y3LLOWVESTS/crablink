/**
 * RO:WHAT — Gateway-only client for future crab://<hash>.article publish flows.
 * RO:WHY — Lets CrabLink wire article publishing to the same prepare → hold → publish shape proven by image/site/post/comment.
 * RO:INTERACTS — ArticlePublishFlow.jsx, gatewayClient.js, walletClient.js, future svc-gateway /assets/article routes.
 * RO:INVARIANTS — no fake CIDs; no fake receipts; no direct storage/index/wallet/ledger calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating publish requires caller-supplied paid hold proof; JSON body is sent only to configured svc-gateway.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://article prepare/hold/publish smoke after backend routes exist.
 */

import { normalizePaidProof } from './assetClient.js';
import { compactIdempotencyKey, stableIdempotencyKey } from './walletClient.js';

const ARTICLE_CONTENT_TYPE = 'application/json; charset=utf-8';

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
        stableIdempotencyKey('article-publish', proof.txid, proof.receipt_hash, body.title, body.relations?.site),
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
        site: body.relations?.site || '',
        bytes: body.bytes || measureJsonBytes(body.content),
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
      throw makeArticleAssetError('Article asset request requires the configured gateway client.', 'missing_gateway_client');
    }
  }
}

export function normalizeArticlePrepareRequest(payload = {}) {
  const title = stringValue(payload.title, payload.content?.title);
  const subtitle = stringValue(payload.subtitle, payload.content?.subtitle);
  const summary = stringValue(payload.summary, payload.description, payload.content?.summary);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(payload.site_context_crab_url, payload.siteContextCrabUrl, payload.site, payload.relations?.site);
  const heroImage = stringValue(payload.hero_image_crab_url, payload.heroImageCrabUrl, payload.hero_image, payload.relations?.hero_image);
  const source = stringValue(payload.linked_source_crab_url, payload.linkedSourceCrabUrl, payload.source, payload.relations?.source);
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
  const content = normalizeArticleContentEnvelope({
    title,
    subtitle,
    summary,
    body,
    language: payload.language,
    articleKind: payload.article_kind || payload.articleKind,
    contentWarning: payload.content_warning || payload.contentWarning,
    tags,
    site,
    heroImage,
    source,
  });
  const bytes = normalizePositiveInteger(payload.bytes, payload.content_bytes, payload.contentBytes) || String(measureJsonBytes(content));
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('article-prepare', payerAccount, ownerPassport, bytes, title, site),
    'article-prepare',
  );

  if (!title) {
    throw makeArticleAssetError('Article prepare requires a non-empty title.', 'missing_article_title');
  }

  if (!body) {
    throw makeArticleAssetError('Article prepare requires a non-empty body.', 'missing_article_body');
  }

  if (!site) {
    throw makeArticleAssetError('Article prepare requires a site context crab URL.', 'missing_site_connection');
  }

  if (!payerAccount) {
    throw makeArticleAssetError('Article prepare requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeArticleAssetError('Article prepare requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    schema: 'crablink.article-prepare.v1',
    asset_kind: 'article',
    bytes: Number(bytes),
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    content_type: ARTICLE_CONTENT_TYPE,
    title,
    subtitle: subtitle || undefined,
    summary: summary || body.slice(0, 280),
    body_preview: body.slice(0, 360),
    tags,
    site_context_crab_url: site,
    hero_image_crab_url: heroImage || undefined,
    linked_source_crab_url: source || undefined,
    relations: stripEmpty({
      site,
      hero_image: heroImage || undefined,
      source: source || undefined,
    }),
    client_idempotency_key: idempotency,
  });
}

export function normalizeArticlePublishRequest(payload = {}) {
  const title = stringValue(payload.title, payload.content?.title);
  const subtitle = stringValue(payload.subtitle, payload.content?.subtitle);
  const summary = stringValue(payload.summary, payload.description, payload.content?.summary);
  const body = stringValue(payload.body, payload.text, payload.content?.body);
  const site = stringValue(payload.site_context_crab_url, payload.siteContextCrabUrl, payload.site, payload.relations?.site);
  const heroImage = stringValue(payload.hero_image_crab_url, payload.heroImageCrabUrl, payload.hero_image, payload.relations?.hero_image);
  const source = stringValue(payload.linked_source_crab_url, payload.linkedSourceCrabUrl, payload.source, payload.relations?.source);
  const payerAccount = stringValue(payload.payer_account, payload.payerAccount, payload.wallet_account, payload.walletAccount, payload.from);
  const ownerPassport = stringValue(payload.owner_passport_subject, payload.ownerPassportSubject, payload.passportSubject, payload.passport);
  const tags = normalizeTags(payload.tags || payload.metadata?.tags);
  const language = stringValue(payload.language, payload.metadata?.language, 'en');
  const articleKind = stringValue(payload.article_kind, payload.articleKind, payload.metadata?.article_kind, payload.metadata?.articleKind, 'essay');
  const contentWarning = stringValue(payload.content_warning, payload.contentWarning, payload.metadata?.content_warning, payload.metadata?.contentWarning);
  const content = normalizeArticleContentEnvelope({
    title,
    subtitle,
    summary,
    body,
    language,
    articleKind,
    contentWarning,
    tags,
    site,
    heroImage,
    source,
  });
  const bytes = Number(normalizePositiveInteger(payload.bytes, payload.content_bytes, payload.contentBytes) || measureJsonBytes(content));
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('article-publish', payerAccount, ownerPassport, bytes, title, site),
    'article-publish',
  );

  if (!title) {
    throw makeArticleAssetError('Article publish requires a non-empty title.', 'missing_article_title');
  }

  if (!body) {
    throw makeArticleAssetError('Article publish requires a non-empty body.', 'missing_article_body');
  }

  if (!site) {
    throw makeArticleAssetError('Article publish requires a site context crab URL.', 'missing_site_connection');
  }

  if (!payerAccount) {
    throw makeArticleAssetError('Article publish requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeArticleAssetError('Article publish requires an owner passport subject.', 'missing_owner_passport');
  }

  return stripEmpty({
    schema: 'crablink.article-publish-request.v1',
    asset_kind: 'article',
    content_type: ARTICLE_CONTENT_TYPE,
    bytes,
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    title,
    subtitle: subtitle || undefined,
    summary: summary || body.slice(0, 280),
    body,
    tags,
    metadata: stripEmpty({
      article_kind: articleKind,
      language,
      content_warning: contentWarning || undefined,
      body_preview: body.slice(0, 360),
    }),
    relations: stripEmpty({
      site,
      hero_image: heroImage || undefined,
      source: source || undefined,
    }),
    site_context_crab_url: site,
    hero_image_crab_url: heroImage || undefined,
    linked_source_crab_url: source || undefined,
    content,
    manifest_hint: payload.manifest_hint || payload.manifestDraft || payload.manifest_draft || undefined,
    client_idempotency_key: idempotency,
  });
}

export function normalizeArticleContentEnvelope({
  title,
  subtitle,
  summary,
  body,
  language,
  articleKind,
  contentWarning,
  tags,
  site,
  heroImage,
  source,
}) {
  return stripEmpty({
    schema: 'ron.text-asset.v1',
    kind: 'article',
    format: 'text/markdown; charset=utf-8',
    title: stringValue(title),
    subtitle: stringValue(subtitle) || undefined,
    summary: stringValue(summary) || undefined,
    body: stringValue(body),
    metadata: stripEmpty({
      article_kind: stringValue(articleKind, 'essay'),
      language: stringValue(language, 'en'),
      content_warning: stringValue(contentWarning) || undefined,
      tags: normalizeTags(tags),
    }),
    relations: stripEmpty({
      site: stringValue(site),
      hero_image: stringValue(heroImage) || undefined,
      source: stringValue(source) || undefined,
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

  const nested = objectValue(source.asset) || objectValue(source.article) || objectValue(source.object) || objectValue(source.manifest);

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
    return value.map((tag) => String(tag || '').trim().replace(/^#/, '')).filter(Boolean).slice(0, 32);
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

function makeArticleAssetError(message, reason = 'article_asset_client_error') {
  const error = new Error(message);
  error.name = 'ArticleAssetClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}